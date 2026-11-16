-- AlterTable
ALTER TABLE "Conversation" ADD COLUMN     "whatsappNumberId" TEXT;

-- CreateTable
CREATE TABLE "WhatsAppNumber" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "ownerId" TEXT,
    "waPhoneNumberId" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WhatsAppNumber_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "WhatsAppNumber_waPhoneNumberId_key" ON "WhatsAppNumber"("waPhoneNumberId");

-- CreateIndex
CREATE UNIQUE INDEX "WhatsAppNumber_organizationId_phone_key" ON "WhatsAppNumber"("organizationId", "phone");

-- CreateIndex
CREATE INDEX "Conversation_whatsappNumberId_idx" ON "Conversation"("whatsappNumberId");

-- AddForeignKey
ALTER TABLE "WhatsAppNumber" ADD CONSTRAINT "WhatsAppNumber_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WhatsAppNumber" ADD CONSTRAINT "WhatsAppNumber_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_whatsappNumberId_fkey" FOREIGN KEY ("whatsappNumberId") REFERENCES "WhatsAppNumber"("id") ON DELETE SET NULL ON UPDATE CASCADE;
