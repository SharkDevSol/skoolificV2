const db = require('../config/db');
async function run() {
  await db.query('ALTER TABLE classes_schema."G8A" RENAME TO "8"');
  console.log('G8A renamed to 8 successfully');
  process.exit(0);
}
run().catch(e => { console.error(e.message); process.exit(1); });
