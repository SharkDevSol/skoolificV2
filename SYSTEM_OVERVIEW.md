# Skoolific School Management System - Complete Overview

## 🎯 System Introduction

**Skoolific** is a comprehensive, cloud-based school management system designed to digitize and streamline all aspects of school operations. The system serves multiple user types including administrators, teachers, students, and guardians through dedicated web and mobile applications.

**Live URL:** https://iqrab3.skoolific.com

---

## 🏗️ System Architecture

### Technology Stack
- **Frontend:** React.js with Vite
- **Backend:** Node.js with Express
- **Database:** PostgreSQL
- **Deployment:** VPS (Ubuntu Server)
- **Process Manager:** PM2
- **Web Server:** Nginx

### Multi-App Architecture
The system consists of **4 main applications:**

1. **Admin Web Dashboard** - Full-featured desktop application for school administrators
2. **Staff Mobile App** - Progressive Web App (PWA) for teachers and staff
3. **Student Mobile App** - PWA for students
4. **Guardian Mobile App** - PWA for parents/guardians

---

## 👥 User Roles & Access

### 1. Administrator
**Access:** Web Dashboard (Desktop)
**Login:** `/login`
**Capabilities:** Full system control and management

### 2. Staff/Teachers
**Access:** Mobile App (PWA)
**Login:** `/app/staff-login`
**Profile:** `/app/staff`
**Capabilities:** Teaching, attendance, grading, communication

### 3. Students
**Access:** Mobile App (PWA)
**Login:** `/app/student-login`
**Profile:** `/app/student/:username`
**Capabilities:** View grades, attendance, assignments, communication

### 4. Guardians/Parents
**Access:** Mobile App (PWA)
**Login:** `/app/guardian-login`
**Profile:** `/app/guardian/:username`
**Capabilities:** Monitor children, view reports, communicate with school

---

## 📱 Admin Dashboard Modules

### 1. Dashboard & Analytics
- **Main Dashboard** (`/dashboard`) - Real-time school overview
- **Task Management** (`/tasks`) - School-wide task tracking
- **Live Attendance Monitor** (`/live-attendance`) - Real-time attendance tracking

### 2. Student Management
- **Student Registration** (`/create-register-student`) - Enroll new students
- **Student Form Builder** (`/Student-Form-Builder`) - Customize registration forms
- **Student List** (`/list-student`) - View and manage all students
- **Student Reports** (`/reports/students`) - Comprehensive student analytics

### 3. Staff Management
- **Staff Registration** (`/create-register-staff`) - Add new staff members
- **Staff Form Builder** (`/Staff-Form-Builder`) - Customize staff forms
- **Staff List** (`/list-staff`) - View and manage all staff
- **Edit Staff** (`/edit-staff/:staffType/:className/:uniqueId`) - Update staff details
- **Staff Reports** (`/reports/staff`) - Staff analytics and performance

### 4. Guardian Management
- **Guardian List** (`/list-guardian`) - View and manage guardians
- **Guardian Notifications** (`/guardian-notifications`) - Send notifications to parents

### 5. Academic Management

#### 5.1 Mark List System
- **Create Mark List** (`/create-mark-list`) - Set up grading components
- **Mark List Management** (`/Mark-List-Management`) - Manage all mark lists
- **Subject Mapping** (`/Subject-Mapping-Setup`) - Map subjects to classes
- **Mark List View** (`/mark-list-view`) - View student grades
- **Report Card** (`/report-card`) - Generate report cards

#### 5.2 Evaluation System
- **Evaluation Manager** (`/evaluation`) - Create and manage evaluations
- **Evaluation Form** (`/evaluation-form/:evaluationId`) - Fill evaluation forms
- **Evaluation Details** (`/evaluation/:id`) - View evaluation results
- **Evaluations Report** (`/reports/evaluations`) - Evaluation analytics

