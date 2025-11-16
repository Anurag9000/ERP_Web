# University ERP - Quick Start Guide

Get up and running in 5 minutes.

## Prerequisites

- Node.js 18+ installed
- A Supabase account (free tier works)

## Setup Steps

### 1. Clone and Install

```bash
# Navigate to project directory
cd university-erp

# Install dependencies
npm install
```

### 2. Supabase Setup

1. Go to https://supabase.com
2. Create a new project
3. Wait for initialization (~2 minutes)
4. Database migrations are already applied
5. Get your credentials:
   - Go to Settings > API
   - Copy Project URL
   - Copy anon/public key

### 3. Environment Configuration

Create `.env` file in project root:

```bash
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGc...your-key-here
```

### 4. Create Admin User

Go to Supabase Dashboard > SQL Editor and run:

```sql
-- Create admin user in auth
-- This will return a user ID - copy it!
SELECT id FROM auth.users
WHERE email = 'admin@university.edu';

-- If no user exists, you need to create via Supabase Dashboard:
-- Authentication > Users > Add User
-- Email: admin@university.edu
-- Password: Admin123!
-- Check "Auto Confirm Email"

-- Then insert profile (replace USER_ID_HERE with actual ID)
INSERT INTO user_profiles (
  id, role, first_name, last_name, email, is_active
)
VALUES (
  'USER_ID_HERE',
  'ADMIN',
  'Admin',
  'User',
  'admin@university.edu',
  true
);
```

### 5. Run Development Server

```bash
npm run dev
```

Open http://localhost:5173

### 6. Login

- Email: `admin@university.edu`
- Password: (the one you set)

## What You'll See

After login, you'll have access to:

- **Dashboard**: Overview of system
- **Course Catalog**: Browse courses (sample data included)
- **Notifications**: Real-time notification center
- **Admin Panel**: User management, system settings (if admin)

## Sample Data

Sample data is already loaded:
- 5 departments (CS, Math, Physics, Chemistry, Biology)
- 6 courses (CS101, CS102, CS201, CS202, MATH101, MATH201)
- Multiple sections for Fall 2025
- Fee structures
- System settings

## Creating More Users

### Create Student

SQL Editor:
```sql
-- After creating user in Authentication panel
INSERT INTO user_profiles (
  id, role, first_name, last_name, email,
  student_id, is_active
)
VALUES (
  'USER_ID_FROM_AUTH',
  'STUDENT',
  'John',
  'Doe',
  'student@university.edu',
  'STU001',
  true
);
```

### Create Instructor

SQL Editor:
```sql
-- After creating user in Authentication panel
INSERT INTO user_profiles (
  id, role, first_name, last_name, email,
  employee_id, department_id, is_active
)
VALUES (
  'USER_ID_FROM_AUTH',
  'INSTRUCTOR',
  'Jane',
  'Smith',
  'instructor@university.edu',
  'FAC001',
  (SELECT id FROM departments WHERE code = 'CS'),
  true
);
```

## Common Tasks

### View Database

Supabase Dashboard > Database > Tables

### Run Queries

Supabase Dashboard > SQL Editor

### Check Logs

Supabase Dashboard > Logs

### View Auth Users

Supabase Dashboard > Authentication > Users

## Testing Features

### Test Course Catalog

1. Login as student
2. Navigate to "Course Catalog"
3. Try filters (department, level)
4. Toggle "Show open sections only"
5. Search for courses

### Test Notifications

1. Go to SQL Editor
2. Run:
```sql
INSERT INTO notifications (
  user_id, title, message, category, priority
)
VALUES (
  (SELECT id FROM user_profiles WHERE email = 'admin@university.edu'),
  'Welcome!',
  'Welcome to the University ERP system',
  'SYSTEM',
  'NORMAL'
);
```
3. Check notifications icon (bell in navbar)
4. Click to view notification

### Test Maintenance Mode

1. Login as admin
2. Go to SQL Editor
3. Run:
```sql
UPDATE system_settings
SET value = 'true'
WHERE key = 'maintenance_mode';
```
4. Refresh page - see maintenance banner
5. Set back to 'false' to disable

## Project Structure

```
src/
├── components/       # UI components
│   ├── common/      # Buttons, inputs, cards
│   └── layout/      # Navbar, sidebar
├── features/        # Feature modules
│   ├── auth/        # Login page
│   ├── student/     # Student portal
│   └── notifications/ # Notifications
├── contexts/        # React contexts
├── lib/            # Utils, theme, supabase
└── types/          # TypeScript types
```

## Next Steps

### For Developers

1. Read `ARCHITECTURE.md` for system design
2. Review `README.md` for full documentation
3. Check `IMPLEMENTATION_SUMMARY.md` for what's complete
4. Start implementing features (see TODO list below)

### Features to Implement

Priority order:

1. **Enrollment System**
   - Student registration flow
   - Prerequisite validation
   - Waitlist management

2. **Gradebook**
   - Create assessments
   - Enter grades
   - Calculate final grades

3. **Attendance**
   - Mark attendance
   - View reports

4. **Timetable**
   - Visual weekly schedule
   - ICS export

5. **Finance**
   - View fees
   - Record payments
   - Payment history

## Troubleshooting

### Build Errors

```bash
# Clear and reinstall
rm -rf node_modules package-lock.json
npm install
```

### TypeScript Errors

```bash
# Check types
npm run typecheck
```

### Supabase Connection Issues

- Verify `.env` file exists
- Check credentials are correct
- Ensure no quotes around values in `.env`

### Login Not Working

- Verify user exists in Authentication panel
- Check user_profiles table has matching entry
- Ensure email matches exactly

### RLS Errors

- Check user has correct role in user_profiles
- Review RLS policies in Database > Policies
- Verify auth.uid() matches user id

## Development Workflow

```bash
# Start dev server
npm run dev

# Type checking
npm run typecheck

# Linting
npm run lint

# Build for production
npm run build

# Preview production build
npm run preview
```

## Resources

- **Supabase Docs**: https://supabase.com/docs
- **React Docs**: https://react.dev
- **TailwindCSS**: https://tailwindcss.com/docs
- **TypeScript**: https://www.typescriptlang.org/docs

## Getting Help

1. Check `README.md` for detailed info
2. Review `ARCHITECTURE.md` for system design
3. Check `DEPLOYMENT.md` for production setup
4. Open an issue on GitHub

## Pro Tips

- Use React DevTools browser extension
- Install Supabase CLI for local development
- Keep Supabase Dashboard open in another tab
- Use VS Code with TypeScript extensions
- Enable auto-save in your editor

---

**You're all set!** Start building amazing features. 🚀
