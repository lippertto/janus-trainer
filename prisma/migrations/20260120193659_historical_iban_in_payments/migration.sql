-- CreateTable
CREATE TABLE "PaymentUserIban" (
    "id" SERIAL NOT NULL,
    "paymentId" INTEGER NOT NULL,
    "userId" TEXT NOT NULL,
    "iban" TEXT NOT NULL,

    CONSTRAINT "PaymentUserIban_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PaymentUserIban_paymentId_idx" ON "PaymentUserIban"("paymentId");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentUserIban_paymentId_userId_key" ON "PaymentUserIban"("paymentId", "userId");

-- AddForeignKey
ALTER TABLE "PaymentUserIban" ADD CONSTRAINT "PaymentUserIban_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentUserIban" ADD CONSTRAINT "PaymentUserIban_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Backfill PaymentUserIban for existing payments using current IBAN values
-- For each existing payment, create PaymentUserIban records for all unique trainers
-- in that payment, capturing their current IBAN value
INSERT INTO "PaymentUserIban" ("paymentId", "userId", "iban")
SELECT DISTINCT
    t."paymentId",
    t."userId",
    u."iban"
FROM "Training" t
INNER JOIN "User" u ON t."userId" = u."id"
WHERE t."paymentId" IS NOT NULL
ON CONFLICT ("paymentId", "userId") DO NOTHING;
