const pool = require('../config/db');

async function checkApprovalStats() {
  try {
    console.log('🔍 Checking approval statistics...\n');

    // Check if table exists
    const tableCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'hr_attendance_permissions'
      );
    `);

    if (!tableCheck.rows[0].exists) {
      console.log('❌ Table hr_attendance_permissions does not exist!');
      process.exit();
    }

    console.log('✅ Table exists\n');

    // Get all records
    const allRecords = await pool.query(`
      SELECT 
        id,
        attendance_id,
        permission_status,
        approved_by,
        approved_at,
        created_at
      FROM hr_attendance_permissions
      ORDER BY created_at DESC
      LIMIT 20
    `);

    console.log(`📋 Total records: ${allRecords.rows.length}\n`);

    if (allRecords.rows.length === 0) {
      console.log('⚠️ No approval records found!');
      console.log('This means no permissions have been approved or rejected yet.\n');
    } else {
      console.log('Recent approval records:');
      console.log('─'.repeat(100));
      allRecords.rows.forEach((record, index) => {
        console.log(`${index + 1}. Status: ${record.permission_status} | Approved By: ${record.approved_by || 'NULL'} | Date: ${record.approved_at || record.created_at}`);
      });
      console.log('─'.repeat(100));
      console.log();
    }

    // Get stats by user
    const statsByUser = await pool.query(`
      SELECT 
        approved_by,
        COUNT(*) FILTER (WHERE permission_status = 'APPROVED') as approved,
        COUNT(*) FILTER (WHERE permission_status = 'REJECTED') as rejected,
        COUNT(*) as total
      FROM hr_attendance_permissions
      WHERE approved_by IS NOT NULL
      GROUP BY approved_by
      ORDER BY total DESC
    `);

    if (statsByUser.rows.length === 0) {
      console.log('⚠️ No approval stats by user found!');
      console.log('This means approved_by field is NULL for all records.\n');
    } else {
      console.log('📊 Approval stats by user:');
      console.log('─'.repeat(80));
      statsByUser.rows.forEach(stat => {
        console.log(`User: ${stat.approved_by}`);
        console.log(`  ✅ Approved: ${stat.approved}`);
        console.log(`  ❌ Rejected: ${stat.rejected}`);
        console.log(`  📊 Total: ${stat.total}`);
        console.log();
      });
      console.log('─'.repeat(80));
    }

    // Get stats by status
    const statsByStatus = await pool.query(`
      SELECT 
        permission_status,
        COUNT(*) as count
      FROM hr_attendance_permissions
      GROUP BY permission_status
      ORDER BY count DESC
    `);

    console.log('\n📈 Stats by status:');
    console.log('─'.repeat(40));
    statsByStatus.rows.forEach(stat => {
      console.log(`${stat.permission_status}: ${stat.count}`);
    });
    console.log('─'.repeat(40));

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    process.exit();
  }
}

checkApprovalStats();
