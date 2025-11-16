import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
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
import { GradebookPage } from './features/instructor/GradebookPage';
import { UserManagementPage } from './features/admin/UserManagementPage';
import { CourseManagementPage } from './features/admin/CourseManagementPage';
import { SectionManagementPage } from './features/admin/SectionManagementPage';
import { SystemSettingsPage } from './features/admin/SystemSettingsPage';
import { AccountSettingsPage } from './features/settings/AccountSettingsPage';
import { MaintenanceProvider } from './contexts/MaintenanceContext';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

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
                <div className="text-center py-12">
                  <h1 className="text-2xl font-bold text-gray-900">Fees & Payments</h1>
                  <p className="text-gray-600 mt-2">Manage your fees and payments</p>
                </div>
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
            path="/calendar"
            element={
              <ProtectedRoute>
                <div className="text-center py-12">
                  <h1 className="text-2xl font-bold text-gray-900">Smart Calendar</h1>
                  <p className="text-gray-600 mt-2">View and manage your calendar</p>
                </div>
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
                <div className="text-center py-12">
                  <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
                  <p className="text-gray-600 mt-2">View your academic analytics</p>
                </div>
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
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
        </MaintenanceProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
