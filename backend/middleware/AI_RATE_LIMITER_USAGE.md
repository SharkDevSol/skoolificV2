# AI Rate Limiter Usage Guide

## Overview
The AI rate limiter (`aiLimiter`) has been implemented as part of Task 3.1.6 to prevent excessive usage of the Gemini API for exam generation.

## Configuration
- **Window:** 1 hour (60 * 60 * 1000 ms)
- **Max Requests:** 10 exam generations per hour
- **Tracking:** Per teacher (using authenticated user ID)
- **Fallback:** IP address with IPv6 subnet handling

## How to Use

### Import the Rate Limiter
```javascript
const { aiLimiter } = require('../middleware/rateLimiter');
```

### Apply to AI Exam Generation Routes
```javascript
// Example: AI exam generation endpoint
router.post('/api/exams/generate', 
  authenticateToken,  // Ensure user is authenticated first
  aiLimiter,          // Apply rate limiting
  async (req, res) => {
    try {
      const geminiService = new GeminiService();
      const exam = await geminiService.generateExam(req.body);
      res.json({ success: true, exam });
    } catch (error) {
      res.status(500).json({ 
        success: false, 
        message: error.message 
      });
    }
  }
);
```

## Error Response
When the rate limit is exceeded, the middleware returns:
```json
{
  "success": false,
  "message": "Too many exam generation requests. Please try again later.",
  "retryAfter": "1 hour"
}
```
HTTP Status Code: `429 Too Many Requests`

## Key Features
1. **Per-Teacher Tracking:** Uses authenticated user ID (`req.user.id` or `req.user.userId`)
2. **IPv6 Support:** Properly handles IPv6 addresses using `ipKeyGenerator` helper
3. **IP Fallback:** Falls back to IP address for unauthenticated requests
4. **Standard Headers:** Includes rate limit headers in responses

## Testing
Tests are available in `backend/middleware/rateLimiter.test.js`

Run tests with:
```bash
npm test -- rateLimiter.test.js
```

## Future Enhancements (Phase 9)
- Redis integration for distributed rate limiting across multiple server instances
- Configurable limits per user role or subscription tier
- Rate limit analytics and monitoring
