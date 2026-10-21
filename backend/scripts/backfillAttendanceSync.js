const { Pool } = require('/var/www/bilal.skoolific.com/backend/node_modules/pg');
const { toGregorian, convertToEthiopian, getEthiopianDayOfWeek } = require('/var/www/bilal.skoolific.com/backend/utils/ethiopianCalendar');

const CUTOFF_DAYS = 120;
const DAY_COLS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
const CODE_TO_STATUS = { P: 'PRESENT', A: 'ABSENT', L: 'LATE', E: 'LEAVE' };

const DBS = [
  { label: 'iqrab1', user: 'iqra', password: 'iqra1768', database: 'iqrab1' },
  { label: 'iqrab2', user: 'iqra', password: 'iqra1768', database: 'iqrab2' },
  { label: 'iqrab3', user: 'iqra', password: 'iqra1768', database: 'iqrab3' },
  { label: 'iqrab4', user: 'iqra', password: 'iqra1768', database: 'iqrab4' },
  { label: 'iqrab5', user: 'iqra', password: 'iqra1768', database: 'iqrab5' },
  { label: 'bilal', user: 'bilal_user', password: 'Bilal2026x', database: 'school_management10' },
];

const ymd = d => `${d.getFullYear()}_${String(d.getMonth() + 1).padStart(2, '0')}_${String(d.getDate()).padStart(2, '0')}`;
const mondayOf = d => { const m = new Date(d); m.setDate(d.getDate() - ((d.getDay() + 6) % 7)); return m; };

