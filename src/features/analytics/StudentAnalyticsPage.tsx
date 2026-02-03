import { useState, useEffect } from 'react';
import { Card } from '../../components/common/Card';
import { services } from '../../services/serviceLocator';
import {
    TrendingUp,
    Users,
    Award,
    Calendar,
    BarChart3
} from 'lucide-react';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
    LineChart,
    Line
} from 'recharts';

export function StudentAnalyticsPage() {
    const [enrollmentData, setEnrollmentData] = useState<any[]>([]);
    const [gradeDistribution, setGradeDistribution] = useState<any[]>([]);
    const [attendanceTrends, setAttendanceTrends] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadAnalytics();
    }, []);

    async function loadAnalytics() {
        setLoading(true);
        try {
            const [metrics, distribution, trends] = await Promise.all([
                services.analyticsService.fetchSystemWideMetrics(),
                services.analyticsService.fetchGradeDistribution(),
                services.analyticsService.fetchAttendanceTrends()
            ]);

            setEnrollmentData([
                { term: 'Current', enrolled: metrics.totalStudents, capacity: metrics.totalStudents + 50 }
            ]);
            setGradeDistribution(distribution);
            setAttendanceTrends(trends);
            // We could also store metrics in state if needed for the summary cards
        } catch (error) {
            console.error('Error loading analytics:', error);
        } finally {
            setLoading(false);
        }
    }

    if (loading) {
        return <div className="flex items-center justify-center h-64">Loading analytics...</div>;
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold text-gray-900">Student Analytics</h1>
                <p className="text-gray-600 mt-1">Comprehensive insights into student performance and engagement</p>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-600">Total Students</p>
                            <p className="text-2xl font-bold text-gray-900 mt-1">495</p>
                        </div>
                        <Users className="w-8 h-8 text-blue-600" />
                    </div>
                </Card>

                <Card>
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-600">Avg GPA</p>
                            <p className="text-2xl font-bold text-gray-900 mt-1">3.2</p>
                        </div>
                        <Award className="w-8 h-8 text-purple-600" />
                    </div>
                </Card>

                <Card>
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-600">Avg Attendance</p>
                            <p className="text-2xl font-bold text-gray-900 mt-1">89%</p>
                        </div>
                        <Calendar className="w-8 h-8 text-green-600" />
                    </div>
                </Card>

                <Card>
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-600">Growth Rate</p>
                            <p className="text-2xl font-bold text-gray-900 mt-1">+5%</p>
                        </div>
                        <TrendingUp className="w-8 h-8 text-yellow-600" />
                    </div>
                </Card>
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Enrollment Trends */}
                <Card title="Enrollment Trends">
                    <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={enrollmentData}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="term" />
                            <YAxis />
                            <Tooltip />
                            <Legend />
                            <Bar dataKey="enrolled" fill="#3b82f6" name="Enrolled" />
                            <Bar dataKey="capacity" fill="#e5e7eb" name="Capacity" />
                        </BarChart>
                    </ResponsiveContainer>
                </Card>

                {/* Grade Distribution */}
                <Card title="Grade Distribution">
                    <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={gradeDistribution}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="grade" />
                            <YAxis />
                            <Tooltip />
                            <Legend />
                            <Bar dataKey="count" fill="#10b981" name="Students" />
                        </BarChart>
                    </ResponsiveContainer>
                </Card>

                {/* Attendance Trends */}
                <Card title="Attendance Trends" className="lg:col-span-2">
                    <ResponsiveContainer width="100%" height={300}>
                        <LineChart data={attendanceTrends}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="week" />
                            <YAxis />
                            <Tooltip />
                            <Legend />
                            <Line type="monotone" dataKey="attendance" stroke="#8b5cf6" strokeWidth={2} name="Attendance %" />
                        </LineChart>
                    </ResponsiveContainer>
                </Card>
            </div>

            {/* Insights */}
            <Card title="Key Insights">
                <div className="space-y-3">
                    <div className="flex items-start gap-3 p-3 bg-green-50 rounded-lg">
                        <TrendingUp className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                        <div>
                            <p className="font-medium text-green-900">Enrollment Growth</p>
                            <p className="text-sm text-green-700">
                                Enrollment has increased by 10% over the past year, indicating growing program popularity
                            </p>
                        </div>
                    </div>

                    <div className="flex items-start gap-3 p-3 bg-yellow-50 rounded-lg">
                        <BarChart3 className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                        <div>
                            <p className="font-medium text-yellow-900">Attendance Decline</p>
                            <p className="text-sm text-yellow-700">
                                Attendance has dropped 8% since week 1. Consider implementing engagement strategies
                            </p>
                        </div>
                    </div>

                    <div className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg">
                        <Award className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                        <div>
                            <p className="font-medium text-blue-900">Strong Academic Performance</p>
                            <p className="text-sm text-blue-700">
                                60% of students achieved A or B grades, exceeding the target of 55%
                            </p>
                        </div>
                    </div>
                </div>
            </Card>
        </div>
    );
}
