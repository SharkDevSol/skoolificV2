/**
 * Year Rollover Testing Script
 * Tests the year rollover functionality with sample data
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const YearRolloverService = require('./YearRolloverService');

// Database configuration
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'skoolific',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || ''
};

async function main() {
  const command = process.argv[2];
  
  console.log('\nYear Rollover Testing Tool\n');
  console.log('Database Configuration:');
  console.log(`  Host: ${dbConfig.host}`);
  console.log(`  Port: ${dbConfig.port}`);
  console.log(`  Database: ${dbConfig.database}`);
  console.log(`  User: ${dbConfig.user}\n`);
  
  const service = new YearRolloverService(dbConfig);
  
  try {
    switch (command) {
      case 'status':
        // Show current year status
        const current = await service.getCurrentAcademicYear();
        console.log('Current Academic Year:');
        console.log(`  Academic Year: ${current.academicYear}`);
        console.log(`  Ethiopian Year: ${current.ethiopianYear}`);
        console.log('');
        
        // Count records
        const studentCount = await service.pool.query('SELECT COUNT(*) FROM students');
        const attendanceCount = await service.pool.query('SELECT COUNT(*) FROM student_attendance');
        const marksCount = await service.pool.query('SELECT COUNT(*) FROM student_marks');
        const paymentsCount = await service.pool.query('SELECT COUNT(*) FROM payments');
        
        console.log('Current Year Data:');
        console.log(`  Students: ${studentCount.rows[0].count}`);
        console.log(`  Attendance Records: ${attendanceCount.rows[0].count}`);
        console.log(`  Marks: ${marksCount.rows[0].count}`);
        console.log(`  Payments: ${paymentsCount.rows[0].count}`);
        console.log('');
        
        // Count archived years
        const archivedCount = await service.pool.query('SELECT COUNT(*) FROM archived_academic_years');
        console.log(`Archived Years: ${archivedCount.rows[0].count}`);
        console.log('');
        break;
        
      case 'rollover':
        // Run year rollover
        // Get first staff member ID
        const staffResult = await service.pool.query('SELECT id FROM staff LIMIT 1');
        if (staffResult.rows.length === 0) {
          console.error('✗ No staff found. Please create at least one staff member first.');
          process.exit(1);
        }
        
        const archivedBy = staffResult.rows[0].id;
        const result = await service.runYearRollover(archivedBy);
        
        if (result.success) {
          console.log('✓ Year rollover completed successfully');
          console.log(`  Old Year: ${result.oldYear}`);
          console.log(`  New Year: ${result.newYear}`);
          console.log(`  Archive ID: ${result.archiveYearId}`);
        } else {
          console.error('✗ Year rollover failed:', result.error);
          process.exit(1);
        }
        break;
        
      case 'list-archives':
        // List all archived years
        const archives = await service.pool.query(`
          SELECT 
            id,
            academic_year,
            ethiopian_year,
            archive_date,
            total_students,
            total_staff
          FROM archived_academic_years
          ORDER BY ethiopian_year DESC
        `);
        
        if (archives.rows.length === 0) {
          console.log('No archived years found');
        } else {
          console.log('Archived Academic Years:\n');
          archives.rows.forEach(archive => {
            console.log(`ID: ${archive.id}`);
            console.log(`  Academic Year: ${archive.academic_year} (${archive.ethiopian_year})`);
            console.log(`  Archived: ${archive.archive_date.toISOString().split('T')[0]}`);
            console.log(`  Students: ${archive.total_students}`);
            console.log(`  Staff: ${archive.total_staff}`);
            console.log('');
          });
        }
        break;
        
      case 'view-archive':
        // View specific archive details
        const archiveId = parseInt(process.argv[3]);
        
        if (!archiveId) {
          console.error('Usage: node test-year-rollover.js view-archive <archive_id>');
          process.exit(1);
        }
        
        const archive = await service.pool.query(`
          SELECT * FROM archived_academic_years WHERE id = $1
        `, [archiveId]);
        
        if (archive.rows.length === 0) {
          console.error(`Archive with ID ${archiveId} not found`);
          process.exit(1);
        }
        
        const archiveData = archive.rows[0];
        console.log(`Archive Details (ID: ${archiveId}):\n`);
        console.log(`Academic Year: ${archiveData.academic_year} (${archiveData.ethiopian_year})`);
        console.log(`Archived: ${archiveData.archive_date.toISOString()}`);
        console.log(`Total Students: ${archiveData.total_students}`);
        console.log(`Total Staff: ${archiveData.total_staff}`);
        console.log('');
        
        // Count archived records
        const archivedStudents = await service.pool.query(
          'SELECT COUNT(*) FROM archived_students WHERE archive_year_id = $1',
          [archiveId]
        );
        const archivedAttendance = await service.pool.query(
          'SELECT COUNT(*) FROM archived_attendance WHERE archive_year_id = $1',
          [archiveId]
        );
        const archivedMarks = await service.pool.query(
          'SELECT COUNT(*) FROM archived_marks WHERE archive_year_id = $1',
          [archiveId]
        );
        const archivedPayments = await service.pool.query(
          'SELECT COUNT(*) FROM archived_payments WHERE archive_year_id = $1',
          [archiveId]
        );
        
        console.log('Archived Records:');
        console.log(`  Students: ${archivedStudents.rows[0].count}`);
        console.log(`  Attendance: ${archivedAttendance.rows[0].count}`);
        console.log(`  Marks: ${archivedMarks.rows[0].count}`);
        console.log(`  Payments: ${archivedPayments.rows[0].count}`);
        console.log('');
        break;
        
      default:
        console.log('Usage:');
        console.log('  node test-year-rollover.js <command>');
        console.log('');
        console.log('Commands:');
        console.log('  status           - Show current year status and data counts');
        console.log('  rollover         - Run year rollover (archive and increment year)');
        console.log('  list-archives    - List all archived academic years');
        console.log('  view-archive <id> - View details of a specific archive');
        console.log('');
        console.log('Examples:');
        console.log('  node test-year-rollover.js status');
        console.log('  node test-year-rollover.js rollover');
        console.log('  node test-year-rollover.js list-archives');
        console.log('  node test-year-rollover.js view-archive 1');
        console.log('');
    }
    
  } catch (error) {
    console.error('\n✗ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await service.close();
  }
}

main();
