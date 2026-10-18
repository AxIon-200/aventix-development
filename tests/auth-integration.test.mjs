import test from 'node:test';
import assert from 'node:assert/strict';
import { load } from './load-typescript.mjs';
const {createBetterAuthClient,accountFromSession}=load('src/lib/auth/better-auth.ts');
const session=(role='ATTENDEE',status='ACTIVE')=>({user:{id:'u1',name:'Review User',email:'review@example.invalid',role,status},session:{userId:'u1',expiresAt:new Date(Date.now()+60000).toISOString()}});
const json=(data,status=200)=>new Response(JSON.stringify(data),{status});
test('destinations and booking eligibility use the active server session',()=>{
 assert.equal(accountFromSession(session()).navigation[0].href,'/dashboard');
 assert.equal(accountFromSession(session('ORGANIZER')).canBook,false);
 assert.equal(accountFromSession(session('ADMINISTRATOR')).navigation[0].href,'/admin/dashboard');
 assert.throws(()=>accountFromSession(session('ATTENDEE','SUSPENDED')),e=>e.code==='ACCOUNT_DISABLED');
 assert.throws(()=>accountFromSession(session('ADMIN')),e=>e.code==='INVALID_RESPONSE');
 const expired=session();expired.session.expiresAt='2000-01-01T00:00:00Z';assert.equal(accountFromSession(expired),null);
 const wrong=session();wrong.session.userId='other';assert.throws(()=>accountFromSession(wrong));
});
test('login includes cookies and verifies the new session before authorizing a return',async()=>{
 const calls=[];const client=createBetterAuthClient(async(url,options)=>{calls.push({url,options});return json(url.endsWith('get-session')?session():{token:'not-stored'});});
 const result=await client.login({email:'review@example.invalid',password:'password123',rememberMe:false});
 assert.equal(result.allowBookingReturn,true);assert.equal(result.destination,'/dashboard');
 assert.deepEqual(calls.map(c=>c.url),['/api/auth/sign-in/email','/api/auth/get-session']);
 assert.equal(calls[0].options.credentials,'include');assert.equal(JSON.parse(calls[0].options.body).rememberMe,false);
});
test('a login response token without a verified session cannot authorize navigation',async()=>{
 const client=createBetterAuthClient(async url=>json(url.endsWith('get-session')?null:{token:'not-proof'}));
 await assert.rejects(client.login({email:'review@example.invalid',password:'password123'}),e=>e.code==='INVALID_RESPONSE');
});
test('signup excludes roles, confirmation and server-only fields and recognizes auto sign-in',async()=>{
 let payload;const client=createBetterAuthClient(async(url,options)=>{if(url.endsWith('get-session'))return json(session());payload=JSON.parse(options.body);return json({user:{id:'u1',email:'review@example.invalid'}});});
 const result=await client.registerAttendee({firstName:'Review',lastName:'User',email:'REVIEW@example.invalid',phoneNumber:'+639171234567',password:'password123',termsAccepted:true,role:'ADMINISTRATOR',confirmPassword:'password123'});
 assert.deepEqual(Object.keys(payload).sort(),['email','firstName','lastName','name','password','phoneNumber'].sort());
 assert.equal(payload.name,'Review User');assert.equal(result.destination,'/dashboard');
});
test('confirmed signup with unavailable session asks for login without repeating signup',async()=>{
 const client=createBetterAuthClient(async url=>url.endsWith('get-session')?json({},500):json({user:{id:'u1',email:'review@example.invalid'}}));
 assert.equal(await client.registerAttendee({firstName:'Review',lastName:'User',email:'review@example.invalid',phoneNumber:'+639171234567',password:'password123',termsAccepted:true}),undefined);
});
test('duplicate email, credentials and ambiguous mutation failures produce distinct errors',async()=>{
 const duplicate=createBetterAuthClient(async()=>json({code:'USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL'},422));
 await assert.rejects(duplicate.registerAttendee({firstName:'A',lastName:'B',email:'a@example.invalid',phoneNumber:'+639171234567',password:'password123',termsAccepted:true}),e=>e.code==='DUPLICATE_EMAIL');
 const invalid=createBetterAuthClient(async()=>json({code:'INVALID_EMAIL_OR_PASSWORD'},401));
 await assert.rejects(invalid.login({email:'a@example.invalid',password:'wrong'}),e=>e.code==='INVALID_CREDENTIALS');
 const offline=createBetterAuthClient(async()=>{throw Error('network');});
 await assert.rejects(offline.login({email:'a@example.invalid',password:'password123'}),e=>e.code==='REQUEST_UNCERTAIN');assert.equal(await offline.checkConnection(),false);
});
test('logout requires a new request to confirm the session is gone',async()=>{
 const active=createBetterAuthClient(async url=>json(url.endsWith('get-session')?session():{success:true}));
 await assert.rejects(active.logout(),e=>e.code==='INVALID_RESPONSE');
 const closed=createBetterAuthClient(async url=>json(url.endsWith('get-session')?null:{success:true}));await closed.logout();
});
test('recovery is unavailable until backend delivery and verification exist',()=>{
 const client=createBetterAuthClient();assert.equal(client.requestPasswordReset,undefined);assert.equal(client.resetPassword,undefined);assert.ok(client.passwordRules.validate('x'.repeat(129)));
});
test('a pre-existing cookie for another email cannot satisfy a successful login response',async()=>{
 const client=createBetterAuthClient(async url=>json(url.endsWith('get-session')?session():{token:'not-proof'}));
 await assert.rejects(client.login({email:'other@example.invalid',password:'password123'}),e=>e.code==='INVALID_RESPONSE');
});
test('signup cannot auto-navigate using another pre-existing account session',async()=>{
 const client=createBetterAuthClient(async url=>json(url.endsWith('get-session')?session():{user:{id:'new-user',email:'review@example.invalid'}}));
 assert.equal(await client.registerAttendee({firstName:'Review',lastName:'User',email:'review@example.invalid',phoneNumber:'+639171234567',password:'password123',termsAccepted:true}),undefined);
});
