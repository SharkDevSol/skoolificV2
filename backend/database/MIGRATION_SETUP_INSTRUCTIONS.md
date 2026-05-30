# V1 to V2 Migration Setup Instructions

## Current Status

The migration system has been partially implemented across multiple files:

### Files Created

1. **V1toV2Migration.js** - Main class with:
   - Constructor and logging methods
   - `migrateSchoolConfig()` method
   - `migrateClasses()` method
   - `generateReport()` method
   - `saveMigrationLog()` method

2. **V1toV2Migration-part2.js** - Additional methods:
   - `migrateStudents()` method
   - `migrateStaff()` method
   - `migrateGuardians()` method

3. **V1toV2Migration-part3.js** - Additional methods:
   - `migrateSubjects()` method
   - `migrateAttendance()` method
   - `migrateMarks()` method
   - `migrateFinancialRecords()` method
   - `runAllMigrations()` method
   - `rollback()` method

4. **V1toV2Migration-validation.js** - Validation methods:
   - `validateMigration()` method
   - `validateEntity()` method
   - `validateDataIntegrity()` method
   - `saveValidationReport()` method
   - `generateSampleData()` method

5. **run-v1-to-v2-migration.js** - CLI interface
6. **test-migration.js** - Testing script
7. **check-v1-schema.js** - Schema inspection tool

## Setup Instructions

To complete the migration system setup, you need to merge all the methods into the main `V1toV2Migration.js` file.

### Option 1: Manual Merge

1. Open `V1toV2Migration.js`
2. Before the closing `}` and `module.exports` line, add all methods from:
   - `V1toV2Migration-part2.js`
   - `V1toV2Migration-part3.js`
   - `V1toV2Migration-validation.js`

### Option 2: Use the Combined File

Create a new file `V1toV2Migration-complete.js` with all methods combined, then rename it to replace the original.

## Required Methods

The complete V1toV2Migration class should have these methods:

### Core Migration Methods
- ✅ `migrateSchoolConfig()` - Migrate school configuration
- ✅ `migrateClasses()` - Migrate classes
- ✅ `migrateStudents()` - Migrate students (in part2.js)
- ✅ `migrateStaff()` - Migrate staff (in part2.js)
- ✅ `migrateGuardians()` - Migrate guardians (in part2.js)
- ✅ `migrateSubjects()` - Migrate subjects (in part3.js)
- ✅ `migrateAttendance()` - Migrate attendance (in part3.js)
- ✅ `migrateMarks()` - Migrate marks (in part3.js)
- ✅ `migrateFinancialRecords()` - Migrate financial records (in part3.js)

### Orchestration Methods
- ✅ `runAllMigrations()` - Run all migrations in sequence (in part3.js)
- ✅ `rollback()` - Rollback all migrations (in part3.js)

### Validation Methods
- ✅ `validateMigration()` - Validate migration results (in validation.js)
- ✅ `validateEntity()` - Validate single entity (in validation.js)
- ✅ `validateDataIntegrity()` - Check data integrity (in validation.js)
- ✅ `saveValidationReport()` - Save validation report (in validation.js)

### Testing Methods
- ✅ `generateSampleData()` - Generate sample V1 data (in validation.js)

### Utility Methods
- ✅ `log()` - Log migration events
- ✅ `logError()` - Log errors
- ✅ `generateReport()` - Generate migration report
- ✅ `saveMigrationLog()` - Save migration log
- ✅ `close()` - Close database connection

## Quick Start (Without Merging)

Until the files are merged, you can use the migration system by:

1. **Check V1 Schema:**
   ```bash
   node backend/database/check-v1-schema.js
   ```

2. **Run Dry Run:**
   ```bash
   node backend/database/test-migration.js dry-run
   ```

3. **Generate Sample Data:**
   ```bash
   # Manually run SQL or use the generateSampleData method
   ```

4. **Run Individual Migrations:**
   ```bash
   node backend/database/run-v1-to-v2-migration.js school-config
   node backend/database/run-v1-to-v2-migration.js classes
   ```

## Next Steps

1. Merge all part files into main V1toV2Migration.js
2. Test with sample data
3. Run validation
4. Execute pilot migration on first school
5. Document any issues
6. Proceed with remaining schools

## Testing Checklist

- [ ] Generate sample V1 data
- [ ] Run migration on sample data
- [ ] Validate record counts
- [ ] Check data integrity
- [ ] Test rollback functionality
- [ ] Review migration logs
- [ ] Fix any errors
- [ ] Document migration process

## Important Notes

- Always backup database before migration
- Test on staging environment first
- Review validation reports carefully
- Keep migration logs for audit trail
- Document any custom transformations needed
