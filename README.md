
# Metro Vehicle Tracking System

## Overview

A full-stack Progressive Web Application (PWA) for Metro Cash & Carry stores to track vehicle attendance and manage gate operations. The system provides real-time vehicle check-in/out tracking, driver management, photo uploads via Firebase Storage, and comprehensive analytics across multiple store locations.

## Architecture Overview

### Tech Stack
- **Frontend**: React 18 + TypeScript + Tailwind CSS + shadcn/ui
- **Backend**: Node.js + Express.js + TypeScript
- **Database**: PostgreSQL (Neon Database - serverless)
- **ORM**: Drizzle ORM for type-safe database operations
- **Photo Storage**: Firebase Storage
- **Real-time**: WebSockets for live updates
- **Build Tool**: Vite for development and production builds

### Key Features
- Role-based authentication (Admin/Gate Operator)
- Real-time vehicle tracking with live dashboard
- Photo capture for drivers and manpower using device camera
- Firebase Storage integration for photo management
- Store-specific access control
- Export functionality (CSV/Excel)
- Email reporting system
- PWA capabilities for mobile usage

## Database Structure (PostgreSQL)

### Core Tables

#### 1. `stores` - Store Locations
```sql
- id: Primary key
- name: Store name (e.g., "Metro Mumbai Central")
- location: Physical location
- is_active: Active status flag
```

#### 2. `users` - System Users
```sql
- id: Primary key
- username: Unique login identifier
- password: Hashed password
- name: Full name
- email: Contact email
- role: 'admin' | 'gate_operator'
- store_id: Foreign key to stores (for gate operators)
- created_at: Registration timestamp
```

#### 3. `vendors` - Vendor Companies
```sql
- id: Primary key
- name: Vendor company name
- email: Contact email
- is_active: Active status flag
```

#### 4. `vehicles` - Vehicle Master Data
```sql
- id: Primary key
- vehicle_number: Unique vehicle identifier
- vendor_id: Foreign key to vendors
- driver_name: Driver's name
- driver_photo_url: Firebase Storage URL for driver photo
- created_at: Registration timestamp
```

#### 5. `checkins` - Vehicle Entry/Exit Records
```sql
- id: Primary key
- vehicle_id: Foreign key to vehicles
- store_id: Foreign key to stores
- vendor_id: Foreign key to vendors
- operator_id: Foreign key to users (gate operator)
- purpose: Visit purpose
- opening_km: Odometer reading at entry
- opening_km_timestamp: Entry time
- closing_km: Odometer reading at exit
- closing_km_timestamp: Exit time
- status: 'In' | 'Out' | 'Completed'
- created_at: Record creation time
- updated_at: Last modification time
- Denormalized fields for faster queries:
  - vehicle_number
  - vendor_name
  - driver_name
  - store_name
```

#### 6. `manpower` - Personnel Records
```sql
- id: Primary key
- checkin_id: Foreign key to checkins
- name: Person's name
- id_number: ID/Badge number
- photo_url: Firebase Storage URL for person's photo
```

## Application Flow

### 1. Authentication Flow
```
1. User opens app → Login page
2. Enter credentials (username/password/role)
3. Backend validates against users table
4. Generate base64 token with user info
5. Store token in localStorage
6. Redirect based on role:
   - Admin → Admin Dashboard
   - Gate Operator → Gate Operator Interface
```

### 2. Vehicle Entry Flow
```
1. Gate operator scans/enters vehicle number
2. If new vehicle:
   - Capture driver photo using device camera
   - Upload photo to Firebase Storage
   - Get photo URL from Firebase
3. Fill vehicle details (driver name, vendor, opening KM)
4. Add manpower details with photos
5. Submit form:
   - Create/update vehicle record in PostgreSQL
   - Create checkin record with Firebase photo URLs
   - Create manpower records
   - Broadcast real-time update via WebSocket
6. Success confirmation
```

### 3. Photo Management Flow
```
Frontend (Photo Capture):
1. User clicks photo button → Camera modal opens
2. Access device camera using getUserMedia API
3. Capture photo as File object
4. Upload to Firebase Storage using photoManager
5. Get downloadable URL from Firebase
6. Send URL to backend with form data

Backend (URL Storage):
1. Receive photo URL from frontend
2. Store URL in PostgreSQL (driver_photo_url or photo_url)
3. No file handling on backend - only URLs
```

### 4. Real-time Updates Flow
```
1. Vehicle entry/exit occurs
2. Backend updates database
3. WebSocket service broadcasts event
4. All connected clients receive update
5. Frontend updates UI automatically
6. KPI cards and tables refresh
```

## File Structure & Responsibilities

### Frontend (`client/`)

#### Core App Files
- **`src/main.tsx`** - App entry point, React root mounting
- **`src/App.tsx`** - Main app component with routing
- **`src/index.css`** - Global styles and Tailwind imports

#### Authentication
- **`src/lib/auth.tsx`** - Auth context provider and hooks
- **`src/hooks/use-auth.ts`** - Authentication utilities
- **`src/pages/login.tsx`** - Login page component

