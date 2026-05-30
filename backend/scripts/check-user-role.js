const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkUserRole() {
  try {
    console.log('\n=== Checking User Roles ===\n');
    
    // Get all users with their roles
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        username: true,
        role: true
      },
      orderBy: {
        name: 'asc'
      }
    });

    if (users.length === 0) {
      console.log('No users found in database.');
      return;
    }

    console.log(`Found ${users.length} users:\n`);
    
    users.forEach((user, index) => {
      const hasFinanceAccess = ['director', 'admin', 'sub-account', 'super_admin'].includes(user.role);
      const accessStatus = hasFinanceAccess ? '✅ HAS FINANCE ACCESS' : '❌ NO FINANCE ACCESS';
      
      console.log(`${index + 1}. ${user.name}`);
      console.log(`   Username: ${user.username || 'N/A'}`);
      console.log(`   Role: ${user.role}`);
      console.log(`   Finance Access: ${accessStatus}`);
      console.log('');
    });

    console.log('\n=== Finance Access Summary ===\n');
    console.log('Roles with Finance Access:');
    console.log('  ✅ director        → SCHOOL_ADMINISTRATOR');
    console.log('  ✅ admin           → SCHOOL_ADMINISTRATOR');
    console.log('  ✅ sub-account     → SCHOOL_ADMINISTRATOR');
    console.log('  ✅ super_admin     → Full Access');
    console.log('\nRoles without Finance Access:');
    console.log('  ❌ teacher');
    console.log('  ❌ guardian');
    console.log('  ❌ staff');
    console.log('  ❌ student');
    
    console.log('\n=== Recommendations ===\n');
    
    const admins = users.filter(u => ['director', 'admin', 'sub-account', 'super_admin'].includes(u.role));
    
    if (admins.length > 0) {
      console.log('✅ You have admin users. Login with one of these accounts:');
      admins.forEach(admin => {
        console.log(`   - ${admin.name} (${admin.username || 'no username'}) - Role: ${admin.role}`);
      });
    } else {
      console.log('⚠️  No admin users found!');
      console.log('   You need to create an admin user or update an existing user\'s role.');
      console.log('\n   To update a user to admin:');
      console.log('   Run: node scripts/make-user-admin.js <user_id>');
    }

  } catch (error) {
    console.error('Error checking user roles:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkUserRole();