#### 5.3 Evaluation Book (Daily Student Assessment)
- **Form Builder** (`/evaluation-book`) - Create evaluation templates
- **Teacher Assignments** (`/evaluation-book/assignments`) - Assign teachers to classes
- **Teacher Class List** (`/evaluation-book/teacher`) - View assigned classes
- **Daily Evaluation** (`/evaluation-book/daily/:className`) - Daily student assessments
- **Guardian Inbox** (`/evaluation-book/guardian`) - Parents view evaluations
- **Guardian Feedback** (`/evaluation-book/guardian/feedback/:evaluationId`) - Parent feedback
- **Reports** (`/evaluation-book/reports`) - Evaluation book analytics

### 6. Attendance Management

#### 6.1 Student Attendance
- **Attendance System** (`/student-attendance-system`) - Mark student attendance
- **Time Settings** (`/student-attendance-time-settings`) - Configure attendance times
- **Class Teacher Assignment** (`/class-teacher-assignment`) - Assign class teachers
- **Attendance Reports** (`/reports/attendance`) - Attendance analytics

### 7. Schedule Management
- **Schedule Dashboard** (`/schedule`) - Overview of all schedules
- **Timetable** (`/schedule/Timetable`) - Create and manage timetables
- **Class Shift Form** (`/schedule/ClassShiftForm`) - Configure class shifts
- **Class Requirements** (`/schedule/requirements`) - Set class requirements

### 8. Communication System
- **Admin Chat** (`/communication`) - Admin communication hub
- **Posts** (`/post`) - School-wide announcements and posts

### 9. Behavior Management
- **Student Faults** (`/student-faults`) - Record student infractions
- **Faults Management** (`/faults`) - Manage and track faults
- **Behavior Reports** (`/reports/behavior`) - Behavior analytics

### 10. Finance Module 💰

#### 10.1 Core Finance
- **Finance Dashboard** (`/finance`) - Financial overview
- **Chart of Accounts** (`/finance/accounts`) - Manage account structure
- **Fee Management** (`/finance/fee-management`) - Configure school fees
- **Fee Types** (`/finance/fee-types`) - Define fee categories
- **Invoice Management** (`/finance/invoices`) - Generate and manage invoices
- **Fee Payments** (`/finance/payments`) - Process fee payments
- **Monthly Payments** (`/finance/monthly-payments`) - Recurring payment tracking
- **Payment Settings** (`/finance/monthly-payment-settings`) - Configure payment schedules

#### 10.2 Expense Management
- **Expenses** (`/finance/expenses`) - Record school expenses
- **Expense Approval** (`/finance/expense-approval`) - Approve expense requests
- **Budgets** (`/finance/budgets`) - Budget planning and tracking

#### 10.3 Payroll
- **Payroll Management** (`/finance/payroll`) - Staff salary processing
- **Finance Reports** (`/finance/reports`) - Financial analytics

### 11. HR & Staff Management Module 👥

#### 11.1 Salary & Payroll
- **HR Dashboard** (`/hr`) - HR overview
- **Salary Management** (`/hr/salary`) - Configure staff salaries
- **Payroll System** (`/hr/payroll`) - Process monthly payroll

#### 11.2 Attendance & Time Tracking
- **Staff Attendance** (`/hr/attendance`) - Track staff attendance
- **Device Status** (`/hr/device-status`) - Monitor attendance devices
- **Attendance Deduction Settings** (`/hr/attendance-deduction-settings`) - Configure deductions
- **Time Settings** (`/hr/attendance-time-settings`) - Set work hours and shifts
- **Staff Specific Timing** (`/hr/staff-specific-timing`) - Individual staff schedules

#### 11.3 Leave Management
- **Leave Management** (`/hr/leave`) - Handle leave requests and approvals

#### 11.4 Performance
- **Performance Management** (`/hr/performance`) - Staff performance tracking
- **HR Reports** (`/hr/reports`) - HR analytics

