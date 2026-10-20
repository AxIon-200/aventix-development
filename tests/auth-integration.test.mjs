import test from 'node:test';
import assert from 'node:assert/strict';
import { load } from './load-typescript.mjs';
const { createBetterAuthClient } = load('src/lib/auth/better-auth.ts');
const user = (role = 'ATTENDEE') => ({ id:'u1', firstName:'Review', lastName:'User', name:'Review User', email:'review+tag@example.invalid', phoneNumber:null, role, status:'ACTIVE', emailVerified:true, termsVersion:'genuine-old-terms', termsAcceptedAt:'2026-01-01T00:00:00.000Z', createdAt:'2026-01-01T00:00:00.000Z', updatedAt:'2026-01-01T00:00:00.000Z' });
const json = (data, status=200, headers={}) => new Response(JSON.stringify(data), {status, headers});
const profile = (value=user()) => json({data:{user:value}});

test('login uses the approved envelope, normalized email, exact password and only approved fields', async () => {
 const calls=[];
 const client=createBetterAuthClient(async(url,options)=>{calls.push({url,options});return profile();});
 const result=await client.login({email:' REVIEW+tag@EXAMPLE.invalid ',password:' exact password e\u0301 ',rememberMe:true,role:'ADMINISTRATOR'});
 assert.deepEqual(result,{destination:'/events',allowBookingReturn:true});
 assert.deepEqual(calls.map(c=>c.url),['/api/auth/login','/api/v1/me']);
 assert.deepEqual(JSON.parse(calls[0].options.body),{email:'review+tag@example.invalid',password:' exact password e\u0301 '});
 for (const {options} of calls) {assert.equal(options.credentials,'include');assert.equal(options.cache,'no-store');}
 assert.equal(client.checkConnection,undefined);
 assert.equal(client.rememberMeSupported,undefined);
});

test('current account permits only supported eligible profiles and exact role navigation', async () => {
 for (const [role,href,canBook] of [['ATTENDEE','/events',true],['ORGANIZER','/organizer/dashboard',false],['ADMINISTRATOR','/admin/dashboard',false]]) {
  const account=await createBetterAuthClient(async()=>profile(user(role))).getSession();
  assert.equal(account.displayName,'Review User');assert.equal(account.navigation[0].href,href);assert.equal(account.canBook,canBook);
 }
 for (const changes of [{role:'ADMIN'},{role:['ATTENDEE']},{email:'not-an-email'},{phoneNumber:42},{status:'DISABLED'},{emailVerified:false},{termsVersion:null},{termsAcceptedAt:null},{name:' '},{id:undefined},{createdAt:'bad'}]) {
  await assert.rejects(createBetterAuthClient(async()=>profile({...user(),...changes})).getSession(),e=>e.code==='INVALID_RESPONSE');
 }
 for (const value of [null,{}, {user:user(),session:{}}, {data:{user:null}}, {data:{user:{id:'fake'}}}]) {
  await assert.rejects(createBetterAuthClient(async()=>json(value)).getSession(),e=>e.code==='INVALID_RESPONSE');
 }
 const mismatch=createBetterAuthClient(async url=>profile(url.endsWith('/me')?{...user(),id:'another',email:'other@example.invalid'}:user()));
 await assert.rejects(mismatch.login({email:user().email,password:'exact password'}),e=>e.code==='INVALID_RESPONSE');
});

