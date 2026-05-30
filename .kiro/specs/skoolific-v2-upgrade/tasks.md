# Implementation Plan: Skoolific V2 Upgrade

## Overview
This document outlines the implementation tasks for upgrading Skoolific from V1 to V2. The upgrade includes native desktop and mobile applications, AI-powered test generation, multi-branch architecture, offline-first capabilities, and comprehensive system improvements.

**Total Duration:** 32 weeks (10 phases)
**Team Size:** 3-5 developers recommended

## Task Dependency Graph

```json
{
  "waves": [
    {
      "name": "Wave 1: Foundation",
      "tasks": ["1.1.1", "1.1.2", "1.1.3", "1.1.4", "1.1.5", "1.1.6", "1.2.1", "1.2.2", "1.2.3", "1.2.4", "1.2.5", "1.2.6"]
    },
    {
      "name": "Wave 2: Native App Setup",
      "tasks": ["1.3.1", "1.3.2", "1.3.3", "1.3.4", "1.3.5", "1.3.6", "1.3.7", "1.3.8", "1.3.9", "1.3.10", "1.4.1", "1.4.2", "1.4.3", "1.4.4", "1.4.5", "1.4.6", "1.4.7", "1.4.8", "1.4.9", "1.4.10"]
    },
    {
      "name": "Wave 3: Calendar & Database",
      "tasks": ["1.5.1", "1.5.2", "1.5.3", "1.5.4", "1.5.5", "1.5.6", "1.5.7", "1.5.8", "1.5.9", "1.5.10", "1.6.1", "1.6.2", "1.6.3", "1.6.4", "1.6.5", "1.6.6", "1.6.7", "1.6.8"]
    },
    {
      "name": "Wave 4: Authentication & Schema",
      "tasks": ["1.7.1", "1.7.2", "1.7.3", "1.7.4", "1.7.5", "1.7.6", "1.7.7", "1.7.8", "1.8.1", "1.8.2", "1.8.3", "1.8.4", "1.8.5", "1.8.6", "1.8.7", "1.8.8", "1.8.9", "1.8.10", "1.8.11", "1.8.12", "1.8.13", "1.8.14", "1.8.15", "1.8.16", "1.8.17"]
    },
    {
      "name": "Wave 5: Data Migration",
      "tasks": ["2.1.1", "2.1.2", "2.1.3", "2.1.4", "2.1.5", "2.1.6", "2.1.7", "2.1.8", "2.1.9", "2.1.10", "2.1.11", "2.1.12", "2.2.1", "2.2.2", "2.2.3", "2.2.4", "2.2.5", "2.2.6", "2.2.7", "2.2.8"]
    },
    {
      "name": "Wave 6: Year Rollover",
      "tasks": ["2.3.1", "2.3.2", "2.3.3", "2.3.4", "2.3.5", "2.3.6", "2.3.7", "2.3.8", "2.3.9", "2.3.10", "2.3.11", "2.3.12", "2.3.13", "2.3.14", "2.3.15", "2.3.16"]
    },
    {
      "name": "Wave 7: AI Integration",
      "tasks": ["3.1.1", "3.1.2", "3.1.3", "3.1.4", "3.1.5", "3.1.6", "3.1.7", "3.1.8", "3.2.1", "3.2.2", "3.2.3", "3.2.4", "3.2.5", "3.2.6", "3.2.7", "3.2.8"]
    },
    {
      "name": "Wave 8: Question Handlers & Exam UI",
      "tasks": ["3.3.1", "3.3.2", "3.3.3", "3.3.4", "3.3.5", "3.3.6", "3.3.7", "3.3.8", "3.3.9", "3.3.10", "3.3.11", "3.3.12", "3.4.1", "3.4.2", "3.4.3", "3.4.4", "3.4.5", "3.4.6", "3.4.7", "3.4.8", "3.4.9", "3.4.10", "3.4.11", "3.4.12", "3.4.13", "3.4.14", "3.4.15"]
    },
    {
      "name": "Wave 9: Exam Publishing & Grading",
      "tasks": ["3.5.1", "3.5.2", "3.5.3", "3.5.4", "3.5.5", "3.5.6", "3.5.7", "3.5.8", "3.5.9", "3.5.10", "3.5.11", "3.5.12", "3.6.1", "3.6.2", "3.6.3", "3.6.4", "3.6.5", "3.6.6", "3.6.7", "3.6.8", "3.6.9", "3.6.10", "3.6.11", "3.6.12", "3.6.13"]
    },
    {
      "name": "Wave 10: Manual Grading & Repeat",
      "tasks": ["3.7.1", "3.7.2", "3.7.3", "3.7.4", "3.7.5", "3.7.6", "3.7.7", "3.7.8", "3.8.1", "3.8.2", "3.8.3", "3.8.4", "3.8.5", "3.8.6", "3.8.7", "3.8.8"]
    },
    {
      "name": "Wave 11: Offline Storage",
      "tasks": ["4.1.1", "4.1.2", "4.1.3", "4.1.4", "4.1.5", "4.1.6", "4.1.7", "4.1.8", "4.1.9", "4.1.10", "4.2.1", "4.2.2", "4.2.3", "4.2.4", "4.2.5", "4.2.6", "4.2.7", "4.2.8", "4.2.9", "4.2.10"]
    },
    {
      "name": "Wave 12: Offline API & Conflict Resolution",
      "tasks": ["4.3.1", "4.3.2", "4.3.3", "4.3.4", "4.3.5", "4.3.6", "4.3.7", "4.3.8", "4.3.9", "4.3.10", "4.4.1", "4.4.2", "4.4.3", "4.4.4", "4.4.5", "4.5.1", "4.5.2", "4.5.3", "4.5.4", "4.5.5"]
    },
    {
      "name": "Wave 13: Push Notifications",
      "tasks": ["5.1.1", "5.1.2", "5.1.3", "5.1.4", "5.1.5", "5.1.6", "5.1.7", "5.1.8", "5.1.9", "5.1.10", "5.1.11", "5.2.1", "5.2.2", "5.2.3", "5.2.4", "5.2.5", "5.2.6", "5.2.7", "5.2.8", "5.2.9", "5.2.10"]
    },
    {
      "name": "Wave 14: Telegram & SMS",
      "tasks": ["5.3.1", "5.3.2", "5.3.3", "5.3.4", "5.3.5", "5.3.6", "5.3.7", "5.3.8", "5.3.9", "5.3.10", "5.3.11", "5.3.12", "5.4.1", "5.4.2", "5.4.3", "5.4.4", "5.4.5", "5.4.6", "5.4.7", "5.4.8", "5.4.9", "5.4.10"]
    },
    {
      "name": "Wave 15: Unified Notifications",
      "tasks": ["5.5.1", "5.5.2", "5.5.3", "5.5.4", "5.5.5", "5.5.6", "5.5.7", "5.5.8", "5.5.9", "5.5.10", "5.6.1", "5.6.2", "5.6.3", "5.6.4", "5.6.5", "5.6.6"]
    },
    {
      "name": "Wave 16: Task Pages & KG Support",
      "tasks": ["6.1.1", "6.1.2", "6.1.3", "6.1.4", "6.1.5", "6.1.6", "6.1.7", "6.1.8", "6.1.9", "6.1.10", "6.1.11", "6.1.12", "6.1.13", "6.1.14", "6.1.15", "6.1.16", "6.1.17", "6.1.18", "6.1.19", "6.1.20", "6.2.1", "6.2.2", "6.2.3", "6.2.4", "6.2.5", "6.2.6", "6.2.7", "6.2.8", "6.2.9", "6.2.10", "6.2.11", "6.2.12"]
    },
    {
      "name": "Wave 17: Finance & HR Consolidation",
      "tasks": ["6.3.1", "6.3.2", "6.3.3", "6.3.4", "6.3.5", "6.3.6", "6.3.7", "6.3.8", "6.4.1", "6.4.2", "6.4.3", "6.4.4", "6.4.5", "6.4.6", "6.4.7", "6.4.8", "6.4.9", "6.4.10", "6.4.11", "6.4.12", "6.4.13", "6.4.14", "6.4.15", "6.4.16", "6.4.17", "6.4.18", "6.4.19", "6.4.20", "6.4.21", "6.4.22"]
    },
    {
      "name": "Wave 18: Academic & Communication",
      "tasks": ["6.5.1", "6.5.2", "6.5.3", "6.5.4", "6.5.5", "6.5.6", "6.5.7", "6.5.8", "6.5.9", "6.5.10", "6.5.11", "6.5.12", "6.6.1", "6.6.2", "6.6.3", "6.6.4", "6.6.5", "6.6.6", "6.7.1", "6.7.2", "6.7.3", "6.7.4", "6.7.5", "6.7.6"]
    },
    {
      "name": "Wave 19: Settings & Dashboard",
      "tasks": ["6.8.1", "6.8.2", "6.8.3", "6.8.4", "6.8.5", "6.9.1", "6.9.2", "6.9.3", "6.9.4", "6.9.5", "6.9.6", "6.9.7", "6.9.8", "6.10.1", "6.10.2", "6.10.3", "6.10.4", "6.10.5", "6.10.6", "6.10.7", "6.11.1", "6.11.2", "6.11.3", "6.11.4", "6.11.5", "6.11.6", "6.11.7", "6.11.8"]
    },
    {
      "name": "Wave 20: Native Features",
      "tasks": ["7.1.1", "7.1.2", "7.1.3", "7.1.4", "7.1.5", "7.1.6", "7.1.7", "7.1.8", "7.1.9", "7.1.10", "7.1.11", "7.1.12", "7.2.1", "7.2.2", "7.2.3", "7.2.4", "7.2.5", "7.2.6", "7.2.7", "7.2.8", "7.2.9", "7.2.10"]
    },
    {
      "name": "Wave 21: Super Admin & About",
      "tasks": ["7.3.1", "7.3.2", "7.3.3", "7.3.4", "7.3.5", "7.3.6", "7.3.7", "7.3.8", "7.3.9", "7.3.10", "7.4.1", "7.4.2", "7.4.3", "7.4.4", "7.4.5", "7.4.6", "7.5.1", "7.5.2", "7.5.3", "7.5.4", "7.5.5", "7.5.6"]
    },
    {
      "name": "Wave 22: Security Hardening",
      "tasks": ["8.1.1", "8.1.2", "8.1.3", "8.1.4", "8.1.5", "8.1.6", "8.1.7", "8.1.8", "8.1.9", "8.1.10", "8.2.1", "8.2.2", "8.2.3", "8.2.4", "8.2.5", "8.3.1", "8.3.2", "8.3.3", "8.3.4", "8.3.5", "8.3.6"]
    },
    {
      "name": "Wave 23: Rate Limiting & HTTPS",
      "tasks": ["8.4.1", "8.4.2", "8.4.3", "8.4.4", "8.4.5", "8.4.6", "8.4.7", "8.5.1", "8.5.2", "8.5.3", "8.5.4", "8.5.5", "8.5.6", "8.6.1", "8.6.2", "8.6.3", "8.6.4", "8.6.5", "8.6.6"]
    },
    {
      "name": "Wave 24: RBAC & Audit",
      "tasks": ["8.7.1", "8.7.2", "8.7.3", "8.7.4", "8.7.5", "8.8.1", "8.8.2", "8.8.3", "8.8.4", "8.8.5", "8.8.6", "8.8.7", "8.8.8", "8.8.9"]
    },
    {
      "name": "Wave 25: Performance Optimization",
      "tasks": ["9.1.1", "9.1.2", "9.1.3", "9.1.4", "9.1.5", "9.1.6", "9.1.7", "9.1.8", "9.1.9", "9.1.10", "9.1.11", "9.1.12", "9.1.13", "9.1.14", "9.2.1", "9.2.2", "9.2.3", "9.2.4", "9.2.5", "9.2.6", "9.2.7", "9.2.8", "9.2.9", "9.2.10"]
    },
    {
      "name": "Wave 26: Client Optimization",
      "tasks": ["9.3.1", "9.3.2", "9.3.3", "9.3.4", "9.3.5", "9.3.6", "9.3.7", "9.4.1", "9.4.2", "9.4.3", "9.4.4", "9.4.5", "9.5.1", "9.5.2", "9.5.3", "9.5.4", "9.5.5"]
    },
    {
      "name": "Wave 27: Bundle Optimization",
      "tasks": ["9.6.1", "9.6.2", "9.6.3", "9.6.4", "9.6.5", "9.7.1", "9.7.2", "9.7.3", "9.7.4", "9.7.5", "9.7.6", "9.7.7", "9.7.8"]
    },
    {
      "name": "Wave 28: Testing",
      "tasks": ["10.1.1", "10.1.2", "10.1.3", "10.1.4", "10.1.5", "10.1.6", "10.1.7", "10.1.8", "10.1.9", "10.1.10", "10.1.11", "10.1.12", "10.1.13", "10.1.14", "10.2.1", "10.2.2", "10.2.3", "10.2.4", "10.2.5", "10.2.6", "10.2.7", "10.2.8", "10.2.9", "10.2.10"]
    },
    {
      "name": "Wave 29: E2E & Performance Testing",
      "tasks": ["10.3.1", "10.3.2", "10.3.3", "10.3.4", "10.3.5", "10.3.6", "10.3.7", "10.3.8", "10.3.9", "10.3.10", "10.4.1", "10.4.2", "10.4.3", "10.4.4", "10.4.5", "10.4.6", "10.4.7", "10.4.8", "10.4.9"]
    },
    {
      "name": "Wave 30: UAT & Deployment",
      "tasks": ["10.5.1", "10.5.2", "10.5.3", "10.5.4", "10.5.5", "10.5.6", "10.5.7", "10.5.8", "10.5.9", "10.5.10", "10.5.11", "10.5.12", "10.6.1", "10.6.2", "10.6.3", "10.6.4", "10.6.5", "10.6.6", "10.6.7", "10.6.8", "10.6.9", "10.6.10", "10.6.11", "10.6.12"]
    },
    {
      "name": "Wave 31: Production Deployment",
      "tasks": ["10.7.1", "10.7.2", "10.7.3", "10.7.4", "10.7.5", "10.7.6", "10.7.7", "10.7.8", "10.7.9", "10.7.10", "10.7.11", "10.7.12", "10.8.1", "10.8.2", "10.8.3", "10.8.4", "10.8.5", "10.8.6", "10.8.7", "10.8.8", "10.8.9", "10.8.10"]
    },
    {
      "name": "Wave 32: Documentation & Rollout",
      "tasks": ["10.9.1", "10.9.2", "10.9.3", "10.9.4", "10.9.5", "10.9.6", "10.9.7", "10.9.8", "10.9.9", "10.9.10", "10.10.1", "10.10.2", "10.10.3", "10.10.4", "10.10.5", "10.10.6", "10.10.7", "10.10.8", "10.10.9", "10.10.10", "10.10.11", "10.10.12"]
    },
    {
      "name": "Wave 33: UI/UX Foundation",
      "tasks": ["11.1.1", "11.1.2", "11.1.3", "11.1.4", "11.1.5", "11.1.6", "11.1.7", "11.1.8", "11.1.9", "11.1.10", "11.1.11", "11.1.12", "11.1.13", "11.1.14", "11.1.15", "11.1.16", "11.1.17", "11.1.18", "11.1.19", "11.1.20", "11.1.21", "11.1.22", "11.1.23", "11.1.24"]
    },
    {
      "name": "Wave 34: Core Components",
      "tasks": ["11.2.1", "11.2.2", "11.2.3", "11.2.4", "11.2.5", "11.2.6", "11.2.7", "11.2.8", "11.2.9", "11.2.10", "11.2.11", "11.2.12", "11.2.13", "11.2.14", "11.2.15", "11.2.16", "11.2.17", "11.2.18", "11.2.19", "11.2.20", "11.2.21", "11.2.22", "11.2.23", "11.2.24", "11.2.25", "11.2.26", "11.2.27", "11.2.28", "11.2.29", "11.2.30", "11.2.31", "11.2.32", "11.2.33", "11.2.34", "11.2.35", "11.2.36", "11.2.37", "11.2.38", "11.2.39", "11.2.40", "11.2.41"]
    },
    {
      "name": "Wave 35: Utility Components",
      "tasks": ["11.3.1", "11.3.2", "11.3.3", "11.3.4", "11.3.5", "11.3.6", "11.3.7", "11.3.8", "11.3.9", "11.3.10", "11.3.11", "11.3.12", "11.3.13", "11.3.14", "11.3.15", "11.3.16", "11.3.17", "11.3.18"]
    },
    {
      "name": "Wave 36: Layout Components",
      "tasks": ["11.4.1", "11.4.2", "11.4.3", "11.4.4", "11.4.5", "11.4.6", "11.4.7", "11.4.8", "11.4.9", "11.4.10", "11.4.11", "11.4.12", "11.4.13", "11.4.14", "11.4.15", "11.4.16", "11.4.17", "11.4.18", "11.4.19", "11.4.20"]
    },
    {
      "name": "Wave 37: Form Components",
      "tasks": ["11.5.1", "11.5.2", "11.5.3", "11.5.4", "11.5.5", "11.5.6", "11.5.7", "11.5.8", "11.5.9", "11.5.10", "11.5.11", "11.5.12", "11.5.13", "11.5.14", "11.5.15"]
    },
    {
      "name": "Wave 38: Login & Dashboard",
      "tasks": ["11.6.1", "11.6.2", "11.6.3", "11.6.4", "11.6.5", "11.6.6", "11.6.7", "11.6.8", "11.6.9", "11.6.10", "11.6.11", "11.6.12", "11.7.1", "11.7.2", "11.7.3", "11.7.4", "11.7.5", "11.7.6", "11.7.7", "11.7.8", "11.7.9", "11.7.10", "11.7.11"]
    },
    {
      "name": "Wave 39: Student & Staff Pages",
      "tasks": ["11.8.1", "11.8.2", "11.8.3", "11.8.4", "11.8.5", "11.8.6", "11.8.7", "11.8.8", "11.8.9", "11.8.10", "11.8.11", "11.8.12", "11.9.1", "11.9.2", "11.9.3", "11.9.4", "11.9.5", "11.9.6", "11.9.7", "11.9.8", "11.9.9", "11.9.10"]
    },
    {
      "name": "Wave 40: Finance & Communication Pages",
      "tasks": ["11.10.1", "11.10.2", "11.10.3", "11.10.4", "11.10.5", "11.10.6", "11.10.7", "11.10.8", "11.10.9", "11.10.10"]
    },
    {
      "name": "Wave 41: Responsive & Accessibility",
      "tasks": ["11.11.1", "11.11.2", "11.11.3", "11.11.4", "11.11.5", "11.11.6", "11.11.7", "11.11.8", "11.11.9", "11.11.10", "11.12.1", "11.12.2", "11.12.3", "11.12.4", "11.12.5", "11.12.6", "11.12.7", "11.12.8", "11.12.9", "11.12.10"]
    },
    {
      "name": "Wave 42: Performance & Browser Testing",
      "tasks": ["11.13.1", "11.13.2", "11.13.3", "11.13.4", "11.13.5", "11.13.6", "11.13.7", "11.13.8", "11.13.9", "11.13.10", "11.14.1", "11.14.2", "11.14.3", "11.14.4", "11.14.5", "11.14.6", "11.14.7", "11.14.8"]
    },
    {
      "name": "Wave 43: Documentation & Polish",
      "tasks": ["11.15.1", "11.15.2", "11.15.3", "11.15.4", "11.15.5", "11.15.6", "11.15.7", "11.15.8", "11.15.9", "11.15.10"]
    }
  ]
}
```

