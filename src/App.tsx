import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { MainLayout } from './components/layout/MainLayout';
import { LoginPage } from './features/auth/LoginPage';
import { StudentDashboardPage } from './features/student/DashboardPage';
import { CatalogPage } from './features/student/CatalogPage';
import { NotificationsPage } from './features/notifications/NotificationsPage';
import { InstructorDashboardPage } from './features/instructor/InstructorDashboardPage';
import { AdminDashboardPage } from './features/admin/AdminDashboardPage';
import { RegistrationPage } from './features/student/RegistrationPage';
import { GradesPage } from './features/student/GradesPage';
import { TranscriptPage } from './features/student/TranscriptPage';
import { TimetablePage } from './features/student/TimetablePage';
import { AnalyticsPage } from './features/student/AnalyticsPage';
import { FinancePage } from './features/student/FinancePage';
import { CalendarPage } from './features/student/CalendarPage';
import { GradebookPage } from './features/instructor/GradebookPage';
import { AttendancePage } from './features/instructor/AttendancePage';
import { MessagingPage } from './features/instructor/MessagingPage';
import { UserManagementPage } from './features/admin/UserManagementPage';
import { CourseManagementPage } from './features/admin/CourseManagementPage';
import { SectionManagementPage } from './features/admin/SectionManagementPage';
import { SectionPlannerPage } from './features/admin/SectionPlannerPage';
import { SystemSettingsPage } from './features/admin/SystemSettingsPage';
import { AccountSettingsPage } from './features/settings/AccountSettingsPage';
import { NotificationSettingsPage } from './features/settings/NotificationSettingsPage';
import { AuditLogPage } from './features/admin/AuditLogPage';
import { BulkImportPage } from './features/admin/BulkImportPage';
import { ReportsPage } from './features/admin/ReportsPage';
import { AssignmentsPage } from './features/student/AssignmentsPage';
import { ExaminationPage } from './features/student/ExaminationPage';
import { DegreeAuditPage } from './features/student/DegreeAuditPage';
import { FacultyPage } from './features/student/FacultyPage';
import { AnnouncementsPage } from './features/announcements/AnnouncementsPage';
import { AppointmentsPage } from './features/instructor/AppointmentsPage';
import { AdvisorDashboardPage } from './features/advisor/AdvisorDashboardPage';
import { StudentAnalyticsPage } from './features/analytics/StudentAnalyticsPage';
import { GoalsPage } from './features/student/GoalsPage';
import { GoogleClassroomIntegrationPage } from './features/integrations/GoogleClassroomIntegrationPage';
import { BroadcastAnnouncementPage } from './features/admin/BroadcastAnnouncementPage';
import { MaintenanceProvider } from './contexts/MaintenanceContext';

function ProtectedRoute({ children, allowedRoles }: { children: React.ReactNode, allowedRoles?: string[] }) {
  const { user, profile, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-600">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && profile && !allowedRoles.includes(profile.role)) {
    return <Navigate to="/dashboard" replace />;
  }

  if (profile?.must_change_password && location.pathname !== '/account') {
    return <Navigate to="/account" state={{ forced: true }} replace />;
  }

  return <MainLayout>{children}</MainLayout>;
}

function DashboardRouter() {
  const { profile } = useAuth();

  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-600">Loading dashboard...</div>
      </div>
    );
  }

  if (profile.role === 'INSTRUCTOR') {
    return <InstructorDashboardPage />;
  }

  if (profile.role === 'ADMIN' || profile.role === 'STAFF') {
    return <AdminDashboardPage />;
  }

  return <StudentDashboardPage />;
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ThemeProvider>
          <MaintenanceProvider>
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route
                path="/dashboard"
                element={
                  <ProtectedRoute>
                    <DashboardRouter />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/catalog"
                element={
                  <ProtectedRoute>
                    <CatalogPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/registration"
                element={
                  <ProtectedRoute>
                    <RegistrationPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/timetable"
                element={
                  <ProtectedRoute>
                    <TimetablePage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/grades"
                element={
                  <ProtectedRoute>
                    <GradesPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/transcript"
                element={
                  <ProtectedRoute>
                    <TranscriptPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/finance"
                element={
                  <ProtectedRoute>
                    <FinancePage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/gradebook"
                element={
                  <ProtectedRoute>
                    <GradebookPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/attendance"
                element={
                  <ProtectedRoute>
                    <AttendancePage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/messages"
                element={
                  <ProtectedRoute>
                    <MessagingPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/calendar"
                element={
                  <ProtectedRoute>
                    <CalendarPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/notifications"
                element={
                  <ProtectedRoute>
                    <NotificationsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/analytics"
                element={
                  <ProtectedRoute>
                    <AnalyticsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/account"
                element={
                  <ProtectedRoute>
                    <AccountSettingsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/users"
                element={
                  <ProtectedRoute>
                    <UserManagementPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/courses"
                element={
                  <ProtectedRoute>
                    <CourseManagementPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/enrollments"
                element={
                  <ProtectedRoute>
                    <SectionManagementPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/settings"
                element={
                  <ProtectedRoute>
                    <SystemSettingsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/audit"
                element={
                  <ProtectedRoute>
                    <AuditLogPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/section-planner"
                element={
                  <ProtectedRoute>
                    <SectionPlannerPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/import"
                element={
                  <ProtectedRoute>
                    <BulkImportPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/reports"
                element={
                  <ProtectedRoute>
                    <ReportsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/student/assignments"
                element={
                  <ProtectedRoute>
                    <AssignmentsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/student/examinations"
                element={
                  <ProtectedRoute>
                    <ExaminationPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/student/degree-audit"
                element={
                  <ProtectedRoute>
                    <DegreeAuditPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/student/faculty"
                element={
                  <ProtectedRoute>
                    <FacultyPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/announcements"
                element={
                  <ProtectedRoute>
                    <AnnouncementsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/instructor/appointments"
                element={
                  <ProtectedRoute>
                    <AppointmentsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/advisor/dashboard"
                element={
                  <ProtectedRoute>
                    <AdvisorDashboardPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/analytics/students"
                element={
                  <ProtectedRoute allowedRoles={['ADMIN', 'ADVISOR']}>
                    <StudentAnalyticsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/settings/notifications"
                element={
                  <ProtectedRoute>
                    <NotificationSettingsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/student/goals"
                element={
                  <ProtectedRoute>
                    <GoalsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/integrations/google-classroom"
                element={
                  <ProtectedRoute>
                    <GoogleClassroomIntegrationPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/broadcast"
                element={
                  <ProtectedRoute>
                    <BroadcastAnnouncementPage />
                  </ProtectedRoute>
                }
              />
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </MaintenanceProvider>
        </ThemeProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;

