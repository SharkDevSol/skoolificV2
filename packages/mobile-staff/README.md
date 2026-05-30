# Skoolific V2 Mobile Staff Application

## Overview
Native mobile application (APK) for school staff members including teachers, administrative staff, and supportive staff.

## Features
- **Role-Based UI**: Different features based on staff type
  - **Teachers**: Mark lists, attendance, exam creation, class management, schedule view, student reports
  - **Administrative**: Student registration, fee management, reports, communication
  - **Supportive**: Attendance view, schedule view, communication
- Persistent login with secure credential storage
- Push notifications
- Offline mode with synchronization
- Username and password change functionality

## Technology Stack
- **Framework**: Capacitor (web-to-native wrapper)
- **Frontend**: React.js with Vite
- **Platform**: Android (APK)

## Setup Instructions
This workspace is a placeholder. Capacitor setup will be completed in Phase 1.4 of the implementation plan.

### Prerequisites
- Node.js >= 18.0.0
- Android Studio
- Java Development Kit (JDK) 17+

### Installation
```bash
# From workspace root
npm install

# Initialize Capacitor (after setup)
npm run cap:init --workspace=packages/mobile-staff

# Add Android platform
npm run cap:add:android --workspace=packages/mobile-staff
```

### Development
```bash
# Run in development mode
npm run dev --workspace=packages/mobile-staff

# Sync web assets to native project
npm run cap:sync --workspace=packages/mobile-staff

# Open in Android Studio
npm run cap:open:android --workspace=packages/mobile-staff
```

### Build
```bash
# Build APK
npm run android:build --workspace=packages/mobile-staff
```

## Status
🚧 **Under Development** - Placeholder workspace created. Full implementation pending.
