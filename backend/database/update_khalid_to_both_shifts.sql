-- Find and update khalid (machine_id 100) to have "both" shifts

-- STEP 1: Find which table khalid is in
SELECT 'staff_teachers' as table_name, machine_id, full_name, shift_assignment 
FROM "staff_teachers" 
WHERE machine_id = '100' OR LOWER(full_name) LIKE '%khalid%';

SELECT 'staff_administrative_staff' as table_name, machine_id, full_name, shift_assignment 
FROM "staff_administrative_staff" 
WHERE machine_id = '100' OR LOWER(full_name) LIKE '%khalid%';

SELECT 'staff_supportive_staff' as table_name, machine_id, full_name, shift_assignment 
FROM "staff_supportive_staff" 
WHERE machine_id = '100' OR LOWER(full_name) LIKE '%khalid%';

-- STEP 2: Update khalid to have "both" shifts (run the correct one based on STEP 1 results)

-- If khalid is in staff_teachers:
UPDATE "staff_teachers" 
SET shift_assignment = 'both' 
WHERE machine_id = '100';

-- If khalid is in staff_administrative_staff:
UPDATE "staff_administrative_staff" 
SET shift_assignment = 'both' 
WHERE machine_id = '100';

-- If khalid is in staff_supportive_staff:
UPDATE "staff_supportive_staff" 
SET shift_assignment = 'both' 
WHERE machine_id = '100';

-- STEP 3: Verify the update
SELECT 'staff_teachers' as table_name, machine_id, full_name, shift_assignment 
FROM "staff_teachers" 
WHERE machine_id = '100'
UNION ALL
SELECT 'staff_administrative_staff' as table_name, machine_id, full_name, shift_assignment 
FROM "staff_administrative_staff" 
WHERE machine_id = '100'
UNION ALL
SELECT 'staff_supportive_staff' as table_name, machine_id, full_name, shift_assignment 
FROM "staff_supportive_staff" 
WHERE machine_id = '100';

-- STEP 4: Also check if the column exists and has the right type
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name IN ('staff_teachers', 'staff_administrative_staff', 'staff_supportive_staff')
  AND column_name = 'shift_assignment';
