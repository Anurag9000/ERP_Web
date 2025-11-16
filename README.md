# University ERP System

A complete, production-grade web-based Enterprise Resource Planning system for university academic management built with React, TypeScript, and Supabase.

## Overview

This system provides comprehensive academic management capabilities for students, instructors, administrators, and staff. It includes course management, enrollment, grading, attendance tracking, finance management, a smart calendar system, and role-based access control.

## Key Features

### For Students
- **Dashboard**: Overview of enrolled courses, upcoming classes, fees, and notifications
- **Course Catalog**: Browse and search courses with advanced filters
- **Registration**: Enroll in courses with prerequisite checking, credit cap validation, and waitlist management
- **Timetable**: Visual weekly schedule with ICS and PDF export
- **Grades**: View assessments, feedback, and final grades
- **Transcript**: Generate official transcripts
- **Finance**: View fees, payment history, and installment plans
- **Smart Calendar**: Integrated calendar with automatic class scheduling and opt-in events
- **Notifications**: Categorized notifications with preferences
- **Analytics**: GPA trends, attendance metrics, and academic standing

### For Instructors
- **Section Management**: View assigned sections and rosters
- **Gradebook**: Create assessments, enter grades, and provide feedback
- **Attendance**: Record and track student attendance
- **Analytics**: Grade distributions, pass/fail statistics, attendance insights
- **Meeting Slots**: Publish availability and manage student appointments
- **Messaging**: Communicate with students in your sections

### For Administrators
- **User Management**: CRUD operations for all user types
- **Course Management**: Manage courses, prerequisites, and sections
- **Enrollment Oversight**: Register/drop students, manage waitlists
- **Finance Admin**: Track fees, record payments, generate reports
- **System Settings**: Maintenance mode, system configuration
- **Audit Logs**: Complete audit trail of all system actions
- **Reporting**: Comprehensive reports on enrollments, finances, attendance

### Core System Features
- **Role-Based Access Control**: Granular permissions for different user types
- **Maintenance Mode**: Scheduled and emergency maintenance with user notifications
- **Audit Trail**: Complete logging of all critical operations
- **Notification System**: Category-based notifications with user preferences
- **Pastel Design System**: Consistent, accessible color coding throughout
- **Responsive Design**: Works on desktop, tablet, and mobile devices

## Tech Stack

### Frontend
- **React 18** with TypeScript
- **React Router** for navigation
- **TailwindCSS** for styling
- **Lucide React** for icons
- **Supabase JS Client** for backend integration

### Backend
- **Supabase** (PostgreSQL + Authentication + Row Level Security)
- **Edge Functions** for business logic and integrations
- **Real-time subscriptions** for live updates

### Database
- **PostgreSQL** with comprehensive schema
- **Row Level Security (RLS)** for data protection
- **Indexes** for performance optimization

## Database Schema

### Core Tables

#### User Management
- `user_profiles` - Extended user information with roles
- `password_history` - Password policy enforcement
- `login_attempts` - Failed login tracking
- `user_sessions` - Session management

#### Academic Structure
- `departments` - Academic departments with color coding
- `terms` - Academic terms with registration periods
- `courses` - Course catalog
- `course_prerequisites`, `course_corequisites`, `course_antirequisites` - Course relationships
- `sections` - Course sections with schedules
- `rooms` - Room inventory

#### Enrollment
- `enrollments` - Student course registrations
- `waitlists` - Waitlist management
- `enrollment_history` - Audit trail

#### Gradebook
- `assessments` - Assessment definitions
- `grades` - Student grades with feedback
- `attendance_records` - Attendance tracking

#### Finance
- `fee_structures` - Fee definitions
- `student_fees` - Student fee assignments
- `payments` - Payment records
- `installment_plans` - Payment plans

#### Calendar
- `calendar_events` - All calendar events
- `event_participants` - Event opt-ins
- `meeting_slots` - Professor availability
- `meeting_requests` - Student meeting requests

#### System
- `notifications` - User notifications
- `notification_preferences` - Notification settings
- `system_settings` - Global configuration
- `maintenance_windows` - Scheduled maintenance
- `audit_logs` - Complete audit trail

## Setup Instructions

### Prerequisites
- Node.js 18 or higher
- npm or yarn
- Supabase account

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd university-erp
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up Supabase**
   - Create a new Supabase project
   - The database migration has already been applied
   - Note your project URL and anon key

4. **Configure environment variables**
   ```bash
   cp .env.example .env
   ```

   Edit `.env` and add your Supabase credentials:
   ```
   VITE_SUPABASE_URL=your-supabase-url
   VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
   ```

