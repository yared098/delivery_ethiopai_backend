import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const p = await prisma.paymentProvider.findUnique({
    where: { code: 'CHAPA' },
  });

  console.log('─── Prisma view of CHAPA ───');
  console.log('found:     ', !!p);
  console.log('id:        ', p?.id);
  console.log('code:      ', p?.code);
  console.log('isEnabled: ', p?.isEnabled);
  console.log('isTestMode:', p?.isTestMode);
  console.log('keyLen:    ', p?.apiSecret?.length || 0);
  console.log('keyPrefix: ', p?.apiSecret?.slice(0, 14) || '(null)');
}

main()
  .catch((e) => console.error(e))
  .finally(() => prisma.$disconnect());
