# University ERP System - Architecture Documentation

## Executive Summary

This document describes the architecture of the University ERP system, a modern web-based application for university academic management. The system is built on a three-tier architecture with React frontend, Supabase backend (PostgreSQL + Edge Functions), and implements comprehensive security through Row Level Security (RLS).

## System Architecture Overview

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Client Layer                          │
│  ┌────────────────────────────────────────────────────┐     │
│  │  React SPA (TypeScript)                            │     │
│  │  - Authentication Context                          │     │
│  │  - Feature Modules (Student, Instructor, Admin)   │     │
│  │  - UI Components (Common, Layout, Charts)         │     │
│  │  - Routing (React Router)                         │     │
│  └────────────────────────────────────────────────────┘     │
└─────────────────────────────────────────────────────────────┘
                              │
                              │ HTTPS / WebSocket
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    Backend Layer (Supabase)                  │
│  ┌────────────────────────────────────────────────────┐     │
│  │  Supabase Services                                 │     │
│  │  - Authentication (JWT-based)                      │     │
│  │  - Auto-generated REST API                         │     │
│  │  - Real-time Subscriptions                         │     │
│  │  - Edge Functions (Business Logic)                │     │
│  │  - Storage (File uploads)                          │     │
│  └────────────────────────────────────────────────────┘     │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                      Database Layer                          │
│  ┌────────────────────────────────────────────────────┐     │
│  │  PostgreSQL 15+                                    │     │
│  │  - 30+ tables with relationships                   │     │
│  │  - Row Level Security (RLS) on all tables         │     │
│  │  - Indexes for performance                         │     │
│  │  - Audit logging                                   │     │
│  │  - Functions and triggers                          │     │
│  └────────────────────────────────────────────────────┘     │
└─────────────────────────────────────────────────────────────┘
```

## Frontend Architecture

### Technology Stack

- **Framework**: React 18 with TypeScript
- **State Management**: React Context API (auth), Supabase queries for data
- **Routing**: React Router v6
- **Styling**: TailwindCSS (utility-first)
- **Icons**: Lucide React
- **HTTP Client**: Supabase JS Client (@supabase/supabase-js)

### Directory Structure

```
src/
├── components/
│   ├── common/              # Reusable UI primitives
│   │   ├── Button.tsx       # Button component with variants
│   │   ├── Input.tsx        # Input with label and error states
│   │   ├── Card.tsx         # Content card with optional color accent
│   │   ├── Badge.tsx        # Status badges with color coding
│   │   └── Modal.tsx        # Modal dialog
│   ├── layout/              # Layout components
│   │   ├── Navbar.tsx       # Top navigation bar
│   │   ├── Sidebar.tsx      # Role-based side navigation
│   │   └── MainLayout.tsx   # Main layout wrapper with maintenance banner
│   ├── calendar/            # Calendar-specific components
│   │   ├── CalendarGrid.tsx
│   │   ├── EventCard.tsx
│   │   └── MeetingSlots.tsx
│   └── charts/              # Analytics visualizations
│       ├── GradeChart.tsx
│       └── AttendanceChart.tsx
├── features/                # Feature-based modules
│   ├── auth/
│   │   └── LoginPage.tsx    # Login page with error handling
│   ├── student/
│   │   ├── DashboardPage.tsx
│   │   ├── CatalogPage.tsx
│   │   ├── RegistrationPage.tsx
│   │   ├── TimetablePage.tsx
│   │   ├── GradesPage.tsx
│   │   ├── TranscriptPage.tsx
│   │   └── FinancePage.tsx
│   ├── instructor/
│   │   ├── SectionsPage.tsx
│   │   ├── GradebookPage.tsx
│   │   └── AttendancePage.tsx
│   ├── admin/
│   │   ├── UserManagementPage.tsx
│   │   ├── CourseManagementPage.tsx
│   │   └── SystemSettingsPage.tsx
│   ├── calendar/
│   │   └── CalendarPage.tsx
│   └── notifications/
│       └── NotificationsPage.tsx
├── contexts/
│   └── AuthContext.tsx      # Authentication state and methods
├── hooks/
│   ├── useAuth.ts           # Authentication hook
│   ├── useNotifications.ts  # Notifications management
│   └── useCalendar.ts       # Calendar operations
├── lib/
│   ├── supabase.ts          # Supabase client configuration
│   ├── theme.ts             # Design system (pastel colors)
│   └── utils.ts             # Utility functions
├── types/
│   └── database.ts          # TypeScript types from database
├── App.tsx                  # Root component with routing
└── main.tsx                 # Application entry point
```

### Component Architecture

#### Common Components Pattern

All common components follow this structure:
- Strongly typed props with TypeScript
- Variant support for different visual styles
- Consistent spacing and sizing via Tailwind
- Accessibility built-in (ARIA labels, keyboard navigation)

Example:
```typescript
interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  children: ReactNode;
  disabled?: boolean;
  onClick?: () => void;
}
```

#### Feature Module Pattern

Each feature is self-contained with:
- Page components (routes)
- Feature-specific components
- Local state management
- API integration via Supabase client

### State Management Strategy

1. **Authentication State**: React Context (AuthContext)
   - User session
   - User profile
   - Sign in/out methods
   - Password management

2. **Server State**: Direct Supabase queries
   - Real-time data fetching
   - Automatic caching via Supabase client
   - Optimistic updates

3. **UI State**: Local component state
   - Form inputs
   - Modal visibility
   - Filters and sorting

### Routing Strategy

Role-based routing with protected routes:
```typescript
<Route path="/dashboard" element={
  <ProtectedRoute>
    <DashboardPage />
  </ProtectedRoute>
} />
```

The `ProtectedRoute` component:
- Checks authentication status
- Redirects to login if not authenticated
- Shows loading state during auth check
- Wraps content in MainLayout

## Backend Architecture (Supabase)

### Authentication Layer

**Supabase Auth** provides:
- JWT-based authentication
- Session management
- Password hashing (bcrypt)
- Email verification (optional)

**Custom Extensions**:
- Password history tracking (prevents reuse)
- Login attempt tracking (lockout after N failures)
- Session timeout (inactivity detection)
- Must-change-password flag

### API Layer

**Auto-Generated REST API**:
- Every table gets CRUD endpoints automatically
- RLS policies enforce access control
- Filtering, sorting, pagination built-in

Example queries:
```typescript
// Get student enrollments
const { data } = await supabase
  .from('enrollments')
  .select('*, sections(*, courses(*))')
  .eq('student_id', userId)
  .eq('status', 'ACTIVE');

