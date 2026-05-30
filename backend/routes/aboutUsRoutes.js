const express = require('express');
const router = express.Router();
const pool = require('../config/db');

/**
 * Get About Us Page Information
 * GET /api/public/about-us
 * 
 * This endpoint is PUBLIC and does not require authentication or branch code.
 * It returns school information, mission, vision, and contact details.
 */
router.get('/', async (req, res) => {
  try {
    // Get school information from the master database or default branch
    // Since this is public, we'll use a default configuration or environment variables
    
    const aboutUsInfo = {
      schoolName: process.env.SCHOOL_NAME || 'Skoolific School Management System',
      logo: process.env.SCHOOL_LOGO_URL || '/uploads/branding/default-logo.png',
      description: process.env.SCHOOL_DESCRIPTION || 'A comprehensive school management system designed for Ethiopian schools.',
      mission: process.env.SCHOOL_MISSION || 'To provide quality education and empower students to reach their full potential through innovative learning approaches and dedicated teaching.',
      vision: process.env.SCHOOL_VISION || 'To be a leading educational institution that nurtures future leaders and contributes to the development of our community and nation.',
      contactDetails: {
        address: process.env.SCHOOL_ADDRESS || 'Addis Ababa, Ethiopia',
        phone: process.env.SCHOOL_PHONE || '+251-11-XXX-XXXX',
        email: process.env.SCHOOL_EMAIL || 'info@school.edu.et',
        website: process.env.SCHOOL_WEBSITE || 'https://school.edu.et'
      },
      socialMedia: {
        facebook: process.env.SCHOOL_FACEBOOK || '',
        twitter: process.env.SCHOOL_TWITTER || '',
        instagram: process.env.SCHOOL_INSTAGRAM || '',
        linkedin: process.env.SCHOOL_LINKEDIN || ''
      },
      establishedYear: process.env.SCHOOL_ESTABLISHED_YEAR || '2018',
      accreditation: process.env.SCHOOL_ACCREDITATION || 'Ethiopian Ministry of Education',
      facilities: [
        'Modern Classrooms',
        'Science Laboratories',
        'Computer Labs',
        'Library',
        'Sports Facilities',
        'Cafeteria'
      ],
      programs: [
        'Kindergarten',
        'Primary Education (Grades 1-8)',
        'Secondary Education (Grades 9-12)',
        'Evening Classes'
      ]
    };

    res.json({
      success: true,
      data: aboutUsInfo
    });

  } catch (error) {
    console.error('Error fetching About Us information:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch About Us information'
    });
  }
});

/**
 * Get School Statistics (Public)
 * GET /api/public/about-us/stats
 * 
 * Returns public statistics about the school
 */
router.get('/stats', async (req, res) => {
  try {
    const stats = {
      totalStudents: process.env.PUBLIC_TOTAL_STUDENTS || '500+',
      totalStaff: process.env.PUBLIC_TOTAL_STAFF || '50+',
      yearsOfExperience: process.env.PUBLIC_YEARS_EXPERIENCE || '5+',
      successRate: process.env.PUBLIC_SUCCESS_RATE || '95%'
    };

    res.json({
      success: true,
      data: stats
    });

  } catch (error) {
    console.error('Error fetching school statistics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch school statistics'
    });
  }
});

/**
 * Submit Contact Form (Public)
 * POST /api/public/about-us/contact
 * 
 * Allows prospective parents to submit inquiries
 */
router.post('/contact', async (req, res) => {
  try {
    const { name, email, phone, message } = req.body;

    // Validate input
    if (!name || !email || !message) {
      return res.status(400).json({
        success: false,
        error: 'Name, email, and message are required'
      });
    }

    // Store inquiry in database (optional - create a table for this)
    // For now, just log it
    console.log('New contact inquiry:', { name, email, phone, message, timestamp: new Date() });

    // In production, you might want to:
    // 1. Store in database
    // 2. Send email notification to admin
    // 3. Send auto-reply to inquirer

    res.json({
      success: true,
      message: 'Thank you for your inquiry. We will contact you soon.'
    });

  } catch (error) {
    console.error('Error processing contact form:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to submit contact form'
    });
  }
});

module.exports = router;
