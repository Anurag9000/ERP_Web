# Feature Implementation Guide

This guide provides code patterns and examples for implementing the remaining features in the University ERP system.

## Table of Contents

1. [Enrollment Workflow](#enrollment-workflow)
2. [Gradebook Implementation](#gradebook-implementation)
3. [Attendance Tracking](#attendance-tracking)
4. [Finance Management](#finance-management)
5. [Smart Calendar](#smart-calendar)
6. [Admin Features](#admin-features)
7. [Edge Functions](#edge-functions)

---

## Enrollment Workflow

### Frontend: Registration Page

**Pattern to follow:**

```typescript
// src/features/student/RegistrationPage.tsx

import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

export function RegistrationPage() {
  const { user } = useAuth();
  const [enrollments, setEnrollments] = useState([]);
  const [registrationStatus, setRegistrationStatus] = useState('OPEN');

  // Load current enrollments
  useEffect(() => {
    loadEnrollments();
  }, [user]);

  async function loadEnrollments() {
    const { data } = await supabase
      .from('enrollments')
      .select(`
        *,
        sections(
          *,
          courses(code, name, credits),
          rooms(code, name)
        )
      `)
      .eq('student_id', user!.id)
      .eq('status', 'ACTIVE');

    setEnrollments(data || []);
  }

  async function handleEnroll(sectionId: string) {
    // Call Edge Function for validation
    const { data, error } = await supabase.functions.invoke(
      'enroll-student',
      {
        body: { sectionId, studentId: user!.id }
      }
    );

    if (error) {
      alert(error.message);
      return;
    }

    if (data.success) {
      loadEnrollments();
      alert('Successfully enrolled!');
    } else {
      alert(data.message);
    }
  }

  async function handleDrop(enrollmentId: string) {
    const confirm = window.confirm(
      'Are you sure you want to drop this course?'
    );

    if (!confirm) return;

    const { error } = await supabase
      .from('enrollments')
      .update({ status: 'DROPPED', dropped_at: new Date().toISOString() })
      .eq('id', enrollmentId);

    if (error) {
      alert('Error dropping course');
    } else {
      loadEnrollments();
    }
  }

  return (
    <div className="space-y-6">
      <h1>My Registration</h1>
      {/* Render enrollments and drop buttons */}
    </div>
  );
}
```

### Backend: Enrollment Validation Edge Function

**Create:** `supabase/functions/enroll-student/index.ts`

```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const { sectionId, studentId } = await req.json();

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // 1. Check prerequisites
    const { data: section } = await supabase
      .from('sections')
      .select('*, courses(*)')
      .eq('id', sectionId)
      .single();

    const { data: prerequisites } = await supabase
      .from('course_prerequisites')
      .select('prerequisite_id')
      .eq('course_id', section.course_id);

    if (prerequisites && prerequisites.length > 0) {
      // Check if student has completed prerequisites
      const prerequisiteIds = prerequisites.map(p => p.prerequisite_id);

      const { data: completed } = await supabase
        .from('enrollments')
        .select('course_id')
        .eq('student_id', studentId)
        .eq('status', 'COMPLETED')
        .in('course_id', prerequisiteIds);

      if (!completed || completed.length < prerequisites.length) {
        return new Response(
          JSON.stringify({
            success: false,
            message: 'Prerequisites not met'
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // 2. Check credit cap
    const { data: currentEnrollments } = await supabase
      .from('enrollments')
      .select('sections(courses(credits))')
      .eq('student_id', studentId)
      .eq('status', 'ACTIVE');

    const totalCredits = currentEnrollments.reduce(
      (sum, e) => sum + (e.sections.courses.credits || 0),
      0
    );

    const { data: settings } = await supabase
      .from('system_settings')
      .select('value')
      .eq('key', 'max_credits_per_term')
      .single();

    const maxCredits = parseInt(settings?.value || '18');

    if (totalCredits + section.courses.credits > maxCredits) {
      return new Response(
        JSON.stringify({
          success: false,
          message: `Credit limit exceeded. You can only register for ${maxCredits} credits.`
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 3. Check time clashes
    const { data: studentSchedule } = await supabase
      .from('enrollments')
      .select('sections(schedule_days, start_time, end_time)')
      .eq('student_id', studentId)
      .eq('status', 'ACTIVE');

    for (const enrollment of studentSchedule) {
      const existingSection = enrollment.sections;

      // Check for overlapping days
      const hasOverlap = section.schedule_days.some(day =>
        existingSection.schedule_days.includes(day)
      );

      if (hasOverlap) {
        // Check time overlap
        const newStart = section.start_time;
        const newEnd = section.end_time;
        const existingStart = existingSection.start_time;
        const existingEnd = existingSection.end_time;

        if (
          (newStart >= existingStart && newStart < existingEnd) ||
          (newEnd > existingStart && newEnd <= existingEnd) ||
          (newStart <= existingStart && newEnd >= existingEnd)
        ) {
          return new Response(
            JSON.stringify({
              success: false,
              message: 'Schedule conflict detected'
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      }
    }

    // 4. Check section capacity
    if (section.enrolled_count >= section.capacity) {
      // Add to waitlist
      const { error: waitlistError } = await supabase
        .from('waitlists')
        .insert({
          student_id: studentId,
          section_id: sectionId,
          term_id: section.term_id,
          position: section.waitlist_count + 1
        });

      if (waitlistError) throw waitlistError;

      // Update waitlist count
      await supabase
        .from('sections')
        .update({ waitlist_count: section.waitlist_count + 1 })
        .eq('id', sectionId);

      return new Response(
        JSON.stringify({
          success: false,
          message: 'Section full. Added to waitlist.',
          waitlisted: true
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 5. Enroll student
    const { error: enrollError } = await supabase
      .from('enrollments')
      .insert({
        student_id: studentId,
        section_id: sectionId,
        term_id: section.term_id,
        status: 'ACTIVE'
      });

    if (enrollError) throw enrollError;

    // 6. Update enrolled count
    await supabase
      .from('sections')
      .update({ enrolled_count: section.enrolled_count + 1 })
      .eq('id', sectionId);

    // 7. Create notification
    await supabase
      .from('notifications')
      .insert({
        user_id: studentId,
        title: 'Enrollment Successful',
        message: `You have been enrolled in ${section.courses.code}`,
        category: 'ENROLLMENT',
        priority: 'NORMAL'
      });

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    return new Response(
      JSON.stringify({ success: false, message: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
```

---

## Gradebook Implementation

### Frontend: Instructor Gradebook

```typescript
// src/features/instructor/GradebookPage.tsx

export function GradebookPage() {
  const [selectedSection, setSelectedSection] = useState(null);
  const [assessments, setAssessments] = useState([]);
  const [grades, setGrades] = useState([]);
  const [students, setStudents] = useState([]);

  async function loadGradebook() {
    // Load section data
    const { data: sectionData } = await supabase
      .from('sections')
      .select('*, courses(code, name)')
      .eq('id', selectedSection)
      .single();

    // Load assessments
    const { data: assessmentData } = await supabase
      .from('assessments')
      .select('*')
      .eq('section_id', selectedSection)
      .order('due_date');

    setAssessments(assessmentData);

    // Load enrolled students
    const { data: enrollmentData } = await supabase
      .from('enrollments')
      .select('*, user_profiles(first_name, last_name, student_id)')
      .eq('section_id', selectedSection)
      .eq('status', 'ACTIVE');

    setStudents(enrollmentData);

    // Load all grades for this section
    const assessmentIds = assessmentData.map(a => a.id);
    const { data: gradeData } = await supabase
      .from('grades')
      .select('*')
      .in('assessment_id', assessmentIds);

    setGrades(gradeData);
  }

  async function createAssessment(assessment) {
    const { error } = await supabase
      .from('assessments')
      .insert({
        section_id: selectedSection,
        ...assessment
      });

    if (!error) {
      loadGradebook();
    }
  }

  async function updateGrade(studentId, assessmentId, marks) {
    const { error } = await supabase
      .from('grades')
      .upsert({
        student_id: studentId,
        assessment_id: assessmentId,
        marks_obtained: marks,
        status: 'GRADED',
        graded_at: new Date().toISOString()
      });

    if (!error) {
      loadGradebook();
    }
  }

  // Render gradebook table with students (rows) and assessments (columns)
  return (
    <div>
      {/* Section selector */}
      {/* Assessment creation form */}
      {/* Gradebook grid */}
    </div>
  );
}
```

---

## Attendance Tracking

### Frontend: Attendance Marking

```typescript
// src/features/instructor/AttendancePage.tsx

export function AttendancePage() {
  const [selectedSection, setSelectedSection] = useState(null);
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [attendance, setAttendance] = useState({});

  async function loadAttendance() {
    const { data: enrollments } = await supabase
      .from('enrollments')
      .select('*, user_profiles(first_name, last_name, student_id)')
      .eq('section_id', selectedSection)
      .eq('status', 'ACTIVE');

    const { data: records } = await supabase
      .from('attendance_records')
      .select('*')
      .eq('section_id', selectedSection)
      .eq('attendance_date', selectedDate);

    // Build attendance map
    const attendanceMap = {};
    enrollments.forEach(e => {
      const record = records?.find(r => r.student_id === e.student_id);
      attendanceMap[e.student_id] = record?.status || 'ABSENT';
    });

    setAttendance(attendanceMap);
  }

  async function markAttendance(studentId, status) {
    await supabase
      .from('attendance_records')
      .upsert({
        section_id: selectedSection,
        student_id: studentId,
        attendance_date: selectedDate,
        status: status
      });

    loadAttendance();
  }

  return (
    <div>
      {/* Section and date selectors */}
      {/* Student list with attendance buttons */}
    </div>
  );
}
```

---

## Finance Management

### Frontend: Student Finance View

```typescript
// src/features/student/FinancePage.tsx

export function FinancePage() {
  const { user } = useAuth();
  const [fees, setFees] = useState([]);
  const [payments, setPayments] = useState([]);

  async function loadFinanceData() {
    const { data: feeData } = await supabase
      .from('student_fees')
      .select('*, fee_structures(name, fee_type), terms(name)')
      .eq('student_id', user!.id)
      .order('created_at', { ascending: false });

    const { data: paymentData } = await supabase
      .from('payments')
      .select('*')
      .eq('student_id', user!.id)
      .order('payment_date', { ascending: false });

    setFees(feeData);
    setPayments(paymentData);
  }

  const totalOwed = fees.reduce(
    (sum, fee) => sum + (fee.amount - fee.amount_paid),
    0
  );

  return (
    <div className="space-y-6">
      <Card title="Fee Summary">
        <div className="text-3xl font-bold">
          ${totalOwed.toFixed(2)}
        </div>
        <p className="text-gray-600">Total Outstanding</p>
      </Card>

      <Card title="Fees">
        {fees.map(fee => (
          <div key={fee.id} className="flex justify-between py-2">
            <div>
              <p className="font-medium">{fee.fee_structures.name}</p>
              <p className="text-sm text-gray-600">{fee.terms.name}</p>
            </div>
            <div className="text-right">
              <p className="font-medium">${fee.amount.toFixed(2)}</p>
              <p className="text-sm text-gray-600">
                Paid: ${fee.amount_paid.toFixed(2)}
              </p>
            </div>
          </div>
        ))}
      </Card>

      <Card title="Payment History">
        {payments.map(payment => (
          <div key={payment.id} className="py-2">
            <div className="flex justify-between">
              <span>{formatDate(payment.payment_date)}</span>
              <span className="font-medium">
                ${payment.amount.toFixed(2)}
              </span>
            </div>
          </div>
        ))}
      </Card>
    </div>
  );
}
```

---

## Smart Calendar

### Frontend: Calendar View

```typescript
// src/features/calendar/CalendarPage.tsx

export function CalendarPage() {
  const { user } = useAuth();
  const [events, setEvents] = useState([]);
  const [view, setView] = useState<'week' | 'month'>('week');

  async function loadEvents() {
    // Load class schedule (automatic)
    const { data: enrollments } = await supabase
      .from('enrollments')
      .select('*, sections(*, courses(code, name))')
      .eq('student_id', user!.id)
      .eq('status', 'ACTIVE');

    const classEvents = enrollments.flatMap(enrollment =>
      enrollment.sections.schedule_days.map(day => ({
        id: `class-${enrollment.id}-${day}`,
        title: enrollment.sections.courses.code,
        type: 'CLASS',
        day: day,
        start_time: enrollment.sections.start_time,
        end_time: enrollment.sections.end_time,
        color: getEventColor('CLASS')
      }))
    );

    // Load opted-in events
    const { data: userEvents } = await supabase
      .from('event_participants')
      .select('*, calendar_events(*)')
      .eq('user_id', user!.id)
      .eq('status', 'OPTED_IN');

    const optedEvents = userEvents.map(ep => ep.calendar_events);

    setEvents([...classEvents, ...optedEvents]);
  }

  async function handleOptIn(eventId: string) {
    await supabase
      .from('event_participants')
      .insert({
        event_id: eventId,
        user_id: user!.id,
        status: 'OPTED_IN'
      });

    loadEvents();
  }

  function exportToICS() {
    const icsContent = generateICS(events);
    const blob = new Blob([icsContent], { type: 'text/calendar' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'schedule.ics';
    a.click();
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1>Smart Calendar</h1>
        <div className="space-x-2">
          <Button onClick={() => setView('week')}>Week</Button>
          <Button onClick={() => setView('month')}>Month</Button>
          <Button onClick={exportToICS}>Export ICS</Button>
        </div>
      </div>

      {/* Calendar grid rendering */}
    </div>
  );
}
```

---

## Admin Features

### User Management

```typescript
// src/features/admin/UserManagementPage.tsx

export function UserManagementPage() {
  const [users, setUsers] = useState([]);
  const [filterRole, setFilterRole] = useState('ALL');

  async function loadUsers() {
    let query = supabase
      .from('user_profiles')
      .select('*, departments(name)')
      .order('created_at', { ascending: false });

    if (filterRole !== 'ALL') {
      query = query.eq('role', filterRole);
    }

    const { data } = await query;
    setUsers(data || []);
  }

  async function createUser(userData) {
    // This should call an Edge Function to create auth user
    const { data, error } = await supabase.functions.invoke(
      'create-user',
      { body: userData }
    );

    if (!error) {
      loadUsers();
    }
  }

  async function resetPassword(userId: string) {
    const confirm = window.confirm(
      'Reset password for this user?'
    );

    if (!confirm) return;

    // Call Edge Function to reset password
    await supabase.functions.invoke('reset-password', {
      body: { userId }
    });
  }

  async function toggleUserStatus(userId: string, currentStatus: boolean) {
    await supabase
      .from('user_profiles')
      .update({ is_active: !currentStatus })
      .eq('id', userId);

    loadUsers();
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between">
        <h1>User Management</h1>
        <Button onClick={() => setShowCreateModal(true)}>
          Add User
        </Button>
      </div>

      {/* Filter controls */}
      {/* User table with actions */}
    </div>
  );
}
```

---

## Edge Functions

### Deployment Pattern

To deploy an Edge Function:

```bash
# Using Supabase CLI (if available)
supabase functions deploy enroll-student

# Or use the provided MCP tool
# Deploy via code
```

### Common Edge Function Pattern

```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    // Parse request body
    const body = await req.json();

    // Create Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Your business logic here

    // Return success response
    return new Response(
      JSON.stringify({ success: true, data: result }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      }
    );

  } catch (error) {
    // Return error response
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      }
    );
  }
});
```

---

## Testing Patterns

### Component Testing

```typescript
// Example test for CatalogPage
import { render, screen, waitFor } from '@testing-library/react';
import { CatalogPage } from '../CatalogPage';

describe('CatalogPage', () => {
  it('displays course sections', async () => {
    render(<CatalogPage />);

    await waitFor(() => {
      expect(screen.getByText('CS101')).toBeInTheDocument();
    });
  });

  it('filters by department', async () => {
    const { getByLabelText } = render(<CatalogPage />);

    const select = getByLabelText('Department');
    fireEvent.change(select, { target: { value: 'CS' } });

    await waitFor(() => {
      expect(screen.queryByText('MATH101')).not.toBeInTheDocument();
    });
  });
});
```

---

## Best Practices

1. **Always validate on backend** (Edge Functions)
2. **Use RLS policies** for data access control
3. **Handle loading states** in UI
4. **Show meaningful error messages** to users
5. **Log important actions** to audit_logs
6. **Send notifications** for key events
7. **Test edge cases** (full sections, conflicts, etc.)
8. **Optimize queries** with proper indexes
9. **Use transactions** for multi-step operations
10. **Document your code** with comments

---

This guide provides the foundation for implementing all major features. Follow these patterns consistently for a maintainable, secure, and scalable system.
