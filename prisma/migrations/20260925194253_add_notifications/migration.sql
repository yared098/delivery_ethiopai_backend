-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('ORDER_CREATED', 'ORDER_STATUS_CHANGED', 'ORDER_ASSIGNED', 'ORDER_PICKED_UP', 'ORDER_DELIVERED', 'ORDER_FAILED', 'ORDER_CANCELLED', 'COURIER_APPROVED', 'COURIER_REJECTED', 'PAYOUT_PAID', 'RECEIVER_LINK', 'WELCOME', 'SYSTEM', 'MANUAL');

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "accountType" "AccountType" NOT NULL,
    "customerId" TEXT,
    "courierId" TEXT,
    "staffId" TEXT,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "imageUrl" TEXT,
    "data" JSONB,
    "orderId" TEXT,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "readAt" TIMESTAMP(3),
    "pushSent" BOOLEAN NOT NULL DEFAULT false,
    "pushSentAt" TIMESTAMP(3),
    "pushError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "notifications_customerId_isRead_idx" ON "notifications"("customerId", "isRead");

-- CreateIndex
CREATE INDEX "notifications_courierId_isRead_idx" ON "notifications"("courierId", "isRead");

-- CreateIndex
CREATE INDEX "notifications_staffId_isRead_idx" ON "notifications"("staffId", "isRead");

-- CreateIndex
CREATE INDEX "notifications_accountType_createdAt_idx" ON "notifications"("accountType", "createdAt");

-- CreateIndex
CREATE INDEX "notifications_orderId_idx" ON "notifications"("orderId");

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_courierId_fkey" FOREIGN KEY ("courierId") REFERENCES "couriers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "staff"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;
