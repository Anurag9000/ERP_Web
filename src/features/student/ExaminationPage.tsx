import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { services } from '../../services/serviceLocator';
import {
    FileText,
    Download,
    Calendar,
    Award,
    CheckCircle
} from 'lucide-react';

export function ExaminationPage() {
    const { user } = useAuth();
    const [selectedTerm, setSelectedTerm] = useState('');
    const [terms, setTerms] = useState<any[]>([]);
    const [admitCard, setAdmitCard] = useState<any>(null);
    const [datesheet, setDatesheet] = useState<any[]>([]);
    const [marksheet, setMarksheet] = useState<any[]>([]);
    const [examFormSubmitted, setExamFormSubmitted] = useState(false);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'form' | 'admit' | 'datesheet' | 'marks'>('form');

    useEffect(() => {
        loadTerms();
    }, []);

    useEffect(() => {
        if (selectedTerm && user) {
            loadExamData();
        }
    }, [selectedTerm, user]);

    async function loadTerms() {
        try {
            const data = await services.sectionPlannerService.fetchTerms();
            setTerms(data);
            const currentTerm = data.find((t: any) => t.is_current);
            if (currentTerm) {
                setSelectedTerm(currentTerm.id);
            }
        } catch (error) {
            console.error('Error loading terms:', error);
        } finally {
            setLoading(false);
        }
    }

    async function loadExamData() {
        try {
            const [admit, dates, marks] = await Promise.all([
                services.examinationService.generateAdmitCard(user!.id, selectedTerm),
                services.examinationService.getDatesheet(selectedTerm),
                services.examinationService.getMarksheet(user!.id, selectedTerm)
            ]);

            setAdmitCard(admit);
            setDatesheet(dates);
            setMarksheet(marks);
        } catch (error) {
            console.error('Error loading exam data:', error);
        }
    }

    async function handleSubmitExamForm() {
        try {
            const result = await services.examinationService.submitExamForm(user!.id, selectedTerm);
            if (result.success) {
                setExamFormSubmitted(true);
                setActiveTab('admit');
            }
        } catch (error) {
            console.error('Error submitting exam form:', error);
        }
    }

    function downloadAdmitCard() {
        // Generate PDF or print
        window.print();
    }

    if (loading) {
        return <div className="flex items-center justify-center h-64">Loading...</div>;
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold text-gray-900">Examinations</h1>
                <p className="text-gray-600 mt-1">Exam forms, admit cards, datesheet, and results</p>
            </div>

            {/* Tabs */}
            <div className="border-b border-gray-200">
                <nav className="-mb-px flex space-x-8">
                    {[
                        { id: 'form', label: 'Exam Form', icon: FileText },
                        { id: 'admit', label: 'Admit Card', icon: Award },
                        { id: 'datesheet', label: 'Datesheet', icon: Calendar },
                        { id: 'marks', label: 'Marksheet', icon: CheckCircle }
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as any)}
                            className={`flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm ${activeTab === tab.id
                                ? 'border-blue-500 text-blue-600'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                }`}
                        >
                            <tab.icon className="w-4 h-4" />
                            {tab.label}
                        </button>
                    ))}
                </nav>
            </div>

            {/* Exam Form Tab */}
            {activeTab === 'form' && (
                <Card title="Exam Form Submission">
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Select Term
                            </label>
                            <select
                                value={selectedTerm}
                                onChange={(e) => setSelectedTerm(e.target.value)}
                                className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                            >
                                {terms.map(term => (
                                    <option key={term.id} value={term.id}>{term.name}</option>
                                ))}
                            </select>
                        </div>

                        {examFormSubmitted ? (
                            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                                <div className="flex items-center gap-2">
                                    <CheckCircle className="w-5 h-5 text-green-600" />
                                    <p className="text-green-800 font-medium">Exam form submitted successfully!</p>
                                </div>
                                <p className="text-sm text-green-700 mt-2">
                                    You can now download your admit card from the Admit Card tab.
                                </p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                                    <p className="text-sm text-blue-800">
                                        <strong>Important:</strong> Submit your exam form before the deadline to be eligible for examinations.
                                    </p>
                                </div>

                                <Button onClick={handleSubmitExamForm} className="w-full">
                                    Submit Exam Form
                                </Button>
                            </div>
                        )}
                    </div>
                </Card>
            )}

            {/* Admit Card Tab */}
            {activeTab === 'admit' && (
                <Card
                    title="Admit Card"
                    // @ts-ignore
                    action={
                        admitCard && (
                            <Button size="sm" onClick={downloadAdmitCard}>
                                <Download className="w-4 h-4 mr-2" />
                                Download
                            </Button>
                        )
                    }
                >
                    {admitCard ? (
                        <div className="space-y-6 print:p-8">
                            <div className="text-center border-b pb-4">
                                <h2 className="text-2xl font-bold text-gray-900">University Examination</h2>
                                <p className="text-gray-600 mt-1">Admit Card</p>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <p className="text-sm text-gray-600">Student Name</p>
                                    <p className="font-semibold text-gray-900">{admitCard.studentName}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-gray-600">Roll Number</p>
                                    <p className="font-semibold text-gray-900">{admitCard.rollNumber}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-gray-600">Exam Center</p>
                                    <p className="font-semibold text-gray-900">{admitCard.examCenter}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-gray-600">Exam Date</p>
                                    <p className="font-semibold text-gray-900">
                                        {admitCard.examDate.toLocaleDateString()}
                                    </p>
                                </div>
                            </div>

                            <div>
                                <h3 className="font-semibold text-gray-900 mb-3">Exam Schedule</h3>
                                <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Course</th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Time</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        {admitCard.courses.map((course: any, idx: number) => (
                                            <tr key={idx}>
                                                <td className="px-4 py-3 text-sm">
                                                    <div className="font-medium text-gray-900">{course.code}</div>
                                                    <div className="text-gray-600">{course.name}</div>
                                                </td>
                                                <td className="px-4 py-3 text-sm text-gray-900">
                                                    {course.date.toLocaleDateString()}
                                                </td>
                                                <td className="px-4 py-3 text-sm text-gray-900">{course.time}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            <div className="border-t pt-4 text-sm text-gray-600">
                                <p><strong>Instructions:</strong></p>
                                <ul className="list-disc list-inside mt-2 space-y-1">
                                    <li>Bring this admit card to the examination hall</li>
                                    <li>Carry a valid photo ID</li>
                                    <li>Report 30 minutes before exam time</li>
                                </ul>
                            </div>
                        </div>
                    ) : (
                        <p className="text-center text-gray-500 py-8">
                            Submit exam form to generate admit card
                        </p>
                    )}
                </Card>
            )}

            {/* Datesheet Tab */}
            {activeTab === 'datesheet' && (
                <Card title="Examination Datesheet">
                    {datesheet.length > 0 ? (
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Course Code</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Course Name</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Time</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {datesheet.map((exam: any) => (
                                        <tr key={exam.id}>
                                            <td className="px-4 py-3 text-sm font-medium text-gray-900">{exam.courseCode}</td>
                                            <td className="px-4 py-3 text-sm text-gray-600">{exam.courseName}</td>
                                            <td className="px-4 py-3 text-sm text-gray-900">
                                                {exam.date.toLocaleDateString()}
                                            </td>
                                            <td className="px-4 py-3 text-sm text-gray-900">{exam.time}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <p className="text-center text-gray-500 py-8">No exams scheduled</p>
                    )}
                </Card>
            )}

            {/* Marksheet Tab */}
            {activeTab === 'marks' && (
                <Card title="Marksheet">
                    {marksheet.length > 0 ? (
                        <div className="space-y-4">
                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Course</th>
                                            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Credits</th>
                                            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Marks</th>
                                            <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Grade</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        {marksheet.map((course: any, idx: number) => (
                                            <tr key={idx}>
                                                <td className="px-4 py-3 text-sm">
                                                    <div className="font-medium text-gray-900">{course.courseCode}</div>
                                                    <div className="text-gray-600">{course.courseName}</div>
                                                </td>
                                                <td className="px-4 py-3 text-sm text-gray-900 text-right">{course.credits}</td>
                                                <td className="px-4 py-3 text-sm text-gray-900 text-right">
                                                    {course.marks}/{course.maxMarks}
                                                </td>
                                                <td className="px-4 py-3 text-center">
                                                    <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                                                        {course.grade}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    ) : (
                        <p className="text-center text-gray-500 py-8">Results not yet published</p>
                    )}
                </Card>
            )}
        </div>
    );
}
