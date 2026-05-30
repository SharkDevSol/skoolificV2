# Skoolific V2 - Multi-Platform School Management System

## Overview

Skoolific V2 is a comprehensive school management system designed for Ethiopian schools. It transforms the existing web-based V1 system into a multi-platform solution with native desktop and mobile applications, AI-powered test generation, multi-branch architecture, offline-first capabilities, and full Ethiopian calendar integration.

**Current Status**: 🚧 Under active development - V2 upgrade in progress

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Client Applications                       │
├──────────────────┬──────────────────┬──────────────────────────┤
│   Admin_App      │  Super_Admin_App │   Staff/Student/         │
│   (Tauri Desktop)│  (Tauri/Mobile)  │   Guardian_App (Mobile)  │
└────────┬─────────┴────────┬─────────┴──────────┬───────────────┘
         │                  │                    │
         └──────────────────┼────────────────────┘
                            │
                    ┌───────▼────────┐
                    │  API Gateway   │
                    │  (Express.js)  │
                    └───────┬────────┘
                            │
         ┌──────────────────┼──────────────────┐
         │                  │                  │
    ┌────▼────┐      ┌─────▼──────┐    ┌─────▼──────┐
    │ Branch1 │      │  Branch2   │    │  Branch3   │
    │   DB    │      │     DB     │    │     DB     │
    └─────────┘      └────────────┘    └────────────┘
```

## Monorepo Structure

This project uses **npm workspaces** to manage multiple applications in a single repository:

```
skoolific-v2/
├── packages/
│   ├── backend/              # Node.js/Express API server
│   ├── frontend/             # React admin web app
│   ├── desktop/              # Tauri desktop apps (Admin & Super Admin)
│   ├── mobile-staff/         # Capacitor mobile app for staff
│   ├── mobile-student/       # Capacitor mobile app for students
│   ├── mobile-guardian/      # Capacitor mobile app for guardians
│   └── mobile-super-admin/   # Capacitor mobile app for super admins
├── backend/                  # Actual backend code (V1 location)
├── APP/                      # Actual frontend code (V1 location)
├── .kiro/                    # Kiro AI specs and configuration
├── package.json              # Root workspace configuration
└── README.md                 # This file
```

## Key Features

### 🌍 Multi-Platform Support
- **Desktop**: Native Tauri applications for Windows (Admin & Super Admin)
- **Mobile**: Native Android APKs via Capacitor (Staff, Student, Guardian, Super Admin)
- **Web**: React-based admin interface

### 🏢 Multi-Branch Architecture
- Separate PostgreSQL database per branch
- Unique branch codes for authentication
- Cross-branch data aggregation for super admins
- Complete data isolation between branches

### 🤖 AI-Powered Test Generation
- Google Gemini API integration
- Support for 9 question types (MCQ, True/False, Matching, Essay, etc.)
- Multi-language support (English, Arabic, Amharic, Oromo, Somali, French)
- Automatic grading for objective questions
- Teacher review and approval workflow

### 📅 Ethiopian Calendar Integration
- Full Ethiopian calendar support for all date operations
- Automatic conversion between Gregorian and Ethiopian dates
- Academic year management using Ethiopian calendar
- Multi-language date formatting (English, Amharic)

### 📴 Offline-First Architecture
- Local storage with IndexedDB
- Automatic synchronization when online
- Offline queue for pending operations
- Sync status indicators

### 🔔 Multi-Channel Notifications
- Push notifications (mobile & desktop)
- Telegram bot integration
- SMS notifications
- Email notifications

### 🔐 Enhanced Security
- JWT-based authentication with branch context
- Role-based access control
- Secure credential storage (OS keychain for desktop, secure storage for mobile)
- Data encryption at rest and in transit

## Prerequisites

- **Node.js**: >= 18.0.0
- **npm**: >= 9.0.0
- **PostgreSQL**: >= 14.0
- **Rust**: Latest stable (for Tauri desktop apps)
- **Android Studio**: Latest (for mobile apps)
- **Java JDK**: 17+ (for Android builds)

## Installation

### 1. Clone the Repository
```bash
git clone <repository-url>
cd skoolific-v2
```

### 2. Install Dependencies
```bash
# Install all workspace dependencies
npm install
```

This will install dependencies for all workspaces (backend, frontend, desktop, mobile apps).

### 3. Configure Environment Variables

#### Backend (.env in backend/ directory)
```env
DB_HOST=localhost
DB_PORT=5432
DB_USER=your_db_user
DB_PASSWORD=your_db_password
DB_NAME=your_db_name
JWT_SECRET=your_jwt_secret
GEMINI_API_KEY=your_gemini_api_key
API_HOST=localhost
API_PORT=3000
API_PROTOCOL=http
```

#### Frontend (.env in APP/ directory)
```env
VITE_API_BASE_URL=http://localhost:3000
VITE_APP_NAME=Skoolific V2
VITE_APP_VERSION=2.0.0
```

### 4. Database Setup
```bash
# Run database migrations
cd backend
npx prisma migrate dev
npx prisma generate
```

## Development

### Run Backend API Server
```bash
# From root
npm run dev:backend