// Register for course
const { error } = await supabase
  .from('enrollments')
  .insert({
    student_id: userId,
    section_id: sectionId,
    term_id: termId,
    status: 'ACTIVE'
  });
```

**Edge Functions** for complex business logic:
- Enrollment validation (prerequisites, credit cap, time clashes)
- Waitlist promotion automation
- GPA calculation
- Notification dispatch
- Finance reminder jobs

### Database Layer

#### Schema Design Principles

1. **Normalization**: 3NF normalized design
2. **Referential Integrity**: Foreign keys with cascade rules
3. **Audit Trail**: Comprehensive logging in `audit_logs`
4. **Soft Deletes**: Use `is_active` flags instead of hard deletes
5. **Timestamps**: `created_at` and `updated_at` on all tables

#### Table Categories

**User Management** (4 tables):
- user_profiles
- password_history
- login_attempts
- user_sessions

**Academic Structure** (8 tables):
- departments
- terms
- courses
- course_prerequisites
- course_corequisites
- course_antirequisites
- sections
- rooms

**Enrollment** (3 tables):
- enrollments
- waitlists
- enrollment_history

**Gradebook & Attendance** (3 tables):
- assessments
- grades
- attendance_records

**Finance** (4 tables):
- fee_structures
- student_fees
- payments
- installment_plans

**Calendar** (4 tables):
- calendar_events
- event_participants
- meeting_slots
- meeting_requests

**Notifications** (3 tables):
- notifications
- notification_preferences
- broadcasts

**System** (4 tables):
- system_settings
- maintenance_windows
- audit_logs

#### Indexes Strategy

Performance-critical indexes on:
- Foreign keys (automatic in PostgreSQL)
- Frequently queried columns (user_id, student_id, etc.)
- Date ranges (created_at, start_time, end_time)
- Status fields (status, is_active)

Example:
```sql
CREATE INDEX idx_enrollments_student ON enrollments(student_id);
CREATE INDEX idx_enrollments_section ON enrollments(section_id);
CREATE INDEX idx_enrollments_term ON enrollments(term_id);
```

## Security Architecture

### Row Level Security (RLS)

**Core Principle**: All tables have RLS enabled. No data is accessible without explicit policy.

#### Policy Pattern by Role

**Students**:
```sql
-- Students can view own enrollments
CREATE POLICY "Students can view own enrollments"
  ON enrollments FOR SELECT
  TO authenticated
  USING (student_id = auth.uid());