### 12. Inventory Module 📦 (Coming Soon)
- **Inventory Dashboard** (`/inventory`) - Stock overview
- **Items Management** (`/inventory/items`) - Manage inventory items
- **Purchase Orders** (`/inventory/purchase-orders`) - Create purchase orders
- **Stock Movements** (`/inventory/movements`) - Track stock transfers
- **Supplier Management** (`/inventory/suppliers`) - Manage vendors
- **Inventory Reports** (`/inventory/reports`) - Inventory analytics

### 13. Asset Management Module 🏢 (Coming Soon)
- **Asset Dashboard** (`/assets`) - Asset overview
- **Asset Registry** (`/assets/registry`) - Register school assets
- **Asset Assignments** (`/assets/assignments`) - Assign assets to staff
- **Maintenance** (`/assets/maintenance`) - Track maintenance schedules
- **Depreciation** (`/assets/depreciation`) - Calculate depreciation
- **Asset Disposal** (`/assets/disposal`) - Manage asset disposal
- **Asset Reports** (`/assets/reports`) - Asset analytics

### 14. Reports & Analytics 📊
- **Students Report** (`/reports/students`) - Student analytics
- **Staff Report** (`/reports/staff`) - Staff analytics
- **Academic Report** (`/reports/academic`) - Academic performance
- **Attendance Report** (`/reports/attendance`) - Attendance analytics
- **Behavior Report** (`/reports/behavior`) - Behavior tracking
- **Evaluations Report** (`/reports/evaluations`) - Evaluation analytics

### 15. System Settings ⚙️
- **Settings** (`/settings`) - System configuration
- **Create Accounts** (`/create-accounts`) - User account management
- **Admin Sub-Accounts** (`/admin-sub-accounts`) - Manage admin permissions

---

## 📱 Staff Mobile App Features

**Access:** `/app/staff-login` → `/app/staff`

### Staff Profile Tabs:

1. **Profile** - Personal information and account details

2. **Schedule** - View teaching schedule
   - Weekly timetable
   - Class assignments
   - Subject schedule
   - Shift information

3. **Mark List** - Grade management
   - Select subject, class, term
   - Enter student marks
   - Component-based grading (Quiz, Test, Midterm, Final, etc.)
   - **Lock feature:** Marks automatically lock after saving (prevents editing after page refresh)
   - Progress tracking
   - Class average calculation

4. **Class Communication** - Teacher-class messaging
   - Send messages to entire class
   - View class posts
   - Announcements

5. **Posts** - School-wide feed
   - View school announcements
   - Like and interact with posts

6. **Attendance** (Class Teachers only)
   - Mark daily attendance
   - Weekly attendance sheets
   - Ethiopian calendar integration
   - Auto-save functionality
   - Attendance statistics

7. **Evaluation Book** - Daily student assessments
   - Fill daily evaluation forms
   - Rate student behavior and performance
   - Send evaluations to guardians
   - View evaluation reports

8. **Faults** - Report student infractions
   - Report student faults
   - Select fault type (Late Arrival, Absence, Misbehavior, etc.)
   - View fault history
   - Track student offenses

9. **Evaluations** - Formal assessments
   - Fill evaluation forms
   - View evaluation reports
   - Submit student scores

10. **Messages** - Direct communication
    - Chat with guardians
    - Chat with students
    - Chat with other staff

11. **Settings** - App preferences
    - Language selection
    - Notifications
    - Account settings

---

## 📱 Student Mobile App Features

**Access:** `/app/student-login` → `/app/student/:username`

### Student Profile Tabs:

1. **Profile** - Personal information

2. **Posts** - School feed
   - View school announcements
   - Like posts

3. **Class Communication** - Class messages
   - View class announcements
   - Receive messages from teachers

4. **Settings** - App preferences

---

## 📱 Guardian Mobile App Features

**Access:** `/app/guardian-login` → `/app/guardian/:username`

### Guardian Dashboard:

1. **Home** - Overview dashboard
   - Quick stats for all wards
   - Recent notifications

2. **Wards** - Children management
   - View all children
   - Switch between wards
   - Ward profiles

