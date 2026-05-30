# Monitoring Guide for Skoolific V2 School Rollout

## Overview

This guide provides comprehensive instructions for monitoring Skoolific V2 during the 1-week observation period after deployment to each school. The monitoring process is critical for ensuring system stability, identifying issues early, and gathering insights for subsequent rollouts.

---

## Table of Contents

1. [Monitoring Objectives](#monitoring-objectives)
2. [Monitoring Team Setup](#monitoring-team-setup)
3. [Tools and Access](#tools-and-access)
4. [Daily Monitoring Workflow](#daily-monitoring-workflow)
5. [Automated Monitoring Scripts](#automated-monitoring-scripts)
6. [Manual Monitoring Tasks](#manual-monitoring-tasks)
7. [Issue Management](#issue-management)
8. [Reporting](#reporting)
9. [Escalation Procedures](#escalation-procedures)
10. [Best Practices](#best-practices)

---

## Monitoring Objectives

### Primary Objectives

1. **System Stability**: Ensure the system remains operational with minimal downtime
2. **Performance Validation**: Verify response times and system performance meet targets
3. **User Adoption**: Track user engagement and feature adoption rates
4. **Issue Detection**: Identify and document bugs, errors, and usability issues
5. **Data Integrity**: Verify data accuracy and consistency
6. **User Satisfaction**: Collect and analyze user feedback

### Success Criteria

- **Uptime**: ≥99.5% system availability
- **Performance**: 95% of API requests complete in <500ms
- **User Adoption**: ≥80% of registered users active within the week
- **Critical Issues**: Zero unresolved critical issues by end of week
- **Data Integrity**: 100% data validation checks pass

---

## Monitoring Team Setup

### Team Roles

#### 1. Monitoring Lead
**Responsibilities:**
- Oversee entire monitoring process
- Review daily reports
- Make escalation decisions
- Prepare week summary report
- Coordinate with technical and school teams

**Required Skills:**
- Understanding of Skoolific V2 architecture
- Experience with system monitoring
- Strong communication skills

#### 2. Technical Monitor
**Responsibilities:**
- Execute automated monitoring scripts
- Review server logs and error reports
- Monitor system resources (CPU, memory, disk)
- Investigate technical issues
- Perform database health checks

**Required Skills:**
- Linux/server administration
- Database management (PostgreSQL)
- Log analysis
- Performance troubleshooting

#### 3. User Experience Monitor
**Responsibilities:**
- Collect user feedback
- Monitor support tickets
- Track feature usage
- Conduct user interviews
- Document usability issues

**Required Skills:**
- User research experience
- Communication skills
- Understanding of school workflows

#### 4. On-Site Coordinator (School Representative)
**Responsibilities:**
- Serve as primary contact at school
- Report issues from users
- Facilitate user feedback collection
- Coordinate with monitoring team
- Provide context for school-specific issues

**Required Skills:**
- Knowledge of school operations
- Technical aptitude
- Communication skills

### Team Communication

- **Daily Standup**: 9:00 AM (15 minutes)
  - Review previous day's findings
  - Discuss current issues
  - Plan day's monitoring activities

- **Mid-day Check-in**: 1:00 PM (10 minutes)
  - Quick status update
  - Address urgent issues

- **End-of-day Review**: 5:00 PM (30 minutes)
  - Review daily report
  - Discuss action items
  - Plan for next day

- **Communication Channels**:
  - Primary: Telegram group
  - Secondary: Phone calls for urgent issues
  - Documentation: Shared Google Drive/Dropbox

---

## Tools and Access

### Required Access

#### Server Access
```bash
# SSH access to VPS
ssh [username]@[server-ip]

# Backend logs location
/var/log/skoolific/backend.log
/var/log/skoolific/error.log

# Application logs
/var/log/nginx/access.log
/var/log/nginx/error.log
```

#### Database Access
```bash
# PostgreSQL access
psql -h [host] -U [user] -d [database]

# Common queries
SELECT COUNT(*) FROM students;
SELECT COUNT(*) FROM staff WHERE is_active = true;
SELECT * FROM pg_stat_activity;
```

#### Application Access
- **Admin App**: Desktop application with admin credentials
- **Staff App**: Mobile app with teacher credentials
- **Student App**: Mobile app with student credentials
- **Guardian App**: Mobile app with guardian credentials

### Monitoring Tools

#### 1. System Health Check Script
**Location**: `monitoring-scripts/system-health-check.sh`

**Purpose**: Automated health check for backend, database, and system resources

**Usage**:
```bash
cd monitoring-scripts
chmod +x system-health-check.sh
./system-health-check.sh [branch_code]
```

**Output**: Console output + log file in `logs/` directory

**Schedule**: Run every 4 hours (8 AM, 12 PM, 4 PM, 8 PM)

#### 2. Performance Monitor Script
**Location**: `monitoring-scripts/performance-monitor.js`

**Purpose**: Monitor API response times and database query performance

**Usage**:
```bash
cd monitoring-scripts
npm install  # First time only
node performance-monitor.js [branch_code]
```

**Output**: JSON log file in `logs/` directory

**Schedule**: Run every 2 hours during school hours

#### 3. Log Analysis Tools

**View recent errors**:
```bash
# Backend errors
tail -100 /var/log/skoolific/backend.log | grep ERROR

# Critical errors
grep CRITICAL /var/log/skoolific/backend.log | tail -20

# Errors in last hour
grep ERROR /var/log/skoolific/backend.log | grep "$(date -d '1 hour ago' '+%Y-%m-%d %H')"
```

**Count errors by type**:
```bash
grep ERROR /var/log/skoolific/backend.log | awk '{print $4}' | sort | uniq -c | sort -rn
```

#### 4. Database Monitoring Queries

**Active connections**:
```sql
SELECT count(*) FROM pg_stat_activity WHERE datname = 'skoolific_[branch]';
```

**Slow queries**:
```sql
SELECT query, calls, total_time, mean_time 
FROM pg_stat_statements 
ORDER BY mean_time DESC 
LIMIT 10;
```

**Database size**:
```sql
SELECT pg_size_pretty(pg_database_size('skoolific_[branch]'));
```

**Table sizes**:
```sql
SELECT 
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname NOT IN ('pg_catalog', 'information_schema')
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC
LIMIT 10;
```

---

## Daily Monitoring Workflow

### Morning Routine (8:00 AM - 9:30 AM)

1. **Run System Health Check**
   ```bash
   ./system-health-check.sh [branch_code]
   ```
   - Review output for any red flags
   - Document any issues found

2. **Check Overnight Logs**
   ```bash
   grep ERROR /var/log/skoolific/backend.log | grep "$(date -d 'yesterday' '+%Y-%m-%d')"
   ```
   - Look for errors that occurred overnight
   - Check if any automated processes failed

3. **Verify Backup Completion**
   - Check that nightly database backup completed
   - Verify backup file exists and has reasonable size
   - Test backup integrity if possible

4. **Review Sync Queue**
   - Check for pending offline sync operations
   - Investigate any sync failures from previous day

5. **Check System Resources**
   - CPU usage
   - Memory usage
   - Disk space
   - Network connectivity

### Midday Routine (12:00 PM - 1:30 PM)

1. **Run Performance Monitor**
   ```bash
   node performance-monitor.js [branch_code]
   ```
   - Review API response times
   - Check database query performance

2. **Monitor Active Users**
   - Check concurrent user count
   - Verify login success rate
   - Review authentication failures

3. **Check Feature Usage**
   - Attendance marking activity
   - Mark list entries
   - Exam activity
   - Payment processing

4. **Review Support Tickets**
   - Check new tickets since morning
   - Respond to urgent issues
   - Update ticket status

### Afternoon Routine (4:00 PM - 5:30 PM)

1. **Run System Health Check**
   ```bash
   ./system-health-check.sh [branch_code]
   ```

2. **Check Notification Delivery**
   - Push notification delivery rate
   - Telegram bot status
   - SMS delivery (if enabled)

3. **Verify Data Integrity**
   - Spot-check attendance records
   - Verify mark list data
   - Check financial transaction accuracy

4. **Collect User Feedback**
   - Review in-app feedback
   - Check support ticket comments
   - Note any recurring complaints

5. **Prepare Daily Report**
   - Fill out Daily Monitoring Report template
   - Document all issues found
   - Note key observations
   - Prepare recommendations

### Evening Routine (7:00 PM - 8:00 PM)

1. **Run Final Health Check**
   ```bash
   ./system-health-check.sh [branch_code]
   ```

2. **Review End-of-Day Metrics**
   - Total users active today
   - Total transactions processed
   - Error count for the day

3. **Verify Backup Schedule**
   - Ensure backup job is scheduled to run
   - Check backup storage availability

4. **Update Issue Tracking**
   - Update status of all open issues
   - Document any new issues
   - Close resolved issues

5. **Submit Daily Report**
   - Complete Daily Monitoring Report
   - Share with monitoring team
   - Escalate critical issues if needed

---

## Automated Monitoring Scripts

### System Health Check Script

**Purpose**: Comprehensive health check of all system components

**What it checks**:
- Backend server status and response time
- Database connectivity and performance
- Disk space usage
- Memory usage
- CPU usage
- API endpoint accessibility
- Recent error logs

**How to use**:
```bash
cd .kiro/specs/skoolific-v2-upgrade/monitoring/monitoring-scripts
chmod +x system-health-check.sh
./system-health-check.sh [branch_code]
```

**Interpreting results**:
- ✓ (Green): Component is healthy
- ⚠ (Yellow): Warning - needs attention
- ✗ (Red): Critical issue - immediate action required

**Recommended schedule**: Every 4 hours

### Performance Monitor Script

**Purpose**: Measure and track API and database performance

**What it monitors**:
- API endpoint response times
- Database query execution times
- Success/failure rates
- Performance ratings (excellent/good/acceptable/slow/critical)

**How to use**:
```bash
cd .kiro/specs/skoolific-v2-upgrade/monitoring/monitoring-scripts
npm install  # First time only
node performance-monitor.js [branch_code]
```

**Output**: JSON file in `logs/` directory with detailed metrics

**Interpreting results**:
- **Excellent**: <200ms
- **Good**: 200-500ms
- **Acceptable**: 500-1000ms
- **Slow**: 1000-2000ms
- **Critical**: >2000ms

**Recommended schedule**: Every 2 hours during school hours

### Setting Up Automated Execution

**Using cron (Linux)**:
```bash
# Edit crontab
crontab -e

# Add these lines (adjust paths and branch code)
0 8,12,16,20 * * * /path/to/system-health-check.sh branch_code >> /path/to/logs/cron.log 2>&1
0 9,11,13,15,17 * * * cd /path/to/monitoring-scripts && node performance-monitor.js branch_code >> /path/to/logs/cron.log 2>&1
```

**Using Task Scheduler (Windows)**:
1. Open Task Scheduler
2. Create Basic Task
3. Set trigger (e.g., every 4 hours)
4. Set action: Run script
5. Configure script path and arguments

---

## Manual Monitoring Tasks

### User Feedback Collection

#### Methods

1. **Direct Observation**
   - Visit school during peak hours
   - Observe users interacting with system
   - Note any confusion or difficulties

2. **User Interviews**
   - Schedule 15-minute interviews with:
     - 2-3 administrators
     - 3-5 teachers
     - 2-3 students
     - 2-3 guardians
   - Ask about:
     - Overall experience
     - Specific pain points
     - Feature requests
     - Comparison to V1 (if applicable)

3. **Support Ticket Analysis**
   - Review all support tickets
   - Categorize by type
   - Identify patterns
   - Track resolution time

4. **In-App Feedback**
   - Check feedback submissions
   - Respond to user comments
   - Track sentiment (positive/negative)

#### Feedback Template

```
User Type: [Admin/Teacher/Student/Guardian]
Date: [DD/MM/YYYY]
Time: [HH:MM]

Overall Satisfaction: [1-5 stars]

What's working well:
- [Point 1]
- [Point 2]

What needs improvement:
- [Point 1]
- [Point 2]

Specific issues encountered:
- [Issue 1]
- [Issue 2]

Feature requests:
- [Request 1]
- [Request 2]

Additional comments:
[Free text]
```

### Feature Usage Tracking

#### Key Metrics to Track

1. **Attendance Management**
   - Number of attendance records created
   - Time taken to mark attendance
   - Error rate
   - User satisfaction

2. **Mark List Management**
   - Number of mark lists created
   - Number of marks entered
   - Time taken to enter marks
   - Error rate

3. **Exam System**
   - Exams created (manual vs AI-generated)
   - Exams published
   - Student participation rate
   - Auto-grading accuracy

4. **Financial Management**
   - Payments processed
   - Payment success rate
   - Time taken to process payment
   - Error rate

5. **Communication**
   - Posts created
   - Notification delivery rate
   - User engagement with posts

#### Tracking Method

Create a daily usage log:

```
Date: [DD/MM/YYYY]

Attendance:
- Records created: [X]
- Avg time per class: [X minutes]
- Errors: [X]

Mark Lists:
- Lists created: [X]
- Marks entered: [X]
- Errors: [X]

Exams:
- Created: [X] (AI: [X], Manual: [X])
- Published: [X]
- Taken: [X]

Payments:
- Processed: [X]
- Amount: [Currency] [Amount]
- Errors: [X]

Communication:
- Posts: [X]
- Notifications sent: [X]
- Delivery rate: [X%]
```

---

## Issue Management

### Issue Severity Levels

#### Critical (P0)
**Definition**: System completely down or major data loss

**Examples**:
- Backend server not responding
- Database connection failure
- Data corruption
- Security breach
- Payment processing completely broken

**Response Time**: Immediate (within 15 minutes)

**Resolution Target**: Within 2 hours

**Escalation**: Immediate to technical lead and project manager

#### High (P1)
**Definition**: Major feature non-functional or significant performance degradation

**Examples**:
- Login failures for multiple users
- Attendance marking not working
- Mark list not saving
- Notifications not delivering
- API response times >5 seconds

**Response Time**: Within 1 hour

**Resolution Target**: Within 4 hours

**Escalation**: To technical lead if not resolved in 2 hours

#### Medium (P2)
**Definition**: Minor feature bugs affecting some users

**Examples**:
- UI display issues
- Slow performance on specific features
- Minor data validation errors
- Intermittent sync issues

**Response Time**: Within 4 hours

**Resolution Target**: Within 24 hours

**Escalation**: To technical lead if not resolved in 8 hours

#### Low (P3)
**Definition**: Cosmetic issues or minor usability problems

**Examples**:
- Text alignment issues
- Color inconsistencies
- Minor UI improvements
- Feature enhancement requests

**Response Time**: Within 24 hours

**Resolution Target**: Can be deferred to next release

**Escalation**: Not required

### Issue Workflow

1. **Detection**
   - Automated monitoring alerts
   - User reports
   - Support tickets
   - Direct observation

2. **Documentation**
   - Create issue in Issue Tracking Log
   - Assign severity level
   - Document steps to reproduce
   - Capture error messages/screenshots

3. **Triage**
   - Assess impact
   - Determine priority
   - Assign to appropriate team member
   - Identify workaround if available

4. **Investigation**
   - Reproduce the issue
   - Analyze logs
   - Identify root cause
   - Determine fix approach

5. **Resolution**
   - Implement fix
   - Test fix in staging (if possible)
   - Deploy fix to production
   - Verify fix works

6. **Verification**
   - Confirm issue is resolved
   - Test related functionality
   - Monitor for recurrence
   - Update issue status

7. **Documentation**
   - Document root cause
   - Document fix applied
   - Update issue tracking log
   - Add to lessons learned

---

## Reporting

### Daily Report

**Template**: `DAILY_MONITORING_REPORT_TEMPLATE.md`

**Submission Time**: End of each day (by 6:00 PM)

**Recipients**:
- Monitoring team
- Technical lead
- Project manager
- School administrator

**Key Sections**:
- Executive summary
- System uptime and performance
- User activity
- Issues encountered
- Actions taken
- Recommendations

### Week Summary Report

**Template**: `WEEK_SUMMARY_REPORT_TEMPLATE.md`

**Submission Time**: End of monitoring week

**Recipients**:
- All stakeholders
- Executive team
- Technical team
- School administration

**Key Sections**:
- Overall assessment
- Performance metrics
- User adoption statistics
- Issue summary
- Data integrity verification
- Recommendations for next rollout

### Issue Tracking Log

**Template**: `ISSUE_TRACKING_TEMPLATE.md`

**Update Frequency**: Real-time (as issues occur)

**Purpose**: Comprehensive record of all issues encountered

**Sections**:
- Critical issues
- High priority issues
- Medium priority issues
- Low priority issues
- Issue statistics
- Recurring patterns
- Lessons learned

---

## Escalation Procedures

### When to Escalate

1. **Critical Issues (P0)**
   - Escalate immediately upon detection
   - No delay acceptable

2. **High Priority Issues (P1)**
   - Escalate if not resolved within 2 hours
   - Escalate if impact is growing

3. **Medium Priority Issues (P2)**
   - Escalate if not resolved within 8 hours
   - Escalate if affecting multiple users

4. **Recurring Issues**
   - Escalate if same issue occurs 3+ times
   - Indicates systemic problem

5. **User Dissatisfaction**
   - Escalate if multiple users complain about same issue
   - Escalate if user threatens to stop using system

### Escalation Path

**Level 1: Monitoring Team**
- Initial issue handling
- Basic troubleshooting
- Workaround identification

**Level 2: Technical Lead**
- Complex technical issues
- Issues requiring code changes
- Performance optimization
- Database issues

**Level 3: Project Manager**
- Issues affecting project timeline
- Resource allocation needs
- Stakeholder communication
- Decision on rollback

**Level 4: Executive Team**
- Critical business impact
- Major project decisions
- Budget implications
- Strategic direction

### Escalation Communication Template

```
ESCALATION NOTICE

Issue ID: [Issue ID]
Severity: [P0/P1/P2/P3]
Escalation Level: [1/2/3/4]

Issue Summary:
[Brief description of the issue]

Impact:
- Affected Users: [Number and type]
- Business Impact: [Description]
- Duration: [How long issue has persisted]

Actions Taken:
1. [Action 1]
2. [Action 2]

Current Status:
[Current state of the issue]

Reason for Escalation:
[Why escalation is needed]

Requested Action:
[What is needed from escalation recipient]

Contact:
[Your name and contact information]
```

---

## Best Practices

### Monitoring Best Practices

1. **Be Proactive**
   - Don't wait for users to report issues
   - Run automated checks regularly
   - Monitor trends, not just current state

2. **Document Everything**
   - Every issue, no matter how small
   - Every workaround discovered
   - Every user feedback point

3. **Communicate Clearly**
   - Use templates for consistency
   - Be specific with error descriptions
   - Include context and impact

4. **Stay Objective**
   - Report facts, not opinions
   - Use metrics to support observations
   - Avoid bias in user feedback collection

5. **Think Long-term**
   - Consider how issues affect future rollouts
   - Identify patterns and systemic problems
   - Recommend preventive measures

### User Interaction Best Practices

1. **Be Approachable**
   - Make it easy for users to report issues
   - Respond promptly to feedback
   - Thank users for their input

2. **Set Expectations**
   - Explain monitoring purpose
   - Clarify response times
   - Be honest about limitations

3. **Provide Updates**
   - Keep users informed of issue status
   - Explain what's being done
   - Celebrate fixes and improvements

4. **Collect Feedback Systematically**
   - Use consistent questions
   - Interview diverse user types
   - Document verbatim quotes

### Technical Best Practices

1. **Automate Where Possible**
   - Use scripts for repetitive checks
   - Set up alerts for critical metrics
   - Automate report generation

2. **Maintain Clean Logs**
   - Rotate logs regularly
   - Archive old logs
   - Keep logs organized by date

3. **Test Monitoring Tools**
   - Verify scripts work before monitoring period
   - Have backup monitoring methods
   - Document tool usage

4. **Secure Access**
   - Use strong passwords
   - Limit access to necessary personnel
   - Log all administrative actions

### Reporting Best Practices

1. **Be Timely**
   - Submit reports on schedule
   - Don't delay bad news
   - Provide real-time updates for critical issues

2. **Be Comprehensive**
   - Include all required sections
   - Provide context for metrics
   - Explain trends and patterns

3. **Be Actionable**
   - Include clear recommendations
   - Prioritize action items
   - Assign ownership

4. **Be Honest**
   - Report both successes and failures
   - Acknowledge limitations
   - Admit when you don't know something

---

## Appendices

### Appendix A: Monitoring Checklist Quick Reference

**Daily Tasks**:
- [ ] Morning health check (8 AM)
- [ ] Review overnight logs (8 AM)
- [ ] Verify backup (8 AM)
- [ ] Midday performance check (12 PM)
- [ ] Monitor active users (12 PM)
- [ ] Afternoon health check (4 PM)
- [ ] Check notifications (4 PM)
- [ ] Verify data integrity (4 PM)
- [ ] Evening health check (7 PM)
- [ ] Submit daily report (6 PM)

**Weekly Tasks**:
- [ ] Analyze usage trends
- [ ] Review all issues
- [ ] Conduct user interviews
- [ ] Verify data migration
- [ ] Prepare week summary report

### Appendix B: Common Issues and Solutions

**Issue**: Backend not responding  
**Solution**: Restart backend service, check logs for errors

**Issue**: Database connection timeout  
**Solution**: Check connection pool, restart PostgreSQL if needed

**Issue**: Slow API response  
**Solution**: Check database queries, optimize if needed, check server resources

**Issue**: Sync failures  
**Solution**: Check network connectivity, verify sync queue, retry failed operations

**Issue**: Notification not delivering  
**Solution**: Check notification service status, verify device tokens, check network

### Appendix C: Contact Information Template

```
Monitoring Team:
- Monitoring Lead: [Name] - [Phone] - [Email]
- Technical Monitor: [Name] - [Phone] - [Email]
- UX Monitor: [Name] - [Phone] - [Email]
- On-Site Coordinator: [Name] - [Phone] - [Email]

Technical Team:
- Technical Lead: [Name] - [Phone] - [Email]
- Backend Developer: [Name] - [Phone] - [Email]
- Database Admin: [Name] - [Phone] - [Email]

Management:
- Project Manager: [Name] - [Phone] - [Email]
- School Administrator: [Name] - [Phone] - [Email]

Emergency Contacts:
- 24/7 Support: [Phone]
- Escalation Hotline: [Phone]
```

### Appendix D: Useful Commands Reference

**Server Management**:
```bash
# Check backend service status
systemctl status skoolific-backend

# Restart backend service
sudo systemctl restart skoolific-backend

# View real-time logs
tail -f /var/log/skoolific/backend.log

# Check disk space
df -h

# Check memory usage
free -h

# Check CPU usage
top
```

**Database Management**:
```bash
# Connect to database
psql -h localhost -U postgres -d skoolific_branch

# Check database size
SELECT pg_size_pretty(pg_database_size('skoolific_branch'));

# Check active connections
SELECT count(*) FROM pg_stat_activity;

# Kill long-running query
SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE pid = [pid];
```

---

## Conclusion

Effective monitoring is crucial for successful Skoolific V2 rollout. By following this guide, the monitoring team can:

- Ensure system stability and performance
- Identify and resolve issues quickly
- Collect valuable user feedback
- Make data-driven decisions for future rollouts
- Build confidence in the system

Remember: The goal is not just to monitor, but to learn and improve. Every school rollout provides insights that make the next one better.

**Good luck with your monitoring!**
