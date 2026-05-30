-- Add support for custom fee types
-- The feeCategory field in FeeStructureItem is already a String, so it can store custom values
-- This migration adds a comment to document the supported fee categories

COMMENT ON COLUMN "FeeStructureItem"."feeCategory" IS 'Fee category: TUITION, TRANSPORT, LAB, EXAM, LIBRARY, SPORTS, BOOKS, PHONE, UNIFORM, MEALS, CUSTOM, or any custom value';

-- Update Invoice metadata to support fee type tracking
COMMENT ON COLUMN "Invoice"."metadata" IS 'JSON metadata including feeType, customFeeName, month info, and other data';
