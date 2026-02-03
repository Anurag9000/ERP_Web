import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { services } from '../../services/serviceLocator';
import {
    FileText,
    Upload,
    CheckCircle,
    Clock,
    AlertCircle,
    Calendar,
    Award
} from 'lucide-react';
import type { Assignment } from '../../services/AssignmentService';

export function AssignmentsPage() {
    const { user } = useAuth();
    const [assignments, setAssignments] = useState<Assignment[]>([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState<string | null>(null);
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
    const fileInputRefs = useRef<{ [key: string]: HTMLInputElement | null }>({});

    const loadAssignments = useCallback(async () => {
        setLoading(true);
        try {
            const data = await services.assignmentService.fetchStudentAssignments(user!.id);
            setAssignments(data);
        } catch (error) {
            console.error('Error loading assignments:', error);
        } finally {
            setLoading(false);
        }
    }, [user]);

    useEffect(() => {
        if (user) {
            loadAssignments();
        }
    }, [user, loadAssignments]);

    async function handleSubmit(assignmentId: string) {
        const fileInput = fileInputRefs.current[assignmentId];
        const file = fileInput?.files?.[0];

        if (!file) {
            setMessage({ type: 'error', text: 'Please select a file to upload' });
            return;
        }

        setSubmitting(assignmentId);
        setMessage(null);

        try {
            const result = await services.assignmentService.submitAssignment(
                assignmentId,
                user!.id,
                file
            );

            if (result.success) {
                setMessage({ type: 'success', text: 'Assignment submitted successfully!' });
                loadAssignments();
                if (fileInput) fileInput.value = '';
            } else {
                setMessage({ type: 'error', text: result.error || 'Failed to submit assignment' });
            }
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
            setMessage({ type: 'error', text: errorMessage });
        } finally {
            setSubmitting(null);
        }
    }

    function getStatusBadge(assignment: Assignment) {
        const now = new Date();
        const isOverdue = assignment.dueDate < now && !assignment.submitted;
        const isDueSoon = assignment.dueDate.getTime() - now.getTime() < 24 * 60 * 60 * 1000;

        if (assignment.submitted) {
            return (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    <CheckCircle className="w-3 h-3 mr-1" />
                    Submitted
                </span>
            );
        }

        if (isOverdue) {
            return (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                    <AlertCircle className="w-3 h-3 mr-1" />
                    Overdue
                </span>
            );
        }

        if (isDueSoon) {
            return (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                    <Clock className="w-3 h-3 mr-1" />
                    Due Soon
                </span>
            );
        }

        return (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                <Clock className="w-3 h-3 mr-1" />
                Pending
            </span>
        );
    }

    const upcomingAssignments = assignments.filter(a => !a.submitted && a.dueDate >= new Date());
    const submittedAssignments = assignments.filter(a => a.submitted);
    const overdueAssignments = assignments.filter(a => !a.submitted && a.dueDate < new Date());

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="text-gray-600">Loading assignments...</div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold text-gray-900">Assignments & Tests</h1>
                <p className="text-gray-600 mt-1">View, submit, and track your assignments</p>
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

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-600">Upcoming</p>
                            <p className="text-2xl font-bold text-gray-900 mt-1">{upcomingAssignments.length}</p>
                        </div>
                        <Clock className="w-8 h-8 text-blue-600" />
                    </div>
                </Card>

                <Card>
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-600">Submitted</p>
                            <p className="text-2xl font-bold text-gray-900 mt-1">{submittedAssignments.length}</p>
                        </div>
                        <CheckCircle className="w-8 h-8 text-green-600" />
                    </div>
                </Card>

                <Card>
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-600">Overdue</p>
                            <p className="text-2xl font-bold text-gray-900 mt-1">{overdueAssignments.length}</p>
                        </div>
                        <AlertCircle className="w-8 h-8 text-red-600" />
                    </div>
                </Card>
            </div>

            {/* Assignments List */}
            <div className="space-y-4">
                {assignments.length === 0 ? (
                    <Card>
                        <p className="text-center text-gray-500 py-8">No assignments found</p>
                    </Card>
                ) : (
                    assignments.map((assignment) => (
                        <Card key={assignment.id}>
                            <div className="flex items-start justify-between">
                                <div className="flex-1">
                                    <div className="flex items-start gap-3">
                                        <FileText className="w-5 h-5 text-gray-400 mt-1 flex-shrink-0" />
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-1">
                                                <h3 className="text-lg font-semibold text-gray-900">{assignment.name}</h3>
                                                {getStatusBadge(assignment)}
                                            </div>

                                            <p className="text-sm text-gray-600 mb-2">
                                                {assignment.courseCode} - {assignment.courseName} (Section {assignment.sectionNumber})
                                            </p>

                                            {assignment.description && (
                                                <p className="text-sm text-gray-700 mb-3">{assignment.description}</p>
                                            )}

                                            <div className="flex items-center gap-4 text-sm text-gray-600">
                                                <span className="flex items-center gap-1">
                                                    <Calendar className="w-4 h-4" />
                                                    Due: {assignment.dueDate.toLocaleDateString()} at {assignment.dueDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </span>
                                                <span className="flex items-center gap-1">
                                                    <Award className="w-4 h-4" />
                                                    Max Marks: {assignment.maxMarks}
                                                </span>
                                            </div>

                                            {assignment.submitted && (
                                                <div className="mt-3 p-3 bg-green-50 rounded-lg">
                                                    <p className="text-sm text-green-800">
                                                        <strong>Submitted:</strong> {assignment.submissionDate?.toLocaleString()}
                                                    </p>
                                                    {assignment.marksObtained !== undefined && (
                                                        <p className="text-sm text-green-800 mt-1">
                                                            <strong>Marks:</strong> {assignment.marksObtained}/{assignment.maxMarks}
                                                        </p>
                                                    )}
                                                    {assignment.feedback && (
                                                        <p className="text-sm text-green-800 mt-1">
                                                            <strong>Feedback:</strong> {assignment.feedback}
                                                        </p>
                                                    )}
                                                </div>
                                            )}

                                            {!assignment.submitted && (
                                                <div className="mt-4 flex items-center gap-2">
                                                    <input
                                                        ref={(el) => (fileInputRefs.current[assignment.id] = el)}
                                                        type="file"
                                                        className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                                                    />
                                                    <Button
                                                        onClick={() => handleSubmit(assignment.id)}
                                                        disabled={submitting === assignment.id}
                                                        size="sm"
                                                    >
                                                        <Upload className="w-4 h-4 mr-2" />
                                                        {submitting === assignment.id ? 'Submitting...' : 'Submit'}
                                                    </Button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </Card>
                    ))
                )}
            </div>
        </div>
    );
}
