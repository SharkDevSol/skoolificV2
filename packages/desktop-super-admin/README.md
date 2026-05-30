# Skoolific V2 Super Admin Desktop Application

## Overview
Native desktop application built with Tauri 2.0 for super administrators with cross-branch data access and aggregation capabilities.

## Features
- **Cross-Branch Access**: View and manage data across all school branches
- **Data Aggregation**: Consolidated reports and analytics
- **Branch Comparison**: Compare performance across branches
- **Secure Credential Storage**: OS-level secure storage
- **Native Desktop Notifications**: System tray integration
- **Multi-Database Connections**: Connect to multiple branch databases simultaneously

## Technology Stack
- **Framework**: Tauri 2.0 (Rust backend + React frontend)
- **Frontend**: React.js with Vite
- **Backend**: Rust
- **Database**: PostgreSQL (multi-database connections)

## Setup Instructions

### Prerequisites
- Node.js >= 18.0.0
- Rust toolchain
- Platform-specific dependencies (see Tauri documentation)

### Installation
```bash
# From workspace root
cd packages/desktop-super-admin

# Install dependencies
npm install

# Install Tauri API
npm install @tauri-apps/api
```

### Development
```bash
# Run in development mode
npm run tauri:dev
```

### Build
```bash
# Build for production
npm run tauri:build
```

## Differences from Admin App

### Admin App
- Single branch access
- Branch-specific data only
- Standard admin permissions

### Super Admin App
- **Multi-branch access**
- **Cross-branch data aggregation**
- **Branch comparison reports**
- **System-wide analytics**
- **Super admin permissions**

## Key Features

### 1. Cross-Branch Dashboard
- View all branches at a glance
- Real-time status indicators
- Quick branch switching

### 2. Aggregated Reports
- Student enrollment across all branches
- Financial summary (all branches)
- Attendance statistics (all branches)
- Academic performance comparison

### 3. Branch Management
- Add/edit/delete branches
- Configure branch settings
- Monitor branch health

### 4. System Administration
- User management across branches
- System-wide settings
- Backup and restore

## Status
✅ **Initialized** - Ready for development

## Next Steps
1. Configure Tauri for Super Admin
2. Implement multi-database connections
3. Create cross-branch dashboard
4. Implement data aggregation services
5. Add branch comparison features

---

*Super Admin Desktop App - Part of Skoolific V2 Upgrade*