test('API errors preserve gates, safe validation and retry guidance without displaying provider text', async () => {
 for (const [code,status] of [['INVALID_CREDENTIALS',401],['ACCOUNT_DISABLED',403],['EMAIL_VERIFICATION_REQUIRED',403],['TERMS_ACCEPTANCE_REQUIRED',403],['PASSWORD_RESET_REQUIRED',403]]) {
  const client=createBetterAuthClient(async()=>json({error:{code,message:'secret provider text'}},status));
  await assert.rejects(client.login({email:user().email,password:'wrong'}),e=>e.code===code && !e.message.includes('secret'));
 }
 const limited=createBetterAuthClient(async()=>json({error:{code:'RATE_LIMITED'}},429,{'Retry-After':'63'}));
 await assert.rejects(limited.login({email:user().email,password:'wrong'}),e=>e.code==='RATE_LIMITED' && e.retryAfter===63);
 const invalid=createBetterAuthClient(async()=>json({error:{code:'VALIDATION_ERROR',fields:{email:'provider text',password:'secret',role:'admin'}}},400));
 await assert.rejects(invalid.login({email:'bad',password:'wrong'}),e=>e.code==='VALIDATION_ERROR' && e.fieldErrors.email==='Enter a valid email address.' && !e.fieldErrors.role && !JSON.stringify(e).includes('secret'));
 assert.equal(await createBetterAuthClient(async()=>json({error:{code:'AUTHENTICATION_REQUIRED'}},401)).getSession(),null);
 await assert.rejects(createBetterAuthClient(async()=>json({error:{code:'INTERNAL_ERROR'}},503)).getSession(),e=>e.code==='UNAVAILABLE');
 await assert.rejects(createBetterAuthClient(async()=>{throw Error('offline');}).getSession(),e=>e.code==='UNAVAILABLE');
 await assert.rejects(createBetterAuthClient(async()=>{throw Error('offline');}).login({email:user().email,password:'exact'}),e=>e.code==='REQUEST_UNCERTAIN');
 await assert.rejects(createBetterAuthClient(async()=>new Response('truncated')).login({email:user().email,password:'exact'}),e=>e.code==='REQUEST_UNCERTAIN');
});

test('logout is idempotent and a lost response is reconciled once without resubmitting', async () => {
 const confirmed=[];
 const client=createBetterAuthClient(async(url,options)=>{confirmed.push([url,options]);return json({data:{loggedOut:true}});});
 await client.logout();await client.logout();
 assert.deepEqual(confirmed.map(c=>c[0]),['/api/auth/logout','/api/auth/logout']);
 assert.equal(confirmed[0][1].method,'POST');assert.deepEqual(JSON.parse(confirmed[0][1].body),{});
 const lost=[];
 const reconciled=createBetterAuthClient(async url=>{lost.push(url);if(url.endsWith('/logout'))throw Error('lost');return json({error:{code:'AUTHENTICATION_REQUIRED'}},401);});
 await reconciled.logout();assert.deepEqual(lost,['/api/auth/logout','/api/v1/me']);
 for (const response of [()=>profile(),()=>{throw Error('offline');}]) {
  const calls=[];
  const uncertain=createBetterAuthClient(async url=>{calls.push(url);if(url.endsWith('/logout'))throw Error('lost');return response();});
  await assert.rejects(uncertain.logout(),e=>e.code==='LOGOUT_UNCERTAIN');
  await assert.rejects(uncertain.getSession(),e=>e.code==='LOGOUT_UNCERTAIN');
  assert.deepEqual(calls,['/api/auth/logout','/api/v1/me']);
 }
});

test('server reads forward each cookie to the configured origin without identity caching or header-selected hosts', async () => {
 const { readServerAccount }=load('src/lib/auth/server-account.ts');
 const original=process.env.AUTH_BACKEND_URL;
 try {
  process.env.AUTH_BACKEND_URL='http://localhost:5000';
  const calls=[];
  const transport=async(url,options)=>{calls.push({url,options});return profile({...user(),id:options.headers.Cookie==='session=a'?'a':'b'});};
  assert.equal((await readServerAccount('session=a',transport)).userId,'a');
  assert.equal((await readServerAccount('session=b',transport)).userId,'b');
  assert.deepEqual(calls.map(c=>c.url),['http://localhost:5000/api/v1/me','http://localhost:5000/api/v1/me']);
  assert.deepEqual(calls.map(c=>c.options.headers.Cookie),['session=a','session=b']);
  assert.ok(calls.every(c=>c.options.cache==='no-store'));
  process.env.AUTH_BACKEND_URL='https://user:secret@evil.invalid/path';
  await assert.rejects(readServerAccount('session=a',transport));
  assert.equal(calls.length,2);
 } finally {if(original===undefined)delete process.env.AUTH_BACKEND_URL;else process.env.AUTH_BACKEND_URL=original;}
});

test('overlapping explicit sign-out actions send only one mutation and keep account reads unavailable while pending', async () => {
 let complete;const response=new Promise(resolve=>{complete=resolve;});
 const calls=[];const client=createBetterAuthClient(async url=>{calls.push(url);return response;});
 const first=client.logout();const second=client.logout();
 await assert.rejects(client.getSession(),e=>e.code==='LOGOUT_UNCERTAIN');
 complete(json({data:{loggedOut:true}}));await Promise.all([first,second]);
 assert.deepEqual(calls,['/api/auth/logout']);
});
