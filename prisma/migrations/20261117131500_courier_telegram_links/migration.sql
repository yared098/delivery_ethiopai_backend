ALTER TABLE "couriers"
ADD COLUMN "telegramId" TEXT,
ADD COLUMN "telegramOtpEnabled" BOOLEAN NOT NULL DEFAULT false;

CREATE UNIQUE INDEX "couriers_telegramId_key" ON "couriers"("telegramId");
