const express = require("express");
const router = express.Router();
const pool = require("../config/db");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const { getEndpointPath, API_ENDPOINTS } = require('../config/api.config');

// Configure multer for file uploads
const upload = multer({
  dest: "Uploads/",
  fileFilter: (req, file, cb) => {
    const allowedTypes = ["image/jpeg", "image/png", "video/mp4", "application/pdf"];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Invalid file type. Only JPEG, PNG, MP4, and PDF are allowed."));
    }
  },
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

// Ensure Uploads directory exists
const uploadDir = path.join(__dirname, "../Uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Helper function to check if a table exists and get its columns
const getTableColumns = async (tableName) => {
  try {
    const result = await pool.query(
      `SELECT column_name FROM information_schema.columns WHERE table_schema = 'classes_schema' AND table_name = $1`,
      [tableName]
    );
    return result.rows.map(row => row.column_name);
  } catch (error) {
    console.error(`Error fetching columns for table ${tableName}:`, error);
    return [];
  }
};

// Get all class names, excluding school_student_count
router.get("/classes", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'classes_schema'
    `);
    const classes = result.rows.map(row => row.table_name);
    res.json(classes);
  } catch (error) {
    console.error("Error fetching classes:", error);
    res.status(500).json({ error: "Failed to fetch classes", details: error.message });
  }
});

// Get students for a specific class - returns ALL columns including password fields
router.get("/students/:className", async (req, res) => {
  const { className } = req.params;
  const { includeInactive, studentType } = req.query; // Add query parameters for filtering
  
  try {
    // Validate className to prevent SQL injection and ensure it's a valid table name
    const validTableName = /^[a-zA-Z0-9_]+$/.test(className);
    if (!validTableName) {
      return res.status(400).json({ error: "Invalid class name provided." });
    }

    // Check which columns exist
    const columnCheck = await pool.query(
      `SELECT column_name FROM information_schema.columns 
       WHERE table_schema = 'classes_schema' AND table_name = $1 
       AND column_name IN ('is_active', 'is_kg', 'is_evening_class', 'student_type')`,
      [className]
    );
    
    const existingColumns = columnCheck.rows.map(row => row.column_name);
    const hasIsActive = existingColumns.includes('is_active');
    const hasStudentType = existingColumns.includes('student_type');
    const hasIsKg = existingColumns.includes('is_kg');
    const hasIsEvening = existingColumns.includes('is_evening_class');
    
    // Build query with filters
    let whereConditions = [];
    
    // Handle is_active filter
    if (hasIsActive) {
      if (includeInactive === 'true') {
        // Include all students (no filter)
      } else if (includeInactive === 'only') {
        whereConditions.push('is_active = FALSE');
      } else {
        // Only active students (default)
        whereConditions.push('(is_active = TRUE OR is_active IS NULL)');
      }
    }
    
    // Handle student type filter (KG, evening, regular)
    if (studentType && hasStudentType) {
      // studentType can be: 'kg', 'evening', 'kg_evening', 'regular'
      whereConditions.push(`student_type = '${studentType}'`);
    } else if (studentType === 'kg' && hasIsKg && !hasStudentType) {
      // Fallback to is_kg column if student_type doesn't exist
      whereConditions.push('is_kg = TRUE');
    } else if (studentType === 'evening' && hasIsEvening && !hasStudentType) {
      // Fallback to is_evening_class column if student_type doesn't exist
      whereConditions.push('is_evening_class = TRUE');
    }
    
    // Build final query
    let query = `SELECT * FROM classes_schema."${className}"`;
    if (whereConditions.length > 0) {
      query += ` WHERE ${whereConditions.join(' AND ')}`;
    }
    query += ' ORDER BY LOWER(student_name) ASC';
    
    const result = await pool.query(query);
    res.json(result.rows);
  } catch (error) {
    console.error(`Error fetching students for class ${className}:`, error);
    res.status(500).json({ error: `Failed to fetch students for class ${className}`, details: error.message });
  }
});

// Get single student data by school_id and class_id
router.get("/student/:className/:schoolId/:classId", async (req, res) => {
  const { className, schoolId, classId } = req.params;
  try {
    const validTableName = /^[a-zA-Z0-9_]+$/.test(className);
    if (!validTableName) {
      return res.status(400).json({ error: "Invalid class name provided." });
    }

    const result = await pool.query(
      `SELECT * FROM classes_schema."${className}" WHERE school_id = $1 AND class_id = $2 AND (is_active = TRUE OR is_active IS NULL)`,
      [schoolId, classId]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Student not found" });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error(`Error fetching student from class ${className}:`, error);
    res.status(500).json({ error: "Failed to fetch student", details: error.message });
  }
});

// Update student data with file upload support
router.put("/student/:className/:schoolId/:classId", upload.single("image_student"), async (req, res) => {
  const { className, schoolId, classId } = req.params;
  
  console.log('=== UPDATE STUDENT REQUEST ===');
  console.log('Class:', className, 'School ID:', schoolId, 'Class ID:', classId);
  console.log('Body:', req.body);
  console.log('File:', req.file);
  
  // Handle both JSON string format and direct FormData format
  let updates = {};
  if (req.body.updates) {
    updates = JSON.parse(req.body.updates);
  } else {
    // Direct FormData - use all body fields except file
    updates = { ...req.body };
  }
  
  console.log('Parsed updates:', updates);
  
  const file = req.file;

  try {
    const validTableName = /^[a-zA-Z0-9_]+$/.test(className);
    if (!validTableName) {
      return res.status(400).json({ error: "Invalid class name provided." });
    }

    // Prepare update fields
    const fields = { ...updates };
    if (file) {
      fields.image_student = file.filename;
    }

    // Remove school_id and class_id from updates to avoid modifying primary keys
    delete fields.school_id;
    delete fields.class_id;

    // Validate smachine_id uniqueness across ALL classes if being updated
    if (fields.smachine_id) {
      // Check global tracker table first (most reliable)
      try {
        const globalCheck = await pool.query(
          'SELECT student_name, class_name, school_id, class_id FROM school_schema_points.global_machine_ids WHERE smachine_id = $1',
          [fields.smachine_id]
        );
        
        // Check if machine ID exists and belongs to a different student
        if (globalCheck.rows.length > 0) {
          const existing = globalCheck.rows[0];
          // Allow if it's the same student being updated (convert to strings for comparison)
          if (String(existing.school_id) !== String(schoolId) || String(existing.class_id) !== String(classId)) {
            return res.status(400).json({ 
              error: `Machine ID ${fields.smachine_id} already added. This ID is used by student "${existing.student_name}" in ${existing.class_name}.`
            });
          }
        }
      } catch (err) {
        // Tracker table might not exist, fall back to checking all classes
      }
      
      // Fallback: Check all class tables
      const allClasses = (await pool.query(
        'SELECT table_name FROM information_schema.tables WHERE table_schema = $1',
        ['classes_schema']
      )).rows.map(row => row.table_name);
      
      for (const cls of allClasses) {
        const existingMachineId = await pool.query(
          `SELECT student_name, class, school_id, class_id FROM classes_schema."${cls}" WHERE smachine_id = $1`,
          [fields.smachine_id]
        );
        
        // Check if machine ID exists and belongs to a different student
        if (existingMachineId.rows.length > 0) {
          const existing = existingMachineId.rows[0];
          // Allow if it's the same student being updated (convert to strings for comparison)
          if (String(existing.school_id) !== String(schoolId) || String(existing.class_id) !== String(classId)) {
            return res.status(400).json({ 
              error: `Machine ID ${fields.smachine_id} already added. This ID is used by student "${existing.student_name}" in ${existing.class}.`
            });
          }
        }
      }
    }

    if (Object.keys(fields).length === 0) {
      return res.status(400).json({ error: "No fields provided to update" });
    }

    // Build query
    const columns = Object.keys(fields)
      .map((key, index) => `"${key}" = $${index + 1}`)
      .join(", ");
    const values = Object.entries(fields).map(([key, value]) => {
      if (value === "null" || value === null) return null;
      if (key === "age") return parseInt(value, 10);
      if (key.includes("date")) return value; // Handle date fields
      return value.toString();
    });

    const result = await pool.query(
      `UPDATE classes_schema."${className}" SET ${columns} WHERE school_id = $${Object.keys(fields).length + 1} AND class_id = $${Object.keys(fields).length + 2} RETURNING *`,
      [...values, schoolId, classId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Student not found" });
    }

    // Update global machine ID tracker if smachine_id was changed
    if (fields.smachine_id) {
      try {
        // First, delete any old machine ID entries for this student
        await pool.query(`
          DELETE FROM school_schema_points.global_machine_ids 
          WHERE school_id = $1 AND class_id = $2
        `, [schoolId, classId]);
        
        // Then insert the new machine ID
        await pool.query(`
          INSERT INTO school_schema_points.global_machine_ids 
          (smachine_id, student_name, class_name, school_id, class_id)
          VALUES ($1, $2, $3, $4, $5)
          ON CONFLICT (smachine_id) DO UPDATE 
          SET student_name = EXCLUDED.student_name,
              class_name = EXCLUDED.class_name,
              school_id = EXCLUDED.school_id,
              class_id = EXCLUDED.class_id,
              updated_at = CURRENT_TIMESTAMP
        `, [
          fields.smachine_id, 
          result.rows[0].student_name, 
          className, 
          schoolId, 
          classId
        ]);
      } catch (err) {
        // Tracker table might not exist yet, that's okay
        console.log('Note: Global machine ID tracker not available:', err.message);
      }
    }

    // Delete old file if a new one was uploaded
    if (file && updates.image_student && updates.image_student !== file.filename) {
      const oldFilePath = path.join(uploadDir, updates.image_student);
      if (fs.existsSync(oldFilePath)) {
        fs.unlinkSync(oldFilePath);
      }
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error(`Error updating student in class ${className}:`, error);
    res.status(500).json({ error: "Failed to update student", details: error.message });
  }
});

// Delete student
router.delete("/student/:className/:schoolId/:classId", async (req, res) => {
  const { className, schoolId, classId } = req.params;
  try {
    const validTableName = /^[a-zA-Z0-9_]+$/.test(className);
    if (!validTableName) {
      return res.status(400).json({ error: "Invalid class name provided." });
    }

    const result = await pool.query(
      `DELETE FROM classes_schema."${className}" WHERE school_id = $1 AND class_id = $2 RETURNING *`,
      [schoolId, classId]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Student not found" });
    }
    // Delete associated image file if it exists
    if (result.rows[0].image_student) {
      const filePath = path.join(__dirname, "../Uploads", result.rows[0].image_student);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }
    res.json({ message: "Student deleted successfully" });
  } catch (error) {
    console.error(`Error deleting student from class ${className}:`, error);
    res.status(500).json({ error: "Failed to delete student", details: error.message });
  }
});

// DEACTIVATE/ACTIVATE STUDENT (HIDE FROM ALL SYSTEM LISTS)
router.put('/toggle-active/:className/:schoolId/:classId', async (req, res) => {
  const { className, schoolId, classId } = req.params;
  const { is_active } = req.body;
  
  if (typeof is_active !== 'boolean') {
    return res.status(400).json({ error: 'is_active must be a boolean value' });
  }
  
  // Validate className
  const validTableName = /^[a-zA-Z0-9_]+$/.test(className);
  if (!validTableName) {
    return res.status(400).json({ error: 'Invalid class name provided' });
  }
  
  try {
    // Check if is_active column exists, if not add it
    const columnCheck = await pool.query(
      `SELECT column_name FROM information_schema.columns 
       WHERE table_schema = 'classes_schema' AND table_name = $1 AND column_name = 'is_active'`,
      [className]
    );
    
    if (columnCheck.rowCount === 0) {
      // Add is_active column with default TRUE
      await pool.query(
        `ALTER TABLE classes_schema."${className}" 
         ADD COLUMN is_active BOOLEAN DEFAULT TRUE`
      );
      console.log(`Added is_active column to classes_schema.${className}`);
    }
    
    // Update the student
    const updateResult = await pool.query(
      `UPDATE classes_schema."${className}" 
       SET is_active = $1 
       WHERE school_id = $2 AND class_id = $3 
       RETURNING *`,
      [is_active, schoolId, classId]
    );
    
    if (updateResult.rowCount === 0) {
      return res.status(404).json({ error: 'Student not found' });
    }
    
    res.json({
      success: true,
      message: is_active 
        ? 'Student activated successfully - now visible in all system lists' 
        : 'Student deactivated successfully - now hidden from all system lists but data preserved',
      data: updateResult.rows[0]
    });
    
  } catch (error) {
    console.error('Error toggling student active status:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// TOGGLE FREE STUDENT (MARK AS LEARNING FOR FREE / SCHOLARSHIP)
router.put('/toggle-free/:className/:schoolId/:classId', async (req, res) => {
  const { className, schoolId, classId } = req.params;
  const { is_free, exemption_type, exemption_reason } = req.body;
  
  if (typeof is_free !== 'boolean') {
    return res.status(400).json({ error: 'is_free must be a boolean value' });
  }
  
  // Validate className
  const validTableName = /^[a-zA-Z0-9_]+$/.test(className);
  if (!validTableName) {
    return res.status(400).json({ error: 'Invalid class name provided' });
  }
  
  // If marking as free, require exemption type
  if (is_free && !exemption_type) {
    return res.status(400).json({ error: 'exemption_type is required when marking student as free' });
  }
  
  try {
    // Check if columns exist, if not add them
    const columnCheck = await pool.query(
      `SELECT column_name FROM information_schema.columns 
       WHERE table_schema = 'classes_schema' AND table_name = $1 
       AND column_name IN ('is_free', 'exemption_type', 'exemption_reason')`,
      [className]
    );
    
    const existingColumns = columnCheck.rows.map(row => row.column_name);
    
    if (!existingColumns.includes('is_free')) {
      await pool.query(
        `ALTER TABLE classes_schema."${className}" 
         ADD COLUMN is_free BOOLEAN DEFAULT FALSE`
      );
      console.log(`Added is_free column to classes_schema.${className}`);
    }
    
    if (!existingColumns.includes('exemption_type')) {
      await pool.query(
        `ALTER TABLE classes_schema."${className}" 
         ADD COLUMN exemption_type VARCHAR(50) DEFAULT NULL`
      );
      console.log(`Added exemption_type column to classes_schema.${className}`);
    }
    
    if (!existingColumns.includes('exemption_reason')) {
      await pool.query(
        `ALTER TABLE classes_schema."${className}" 
         ADD COLUMN exemption_reason TEXT DEFAULT NULL`
      );
      console.log(`Added exemption_reason column to classes_schema.${className}`);
    }
    
    // Update the student
    const updateResult = await pool.query(
      `UPDATE classes_schema."${className}" 
       SET is_free = $1, exemption_type = $2, exemption_reason = $3
       WHERE school_id = $4 AND class_id = $5 
       RETURNING *`,
      [is_free, is_free ? exemption_type : null, is_free ? exemption_reason : null, schoolId, classId]
    );
    
    if (updateResult.rowCount === 0) {
      return res.status(404).json({ error: 'Student not found' });
    }
    
    res.json({
      success: true,
      message: is_free 
        ? `Student marked as learning for free (${exemption_type})` 
        : 'Student marked as paying student',
      data: updateResult.rows[0]
    });
    
  } catch (error) {
    console.error('Error toggling student free status:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;