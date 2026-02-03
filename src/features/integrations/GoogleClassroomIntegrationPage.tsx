import { useState, useEffect } from 'react';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { services } from '../../services/serviceLocator';
import {
    Link as LinkIcon,
    Download,
    Upload,
    CheckCircle,
    AlertCircle,
    RefreshCw
} from 'lucide-react';

export function GoogleClassroomIntegrationPage() {
    const [authenticated, setAuthenticated] = useState(false);
    const [googleCourses, setGoogleCourses] = useState<any[]>([]);
    const [erpCourses, setErpCourses] = useState<any[]>([]);
    const [mappings, setMappings] = useState<Record<string, string>>({}); // GoogleCourseID -> ERPCourseID
    const [loading, setLoading] = useState(false);
    const [syncing, setSyncing] = useState(false);

    useEffect(() => {
        loadStatus();
        loadErpCourses();
    }, []);

    async function loadStatus() {
        // Check if user has active google integration
        // This would involve calling a service to check DB for mappings
    }

    async function loadErpCourses() {
        try {
            const data = await services.registrarService.fetchCourses();
            setErpCourses(data || []);
        } catch (error) {
            console.error('Error loading courses:', error);
        }
    }

    async function handleAuthenticate() {
        setLoading(true);
        const result = await services.googleClassroomService.authenticate();

        if (result.success) {
            setAuthenticated(true);
            await loadGoogleCourses();
        }
        setLoading(false);
    }

    async function loadGoogleCourses() {
        setLoading(true);
        try {
            const courses = await services.googleClassroomService.fetchCourses();
            setGoogleCourses(courses);
        } catch (error) {
            console.error('Error loading Google Classroom courses:', error);
        } finally {
            setLoading(false);
        }
    }

    async function handleSyncCourse(googleCourseId: string) {
        const erpCourseId = mappings[googleCourseId];
        if (!erpCourseId) {
            alert('Please select an ERP course to map to');
            return;
        }

        setSyncing(true);
        const googleCourse = googleCourses.find(c => c.id === googleCourseId);

        if (googleCourse) {
            const result = await services.googleClassroomService.syncCourseToERP(googleCourse, erpCourseId);
            if (result.success) {
                alert('Course mapped and synced successfully!');
            } else {
                alert(`Sync failed: ${result.error}`);
            }
        }
        setSyncing(false);
    }

    async function handleImportAssignments(googleCourseId: string, erpSectionId: string) {
        setSyncing(true);
        const result = await services.googleClassroomService.importAssignments(googleCourseId, erpSectionId);

        if (result.success) {
            alert(`Successfully imported ${result.imported} assignments!`);
        }
        setSyncing(false);
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold text-gray-900">Google Classroom Integration</h1>
                <p className="text-gray-600 mt-1">Connect and sync with Google Classroom</p>
            </div>

            {/* Authentication */}
            {!authenticated ? (
                <Card>
                    <div className="text-center py-12">
                        <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <LinkIcon className="w-8 h-8 text-blue-600" />
                        </div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">Connect to Google Classroom</h3>
                        <p className="text-gray-600 mb-6">
                            Authorize access to import courses and assignments from Google Classroom
                        </p>
                        <Button onClick={handleAuthenticate} disabled={loading}>
                            {loading ? 'Connecting...' : 'Connect with Google'}
                        </Button>
                    </div>
                </Card>
            ) : (
                <>
                    {/* Sync Status */}
                    <Card title="Sync Status">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <CheckCircle className="w-6 h-6 text-green-600" />
                                <div>
                                    <p className="font-medium text-gray-900">Connected to Google Classroom</p>
                                    <p className="text-sm text-gray-600">Last synced: Just now</p>
                                </div>
                            </div>
                            <Button variant="outline" size="sm" onClick={loadGoogleCourses}>
                                <RefreshCw className="w-4 h-4 mr-2" />
                                Refresh
                            </Button>
                        </div>
                    </Card>

                    {/* Course Mapping */}
                    <Card title="Course Mapping">
                        <div className="space-y-4">
                            {googleCourses.map(googleCourse => (
                                <div key={googleCourse.id} className="border rounded-lg p-4">
                                    <div className="flex items-start justify-between mb-3">
                                        <div>
                                            <h4 className="font-semibold text-gray-900">{googleCourse.name}</h4>
                                            <p className="text-sm text-gray-600">{googleCourse.section}</p>
                                        </div>
                                        <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                                            Google Classroom
                                        </span>
                                    </div>

                                    <div className="flex items-center gap-4">
                                        <select
                                            value={mappings[googleCourse.id] || ''}
                                            onChange={(e) => setMappings(prev => ({ ...prev, [googleCourse.id]: e.target.value }))}
                                            className="flex-1 rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                                        >
                                            <option value="">Map to ERP course...</option>
                                            {erpCourses.map(course => (
                                                <option key={course.id} value={course.id}>
                                                    {course.code} - {course.name}
                                                </option>
                                            ))}
                                        </select>
                                        <Button
                                            size="sm"
                                            onClick={() => handleSyncCourse(googleCourse.id)}
                                            disabled={syncing}
                                        >
                                            <LinkIcon className="w-4 h-4 mr-2" />
                                            Sync
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </Card>

                    {/* Import Options */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <Card title="Import Assignments">
                            <div className="space-y-4">
                                <p className="text-sm text-gray-600">
                                    Import assignments from Google Classroom to your ERP courses
                                </p>
                                <Button
                                    className="w-full"
                                    onClick={() => {
                                        const firstMapping = Object.entries(mappings)[0];
                                        if (firstMapping) {
                                            handleImportAssignments(firstMapping[0], firstMapping[1]);
                                        } else {
                                            alert('Please map a course first');
                                        }
                                    }}
                                >
                                    <Download className="w-4 h-4 mr-2" />
                                    Import Assignments
                                </Button>
                            </div>
                        </Card>

                        <Card title="Export Grades">
                            <div className="space-y-4">
                                <p className="text-sm text-gray-600">
                                    Push grades from ERP back to Google Classroom
                                </p>
                                <Button className="w-full" variant="outline">
                                    <Upload className="w-4 h-4 mr-2" />
                                    Export Grades
                                </Button>
                            </div>
                        </Card>
                    </div>

                    {/* Instructions */}
                    <Card title="Setup Instructions">
                        <div className="space-y-3 text-sm text-gray-700">
                            <div className="flex items-start gap-2">
                                <span className="font-semibold text-blue-600">1.</span>
                                <p>Connect your Google account using the button above</p>
                            </div>
                            <div className="flex items-start gap-2">
                                <span className="font-semibold text-blue-600">2.</span>
                                <p>Map Google Classroom courses to your ERP courses</p>
                            </div>
                            <div className="flex items-start gap-2">
                                <span className="font-semibold text-blue-600">3.</span>
                                <p>Import assignments and sync grades automatically</p>
                            </div>
                            <div className="flex items-start gap-2">
                                <AlertCircle className="w-4 h-4 text-yellow-600 mt-0.5" />
                                <p className="text-yellow-700">
                                    <strong>Note:</strong> Ensure you have instructor permissions in Google Classroom
                                </p>
                            </div>
                        </div>
                    </Card>
                </>
            )}
        </div>
    );
}
