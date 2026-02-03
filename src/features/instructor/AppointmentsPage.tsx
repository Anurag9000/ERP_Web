import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { services } from '../../services/serviceLocator';
import {
    Calendar,
    Check,
    X,
    Clock,
    User
} from 'lucide-react';

export function AppointmentsPage() {
    const { user } = useAuth();
    const [appointments, setAppointments] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (user) {
            loadAppointments();
        }
    }, [user]);

    async function loadAppointments() {
        setLoading(true);
        try {
            const data = await services.facultyService.getInstructorAppointments(user!.id);
            setAppointments(data);
        } catch (error) {
            console.error('Error loading appointments:', error);
        } finally {
            setLoading(false);
        }
    }

    async function handleUpdateStatus(appointmentId: string, status: 'APPROVED' | 'REJECTED') {
        try {
            await services.facultyService.updateAppointmentStatus(appointmentId, status);
            loadAppointments();
        } catch (error) {
            console.error('Error updating appointment:', error);
        }
    }

    function getStatusBadge(status: string) {
        const styles = {
            PENDING: 'bg-yellow-100 text-yellow-800',
            APPROVED: 'bg-green-100 text-green-800',
            REJECTED: 'bg-red-100 text-red-800'
        };
        return styles[status as keyof typeof styles] || styles.PENDING;
    }

    const pendingAppointments = appointments.filter(a => a.status === 'PENDING');
    const processedAppointments = appointments.filter(a => a.status !== 'PENDING');

    if (loading) {
        return <div className="flex items-center justify-center h-64">Loading appointments...</div>;
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold text-gray-900">Appointment Requests</h1>
                <p className="text-gray-600 mt-1">Manage student appointment requests</p>
            </div>

            {/* Pending Requests */}
            {pendingAppointments.length > 0 && (
                <div>
                    <h2 className="text-lg font-semibold text-gray-900 mb-4">Pending Requests</h2>
                    <div className="space-y-4">
                        {pendingAppointments.map(appointment => (
                            <Card key={appointment.id}>
                                <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-3 mb-3">
                                            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                                                <User className="w-5 h-5 text-blue-600" />
                                            </div>
                                            <div>
                                                <h3 className="font-semibold text-gray-900">{appointment.studentName}</h3>
                                                <p className="text-sm text-gray-600">
                                                    Requested: {new Date(appointment.createdAt).toLocaleDateString()}
                                                </p>
                                            </div>
                                        </div>

                                        <div className="space-y-2 text-sm">
                                            <div className="flex items-center gap-2 text-gray-700">
                                                <Calendar className="w-4 h-4" />
                                                <span className="font-medium">
                                                    {new Date(appointment.requestedDate).toLocaleDateString()} at {appointment.requestedTime}
                                                </span>
                                            </div>
                                            <div className="flex items-start gap-2 text-gray-700">
                                                <Clock className="w-4 h-4 mt-0.5" />
                                                <span>{appointment.purpose}</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex gap-2 ml-4">
                                        <Button
                                            size="sm"
                                            onClick={() => handleUpdateStatus(appointment.id, 'APPROVED')}
                                            className="bg-green-600 hover:bg-green-700"
                                        >
                                            <Check className="w-4 h-4 mr-1" />
                                            Approve
                                        </Button>
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => handleUpdateStatus(appointment.id, 'REJECTED')}
                                            className="text-red-600 border-red-600 hover:bg-red-50"
                                        >
                                            <X className="w-4 h-4 mr-1" />
                                            Reject
                                        </Button>
                                    </div>
                                </div>
                            </Card>
                        ))}
                    </div>
                </div>
            )}

            {/* Processed Requests */}
            {processedAppointments.length > 0 && (
                <div>
                    <h2 className="text-lg font-semibold text-gray-900 mb-4">Previous Requests</h2>
                    <div className="space-y-4">
                        {processedAppointments.map(appointment => (
                            <Card key={appointment.id}>
                                <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-3 mb-2">
                                            <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
                                                <User className="w-5 h-5 text-gray-600" />
                                            </div>
                                            <div>
                                                <h3 className="font-semibold text-gray-900">{appointment.studentName}</h3>
                                                <p className="text-sm text-gray-600">
                                                    {new Date(appointment.requestedDate).toLocaleDateString()} at {appointment.requestedTime}
                                                </p>
                                            </div>
                                        </div>
                                        <p className="text-sm text-gray-700 ml-13">{appointment.purpose}</p>
                                    </div>

                                    <span className={`inline-flex px-3 py-1 rounded-full text-xs font-medium ${getStatusBadge(appointment.status)}`}>
                                        {appointment.status}
                                    </span>
                                </div>
                            </Card>
                        ))}
                    </div>
                </div>
            )}

            {appointments.length === 0 && (
                <Card>
                    <p className="text-center text-gray-500 py-8">No appointment requests</p>
                </Card>
            )}
        </div>
    );
}
