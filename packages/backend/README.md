# Skoolific V2 Backend API

## Overview
Node.js/Express backend API server with PostgreSQL database support. Handles authentication, multi-branch database connections, Ethiopian calendar operations, and all business logic.

## Location
The actual backend code is located in `../../backend/` directory. This workspace package serves as a monorepo integration point.

## Features
- RESTful API endpoints for all system operations
- Multi-branch database architecture with connection pooling
- JWT-based authentication with branch context
- Ethiopian calendar integration
- AI-powered test generation (Gemini API)
- Offline synchronization support
- Multi-channel notifications (Push, Telegram, SMS)
- Automatic schema creation and migrations

## Technology Stack
- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: JWT (jsonwebtoken)
- **AI Integration**: Google Gemini API
- **Calendar**: ethiopian-calendar-date-converter

## Setup Instructions

### Prerequisites
- Node.js >= 18.0.0
- PostgreSQL >= 14.0
- npm >= 9.0.0

### Installation
```bash
# From workspace root
npm install

# Or install backend specifically
npm install --workspace=packages/backend
```

### Environment Variables
Create a `.env` file in the `backend/` directory with:
```
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

### Development
```bash
# Run in development mode with auto-reload
npm run dev --workspace=packages/backend

# Or from root
npm run dev:backend
```

### Production
```bash
# Start production server
npm run start --workspace=packages/backend

# Or from root
npm run start:backend
```

### Testing
```bash
# Run all tests
npm run test --workspace=packages/backend

# Run property-based tests
npm run test:property --workspace=packages/backend

# Run tests in watch mode
npm run test:watch --workspace=packages/backend
```

## API Endpoints
All API endpoints are centralized in `backend/config/api.config.js`:
- `/api/v2/auth` - Authentication and authorization
- `/api/v2/students` - Student management
- `/api/v2/staff` - Staff management
- `/api/v2/finance` - Financial operations
- `/api/v2/academic` - Academic operations
- `/api/v2/hr` - HR operations
- `/api/v2/communication` - Communication and notifications
- `/api/v2/ai-tests` - AI-powered test generation
- `/api/v2/reports` - Reporting and analytics

## Database Schema
Database schemas are automatically created on deployment. See `backend/database/migrations/` for migration scripts.

## Status
✅ **Active** - Backend is fully functional and integrated into monorepo structure.
