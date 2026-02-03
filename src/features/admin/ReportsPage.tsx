import { useState, useEffect, useCallback } from 'react';
import { Card } from '../../components/common/Card';
import { Select } from '../../components/common/Select';
import { services } from '../../services/serviceLocator';
import { TrendingUp, Users, AlertTriangle, BarChart3 } from 'lucide-react';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell
} from 'recharts';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

interface EnrollmentTrend {
    department: string;
    enrolled: number;
    capacity: number;
    utilizationRate: number;
    [key: string]: any;
}

interface WaitlistPressure {
    courseCode: string;
    sectionNumber: string;
    waitlisted: number;
    pressureScore: number;
    [key: string]: any;
}

interface FinancialArrears {
    studentName: string;
    studentId: string;
    outstanding: number;
    overdueCount: number;
}

interface AttendanceCompliance {
    courseCode: string;
    sectionNumber: string;
    totalStudents: number;
    averageAttendance: number;
    belowThreshold: number;
}

interface EnrollmentStats {
    totalEnrolled: number;
    utilizationRate: number;
    totalWaitlisted: number;
    sectionsCount: number;
}

export function ReportsPage() {
    const [terms, setTerms] = useState<any[]>([]);
    const [selectedTerm, setSelectedTerm] = useState('');

    const [enrollmentTrends, setEnrollmentTrends] = useState<EnrollmentTrend[]>([]);
    const [waitlistPressure, setWaitlistPressure] = useState<WaitlistPressure[]>([]);
    const [financialArrears, setFinancialArrears] = useState<FinancialArrears[]>([]);
    const [attendanceCompliance, setAttendanceCompliance] = useState<AttendanceCompliance[]>([]);
    const [enrollmentStats, setEnrollmentStats] = useState<EnrollmentStats | null>(null);

    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadTerms();
    }, []);

    async function loadTerms() {
        try {
            const data = await services.sectionPlannerService.fetchTerms();
            setTerms(data);

            const currentTerm = data.find((t: any) => t.is_current);
            if (currentTerm) {
                setSelectedTerm(currentTerm.id);
            } else if (data.length > 0) {
                setSelectedTerm(data[0].id);
            }
        } catch (error) {
            console.error('Error loading terms:', error);
        }
    }

    const loadReports = useCallback(async () => {
        setLoading(true);
        try {
            const [trends, pressure, arrears, compliance, stats] = await Promise.all([
                services.reportingService.getEnrollmentTrends(selectedTerm),
                services.reportingService.getWaitlistPressure(selectedTerm),
                services.reportingService.getFinancialArrears(),
                services.reportingService.getAttendanceCompliance(),
                services.reportingService.getEnrollmentStats(selectedTerm)
            ]);

            setEnrollmentTrends(trends);
            setWaitlistPressure(pressure);
            setFinancialArrears(arrears);
            setAttendanceCompliance(compliance);
            setEnrollmentStats(stats);
        } catch (error) {
            console.error('Error loading reports:', error);
        } finally {
            setLoading(false);
        }
    }, [selectedTerm]);

    useEffect(() => {
        if (selectedTerm) {
            loadReports();
        }
    }, [selectedTerm, loadReports]);

    if (loading && !enrollmentStats) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="text-gray-600">Loading reports...</div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Reports & Analytics</h1>
                    <p className="text-gray-600 mt-1">Comprehensive insights into enrollment, finances, and attendance</p>
                </div>

                <Select
                    value={selectedTerm}
                    onChange={(e) => setSelectedTerm(e.target.value)}
                    className="w-64"
                >
                    {terms.map(term => (
                        <option key={term.id} value={term.id}>
                            {term.name}
                        </option>
                    ))}
                </Select>
            </div>

            {/* Summary Cards */}
            {enrollmentStats && (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <Card>
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-600">Total Enrolled</p>
                                <p className="text-2xl font-bold text-gray-900 mt-1">
                                    {enrollmentStats.totalEnrolled.toLocaleString()}
                                </p>
                            </div>
                            <Users className="w-8 h-8 text-blue-600" />
                        </div>
                    </Card>

                    <Card>
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-600">Utilization Rate</p>
                                <p className="text-2xl font-bold text-gray-900 mt-1">
                                    {enrollmentStats.utilizationRate.toFixed(1)}%
                                </p>
                            </div>
                            <TrendingUp className="w-8 h-8 text-green-600" />
                        </div>
                    </Card>

                    <Card>
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-600">Waitlisted</p>
                                <p className="text-2xl font-bold text-gray-900 mt-1">
                                    {enrollmentStats.totalWaitlisted.toLocaleString()}
                                </p>
                            </div>
                            <AlertTriangle className="w-8 h-8 text-yellow-600" />
                        </div>
                    </Card>

                    <Card>
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-600">Active Sections</p>
                                <p className="text-2xl font-bold text-gray-900 mt-1">
                                    {enrollmentStats.sectionsCount}
                                </p>
                            </div>
                            <BarChart3 className="w-8 h-8 text-purple-600" />
                        </div>
                    </Card>
                </div>
            )}

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Enrollment Trends */}
                <Card title="Enrollment by Department">
                    <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={enrollmentTrends.slice(0, 10)}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="department" angle={-45} textAnchor="end" height={100} />
                            <YAxis />
                            <Tooltip />
                            <Legend />
                            <Bar dataKey="enrolled" fill="#3b82f6" name="Enrolled" />
                            <Bar dataKey="capacity" fill="#e5e7eb" name="Capacity" />
                        </BarChart>
                    </ResponsiveContainer>
                </Card>

                {/* Utilization Pie */}
                <Card title="Department Utilization">
                    <ResponsiveContainer width="100%" height={300}>
                        <PieChart>
                            <Pie
                                data={enrollmentTrends.slice(0, 5)}
                                dataKey="utilizationRate"
                                nameKey="department"
                                cx="50%"
                                cy="50%"
                                outerRadius={100}
                                label={({ name, percent }: any) => `${name}: ${(percent * 100).toFixed(0)}%`}
                            >
                                {enrollmentTrends.slice(0, 5).map((_entry, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                            </Pie>
                            <Tooltip />
                        </PieChart>
                    </ResponsiveContainer>
                </Card>
            </div>

            {/* Tables Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Waitlist Pressure */}
                <Card title="Waitlist Pressure" subtitle="Sections with highest demand">
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Course</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Section</th>
                                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Waitlisted</th>
                                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Pressure</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {waitlistPressure.slice(0, 10).map((item, idx) => (
                                    <tr key={idx}>
                                        <td className="px-4 py-3 text-sm text-gray-900">{item.courseCode}</td>
                                        <td className="px-4 py-3 text-sm text-gray-600">{item.sectionNumber}</td>
                                        <td className="px-4 py-3 text-sm text-gray-900 text-right">{item.waitlisted}</td>
                                        <td className="px-4 py-3 text-right">
                                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${item.pressureScore > 2
                                                ? 'bg-red-100 text-red-800'
                                                : item.pressureScore > 1
                                                    ? 'bg-yellow-100 text-yellow-800'
                                                    : 'bg-green-100 text-green-800'
                                                }`}>
                                                {item.pressureScore.toFixed(1)}x
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </Card>

                {/* Financial Arrears */}
                <Card title="Financial Arrears" subtitle="Students with outstanding balances">
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Student</th>
                                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Outstanding</th>
                                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Overdue</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {financialArrears.slice(0, 10).map((item, idx) => (
                                    <tr key={idx}>
                                        <td className="px-4 py-3 text-sm">
                                            <div className="font-medium text-gray-900">{item.studentName}</div>
                                            <div className="text-xs text-gray-500">{item.studentId}</div>
                                        </td>
                                        <td className="px-4 py-3 text-sm text-gray-900 text-right font-medium">
                                            ${item.outstanding.toLocaleString()}
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            {item.overdueCount > 0 && (
                                                <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">
                                                    {item.overdueCount}
                                                </span>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </Card>
            </div>

            {/* Attendance Compliance */}
            <Card title="Attendance Compliance" subtitle="Sections with attendance concerns">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Course</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Section</th>
                                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Students</th>
                                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Avg Attendance</th>
                                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Below 75%</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {attendanceCompliance.slice(0, 15).map((item, idx) => (
                                <tr key={idx}>
                                    <td className="px-4 py-3 text-sm text-gray-900">{item.courseCode}</td>
                                    <td className="px-4 py-3 text-sm text-gray-600">{item.sectionNumber}</td>
                                    <td className="px-4 py-3 text-sm text-gray-900 text-right">{item.totalStudents}</td>
                                    <td className="px-4 py-3 text-right">
                                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${item.averageAttendance >= 75
                                            ? 'bg-green-100 text-green-800'
                                            : item.averageAttendance >= 60
                                                ? 'bg-yellow-100 text-yellow-800'
                                                : 'bg-red-100 text-red-800'
                                            }`}>
                                            {item.averageAttendance.toFixed(1)}%
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-sm text-gray-900 text-right">
                                        {item.belowThreshold > 0 && (
                                            <span className="text-red-600 font-medium">{item.belowThreshold}</span>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </Card>
        </div>
    );
}
