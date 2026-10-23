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

test('verification and recovery work in the localhost browser with real backend lifecycle rules', {
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
  let recoveryMode = 'normal';
  let resetMode = 'normal';
  let termsMode = 'normal';
  let consentMode = 'normal';
  let applicationMode = 'normal';
  let verifyRequests = 0;
  let resendRequests = 0;
  let recoveryRequests = 0;
  let resetRequests = 0;
  let consentRequests = 0;
  let applicationRequests = 0;
  const requestPaths = [];
  const mutationOrigins = [];
  const proxy = createServer((req, res) => {
    requestPaths.push(req.url);
    if (req.method === 'POST') mutationOrigins.push(req.headers.origin);
    const verifying = req.url === '/api/auth/verify-email';
    const resending = req.url === '/api/auth/resend-verification';
    const recovering = req.url === '/api/auth/request-password-reset';
    const resetting = req.url === '/api/auth/reset-password';
    const accepting = req.url === '/api/auth/accept-terms';
    const applying = req.url === '/api/v1/organizer-applications';
    if (verifying) verifyRequests++;
    if (resending) resendRequests++;
    if (recovering) recoveryRequests++;
    if (resetting) resetRequests++;
    if (accepting) consentRequests++;
    if (applying) applicationRequests++;
    if (req.url === '/api/v1/terms' && termsMode === 'unavailable') {
      res.writeHead(503, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: { code: 'INTERNAL_ERROR' } })); return;
    }
    if ((verifying && verificationMode === 'throttled') || (resending && resendMode === 'throttled') || (recovering && recoveryMode === 'throttled') || (resetting && resetMode === 'throttled') || (accepting && consentMode === 'throttled') || (applying && applicationMode === 'throttled')) {
      res.writeHead(429, { 'Content-Type': 'application/json', 'Retry-After': '37' });
      res.end(JSON.stringify({ error: { code: 'RATE_LIMITED' } })); return;
    }
    const upstream = httpRequest({ hostname: '127.0.0.1', port: ready.port, path: req.url, method: req.method, headers: req.headers }, response => {
      if ((verifying && verificationMode === 'lost') || (resending && resendMode === 'lost') || (recovering && recoveryMode === 'lost') || (resetting && resetMode === 'lost') || (accepting && consentMode === 'lost') || (applying && applicationMode === 'lost')) { response.resume(); response.on('end', () => res.destroy()); return; }
      if (applying && applicationMode === 'unusable') {
        response.resume();
        response.on('end', () => { res.writeHead(200, { 'Content-Type': 'application/json' }); res.end(JSON.stringify({ unexpected: true })); });
        return;
      }
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
  let browser = spawn(browserPath, ['--headless=new', '--no-first-run', '--no-default-browser-check', '--remote-debugging-port=0', `--user-data-dir=${profile}`, 'about:blank'],
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
    if (result.exceptionDetails) throw Error(`Browser evaluation failed: ${result.exceptionDetails.exception?.description ?? result.exceptionDetails.text}`);
    return result.result.value;
  };
  const navigate = url => cdp.send('Page.navigate', { url });
  const text = async value => {
    try { await until(() => evaluate(`(document.body?.innerText ?? "").includes(${JSON.stringify(value)})`), value, 30000); }
    catch (error) {
      console.error('Browser state:', await evaluate('JSON.stringify({path:location.pathname,body:document.body?.innerText.slice(0,1000),notices:Array.from(document.querySelectorAll("h1,[role=alert],[role=status]")).map(n=>n.innerText)})'));
      throw error;
    }
  };
  const click = async label => {
    const expression = `Array.from(document.querySelectorAll('button')).find(button => button.textContent.trim() === ${JSON.stringify(label)})`;
    await until(() => evaluate(`Boolean(${expression})`), label);
    await evaluate(`${expression}.click()`);
  };
  const clickLink = label => until(() => evaluate(`(() => { const link = Array.from(document.querySelectorAll('a')).find(a => a.textContent.trim() === ${JSON.stringify(label)}); if (!link) return false; link.click(); return true; })()`), label);
  const fill = (name, value) => evaluate(`document.querySelector('[name="${name}"]').value = ${JSON.stringify(value)}`);
  const submit = async password => { await fill('currentPassword', password); await click('Verify email'); };
  const reset = async password => { await fill('newPassword', password); await fill('confirmPassword', password); await click('Reset password'); };
  const recover = async email => {
    await navigate(`${origin}/forgot-password`); await text('Forgot your password?');
    await fill('email', email); await click('Request recovery link');
    await text('If an account exists for this address, a password-reset email will be sent.');
  };
  const scenario = async (name, run) => {
    let failure;
    await t.test(name, async () => { try { await run(); } catch (error) { failure = error; throw error; } });
    if (failure) throw failure;
  };

  const checkTerms = async () => {
    await text('current terms (version');
    await evaluate('document.querySelector("input[name=terms]").click()');
  };
  const register = async fixture => {
    await navigate(`${origin}/register/attendee`);
    await text('Create your Attendee Account');
    await text('current terms (version');
    const documentUrl = await evaluate('document.querySelector("input[name=terms]").closest("label").querySelector("a").href');
    assert.equal(new URL(documentUrl).origin, origin);
    assert.equal((await fetch(documentUrl)).status, 200);
    await checkTerms();
    for (const [name, value] of Object.entries({
      firstName: 'Joined', lastName: 'Journey', email: fixture.email,
      password: fixture.password, confirmPassword: fixture.password,
    })) await fill(name, value);
    await click('Register');
  };
  const accept = async password => { await fill('currentPassword', password); await click('Accept current terms'); };
  const readyLogin = () => until(async () => {
    const visible = await evaluate('(() => { const email = document.querySelector("input[name=email]"); const button = document.querySelector("button[type=submit]"); return Boolean(email && email.offsetParent !== null && button?.textContent.trim() === "Login"); })()');
    if (!visible) return false;
    await click('Login');
    return evaluate('document.querySelector("#email-error")?.textContent === "Enter a valid email address."');
  }, 'login form validation');

  let joinedFixture;
  await scenario('registration through current terms joins captured email verification and separate login', async () => {
    const fixture = await command('registrationFixture');
    joinedFixture = fixture;
    await register(fixture);
    await text('You have not been signed in');
    assert.equal((await cdp.send('Network.getAllCookies')).cookies.length, 0);
    const mail = await command('messages', { email: fixture.email });
    assert.equal(mail.length, 1);
    assert.equal(new URL(mail[0].url).pathname, '/verify-email');
    const emailTab = await (await fetch(`http://${new URL(debuggerUrl).host}/json/new?about:blank`, { method: 'PUT' })).json();
    const emailBrowser = await connect(emailTab.webSocketDebuggerUrl);
    const registrationTab = cdp;
    try {
      await emailBrowser.send('Page.enable'); await emailBrowser.send('Runtime.enable'); await emailBrowser.send('Network.enable');
      cdp = emailBrowser;
      await navigate(mail[0].url);
      await text('Current password');
      assert.equal(await evaluate('location.hash'), '');
      assert.equal((await cdp.send('Network.getAllCookies')).cookies.length, 0);
      await submit(fixture.password);
      await text('Your email has been verified');
      assert.equal((await cdp.send('Network.getAllCookies')).cookies.length, 0);
      await clickLink('Log in separately');
      await text('Welcome back');
      await fill('email', fixture.email); await fill('password', fixture.password); await click('Login');
      await until(() => evaluate('location.pathname === "/events"'), 'separate attendee login in fresh email tab');
      assert.ok((await cdp.send('Network.getAllCookies')).cookies.some(cookie => cookie.name === 'better-auth.session_token'));
    } finally { cdp = registrationTab; await emailBrowser.send('Page.close').catch(() => {}); emailBrowser.close(); }
    assert.ok(mutationOrigins.length >= 3 && mutationOrigins.every(value => value === origin));
    await cdp.send('Network.clearBrowserCookies');
  });

  const applyAsOrganizer = async fixture => {
    await navigate(`${origin}/register/organizer`);
    await text('Apply as an Organizer');
    await checkTerms();
    for (const [name, value] of Object.entries({ firstName: 'Browser', lastName: 'Organizer',
      email: fixture.email, organizationName: 'Manila Live',
      organizationDescription: 'We organize live music events around Manila.',
      password: fixture.password, confirmPassword: fixture.password })) await fill(name, value);
    await click('Submit Organizer Application');
  };

  await scenario('a rejected organizer submission shows its rate limit without claiming uncertain creation', async () => {
    const fixture = await command('registrationFixture');
    const before = applicationRequests;
    applicationMode = 'throttled';
    try {
      await applyAsOrganizer(fixture);
      await text('Too many attempts. Please wait before trying again. Try again in 37 seconds.');
      assert.equal(await evaluate('(document.body?.innerText ?? "").includes("We could not confirm whether your application was saved")'), false);
      assert.equal(await evaluate('document.querySelector("[name=email]").value'), fixture.email);
      assert.equal(await evaluate('document.querySelector("[name=password]").value'), '');
      assert.equal(await evaluate('document.querySelector("button[type=submit]").disabled'), false);
      assert.equal(applicationRequests, before + 1);
      assert.equal((await command('messages', { email: fixture.email })).length, 0);
    } finally { applicationMode = 'normal'; }
  });

  await scenario('organizer form explains consent and validates fields on mobile without submitting', async () => {
    await cdp.send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
    try {
      await navigate(`${origin}/register/organizer`);
      await text('Apply as an Organizer');
      await text('current terms (version');
      assert.equal(await evaluate('document.querySelector("button[type=submit]").disabled'), true);
      assert.equal(await evaluate('document.documentElement.scrollWidth <= window.innerWidth + 1'), true);
      await checkTerms();
      for (const [name, value] of Object.entries({ firstName: 'Browser', lastName: 'Organizer',
        email: 'mobile-organizer@example.com', organizationName: 'X', organizationDescription: 'short',
        password: 'long organizer passphrase', confirmPassword: 'long organizer passphrase' })) await fill(name, value);
      const before = applicationRequests;
      await click('Submit Organizer Application');
      await text('Use 2–150 Unicode characters.');
      await text('Use 20–2,000 Unicode characters.');
      assert.equal(applicationRequests, before);
    } finally {
      await cdp.send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });
    }
  });

  await scenario('organizer applies, verifies, and sees pending review without a login session', async () => {
    const fixture = await command('registrationFixture');
    await applyAsOrganizer(fixture);
    await text('Your organizer application was saved');
    assert.equal((await cdp.send('Network.getAllCookies')).cookies.length, 0);
    const mail = await command('messages', { email: fixture.email });
    assert.equal(mail.length, 1);
    await navigate(mail[0].url); await text('Current password');
    await submit(fixture.password); await text('Your email has been verified');
    await navigate(`${origin}/login`); await text('Welcome back');
    await fill('email', fixture.email); await fill('password', 'incorrect password'); await click('Login');
    await text('The email address or password is incorrect.');
    await fill('password', fixture.password); await click('Login');
    await text('awaiting administrator approval');
    assert.equal((await cdp.send('Network.getAllCookies')).cookies.length, 0);
  });

  let reviewAdministrator;
  await scenario('administrator finds a verified application, approves it, and sees durable history', async () => {
    const applicant = await command('registrationFixture');
    await applyAsOrganizer(applicant);
    await text('Your organizer application was saved');
    const verification = await command('messages', { email: applicant.email });
    await navigate(verification[0].url);
    await text('Current password');
    await submit(applicant.password);
    await text('Your email has been verified');
    const administrator = await command('adminFixture');
    reviewAdministrator = administrator;
    await navigate(`${origin}/login`);
    await text('Welcome back');
    await fill('email', administrator.email);
    await fill('password', administrator.password);
    await click('Login');
    await until(() => evaluate('location.pathname === "/admin/dashboard"'), 'administrator login');
    await navigate(`${origin}/admin/organizers`);
    await text('Organizer applications');
    await until(() => evaluate('Boolean(document.querySelector("#organizer-search"))'), 'review search');
    await until(() => evaluate('document.querySelectorAll("tbody tr").length > 0'), 'loaded review rows');
    await fill('search', applicant.email);
    try {
      await until(() => evaluate(`document.querySelector('#organizer-search')?.value === ${JSON.stringify(applicant.email)}
        && Array.from(document.querySelectorAll('button')).some(button => button.textContent.trim() === 'Search')`), 'organizer search input', 5000);
    } catch (error) {
      console.error('Review search state:', await evaluate('JSON.stringify({path:location.pathname,searchLength:document.querySelector("#organizer-search")?.value.length,buttons:Array.from(document.querySelectorAll("button")).map(button=>button.textContent.trim()).slice(0,20)})'));
      throw error;
    }
    await click('Search');
    await text(applicant.email);
    await until(() => evaluate('document.querySelectorAll("tbody tr").length === 1'), 'matching organizer');
    await click('View details');
    await text('Submitted application');
    await text('We organize live music events around Manila.');
    await click('Approve');
    await text('Approve this application?');
    await click('Confirm decision');
    await text('Decision saved and email accepted by the provider.');
    await text('Decision history');
    await until(() => evaluate('(document.body?.innerText ?? "").includes("PENDING → APPROVED")'), 'approved decision history');
    assert.deepEqual((await command('decisionMessages', { email: applicant.email })).map(message => message.kind), ['APPROVED']);
    await click('Suspend');
    await text('Suspend organizer access?');
    await evaluate(`(() => { const input = document.querySelector('#decision-reason');
      Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set.call(input, 'Access paused for review');
      input.dispatchEvent(new Event('input', { bubbles: true })); })()`);
    await until(() => evaluate('!Array.from(document.querySelectorAll("button")).find(button => button.textContent.trim() === "Confirm decision").disabled'), 'suspension reason');
    await click('Confirm decision');
    await until(() => evaluate('(document.body?.innerText ?? "").includes("APPROVED → SUSPENDED")'), 'suspension history');
    await click('Reinstate');
    await text('A fresh login will be required.');
    await click('Confirm decision');
    await until(() => evaluate('(document.body?.innerText ?? "").includes("SUSPENDED → APPROVED")'), 'reinstatement history');
    assert.deepEqual((await command('decisionMessages', { email: applicant.email })).map(message => message.kind), ['APPROVED', 'SUSPENDED', 'REINSTATED']);
    await cdp.send('Network.clearBrowserCookies');
    await navigate(`${origin}/login`);
    await text('Welcome back');
    await fill('email', applicant.email);
    await fill('password', applicant.password);
    await click('Login');
    await until(() => evaluate('location.pathname === "/organizer/dashboard"'), 'approved organizer login');
    await cdp.send('Network.clearBrowserCookies');
  });

  await scenario('administrator rejects another verified application with a final reason', async () => {
    const applicant = await command('registrationFixture');
    await applyAsOrganizer(applicant);
    await text('Your organizer application was saved');
    const verification = await command('messages', { email: applicant.email });
    await navigate(verification[0].url);
    await text('Current password');
    await submit(applicant.password);
    await text('Your email has been verified');
    await navigate(`${origin}/login`);
    await text('Welcome back');
    await fill('email', reviewAdministrator.email);
    await fill('password', reviewAdministrator.password);
    await click('Login');
    await until(() => evaluate('location.pathname === "/admin/dashboard"'), 'administrator login for rejection');
    await navigate(`${origin}/admin/organizers`);
    await until(() => evaluate('document.querySelectorAll("tbody tr").length > 0'), 'review rows for rejection');
    await fill('search', applicant.email);
    await click('Search');
    await until(() => evaluate('document.querySelectorAll("tbody tr").length === 1'), 'matching rejection applicant');
    await click('View details');
    await text('Submitted application');
    await click('Reject');
    await text('Reject this application permanently?');
    await evaluate(`(() => { const input = document.querySelector('#decision-reason');
      Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set.call(input, 'The music event plan is incomplete');
      input.dispatchEvent(new Event('input', { bubbles: true })); })()`);
    await until(() => evaluate('!Array.from(document.querySelectorAll("button")).find(button => button.textContent.trim() === "Confirm decision").disabled'), 'rejection reason');
    await click('Confirm decision');
    await until(() => evaluate('(document.body?.innerText ?? "").includes("PENDING → REJECTED")'), 'rejection history');
    assert.deepEqual((await command('decisionMessages', { email: applicant.email })).map(message => ({ kind: message.kind, reason: message.reason })),
      [{ kind: 'REJECTED', reason: 'The music event plan is incomplete' }]);
    await cdp.send('Network.clearBrowserCookies');
    await navigate(`${origin}/login`);
    await text('Welcome back');
    await fill('email', applicant.email);
    await fill('password', applicant.password);
    await click('Login');
    await text('This decision is final for this account');
    assert.equal((await cdp.send('Network.getAllCookies')).cookies.length, 0);
  });

  await scenario('lost organizer submission response preserves the non-password draft and does not retry', async () => {
    const fixture = await command('registrationFixture');
    const before = applicationRequests;
    applicationMode = 'lost';
    try {
      await applyAsOrganizer(fixture);
      await text('We could not confirm whether your application was saved');
      assert.equal(applicationRequests, before + 1);
      assert.equal(await evaluate('document.querySelector("[name=email]").value'), fixture.email);
      assert.equal(await evaluate('document.querySelector("[name=organizationName]").value'), 'Manila Live');
      assert.equal(await evaluate('document.querySelector("[name=password]").value'), '');
      assert.equal(await evaluate('document.querySelector("[name=confirmPassword]").value'), '');
      await text('Request another verification email');
      assert.equal((await command('messages', { email: fixture.email })).length, 1);
    } finally { applicationMode = 'normal'; }
  });

  await scenario('unusable organizer submission response preserves the draft and does not retry', async () => {
    const fixture = await command('registrationFixture');
    const before = applicationRequests;
    applicationMode = 'unusable';
    try {
      await applyAsOrganizer(fixture);
      await text('We could not confirm whether your application was saved');
      assert.equal(applicationRequests, before + 1);
      assert.equal(await evaluate('document.querySelector("[name=email]").value'), fixture.email);
      assert.equal(await evaluate('document.querySelector("[name=organizationName]").value'), 'Manila Live');
      assert.equal(await evaluate('document.querySelector("[name=password]").value'), '');
      assert.equal(await evaluate('document.querySelector("[name=confirmPassword]").value'), '');
      assert.equal((await command('messages', { email: fixture.email })).length, 1);
    } finally { applicationMode = 'normal'; }
  });

  await scenario('failed organizer verification email leaves a saved application and offers resend', async () => {
    const fixture = await command('registrationFixture');
    await command('delivery', { enabled: false });
    try {
      await applyAsOrganizer(fixture);
      await text('Your organizer application was saved, but the verification email could not be sent');
      await text('Wait at least one minute after applying');
      await text('Request another verification email');
      assert.equal((await command('messages', { email: fixture.email })).length, 0);
      assert.equal((await cdp.send('Network.getAllCookies')).cookies.length, 0);
    } finally { await command('delivery', { enabled: true }); }
    await command('advance', { milliseconds: 60000 });
    await clickLink('Request another verification email');
    await text('Email for verification');
    await fill('resendEmail', fixture.email); await click('Request verification email');
    await text('If this address is eligible, a verification email will be sent.');
    assert.equal((await command('messages', { email: fixture.email })).length, 1);
  });

  await scenario('failed initial delivery keeps the account, duplicate registration is rejected, and resend supplies a link', async () => {
    const fixture = await command('registrationFixture');
    await command('delivery', { enabled: false });
    await register(fixture);
    await text('terms acceptance were saved');
    assert.equal((await command('messages', { email: fixture.email })).length, 0);
    assert.equal((await cdp.send('Network.getAllCookies')).cookies.length, 0);
    await command('delivery', { enabled: true });
    await register(fixture);
    await text('existing account has not been changed');
    await command('advance', { milliseconds: 60000 });
    await navigate(`${origin}/verify-email`); await text('Email for verification');
    await fill('resendEmail', fixture.email); await click('Request verification email');
    await text('If this address is eligible, a verification email will be sent.');
    assert.equal((await command('messages', { email: fixture.email })).length, 1);
  });

  await scenario('missing consent follows login to current terms, prefills email, records consent without a session, then allows separate login', async () => {
    const fixture = await command('consentFixture');
    const destination = '/events/fixture/tickets';
    await navigate(`${origin}/login?returnTo=${encodeURIComponent(destination)}`); await text('Welcome back');
    await readyLogin();
    await fill('email', fixture.email); await fill('password', fixture.password); await click('Login');
    await text('Accept the current terms with your password');
    await clickLink('Accept current terms');
    await text('current terms (version verification-browser-fixture)');
    assert.equal(await evaluate('document.querySelector("input[name=email]").value'), fixture.email);
    assert.equal(await evaluate('document.querySelector("input[name=currentPassword]").value'), '');
    assert.equal(await evaluate('new URLSearchParams(location.search).get("returnTo")'), destination);
    assert.equal(await evaluate('new URLSearchParams(location.search).has("password")'), false);
    await checkTerms(); await accept(fixture.password);
    await text('This account has terms acceptance on record.');
    assert.deepEqual((await cdp.send('Network.getAllCookies')).cookies.map(cookie => ({ name: cookie.name, domain: cookie.domain })), []);
    await clickLink('Log in separately');
    await text('Welcome back');
    assert.equal(await evaluate('new URLSearchParams(location.search).get("returnTo")'), destination);
    await fill('email', fixture.email); await fill('password', fixture.password); await click('Login');
    await until(() => evaluate('location.pathname === "/events/fixture/tickets"'), 'consent return destination');
    assert.ok((await cdp.send('Network.getAllCookies')).cookies.some(cookie => cookie.name === 'better-auth.session_token'));
    await command('clearConsent', { email: fixture.email });
    await navigate(`${origin}/dashboard/tickets`);
    await text('Accept the current terms with your password');
    await clickLink('Accept current terms');
    await text('current terms (version verification-browser-fixture)');
    assert.equal(await evaluate('location.pathname'), '/accept-terms');
    assert.equal(await evaluate('document.querySelector("input[name=currentPassword]").value'), '');
    await cdp.send('Network.clearBrowserCookies');
  });

  await scenario('unavailable and changed terms disable or clear acceptance, retain email, and require another explicit submission', async () => {
    const fixture = await command('consentFixture');
    termsMode = 'unavailable';
    await navigate(`${origin}/accept-terms?email=${encodeURIComponent(fixture.email)}`);
    await text('Current terms could not be loaded.');
    assert.equal(await evaluate('document.querySelector("button[type=submit]").disabled'), true);
    termsMode = 'normal';
    await click('Retry current terms'); await text('current terms (version verification-browser-fixture)');
    await checkTerms();
    await command('termsVersion', { version: 'verification-browser-fixture-v2' });
    const before = consentRequests;
    await accept(fixture.password);
    await text('The terms have changed.');
    await text('current terms (version verification-browser-fixture-v2)');
    assert.equal(consentRequests, before + 1);
    assert.equal(await evaluate('document.querySelector("input[name=terms]").checked'), false);
    assert.equal(await evaluate('document.querySelector("input[name=email]").value'), fixture.email);
    assert.equal(await evaluate('document.querySelector("input[name=currentPassword]").value'), '');
    await checkTerms(); await accept(fixture.password);
    await text('This account has terms acceptance on record.');
    assert.equal((await cdp.send('Network.getAllCookies')).cookies.length, 0);
  });

  await scenario('legacy consent requires recovery, then a fresh password and genuine acceptance', async () => {
    const fixture = await command('consentFixture');
    await command('legacy', { email: fixture.email });
    await navigate(`${origin}/accept-terms?email=${encodeURIComponent(fixture.email)}`);
    await checkTerms(); await accept(fixture.password);
    await text('This account needs a password reset before consent can be recorded.');
    assert.equal((await cdp.send('Network.getAllCookies')).cookies.length, 0);
    await clickLink('Recover your password');
    await text('Forgot your password?');
    assert.equal(await evaluate('Boolean(document.querySelector("input[name=currentPassword]"))'), false);
    await fill('email', fixture.email); await click('Request recovery link');
    await text('If an account exists for this address, a password-reset email will be sent.');
    const mail = (await command('recoveryMessages', { email: fixture.email })).at(-1);
    await navigate(mail.url); await text('New Password');
    const newPassword = ' newly recovered consent 🔒 ';
    await fill('newPassword', newPassword); await fill('confirmPassword', newPassword); await click('Reset password');
    await text('Your password has been reset.');
    await navigate(`${origin}/accept-terms?email=${encodeURIComponent(fixture.email)}`);
    await checkTerms(); await accept(newPassword);
    await text('This account has terms acceptance on record.');
    assert.equal((await cdp.send('Network.getAllCookies')).cookies.length, 0);
  });

  await scenario('a lost consent response shows uncertainty and does not submit acceptance again', async () => {
    const fixture = await command('consentFixture');
    await navigate(`${origin}/accept-terms?email=${encodeURIComponent(fixture.email)}`);
    await checkTerms();
    consentMode = 'lost';
    const before = consentRequests;
    await accept(fixture.password); await text('We could not confirm whether consent was recorded.');
    assert.equal(consentRequests, before + 1);
    await text('Log in separately'); await text('Recover your password');
    consentMode = 'normal';
  });
  await command('termsVersion', { version: 'verification-browser-fixture' });
  await cdp.send('Network.clearBrowserCookies');

  let verifiedFixture;
  await scenario('a new email opens a fragment-free password form without verifying or signing in; wrong password can retry the same link', async () => {
    const fixture = await command('fixture');
    verifiedFixture = fixture;
    const before = verifyRequests;
    assert.equal(new URL(fixture.url).pathname, '/verify-email');
    await navigate(fixture.url);
    await text('Current password');
    assert.ok(await evaluate('location.hash === ""'));
    assert.equal(verifyRequests, before);
    assert.equal((await cdp.send('Network.getAllCookies')).cookies.length, 0);
    await evaluate(`document.querySelector('a[href="#main-content"]').click()`);
    assert.equal(await evaluate('Boolean(document.querySelector("input[name=currentPassword]"))'), true);
    await submit('wrong password');
    await text('The current password is incorrect');
    await submit(fixture.password);
    await text('Your email has been verified');
    assert.equal(verifyRequests, before + 2);
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
    await clickLink('Email verification');
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

  let recoveryFixture, recoveryMail;
  const replacement = ' new browser password e\u0301 🔒 ';
  await scenario('recovery requests a generic email and opens an inert reset form with the fragment stripped', async () => {
    const beforeReset = resetRequests;
    const fixture = await command('fixture');
    recoveryFixture = fixture;
    await navigate(`${origin}/forgot-password?returnTo=${encodeURIComponent('/events/fixture/tickets')}`);
    await text('Forgot your password?');
    await fill('email', ` ${fixture.email.toUpperCase()} `); await click('Request recovery link');
    await text('If an account exists for this address, a password-reset email will be sent.');
    const mail = (await command('recoveryMessages', { email: fixture.email }))[0];
    recoveryMail = mail;
    assert.equal(new URL(mail.url).pathname, '/reset-password');
    assert.equal(new URL(mail.url).search, '');
    await navigate(mail.url); await text('New Password');
    assert.ok(await evaluate('location.hash === ""'));
    assert.equal(await evaluate('document.querySelector("input[name=newPassword]").disabled'), false);
    assert.deepEqual((await cdp.send('Network.getAllCookies')).cookies.map(cookie => ({ name: cookie.name, domain: cookie.domain })), []);
    assert.equal(resetRequests, beforeReset);
    const response = await fetch(`${origin}/reset-password`);
    assert.ok(response.headers.get('cache-control').includes('no-store'));
    assert.equal(response.headers.get('referrer-policy'), 'no-referrer');
  });

  await scenario('reset reload/reopen and old-link Continue keep the token private without preflight or mutation', async () => {
    const before = resetRequests;
    await cdp.send('Page.reload'); await text('Reopen the link in your email');
    assert.equal(await evaluate('Boolean(document.querySelector("input[name=newPassword]"))'), false);
    await navigate(recoveryMail.url); await text('New Password');
    await evaluate(`document.querySelector('a[href="#main-content"]').click()`);
    assert.equal(await evaluate('Boolean(document.querySelector("input[name=newPassword]"))'), true);
    const token = new URLSearchParams(new URL(recoveryMail.url).hash.slice(1)).get('token');
    assert.equal(await evaluate(`JSON.stringify([history.state, Object.entries(localStorage), Object.entries(sessionStorage)]).includes(${JSON.stringify(token)})`), false);
    const legacy = `http://127.0.0.1:${ready.port}/api/auth/password-reset${new URL(recoveryMail.url).hash}`;
    await navigate(legacy); await text('Continue to password reset');
    assert.ok(await evaluate('location.hash === ""'));
    assert.equal(await evaluate('Boolean(document.querySelector("a[href*=token]"))'), false);
    await cdp.send('Page.reload'); await text('Reopen the link in your email');
    assert.equal(await evaluate('document.querySelector("#continue").disabled'), true);
    await navigate(legacy);
    await until(() => evaluate('!document.querySelector("#continue").disabled'), 'reopened reset bridge');
    await click('Continue to password reset'); await text('New Password');
    assert.equal(await evaluate('location.origin'), origin);
    assert.ok(await evaluate('location.hash === ""'));
    assert.equal(resetRequests, before);
  });

  await scenario('reset validates exact Unicode and local confirmation, keeps reuse actionable, and preserves verification', async () => {
    const before = resetRequests;
    for (const password of ['🔒'.repeat(14), '🔒'.repeat(129)]) {
      await reset(password); await text('Use 15–128 Unicode characters.');
    }
    await fill('newPassword', replacement); await fill('confirmPassword', replacement + 'x'); await click('Reset password');
    await text('Passwords must match.');
    assert.equal(resetRequests, before);
    await reset(recoveryFixture.password); await text('Choose a new password that differs');
    assert.equal(await evaluate('document.querySelector("input[name=newPassword]").value'), '');
    await reset(replacement); await text('Your password has been reset.');
    assert.equal((await cdp.send('Network.getAllCookies')).cookies.length, 0);
    await navigate(`${origin}/login`); await text('Welcome back');
    await fill('email', recoveryFixture.email); await fill('password', replacement); await click('Login');
    await text('Verify your email address before logging in.');
    await navigate(recoveryFixture.url); await text('Current password');
    await submit(replacement); await text('Your email has been verified');
    assert.equal((await cdp.send('Network.getAllCookies')).cookies.length, 0);
  });

  await scenario('reset while signed in revokes all target sessions, clears browser identity and refreshes another tab', async () => {
    const login = async () => {
      await navigate(`${origin}/login`); await text('Welcome back');
      await fill('email', recoveryFixture.email); await fill('password', replacement); await click('Login');
      await text('Hi, Verification Fixture');
      return (await cdp.send('Network.getAllCookies')).cookies.find(cookie => cookie.name === 'better-auth.session_token');
    };
    const first = await login();
    await cdp.send('Network.clearBrowserCookies');
    const second = await login();
    const otherTab = await (await fetch(`http://${new URL(debuggerUrl).host}/json/new?about:blank`, { method: 'PUT' })).json();
    const other = await connect(otherTab.webSocketDebuggerUrl);
    try {
      await other.send('Page.enable'); await other.send('Runtime.enable');
      await other.send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });
      await other.send('Page.navigate', { url: `${origin}/events` });
      const readOther = async () => (await other.send('Runtime.evaluate', { expression: 'document.body?.innerText ?? ""', returnByValue: true })).result.value;
      try { await until(async () => (await readOther()).includes('Hi, Verification Fixture'), 'other tab signed in', 15000); }
      catch (error) {
        const state = await other.send('Runtime.evaluate', { expression: 'fetch("/api/v1/me",{cache:"no-store"}).then(async r=>JSON.stringify({url:location.href,ready:document.readyState,body:document.body?.innerText,meStatus:r.status}))', returnByValue: true, awaitPromise: true });
        const cookies = (await other.send('Network.getAllCookies')).cookies.map(cookie => cookie.name);
        throw Error(`${error.message}; other tab: ${state.result.value}; cookie names: ${cookies}`);
      }
      await command('advance', { milliseconds: 60000 });
      await recover(recoveryFixture.email);
      const mail = (await command('recoveryMessages', { email: recoveryFixture.email })).at(-1);
      await navigate(mail.url); await text('New Password');
      await text('If this browser belongs to another account, its other devices stay signed in.');
      await reset(' latest browser password 🔒 '); await text('Your password has been reset.');
      assert.equal((await cdp.send('Network.getAllCookies')).cookies.length, 0);
      await until(async () => { const body = await readOther(); return !body.includes('Hi, Verification Fixture') && body.includes('Log in'); }, 'other tab refreshed after reset');
      for (const cookie of [first, second]) {
        assert.equal((await fetch(`${origin}/api/v1/me`, { headers: { Cookie: `${cookie.name}=${cookie.value}` } })).status, 401);
      }
      assert.equal(await evaluate('document.body.innerText.includes("Hi, Verification Fixture")'), false);
    } finally { await other.send('Page.close').catch(() => {}); other.close(); }
  });

  await scenario('reset of another account clears this browser while that other signed-in account keeps its other devices', async () => {
    const signIn = async () => {
      await navigate(`${origin}/login`); await text('Welcome back');
      await fill('email', verifiedFixture.email); await fill('password', verifiedFixture.password); await click('Login');
      await text('Hi, Verification Fixture');
      return (await cdp.send('Network.getAllCookies')).cookies.find(cookie => cookie.name === 'better-auth.session_token');
    };
    const otherDevice = await signIn();
    await cdp.send('Network.clearBrowserCookies');
    await signIn();
    const target = await command('fixture');
    await recover(target.email);
    const mail = (await command('recoveryMessages', { email: target.email }))[0];
    await navigate(mail.url); await text('New Password');
    await reset(replacement); await text('Your password has been reset.');
    assert.equal((await cdp.send('Network.getAllCookies')).cookies.length, 0);
    assert.equal((await fetch(`${origin}/api/v1/me`)).status, 401);
    const stillSignedIn = await fetch(`${origin}/api/v1/me`, { headers: { Cookie: `${otherDevice.name}=${otherDevice.value}` } });
    assert.equal(stillSignedIn.status, 200);
    assert.equal((await stillSignedIn.json()).data.user.email, verifiedFixture.email);
  });

  await scenario('legacy login and protected-access gates open recovery without carrying a password', async () => {
    await navigate(`${origin}/login`); await text('Welcome back');
    await fill('email', verifiedFixture.email); await fill('password', verifiedFixture.password); await click('Login');
    await text('Hi, Verification Fixture');
    await command('legacy', { email: verifiedFixture.email });
    await navigate(`${origin}/dashboard`);
    await text('Reset your password through account recovery before logging in.');
    await clickLink('Reset password');
    await text('Forgot your password?');
    assert.equal(await evaluate('Boolean(document.querySelector("input[type=password]"))'), false);
    await cdp.send('Network.clearBrowserCookies');
    const destination = '/events/fixture/tickets';
    await navigate(`${origin}/login?returnTo=${encodeURIComponent(destination)}`); await text('Welcome back');
    await fill('email', verifiedFixture.email); await fill('password', verifiedFixture.password); await click('Login');
    await text('Reset your password through account recovery before logging in.');
    await clickLink('Reset password');
    await text('Forgot your password?');
    assert.equal(await evaluate('new URLSearchParams(location.search).get("returnTo")'), destination);
    await fill('email', verifiedFixture.email); await click('Request recovery link');
    await text('If an account exists for this address, a password-reset email will be sent.');
    const mail = (await command('recoveryMessages', { email: verifiedFixture.email })).at(-1);
    assert.equal(new URL(mail.url).search, '');
  });

  await scenario('invalid, expired, and used reset links share one recovery screen', async () => {
    const fixture = await command('fixture');
    await recover(fixture.email);
    const mail = (await command('recoveryMessages', { email: fixture.email }))[0];
    await command('advance', { milliseconds: 1800000 });
    for (const url of [mail.url, recoveryMail.url, `${origin}/reset-password#token=unknown-fixture`]) {
      await navigate(`${origin}/forgot-password`); await text('Forgot your password?');
      await navigate(url); await text('New Password');
      await reset(replacement); await text('Link is invalid or expired. Request a new recovery link');
      assert.equal(await evaluate('Boolean(document.querySelector("input[name=newPassword]"))'), false);
    }
  });

  await scenario('recovery keeps cooldown and delivery outcomes generic and handles throttled or lost responses explicitly', async () => {
    const fixture = await command('fixture');
    await recover('unknown-recovery@example.com');
    await recover(fixture.email); await recover(fixture.email);
    assert.equal((await command('recoveryMessages', { email: fixture.email })).length, 1);
    await command('advance', { milliseconds: 60000 });
    await command('delivery', { enabled: false });
    await recover(fixture.email);
    await command('delivery', { enabled: true });
    await recover(fixture.email);
    assert.equal((await command('recoveryMessages', { email: fixture.email })).length, 1);
    recoveryMode = 'throttled';
    await navigate(`${origin}/forgot-password`); await text('Forgot your password?');
    await fill('email', fixture.email); await click('Request recovery link'); await text('Try again in 37 seconds.');
    recoveryMode = 'lost';
    const before = recoveryRequests;
    await click('Request recovery link'); await text('We could not confirm the recovery request.');
    assert.equal(recoveryRequests, before + 1);
    recoveryMode = 'normal';
    await command('advance', { milliseconds: 60000 });
    await recover(fixture.email);
    const mail = (await command('recoveryMessages', { email: fixture.email })).at(-1);
    await navigate(mail.url); await text('New Password');
    resetMode = 'throttled';
    await reset(replacement); await text('Try again in 37 seconds.');
    resetMode = 'lost';
    const resets = resetRequests;
    await reset(replacement); await text('We could not confirm the password reset.');
    assert.equal(resetRequests, resets + 1);
    assert.equal(await evaluate('Boolean(document.querySelector("input[name=newPassword]"))'), false);
    await text('Log in separately'); await text('Request a new recovery link');
    resetMode = 'normal';
    assert.ok(requestPaths.every(url => !url.includes('token') && !url.includes('Password')));
  });

  await scenario('a browser restart keeps the original persistent session and protected identity', async () => {
    await cdp.send('Network.clearBrowserCookies');
    await navigate(`${origin}/login`); await text('Welcome back');
    await fill('email', joinedFixture.email); await fill('password', joinedFixture.password); await click('Login');
    await until(() => evaluate('location.pathname === "/events"'), 'attendee login before restart');
    const original = (await cdp.send('Network.getAllCookies')).cookies.find(cookie => cookie.name === 'better-auth.session_token');
    assert.ok(original?.expires > Date.now() / 1000);
    await cdp.send('Page.reload'); await text('Joined Journey');
    const reloaded = (await cdp.send('Network.getAllCookies')).cookies.find(cookie => cookie.name === 'better-auth.session_token');
    assert.equal(reloaded?.value, original.value);
    assert.equal(reloaded?.expires, original.expires);
    await cdp.send('Browser.close');
    await until(() => browser.exitCode !== null, 'first Chrome shutdown', 10000);
    browserOutput = '';
    browser = spawn(browserPath, ['--headless=new', '--no-first-run', '--no-default-browser-check', '--remote-debugging-port=0', `--user-data-dir=${profile}`, 'about:blank'],
      { windowsHide: true, stdio: ['ignore', 'ignore', 'pipe'] });
    browser.stderr.on('data', value => { browserOutput = (browserOutput + value).slice(-2000); });
    const nextDebuggerUrl = await until(() => /DevTools listening on (ws:\/\/[^\s]+)/.exec(browserOutput)?.[1], 'reopened Chrome debugger');
    const nextTab = await (await fetch(`http://${new URL(nextDebuggerUrl).host}/json/new?about:blank`, { method: 'PUT' })).json();
    cdp = await connect(nextTab.webSocketDebuggerUrl);
    await cdp.send('Page.enable'); await cdp.send('Runtime.enable'); await cdp.send('Network.enable');
    await navigate(`${origin}/dashboard/tickets`);
    await text('Signed in as');
    await text('Joined Journey');
    await text('This feature is unavailable');
    const persisted = (await cdp.send('Network.getAllCookies')).cookies.find(cookie => cookie.name === 'better-auth.session_token');
    assert.equal(persisted?.value, original.value);
    assert.equal(persisted?.expires, original.expires);
  });

  await scenario('real localhost IP throttling aggregates proxy requests and ignores spoofed forwarding headers', async () => {
    await cdp.send('Network.clearBrowserCookies');
    await command('advance', { milliseconds: 900001 });
    await command('registrationLimit', { limit: 1 });
    const first = await command('registrationFixture');
    await register(first); await text('You have not been signed in');
    assert.equal((await command('messages', { email: first.email })).length, 1);
    const second = await command('registrationFixture');
    const response = await evaluate(`fetch('/api/auth/register', {
      method: 'POST', credentials: 'include',
      headers: { 'Content-Type': 'application/json', 'X-Forwarded-For': '198.51.100.77', 'X-Real-IP': '203.0.113.8' },
      body: JSON.stringify({ firstName: 'Joined', lastName: 'Journey', email: ${JSON.stringify(second.email)},
        password: ${JSON.stringify(second.password)}, termsAccepted: true, termsVersion: 'verification-browser-fixture' }),
    }).then(async response => ({ status: response.status, retryAfter: response.headers.get('Retry-After'),
      code: (await response.json()).error?.code }))`);
    assert.equal(response.status, 429);
    assert.equal(response.code, 'RATE_LIMITED');
    assert.ok(Number(response.retryAfter) > 0);
    assert.equal((await command('messages', { email: second.email })).length, 0);
  });
});
