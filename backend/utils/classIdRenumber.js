/**
 * Class roll-number (class_id) maintenance.
 *
 * class_id is the per-class roll number shown to users. It must always be a
 * gap-free sequence 1..N ordered by student name (active students first).
 * school_id is the permanent student identity and must NEVER change here.
 *
 * Renumbering therefore has two jobs:
 *   1. rewrite class_id in classes_schema."<class>" (two-phase, so a swap such
 *      as 5<->6 can never overwrite the wrong row), and
 *   2. move every denormalised copy of that roll number (weekly attendance,
 *      student faults, machine-ID tracker) plus the finance student UUIDs
 *      (00000000-0000-0000-SSSS-CCCCCCCCCCCC, built from school_id + class_id)
 *      so attendance and invoices stay attached to the same student.
 *
 * Only class_id is ever modified. school_id is the stable key used for every
 * cascade, so no historical record can be mis-attributed.
 */

const VALID_CLASS = /^[A-Za-z0-9_]+$/;

// Schemas that store the roll number (class_id) next to school_id are resolved
// per class by listRollNumberTables(). public.mark_lists /
// public.students.class_id are foreign keys to the `classes` table, NOT roll
// numbers, and must not be touched.

function toQuery(query) {
  if (typeof query === 'function') return query;
  if (query && typeof query.query === 'function') {
    return (text, params) => query.query(text, params);
  }
  throw new Error('query executor is not a function');
}

function compositeUuid(schoolId, classId) {
  return `00000000-0000-0000-${String(schoolId).padStart(4, '0')}-${String(classId).padStart(12, '0')}`;
}

function isNumericType(type) {
  return /int|numeric|decimal|real|double/i.test(String(type || ''));
}

async function getColumns(run, schema, table) {
  const { rows } = await run(
    `SELECT column_name, data_type
       FROM information_schema.columns
      WHERE table_schema = $1 AND table_name = $2`,
    [schema, table]
  );
  const map = new Map();
  rows.forEach((r) => map.set(r.column_name, r.data_type));
  return map;
}

async function tableExists(run, schema, table) {
  const { rows } = await run(
    `SELECT 1 FROM information_schema.tables
      WHERE table_schema = $1 AND table_name = $2 AND table_type = 'BASE TABLE'`,
    [schema, table]
  );
  return rows.length > 0;
}

async function listRollNumberTables(run, className) {
  const { rows } = await run(`
    SELECT c.table_schema, c.table_name,
           MAX(CASE WHEN c.column_name = 'class_id' THEN c.data_type END) AS data_type
      FROM information_schema.columns c
      JOIN information_schema.tables t
        ON t.table_schema = c.table_schema AND t.table_name = c.table_name
     WHERE t.table_type = 'BASE TABLE'
       AND c.table_schema NOT IN ('pg_catalog', 'information_schema')
       AND c.table_name NOT LIKE '\\_%'
     GROUP BY c.table_schema, c.table_name
    HAVING bool_or(c.column_name = 'class_id')
       AND bool_or(c.column_name = 'school_id')
     ORDER BY c.table_schema, c.table_name
  `);
  // A student's roll number is only duplicated in their own class's weekly
  // attendance schema, the shared fault tables and the machine-ID tracker.
  // Restricting the scan keeps a renumber fast and prevents cross-class edits.
  const weekly = `class_${className}_weekly_attendance`.toLowerCase();
  const cls = className.toLowerCase();
  return rows.filter((t) => {
    const s = t.table_schema.toLowerCase();
    if (s === weekly) return true;
    if (s === 'class_students_fault') return t.table_name.toLowerCase() === cls;
    if (s === 'school_schema_points') return true;
    return false;
  });
}

async function listStudentUuidTables(run) {
  const { rows } = await run(`
    SELECT c.table_schema, c.table_name, c.column_name, c.data_type
      FROM information_schema.columns c
      JOIN information_schema.tables t
        ON t.table_schema = c.table_schema AND t.table_name = c.table_name
     WHERE t.table_type = 'BASE TABLE'
       AND c.table_schema = 'school_comms'
       AND (
         c.column_name IN ('studentId', 'student_uuid')
         OR (c.column_name = 'student_id' AND c.data_type = 'uuid')
       )
     ORDER BY c.table_schema, c.table_name
  `);
  return rows;
}

