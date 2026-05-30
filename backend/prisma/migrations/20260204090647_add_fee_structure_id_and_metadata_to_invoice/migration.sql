-- AlterTable
ALTER TABLE "school_comms"."Invoice" ADD COLUMN     "feeStructureId" UUID,
ADD COLUMN     "metadata" JSONB;

-- CreateIndex
CREATE INDEX "Invoice_feeStructureId_idx" ON "school_comms"."Invoice"("feeStructureId");
