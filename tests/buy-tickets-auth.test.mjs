import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import ts from 'typescript';
import { load, root } from './load-typescript.mjs';

const require = createRequire(import.meta.url);
const params = {
  eventId: 'b36d9200-9161-40c2-a124-4b300a820101',
  category: 'b36d9200-9161-40c2-a124-4b300a820203',
};
const returnTo = `/dashboard/buy-tickets?${new URLSearchParams(params)}`;
const attendee = { userId: 'attendee-1', role: 'ATTENDEE', displayName: 'Ticket Buyer', email: 'buyer@example.com' };

function pageFor(session, error) {
  let eventReads = 0;
  const events = [{ id: params.eventId, status: 'PUBLISHED', categories: [{ status: 'ACTIVE', remaining: 10 }] }];
  const code = ts.transpileModule(fs.readFileSync(path.join(root, 'src/app/dashboard/buy-tickets/page.tsx'), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  const loadedModule = { exports: {} };
  const resolve = id => {
    if (id === 'next/navigation') return { redirect(location) { throw Object.assign(new Error('redirect'), { location }); } };
    if (id === '@/lib/auth/server') return { currentServerAccount: async () => { if (error) throw error; return session; } };
    if (id === '@/lib/auth/destination') return load('src/lib/auth/destination.ts');
    if (id === '@/lib/auth/errors') return load('src/lib/auth/errors.ts');
    if (id === '@/lib/events-api') return { getEvents: async () => { eventReads++; return events; } };
    if (id.startsWith('@/components/')) return { default: () => null };
    return require(id);
  };
  new Function('require', 'module', 'exports', code)(resolve, loadedModule, loadedModule.exports);
  return { render: (values = params) => loadedModule.exports.default({ searchParams: Promise.resolve(values) }), eventReads: () => eventReads, events };
}

test('guests must sign in before ticket data loads and retain their selection', async () => {
  const page = pageFor(null);
  await assert.rejects(page.render(), error => {
    const target = new URL(error.location, 'http://localhost:3001');
    assert.equal(target.pathname, '/login');
    assert.equal(target.searchParams.get('returnTo'), returnTo);
    return true;
  });
  assert.equal(page.eventReads(), 0);
  await assert.rejects(page.render({}), error => error.location === '/login');
});

test('an unavailable account check does not expose ticket data or the purchase flow', async () => {
  const page = pageFor(null, new Error('backend offline'));
  const gate = (await page.render()).props.children;
  assert.equal(gate.props.initial.unavailable, true);
  assert.equal(gate.props.children, undefined);
  assert.equal(page.eventReads(), 0);
});

test('other account roles receive the attendee access gate without ticket data', async () => {
  for (const role of ['ORGANIZER', 'ADMINISTRATOR']) {
    const page = pageFor({ ...attendee, role });
    const gate = (await page.render()).props.children;
    assert.equal(gate.props.role, 'ATTENDEE');
    assert.equal(gate.props.initial.session.role, role);
    assert.equal(gate.props.children, undefined);
    assert.equal(page.eventReads(), 0);
  }
});

test('signed-in attendees can purchase their selected tickets', async () => {
  const page = pageFor(attendee);
  const gate = (await page.render()).props.children;
  const flow = gate.props.children.props.children;
  assert.equal(page.eventReads(), 1);
  assert.equal(gate.props.returnTo, returnTo);
  assert.equal(flow.props.initialEventId, params.eventId);
  assert.equal(flow.props.initialCategory, params.category);
  assert.equal(flow.props.attendee.userId, attendee.userId);
  assert.deepEqual(flow.props.events, page.events);
});