## Tasks

---

## Phase 1: Foundation (Weeks 1-4)

### 1.1 Project Setup and Repository Structure
- [x] 1.1.1 Initialize monorepo structure with workspaces (backend, frontend, desktop, mobile-staff, mobile-student, mobile-guardian, mobile-super-admin)
- [x] 1.1.2 Set up Git repository with branch strategy (main, develop, feature/*, release/*)
- [x] 1.1.3 Configure ESLint, Prettier, and TypeScript for all projects
- [x] 1.1.4 Set up environment variable management (.env files for each app)
- [x] 1.1.5 Create README.md with project overview and setup instructions
- [x] 1.1.6 Set up CI/CD pipeline configuration (GitHub Actions or GitLab CI)

### 1.2 Backend API Configuration System
- [x] 1.2.1 Create centralized API config file (`backend/config/api.config.js`)
- [x] 1.2.2 Implement getBaseURL() and getEndpoint() helper functions
- [x] 1.2.3 Update all existing API routes to use centralized config
- [x] 1.2.4 Create frontend API config file (`frontend/src/config/api.config.js`)
- [x] 1.2.5 Configure Axios instance with centralized base URL
- [x] 1.2.6 Test API config changes with existing endpoints

### 1.3 Tauri Desktop Application Setup
- [x] 1.3.1 Install Tauri CLI and initialize Tauri project for Admin app
- [x] 1.3.2 Configure Tauri.conf.json (app name, identifier, window settings)
- [x] 1.3.3 Set up Rust backend structure (src-tauri/src/main.rs)
- [x] 1.3.4 Implement secure credential storage command (save_credentials)
- [x] 1.3.5 Implement credential retrieval command (get_credentials)
- [x] 1.3.6 Implement native notification command (show_notification)
- [x] 1.3.7 Configure app icon and build settings
- [x] 1.3.8 Test Tauri app build and run on Windows
- [x] 1.3.9 Initialize Tauri project for Super Admin app
- [x] 1.3.10 Configure Super Admin app with cross-branch data access

### 1.4 Capacitor Mobile Application Setup
- [x] 1.4.1 Install Capacitor CLI and initialize Capacitor for Staff app
- [x] 1.4.2 Configure capacitor.config.ts (app ID, name, webDir)
- [x] 1.4.3 Add Android platform to Staff app
- [x] 1.4.4 Configure Android build settings (build.gradle, AndroidManifest.xml)
- [x] 1.4.5 Install and configure Capacitor plugins (PushNotifications, SecureStorage, LocalNotifications)
- [x] 1.4.6 Test Staff app build and run on Android emulator
- [x] 1.4.7 Initialize Capacitor for Student app
- [x] 1.4.8 Initialize Capacitor for Guardian app
- [x] 1.4.9 Initialize Capacitor for Super Admin mobile app
- [x] 1.4.10 Configure app icons and splash screens for all mobile apps

### 1.5 Ethiopian Calendar Integration
- [x] 1.5.1 Install ethiopian-calendar-date-converter package
- [x] 1.5.2 Create EthiopianCalendarService class (`utils/ethiopianCalendar.js`)
- [x] 1.5.3 Implement toEthiopian() method (Gregorian → Ethiopian)
- [x] 1.5.4 Implement toGregorian() method (Ethiopian → Gregorian)
- [x] 1.5.5 Implement format() method with multi-language support (en, am)
- [x] 1.5.6 Implement now() method for current Ethiopian date
- [x] 1.5.7 Implement incrementYear() method for year rollover
- [x] 1.5.8 Implement getAcademicYear() method
- [x] 1.5.9 Write unit tests for all calendar methods
- [x] 1.5.10 Create React hook (useEthiopianCalendar) for frontend integration

### 1.6 Multi-Branch Database Architecture
- [x] 1.6.1 Create branch_config table in master database
- [x] 1.6.2 Implement DatabaseConnectionManager class
- [x] 1.6.3 Implement branch code generation algorithm (first letter + last 2 chars)
- [x] 1.6.4 Create getPool() method with connection pooling
- [x] 1.6.5 Implement resolveDatabaseName() method
- [x] 1.6.6 Create database creation script for new branches
- [x] 1.6.7 Test connection manager with multiple branch databases
- [x] 1.6.8 Implement connection pool monitoring and logging

### 1.7 Branch Code Authentication System
- [x] 1.7.1 Create branch code validation endpoint (`POST /api/v2/auth/validate-branch`)
- [x] 1.7.2 Update login endpoint to accept branch code (`POST /api/v2/auth/login`)
- [x] 1.7.3 Implement JWT token generation with branch context
- [x] 1.7.4 Create authenticateToken middleware with branch validation
- [x] 1.7.5 Update all protected routes to use new authentication middleware
- [x] 1.7.6 Create branch code input UI component for all login pages
- [x] 1.7.7 Implement branch code persistence in local storage
- [x] 1.7.8 Test authentication flow with multiple branches

### 1.8 Database Schema Auto-Creation
- [x] 1.8.1 Create migration framework (MigrationRunner class)
- [x] 1.8.2 Create migrations table schema
- [x] 1.8.3 Write migration 001: school_config table
- [x] 1.8.4 Write migration 002: classes and shifts tables
- [x] 1.8.5 Write migration 003: students table with indexes
- [x] 1.8.6 Write migration 004: staff table
- [x] 1.8.7 Write migration 005: guardians table
- [x] 1.8.8 Write migration 006: subjects table
- [x] 1.8.9 Write migration 007: attendance tables
- [x] 1.8.10 Write migration 008: marks tables
- [x] 1.8.11 Write migration 009: ai_exams and student_exams tables
- [x] 1.8.12 Write migration 010: archived_academic_years tables
- [x] 1.8.13 Write migration 011: finance tables
- [x] 1.8.14 Write migration 012: notification tables
- [x] 1.8.15 Implement migration runner CLI command
- [x] 1.8.16 Test schema creation on fresh database
- [x] 1.8.17 Create rollback functionality for migrations

---

## Phase 2: Core Migration (Weeks 5-8)

### 2.1 V1 to V2 Migration Scripts
- [x] 2.1.1 Create V1toV2Migration class
- [x] 2.1.2 Implement migrateSchoolConfig() method
- [x] 2.1.3 Implement migrateClasses() method
- [x] 2.1.4 Implement migrateStudents() method with error logging
- [x] 2.1.5 Implement migrateStaff() method
- [x] 2.1.6 Implement migrateSubjects() method
- [x] 2.1.7 Implement migrateAttendance() method
- [x] 2.1.8 Implement migrateMarks() method
- [x] 2.1.9 Implement migrateFinancialRecords() method
- [x] 2.1.10 Implement migrateGuardians() method
- [x] 2.1.11 Create migration error logging system
- [x] 2.1.12 Implement rollback functionality

### 2.2 Migration Testing and Validation
- [x] 2.2.1 Create validateMigration() method with count checks
- [x] 2.2.2 Test migration with sample V1 data
- [x] 2.2.3 Perform migration dry-run for first school
- [x] 2.2.4 Execute migration for first school (pilot)
- [x] 2.2.5 Validate data integrity for first school
- [x] 2.2.6 Execute migration for remaining 3 schools
- [x] 2.2.7 Create migration report for each school
- [x] 2.2.8 Document migration issues and resolutions

### 2.3 Year Rollover System
- [x] 2.3.1 Create archived_academic_years table
- [x] 2.3.2 Create archived_students table
- [x] 2.3.3 Create archived_attendance table
- [x] 2.3.4 Create archived_marks table
- [x] 2.3.5 Create archived_payments table
- [x] 2.3.6 Implement YearRolloverService class
- [x] 2.3.7 Implement archiveStudents() method
- [x] 2.3.8 Implement archiveAttendance() method
- [x] 2.3.9 Implement archiveMarks() method
- [x] 2.3.10 Implement archivePayments() method
- [x] 2.3.11 Implement clearCurrentYearData() method
- [x] 2.3.12 Implement incrementAcademicYear() method (Ethiopian calendar)
- [x] 2.3.13 Create year rollover UI in Settings page
- [x] 2.3.14 Implement "Show Year Data" functionality with Excel export
- [x] 2.3.15 Implement "Next Year" button with confirmation dialog
- [x] 2.3.16 Test year rollover with sample data

---
## Phase 3: AI Test Generator (Weeks 9-12)

### 3.1 Gemini API Integration
- [x] 3.1.1 Install @google/generative-ai package
- [x] 3.1.2 Create GeminiService class
- [x] 3.1.3 Configure Gemini API key in environment variables
- [x] 3.1.4 Implement generateExam() method with error handling
- [x] 3.1.5 Implement validateExamStructure() method
- [x] 3.1.6 Add rate limiting for Gemini API calls (10 per hour per teacher)
- [x] 3.1.7 Implement retry logic for failed API calls
- [x] 3.1.8 Test Gemini API integration with sample prompts

### 3.2 Prompt Engineering Templates
- [x] 3.2.1 Create GeminiPromptBuilder class
- [x] 3.2.2 Implement buildExamPrompt() method with PTCF framework
- [x] 3.2.3 Add Ethiopian curriculum context to prompts
- [x] 3.2.4 Implement formatQuestionTypes() helper method
- [x] 3.2.5 Create prompt templates for each difficulty level (Easy, Medium, Hard)
- [x] 3.2.6 Add language-specific prompt variations (English, Arabic, Amharic, Oromo, Somali, French)
- [x] 3.2.7 Test prompts with different subjects and grade levels
- [x] 3.2.8 Refine prompts based on output quality

### 3.3 Question Type Handlers
- [x] 3.3.1 Create question type schema definitions
- [x] 3.3.2 Implement Multiple Choice question handler
- [x] 3.3.3 Implement True/False question handler
- [x] 3.3.4 Implement Multiple True/False question handler
- [x] 3.3.5 Implement Matching question handler
- [x] 3.3.6 Implement Numeric/Computational Response handler
- [x] 3.3.7 Implement Fill-in-the-Blank handler
- [x] 3.3.8 Implement Short Answer handler
- [x] 3.3.9 Implement Essay/Open-Ended handler
- [x] 3.3.10 Implement Transformation/Error Correction handler
- [x] 3.3.11 Create question grouping algorithm (group by type)
- [x] 3.3.12 Test all question type handlers

### 3.4 Exam Creation UI
- [x] 3.4.1 Create AI Test Generator page in Admin app
- [x] 3.4.2 Implement exam configuration form (class, subject, term, component)
- [x] 3.4.3 Add question type distribution selector
- [x] 3.4.4 Add language selector dropdown
- [x] 3.4.5 Add difficulty level selector
- [x] 3.4.6 Add exam description textarea
- [x] 3.4.7 Add time limit input (optional)
- [x] 3.4.8 Add bonus questions configuration
- [x] 3.4.9 Implement "Generate Exam" button with loading state
- [x] 3.4.10 Create exam preview component
- [x] 3.4.11 Add manual question addition interface
- [x] 3.4.12 Implement question edit functionality
- [x] 3.4.13 Implement question delete functionality
- [x] 3.4.14 Add "Regenerate" button
- [x] 3.4.15 Add "Approve & Save" button

### 3.5 Exam Publishing System
- [x] 3.5.1 Create ExamPublishingService class
- [x] 3.5.2 Implement publishExam() method
- [x] 3.5.3 Implement randomizeQuestions() method
- [x] 3.5.4 Implement groupByType() helper method
- [x] 3.5.5 Implement shuffleArray() helper method
- [x] 3.5.6 Create student_exams table records for all students
- [x] 3.5.7 Send push notifications to students when exam is published
- [x] 3.5.8 Create exam list UI in Student app
- [x] 3.5.9 Implement exam start functionality with timer
- [x] 3.5.10 Create exam taking UI with question navigation
- [x] 3.5.11 Implement auto-submit when time expires
- [x] 3.5.12 Test exam publishing and student access

### 3.6 Auto-Grading Engine
- [x] 3.6.1 Create AutoGradingService class
- [x] 3.6.2 Implement gradeExam() method
- [x] 3.6.3 Implement gradeQuestion() method for each question type
- [x] 3.6.4 Implement compareExact() for MCQ, True/False, Numeric
- [x] 3.6.5 Implement compareFillBlank() for fill-in-the-blank questions
- [x] 3.6.6 Implement gradeMatching() for matching questions
- [x] 3.6.7 Mark essay and short answer questions for manual grading
- [x] 3.6.8 Calculate total marks and percentage
- [x] 3.6.9 Generate grading results with feedback
- [x] 3.6.10 Save grading results to database
- [x] 3.6.11 Add marks to mark list automatically
- [x] 3.6.12 Send results to student and guardian apps
- [x] 3.6.13 Test auto-grading with various question types

### 3.7 Manual Grading Interface
- [x] 3.7.1 Create manual grading page for teachers
- [x] 3.7.2 Display list of exams requiring manual grading
- [x] 3.7.3 Show student answers for essay and short answer questions
- [x] 3.7.4 Implement marks input for each question
- [x] 3.7.5 Add feedback textarea for each question
- [x] 3.7.6 Implement "Save Grades" functionality
- [x] 3.7.7 Update total marks after manual grading
- [x] 3.7.8 Send updated results to students and guardians

### 3.8 Exam Repeat Functionality
- [x] 3.8.1 Add "Repeat Exam" button in teacher exam management
- [x] 3.8.2 Implement student selection for repeat (individual or entire class)
- [x] 3.8.3 Add option to reuse same exam or generate new one
- [x] 3.8.4 Implement reason input for repeat request
- [x] 3.8.5 Reset marks to zero for selected students
- [x] 3.8.6 Send notification to Admin with teacher name and reason
- [x] 3.8.7 Republish exam to selected students
- [x] 3.8.8 Test exam repeat functionality

---

## Phase 4: Offline-First Architecture (Weeks 13-15)

### 4.1 IndexedDB Storage Layer
- [x] 4.1.1 Install Dexie.js package
- [x] 4.1.2 Create OfflineDatabase class extending Dexie
- [x] 4.1.3 Define students table schema
- [x] 4.1.4 Define attendance table schema
- [x] 4.1.5 Define marks table schema
- [x] 4.1.6 Define exams table schema
- [x] 4.1.7 Define posts table schema
- [x] 4.1.8 Define syncQueue table schema
- [x] 4.1.9 Initialize offline database instance
- [x] 4.1.10 Test IndexedDB storage and retrieval

### 4.2 Sync Manager Implementation
- [x] 4.2.1 Create SyncManager class
- [x] 4.2.2 Implement online/offline detection
- [x] 4.2.3 Set up event listeners for connectivity changes
- [x] 4.2.4 Implement queueOperation() method
- [x] 4.2.5 Implement syncAll() method
- [x] 4.2.6 Implement syncItem() method with retry logic
- [x] 4.2.7 Add sync status tracking (offline, syncing, synced)
- [x] 4.2.8 Implement automatic sync on reconnection
- [x] 4.2.9 Add manual sync trigger button
- [x] 4.2.10 Test sync manager with simulated network conditions

### 4.3 Offline-Aware API Client
- [x] 4.3.1 Create OfflineAwareAPIClient class
- [x] 4.3.2 Implement request() method with offline detection
- [x] 4.3.3 Queue operations when offline
- [x] 4.3.4 Return optimistic responses for offline operations
- [x] 4.3.5 Implement network error handling
- [x] 4.3.6 Add request retry logic
- [x] 4.3.7 Update all API calls to use offline-aware client
- [x] 4.3.8 Test offline functionality for attendance marking
- [x] 4.3.9 Test offline functionality for mark entry
- [x] 4.3.10 Test offline functionality for posts

### 4.4 Conflict Resolution
- [x] 4.4.1 Implement last-write-wins strategy for simple conflicts
- [x] 4.4.2 Flag complex conflicts for manual resolution
- [x] 4.4.3 Create conflict resolution UI
- [x] 4.4.4 Add conflict notification system
- [x] 4.4.5 Test conflict resolution with concurrent edits

### 4.5 Offline UI Indicators
- [x] 4.5.1 Create offline status indicator component
- [x] 4.5.2 Add sync status badge (offline, syncing, synced)
- [x] 4.5.3 Show pending sync count
- [x] 4.5.4 Add "Retry Sync" button for failed operations
- [x] 4.5.5 Display offline mode banner across all apps

---

## Phase 5: Notification System (Weeks 16-18)

### 5.1 Firebase Cloud Messaging Setup
- [x] 5.1.1 Create Firebase project
- [x] 5.1.2 Install firebase-admin package (backend)
- [x] 5.1.3 Install @capacitor/push-notifications (mobile apps)
- [x] 5.1.4 Configure Firebase credentials in backend
- [x] 5.1.5 Create PushNotificationService class
- [x] 5.1.6 Implement sendToUser() method
- [x] 5.1.7 Implement sendToMultipleUsers() method
- [x] 5.1.8 Implement getUserTokens() method
- [x] 5.1.9 Implement removeInvalidTokens() method
- [x] 5.1.10 Create user_devices table for FCM tokens
- [x] 5.1.11 Test push notification sending from backend

### 5.2 Mobile Push Notification Integration
- [x] 5.2.1 Create PushNotificationManager class for mobile apps
- [x] 5.2.2 Implement initialize() method with permission request
- [x] 5.2.3 Implement FCM token registration
- [x] 5.2.4 Implement saveTokenToServer() method
- [x] 5.2.5 Add push notification listeners (received, action performed)
- [x] 5.2.6 Implement handleNotification() for foreground notifications
- [x] 5.2.7 Implement handleNotificationAction() for navigation
- [x] 5.2.8 Test push notifications on Android devices
- [x] 5.2.9 Configure notification channels for Android
- [x] 5.2.10 Test notification actions and deep linking

### 5.3 Telegram Bot Development
- [x] 5.3.1 Create Telegram bot via BotFather
- [x] 5.3.2 Install node-telegram-bot-api package
- [x] 5.3.3 Create TelegramBotService class
- [x] 5.3.4 Implement /start command handler
- [x] 5.3.5 Implement /credentials command handler
- [x] 5.3.6 Implement /help command handler
- [x] 5.3.7 Implement getCredentialsByPhone() method
- [x] 5.3.8 Implement sendNotification() method
- [x] 5.3.9 Implement getChatIdByPhone() method
- [x] 5.3.10 Add telegram_chat_id column to users table
- [x] 5.3.11 Test Telegram bot credential retrieval
- [x] 5.3.12 Test Telegram bot notifications

### 5.4 SMS Gateway Integration
- [x] 5.4.1 Choose SMS provider (Twilio or Africa's Talking)
- [x] 5.4.2 Install SMS provider SDK
- [x] 5.4.3 Create SMSService class
- [x] 5.4.4 Implement initializeProvider() method
- [x] 5.4.5 Implement sendSMS() method
- [x] 5.4.6 Implement sendViaTwilio() method
- [x] 5.4.7 Implement sendViaAfricasTalking() method
- [x] 5.4.8 Implement sendBulkSMS() method
- [x] 5.4.9 Configure SMS provider credentials
- [x] 5.4.10 Test SMS sending

### 5.5 Unified Notification Service
- [x] 5.5.1 Create NotificationService class
- [x] 5.5.2 Implement sendNotification() method with multi-channel support
- [x] 5.5.3 Implement sendPaymentReminder() method
- [x] 5.5.4 Implement sendAbsenceAlert() method
- [x] 5.5.5 Implement sendExamPublished() notification
- [x] 5.5.6 Implement sendReportCardAvailable() notification
- [x] 5.5.7 Implement sendExamRepeatRequest() notification
- [x] 5.5.8 Add notification logging to database
- [x] 5.5.9 Create notification preferences UI for users
- [x] 5.5.10 Test all notification triggers

### 5.6 Phone Number Requirement
- [x] 5.6.1 Add phone_number column to students table (required)
- [x] 5.6.2 Add phone_number column to staff table (required)
- [x] 5.6.3 Add phone_number column to guardians table (required)
- [x] 5.6.4 Update all registration forms to require phone number
- [x] 5.6.5 Add phone number validation
- [x] 5.6.6 Update existing records to include phone numbers

---
## Phase 6: Module Consolidation (Weeks 19-22)

### 6.1 Task Pages Consolidation
- [x] 6.1.1 Update Task1 page to include school days selector
- [x] 6.1.2 Add shift count selector (1 or 2) to Task1
- [x] 6.1.3 Add shift rotation checkbox to Task1
- [x] 6.1.4 Add periods per shift input to Task1
- [x] 6.1.5 Add period duration input to Task1
- [x] 6.1.6 Add KG checkbox to Task1
- [x] 6.1.7 Add evening class checkbox to Task1
- [x] 6.1.8 Update Task2 to show KG class configuration when enabled
- [x] 6.1.9 Update Task2 to show evening class configuration when enabled
- [x] 6.1.10 Add shift selection per class in Task2 (when shift count > 1)
- [x] 6.1.11 Remove Task4 (Add Staff Members) from workflow
- [x] 6.1.12 Renumber Task5 to Task4 (Configure Subjects)
- [x] 6.1.13 Renumber Task6 to Task5
- [x] 6.1.14 Renumber Task7 to Task6 (Schedule Configuration)
- [x] 6.1.15 Fix Task4 to display previously added subjects
- [x] 6.1.16 Separate "Add" button from "Next: Class Mapping" in Task4
- [x] 6.1.17 Remove Basic Schedule Settings from Task6
- [x] 6.1.18 Update Task6 to retrieve data from Task1
- [x] 6.1.19 Remove shift selection from Task6 (use Task2 data)
- [x] 6.1.20 Test all Task pages with new data flow

### 6.2 KG and Evening Class Support
- [x] 6.2.1 Create separate schemas for KG students
- [x] 6.2.2 Create separate schemas for evening class students
- [x] 6.2.3 Update student registration to support KG students
- [x] 6.2.4 Update student registration to support evening class students
- [x] 6.2.5 Update student list to display KG students
- [x] 6.2.6 Update student list to display evening class students
- [x] 6.2.7 Update attendance system for KG students
- [x] 6.2.8 Update attendance system for evening class students
- [x] 6.2.9 Update mark list system for KG students
- [x] 6.2.10 Update monthly payments for KG and evening class students
- [x] 6.2.11 Create KG-specific evaluation modules
- [x] 6.2.12 Test KG and evening class functionality

### 6.3 Finance Module Consolidation
- [x] 6.3.1 Merge fee types page into fee management page
- [x] 6.3.2 Remove standalone fee types page
- [x] 6.3.3 Update fee management to retrieve term data from Task1
- [x] 6.3.4 Update fee management to retrieve academic year from Task1
- [x] 6.3.5 Test monthly payments page functionality
- [x] 6.3.6 Remove general settings tab from payment settings (if useless)
- [x] 6.3.7 Add specific error messages for finance operations
- [x] 6.3.8 Test all finance module pages

### 6.4 HR Module Reorganization
- [x] 6.4.1 Move Expenses page from Finance to HR module
- [x] 6.4.2 Move Expenses Approval page from Finance to HR module
- [x] 6.4.3 Move Budgets page from Finance to HR module
- [x] 6.4.4 Move Inventory Integration page from Finance to HR module
- [x] 6.4.5 Remove Deductions tab from Salary Management
- [x] 6.4.6 Remove Allowances tab from Salary Management
- [x] 6.4.7 Remove Staff Retention tab from Salary Management
- [x] 6.4.8 Integrate Salary Management with Teacher Attendance
- [x] 6.4.9 Integrate Salary Management with Attendance Deduction
- [x] 6.4.10 Integrate Salary Management with Leave Management
- [x] 6.4.11 Rename "Attendance System" to "Teacher Attendance"
- [x] 6.4.12 Filter Teacher Attendance to show only teacher staff type
- [x] 6.4.13 Integrate Teacher Attendance with Salary Management
- [x] 6.4.14 Remove Weekend Days Configuration from Time & Shift Settings
- [x] 6.4.15 Remove Global Work Time Configuration from Time & Shift Settings
- [x] 6.4.16 Update Time & Shift Settings to use Task1 data
- [x] 6.4.17 Remove Staff-Specific Shift Timing page
- [x] 6.4.18 Integrate Attendance Deduction Settings with related pages
- [x] 6.4.19 Integrate Leave Management with related pages
- [x] 6.4.20 Remove Performance page from HR module
- [x] 6.4.21 Test Payroll System functionality
- [x] 6.4.22 Add specific error messages for HR operations

### 6.5 Academic Module Improvements
- [x] 6.5.1 Remove Student Attendance Settings page (or all sections)
- [x] 6.5.2 Update Student Attendance to retrieve data from Task1
- [x] 6.5.3 Auto-connect teachers to subjects in Create Marklist (from Task6)
- [x] 6.5.4 Prevent duplicate mark list forms for same subject/term
- [x] 6.5.5 Add error message for duplicate mark list attempts
- [x] 6.5.6 Add delete button for mark list forms
- [x] 6.5.7 Ensure delete only removes selected subject/term form
- [x] 6.5.8 Remove "View/Edit Mark" from mark list forms tab
- [x] 6.5.9 Remove Class Ranking tab from Create Marklist
- [x] 6.5.10 Move Evaluation Book Reports content into Evaluation Book page
- [x] 6.5.11 Remove standalone Evaluation Book Reports page
- [x] 6.5.12 Add specific error messages for academic operations

### 6.6 Report Card Distribution
- [x] 6.6.1 Create report card generation endpoint
- [x] 6.6.2 Implement sendToStudentApp() method
- [x] 6.6.3 Implement sendToGuardianApp() method
- [x] 6.6.4 Create report card view in Student app
- [x] 6.6.5 Create report card view in Guardian app (for all wards)
- [x] 6.6.6 Test report card distribution

### 6.7 Communication and Posts
- [x] 6.7.1 Test posts page media upload functionality
- [x] 6.7.2 Ensure auto-folder creation on VPS for media uploads
- [x] 6.7.3 Test posts page media display
- [x] 6.7.4 Test communication page functionality
- [x] 6.7.5 Ensure communication connects with all Guardian apps
- [x] 6.7.6 Remove Guardian Notification page

### 6.8 Schedule and Faults Management
- [x] 6.8.1 Test schedule page functionality
- [x] 6.8.2 Remove Student-Faults page
- [x] 6.8.3 Make fault type selection optional in Faults page
- [x] 6.8.4 Test faults page functionality
- [x] 6.8.5 Add specific error messages for schedule and faults operations

### 6.9 Settings and System Configuration
- [x] 6.9.1 Add username change functionality to Password tab
- [x] 6.9.2 Update Language tab to apply changes to ALL pages
- [x] 6.9.3 Fix branding icon upload on VPS
- [x] 6.9.4 Make branding icon become app icon for all applications
- [x] 6.9.5 Fix school info upload on VPS
- [x] 6.9.6 Update Sub-Accounts page to display all system pages
- [x] 6.9.7 Make email field optional in Sub-Accounts page
- [x] 6.9.8 Test all settings functionality

### 6.10 Mark List Lock Persistence
- [x] 6.10.1 Add lock feature to mark list UI in Staff app
- [x] 6.10.2 Create is_locked column in mark list tables
- [x] 6.10.3 Implement lock persistence in database
- [x] 6.10.4 Display locked marks as read-only
- [x] 6.10.5 Prevent editing of locked marks after page refresh
- [x] 6.10.6 Add unlock functionality with admin permissions
- [x] 6.10.7 Test mark list lock persistence

### 6.11 Dashboard Reporting
- [x] 6.11.1 Update dashboard to display total student enrollment
- [x] 6.11.2 Display total staff count by type
- [x] 6.11.3 Display current month financial summary
- [x] 6.11.4 Display current day attendance summary
- [x] 6.11.5 Display upcoming exams and assessments
- [x] 6.11.6 Display recent system activities
- [x] 6.11.7 Display academic performance trends
- [x] 6.11.8 Test dashboard data accuracy

---

## Phase 7: Native App Features (Weeks 23-25)

### 7.1 Persistent Login Implementation
- [x] 7.1.1 Implement secure credential storage in Tauri (Admin app)
- [x] 7.1.2 Implement secure credential storage in Tauri (Super Admin app)
- [x] 7.1.3 Install capacitor-secure-storage-plugin for mobile apps
- [x] 7.1.4 Create AuthService class for mobile apps
- [x] 7.1.5 Implement saveCredentials() method
- [x] 7.1.6 Implement getCredentials() method
- [x] 7.1.7 Implement autoLogin() method
- [x] 7.1.8 Add persistent login to Staff app
- [x] 7.1.9 Add persistent login to Student app
- [x] 7.1.10 Add persistent login to Guardian app
- [x] 7.1.11 Add persistent login to Super Admin mobile app
- [x] 7.1.12 Test persistent login across all apps

### 7.2 Role-Based UI for Staff App
- [x] 7.2.1 Define ROLE_FEATURES mapping (Teacher, Administrative, Supportive)
- [x] 7.2.2 Create role-based navigation component
- [x] 7.2.3 Show mark lists only for Teacher role
- [x] 7.2.4 Show attendance only for Teacher role
- [x] 7.2.5 Show exam creation only for Teacher role
- [x] 7.2.6 Show class management only for Teacher role
- [x] 7.2.7 Show student registration only for Administrative role
- [x] 7.2.8 Show fee management only for Administrative role
- [x] 7.2.9 Show limited features for Supportive role
- [x] 7.2.10 Test role-based UI for all staff types

### 7.3 Super Admin Cross-Branch Reporting
- [x] 7.3.1 Implement multi-database connection in Super Admin app
- [x] 7.3.2 Create cross-branch data aggregation service
- [x] 7.3.3 Implement aggregateStudentEnrollment() method
- [x] 7.3.4 Implement aggregateFinancialData() method
- [x] 7.3.5 Implement aggregateAttendanceData() method
- [x] 7.3.6 Implement aggregateAcademicPerformance() method
- [x] 7.3.7 Create branch-wise comparison reports UI
- [x] 7.3.8 Create consolidated reports UI
- [x] 7.3.9 Add branch selector dropdown
- [x] 7.3.10 Test Super Admin reporting with multiple branches

### 7.4 Username and Password Change
- [x] 7.4.1 Create change username endpoint
- [x] 7.4.2 Create change password endpoint
- [x] 7.4.3 Add username change UI to all apps
- [x] 7.4.4 Add password change UI to all apps
- [x] 7.4.5 Implement password strength validation
- [x] 7.4.6 Test username and password change functionality

### 7.5 About Us Public Page
- [x] 7.5.1 Create public About Us page (isolated from main system)
- [x] 7.5.2 Add school information display
- [x] 7.5.3 Add mission and vision display
- [x] 7.5.4 Add contact details display
- [x] 7.5.5 Make page accessible without authentication
- [x] 7.5.6 Test About Us page

---

## Phase 8: Security Hardening (Weeks 26-27)

### 8.1 Input Validation and Sanitization
- [x] 8.1.1 Install DOMPurify and validator packages
- [x] 8.1.2 Create sanitizeInput() function
- [x] 8.1.3 Implement HTML sanitization
- [x] 8.1.4 Implement email validation and normalization
- [x] 8.1.5 Implement phone number validation
- [x] 8.1.6 Implement text escaping
- [x] 8.1.7 Create sanitizeRequest middleware
- [x] 8.1.8 Apply sanitization to all input endpoints
- [x] 8.1.9 Add client-side validation for all forms
- [x] 8.1.10 Test input validation and sanitization

### 8.2 SQL Injection Prevention
- [x] 8.2.1 Audit all database queries for SQL injection vulnerabilities
- [x] 8.2.2 Replace string concatenation with parameterized queries
- [x] 8.2.3 Create QueryBuilder class for safe query construction
- [x] 8.2.4 Update all queries to use parameterized approach
- [x] 8.2.5 Test SQL injection prevention

### 8.3 XSS and CSRF Protection
- [x] 8.3.1 Install csurf package for CSRF protection
- [x] 8.3.2 Implement CSRF token generation
- [x] 8.3.3 Apply CSRF protection to state-changing routes
- [x] 8.3.4 Add CSRF token to frontend requests
- [x] 8.3.5 Implement XSS protection headers
- [x] 8.3.6 Test XSS and CSRF protection

### 8.4 Rate Limiting
- [x] 8.4.1 Install express-rate-limit and rate-limit-redis packages
- [x] 8.4.2 Set up Redis for rate limiting
- [x] 8.4.3 Create general API rate limiter (100 requests per 15 min)
- [x] 8.4.4 Create auth rate limiter (5 login attempts per 15 min)
- [x] 8.4.5 Create AI generation rate limiter (10 per hour)
- [x] 8.4.6 Apply rate limiters to appropriate routes
- [x] 8.4.7 Test rate limiting functionality

### 8.5 HTTPS and Secure Communication
- [x] 8.5.1 Obtain SSL/TLS certificates
- [x] 8.5.2 Configure HTTPS server
- [x] 8.5.3 Implement HTTP to HTTPS redirect
- [x] 8.5.4 Add security headers (HSTS, X-Content-Type-Options, X-Frame-Options, CSP)
- [x] 8.5.5 Configure secure cookie settings
- [x] 8.5.6 Test HTTPS configuration

### 8.6 Password Security
- [x] 8.6.1 Implement bcrypt password hashing (12 salt rounds)
- [x] 8.6.2 Update user registration to hash passwords
- [x] 8.6.3 Update login to verify hashed passwords
- [x] 8.6.4 Remove plain password storage
- [x] 8.6.5 Implement password strength requirements
- [x] 8.6.6 Test password security

### 8.7 Role-Based Access Control (RBAC)
- [x] 8.7.1 Define PERMISSIONS object with all permissions
- [x] 8.7.2 Create authorize() middleware
- [x] 8.7.3 Apply authorization to all protected routes
- [x] 8.7.4 Test RBAC for all user roles
- [x] 8.7.5 Add permission checks in frontend

### 8.8 Security Audit and Logging
- [x] 8.8.1 Install winston for logging
- [x] 8.8.2 Configure logging levels and transports
- [x] 8.8.3 Log all authentication attempts
- [x] 8.8.4 Log all permission changes
- [x] 8.8.5 Log all data access operations
- [x] 8.8.6 Log all errors with context
- [x] 8.8.7 Conduct security audit of entire system
- [x] 8.8.8 Fix identified vulnerabilities
- [x] 8.8.9 Document security measures

---
## Phase 9: Performance Optimization (Weeks 28-29)

### 9.1 Redis Caching Implementation
- [x] 9.1.1 Install Redis and ioredis package
- [x] 9.1.2 Set up Redis server
- [x] 9.1.3 Create CacheService class
- [x] 9.1.4 Implement get() method
- [x] 9.1.5 Implement set() method with TTL
- [x] 9.1.6 Implement del() method
- [x] 9.1.7 Implement invalidatePattern() method
- [x] 9.1.8 Implement cacheQuery() wrapper method
- [x] 9.1.9 Add caching to student list queries
- [x] 9.1.10 Add caching to staff list queries
- [x] 9.1.11 Add caching to class list queries
- [x] 9.1.12 Add caching to subject list queries
- [x] 9.1.13 Implement cache invalidation on updates
- [x] 9.1.14 Test Redis caching performance

### 9.2 Database Query Optimization
- [x] 9.2.1 Create indexes on students table (class_id, academic_year, status, guardian_id)
- [x] 9.2.2 Create indexes on attendance table (student_id + date, class_id + date, date)
- [x] 9.2.3 Create indexes on marks table (student_id + subject_id, class_id + term)
- [x] 9.2.4 Create indexes on student_exams table (student_id, exam_id, status)
- [x] 9.2.5 Create indexes on payments table (student_id, payment_date, status)
- [x] 9.2.6 Create composite indexes for common queries
- [x] 9.2.7 Optimize N+1 query problems with JOINs
- [x] 9.2.8 Implement pagination for large datasets
- [x] 9.2.9 Add query performance monitoring
- [x] 9.2.10 Test query optimization improvements

### 9.3 Frontend Performance Optimization
- [x] 9.3.1 Install @tanstack/react-query for data fetching and caching
- [x] 9.3.2 Implement React Query for student queries
- [x] 9.3.3 Implement React Query for staff queries
- [x] 9.3.4 Implement React Query for attendance queries
- [x] 9.3.5 Configure staleTime and cacheTime appropriately
- [x] 9.3.6 Implement optimistic updates for mutations
- [x] 9.3.7 Test client-side caching

### 9.4 Code Splitting and Lazy Loading
- [x] 9.4.1 Implement lazy loading for route components
- [x] 9.4.2 Add Suspense boundaries with loading screens
- [x] 9.4.3 Split large components into smaller chunks
- [x] 9.4.4 Implement dynamic imports for heavy modules
- [x] 9.4.5 Test code splitting and lazy loading

### 9.5 Virtual Scrolling for Large Lists
- [x] 9.5.1 Install react-window package
- [x] 9.5.2 Implement virtual scrolling for student lists
- [x] 9.5.3 Implement virtual scrolling for staff lists
- [x] 9.5.4 Implement virtual scrolling for attendance sheets
- [x] 9.5.5 Test virtual scrolling performance

### 9.6 Image and Asset Optimization
- [x] 9.6.1 Install browser-image-compression package
- [x] 9.6.2 Implement image compression on upload
- [x] 9.6.3 Add lazy loading for images
- [x] 9.6.4 Optimize image formats (WebP where supported)
- [x] 9.6.5 Test image optimization

### 9.7 Bundle Optimization
- [x] 9.7.1 Configure Vite manual chunks for vendor libraries
- [x] 9.7.2 Configure Vite manual chunks for UI libraries
- [x] 9.7.3 Configure Vite manual chunks for utility libraries
- [x] 9.7.4 Enable minification with Terser
- [x] 9.7.5 Remove console logs in production
- [x] 9.7.6 Analyze bundle size
- [x] 9.7.7 Optimize bundle size to meet targets
- [x] 9.7.8 Test production build performance

---

## Phase 10: Testing and Deployment (Weeks 30-32)

### 10.1 Unit Testing
- [x] 10.1.1 Set up Jest testing framework
- [x] 10.1.2 Write unit tests for EthiopianCalendarService
- [x] 10.1.3 Write unit tests for GeminiService
- [x] 10.1.4 Write unit tests for AutoGradingService
- [x] 10.1.5 Write unit tests for CacheService
- [x] 10.1.6 Write unit tests for SyncManager
- [x] 10.1.7 Write unit tests for NotificationService
- [x] 10.1.8 Write unit tests for authentication middleware
- [x] 10.1.9 Write unit tests for authorization middleware
- [x] 10.1.10 Write unit tests for error handling
- [x] 10.1.11 Achieve 80%+ code coverage for backend
- [x] 10.1.12 Set up React Testing Library
- [x] 10.1.13 Write unit tests for key React components
- [x] 10.1.14 Achieve 70%+ code coverage for frontend

### 10.2 Integration Testing
- [x] 10.2.1 Set up integration test environment
- [x] 10.2.2 Write integration tests for student registration API
- [x] 10.2.3 Write integration tests for authentication flow
- [x] 10.2.4 Write integration tests for exam creation and publishing
- [x] 10.2.5 Write integration tests for attendance marking
- [x] 10.2.6 Write integration tests for mark entry
- [x] 10.2.7 Write integration tests for payment processing
- [x] 10.2.8 Write integration tests for year rollover
- [x] 10.2.9 Write integration tests for offline sync
- [x] 10.2.10 Write integration tests for notifications

### 10.3 End-to-End Testing
- [x] 10.3.1 Install Playwright for E2E testing
- [x] 10.3.2 Write E2E test for admin login flow
- [x] 10.3.3 Write E2E test for student registration flow
- [x] 10.3.4 Write E2E test for AI exam creation flow
- [x] 10.3.5 Write E2E test for exam taking flow (student)
- [x] 10.3.6 Write E2E test for mark entry flow (teacher)
- [x] 10.3.7 Write E2E test for attendance marking flow
- [x] 10.3.8 Write E2E test for payment flow
- [x] 10.3.9 Write E2E test for cross-branch reporting (Super Admin)
- [x] 10.3.10 Run E2E tests on all browsers

### 10.4 Performance Testing
- [x] 10.4.1 Set up Apache JMeter or k6
- [x] 10.4.2 Create load test for dashboard (100 concurrent users)
- [x] 10.4.3 Create load test for mark entry (50 concurrent teachers)
- [x] 10.4.4 Create load test for exam taking (500 concurrent students)
- [x] 10.4.5 Create load test for bulk student registration (1000 students)
- [x] 10.4.6 Run performance tests and collect metrics
- [x] 10.4.7 Verify API response time < 500ms (95th percentile)
- [x] 10.4.8 Verify page load time < 2 seconds
- [x] 10.4.9 Optimize based on performance test results

### 10.5 User Acceptance Testing (UAT)
- [x] 10.5.1 Select pilot school for UAT
- [x] 10.5.2 Prepare UAT environment
- [x] 10.5.3 Create UAT test scenarios and scripts
- [x] 10.5.4 Conduct admin user training
- [x] 10.5.5 Conduct teacher user training
- [x] 10.5.6 Conduct student user training
- [x] 10.5.7 Conduct guardian user training
- [x] 10.5.8 Execute UAT with pilot school
- [x] 10.5.9 Collect user feedback
- [x] 10.5.10 Fix critical UAT issues
- [x] 10.5.11 Retest after fixes
- [x] 10.5.12 Obtain UAT sign-off

### 10.6 Deployment Preparation
- [x] 10.6.1 Create deployment script (deploy.sh)
- [x] 10.6.2 Configure VPS server (Ubuntu)
- [x] 10.6.3 Install Node.js and PM2
- [x] 10.6.4 Install PostgreSQL
- [x] 10.6.5 Install Redis
- [x] 10.6.6 Install Nginx
- [x] 10.6.7 Configure Nginx as reverse proxy
- [x] 10.6.8 Configure SSL/TLS certificates
- [x] 10.6.9 Set up database backups
- [x] 10.6.10 Configure PM2 for process management
- [x] 10.6.11 Set up environment variables
- [x] 10.6.12 Create health check endpoint

### 10.7 Production Deployment
- [x] 10.7.1 Backup existing V1 system
- [x] 10.7.2 Deploy backend to VPS
- [x] 10.7.3 Run database migrations
- [x] 10.7.4 Deploy frontend to VPS
- [x] 10.7.5 Build and deploy Tauri desktop apps (Admin, Super Admin)
- [x] 10.7.6 Build and deploy Capacitor mobile apps (Staff, Student, Guardian, Super Admin)
- [x] 10.7.7 Configure Firebase for push notifications
- [x] 10.7.8 Configure Telegram bot
- [x] 10.7.9 Configure SMS gateway (optional)
- [x] 10.7.10 Test all applications in production
- [x] 10.7.11 Verify health check endpoint
- [x] 10.7.12 Monitor application logs

### 10.8 Post-Deployment Monitoring
- [x] 10.8.1 Set up application monitoring (PM2 monitoring)
- [x] 10.8.2 Set up error tracking
- [x] 10.8.3 Set up performance monitoring
- [x] 10.8.4 Monitor database performance
- [x] 10.8.5 Monitor Redis performance
- [x] 10.8.6 Monitor API response times
- [x] 10.8.7 Monitor user activity
- [x] 10.8.8 Set up alerts for critical issues
- [x] 10.8.9 Create monitoring dashboard
- [x] 10.8.10 Document monitoring procedures

### 10.9 Documentation and Training
- [x] 10.9.1 Create admin user manual
- [x] 10.9.2 Create teacher user manual
- [x] 10.9.3 Create student user manual
- [x] 10.9.4 Create guardian user manual
- [x] 10.9.5 Create technical documentation
- [x] 10.9.6 Create API documentation
- [x] 10.9.7 Create deployment guide
- [x] 10.9.8 Create troubleshooting guide
- [x] 10.9.9 Record video tutorials (English, Amharic)
- [x] 10.9.10 Conduct final training sessions for all schools

### 10.10 Rollout to Remaining Schools
- [x] 10.10.1 Deploy to school 2
- [x] 10.10.2 Conduct training for school 2
- [x] 10.10.3 Monitor school 2 for 1 week
- [x] 10.10.4 Deploy to school 3
- [x] 10.10.5 Conduct training for school 3
- [x] 10.10.6 Monitor school 3 for 1 week
- [x] 10.10.7 Deploy to school 4
- [x] 10.10.8 Conduct training for school 4
- [x] 10.10.9 Monitor school 4 for 1 week
- [x] 10.10.10 Collect feedback from all schools
- [x] 10.10.11 Address post-deployment issues
- [x] 10.10.12 Celebrate successful V2 launch! 🎉

---

## Phase 11: UI/UX Design System Implementation (Weeks 33-46)

### 11.1 Foundation Setup (Week 33-34)
- [x] 11.1.1 Install UI/UX dependencies (i18next, react-i18next, i18next-browser-languagedetector, lucide-react)
- [x] 11.1.2 Create design tokens file (`src/styles/design-tokens.js`)
- [x] 11.1.3 Create theme CSS file with CSS variables (`src/styles/theme.css`)
- [x] 11.1.4 Implement light mode color variables
- [x] 11.1.5 Implement dark mode color variables
- [x] 11.1.6 Add smooth transitions for theme changes
- [x] 11.1.7 Create ThemeContext (`src/contexts/ThemeContext.jsx`)
- [x] 11.1.8 Implement theme state management (light/dark)
- [x] 11.1.9 Implement theme persistence in localStorage
- [x] 11.1.10 Implement system preference detection
- [x] 11.1.11 Create useTheme hook
- [x] 11.1.12 Set up i18n configuration (`src/i18n/config.js`)
- [x] 11.1.13 Create English translation file (`src/i18n/locales/en.json`)
- [x] 11.1.14 Create Amharic translation file (`src/i18n/locales/am.json`)
- [x] 11.1.15 Create Arabic translation file (`src/i18n/locales/ar.json`)
- [x] 11.1.16 Create LanguageContext (`src/contexts/LanguageContext.jsx`)
- [x] 11.1.17 Implement language state management
- [x] 11.1.18 Implement RTL support for Arabic
- [x] 11.1.19 Implement language persistence in localStorage
- [x] 11.1.20 Create useLanguage hook
- [x] 11.1.21 Wrap App with ThemeProvider and LanguageProvider
- [x] 11.1.22 Import theme.css in main entry point
- [x] 11.1.23 Test theme switching functionality
- [x] 11.1.24 Test language switching functionality

### 11.2 Core Components (Week 35-36)
- [x] 11.2.1 Create Button component (`src/components/Button/Button.jsx`)
- [x] 11.2.2 Create Button styles (`src/components/Button/Button.module.css`)
- [x] 11.2.3 Implement Button variants (primary, secondary, outline, ghost, danger)
- [x] 11.2.4 Implement Button sizes (sm, md, lg)
- [x] 11.2.5 Implement Button loading state
- [x] 11.2.6 Implement Button disabled state
- [x] 11.2.7 Implement Button with icon support
- [x] 11.2.8 Test Button component in light and dark modes
- [x] 11.2.9 Create Input component (`src/components/Input/Input.jsx`)
- [x] 11.2.10 Create Input styles (`src/components/Input/Input.module.css`)
- [x] 11.2.11 Implement Input with label
- [x] 11.2.12 Implement Input with icon
- [x] 11.2.13 Implement Input error state
- [x] 11.2.14 Implement Input helper text
- [x] 11.2.15 Implement Input required indicator
- [-] 11.2.16 Test Input component in light and dark modes
- [x] 11.2.17 Create Card component (`src/components/Card/Card.jsx`)
- [x] 11.2.18 Create Card styles (`src/components/Card/Card.module.css`)
- [x] 11.2.19 Implement Card variants (default, outlined, elevated)
- [x] 11.2.20 Implement Card padding options
- [x] 11.2.21 Implement Card with title and subtitle
- [x] 11.2.22 Implement Card with actions
- [x] 11.2.23 Implement Card hoverable state
- [x] 11.2.24 Test Card component in light and dark modes
- [x] 11.2.25 Create Modal component (`src/components/Modal/Modal.jsx`)
- [x] 11.2.26 Create Modal styles (`src/components/Modal/Modal.module.css`)
- [x] 11.2.27 Implement Modal with portal rendering
- [x] 11.2.28 Implement Modal sizes (sm, md, lg, xl, full)
- [x] 11.2.29 Implement Modal overlay click to close
- [x] 11.2.30 Implement Modal close button
- [x] 11.2.31 Implement Modal animations (fadeIn, slideUp)
- [x] 11.2.32 Implement Modal body scroll lock
- [x] 11.2.33 Test Modal component in light and dark modes
- [x] 11.2.34 Create Table component (`src/components/Table/Table.jsx`)
- [x] 11.2.35 Create Table styles (`src/components/Table/Table.module.css`)
- [x] 11.2.36 Implement Table with columns configuration
- [x] 11.2.37 Implement Table with custom cell rendering
- [x] 11.2.38 Implement Table loading state
- [x] 11.2.39 Implement Table empty state
- [x] 11.2.40 Implement Table row click handler
- [x] 11.2.41 Test Table component in light and dark modes

### 11.3 Utility Components (Week 37)
- [x] 11.3.1 Create ThemeToggle component (`src/components/ThemeToggle/ThemeToggle.jsx`)
- [x] 11.3.2 Create ThemeToggle styles (`src/components/ThemeToggle/ThemeToggle.module.css`)
- [x] 11.3.3 Implement ThemeToggle with Sun/Moon icons
- [x] 11.3.4 Test ThemeToggle functionality
- [x] 11.3.5 Create LanguageSelector component (`src/components/LanguageSelector/LanguageSelector.jsx`)
- [x] 11.3.6 Create LanguageSelector styles (`src/components/LanguageSelector/LanguageSelector.module.css`)
- [x] 11.3.7 Implement LanguageSelector dropdown
- [x] 11.3.8 Implement LanguageSelector with Globe icon
- [x] 11.3.9 Test LanguageSelector functionality
- [x] 11.3.10 Create LoadingSpinner component
- [x] 11.3.11 Create LoadingSpinner styles
- [x] 11.3.12 Create Skeleton component for loading states
- [x] 11.3.13 Create Skeleton styles
- [x] 11.3.14 Create Toast notification component
- [x] 11.3.15 Create Toast styles
- [x] 11.3.16 Create Badge component
- [x] 11.3.17 Create Badge styles
- [x] 11.3.18 Test all utility components

### 11.4 Layout Components (Week 38)
- [x] 11.4.1 Create Sidebar component (`src/components/Sidebar/Sidebar.jsx`)
- [x] 11.4.2 Create Sidebar styles (`src/components/Sidebar/Sidebar.module.css`)
- [x] 11.4.3 Implement Sidebar navigation menu
- [x] 11.4.4 Implement Sidebar collapse/expand functionality
- [x] 11.4.5 Implement Sidebar active link highlighting
- [x] 11.4.6 Test Sidebar in light and dark modes
- [x] 11.4.7 Create Header component (`src/components/Header/Header.jsx`)
- [x] 11.4.8 Create Header styles (`src/components/Header/Header.module.css`)
- [x] 11.4.9 Implement Header with breadcrumbs
- [x] 11.4.10 Implement Header with search
- [x] 11.4.11 Implement Header with notifications
- [x] 11.4.12 Implement Header with profile menu
- [x] 11.4.13 Test Header in light and dark modes
- [x] 11.4.14 Create Breadcrumbs component
- [x] 11.4.15 Create Breadcrumbs styles
- [x] 11.4.16 Create Footer component
- [x] 11.4.17 Create Footer styles
- [x] 11.4.18 Create PageLayout component (combines Sidebar + Header + Content)
- [x] 11.4.19 Create PageLayout styles
- [x] 11.4.20 Test PageLayout in light and dark modes

### 11.5 Form Components (Week 39)
- [x] 11.5.1 Create Select component
- [x] 11.5.2 Create Select styles
- [x] 11.5.3 Create Checkbox component
- [x] 11.5.4 Create Checkbox styles
- [x] 11.5.5 Create Radio component
- [x] 11.5.6 Create Radio styles
- [x] 11.5.7 Create Textarea component
- [x] 11.5.8 Create Textarea styles
- [x] 11.5.9 Create DatePicker component
- [x] 11.5.10 Create DatePicker styles
- [x] 11.5.11 Create FileUpload component
- [x] 11.5.12 Create FileUpload styles
- [x] 11.5.13 Create FormGroup component
- [x] 11.5.14 Create FormGroup styles
- [x] 11.5.15 Test all form components

### 11.6 Page Updates - Authentication (Week 40)
- [x] 11.6.1 Update Login page with new design
- [x] 11.6.2 Update Login page styles
- [x] 11.6.3 Add gradient background to Login page
- [x] 11.6.4 Add ThemeToggle to Login page
- [x] 11.6.5 Add LanguageSelector to Login page
- [x] 11.6.6 Update BranchCodeInput component with new design
- [x] 11.6.7 Test Login page in light and dark modes
- [x] 11.6.8 Test Login page in all languages
- [x] 11.6.9 Update StaffLogin page with new design
- [x] 11.6.10 Update StudentLogin page with new design
- [x] 11.6.11 Update GuardianLogin page with new design
- [x] 11.6.12 Test all login pages

### 11.7 Page Updates - Dashboard (Week 41)
- [x] 11.7.1 Create StatCard component for dashboard
- [x] 11.7.2 Create StatCard styles
- [x] 11.7.3 Update Dashboard page with new design
- [x] 11.7.4 Update Dashboard page styles
- [x] 11.7.5 Implement stat cards grid
- [x] 11.7.6 Implement charts with responsive design
- [x] 11.7.7 Implement recent activity section
- [x] 11.7.8 Implement upcoming events section
- [x] 11.7.9 Test Dashboard in light and dark modes
- [x] 11.7.10 Test Dashboard in all languages
- [x] 11.7.11 Test Dashboard responsiveness

### 11.8 Page Updates - Student Management (Week 42)
- [x] 11.8.1 Update Student List page with new design
- [x] 11.8.2 Update Student List page styles
- [x] 11.8.3 Implement search and filter UI
- [x] 11.8.4 Implement pagination UI
- [x] 11.8.5 Update Student Profile page with new design
- [x] 11.8.6 Update Student Profile page styles
- [x] 11.8.7 Update Student Registration page with new design
- [x] 11.8.8 Update Student Registration page styles
- [x] 11.8.9 Update Student Attendance page with new design
- [x] 11.8.10 Update Student Attendance page styles
- [x] 11.8.11 Test all student management pages in light and dark modes
- [x] 11.8.12 Test all student management pages in all languages

### 11.9 Page Updates - Staff & Academic (Week 43)
- [x] 11.9.1 Update Staff List page with new design
- [x] 11.9.2 Update Staff Profile page with new design
- [x] 11.9.3 Update Staff Registration page with new design
- [x] 11.9.4 Update Mark Lists page with new design
- [x] 11.9.5 Update Exam Creation page with new design
- [x] 11.9.6 Update AI Test Generator page with new design
- [x] 11.9.7 Update Report Cards page with new design
- [x] 11.9.8 Update Schedule page with new design
- [x] 11.9.9 Test all staff and academic pages in light and dark modes
- [x] 11.9.10 Test all staff and academic pages in all languages

### 11.10 Page Updates - Finance & Communication (Week 44)
- [x] 11.10.1 Update Fee Management page with new design
- [x] 11.10.2 Update Invoices page with new design
- [x] 11.10.3 Update Payments page with new design
- [x] 11.10.4 Update Financial Reports page with new design
- [x] 11.10.5 Update Posts page with new design
- [x] 11.10.6 Update Messages page with new design
- [x] 11.10.7 Update Notifications page with new design
- [x] 11.10.8 Update Settings page with new design
- [x] 11.10.9 Test all finance and communication pages in light and dark modes
- [x] 11.10.10 Test all finance and communication pages in all languages

### 11.11 Responsive Design Testing (Week 45)
- [x] 11.11.1 Test all pages on mobile devices (320px - 767px)
- [x] 11.11.2 Test all pages on tablets (768px - 1023px)
- [x] 11.11.3 Test all pages on desktop (1024px+)
- [x] 11.11.4 Fix responsive issues on mobile
- [x] 11.11.5 Fix responsive issues on tablets
- [x] 11.11.6 Implement mobile navigation menu
- [x] 11.11.7 Implement touch-friendly interactions
- [x] 11.11.8 Test sidebar collapse on mobile
- [x] 11.11.9 Test modals on mobile
- [x] 11.11.10 Test tables on mobile (horizontal scroll)

### 11.12 Accessibility Audit (Week 45)
- [x] 11.12.1 Install axe accessibility testing tool
- [x] 11.12.2 Run accessibility audit on all pages
- [x] 11.12.3 Fix color contrast issues
- [x] 11.12.4 Add ARIA labels to all interactive elements
- [x] 11.12.5 Ensure all forms have proper labels
- [x] 11.12.6 Test keyboard navigation on all pages
- [x] 11.12.7 Test screen reader compatibility
- [x] 11.12.8 Add focus indicators to all focusable elements
- [x] 11.12.9 Ensure minimum touch target size (44x44px)
- [x] 11.12.10 Document accessibility features

### 11.13 Performance Optimization (Week 46)
- [x] 11.13.1 Optimize CSS bundle size
- [x] 11.13.2 Remove unused CSS
- [x] 11.13.3 Optimize font loading
- [x] 11.13.4 Implement font subsetting for Amharic fonts
- [x] 11.13.5 Lazy load heavy components
- [x] 11.13.6 Optimize images in UI
- [x] 11.13.7 Measure page load times
- [x] 11.13.8 Measure Time to Interactive (TTI)
- [x] 11.13.9 Measure First Contentful Paint (FCP)
- [x] 11.13.10 Optimize theme switching performance

### 11.14 Cross-Browser Testing (Week 46)
- [x] 11.14.1 Test on Chrome (latest)
- [x] 11.14.2 Test on Firefox (latest)
- [x] 11.14.3 Test on Safari (latest)
- [x] 11.14.4 Test on Edge (latest)
- [x] 11.14.5 Fix browser-specific issues
- [x] 11.14.6 Test RTL layout on all browsers
- [x] 11.14.7 Test dark mode on all browsers
- [x] 11.14.8 Document browser compatibility

### 11.15 Documentation & Polish (Week 46)
- [x] 11.15.1 Create component documentation (Storybook optional)
- [x] 11.15.2 Document theme customization guide
- [x] 11.15.3 Document translation workflow
- [x] 11.15.4 Create UI/UX style guide for developers
- [x] 11.15.5 Add JSDoc comments to all components
- [x] 11.15.6 Create component usage examples
- [x] 11.15.7 Polish animations and transitions
- [x] 11.15.8 Final visual QA pass on all pages
- [x] 11.15.9 User acceptance testing for UI/UX
- [x] 11.15.10 Celebrate UI/UX completion! 🎨

---

## Summary

**Total Tasks:** 550+
**Duration:** 46 weeks (11.5 months)
**Phases:** 11
**Team Size:** 3-5 developers recommended

### Key Milestones:
- ✅ Week 4: Foundation complete (native apps, API config, Ethiopian calendar, multi-branch DB)
- ✅ Week 8: Migration complete (all 4 schools migrated to V2)
- ✅ Week 12: AI Test Generator complete (Gemini integration, auto-grading)
- ✅ Week 15: Offline-first architecture complete
- ✅ Week 18: Notification system complete (Push, Telegram, SMS)
- ✅ Week 22: Module consolidation complete
- ✅ Week 25: Native app features complete
- ✅ Week 27: Security hardening complete
- ✅ Week 29: Performance optimization complete
- ✅ Week 32: Production deployment and rollout complete

### Critical Success Factors:
1. Zero data loss during V1 to V2 migration
2. Ethiopian calendar integration throughout
3. AI exam generation quality and reliability
4. Offline sync robustness
5. Multi-branch architecture stability
6. Native app performance and user experience
7. Security and data protection
8. User adoption and satisfaction

---

## Notes

- Tasks marked with `*` are optional and can be skipped if time/resources are limited
- Some tasks can be done in parallel by different team members
- Regular testing should be done throughout, not just in Phase 10
- User feedback should be collected continuously and incorporated
- Documentation should be updated as features are completed

---

**Spec Complete!** 🎉

You now have:
1. ✅ Requirements Document (32 requirements)
2. ✅ Design Document (complete technical architecture)
3. ✅ Tasks Document (400+ implementation tasks)

Ready to start building Skoolific V2!