# Or from backend workspace
npm run dev --workspace=packages/backend
```

### Run Frontend Web App
```bash
# From root
npm run dev:frontend

# Or from frontend workspace
npm run dev --workspace=packages/frontend
```

### Run Desktop App (After Tauri Setup)
```bash
npm run dev --workspace=packages/desktop
```

### Run Mobile Apps (After Capacitor Setup)
```bash
# Staff app
npm run dev --workspace=packages/mobile-staff

# Student app
npm run dev --workspace=packages/mobile-student

# Guardian app
npm run dev --workspace=packages/mobile-guardian

# Super Admin app
npm run dev --workspace=packages/mobile-super-admin
```

## Building for Production

### Backend
```bash
npm run start:backend
```

### Frontend
```bash
npm run build:frontend
```

### Desktop Apps
```bash
npm run build:desktop
```

### Mobile Apps
```bash
npm run build:mobile-staff
npm run build:mobile-student
npm run build:mobile-guardian
npm run build:mobile-super-admin
```

## Testing

### Run All Tests
```bash
npm test
```

### Run Tests for Specific Workspace
```bash
npm run test --workspace=packages/backend
npm run test --workspace=packages/frontend
```

### Run Property-Based Tests
```bash
npm run test:property --workspace=packages/backend
```

## Project Status

### ✅ Completed
- Multi-branch database architecture
- Ethiopian calendar integration
- Branch code authentication system
- Centralized API configuration
- Backend API structure
- Frontend admin interface (V1)

### 🚧 In Progress
- Monorepo structure setup (Phase 1.1)
- Tauri desktop application setup (Phase 1.3)
- Capacitor mobile application setup (Phase 1.4)

### 📋 Planned
- AI-powered test generation (Phase 2)
- Offline-first architecture (Phase 3)
- Multi-channel notifications (Phase 4)
- Data migration from V1 to V2 (Phase 5)
- UI/UX improvements (Phase 6-8)
- Performance optimization (Phase 9)
- Testing and deployment (Phase 10)

## Documentation

- **Requirements**: `.kiro/specs/skoolific-v2-upgrade/requirements.md`
- **Design**: `.kiro/specs/skoolific-v2-upgrade/design.md`
- **Tasks**: `.kiro/specs/skoolific-v2-upgrade/tasks.md`
- **Backend README**: `packages/backend/README.md`
- **Frontend README**: `packages/frontend/README.md`
- **Desktop README**: `packages/desktop/README.md`
- **Mobile Apps READMEs**: `packages/mobile-*/README.md`

## Technology Stack

### Backend
- Node.js + Express.js
- PostgreSQL + Prisma ORM
- JWT Authentication
- Google Gemini API
- Socket.io (real-time features)

### Frontend
- React.js 19.1.0
- Vite
- Material-UI + Ant Design
- Axios
- Dexie.js (IndexedDB)
- Ethiopian Calendar Converter

### Desktop
- Tauri 2.0
- Rust
- React.js

### Mobile
- Capacitor 6.0
- React.js
- Android SDK

## Contributing

This is a private project for Ethiopian schools. For development team members:

1. Follow the task list in `.kiro/specs/skoolific-v2-upgrade/tasks.md`
2. Create feature branches from `develop`
3. Submit pull requests for review
4. Ensure all tests pass before merging

## License

UNLICENSED - Private project for Skoolific schools.

## Support

For technical support or questions, contact the development team.

## Troubleshooting

### Common Issues

#### 1. Database Connection Errors

**Problem:** Backend fails to connect to PostgreSQL database

**Solutions:**
- Verify PostgreSQL is running: `pg_isready -h localhost -p 5432`
- Check database credentials in `backend/.env`
- Ensure database exists: `psql -U postgres -l | grep skoolific`
- Test connection: `psql -h localhost -U postgres -d skoolific`

#### 2. Port Already in Use

**Problem:** `Error: listen EADDRINUSE: address already in use :::5052`

**Solutions:**
- Check what's using the port: `netstat -ano | findstr :5052` (Windows) or `lsof -i :5052` (Linux/Mac)
- Kill the process or change `PORT` in `backend/.env`
- Use a different port: `PORT=5053 npm run dev`

#### 3. Frontend Cannot Reach Backend

**Problem:** API requests fail with CORS or network errors

**Solutions:**
- Verify backend is running: `curl http://localhost:5052/health`
- Check `VITE_API_URL` in `APP/.env` matches backend port
- Ensure `FRONTEND_URL` in `backend/.env` matches frontend URL
- Check firewall settings

