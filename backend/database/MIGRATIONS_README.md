# Database Migrations for Skoolific V2

This directory contains the database migration framework and migration files for Skoolific V2.

## Overview

The migration system provides:
- **Automated schema creation** on fresh databases
- **Version control** for database schema changes
- **Rollback functionality** to undo migrations
- **Migration tracking** to know which migrations have been executed
- **Idempotent migrations** that can be run multiple times safely

## Directory Structure

```
backend/database/
├── MigrationRunner.js          # Core migration runner class
├── migrate.js                  # CLI command for running migrations
├── test-migrations.js          # Test script for fresh database
├── MIGRATIONS_README.md        # This file
└── migrations/                 # Migration SQL files
    ├── 001_create_branch_config.sql
    ├── 002_create_migrations_table.sql
    ├── 003_create_school_config.sql
    ├── 004_create_classes_and_shifts.sql
    ├── 005_create_students_table.sql
    ├── 006_create_staff_table.sql
    ├── 007_create_guardians_table.sql
    ├── 008_create_subjects_table.sql
    ├── 009_create_attendance_tables.sql
    ├── 010_create_marks_tables.sql
    ├── 011_create_ai_exams_tables.sql
    ├── 012_create_archived_tables.sql
    ├── 013_create_finance_tables.sql
    └── 014_create_notification_tables.sql
```

## Migration Files

### Current Migrations

1. **001_create_branch_config.sql** - Branch configuration table for multi-branch architecture
2. **002_create_migrations_table.sql** - Migration tracking table
3. **003_create_school_config.sql** - School configuration (Task1 data)
4. **004_create_classes_and_shifts.sql** - Classes and shifts tables (Task2 data)
5. **005_create_students_table.sql** - Students table with comprehensive indexes
6. **006_create_staff_table.sql** - Staff table (teachers, administrative, supportive)
7. **007_create_guardians_table.sql** - Guardians/parents table
8. **008_create_subjects_table.sql** - Subjects and teacher assignments (Task4, Task6 data)
9. **009_create_attendance_tables.sql** - Student and staff attendance tables
10. **010_create_marks_tables.sql** - Mark lists and student marks tables
11. **011_create_ai_exams_tables.sql** - AI-generated exams and student exams tables
12. **012_create_archived_tables.sql** - Year rollover archive tables
13. **013_create_finance_tables.sql** - Finance management tables
14. **014_create_notification_tables.sql** - Notification system tables

## Usage

### Running Migrations

Run all pending migrations:
```bash
node backend/database/migrate.js up
```

### Checking Migration Status

View which migrations have been executed:
```bash
node backend/database/migrate.js status
```

### Rolling Back Migrations

Rollback the last migration:
```bash
node backend/database/migrate.js down
```

Rollback the last 3 migrations:
```bash
node backend/database/migrate.js down 3
```

### Creating New Migrations

Create a new migration file:
```bash
node backend/database/migrate.js create add_new_feature
```

This will create a new file like `015_add_new_feature.sql` with a template.

### Testing Migrations

Test migrations on a fresh database:
```bash
node backend/database/test-migrations.js
```

## Migration File Format

Each migration file must follow this format:

```sql
-- Migration XXX: Description
-- Additional comments

-- UP
CREATE TABLE example (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL
);

-- DOWN
DROP TABLE IF EXISTS example;
```

- **UP section**: SQL to apply the migration
- **DOWN section**: SQL to rollback the migration

## Environment Configuration

Set these environment variables in `backend/.env`:

```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=skoolific
DB_USER=postgres
DB_PASSWORD=your_password
TEST_DB_NAME=skoolific_test  # For testing
```

## Database Schema Overview

### Core Tables

- **branch_config** - Multi-branch configuration
- **school_config** - School settings (Task1)
- **classes** - Class structure
- **shifts** - Shift timings
- **students** - Student records
- **staff** - Staff records
- **guardians** - Parent/guardian records
- **subjects** - Subject definitions
- **teacher_subject_assignments** - Teacher-subject-class mappings (Task6)

### Academic Tables