3. **Attendance** - Attendance tracking
   - View ward attendance
   - Attendance history
   - Absence notifications

4. **Marks** - Academic performance
   - View ward grades
   - Subject-wise marks
   - Report cards

5. **Notifications** - School updates
   - Evaluation book notifications
   - School announcements
   - Important alerts

6. **Messages** - Communication
   - Chat with teachers
   - Chat with school admin
   - View class messages

7. **Profile** - Guardian information
   - Personal details
   - Contact information

---

## 🔐 Security Features

### Authentication
- Role-based access control (RBAC)
- Secure login for all user types
- Session management
- Protected routes

### Data Protection
- PostgreSQL database with secure connections
- Password encryption
- User permission system
- Admin sub-account management with granular permissions

---

## 🌍 Multi-Language Support

The system supports multiple languages:
- **English**
- **Arabic**
- **Amharic** (Ethiopian)

Language selection available in Settings for all apps.

---

## 📅 Ethiopian Calendar Integration

The system includes full Ethiopian calendar support:
- Attendance tracking with Ethiopian dates
- Date conversion utilities
- Dual calendar display (Gregorian + Ethiopian)

---

## 🔔 Notification System

### Push Notifications
- Evaluation book notifications to guardians
- Attendance alerts
- School announcements
- Direct messages

### In-App Notifications
- Real-time updates
- Notification badges
- Notification history

---

## 📊 Reporting & Analytics

### Available Reports:
1. **Student Reports** - Enrollment, demographics, performance
2. **Staff Reports** - Staff analytics, attendance, performance
3. **Academic Reports** - Grades, evaluations, academic progress
4. **Attendance Reports** - Student and staff attendance analytics
5. **Behavior Reports** - Faults, discipline tracking
6. **Evaluation Reports** - Assessment analytics
7. **Finance Reports** - Financial statements, revenue, expenses
8. **HR Reports** - Payroll, leave, performance

---

## 🚀 Progressive Web App (PWA) Features

All mobile apps support PWA installation:

### Installation Pages:
- **Student App:** `/install/student-app`
- **Staff App:** `/install/staff-app`
- **Guardian App:** `/install/guardian-app`

### PWA Benefits:
- Install on mobile home screen
- Offline capability
- Push notifications
- App-like experience
- No app store required

---

## 🔄 Real-Time Features

### Live Updates:
- **Live Attendance Monitor** - Real-time attendance tracking
- **Chat System** - Real-time messaging
- **Notifications** - Instant push notifications

---

## 📝 Key System Workflows

### 1. Student Enrollment Workflow
1. Admin creates student registration form
2. Admin registers new student
3. System generates student account
4. Student receives login credentials
5. Guardian account automatically linked

### 2. Mark Entry Workflow
1. Admin creates mark list with components
2. Admin assigns subjects to teachers
3. Teacher logs into mobile app
4. Teacher selects subject, class, term
5. Teacher enters marks for each component
6. Marks automatically lock after saving
7. System calculates totals and generates report cards

### 3. Attendance Workflow
1. Admin assigns class teachers
2. Admin configures school days and times
3. Class teacher marks daily attendance
4. System auto-saves attendance
5. Guardians receive absence notifications
6. Reports generated automatically

### 4. Evaluation Book Workflow
1. Admin creates evaluation template
2. Admin assigns teachers to classes
3. Teacher fills daily evaluations
4. System sends to guardians
5. Guardians view and provide feedback
6. Reports generated for analysis

### 5. Fee Payment Workflow
1. Admin configures fee types
2. Admin generates invoices
3. System sends invoices to guardians
4. Payments recorded in system
5. Receipts generated automatically
6. Financial reports updated

---

## 🎨 User Interface Features

### Admin Dashboard:
- Modern, responsive design
- Sidebar navigation
- Quick stats cards
- Data tables with search and filters
- Charts and graphs
- Dark/light mode support

