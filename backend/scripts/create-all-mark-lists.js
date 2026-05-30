/**
 * Create mark lists for ALL subjects x ALL classes x ALL terms
 * Components: Mid=30%, Test=10%, Conduct=10%, Exercise=10%, Final=40%
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const pool = require('../config/db');

const MARK_COMPONENTS = [
  { name: 'Mid',      percentage: 30 },
  { name: 'Test',     percentage: 10 },
  { name: 'Conduct',  percentage: 10 },
  { name: 'Exercise', percentage: 10 },
  { name: 'Final',    percentage: 40 },
];

async function createAll() {
  const client = await pool.connect();
  try {
    // Get all subjects
    const subjectsRes = await client.query('SELECT subject_name FROM subjects_of_school_schema.subjects ORDER BY subject_name');
    const subjects = subjectsRes.rows.map(r => r.subject_name);

    // Get all classes
    const classesRes = await client.query(`SELECT table_name FROM information_schema.tables WHERE table_schema = 'classes_schema' ORDER BY table_name`);
    const classes = classesRes.rows.map(r => r.table_name);

    // Get term count
    const configRes = await client.query('SELECT term_count FROM subjects_of_school_schema.school_config WHERE id = 1');
    const termCount = configRes.rows[0]?.term_count || 2;

    console.log(`Subjects: ${subjects.length}, Classes: ${classes.length}, Terms: ${termCount}`);
    console.log(`Total mark lists to create: ${subjects.length * classes.length * termCount}\n`);

    let created = 0;
    let failed = 0;

    for (const subjectName of subjects) {
      const schemaName = `subject_${subjectName.toLowerCase().replace(/[\s\-\.]+/g, '_')}_schema`;
      await client.query(`CREATE SCHEMA IF NOT EXISTS ${schemaName}`);

      // Ensure form_config table exists
      await client.query(`
        CREATE TABLE IF NOT EXISTS ${schemaName}.form_config (
          id SERIAL PRIMARY KEY,
          class_name VARCHAR(50) NOT NULL,
          term_number INTEGER NOT NULL,
          mark_components JSONB NOT NULL,
          pass_threshold DECIMAL(5,2) DEFAULT 50.00,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT unique_class_term_${schemaName.replace(/[^a-z0-9]/g, '_')} UNIQUE (class_name, term_number)
        )
      `);

      for (const actualClassName of classes) {
        const className = actualClassName.toLowerCase();

        // Get students
        const colCheck = await client.query(
          `SELECT column_name FROM information_schema.columns WHERE table_schema='classes_schema' AND table_name=$1 AND column_name='is_active'`,
          [actualClassName]
        );
        const whereClause = colCheck.rowCount > 0 ? 'WHERE is_active = TRUE OR is_active IS NULL' : '';
        const studentsRes = await client.query(`SELECT student_name, age, gender FROM classes_schema."${actualClassName}" ${whereClause}`);
        const students = studentsRes.rows;

        for (let term = 1; term <= termCount; term++) {
          try {
            const tableName = `${className}_term_${term}`;

            // Build columns
            const cols = [
              'id SERIAL PRIMARY KEY',
              'student_name VARCHAR(100) NOT NULL',
              'age INTEGER',
              'gender VARCHAR(20)',
              ...MARK_COMPONENTS.map(c => `${c.name.toLowerCase()} DECIMAL(5,2) DEFAULT 0`),
              'total DECIMAL(5,2) DEFAULT 0',
              "pass_status VARCHAR(10) DEFAULT 'Fail'",
              'created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP',
              'updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP'
            ];

            await client.query(`DROP TABLE IF EXISTS ${schemaName}.${tableName}`);
            await client.query(`CREATE TABLE ${schemaName}.${tableName} (${cols.join(', ')})`);

            // Insert students
            for (const s of students) {
              await client.query(
                `INSERT INTO ${schemaName}.${tableName} (student_name, age, gender) VALUES ($1, $2, $3)`,
                [s.student_name, s.age, s.gender]
              );
            }

            // Save config
            await client.query(`
              INSERT INTO ${schemaName}.form_config (class_name, term_number, mark_components, pass_threshold)
              VALUES ($1, $2, $3, 50.00)
              ON CONFLICT (class_name, term_number) DO UPDATE SET
                mark_components = EXCLUDED.mark_components,
                created_at = CURRENT_TIMESTAMP
            `, [className, term, JSON.stringify(MARK_COMPONENTS)]);

            created++;
            process.stdout.write(`\r✅ Created: ${created} | ❌ Failed: ${failed}`);
          } catch (err) {
            failed++;
            console.error(`\n❌ ${subjectName}/${actualClassName}/term${term}: ${err.message}`);
          }
        }
      }
    }

    console.log(`\n\n✅ Done! Created: ${created}, Failed: ${failed}`);
  } catch (err) {
    console.error('❌ Fatal error:', err.message);
  } finally {
    client.release();
    process.exit(0);
  }
}

createAll();