/**
 * Re-number one class table.
 *
 * @param {function|{query:function}} query pg Pool, PoolClient or query function
 * @param {string} className table name inside classes_schema
 * @param {{cascade?: boolean, finance?: boolean}} [options]
 * @returns {Promise<{changed:number,total:number,cascaded?:object,skipped?:string}>}
 */
async function renumberClass(query, className, options = {}) {
  const run = toQuery(query);

  if (!VALID_CLASS.test(className || '')) {
    return { changed: 0, total: 0, skipped: 'invalid class name' };
  }
  if (!(await tableExists(run, 'classes_schema', className))) {
    return { changed: 0, total: 0, skipped: 'class table not found' };
  }

  const cols = await getColumns(run, 'classes_schema', className);
  if (!cols.has('class_id') || !cols.has('student_name')) {
    return { changed: 0, total: 0, skipped: 'missing class_id/student_name' };
  }

  const hasId = cols.has('id');
  const hasActive = cols.has('is_active');
  const rowKey = hasId ? 'id' : 'ctid';
  const rowKeySql = hasId ? 'id' : 'ctid::text';
  const whereRow = hasId ? 'id = $2' : 'ctid = $2::tid';
  const activeExpr = hasActive ? 'COALESCE(is_active, TRUE)' : 'TRUE';
  const numericId = isNumericType(cols.get('class_id'));

  // Active students first, then A-Z by name, then a stable tie-break.
  const { rows } = await run(`
    SELECT ${rowKeySql} AS row_key,
           school_id::text AS school_id,
           class_id::text AS class_id
      FROM classes_schema."${className}"
     ORDER BY ${activeExpr} DESC,
              CASE WHEN student_name IS NULL OR BTRIM(student_name) = '' THEN 1 ELSE 0 END,
              LOWER(BTRIM(COALESCE(student_name, ''))),
              COALESCE(NULLIF(regexp_replace(COALESCE(school_id::text, ''), '[^0-9]', '', 'g'), ''), '0')::numeric,
              ${rowKey}
  `);

  if (!numericId && rows.some((r) => r.class_id != null && r.class_id !== '' && !/^\s*\d+\s*$/.test(r.class_id))) {
    return { changed: 0, total: rows.length, skipped: 'non-numeric class_id' };
  }

  const changes = [];
  rows.forEach((row, idx) => {
    const newId = idx + 1;
    if (Number(row.class_id) !== newId) {
      changes.push({
        rowKey: row.row_key,
        schoolId: row.school_id == null ? null : String(row.school_id).trim(),
        oldId: row.class_id == null || row.class_id === '' ? null : Number(row.class_id),
        newId,
      });
    }
  });

  if (changes.length === 0 && !options.forceCascade) {
    return { changed: 0, total: rows.length };
  }

  if (changes.length > 0) {
    let maxId = 0;
    for (const row of rows) {
      const n = Number(row.class_id);
      if (Number.isFinite(n) && n > maxId) maxId = n;
    }
    const tempBase = maxId + 1000000;

    // Phase 1: park every changed row on a unique temporary id. This makes safe
    // swaps (1<->2) and shifts (2,3,4 -> 3,4,5) impossible to corrupt.
    for (let i = 0; i < changes.length; i++) {
      await run(
        `UPDATE classes_schema."${className}" SET class_id = $1 WHERE ${whereRow}`,
        [tempBase + i, hasId ? Number(changes[i].rowKey) : changes[i].rowKey]
      );
    }
    // Phase 2: write the final roll numbers.
    for (const change of changes) {
      await run(
        `UPDATE classes_schema."${className}" SET class_id = $1 WHERE ${whereRow}`,
        [change.newId, hasId ? Number(change.rowKey) : change.rowKey]
      );
    }
  }

  const result = { changed: changes.length, total: rows.length };

  // Cascade the roll number to denormalised copies, keyed by school_id so a
  // student's history can never land on another student.
  if (options.cascade !== false) {
    result.cascaded = {};
    const tables = await listRollNumberTables(run, className);
    const usable = (options.forceCascade
      ? rows.map((row, idx) => ({ schoolId: row.school_id == null ? null : String(row.school_id).trim(), newId: idx + 1 }))
      : changes
    ).filter((c) => c.schoolId);
    if (usable.length > 0) {
      const schools = usable.map((c) => c.schoolId);
      const news = usable.map((c) => String(c.newId));

      for (const table of tables) {
        if (table.table_schema === 'classes_schema') continue;
        try {
          // Weekly attendance tables have UNIQUE(school_id, class_id) and can
          // hold a stale duplicate row for the same student/week. Drop the
          // older duplicate (same policy as the staff sync) before renumbering.
          if (/^class_.+_weekly_attendance$/i.test(table.table_schema)) {
            try {
              await run(
                `DELETE FROM "${table.table_schema}"."${table.table_name}" a
                       USING "${table.table_schema}"."${table.table_name}" b
                       WHERE a.id < b.id
                         AND BTRIM(a.school_id::text) = BTRIM(b.school_id::text)
                         AND BTRIM(a.school_id::text) = ANY($1::text[])`,
                [schools]
              );
            } catch (_) { /* no id column / no duplicates */ }
          }

          const cast = isNumericType(table.data_type) ? '::int' : '::text';
          const res = await run(
            `UPDATE "${table.table_schema}"."${table.table_name}" AS x
                SET class_id = v.new_id${cast}
               FROM (
                 SELECT unnest($1::text[]) AS school_id,
                        unnest($2::text[]) AS new_id
               ) v
              WHERE BTRIM(x.school_id::text) = v.school_id
                AND BTRIM(x.class_id::text) IS DISTINCT FROM v.new_id`,
            [schools, news]
          );
          result.cascaded[`${table.table_schema}.${table.table_name}`] = res.rowCount;
        } catch (err) {
          result.cascaded[`${table.table_schema}.${table.table_name}`] = `error: ${err.message}`;
          console.warn(
            `class-id cascade skipped for ${table.table_schema}.${table.table_name}: ${err.message}`
          );
        }
      }
    }

    // Finance: invoice/payment/refund student UUIDs are derived from
    // school_id + class_id. Move the exact old UUID to the new one so the
    // same student keeps their invoices. Never touch another student's row.
    if (options.finance !== false) {
      const uuidTables = await listStudentUuidTables(run);
      const usable = changes.filter((c) => c.schoolId && c.oldId != null);
      if (usable.length > 0 && uuidTables.length > 0) {
        const oldUuids = usable.map((c) => compositeUuid(c.schoolId, c.oldId));
        const newUuids = usable.map((c) => compositeUuid(c.schoolId, c.newId));
        for (const table of uuidTables) {
          try {
            const res = await run(
              `UPDATE "${table.table_schema}"."${table.table_name}" AS x
                  SET "${table.column_name}" = v.new_uuid::uuid
                 FROM (
                   SELECT unnest($1::text[]) AS old_uuid,
                          unnest($2::text[]) AS new_uuid
                 ) v
                WHERE x."${table.column_name}"::text = v.old_uuid`,
              [oldUuids, newUuids]
            );
            result.cascaded[`${table.table_schema}.${table.table_name}.${table.column_name}`] = res.rowCount;
          } catch (err) {
            result.cascaded[`${table.table_schema}.${table.table_name}.${table.column_name}`] = `error: ${err.message}`;
            console.warn(
              `student-uuid cascade skipped for ${table.table_schema}.${table.table_name}.${table.column_name}: ${err.message}`
            );
          }
        }
      }
    }
  }

  return result;
}

