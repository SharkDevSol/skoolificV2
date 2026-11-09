const { Pool } = require("/var/www/bilal.skoolific.com/backend/node_modules/pg");
const pool = new Pool({ connectionString: "postgres://bilal_user:Bilal2026x@localhost:5432/school_management10" });
async function check() {
  try {
    const tracker = await pool.query("SELECT * FROM school_schema_points.global_id_tracker");
    console.log("tracker:", tracker.rows);
  } catch(e) { console.error("tracker error:", e.message); }
  
  try {
    const classId = await pool.query('SELECT COALESCE(MAX(class_id), 0) as max_class_id FROM classes_schema."KG2C"');
    console.log("class_id for KG2C:", classId.rows);
  } catch(e) { console.error("classId error:", e.message); }
  
  await pool.end();
}
check().catch(console.error);
