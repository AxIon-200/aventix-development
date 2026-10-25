import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import { cpSync, mkdtempSync, symlinkSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { root, load } from './load-typescript.mjs';
import { browserPath, connect, listen, removeTemporary, stop, until } from './browser-support.mjs';

test('organizer dates convert explicitly between Manila input and UTC', () => {
  const { manilaInput, manilaTimestamp } = load('src/lib/organizer.ts');
  assert.equal(manilaTimestamp('2026-11-20T19:00'), '2026-11-20T11:00:00.000Z');
  assert.equal(manilaInput('2026-11-20T11:00:00.000Z'), '2026-11-20T19:00');
  assert.equal(manilaTimestamp(''), null);
});

test('organizer screens connect real responses inside the exact-role protected shell', { timeout: 360000 }, async t => {
  let role = 'ORGANIZER', unavailable = false, accountId = 'organizer-1', accessRejected = false;
  let eventFailure = false, profileFailure = false, staleEvent = false;
  let revision = 0, logReads = 0;
  const events = [], scans = [], writes = [];
  let profile = { id: 'profile-1', organizationName: 'Fixture Organization', contactEmail: 'public@example.invalid', bio: '', approvalStatus: 'APPROVED', bankName: '', accountNumberMasked: null };
  const api = createServer(async (request, response) => {
    response.setHeader('Content-Type', 'application/json'); response.setHeader('Cache-Control', 'no-store');
    const url = new URL(request.url, 'http://fixture');
    const fail = (status, code) => response.writeHead(status).end(JSON.stringify({ error: { code } }));
    const send = data => response.end(JSON.stringify({ data }));
    if (!request.headers.cookie?.includes('fixture-account=organizer')) return fail(401, 'AUTHENTICATION_REQUIRED');
    if (accessRejected) return fail(403, 'ORGANIZATION_SUSPENDED');
    if (url.pathname === '/api/v1/me') {
      if (unavailable) return fail(503, 'INTERNAL_ERROR');
      return send({ user: { id: accountId, name: 'Fixture Organizer', firstName: 'Fixture', lastName: 'Organizer',
        email: 'fixture@example.invalid', phoneNumber: null, role, status: 'ACTIVE', emailVerified: true,
        termsVersion: 'fixture', termsAcceptedAt: '2026-01-01T00:00:00Z', createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z' } });
    }
    if (role !== 'ORGANIZER') return fail(403, 'FORBIDDEN');
    let body = '';
    for await (const chunk of request) body += chunk;
    const input = body ? JSON.parse(body) : null;
    if (input) writes.push({ path: url.pathname, method: request.method, input });
    const route = url.pathname.replace('/api/v1/organizer', '');
    if (route === '/profile') {
      if (request.method === 'PATCH') {
        if (profileFailure) return fail(400, 'VALIDATION_ERROR');
        const { accountNumber, bankName, ...fields } = input;
        profile = { ...profile, ...fields, ...(accountNumber ? { bankName, accountNumberMasked: `•••• ${accountNumber.slice(-4)}` } : {}) };
      }
      return send(profile);
    }
    if (route === '/events' && request.method === 'POST') {
      response.statusCode = 201;
      const event = { ...input, id: 'event-1', status: 'DRAFT', updatedAt: `2026-10-26T00:00:0${revision++}.000Z` };
      events.push(event); return send(event);
    }
    if (route.startsWith('/events/')) {
      const event = events.find(event => event.id === route.split('/')[2]);
      if (!event) return fail(404, 'NOT_FOUND');
      if (request.method === 'PATCH') {
        if (staleEvent || event.updatedAt !== input.expectedUpdatedAt) return fail(409, 'STALE_EVENT');
        Object.assign(event, input, { updatedAt: `2026-10-26T00:00:0${revision++}.000Z` });
      }
      return send(event);
    }
    if (route === '/events') {
      if (eventFailure) return fail(503, 'INTERNAL_ERROR');
      const query = url.searchParams.get('search')?.toLowerCase() ?? '', status = url.searchParams.get('status');
      return send(accountId === 'organizer-2' ? [] : events.filter(event => (!status || event.status === status) && `${event.title} ${event.venueText}`.toLowerCase().includes(query)).map(event => ({ ...event, venue: event.venueText || 'Not set', ticketsSold: 0, totalCapacity: null, capacityPercent: null, grossRevenue: 0, publicView: false })));
    }
    if (route === '/dashboard') return send({ organizationName: profile.organizationName, activeEvents: [], recentTicketSales: [], metrics: { activeEvents: 0, venues: 0, newEventsChange: 0, ticketsSold: 0, grossRevenue: 0, capacityPercent: null, checkInRate: 0, ticketsChange: null, grossChange: null, hasTestPayments: false } });
    if (route === '/analytics') return send({ from: url.searchParams.get('from'), to: url.searchParams.get('to'), netRevenue: null, grossRevenue: 0, grossChange: null, averageOrderValue: 0, ticketsPerOrder: 0, uniqueAttendees: 0, firstTimeBuyerPercent: 0, hasTestPayments: false, tiers: [] });
    if (route === '/analytics/export') { response.setHeader('Content-Type', 'text/csv'); return response.end('Payment date,Booking reference\r\n'); }
    if (route === '/check-ins') { logReads++; return send(accountId === 'organizer-2' ? [] : scans); }
    if (route === '/check-in') {
      if (input.ticketCode !== 'AVX-fixture') return send({ result: 'INVALID' });
      if (scans.length) return send({ result: 'ALREADY_USED' });
      const entry = { id: 'scan-1', name: 'Fixture Buyer', tier: 'Floor', scannedAt: '2026-10-26T08:00:00Z', result: 'VALID' };
      scans.push(entry); return send({ result: 'VALID', entry });
    }
    return fail(404, 'NOT_FOUND');
  });
  t.after(() => { api.closeAllConnections(); api.close(); });
  const apiPort = await listen(api), reservation = createServer(), appPort = await listen(reservation);
  await new Promise(resolve => reservation.close(resolve));
  const directory = mkdtempSync(path.join(tmpdir(), 'aventix-organizer-ui-'));
  let compiler, app, browser, cdp, browserProfile;
  t.after(async () => {
    if (cdp) await cdp.send('Browser.close').catch(() => {});
    stop(browser); stop(compiler); stop(app);
    if (browserProfile) await removeTemporary(browserProfile, 'aventix-organizer-browser-');
    await removeTemporary(directory, 'aventix-organizer-ui-');
  });
  for (const entry of ['src', 'public', 'package.json', 'tsconfig.json', 'next.config.ts', 'postcss.config.mjs', 'tailwind.config.ts']) cpSync(path.join(root, entry), path.join(directory, entry), { recursive: true });
  // Production compilation without a dependency on Google Fonts availability.
  const layout = path.join(directory, 'src/app/layout.tsx');
  writeFileSync(layout, readFileSync(layout, 'utf8').replace(/import \{ Inter, Space_Grotesk, Geist \} from "next\/font\/google";\r?\n/, '').replace(/const (?:inter|spaceGrotesk|geist) = [\s\S]*?\}\);\r?\n/g, '').replace('className={`${inter.variable} ${spaceGrotesk.variable} ${geist.variable}`}', ''));
  symlinkSync(path.join(root, 'node_modules'), path.join(directory, 'node_modules'), process.platform === 'win32' ? 'junction' : 'dir');
  const options = { cwd: directory, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'], env: { ...process.env, AUTH_BACKEND_URL: `http://127.0.0.1:${apiPort}`, NEXT_TELEMETRY_DISABLED: '1' } };
  compiler = spawn(process.execPath, [path.join(root, 'node_modules/next/dist/bin/next'), 'build', '--webpack'], options);
  let output = '';
  const capture = child => { child.stdout.on('data', chunk => { output = (output + chunk).slice(-6000); }); child.stderr.on('data', chunk => { output = (output + chunk).slice(-6000); }); };
  capture(compiler);
  await until(() => compiler.exitCode !== null, 'organizer production build', 240000);
  assert.equal(compiler.exitCode, 0, output);
  app = spawn(process.execPath, [path.join(root, 'node_modules/next/dist/bin/next'), 'start', '--hostname', '127.0.0.1', '--port', String(appPort)], options); capture(app);
  const origin = `http://127.0.0.1:${appPort}`;
  await until(async () => { if (app.exitCode !== null) throw new Error(output); try { return (await fetch(`${origin}/login`)).ok; } catch { return false; } }, 'organizer fixture app');
  const routes = [['', 'Your organizer dashboard'], ['/dashboard', 'Your organizer dashboard'], ['/events', 'My Events'], ['/events/new', 'Create New Event'], ['/analytics', 'Sales &amp; Analytics'], ['/check-in', 'Ticket Scanner'], ['/profile', 'Organizer Profile &amp; Payouts']];
  const get = (route, signedIn = true) => fetch(`${origin}/organizer${route}`, { redirect: 'manual', headers: signedIn ? { Cookie: 'fixture-account=organizer' } : {} });
  for (const [route, title] of routes) {
    const response = await get(route); assert.equal(response.status, 200, route);
    const body = await response.text(); assert.ok(body.includes(title), title); assert.match(body, /Fixture Organizer/);
    assert.match(body, /Aventix organizer dashboard/); assert.doesNotMatch(body, /Organizer UI preview|Sherwin Cruz|Electric Pulse Music Festival/);
    const guest = await get(route, false), guestBody = await guest.text();
    assert.ok(guest.headers.get('location')?.startsWith('/login') || /url=\/login/.test(guestBody));
    assert.doesNotMatch(guestBody, /Sherwin Cruz|Electric Pulse Music Festival/);
  }
  for (const deniedRole of ['ATTENDEE', 'ADMINISTRATOR']) {
    role = deniedRole;
    for (const [route] of routes) { const body = await (await get(route)).text(); assert.match(body, /Access denied/); assert.doesNotMatch(body, /Loading organizer data/); }
  }
  role = 'ORGANIZER'; unavailable = true;
  assert.match(await (await get('/dashboard')).text(), /Workspace unavailable/); unavailable = false;

  await t.test('browser saving, filtering, scanner, reporting, account switching and rejection', { skip: !browserPath && 'No browser installed' }, async () => {
    browserProfile = mkdtempSync(path.join(tmpdir(), 'aventix-organizer-browser-'));
    browser = spawn(browserPath, ['--headless=new', '--no-first-run', '--no-default-browser-check', '--remote-debugging-port=0', `--user-data-dir=${browserProfile}`, 'about:blank'], { windowsHide: true, stdio: ['ignore', 'ignore', 'pipe'] });
    let browserOutput = ''; browser.stderr.on('data', chunk => { browserOutput = (browserOutput + chunk).slice(-6000); });
    const debuggerUrl = await until(() => /DevTools listening on (ws:\/\/[^\s]+)/.exec(browserOutput)?.[1], 'organizer browser debugger');
    const tab = await (await fetch(`http://${new URL(debuggerUrl).host}/json/new?about:blank`, { method: 'PUT' })).json();
    cdp = await connect(tab.webSocketDebuggerUrl);
    await cdp.send('Page.enable'); await cdp.send('Network.enable'); await cdp.send('Runtime.enable');
    await cdp.send('Network.setCookie', { name: 'fixture-account', value: 'organizer', url: origin, httpOnly: true });
    const evaluate = async expression => { const response = await cdp.send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true }); if (response.exceptionDetails) throw new Error(response.exceptionDetails.exception?.description); return response.result.value; };
    const text = () => evaluate('document.body?.innerText ?? ""');
    const navigate = async (route, expected) => { await cdp.send('Page.navigate', { url: `${origin}/organizer${route}` }); await until(async () => (await text()).includes(expected), `organizer ${route}`); };
    const submit = async (name, fields) => {
      await until(() => evaluate(`(() => { const form = document.querySelector('[name="${name}"]')?.form; return Boolean(form && !form.querySelector('fieldset')?.disabled && Object.keys(form).some(key => key.startsWith('__reactFiber$')) && ![...form.elements].some(element => element.type === 'submit' && element.disabled)); })()`), `ready ${name} form`);
      return evaluate(`(() => { const form = document.querySelector('[name="${name}"]').form; for (const [key,value] of Object.entries(${JSON.stringify(fields)})) form.elements.namedItem(key).value = value; form.requestSubmit(); })()`);
    };
    await navigate('/dashboard', 'No confirmed paid sales yet.');
    assert.match(await text(), /No active events yet/);
    await navigate('/events/new', 'Create New Event');
    await until(() => evaluate(`Boolean(document.querySelector('[name="title"]')?.form && Object.keys(document.querySelector('[name="title"]').form).some(key => key.startsWith('__reactFiber$')))`), 'hydrated event form');
    await submit('title', { title: 'Browser Draft', category: 'Conference', venueText: 'Browser Hall, Manila', description: 'Browser description' });
    await until(() => events.length === 1 && evaluate('location.search.includes("eventId=event-1")'), 'created draft');
    await until(() => evaluate('document.querySelector("[name=title]")?.value === "Browser Draft"'), 'prefilled saved event');
    await submit('title', { title: 'Updated Browser Draft' });
    await until(() => events[0].title === 'Updated Browser Draft', 'repeated draft save');
    assert.equal(writes.filter(write => write.method === 'POST' && write.path.endsWith('/events')).length, 1);
    staleEvent = true;
    await submit('title', { title: 'Stale overwrite' });
    await until(async () => (await text()).includes('This event changed elsewhere'), 'stale event warning');
    assert.equal(events[0].title, 'Updated Browser Draft'); staleEvent = false;
    await navigate('/events', 'Updated Browser Draft'); assert.match(await text(), /Public View unavailable/);
    await submit('search', { search: 'absent' }); await until(async () => (await text()).includes('No events match'), 'empty filtered events');
    eventFailure = true; await navigate('/events?search=Browser', 'Retry');
    eventFailure = false; await evaluate(`[...document.querySelectorAll('main button')].find(button => button.textContent === 'Retry').click()`);
    await until(async () => (await text()).includes('Updated Browser Draft'), 'event retry');
    await evaluate(`[...document.querySelectorAll('header button')].find(button => button.getAttribute('aria-label') === 'Open search').click()`);
    await until(() => evaluate(`Boolean(document.querySelector('header input[type=search]'))`), 'topbar search');
    await evaluate(`(() => { const input = document.querySelector('header input[type=search]'); Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(input, 'Browser'); input.dispatchEvent(new Event('input', {bubbles:true})); })()`);
    await evaluate(`document.querySelector('header input[type=search]').form.requestSubmit()`);
    await until(() => evaluate('location.search.includes("search=Browser")'), 'topbar query');
    await navigate('/profile', 'Organization approval: APPROVED');
    profileFailure = true; await submit('organizationName', { organizationName: 'Browser Organization', bankName: 'Browser Bank', accountNumber: '000012345678' });
    await until(async () => (await text()).includes('Check the fields'), 'failed profile save');
    assert.equal(await evaluate('document.querySelector("[name=organizationName]").value'), 'Browser Organization');
    profileFailure = false; await submit('organizationName', {});
    await until(async () => (await text()).includes('Profile saved.'), 'profile saved');
    assert.equal(await evaluate('document.querySelector("[name=accountNumber]").value'), ''); assert.match(await text(), /5678/);
    await submit('organizationName', { bio: 'Only bio changes' });
    await until(() => profile.bio === 'Only bio changes', 'profile saved without bank replacement');
    assert.equal('accountNumber' in writes.at(-1).input, false);
    await navigate('/analytics', 'Fees and payouts are not recorded'); assert.match(await text(), /No ticket tiers yet/);
    await evaluate(`[...document.querySelectorAll('main button')].find(button => button.textContent === 'Export Sales CSV').click()`);
    await navigate('/check-in', 'No successful entries yet.');
    await evaluate(`Object.defineProperty(window, 'BarcodeDetector', {value: undefined, configurable:true}); [...document.querySelectorAll('main button')].find(button => button.textContent === 'Start Camera').click()`);
    await until(async () => (await text()).includes('Enter the ticket code manually'), 'manual camera fallback');
    await submit('ticketCode', { ticketCode: 'AVX-fixture' });
    await until(async () => (await text()).includes('VALID — admission recorded.') && (await text()).includes('Fixture Buyer'), 'successful admission');
    await until(() => logReads >= 2, 'immediate scan log refresh');
    await submit('ticketCode', { ticketCode: 'AVX-fixture' });
    await until(async () => (await text()).includes('ALREADY_USED'), 'duplicate scan');
    await evaluate(`(() => {
      window.cameraTracksStopped = 0;
      Object.defineProperty(window, 'BarcodeDetector', {configurable: true, value: class { async detect() { return [{rawValue: 'AVX-camera-fixture'}]; } }});
      const stream = new MediaStream(); stream.getTracks = () => [{stop() { window.cameraTracksStopped++; }}];
      Object.defineProperty(navigator.mediaDevices, 'getUserMedia', {configurable: true, value: async () => stream});
      HTMLMediaElement.prototype.play = async () => {};
      [...document.querySelectorAll('main button')].find(button => button.textContent === 'Start Camera').click();
    })()`);
    await until(() => writes.some(write => write.path.endsWith('/check-in') && write.input.ticketCode === 'AVX-camera-fixture'), 'camera shares manual validation endpoint');
    await until(async () => (await text()).includes('INVALID — do not admit.'), 'camera business result');
    assert.ok(await evaluate('window.cameraTracksStopped > 0'), 'camera stops after decoding');
    await navigate('/events', 'Updated Browser Draft');
    const readsAtUnmount = logReads;
    await new Promise(resolve => setTimeout(resolve, 10500)); assert.equal(logReads, readsAtUnmount, 'scanner polling stopped after unmount');
    accountId = 'organizer-2';
    await evaluate(`window.dispatchEvent(new CustomEvent('aventix:session-updated', {detail:'changed'}))`);
    await until(async () => (await text()).includes('No events match'), 'account switching clears old organizer data');
    assert.doesNotMatch(await text(), /Updated Browser Draft/);
    await navigate('/check-in', 'No successful entries yet.');
    accessRejected = true;
    await submit('ticketCode', { ticketCode: 'AVX-fixture' });
    await until(async () => (await text()).includes('Workspace unavailable'), 'expired organizer access');
    assert.doesNotMatch(await text(), /Fixture Buyer|AVX-fixture/);
  });
});
