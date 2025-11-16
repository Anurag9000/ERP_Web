import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Loader2, Printer, Calendar as CalendarIcon } from 'lucide-react';
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

type PositionedSection = TimetableSection & {
  startMinutes: number;
  endMinutes: number;
  durationMinutes: number;
  top: number;
  height: number;
};

const MINUTE_HEIGHT = 1.1;
const defaultStartMinutes = 8 * 60;
const defaultEndMinutes = 18 * 60;

const dayOrder = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'];

const dayLabels: Record<string, string> = {
  MONDAY: 'Monday',
  TUESDAY: 'Tuesday',
  WEDNESDAY: 'Wednesday',
  THURSDAY: 'Thursday',
  FRIDAY: 'Friday',
  SATURDAY: 'Saturday',
  SUNDAY: 'Sunday',
};

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
          .map((row: { sections: TimetableSection | null }) => row.sections)
          .filter(Boolean) as TimetableSection[];
      setSections(sectionRows);
    } catch (error) {
      console.error('Error loading timetable:', error);
      setMessage('Unable to load timetable. Please try again later.');
    } finally {
      setLoading(false);
    }
  }

  const timeline = useMemo(() => {
    if (!sections.length) {
      return {
        minMinutes: defaultStartMinutes,
        maxMinutes: defaultEndMinutes,
        hours: buildHourArray(defaultStartMinutes, defaultEndMinutes),
        gridHeight: (defaultEndMinutes - defaultStartMinutes) * MINUTE_HEIGHT,
      };
    }
    const starts = sections.map((section) => timeToMinutes(section.start_time));
    const ends = sections.map((section) => timeToMinutes(section.end_time));
    const minMinutes = Math.floor(Math.min(...starts) / 60) * 60;
    const maxMinutes = Math.ceil(Math.max(...ends) / 60) * 60;
    const totalMinutes = Math.max(maxMinutes - minMinutes, 60);
    return {
      minMinutes,
      maxMinutes,
      hours: buildHourArray(minMinutes, maxMinutes),
      gridHeight: Math.max(totalMinutes * MINUTE_HEIGHT, 480),
    };
  }, [sections]);

  const dayEvents = useMemo(() => {
    const grouped: Record<string, PositionedSection[]> = {};
    sections.forEach((section) => {
      const startMinutes = timeToMinutes(section.start_time);
      const endMinutes = timeToMinutes(section.end_time);
      const durationMinutes = Math.max(endMinutes - startMinutes, 45);
      section.schedule_days.forEach((day) => {
        if (!grouped[day]) grouped[day] = [];
        grouped[day].push({
          ...section,
          startMinutes,
          endMinutes,
          durationMinutes,
          top: (startMinutes - timeline.minMinutes) * MINUTE_HEIGHT,
          height: Math.max(durationMinutes * MINUTE_HEIGHT, 56),
        });
      });
    });
    Object.values(grouped).forEach((entries) => entries.sort((a, b) => a.startMinutes - b.startMinutes));
    return grouped;
  }, [sections, timeline.minMinutes]);

  const minuteToPixels = (minute: number) => (minute - timeline.minMinutes) * MINUTE_HEIGHT;

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
    if (!sections.length) {
      setMessage('No sections available to print.');
      return;
    }
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const gridLines = timeline.hours
      .map(
        (minute) =>
          `<div class="hour-line" style="top:${minuteToPixels(minute)}px"></div>`
      )
      .join('');

    const hourMarkers = timeline.hours
      .map(
        (minute) =>
          `<div class="hour-marker" style="top:${minuteToPixels(minute)}px">
             <span>${formatHourLabel(minute)}</span>
           </div>`
      )
      .join('');

    const dayColumns = dayOrder
      .map((day) => {
        const entries =
          (dayEvents[day] || [])
            .map(
              (section) => `
                <div class="event" style="top:${section.top}px;height:${section.height}px">
                  <div class="code">${section.courses.code}</div>
                  <div class="name">${section.courses.name}</div>
                  <div class="meta">${formatRange(section.start_time, section.end_time)} | Room ${section.rooms?.code || 'TBA'}</div>
                </div>
              `
            )
            .join('') || '<div class="empty">No classes</div>';
        return `
          <div class="day-column">
            <div class="day-label">${dayLabels[day] ?? day}</div>
            <div class="day-grid" style="height:${timeline.gridHeight}px">
              <div class="grid-lines">${gridLines}</div>
              ${entries}
            </div>
          </div>
        `;
      })
      .join('');

    printWindow.document.write(`
      <html>
        <head>
          <title>Weekly Timetable</title>
          <style>
            body {
              font-family: 'Segoe UI', Arial, sans-serif;
              margin: 24px;
              color: #111827;
            }
            h1 {
              margin-bottom: 4px;
            }
            .subtitle {
              margin-bottom: 24px;
              color: #6b7280;
            }
            .grid-container {
              display: flex;
              border: 1px solid #e5e7eb;
              border-radius: 12px;
              overflow: hidden;
            }
            .time-column {
              width: 100px;
              background: #f9fafb;
              position: relative;
              border-right: 1px solid #e5e7eb;
            }
            .hour-marker {
              position: absolute;
              right: 12px;
              font-size: 12px;
              color: #6b7280;
              transform: translateY(-50%);
            }
            .day-columns {
              display: grid;
              grid-template-columns: repeat(7, minmax(120px, 1fr));
              width: 100%;
            }
            .day-column {
              border-right: 1px solid #f3f4f6;
            }
            .day-column:last-child {
              border-right: none;
            }
            .day-label {
              padding: 12px;
              text-align: center;
              font-weight: 600;
              background: #f9fafb;
              border-bottom: 1px solid #e5e7eb;
            }
            .day-grid {
              position: relative;
            }
            .grid-lines {
              position: absolute;
              inset: 0;
              pointer-events: none;
            }
            .hour-line {
              position: absolute;
              left: 0;
              right: 0;
              border-bottom: 1px dashed #e5e7eb;
            }
            .event {
              position: absolute;
              left: 12px;
              right: 12px;
              border: 1px solid #c7d2fe;
              background: #eef2ff;
              border-radius: 10px;
              padding: 8px 10px;
              box-shadow: 0 4px 12px rgba(79, 70, 229, 0.1);
              overflow: hidden;
            }
            .event .code {
              font-weight: 600;
              color: #312e81;
            }
            .event .name {
              font-size: 13px;
              margin-top: 2px;
            }
            .event .meta {
              font-size: 12px;
              margin-top: 6px;
              color: #4338ca;
            }
            .empty {
              position: absolute;
              top: 50%;
              left: 50%;
              transform: translate(-50%, -50%);
              font-size: 12px;
              color: #9ca3af;
            }
            @media print {
              body {
                margin: 0;
              }
              .grid-container {
                border: none;
              }
            }
          </style>
        </head>
        <body>
          <h1>Weekly Timetable</h1>
          <div class="subtitle">${new Date().toLocaleDateString()}</div>
          <div class="grid-container">
            <div class="time-column" style="height:${timeline.gridHeight}px">
              ${hourMarkers}
            </div>
            <div class="day-columns">
              ${dayColumns}
            </div>
          </div>
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
          <p className="text-gray-600 mt-1">Interactive day/time grid with printable/PDF and calendar exports.</p>
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
        <div className="overflow-x-auto">
          <div className="min-w-[900px] rounded-2xl border border-gray-200 bg-white shadow-sm">
            <div className="grid grid-cols-[100px_repeat(7,minmax(120px,1fr))] border-b border-gray-200 text-sm font-semibold text-gray-600">
              <div className="bg-gray-50 px-4 py-3 uppercase tracking-wide text-xs">Time</div>
              {dayOrder.map((day) => (
                <div key={day} className="bg-gray-50 px-4 py-3 text-center">
                  {dayLabels[day] ?? day}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-[100px_repeat(7,minmax(120px,1fr))]">
              <div className="relative border-r border-gray-200 bg-gray-50" style={{ height: timeline.gridHeight }}>
                {timeline.hours.map((minute) => (
                  <div
                    key={`label-${minute}`}
                    className="absolute left-0 right-0 -translate-y-1/2"
                    style={{ top: minuteToPixels(minute) }}
                  >
                    <div className="border-b border-dashed border-gray-300" />
                    <div className="absolute right-3 -top-3 text-xs font-medium text-gray-500 bg-gray-50 px-1">
                      {formatHourLabel(minute)}
                    </div>
                  </div>
                ))}
              </div>
              {dayOrder.map((day) => (
                <div
                  key={`day-${day}`}
                  className="relative border-r border-gray-100 bg-white"
                  style={{ height: timeline.gridHeight }}
                >
                  <div className="absolute inset-0 pointer-events-none">
                    {timeline.hours.map((minute) => (
                      <div
                        key={`line-${day}-${minute}`}
                        className="absolute left-0 right-0 border-b border-dashed border-gray-100"
                        style={{ top: minuteToPixels(minute) }}
                      />
                    ))}
                  </div>
                  {(dayEvents[day] || []).length === 0 ? (
                    <div className="absolute inset-0 flex items-center justify-center text-xs text-gray-300">
                      No classes
                    </div>
                  ) : (
                    (dayEvents[day] || []).map((section) => (
                      <div
                        key={`${section.id}-${section.start_time}-${section.section_number}`}
                        className="absolute left-3 right-3 rounded-xl border border-blue-100 bg-gradient-to-br from-blue-50 to-indigo-50 p-3 shadow-sm"
                        style={{ top: section.top, height: section.height }}
                      >
                        <p className="text-sm font-semibold text-blue-950">{section.courses.code}</p>
                        <p className="text-xs text-gray-700">{section.courses.name}</p>
                        <p className="text-xs text-gray-500 mt-2">
                          {formatRange(section.start_time, section.end_time)} | Room {section.rooms?.code || 'TBA'}
                        </p>
                        {section.terms?.name && (
                          <p className="text-[11px] text-gray-400 mt-1">{section.terms.name}</p>
                        )}
                      </div>
                    ))
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function timeToMinutes(value: string) {
  const [hours, minutes] = value.split(':').map(Number);
  return hours * 60 + minutes;
}

function buildHourArray(startMinute: number, endMinute: number) {
  const hours: number[] = [];
  for (let minute = startMinute; minute <= endMinute; minute += 60) {
    hours.push(minute);
  }
  return hours;
}

function formatHourLabel(minute: number) {
  const hours = Math.floor(minute / 60);
  const suffix = hours >= 12 ? 'PM' : 'AM';
  const normalized = ((hours + 11) % 12) + 1;
  return `${normalized}:00 ${suffix}`;
}

function formatRange(start: string, end: string) {
  return `${start} - ${end}`;
}
