const { Pool } = require('pg');

async function syncConfigsForDb(dbConfig, dbName) {
  const pool = new Pool(dbConfig);
  console.log(`\n=== Processing ${dbName} ===`);
  try {
    const client = await pool.connect();
    try {
      // 1. Get all subject schemas
      const schemasRes = await client.query(`
        SELECT schema_name 
        FROM information_schema.schemata 
        WHERE schema_name LIKE 'subject_%_schema'
        ORDER BY schema_name
      `);
      const schemas = schemasRes.rows.map(r => r.schema_name);

      // 2. Get all class names in classes_schema
      const classesRes = await client.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'classes_schema'
        ORDER BY table_name
      `);
      const classes = classesRes.rows.map(r => r.table_name.toLowerCase());
      console.log(`Found ${schemas.length} subject schemas and ${classes.length} classes in ${dbName}`);

      for (const schema of schemas) {
        // Check if form_config table exists in this schema
        const checkTable = await client.query(`
          SELECT 1 FROM information_schema.tables 
          WHERE table_schema = $1 AND table_name = 'form_config'
        `, [schema]);

        if (checkTable.rows.length === 0) continue;

        // Get existing configs in this schema
        const existingRes = await client.query(`
          SELECT DISTINCT class_name, term_number, mark_components, pass_threshold 
          FROM ${schema}.form_config
        `);

        if (existingRes.rows.length === 0) continue;

        // Build a map of existing configs by lowercase class_name and term
        const configMap = new Map();
        for (const row of existingRes.rows) {
          const key = `${row.class_name.toLowerCase()}_term_${row.term_number}`;
          configMap.set(key, row);
        }

        // For each class in classes_schema, check if it has configs for each term
        for (const cls of classes) {
          // Determine base grade: e.g. "g4a" -> "g4", "g10b" -> "g10", "kg2a" -> "kg2"
          const match = cls.match(/^([a-z]*?\d+)[a-z]*$/i);
          const baseGrade = match ? match[1].toLowerCase() : cls;

          for (let term = 1; term <= 4; term++) {
            const classKey = `${cls}_term_${term}`;
            if (configMap.has(classKey)) continue; // Already configured

            // Try to find a template config:
            // 1. From baseGrade (e.g. g4 for g4a)
            let template = configMap.get(`${baseGrade}_term_${term}`);

            // 2. From any sibling of the same grade in the same term
            if (!template) {
              for (const [k, row] of configMap.entries()) {
                if (k.startsWith(baseGrade) && row.term_number === term) {
                  template = row;
                  break;
                }
              }
            }

            // 3. From baseGrade in any term
            if (!template) {
              for (const [k, row] of configMap.entries()) {
                if (k.startsWith(baseGrade)) {
                  template = row;
                  break;
                }
              }
            }

            // 4. From any config in the schema as a last resort
            if (!template && existingRes.rows.length > 0) {
              template = existingRes.rows[0];
            }

            if (template && template.mark_components) {
              await client.query(`
                INSERT INTO ${schema}.form_config (class_name, term_number, mark_components, pass_threshold)
                VALUES ($1, $2, $3, $4)
                ON CONFLICT (class_name, term_number) DO NOTHING
              `, [cls, term, JSON.stringify(template.mark_components), template.pass_threshold || 50]);
              configMap.set(classKey, template);
              console.log(`  [${schema}] Created config for class "${cls}" Term ${term} (from ${template.class_name})`);
            }
          }
        }
      }
      console.log(`Sync completed for ${dbName}`);
    } finally {
      client.release();
    }
  } catch (err) {
    console.error(`Error syncing ${dbName}:`, err);
  } finally {
    await pool.end();
  }
}

async function main() {
  // Sync IQRA database
  await syncConfigsForDb({
    host: 'localhost',
    database: 'iqrab1',
    user: 'iqra',
    password: 'iqra1768'
  }, 'IQRA (iqrab1)');

  // Sync BILAL database
  await syncConfigsForDb({
    host: 'localhost',
    database: 'school_management10',
    user: 'bilal_user',
    password: 'Bilal2026x'
  }, 'BILAL (school_management10)');
}

main().catch(console.error);
