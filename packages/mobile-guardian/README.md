# Skoolific V2 Mobile Guardian Application

## Overview
Native mobile application (APK) for parents and guardians to monitor their wards' academic progress.

## Features
- View all wards' academic performance
- View report cards for each ward
- Monitor attendance records
- Receive push notifications about student activities
- View monthly payment status
- Access school announcements
- Communicate with school administration
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
npm run cap:init --workspace=packages/mobile-guardian

# Add Android platform
npm run cap:add:android --workspace=packages/mobile-guardian
```

### Development
```bash
# Run in development mode
npm run dev --workspace=packages/mobile-guardian

# Sync web assets to native project
npm run cap:sync --workspace=packages/mobile-guardian

# Open in Android Studio
npm run cap:open:android --workspace=packages/mobile-guardian
```

### Build
```bash
# Build APK
npm run android:build --workspace=packages/mobile-guardian
```

## Status
🚧 **Under Development** - Placeholder workspace created. Full implementation pending.
