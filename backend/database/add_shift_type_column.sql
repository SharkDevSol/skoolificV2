-- Add shift_type column to hr_ethiopian_attendance table
-- This allows tracking which shift the attendance record is for (shift1, shift2, or null for single-shift staff)

-- Add shift_type column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'hr_ethiopian_attendance' 
        AND column_name = 'shift_type'
    ) THEN
        ALTER TABLE hr_ethiopian_attendance 
        ADD COLUMN shift_type VARCHAR(20) CHECK (shift_type IN ('shift1', 'shift2'));
        
        RAISE NOTICE 'Added shift_type column to hr_ethiopian_attendance';
    ELSE
        RAISE NOTICE 'Column shift_type already exists in hr_ethiopian_attendance';
    END IF;
END $$;

-- Drop the old unique constraint if it exists
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'hr_ethiopian_attendance_staff_id_ethiopian_year_ethiopian_mo_key'
    ) THEN
        ALTER TABLE hr_ethiopian_attendance 
        DROP CONSTRAINT hr_ethiopian_attendance_staff_id_ethiopian_year_ethiopian_mo_key;
        
        RAISE NOTICE 'Dropped old unique constraint';
    END IF;
END $$;

-- Add new unique constraint that includes shift_type
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'hr_ethiopian_attendance_unique_with_shift'
    ) THEN
        ALTER TABLE hr_ethiopian_attendance 
        ADD CONSTRAINT hr_ethiopian_attendance_unique_with_shift 
        UNIQUE (staff_id, ethiopian_year, ethiopian_month, ethiopian_day, shift_type);
        
        RAISE NOTICE 'Added new unique constraint with shift_type';
    ELSE
        RAISE NOTICE 'Unique constraint with shift_type already exists';
    END IF;
END $$;

-- Add comment
COMMENT ON COLUMN hr_ethiopian_attendance.shift_type IS 'Shift type for dual-shift staff: shift1, shift2, or NULL for single-shift staff';
