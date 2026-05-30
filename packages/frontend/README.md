# Skoolific V2 Frontend (Admin Web App)

## Overview
React-based web application for school administrators. Provides comprehensive school management interface with all administrative features.

## Location
The actual frontend code is located in `../../APP/` directory. This workspace package serves as a monorepo integration point.

## Features
- **Dashboard**: Overview of school operations and statistics
- **Task Pages**: Sequential setup workflow (Task1-Task6) for initial system configuration
- **Student Management**: Registration, profiles, attendance, marks
- **Staff Management**: Staff profiles, attendance, salary management
- **Finance Module**: Fee management, monthly payments, expenses, budgets
- **Academic Module**: Mark lists, exam management, evaluation books, report cards
- **HR Module**: Teacher attendance, leave management, payroll, inventory
- **Communication**: Posts, announcements, notifications
- **Settings**: School configuration, language, branding, year rollover
- **Ethiopian Calendar**: Full integration for all date operations
- **Offline Mode**: Local storage with automatic synchronization

## Technology Stack
- **Framework**: React.js 19.1.0
- **Build Tool**: Vite
- **UI Libraries**: Material-UI, Ant Design
- **State Management**: React Context API
- **Routing**: React Router DOM
- **HTTP Client**: Axios
- **Calendar**: ethiopian-calendar-date-converter
- **Offline Storage**: Dexie.js (IndexedDB wrapper)
- **Charts**: Recharts, Chart.js
- **PDF Generation**: jsPDF

## Setup Instructions

### Prerequisites
- Node.js >= 18.0.0
- npm >= 9.0.0

### Installation
```bash
# From workspace root
npm install

# Or install frontend specifically
npm install --workspace=packages/frontend
```

### Environment Variables
Create a `.env` file in the `APP/` directory with:
```
VITE_API_BASE_URL=http://localhost:3000
VITE_APP_NAME=Skoolific V2
VITE_APP_VERSION=2.0.0
```

### Development
```bash
# Run in development mode with hot reload
npm run dev --workspace=packages/frontend

# Or from root
npm run dev:frontend
```

### Build
```bash
# Build for production
npm run build --workspace=packages/frontend

# Or from root
npm run build:frontend
```

### Preview Production Build
```bash
# Preview production build locally
npm run preview --workspace=packages/frontend
```

### Testing
```bash
# Run tests
npm run test --workspace=packages/frontend

# Run tests in watch mode
npm run test:watch --workspace=packages/frontend
```

## Project Structure
```
APP/
├── src/
│   ├── COMPONENTS/       # Reusable UI components
│   ├── PAGE/            # Page components
│   ├── Guardian/        # Guardian-specific pages
│   ├── Student/         # Student-specific pages
│   ├── Staff/           # Staff-specific pages
│   ├── config/          # Configuration files (API, Axios)
│   ├── context/         # React Context providers
│   ├── hooks/           # Custom React hooks
│   ├── utils/           # Utility functions
│   ├── App.jsx          # Main app component
│   └── main.jsx         # Entry point
├── public/              # Static assets
├── dist/                # Build output
└── package.json
```

## API Configuration
All API endpoints are centralized in `APP/src/config/api.config.js`. The frontend uses Axios with automatic retry logic and offline queue management.

## Status
✅ **Active** - Frontend is fully functional and integrated into monorepo structure.
