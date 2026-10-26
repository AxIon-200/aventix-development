import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';
import { load, root } from './load-typescript.mjs';

test('buy-tickets selector includes only concerts with tickets on sale', async () => {
  const events = [
    { id: 'neon', name: 'Neon Nights', status: 'PUBLISHED', categories: [
      { status: 'ACTIVE', availability: 'AVAILABLE', remaining: 10 },
    ] },
    { id: 'maroon', name: 'Maroon 5', status: 'PUBLISHED', categories: [
      { status: 'ACTIVE', availability: 'NOT_YET_OPEN', remaining: 10 },
    ] },
    { id: 'sold-out', name: 'Sold Out', status: 'PUBLISHED', categories: [
      { status: 'ACTIVE', availability: 'SOLD_OUT', remaining: 0 },
    ] },
  ];
  const file = path.join(root, 'src/app/dashboard/buy-tickets/page.tsx');
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020,
      jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
  }).outputText;
  const pageModule = { exports: {} };
  const require = id => {
    if (id === '@/lib/events-api') return { getEvents: async () => events };
    if (id === '@/lib/event-booking') return load('src/lib/event-booking.ts');
    if (id === '@/lib/auth/server') return { currentServerAccount: async () => ({ role: 'ATTENDEE', userId: 'user' }) };
    if (id === '@/lib/auth/errors') return { AuthClientError: class extends Error {} };
    if (id === '@/lib/auth/destination') return { authHref: () => '/login' };
    if (id === 'next/navigation') return { redirect: () => { throw Error('unexpected redirect'); } };
    if (id === 'react/jsx-runtime' || id === 'react') return importReact(id);
    return { default: () => null };
  };
  new Function('require', 'module', 'exports', code)(require, pageModule, pageModule.exports);
  const tree = await pageModule.exports.default({ searchParams: Promise.resolve({}) });
  const flow = tree.props.children.props.children.props.children;
  assert.deepEqual(flow.props.events.map(event => event.name), ['Neon Nights']);
});

function importReact(id) {
  if (id === 'react') return { Suspense: ({ children }) => children };
  return { jsx: (type, props) => ({ type, props }), jsxs: (type, props) => ({ type, props }) };
}
