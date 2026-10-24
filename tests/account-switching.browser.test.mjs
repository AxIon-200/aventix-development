// Run with: node --test tests/account-switching.browser.test.mjs
// Uses installed Chrome/Edge (or BROWSER_PATH), a Next build, and a synthetic HTTP API.
// No database, real credentials, or mail delivery is involved.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import { cpSync, mkdtempSync, symlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { root } from './load-typescript.mjs';
import { browserPath, until, listen, stop, removeTemporary, connect } from './browser-support.mjs';

test('account identity stays current and account switching preserves safe booking context', {
  skip: !browserPath && 'Set BROWSER_PATH to an installed Chrome/Chromium browser',
  timeout: 600000,
}, async t => {
  const profile = (id, role = 'ATTENDEE') => ({
    id, name: `Fixture ${id}`, firstName: 'Fixture', lastName: id,
    email: `${id}@example.invalid`, phoneNumber: id === 'old' ? '+639171234567' : null, role, status: 'ACTIVE',
    emailVerified: true, termsVersion: 'fixture-terms',
    termsAcceptedAt: '2026-01-01T00:00:00.000Z',
    createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z',
    ...savedProfiles.get(id),
  });
  const savedProfiles = new Map();
  const profilePatches = [];
  let profilePatchMode = 'confirmed';
  let profileReads = 0;
  const passwordChanges = [];
  let passwordMode = 'confirmed';
  let logoutMode = 'confirmed';
  let loginRole = 'ATTENDEE';
  let currentRole = 'ATTENDEE';
  let logoutRequests = 0;
  let accountResponse;
  let holdAccountReads = false;
  let termsAvailable = true;
  let termsVersion = 'fixture-v1';
  let registrationMode = 'created';
  const registrations = [];
  const delayedAccountReads = [];
  const api = createServer(async (request, response) => {
    response.setHeader('Content-Type', 'application/json');
    response.setHeader('Cache-Control', 'no-store');
    const account = /fixture-account=(old|new)/.exec(request.headers.cookie ?? '')?.[1];
    if (request.url === '/api/v1/me') {
      if (request.method === 'PATCH') {
        let body = '';
        for await (const chunk of request) body += chunk;
        const changes = JSON.parse(body);
        profilePatches.push(changes);
        if (profilePatchMode === 'lost-not-applied') { request.socket.destroy(); return; }
        if (profilePatchMode === 'rejected') {
          response.statusCode = 400;
          response.end(JSON.stringify({ error: { code: 'VALIDATION_ERROR', fields: { phoneNumber: 'private' } } }));
          return;
        }
        const previous = profile(account, account === 'new' ? loginRole : currentRole);
        const next = { ...previous, ...changes,
          firstName: changes.firstName ?? previous.firstName,
          lastName: changes.lastName ?? previous.lastName,
          phoneNumber: changes.phoneNumber === undefined ? previous.phoneNumber : changes.phoneNumber };
        next.name = `${next.firstName} ${next.lastName}`;
        if (next.phoneNumber?.startsWith('09')) next.phoneNumber = `+63${next.phoneNumber.slice(1)}`;
        savedProfiles.set(account, next);
        if (profilePatchMode === 'concurrent-unsubmitted') {
          savedProfiles.set(account, { ...next, lastName: 'Other tab', name: next.firstName + ' Other tab' });
        }
        if (profilePatchMode === 'concurrent-submitted') {
          savedProfiles.set(account, { ...next, firstName: 'Other tab', name: 'Other tab ' + next.lastName });
        }
        if (profilePatchMode === 'read-unavailable') accountResponse = { status: 503, body: {} };
        if (profilePatchMode === 'unusable') { response.end('{'); return; }
        if (['lost', 'concurrent-unsubmitted', 'concurrent-submitted', 'read-unavailable'].includes(profilePatchMode)) { request.socket.destroy(); return; }
        response.end(JSON.stringify({ data: { user: next } }));
        return;
      }
      profileReads++;
      const result = accountResponse ?? { status: account ? 200 : 401, body: account
        ? { data: { user: profile(account, account === 'new' ? loginRole : currentRole) } }
        : { error: { code: 'AUTHENTICATION_REQUIRED' } } };
      const complete = () => {
        response.statusCode = result.status;
        response.end(JSON.stringify(result.body));
      };
      if (holdAccountReads && request.headers['sec-fetch-site']) delayedAccountReads.push(complete);
      else complete();
    } else if (request.url === '/api/auth/change-password' && request.method === 'POST') {
      let body = '';
      for await (const chunk of request) body += chunk;
      passwordChanges.push(JSON.parse(body));
      if (passwordMode === 'lost') { request.socket.destroy(); return; }
      if (passwordMode === 'unusable') { response.end('{'); return; }
      if (passwordMode === 'validation' || passwordMode === 'service') {
        response.statusCode = passwordMode === 'validation' ? 400 : 500;
        response.end(JSON.stringify({ error: { code: passwordMode === 'validation' ? 'VALIDATION_ERROR' : 'INTERNAL_ERROR',
          fields: { newPassword: 'private provider detail' }, message: 'private provider detail' } }));
        return;
      }
      if (passwordMode === 'wrong' || passwordMode === 'reused') {
        response.statusCode = passwordMode === 'wrong' ? 401 : 400;
        response.end(JSON.stringify({ error: { code: passwordMode === 'wrong' ? 'CURRENT_PASSWORD_INCORRECT' : 'PASSWORD_REUSE' } }));
        return;
      }
      response.end(JSON.stringify({ data: { passwordChanged: true } }));
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
    } else if (request.url === '/api/v1/terms') {
      response.statusCode = termsAvailable ? 200 : 503;
      response.end(JSON.stringify(termsAvailable ? { data: { version: termsVersion, documentUrl: `https://example.invalid/${termsVersion}` } } : { error: { code: 'INTERNAL_ERROR' } }));
    } else if (request.url === '/api/auth/register' && request.method === 'POST') {
      let body = '';
      for await (const chunk of request) body += chunk;
      registrations.push(JSON.parse(body));
      if (registrationMode === 'uncertain') { request.socket.destroy(); return; }
      if (registrationMode === 'stale') termsVersion = 'fixture-v2';
      const result = { created: [201, { data: { verificationRequired: true } }],
        stale: [409, { error: { code: 'TERMS_VERSION_OUTDATED' } }],
        duplicate: [409, { error: { code: 'EMAIL_ALREADY_REGISTERED' } }],
        'delivery-failed': [503, { error: { code: 'ACCOUNT_CREATED_EMAIL_FAILED' } }],
        limited: [429, { error: { code: 'RATE_LIMITED' } }],
        gateway: [502, { error: { code: 'BAD_GATEWAY' } }],
      }[registrationMode];
      response.statusCode = result[0];
      if (registrationMode === 'limited') response.setHeader('Retry-After', '60');
      response.end(JSON.stringify(result[1]));
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

  await t.test('a direct nested workspace request redirects a guest before rendering personal content', async () => {
    const response = await fetch(`${origin}/dashboard/tickets`, { redirect: 'manual' });
    const body = await response.text();
    assert.ok(response.status === 307 || /http-equiv="refresh" content="[01];url=\/login"/.test(body));
    if (response.status === 307) assert.equal(response.headers.get('location'), '/login');
    assert.doesNotMatch(body, /Sherwin Cruz|Upcoming Events|TicketStats|This feature is unavailable/);
  });

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
    if (value.exceptionDetails) throw new Error(value.exceptionDetails.exception?.description ?? value.exceptionDetails.text);
    return value.result.value;
  };
  const click = async label => {
    const expression = `Array.from(document.querySelectorAll('button')).find(button => button.textContent.trim() === ${JSON.stringify(label)})`;
    await until(() => evaluate(`Boolean(${expression})`), label);
    await evaluate(`${expression}.click()`);
  };
  const typeField = async (name, value) => {
    await until(() => evaluate(`(() => {
      const input = document.querySelector('input[name=${JSON.stringify(name)}]');
      if (!input || !input.isConnected) return false;
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(input, ${JSON.stringify(value)});
      input.dispatchEvent(new Event('input', { bubbles: true }));
      return true;
    })()`), `${name} input`);
  };
  const setConfirmResult = async accept => {
    await evaluate(`window.profilePrompts = [];
      window.confirm = message => { window.profilePrompts.push(message); return ${accept}; }`);
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
      await until(() => evaluate(`document.readyState === 'complete' && (document.body?.innerText ?? "").includes('Hi, Fixture old') && (document.body?.innerText ?? "").includes('You are signed in')`), 'hydrated current account');
    } catch (error) {
      console.error('Next output:', appOutput);
      console.error('Browser page:', await evaluate('(document.body?.innerText ?? "")'));
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

  await scenario('attendee profile loads live details, clears the old identity, and explains service failure', async () => {
    await cdp.send('Network.clearBrowserCookies');
    await cdp.send('Network.setCookie', { name: 'fixture-account', value: 'old', url: origin, httpOnly: true, path: '/' });
    holdAccountReads = true;
    await cdp.send('Page.navigate', { url: `${origin}/dashboard/profile` });
    await until(() => delayedAccountReads.length > 0, 'profile account refresh');
    assert.equal(await evaluate(`(document.body?.innerText ?? '').includes('old@example.invalid')`), false);
    while (delayedAccountReads.length) delayedAccountReads.shift()();
    await until(() => evaluate(`(document.body?.innerText ?? '').includes('Loading your personal account profile')`), 'profile loading state');
    holdAccountReads = false;
    while (delayedAccountReads.length) delayedAccountReads.shift()();
    await until(() => evaluate(`document.querySelector('input[name="phoneNumber"]')?.value === '+639171234567'`), 'live attendee profile');
    assert.equal(await evaluate(`Array.from(document.querySelectorAll('input[name="firstName"], input[name="lastName"], input[name="phoneNumber"]')).map(item => item.value).join('|')`), 'Fixture|old|+639171234567');
    assert.equal(await evaluate(`(document.body?.innerText ?? '').includes('old@example.invalid')`), true);
    assert.equal(await evaluate(`Boolean(document.querySelector('input[name="email"]'))`), false);
    await cdp.send('Emulation.setDeviceMetricsOverride', { width: 375, height: 812, deviceScaleFactor: 1, mobile: true });
    assert.equal(await evaluate(`document.querySelector('[aria-labelledby="personal-profile-title"]').scrollWidth <= document.querySelector('[aria-labelledby="personal-profile-title"]').clientWidth + 1`), true);
    await evaluate(`Array.from(document.querySelectorAll('button')).find(button => button.textContent.trim() === 'Refresh details').focus()`);
    assert.equal(await evaluate(`document.activeElement?.textContent.trim()`), 'Refresh details');
    holdAccountReads = true;
    await click('Refresh details');
    await until(() => delayedAccountReads.length > 0, 'keyboard profile refresh');
    assert.equal(await evaluate(`(document.body?.innerText ?? '').includes('old@example.invalid')`), false);
    holdAccountReads = false;
    while (delayedAccountReads.length) delayedAccountReads.shift()();
    await until(() => evaluate(`document.querySelector('input[name="phoneNumber"]')?.value === '+639171234567'`), 'refreshed profile');
    await cdp.send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });

    await cdp.send('Network.setCookie', { name: 'fixture-account', value: 'new', url: origin, httpOnly: true, path: '/' });
    holdAccountReads = true;
    await evaluate(`window.dispatchEvent(new Event('focus'))`);
    await until(() => delayedAccountReads.length > 0, 'new identity read');
    assert.equal(await evaluate(`(document.body?.innerText ?? '').includes('old@example.invalid')`), false);
    holdAccountReads = false;
    while (delayedAccountReads.length) delayedAccountReads.shift()();
    await until(() => evaluate(`(document.body?.innerText ?? '').includes('new@example.invalid') && document.querySelector('input[name="phoneNumber"]')?.value === ''`), 'new identity profile');
    assert.equal(await evaluate(`(document.body?.innerText ?? '').includes('old@example.invalid')`), false);

    accountResponse = { status: 503, body: { error: { code: 'INTERNAL_ERROR' } } };
    await click('Refresh details');
    await until(() => evaluate(`(document.body?.innerText ?? '').includes('account service is unavailable')`), 'profile details unavailable');
    assert.equal(await evaluate(`(document.body?.innerText ?? '').includes('new@example.invalid')`), false);
    accountResponse = undefined;
    await click('Refresh details');
    await until(() => evaluate(`(document.body?.innerText ?? '').includes('new@example.invalid')`), 'profile details retry');

    accountResponse = { status: 503, body: { error: { code: 'INTERNAL_ERROR' } } };
    await evaluate(`window.dispatchEvent(new Event('focus'))`);
    await until(() => evaluate(`(document.body?.innerText ?? '').includes('Workspace unavailable')`), 'profile service failure');
    assert.equal(await evaluate(`(document.body?.innerText ?? '').includes('new@example.invalid')`), false);
    accountResponse = undefined;
  });

  await scenario('attendee edits only changed fields, can discard, and keeps a rejected or uncertain draft', async () => {
    await cdp.send('Network.clearBrowserCookies');
    await cdp.send('Network.setCookie', { name: 'fixture-account', value: 'old', url: origin, httpOnly: true, path: '/' });
    await cdp.send('Page.navigate', { url: `${origin}/dashboard/profile` });
    await until(() => evaluate(`document.querySelector('input[name="firstName"]')?.value === 'Fixture'`), 'editable profile');
    await cdp.send('Emulation.setDeviceMetricsOverride', { width: 375, height: 812, deviceScaleFactor: 1, mobile: false });
    assert.equal(await evaluate(`document.querySelector('[aria-labelledby="personal-profile-title"]').scrollWidth <= document.querySelector('[aria-labelledby="personal-profile-title"]').clientWidth + 1`), true);
    await typeField('firstName', '  Éloïse  ');
    await until(() => evaluate(`!Array.from(document.querySelectorAll('button')).find(button => button.textContent.trim() === 'Save changes').disabled`), 'dirty Save');
    await evaluate(`Array.from(document.querySelectorAll('button')).find(button => button.textContent.trim() === 'Save changes').focus()`);
    assert.equal(await evaluate(`document.activeElement?.textContent.trim()`), 'Save changes');
    assert.equal(await evaluate(`document.activeElement?.tabIndex`), 0);
    await click('Save changes');
    await until(() => evaluate(`(document.body?.innerText ?? '').includes('Your personal account profile was saved.')`), 'saved profile');
    assert.deepEqual(profilePatches.at(-1), { firstName: 'Éloïse' });
    assert.equal(await evaluate(`(document.body?.innerText ?? '').includes('Saved name: Éloïse old')`), true);
    await cdp.send('Page.navigate', { url: `${origin}/dashboard/profile` });
    await until(() => evaluate(`document.querySelector('input[name="firstName"]')?.value === 'Éloïse'`), 'persisted profile');
    await typeField('lastName', 'Discarded');
    await click('Discard changes');
    assert.equal(await evaluate(`document.querySelector('input[name="lastName"]').value`), 'old');
    await typeField('phoneNumber', '');
    await click('Save changes');
    await until(() => evaluate(`(document.body?.innerText ?? '').includes('Your personal account profile was saved.')`), 'cleared phone');
    assert.deepEqual(profilePatches.at(-1), { phoneNumber: null });
    await cdp.send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });
    assert.equal(await evaluate(`document.querySelector('[aria-labelledby="personal-profile-title"]').scrollWidth <= document.querySelector('[aria-labelledby="personal-profile-title"]').clientWidth + 1`), true);
    await typeField('lastName', 'Focused discard');
    await evaluate(`Array.from(document.querySelectorAll('button')).find(button => button.textContent.trim() === 'Discard changes').focus()`);
    assert.equal(await evaluate(`document.activeElement?.textContent.trim()`), 'Discard changes');
    await click('Discard changes');
    await until(() => evaluate(`document.querySelector('input[name="lastName"]')?.value === 'old'`), 'keyboard Discard');
    await typeField('phoneNumber', '09171234567');
    await evaluate(`Array.from(document.querySelectorAll('button')).find(button => button.textContent.trim() === 'Save changes').focus()`);
    assert.equal(await evaluate(`document.activeElement?.textContent.trim()`), 'Save changes');
    await click('Save changes');
    await until(() => evaluate(`document.querySelector('input[name="phoneNumber"]')?.value === '+639171234567'`), 'normalized phone after add');
    assert.deepEqual(profilePatches.at(-1), { phoneNumber: '09171234567' });
    await cdp.send('Page.navigate', { url: `${origin}/dashboard/profile` });
    await until(() => evaluate(`document.querySelector('input[name="phoneNumber"]')?.value === '+639171234567'`), 'normalized phone after reload');
    await typeField('phoneNumber', '09179876543');
    await click('Save changes');
    await until(() => evaluate(`document.querySelector('input[name="phoneNumber"]')?.value === '+639179876543'`), 'normalized replacement phone');
    assert.deepEqual(profilePatches.at(-1), { phoneNumber: '09179876543' });
    await cdp.send('Page.navigate', { url: `${origin}/dashboard/profile` });
    await until(() => evaluate(`document.querySelector('input[name="phoneNumber"]')?.value === '+639179876543'`), 'replaced phone after reload');
    await typeField('phoneNumber', '09175556666');
    profilePatchMode = 'rejected';
    await click('Save changes');
    await until(() => evaluate(`(document.body?.innerText ?? '').includes('Check your account details')`), 'rejected edit');
    assert.equal(await evaluate(`document.querySelector('input[name="phoneNumber"]').value`), '09175556666');
    assert.equal(profile('old').phoneNumber, '+639179876543');
    profilePatchMode = 'lost';
    await typeField('phoneNumber', '09179998888');
    await click('Save changes');
    await until(() => evaluate(`(document.body?.innerText ?? '').includes('saved and confirmed by a fresh account check')`), 'reconciled edit');
    assert.equal(await evaluate(`document.querySelector('input[name="phoneNumber"]').value`), '+639179998888');
    assert.equal(profile('old').phoneNumber, '+639179998888');
    assert.deepEqual(profilePatches.at(-1), { phoneNumber: '09179998888' });
    profilePatchMode = 'lost-not-applied';
    await typeField('lastName', 'Still a draft');
    await click('Save changes');
    await until(() => evaluate(`(document.body?.innerText ?? '').includes('could not confirm whether your changes were saved')`), 'unconfirmed edit');
    assert.equal(await evaluate(`document.querySelector('input[name="lastName"]').value`), 'Still a draft');
    assert.deepEqual(profilePatches.at(-1), { lastName: 'Still a draft' });
    profilePatchMode = 'confirmed';
    savedProfiles.clear();
  });

  await scenario('uncertain saves reconcile once, preserve drafts, and wait for an explicit retry', async () => {
    for (const mode of ['concurrent-unsubmitted', 'concurrent-submitted', 'read-unavailable', 'unusable']) {
      savedProfiles.clear();
      accountResponse = undefined;
      profilePatchMode = mode;
      await cdp.send('Page.navigate', { url: origin + '/dashboard/profile' });
      await until(() => evaluate(`document.querySelector('input[name="firstName"]')?.value === 'Fixture'`), 'clean reconciliation form');
      await typeField('firstName', '  Maria  ');
      await typeField('phoneNumber', '09179998888');
      const writes = profilePatches.length;
      const reads = profileReads;
      await click('Save changes');
      const confirmed = ['concurrent-unsubmitted', 'unusable'].includes(mode);
      await until(() => evaluate(`(document.body?.innerText ?? '').includes(${JSON.stringify(confirmed ? 'saved and confirmed by a fresh account check' : 'could not confirm whether your changes were saved')})`), mode + ' outcome');
      assert.equal(profilePatches.length - writes, 1, mode + ' must not replay PATCH');
      assert.equal(profileReads - reads, 1, mode + ' must read exactly once');
      assert.equal(await evaluate(`document.querySelector('input[name="firstName"]').value`), confirmed ? 'Maria' : '  Maria  ');
      assert.equal(await evaluate(`document.querySelector('input[name="phoneNumber"]').value`), confirmed ? '+639179998888' : '09179998888');
      if (mode === 'concurrent-unsubmitted') {
        assert.equal(await evaluate(`document.querySelector('input[name="lastName"]').value`), 'Other tab');
      }
      if (!confirmed) {
        assert.equal(await evaluate(`(document.body?.innerText ?? '').includes('profile was saved')`), false);
        accountResponse = undefined;
        profilePatchMode = 'confirmed';
        await click('Save changes');
        await until(() => evaluate(`(document.body?.innerText ?? '').includes('Your personal account profile was saved.')`), 'explicit retry');
        assert.equal(profilePatches.length - writes, 2);
        assert.deepEqual(profilePatches.at(-1), { firstName: 'Maria', phoneNumber: '09179998888' });
      }
    }
    profilePatchMode = 'confirmed';
    savedProfiles.clear();
  });

  await scenario('attendee draft survives account refresh and Discard uses the latest saved profile', async () => {
    await cdp.send('Network.clearBrowserCookies');
    await cdp.send('Network.setCookie', { name: 'fixture-account', value: 'old', url: origin, httpOnly: true, path: '/' });
    await cdp.send('Page.navigate', { url: `${origin}/dashboard/profile` });
    await until(() => evaluate(`document.querySelector('input[name="firstName"]')?.value === 'Fixture'`), 'profile before draft');
    await typeField('firstName', 'Draft');
    await until(() => evaluate(`!Array.from(document.querySelectorAll('button')).find(button => button.textContent.trim() === 'Discard changes').disabled`), 'dirty draft');
    savedProfiles.set('old', { firstName: 'Fresh', lastName: 'Saved', name: 'Fresh Saved', phoneNumber: '+639179991111' });
    await evaluate(`window.dispatchEvent(new Event('focus'))`);
    await until(() => evaluate(`document.querySelector('input[name="firstName"]')?.value === 'Draft'
      && (document.body?.innerText ?? '').includes('Saved name: Fresh Saved')`), 'draft and accepted refresh');
    assert.equal(await evaluate(`document.querySelector('input[name="phoneNumber"]').value`), '+639179991111');
    savedProfiles.set('old', { firstName: 'Newest', lastName: 'Saved', name: 'Newest Saved', phoneNumber: '+639179992222' });
    await click('Refresh details');
    await until(() => evaluate(`document.querySelector('input[name="firstName"]')?.value === 'Draft'
      && (document.body?.innerText ?? '').includes('Saved name: Newest Saved')`), 'draft after explicit refresh');
    await click('Discard changes');
    assert.deepEqual(await evaluate(`Array.from(document.querySelectorAll('input[name="firstName"], input[name="lastName"], input[name="phoneNumber"]')).map(input => input.value)`),
      ['Newest', 'Saved', '+639179992222']);
    await typeField('phoneNumber', '09178887777');
    savedProfiles.set('old', { firstName: 'Latest', lastName: 'Account', name: 'Latest Account', phoneNumber: '+639179993333' });
    await click('Refresh details');
    await until(() => evaluate(`document.querySelector('input[name="phoneNumber"]')?.value === '09178887777'
      && document.querySelector('input[name="firstName"]')?.value === 'Latest'`), 'phone draft and fresh name');
    await click('Discard changes');
    assert.equal(await evaluate(`document.querySelector('input[name="phoneNumber"]').value`), '+639179993333');
    savedProfiles.clear();
  });

  await scenario('dirty attendee navigation asks to leave while clean and saved forms leave directly', async () => {
    await cdp.send('Page.navigate', { url: `${origin}/dashboard/profile` });
    await until(() => evaluate(`document.querySelector('input[name="firstName"]')?.value === 'Fixture'`), 'clean profile');
    assert.equal(await evaluate(`window.dispatchEvent(new Event('beforeunload', { cancelable: true }))`), true);
    await setConfirmResult(false);
    await typeField('firstName', 'Leaving');
    await until(() => evaluate(`!Array.from(document.querySelectorAll('button')).find(button => button.textContent.trim() === 'Save changes').disabled`), 'dirty form');
    assert.equal(await evaluate(`window.dispatchEvent(new Event('beforeunload', { cancelable: true }))`), false);
    await evaluate(`document.querySelector('nav[aria-label="Workspace"] a[href="/dashboard/tickets"]').click()`);
    await until(() => evaluate(`window.profilePrompts.length === 1`), 'navigation confirmation');
    assert.equal(await evaluate(`location.pathname`), '/dashboard/profile');
    assert.equal(await evaluate(`document.querySelector('input[name="firstName"]').value`), 'Leaving');
    const signOutsBeforeDraft = logoutRequests;
    await click('Sign Out');
    await until(() => evaluate(`window.profilePrompts.length === 2`), 'sign-out confirmation');
    assert.equal(logoutRequests, signOutsBeforeDraft);
    assert.equal(await evaluate(`document.querySelector('input[name="firstName"]').value`), 'Leaving');
    await click('Discard changes');
    assert.equal(await evaluate(`window.dispatchEvent(new Event('beforeunload', { cancelable: true }))`), true);
    await evaluate(`document.querySelector('nav[aria-label="Workspace"] a[href="/dashboard/tickets"]').click()`);
    await until(() => evaluate(`location.pathname === '/dashboard/tickets'`), 'clean navigation');
    assert.equal(await evaluate(`window.profilePrompts.length`), 2);

    await until(() => evaluate(`Boolean(document.querySelector('nav[aria-label="Workspace"] a[href="/dashboard/profile"]'))`), 'ticket workspace navigation');
    await evaluate(`document.querySelector('nav[aria-label="Workspace"] a[href="/dashboard/profile"]').click()`);
    await until(() => evaluate(`document.querySelector('input[name="firstName"]')?.value === 'Fixture'`), 'profile through app navigation');
    await setConfirmResult(false);
    await typeField('firstName', 'Back draft');
    await until(() => evaluate(`!Array.from(document.querySelectorAll('button')).find(button => button.textContent.trim() === 'Discard changes').disabled`), 'dirty form before Back');
    assert.equal(await evaluate(`window.dispatchEvent(new Event('beforeunload', { cancelable: true }))`), false);
    await evaluate(`history.back()`);
    await until(() => evaluate(`window.profilePrompts.length > 0 || location.pathname === '/dashboard/tickets'`), 'back navigation decision');
    assert.equal(await evaluate(`location.pathname`), '/dashboard/profile');
    assert.equal(await evaluate(`document.querySelector('input[name="firstName"]')?.value`), 'Back draft');
    await click('Discard changes');
    await evaluate(`history.back()`);
    await until(() => evaluate(`location.pathname === '/dashboard/tickets'`), 'clean browser back');

    await cdp.send('Page.navigate', { url: `${origin}/dashboard/profile` });
    await until(() => evaluate(`document.querySelector('input[name="firstName"]')?.value === 'Fixture'`), 'profile after clean navigation');
    await setConfirmResult(true);
    await typeField('firstName', 'Saved');
    await until(() => evaluate(`!Array.from(document.querySelectorAll('button')).find(button => button.textContent.trim() === 'Save changes').disabled`), 'save ready');
    await click('Save changes');
    await until(() => evaluate(`(document.body?.innerText ?? '').includes('Your personal account profile was saved.')`), 'confirmed save');
    assert.equal(await evaluate(`window.dispatchEvent(new Event('beforeunload', { cancelable: true }))`), true);
    await evaluate(`document.querySelector('nav[aria-label="Workspace"] a[href="/dashboard/tickets"]').click()`);
    await until(() => evaluate(`location.pathname === '/dashboard/tickets'`), 'navigation after save');
    assert.equal(await evaluate(`window.profilePrompts.length`), 0);
    await cdp.send('Page.navigate', { url: `${origin}/dashboard/profile` });
    await until(() => evaluate(`document.querySelector('input[name="firstName"]')?.value === 'Saved'`), 'profile before confirmed discard');
    await setConfirmResult(true);
    await typeField('lastName', 'Abandoned');
    await until(() => evaluate(`!Array.from(document.querySelectorAll('button')).find(button => button.textContent.trim() === 'Discard changes').disabled`), 'draft before confirmed discard');
    await evaluate(`document.querySelector('a[href="/events"]').click()`);
    await until(() => evaluate(`location.pathname === '/events'`), 'confirmed dirty navigation');
    assert.equal(await evaluate(`window.profilePrompts.length`), 1);
    savedProfiles.clear();
  });

  await scenario('password recovery navigation protects a dirty profile draft', async () => {
    await cdp.send('Page.navigate', { url: `${origin}/dashboard/profile` });
    await until(() => evaluate(`document.querySelector('input[name="firstName"]')?.value === 'Fixture'`), 'profile before recovery navigation');
    await setConfirmResult(false);
    await typeField('phoneNumber', '09178887777');
    await evaluate(`document.querySelector('a[href^="/forgot-password"]').click()`);
    await until(() => evaluate(`window.profilePrompts.length === 1`), 'recovery navigation confirmation');
    assert.equal(await evaluate(`location.pathname`), '/dashboard/profile');
    assert.equal(await evaluate(`document.querySelector('input[name="phoneNumber"]').value`), '09178887777');
    assert.equal(await evaluate(`window.dispatchEvent(new Event('beforeunload', { cancelable: true }))`), false);
    await setConfirmResult(true);
    await evaluate(`document.querySelector('a[href^="/forgot-password"]').click()`);
    await until(() => evaluate(`location.pathname === '/forgot-password'`), 'confirmed recovery navigation');
    assert.equal(await evaluate(`window.profilePrompts.length`), 1);
    await cdp.send('Page.navigate', { url: `${origin}/dashboard/profile` });
    await until(() => evaluate(`document.querySelector('input[name="firstName"]')?.value === 'Fixture'`), 'profile after abandoning draft');
    assert.equal(await evaluate(`document.querySelector('input[name="phoneNumber"]').value`), '+639171234567');
    await setConfirmResult(false);
    await evaluate(`document.querySelector('a[href^="/forgot-password"]').click()`);
    await until(() => evaluate(`location.pathname === '/forgot-password'`), 'clean recovery navigation');
    assert.equal(await evaluate(`window.profilePrompts.length`), 0);
  });

  await scenario('attendee can correct a rejected current password and change it without leaving the profile', async () => {
    await cdp.send('Page.navigate', { url: `${origin}/dashboard/profile` });
    await until(() => evaluate(`document.querySelector('input[name="firstName"]')?.value === 'Fixture'`), 'attendee password entry');
    const currentPassword = ' exact current e\u0301 password ';
    const newPassword = ' new exact password 😀 ';
    await typeField('currentPassword', currentPassword);
    await typeField('newPassword', newPassword);
    await typeField('confirmPassword', newPassword);
    passwordMode = 'wrong';
    await click('Change password');
    await until(() => evaluate(`(document.body?.innerText ?? '').includes('current password is incorrect')`), 'attendee wrong password feedback');
    assert.equal(await evaluate(`document.activeElement?.name`), 'currentPassword');
    assert.equal(await evaluate(`document.querySelector('[name="currentPassword"]').getAttribute('aria-invalid')`), 'true');
    assert.equal(await evaluate(`document.querySelector('[name="newPassword"]').value`), newPassword);
    assert.deepEqual(passwordChanges.at(-1), { currentPassword, newPassword });
    passwordMode = 'confirmed';
    await typeField('currentPassword', ' corrected current password ');
    await click('Change password');
    await until(() => evaluate(`(document.body?.innerText ?? '').includes('Your password was changed.')`), 'attendee confirmed password change');
    assert.equal(await evaluate(`location.pathname`), '/dashboard/profile');
    for (const name of ['currentPassword', 'newPassword', 'confirmPassword']) {
      assert.equal(await evaluate(`document.querySelector('[name="${name}"]').value`), '');
    }
    assert.match(await evaluate(`document.querySelector('[aria-labelledby="change-password-title"]').innerText`), /original expiry.*Other sessions and outstanding password-reset links were invalidated/s);
  });

  await scenario('attendee password validation stays local and rejected or lost changes never claim success', async () => {
    await cdp.send('Page.navigate', { url: `${origin}/dashboard/profile` });
    await until(() => evaluate(`document.querySelector('input[name="firstName"]')?.value === 'Fixture'`), 'attendee password validation');
    await cdp.send('Emulation.setDeviceMetricsOverride', { width: 375, height: 812, deviceScaleFactor: 1, mobile: true });
    assert.equal(await evaluate(`document.querySelector('[aria-labelledby="change-password-title"]').scrollWidth <= document.querySelector('[aria-labelledby="change-password-title"]').clientWidth + 1`), true);
    const before = passwordChanges.length;
    await typeField('currentPassword', ' exact current password ');
    for (const candidate of ['😀'.repeat(14), '😀'.repeat(129)]) {
      await typeField('newPassword', candidate);
      await typeField('confirmPassword', candidate);
      await click('Change password');
      await until(() => evaluate(`document.querySelector('[name="newPassword"]').getAttribute('aria-invalid') === 'true'`), 'code point validation');
      assert.equal(passwordChanges.length, before);
    }
    await typeField('newPassword', '😀'.repeat(15));
    await typeField('confirmPassword', 'different confirmation');
    await click('Change password');
    await until(() => evaluate(`document.querySelector('[name="confirmPassword"]').getAttribute('aria-invalid') === 'true'`), 'local mismatch');
    assert.equal(passwordChanges.length, before);
    for (const length of [15, 128]) {
      const exact = ' '.repeat(length);
      await typeField('newPassword', exact);
      await typeField('confirmPassword', exact);
      passwordMode = 'reused';
      await click('Change password');
      await until(() => evaluate(`(document.body?.innerText ?? '').includes('Choose a new password different')`), 'password reuse feedback');
      assert.deepEqual(passwordChanges.at(-1), { currentPassword: ' exact current password ', newPassword: exact });
      assert.equal(await evaluate(`document.activeElement?.name`), 'newPassword');
    }
    passwordMode = 'validation';
    await click('Change password');
    await until(() => evaluate(`(document.body?.innerText ?? '').includes('Check your account details')`), 'server validation');
    assert.equal(await evaluate(`document.activeElement?.name`), 'newPassword');
    assert.doesNotMatch(await evaluate(`document.body.innerText`), /private provider detail|Your password was changed/);
    passwordMode = 'lost';
    const beforeLost = passwordChanges.length;
    await click('Change password');
    await until(() => evaluate(`(document.body?.innerText ?? '').includes('could not confirm whether your password changed')`), 'lost attendee response');
    assert.equal(passwordChanges.length, beforeLost + 1);
    for (const name of ['currentPassword', 'newPassword', 'confirmPassword']) {
      assert.equal(await evaluate(`document.querySelector('[name="${name}"]').value`), '');
    }
    assert.doesNotMatch(await evaluate(`document.body.innerText`), /Your password was changed/);
    assert.equal(await evaluate(`new URL(document.querySelector('a[href^="/forgot-password"]').href).pathname`), '/forgot-password');
    passwordMode = 'service';
    await typeField('currentPassword', ' exact current password ');
    await typeField('newPassword', ' new attendee password ');
    await typeField('confirmPassword', ' new attendee password ');
    await click('Change password');
    await until(() => evaluate(`document.querySelector('[name="newPassword"]').value === ''`), 'service error clears secrets');
    assert.doesNotMatch(await evaluate(`document.body.innerText`), /private provider detail|Your password was changed/);
    passwordMode = 'confirmed';
    await cdp.send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });
    await evaluate(`document.querySelector('a[href^="/forgot-password"]').click()`);
    await until(() => evaluate(`location.pathname === '/forgot-password' && Boolean(document.querySelector('[name="email"]'))`), 'attendee S01 recovery navigation');
  });

  await scenario('uncertain password changes distinguish session availability from stored credentials', async () => {
    for (const mode of ['lost', 'unusable', 'service']) {
      for (const sessionState of ['available', 'unavailable', 'other-account', 'other-role']) {
        accountResponse = undefined;
        await cdp.send('Page.navigate', { url: `${origin}/dashboard/profile` });
        await until(() => evaluate(`document.querySelector('input[name="firstName"]')?.value === 'Fixture'`), 'uncertainty profile');
        await typeField('currentPassword', ' current secret password ');
        await typeField('newPassword', ' proposed secret password ');
        await typeField('confirmPassword', ' proposed secret password ');
        passwordMode = mode;
        if (sessionState === 'unavailable') accountResponse = { status: 503, body: {} };
        if (sessionState === 'other-account') accountResponse = { status: 200, body: { data: { user: profile('new') } } };
        if (sessionState === 'other-role') accountResponse = { status: 200, body: { data: { user: profile('old', 'ADMINISTRATOR') } } };
        const mutationsBefore = passwordChanges.length;
        const readsBefore = profileReads;
        await click('Change password');
        const expected = sessionState === 'available' ? 'Your current session is still available.' : 'We could not check whether this session is still available.';
        await until(() => evaluate(`(document.body?.innerText ?? '').includes(${JSON.stringify(expected)})`), 'session-only uncertainty feedback', 10000);
        for (const name of ['currentPassword', 'newPassword', 'confirmPassword']) {
          assert.equal(await evaluate(`document.querySelector('[name="${name}"]').value`), '');
        }
        const text = await evaluate(`document.querySelector('[aria-labelledby="change-password-title"]').innerText`);
        assert.match(text, /could not confirm whether your password changed/);
        assert.match(text, /cannot show which password is stored/);
        assert.doesNotMatch(text, /Your password was changed|current secret|proposed secret|private provider/);
        assert.equal(await evaluate(`Boolean(document.querySelector('a[href^="/login"]')) && Boolean(document.querySelector('a[href^="/forgot-password"]'))`), true);
        await delay(200);
        assert.equal(passwordChanges.length, mutationsBefore + 1);
        assert.equal(profileReads, readsBefore + 1);
      }
    }
    accountResponse = undefined;
    passwordMode = 'confirmed';
  });

  await scenario('administrator profile and settings use the current identity and known-password contract', async () => {
    await cdp.send('Network.clearBrowserCookies');
    await cdp.send('Network.setCookie', { name: 'fixture-account', value: 'old', url: origin, httpOnly: true, path: '/' });
    currentRole = 'ADMINISTRATOR';
    await cdp.send('Page.navigate', { url: `${origin}/admin/profile` });
    await until(() => evaluate(`document.querySelector('input[name="firstName"]')?.value === 'Fixture'`), 'administrator profile');
    assert.equal(await evaluate(`(document.body?.innerText ?? '').includes('old@example.invalid')`), true);
    assert.equal(await evaluate(`Boolean(document.querySelector('input[name="email"]'))`), false);
    await typeField('firstName', 'Administrator');
    await click('Save changes');
    await until(() => evaluate(`(document.body?.innerText ?? '').includes('Your personal account profile was saved.')`), 'administrator save');
    assert.deepEqual(profilePatches.at(-1), { firstName: 'Administrator' });
    await typeField('currentPassword', ' exact old password ');
    await typeField('newPassword', ' new Unicode password 😀 ');
    await typeField('confirmPassword', 'mismatch');
    const changesBeforeMismatch = passwordChanges.length;
    await click('Change password');
    await until(() => evaluate(`(document.body?.innerText ?? '').includes('Passwords must match.')`), 'local confirmation');
    assert.equal(passwordChanges.length, changesBeforeMismatch);
    await typeField('confirmPassword', ' new Unicode password 😀 ');
    passwordMode = 'wrong';
    await click('Change password');
    await until(() => evaluate(`(document.body?.innerText ?? '').includes('current password is incorrect')`), 'wrong current password');
    assert.deepEqual(passwordChanges.at(-1), { currentPassword: ' exact old password ', newPassword: ' new Unicode password 😀 ' });
    passwordMode = 'confirmed';
    await click('Change password');
    await until(() => evaluate(`(document.body?.innerText ?? '').includes('Other sessions and outstanding password-reset links were invalidated.')`), 'confirmed password change');
    assert.equal(await evaluate(`document.querySelector('input[name="newPassword"]').value`), '');
    assert.equal(await evaluate(`location.pathname`), '/admin/profile');
    // Use the workspace entry point so typing starts after the route's account
    // check, rather than in a server-rendered form awaiting hydration.
    await evaluate(`document.querySelector('nav[aria-label="Workspace"] a[href="/admin/settings"]').click()`);
    await until(() => evaluate(`location.pathname === '/admin/settings'
      && Boolean(document.querySelector('input[name="currentPassword"]'))
      && !document.querySelector('input[name="firstName"]')`), 'settings password entry');
    assert.equal(await evaluate(`Boolean(document.querySelector('input[name="firstName"]'))`), false);
    await typeField('currentPassword', ' exact old password ');
    await typeField('newPassword', ' another password 😀 ');
    await typeField('confirmPassword', ' another password 😀 ');
    passwordMode = 'lost';
    const changesBeforeLost = passwordChanges.length;
    await click('Change password');
    await until(() => evaluate(`(document.body?.innerText ?? '').includes('could not confirm whether your password changed')`), 'uncertain password change');
    assert.equal(passwordChanges.length, changesBeforeLost + 1);
    assert.equal(await evaluate(`document.querySelector('input[name="currentPassword"]').value`), '');
    assert.equal(await evaluate(`document.querySelector('input[name="newPassword"]').value`), '');
    passwordMode = 'confirmed';
    currentRole = 'ATTENDEE';
    savedProfiles.clear();
  });

  await scenario('administrator profile supports canonical phone edits, keyboard Discard, and dirty navigation', async () => {
    currentRole = 'ADMINISTRATOR';
    savedProfiles.clear();
    await cdp.send('Network.clearBrowserCookies');
    await cdp.send('Network.setCookie', { name: 'fixture-account', value: 'old', url: origin, httpOnly: true, path: '/' });
    await cdp.send('Page.navigate', { url: origin + '/admin/profile' });
    await until(() => evaluate(`document.querySelector('input[name="firstName"]')?.value === 'Fixture'`), 'administrator personal profile');
    assert.equal(await evaluate(`document.body.innerText.includes('administrator account you are using now')`), true);
    assert.equal(await evaluate(`Boolean(document.querySelector('input[name="email"], input[name="role"], input[type="file"]'))`), false);
    assert.equal(await evaluate(`document.body.innerText.includes('Account Activity')`), false);
    for (const width of [375, 1440]) {
      await cdp.send('Emulation.setDeviceMetricsOverride', { width, height: 900, deviceScaleFactor: 1, mobile: false });
      assert.equal(await evaluate('document.documentElement.scrollWidth <= innerWidth'), true);
    }
    await typeField('firstName', '  Administrator  ');
    await typeField('phoneNumber', '09179876543');
    await click('Save changes');
    await until(() => evaluate(`document.querySelector('input[name="phoneNumber"]')?.value === '+639179876543'`), 'canonical administrator phone');
    assert.deepEqual(profilePatches.at(-1), { firstName: 'Administrator', phoneNumber: '09179876543' });
    await cdp.send('Page.bringToFront');
    await until(() => evaluate(`Boolean(document.querySelector('input[name="lastName"]')) && !document.querySelector('fieldset').disabled`), 'focused administrator form');
    await typeField('lastName', 'Discard this');
    await until(() => evaluate(`!Array.from(document.querySelectorAll('button')).find(button => button.textContent.trim() === 'Discard changes').disabled`), 'administrator dirty form');
    await evaluate(`Array.from(document.querySelectorAll('button')).find(button => button.textContent.trim() === 'Discard changes').focus()`);
    assert.equal(await evaluate(`document.activeElement?.textContent.trim()`), 'Discard changes');
    await cdp.send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13, text: '\r' });
    await cdp.send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13 });
    await until(() => evaluate(`document.querySelector('input[name="lastName"]')?.value === 'old'`), 'administrator keyboard Discard');
    await typeField('phoneNumber', '');
    await click('Save changes');
    await until(() => evaluate(`document.body.innerText.includes('Your personal account profile was saved.')`), 'administrator clears phone');
    assert.deepEqual(profilePatches.at(-1), { phoneNumber: null });
    await typeField('lastName', 'Keep draft');
    await setConfirmResult(false);
    await evaluate(`document.querySelector('nav[aria-label="Workspace"] a[href="/admin/settings"]').click()`);
    await until(() => evaluate('window.profilePrompts.length === 1'), 'administrator navigation warning');
    assert.equal(await evaluate('location.pathname'), '/admin/profile');
    assert.equal(await evaluate(`document.querySelector('input[name="lastName"]').value`), 'Keep draft');
    assert.equal(await evaluate(`(() => { const event = new Event('beforeunload', { cancelable: true }); window.dispatchEvent(event); return event.defaultPrevented; })()`), true);
    savedProfiles.set('old', { ...profile('old', 'ADMINISTRATOR'), lastName: 'Latest', name: 'Administrator Latest' });
    await click('Refresh details');
    await until(() => evaluate(`document.body.innerText.includes('Saved name: Administrator Latest')`), 'fresh administrator details');
    assert.equal(await evaluate(`document.querySelector('input[name="lastName"]').value`), 'Keep draft');
    await click('Discard changes');
    assert.equal(await evaluate(`document.querySelector('input[name="lastName"]').value`), 'Latest');
    await evaluate(`document.querySelector('nav[aria-label="Workspace"] a[href="/admin/settings"]').click()`);
    await until(() => evaluate(`location.pathname === '/admin/settings'`), 'clean administrator navigation');
    assert.equal(await evaluate('window.profilePrompts.length'), 1);
    currentRole = 'ATTENDEE';
    savedProfiles.clear();
  });

  await scenario('administrator lost profile saves reconcile once and preserve unconfirmed drafts', async () => {
    currentRole = 'ADMINISTRATOR';
    await cdp.send('Page.navigate', { url: origin + '/admin/profile' });
    await until(() => evaluate(`document.querySelector('input[name="firstName"]')?.value === 'Fixture'`), 'administrator before uncertain save');
    profilePatchMode = 'lost';
    await typeField('firstName', 'Confirmed administrator');
    const writes = profilePatches.length;
    const reads = profileReads;
    await click('Save changes');
    await until(() => evaluate(`document.body.innerText.includes('confirmed by a fresh account check')`), 'administrator reconciliation');
    assert.equal(profilePatches.length, writes + 1);
    assert.equal(profileReads, reads + 1);
    profilePatchMode = 'lost-not-applied';
    await typeField('lastName', 'Unconfirmed draft');
    await click('Save changes');
    await until(() => evaluate(`document.body.innerText.includes('could not confirm whether your changes were saved')`), 'administrator uncertain draft');
    assert.equal(await evaluate(`document.querySelector('input[name="lastName"]').value`), 'Unconfirmed draft');
    assert.equal(profilePatches.length, writes + 2);
    assert.equal(profileReads, reads + 2);
    accountResponse = { status: 200, body: { data: { user: profile('new', 'ATTENDEE') } } };
    await click('Refresh details');
    await until(() => evaluate(`document.body.innerText.includes('could not confirm that these details belong to your current account')`), 'administrator identity mismatch');
    assert.equal(await evaluate(`document.body.innerText.includes('new@example.invalid')`), false);
    accountResponse = { status: 403, body: { error: { code: 'ACCOUNT_DISABLED' } } };
    await click('Refresh details');
    await until(() => evaluate(`document.body.innerText.includes('Workspace unavailable')`), 'administrator eligibility gate');
    assert.equal(await evaluate(`Boolean(document.querySelector('input[name="firstName"]'))`), false);
    accountResponse = undefined;
    profilePatchMode = 'confirmed';
    currentRole = 'ATTENDEE';
    savedProfiles.clear();
  });

  await scenario('a profile read that loses account eligibility follows the workspace gate', async () => {
    await cdp.send('Network.clearBrowserCookies');
    await cdp.send('Network.setCookie', { name: 'fixture-account', value: 'old', url: origin, httpOnly: true, path: '/' });
    await cdp.send('Page.navigate', { url: `${origin}/dashboard/profile` });
    await until(() => evaluate(`(document.body?.innerText ?? '').includes('old@example.invalid')`), 'eligible profile');
    accountResponse = { status: 403, body: { error: { code: 'EMAIL_VERIFICATION_REQUIRED' } } };
    await click('Refresh details');
    await until(() => evaluate(`(document.body?.innerText ?? '').includes('Workspace unavailable')`), 'profile eligibility gate', 10000);
    assert.equal(await evaluate(`Boolean(document.querySelector('nav[aria-label="Workspace"]'))`), false);
    assert.equal(await evaluate(`(document.body?.innerText ?? '').includes('old@example.invalid')`), false);
    accountResponse = undefined;

    await cdp.send('Page.navigate', { url: `${origin}/dashboard/profile` });
    await until(() => evaluate(`(document.body?.innerText ?? '').includes('old@example.invalid')`), 'profile before expiry');
    accountResponse = { status: 401, body: { error: { code: 'AUTHENTICATION_REQUIRED' } } };
    await click('Refresh details');
    await until(() => evaluate(`location.pathname === '/login'`), 'expired profile session', 10000);
    assert.equal(await evaluate(`(document.body?.innerText ?? '').includes('old@example.invalid')`), false);
    accountResponse = undefined;
  });

  for (const route of ['/admin/profile', '/admin/settings']) {
    await scenario(route + ' supports keyboard password changes and safe outcomes on mobile and desktop', async () => {
      currentRole = 'ADMINISTRATOR';
      savedProfiles.clear();
      await cdp.send('Network.clearBrowserCookies');
      await cdp.send('Network.setCookie', { name: 'fixture-account', value: 'old', url: origin, httpOnly: true, path: '/' });
      await cdp.send('Page.navigate', { url: origin + '/admin/dashboard' });
      await until(() => evaluate('(() => { const link = document.querySelector(' + JSON.stringify('nav[aria-label=Workspace] a[href="' + route + '"]') + '); if (location.pathname !== "/admin/dashboard" || !link) return false; link.click(); return true; })()'), 'administrator navigation');
      await until(() => evaluate('location.pathname === ' + JSON.stringify(route) + ' && Boolean(document.querySelector("input[name=currentPassword]"))'), 'administrator password entry');
      for (const width of [375, 1440]) {
        await cdp.send('Emulation.setDeviceMetricsOverride', { width, height: 900, deviceScaleFactor: 1, mobile: width === 375 });
        assert.equal(await evaluate('document.documentElement.scrollWidth <= innerWidth'), true);
        assert.equal(await evaluate('Array.from(document.querySelectorAll("input[type=password]")).every(input => { const rect = input.getBoundingClientRect(); return rect.width > 0 && rect.left >= 0 && rect.right <= innerWidth; })'), true);
      }
      assert.equal(await evaluate('Boolean(document.querySelector("a[href^=\'/forgot-password\']"))'), true);
      if (route === '/admin/settings') {
        assert.match(await evaluate('document.body.innerText'), /Other settings are unavailable/);
        assert.deepEqual(await evaluate('Array.from(document.querySelectorAll("input")).map(input => input.name).sort()'), ['confirmPassword', 'currentPassword', 'newPassword']);
        assert.equal(await evaluate('Boolean(document.querySelector("[role=switch], input[type=checkbox], select"))'), false);
      }
      const currentPassword = ' exact current e\u0301 password ';
      const newPassword = ' new administrator password \u{1F600} ';
      const fill = async confirmation => {
        await typeField('currentPassword', currentPassword);
        await typeField('newPassword', newPassword);
        await typeField('confirmPassword', confirmation);
      };
      await fill('mismatch');
      const beforeMismatch = passwordChanges.length;
      await click('Change password');
      await until(() => evaluate('document.activeElement?.name === "confirmPassword" && (document.body?.innerText ?? "").includes("Passwords must match.")'), 'local administrator confirmation');
      assert.equal(passwordChanges.length, beforeMismatch);
      await typeField('confirmPassword', newPassword);
      for (const [mode, feedback] of [['wrong', 'current password is incorrect'], ['reused', 'Choose a new password different']]) {
        passwordMode = mode;
        await click('Change password');
        await until(() => evaluate('(document.body?.innerText ?? "").includes(' + JSON.stringify(feedback) + ') && !document.querySelector("input[name=currentPassword]").matches(":disabled")'), 'administrator rejection');
        assert.deepEqual(passwordChanges.at(-1), { currentPassword, newPassword });
        assert.equal(await evaluate('document.querySelector("input[name=newPassword]").value'), newPassword);
        assert.doesNotMatch(await evaluate('document.body.innerText'), /Your password was changed/);
      }
      passwordMode = 'confirmed';
      await until(() => evaluate('document.activeElement?.name === "newPassword"'), 'rejected field focus');
      await cdp.send('Page.bringToFront');
      await evaluate('document.querySelector("input[name=currentPassword]").focus()');
      assert.equal(await evaluate('document.activeElement.name'), 'currentPassword');
      for (const expected of ['Show current password', 'newPassword', 'Show new password', 'confirmPassword']) {
        await cdp.send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9 });
        await cdp.send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9 });
        assert.equal(await evaluate('document.activeElement.name || document.activeElement.getAttribute("aria-label")'), expected);
      }
      await cdp.send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13, text: '\r' });
      await cdp.send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13 });
      await until(() => evaluate('(document.body?.innerText ?? "").includes("Your password was changed.")'), 'keyboard administrator change');
      assert.deepEqual(passwordChanges.at(-1), { currentPassword, newPassword });
      assert.equal(await evaluate('location.pathname'), route);
      assert.match(await evaluate('document.body.innerText'), /original expiry.*Other sessions and outstanding password-reset links were invalidated/s);
      for (const name of ['currentPassword', 'newPassword', 'confirmPassword']) {
        assert.equal(await evaluate('document.querySelector(' + JSON.stringify('input[name=' + name + ']') + ').value'), '');
      }
      for (const mode of ['lost', 'unusable', 'service']) {
        await fill(newPassword);
        passwordMode = mode;
        const writes = passwordChanges.length;
        const reads = profileReads;
        await click('Change password');
        await until(() => evaluate('(document.body?.innerText ?? "").includes("Your current session is still available.")'), 'administrator uncertain outcome');
        assert.match(await evaluate('document.body.innerText'), /cannot show which password is stored/);
        assert.doesNotMatch(await evaluate('document.body.innerText'), /Your password was changed|private provider/);
        for (const name of ['currentPassword', 'newPassword', 'confirmPassword']) {
          assert.equal(await evaluate('document.querySelector(' + JSON.stringify('input[name=' + name + ']') + ').value'), '');
        }
        await delay(200);
        assert.equal(passwordChanges.length, writes + 1);
        assert.equal(profileReads, reads + 1);
        assert.equal(await evaluate('Boolean(document.querySelector("a[href^=\'/login\']")) && Boolean(document.querySelector("a[href^=\'/forgot-password\']"))'), true);
      }
      passwordMode = 'confirmed';
      currentRole = 'ATTENDEE';
    });
    await scenario(route + ' hides administrator password controls from other roles and guests', async () => {
      for (const role of ['ATTENDEE', 'ORGANIZER']) {
        currentRole = role;
        await cdp.send('Page.navigate', { url: origin + route });
        await until(() => evaluate('(document.body?.innerText ?? "").includes("Access denied")'), 'administrator role denial');
        assert.equal(await evaluate('Boolean(document.querySelector("input[type=password]"))'), false);
      }
      await cdp.send('Network.clearBrowserCookies');
      await cdp.send('Page.navigate', { url: origin + route });
      await until(() => evaluate('location.pathname === "/login" && Boolean(document.querySelector("input[name=email]"))'), 'administrator guest login');
      currentRole = 'ATTENDEE';
    });
  }

  const registrationReturn = '/events/concert/tickets?category=standing';
  const openRegistration = async () => {
    await cdp.send('Network.clearBrowserCookies');
    await cdp.send('Page.navigate', { url: `${origin}/register/attendee?returnTo=${encodeURIComponent(registrationReturn)}` });
    await until(() => evaluate(`document.querySelector('input[name="firstName"]')?.checkVisibility() && (Boolean(document.querySelector('input[name="terms"]')) || document.body.innerText.includes('Current terms could not be loaded'))`), 'registration form and terms');
  };
  const fillRegistration = async (password = ' exact password e\u0301 🔒 ', firstName = ' Ana ') => {
    await evaluate(`for (const [name, value] of Object.entries(${JSON.stringify({ firstName, lastName: ' Cruz ', email: ' ANA+tag@EXAMPLE.invalid ', password, confirmPassword: password })})) document.querySelector('[name="' + name + '"]').value = value;
      if (!document.querySelector('[name="terms"]').checked) document.querySelector('[name="terms"]').click()`);
    await until(() => evaluate(`!document.querySelector('button[type="submit"]').disabled`), 'explicit acceptance');
  };

  await scenario('reading terms and returning to the registration tab preserves entered fields and credentials', async () => {
    await openRegistration();
    await fillRegistration();
    holdAccountReads = true;
    await evaluate(`window.dispatchEvent(new Event('focus'))`);
    await until(() => delayedAccountReads.length > 0, 'pending guest check');
    assert.equal(await evaluate(`document.querySelector('input[name="firstName"]').checkVisibility()`), false);
    holdAccountReads = false;
    delayedAccountReads.splice(0).forEach(complete => complete());
    await until(() => evaluate(`document.querySelector('input[name="firstName"]')?.checkVisibility()`), 'guest account refresh');
    assert.equal(await evaluate(`document.querySelector('[name="firstName"]').value`), ' Ana ');
    assert.equal(await evaluate(`document.querySelector('[name="password"]').value`), ' exact password e\u0301 🔒 ');
  });

  await scenario('terms outage disables registration with retry while login and recovery remain available', async () => {
    termsAvailable = false;
    await openRegistration();
    assert.equal(await evaluate(`document.querySelector('button[type="submit"]').disabled`), true);
    assert.equal(await evaluate(`Boolean(document.querySelector('a[href^="/legal/"]'))`), false);
    assert.ok(await evaluate(`Boolean(document.querySelector('a[href^="/login"]')) && Boolean(document.querySelector('a[href^="/forgot-password"]'))`));
    termsAvailable = true;
    await click('Retry current terms');
    await until(() => evaluate(`Boolean(document.querySelector('a[href="https://example.invalid/fixture-v1"]'))`), 'current document');
    assert.equal(await evaluate(`document.querySelector('[name="terms"]').checked`), false);
  });

  await scenario('changed terms require fresh consent and a separate submission while preserving nonsensitive fields', async () => {
    registrationMode = 'stale';
    await fillRegistration();
    const before = registrations.length;
    await click('Register');
    await until(() => evaluate(`Boolean(document.querySelector('a[href="https://example.invalid/fixture-v2"]'))`), 'new terms document');
    assert.equal(await evaluate(`document.querySelector('[name="terms"]').checked`), false);
    assert.equal(await evaluate(`document.querySelector('[name="firstName"]').value`), ' Ana ');
    assert.equal(await evaluate(`document.querySelector('[name="email"]').value`), 'ANA+tag@EXAMPLE.invalid');
    assert.equal(await evaluate(`document.querySelector('[name="password"]').value`), '');
    assert.equal(await evaluate(`document.querySelector('button[type="submit"]').disabled`), true);
    assert.equal(registrations.length, before + 1);
    registrationMode = 'created';
    const password = '🔒'.repeat(128), firstName = '🪩'.repeat(100);
    await fillRegistration(password, firstName);
    for (const name of ['firstName', 'lastName', 'password', 'confirmPassword']) assert.equal(await evaluate(`document.querySelector('[name="${name}"]').hasAttribute('maxlength')`), false);
    await click('Register');
    await until(() => evaluate(`document.body.innerText.includes('You have not been signed in')`), 'verification instructions');
    assert.deepEqual(registrations.at(-1), { firstName, lastName: 'Cruz', email: 'ana+tag@example.invalid', password, termsAccepted: true, termsVersion: 'fixture-v2' });
    assert.equal((await cdp.send('Network.getAllCookies')).cookies.length, 0);
    const login = new URL(await evaluate(`Array.from(document.querySelectorAll('a')).find(a => a.textContent === 'Log in separately').href`));
    assert.equal(login.searchParams.get('returnTo'), registrationReturn);
    assert.equal(await evaluate(`Boolean(document.querySelector('[name="password"]'))`), false);
  });

  await scenario('duplicate, failed delivery and lost registration responses offer explicit next steps without resubmitting', async () => {
    for (const [mode, text] of [['duplicate', 'existing account has not been changed'], ['delivery-failed', 'terms acceptance were saved'], ['uncertain', 'could not confirm registration'], ['gateway', 'could not confirm registration']]) {
      registrationMode = mode;
      await openRegistration();
      await fillRegistration();
      const before = registrations.length;
      await click('Register');
      await until(() => evaluate(`document.body.innerText.includes(${JSON.stringify(text)})`), mode);
      assert.equal(registrations.length, before + 1);
      assert.equal(await evaluate(`Boolean(document.querySelector('button[type="submit"]'))`), false);
      if (mode !== 'duplicate') assert.ok(await evaluate(`Boolean(document.querySelector('a[href^="/verify-email"]'))`));
      if (mode !== 'delivery-failed') assert.ok(await evaluate(`Boolean(document.querySelector('a[href^="/forgot-password"]'))`));
    }
  });

  await scenario('registration throttling preserves input and displays Retry-After', async () => {
    registrationMode = 'limited';
    await openRegistration();
    await fillRegistration();
    await click('Register');
    await until(() => evaluate(`document.body.innerText.includes('Try again in 60 seconds')`), 'registration throttle');
    assert.equal(await evaluate(`document.querySelector('[name="firstName"]').value`), ' Ana ');
    registrationMode = 'created';
  });

  const workspaceRoutes = {
    ATTENDEE: ['/dashboard', '/dashboard/tickets', '/dashboard/profile', '/dashboard/booking-history',
      '/dashboard/buy-tickets?eventId=concert&category=standing', '/events/concert/tickets', '/events/concert/seats',
      '/bookings/fixture/summary', '/bookings/fixture/payment', '/bookings/fixture/confirmation'],
    ORGANIZER: ['/organizer', '/organizer/dashboard', '/organizer/events', '/organizer/events/new',
      '/organizer/analytics', '/organizer/check-in', '/organizer/profile'],
    ADMINISTRATOR: ['/admin', '/admin/dashboard', '/admin/users', '/admin/organizers', '/admin/events',
      '/admin/bookings', '/admin/payments', '/admin/activity-logs', '/admin/profile', '/admin/settings'],
  };
  const noPersonalSamples = body => {
    assert.doesNotMatch(body, /Sherwin Cruz|Sarah Johnson|Admission Pass Issued|Booking Confirmed|Total Revenue|Recent Transactions/);
  };

  await scenario('every protected page rejects direct guest requests and preserves only allowed returns', async () => {
    for (const route of Object.values(workspaceRoutes).flat()) {
      const response = await fetch(`${origin}${route}`, { redirect: 'manual' });
      const body = await response.text();
      const location = response.headers.get('location');
      assert.ok(location?.startsWith('/login') || /http-equiv="refresh" content="[01];url=\/login/.test(body), route);
      assert.doesNotMatch(body, /This feature is unavailable|Signed in as/);
      noPersonalSamples(body);
    }
    for (const [route, expected] of [
      ['/events/concert/tickets?category=standing', '/events/concert/tickets?category=standing'],
      ['/bookings/fixture/payment', '/bookings/fixture/payment'],
      ['/dashboard/buy-tickets?eventId=concert&category=standing', '/dashboard/buy-tickets?eventId=concert&category=standing'],
      ['/admin/users?returnTo=https://evil.invalid&role=ADMINISTRATOR', null],
      ['/dashboard/buy-tickets?eventId=%2e%2e', null],
    ]) {
      const response = await fetch(`${origin}${route}`, { redirect: 'manual' });
      const body = await response.text();
      const location = response.headers.get('location') ?? /http-equiv="refresh" content="[01];url=([^"]+)/.exec(body)?.[1];
      assert.ok(location, route);
      assert.equal(new URL(location, origin).searchParams.get('returnTo'), expected, route);
    }
    assert.equal((await fetch(`${origin}/preview/booking`)).status, 404);
  });

  await scenario('all direct role pairings and nested pages render only the exact permitted workspace', async () => {
    for (const role of Object.keys(workspaceRoutes)) {
      currentRole = role;
      for (const [requiredRole, routes] of Object.entries(workspaceRoutes)) {
        for (const route of routes) {
          const response = await fetch(`${origin}${route}`, { headers: { Cookie: 'fixture-account=old' } });
          const body = await response.text();
          assert.equal(response.status, 200, `${role} ${route}`);
          noPersonalSamples(body);
          if (role === requiredRole) {
            assert.match(body, ['/dashboard/profile', '/admin/profile'].includes(route) ? /Personal account profile/
              : route === '/admin/settings' ? /Change password/ : /This feature is unavailable/, `${role} ${route}`);
            assert.match(body, /Fixture old/);
          } else {
            assert.match(body, /Access denied/, `${role} ${route}`);
            assert.match(body, /Go to your permitted workspace/);
            assert.doesNotMatch(body, /This feature is unavailable|Signed in as/);
          }
        }
      }
    }
    currentRole = 'ATTENDEE';
  });

  await scenario('direct browser navigation enforces guests and all nine exact role pairings', async () => {
    await cdp.send('Network.clearBrowserCookies');
    for (const route of ['/dashboard/tickets', '/organizer/events/new', '/admin/users']) {
      await cdp.send('Page.navigate', { url: `${origin}${route}` });
      await until(() => evaluate(`location.pathname === '/login' && Boolean(document.querySelector('input[name="email"]'))`), `guest ${route}`);
      assert.equal(await evaluate(`(document.body?.innerText ?? "").includes('This feature is unavailable')`), false);
    }
    await cdp.send('Network.setCookie', { name: 'fixture-account', value: 'old', url: origin, httpOnly: true, path: '/' });
    for (const role of Object.keys(workspaceRoutes)) {
      currentRole = role;
      for (const [requiredRole, route] of [['ATTENDEE', '/dashboard/tickets'], ['ORGANIZER', '/organizer/events/new'], ['ADMINISTRATOR', '/admin/users']]) {
        holdAccountReads = true;
        await cdp.send('Page.navigate', { url: `${origin}${route}?role=${requiredRole}` });
        await until(() => evaluate(`location.pathname === ${JSON.stringify(route)} && (document.body?.innerText ?? "").includes('Checking your current account')`), 'hydrated direct workspace');
        await until(() => delayedAccountReads.length > 0, 'direct browser account read');
        holdAccountReads = false;
        delayedAccountReads.splice(0).forEach(complete => complete());
        const expected = role === requiredRole ? 'This feature is unavailable' : 'Access denied';
        await until(() => evaluate(`location.pathname === ${JSON.stringify(route)} && (document.body?.innerText ?? "").includes(${JSON.stringify(expected)})`), `${role} ${requiredRole}`);
        const body = await evaluate('(document.body?.innerText ?? "")');
        noPersonalSamples(body);
        if (role !== requiredRole) assert.doesNotMatch(body, /This feature is unavailable|Signed in as/);
        else assert.match(body, /Signed in as Fixture old/);
        assert.equal(await evaluate(`Boolean(document.querySelector('input, select'))`), false);
      }
    }
    currentRole = 'ATTENDEE';
  });

  await scenario('direct nested requests fail closed for every account gate, stale session, and outage', async () => {
    for (const [status, code, message] of [
      [401, 'AUTHENTICATION_REQUIRED', undefined],
      [403, 'ACCOUNT_DISABLED', 'This account cannot sign in'],
      [403, 'EMAIL_VERIFICATION_REQUIRED', 'Verify your email address'],
      [403, 'TERMS_ACCEPTANCE_REQUIRED', 'Accept the current terms'],
      [403, 'PASSWORD_RESET_REQUIRED', 'Reset your password through account recovery'],
      [503, 'INTERNAL_ERROR', 'account service is unavailable'],
      [200, undefined, 'unsupported response'],
    ]) {
      accountResponse = { status, body: code ? { error: { code } } : { data: { user: { id: 'malformed' } } } };
      for (const route of ['/dashboard/tickets', '/organizer/events/new', '/admin/payments']) {
        const response = await fetch(`${origin}${route}`, { redirect: 'manual', headers: { Cookie: 'fixture-account=old' } });
        const body = await response.text();
        assert.doesNotMatch(body, /This feature is unavailable|Signed in as|Fixture old/);
        noPersonalSamples(body);
        if (message) assert.ok(body.includes(message), `${code} ${route}`);
        else assert.equal(response.headers.get('location'), '/login');
      }
    }
    accountResponse = undefined;
  });

  await scenario('client navigation rechecks all role pairings without signing denied accounts out', async () => {
    const before = logoutRequests;
    for (const [requiredRole, base, nested] of [
      ['ATTENDEE', '/dashboard', '/dashboard/tickets'],
      ['ORGANIZER', '/organizer/dashboard', '/organizer/events/new'],
      ['ADMINISTRATOR', '/admin/dashboard', '/admin/users'],
    ]) {
      for (const role of [...Object.keys(workspaceRoutes), 'GUEST']) {
        await cdp.send('Network.setCookie', { name: 'fixture-account', value: 'old', url: origin, httpOnly: true, path: '/' });
        currentRole = requiredRole;
        holdAccountReads = true;
        await cdp.send('Page.navigate', { url: `${origin}${base}` });
        await until(() => evaluate(`location.pathname === ${JSON.stringify(base)} && (document.body?.innerText ?? "").includes('Checking your current account')`), 'hydrated workspace waits for current account');
        await until(() => delayedAccountReads.length > 0, 'hydrated browser account read');
        holdAccountReads = false;
        delayedAccountReads.splice(0).forEach(complete => complete());
        await until(() => evaluate(`(document.body?.innerText ?? "").includes('This feature is unavailable')`), 'permitted starting workspace');
        await evaluate('window.workspaceNavigationMarker = true');
        if (role === 'GUEST') await cdp.send('Network.clearBrowserCookies');
        else currentRole = role;
        await evaluate(`document.querySelector('a[href="${nested}"]').click()`);
        if (role === 'GUEST') {
          await until(() => evaluate(`location.pathname === '/login' && Boolean(document.querySelector('input[name="email"]'))`), `client guest ${requiredRole}`);
          assert.equal(await evaluate('window.workspaceNavigationMarker'), true);
          assert.equal(await evaluate(`(document.body?.innerText ?? "").includes('This feature is unavailable')`), false);
          assert.equal(logoutRequests, before);
          continue;
        }
        const expected = role === requiredRole ? 'This feature is unavailable' : 'Access denied';
        await until(() => evaluate(`location.pathname === ${JSON.stringify(nested)} && (document.body?.innerText ?? "").includes(${JSON.stringify(expected)})`), `client ${role} ${requiredRole}`);
        assert.equal(await evaluate('window.workspaceNavigationMarker'), true, 'navigation stays in the client router');
        const body = await evaluate('(document.body?.innerText ?? "")');
        noPersonalSamples(body);
        if (role !== requiredRole) {
          assert.doesNotMatch(body, /This feature is unavailable|Signed in as/);
          await evaluate(`Array.from(document.querySelectorAll('a')).find(a => a.textContent === 'Go to your permitted workspace').click()`);
          await until(() => evaluate(`(document.body?.innerText ?? "").includes('This feature is unavailable') && (document.body?.innerText ?? "").includes('Signed in as Fixture old')`), 'permitted destination');
        }
        assert.equal(logoutRequests, before);
      }
    }
    await cdp.send('Network.setCookie', { name: 'fixture-account', value: 'old', url: origin, httpOnly: true, path: '/' });
    currentRole = 'ATTENDEE';
  });

  await scenario('focus hides old identity until the current server account is known', async () => {
    await openAccount('/login');
    holdAccountReads = true;
    await evaluate(`window.dispatchEvent(new Event('focus'))`);
    await until(() => delayedAccountReads.length > 0, 'delayed frontend account read');
    assert.equal(await evaluate(`(document.body?.innerText ?? "").includes('Hi, Fixture old') || (document.body?.innerText ?? "").includes('You are signed in')`), false);
    holdAccountReads = false;
    delayedAccountReads.splice(0).forEach(complete => complete());
    await until(() => evaluate(`(document.body?.innerText ?? "").includes('Hi, Fixture old') && (document.body?.innerText ?? "").includes('You are signed in')`), 'fresh identity after focus');
  });

  await scenario('nested navigation never inserts stale workspace content while the new account check is delayed', async () => {
    for (const [status, code, message] of [[403, 'ACCOUNT_DISABLED', 'This account cannot sign in'], [503, 'INTERNAL_ERROR', 'account service is unavailable']]) {
      currentRole = 'ORGANIZER';
      holdAccountReads = true;
      await cdp.send('Page.navigate', { url: `${origin}/organizer/events` });
      await until(() => delayedAccountReads.length > 0, 'starting workspace hydration');
      holdAccountReads = false;
      delayedAccountReads.splice(0).forEach(complete => complete());
      await until(() => evaluate(`(document.body?.innerText ?? "").includes('This feature is unavailable')`), 'hydrated organizer workspace');
      await evaluate(`window.staleWorkspaceInsertions = [];
        window.workspaceObserver = new MutationObserver(changes => {
          if (location.pathname !== '/organizer/events/new') return;
          for (const change of changes) for (const node of change.addedNodes) {
            if (/This feature is unavailable|Signed in as Fixture/.test(node.textContent ?? '')) window.staleWorkspaceInsertions.push(node.textContent);
          }
        });
        window.workspaceObserver.observe(document.body, {childList:true, subtree:true});`);
      accountResponse = { status, body: { error: { code } } };
      holdAccountReads = true;
      await evaluate(`document.querySelector('a[href="/organizer/events/new"]').click()`);
      await until(() => evaluate(`location.pathname === '/organizer/events/new'`), 'nested navigation commits');
      await until(() => delayedAccountReads.length > 0, 'pending navigation account check');
      assert.equal(await evaluate(`(document.body?.innerText ?? "").includes('This feature is unavailable') || (document.body?.innerText ?? "").includes('Signed in as Fixture')`), false);
      holdAccountReads = false;
      delayedAccountReads.splice(0).forEach(complete => complete());
      await until(() => evaluate(`(document.body?.innerText ?? "").includes(${JSON.stringify(message)})`), 'fresh navigation restriction');
      assert.deepEqual(await evaluate('window.staleWorkspaceInsertions'), []);
      await evaluate('window.workspaceObserver.disconnect()');
      accountResponse = undefined;
    }
    currentRole = 'ATTENDEE';
  });

  await scenario('a newer failed eligibility check wins over an older successful response', async () => {
    await openAccount('/login');
    holdAccountReads = true;
    await evaluate(`window.dispatchEvent(new Event('focus'))`);
    await until(() => delayedAccountReads.length > 0, 'old account read');
    holdAccountReads = false;
    accountResponse = { status: 403, body: { error: { code: 'ACCOUNT_DISABLED' } } };
    await evaluate(`window.dispatchEvent(new Event('focus'))`);
    await until(() => evaluate(`(document.body?.innerText ?? "").includes('This account cannot sign in')`), 'current eligibility failure');
    delayedAccountReads.splice(0).forEach(complete => complete());
    await delay(250);
    assert.equal(await evaluate(`(document.body?.innerText ?? "").includes('Hi, Fixture old') || (document.body?.innerText ?? "").includes('You are signed in')`), false);
    assert.equal(await evaluate(`(document.body?.innerText ?? "").includes('This account cannot sign in')`), true);
    accountResponse = undefined;
  });

  await scenario('navigation and query-only navigation refresh preserved workspace layouts', async () => {
    await openAccount('/login');
    holdAccountReads = true;
    await cdp.send('Page.navigate', { url: `${origin}/dashboard` });
    await until(() => evaluate(`(document.body?.innerText ?? "").includes('Checking your current account')`), 'hydrated workspace check');
    await until(() => delayedAccountReads.length > 0, 'dashboard browser account read');
    holdAccountReads = false;
    delayedAccountReads.splice(0).forEach(complete => complete());
    await until(() => evaluate(`(document.body?.innerText ?? "").includes('This feature is unavailable')`), 'eligible workspace');
    await until(() => evaluate(`Boolean(document.querySelector('a[href="/dashboard/tickets"]'))`), 'workspace tickets link');
    accountResponse = { status: 403, body: { error: { code: 'ACCOUNT_DISABLED' } } };
    await until(() => evaluate(`(() => {
      const link = document.querySelector('a[href="/dashboard/tickets"]');
      if (!link) return false;
      link.click();
      return true;
    })()`), 'workspace tickets navigation');
    await until(() => evaluate(`location.pathname === '/dashboard/tickets' && (document.body?.innerText ?? "").includes('This account cannot sign in')`), 'navigation eligibility refresh');
    assert.equal(await evaluate(`(document.body?.innerText ?? "").includes('Sherwin Cruz')`), false);
    accountResponse = { status: 401, body: { error: { code: 'AUTHENTICATION_REQUIRED' } } };
    await evaluate(`history.pushState(null, '', '?view=refresh')`);
    await until(() => evaluate(`location.pathname === '/login' && Boolean(document.querySelector('input[name="email"]'))`), 'query navigation authentication refresh');
    assert.equal(await evaluate(`(document.body?.innerText ?? "").includes('My Tickets')`), false);
    accountResponse = undefined;
  });

  await scenario('unknown workspace state hides content and preserves distinct approved account gates', async () => {
    await openAccount('/login');
    await cdp.send('Page.navigate', { url: `${origin}/dashboard` });
    await until(() => evaluate(`(document.body?.innerText ?? "").includes('This feature is unavailable')`), 'eligible workspace');
    holdAccountReads = true;
    await evaluate(`window.dispatchEvent(new Event('focus'))`);
    await until(() => delayedAccountReads.length > 0, 'pending workspace check');
    assert.equal(await evaluate(`(document.body?.innerText ?? "").includes('This feature is unavailable')`), false);
    holdAccountReads = false;
    delayedAccountReads.splice(0).forEach(complete => complete());
    await until(() => evaluate(`(document.body?.innerText ?? "").includes('This feature is unavailable')`), 'confirmed workspace');
    for (const [response, message] of [
      [{ status: 403, body: { error: { code: 'EMAIL_VERIFICATION_REQUIRED' } } }, 'Verify your email address'],
      [{ status: 403, body: { error: { code: 'TERMS_ACCEPTANCE_REQUIRED' } } }, 'Accept the current terms'],
      [{ status: 403, body: { error: { code: 'PASSWORD_RESET_REQUIRED' } } }, 'Reset your password through account recovery'],
      [{ status: 200, body: { data: { user: { id: 'malformed' } } } }, 'unsupported response'],
      [{ status: 503, body: { error: { code: 'INTERNAL_ERROR' } } }, 'account service is unavailable'],
    ]) {
      accountResponse = response;
      await evaluate(`window.dispatchEvent(new Event('focus'))`);
      await until(() => evaluate(`(document.body?.innerText ?? "").includes(${JSON.stringify(message)})`), message);
      assert.equal(await evaluate(`(document.body?.innerText ?? "").includes('This feature is unavailable') || (document.body?.innerText ?? "").includes('Signed in as Fixture') || (document.body?.innerText ?? "").includes('Sherwin Cruz')`), false);
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
    await until(() => evaluate(`Boolean(document.querySelector('input[name="email"]')) && !(document.body?.innerText ?? "").includes('Hi, Fixture old')`), 'reset sign-out');
    delayedAccountReads.splice(0).forEach(complete => complete());
    await delay(250);
    assert.equal(await evaluate(`(document.body?.innerText ?? "").includes('Hi, Fixture old') || (document.body?.innerText ?? "").includes('You are signed in')`), false);
  });

  await scenario('a confirmed logout signal checks current account even without navigation', async () => {
    await openAccount('/login');
    await cdp.send('Network.clearBrowserCookies');
    accountResponse = { status: 503, body: { error: { code: 'INTERNAL_ERROR' } } };
    await evaluate(`window.dispatchEvent(new CustomEvent('aventix:session-updated', { detail: 'signed-out' }))`);
    assert.equal(await evaluate(`(document.body?.innerText ?? "").includes('Hi, Fixture old') || (document.body?.innerText ?? "").includes('You are signed in')`), false);
    await until(() => evaluate(`(document.body?.innerText ?? "").includes('account service is unavailable')`), 'post-logout account check', 15000);
    accountResponse = undefined;
  });

  await scenario('confirmed reset reconciles an earlier uncertain logout without another mutation', async () => {
    await openAccount('/login');
    logoutMode = 'uncertain';
    await click('Sign out to use another account');
    await until(() => evaluate(`(document.body?.innerText ?? "").includes('Sign-out could not be confirmed')`), 'uncertain logout before reset');
    await cdp.send('Network.clearBrowserCookies');
    await evaluate(`window.dispatchEvent(new CustomEvent('aventix:session-updated', { detail: 'reset' }))`);
    await until(() => evaluate(`Boolean(document.querySelector('input[name="email"]')) && !(document.body?.innerText ?? "").includes('Sign-out could not be confirmed')`), 'reset confirms browser sign-out');
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
      await until(() => otherEvaluate(`(document.body?.innerText ?? "").includes('Hi, Fixture old') && (document.body?.innerText ?? "").includes('You are signed in')`), 'second tab identity');
      await otherEvaluate(`window.accountHints = []; window.addEventListener('storage', event => {
        if (event.key === 'aventix:account-changed' && event.newValue) window.accountHints.push(event.newValue);
      })`);
      await cdp.send('Page.bringToFront');
      await until(() => evaluate(`(document.body?.innerText ?? "").includes('You are signed in')`), 'first tab focus');
      holdAccountReads = true;
      await otherEvaluate(`window.dispatchEvent(new Event('focus'))`);
      await until(() => delayedAccountReads.length > 0, 'second tab pre-logout read');
      holdAccountReads = false;
      await click('Sign out to use another account');
      await until(() => otherEvaluate(`Boolean(document.querySelector('input[name="email"]')) && !(document.body?.innerText ?? "").includes('You are signed in')`), 'background tab logout hint');
      delayedAccountReads.splice(0).forEach(complete => complete());
      await delay(250);
      assert.equal(await otherEvaluate(`(document.body?.innerText ?? "").includes('Hi, Fixture old') || (document.body?.innerText ?? "").includes('You are signed in')`), false);
      await until(() => evaluate(`location.pathname === '/login' && Boolean(document.querySelector('input[name="email"]'))`), 'first tab login form');
      loginRole = 'ATTENDEE';
      await evaluate(`document.querySelector('input[name="email"]').value = 'new@example.invalid';
        document.querySelector('input[name="password"]').value = ' fixture password ';
        document.querySelector('input[name="email"]').form.requestSubmit()`);
      await until(() => otherEvaluate(`(document.body?.innerText ?? "").includes('Hi, Fixture new') && (document.body?.innerText ?? "").includes('You are signed in')`), 'background tab login hint');
      const hints = await otherEvaluate('window.accountHints');
      assert.ok(hints.length >= 2);
      assert.ok(hints.every(hint => /^[0-9a-f-]{36}$/.test(hint)));
      assert.equal(await otherEvaluate(`localStorage.getItem('aventix:account-changed')`), null);
      accountResponse = { status: 401, body: { error: { code: 'AUTHENTICATION_REQUIRED' } } };
      await delay(250);
      assert.equal(await otherEvaluate(`(document.body?.innerText ?? "").includes('Hi, Fixture new')`), true, 'remote expiry has no immediate idle-tab promise');
      await other.send('Page.bringToFront');
      await until(() => otherEvaluate(`Boolean(document.querySelector('input[name="email"]')) && !(document.body?.innerText ?? "").includes('Hi, Fixture new')`), 'actual tab focus checks expiry');
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
    await until(() => evaluate(`(document.body?.innerText ?? "").includes('Sign-out could not be confirmed')`), 'uncertain sign-out');
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
        console.error('Login page:', await evaluate('(document.body?.innerText ?? "")'));
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