#### Firebase Integration
- **`src/lib/firebase-client.ts`** - Firebase app initialization
- **`src/lib/firebase-service.ts`** - Photo upload utilities
  - `uploadDriverPhoto()` - Upload driver photos
  - `uploadManpowerPhoto()` - Upload manpower photos

#### Page Components
- **`src/pages/admin.tsx`** - Admin dashboard with KPIs and live data
- **`src/pages/gate-operator.tsx`** - Gate operator interface
- **`src/pages/home.tsx`** - Landing page with role selection

#### UI Components
- **`src/components/vehicle-form.tsx`** - Vehicle entry form
- **`src/components/camera-modal.tsx`** - Photo capture interface
- **`src/components/kpi-cards.tsx`** - Dashboard metrics
- **`src/components/vehicle-table.tsx`** - Live vehicle status table
- **`src/components/export-panel.tsx`** - Data export controls

#### Utilities
- **`src/hooks/use-websocket.ts`** - WebSocket connection management
- **`src/hooks/use-camera.ts`** - Camera access utilities
- **`src/lib/queryClient.ts`** - TanStack Query configuration

### Backend (`server/`)

#### Core Server Files
- **`index.ts`** - Express server setup and middleware
- **`routes.ts`** - All API endpoints and route handlers
- **`storage.ts`** - Database interface and operations
- **`vite.ts`** - Development server configuration

#### Database Layer
- **`storage.ts`** - Main database interface with methods:
  - User management (login, getUserByUsername)
  - Store operations (getAllStores, getStoreById)
  - Vehicle management (createVehicle, getVehicleByNumber)
  - Checkin operations (createCheckin, updateCheckin)
  - Manpower management (createManpower)
  - Analytics queries (getKPIs, getActiveCheckins)

#### Services
- **`services/websocket.ts`** - Real-time communication
- **`services/email.ts`** - Email reporting system
- **`services/scheduler.ts`** - Background job scheduling

#### Firebase Integration
- **`firebase-service.ts`** - Server-side Firebase utilities (if needed)
- **`firebase_intergration.ts`** - Vehicle management service with photo handling

### Shared (`shared/`)
- **`schema.ts`** - Database schema definitions and TypeScript types
  - Drizzle table definitions
  - Insert/select type inference
  - Validation schemas with Zod

### Configuration Files
- **`drizzle.config.ts`** - Database migration configuration
- **`tsconfig.json`** - TypeScript compiler settings
- **`tailwind.config.ts`** - Tailwind CSS configuration
- **`vite.config.ts`** - Vite build tool configuration

## API Endpoints

### Authentication
- `POST /api/auth/login` - User authentication
- `POST /api/auth/logout` - User logout

### Vehicle Operations
- `POST /api/vehicles/entry` - Vehicle check-in
- `POST /api/vehicles/exit` - Vehicle check-out
- `GET /api/vehicles/search` - Search vehicles

### Data Retrieval
- `GET /api/stores` - Get all stores
- `GET /api/vendors` - Get all vendors
- `GET /api/dashboard/kpis` - Get dashboard metrics
- `GET /api/dashboard/active-vehicles` - Get currently checked-in vehicles
- `GET /api/dashboard/recent-activity` - Get recent check-ins/outs
- `GET /api/dashboard/store-counts` - Get vehicle counts per store

### Export Functions
- `POST /api/export/csv` - Generate CSV export
- `POST /api/export/email` - Email report to recipients

## Environment Variables

Create a `.env` file with:
```bash
# Database
DATABASE_URL=postgresql://username:password@host:port/database

# Firebase Configuration (Frontend)
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_auth_domain
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_storage_bucket
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
VITE_FIREBASE_MEASUREMENT_ID=your_measurement_id

# Email Service (Optional)
SENDGRID_API_KEY=your_sendgrid_key
FROM_EMAIL=noreply@yourcompany.com
```

## Development Setup

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Database Setup**
   ```bash
   # Generate migration
   npx drizzle-kit generate
   
   # Run migration
   npx drizzle-kit migrate
   ```

3. **Start Development Server**
   ```bash
   npm run dev
   ```
   - Server runs on http://localhost:5000
   - Frontend accessible at same URL (Vite proxy)

## Data Flow Summary

1. **User Authentication** → PostgreSQL users table
2. **Photo Capture** → Firebase Storage → Get URL
3. **Form Submission** → PostgreSQL with Firebase URLs
4. **Real-time Updates** → WebSocket broadcast
5. **Dashboard Display** → Query PostgreSQL + WebSocket updates
6. **Export** → PostgreSQL query → CSV generation

## Key Features Implementation

### Photo Upload Process
1. Frontend captures photo using device camera
2. Upload to Firebase Storage using `photoManager`
3. Get downloadable URL from Firebase
4. Send URL to backend with form data
5. Store URL in PostgreSQL (not the file)

### Real-time Dashboard
1. WebSocket connection established on page load
2. Backend broadcasts events on data changes
3. Frontend listens and updates UI automatically
4. KPI cards, tables refresh without page reload

### Role-based Access
1. Admin: Can see all stores, analytics, exports
2. Gate Operator: Limited to assigned store only
3. Authentication enforced on both frontend and backend

The application successfully integrates PostgreSQL for structured data storage with Firebase for photo management, providing a complete vehicle tracking solution with real-time capabilities.