#### 4. JWT Authentication Failing

**Problem:** Login fails or tokens are invalid

**Solutions:**
- Verify `JWT_SECRET` is set in `backend/.env`
- Ensure secret is at least 32 characters
- Check token expiration: `JWT_EXPIRES_IN=24h`
- Clear browser localStorage and try again

#### 5. Ethiopian Calendar Not Working

**Problem:** Dates display incorrectly or calendar conversion fails

**Solutions:**
- Verify `ethiopian-calendar-date-converter` is installed
- Check import: `import EthiopianCalendar from '@/utils/ethiopianCalendar'`
- Test conversion: `EthiopianCalendar.now()`
- Ensure timezone is set: `timezone=Africa/Addis_Ababa` in `DATABASE_URL`

#### 6. Gemini API Errors

**Problem:** AI test generation fails

**Solutions:**
- Verify `GEMINI_API_KEY` is set in `backend/.env`
- Check API key validity: https://makersuite.google.com/app/apikey
- Verify API quota hasn't been exceeded
- Test API: `curl -H "x-goog-api-key: YOUR_KEY" https://generativelanguage.googleapis.com/v1/models`

#### 7. Build Failures

**Problem:** `npm run build` fails

**Solutions:**
- Clear node_modules: `rm -rf node_modules && npm install`
- Clear build cache: `rm -rf dist && npm run build`
- Check for TypeScript errors: `npm run lint`
- Verify all dependencies are installed: `npm install`

#### 8. Workspace Installation Issues

**Problem:** `npm install` fails with workspace errors

**Solutions:**
- Use `--legacy-peer-deps`: `npm install --legacy-peer-deps`
- Clear npm cache: `npm cache clean --force`
- Delete package-lock.json and reinstall: `rm package-lock.json && npm install`
- Install workspaces individually if needed

#### 9. Tauri Build Errors

**Problem:** Desktop app build fails

**Solutions:**
- Ensure Rust is installed: `rustc --version`
- Update Rust: `rustup update`
- Install Tauri CLI: `npm install -g @tauri-apps/cli`
- Check Tauri prerequisites: https://tauri.app/v1/guides/getting-started/prerequisites

#### 10. Capacitor Build Errors

**Problem:** Mobile app build fails

**Solutions:**
- Ensure Android Studio is installed
- Set JAVA_HOME: `export JAVA_HOME=/path/to/jdk`
- Update Capacitor: `npm install @capacitor/cli@latest @capacitor/core@latest`
- Sync platforms: `npx cap sync`

### Getting Help

If you encounter issues not covered here:

1. Check the [Environment Variables Documentation](ENVIRONMENT_VARIABLES.md)
2. Review the [Contributing Guide](CONTRIBUTING.md)
3. Check the spec files in `.kiro/specs/skoolific-v2-upgrade/`
4. Contact the development team
5. Create an issue with:
   - Error message
   - Steps to reproduce
   - Environment details (OS, Node version, etc.)

---

**Version**: 2.0.0  
**Last Updated**: 2025  
**Maintained by**: Skoolific Development Team
