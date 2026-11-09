const { Pool } = require('pg');
const pool = new Pool({ host: 'localhost', port: 5432, database: 'iqrab3', user: 'iqra', password: 'iqra1768' });

async function run() {
  const classTables = await pool.query(`SELECT table_name FROM information_schema.tables WHERE table_schema = 'classes_schema'`);
  let freeSids = [];
  for (const t of classTables.rows) {
    try {
      const fr = await pool.query(`SELECT school_id, class_id FROM classes_schema."${t.table_name}" WHERE is_free = true`);
      for (const s of fr.rows) {
        const sid = '00000000-0000-0000-' + String(s.school_id).padStart(4, '0') + '-' + String(s.class_id).padStart(12, '0');
        freeSids.push(sid.toLowerCase());
      }
    } catch(e) {}
  }
  console.log('FREE STUDENTS COUNT:', freeSids.length);

  const payingRes = await pool.query(`
    SELECT (metadata->>'monthNumber')::int as month, count(*) as count, 
           sum("netAmount"::numeric) as net, sum("paidAmount"::numeric) as paid
    FROM school_comms."Invoice"
    WHERE (metadata->>'monthNumber')::int in (1, 2)
      AND LOWER("studentId"::text) NOT IN (${freeSids.map(s => "'" + s + "'").join(',')})
    GROUP BY 1 ORDER BY 1;
  `);
  console.log('PAYING STUDENTS ONLY (EXCLUDING FREE):');
  console.log(payingRes.rows);

  const freeInvRes = await pool.query(`
    SELECT (metadata->>'monthNumber')::int as month, count(*) as count, 
           sum("netAmount"::numeric) as net, sum("paidAmount"::numeric) as paid
    FROM school_comms."Invoice"
    WHERE (metadata->>'monthNumber')::int in (1, 2)
      AND LOWER("studentId"::text) IN (${freeSids.map(s => "'" + s + "'").join(',')})
    GROUP BY 1 ORDER BY 1;
  `);
  console.log('FREE STUDENTS INVOICES:');
  console.log(freeInvRes.rows);

  await pool.end();
}
run();