async function backfill(pool, label) {
  const stats = { grid: 0, academic: 0, days: 0, classes: 0 };
  const cutoff = new Date(); cutoff.setDate(cutoff.getDate() - CUTOFF_DAYS);

  const classes = (await pool.query(`SELECT DISTINCT class_name FROM public.academic_student_attendance`)).rows.map(r => r.class_name);
  const classTables = new Set((await pool.query(`SELECT table_name FROM information_schema.tables WHERE table_schema='classes_schema'`)).rows.map(r => r.table_name));

  for (const className of classes) {
    if (!classTables.has(className)) continue;
    stats.classes++;
    const schemaName = `class_${className}_weekly_attendance`;

    // ---- direction 1: academic -> weekly grid ----
    const recs = (await pool.query(`
      SELECT student_id, ethiopian_year, ethiopian_month, ethiopian_day, status
      FROM public.academic_student_attendance WHERE class_name = $1
    `, [className])).rows;

    const buckets = new Map();
    for (const r of recs) {
      const g = toGregorian(r.ethiopian_year, r.ethiopian_month, r.ethiopian_day);
      if (!g || isNaN(g.getTime()) || g < cutoff) continue;
      const tbl = `week_${ymd(mondayOf(g))}`;
      const col = DAY_COLS[(g.getDay() + 6) % 7];
      const key = `${tbl}|${col}`;
      if (!buckets.has(key)) buckets.set(key, { tbl, col, map: new Map() });
      buckets.get(key).map.set(String(r.student_id), r.status);
    }

    for (const { tbl, col, map } of buckets.values()) {
      stats.days++;
      await pool.query(`CREATE SCHEMA IF NOT EXISTS "${schemaName}"`);
      await pool.query(`CREATE TABLE IF NOT EXISTS "${schemaName}"."${tbl}" (
        id SERIAL PRIMARY KEY, school_id VARCHAR(50) NOT NULL, class_id VARCHAR(50) NOT NULL,
        student_name VARCHAR(100) NOT NULL,
        monday VARCHAR(1), tuesday VARCHAR(1), wednesday VARCHAR(1), thursday VARCHAR(1),
        friday VARCHAR(1), saturday VARCHAR(1), sunday VARCHAR(1),
        created_by VARCHAR(100), created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT unique_student_${tbl} UNIQUE (school_id, class_id)
      )`);
      await pool.query(`
        INSERT INTO "${schemaName}"."${tbl}" (school_id, class_id, student_name, created_by)
        SELECT school_id, class_id, student_name, 'backfill' FROM classes_schema."${className}"
        WHERE school_id IS NOT NULL AND class_id IS NOT NULL AND student_name IS NOT NULL
          AND (is_active = TRUE OR is_active IS NULL)
        ON CONFLICT (school_id, class_id) DO NOTHING
      `).catch(() => {});

      const entries = [...map.entries()].filter(([, st]) => st);
      if (!entries.length) continue;
      const values = entries.map((_, i) => `($${i * 2 + 1}::text, $${i * 2 + 2})`).join(', ');
      const params = entries.flatMap(([sid, st]) => [sid, st]);
      const upd = await pool.query(`
        UPDATE "${schemaName}"."${tbl}" w
        SET "${col}" = CASE v.st
              WHEN 'PRESENT' THEN 'P' WHEN 'ABSENT' THEN 'A'
              WHEN 'LATE' THEN 'L' WHEN 'LEAVE' THEN 'E' END,
            updated_at = CURRENT_TIMESTAMP
        FROM (VALUES ${values}) AS v(sid, st)
        WHERE TRIM(w.school_id) = v.sid
      `, params);
      stats.grid += upd.rowCount || 0;
    }

    // ---- direction 2: weekly grid -> academic ----
    const wTables = (await pool.query(`SELECT table_name FROM information_schema.tables WHERE table_schema = $1`, [schemaName])).rows.map(r => r.table_name);
    for (const wt of wTables) {
      const rows = (await pool.query(`SELECT school_id, student_name FROM "${schemaName}"."${wt}"`)).rows;
      for (const row of rows) {
        const vals = (await pool.query(`SELECT monday, tuesday, wednesday, thursday, friday, saturday, sunday FROM "${schemaName}"."${wt}" WHERE school_id = $1`, [row.school_id])).rows[0];
        if (!vals) continue;
        const parts = wt.replace('week_', '').split('_');
        const monDate = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
        for (let i = 0; i < 7; i++) {
          const code = vals[DAY_COLS[i]];
          if (!code) continue;
          const g = new Date(monDate); g.setDate(monDate.getDate() + i);
          if (g < cutoff) continue;
          const eth = convertToEthiopian(g);
          const exists = await pool.query(`
            SELECT 1 FROM public.academic_student_attendance
            WHERE student_id = $1 AND class_name = $2 AND ethiopian_year = $3 AND ethiopian_month = $4 AND ethiopian_day = $5
            LIMIT 1
          `, [String(row.school_id), className, eth.year, eth.month, eth.day]);
          if (exists.rows.length) continue;
          const stu = await pool.query(`SELECT smachine_id, student_name FROM classes_schema."${className}" WHERE school_id::text = $1 LIMIT 1`, [String(row.school_id)]);
          await pool.query(`
            INSERT INTO public.academic_student_attendance
              (student_id, student_name, class_name, smachine_id, date,
               ethiopian_year, ethiopian_month, ethiopian_day, day_of_week, week_number,
               check_in_time, status, notes, shift_number)
            VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
            ON CONFLICT (student_id, class_name, ethiopian_year, ethiopian_month, ethiopian_day)
            DO UPDATE SET status = EXCLUDED.status
          `, [
            String(row.school_id), stu.rows[0]?.student_name || row.student_name, className,
            stu.rows[0]?.smachine_id || null, g,
            eth.year, eth.month, eth.day, getEthiopianDayOfWeek(eth.year, eth.month, eth.day),
            Math.ceil(eth.day / 7), '08:00:00', CODE_TO_STATUS[code] || 'PRESENT',
            'Marked by class teacher', 1,
          ]);
          stats.academic++;
        }
      }
    }
  }
  console.log(`  ${label}: classes=${stats.classes} dayBuckets=${stats.days} gridRowsSet=${stats.grid} academicRowsCreated=${stats.academic}`);
}

(async () => {
  for (const d of DBS) {
    const pool = new Pool({ host: 'localhost', user: d.user, password: d.password, database: d.database, max: 1 });
    try { await backfill(pool, d.label); }
    catch (e) { console.log(`  ${d.label}: ERROR ${e.message}`); }
    await pool.end();
  }
  console.log('BACKFILL DONE');
})();
