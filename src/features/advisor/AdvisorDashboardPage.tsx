import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Card } from '../../components/common/Card';
import { services } from '../../services/serviceLocator';
import {
    AlertTriangle,
    TrendingDown,
    Users,
    Award
} from 'lucide-react';

export function AdvisorDashboardPage() {
    const { user } = useAuth();
    const [riskStudents, setRiskStudents] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (user) {
            loadRiskStudents();
        }
    }, [user]);

    async function loadRiskStudents() {
        setLoading(true);
        try {
            const data = await services.degreeAuditService.identifyRiskStudents(user!.id);
            setRiskStudents(data);
        } catch (error) {
            console.error('Error loading risk students:', error);
        } finally {
            setLoading(false);
        }
    }

    if (loading) {
        return <div className="flex items-center justify-center h-64">Loading dashboard...</div>;
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold text-gray-900">Advisor Dashboard</h1>
                <p className="text-gray-600 mt-1">Monitor advisee progress and identify at-risk students</p>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-600">Total Advisees</p>
                            <p className="text-2xl font-bold text-gray-900 mt-1">
                                {riskStudents.length}
                            </p>
                        </div>
                        <Users className="w-8 h-8 text-blue-600" />
                    </div>
                </Card>

                <Card>
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-600">At Risk</p>
                            <p className="text-2xl font-bold text-gray-900 mt-1">
                                {riskStudents.length}
                            </p>
                        </div>
                        <AlertTriangle className="w-8 h-8 text-red-600" />
                    </div>
                </Card>

                <Card>
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-600">Avg CGPA</p>
                            <p className="text-2xl font-bold text-gray-900 mt-1">
                                {riskStudents.length > 0
                                    ? (riskStudents.reduce((sum, s) => sum + s.cgpa, 0) / riskStudents.length).toFixed(2)
                                    : 'N/A'}
                            </p>
                        </div>
                        <Award className="w-8 h-8 text-purple-600" />
                    </div>
                </Card>
            </div>

            {/* At-Risk Students */}
            <Card title="At-Risk Students">
                {riskStudents.length > 0 ? (
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Student</th>
                                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">CGPA</th>
                                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Credits</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Risk Factors</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {riskStudents.map((student, idx) => (
                                    <tr key={idx}>
                                        <td className="px-4 py-3 text-sm">
                                            <div className="font-medium text-gray-900">{student.studentName}</div>
                                            <div className="text-gray-600">{student.studentId}</div>
                                        </td>
                                        <td className="px-4 py-3 text-sm text-right">
                                            <span className={`font-medium ${student.cgpa < 2.0 ? 'text-red-600' : 'text-gray-900'}`}>
                                                {student.cgpa.toFixed(2)}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-sm text-gray-900 text-right">
                                            {student.completedCredits}
                                        </td>
                                        <td className="px-4 py-3 text-sm">
                                            <div className="flex flex-wrap gap-1">
                                                {student.riskFactors.map((factor: string, i: number) => (
                                                    <span
                                                        key={i}
                                                        className="inline-flex px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800"
                                                    >
                                                        {factor}
                                                    </span>
                                                ))}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div className="text-center py-8">
                        <TrendingDown className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                        <p className="text-gray-600">No at-risk students identified</p>
                        <p className="text-sm text-gray-500 mt-1">All advisees are on track!</p>
                    </div>
                )}
            </Card>

            {/* Recommendations */}
            {riskStudents.length > 0 && (
                <Card title="Recommended Actions">
                    <div className="space-y-3">
                        <div className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg">
                            <AlertTriangle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                            <div>
                                <p className="font-medium text-blue-900">Schedule Individual Meetings</p>
                                <p className="text-sm text-blue-700">
                                    Meet with at-risk students to discuss academic plans and support options
                                </p>
                            </div>
                        </div>

                        <div className="flex items-start gap-3 p-3 bg-purple-50 rounded-lg">
                            <Award className="w-5 h-5 text-purple-600 flex-shrink-0 mt-0.5" />
                            <div>
                                <p className="font-medium text-purple-900">Connect with Tutoring Services</p>
                                <p className="text-sm text-purple-700">
                                    Refer students to academic support and tutoring resources
                                </p>
                            </div>
                        </div>

                        <div className="flex items-start gap-3 p-3 bg-green-50 rounded-lg">
                            <Users className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                            <div>
                                <p className="font-medium text-green-900">Monitor Progress</p>
                                <p className="text-sm text-green-700">
                                    Set up regular check-ins to track improvement and provide ongoing support
                                </p>
                            </div>
                        </div>
                    </div>
                </Card>
            )}
        </div>
    );
}
