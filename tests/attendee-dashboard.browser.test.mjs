import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import { cpSync, mkdtempSync, symlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { root } from './load-typescript.mjs';
import { browserPath, connect, listen, removeTemporary, stop, until } from './browser-support.mjs';

test('the attendee dashboard remains visible after the browser account check', {
  skip: !browserPath && 'Set BROWSER_PATH to an installed Chrome/Chromium browser',
  timeout: 240000,
}, async t => {
  const user = {
    id: 'attendee-1', name: 'Fixture Attendee', firstName: 'Fixture', lastName: 'Attendee',
    email: 'fixture@example.invalid', phoneNumber: null, role: 'ATTENDEE', status: 'ACTIVE',
    emailVerified: true, termsVersion: 'fixture', termsAcceptedAt: '2026-01-01T00:00:00Z',
    createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z',
  };
  let accountReads = 0;
  const api = createServer(async (request, response) => {
    response.setHeader('Content-Type', 'application/json');
    response.setHeader('Cache-Control', 'no-store');
    if (request.url === '/api/auth/login' && request.method === 'POST') {
      let body = '';
      for await (const chunk of request) body += chunk;
      assert.deepEqual(JSON.parse(body), { email: user.email, password: 'fixture-password' });
      response.setHeader('Set-Cookie', 'fixture-account=attendee; Path=/; HttpOnly; SameSite=Lax');
      response.end(JSON.stringify({ data: { user } }));
    } else if (request.url === '/api/v1/me' && request.headers.cookie?.includes('fixture-account=attendee')) {
      accountReads++;
      response.end(JSON.stringify({ data: { user } }));
    } else {
      response.statusCode = 401;
      response.end(JSON.stringify({ error: { code: 'AUTHENTICATION_REQUIRED' } }));
    }
  });
  t.after(() => { api.closeAllConnections(); api.close(); });
  const apiPort = await listen(api);
  const reservation = createServer();
  const appPort = await listen(reservation);
  await new Promise(resolve => reservation.close(resolve));
  const origin = `http://127.0.0.1:${appPort}`;

  const appDirectory = mkdtempSync(path.join(tmpdir(), 'aventix-dashboard-app-'));
  const browserProfile = mkdtempSync(path.join(tmpdir(), 'aventix-dashboard-browser-'));
  let compiler, app, browser, cdp;
  t.after(async () => {
    if (cdp) await cdp.send('Browser.close').catch(() => {});
    stop(browser); stop(app); stop(compiler);
    await removeTemporary(browserProfile, 'aventix-dashboard-browser-');
    await removeTemporary(appDirectory, 'aventix-dashboard-app-');
  });
  for (const entry of ['src', 'public', 'package.json', 'package-lock.json', 'tsconfig.json',
    'next-env.d.ts', 'next.config.ts', 'postcss.config.mjs', 'tailwind.config.ts']) {
    cpSync(path.join(root, entry), path.join(appDirectory, entry), { recursive: true });
  }
  symlinkSync(path.join(root, 'node_modules'), path.join(appDirectory, 'node_modules'),
    process.platform === 'win32' ? 'junction' : 'dir');
  const options = { cwd: appDirectory, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'],
    env: { ...process.env, AUTH_BACKEND_URL: `http://127.0.0.1:${apiPort}`, NEXT_TELEMETRY_DISABLED: '1' } };
  compiler = spawn(process.execPath, [path.join(root, 'node_modules/next/dist/bin/next'), 'build', '--webpack'], options);
  let buildOutput = '';
  compiler.stdout.on('data', chunk => { buildOutput = (buildOutput + chunk).slice(-4000); });
  compiler.stderr.on('data', chunk => { buildOutput = (buildOutput + chunk).slice(-4000); });
  await until(() => compiler.exitCode !== null, 'dashboard production build', 180000);
  assert.equal(compiler.exitCode, 0, buildOutput);
  app = spawn(process.execPath, [path.join(root, 'node_modules/next/dist/bin/next'),
    'start', '--hostname', '127.0.0.1', '--port', String(appPort)], options);
  let appOutput = '';
  app.stdout.on('data', chunk => { appOutput = (appOutput + chunk).slice(-4000); });
  app.stderr.on('data', chunk => { appOutput = (appOutput + chunk).slice(-4000); });
  await until(async () => {
    if (app.exitCode !== null) throw new Error(`Next exited: ${appOutput}`);
    try { return (await fetch(`${origin}/login`)).ok; } catch { return false; }
  }, 'dashboard test app');

  browser = spawn(browserPath, ['--headless=new', '--no-first-run', '--no-default-browser-check',
    '--remote-debugging-port=0', `--user-data-dir=${browserProfile}`, 'about:blank'],
  { windowsHide: true, stdio: ['ignore', 'ignore', 'pipe'] });
  let browserOutput = '';
  browser.stderr.on('data', chunk => { browserOutput = (browserOutput + chunk).slice(-4000); });
  const debuggerUrl = await until(() => {
    if (browser.exitCode !== null) throw new Error(`Browser exited: ${browserOutput}`);
    return /DevTools listening on (ws:\/\/[^\s]+)/.exec(browserOutput)?.[1];
  }, 'browser debugger');
  const tab = await (await fetch(`http://${new URL(debuggerUrl).host}/json/new?about:blank`, { method: 'PUT' })).json();
  cdp = await connect(tab.webSocketDebuggerUrl);
  await cdp.send('Page.enable');
  await cdp.send('Network.enable');
  await cdp.send('Runtime.enable');
  const evaluate = async expression => (await cdp.send('Runtime.evaluate', {
    expression, returnByValue: true, awaitPromise: true,
  })).result.value;
  const text = () => evaluate('document.body?.innerText ?? ""');

  await cdp.send('Page.navigate', { url: `${origin}/login` });
  try {
    await until(() => evaluate(`(() => {
      const form = document.querySelector('input[name="email"]')?.form;
      return Boolean(form
        && !form.closest('[inert]')
        && Object.keys(form).some(key => key.startsWith('__reactFiber$')));
    })()`), 'hydrated attendee login form', 20000);
  } catch (error) {
    console.error('Login screen:', await text());
    console.error('Form state:', await evaluate(`(() => { const form = document.querySelector('input[name="email"]')?.form; return {
      exists: Boolean(form), inert: Boolean(form?.closest('[inert]')),
      keys: form ? Object.keys(form).filter(key => key.startsWith('__react')) : [],
    }; })()`));
    console.error('Account reads:', accountReads);
    throw error;
  }
  await evaluate(`(() => {
    const form = document.querySelector('input[name="email"]').form;
    form.querySelector('[name="email"]').value = 'fixture@example.invalid';
    form.querySelector('[name="password"]').value = 'fixture-password';
    form.requestSubmit();
  })()`);
  try {
    await until(async () => (await evaluate('location.pathname')) === '/dashboard'
      && (await text()).includes('Welcome back, Fixture!'), 'attendee login redirect', 20000);
  } catch (error) {
    console.error('Login location:', await evaluate('location.href'));
    console.error('Login screen:', await text());
    console.error('Account reads:', accountReads);
    throw error;
  }
  await new Promise(resolve => setTimeout(resolve, 1500));
  assert.match(await text(), /Welcome back, Fixture!/);
  assert.doesNotMatch(await text(), /Checking your current account/);

  for (const route of ['/dashboard', '/dashboard?source=account']) {
    await cdp.send('Page.navigate', { url: `${origin}${route}` });
    await until(async () => (await text()).includes('Welcome back, Fixture!'), `hydrated ${route}`);
    await new Promise(resolve => setTimeout(resolve, 1500));
    const body = await text();
    assert.match(body, /Welcome back, Fixture!/);
    assert.doesNotMatch(body, /Checking your current account/);
  }
  assert.ok(accountReads >= 4, `Expected server and browser account reads, got ${accountReads}`);
});
