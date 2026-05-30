const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function makeUserAdmin() {
  try {
    const userId = process.argv[2];
    
    if (!userId) {
      console.log('\n❌ Error: User ID is required\n');
      console.log('Usage: node scripts/make-user-admin.js <user_id>\n');
      console.log('Example: node scripts/make-user-admin.js 123e4567-e89b-12d3-a456-426614174000\n');
      console.log('To find user IDs, run: node scripts/check-user-role.js\n');
      return;
    }

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      console.log(`\n❌ Error: User with ID ${userId} not found\n`);
      return;
    }

    console.log('\n=== Current User Info ===\n');
    console.log(`Name: ${user.name}`);
    console.log(`Username: ${user.username || 'N/A'}`);
    console.log(`Current Role: ${user.role}`);

    // Update user to director (admin role)
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { role: 'director' }
    });

    console.log('\n✅ User updated successfully!\n');
    console.log('=== Updated User Info ===\n');
    console.log(`Name: ${updatedUser.name}`);
    console.log(`Username: ${updatedUser.username || 'N/A'}`);
    console.log(`New Role: ${updatedUser.role}`);
    console.log('\n✅ This user now has full finance access!\n');
    console.log('Next steps:');
    console.log('1. Logout from the application');
    console.log('2. Login with this user account');
    console.log('3. Navigate to Finance → Fee Management');
    console.log('4. You should now have access!\n');

  } catch (error) {
    console.error('\n❌ Error updating user:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

makeUserAdmin();
