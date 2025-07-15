# Metro Vehicle Tracking System

## Overview

This is a full-stack web application for Metro Cash & Carry stores to track vehicle attendance and manage gate operations. The system provides real-time vehicle check-in/out tracking, driver management, and comprehensive analytics across multiple store locations.

## User Preferences

Preferred communication style: Simple, everyday language.

## Recent Changes

### July 2025 - Replit Migration Completed
- Successfully migrated project from Replit Agent to Replit environment
- PostgreSQL database connected and seeded with test data
- All core functionality verified working:
  - Authentication system (admin and gate operator roles)
  - Vehicle check-in/checkout tracking
  - Vendor supervisors and loaders management
  - Real-time dashboard with live data
  - Store-specific access controls
  - Report generation and CSV export
- WebSocket real-time updates functioning
- PWA features and service worker operational

### December 2024 - TypeScript Issues Fixed & Brand Colors Applied
- Fixed all TypeScript compilation errors in server-side code
- Resolved AuthProvider JSX component type issues
- Applied Metro Cash & Carry brand colors:
  - Primary blue: #003399 (hsl(220, 100%, 20%))
  - Accent yellow: #FFD700 (hsl(51, 100%, 50%))
- Updated null safety handling for database operations
- SendGrid API key integration confirmed working
- Application successfully running on port 5000

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Styling**: Tailwind CSS with shadcn/ui components
- **State Management**: TanStack Query for server state, React hooks for local state
- **Routing**: Wouter for client-side routing
- **Authentication**: Context-based auth with localStorage token storage
- **PWA Features**: Service Worker for offline capability, installable as mobile app

### Backend Architecture
- **Runtime**: Node.js with Express.js
- **Language**: TypeScript with ES modules
- **Database**: PostgreSQL with Drizzle ORM
- **Database Provider**: Neon Database (serverless PostgreSQL)
- **Real-time**: WebSocket for live updates
- **Session Management**: PostgreSQL-backed sessions with connect-pg-simple

### Key Components

1. **Authentication System**
   - Role-based access control (Admin, Gate Operator)
   - Store-specific access for gate operators
   - JWT-like token system using base64 encoding

2. **Vehicle Management**
   - Vehicle registration with vendor association
   - Driver photo capture using device camera
   - Check-in/out tracking with odometer readings
   - Manpower tracking (loader, supervisor photos)

3. **Real-time Dashboard**
   - Live vehicle status updates via WebSocket
   - KPI cards showing daily metrics
   - Store-wise vehicle counts and analytics
   - Extended stay alerts for vehicles

4. **PWA Features**
   - Offline-first design with service worker
   - Camera access for photo capture
   - Mobile-responsive interface
   - Background sync capabilities

5. **Export & Reporting**
   - CSV/Excel export functionality
   - Automated email reports to vendors
   - Date range filtering and store-specific reports

## Data Flow

1. **User Authentication**: Login → Token generation → Role-based routing
2. **Vehicle Entry**: Form submission → Photo capture → Database storage → WebSocket broadcast
3. **Real-time Updates**: Database changes → WebSocket notifications → UI updates
4. **Reporting**: Background scheduler → Data aggregation → Email dispatch

## External Dependencies

- **Database**: Neon Database (PostgreSQL)
- **Email Service**: SendGrid for automated vendor reports
- **UI Components**: Radix UI primitives with shadcn/ui styling
- **Development**: Vite for build tooling and development server

## Deployment Strategy

- **Build Process**: Vite builds frontend, esbuild bundles backend
- **Production**: Single Node.js server serving both API and static files
- **Database**: Serverless PostgreSQL with automatic scaling
- **Environment**: Environment variables for database URL and SendGrid API key

The application uses a monorepo structure with shared schema definitions between frontend and backend, ensuring type safety across the entire stack. The PWA architecture makes it suitable for mobile gate operators with intermittent connectivity.