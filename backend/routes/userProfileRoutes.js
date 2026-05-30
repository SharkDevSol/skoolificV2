const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const pool = require('../config/db');
const { authenticateWithBranch } = require('../middleware/branchAuth');
const { sanitizeInput } = require('../utils/sanitizer');
const { logPasswordChange } = require('../utils/logger');

/**
 * Password Strength Validation
 * Requirements:
 * - Minimum 8 characters
 * - At least one uppercase letter
 * - At least one lowercase letter
 * - At least one number
 * - At least one special character
 */
const validatePasswordStrength = (password) => {
  const minLength = 8;
  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecialChar = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password);

  const errors = [];

  if (password.length < minLength) {
    errors.push(`Password must be at least ${minLength} characters long`);
  }
  if (!hasUpperCase) {
    errors.push('Password must contain at least one uppercase letter');
  }
  if (!hasLowerCase) {
    errors.push('Password must contain at least one lowercase letter');
  }
  if (!hasNumber) {
    errors.push('Password must contain at least one number');
  }
  if (!hasSpecialChar) {
    errors.push('Password must contain at least one special character');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * Change Username for Admin Users
 * POST /api/user-profile/admin/change-username
 */
router.post('/admin/change-username', authenticateWithBranch, async (req, res) => {
  try {
    const { currentUsername, newUsername, password } = req.body;

    // Validate input
    if (!currentUsername || !newUsername || !password) {
      return res.status(400).json({ 
        error: 'All fields are required',
        success: false 
      });
    }

    // Sanitize inputs
    const sanitizedCurrentUsername = sanitizeInput(currentUsername);
    const sanitizedNewUsername = sanitizeInput(newUsername);

    // Find admin user
    const result = await pool.query(
      'SELECT id, password_hash FROM admin_users WHERE username = $1',
      [sanitizedCurrentUsername]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ 
        error: 'Admin user not found',
        success: false 
      });
    }

    const admin = result.rows[0];

    // Verify password
    const isValid = await bcrypt.compare(password, admin.password_hash);

    if (!isValid) {
      return res.status(401).json({ 
        error: 'Password is incorrect',
        success: false 
      });
    }

    // Check if new username already exists
    const existingUser = await pool.query(
      'SELECT id FROM admin_users WHERE username = $1 AND id != $2',
      [sanitizedNewUsername, admin.id]
    );

    if (existingUser.rows.length > 0) {
      return res.status(409).json({ 
        error: 'Username already exists',
        success: false 
      });
    }

    // Update username
    await pool.query(
      'UPDATE admin_users SET username = $1 WHERE id = $2',
      [sanitizedNewUsername, admin.id]
    );

    res.json({ 
      message: 'Username changed successfully',
      success: true,
      newUsername: sanitizedNewUsername
    });

  } catch (error) {
    console.error('Change username error (admin):', error);
    res.status(500).json({ 
      error: 'Server error while changing username',
      success: false 
    });
  }
});

/**
 * Change Password for Admin Users
 * POST /api/user-profile/admin/change-password
 */
router.post('/admin/change-password', authenticateWithBranch, async (req, res) => {
  try {
    const { username, currentPassword, newPassword } = req.body;

    // Validate input
    if (!username || !currentPassword || !newPassword) {
      return res.status(400).json({ 
        error: 'All fields are required',
        success: false 
      });
    }

    // Validate password strength
    const passwordValidation = validatePasswordStrength(newPassword);
    if (!passwordValidation.isValid) {
      return res.status(400).json({ 
        error: 'Password does not meet strength requirements',
        errors: passwordValidation.errors,
        success: false 
      });
    }

    // Sanitize username
    const sanitizedUsername = sanitizeInput(username);

    // Find admin user
    const result = await pool.query(
      'SELECT id, password_hash FROM admin_users WHERE username = $1',
      [sanitizedUsername]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ 
        error: 'Admin user not found',
        success: false 
      });
    }

    const admin = result.rows[0];

    // Verify current password
    const isValid = await bcrypt.compare(currentPassword, admin.password_hash);

    if (!isValid) {
      return res.status(401).json({ 
        error: 'Current password is incorrect',
        success: false 
      });
    }

    // Hash new password
    const saltRounds = 12;
    const newPasswordHash = await bcrypt.hash(newPassword, saltRounds);

    // Update password
    await pool.query(
      'UPDATE admin_users SET password_hash = $1 WHERE id = $2',
      [newPasswordHash, admin.id]
    );

    // Log password change
    logPasswordChange(sanitizedUsername, req.ip, true);

    res.json({ 
      message: 'Password changed successfully',
      success: true 
    });

  } catch (error) {
    console.error('Change password error (admin):', error);
    logPasswordChange(req.body.username, req.ip, false);
    res.status(500).json({ 
      error: 'Server error while changing password',
      success: false 
    });
  }
});

