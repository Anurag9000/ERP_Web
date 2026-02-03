import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Card } from '../../components/common/Card';
import { Bell, BellOff } from 'lucide-react';

const CATEGORIES = [
    { id: 'ACADEMIC', label: 'Academic', description: 'Course updates, deadlines, grades' },
    { id: 'ASSIGNMENTS', label: 'Assignments', description: 'Assignment due dates and submissions' },
    { id: 'EXAMS', label: 'Examinations', description: 'Exam schedules and results' },
    { id: 'FINANCIAL', label: 'Financial', description: 'Fee payments and financial updates' },
    { id: 'EVENTS', label: 'Events', description: 'Campus events and activities' },
    { id: 'SYSTEM', label: 'System', description: 'System maintenance and updates' }
];

const DIGEST_FREQUENCIES = [
    { value: 'instant', label: 'Instant', description: 'Receive notifications immediately' },
    { value: 'daily', label: 'Daily Digest', description: 'Once per day summary' },
    { value: 'weekly', label: 'Weekly Digest', description: 'Once per week summary' }
];

export function NotificationSettingsPage() {
    useAuth();
    const [preferences, setPreferences] = useState<{ [key: string]: boolean }>({});
    const [digestFrequency, setDigestFrequency] = useState('instant');
    const [emailEnabled, setEmailEnabled] = useState(true);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadPreferences();
    }, []);

    async function loadPreferences() {
        // Load from localStorage for now (would be from backend in production)
        const saved = localStorage.getItem('notificationPreferences');
        if (saved) {
            const data = JSON.parse(saved);
            setPreferences(data.categories || {});
            setDigestFrequency(data.digestFrequency || 'instant');
            setEmailEnabled(data.emailEnabled !== false);
        } else {
            // Default: all enabled
            const defaults: { [key: string]: boolean } = {};
            CATEGORIES.forEach(cat => {
                defaults[cat.id] = true;
            });
            setPreferences(defaults);
        }
        setLoading(false);
    }

    function toggleCategory(categoryId: string) {
        const newPreferences = {
            ...preferences,
            [categoryId]: !preferences[categoryId]
        };
        setPreferences(newPreferences);
        savePreferences(newPreferences);
    }

    function savePreferences(prefs: any) {
        const data = {
            categories: prefs,
            digestFrequency,
            emailEnabled
        };
        localStorage.setItem('notificationPreferences', JSON.stringify(data));
    }

    function handleDigestChange(frequency: string) {
        setDigestFrequency(frequency);
        savePreferences(preferences);
    }

    function handleEmailToggle() {
        const newValue = !emailEnabled;
        setEmailEnabled(newValue);
        savePreferences(preferences);
    }

    if (loading) {
        return <div className="flex items-center justify-center h-64">Loading...</div>;
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold text-gray-900">Notification Settings</h1>
                <p className="text-gray-600 mt-1">Manage how and when you receive notifications</p>
            </div>

            {/* Digest Frequency */}
            <Card title="Notification Frequency">
                <div className="space-y-3">
                    {DIGEST_FREQUENCIES.map(freq => (
                        <label
                            key={freq.value}
                            className="flex items-start gap-3 p-3 rounded-lg border-2 cursor-pointer transition-colors hover:bg-gray-50"
                            style={{
                                borderColor: digestFrequency === freq.value ? '#3b82f6' : '#e5e7eb'
                            }}
                        >
                            <input
                                type="radio"
                                name="digest"
                                value={freq.value}
                                checked={digestFrequency === freq.value}
                                onChange={(e) => handleDigestChange(e.target.value)}
                                className="mt-1"
                            />
                            <div className="flex-1">
                                <p className="font-medium text-gray-900">{freq.label}</p>
                                <p className="text-sm text-gray-600">{freq.description}</p>
                            </div>
                        </label>
                    ))}
                </div>
            </Card>

            {/* Category Preferences */}
            <Card title="Notification Categories">
                <div className="space-y-3">
                    {CATEGORIES.map(category => {
                        const isEnabled = preferences[category.id] !== false;

                        return (
                            <div
                                key={category.id}
                                className="flex items-start justify-between p-4 rounded-lg bg-gray-50"
                            >
                                <div className="flex items-start gap-3 flex-1">
                                    {isEnabled ? (
                                        <Bell className="w-5 h-5 text-blue-600 mt-0.5" />
                                    ) : (
                                        <BellOff className="w-5 h-5 text-gray-400 mt-0.5" />
                                    )}
                                    <div>
                                        <p className="font-medium text-gray-900">{category.label}</p>
                                        <p className="text-sm text-gray-600">{category.description}</p>
                                    </div>
                                </div>

                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input
                                        type="checkbox"
                                        className="sr-only peer"
                                        checked={isEnabled}
                                        onChange={() => toggleCategory(category.id)}
                                    />
                                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                                </label>
                            </div>
                        );
                    })}
                </div>
            </Card>

            {/* Email Notifications */}
            <Card title="Email Notifications">
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div>
                        <p className="font-medium text-gray-900">Email Notifications</p>
                        <p className="text-sm text-gray-600">Receive notifications via email</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                        <input
                            type="checkbox"
                            className="sr-only peer"
                            checked={emailEnabled}
                            onChange={handleEmailToggle}
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                </div>
            </Card>

            {/* Save Confirmation */}
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <p className="text-sm text-green-800">
                    ✓ Your notification preferences are saved automatically
                </p>
            </div>
        </div>
    );
}
