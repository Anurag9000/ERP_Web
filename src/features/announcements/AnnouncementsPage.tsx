import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { services } from '../../services/serviceLocator';
import {
    Megaphone,
    Calendar as CalendarIcon,
    Filter,
    Plus,
    AlertCircle
} from 'lucide-react';
import type { Announcement } from '../../services/AnnouncementService';

const CATEGORIES = ['ACADEMIC', 'EVENT', 'CLUB', 'DEPARTMENT', 'GENERAL'];

export function AnnouncementsPage() {
    const { user, profile } = useAuth();
    const [announcements, setAnnouncements] = useState<Announcement[]>([]);
    const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);
    const [showCreateModal, setShowCreateModal] = useState(false);

    useEffect(() => {
        if (user) {
            loadAnnouncements();
        }
    }, [user, selectedCategories]);

    async function loadAnnouncements() {
        setLoading(true);
        try {
            const data = await services.announcementService.fetchAnnouncements(
                user!.id,
                selectedCategories.length > 0 ? selectedCategories : undefined
            );
            setAnnouncements(data);
        } catch (error) {
            console.error('Error loading announcements:', error);
        } finally {
            setLoading(false);
        }
    }

    function toggleCategory(category: string) {
        setSelectedCategories(prev =>
            prev.includes(category)
                ? prev.filter(c => c !== category)
                : [...prev, category]
        );
    }

    async function handleAddToCalendar(announcementId: string) {
        try {
            await services.announcementService.addToCalendar(user!.id, announcementId);
            alert('Added to calendar!');
        } catch (error) {
            console.error('Error adding to calendar:', error);
        }
    }

    function getPriorityBadge(priority: string) {
        const colors = {
            HIGH: 'bg-red-100 text-red-800',
            NORMAL: 'bg-blue-100 text-blue-800',
            LOW: 'bg-gray-100 text-gray-800'
        };
        return colors[priority as keyof typeof colors] || colors.NORMAL;
    }

    function getCategoryColor(category: string) {
        const colors = {
            ACADEMIC: 'bg-purple-100 text-purple-800',
            EVENT: 'bg-green-100 text-green-800',
            CLUB: 'bg-yellow-100 text-yellow-800',
            DEPARTMENT: 'bg-blue-100 text-blue-800',
            GENERAL: 'bg-gray-100 text-gray-800'
        };
        return colors[category as keyof typeof colors] || colors.GENERAL;
    }

    const isAdmin = profile?.role === 'ADMIN' || profile?.role === 'INSTRUCTOR';

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Announcements</h1>
                    <p className="text-gray-600 mt-1">Stay updated with latest news and events</p>
                </div>

                {isAdmin && (
                    <Button onClick={() => setShowCreateModal(true)}>
                        <Plus className="w-4 h-4 mr-2" />
                        New Announcement
                    </Button>
                )}
            </div>

            {/* Filters */}
            <Card>
                <div className="flex items-center gap-2 flex-wrap">
                    <Filter className="w-5 h-5 text-gray-400" />
                    <span className="text-sm font-medium text-gray-700">Filter by:</span>
                    {CATEGORIES.map(category => (
                        <button
                            key={category}
                            onClick={() => toggleCategory(category)}
                            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${selectedCategories.includes(category)
                                    ? 'bg-blue-600 text-white'
                                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                }`}
                        >
                            {category}
                        </button>
                    ))}
                    {selectedCategories.length > 0 && (
                        <button
                            onClick={() => setSelectedCategories([])}
                            className="text-xs text-blue-600 hover:text-blue-800"
                        >
                            Clear all
                        </button>
                    )}
                </div>
            </Card>

            {/* Announcements List */}
            <div className="space-y-4">
                {loading ? (
                    <Card>
                        <p className="text-center text-gray-500 py-8">Loading announcements...</p>
                    </Card>
                ) : announcements.length === 0 ? (
                    <Card>
                        <p className="text-center text-gray-500 py-8">No announcements found</p>
                    </Card>
                ) : (
                    announcements.map(announcement => (
                        <Card key={announcement.id}>
                            <div className="flex items-start gap-4">
                                <div className="flex-shrink-0">
                                    <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                                        <Megaphone className="w-6 h-6 text-blue-600" />
                                    </div>
                                </div>

                                <div className="flex-1 min-w-0">
                                    <div className="flex items-start justify-between gap-4">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-2">
                                                <h3 className="text-lg font-semibold text-gray-900">
                                                    {announcement.title}
                                                </h3>
                                                <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${getPriorityBadge(announcement.priority)}`}>
                                                    {announcement.priority}
                                                </span>
                                            </div>

                                            <p className="text-gray-700 mb-3 whitespace-pre-wrap">
                                                {announcement.message}
                                            </p>

                                            <div className="flex items-center gap-3 text-sm text-gray-500">
                                                <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${getCategoryColor(announcement.category)}`}>
                                                    {announcement.category}
                                                </span>
                                                <span>•</span>
                                                <span>{announcement.publishedAt.toLocaleDateString()}</span>
                                                {announcement.expiresAt && (
                                                    <>
                                                        <span>•</span>
                                                        <span className="flex items-center gap-1">
                                                            <AlertCircle className="w-3 h-3" />
                                                            Expires: {announcement.expiresAt.toLocaleDateString()}
                                                        </span>
                                                    </>
                                                )}
                                            </div>
                                        </div>

                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => handleAddToCalendar(announcement.id)}
                                        >
                                            <CalendarIcon className="w-4 h-4 mr-2" />
                                            Add to Calendar
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        </Card>
                    ))
                )}
            </div>

            {/* Create Modal (simplified - would be a proper modal component) */}
            {showCreateModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <Card className="max-w-2xl w-full m-4">
                        <h2 className="text-xl font-bold text-gray-900 mb-4">Create Announcement</h2>
                        <p className="text-gray-600 mb-4">
                            This would be a full form to create announcements. Implementation pending.
                        </p>
                        <Button onClick={() => setShowCreateModal(false)}>Close</Button>
                    </Card>
                </div>
            )}
        </div>
    );
}
