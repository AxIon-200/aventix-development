import { Pool } from 'pg';
import { readdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
const url = process.env.DATABASE_URL, development = process.env.DEV_DATABASE_URL, ref = process.env.TEST_DATABASE_PROJECT_REF;
if (process.env.NODE_ENV !== 'test' || !url || !development || url === development || !ref) throw new Error('Dedicated test database required');
const identity = new URL(url);
if (!(identity.hostname + ' ' + decodeURIComponent(identity.username)).includes(ref)) throw new Error('Unexpected database identity');
const pool = new Pool({connectionString:url, connectionTimeoutMillis:10000});
try {
  const marker = await pool.query('SELECT environment FROM public.test_environment_marker WHERE id=1');
  if (marker.rows[0]?.environment !== 'aventix-test') throw new Error('Unexpected database marker');
  const applied = await pool.query('SELECT migration_name FROM "_prisma_migrations" WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL');
  const pending = readdirSync('prisma/migrations',{withFileTypes:true}).filter(e=>e.isDirectory() && !applied.rows.some(r=>r.migration_name===e.name)).map(e=>e.name);
  if (pending.some(name=>name!=='20261025010000_paymongo_checkout')) throw new Error('Unrelated pending migrations: '+pending.join(', '));
  console.log('Dedicated test database verified; applying checkout migration only');
} finally { await pool.end(); }
execFileSync(process.execPath,['node_modules/prisma/build/index.js','migrate','deploy'],{stdio:'inherit',env:process.env});
