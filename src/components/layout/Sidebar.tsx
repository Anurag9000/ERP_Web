import { NavLink } from 'react-router-dom';
import {
  Home,
  BookOpen,
  Calendar,
  GraduationCap,
  DollarSign,
  Bell,
  FileText,
  BarChart3,
  Users,
  Settings,
  ClipboardList,
  UserCheck,
  BookMarked,
  MessageSquare,
  Map,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { cn } from '../../lib/utils';

interface NavItem {
  to: string;
  icon: React.ElementType;
  label: string;
  roles: string[];
}

const navItems: NavItem[] = [
  // Common
  { to: '/dashboard', icon: Home, label: 'Dashboard', roles: ['STUDENT', 'INSTRUCTOR', 'ADMIN', 'STAFF', 'ADVISOR'] },
  { to: '/calendar', icon: Calendar, label: 'Academic Calendar', roles: ['STUDENT', 'INSTRUCTOR', 'ADMIN', 'STAFF', 'ADVISOR'] },
  { to: '/announcements', icon: Bell, label: 'Announcements', roles: ['STUDENT', 'INSTRUCTOR', 'ADMIN', 'STAFF', 'ADVISOR'] },

  // Student
  { to: '/catalog', icon: BookOpen, label: 'Course Catalog', roles: ['STUDENT'] },
  { to: '/registration', icon: ClipboardList, label: 'My Registration', roles: ['STUDENT'] },
  { to: '/timetable', icon: Calendar, label: 'My Timetable', roles: ['STUDENT'] },
  { to: '/student/assignments', icon: ClipboardList, label: 'Assignments', roles: ['STUDENT'] },
  { to: '/grades', icon: GraduationCap, label: 'My Grades', roles: ['STUDENT'] },
  { to: '/transcript', icon: FileText, label: 'Transcript', roles: ['STUDENT'] },
  { to: '/finance', icon: DollarSign, label: 'Fees & Payments', roles: ['STUDENT'] },
  { to: '/student/goals', icon: BarChart3, label: 'Learning Goals', roles: ['STUDENT'] },
  { to: '/student/degree-audit', icon: GraduationCap, label: 'Degree Audit', roles: ['STUDENT'] },

  // Instructor
  { to: '/timetable', icon: Calendar, label: 'Teaching Schedule', roles: ['INSTRUCTOR'] },
  { to: '/gradebook', icon: GraduationCap, label: 'Gradebook', roles: ['INSTRUCTOR'] },
  { to: '/attendance', icon: UserCheck, label: 'Attendance', roles: ['INSTRUCTOR'] },
  { to: '/messages', icon: MessageSquare, label: 'Messaging Hub', roles: ['INSTRUCTOR'] },
  { to: '/instructor/appointments', icon: Calendar, label: 'Office Hours', roles: ['INSTRUCTOR'] },

  // Advisor
  { to: '/advisor/dashboard', icon: Home, label: 'Advisor Overview', roles: ['ADVISOR'] },
  { to: '/analytics/students', icon: BarChart3, label: 'Student Analytics', roles: ['ADVISOR', 'ADMIN'] },

  // Admin / Staff
  { to: '/admin/users', icon: Users, label: 'User Management', roles: ['ADMIN'] },
  { to: '/admin/courses', icon: BookOpen, label: 'Course Management', roles: ['ADMIN', 'STAFF'] },
  { to: '/admin/enrollments', icon: ClipboardList, label: 'Enrollment Management', roles: ['ADMIN', 'STAFF'] },
  { to: '/admin/section-planner', icon: Map, label: 'Section Planner', roles: ['ADMIN', 'STAFF'] },
  { to: '/admin/broadcast', icon: Bell, label: 'Broadcast System', roles: ['ADMIN'] },
  { to: '/admin/import', icon: ClipboardList, label: 'Bulk Import', roles: ['ADMIN'] },
  { to: '/admin/reports', icon: BarChart3, label: 'System Reports', roles: ['ADMIN', 'STAFF'] },
  { to: '/admin/audit', icon: ClipboardList, label: 'Audit Trail', roles: ['ADMIN'] },
  { to: '/admin/settings', icon: Settings, label: 'System Settings', roles: ['ADMIN'] },

  // Integrations
  { to: '/integrations/google-classroom', icon: BookMarked, label: 'Google Classroom', roles: ['INSTRUCTOR', 'ADMIN'] },
];

export function Sidebar() {
  const { profile } = useAuth();

  const filteredNavItems = navItems.filter((item) =>
    profile?.role ? item.roles.includes(profile.role) : false
  );

  return (
    <aside className="w-64 bg-white border-r border-gray-200 h-[calc(100vh-73px)] overflow-y-auto">
      <nav className="p-4 space-y-1">
        {filteredNavItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              cn(
                'flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors',
                isActive
                  ? 'bg-blue-50 text-blue-700 font-medium'
                  : 'text-gray-700 hover:bg-gray-50'
              )
            }
          >
            <item.icon className="w-5 h-5" />
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
