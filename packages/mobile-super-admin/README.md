# Skoolific V2 Mobile Super Admin Application

## Overview
Native mobile application (APK) for super administrators to aggregate and view data across all school branches.

## Features
- Cross-branch data aggregation
- Consolidated reporting dashboard
- View student enrollment across all branches
- Monitor financial data across all branches
- Track attendance data across all branches
- Analyze academic performance across all branches
- Branch-wise comparison reports
- Push notifications
- Persistent login with secure credential storage
- Offline mode with synchronization

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
npm run cap:init --workspace=packages/mobile-super-admin

# Add Android platform
npm run cap:add:android --workspace=packages/mobile-super-admin
```

### Development
```bash
# Run in development mode
npm run dev --workspace=packages/mobile-super-admin

# Sync web assets to native project
npm run cap:sync --workspace=packages/mobile-super-admin

# Open in Android Studio
npm run cap:open:android --workspace=packages/mobile-super-admin
```

### Build
```bash
# Build APK
npm run android:build --workspace=packages/mobile-super-admin
```

## Status
🚧 **Under Development** - Placeholder workspace created. Full implementation pending.