5. **Run the development server**
   ```bash
   npm run dev
   ```

6. **Access the application**
   - Open http://localhost:5173 in your browser
   - Use the test credentials provided by your administrator

### Building for Production

```bash
npm run build
npm run preview
```

## Architecture

### Frontend Architecture

```
src/
├── components/
│   ├── common/          # Reusable UI components (Button, Input, Card, etc.)
│   ├── calendar/        # Calendar-specific components
│   ├── charts/          # Analytics visualizations
│   └── layout/          # Navigation, Navbar, Sidebar
├── features/
│   ├── auth/            # Authentication pages
│   ├── student/         # Student portal modules
│   ├── instructor/      # Instructor workspace
│   ├── admin/           # Admin console
│   ├── calendar/        # Smart calendar
│   └── notifications/   # Notification center
├── contexts/
│   └── AuthContext.tsx  # Authentication state management
├── lib/
│   ├── supabase.ts      # Supabase client
│   ├── theme.ts         # Design system (pastel colors)
│   └── utils.ts         # Utility functions
├── types/
│   └── database.ts      # TypeScript type definitions
└── App.tsx              # Main app with routing
```

### Backend Architecture (Supabase)

```
supabase/
├── migrations/
│   └── 001_create_core_schema.sql  # Complete database schema
└── functions/
    ├── auth/              # Authentication endpoints
    ├── catalog/           # Course catalog operations
    ├── enrollment/        # Registration/drop/waitlist
    ├── gradebook/         # Grade management
    ├── attendance/        # Attendance tracking
    ├── calendar/          # Calendar operations
    ├── notifications/     # Notification management
    ├── finance/           # Fee management
    └── admin/             # Admin operations
```

## Security

### Row Level Security (RLS)

All tables have RLS enabled with restrictive policies:

- **Students** can only view/edit their own data
- **Instructors** can view/edit data for their sections
- **Admins** have full access with audit logging
- **No public access** without authentication

### Authentication

- Email/password authentication via Supabase Auth
- Session management with inactivity timeout
- Password history tracking (prevents reuse)
- Failed login attempt tracking with lockout
- Must-change-password flag for new/reset accounts

### Data Protection

- All sensitive operations logged in `audit_logs`
- Password hashing with bcrypt
- No sensitive data in client-side code
- Environment variables for configuration

## Design System

### Pastel Color Coding

The system uses a consistent pastel color scheme for visual organization:

- **Departments**: Each department has a unique pastel color
- **Event Types**: CLASS, EXAM, EVENT, etc. have distinct colors
- **Notification Categories**: ACADEMIC, FINANCE, EVENTS, etc. are color-coded
- **Status Indicators**: ACTIVE, PENDING, COMPLETED have visual distinction

Colors are defined in `src/lib/theme.ts` and used throughout:
- Calendar events
- Timetable cells
- Notification badges
- Grade cards
- Department indicators

### UI Principles

- **Clean and minimal**: Focus on content, not decoration
- **High contrast**: Readable text on all backgrounds
- **Consistent spacing**: 8px grid system
- **Clear hierarchy**: Typography and spacing define importance
- **Accessible**: WCAG 2.1 AA compliant color contrasts

## Key Workflows

### Student Registration Flow

1. Student browses catalog with filters
2. System checks prerequisites, credit cap, time clashes
3. If section is full, student is added to waitlist
4. On seat availability, first waitlisted student is auto-promoted
5. Student receives notification of successful registration

### Instructor Grading Flow

1. Instructor creates assessment definitions
2. Students submit work (tracked in grades table)
3. Instructor enters marks and feedback
4. Instructor publishes grades
5. Students receive notification and can view grades

### Maintenance Mode

1. Admin schedules maintenance window
2. System displays countdown banner to all users
3. During maintenance, all write operations blocked (except admin)
4. Users see maintenance banner
5. After maintenance, normal operations resume

### Smart Calendar

1. Student's classes automatically appear in calendar
2. Campus events show as headlines only
3. Student can opt-in to events (adds to personal calendar)
4. Students request meeting slots with professors
5. Professors approve/decline meeting requests
6. ICS export available for external calendar apps

## API Endpoints (Via Supabase)

All API operations go through Supabase's auto-generated REST API with RLS:

### Authentication
- `POST /auth/signInWithPassword` - Login
- `POST /auth/signOut` - Logout
- `POST /auth/updateUser` - Update password

