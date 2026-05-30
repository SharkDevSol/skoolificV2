# User Activity Monitoring System

## Overview

The User Activity Monitoring System provides comprehensive tracking and analysis of all user activities across the Skoolific V2 platform. This system helps administrators understand user behavior, identify engagement patterns, and monitor system usage.

**Phase**: 10.8.7 - Monitor user activity  
**Status**: ✅ Complete

## Features

### 1. Activity Tracking
- **Automatic Tracking**: All authenticated API requests are automatically tracked
- **Activity Types**: Login, logout, view, create, update, delete, and custom actions
- **Activity Categories**: Authentication, student management, staff management, finance, attendance, academic, scheduling, reporting, settings, dashboard, communication
- **Detailed Logging**: Captures user ID, username, user type, branch code, IP address, user agent, session ID, duration, and status

### 2. Session Management
- **Session Tracking**: Tracks user login/logout events and session duration
- **Active Sessions**: Real-time monitoring of currently active users
- **Session Analytics**: Average session duration, session counts, and user engagement metrics
- **Automatic Cleanup**: Inactive sessions are automatically ended after 24 hours

### 3. Statistics and Analytics
- **Activity Statistics**: Total activities, unique users, activity breakdown by type and category
- **Hourly Distribution**: Activity patterns throughout the day
- **Top Users**: Most active users by activity count
- **Engagement Scores**: User engagement scoring based on activity frequency, diversity, and consistency

### 4. Scheduled Jobs
- **Daily Metrics**: Automatically generates daily metrics at midnight
- **Weekly Cleanup**: Removes old activity records (90+ days) weekly
- **Hourly Session Cleanup**: Ends inactive sessions every hour

## Architecture

### Database Tables

#### 1. `user_activity`
Stores individual user activity records.

```sql
CREATE TABLE user_activity (
  activity_id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL,
  username VARCHAR(255),
  user_type VARCHAR(50) NOT NULL,
  branch_code VARCHAR(10),
  activity_type VARCHAR(100) NOT NULL,
  activity_category VARCHAR(50),
  resource VARCHAR(255),
  action VARCHAR(50),
  details JSONB,
  ip_address VARCHAR(45),
  user_agent TEXT,
  session_id VARCHAR(255),
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  duration_ms INTEGER,
  status VARCHAR(20) DEFAULT 'success'
);
```

**Indexes**:
- `idx_user_activity_user_id` on `user_id`
- `idx_user_activity_timestamp` on `timestamp DESC`
- `idx_user_activity_type` on `activity_type`
- `idx_user_activity_branch` on `branch_code`
- `idx_user_activity_session` on `session_id`

#### 2. `user_sessions`
Stores user session information.

```sql
CREATE TABLE user_sessions (
  session_id VARCHAR(255) PRIMARY KEY,
  user_id INTEGER NOT NULL,
  username VARCHAR(255),
  user_type VARCHAR(50) NOT NULL,
  branch_code VARCHAR(10),
  login_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_activity TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  logout_time TIMESTAMP,
  session_duration_minutes INTEGER,
  ip_address VARCHAR(45),
  user_agent TEXT,
  device_type VARCHAR(50),
  is_active BOOLEAN DEFAULT true
);
```

**Indexes**:
- `idx_user_sessions_user_id` on `user_id`
- `idx_user_sessions_active` on `is_active`

#### 3. `user_activity_metrics`
Stores aggregated daily metrics.

```sql
CREATE TABLE user_activity_metrics (
  metric_id SERIAL PRIMARY KEY,
  date DATE NOT NULL,
  branch_code VARCHAR(10),
  user_type VARCHAR(50),
  total_users INTEGER DEFAULT 0,
  total_sessions INTEGER DEFAULT 0,
  total_activities INTEGER DEFAULT 0,
  avg_session_duration_minutes DECIMAL(10,2),
  most_active_hour INTEGER,
  most_used_feature VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(date, branch_code, user_type)
);
```

### Components

#### 1. UserActivityMonitoringService
**Location**: `backend/services/UserActivityMonitoringService.js`

Main service for tracking and analyzing user activities.

**Key Methods**:
- `logActivity(activity)` - Log a user activity
- `createSession(session)` - Create a new user session
- `endSession(sessionId)` - End a user session
- `getUserActivity(userId, options)` - Get activity history for a user
- `getActiveUsers(options)` - Get currently active users
- `getActivityStatistics(options)` - Get activity statistics
- `getSessionStatistics(options)` - Get session statistics
- `getUserEngagementScore(userId, daysBack)` - Calculate user engagement score
- `generateDailyMetrics(date)` - Generate daily metrics
- `cleanupOldRecords(daysOld)` - Clean up old activity records

