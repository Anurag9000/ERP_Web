import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Loader2, Printer, Download, Calendar as CalendarIcon } from 'lucide-react';
import { generateICS } from '../../lib/utils';

interface TimetableSection {
  id: string;
  section_number: string;
  start_time: string;
  end_time: string;
  schedule_days: string[];
  rooms: { code: string | null; name: string | null } | null;
  courses: { code: string; name: string };
  terms: { name: string } | null;
}

const dayOrder = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'];

export function TimetablePage() {
  const { user } = useAuth();
  const [sections, setSections] = useState<TimetableSection[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      loadTimetable();
    }
  }, [user]);

  async function loadTimetable() {
    setLoading(true);
    setMessage(null);
    try {
      const { data, error } = await supabase
        .from('enrollments')
        .select(
          `
            id,
            sections(
              id,
              section_number,
              start_time,
              end_time,
              schedule_days,
              rooms(code, name),
              courses(code, name),
              terms(name)
            )
          `
        )
        .eq('student_id', user!.id)
        .eq('status', 'ACTIVE');
      if (error) throw error;
      const sectionRows =
        (data || [])
          .map((row: any) => row.sections)
          .filter(Boolean) as TimetableSection[];
      setSections(sectionRows);
    } catch (error) {
      console.error('Error loading timetable:', error);
      setMessage('Unable to load timetable. Please try again later.');
    } finally {
      setLoading(false);
    }
  }

  const gridEvents = useMemo(() => {
    const grouped: Record<string, TimetableSection[]> = {};
    sections.forEach((section) => {
      section.schedule_days.forEach((day) => {
        if (!grouped[day]) grouped[day] = [];
        grouped[day].push(section);
      });
    });
    return grouped;
  }, [sections]);

  function exportICS() {
    if (!sections.length) {
      setMessage('No sections available to export.');
      return;
    }
    const events = sections.flatMap((section) =>
      section.schedule_days.map((day) => {
        const nextDate = nextDateFor(day);
        const start = new Date(`${nextDate}T${section.start_time}`);
        const end = new Date(`${nextDate}T${section.end_time}`);
        return {
          title: `${section.courses.code} ${section.courses.name}`,
          startTime: start.toISOString(),
          endTime: end.toISOString(),
          location: section.rooms?.code || 'TBA',
          description: `Section ${section.section_number}`,
        };
      })
    );
    const ics = generateICS(events);
    const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'timetable.ics';
    link.click();
    URL.revokeObjectURL(url);
  }

  function nextDateFor(day: string) {
    const index = dayOrder.indexOf(day);
    const now = new Date();
    const result = new Date(now);
    const diff = (index - now.getDay() + 7) % 7;
    result.setDate(now.getDate() + diff);
    return result.toISOString().split('T')[0];
  }

  function printTimetable() {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    const tableRows = dayOrder
      .map((day) => {
        const entries = (gridEvents[day] || [])
          .map(
            (section) =>
              `<div><strong>${section.courses.code}</strong> ${section.start_time} - ${section.end_time} (${section.rooms?.code || 'TBA'})</div>`
          )
          .join('');
        return `<tr><th>${day}</th><td>${entries || '—'}</td></tr>`;
      })
      .join('');
    printWindow.document.write(`
      <html>
        <head>
          <title>Weekly Timetable</title>
          <style>
            body{font-family:Arial,sans-serif;padding:24px;}
            table{border-collapse:collapse;width:100%;}
            th,td{border:1px solid #ccc;padding:8px;vertical-align:top;}
            th{background:#f3f4f6;width:150px;}
          </style>
        </head>
        <body>
          <h1>Weekly Timetable</h1>
          <table>${tableRows}</table>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">My Timetable</h1>
          <p className="text-gray-600 mt-1">Weekly day/time grid plus printable and calendar exports.</p>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline" size="sm" onClick={exportICS}>
            <CalendarIcon className="w-4 h-4 mr-2" />
            Export ICS
          </Button>
          <Button size="sm" onClick={printTimetable}>
            <Printer className="w-4 h-4 mr-2" />
            Print / PDF
          </Button>
        </div>
      </div>

      {message && (
        <div className="bg-blue-50 border border-blue-200 text-blue-800 px-4 py-3 rounded-lg">{message}</div>
      )}

      {!sections.length ? (
        <Card>
          <p className="text-gray-500 text-center py-6">No active sections in your schedule.</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-7 gap-4">
          {dayOrder.map((day) => (
            <Card key={day} title={day}>
              <div className="space-y-3">
                {(gridEvents[day] || []).length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-4">No classes</p>
                ) : (
                  gridEvents[day].map((section) => (
                    <div key={`${section.id}-${section.start_time}`} className="p-3 border border-gray-100 rounded-lg">
                      <p className="font-semibold text-gray-900">{section.courses.code}</p>
                      <p className="text-sm text-gray-600">{section.courses.name}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        {section.start_time} - {section.end_time} · Room {section.rooms?.code || 'TBA'}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
