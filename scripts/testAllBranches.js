const { Pool } = require('pg');

const branches = [
  { code: 'IQRA2', db: 'iqrab2' },
  { code: 'IQRA3', db: 'iqrab3' },
  { code: 'IQRA4', db: 'iqrab4' },
  { code: 'IQRA5', db: 'iqrab5' }
];

async function run() {
  for (const b of branches) {
    const pool = new Pool({ host: 'localhost', port: 5432, database: b.db, user: 'iqra', password: 'iqra1768' });
    try {
      const classTables = await pool.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'classes_schema'");
      let totalStudents = 0;
      let freeStudents = 0;
      for (const t of classTables.rows) {
        try {
          const res = await pool.query(`SELECT count(*) as total, count(CASE WHEN is_free = true THEN 1 END) as free FROM classes_schema."${t.table_name}"`);
          totalStudents += parseInt(res.rows[0].total) || 0;
          freeStudents += parseInt(res.rows[0].free) || 0;
        } catch(e) {}
      }

      const invM2 = await pool.query(`
        SELECT count(*) as cnt, sum("netAmount"::numeric) as net, sum("paidAmount"::numeric) as paid
        FROM school_comms."Invoice"
        WHERE (metadata->>'monthNumber')::int = 2
      `);

      console.log(`=== ${b.code} (${b.db}) ===`);
      console.log(`Total Students: ${totalStudents}, Free Students: ${freeStudents}`);
      console.log(`M2 Invoices Total: Net = ${invM2.rows[0].net}, Paid = ${invM2.rows[0].paid}`);
    } catch(err) {
      console.error(`Error checking ${b.code}:`, err.message);
    } finally {
      await pool.end();
    }
  }
}
run();
