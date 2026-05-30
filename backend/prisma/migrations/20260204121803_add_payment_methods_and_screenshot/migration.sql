-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "school_comms"."PaymentMethod" ADD VALUE 'CBE';
ALTER TYPE "school_comms"."PaymentMethod" ADD VALUE 'ABAY';
ALTER TYPE "school_comms"."PaymentMethod" ADD VALUE 'ABYSSINIA';
ALTER TYPE "school_comms"."PaymentMethod" ADD VALUE 'EBIRR';

-- AlterTable
ALTER TABLE "school_comms"."Payment" ADD COLUMN     "screenshot" TEXT;