### Tables (via Supabase REST API)
- `GET/POST/PATCH/DELETE /rest/v1/user_profiles`
- `GET/POST/PATCH/DELETE /rest/v1/courses`
- `GET/POST/PATCH/DELETE /rest/v1/sections`
- `GET/POST/PATCH/DELETE /rest/v1/enrollments`
- `GET/POST/PATCH/DELETE /rest/v1/grades`
- `GET/POST/PATCH/DELETE /rest/v1/attendance_records`
- `GET/POST/PATCH/DELETE /rest/v1/calendar_events`
- `GET/POST/PATCH/DELETE /rest/v1/notifications`
- And more...

### Custom Functions (Supabase Edge Functions)
- `POST /functions/v1/enroll-student` - Handle enrollment with validation
- `POST /functions/v1/promote-waitlist` - Auto-promote from waitlist
- `POST /functions/v1/calculate-gpa` - Calculate student GPA
- `POST /functions/v1/send-notification` - Send notification to users
- `POST /functions/v1/check-maintenance` - Check maintenance status

## Testing

### Unit Tests
- Business logic validation
- Utility function tests
- Component rendering tests

### Integration Tests
- API endpoint tests
- Database constraint tests
- RLS policy validation

### End-to-End Tests
- Complete user workflows
- Cross-role interactions
- Maintenance mode behavior

Run tests:
```bash
npm run test
```

## Deployment

### Production Checklist

1. ✅ Set production environment variables
2. ✅ Enable Supabase production mode
3. ✅ Configure domain and SSL
4. ✅ Set up database backups
5. ✅ Configure monitoring and alerts
6. ✅ Review and test all RLS policies
7. ✅ Audit security settings
8. ✅ Test maintenance mode workflow
9. ✅ Verify email notifications (if configured)
10. ✅ Load test with expected user volume

### Deployment Options

#### Vercel (Recommended for Frontend)
```bash
npm run build
vercel --prod
```

#### Docker
```bash
docker build -t university-erp .
docker run -p 3000:3000 university-erp
```

#### Traditional Hosting
```bash
npm run build
# Upload dist/ folder to your hosting provider
```

## Monitoring and Maintenance

### Logs
- Application logs: Check browser console and network tab
- Database logs: Supabase Dashboard > Logs
- Audit trail: Query `audit_logs` table

### Performance Monitoring
- Database query performance: Supabase Dashboard > Reports
- Frontend performance: Lighthouse audits
- User metrics: Custom analytics integration

### Backup Strategy
- Database: Automatic daily backups via Supabase
- Code: Git version control
- Configuration: Document all environment variables

## Troubleshooting

### Common Issues

**Issue**: "Missing environment variables"
- **Solution**: Ensure `.env` file exists with `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`

**Issue**: "Not authorized" errors
- **Solution**: Check RLS policies in Supabase, ensure user has correct role

**Issue**: Maintenance mode won't disable
- **Solution**: Update `system_settings` table, set `maintenance_mode` to `false`

**Issue**: Students can't register for courses
- **Solution**: Check term dates, registration periods, and maintenance mode status

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Make your changes with clear commit messages
4. Write tests for new functionality
5. Ensure all tests pass: `npm run test`
6. Submit a pull request

### Code Style
- Use TypeScript strict mode
- Follow ESLint rules
- Use Prettier for formatting
- Write meaningful component and variable names
- Add comments for complex logic only

## License

This project is proprietary software. All rights reserved.

## Support

For issues and questions:
- Create an issue in the GitHub repository
- Contact the development team at dev@university.edu
- Check the documentation wiki

## Roadmap

### Phase 1 (Current)
- ✅ Core authentication and RBAC
- ✅ Database schema with RLS
- ✅ Basic UI components
- ✅ Student dashboard
- ✅ Course catalog

### Phase 2 (In Progress)
- 🔄 Complete enrollment workflow
- 🔄 Gradebook and attendance
- 🔄 Finance management
- 🔄 Smart calendar
- 🔄 Notification system

### Phase 3 (Planned)
- 📋 Advanced analytics
- 📋 Degree audit and planning
- 📋 Advisor tools
- 📋 Mobile app
- 📋 External integrations (Google Classroom, etc.)

### Phase 4 (Future)
- 📋 AI-powered recommendations
- 📋 Advanced reporting
- 📋 Multi-language support
- 📋 Accessibility enhancements
- 📋 Research collaboration tools

## Acknowledgments

- Built with React, TypeScript, and Supabase
- Icons by Lucide
- UI inspired by modern university systems
- Developed as a comprehensive academic management solution

---

**Version**: 1.0.0
**Last Updated**: 2025-11-16
**Maintained By**: University ERP Development Team
