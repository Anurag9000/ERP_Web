# University ERP System - Deployment Guide

## Prerequisites

Before deploying, ensure you have:

- Node.js 18+ and npm installed
- A Supabase account and project
- Git installed
- Access to your deployment platform (Vercel, Netlify, or custom hosting)

## Quick Start Deployment

### 1. Supabase Setup

#### Create Supabase Project

1. Go to https://supabase.com and sign in
2. Click "New Project"
3. Fill in project details:
   - Name: `university-erp`
   - Database Password: Use a strong password (save it securely)
   - Region: Choose closest to your users
4. Wait for project initialization (2-3 minutes)

#### Apply Database Migrations

The migrations have already been applied automatically. You can verify by:

1. Go to your Supabase Dashboard
2. Click on "Database" > "Tables"
3. You should see 30+ tables including:
   - user_profiles
   - departments
   - courses
   - sections
   - enrollments
   - grades
   - notifications
   - etc.

#### Get Your Credentials

1. Go to Project Settings > API
2. Copy the following:
   - Project URL (e.g., `https://xxxxx.supabase.co`)
   - Anon/Public Key (starts with `eyJ...`)

### 2. Frontend Deployment

#### Option A: Deploy to Vercel (Recommended)

**Step 1: Install Vercel CLI**
```bash
npm install -g vercel
```

**Step 2: Configure Environment Variables**
Create `.env.production` file:
```bash
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

**Step 3: Build and Deploy**
```bash
# Login to Vercel
vercel login

# Deploy to production
vercel --prod
```

**Step 4: Set Environment Variables in Vercel Dashboard**
1. Go to your project on Vercel dashboard
2. Settings > Environment Variables
3. Add:
   - `VITE_SUPABASE_URL` = Your Supabase URL
   - `VITE_SUPABASE_ANON_KEY` = Your Supabase anon key
4. Redeploy: `vercel --prod`

#### Option B: Deploy to Netlify

**Step 1: Build the project**
```bash
npm run build
```

**Step 2: Install Netlify CLI**
```bash
npm install -g netlify-cli
```

**Step 3: Deploy**
```bash
# Login to Netlify
netlify login

# Initialize and deploy
netlify init

# When prompted:
# - Build command: npm run build
# - Publish directory: dist
```

**Step 4: Set Environment Variables**
```bash
netlify env:set VITE_SUPABASE_URL "your-supabase-url"
netlify env:set VITE_SUPABASE_ANON_KEY "your-anon-key"

# Rebuild
netlify build
```

#### Option C: Docker Deployment

**Create Dockerfile:**
```dockerfile
FROM node:18-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

**Create nginx.conf:**
```nginx
server {
    listen 80;
    server_name localhost;
    root /usr/share/nginx/html;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

**Build and run:**
```bash
docker build -t university-erp .
docker run -p 3000:80 university-erp
```

### 3. Create Initial Admin User

After deployment, create your first admin user:

**Option A: Via Supabase Dashboard**

1. Go to Supabase Dashboard > Authentication > Users
2. Click "Add User"
3. Enter:
   - Email: `admin@university.edu`
   - Password: (strong password)
   - Auto Confirm Email: Check this
4. Click "Create User"
5. Copy the user ID

**Option B: Via Supabase SQL Editor**

1. Go to SQL Editor in Supabase Dashboard
2. Run this query (replace the email):

```sql
-- Create auth user
INSERT INTO auth.users (
  id,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at
)
VALUES (
  gen_random_uuid(),
  'admin@university.edu',
  crypt('YourStrongPassword123!', gen_salt('bf')),
  now(),
  now(),
  now()
)
RETURNING id;

-- Note the returned ID, use it below
```

3. Create the user profile (replace `USER_ID_FROM_ABOVE`):

```sql
INSERT INTO user_profiles (
  id,
  role,
  first_name,
  last_name,
  email,
  is_active
)
VALUES (
  'USER_ID_FROM_ABOVE',
  'ADMIN',
  'Admin',
  'User',
  'admin@university.edu',
  true
);
```

### 4. Initial Configuration

After logging in as admin, configure the system:

1. **Create Departments**
   - Go to Admin > Course Management
   - Add your university's departments
   - Assign colors (use pastel colors)

2. **Create Terms**
   - Go to Admin > System Settings > Terms
   - Add current and upcoming terms
   - Set registration periods

3. **Add Rooms**
   - Go to Admin > System Settings > Rooms
   - Add classrooms, labs, and lecture halls

4. **Create Faculty Accounts**
   - Go to Admin > User Management
   - Add instructor accounts
   - Assign to departments

5. **Add Courses**
   - Go to Admin > Course Management
   - Create courses
   - Set prerequisites, co-requisites

6. **Create Sections**
   - For each course, create sections
   - Assign instructors and rooms
   - Set schedules

7. **Add Students**
   - Go to Admin > User Management
   - Bulk import or manually add students

8. **Configure System Settings**
   - Go to Admin > System Settings
   - Review and adjust:
     - Session timeout
     - Max credits per term
     - Password policies
     - Fee structures

## Testing the Deployment

### Smoke Test Checklist

- [ ] Login page loads correctly
- [ ] Admin can log in
- [ ] Dashboard displays correctly
- [ ] Navigation works (all links)
- [ ] Course catalog displays
- [ ] Notifications system works
- [ ] Maintenance mode toggle works
- [ ] Can create a test student
- [ ] Student can log in
- [ ] Student sees proper role-based UI
- [ ] Database queries work (no errors)
- [ ] Real-time notifications work

### Performance Testing

Run Lighthouse audit:
```bash
npm install -g lighthouse
lighthouse https://your-deployed-url --view
```

Target scores:
- Performance: >90
- Accessibility: >95
- Best Practices: >95
- SEO: >90

## Security Checklist

- [ ] Environment variables are set (not hardcoded)
- [ ] Supabase RLS policies are enabled on all tables
- [ ] Admin account has a strong password
- [ ] HTTPS is enabled (handled by Vercel/Netlify)
- [ ] CORS is properly configured
- [ ] Rate limiting is considered (Supabase provides this)
- [ ] Error messages don't expose sensitive info
- [ ] Audit logging is working

## Monitoring and Maintenance

### Set Up Monitoring

**Supabase Monitoring:**
1. Go to Supabase Dashboard > Reports
2. Monitor:
   - Database queries
   - API requests
   - Auth events
   - Storage usage

**Application Monitoring:**
- Set up error tracking (e.g., Sentry)
- Configure uptime monitoring (e.g., UptimeRobot)
- Set up log aggregation

**Alerts:**
- Database CPU/Memory usage
- API error rates
- Failed login attempts spike
- Storage approaching limits

### Backup Strategy

**Database Backups:**
- Supabase automatically backs up daily
- Enable Point-in-Time Recovery (PITR) for production

**Manual Backup:**
```bash
# Via Supabase CLI
supabase db dump -f backup.sql

