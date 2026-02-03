import { useState } from 'react';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { useAuth } from '../../contexts/AuthContext';
import { services } from '../../services/serviceLocator';
import {
    Megaphone,
    Send,
    Users,
    AlertCircle
} from 'lucide-react';

export function BroadcastAnnouncementPage() {
    useAuth();
    const [title, setTitle] = useState('');
    const [message, setMessage] = useState('');
    const [category, setCategory] = useState<'ACADEMIC' | 'EVENT' | 'CLUB' | 'DEPARTMENT' | 'GENERAL'>('GENERAL');
    const [priority, setPriority] = useState<'LOW' | 'NORMAL' | 'HIGH'>('NORMAL');
    const [targetAudience, setTargetAudience] = useState<'ALL' | 'STUDENTS' | 'INSTRUCTORS' | 'STAFF'>('ALL');
    const [expiresAt, setExpiresAt] = useState('');
    const [sending, setSending] = useState(false);
    const [result, setResult] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    async function handleBroadcast() {
        if (!title || !message) {
            setResult({ type: 'error', text: 'Please fill in all required fields' });
            return;
        }

        setSending(true);
        setResult(null);

        try {
            // Get current user ID (admin)
            const userId = 'admin-user-id'; // Would come from auth context

            const announcement = {
                title,
                message,
                category,
                priority,
                targetAudience,
                expiresAt: expiresAt ? new Date(expiresAt) : undefined
            };

            // Create announcement
            await services.announcementService.createAnnouncement(userId, announcement);

            setResult({ type: 'success', text: 'Announcement broadcast successfully!' });

            // Reset form
            setTitle('');
            setMessage('');
            setCategory('GENERAL');
            setPriority('NORMAL');
            setTargetAudience('ALL');
            setExpiresAt('');
        } catch (error: any) {
            setResult({ type: 'error', text: error.message || 'Failed to broadcast announcement' });
        } finally {
            setSending(false);
        }
    }

    function getAudienceCount() {
        const counts = {
            ALL: '1,234',
            STUDENTS: '1,000',
            INSTRUCTORS: '150',
            STAFF: '84'
        };
        return counts[targetAudience];
    }

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <div>
                <h1 className="text-3xl font-bold text-gray-900">Broadcast Announcement</h1>
                <p className="text-gray-600 mt-1">Send system-wide announcements to users</p>
            </div>

            <Card>
                <div className="space-y-6">
                    {/* Result Message */}
                    {result && (
                        <div
                            className={`rounded-lg px-4 py-3 ${result.type === 'success'
                                ? 'bg-green-50 border border-green-200 text-green-800'
                                : 'bg-red-50 border border-red-200 text-red-800'
                                }`}
                        >
                            {result.text}
                        </div>
                    )}

                    {/* Title */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Title <span className="text-red-600">*</span>
                        </label>
                        <input
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                            placeholder="e.g., Important: Exam Schedule Update"
                        />
                    </div>

                    {/* Message */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Message <span className="text-red-600">*</span>
                        </label>
                        <textarea
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            rows={6}
                            className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                            placeholder="Enter your announcement message..."
                        />
                        <p className="text-sm text-gray-500 mt-1">{message.length} characters</p>
                    </div>

                    {/* Category and Priority */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
                            <select
                                value={category}
                                onChange={(e) => setCategory(e.target.value as any)}
                                className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                            >
                                <option value="GENERAL">General</option>
                                <option value="ACADEMIC">Academic</option>
                                <option value="EVENT">Event</option>
                                <option value="CLUB">Club</option>
                                <option value="DEPARTMENT">Department</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Priority</label>
                            <select
                                value={priority}
                                onChange={(e) => setPriority(e.target.value as any)}
                                className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                            >
                                <option value="LOW">Low</option>
                                <option value="NORMAL">Normal</option>
                                <option value="HIGH">High</option>
                            </select>
                        </div>
                    </div>

                    {/* Target Audience */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Target Audience</label>
                        <select
                            value={targetAudience}
                            onChange={(e) => setTargetAudience(e.target.value as any)}
                            className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                        >
                            <option value="ALL">All Users</option>
                            <option value="STUDENTS">Students Only</option>
                            <option value="INSTRUCTORS">Instructors Only</option>
                            <option value="STAFF">Staff Only</option>
                        </select>
                        <div className="flex items-center gap-2 mt-2 text-sm text-gray-600">
                            <Users className="w-4 h-4" />
                            <span>Estimated reach: {getAudienceCount()} users</span>
                        </div>
                    </div>

                    {/* Expiration Date */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Expiration Date (Optional)
                        </label>
                        <input
                            type="datetime-local"
                            value={expiresAt}
                            onChange={(e) => setExpiresAt(e.target.value)}
                            min={new Date().toISOString().slice(0, 16)}
                            className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                        />
                        <p className="text-sm text-gray-500 mt-1">
                            Leave empty for no expiration
                        </p>
                    </div>

                    {/* Warning */}
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                        <div className="flex items-start gap-2">
                            <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                            <div className="text-sm text-yellow-800">
                                <p className="font-medium">Important</p>
                                <p className="mt-1">
                                    This announcement will be sent to {getAudienceCount()} users. Please review carefully before broadcasting.
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3">
                        <Button
                            onClick={handleBroadcast}
                            disabled={sending || !title || !message}
                            className="flex-1"
                        >
                            <Send className="w-4 h-4 mr-2" />
                            {sending ? 'Broadcasting...' : 'Broadcast Announcement'}
                        </Button>
                        <Button
                            variant="outline"
                            onClick={() => {
                                setTitle('');
                                setMessage('');
                                setCategory('GENERAL');
                                setPriority('NORMAL');
                                setTargetAudience('ALL');
                                setExpiresAt('');
                                setResult(null);
                            }}
                        >
                            Clear
                        </Button>
                    </div>
                </div>
            </Card>

            {/* Preview */}
            {(title || message) && (
                <Card title="Preview">
                    <div className="space-y-3">
                        <div className="flex items-center gap-2">
                            <Megaphone className="w-5 h-5 text-blue-600" />
                            <h3 className="font-semibold text-gray-900">{title || 'Announcement Title'}</h3>
                            <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${priority === 'HIGH' ? 'bg-red-100 text-red-800' :
                                priority === 'NORMAL' ? 'bg-blue-100 text-blue-800' :
                                    'bg-gray-100 text-gray-800'
                                }`}>
                                {priority}
                            </span>
                        </div>
                        <p className="text-gray-700 whitespace-pre-wrap">
                            {message || 'Your announcement message will appear here...'}
                        </p>
                        <div className="flex items-center gap-3 text-sm text-gray-500">
                            <span className="inline-flex px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                                {category}
                            </span>
                            <span>•</span>
                            <span>To: {targetAudience}</span>
                            {expiresAt && (
                                <>
                                    <span>•</span>
                                    <span>Expires: {new Date(expiresAt).toLocaleDateString()}</span>
                                </>
                            )}
                        </div>
                    </div>
                </Card>
            )}
        </div>
    );
}
