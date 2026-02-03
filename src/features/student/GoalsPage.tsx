import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { services } from '../../services/serviceLocator';
import {
    Target,
    Plus,
    CheckCircle,
    Circle,
    TrendingUp,
    Calendar,
    Trash2
} from 'lucide-react';
import type { LearningGoal } from '../../services/LearningGoalsService';

interface GoalStatistics {
    total: number;
    completed: number;
    inProgress: number;
    averageProgress: number;
}

export function GoalsPage() {
    const { user } = useAuth();
    const [goals, setGoals] = useState<LearningGoal[]>([]);
    const [stats, setStats] = useState<GoalStatistics | null>(null);
    const [loading, setLoading] = useState(true);
    const [showCreateModal, setShowCreateModal] = useState(false);

    // Form state
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [category, setCategory] = useState<'ACADEMIC' | 'SKILL' | 'CAREER' | 'PERSONAL'>('ACADEMIC');
    const [targetDate, setTargetDate] = useState('');
    const [milestones, setMilestones] = useState<string[]>(['']);

    const loadGoals = useCallback(async () => {
        setLoading(true);
        try {
            const [goalsData, statsData] = await Promise.all([
                services.learningGoalsService.getStudentGoals(user!.id),
                services.learningGoalsService.getGoalStatistics(user!.id)
            ]);
            setGoals(goalsData);
            setStats(statsData);
        } catch (error) {
            console.error('Error loading goals:', error);
        } finally {
            setLoading(false);
        }
    }, [user]);

    useEffect(() => {
        if (user) {
            loadGoals();
        }
    }, [user, loadGoals]);

    async function handleCreateGoal() {
        if (!title || !targetDate) return;

        const result = await services.learningGoalsService.createGoal(
            user!.id,
            title,
            description,
            category,
            new Date(targetDate),
            milestones.filter(m => m.trim() !== '')
        );

        if (result.success) {
            setShowCreateModal(false);
            resetForm();
            loadGoals();
        }
    }

    async function handleToggleMilestone(milestoneId: string, completed: boolean) {
        await services.learningGoalsService.toggleMilestone(milestoneId, !completed);
        loadGoals();
    }

    async function handleDeleteGoal(goalId: string) {
        if (confirm('Are you sure you want to delete this goal?')) {
            await services.learningGoalsService.deleteGoal(goalId);
            loadGoals();
        }
    }

    function resetForm() {
        setTitle('');
        setDescription('');
        setCategory('ACADEMIC');
        setTargetDate('');
        setMilestones(['']);
    }

    function addMilestone() {
        setMilestones([...milestones, '']);
    }

    function updateMilestone(index: number, value: string) {
        const updated = [...milestones];
        updated[index] = value;
        setMilestones(updated);
    }

    function removeMilestone(index: number) {
        setMilestones(milestones.filter((_, i) => i !== index));
    }

    function getCategoryColor(cat: string) {
        const colors = {
            ACADEMIC: 'bg-blue-100 text-blue-800',
            SKILL: 'bg-purple-100 text-purple-800',
            CAREER: 'bg-green-100 text-green-800',
            PERSONAL: 'bg-yellow-100 text-yellow-800'
        };
        return colors[cat as keyof typeof colors] || colors.ACADEMIC;
    }

    function getStatusColor(status: string) {
        const colors = {
            COMPLETED: 'text-green-600',
            IN_PROGRESS: 'text-blue-600',
            NOT_STARTED: 'text-gray-600',
            ABANDONED: 'text-red-600'
        };
        return colors[status as keyof typeof colors] || colors.NOT_STARTED;
    }

    if (loading) {
        return <div className="flex items-center justify-center h-64">Loading goals...</div>;
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Learning Goals</h1>
                    <p className="text-gray-600 mt-1">Track your personal and academic goals</p>
                </div>
                <Button onClick={() => setShowCreateModal(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    New Goal
                </Button>
            </div>

            {/* Statistics */}
            {stats && (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <Card>
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-600">Total Goals</p>
                                <p className="text-2xl font-bold text-gray-900 mt-1">{stats.total}</p>
                            </div>
                            <Target className="w-8 h-8 text-blue-600" />
                        </div>
                    </Card>

                    <Card>
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-600">Completed</p>
                                <p className="text-2xl font-bold text-gray-900 mt-1">{stats.completed}</p>
                            </div>
                            <CheckCircle className="w-8 h-8 text-green-600" />
                        </div>
                    </Card>

                    <Card>
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-600">In Progress</p>
                                <p className="text-2xl font-bold text-gray-900 mt-1">{stats.inProgress}</p>
                            </div>
                            <TrendingUp className="w-8 h-8 text-purple-600" />
                        </div>
                    </Card>

                    <Card>
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-600">Avg Progress</p>
                                <p className="text-2xl font-bold text-gray-900 mt-1">{stats.averageProgress}%</p>
                            </div>
                            <Circle className="w-8 h-8 text-yellow-600" />
                        </div>
                    </Card>
                </div>
            )}

            {/* Goals List */}
            <div className="space-y-4">
                {goals.length === 0 ? (
                    <Card>
                        <div className="text-center py-12">
                            <Target className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                            <p className="text-gray-600 mb-4">No goals yet. Create your first goal to get started!</p>
                            <Button onClick={() => setShowCreateModal(true)}>
                                <Plus className="w-4 h-4 mr-2" />
                                Create Goal
                            </Button>
                        </div>
                    </Card>
                ) : (
                    goals.map(goal => (
                        <Card key={goal.id}>
                            <div className="space-y-4">
                                {/* Header */}
                                <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-2">
                                            <h3 className="text-lg font-semibold text-gray-900">{goal.title}</h3>
                                            <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${getCategoryColor(goal.category)}`}>
                                                {goal.category}
                                            </span>
                                        </div>
                                        <p className="text-gray-700 text-sm">{goal.description}</p>
                                    </div>

                                    <button
                                        onClick={() => handleDeleteGoal(goal.id)}
                                        className="text-red-600 hover:text-red-800"
                                    >
                                        <Trash2 className="w-5 h-5" />
                                    </button>
                                </div>

                                {/* Progress Bar */}
                                <div>
                                    <div className="flex items-center justify-between mb-2">
                                        <span className={`text-sm font-medium ${getStatusColor(goal.status)}`}>
                                            {goal.status.replace('_', ' ')}
                                        </span>
                                        <span className="text-sm text-gray-600">{goal.progress}%</span>
                                    </div>
                                    <div className="w-full bg-gray-200 rounded-full h-2">
                                        <div
                                            className="bg-blue-600 h-2 rounded-full transition-all"
                                            style={{ width: `${goal.progress}%` }}
                                        />
                                    </div>
                                </div>

                                {/* Milestones */}
                                {goal.milestones.length > 0 && (
                                    <div>
                                        <p className="text-sm font-medium text-gray-700 mb-2">Milestones:</p>
                                        <div className="space-y-2">
                                            {goal.milestones.map(milestone => (
                                                <button
                                                    key={milestone.id}
                                                    onClick={() => handleToggleMilestone(milestone.id, milestone.completed)}
                                                    className="flex items-center gap-2 w-full text-left hover:bg-gray-50 p-2 rounded"
                                                >
                                                    {milestone.completed ? (
                                                        <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                                                    ) : (
                                                        <Circle className="w-5 h-5 text-gray-400 flex-shrink-0" />
                                                    )}
                                                    <span className={milestone.completed ? 'line-through text-gray-500' : 'text-gray-900'}>
                                                        {milestone.title}
                                                    </span>
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Target Date */}
                                <div className="flex items-center gap-2 text-sm text-gray-600">
                                    <Calendar className="w-4 h-4" />
                                    <span>Target: {goal.targetDate.toLocaleDateString()}</span>
                                </div>
                            </div>
                        </Card>
                    ))
                )}
            </div>

            {/* Create Modal */}
            {showCreateModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <Card className="max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                        <h2 className="text-xl font-bold text-gray-900 mb-4">Create New Goal</h2>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Title</label>
                                <input
                                    type="text"
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                                    placeholder="e.g., Master React Development"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                                <textarea
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    rows={3}
                                    className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                                    placeholder="Describe your goal..."
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
                                    <select
                                        value={category}
                                        onChange={(e) => setCategory(e.target.value as 'ACADEMIC' | 'SKILL' | 'CAREER' | 'PERSONAL')}
                                        className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                                    >
                                        <option value="ACADEMIC">Academic</option>
                                        <option value="SKILL">Skill Development</option>
                                        <option value="CAREER">Career</option>
                                        <option value="PERSONAL">Personal</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Target Date</label>
                                    <input
                                        type="date"
                                        value={targetDate}
                                        onChange={(e) => setTargetDate(e.target.value)}
                                        min={new Date().toISOString().split('T')[0]}
                                        className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Milestones</label>
                                <div className="space-y-2">
                                    {milestones.map((milestone, index) => (
                                        <div key={index} className="flex gap-2">
                                            <input
                                                type="text"
                                                value={milestone}
                                                onChange={(e) => updateMilestone(index, e.target.value)}
                                                className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                                                placeholder={`Milestone ${index + 1}`}
                                            />
                                            {milestones.length > 1 && (
                                                <button
                                                    onClick={() => removeMilestone(index)}
                                                    className="text-red-600 hover:text-red-800"
                                                >
                                                    <Trash2 className="w-5 h-5" />
                                                </button>
                                            )}
                                        </div>
                                    ))}
                                    <Button variant="outline" size="sm" onClick={addMilestone}>
                                        <Plus className="w-4 h-4 mr-2" />
                                        Add Milestone
                                    </Button>
                                </div>
                            </div>
                        </div>

                        <div className="flex gap-2 mt-6">
                            <Button onClick={handleCreateGoal} className="flex-1">
                                Create Goal
                            </Button>
                            <Button
                                variant="outline"
                                onClick={() => {
                                    setShowCreateModal(false);
                                    resetForm();
                                }}
                            >
                                Cancel
                            </Button>
                        </div>
                    </Card>
                </div>
            )}
        </div>
    );
}