/**
 * Change Username for Staff Users
 * POST /api/user-profile/staff/change-username
 */
router.post('/staff/change-username', authenticateWithBranch, async (req, res) => {
  try {
    const { currentUsername, newUsername, password } = req.body;

    // Validate input
    if (!currentUsername || !newUsername || !password) {
      return res.status(400).json({ 
        error: 'All fields are required',
        success: false 
      });
    }

    // Sanitize inputs
    const sanitizedCurrentUsername = sanitizeInput(currentUsername);
    const sanitizedNewUsername = sanitizeInput(newUsername);

    // Find staff user
    const result = await pool.query(
      'SELECT id, global_staff_id, password_hash FROM staff_users WHERE username = $1',
      [sanitizedCurrentUsername]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ 
        error: 'Staff user not found',
        success: false 
      });
    }

    const staff = result.rows[0];

    // Verify password
    const isValid = await bcrypt.compare(password, staff.password_hash);

    if (!isValid) {
      return res.status(401).json({ 
        error: 'Password is incorrect',
        success: false 
      });
    }

    // Check if new username already exists
    const existingUser = await pool.query(
      'SELECT id FROM staff_users WHERE username = $1 AND id != $2',
      [sanitizedNewUsername, staff.id]
    );

    if (existingUser.rows.length > 0) {
      return res.status(409).json({ 
        error: 'Username already exists',
        success: false 
      });
    }

    // Update username
    await pool.query(
      'UPDATE staff_users SET username = $1 WHERE id = $2',
      [sanitizedNewUsername, staff.id]
    );

    res.json({ 
      message: 'Username changed successfully',
      success: true,
      newUsername: sanitizedNewUsername
    });

  } catch (error) {
    console.error('Change username error (staff):', error);
    res.status(500).json({ 
      error: 'Server error while changing username',
      success: false 
    });
  }
});

/**
 * Change Password for Staff Users
 * POST /api/user-profile/staff/change-password
 */
router.post('/staff/change-password', authenticateWithBranch, async (req, res) => {
  try {
    const { username, currentPassword, newPassword } = req.body;

    // Validate input
    if (!username || !currentPassword || !newPassword) {
      return res.status(400).json({ 
        error: 'All fields are required',
        success: false 
      });
    }

    // Validate password strength
    const passwordValidation = validatePasswordStrength(newPassword);
    if (!passwordValidation.isValid) {
      return res.status(400).json({ 
        error: 'Password does not meet strength requirements',
        errors: passwordValidation.errors,
        success: false 
      });
    }

    // Sanitize username
    const sanitizedUsername = sanitizeInput(username);

    // Find staff user
    const result = await pool.query(
      'SELECT id, global_staff_id, password_hash FROM staff_users WHERE username = $1',
      [sanitizedUsername]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ 
        error: 'Staff user not found',
        success: false 
      });
    }

    const staff = result.rows[0];

    // Verify current password
    const isValid = await bcrypt.compare(currentPassword, staff.password_hash);

    if (!isValid) {
      return res.status(401).json({ 
        error: 'Current password is incorrect',
        success: false 
      });
    }

    // Hash new password
    const saltRounds = 12;
    const newPasswordHash = await bcrypt.hash(newPassword, saltRounds);

    // Update password (also update password_plain for admin viewing)
    await pool.query(
      'UPDATE staff_users SET password_hash = $1, password_plain = $2 WHERE id = $3',
      [newPasswordHash, newPassword, staff.id]
    );

    // Log password change
    logPasswordChange(sanitizedUsername, req.ip, true);

    res.json({ 
      message: 'Password changed successfully',
      success: true 
    });

  } catch (error) {
    console.error('Change password error (staff):', error);
    logPasswordChange(req.body.username, req.ip, false);
    res.status(500).json({ 
      error: 'Server error while changing password',
      success: false 
    });
  }
});

