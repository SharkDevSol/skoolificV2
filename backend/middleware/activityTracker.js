/**
 * Activity Tracker Middleware
 * 
 * Automatically tracks user activities for all authenticated requests
 * 
 * Phase 10.8.7: Monitor user activity
 */

const userActivityMonitoring = require('../services/UserActivityMonitoringService');
const { logger } = require('../utils/logger');

/**
 * Detect device type from user agent
 */
function detectDeviceType(userAgent) {
  if (!userAgent) return 'unknown';
  
  const ua = userAgent.toLowerCase();
  
  if (ua.includes('mobile') || ua.includes('android') || ua.includes('iphone')) {
    return 'mobile';
  } else if (ua.includes('tablet') || ua.includes('ipad')) {
    return 'tablet';
  } else if (ua.includes('electron') || ua.includes('tauri')) {
    return 'desktop-app';
  } else {
    return 'desktop-web';
  }
}

/**
 * Determine activity category from route
 */
function getActivityCategory(path, method) {
  if (path.includes('/auth/')) return 'authentication';
  if (path.includes('/student')) return 'student-management';
  if (path.includes('/staff')) return 'staff-management';
  if (path.includes('/finance') || path.includes('/payment')) return 'finance';
  if (path.includes('/attendance')) return 'attendance';
  if (path.includes('/mark') || path.includes('/exam')) return 'academic';
  if (path.includes('/schedule')) return 'scheduling';
  if (path.includes('/report')) return 'reporting';
  if (path.includes('/settings')) return 'settings';
  if (path.includes('/dashboard')) return 'dashboard';
  if (path.includes('/communication') || path.includes('/post')) return 'communication';
  
  return 'general';
}

/**
 * Determine activity type from method and path
 */
function getActivityType(method, path) {
  const category = getActivityCategory(path, method);
  
  if (method === 'GET') {
    if (path.includes('/list') || path.includes('/all')) return 'view_list';
    if (path.includes('/dashboard')) return 'view_dashboard';
    if (path.includes('/report')) return 'view_report';
    return 'view';
  } else if (method === 'POST') {
    if (path.includes('/login')) return 'login';
    if (path.includes('/logout')) return 'logout';
    return 'create';
  } else if (method === 'PUT' || method === 'PATCH') {
    return 'update';
  } else if (method === 'DELETE') {
    return 'delete';
  }
  
  return 'action';
}

/**
 * Extract resource name from path
 */
function getResourceName(path) {
  // Remove query parameters
  const cleanPath = path.split('?')[0];
  
  // Extract main resource
  const parts = cleanPath.split('/').filter(p => p && !p.match(/^\d+$/));
  
  if (parts.length >= 2) {
    return parts.slice(1, 3).join('/');
  }
  
  return cleanPath;
}

/**
 * Activity tracking middleware
 */
const activityTracker = async (req, res, next) => {
  // Skip tracking for certain routes
  const skipRoutes = [
    '/health',
    '/api/health',
    '/favicon.ico',
    '/static/',
    '/uploads/'
  ];
  
  if (skipRoutes.some(route => req.path.includes(route))) {
    return next();
  }

  // Only track authenticated requests
  if (!req.user) {
    return next();
  }

  const startTime = Date.now();

  // Store original res.json to intercept response
  const originalJson = res.json.bind(res);
  
  res.json = function(data) {
    const duration = Date.now() - startTime;
    
    // Log activity asynchronously (don't block response)
    setImmediate(async () => {
      try {
        const activityType = getActivityType(req.method, req.path);
        const activityCategory = getActivityCategory(req.path, req.method);
        const resource = getResourceName(req.path);
        
        await userActivityMonitoring.logActivity({
          userId: req.user.id || req.user.user_id,
          username: req.user.username,
          userType: req.user.role || req.user.user_type || 'unknown',
          branchCode: req.user.branch_code || req.branchCode,
          activityType,
          activityCategory,
          resource,
          action: req.method,
          details: {
            path: req.path,
            query: req.query,
            statusCode: res.statusCode
          },
          ipAddress: req.ip || req.connection.remoteAddress,
          userAgent: req.get('user-agent'),
          sessionId: req.sessionID || req.get('x-session-id'),
          durationMs: duration,
          status: res.statusCode < 400 ? 'success' : 'error'
        });
      } catch (error) {
        // Silent fail - don't break the application
        logger.error('Activity tracking error:', { error: error.message });
      }
    });

    return originalJson(data);
  };

  next();
};

/**
 * Session tracking middleware - tracks login/logout
 */
const sessionTracker = async (req, res, next) => {
  // Track login
  if (req.path.includes('/login') && req.method === 'POST') {
    const originalJson = res.json.bind(res);
    
    res.json = function(data) {
      // If login successful, create session
      if (data.success && data.user) {
        setImmediate(async () => {
          try {
            const sessionId = req.sessionID || data.token || `session_${Date.now()}`;
            const deviceType = detectDeviceType(req.get('user-agent'));
            
            await userActivityMonitoring.createSession({
              sessionId,
              userId: data.user.id || data.user.user_id,
              username: data.user.username,
              userType: data.user.role || data.user.user_type,
              branchCode: data.user.branch_code || req.body.branchCode,
              ipAddress: req.ip || req.connection.remoteAddress,
              userAgent: req.get('user-agent'),
              deviceType
            });
          } catch (error) {
            logger.error('Session tracking error:', { error: error.message });
          }
        });
      }
      
      return originalJson(data);
    };
  }
  
  // Track logout
  if (req.path.includes('/logout') && req.method === 'POST') {
    const originalJson = res.json.bind(res);
    
    res.json = function(data) {
      setImmediate(async () => {
        try {
          const sessionId = req.sessionID || req.get('x-session-id');
          if (sessionId) {
            await userActivityMonitoring.endSession(sessionId);
          }
        } catch (error) {
          logger.error('Session end tracking error:', { error: error.message });
        }
      });
      
      return originalJson(data);
    };
  }

  next();
};

module.exports = {
  activityTracker,
  sessionTracker,
  detectDeviceType,
  getActivityCategory,
  getActivityType,
  getResourceName
};
