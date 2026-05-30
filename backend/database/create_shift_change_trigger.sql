-- Automatic trigger to handle shift assignment changes
-- When a staff member's shift changes to "both", update their existing attendance records

-- Function to update attendance records when shift changes to "both"
CREATE OR REPLACE FUNCTION handle_shift_change_to_both()
RETURNS TRIGGER AS $$
BEGIN
    -- Check if shift_assignment changed to 'both'
    IF NEW.shift_assignment = 'both' AND (OLD.shift_assignment IS NULL OR OLD.shift_assignment != 'both') THEN
        -- Update all existing attendance records with NULL shift_type to 'shift1'
        UPDATE hr_ethiopian_attendance
        SET shift_type = 'shift1'
        WHERE staff_id = NEW.machine_id::VARCHAR
          AND shift_type IS NULL;
        
        RAISE NOTICE 'Updated attendance records for staff % (machine_id: %) - set NULL shift_type to shift1', NEW.full_name, NEW.machine_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for all three staff tables

-- Trigger for staff_teachers
DROP TRIGGER IF EXISTS shift_change_trigger_teachers ON "staff_teachers";
CREATE TRIGGER shift_change_trigger_teachers
    AFTER UPDATE OF shift_assignment ON "staff_teachers"
    FOR EACH ROW
    WHEN (NEW.shift_assignment = 'both')
    EXECUTE FUNCTION handle_shift_change_to_both();

-- Trigger for staff_administrative_staff
DROP TRIGGER IF EXISTS shift_change_trigger_admin ON "staff_administrative_staff";
CREATE TRIGGER shift_change_trigger_admin
    AFTER UPDATE OF shift_assignment ON "staff_administrative_staff"
    FOR EACH ROW
    WHEN (NEW.shift_assignment = 'both')
    EXECUTE FUNCTION handle_shift_change_to_both();

-- Trigger for staff_supportive_staff
DROP TRIGGER IF EXISTS shift_change_trigger_support ON "staff_supportive_staff";
CREATE TRIGGER shift_change_trigger_support
    AFTER UPDATE OF shift_assignment ON "staff_supportive_staff"
    FOR EACH ROW
    WHEN (NEW.shift_assignment = 'both')
    EXECUTE FUNCTION handle_shift_change_to_both();

-- Now update khalid to "both" - the trigger will automatically fix attendance records
UPDATE "staff_teachers" SET shift_assignment = 'both' WHERE machine_id = '100';
UPDATE "staff_administrative_staff" SET shift_assignment = 'both' WHERE machine_id = '100';
UPDATE "staff_supportive_staff" SET shift_assignment = 'both' WHERE machine_id = '100';

-- Verify the triggers were created
SELECT 
    trigger_name,
    event_object_table,
    action_statement
FROM information_schema.triggers
WHERE trigger_name LIKE 'shift_change_trigger%'
ORDER BY event_object_table;

-- Verify khalid's shift assignment
SELECT 'staff_teachers' as table_name, machine_id, full_name, shift_assignment 
FROM "staff_teachers" WHERE machine_id = '100'
UNION ALL
SELECT 'staff_administrative_staff', machine_id, full_name, shift_assignment 
FROM "staff_administrative_staff" WHERE machine_id = '100'
UNION ALL
SELECT 'staff_supportive_staff', machine_id, full_name, shift_assignment 
FROM "staff_supportive_staff" WHERE machine_id = '100';

-- Verify khalid's attendance records now have shift_type
SELECT 
    staff_id,
    staff_name,
    ethiopian_day,
    ethiopian_month,
    shift_type,
    check_in,
    check_out
FROM hr_ethiopian_attendance
WHERE staff_id = '100'
  AND ethiopian_year = 2018
  AND ethiopian_month = 6
ORDER BY shift_type, ethiopian_day;
