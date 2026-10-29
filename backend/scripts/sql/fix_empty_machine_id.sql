-- Normalize legacy blank machine_id values to NULL (unique constraint allows many NULLs)
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN
    SELECT table_name, data_type
      FROM information_schema.columns
     WHERE table_schema = 'staff_teachers' AND column_name = 'machine_id'
  LOOP
    IF r.data_type IN ('character varying', 'text', 'character') THEN
      EXECUTE format('UPDATE staff_teachers.%I SET machine_id = NULL WHERE machine_id IS NOT NULL AND TRIM(machine_id) = %L', r.table_name, '');
    END IF;
  END LOOP;
END $$;
