# School 2 Monitoring Infrastructure

This directory contains all the necessary tools, templates, and documentation for monitoring School 2 during the 1-week observation period following Skoolific V2 deployment.

## Overview

After deploying Skoolific V2 to School 2 and conducting training, a comprehensive 1-week monitoring period is essential to:
- Ensure system stability and performance
- Identify and resolve issues quickly
- Collect user feedback and usage data
- Validate the deployment before rolling out to remaining schools
- Document lessons learned for future rollouts

## Directory Structure

```
monitoring/
├── README.md                                    # This file
├── MONITORING_GUIDE.md                          # Comprehensive monitoring guide
├── SCHOOL_2_MONITORING_CHECKLIST.md            # Daily/weekly monitoring checklist
├── DAILY_MONITORING_REPORT_TEMPLATE.md         # Template for daily reports
├── ISSUE_TRACKING_TEMPLATE.md                  # Template for tracking issues
├── WEEK_SUMMARY_REPORT_TEMPLATE.md             # Template for week summary
├── monitoring-scripts/                          # Automated monitoring scripts
│   ├── system-health-check.sh                  # System health check script
│   ├── performance-monitor.js                  # Performance monitoring script
│   └── logs/                                   # Log files directory
└── reports/                                     # Generated reports (create during monitoring)
    ├── daily/                                  # Daily reports
    ├── issues/                                 # Issue tracking logs
    └── weekly/                                 # Week summary reports
```

## Quick Start

### Prerequisites

1. **Access Requirements**:
   - SSH access to School 2's VPS server
   - Database credentials for School 2's branch
   - Admin credentials for all applications
   - Monitoring team communication channel (Telegram/Slack)

2. **Software Requirements**:
   - Bash shell (for health check script)
   - Node.js (for performance monitor)
   - PostgreSQL client tools
   - Text editor for reports

### Setup Steps

1. **Clone or access this monitoring directory**:
   ```bash
   cd .kiro/specs/skoolific-v2-upgrade/monitoring
   ```

2. **Create necessary directories**:
   ```bash
   mkdir -p monitoring-scripts/logs
   mkdir -p reports/daily
   mkdir -p reports/issues
   mkdir -p reports/weekly
   ```

3. **Configure monitoring scripts**:
   ```bash
   cd monitoring-scripts
   
   # Make health check script executable
   chmod +x system-health-check.sh
   
   # Install dependencies for performance monitor
   npm init -y
   npm install axios pg
   ```

4. **Set environment variables** (create `.env` file in monitoring-scripts/):
   ```bash
   BACKEND_URL=http://[school-2-server-ip]:3000
   DB_HOST=[school-2-db-host]
   DB_PORT=5432
   DB_USER=postgres
   DB_PASSWORD=[password]
   ```

5. **Test monitoring scripts**:
   ```bash
   # Test health check
   ./system-health-check.sh [school-2-branch-code]
   
   # Test performance monitor
   node performance-monitor.js [school-2-branch-code]
   ```

### Daily Workflow

#### Morning (8:00 AM - 9:30 AM)

1. Run system health check:
   ```bash
   cd monitoring-scripts
   ./system-health-check.sh [branch-code]
   ```

2. Review overnight logs and backup status

3. Check sync queue for pending operations

4. Document any issues in Issue Tracking Log

#### Midday (12:00 PM - 1:30 PM)

1. Run performance monitor:
   ```bash
   cd monitoring-scripts
   node performance-monitor.js [branch-code]
   ```

2. Monitor active users and feature usage

3. Review support tickets

4. Collect user feedback

#### Afternoon (4:00 PM - 5:30 PM)

1. Run system health check again

2. Verify data integrity

3. Check notification delivery

4. Prepare daily report using template

#### Evening (7:00 PM - 8:00 PM)

1. Run final health check

2. Review end-of-day metrics

3. Update issue tracking

4. Submit daily report

## Templates Usage

### 1. Monitoring Checklist
**File**: `SCHOOL_2_MONITORING_CHECKLIST.md`

