import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';
import { root } from './load-typescript.mjs';

test('dashboard offers sign-out retry when logout is unconfirmed', () => {
  const file = path.join(root, 'src/components/dashboard/AttendeeDashboardScreen.tsx');
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020,
      jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
  }).outputText;
  const loaded = { exports: {} };
  const stub = () => null;
  const require = id => {
    if (id === 'react') return { useEffect: () => {} };
    if (id === 'react/jsx-runtime') return { jsx: (type, props) => ({ type, props }), jsxs: (type, props) => ({ type, props }) };
    if (id === 'next/navigation') return { usePathname: () => '/dashboard', useSearchParams: () => new URLSearchParams(), useRouter: () => ({ replace() {}, refresh() {} }) };
    if (id === '@/components/auth/useAccountSession') return { useAccountSession: () => ({ loading: false, unavailable: true, session: null, error: 'LOGOUT_UNCERTAIN', retry() {} }) };
    if (id === '@/lib/auth/account-session') return { accountSession: () => ({ navigate() {} }) };
    if (id === '@/components/auth/SignOutButton') return { __esModule: true, default: function SignOutButton() {} };
    return { default: stub, publicAuthClient: {}, workspaceNavigation: {} };
  };
  new Function('require', 'module', 'exports', code)(require, loaded, loaded.exports);
  const tree = loaded.exports.default({ initial: { loading: false, unavailable: true, session: null } });
  const children = tree.props.children;
  assert.ok(children.some(child => child.type?.name === 'SignOutButton'
    && child.props.children === 'Retry sign-out'));
});
