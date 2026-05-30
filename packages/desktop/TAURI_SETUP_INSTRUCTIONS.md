# Tauri Desktop App Setup Instructions

## Phase 1.3: Tauri Desktop Application Setup - IN PROGRESS

### ✅ Completed Tasks

#### 1.3.1: Install Tauri CLI and Initialize Tauri Project ✅
- Rust toolchain installed (v1.95.0)
- Cargo installed (v1.95.0)
- Tauri CLI installed (@tauri-apps/cli@latest)
- Tauri project initialized in `packages/desktop/src-tauri/`

### 📋 Manual Configuration Required

#### Update tauri.conf.json
The file `packages/desktop/src-tauri/tauri.conf.json` needs to be updated with the following configuration:

```json
{
  "$schema": "../../../node_modules/@tauri-apps/cli/config.schema.json",
  "productName": "Skoolific Admin",
  "version": "2.0.0",
  "identifier": "com.skoolific.admin",
  "build": {
    "frontendDist": "../dist",
    "devUrl": "http://localhost:5173",
    "beforeDevCommand": "npm run dev",
    "beforeBuildCommand": "npm run build"
  },
  "app": {
    "windows": [
      {
        "title": "Skoolific Admin - School Management System",
        "width": 1280,
        "height": 800,
        "minWidth": 1024,
        "minHeight": 768,
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
    "longDescription": "Skoolific V2 - Complete School Management System for Administrators",
    "shortDescription": "School Management System",
    "copyright": "Copyright © 2026 Skoolific"
  }
}
```

**Key Changes:**
- Product name: "Skoolific Admin"
- Identifier: "com.skoolific.admin"
- Window size: 1280x800 (min 1024x768)
- Dev server: http://localhost:5173 (Vite default)
- Frontend dist: ../dist (Vite default)
- Added CSP for security
- Added Windows-specific bundle settings

### 🚀 Next Steps

The following Rust code will be implemented to add secure credential storage and native notifications:

1. **Secure Credential Storage** (Tasks 1.3.4-1.3.5)
   - Uses Windows Credential Manager (keyring-rs)
   - Stores username, password, branch code securely
   
2. **Native Notifications** (Task 1.3.6)
   - System tray notifications
   - Desktop alerts

3. **Frontend Integration**
   - React app with Vite
   - Tauri API integration
   - Persistent login UI

### 📦 Dependencies to Add

Add to `Cargo.toml`:
```toml
keyring = "2.0"
tauri-plugin-notification = "2"
tauri-plugin-store = "2"
```

### 🔧 Development Commands

```bash
# Run in development mode
npm run tauri dev

# Build for production
npm run tauri build

# Test Rust code
cargo test --manifest-path=packages/desktop/src-tauri/Cargo.toml
```

### ⚠️ Important Notes

1. **Manual Configuration**: Please update `tauri.conf.json` manually with the configuration above
2. **Icons**: Default Tauri icons are in `src-tauri/icons/`. Replace with Skoolific branding later
3. **Security**: CSP is configured for development. Adjust for production as needed
4. **Windows Only**: Current setup is for Windows. macOS/Linux support can be added later