/**
 * Re-number a class using its own transaction when given a pool. When given an
 * existing PoolClient it participates in the caller's transaction.
 */
async function renumberClassTx(poolOrClient, className, options = {}) {
  const canConnect = poolOrClient && typeof poolOrClient.connect === 'function';
  if (!canConnect) return renumberClass(poolOrClient, className, options);

  const client = await poolOrClient.connect();
  try {
    await client.query('BEGIN');
    const result = await renumberClass(client, className, options);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    try { await client.query('ROLLBACK'); } catch (_) {}
    throw err;
  } finally {
    client.release();
  }
}

async function renumberAllClasses(query, options = {}) {
  const run = toQuery(query);
  const { rows } = await run(`
    SELECT table_name FROM information_schema.tables
     WHERE table_schema = 'classes_schema'
       AND table_type = 'BASE TABLE'
       AND table_name NOT LIKE '\\_%'
     ORDER BY table_name
  `);

  const summary = {};
  for (const table of rows) {
    try {
      summary[table.table_name] = await renumberClass(run, table.table_name, options);
    } catch (err) {
      summary[table.table_name] = `error: ${err.message}`;
      console.error(`class-id renumber failed for ${table.table_name}: ${err.message}`);
    }
  }
  return summary;
}

module.exports = {
  renumberClass,
  renumberClassTx,
  renumberAllClasses,
  compositeUuid,
};