**Purpose**: Daily and weekly task checklist

**How to use**:
- Print or keep open during monitoring
- Check off tasks as completed
- Use as reference for what to monitor

### 2. Daily Monitoring Report
**File**: `DAILY_MONITORING_REPORT_TEMPLATE.md`

**Purpose**: Comprehensive daily status report

**How to use**:
1. Copy template to `reports/daily/day-[X]-[date].md`
2. Fill in all sections throughout the day
3. Submit by end of day (6:00 PM)
4. Share with monitoring team and stakeholders

**Key sections**:
- Executive summary
- System uptime & availability
- Performance metrics
- User activity
- Error tracking
- Notification system
- Offline mode & sync
- Data integrity
- User feedback
- Recommendations

### 3. Issue Tracking Log
**File**: `ISSUE_TRACKING_TEMPLATE.md`

**Purpose**: Comprehensive record of all issues

**How to use**:
1. Copy template to `reports/issues/school-2-issues.md`
2. Add new issues as they occur
3. Update issue status in real-time
4. Use for week summary and lessons learned

**Issue severity levels**:
- **Critical (P0)**: System down, data loss, security breach
- **High (P1)**: Major feature broken, significant performance issues
- **Medium (P2)**: Minor bugs, some users affected
- **Low (P3)**: Cosmetic issues, enhancement requests

### 4. Week Summary Report
**File**: `WEEK_SUMMARY_REPORT_TEMPLATE.md`

**Purpose**: Comprehensive week-end assessment

**How to use**:
1. Copy template to `reports/weekly/school-2-week-summary.md`
2. Compile data from all daily reports
3. Analyze trends and patterns
4. Provide recommendations for next rollout
5. Submit at end of monitoring week

**Key sections**:
- Executive summary with rollout recommendation
- System performance overview
- User engagement & adoption
- Issues & incidents summary
- Data integrity verification
- Notification system performance
- Offline mode & sync analysis
- Security & access control
- User feedback summary
- Lessons learned
- Recommendations

## Monitoring Scripts

### System Health Check Script
**File**: `monitoring-scripts/system-health-check.sh`

**What it checks**:
- Backend server status and response time
- Database connectivity and performance
- Disk space usage
- Memory usage
- CPU usage
- API endpoint accessibility
- Recent error logs

**Usage**:
```bash
./system-health-check.sh [branch-code]
```

**Output**: Console output + log file in `logs/` directory

**Recommended schedule**: Every 4 hours (8 AM, 12 PM, 4 PM, 8 PM)

### Performance Monitor Script
**File**: `monitoring-scripts/performance-monitor.js`

**What it monitors**:
- API endpoint response times
- Database query execution times
- Success/failure rates
- Performance ratings

**Usage**:
```bash
node performance-monitor.js [branch-code]
```

**Output**: JSON file in `logs/` directory

**Recommended schedule**: Every 2 hours during school hours

## Automated Monitoring Setup

### Using Cron (Linux)

```bash
# Edit crontab
crontab -e

# Add these lines (adjust paths and branch code)
0 8,12,16,20 * * * cd /path/to/monitoring-scripts && ./system-health-check.sh school2_branch >> logs/cron.log 2>&1
0 9,11,13,15,17 * * * cd /path/to/monitoring-scripts && node performance-monitor.js school2_branch >> logs/cron.log 2>&1
```

### Using Task Scheduler (Windows)

1. Open Task Scheduler
2. Create Basic Task
3. Set trigger (e.g., every 4 hours)
4. Set action: Run script
5. Configure script path and arguments

## Key Metrics to Track

### System Performance
- **Uptime**: Target ≥99.5%
- **API Response Time**: Target <500ms for 95% of requests
- **Page Load Time**: Target <3s
- **Database Query Time**: Target <200ms average

### User Adoption
- **Active Users**: Target ≥80% of registered users
- **Daily Active Users (DAU)**: Track trend
- **Feature Usage**: Track adoption of key features
- **Session Duration**: Average time users spend in system