### Mobile Apps:
- Bottom navigation
- Swipe gestures
- Pull-to-refresh
- Skeleton loaders
- Toast notifications
- Modal dialogs
- Collapsible cards

---

## 🔧 System Configuration

### Admin Settings:
- School information
- Academic year setup
- Term configuration
- Class and section management
- Subject setup
- Fee structure
- Attendance rules
- Grading system
- User permissions

---

## 📈 System Scalability

### Current Capacity:
- Supports multiple schools (multi-tenant ready)
- Unlimited users per school
- Unlimited students, staff, guardians
- Cloud-based infrastructure
- Scalable database architecture

---

## 🆘 Support & Maintenance

### System Monitoring:
- PM2 process management
- Server health monitoring
- Database backup systems
- Error logging and tracking

### Updates:
- Regular feature updates
- Security patches
- Bug fixes
- Performance improvements

---

## 📞 System Access Points

### Admin Dashboard:
- **URL:** https://iqrab3.skoolific.com
- **Login:** `/login`

### Staff Mobile App:
- **URL:** https://iqrab3.skoolific.com/app/staff-login
- **Install:** https://iqrab3.skoolific.com/install/staff-app

### Student Mobile App:
- **URL:** https://iqrab3.skoolific.com/app/student-login
- **Install:** https://iqrab3.skoolific.com/install/student-app

### Guardian Mobile App:
- **URL:** https://iqrab3.skoolific.com/app/guardian-login
- **Install:** https://iqrab3.skoolific.com/install/guardian-app

---

## 🎯 System Benefits

### For Administrators:
✅ Complete school management in one platform
✅ Real-time data and analytics
✅ Automated workflows
✅ Reduced paperwork
✅ Better decision making

### For Teachers:
✅ Easy grade entry and management
✅ Mobile access anywhere
✅ Automated attendance tracking
✅ Direct communication with guardians
✅ Digital evaluation tools

### For Students:
✅ Access grades and attendance
✅ View assignments and announcements
✅ Communicate with teachers
✅ Track academic progress

### For Guardians:
✅ Monitor children's performance
✅ Real-time notifications
✅ Direct communication with teachers
✅ View attendance and grades
✅ Receive daily evaluations

---

## 🔮 Future Enhancements

### Planned Features:
- ✅ Finance Module (Completed)
- ✅ HR Module (Completed)
- 🚧 Inventory Module (In Development)
- 🚧 Asset Management (In Development)
- 📅 Library Management
- 📅 Transport Management
- 📅 Hostel Management
- 📅 Online Exams
- 📅 Video Conferencing
- 📅 Mobile Apps (Native iOS/Android)

---

## 📚 Technical Documentation

### For Developers:
- React.js frontend with Vite
- Node.js/Express backend
- PostgreSQL database
- RESTful API architecture
- JWT authentication
- Redux state management
- Axios for API calls
- React Router for navigation
- CSS Modules for styling

### Database Structure:
- Students table
- Staff table
- Guardians table
- Classes table
- Subjects table
- Mark lists (dynamic tables per subject/class/term)
- Attendance tables (weekly tables)
- Evaluation tables
- Finance tables
- HR tables
- And many more...

---

## 🎓 Conclusion

**Skoolific** is a complete, modern school management system that digitizes every aspect of school operations. From student enrollment to graduation, from daily attendance to annual reports, from fee collection to staff payroll - everything is managed in one integrated platform.

The system is designed to be:
- **User-friendly** - Intuitive interfaces for all user types
- **Comprehensive** - Covers all school management needs
- **Scalable** - Grows with your school
- **Secure** - Protects sensitive data
- **Accessible** - Web and mobile access
- **Efficient** - Automates repetitive tasks
- **Insightful** - Provides actionable analytics

---

**System Version:** 2.0
**Last Updated:** April 2026
**Developed By:** Skoolific Team
**Support:** support@skoolific.com

---

*This document provides a complete overview of the Skoolific School Management System. For specific feature documentation or technical support, please contact the development team.*
