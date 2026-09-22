-- AlterTable
ALTER TABLE "orders" ADD COLUMN     "qrCodeImageUrl" TEXT,
ADD COLUMN     "qrCodePayload" TEXT,
ADD COLUMN     "qrCodeSignature" TEXT,
ADD COLUMN     "trackingTokenExpiresAt" TIMESTAMP(3),
ADD COLUMN     "trackingTokenRevokedAt" TIMESTAMP(3),
ADD COLUMN     "trackingTokenSetAt" TIMESTAMP(3);
