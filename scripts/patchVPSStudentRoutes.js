const fs = require('fs');

function patchFile(filePath) {
  if (!fs.existsSync(filePath)) {
    console.log(`File not found: ${filePath}`);
    return false;
  }

  let content = fs.readFileSync(filePath, 'utf8');

  // 1. Patch the student grouping to normalize keys
  const groupTarget = `    // Group students by their class from Excel
    const studentsByClass = {};
    students.forEach((student, index) => {
      const targetClass = student.class || className; // Use class from Excel, fallback to selected class
      if (!studentsByClass[targetClass]) {
        studentsByClass[targetClass] = [];
      }
      studentsByClass[targetClass].push({ ...student, originalIndex: index });
    });`;

  const groupReplacement = `    // Group students by their class from Excel
    const studentsByClass = {};
    students.forEach((student, index) => {
      // Normalize raw row keys
      const normalizedStudent = {};
      Object.entries(student || {}).forEach(([k, v]) => {
        const cleanKey = k.trim().toLowerCase().replace(/\\s+/g, '_');
        normalizedStudent[cleanKey] = v;
      });

      // Map common aliases
      if (!normalizedStudent.student_name && (normalizedStudent.name || normalizedStudent.full_name || normalizedStudent.student)) {
        normalizedStudent.student_name = normalizedStudent.name || normalizedStudent.full_name || normalizedStudent.student;
      }
      if (!normalizedStudent.guardian_name && (normalizedStudent.parent_name || normalizedStudent.father_name || normalizedStudent.guardian)) {
        normalizedStudent.guardian_name = normalizedStudent.parent_name || normalizedStudent.father_name || normalizedStudent.guardian;
      }
      if (!normalizedStudent.guardian_phone && (normalizedStudent.phone || normalizedStudent.phone_number || normalizedStudent.parent_phone || normalizedStudent.guardian_mobile)) {
        normalizedStudent.guardian_phone = normalizedStudent.phone || normalizedStudent.phone_number || normalizedStudent.parent_phone || normalizedStudent.guardian_mobile;
      }
      if (!normalizedStudent.guardian_relation && (normalizedStudent.relation || normalizedStudent.relationship)) {
        normalizedStudent.guardian_relation = normalizedStudent.relation || normalizedStudent.relationship;
      }

      const targetClass = normalizedStudent.class || student.class || className; // Use class from Excel, fallback to selected class
      if (!studentsByClass[targetClass]) {
        studentsByClass[targetClass] = [];
      }
      studentsByClass[targetClass].push({ ...student, ...normalizedStudent, originalIndex: index });
    });`;

  // Standardize CRLF to LF for matching
  const isCRLF = content.includes('\r\n');
  const normalizedContent = content.replace(/\r\n/g, '\n');
  const normGroupTarget = groupTarget.replace(/\r\n/g, '\n');

  let updated = normalizedContent;

  if (updated.includes(normGroupTarget)) {
    updated = updated.replace(normGroupTarget, groupReplacement.replace(/\r\n/g, '\n'));
    console.log(`[${filePath}] Successfully patched grouping block.`);
  } else {
    console.log(`[${filePath}] Note: Group target not matched directly, checking if already patched...`);
  }

  // 2. Patch validation & age parsing & custom columns
  const validationSearchStart = '          // Validate required fields\n          if (!studentData.student_name || !studentData.age || !studentData.gender) {';
  const customColsSearchEnd = '          // Insert student\n          const columns = Object.keys(insertData).filter(key => validColumns.includes(key));';

  const startIndex = updated.indexOf(validationSearchStart);
  const endIndex = updated.indexOf(customColsSearchEnd);

  if (startIndex !== -1 && endIndex !== -1 && endIndex > startIndex) {
    const toReplace = updated.substring(startIndex, endIndex);

    const newLogic = `          // Validate required fields
          if (!studentData.student_name) {
            results.failedCount++;
            results.errors.push({
              row: i + 2, // +2 because Excel is 1-indexed and has header row
              class: targetClass,
              error: 'Missing required field: student_name'
            });
            continue;
          }

          // Safe Age parsing (guaranteed integer, prevents NaN)
          let parsedAge = null;
          if (studentData.age !== undefined && studentData.age !== null) {
            if (typeof studentData.age === 'number' && !isNaN(studentData.age)) {
              parsedAge = Math.floor(studentData.age);
            } else {
              const ageStr = String(studentData.age).trim();
              if (ageStr && !['nan', 'n/a', 'none', 'null', '-'].includes(ageStr.toLowerCase())) {
                const match = ageStr.match(/\\d+/);
                if (match) {
                  parsedAge = parseInt(match[0], 10);
                }
              }
            }
          }

          // If age is invalid or <= 0, default based on class
          if (parsedAge === null || isNaN(parsedAge) || parsedAge <= 0 || parsedAge > 35) {
            const isKG = String(targetClass || '').toUpperCase().includes('KG');
            parsedAge = isKG ? 4 : 7;
          }

          // Safe Gender parsing
          let gender = studentData.gender;
          if (gender) {
            const gLower = String(gender).trim().toLowerCase();
            if (gLower.startsWith('m')) gender = 'Male';
            else if (gLower.startsWith('f')) gender = 'Female';
            else gender = String(gender).trim();
          } else {
            gender = 'Male';
          }

          // Safe Guardian info with fallbacks
          const finalGuardianName = studentData.guardian_name ? String(studentData.guardian_name).trim() : \`\${studentData.student_name}'s Guardian\`;
          const guardianPhone = studentData.guardian_phone ? String(studentData.guardian_phone).trim() : '0000000000';
          const guardianRelation = studentData.guardian_relation ? String(studentData.guardian_relation).trim() : 'Parent';

          // Get and increment global school_id
          const globalIdResult = await client.query(\`
            UPDATE school_schema_points.global_id_tracker 
            SET last_school_id = last_school_id + 1, updated_at = CURRENT_TIMESTAMP
            RETURNING last_school_id
          \`);
          const newSchoolId = globalIdResult.rows[0].last_school_id;
          
          // Increment class_id for this specific class
          currentClassId++;
          
          // Generate student credentials
          const studentUsername = \`\${String(studentData.student_name).toLowerCase().replace(/\\s/g, '')}_\${Math.floor(Math.random() * 10000)}\`;
          const studentPassword = uuidv4().slice(0, 8);
          
          // Check if guardian already exists by phone number across all classes
          let guardianUsername, guardianPassword, guardianName;
          let guardianFound = false;
          
          // Search for existing guardian in all available classes
          for (const cls of availableClasses) {
            try {
              const existingGuardianQuery = \`
                SELECT guardian_username, guardian_password, guardian_name 
                FROM classes_schema."\${cls}" 
                WHERE guardian_phone = $1 
                LIMIT 1
              \`;
              const existingGuardianResult = await client.query(existingGuardianQuery, [guardianPhone]);
              
              if (existingGuardianResult.rows.length > 0) {
                // Guardian exists - reuse credentials and name
                guardianUsername = existingGuardianResult.rows[0].guardian_username;
                guardianPassword = existingGuardianResult.rows[0].guardian_password;
                guardianName = existingGuardianResult.rows[0].guardian_name;
                guardianFound = true;
                break;
              }
            } catch (err) {
              // Skip if table doesn't have guardian columns
              continue;
            }
          }
          
          if (!guardianFound) {
            // New guardian - create credentials
            guardianUsername = \`\${finalGuardianName.toLowerCase().replace(/\\s/g, '')}_\${Math.floor(Math.random() * 10000)}\`;
            guardianPassword = uuidv4().slice(0, 8);
            guardianName = finalGuardianName;
          }
          
          // Build insert data
          const insertData = {
            school_id: newSchoolId,
            class_id: currentClassId,
            student_name: String(studentData.student_name).trim(),
            age: parsedAge,
            gender: gender,
            class: targetClass,
            username: studentUsername,
            password: studentPassword,
            guardian_name: guardianName,
            guardian_phone: guardianPhone,
            guardian_relation: guardianRelation,
            guardian_username: guardianUsername,
            guardian_password: guardianPassword
          };
          
          // Validate and add smachine_id if provided
          if (studentData.smachine_id) {
            // Check global tracker table first (most reliable)
            try {
              const globalCheck = await client.query(
                'SELECT student_name, class_name FROM school_schema_points.global_machine_ids WHERE smachine_id = $1',
                [studentData.smachine_id]
              );
              
              if (globalCheck.rows.length > 0) {
                results.failedCount++;
                results.errors.push({
                  row: i + 2,
                  class: targetClass,
                  student: studentData.student_name || 'Unknown',
                  error: \`Machine ID \${studentData.smachine_id} already added. This ID is used by student "\${globalCheck.rows[0].student_name}" in \${globalCheck.rows[0].class_name}.\`
                });
                continue; // Skip this student
              }
            } catch (err) {
              // Tracker table might not exist, fall back to checking all classes
            }
            
            // Fallback: Check if smachine_id already exists in ANY class
            let machineIdExists = false;
            let existingStudent = null;
            
            for (const cls of availableClasses) {
              try {
                const existingMachineId = await client.query(
                  \`SELECT student_name, class FROM classes_schema."\${cls}" WHERE smachine_id = $1\`,
                  [studentData.smachine_id]
                );
                
                if (existingMachineId.rows.length > 0) {
                  machineIdExists = true;
                  existingStudent = existingMachineId.rows[0];
                  break;
                }
              } catch (err) {
                // Skip if table doesn't have smachine_id column
                continue;
              }
            }
            
            if (machineIdExists) {
              results.failedCount++;
              results.errors.push({
                row: i + 2,
                class: targetClass,
                student: studentData.student_name || 'Unknown',
                error: \`Machine ID \${studentData.smachine_id} already added. This ID is used by student "\${existingStudent.student_name}" in \${existingStudent.class}.\`
              });
              continue; // Skip this student
            }
            
            insertData.smachine_id = studentData.smachine_id;
          }
          
          // System columns that must NEVER be imported from Excel
          const SYSTEM_COLUMNS = ['id', 'school_id', 'class_id'];

          // Process custom fields based on their data types
          Object.keys(studentData).forEach(key => {
            const lowerKey = key.trim().toLowerCase();
            if (SYSTEM_COLUMNS.includes(lowerKey) || SYSTEM_COLUMNS.includes(key)) {
              return; // Skip id, school_id, class_id
            }

            if (validColumns.includes(key) && !insertData.hasOwnProperty(key)) {
              const rawVal = studentData[key];
              const dataType = columnTypes[key];

              if (rawVal === undefined || rawVal === null || rawVal === '' || 
                  ['nan', 'n/a', 'null', 'undefined', '-'].includes(String(rawVal).trim().toLowerCase())) {
                insertData[key] = null;
                return;
              }

              switch (dataType) {
                case 'integer':
                case 'smallint':
                case 'bigint': {
                  const cleaned = String(rawVal).replace(/[^0-9-]/g, '');
                  const num = cleaned ? parseInt(cleaned, 10) : null;
                  insertData[key] = (num === null || isNaN(num)) ? null : num;
                  break;
                }
                case 'numeric':
                case 'real':
                case 'double precision': {
                  const cleaned = String(rawVal).replace(/[^0-9.-]/g, '');
                  const flt = cleaned ? parseFloat(cleaned) : null;
                  insertData[key] = (flt === null || isNaN(flt)) ? null : flt;
                  break;
                }
                case 'boolean': {
                  const str = String(rawVal).trim().toLowerCase();
                  insertData[key] = (str === 'true' || str === '1' || str === 'yes' || rawVal === true);
                  break;
                }
                case 'date': {
                  insertData[key] = rawVal || null;
                  break;
                }
                default:
                  insertData[key] = String(rawVal).trim();
              }
            }
          });\n\n          `;

    updated = updated.substring(0, startIndex) + newLogic + updated.substring(endIndex);
    console.log(`[${filePath}] Successfully patched validation, age parsing, and custom columns!`);
  } else {
    console.log(`[${filePath}] Could not find validation/custom columns region. (startIndex: ${startIndex}, endIndex: ${endIndex})`);
    return false;
  }

  // Backup original file
  fs.copyFileSync(filePath, `${filePath}.bak_${Date.now()}`);

  const finalOutput = isCRLF ? updated.replace(/\n/g, '\r\n') : updated;
  fs.writeFileSync(filePath, finalOutput, 'utf8');
  console.log(`[${filePath}] Saved updated file successfully!`);
  return true;
}

const targetFiles = process.argv.slice(2);
if (targetFiles.length === 0) {
  console.log('Usage: node patchVPSStudentRoutes.js <filePath1> <filePath2> ...');
  process.exit(1);
}

targetFiles.forEach(f => patchFile(f));