#### 2. Activity Tracker Middleware
**Location**: `backend/middleware/activityTracker.js`

Middleware that automatically tracks all authenticated API requests.

**Exports**:
- `activityTracker` - Main middleware for tracking activities
- `sessionTracker` - Middleware for tracking login/logout events
- `detectDeviceType(userAgent)` - Detect device type from user agent
- `getActivityCategory(path, method)` - Determine activity category
- `getActivityType(method, path)` - Determine activity type
- `getResourceName(path)` - Extract resource name from path

#### 3. User Activity Routes
**Location**: `backend/routes/userActivityRoutes.js`

API endpoints for accessing user activity data.

**Endpoints**:
- `GET /api/user-activity/active-users` - Get currently active users
- `GET /api/user-activity/statistics` - Get activity statistics
- `GET /api/user-activity/sessions` - Get session statistics
- `GET /api/user-activity/user/:userId` - Get activity history for a user
- `GET /api/user-activity/engagement/:userId` - Get user engagement score
- `GET /api/user-activity/dashboard` - Get comprehensive dashboard data
- `POST /api/user-activity/generate-metrics` - Generate daily metrics (admin only)
- `DELETE /api/user-activity/cleanup` - Clean up old records (admin only)

#### 4. User Activity Scheduler
**Location**: `backend/services/userActivityScheduler.js`

Scheduled jobs for automated maintenance and metrics generation.

**Jobs**:
- **Daily Metrics**: Runs at midnight to generate metrics for the previous day
- **Weekly Cleanup**: Runs weekly to remove records older than 90 days
- **Hourly Session Cleanup**: Runs hourly to end inactive sessions

## Integration

### 1. Add Middleware to Server

In `backend/server.js`:

```javascript
const { activityTracker, sessionTracker } = require('./middleware/activityTracker');
const userActivityRoutes = require('./routes/userActivityRoutes');
const userActivityScheduler = require('./services/userActivityScheduler');

// Add middleware (after authentication middleware)
app.use(sessionTracker);
app.use(activityTracker);

// Add routes
app.use('/api/user-activity', userActivityRoutes);

// Start scheduler
userActivityScheduler.start();

// Graceful shutdown
process.on('SIGTERM', () => {
  userActivityScheduler.stop();
  // ... other cleanup
});
```

### 2. Manual Activity Logging

For custom activities not captured by middleware:

```javascript
const userActivityMonitoring = require('./services/UserActivityMonitoringService');

// Log custom activity
await userActivityMonitoring.logActivity({
  userId: user.id,
  username: user.username,
  userType: user.role,
  branchCode: user.branch_code,
  activityType: 'custom_action',
  activityCategory: 'custom',
  resource: 'custom_resource',
  action: 'custom',
  details: { key: 'value' },
  ipAddress: req.ip,
  userAgent: req.get('user-agent'),
  sessionId: req.sessionID,
  status: 'success'
});
```

## API Usage Examples

### Get Active Users

```javascript
// GET /api/user-activity/active-users?branchCode=ib3&minutesBack=30
const response = await axios.get('/api/user-activity/active-users', {
  params: {
    branchCode: 'ib3',
    minutesBack: 30
  },
  headers: {
    Authorization: `Bearer ${token}`
  }
});

console.log(response.data.activeUsers);
// [
//   {
//     user_id: 1,
//     username: 'admin',
//     user_type: 'admin',
//     branch_code: 'ib3',
//     last_activity: '2026-05-09T10:30:00Z',
//     activity_count: 15
//   }
// ]
```

### Get Activity Statistics

```javascript
// GET /api/user-activity/statistics?hoursBack=24
const response = await axios.get('/api/user-activity/statistics', {
  params: {
    hoursBack: 24
  },
  headers: {
    Authorization: `Bearer ${token}`
  }
});

console.log(response.data.statistics);
// {
//   overall: {
//     total_activities: 1500,
//     unique_users: 50,
//     total_sessions: 75,
//     avg_duration_ms: 3500
//   },
//   byType: [
//     { activity_type: 'view', count: 800 },
//     { activity_type: 'create', count: 300 }
//   ],
//   byCategory: [
//     { activity_category: 'academic', count: 500 },
//     { activity_category: 'attendance', count: 400 }
//   ],
//   hourlyDistribution: [...],
//   topUsers: [...]
// }
```

### Get User Engagement Score

