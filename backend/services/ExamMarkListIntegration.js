/**
 * Exam Mark List Integration Service
 * 
 * This service integrates AI exam results with the existing mark list system.
 * It automatically adds exam marks to the appropriate mark list component.
 * 
 * @module ExamMarkListIntegration
 */

class ExamMarkListIntegration {
  constructor(pool) {
    this.pool = pool;
  }

  /**
   * Add exam marks to mark list
   * 
   * @param {number} examId - The exam ID
   * @param {Object} examData - Exam data (class, subject, term, component)
   * @param {Array} studentResults - Array of student exam results
   * @returns {Promise<Object>} - Integration result
   */
  async addExamMarksToMarkList(examId, examData, studentResults) {
    const client = await this.pool.connect();
    
    try {
      await client.query('BEGIN');

      const { class_id, subject_id, term, component } = examData;

      // Get class name
      const classResult = await client.query(
        'SELECT class_name FROM classes WHERE id = $1',
        [class_id]
      );

      if (classResult.rows.length === 0) {
        throw new Error(`Class not found: ${class_id}`);
      }

      const className = classResult.rows[0].class_name.toLowerCase();

      // Get subject name
      const subjectResult = await client.query(
        'SELECT subject_name FROM subjects WHERE id = $1',
        [subject_id]
      );

      if (subjectResult.rows.length === 0) {
        throw new Error(`Subject not found: ${subject_id}`);
      }

      const subjectName = subjectResult.rows[0].subject_name;

      // Extract term number from term string (e.g., "Term 1" -> 1)
      const termNumber = this.extractTermNumber(term);

      // Get mark list schema and table names
      const schemaName = `subject_${subjectName.toLowerCase().replace(/[\s\-\.]+/g, '_')}_schema`;
      const tableName = `${className}_term_${termNumber}`;

      // Check if mark list exists
      const tableExists = await this.checkTableExists(client, schemaName, tableName);

      if (!tableExists) {
        throw new Error(`Mark list not found for ${subjectName} - ${className} - Term ${termNumber}`);
      }

      // Get form configuration
      const configResult = await client.query(
        `SELECT * FROM ${schemaName}.form_config WHERE class_name = $1 AND term_number = $2`,
        [className, termNumber]
      );

      if (configResult.rows.length === 0) {
        throw new Error('Form configuration not found');
      }

      const config = configResult.rows[0];

      // Check if marks are locked
      if (config.is_locked === true) {
        throw new Error(`Mark list is locked by ${config.locked_by} on ${config.locked_at}`);
      }

      // Find the component in mark_components
      const componentKey = component.toLowerCase().replace(/[\s\-\.]+/g, '_');
      const markComponent = config.mark_components.find(
        c => c.name.toLowerCase().replace(/[\s\-\.]+/g, '_') === componentKey
      );

      if (!markComponent) {
        throw new Error(`Component '${component}' not found in mark list configuration`);
      }

      const maxMark = markComponent.percentage;

      // Update marks for each student
      let successCount = 0;
      let failCount = 0;
      const errors = [];

      for (const result of studentResults) {
        try {
          // Get student record from mark list
          const studentQuery = `
            SELECT id FROM ${schemaName}.${tableName}
            WHERE student_id = $1
          `;
          const studentResult = await client.query(studentQuery, [result.student_id]);

          if (studentResult.rows.length === 0) {
            errors.push({
              student_id: result.student_id,
              error: 'Student not found in mark list'
            });
            failCount++;
            continue;
          }

          const markListRecordId = studentResult.rows[0].id;

          // Calculate mark as percentage of max mark
          const examPercentage = result.percentage || 0;
          const mark = (examPercentage / 100) * maxMark;

          // Update the component mark
          const updateQuery = `
            UPDATE ${schemaName}.${tableName}
            SET ${componentKey} = $1,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $2
          `;

          await client.query(updateQuery, [mark, markListRecordId]);

          // Recalculate total and pass status
          await this.recalculateTotalAndPassStatus(
            client,
            schemaName,
            tableName,
            markListRecordId,
            config
          );

          successCount++;

        } catch (error) {
          errors.push({
            student_id: result.student_id,
            error: error.message
          });
          failCount++;
        }
      }

      // Log the integration
      await this.logIntegration(client, examId, {
        schemaName,
        tableName,
        component: componentKey,
        successCount,
        failCount,
        errors
      });

      await client.query('COMMIT');

      return {
        success: true,
        message: 'Exam marks added to mark list successfully',
        successCount,
        failCount,
        errors: errors.length > 0 ? errors : undefined
      };

    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error adding exam marks to mark list:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Recalculate total marks and pass status for a student
   * 
   * @param {Object} client - Database client
   * @param {string} schemaName - Schema name
   * @param {string} tableName - Table name
   * @param {number} recordId - Mark list record ID
   * @param {Object} config - Form configuration
   * @returns {Promise<void>}
   */
  async recalculateTotalAndPassStatus(client, schemaName, tableName, recordId, config) {
    // Get current marks
    const marksQuery = `SELECT * FROM ${schemaName}.${tableName} WHERE id = $1`;
    const marksResult = await client.query(marksQuery, [recordId]);
    const marks = marksResult.rows[0];

    // Calculate total
    let total = 0;
    for (const component of config.mark_components) {
      const componentKey = component.name.toLowerCase().replace(/[\s\-\.]+/g, '_');
      const mark = parseFloat(marks[componentKey]) || 0;
      total += mark;
    }

    // Ensure total doesn't exceed 100
    total = Math.min(total, 100);

    // Determine pass status
    const passStatus = total >= config.pass_threshold ? 'Pass' : 'Fail';

    // Update total and pass status
    const updateQuery = `
      UPDATE ${schemaName}.${tableName}
      SET total = $1,
          pass_status = $2,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $3
    `;

    await client.query(updateQuery, [total, passStatus, recordId]);
  }

  /**
   * Extract term number from term string
   * 
   * @param {string} term - Term string (e.g., "Term 1", "1st Term", "Term One")
   * @returns {number} - Term number
   */
  extractTermNumber(term) {
    // Try to extract number from string
    const match = term.match(/\d+/);
    if (match) {
      return parseInt(match[0]);
    }

    // Handle word numbers
    const wordNumbers = {
      'one': 1, 'first': 1, '1st': 1,
      'two': 2, 'second': 2, '2nd': 2,
      'three': 3, 'third': 3, '3rd': 3,
      'four': 4, 'fourth': 4, '4th': 4
    };

    const lowerTerm = term.toLowerCase();
    for (const [word, number] of Object.entries(wordNumbers)) {
      if (lowerTerm.includes(word)) {
        return number;
      }
    }

    // Default to 1 if can't extract
    return 1;
  }

  /**
   * Check if a table exists
   * 
   * @param {Object} client - Database client
   * @param {string} schemaName - Schema name
   * @param {string} tableName - Table name
   * @returns {Promise<boolean>} - True if table exists
   */
  async checkTableExists(client, schemaName, tableName) {
    const query = `
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = $1 
        AND table_name = $2
      )
    `;

    const result = await client.query(query, [schemaName, tableName]);
    return result.rows[0].exists;
  }

  /**
   * Log the integration for audit purposes
   * 
   * @param {Object} client - Database client
   * @param {number} examId - Exam ID
   * @param {Object} details - Integration details
   * @returns {Promise<void>}
   */
  async logIntegration(client, examId, details) {
    // Create integration log table if it doesn't exist
    await client.query(`
      CREATE TABLE IF NOT EXISTS exam_marklist_integration_log (
        id SERIAL PRIMARY KEY,
        exam_id INTEGER NOT NULL,
        schema_name VARCHAR(255),
        table_name VARCHAR(255),
        component VARCHAR(100),
        success_count INTEGER DEFAULT 0,
        fail_count INTEGER DEFAULT 0,
        errors JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (exam_id) REFERENCES ai_exams(id) ON DELETE CASCADE
      )
    `);

    // Insert log entry
    const query = `
      INSERT INTO exam_marklist_integration_log (
        exam_id,
        schema_name,
        table_name,
        component,
        success_count,
        fail_count,
        errors
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
    `;

    await client.query(query, [
      examId,
      details.schemaName,
      details.tableName,
      details.component,
      details.successCount,
      details.failCount,
      JSON.stringify(details.errors || [])
    ]);
  }

  /**
   * Get integration log for an exam
   * 
   * @param {number} examId - Exam ID
   * @returns {Promise<Array>} - Integration log entries
   */
  async getIntegrationLog(examId) {
    const query = `
      SELECT * FROM exam_marklist_integration_log
      WHERE exam_id = $1
      ORDER BY created_at DESC
    `;

    const result = await this.pool.query(query, [examId]);
    return result.rows;
  }

  /**
   * Check if exam marks have been integrated
   * 
   * @param {number} examId - Exam ID
   * @returns {Promise<boolean>} - True if integrated
   */
  async isExamIntegrated(examId) {
    const query = `
      SELECT EXISTS (
        SELECT 1 FROM exam_marklist_integration_log
        WHERE exam_id = $1
      )
    `;

    const result = await this.pool.query(query, [examId]);
    return result.rows[0].exists;
  }
}

module.exports = ExamMarkListIntegration;
