const pool = require('../config/db');
const csv = require('csv-parser');
const fs = require('fs');

class AASImportService {
  /**
   * Import attendance from AAS 6.0 CSV export
   * @param {string} filePath - Path to uploaded CSV file
   * @returns {Promise<Object>} Import result
   */
  async importFromCSV(filePath) {
    const results = [];
    const errors = [];
    let recordsProcessed = 0;
    let recordsSaved = 0;
    let unmappedStaffCodes = new Set();

    try {
      // Read and parse CSV
      await new Promise((resolve, reject) => {
        fs.createReadStream(filePath)
          .pipe(csv())
          .on('data', (row) => {
            results.push(row);
          })
          .on('end', resolve)
          .on('error', reject);
      });

      console.log(`Parsed ${results.length} rows from CSV`);

      // Process each row
      for (const row of results) {
        try {
          const staffCode = row['Staff Code']?.trim();
          const name = row['Name']?.trim();
          const date = row['Date']?.trim();
          const department = row['Department']?.trim();

          if (!staffCode || !date) {
            continue; // Skip rows without essential data
          }

          recordsProcessed++;

          // Find person by machine user ID (staff code)
          const mappingResult = await pool.query(
            'SELECT person_id, person_type FROM user_machine_mapping WHERE machine_user_id = $1',
            [parseInt(staffCode)]
          );

          if (mappingResult.rows.length === 0) {
            unmappedStaffCodes.add(staffCode);
            continue;
          }

          const { person_id, person_type } = mappingResult.rows[0];

          // Parse date (format: M/D/YYYY)
          const parsedDate = this.parseDate(date);
          if (!parsedDate) {
            errors.push(`Invalid date format for ${name}: ${date}`);
            continue;
          }

          // Extract all check-in times (Time1 through Time12)
          const times = [];
          for (let i = 1; i <= 12; i++) {
            const timeKey = `Time${i}`;
            const timeValue = row[timeKey]?.trim();
            if (timeValue) {
              times.push(timeValue);
            }
          }

          // If there are check-in times, create attendance record
          if (times.length > 0) {
            // Use first check-in time as the attendance timestamp
            const firstCheckIn = times[0];
            const timestamp = this.combineDateTime(parsedDate, firstCheckIn);

            // Insert attendance record
            await pool.query(
              `INSERT INTO dual_mode_attendance 
               (person_id, person_type, date, status, source_type, source_machine_ip, timestamp)
               VALUES ($1, $2, $3, 'present', 'machine', 'AAS6.0', $4)
               ON CONFLICT DO NOTHING`,
              [person_id, person_type, parsedDate, timestamp]
            );

            recordsSaved++;
          }

        } catch (error) {
          console.error('Error processing row:', error);
          errors.push(`Error processing ${row['Name']}: ${error.message}`);
        }
      }

      // Log import operation
      await pool.query(
        `INSERT INTO attendance_audit_log (operation_type, performed_by, details)
         VALUES ('machine_sync', 'system', $1)`,
        [JSON.stringify({
          source: 'AAS6.0_CSV',
          recordsProcessed,
          recordsSaved,
          unmappedStaffCodes: Array.from(unmappedStaffCodes),
          errors: errors.slice(0, 10) // Limit errors in log
        })]
      );

      return {
        success: true,
        recordsProcessed,
        recordsSaved,
        unmappedStaffCodes: Array.from(unmappedStaffCodes),
        errors
      };

    } catch (error) {
      console.error('CSV import failed:', error);
      return {
        success: false,
        recordsProcessed: 0,
        recordsSaved: 0,
        unmappedStaffCodes: [],
        errors: [error.message]
      };
    } finally {
      // Clean up uploaded file
      try {
        fs.unlinkSync(filePath);
      } catch (e) {
        console.error('Error deleting temp file:', e);
      }
    }
  }

  /**
   * Parse date from M/D/YYYY format
   * @param {string} dateStr - Date string
   * @returns {string|null} ISO date string (YYYY-MM-DD)
   */
  parseDate(dateStr) {
    try {
      const parts = dateStr.split('/');
      if (parts.length !== 3) return null;

      const month = parts[0].padStart(2, '0');
      const day = parts[1].padStart(2, '0');
      const year = parts[2];

      return `${year}-${month}-${day}`;
    } catch (error) {
      return null;
    }
  }

  /**
   * Combine date and time into timestamp
   * @param {string} date - ISO date (YYYY-MM-DD)
   * @param {string} time - Time (HH:MM)
   * @returns {string} ISO timestamp
   */
  combineDateTime(date, time) {
    return `${date}T${time}:00`;
  }

  /**
   * Get unmapped staff codes from recent imports
   * @returns {Promise<Array>} List of unmapped staff codes
   */
  async getUnmappedStaffCodes() {
    try {
      const result = await pool.query(
        `SELECT details->>'unmappedStaffCodes' as codes
         FROM attendance_audit_log
         WHERE operation_type = 'machine_sync'
         AND details->>'source' = 'AAS6.0_CSV'
         ORDER BY timestamp DESC
         LIMIT 10`
      );

      const allCodes = new Set();
      result.rows.forEach(row => {
        if (row.codes) {
          try {
            const codes = JSON.parse(row.codes);
            codes.forEach(code => allCodes.add(code));
          } catch (e) {}
        }
      });

      return Array.from(allCodes);
    } catch (error) {
      console.error('Error getting unmapped codes:', error);
      return [];
    }
  }
}

module.exports = new AASImportService();
