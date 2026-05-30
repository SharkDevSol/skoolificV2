# Database Migration System

## Overview

This system automatically manages database schema changes across different environments (development, staging, production, VPS). Migrations run automatically when the server starts, ensuring your database is always up-to-date.

## Features

✅ **Automatic Execution** - Migrations run automatically on server startup
✅ **Version Tracking** - Tracks which migrations have been executed
✅ **Idempotent** - Safe to run multiple times (won't duplicate changes)
✅ **Rollback Support** - Can undo migrations if needed
✅ **Cross-Platform** - Works on Windows, Linux, and VPS
✅ **No Manual Scripts** - No need to run SQL scripts manually

## How It Works

1. When the server starts, it checks for pending migrations
2. Executes any migrations that haven't been run yet
3. Records completed migrations in the `schema_migrations` table
4. Your database is automatically updated!

## Migration Files

Migrations are located in `backend/migrations/` and follow this naming pattern:
- `001_add_weekend_days.js`
- `002_add_machine_id.js`
- `003_add_shift_columns.js`
- etc.

Each migration file contains:
- `name`: Unique identifier
- `description`: What the migration does
- `up()`: Function to apply the migration
- `down()`: Function to rollback the migration

## Automatic Execution

Migrations run automatically when you start the server:

```bash
cd backend
npm start
```

You'll see output like:
```
📦 Checking for pending database migrations...

📋 Found 2 pending migration(s)

🔄 Running migration: 001_add_weekend_days
   Description: Add weekend_days column for weekend configuration
✅ Migration 001_add_weekend_days completed successfully

🔄 Running migration: 002_add_machine_id
   Description: Add machine_id column for attendance device integration
✅ Migration 002_add_machine_id completed successfully

✅ All pending migrations completed successfully!
```

## Manual Migration Commands

If you need to manage migrations manually:

### Run Pending Migrations
```bash
cd backend/migrations
node migrate.js up
```

### Check Migration Status
```bash
node migrate.js status
```

Output:
```
📊 Migration Status:

Executed Migrations:
  ✅ 001_add_weekend_days
  ✅ 002_add_machine_id

Pending Migrations:
  ⏳ 003_add_shift_columns
```

### Rollback Last Migration
```bash
node migrate.js down
```

## Creating New Migrations

To add a new migration, create a file like `006_your_migration_name.js`:

```javascript
module.exports = {
  name: '006_your_migration_name',
  description: 'Brief description of what this migration does',
  
  async up(pool) {
    // Add your schema changes here
    await pool.query(`
      ALTER TABLE your_table 
      ADD COLUMN new_column VARCHAR(255)
    `);
    
    console.log('✅ Migration 006: Changes applied');
  },

  async down(pool) {
    // Rollback changes if needed
    await pool.query(`
      ALTER TABLE your_table 
      DROP COLUMN IF EXISTS new_column
    `);
    
    console.log('✅ Migration 006: Changes rolled back');
  }
};
```

## Current Migrations

### 001_add_weekend_days
Adds `weekend_days` column to `hr_attendance_time_settings` table for configurable weekend days.

### 002_add_machine_id
Adds `machine_id` column to `staff` table for AI06 attendance device integration.

### 003_add_shift_columns
Adds `shift_id` column to `staff` table for shift management.

### 004_add_is_active_column
Adds `is_active` column to `admin_sub_accounts` table for account management.

### 005_add_student_shift_support
Adds `shift_id` column to `students` table for student shift management.

## Deployment to VPS

When deploying to a new VPS or device:

1. **Upload your code** to the VPS
2. **Install dependencies**: `npm install`
3. **Configure .env** with your database credentials
4. **Start the server**: `npm start`
5. **Migrations run automatically** ✅

No manual SQL scripts needed!

## Troubleshooting

### Migration Failed
If a migration fails, the server will continue but log an error. Check the error message and fix the issue, then restart the server.

### Reset All Migrations (Development Only)
⚠️ **WARNING**: This will delete all migration history!

```sql
DROP TABLE IF EXISTS schema_migrations;
```

Then restart the server to re-run all migrations.

### Check Migration Table
```sql
SELECT * FROM schema_migrations ORDER BY executed_at;
```

## Benefits

✅ **No More Manual Scripts** - Forget about running .bat or .sql files
✅ **Consistent Across Environments** - Same migrations everywhere
✅ **Version Control** - Migrations are tracked in Git
✅ **Team Collaboration** - Everyone gets the same database schema
✅ **Easy Deployment** - Just start the server, migrations run automatically
✅ **Safe** - Migrations use `IF NOT EXISTS` to prevent errors

## Best Practices

1. **Never modify existing migrations** - Create a new one instead
2. **Test migrations locally** before deploying
3. **Keep migrations small** - One logical change per migration
4. **Use descriptive names** - Make it clear what the migration does
5. **Always include rollback** - Implement the `down()` function

## Support

If you encounter issues with migrations:
1. Check the server console for error messages
2. Verify your database connection in `.env`
3. Run `node migrate.js status` to see migration state
4. Check the `schema_migrations` table in your database
