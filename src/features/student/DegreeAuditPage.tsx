import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Card } from '../../components/common/Card';
import { services } from '../../services/serviceLocator';
import {
    Award,
    BookOpen,
    TrendingUp,
    AlertTriangle,
    CheckCircle
} from 'lucide-react';
import {
    CircularProgressbar,
    buildStyles
} from 'react-circular-progressbar';
import 'react-circular-progressbar/dist/styles.css';

interface Requirement {
    category: string;
    completed: number;
    required: number;
    inProgress: number;
    remaining: number;
}

interface SuggestedCourse {
    code: string;
    name: string;
    reason: string;
    credits: number;
}

interface DegreeProgress {
    totalCredits: number;
    completedCredits: number;
    inProgressCredits: number;
    cgpa: number;
    requirements: Requirement[];
    suggestedCourses: SuggestedCourse[];
}

export function DegreeAuditPage() {
    const { user } = useAuth();
    const [progress, setProgress] = useState<DegreeProgress | null>(null);
    const [loading, setLoading] = useState(true);

    const loadProgress = useCallback(async () => {
        setLoading(true);
        try {
            const data = await services.degreeAuditService.calculateDegreeProgress(user!.id);
            setProgress(data);
        } catch (error) {
            console.error('Error loading degree progress:', error);
        } finally {
            setLoading(false);
        }
    }, [user]);

    useEffect(() => {
        if (user) {
            loadProgress();
        }
    }, [user, loadProgress]);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="text-gray-600">Loading degree progress...</div>
            </div>
        );
    }

    if (!progress) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="text-gray-600">Unable to load degree progress</div>
            </div>
        );
    }

    const completionPercentage = (progress.completedCredits / progress.totalCredits) * 100;
    const onTrack = progress.completedCredits >= 30; // Assuming 30 credits per year

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold text-gray-900">Degree Audit</h1>
                <p className="text-gray-600 mt-1">Track your progress towards graduation</p>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-600">Completed Credits</p>
                            <p className="text-2xl font-bold text-gray-900 mt-1">
                                {progress.completedCredits}
                            </p>
                            <p className="text-xs text-gray-500">of {progress.totalCredits} required</p>
                        </div>
                        <BookOpen className="w-8 h-8 text-blue-600" />
                    </div>
                </Card>

                <Card>
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-600">In Progress</p>
                            <p className="text-2xl font-bold text-gray-900 mt-1">
                                {progress.inProgressCredits}
                            </p>
                            <p className="text-xs text-gray-500">credits</p>
                        </div>
                        <TrendingUp className="w-8 h-8 text-yellow-600" />
                    </div>
                </Card>

                <Card>
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-600">CGPA</p>
                            <p className="text-2xl font-bold text-gray-900 mt-1">
                                {progress.cgpa.toFixed(2)}
                            </p>
                            <p className="text-xs text-gray-500">out of 4.0</p>
                        </div>
                        <Award className="w-8 h-8 text-purple-600" />
                    </div>
                </Card>

                <Card>
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-600">Status</p>
                            <p className={`text-lg font-bold mt-1 ${onTrack ? 'text-green-600' : 'text-yellow-600'}`}>
                                {onTrack ? 'On Track' : 'Behind'}
                            </p>
                            <p className="text-xs text-gray-500">for graduation</p>
                        </div>
                        {onTrack ? (
                            <CheckCircle className="w-8 h-8 text-green-600" />
                        ) : (
                            <AlertTriangle className="w-8 h-8 text-yellow-600" />
                        )}
                    </div>
                </Card>
            </div>

            {/* Progress Circle */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card title="Overall Progress">
                    <div className="flex flex-col items-center py-6">
                        <div style={{ width: 200, height: 200 }}>
                            <CircularProgressbar
                                value={completionPercentage}
                                text={`${completionPercentage.toFixed(0)}%`}
                                styles={buildStyles({
                                    textSize: '16px',
                                    pathColor: completionPercentage >= 75 ? '#10b981' : completionPercentage >= 50 ? '#3b82f6' : '#f59e0b',
                                    textColor: '#111827',
                                    trailColor: '#e5e7eb'
                                })}
                            />
                        </div>
                        <p className="text-sm text-gray-600 mt-4 text-center">
                            {progress.completedCredits} of {progress.totalCredits} credits completed
                        </p>
                    </div>
                </Card>

                {/* Requirements Breakdown */}
                <Card title="Requirements" className="lg:col-span-2">
                    <div className="space-y-4">
                        {progress.requirements.map((req, idx) => {
                            const percentage = req.required > 0 ? ((req.completed + req.inProgress) / req.required) * 100 : 0;
                            const isComplete = req.completed >= req.required;

                            return (
                                <div key={idx}>
                                    <div className="flex items-center justify-between mb-2">
                                        <div>
                                            <span className="font-medium text-gray-900">{req.category}</span>
                                            <span className="text-sm text-gray-600 ml-2">
                                                {req.completed} / {req.required} credits
                                            </span>
                                        </div>
                                        {isComplete && <CheckCircle className="w-5 h-5 text-green-600" />}
                                    </div>

                                    <div className="w-full bg-gray-200 rounded-full h-2.5">
                                        <div
                                            className={`h-2.5 rounded-full ${isComplete ? 'bg-green-600' : percentage >= 50 ? 'bg-blue-600' : 'bg-yellow-600'
                                                }`}
                                            style={{ width: `${Math.min(percentage, 100)}%` }}
                                        />
                                    </div>

                                    <div className="flex items-center justify-between mt-1 text-xs text-gray-600">
                                        <span>Completed: {req.completed}</span>
                                        <span>In Progress: {req.inProgress}</span>
                                        <span>Remaining: {req.remaining}</span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </Card>
            </div>

            {/* Suggested Courses */}
            {progress.suggestedCourses && progress.suggestedCourses.length > 0 && (
                <Card title="Suggested Courses">
                    <div className="space-y-3">
                        {progress.suggestedCourses.map((course, idx) => (
                            <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                <div>
                                    <p className="font-medium text-gray-900">{course.code} - {course.name}</p>
                                    <p className="text-sm text-gray-600">{course.reason}</p>
                                </div>
                                <span className="text-sm font-medium text-gray-700">{course.credits} credits</span>
                            </div>
                        ))}
                    </div>
                </Card>
            )}

            {/* Graduation Timeline */}
            <Card title="Graduation Timeline">
                <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg">
                        <div>
                            <p className="font-medium text-blue-900">Estimated Graduation</p>
                            <p className="text-sm text-blue-700">
                                Based on current progress: {Math.ceil((progress.totalCredits - progress.completedCredits - progress.inProgressCredits) / 15)} semesters remaining
                            </p>
                        </div>
                    </div>

                    {!onTrack && (
                        <div className="flex items-center gap-2 p-4 bg-yellow-50 rounded-lg">
                            <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0" />
                            <div>
                                <p className="font-medium text-yellow-900">Action Required</p>
                                <p className="text-sm text-yellow-700">
                                    You are behind the typical pace. Consider meeting with your advisor to create a catch-up plan.
                                </p>
                            </div>
                        </div>
                    )}
                </div>
            </Card>
        </div>
    );
}
