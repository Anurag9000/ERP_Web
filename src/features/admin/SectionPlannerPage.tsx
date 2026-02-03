import { useEffect, useState, useCallback } from 'react';
import { services } from '../../services/serviceLocator';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { Select } from '../../components/common/Select';
import {
    Plus,
    Clock,
    MapPin,
    AlertTriangle,
    CheckCircle,
    Filter
} from 'lucide-react';
import { useMaintenance } from '../../contexts/MaintenanceContext';

interface PlannerSection {
    id: string;
    courseCode: string;
    courseName: string;
    termId: string;
    termName: string;
    sectionNumber: string;
    capacity: number;
    enrolledCount: number;
    waitlistCount: number;
    scheduleDays: string[];
    startTime: string;
    endTime: string;
    roomCode: string | null;
    roomName: string | null;
    roomCapacity: number | null;
    instructorName?: string;
}

interface ReferenceTerm {
    id: string;
    name: string;
}

interface ReferenceRoom {
    id: string;
    code: string;
    capacity: number;
    name?: string;
}

interface ReferenceCourse {
    id: string;
    code: string;
    name: string;
}

interface ReferenceInstructor {
    id: string;
    first_name: string;
    last_name: string;
}

export function SectionPlannerPage() {
    const { canWrite } = useMaintenance();

    const [terms, setTerms] = useState<ReferenceTerm[]>([]);
    const [selectedTermId, setSelectedTermId] = useState('');
    const [sections, setSections] = useState<PlannerSection[]>([]);
    const [rooms, setRooms] = useState<ReferenceRoom[]>([]);
    const [courses, setCourses] = useState<ReferenceCourse[]>([]);
    const [instructors, setInstructors] = useState<ReferenceInstructor[]>([]);

    const [loading, setLoading] = useState(true);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [formData, setFormData] = useState({
        course_id: '',
        term_id: '',
        section_number: '01',
        capacity: 30,
        room_id: '',
        instructor_id: '',
        start_time: '09:00',
        end_time: '10:15',
        schedule_days: ['MONDAY', 'WEDNESDAY']
    });

    const [conflicts, setConflicts] = useState<any[]>([]);

    useEffect(() => {
        loadInitialData();
    }, []);

    useEffect(() => {
        if (selectedTermId) {
            loadSections(selectedTermId);
        }
    }, [selectedTermId]);

    const loadInitialData = useCallback(async () => {
        setLoading(true);
        try {
            const [termsData, roomsData, coursesData, instructorsData] = await Promise.all([
                services.sectionPlannerService.fetchTerms(),
                services.sectionPlannerService.fetchRooms(),
                services.sectionPlannerService.fetchCourses(),
                services.sectionPlannerService.fetchInstructors()
            ]);

            setTerms(termsData);
            setRooms(roomsData);
            setCourses(coursesData);
            setInstructors(instructorsData);

            if (termsData.length > 0) {
                setSelectedTermId(termsData[0].id);
                setFormData(prev => ({ ...prev, term_id: termsData[0].id }));
            }
        } catch (error) {
            console.error('Error loading planner data:', error);
            setMessage({ type: 'error', text: 'Failed to load initial data.' });
        } finally {
            setLoading(false);
        }
    }, []);

    const loadSections = useCallback(async (termId: string) => {
        try {
            const data = await services.sectionPlannerService.fetchSections(termId);
            setSections(data);
        } catch (error) {
            console.error('Error loading sections:', error);
        }
    }, []);

    useEffect(() => {
        loadInitialData();
    }, [loadInitialData]);

    useEffect(() => {
        if (selectedTermId) {
            loadSections(selectedTermId);
        }
    }, [selectedTermId, loadSections]);

    async function validateSchedule() {
        if (!formData.room_id || !formData.start_time || !formData.end_time || formData.schedule_days.length === 0) return;

        try {
            const [roomRes, instructorRes] = await Promise.all([
                services.sectionPlannerService.detectRoomConflicts(
                    formData.room_id,
                    formData.start_time,
                    formData.end_time,
                    formData.schedule_days,
                    formData.term_id
                ),
                formData.instructor_id ? services.sectionPlannerService.detectInstructorConflicts(
                    formData.instructor_id,
                    formData.start_time,
                    formData.end_time,
                    formData.schedule_days,
                    formData.term_id
                ) : Promise.resolve({ conflicts: [], hasConflict: false })
            ]);

            const allConflicts = [...roomRes.conflicts.map(c => ({ ...c, type: 'Room' })),
            ...instructorRes.conflicts.map(c => ({ ...c, type: 'Instructor' }))];
            setConflicts(allConflicts);
        } catch (error) {
            console.error('Validation error:', error);
        }
    }

    useEffect(() => {
        const timer = setTimeout(() => {
            validateSchedule();
        }, 500);
        return () => clearTimeout(timer);
    }, [formData.room_id, formData.instructor_id, formData.start_time, formData.end_time, formData.schedule_days]);

    async function handleCreateSection(e: React.FormEvent) {
        e.preventDefault();
        if (!canWrite) return;

        try {
            const { error } = await services.sectionPlannerService.createSection({
                ...formData,
                is_active: true
            } as any);

            if (error) throw error;

            setMessage({ type: 'success', text: 'Section created successfully.' });
            setIsModalOpen(false);
            loadSections(selectedTermId);
        } catch (error) {
            console.error('Error creating section:', error);
            setMessage({ type: 'error', text: 'Failed to create section.' });
        }
    }

    const toggleDay = (day: string) => {
        setFormData(prev => ({
            ...prev,
            schedule_days: prev.schedule_days.includes(day)
                ? prev.schedule_days.filter(d => d !== day)
                : [...prev.schedule_days, day]
        }));
    };

    if (loading) {
        return <div className="p-8 text-center text-gray-600">Loading planner hub...</div>;
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Academic Section Planner</h1>
                    <p className="text-gray-600 mt-1">Design course schedules with real-time conflict detection.</p>
                </div>

                <div className="flex items-center gap-3">
                    <Select
                        value={selectedTermId}
                        onChange={(e) => setSelectedTermId(e.target.value)}
                        className="w-48"
                    >
                        {terms.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                    </Select>
                    <Button onClick={() => setIsModalOpen(true)} disabled={!canWrite}>
                        <Plus className="w-4 h-4 mr-2" />
                        New Section
                    </Button>
                </div>
            </div>

            {message && (
                <div className={`p-4 rounded-lg flex items-center gap-3 ${message.type === 'success' ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'
                    }`}>
                    {message.type === 'success' ? <CheckCircle className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
                    <p>{message.text}</p>
                    <button className="ml-auto" onClick={() => setMessage(null)}>&times;</button>
                </div>
            )}

            {/* Main Grid View */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-4">
                    <Card title="Section Inventory">
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Course/Section</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Time/Days</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Room</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Capacity</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {sections.length === 0 ? (
                                        <tr><td colSpan={4} className="px-4 py-8 text-center text-gray-500 italic">No sections planned for this term.</td></tr>
                                    ) : (
                                        sections.map(section => (
                                            <tr key={section.id} className="hover:bg-gray-50">
                                                <td className="px-4 py-4">
                                                    <p className="font-semibold text-gray-900">{section.courseCode} - {section.sectionNumber}</p>
                                                    <p className="text-xs text-gray-500 truncate max-w-[150px]">{section.courseName}</p>
                                                </td>
                                                <td className="px-4 py-4">
                                                    <div className="flex items-center text-sm text-gray-700">
                                                        <Clock className="w-3 h-3 mr-1 text-gray-400" />
                                                        {section.startTime} - {section.endTime}
                                                    </div>
                                                    <div className="flex gap-1 mt-1">
                                                        {section.scheduleDays.map(d => (
                                                            <span key={d} className="text-[10px] bg-blue-50 text-blue-700 px-1 rounded font-medium">
                                                                {d.substring(0, 3)}
                                                            </span>
                                                        ))}
                                                    </div>
                                                </td>
                                                <td className="px-4 py-4">
                                                    <div className="flex items-center text-sm text-gray-700">
                                                        <MapPin className="w-3 h-3 mr-1 text-gray-400" />
                                                        {section.roomCode || 'TBA'}
                                                    </div>
                                                </td>
                                                <td className="px-4 py-4">
                                                    <div className="flex items-center text-sm">
                                                        <span className="font-medium text-gray-900">{section.enrolledCount}</span>
                                                        <span className="text-gray-400 mx-1">/</span>
                                                        <span className="text-gray-500">{section.capacity}</span>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </Card>
                </div>

                <div className="space-y-6">
                    <Card title="Validation Engine" subtitle="Live conflict monitoring">
                        <div className="space-y-4">
                            {conflicts.length === 0 ? (
                                <div className="flex items-center gap-3 text-green-700 bg-green-50 p-3 rounded-lg border border-green-100 italic text-sm">
                                    <CheckCircle className="w-5 h-5" />
                                    No active scheduling conflicts.
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {conflicts.map((c, i) => (
                                        <div key={i} className="flex items-start gap-3 text-red-700 bg-red-50 p-3 rounded-lg border border-red-100 text-sm">
                                            <AlertTriangle className="w-5 h-5 mt-0.5 flex-shrink-0" />
                                            <div>
                                                <p className="font-bold">{c.type} Conflict</p>
                                                <p className="text-xs opacity-90">Overlaps with {c.courses?.code} ({c.start_time}-{c.end_time})</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            <div className="p-3 border border-gray-100 rounded-lg text-xs text-gray-500 bg-gray-50">
                                <p className="font-medium mb-1 flex items-center gap-1">
                                    <Filter className="w-3 h-3" /> Filters
                                </p>
                                <p>Showing internal validation checks for current draft sections.</p>
                            </div>
                        </div>
                    </Card>

                    <Card title="Room Utilization">
                        <div className="space-y-3">
                            {rooms.slice(0, 5).map(room => {
                                const count = sections.filter(s => s.roomCode === room.code).length;
                                const percentage = Math.min(100, (count / 10) * 100); // Mock limit of 10 slots
                                return (
                                    <div key={room.id}>
                                        <div className="flex justify-between text-xs mb-1">
                                            <span className="font-medium text-gray-700">{room.code} ({room.name})</span>
                                            <span className="text-gray-500">{count} sections</span>
                                        </div>
                                        <div className="w-full bg-gray-100 rounded-full h-1.5">
                                            <div
                                                className={`h-1.5 rounded-full ${percentage > 80 ? 'bg-orange-500' : 'bg-blue-600'}`}
                                                style={{ width: `${percentage}%` }}
                                            />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </Card>
                </div>
            </div>

            {/* Create Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
                        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                            <h2 className="text-xl font-bold text-gray-900">Plan New Section</h2>
                            <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600">&times;</button>
                        </div>

                        <form onSubmit={handleCreateSection} className="p-6 space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <label className="text-sm font-medium text-gray-700">
                                    Course Catalog
                                    <select
                                        required
                                        className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:border-blue-500 outline-none"
                                        value={formData.course_id}
                                        onChange={e => setFormData(prev => ({ ...prev, course_id: e.target.value }))}
                                    >
                                        <option value="">Select a course...</option>
                                        {courses.map(c => <option key={c.id} value={c.id}>{c.code} · {c.name}</option>)}
                                    </select>
                                </label>

                                <Input
                                    label="Section Number"
                                    value={formData.section_number}
                                    onChange={e => setFormData(prev => ({ ...prev, section_number: e.target.value }))}
                                />

                                <label className="text-sm font-medium text-gray-700">
                                    Assigned Room
                                    <select
                                        required
                                        className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:border-blue-500 outline-none"
                                        value={formData.room_id}
                                        onChange={e => setFormData(prev => ({ ...prev, room_id: e.target.value }))}
                                    >
                                        <option value="">Select room...</option>
                                        {rooms.map(r => <option key={r.id} value={r.id}>{r.code} ({r.capacity} seats)</option>)}
                                    </select>
                                </label>

                                <label className="text-sm font-medium text-gray-700">
                                    Instructor
                                    <select
                                        className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:border-blue-500 outline-none"
                                        value={formData.instructor_id}
                                        onChange={e => setFormData(prev => ({ ...prev, instructor_id: e.target.value }))}
                                    >
                                        <option value="">Unassigned</option>
                                        {instructors.map(i => <option key={i.id} value={i.id}>{i.first_name} {i.last_name}</option>)}
                                    </select>
                                </label>

                                <Input
                                    label="Capacity"
                                    type="number"
                                    value={formData.capacity}
                                    onChange={e => setFormData(prev => ({ ...prev, capacity: parseInt(e.target.value) }))}
                                />
                            </div>

                            <div className="space-y-3">
                                <p className="text-sm font-medium text-gray-700">Schedule Pattern</p>
                                <div className="flex flex-wrap gap-2">
                                    {['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'].map(day => (
                                        <button
                                            key={day}
                                            type="button"
                                            onClick={() => toggleDay(day)}
                                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${formData.schedule_days.includes(day)
                                                ? 'bg-blue-600 text-white shadow-sm'
                                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                                }`}
                                        >
                                            {day}
                                        </button>
                                    ))}
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <Input
                                        type="time"
                                        label="Start Time"
                                        value={formData.start_time}
                                        onChange={e => setFormData(prev => ({ ...prev, start_time: e.target.value }))}
                                    />
                                    <Input
                                        type="time"
                                        label="End Time"
                                        value={formData.end_time}
                                        onChange={e => setFormData(prev => ({ ...prev, end_time: e.target.value }))}
                                    />
                                </div>
                            </div>

                            {conflicts.length > 0 && (
                                <div className="p-3 bg-red-50 border border-red-100 rounded-lg flex items-start gap-2 text-red-700 text-xs">
                                    <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                                    <p>Warning: This section has {conflicts.length} scheduling conflict(s). Proceed with caution.</p>
                                </div>
                            )}

                            <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
                                <Button variant="ghost" type="button" onClick={() => setIsModalOpen(false)}>Cancel</Button>
                                <Button type="submit" disabled={!canWrite}>Create Draft Section</Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
