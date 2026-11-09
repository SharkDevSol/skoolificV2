const { Pool } = require("/var/www/bilal.skoolific.com/backend/node_modules/pg");
const pool = new Pool({ connectionString: "postgres://bilal_user:Bilal2026x@localhost:5432/school_management10" });
async function check() {
  const res = await pool.query(`
    SELECT column_name, data_type, column_default, is_nullable
    FROM information_schema.columns 
    WHERE table_schema = 'classes_schema' AND table_name = 'KG2C'
  `);
  console.table(res.rows);
  await pool.end();
}
check().catch(console.error);