# Restore
supabase db reset --db-url "postgresql://..."
```

**Code Backups:**
- Use Git for version control
- Push to GitHub/GitLab regularly
- Tag releases: `git tag v1.0.0`

### Maintenance Windows

**Schedule Maintenance:**
1. Log in as admin
2. Go to Admin > System Settings > Maintenance
3. Click "Schedule Maintenance"
4. Set start/end times
5. Add description
6. Activate when ready

**During Maintenance:**
- All write operations blocked for non-admins
- Users see maintenance banner
- Admins can still make changes

## Scaling Considerations

### When to Scale

Monitor these metrics:
- Database connections approaching limit
- API response time >500ms
- CPU usage >70%
- Memory usage >80%

### Scaling Options

**Database Scaling (Supabase):**
1. Go to Supabase Dashboard > Settings > Database
2. Upgrade to larger instance
3. Consider read replicas for heavy read workloads

**Frontend Scaling:**
- CDN caching (automatic with Vercel/Netlify)
- Code splitting (already implemented)
- Image optimization

**Edge Functions (if used):**
- Supabase Edge Functions scale automatically
- Monitor execution time and memory

## Troubleshooting

### Common Issues

**Issue: "Failed to fetch" errors**
- Check Supabase URL in environment variables
- Verify anon key is correct
- Check network tab for CORS errors

**Issue: RLS Policy blocks legitimate access**
- Review policy in Supabase Dashboard > Database > Policies
- Check that user role is set correctly in user_profiles
- Verify auth.uid() matches expected user

**Issue: Build fails**
- Clear node_modules: `rm -rf node_modules && npm install`
- Check for TypeScript errors: `npm run typecheck`
- Verify all imports are correct

**Issue: Slow database queries**
- Check missing indexes: Supabase Dashboard > Database > Query Performance
- Add indexes on frequently queried columns
- Use SELECT with specific columns, not SELECT *

**Issue: Session expires too quickly**
- Check `session_timeout_minutes` in system_settings table
- Adjust Supabase Auth settings in Dashboard

## Production Best Practices

### Security
- Rotate Supabase keys periodically
- Use strong passwords for all admin accounts
- Enable 2FA for admin users (via Supabase Auth)
- Regularly review audit logs
- Keep dependencies updated: `npm audit fix`

### Performance
- Enable Supabase Connection Pooling
- Use database indexes on foreign keys
- Implement pagination on large tables
- Cache static assets with long TTL

### Reliability
- Set up health check endpoint
- Implement graceful error handling
- Use database transactions for critical operations
- Regular backup testing (restore to staging)

### User Experience
- Monitor real user metrics
- Collect feedback from users
- A/B test new features
- Maintain comprehensive documentation

## Rollback Procedure

If deployment fails:

1. **Frontend Rollback:**
   ```bash
   # Vercel
   vercel rollback

   # Netlify
   netlify rollback
   ```

2. **Database Rollback:**
   - Supabase provides Point-in-Time Recovery
   - Go to Dashboard > Database > Backups
   - Select recovery point
   - Restore

3. **Code Rollback:**
   ```bash
   git revert HEAD
   git push
   # Redeploy
   ```

## Support and Resources

- **Documentation**: See README.md and ARCHITECTURE.md
- **Supabase Docs**: https://supabase.com/docs
- **React Docs**: https://react.dev
- **TypeScript Docs**: https://www.typescriptlang.org/docs

## Post-Deployment Checklist

- [ ] All smoke tests pass
- [ ] Performance meets targets
- [ ] Security checklist complete
- [ ] Monitoring set up
- [ ] Backups configured
- [ ] Admin users created
- [ ] Initial data loaded
- [ ] Documentation updated
- [ ] Team trained on admin panel
- [ ] Support process defined

## Continuous Deployment

Set up CI/CD for automatic deployments:

**GitHub Actions Example:**

Create `.github/workflows/deploy.yml`:
```yaml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 18
      - run: npm ci
      - run: npm run typecheck
      - run: npm run build
      - name: Deploy to Vercel
        uses: amondnet/vercel-action@v20
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.ORG_ID }}
          vercel-project-id: ${{ secrets.PROJECT_ID }}
          vercel-args: '--prod'
```

---

**Congratulations!** Your University ERP system is now deployed and ready for production use.

For questions or issues, refer to the documentation or contact the development team.