### Issues
- **Critical Issues**: Target 0 unresolved by end of week
- **High Priority Issues**: Target <3 unresolved
- **Resolution Time**: Track average time to resolve
- **Recurring Issues**: Identify patterns

### Data Integrity
- **Validation Pass Rate**: Target 100%
- **Sync Success Rate**: Target ≥98%
- **Backup Success Rate**: Target 100%

## Escalation Procedures

### Critical Issues (P0)
- **Response Time**: Immediate (within 15 minutes)
- **Escalate To**: Technical Lead + Project Manager
- **Resolution Target**: Within 2 hours

### High Priority Issues (P1)
- **Response Time**: Within 1 hour
- **Escalate To**: Technical Lead (if not resolved in 2 hours)
- **Resolution Target**: Within 4 hours

### Medium Priority Issues (P2)
- **Response Time**: Within 4 hours
- **Escalate To**: Technical Lead (if not resolved in 8 hours)
- **Resolution Target**: Within 24 hours

### Low Priority Issues (P3)
- **Response Time**: Within 24 hours
- **Resolution Target**: Can be deferred to next release

## Best Practices

1. **Be Proactive**: Don't wait for users to report issues
2. **Document Everything**: Every issue, workaround, and feedback
3. **Communicate Clearly**: Use templates for consistency
4. **Stay Objective**: Report facts, use metrics
5. **Think Long-term**: Consider impact on future rollouts

## Common Issues and Quick Fixes

### Backend Not Responding
```bash
# Check service status
systemctl status skoolific-backend

# Restart service
sudo systemctl restart skoolific-backend

# Check logs
tail -100 /var/log/skoolific/backend.log
```

### Database Connection Issues
```bash
# Check PostgreSQL status
pg_isready -h localhost -U postgres

# Restart PostgreSQL
sudo systemctl restart postgresql

# Check connections
psql -U postgres -c "SELECT count(*) FROM pg_stat_activity;"
```

### High CPU/Memory Usage
```bash
# Check resource usage
top
htop

# Check disk space
df -h

# Clear logs if needed
sudo journalctl --vacuum-time=7d
```

## Support and Contacts

### Monitoring Team
- **Monitoring Lead**: [Name] - [Contact]
- **Technical Monitor**: [Name] - [Contact]
- **UX Monitor**: [Name] - [Contact]
- **On-Site Coordinator**: [Name] - [Contact]

### Technical Team
- **Technical Lead**: [Name] - [Contact]
- **Backend Developer**: [Name] - [Contact]
- **Database Admin**: [Name] - [Contact]

### Emergency Contacts
- **24/7 Support**: [Phone]
- **Escalation Hotline**: [Phone]

## Additional Resources

- **Monitoring Guide**: See `MONITORING_GUIDE.md` for comprehensive instructions
- **System Documentation**: See main project documentation
- **API Documentation**: [Link to API docs]
- **Database Schema**: [Link to schema docs]

## After Monitoring Week

### Deliverables

1. **Week Summary Report**: Completed using template
2. **Issue Tracking Log**: All issues documented
3. **Daily Reports**: All 7 daily reports
4. **Recommendations Document**: For next rollout
5. **Lessons Learned**: Document insights

### Next Steps

1. Review week summary with stakeholders
2. Decide on rollout to next school
3. Implement critical fixes if needed
4. Update monitoring process based on lessons learned
5. Prepare for next school monitoring

### Handover

If monitoring team changes:
1. Transfer all documentation
2. Share access credentials
3. Explain any ongoing issues
4. Review lessons learned
5. Provide contact information

## Questions or Issues?

If you have questions about the monitoring process or encounter issues with the monitoring tools:

1. Check the **Monitoring Guide** (`MONITORING_GUIDE.md`) for detailed instructions
2. Review the **Common Issues** section above
3. Contact the Monitoring Lead
4. Escalate to Technical Lead if needed

---

**Remember**: The goal of monitoring is not just to watch, but to learn and improve. Every observation, every issue, and every piece of feedback makes the next rollout better.

**Good luck with School 2 monitoring!**
