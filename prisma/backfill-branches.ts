import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function nearest(lat: number | null, lng: number | null) {
  if (lat == null || lng == null || (lat === 0 && lng === 0)) return null;
  const rows = await prisma.$queryRaw<Array<{ id: string; d: number }>>`
    SELECT b.id,
      (6371 * acos(LEAST(1, GREATEST(-1,
        cos(radians(${lat})) * cos(radians(b.lat)) *
        cos(radians(b.lng) - radians(${lng})) +
        sin(radians(${lat})) * sin(radians(b.lat))
      )))) AS d
    FROM branches b
    WHERE b.lat IS NOT NULL AND b.lng IS NOT NULL AND b."isActive" = true
    ORDER BY d ASC LIMIT 1
  `;
  return rows[0]?.id ?? null;
}

(async () => {
  const orders = await prisma.order.findMany({
    where: { OR: [{ originBranchId: null }, { destBranchId: null }] },
    select: {
      id: true, trackingNumber: true,
      senderLat: true, senderLng: true,
      receiverLat: true, receiverLng: true,
      originBranchId: true, destBranchId: true,
    },
  });

  for (const o of orders) {
    const origin = o.originBranchId ?? await nearest(o.senderLat, o.senderLng);
    const dest = o.destBranchId ?? await nearest(o.receiverLat, o.receiverLng);
    if (origin || dest) {
      await prisma.order.update({
        where: { id: o.id },
        data: { ...(origin && { originBranchId: origin }),
                ...(dest && { destBranchId: dest }) },
      });
      console.log(`✅ ${o.trackingNumber}`);
    }
  }
  await prisma.$disconnect();
})();