```javascript
// GET /api/user-activity/engagement/1?daysBack=30
const response = await axios.get('/api/user-activity/engagement/1', {
  params: {
    daysBack: 30
  },
  headers: {
    Authorization: `Bearer ${token}`
  }
});

console.log(response.data.engagement);
// {
//   userId: 1,
//   engagementScore: 85,
//   totalActivities: 450,
//   activeDays: 25,
//   totalSessions: 30,
//   avgActivityDuration: 3200,
//   featureDiversity: 12,
//   period: '30 days'
// }
```

### Get Dashboard Data

```javascript
// GET /api/user-activity/dashboard?branchCode=ib3
const response = await axios.get('/api/user-activity/dashboard', {
  params: {
    branchCode: 'ib3'
  },
  headers: {
    Authorization: `Bearer ${token}`
  }
});

console.log(response.data.dashboard);
// {
//   activeUsers: {
//     count: 15,
//     users: [...]
//   },
//   last24Hours: {
//     overall: {...},
//     byType: [...],
//     byCategory: [...]
//   },
//   last7Days: {
//     overall: {...},
//     daily: [...]
//   }
// }
```

## Engagement Score Calculation

The engagement score is calculated on a scale of 0-100 based on three factors:

1. **Active Days Score (40%)**: `(activeDays / totalDays) * 40`
2. **Activity Score (30%)**: `min((totalActivities / 100) * 30, 30)`
3. **Diversity Score (30%)**: `min((featureDiversity / 10) * 30, 30)`

**Example**:
- User active 25 out of 30 days: `(25/30) * 40 = 33.3`
- User performed 150 activities: `min((150/100) * 30, 30) = 30`
- User used 8 different features: `min((8/10) * 30, 30) = 24`
- **Total Engagement Score**: `33.3 + 30 + 24 = 87.3` (rounded to 87)

## Performance Considerations

1. **Asynchronous Logging**: Activity logging is done asynchronously to avoid blocking API responses
2. **Indexed Queries**: All frequently queried columns have indexes for fast retrieval
3. **Automatic Cleanup**: Old records are automatically removed to prevent database bloat
4. **Batch Processing**: Daily metrics are generated in batch to reduce database load
5. **Connection Pooling**: Uses PostgreSQL connection pooling for efficient database access

## Security and Privacy

1. **Authorization**: Only admins and super admins can view system-wide activity data
2. **User Privacy**: Users can only view their own activity unless they have admin privileges
3. **IP Anonymization**: Consider anonymizing IP addresses for GDPR compliance
4. **Data Retention**: Activity records are automatically deleted after 90 days
5. **Audit Trail**: All activity monitoring actions are logged for audit purposes

## Monitoring and Alerts

### Key Metrics to Monitor

1. **Active Users**: Number of currently active users
2. **Error Rate**: Percentage of failed activities
3. **Session Duration**: Average session duration
4. **Feature Usage**: Most and least used features
5. **Peak Hours**: Busiest times of day

### Recommended Alerts

1. **Low Activity**: Alert if active users drop below threshold
2. **High Error Rate**: Alert if error rate exceeds 10%
3. **Long Sessions**: Alert for sessions exceeding 8 hours (potential security issue)
4. **Unusual Activity**: Alert for suspicious activity patterns

## Testing

Run tests:

```bash
npm test -- UserActivityMonitoringService.test.js
```

## Troubleshooting

### Issue: Activities not being logged

**Solution**: Ensure middleware is added after authentication middleware in server.js

### Issue: Sessions not ending

**Solution**: Check that session cleanup job is running. Verify with:

```javascript
const scheduler = require('./services/userActivityScheduler');
console.log(scheduler.getStatus());
```

### Issue: High database load

**Solution**: 
1. Increase cleanup frequency to remove old records more often
2. Add more indexes if specific queries are slow
3. Consider archiving old data to separate table

## Future Enhancements

1. **Real-time Dashboard**: WebSocket-based real-time activity monitoring
2. **Anomaly Detection**: ML-based detection of unusual activity patterns
3. **Custom Reports**: User-defined activity reports and exports
4. **Activity Heatmaps**: Visual representation of activity patterns
5. **Predictive Analytics**: Predict user churn based on engagement scores

## References

- [Winston Logging Documentation](https://github.com/winstonjs/winston)
- [PostgreSQL Performance Tuning](https://www.postgresql.org/docs/current/performance-tips.html)
- [Express Middleware Guide](https://expressjs.com/en/guide/using-middleware.html)

---

**Implementation Date**: May 9, 2026  
**Last Updated**: May 9, 2026  
**Version**: 1.0.0
