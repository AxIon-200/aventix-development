import { randomUUID } from 'node:crypto';
import { paymongoCheckout } from '../dist/lib/paymongo-checkout.js';
const originalFetch = globalThis.fetch;
const created = [];
globalThis.fetch = async (...args) => {
  const response = await originalFetch(...args);
  if (args[0] === 'https://api.paymongo.com/v2/checkout_sessions') {
    const result = await response.clone().json();
    const a = result.data?.attributes;
    if (result.data?.id) created.push(result.data.id);
    console.log(JSON.stringify({httpStatus:response.status,id:result.data?.id,attributeKeys:Object.keys(a??{}),livemode:a?.livemode,reference:a?.reference_number,
      checkoutOrigin:a?.checkout_url ? new URL(a.checkout_url).origin : undefined,errors:result.errors?.map(e=>e.code)}));
  }
  return response;
};
try {
for (const method of ['gcash','paymaya','card']) {
  const session = await paymongoCheckout.create({ reference:'AVX-SMOKE-'+randomUUID(), bookingId:randomUUID(), paymentId:randomUUID(),
    method, items:[{name:'Aventix integration test - no purchase',amount:10000,quantity:1}] });
  const expired = await paymongoCheckout.expire(session.id);
  console.log(JSON.stringify({method,created:true,mode:session.attributes.livemode===false?'test':'unexpected',expired}));
  if (!expired) throw new Error('Test checkout must be expired before continuing');
}
} finally { for (const id of created) console.log(JSON.stringify({cleanupId:id,expired:await paymongoCheckout.expire(id)})); }