- **student_attendance** - Daily student attendance
- **staff_attendance** - Daily staff attendance
- **mark_lists** - Assessment templates
- **student_marks** - Student marks/grades
- **ai_exams** - AI-generated exams
- **student_exams** - Individual student exam instances

### Finance Tables

- **fee_structures** - Fee configuration
- **invoices** - Student invoices
- **payments** - Payment records
- **expenses** - School expenses
- **budgets** - Budget tracking

### Archive Tables (Year Rollover)

- **archived_academic_years** - Archive tracking
- **archived_students** - Archived student data
- **archived_attendance** - Archived attendance data
- **archived_marks** - Archived marks data
- **archived_payments** - Archived payment data
- **archived_staff** - Archived staff data

### Notification Tables

- **user_devices** - Device registration for push notifications
- **notification_log** - Notification history
- **notification_preferences** - User notification preferences

## Features

### Ethiopian Calendar Support

Many tables include Ethiopian calendar date fields stored as JSONB:
```json
{
  "year": 2018,
  "month": 5,
  "day": 15
}
```

### Offline Sync Support

Tables that support offline operations include a `sync_status` column:
- `pending` - Waiting to sync
- `syncing` - Currently syncing
- `synced` - Successfully synced
- `failed` - Sync failed

### Automatic Timestamps

All tables include `created_at` and `updated_at` timestamps with automatic triggers.

### Comprehensive Indexes

All tables have appropriate indexes for:
- Foreign key columns
- Frequently queried columns
- Date columns
- Status columns

### Data Integrity

- Foreign key constraints ensure referential integrity
- Check constraints validate data values
- Unique constraints prevent duplicates
- NOT NULL constraints ensure required data

## Best Practices

### Creating Migrations

1. **One change per migration** - Keep migrations focused
2. **Always include DOWN** - Provide rollback SQL
3. **Test before committing** - Run on test database first
4. **Use IF NOT EXISTS** - Make migrations idempotent
5. **Add comments** - Explain what the migration does

### Running Migrations

1. **Backup first** - Always backup production database before migrating
2. **Test on staging** - Run migrations on staging environment first
3. **Check status** - Verify migration status before and after
4. **Monitor logs** - Watch for errors during execution
5. **Have rollback plan** - Know how to rollback if needed

### Rollback Strategy

1. **Test rollback** - Test DOWN migrations on test database
2. **Backup data** - Backup before rollback
3. **Check dependencies** - Ensure no data depends on rolled-back schema
4. **Verify state** - Check database state after rollback

## Troubleshooting

### Migration Fails

If a migration fails:
1. Check the error message in console
2. Review the migration SQL
3. Check database logs
4. Fix the migration file
5. Rollback if needed: `node backend/database/migrate.js down`
6. Re-run: `node backend/database/migrate.js up`

### Rollback Fails

If rollback fails:
1. Check if DOWN section exists
2. Verify DOWN SQL is correct
3. Check for dependent data
4. May need manual intervention

### Migration Already Executed

If you need to re-run a migration:
1. Rollback: `node backend/database/migrate.js down`
2. Re-run: `node backend/database/migrate.js up`

Or manually delete from migrations table:
```sql
DELETE FROM migrations WHERE migration_name = '015_your_migration.sql';
```

## Multi-Branch Support

Each branch has its own database. To run migrations on a specific branch:

1. Update `.env` with branch database name
2. Run migrations: `node backend/database/migrate.js up`

Or use environment variables:
```bash
DB_NAME=iqrab3 node backend/database/migrate.js up
DB_NAME=almarkaz node backend/database/migrate.js up
DB_NAME=alkhwarizm node backend/database/migrate.js up
```

## Production Deployment

### Initial Deployment

1. Set production environment variables
2. Run migrations: `node backend/database/migrate.js up`
3. Verify: `node backend/database/migrate.js status`

### Updating Production

1. Backup database
2. Test migrations on staging
3. Run migrations: `node backend/database/migrate.js up`
4. Verify application functionality
5. Monitor for errors

## Support

For issues or questions:
- Check this README
- Review migration file comments
- Check database logs
- Contact development team

## Version History

- **v1.0** - Initial migration framework (Phase 1.8)
  - 14 core migrations
  - MigrationRunner class
  - CLI command
  - Test script
  - Rollback functionality
