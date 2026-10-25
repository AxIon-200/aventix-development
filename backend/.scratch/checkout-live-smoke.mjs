import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { prisma } from '../dist/lib/prisma.js';
import { hashExactPassword } from '../dist/lib/exact-password.js';
import { paymongoCheckout } from '../dist/lib/paymongo-checkout.js';
import { load } from '../../tests/load-typescript.mjs';
const { requireBooking } = load('src/lib/booking/validate.ts');
const database = new URL(process.env.DATABASE_URL);
assert.equal(process.env.NODE_ENV,'test');
assert.notEqual(process.env.DATABASE_URL,process.env.DEV_DATABASE_URL);
assert(process.env.TEST_DATABASE_PROJECT_REF && (database.hostname+' '+decodeURIComponent(database.username)).includes(process.env.TEST_DATABASE_PROJECT_REF));
assert.equal((await prisma.$queryRaw`SELECT environment FROM public.test_environment_marker WHERE id=1`)[0]?.environment,'aventix-test');
const id=randomUUID(), organizerOwner=randomUUID(), tag='checkout-live-'+id, password='fixture checkout '+randomUUID();
const origin=process.env.FRONTEND_URL;
assert.equal(new URL(origin).hostname,'localhost');
let eventId, organizerId, venueId, bookingId, sessionId;
const headers={ Origin:origin,'Content-Type':'application/json' };
async function call(path,body) {
  const response=await fetch(origin+path,{method:body===undefined?'GET':'POST',headers,body:body===undefined?undefined:JSON.stringify(body),signal:AbortSignal.timeout(25000)});
  const result=await response.json();
  assert(response.ok,JSON.stringify({path,status:response.status,code:result.error?.code}));
  return result;
}
try {
  await prisma.user.create({data:{id,firstName:'Checkout',lastName:'Fixture',name:'Checkout Fixture',email:tag+'@example.com',role:'ATTENDEE',emailVerified:true,
    // Synthetic consent applies only to this disposable verified-test identity.
    termsAcceptedAt:new Date(),termsVersion:'checkout-disposable-test-fixture',
    accounts:{create:{accountId:id,providerId:'credential',password:await hashExactPassword(password)}}}});
  await prisma.user.create({data:{id:organizerOwner,firstName:'Organizer',lastName:'Fixture',name:'Organizer Fixture',email:tag+'-organizer@example.com',role:'ORGANIZER',emailVerified:true}});
  organizerId=(await prisma.organizerProfile.create({data:{userId:organizerOwner,organizationName:tag,approvalStatus:'APPROVED'}})).id;
  venueId=(await prisma.venue.create({data:{name:'Checkout test venue',address:'Disposable test fixture'}})).id;
  const event=await prisma.event.create({data:{organizerId,venueId,name:'Checkout integration fixture',slug:tag,status:'PUBLISHED',eventDate:new Date(Date.now()+86400_000),
    ticketCategories:{create:{name:'Standing',price:'100.25',admissionMode:'GENERAL_ADMISSION',maxCapacity:2}}},include:{ticketCategories:true}});
  eventId=event.id;
  const login=await fetch(origin+'/api/auth/login',{method:'POST',headers,body:JSON.stringify({email:tag+'@example.com',password}),signal:AbortSignal.timeout(25000)});
  if (login.status !== 200) {
    const failed = await login.json();
    throw new Error(JSON.stringify({step:'Live attendee proxy login',status:login.status,error:failed.error}));
  }
  headers.Cookie=login.headers.getSetCookie().map(c=>c.split(';')[0]).join('; ');
  assert(headers.Cookie);
  const draft={version:1,eventId,operationKey:randomUUID(),items:[{ticketCategoryId:event.ticketCategories[0].id,quantity:1,seatIds:[]}]};
  const created=(await call('/api/v1/checkout/bookings',draft)).data;
  bookingId=created.id;
  requireBooking(created,bookingId);
  assert.equal(created.total,100.25);
  assert.equal((await call('/api/v1/checkout/bookings',draft)).data.id,bookingId);
  const started=(await call(`/api/v1/checkout/bookings/${bookingId}/payment`,{methodId:'gcash',operationKey:randomUUID()})).data;
  assert.equal(new URL(started.redirectUrl).origin,'https://checkout.paymongo.com');
  sessionId=(await prisma.payment.findFirstOrThrow({where:{bookingId}})).providerReference;
  const pending=requireBooking((await call(`/api/v1/checkout/bookings/${bookingId}`)).data,bookingId);
  assert.equal(pending.status,'PENDING_PAYMENT');assert.equal(pending.issuedTickets.length,0);
  const dashboard=await call('/api/v1/attendee/dashboard');
  assert(dashboard.data.bookings.some(b=>b.id===bookingId && b.paidCentavos===0));
  const cancelled=requireBooking((await call(`/api/v1/checkout/bookings/${bookingId}/cancel`,{operationKey:randomUUID()})).data,bookingId);
  assert.equal(cancelled.status,'CANCELLED');
  console.log('PASS: real localhost:3001 attendee login, booking creation/retry, frontend contract validation, PayMongo test checkout, dashboard persistence, and verified provider expiry/cancellation.');
} finally {
  if(sessionId) assert(await paymongoCheckout.expire(sessionId),'Unpaid smoke session must be expired');
  if(bookingId) {
    await prisma.ticket.deleteMany({where:{bookingItem:{bookingId}}});
    await prisma.bookingSeat.deleteMany({where:{bookingItem:{bookingId}}});
    await prisma.payment.deleteMany({where:{bookingId}});
    await prisma.bookingItem.deleteMany({where:{bookingId}});
    await prisma.activityLog.deleteMany({where:{entityId:bookingId}});
    await prisma.booking.deleteMany({where:{id:bookingId}});
  }
  if(eventId) {await prisma.ticketCategory.deleteMany({where:{eventId}});await prisma.event.deleteMany({where:{id:eventId}});}
  if(venueId) await prisma.venue.deleteMany({where:{id:venueId}});
  if(organizerId) await prisma.organizerProfile.deleteMany({where:{id:organizerId}});
  await prisma.activityLog.deleteMany({where:{userId:{in:[id,organizerOwner]}}});
  await prisma.user.deleteMany({where:{id:{in:[id,organizerOwner]}}});
  await prisma.$disconnect();
}
