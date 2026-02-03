import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { services } from '../../services/serviceLocator';
import {
    User,
    Mail,
    MapPin,
    Clock,
    Calendar,
    MessageSquare,
    Circle
} from 'lucide-react';
import type { InstructorProfile } from '../../services/FacultyService';

export function FacultyPage() {
    const { user } = useAuth();
    const [instructors, setInstructors] = useState<InstructorProfile[]>([]);
    const [selectedInstructor, setSelectedInstructor] = useState<InstructorProfile | null>(null);
    const [showAppointmentModal, setShowAppointmentModal] = useState(false);
    const [appointmentDate, setAppointmentDate] = useState('');
    const [appointmentTime, setAppointmentTime] = useState('');
    const [purpose, setPurpose] = useState('');
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    const loadInstructors = useCallback(async () => {
        setLoading(true);
        try {
            const data = await services.facultyService.fetchInstructors();
            setInstructors(data);
        } catch (error) {
            console.error('Error loading instructors:', error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadInstructors();
    }, [loadInstructors]);

    function openAppointmentModal(instructor: InstructorProfile) {
        setSelectedInstructor(instructor);
        setShowAppointmentModal(true);
        setMessage(null);
    }

    async function handleRequestAppointment() {
        if (!appointmentDate || !appointmentTime || !purpose) {
            setMessage({ type: 'error', text: 'Please fill in all fields' });
            return;
        }

        setSubmitting(true);
        try {
            const result = await services.facultyService.requestAppointment(
                user!.id,
                selectedInstructor!.id,
                new Date(appointmentDate),
                appointmentTime,
                purpose
            );

            if (result.success) {
                setMessage({ type: 'success', text: 'Appointment request sent successfully!' });
                setAppointmentDate('');
                setAppointmentTime('');
                setPurpose('');
                setTimeout(() => setShowAppointmentModal(false), 2000);
            } else {
                setMessage({ type: 'error', text: result.error || 'Failed to send request' });
            }
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
            setMessage({ type: 'error', text: errorMessage });
        } finally {
            setSubmitting(false);
        }
    }

    function getStatusColor(status: string) {
        const colors = {
            AVAILABLE: 'text-green-600',
            IN_CLASS: 'text-yellow-600',
            IN_MEETING: 'text-orange-600',
            UNAVAILABLE: 'text-gray-600'
        };
        return colors[status as keyof typeof colors] || colors.UNAVAILABLE;
    }

    function getStatusLabel(status: string) {
        const labels = {
            AVAILABLE: 'Available',
            IN_CLASS: 'In Class',
            IN_MEETING: 'In Meeting',
            UNAVAILABLE: 'Unavailable'
        };
        return labels[status as keyof typeof labels] || 'Unknown';
    }

    if (loading) {
        return <div className="flex items-center justify-center h-64">Loading faculty...</div>;
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold text-gray-900">Faculty Directory</h1>
                <p className="text-gray-600 mt-1">Find instructors and request appointments</p>
            </div>

            {/* Faculty Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {instructors.map(instructor => (
                    <Card key={instructor.id}>
                        <div className="space-y-4">
                            {/* Header */}
                            <div className="flex items-start justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                                        <User className="w-6 h-6 text-blue-600" />
                                    </div>
                                    <div>
                                        <h3 className="font-semibold text-gray-900">{instructor.name}</h3>
                                        <p className="text-sm text-gray-600">{instructor.department}</p>
                                    </div>
                                </div>
                                <div className={`flex items-center gap-1 ${getStatusColor(instructor.currentStatus)}`}>
                                    <Circle className="w-2 h-2 fill-current" />
                                    <span className="text-xs font-medium">{getStatusLabel(instructor.currentStatus)}</span>
                                </div>
                            </div>

                            {/* Contact Info */}
                            <div className="space-y-2 text-sm">
                                <div className="flex items-center gap-2 text-gray-600">
                                    <Mail className="w-4 h-4" />
                                    <span>{instructor.email}</span>
                                </div>
                                <div className="flex items-center gap-2 text-gray-600">
                                    <MapPin className="w-4 h-4" />
                                    <span>{instructor.officeLocation}</span>
                                </div>
                                <div className="flex items-center gap-2 text-gray-600">
                                    <Clock className="w-4 h-4" />
                                    <span>{instructor.officeHours}</span>
                                </div>
                            </div>

                            {/* Actions */}
                            <Button
                                onClick={() => openAppointmentModal(instructor)}
                                variant="outline"
                                size="sm"
                                className="w-full"
                            >
                                <Calendar className="w-4 h-4 mr-2" />
                                Request Appointment
                            </Button>
                        </div>
                    </Card>
                ))}
            </div>

            {/* Appointment Modal */}
            {showAppointmentModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <Card className="max-w-md w-full">
                        <div className="space-y-4">
                            <div>
                                <h2 className="text-xl font-bold text-gray-900">Request Appointment</h2>
                                <p className="text-sm text-gray-600 mt-1">
                                    with {selectedInstructor?.name}
                                </p>
                            </div>

                            {message && (
                                <div
                                    className={`rounded-lg px-4 py-3 ${message.type === 'success'
                                        ? 'bg-green-50 border border-green-200 text-green-800'
                                        : 'bg-red-50 border border-red-200 text-red-800'
                                        }`}
                                >
                                    {message.text}
                                </div>
                            )}

                            <div className="space-y-4">
                                <Input
                                    label="Preferred Date"
                                    type="date"
                                    value={appointmentDate}
                                    onChange={(e) => setAppointmentDate(e.target.value)}
                                    min={new Date().toISOString().split('T')[0]}
                                />

                                <Input
                                    label="Preferred Time"
                                    type="time"
                                    value={appointmentTime}
                                    onChange={(e) => setAppointmentTime(e.target.value)}
                                />

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Purpose
                                    </label>
                                    <textarea
                                        value={purpose}
                                        onChange={(e) => setPurpose(e.target.value)}
                                        rows={3}
                                        className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                                        placeholder="Briefly describe the purpose of your appointment..."
                                    />
                                </div>
                            </div>

                            <div className="flex gap-2">
                                <Button
                                    onClick={handleRequestAppointment}
                                    disabled={submitting}
                                    className="flex-1"
                                >
                                    <MessageSquare className="w-4 h-4 mr-2" />
                                    {submitting ? 'Sending...' : 'Send Request'}
                                </Button>
                                <Button
                                    onClick={() => setShowAppointmentModal(false)}
                                    variant="outline"
                                    disabled={submitting}
                                >
                                    Cancel
                                </Button>
                            </div>
                        </div>
                    </Card>
                </div>
            )}
        </div>
    );
}