```

**Instructors**:
```sql
-- Instructors can view grades for their sections
CREATE POLICY "Instructors can view grades for their sections"
  ON grades FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM assessments a
      JOIN sections s ON s.id = a.section_id
      WHERE a.id = grades.assessment_id
      AND s.instructor_id = auth.uid()
    )
  );
```

**Admins**:
```sql
-- Admins can manage all enrollments
CREATE POLICY "Admins can manage all enrollments"
  ON enrollments FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role IN ('ADMIN', 'STAFF')
    )
  );
```

### Authentication Flow

```
1. User submits credentials
   ↓
2. Supabase Auth validates and returns JWT
   ↓
3. JWT stored in client (localStorage via Supabase client)
   ↓
4. All API requests include JWT in Authorization header
   ↓
5. RLS policies check auth.uid() against data ownership
   ↓
6. Data returned only if policy allows
```

### Maintenance Mode Security

During maintenance:
- Middleware checks `is_maintenance_mode()` function
- All write operations blocked for non-admin roles
- Read operations allowed
- Admin operations always permitted (with audit logging)

```sql
CREATE OR REPLACE FUNCTION is_maintenance_mode()
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM maintenance_windows
    WHERE is_active = true
    AND now() BETWEEN start_time AND end_time
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

## Design System Architecture

### Pastel Color System

**Purpose**: Consistent visual coding across all features

**Color Definitions** (in `src/lib/theme.ts`):

```typescript
export const departmentColors = {
  COMPUTER_SCIENCE: '#B8D4E8',  // Light blue
  MATHEMATICS: '#E8C1D4',       // Light pink
  PHYSICS: '#D4E8C1',           // Light green
  CHEMISTRY: '#E8D4B8',         // Light orange
  BIOLOGY: '#C1E8D4',           // Light teal
  // ... more departments
};

export const eventTypeColors = {
  CLASS: '#B8D4E8',
  EXAM: '#E8C1D4',
  EVENT: '#D4E8C1',
  // ... more event types
};

export const notificationCategoryColors = {
  ACADEMIC: '#B8D4E8',
  FINANCE: '#E8C1D4',
  EVENTS: '#D4E8C1',
  // ... more categories
};
```

**Usage Pattern**:
```typescript
import { getDepartmentColor, getEventColor } from '@/lib/theme';

<Badge color={getDepartmentColor(dept.code)}>
  {dept.name}
</Badge>

<EventCard color={getEventColor(event.type)}>
  {event.title}
</EventCard>
```

### Component Design Principles

1. **Consistency**: All components use the same spacing scale (4px, 8px, 16px, 24px, 32px)
2. **Accessibility**: WCAG 2.1 AA contrast ratios enforced
3. **Responsiveness**: Mobile-first design with breakpoints
4. **Feedback**: Loading states, error states, empty states for all interactions

## Data Flow Architecture

### Read Operations (Example: Student viewing grades)

```
1. Student navigates to /grades
   ↓
2. GradesPage component mounts
   ↓
3. useEffect triggers Supabase query
   ↓
4. Query: SELECT * FROM grades WHERE student_id = auth.uid()
   ↓
5. RLS policy checks: student_id = auth.uid() ✓
   ↓
6. Data returned and cached by Supabase client
   ↓
7. Component renders grade list
```

### Write Operations (Example: Instructor entering grade)

```
1. Instructor enters grade in form
   ↓
2. Form submit triggers handleSubmit
   ↓
3. Validation: Check marks <= max_marks
   ↓
4. Supabase INSERT/UPDATE query
   ↓
5. RLS policy checks: instructor owns section ✓
   ↓
6. Audit log entry created (trigger)
   ↓
7. Grade saved to database
   ↓
8. Notification sent to student (Edge Function)
   ↓
9. UI updated with success message
```

### Complex Workflows (Example: Course registration)

```
1. Student selects section to register
   ↓
2. Frontend validation:
   - Check term registration period
   - Check maintenance mode
   ↓
3. Call Edge Function: enroll-student
   ↓
4. Edge Function performs:
   - Check prerequisites (query prerequisite relationships)
   - Check credit cap (sum current enrollments)
   - Check time clashes (compare schedules)
   - Check section capacity
   ↓
5. If capacity full:
   - Add to waitlist table
   - Send notification: "Added to waitlist"
   ↓
6. If seat available:
   - Insert into enrollments table
   - Update section.enrolled_count
   - Create enrollment_history record
   - Send notification: "Successfully enrolled"
   ↓
7. Frontend receives response and updates UI
```

