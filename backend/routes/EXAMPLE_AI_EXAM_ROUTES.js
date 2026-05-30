/**
 * AI Exam Generation Routes (EXAMPLE)
 * 
 * This is an example file showing how to use the aiLimiter middleware
 * for AI exam generation endpoints.
 * 
 * This file is for reference only and should be implemented in Phase 3
 * when the AI exam generation UI and backend routes are created.
 */

const express = require('express');
const router = express.Router();
const { authenticateToken, aiLimiter } = require('../middleware');
const GeminiService = require('../services/GeminiService');

/**
 * POST /api/ai/exams/generate
 * Generate an AI-powered exam using Gemini API
 * 
 * Rate Limited: 10 requests per hour per teacher
 * Authentication: Required
 */
router.post('/generate', 
  authenticateToken,  // Ensure user is authenticated
  aiLimiter,          // Apply AI rate limiting (10 per hour per teacher)
  async (req, res) => {
    try {
      const {
        subject,
        gradeLevel,
        numberOfQuestions,
        difficulty,
        topics,
        duration
      } = req.body;

      // Validate required fields
      if (!subject || !gradeLevel || !numberOfQuestions) {
        return res.status(400).json({
          success: false,
          message: 'Missing required fields: subject, gradeLevel, numberOfQuestions'
        });
      }

      // Initialize Gemini service
      const geminiService = new GeminiService();

      // Generate exam
      const examData = await geminiService.generateExam({
        subject,
        gradeLevel,
        numberOfQuestions,
        difficulty: difficulty || 'medium',
        topics: topics || [],
        duration: duration || 60
      });

      // Return generated exam
      res.json({
        success: true,
        exam: examData.exam,
        message: 'Exam generated successfully'
      });

    } catch (error) {
      console.error('AI Exam Generation Error:', error);
      
      // Handle specific errors
      if (error.message.includes('rate limit')) {
        return res.status(429).json({
          success: false,
          message: 'API rate limit exceeded. Please try again later.'
        });
      }

      if (error.message.includes('API key')) {
        return res.status(500).json({
          success: false,
          message: 'AI service configuration error. Please contact administrator.'
        });
      }

      // Generic error response
      res.status(500).json({
        success: false,
        message: 'Failed to generate exam. Please try again.',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
);

/**
 * GET /api/ai/exams/rate-limit-status
 * Check current rate limit status for the authenticated user
 * 
 * Authentication: Required
 */
router.get('/rate-limit-status', 
  authenticateToken,
  (req, res) => {
    // This endpoint can be used to check rate limit headers
    // The actual rate limit info is in the response headers
    res.json({
      success: true,
      message: 'Check response headers for rate limit information',
      headers: {
        'RateLimit-Limit': '10 requests per hour',
        'RateLimit-Policy': 'Per teacher (user ID based)'
      }
    });
  }
);

module.exports = router;
