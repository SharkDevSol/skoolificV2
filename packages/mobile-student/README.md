# Skoolific V2 Mobile Student Application

## Overview
Native mobile application (APK) for students to view grades, take exams, and access school information.

## Features
- View grades and report cards
- Take digital exams with automatic grading
- View attendance records
- Receive push notifications
- Access class schedule
- View school announcements and posts
- Persistent login with secure credential storage
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
npm run cap:init --workspace=packages/mobile-student

# Add Android platform
npm run cap:add:android --workspace=packages/mobile-student
```

### Development
```bash
# Run in development mode
npm run dev --workspace=packages/mobile-student

# Sync web assets to native project
npm run cap:sync --workspace=packages/mobile-student

# Open in Android Studio
npm run cap:open:android --workspace=packages/mobile-student
```

### Build
```bash
# Build APK
npm run android:build --workspace=packages/mobile-student
```

## Status
🚧 **Under Development** - Placeholder workspace created. Full implementation pending.