/**
 * Change Username for Student Users
 * POST /api/user-profile/student/change-username
 */
router.post('/student/change-username', authenticateWithBranch, async (req, res) => {
  try {
    const { currentUsername, newUsername, password } = req.body;

    // Validate input
    if (!currentUsername || !newUsername || !password) {
      return res.status(400).json({ 
        error: 'All fields are required',
        success: false 
      });
    }

    // Sanitize inputs
    const sanitizedCurrentUsername = sanitizeInput(currentUsername);
    const sanitizedNewUsername = sanitizeInput(newUsername);

    // Find student user
    const result = await pool.query(
      'SELECT id, student_id, password_hash FROM students WHERE username = $1',
      [sanitizedCurrentUsername]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ 
        error: 'Student user not found',
        success: false 
      });
    }

    const student = result.rows[0];

    // Verify password
    const isValid = await bcrypt.compare(password, student.password_hash);

    if (!isValid) {
      return res.status(401).json({ 
        error: 'Password is incorrect',
        success: false 
      });
    }

    // Check if new username already exists
    const existingUser = await pool.query(
      'SELECT id FROM students WHERE username = $1 AND id != $2',
      [sanitizedNewUsername, student.id]
    );

    if (existingUser.rows.length > 0) {
      return res.status(409).json({ 
        error: 'Username already exists',
        success: false 
      });
    }

    // Update username
    await pool.query(
      'UPDATE students SET username = $1 WHERE id = $2',
      [sanitizedNewUsername, student.id]
    );

    res.json({ 
      message: 'Username changed successfully',
      success: true,
      newUsername: sanitizedNewUsername
    });

  } catch (error) {
    console.error('Change username error (student):', error);
    res.status(500).json({ 
      error: 'Server error while changing username',
      success: false 
    });
  }
});

/**
 * Change Password for Student Users
 * POST /api/user-profile/student/change-password
 */
router.post('/student/change-password', authenticateWithBranch, async (req, res) => {
  try {
    const { username, currentPassword, newPassword } = req.body;

    // Validate input
    if (!username || !currentPassword || !newPassword) {
      return res.status(400).json({ 
        error: 'All fields are required',
        success: false 
      });
    }

    // Validate password strength
    const passwordValidation = validatePasswordStrength(newPassword);
    if (!passwordValidation.isValid) {
      return res.status(400).json({ 
        error: 'Password does not meet strength requirements',
        errors: passwordValidation.errors,
        success: false 
      });
    }

    // Sanitize username
    const sanitizedUsername = sanitizeInput(username);

    // Find student user
    const result = await pool.query(
      'SELECT id, student_id, password_hash FROM students WHERE username = $1',
      [sanitizedUsername]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ 
        error: 'Student user not found',
        success: false 
      });
    }

    const student = result.rows[0];

    // Verify current password
    const isValid = await bcrypt.compare(currentPassword, student.password_hash);

    if (!isValid) {
      return res.status(401).json({ 
        error: 'Current password is incorrect',
        success: false 
      });
    }

    // Hash new password
    const saltRounds = 12;
    const newPasswordHash = await bcrypt.hash(newPassword, saltRounds);

    // Update password
    await pool.query(
      'UPDATE students SET password_hash = $1 WHERE id = $2',
      [newPasswordHash, student.id]
    );

    // Log password change
    logPasswordChange(sanitizedUsername, req.ip, true);

    res.json({ 
      message: 'Password changed successfully',
      success: true 
    });

  } catch (error) {
    console.error('Change password error (student):', error);
    logPasswordChange(req.body.username, req.ip, false);
    res.status(500).json({ 
      error: 'Server error while changing password',
      success: false 
    });
  }
});

