-- AlterTable
ALTER TABLE "Invoice" ADD COLUMN "receiptNumber" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Invoice_receiptNumber_key" ON "Invoice"("receiptNumber");

-- CreateIndex
CREATE INDEX "Invoice_receiptNumber_idx" ON "Invoice"("receiptNumber");