## Scalability Considerations

### Database Optimization

1. **Indexes**: All foreign keys and frequently queried columns
2. **Connection Pooling**: Supabase provides built-in pooling
3. **Query Optimization**: Use SELECT specific columns, not SELECT *
4. **Pagination**: Implement offset/limit on large result sets

### Frontend Performance

1. **Code Splitting**: Route-based code splitting via React Router
2. **Lazy Loading**: Lazy load heavy components
3. **Memoization**: Use React.memo for expensive renders
4. **Debouncing**: Debounce search inputs and filters

### Caching Strategy

1. **Client-side**: Supabase client caches queries automatically
2. **Real-time Updates**: Subscribe to table changes for live data
3. **Stale-while-revalidate**: Show cached data while fetching fresh data

## Monitoring and Observability

### Logging Strategy

1. **Application Logs**: Console logs in development, structured logs in production
2. **Database Logs**: Supabase provides query logs
3. **Audit Logs**: All critical operations logged to `audit_logs` table

### Metrics to Monitor

1. **Performance**:
   - Page load time
   - Time to interactive
   - API response times
   - Database query performance

2. **Usage**:
   - Daily/monthly active users
   - Most used features
   - Peak usage hours

3. **Errors**:
   - Failed login attempts
   - API errors (4xx, 5xx)
   - Frontend exceptions
   - Database constraint violations

4. **Business Metrics**:
   - Enrollments per term
   - Average class size
   - Grade distributions
   - Fee collection rates

## Deployment Architecture

### Production Environment

```
┌─────────────────────────────────────────┐
│           CDN (Vercel/Cloudflare)       │
│  - Static assets (JS, CSS, images)     │
│  - Edge caching                          │
└─────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────┐
│       React App (Vercel/Netlify)        │
│  - Server-side rendering (optional)     │
│  - Environment variables                │
└─────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────┐
│          Supabase Platform              │
│  - PostgreSQL (managed)                 │
│  - Auth service                          │
│  - Edge Functions                        │
│  - Real-time subscriptions              │
│  - Storage                               │
└─────────────────────────────────────────┘
```

### Environment Configuration

**Development**:
- Local Supabase instance (optional)
- Hot module reloading
- Development database with test data

**Staging**:
- Separate Supabase project
- Production-like configuration
- Anonymous usage data

**Production**:
- Production Supabase project
- SSL/TLS enforced
- Database backups automated
- Monitoring enabled

## Testing Architecture

### Testing Pyramid

```
        ┌───────────────┐
        │  E2E Tests    │  (Few, critical user flows)
        │               │
        ├───────────────┤
        │               │
        │ Integration   │  (More, API + DB interactions)
        │    Tests      │
        ├───────────────┤
        │               │
        │               │
        │  Unit Tests   │  (Many, business logic)
        │               │
        │               │
        └───────────────┘
```

### Test Coverage Goals

- **Unit Tests**: >80% coverage of business logic
- **Integration Tests**: All critical API endpoints
- **E2E Tests**: Key user journeys (login, register, enroll, grade)

### Testing Tools

- **Unit**: Vitest + React Testing Library
- **Integration**: Supabase test client
- **E2E**: Playwright or Cypress

## Future Architecture Considerations

### Mobile Application

- React Native app sharing business logic
- Same Supabase backend
- Offline-first architecture with sync

### Microservices Evolution

If scale demands:
- Extract high-traffic features to dedicated services
- Message queue for async operations (enrollment, notifications)
- Separate read/write databases (CQRS pattern)

### Advanced Analytics

- Data warehouse (Snowflake, BigQuery)
- ETL pipelines from PostgreSQL
- Real-time analytics dashboards

### AI Integration

- Course recommendation engine
- Predictive analytics (at-risk students)
- Chatbot for student support
- Auto-grading for certain assessment types

## Conclusion

This architecture provides a solid foundation for a production-grade university ERP system. Key strengths:

1. **Security-first**: RLS ensures data protection at the database level
2. **Scalable**: Supabase provides managed infrastructure
3. **Developer-friendly**: TypeScript, modern tooling, clear patterns
4. **User-centric**: Role-based UX, responsive design, accessibility
5. **Maintainable**: Modular code, comprehensive documentation, audit trail

The system is designed to handle thousands of users with proper monitoring and optimization, and the architecture supports future enhancements without major rewrites.

---

**Document Version**: 1.0
**Last Updated**: 2025-11-16
**Author**: University ERP Development Team
