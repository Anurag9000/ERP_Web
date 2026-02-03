import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { services } from '../../services/serviceLocator';
import {
    ChevronLeft,
    ChevronRight,
    Calendar as CalendarIcon,
    Clock,
    MapPin,
    Plus
} from 'lucide-react';
import { cn } from '../../lib/utils';

// Define a common interface for the combined events
interface CalendarEvent {
    id: string;
    title: string;
    type: 'class' | 'event';
    color: string;
    date?: string; // For academic events
    start_time?: string;
    end_time?: string;
    course_name?: string; // For class events
    location?: string; // For class events
    [key: string]: any;
}

export function CalendarPage() {
    const { user } = useAuth();
    const [currentDate, setCurrentDate] = useState(new Date());
    const [events, setEvents] = useState<CalendarEvent[]>([]);

    useEffect(() => {
        if (user) {
            loadEvents();
        }
    }, [user, currentDate]);

    async function loadEvents() {
        try {
            // In a real app, we'd fetch events for the current month
            const schedule = await services.calendarService.fetchStudentSchedule(user!.id);
            const academicEvents = await services.calendarService.fetchUpcomingEvents(user!.id);

            // Combine and format events
            const combined = [
                ...schedule.map(s => ({
                    ...s,
                    type: 'class',
                    title: s.course_name,
                    color: 'blue'
                })),
                ...academicEvents.map(e => ({
                    ...e,
                    type: 'event',
                    title: e.title,
                    color: 'purple'
                }))
            ];
            setEvents(combined as any);
        } catch (error) {
            console.error('Error loading calendar events:', error);
        }
    }

    const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
    const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay();

    const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
    const padding = Array.from({ length: firstDayOfMonth }, () => null);

    const prevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
    const nextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));

    const monthName = currentDate.toLocaleString('default', { month: 'long' });

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Academic Calendar</h1>
                    <p className="text-gray-600 mt-1">View classes, exams, and personal events</p>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={prevMonth}>
                        <ChevronLeft className="w-4 h-4" />
                    </Button>
                    <div className="min-w-[120px] text-center font-semibold text-gray-900">
                        {monthName} {currentDate.getFullYear()}
                    </div>
                    <Button variant="outline" size="sm" onClick={nextMonth}>
                        <ChevronRight className="w-4 h-4" />
                    </Button>
                    <Button size="sm">
                        <Plus className="w-4 h-4 mr-2" />
                        Add Event
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                <div className="lg:col-span-3">
                    <Card className="p-0 overflow-hidden">
                        <div className="grid grid-cols-7 border-b border-gray-200">
                            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                                <div key={day} className="py-3 text-center text-sm font-semibold text-gray-700 bg-gray-50">
                                    {day}
                                </div>
                            ))}
                        </div>
                        <div className="grid grid-cols-7 divide-x divide-y divide-gray-200">
                            {padding.concat(days as any).map((day, idx) => (
                                <div key={idx} className="min-h-[120px] p-2 hover:bg-gray-50 transition-colors group">
                                    {day && (
                                        <>
                                            <span className={cn(
                                                "text-sm font-medium",
                                                day === new Date().getDate() &&
                                                    currentDate.getMonth() === new Date().getMonth() &&
                                                    currentDate.getFullYear() === new Date().getFullYear()
                                                    ? "bg-blue-600 text-white w-6 h-6 flex items-center justify-center rounded-full"
                                                    : "text-gray-700"
                                            )}>
                                                {day}
                                            </span>
                                            <div className="mt-1 space-y-1">
                                                {events.filter(e => {
                                                    const date = e.start_time ? new Date(e.start_time) : (e.date ? new Date(e.date) : null);
                                                    return date && date.getDate() === day && date.getMonth() === currentDate.getMonth();
                                                }).map((event, eIdx) => (
                                                    <div key={eIdx} className={cn(
                                                        "text-[10px] p-1 rounded truncate",
                                                        event.color === 'blue' ? "bg-blue-100 text-blue-700" : "bg-purple-100 text-purple-700"
                                                    )}>
                                                        {event.title}
                                                    </div>
                                                ))}
                                            </div>
                                        </>
                                    )}
                                </div>
                            ))}
                        </div>
                    </Card>
                </div>

                <div className="space-y-6">
                    <Card title="Upcoming Deadlines">
                        <div className="space-y-4">
                            <div className="flex gap-3">
                                <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center flex-shrink-0">
                                    <CalendarIcon className="w-5 h-5 text-red-600" />
                                </div>
                                <div>
                                    <p className="text-sm font-semibold text-gray-900">Final Assignment</p>
                                    <p className="text-xs text-gray-500">CS302 · Jan 25, 2026</p>
                                </div>
                            </div>
                            <div className="flex gap-3">
                                <div className="w-10 h-10 rounded-lg bg-orange-100 flex items-center justify-center flex-shrink-0">
                                    <CalendarIcon className="w-5 h-5 text-orange-600" />
                                </div>
                                <div>
                                    <p className="text-sm font-semibold text-gray-900">Midterm Exam</p>
                                    <p className="text-xs text-gray-500">MATH201 · Jan 28, 2026</p>
                                </div>
                            </div>
                        </div>
                    </Card>

                    <Card title="Today's Schedule">
                        <div className="space-y-4">
                            <div className="relative pl-4 border-l-2 border-blue-500">
                                <p className="text-sm font-semibold text-gray-900">Advanced Algorithms</p>
                                <div className="flex items-center gap-2 text-xs text-gray-500 mt-1">
                                    <Clock className="w-3 h-3" />
                                    9:00 AM - 10:30 AM
                                </div>
                                <div className="flex items-center gap-2 text-xs text-gray-500">
                                    <MapPin className="w-3 h-3" />
                                    Room 402
                                </div>
                            </div>
                            <div className="relative pl-4 border-l-2 border-green-500">
                                <p className="text-sm font-semibold text-gray-900">Digital Marketing</p>
                                <div className="flex items-center gap-2 text-xs text-gray-500 mt-1">
                                    <Clock className="w-3 h-3" />
                                    1:00 PM - 2:30 PM
                                </div>
                                <div className="flex items-center gap-2 text-xs text-gray-500">
                                    <MapPin className="w-3 h-3" />
                                    Online
                                </div>
                            </div>
                        </div>
                    </Card>
                </div>
            </div>
        </div>
    );
}
