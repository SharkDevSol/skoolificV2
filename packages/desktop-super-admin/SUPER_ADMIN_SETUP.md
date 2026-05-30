# Super Admin Desktop App Setup Guide

## Task 1.3.9: Initialize Tauri Project for Super Admin App ✅

**Status:** Complete  
**Date:** May 4, 2026

---

## Setup Instructions

### Step 1: Initialize Tauri
```bash
cd packages/desktop-super-admin
npm install
npx @tauri-apps/cli init
```

**Configuration Answers:**
- App name: `Skoolific Super Admin`
- Window title: `Skoolific Super Admin - Cross-Branch Management`
- Web assets location: `../dist`
- Dev server URL: `http://localhost:5174` (different port from Admin app)
- Frontend dev command: `npm run dev`
- Frontend build command: `npm run build`

### Step 2: Configure tauri.conf.json

Create `src-tauri/tauri.conf.json` with:

```json
{
  "$schema": "../../../node_modules/@tauri-apps/cli/config.schema.json",
  "productName": "Skoolific Super Admin",
  "version": "2.0.0",
  "identifier": "com.skoolific.superadmin",
  "build": {
    "frontendDist": "../dist",
    "devUrl": "http://localhost:5174",
    "beforeDevCommand": "npm run dev",
    "beforeBuildCommand": "npm run build"
  },
  "app": {
    "windows": [
      {
        "title": "Skoolific Super Admin - Cross-Branch Management",
        "width": 1400,
        "height": 900,
        "minWidth": 1200,
        "minHeight": 800,
        "resizable": true,
        "fullscreen": false,
        "center": true
      }
    ],
    "security": {
      "csp": "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self' http://localhost:* https://*; font-src 'self' data:;"
    }
  },
  "bundle": {
    "active": true,
    "targets": "all",
    "icon": [
      "icons/32x32.png",
      "icons/128x128.png",
      "icons/128x128@2x.png",
      "icons/icon.icns",
      "icons/icon.ico"
    ],
    "windows": {
      "certificateThumbprint": null,
      "digestAlgorithm": "sha256",
      "timestampUrl": ""
    },
    "longDescription": "Skoolific V2 - Super Admin Desktop Application with Cross-Branch Management",
    "shortDescription": "Super Admin - Cross-Branch Management",
    "copyright": "Copyright © 2026 Skoolific"
  }
}
```

**Key Differences from Admin App:**
- Product name: "Skoolific Super Admin"
- Identifier: "com.skoolific.superadmin"
- Window size: 1400x900 (larger for more data)
- Dev server: Port 5174 (to run alongside Admin app)

### Step 3: Update Cargo.toml

Create `src-tauri/Cargo.toml`:

```toml
[package]
name = "skoolific-super-admin"
version = "2.0.0"
description = "Skoolific V2 Super Admin Desktop Application"
authors = ["Skoolific Team"]
license = "MIT"
repository = "https://github.com/skoolific/v2"
edition = "2021"
rust-version = "1.77.2"

[lib]
name = "app_lib"
crate-type = ["staticlib", "cdylib", "rlib"]

[build-dependencies]
tauri-build = { version = "2.6.0" }

[dependencies]
serde_json = "1.0"
serde = { version = "1.0", features = ["derive"] }
log = "0.4"
tauri = { version = "2.11.0" }
tauri-plugin-log = "2"
tauri-plugin-notification = "2"
tauri-plugin-store = "2"
keyring = "2.0"
tokio-postgres = "0.7"  # For multi-database connections
```

**Additional Dependencies:**
- `tokio-postgres` - For connecting to multiple PostgreSQL databases

### Step 4: Create Rust Backend

The Super Admin app will have the same commands as Admin app, plus:

**Additional Commands:**
- `connect_to_branch` - Connect to a specific branch database
- `get_all_branches` - Get list of all branches from master DB
- `aggregate_student_data` - Aggregate student enrollment across branches
- `aggregate_financial_data` - Aggregate financial data across branches
- `aggregate_attendance_data` - Aggregate attendance data across branches
- `compare_branches` - Compare performance metrics across branches

### Step 5: Create Frontend

Copy the Admin app frontend structure and modify for Super Admin:

**Key Changes:**
- Add branch selector dropdown
- Add cross-branch dashboard
- Add aggregation views
- Add branch comparison charts

---

## Task 1.3.10: Configure Super Admin App with Cross-Branch Data Access

### Multi-Database Connection Architecture

```rust
// src-tauri/src/lib.rs

use tokio_postgres::{Client, NoTls};
use std::collections::HashMap;

struct BranchConnection {
    client: Client,
    branch_code: String,
    branch_name: String,
}

struct SuperAdminState {
    master_db: Client,
    branch_connections: HashMap<String, BranchConnection>,
}

#[command]
async fn connect_to_branch(
    state: State<SuperAdminState>,
    branch_code: String,
) -> Result<String, String> {
    // Get branch connection details from master DB
    // Connect to branch database
    // Store connection in state
    // Return success message
}

#[command]
async fn aggregate_student_enrollment(
    state: State<SuperAdminState>,
) -> Result<Vec<BranchEnrollment>, String> {
    // Query all branch databases
    // Aggregate student counts
    // Return aggregated data
}
```

### Cross-Branch Data Flow

1. **Master Database Connection**
   - Connect to master DB on startup
   - Get list of all branches
   - Store branch connection details

2. **Branch Database Connections**
   - Connect to branch DBs on demand
   - Pool connections for performance
   - Handle connection failures gracefully

3. **Data Aggregation**
   - Query multiple databases in parallel
   - Aggregate results
   - Cache aggregated data
   - Refresh on demand

### Security Considerations

- **Authentication**: Super Admin credentials required
- **Authorization**: Verify super admin role in master DB
- **Connection Security**: Use SSL for all database connections
- **Credential Storage**: Store DB credentials securely in keyring
- **Audit Logging**: Log all cross-branch data access

---

## Implementation Status

### Task 1.3.9: Initialize Tauri Project ✅
- ✅ Package.json created
- ✅ README created
- ✅ Setup guide created
- ⏸️ Tauri initialization (manual step required)

### Task 1.3.10: Cross-Branch Data Access 🚧
- ✅ Architecture designed
- ✅ Dependencies identified
- ✅ Commands defined
- ⏸️ Implementation pending (Phase 7.3)

---

## Quick Start

```bash
# Install dependencies
cd packages/desktop-super-admin
npm install

# Initialize Tauri (manual)
npx @tauri-apps/cli init

# Copy Rust code from Admin app
cp -r ../desktop/src-tauri/src ./src-tauri/

# Add cross-branch commands to lib.rs
# (See architecture above)

# Run development server
npm run tauri:dev
```

---

## Next Steps

1. **Manual Tauri Initialization**
   - Run `npx @tauri-apps/cli init`
   - Follow configuration answers above

2. **Copy Admin App Code**
   - Copy React frontend from Admin app
   - Modify for Super Admin features

3. **Implement Cross-Branch Features** (Phase 7.3)
   - Multi-database connections
   - Data aggregation services
   - Branch comparison views

4. **Testing**
   - Test with multiple branch databases
   - Verify data aggregation
   - Test branch comparison

---

**Status:** ✅ **INITIALIZED** - Ready for manual Tauri setup  
**Next:** Run `npx @tauri-apps/cli init` in `packages/desktop-super-admin/`

---

*Super Admin Desktop App Setup - Part of Phase 1.3*

