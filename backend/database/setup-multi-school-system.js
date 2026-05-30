/**
 * Multi-School Multi-Branch System Setup
 * 
 * This script creates:
 * 1. Master database (skoolific_master)
 * 2. Schools table (IQRA, BILAL, etc.)
 * 3. Branches table (iqrab1, iqrab2, bilalb1, etc.)
 * 4. Super admins table (iqrasuperadmin, bilalsuperadmin)
 * 5. Database users for each school (iqra_user, bilal_user)
 * 
 * Usage:
 *   node backend/database/setup-multi-school-system.js
 */

require('dotenv').config();
const { Client } = require('pg');
const bcrypt = require('bcrypt');

async function setupMultiSchoolSystem() {
  console.log('\n🏗️  Setting up Multi-School Multi-Branch System...\n');

  // Connect to PostgreSQL
  const masterClient = new Client({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: 'postgres',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '12345678'
  });

  await masterClient.connect();

  // 1. Create master database
  console.log('1. Creating master database...');
  try {
    await masterClient.query('CREATE DATABASE skoolific_master');
    console.log('   ✓ Master database created\n');
  } catch (err) {
    if (err.code === '42P04') {
      console.log('   ⚠️  Master database already exists\n');
    } else {
      throw err;
    }
  }

  await masterClient.end();

  // 2. Connect to master database and create tables
  const client = new Client({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: 'skoolific_master',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '12345678'
  });

  await client.connect();

  console.log('2. Creating tables...');
  
  // Create schools table
  await client.query(`
    CREATE TABLE IF NOT EXISTS schools (
      id SERIAL PRIMARY KEY,
      school_name VARCHAR(100) NOT NULL UNIQUE,
      school_code VARCHAR(20) NOT NULL UNIQUE,
      db_user VARCHAR(50) NOT NULL,
      db_password VARCHAR(255) NOT NULL,
      description TEXT,
      is_active BOOLEAN DEFAULT true,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Create branches table
  await client.query(`
    CREATE TABLE IF NOT EXISTS branches (
      id SERIAL PRIMARY KEY,
      school_id INTEGER NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
      branch_name VARCHAR(100) NOT NULL,
      branch_code VARCHAR(20) NOT NULL UNIQUE,
      database_name VARCHAR(100) NOT NULL UNIQUE,
      database_host VARCHAR(100) DEFAULT 'localhost',
      database_port INTEGER DEFAULT 5432,
      school_address TEXT,
      school_phone VARCHAR(50),
      school_email VARCHAR(255),
      admin_name VARCHAR(255),
      admin_email VARCHAR(255),
      admin_phone VARCHAR(50),
      is_active BOOLEAN DEFAULT true,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Create super_admins table
  await client.query(`
    CREATE TABLE IF NOT EXISTS super_admins (
      id SERIAL PRIMARY KEY,
      school_id INTEGER NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
      username VARCHAR(100) NOT NULL UNIQUE,
      password_hash VARCHAR(255) NOT NULL,
      full_name VARCHAR(255) NOT NULL,
      email VARCHAR(255) NOT NULL,
      phone VARCHAR(50),
      role VARCHAR(50) DEFAULT 'school_super_admin',
      is_active BOOLEAN DEFAULT true,
      last_login TIMESTAMP,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Create indexes
  await client.query(`
    CREATE INDEX IF NOT EXISTS idx_schools_code ON schools(school_code);
    CREATE INDEX IF NOT EXISTS idx_schools_active ON schools(is_active);
    CREATE INDEX IF NOT EXISTS idx_branches_school ON branches(school_id);
    CREATE INDEX IF NOT EXISTS idx_branches_code ON branches(branch_code);
    CREATE INDEX IF NOT EXISTS idx_branches_active ON branches(is_active);
    CREATE INDEX IF NOT EXISTS idx_super_admins_school ON super_admins(school_id);
    CREATE INDEX IF NOT EXISTS idx_super_admins_username ON super_admins(username);
  `);

  console.log('   ✓ Tables created\n');

  // 3. Insert sample schools
  console.log('3. Inserting schools...');
  
  const schools = [
    {
      name: 'IQRA School',
      code: 'IQRA',
      user: 'iqra_user',
      password: 'iqra_secure_password_2024',
      description: 'IQRA Islamic School Network'
    },
    {
      name: 'BILAL School',
      code: 'BILAL',
      user: 'bilal_user',
      password: 'bilal_secure_password_2024',
      description: 'BILAL Education System'
    },
    {
      name: 'Al-Markaz School',
      code: 'ALMARKAZ',
      user: 'almarkaz_user',
      password: 'almarkaz_secure_password_2024',
      description: 'Al-Markaz Islamic School'
    }
  ];

  const schoolIds = {};

  for (const school of schools) {
    const result = await client.query(
      `INSERT INTO schools (school_name, school_code, db_user, db_password, description)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (school_code) DO UPDATE SET
         db_user = EXCLUDED.db_user,
         db_password = EXCLUDED.db_password
       RETURNING id`,
      [school.name, school.code, school.user, school.password, school.description]
    );
    
    schoolIds[school.code] = result.rows[0].id;
    console.log(`   ✓ ${school.name} (user: ${school.user})`);
  }

  console.log('');

  // 4. Create database users
  console.log('4. Creating database users...');
  
  const dbClient = new Client({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: 'postgres',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '12345678'
  });

  await dbClient.connect();

  for (const school of schools) {
    try {
      await dbClient.query(`CREATE USER ${school.user} WITH PASSWORD '${school.password}'`);
      console.log(`   ✓ Created user: ${school.user}`);
    } catch (err) {
      if (err.code === '42710') {
        console.log(`   ⚠️  User ${school.user} already exists`);
        // Update password
        await dbClient.query(`ALTER USER ${school.user} WITH PASSWORD '${school.password}'`);
        console.log(`   ✓ Updated password for: ${school.user}`);
      } else {
        throw err;
      }
    }
  }

  await dbClient.end();
  console.log('');

  // 5. Create super admin accounts
  console.log('5. Creating super admin accounts...');
  
  const superAdmins = [
    {
      schoolCode: 'IQRA',
      username: 'iqrasuperadmin',
      password: 'admin123',
      fullName: 'IQRA Super Administrator',
      email: 'admin@iqra.edu',
      phone: '+1234567890'
    },
    {
      schoolCode: 'BILAL',
      username: 'bilalsuperadmin',
      password: 'admin123',
      fullName: 'BILAL Super Administrator',
      email: 'admin@bilal.edu',
      phone: '+1234567891'
    },
    {
      schoolCode: 'ALMARKAZ',
      username: 'almarkazsuperadmin',
      password: 'admin123',
      fullName: 'Al-Markaz Super Administrator',
      email: 'admin@almarkaz.edu',
      phone: '+1234567892'
    }
  ];

  for (const admin of superAdmins) {
    const schoolId = schoolIds[admin.schoolCode];

    if (schoolId) {
      const passwordHash = await bcrypt.hash(admin.password, 10);
      
      const result = await client.query(
        `INSERT INTO super_admins (school_id, username, password_hash, full_name, email, phone)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (username) DO UPDATE SET
           password_hash = EXCLUDED.password_hash,
           full_name = EXCLUDED.full_name,
           email = EXCLUDED.email,
           phone = EXCLUDED.phone
         RETURNING id`,
        [schoolId, admin.username, passwordHash, admin.fullName, admin.email, admin.phone]
      );

      console.log(`   ✓ ${admin.username} (password: ${admin.password})`);
    }
  }

  console.log('');

  // 6. Display summary
  console.log('6. System Summary:\n');
  
  const summary = await client.query(`
    SELECT 
      s.school_name,
      s.school_code,
      s.db_user,
      COUNT(b.id) as branch_count,
      sa.username as super_admin
    FROM schools s
    LEFT JOIN branches b ON s.id = b.school_id
    LEFT JOIN super_admins sa ON s.id = sa.school_id
    GROUP BY s.id, s.school_name, s.school_code, s.db_user, sa.username
    ORDER BY s.school_name
  `);

  console.log('   📚 Schools Configuration:');
  console.log('   ┌─────────────────────────────────────────────────────────────┐');
  for (const row of summary.rows) {
    console.log(`   │ ${row.school_name.padEnd(20)} │ Code: ${row.school_code.padEnd(10)} │`);
    console.log(`   │ DB User: ${row.db_user.padEnd(15)} │ Branches: ${String(row.branch_count).padEnd(8)} │`);
    console.log(`   │ Super Admin: ${(row.super_admin || 'Not created').padEnd(40)} │`);
    console.log('   ├─────────────────────────────────────────────────────────────┤');
  }
  console.log('   └─────────────────────────────────────────────────────────────┘\n');

  await client.end();

  console.log('✅ Multi-School System setup complete!\n');
  console.log('📝 Next Steps:');
  console.log('   1. Create branches using the Super Admin Dashboard');
  console.log('   2. Each branch will get its own database automatically');
  console.log('   3. Login credentials:');
  console.log('      - iqrasuperadmin / admin123');
  console.log('      - bilalsuperadmin / admin123');
  console.log('      - almarkazsuperadmin / admin123\n');
  console.log('⚠️  IMPORTANT: Change these passwords in production!\n');
}

setupMultiSchoolSystem().catch(err => {
  console.error('❌ Setup failed:', err.message);
  console.error('Stack:', err.stack);
  process.exit(1);
});
