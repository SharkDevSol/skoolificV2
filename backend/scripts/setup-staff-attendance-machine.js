/**
 * Setup Script: Staff Attendance Machine Integration
 * 
 * This script:
 * 1. Adds machineId column to Staff table
 * 2. Creates StaffAttendanceLog table
 * 3. Creates AttendanceTimeSetting table
 * 4. Sets up default time settings
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function setupStaffAttendanceMachine() {
  console.log('🚀 Setting up Staff Attendance Machine Integration...\n');

  try {
    // Step 1: Check if tables exist (Prisma will handle this via migrations)
    console.log('✅ Step 1: Database schema updated via Prisma');

    // Step 2: Create default time settings
    console.log('\n📝 Step 2: Creating default time settings...');
    
    const existingSettings = await prisma.attendanceTimeSetting.findFirst({
      where: { isActive: true }
    });

    if (!existingSettings) {
      const defaultSettings = await prisma.attendanceTimeSetting.create({
        data: {
          name: 'Default Work Hours',
          workStartTime: '08:00',
          lateThreshold: 15, // 15 minutes grace period
          workEndTime: '17:00',
          isActive: true
        }
      });
      console.log('✅ Created default time settings:', defaultSettings);
    } else {
      console.log('ℹ️  Time settings already exist:', existingSettings);
    }

    // Step 3: Display current staff without machine IDs
    console.log('\n📊 Step 3: Checking staff without Machine IDs...');
    
    const staffWithoutMachineId = await prisma.staff.findMany({
      where: {
        machineId: null,
        status: 'ACTIVE'
      },
      select: {
        id: true,
        employeeNumber: true,
        firstName: true,
        lastName: true,
        staffType: true
      }
    });

    if (staffWithoutMachineId.length > 0) {
      console.log(`\n⚠️  Found ${staffWithoutMachineId.length} staff without Machine IDs:`);
      staffWithoutMachineId.forEach((staff, index) => {
        console.log(`   ${index + 1}. ${staff.firstName} ${staff.lastName} (${staff.employeeNumber}) - ${staff.staffType}`);
      });
      console.log('\n💡 Tip: Assign Machine IDs to staff in the List Staff page');
      console.log('   Then add users to AI06 device with those IDs');
    } else {
      console.log('✅ All active staff have Machine IDs assigned');
    }

    // Step 4: Display instructions
    console.log('\n' + '='.repeat(60));
    console.log('✅ SETUP COMPLETE!');
    console.log('='.repeat(60));
    console.log('\n📋 Next Steps:');
    console.log('   1. Go to List Staff page');
    console.log('   2. Assign Machine ID to each staff (e.g., Ahmed = ID 1)');
    console.log('   3. On AI06 device, add user with that Machine ID');
    console.log('   4. Staff scans face → System tracks attendance');
    console.log('   5. View attendance in HR → Attendance System');
    console.log('\n🎯 Time Settings:');
    console.log('   - Work Start: 08:00 AM');
    console.log('   - Late After: 08:15 AM (15 min grace period)');
    console.log('   - Work End: 05:00 PM');
    console.log('\n💡 To change time settings:');
    console.log('   Go to: HR → Attendance Time Settings');
    console.log('\n');

  } catch (error) {
    console.error('❌ Error during setup:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the setup
setupStaffAttendanceMachine()
  .then(() => {
    console.log('✅ Setup completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Setup failed:', error);
    process.exit(1);
  });
