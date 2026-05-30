-- Check current shift assignments for staff with machine_id 100 (khalid)

-- Check in Teachers table
SELECT 'Teachers' as table_name, machine_id, full_name, shift_assignment 
FROM "staff_teachers" 
WHERE machine_id = '100';

-- Check in Administrative Staff table
SELECT 'Administrative Staff' as table_name, machine_id, full_name, shift_assignment 
FROM "staff_administrative_staff" 
WHERE machine_id = '100';

-- Check in Supportive Staff table
SELECT 'Supportive Staff' as table_name, machine_id, full_name, shift_assignment 
FROM "staff_supportive_staff" 
WHERE machine_id = '100';

-- To UPDATE khalid's shift to "both", run ONE of these (depending on which table they're in):

-- If in Teachers:
-- UPDATE "staff_teachers" SET shift_assignment = 'both' WHERE machine_id = '100';

-- If in Administrative Staff:
-- UPDATE "staff_administrative_staff" SET shift_assignment = 'both' WHERE machine_id = '100';

-- If in Supportive Staff:
-- UPDATE "staff_supportive_staff" SET shift_assignment = 'both' WHERE machine_id = '100';
