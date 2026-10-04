import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const p = await prisma.paymentProvider.findUnique({ where: { code: 'CHAPA' } });

  console.log('DB read:', {
    found: !!p,
    isEnabled: p?.isEnabled,
    keyLen: p?.apiSecret?.length || 0,
    keyPrefix: p?.apiSecret?.slice(0, 14),
  });

  const key = p?.apiSecret || '';

  const res = await fetch('https://api.chapa.co/v1/transaction/initialize', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      amount: '10',
      currency: 'ETB',
      email: 'yades.dev@gmail.com',
      first_name: 'Yades',
      last_name: 'Dev',
      tx_ref: 'direct-' + Date.now(),
      callback_url: 'https://webhook.site/test',
      return_url: 'https://google.com',
    }),
  });

  const data = await res.json();
  console.log('Chapa HTTP:', res.status);
  console.log('Response:', JSON.stringify(data, null, 2));

  if (data?.data?.checkout_url) {
    console.log('\n✅✅✅ CHAPA WORKS! Checkout:', data.data.checkout_url);
  }
}

main().finally(() => prisma.$disconnect());
