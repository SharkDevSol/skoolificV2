-- Fix old attendance records that don't have shift_type set
-- This sets all NULL shift_type values to 'shift1' (default shift)

-- First, check how many records need fixing
SELECT 
    COUNT(*) as total_records_with_null_shift,
    COUNT(DISTINCT staff_id) as affected_staff
FROM hr_ethiopian_attendance 
WHERE shift_type IS NULL;

-- Show which staff are affected
SELECT 
    staff_id,
    staff_name,
    COUNT(*) as records_without_shift
FROM hr_ethiopian_attendance 
WHERE shift_type IS NULL
GROUP BY staff_id, staff_name
ORDER BY staff_name;

-- Update all NULL shift_type to 'shift1'
UPDATE hr_ethiopian_attendance 
SET shift_type = 'shift1' 
WHERE shift_type IS NULL;

-- Verify the update
SELECT 
    shift_type,
    COUNT(*) as count
FROM hr_ethiopian_attendance 
GROUP BY shift_type
ORDER BY shift_type;

-- Show today's records for khalid (machine_id 100) to verify
SELECT 
    staff_id,
    staff_name,
    ethiopian_day,
    ethiopian_month,
    ethiopian_year,
    shift_type,
    check_in,
    check_out,
    status
FROM hr_ethiopian_attendance 
WHERE staff_id = '100'
    AND ethiopian_year = 2018
    AND ethiopian_month = 6
ORDER BY shift_type;
