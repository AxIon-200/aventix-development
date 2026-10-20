// Run with: node --test tests/account-switching.browser.test.mjs
// Uses installed Chrome/Edge (or BROWSER_PATH), a Next build, and a synthetic HTTP API.
// No database, real credentials, or mail delivery is involved.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { spawn, spawnSync } from 'node:child_process';
import { cpSync, existsSync, mkdtempSync, symlinkSync } from 'node:fs';
import { rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { root } from './load-typescript.mjs';

const browserPath = [process.env.BROWSER_PATH,
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  '/usr/bin/chromium', '/usr/bin/google-chrome',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
].find(candidate => candidate && existsSync(candidate));

async function until(read, label, timeout = 90000) {
  const end = Date.now() + timeout;
  while (Date.now() < end) {
    const result = await read();
    if (result) return result;
    await delay(100);
  }
  throw new Error(`Timed out waiting for ${label}`);
}

async function listen(server) {
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  return server.address().port;
}

function stop(child) {
  if (!child || child.exitCode !== null) return;
  if (process.platform === 'win32') {
    spawnSync('taskkill', ['/PID', String(child.pid), '/T', '/F'], { windowsHide: true, stdio: 'ignore' });
  } else child.kill('SIGTERM');
}

async function removeTemporary(directory, prefix) {
  assert.equal(path.dirname(directory), path.resolve(tmpdir()));
  assert.ok(path.basename(directory).startsWith(prefix));
  await rm(directory, { recursive: true, force: true, maxRetries: 20, retryDelay: 100 });
}

async function connect(url) {
  const socket = new WebSocket(url);
  await new Promise((resolve, reject) => {
    socket.addEventListener('open', resolve, { once: true });
    socket.addEventListener('error', reject, { once: true });
  });
  let id = 0;
  const pending = new Map();
  socket.addEventListener('close', () => {
    for (const request of pending.values()) {
      clearTimeout(request.timer);
      request.reject(new Error('Browser connection closed'));
    }
    pending.clear();
  });
  socket.addEventListener('message', event => {
    const value = JSON.parse(event.data);
    if (value.method === 'Runtime.exceptionThrown') {
      console.error('Browser exception:', value.params.exceptionDetails.exception?.description ?? value.params.exceptionDetails.text);
    }
    const request = pending.get(value.id);
    if (!request) return;
    pending.delete(value.id);
    clearTimeout(request.timer);
    if (value.error) request.reject(new Error(value.error.message));
    else request.resolve(value.result);
  });
  return {
    close: () => socket.close(),
    send: (method, params = {}) => new Promise((resolve, reject) => {
      if (socket.readyState !== WebSocket.OPEN) { reject(new Error('Browser connection closed')); return; }
      const requestId = ++id;
      const timer = setTimeout(() => {
        pending.delete(requestId);
        reject(new Error(`Browser command timed out: ${method}`));
      }, 90000);
      pending.set(requestId, { resolve, reject, timer });
      socket.send(JSON.stringify({ id: requestId, method, params }));
    }),
  };
}

test('account identity stays current and account switching preserves safe booking context', {
  skip: !browserPath && 'Set BROWSER_PATH to an installed Chrome/Chromium browser',
  timeout: 360000,
}, async t => {
  const profile = (id, role = 'ATTENDEE') => ({
    id, name: `Fixture ${id}`, firstName: 'Fixture', lastName: id,
    email: `${id}@example.invalid`, phoneNumber: null, role, status: 'ACTIVE',
    emailVerified: true, termsVersion: 'fixture-terms',
    termsAcceptedAt: '2026-01-01T00:00:00.000Z',
    createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z',
  });
  let logoutMode = 'confirmed';
  let loginRole = 'ATTENDEE';
  let logoutRequests = 0;
  let accountResponse;
  let holdAccountReads = false;
  const delayedAccountReads = [];
  const api = createServer(async (request, response) => {
    response.setHeader('Content-Type', 'application/json');
    response.setHeader('Cache-Control', 'no-store');
    const account = /fixture-account=(old|new)/.exec(request.headers.cookie ?? '')?.[1];
    if (request.url === '/api/v1/me') {
      const result = accountResponse ?? { status: account ? 200 : 401, body: account
        ? { data: { user: profile(account, account === 'new' ? loginRole : 'ATTENDEE') } }
        : { error: { code: 'AUTHENTICATION_REQUIRED' } } };
      const complete = () => {
        response.statusCode = result.status;
        response.end(JSON.stringify(result.body));
      };
      if (holdAccountReads && request.headers['sec-fetch-site']) delayedAccountReads.push(complete);
      else complete();
    } else if (request.url === '/api/auth/logout' && request.method === 'POST') {
      logoutRequests++;
      if (logoutMode === 'uncertain') { request.socket.destroy(); return; }
      response.setHeader('Set-Cookie', 'fixture-account=; Max-Age=0; Path=/; HttpOnly; SameSite=Lax');
      response.end(JSON.stringify({ data: { loggedOut: true } }));
    } else if (request.url === '/api/auth/login' && request.method === 'POST') {
      let body = '';
      for await (const chunk of request) body += chunk;
      const input = JSON.parse(body);
      assert.deepEqual(input, { email: 'new@example.invalid', password: ' fixture password ' });
      response.setHeader('Set-Cookie', 'fixture-account=new; Path=/; HttpOnly; SameSite=Lax');
      response.end(JSON.stringify({ data: { user: profile('new', loginRole) } }));
    } else {
      response.statusCode = 404;
      response.end(JSON.stringify({ error: { code: 'NOT_FOUND' } }));
    }
  });
  t.after(() => { api.closeAllConnections(); api.close(); });
  const apiPort = await listen(api);
  const reservation = createServer();
  const appPort = await listen(reservation);
  await new Promise(resolve => reservation.close(resolve));
  const origin = `http://127.0.0.1:${appPort}`;
  // Keep the user's dev server, build output, and environment files untouched.
  const appDirectory = mkdtempSync(path.join(tmpdir(), 'aventix-account-app-'));
  let compiler;
  let app;
  t.after(async () => { stop(app); stop(compiler); await removeTemporary(appDirectory, 'aventix-account-app-'); });
  for (const entry of ['src', 'public', 'package.json', 'package-lock.json', 'tsconfig.json',
    'next-env.d.ts', 'next.config.ts', 'postcss.config.mjs', 'tailwind.config.ts']) {
    cpSync(path.join(root, entry), path.join(appDirectory, entry), { recursive: true });
  }
  symlinkSync(path.join(root, 'node_modules'), path.join(appDirectory, 'node_modules'),
    process.platform === 'win32' ? 'junction' : 'dir');
  const options = {
    cwd: appDirectory, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'],
    env: { ...process.env, AUTH_BACKEND_URL: `http://127.0.0.1:${apiPort}`, NEXT_TELEMETRY_DISABLED: '1' },
  };
  compiler = spawn(process.execPath, [path.join(root, 'node_modules/next/dist/bin/next'), 'build', '--webpack'], options);
  let buildOutput = '';
  compiler.stdout.on('data', value => { buildOutput = (buildOutput + value).slice(-5000); });
  compiler.stderr.on('data', value => { buildOutput = (buildOutput + value).slice(-5000); });
  await until(() => compiler.exitCode !== null, 'isolated production build', 180000);
  assert.equal(compiler.exitCode, 0, buildOutput);
  app = spawn(process.execPath, [path.join(root, 'node_modules/next/dist/bin/next'),
    'start', '--hostname', '127.0.0.1', '--port', String(appPort)], options);
  let appOutput = '';
  app.stdout.on('data', value => { appOutput = (appOutput + value).slice(-5000); });
  app.stderr.on('data', value => { appOutput = (appOutput + value).slice(-5000); });
  await until(async () => {
    if (app.exitCode !== null) throw new Error(`Next exited: ${appOutput}`);
    try { return (await fetch(`${origin}/login`, { signal: AbortSignal.timeout(60000) })).ok; } catch { return false; }
  }, 'Next login page');
  console.log('Account switching browser: isolated Next app ready');

  const browserProfile = mkdtempSync(path.join(tmpdir(), 'aventix-account-switch-'));
  const browser = spawn(browserPath, ['--headless=new', '--no-first-run', '--no-default-browser-check',
    '--remote-debugging-port=0', `--user-data-dir=${browserProfile}`, 'about:blank'],
  { windowsHide: true, stdio: ['ignore', 'ignore', 'pipe'] });
  let cdp;
  t.after(async () => {
    if (cdp) await cdp.send('Browser.close').catch(() => {});
    await until(() => browser.exitCode !== null, 'browser shutdown', 10000).catch(() => {});
    stop(browser);
    await removeTemporary(browserProfile, 'aventix-account-switch-');
  });
  let browserOutput = '';
  browser.stderr.on('data', value => { browserOutput = (browserOutput + value).slice(-5000); });
  const debuggerUrl = await until(() => {
    if (browser.exitCode !== null) throw new Error(`Browser exited: ${browserOutput}`);
    return /DevTools listening on (ws:\/\/[^\s]+)/.exec(browserOutput)?.[1];
  }, 'browser debugger');
  const debuggerOrigin = `http://${new URL(debuggerUrl).host}`;
  const tab = await (await fetch(`${debuggerOrigin}/json/new?about:blank`, { method: 'PUT' })).json();
  cdp = await connect(tab.webSocketDebuggerUrl);
  console.log('Account switching browser: Chrome connected');
  t.after(() => cdp.close());
  await cdp.send('Page.enable');
  await cdp.send('Network.enable');
  await cdp.send('Runtime.enable');
  await cdp.send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });
  const evaluate = async (expression, connection = cdp) => {
    const value = await connection.send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
    if (value.exceptionDetails) throw new Error(value.exceptionDetails.text);
    return value.result.value;
  };
  const click = async label => {
    const expression = `Array.from(document.querySelectorAll('button')).find(button => button.textContent.trim() === ${JSON.stringify(label)})`;
    await until(() => evaluate(`Boolean(${expression})`), label);
    await evaluate(`${expression}.click()`);
  };
  const openAccount = async (screen, returnTo) => {
    logoutMode = 'confirmed';
    logoutRequests = 0;
    await cdp.send('Network.clearBrowserCookies');
    await cdp.send('Network.setCookie', { name: 'fixture-account', value: 'old', url: origin, httpOnly: true, path: '/' });
    const target = new URL(screen, origin);
    if (returnTo !== undefined) target.searchParams.set('returnTo', returnTo);
    await cdp.send('Page.navigate', { url: target.href });
    try {
      await until(() => evaluate(`document.readyState === 'complete' && document.body.innerText.includes('Hi, Fixture old') && document.body.innerText.includes('You are signed in')`), 'hydrated current account');
    } catch (error) {
      console.error('Next output:', appOutput);
      console.error('Browser page:', await evaluate('document.body.innerText'));
      throw error;
    }
  };
  const expectLogin = async returnTo => {
    // The signed-out event reveals the form before Next finishes replacing the URL.
    await until(() => evaluate(`location.pathname === '/' || (location.pathname === '/login'
      && new URL(location.href).searchParams.get('returnTo') === ${JSON.stringify(returnTo ?? null)}
      && Boolean(document.querySelector('input[name="email"]')))`), 'login after sign-out');
    const location = new URL(await evaluate('location.href'));
    assert.equal(location.pathname, '/login');
    assert.equal(location.searchParams.get('returnTo'), returnTo ?? null);
    assert.equal(logoutRequests, 1);
  };
  const scenario = async (name, run) => {
    let failure;
    await t.test(name, async () => {
      try { await run(); } catch (error) { failure = error; throw error; }
    });
    if (failure) throw failure;
  };

  await scenario('focus hides old identity until the current server account is known', async () => {
    await openAccount('/login');
    holdAccountReads = true;
    await evaluate(`window.dispatchEvent(new Event('focus'))`);
    await until(() => delayedAccountReads.length > 0, 'delayed frontend account read');
    assert.equal(await evaluate(`document.body.innerText.includes('Hi, Fixture old') || document.body.innerText.includes('You are signed in')`), false);
    holdAccountReads = false;
    delayedAccountReads.splice(0).forEach(complete => complete());
    await until(() => evaluate(`document.body.innerText.includes('Hi, Fixture old') && document.body.innerText.includes('You are signed in')`), 'fresh identity after focus');
  });

  await scenario('a newer failed eligibility check wins over an older successful response', async () => {
    await openAccount('/login');
    holdAccountReads = true;
    await evaluate(`window.dispatchEvent(new Event('focus'))`);
    await until(() => delayedAccountReads.length > 0, 'old account read');
    holdAccountReads = false;
    accountResponse = { status: 403, body: { error: { code: 'ACCOUNT_DISABLED' } } };
    await evaluate(`window.dispatchEvent(new Event('focus'))`);
    await until(() => evaluate(`document.body.innerText.includes('This account cannot sign in')`), 'current eligibility failure');
    delayedAccountReads.splice(0).forEach(complete => complete());
    await delay(250);
    assert.equal(await evaluate(`document.body.innerText.includes('Hi, Fixture old') || document.body.innerText.includes('You are signed in')`), false);
    assert.equal(await evaluate(`document.body.innerText.includes('This account cannot sign in')`), true);
    accountResponse = undefined;
  });

  await scenario('navigation and query-only navigation refresh preserved workspace layouts', async () => {
    await openAccount('/login');
    await cdp.send('Page.navigate', { url: `${origin}/dashboard` });
    await until(() => evaluate(`document.body.innerText.includes('Welcome back,')`), 'eligible workspace');
    accountResponse = { status: 403, body: { error: { code: 'ACCOUNT_DISABLED' } } };
    await evaluate(`document.querySelector('a[href="/dashboard/tickets"]').click()`);
    await until(() => evaluate(`location.pathname === '/dashboard/tickets' && document.body.innerText.includes('This account cannot sign in')`), 'navigation eligibility refresh');
    assert.equal(await evaluate(`document.body.innerText.includes('Sherwin Cruz')`), false);
    accountResponse = { status: 401, body: { error: { code: 'AUTHENTICATION_REQUIRED' } } };
    await evaluate(`history.pushState(null, '', '?view=refresh')`);
    await until(() => evaluate(`document.body.innerText.includes('Log in to continue')`), 'query navigation authentication refresh');
    assert.equal(await evaluate(`document.body.innerText.includes('My Tickets')`), false);
    accountResponse = undefined;
  });

  await scenario('unknown workspace state hides content and preserves distinct approved account gates', async () => {
    await openAccount('/login');
    await cdp.send('Page.navigate', { url: `${origin}/dashboard` });
    await until(() => evaluate(`document.body.innerText.includes('Welcome back,')`), 'eligible workspace');
    holdAccountReads = true;
    await evaluate(`window.dispatchEvent(new Event('focus'))`);
    await until(() => delayedAccountReads.length > 0, 'pending workspace check');
    assert.equal(await evaluate(`document.body.innerText.includes('Welcome back,')`), false);
    holdAccountReads = false;
    delayedAccountReads.splice(0).forEach(complete => complete());
    await until(() => evaluate(`document.body.innerText.includes('Welcome back,')`), 'confirmed workspace');
    for (const [response, message] of [
      [{ status: 403, body: { error: { code: 'EMAIL_VERIFICATION_REQUIRED' } } }, 'Verify your email address'],
      [{ status: 403, body: { error: { code: 'TERMS_ACCEPTANCE_REQUIRED' } } }, 'Accept the current terms'],
      [{ status: 403, body: { error: { code: 'PASSWORD_RESET_REQUIRED' } } }, 'Reset your password through account recovery'],
      [{ status: 200, body: { data: { user: { id: 'malformed' } } } }, 'unsupported response'],
      [{ status: 503, body: { error: { code: 'INTERNAL_ERROR' } } }, 'account service is unavailable'],
      [{ status: 401, body: { error: { code: 'AUTHENTICATION_REQUIRED' } } }, 'Log in to continue'],
    ]) {
      accountResponse = response;
      await evaluate(`window.dispatchEvent(new Event('focus'))`);
      await until(() => evaluate(`document.body.innerText.includes(${JSON.stringify(message)})`), message);
      assert.equal(await evaluate(`document.body.innerText.includes('Welcome back,') || document.body.innerText.includes('Sherwin Cruz')`), false);
    }
    accountResponse = undefined;
  });

  await scenario('a reset signal invalidates reads begun before this browser was signed out', async () => {
    await openAccount('/login');
    holdAccountReads = true;
    await evaluate(`window.dispatchEvent(new Event('focus'))`);
    await until(() => delayedAccountReads.length > 0, 'pre-reset account read');
    holdAccountReads = false;
    await cdp.send('Network.clearBrowserCookies');
    // #112 owns the reset form. Exercise its account-change signal without a token or reset preflight.
    await evaluate(`window.dispatchEvent(new CustomEvent('aventix:session-updated', { detail: 'reset' }))`);
    await until(() => evaluate(`Boolean(document.querySelector('input[name="email"]')) && !document.body.innerText.includes('Hi, Fixture old')`), 'reset sign-out');
    delayedAccountReads.splice(0).forEach(complete => complete());
    await delay(250);
    assert.equal(await evaluate(`document.body.innerText.includes('Hi, Fixture old') || document.body.innerText.includes('You are signed in')`), false);
  });

  await scenario('a confirmed logout signal checks current account even without navigation', async () => {
    await openAccount('/login');
    await cdp.send('Network.clearBrowserCookies');
    accountResponse = { status: 503, body: { error: { code: 'INTERNAL_ERROR' } } };
    await evaluate(`window.dispatchEvent(new CustomEvent('aventix:session-updated', { detail: 'signed-out' }))`);
    assert.equal(await evaluate(`document.body.innerText.includes('Hi, Fixture old') || document.body.innerText.includes('You are signed in')`), false);
    await until(() => evaluate(`document.body.innerText.includes('account service is unavailable')`), 'post-logout account check', 15000);
    accountResponse = undefined;
  });

  await scenario('confirmed reset reconciles an earlier uncertain logout without another mutation', async () => {
    await openAccount('/login');
    logoutMode = 'uncertain';
    await click('Sign out to use another account');
    await until(() => evaluate(`document.body.innerText.includes('Sign-out could not be confirmed')`), 'uncertain logout before reset');
    await cdp.send('Network.clearBrowserCookies');
    await evaluate(`window.dispatchEvent(new CustomEvent('aventix:session-updated', { detail: 'reset' }))`);
    await until(() => evaluate(`Boolean(document.querySelector('input[name="email"]')) && !document.body.innerText.includes('Sign-out could not be confirmed')`), 'reset confirms browser sign-out');
    assert.equal(logoutRequests, 1);
    logoutMode = 'confirmed';
  });

  await scenario('two real tabs reconcile login and logout hints without sharing identity', async () => {
    await openAccount('/login');
    const second = await (await fetch(`${debuggerOrigin}/json/new?about:blank`, { method: 'PUT' })).json();
    const other = await connect(second.webSocketDebuggerUrl);
    try {
      await other.send('Page.enable');
      await other.send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });
      await other.send('Page.navigate', { url: `${origin}/login` });
      const otherEvaluate = expression => evaluate(expression, other);
      await until(() => otherEvaluate(`document.body.innerText.includes('Hi, Fixture old') && document.body.innerText.includes('You are signed in')`), 'second tab identity');
      await otherEvaluate(`window.accountHints = []; window.addEventListener('storage', event => {
        if (event.key === 'aventix:account-changed' && event.newValue) window.accountHints.push(event.newValue);
      })`);
      await cdp.send('Page.bringToFront');
      await until(() => evaluate(`document.body.innerText.includes('You are signed in')`), 'first tab focus');
      holdAccountReads = true;
      await otherEvaluate(`window.dispatchEvent(new Event('focus'))`);
      await until(() => delayedAccountReads.length > 0, 'second tab pre-logout read');
      holdAccountReads = false;
      await click('Sign out to use another account');
      await until(() => otherEvaluate(`Boolean(document.querySelector('input[name="email"]')) && !document.body.innerText.includes('You are signed in')`), 'background tab logout hint');
      delayedAccountReads.splice(0).forEach(complete => complete());
      await delay(250);
      assert.equal(await otherEvaluate(`document.body.innerText.includes('Hi, Fixture old') || document.body.innerText.includes('You are signed in')`), false);
      await until(() => evaluate(`location.pathname === '/login' && Boolean(document.querySelector('input[name="email"]'))`), 'first tab login form');
      loginRole = 'ATTENDEE';
      await evaluate(`document.querySelector('input[name="email"]').value = 'new@example.invalid';
        document.querySelector('input[name="password"]').value = ' fixture password ';
        document.querySelector('input[name="email"]').form.requestSubmit()`);
      await until(() => otherEvaluate(`document.body.innerText.includes('Hi, Fixture new') && document.body.innerText.includes('You are signed in')`), 'background tab login hint');
      const hints = await otherEvaluate('window.accountHints');
      assert.ok(hints.length >= 2);
      assert.ok(hints.every(hint => /^[0-9a-f-]{36}$/.test(hint)));
      assert.equal(await otherEvaluate(`localStorage.getItem('aventix:account-changed')`), null);
      accountResponse = { status: 401, body: { error: { code: 'AUTHENTICATION_REQUIRED' } } };
      await delay(250);
      assert.equal(await otherEvaluate(`document.body.innerText.includes('Hi, Fixture new')`), true, 'remote expiry has no immediate idle-tab promise');
      await other.send('Page.bringToFront');
      await until(() => otherEvaluate(`Boolean(document.querySelector('input[name="email"]')) && !document.body.innerText.includes('Hi, Fixture new')`), 'actual tab focus checks expiry');
    } finally {
      accountResponse = undefined;
      other.close();
      await fetch(`${debuggerOrigin}/json/close/${second.id}`);
      await cdp.send('Page.bringToFront');
    }
  });

  await scenario('all account screens keep allowed event and booking destinations', async () => {
    for (const [screen, target] of [
      ['/login', '/events/concert/tickets?category=standing'],
      ['/register', '/bookings/fixture/summary'],
      ['/register/attendee', '/events/concert/seats'],
      ['/register/organizer', '/dashboard/buy-tickets?eventId=concert&category=standing'],
    ]) {
      await openAccount(screen, target);
      await click('Sign out to use another account');
      await expectLogin(target);
    }
  });

  await scenario('missing and unsafe return destinations lead to plain login', async () => {
    for (const target of [undefined, 'https://evil.invalid', '//evil.invalid', '/admin/dashboard',
      '/events/%2e%2e/tickets', '/dashboard/buy-tickets?eventId=x&role=admin']) {
      await openAccount('/login', target);
      await click('Sign out to use another account');
      await expectLogin(undefined);
    }
  });

  await scenario('uncertain sign-out keeps context and waits for explicit retry before navigating', async () => {
    const target = '/events/concert/tickets?category=standing';
    await openAccount('/register/attendee', target);
    logoutMode = 'uncertain';
    await click('Sign out to use another account');
    await until(() => evaluate(`document.body.innerText.includes('Sign-out could not be confirmed')`), 'uncertain sign-out');
    assert.equal(await evaluate('location.pathname'), '/register/attendee');
    assert.equal(new URL(await evaluate('location.href')).searchParams.get('returnTo'), target);
    assert.equal(await evaluate(`Boolean(document.querySelector('input[name="email"]'))`), false);
    await delay(250);
    assert.equal(logoutRequests, 1);
    logoutMode = 'confirmed';
    await click('Retry sign-out / use another account');
    await until(() => evaluate(`location.pathname === '/login' && Boolean(document.querySelector('input[name="email"]'))`), 'login after retry');
    assert.equal(new URL(await evaluate('location.href')).searchParams.get('returnTo'), target);
    assert.equal(logoutRequests, 2);
  });

  await scenario('replacement login applies booking returns only to attendees', async () => {
    const target = '/events/concert/tickets?category=standing';
    for (const [role, destination] of [['ATTENDEE', target], ['ORGANIZER', '/organizer/dashboard'], ['ADMINISTRATOR', '/admin/dashboard']]) {
      loginRole = role;
      await openAccount('/login', target);
      await click('Sign out to use another account');
      await expectLogin(target);
      await evaluate(`document.querySelector('input[name="email"]').value = 'new@example.invalid';
        document.querySelector('input[name="password"]').value = ' fixture password ';
        document.querySelector('input[name="email"]').form.requestSubmit()`);
      try {
        await until(() => evaluate(`location.pathname + location.search === ${JSON.stringify(destination)}`), `${role} destination`, 15000);
      } catch (error) {
        console.error('Login destination:', await evaluate('location.pathname + location.search'));
        console.error('Login page:', await evaluate('document.body.innerText'));
        throw error;
      }
    }
  });

  await scenario('ordinary workspace sign-out still returns home', async () => {
    const before = logoutRequests;
    await click('Sign Out');
    await until(() => evaluate(`location.pathname === '/'`), 'home after ordinary sign-out');
    assert.equal(logoutRequests, before + 1);
    assert.equal(new URL(await evaluate('location.href')).search, '');
  });
});