/**
 * Change Username for Guardian Users
 * POST /api/user-profile/guardian/change-username
 */
router.post('/guardian/change-username', authenticateWithBranch, async (req, res) => {
  try {
    const { currentUsername, newUsername, password } = req.body;

    // Validate input
    if (!currentUsername || !newUsername || !password) {
      return res.status(400).json({ 
        error: 'All fields are required',
        success: false 
      });
    }

    // Sanitize inputs
    const sanitizedCurrentUsername = sanitizeInput(currentUsername);
    const sanitizedNewUsername = sanitizeInput(newUsername);

    // Find guardian user
    const result = await pool.query(
      'SELECT id, guardian_id, password_hash FROM guardians WHERE username = $1',
      [sanitizedCurrentUsername]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ 
        error: 'Guardian user not found',
        success: false 
      });
    }

    const guardian = result.rows[0];

    // Verify password
    const isValid = await bcrypt.compare(password, guardian.password_hash);

    if (!isValid) {
      return res.status(401).json({ 
        error: 'Password is incorrect',
        success: false 
      });
    }

    // Check if new username already exists
    const existingUser = await pool.query(
      'SELECT id FROM guardians WHERE username = $1 AND id != $2',
      [sanitizedNewUsername, guardian.id]
    );

    if (existingUser.rows.length > 0) {
      return res.status(409).json({ 
        error: 'Username already exists',
        success: false 
      });
    }

    // Update username
    await pool.query(
      'UPDATE guardians SET username = $1 WHERE id = $2',
      [sanitizedNewUsername, guardian.id]
    );

    res.json({ 
      message: 'Username changed successfully',
      success: true,
      newUsername: sanitizedNewUsername
    });

  } catch (error) {
    console.error('Change username error (guardian):', error);
    res.status(500).json({ 
      error: 'Server error while changing username',
      success: false 
    });
  }
});

/**
 * Change Password for Guardian Users
 * POST /api/user-profile/guardian/change-password
 */
router.post('/guardian/change-password', authenticateWithBranch, async (req, res) => {
  try {
    const { username, currentPassword, newPassword } = req.body;

    // Validate input
    if (!username || !currentPassword || !newPassword) {
      return res.status(400).json({ 
        error: 'All fields are required',
        success: false 
      });
    }

    // Validate password strength
    const passwordValidation = validatePasswordStrength(newPassword);
    if (!passwordValidation.isValid) {
      return res.status(400).json({ 
        error: 'Password does not meet strength requirements',
        errors: passwordValidation.errors,
        success: false 
      });
    }

    // Sanitize username
    const sanitizedUsername = sanitizeInput(username);

    // Find guardian user
    const result = await pool.query(
      'SELECT id, guardian_id, password_hash FROM guardians WHERE username = $1',
      [sanitizedUsername]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ 
        error: 'Guardian user not found',
        success: false 
      });
    }

    const guardian = result.rows[0];

    // Verify current password
    const isValid = await bcrypt.compare(currentPassword, guardian.password_hash);

    if (!isValid) {
      return res.status(401).json({ 
        error: 'Current password is incorrect',
        success: false 
      });
    }

    // Hash new password
    const saltRounds = 12;
    const newPasswordHash = await bcrypt.hash(newPassword, saltRounds);

    // Update password
    await pool.query(
      'UPDATE guardians SET password_hash = $1 WHERE id = $2',
      [newPasswordHash, guardian.id]
    );

    // Log password change
    logPasswordChange(sanitizedUsername, req.ip, true);

    res.json({ 
      message: 'Password changed successfully',
      success: true 
    });

  } catch (error) {
    console.error('Change password error (guardian):', error);
    logPasswordChange(req.body.username, req.ip, false);
    res.status(500).json({ 
      error: 'Server error while changing password',
      success: false 
    });
  }
});

module.exports = router;
