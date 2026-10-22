// Chrome -> isolated production Next proxy -> real Express/Better Auth -> guarded test database.
// Mail is captured in memory. No real mail is sent.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer, request as httpRequest } from 'node:http';
import { spawn } from 'node:child_process';
import { cpSync, mkdtempSync, symlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { root } from './load-typescript.mjs';
import { browserPath, until, listen, stop, removeTemporary, connect } from './browser-support.mjs';

test('password-gated verification works in the localhost browser with real backend lifecycle rules', {
  skip: !browserPath && 'Set BROWSER_PATH to an installed Chrome/Chromium browser', timeout: 600000,
}, async t => {
  const portReservation = createServer();
  const appPort = await listen(portReservation);
  await new Promise(resolve => portReservation.close(resolve));
  const origin = `http://127.0.0.1:${appPort}`;
  const backend = spawn(process.execPath, ['--import', 'tsx', 'test/fixtures/verification-browser-server.ts'], {
    cwd: path.join(root, 'backend'), windowsHide: true, stdio: ['ignore', 'pipe', 'pipe', 'ipc'],
    env: { ...process.env, AVENTIX_BROWSER_ORIGIN: origin },
  });
  let ready;
  const pending = new Map();
  let commandId = 0;
  backend.on('message', value => {
    if (value.ready) ready = value;
    const callback = pending.get(value.id);
    if (callback) { pending.delete(value.id); value.error ? callback.reject(Error(value.error)) : callback.resolve(value.result); }
  });
  // Output is deliberately omitted: test failures must not print credentials or captured mail.
  backend.stdout.resume(); backend.stderr.resume();
  const command = (action, data = {}) => new Promise((resolve, reject) => {
    const id = ++commandId;
    const timer = setTimeout(() => { pending.delete(id); reject(Error('Fixture command timed out')); }, 30000);
    pending.set(id, { resolve: value => { clearTimeout(timer); resolve(value); }, reject: error => { clearTimeout(timer); reject(error); } });
    backend.send({ id, action, ...data });
  });
  t.after(async () => {
    try { if (ready && backend.exitCode === null) await command('cleanup'); }
    finally { stop(backend); }
  });
  await until(() => { if (backend.exitCode !== null) throw Error('Guarded verification backend could not start'); return ready; }, 'guarded backend');

  // Proxy can lose or throttle a response without substituting any lifecycle implementation.
  let verificationMode = 'normal';
  let resendMode = 'normal';
  let verifyRequests = 0;
  let resendRequests = 0;
  const requestPaths = [];
  const proxy = createServer((req, res) => {
    requestPaths.push(req.url);
    const verifying = req.url === '/api/auth/verify-email';
    const resending = req.url === '/api/auth/resend-verification';
    if (verifying) verifyRequests++;
    if (resending) resendRequests++;
    if ((verifying && verificationMode === 'throttled') || (req.url === '/api/auth/resend-verification' && resendMode === 'throttled')) {
      res.writeHead(429, { 'Content-Type': 'application/json', 'Retry-After': '37' });
      res.end(JSON.stringify({ error: { code: 'RATE_LIMITED' } })); return;
    }
    const upstream = httpRequest({ hostname: '127.0.0.1', port: ready.port, path: req.url, method: req.method, headers: req.headers }, response => {
      if ((verifying && verificationMode === 'lost') || (resending && resendMode === 'lost')) { response.resume(); response.on('end', () => res.destroy()); return; }
      res.writeHead(response.statusCode, response.headers); response.pipe(res);
    });
    upstream.on('error', () => res.destroy()); req.pipe(upstream);
  });
  const proxyPort = await listen(proxy);
  t.after(() => new Promise(resolve => { proxy.closeAllConnections(); proxy.close(resolve); }));
  const directory = mkdtempSync(path.join(tmpdir(), 'aventix-verification-app-'));
  let compiler, app;
  t.after(async () => { stop(app); stop(compiler); await removeTemporary(directory, 'aventix-verification-app-'); });
  for (const entry of ['src', 'public', 'package.json', 'package-lock.json', 'tsconfig.json', 'next-env.d.ts', 'next.config.ts', 'postcss.config.mjs', 'tailwind.config.ts']) {
    cpSync(path.join(root, entry), path.join(directory, entry), { recursive: true });
  }
  symlinkSync(path.join(root, 'node_modules'), path.join(directory, 'node_modules'), process.platform === 'win32' ? 'junction' : 'dir');
  const options = { cwd: directory, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'],
    env: { ...process.env, AUTH_BACKEND_URL: `http://127.0.0.1:${proxyPort}`, NEXT_TELEMETRY_DISABLED: '1' } };
  compiler = spawn(process.execPath, [path.join(root, 'node_modules/next/dist/bin/next'), 'build', '--webpack'], options);
  let buildOutput = '';
  compiler.stdout.on('data', value => { buildOutput = (buildOutput + value).slice(-4000); });
  compiler.stderr.on('data', value => { buildOutput = (buildOutput + value).slice(-4000); });
  await until(() => compiler.exitCode !== null, 'production verification build', 180000);
  assert.equal(compiler.exitCode, 0, buildOutput);
  app = spawn(process.execPath, [path.join(root, 'node_modules/next/dist/bin/next'), 'start', '--hostname', '127.0.0.1', '--port', String(appPort)], options);
  app.stdout.resume(); app.stderr.resume();
  await until(async () => { try { return (await fetch(`${origin}/login`)).ok; } catch { return false; } }, 'production Next server');

  const profile = mkdtempSync(path.join(tmpdir(), 'aventix-verification-chrome-'));
  const browser = spawn(browserPath, ['--headless=new', '--no-first-run', '--no-default-browser-check', '--remote-debugging-port=0', `--user-data-dir=${profile}`, 'about:blank'],
    { windowsHide: true, stdio: ['ignore', 'ignore', 'pipe'] });
  let cdp;
  t.after(async () => {
    if (cdp) await cdp.send('Browser.close').catch(() => {});
    await until(() => browser.exitCode !== null, 'Chrome shutdown', 10000).catch(() => {});
    stop(browser); await removeTemporary(profile, 'aventix-verification-chrome-');
  });
  let browserOutput = '';
  browser.stderr.on('data', value => { browserOutput = (browserOutput + value).slice(-2000); });
  const debuggerUrl = await until(() => /DevTools listening on (ws:\/\/[^\s]+)/.exec(browserOutput)?.[1], 'Chrome debugger');
  const tab = await (await fetch(`http://${new URL(debuggerUrl).host}/json/new?about:blank`, { method: 'PUT' })).json();
  cdp = await connect(tab.webSocketDebuggerUrl);
  t.after(() => cdp.close());
  await cdp.send('Page.enable'); await cdp.send('Runtime.enable'); await cdp.send('Network.enable');
  await cdp.send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });
  const evaluate = async expression => {
    const result = await cdp.send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
    if (result.exceptionDetails) throw Error('Browser evaluation failed');
    return result.result.value;
  };
  const navigate = url => cdp.send('Page.navigate', { url });
  const text = async value => {
    try { await until(() => evaluate(`(document.body?.innerText ?? "").includes(${JSON.stringify(value)})`), value, 30000); }
    catch (error) {
      console.error('Browser state:', await evaluate('JSON.stringify({path:location.pathname,notices:Array.from(document.querySelectorAll("h1,[role=alert],[role=status]")).map(n=>n.innerText)})'));
      throw error;
    }
  };
  const click = label => evaluate(`Array.from(document.querySelectorAll('button')).find(button => button.textContent.trim() === ${JSON.stringify(label)}).click()`);
  const fill = (name, value) => evaluate(`document.querySelector('[name="${name}"]').value = ${JSON.stringify(value)}`);
  const submit = async password => { await fill('currentPassword', password); await click('Verify email'); };
  const scenario = async (name, run) => {
    let failure;
    await t.test(name, async () => { try { await run(); } catch (error) { failure = error; throw error; } });
    if (failure) throw failure;
  };

  let verifiedFixture;
  await scenario('a new email opens a fragment-free password form without verifying or signing in; wrong password can retry the same link', async () => {
    const fixture = await command('fixture');
    verifiedFixture = fixture;
    assert.equal(new URL(fixture.url).pathname, '/verify-email');
    await navigate(fixture.url);
    await text('Current password');
    assert.ok(await evaluate('location.hash === ""'));
    assert.equal(verifyRequests, 0);
    assert.equal((await cdp.send('Network.getAllCookies')).cookies.length, 0);
    await evaluate(`document.querySelector('a[href="#main-content"]').click()`);
    assert.equal(await evaluate('Boolean(document.querySelector("input[name=currentPassword]"))'), true);
    await submit('wrong password');
    await text('The current password is incorrect');
    await submit(fixture.password);
    await text('Your email has been verified');
    assert.equal(verifyRequests, 2);
    assert.equal((await cdp.send('Network.getAllCookies')).cookies.length, 0);
  });

  await scenario('reload loses the memory token; reopening the email in the same tab restores the form without a request', async () => {
    const fixture = await command('fixture');
    await navigate(`${origin}/login`); await text('Welcome back');
    await navigate(fixture.url); await text('Current password');
    const before = verifyRequests;
    await cdp.send('Page.reload'); await text('Reopen the link in your email');
    assert.equal(await evaluate('Boolean(document.querySelector("input[name=currentPassword]"))'), false);
    await navigate(fixture.url); await text('Current password');
    assert.ok(await evaluate('location.hash === ""'));
    assert.equal(verifyRequests, before);
    const token = new URLSearchParams(new URL(fixture.url).hash.slice(1)).get('token');
    assert.equal(await evaluate(`JSON.stringify([Object.entries(localStorage), Object.entries(sessionStorage)]).includes(${JSON.stringify(token)})`), false);
    assert.equal(await evaluate(`JSON.stringify(history.state).includes(${JSON.stringify(token)})`), false);
    const response = await fetch(`${origin}/verify-email`);
    assert.ok(response.headers.get('cache-control').includes('no-store'));
    assert.equal(response.headers.get('referrer-policy'), 'no-referrer');
  });

  await scenario('old backend links strip fragments and Continue explicitly; neither GET nor Continue verifies', async () => {
    const fixture = await command('fixture');
    const before = verifyRequests;
    const legacy = `http://127.0.0.1:${ready.port}/api/auth/verification${new URL(fixture.url).hash}`;
    await navigate(legacy); await text('Continue to email verification');
    assert.ok(await evaluate('location.hash === ""'));
    assert.equal(await evaluate('Boolean(document.querySelector("a[href*=token]"))'), false);
    assert.equal(verifyRequests, before);
    await click('Continue to email verification'); await text('Current password');
    assert.equal(await evaluate('location.origin'), origin);
    assert.ok(await evaluate('location.hash === ""'));
    assert.equal(verifyRequests, before);
    await submit(fixture.password); await text('Your email has been verified');
    await navigate(legacy); await text('Continue to email verification');
    await cdp.send('Page.reload'); await text('Reopen the link in your email');
    assert.equal(await evaluate('document.querySelector("#continue").disabled'), true);
    await navigate(legacy);
    await until(() => evaluate('!document.querySelector("#continue").disabled'), 'reopened bridge');
    assert.ok(await evaluate('location.hash === ""'));
  });

  await scenario('verification works while signed in and leaves the cookie and current identity unchanged', async () => {
    await navigate(`${origin}/login`); await text('Welcome back');
    await fill('email', verifiedFixture.email); await fill('password', verifiedFixture.password); await click('Login');
    await text('Hi, Verification Fixture');
    const before = await evaluate('fetch("/api/v1/me", {cache:"no-store"}).then(r=>r.json()).then(r=>r.data.user.id)');
    const cookies = (await cdp.send('Network.getAllCookies')).cookies;
    assert.ok(cookies.length > 0);
    const fixture = await command('fixture');
    await navigate(fixture.url); await text('Current password');
    await submit(fixture.password); await text('Your email has been verified');
    assert.equal(await evaluate('fetch("/api/v1/me", {cache:"no-store"}).then(r=>r.json()).then(r=>r.data.user.id)'), before);
    assert.ok(JSON.stringify((await cdp.send('Network.getAllCookies')).cookies) === JSON.stringify(cookies));
    assert.equal(await evaluate('Boolean(document.querySelector("input[name=currentPassword]"))'), false);
    await cdp.send('Network.clearBrowserCookies');
  });

  await scenario('invalid, expired, and consumed links show the same recovery screen', async () => {
    const expired = await command('fixture');
    await command('advance', { milliseconds: 86400000 });
    for (const url of [expired.url, verifiedFixture.url, `${origin}/verify-email#token=unknown-fixture`]) {
      await navigate(`${origin}/login`); await text('Welcome back');
      await navigate(url); await text('Current password');
      await submit(expired.password); await text('Link is invalid or expired.');
      assert.equal(await evaluate('Boolean(document.querySelector("input[name=currentPassword]"))'), false);
      await text('Request another verification email');
    }
  });

  await scenario('resend is explicit and generic for unknown, verified, eligible, cooldown and failed delivery outcomes', async () => {
    const fixture = await command('fixture');
    await navigate(`${origin}/login`); await text('Welcome back');
    await fill('email', fixture.email); await fill('password', fixture.password); await click('Login');
    await text('Verify your email address before logging in.');
    assert.equal((await command('messages', { email: fixture.email })).length, 1);
    await evaluate('Array.from(document.querySelectorAll("a")).find(a=>a.textContent.trim()==="Email verification").click()');
    await text('Email for verification');
    const resend = async email => {
      await fill('resendEmail', email); await click('Request verification email');
      await text('If this address is eligible, a verification email will be sent.');
      await until(() => evaluate('!document.querySelector("input[name=resendEmail]").disabled'), 'resend ready');
    };
    await resend(fixture.email);
    assert.equal((await command('messages', { email: fixture.email })).length, 1);
    await command('advance', { milliseconds: 60000 });
    await resend(fixture.email.toUpperCase());
    assert.equal((await command('messages', { email: fixture.email })).length, 2);
    await resend(verifiedFixture.email);
    await resend('unknown-fixture@example.com');
    await command('advance', { milliseconds: 60000 });
    await command('delivery', { enabled: false });
    await resend(fixture.email);
    await command('delivery', { enabled: true });
    assert.equal((await command('messages', { email: fixture.email })).length, 2);
    await resend(fixture.email);
    assert.equal((await command('messages', { email: fixture.email })).length, 2);
    resendMode = 'throttled';
    await fill('resendEmail', fixture.email); await click('Request verification email');
    await text('Try again in 37 seconds.');
    resendMode = 'lost';
    const before = resendRequests;
    await fill('resendEmail', fixture.email); await click('Request verification email');
    await text('We could not confirm the resend request.');
    assert.equal(resendRequests, before + 1);
    resendMode = 'normal';
  });

  await scenario('legacy credentials lead to recovery without carrying the password or verifying', async () => {
    const fixture = await command('fixture'); await command('legacy', { email: fixture.email });
    await navigate(fixture.url); await text('Current password');
    await submit(fixture.password); await text('Reset your password through account recovery before verifying.');
    assert.equal(await evaluate('Boolean(document.querySelector("input[name=currentPassword]"))'), false);
    assert.equal(await evaluate(`Array.from(document.querySelectorAll('a')).find(a=>a.textContent.trim()==='Recover your password').getAttribute('href')`), '/forgot-password');
  });

  await scenario('throttling keeps the form usable; a lost successful response shows uncertainty without repeating verification', async () => {
    const fixture = await command('fixture');
    await navigate(`${origin}/login`); await text('Welcome back');
    await navigate(fixture.url); await text('Current password');
    verificationMode = 'throttled';
    await submit(fixture.password); await text('Try again in 37 seconds.');
    verificationMode = 'lost';
    const before = verifyRequests;
    await submit(fixture.password); await text('We could not confirm verification.');
    assert.equal(verifyRequests, before + 1);
    assert.equal(await evaluate('Boolean(document.querySelector("input[name=currentPassword]"))'), false);
    await text('Log in separately'); await text('Recover your password'); await text('Request another verification email');
    verificationMode = 'normal';
    assert.ok(requestPaths.every(url => !url.includes('token') && !url.includes('currentPassword')));
  });
});
