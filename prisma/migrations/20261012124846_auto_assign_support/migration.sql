-- CreateEnum
CREATE TYPE "ServiceType" AS ENUM ('INTRA_CITY', 'INTER_CITY', 'BOTH');

-- CreateEnum
CREATE TYPE "RouteCategory" AS ENUM ('MICRO', 'INTRA_CITY', 'SHORT_HAUL', 'INTER_CITY', 'LONG_HAUL');

-- CreateEnum
CREATE TYPE "OfferStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED', 'EXPIRED', 'CANCELLED');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "NotificationType" ADD VALUE 'ORDER_OFFER';
ALTER TYPE "NotificationType" ADD VALUE 'ORDER_OFFER_EXPIRED';
ALTER TYPE "NotificationType" ADD VALUE 'ORDER_OFFER_CANCELLED';
ALTER TYPE "NotificationType" ADD VALUE 'ORDER_MANUAL_ASSIGN_NEEDED';

-- AlterTable
ALTER TABLE "couriers" ADD COLUMN     "acceptsReturnTrip" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "availableFrom" TIMESTAMP(3),
ADD COLUMN     "isOnLongTrip" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "maxTravelKm" DOUBLE PRECISION,
ADD COLUMN     "serviceRegionIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "serviceType" "ServiceType" NOT NULL DEFAULT 'INTRA_CITY';

-- AlterTable
ALTER TABLE "orders" ADD COLUMN     "autoAssignAttempts" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "autoUnassignAt" TIMESTAMP(3),
ADD COLUMN     "deliveryCityCode" TEXT,
ADD COLUMN     "estimatedHours" DOUBLE PRECISION,
ADD COLUMN     "lastOfferedAt" TIMESTAMP(3),
ADD COLUMN     "pickupCityCode" TEXT,
ADD COLUMN     "requiresReturn" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "routeCategory" "RouteCategory",
ADD COLUMN     "routeDistanceKm" DOUBLE PRECISION,
ADD COLUMN     "unassignReason" TEXT;

-- AlterTable
ALTER TABLE "payments" ALTER COLUMN "status" DROP DEFAULT;

-- AlterTable
ALTER TABLE "regions" ADD COLUMN     "centerLat" DOUBLE PRECISION,
ADD COLUMN     "centerLng" DOUBLE PRECISION,
ADD COLUMN     "isInterCityHub" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "order_offers" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "courierId" TEXT NOT NULL,
    "status" "OfferStatus" NOT NULL DEFAULT 'PENDING',
    "offeredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "respondedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "pickupKm" DOUBLE PRECISION,
    "routeKm" DOUBLE PRECISION,
    "attemptNo" INTEGER NOT NULL DEFAULT 1,
    "rejectionReason" TEXT,

    CONSTRAINT "order_offers_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "order_offers_courierId_status_idx" ON "order_offers"("courierId", "status");

-- CreateIndex
CREATE INDEX "order_offers_orderId_status_idx" ON "order_offers"("orderId", "status");

-- CreateIndex
CREATE INDEX "order_offers_status_expiresAt_idx" ON "order_offers"("status", "expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "order_offers_orderId_courierId_attemptNo_key" ON "order_offers"("orderId", "courierId", "attemptNo");

-- CreateIndex
CREATE INDEX "couriers_serviceType_idx" ON "couriers"("serviceType");

-- CreateIndex
CREATE INDEX "couriers_isOnline_lastSeenAt_idx" ON "couriers"("isOnline", "lastSeenAt");

-- CreateIndex
CREATE INDEX "orders_routeCategory_idx" ON "orders"("routeCategory");

-- CreateIndex
CREATE INDEX "orders_pickupCityCode_idx" ON "orders"("pickupCityCode");

-- CreateIndex
CREATE INDEX "orders_deliveryCityCode_idx" ON "orders"("deliveryCityCode");

-- CreateIndex
CREATE INDEX "orders_status_autoUnassignAt_idx" ON "orders"("status", "autoUnassignAt");

-- AddForeignKey
ALTER TABLE "order_offers" ADD CONSTRAINT "order_offers_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_offers" ADD CONSTRAINT "order_offers_courierId_fkey" FOREIGN KEY ("courierId") REFERENCES "couriers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
