
import { useState, useEffect } from 'react';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { Badge } from '../../components/common/Badge';
import { useAuth } from '../../contexts/AuthContext';
import { services } from '../../services/serviceLocator';
import { RegistrationSection } from '../../services/EnrollmentService';
import { Loader2, AlertTriangle, X, Check } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface EnrollmentOverrideModalProps {
    onClose: () => void;
    onSuccess: () => void;
}

export function EnrollmentOverrideModal({ onClose, onSuccess }: EnrollmentOverrideModalProps) {
    const { user } = useAuth();
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [studentSearch, setStudentSearch] = useState('');
    const [sections, setSections] = useState<RegistrationSection[]>([]);
    const [students, setStudents] = useState<{ id: string; email: string; first_name: string; last_name: string; student_id: string }[]>([]);

    const [selectedSection, setSelectedSection] = useState<RegistrationSection | null>(null);
    const [selectedStudent, setSelectedStudent] = useState<string | null>(null);
    const [overrideReason, setOverrideReason] = useState('Administrative Action');
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    // Search Sections
    useEffect(() => {
        if (!searchTerm || searchTerm.length < 3) return;
        const delay = setTimeout(async () => {
            const { data } = await supabase
                .from('sections')
                .select(`
          *,
          courses(id, code, name, credits, level, departments(code, name)),
          rooms(code, name),
          terms(id, name, code, drop_deadline)
        `)
                .textSearch('courses.code', searchTerm) // Simplistic text search, potentially broken OOTB, using simpler filter below
                .limit(10);

            // Fallback manual filter if textSearch isn't configured
            // Re-fetch all active sections? Too heavy. Let's try explicit like
            const { data: fallbackData } = await supabase
                .from('sections')
                .select(`
            *,
            courses!inner(id, code, name, credits, level, departments(code, name)),
            rooms(code, name),
            terms(id, name, code, drop_deadline)
        `)
                .filter('courses.code', 'ilike', `%${searchTerm}%`)
                .limit(10);

            if (fallbackData) setSections(fallbackData as any);
        }, 500);
        return () => clearTimeout(delay);
    }, [searchTerm]);

    // Search Students
    useEffect(() => {
        if (!studentSearch || studentSearch.length < 3) return;
        const delay = setTimeout(async () => {
            const { data } = await supabase
                .from('user_profiles')
                .select('id, email, first_name, last_name, student_id')
                .eq('role', 'STUDENT')
                .ilike('email', `%${studentSearch}%`)
                .limit(5);

            if (data) setStudents(data);
        }, 500);
        return () => clearTimeout(delay);
    }, [studentSearch]);

    async function handleOverride() {
        if (!user || !selectedSection || !selectedStudent) return;
        setLoading(true);
        setMessage(null);
        try {
            await services.enrollmentService.forceEnroll(
                selectedStudent,
                selectedSection,
                user.id,
                overrideReason
            );
            setMessage({ type: 'success', text: 'Student enrolled successfully.' });
            setTimeout(() => {
                onSuccess();
                onClose();
            }, 1500);
        } catch (error: any) {
            console.error('Override failed', error);
            setMessage({ type: 'error', text: error.message || 'Override failed' });
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                    <div>
                        <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                            <AlertTriangle className="w-5 h-5 text-amber-500" />
                            Force Enrollment Override
                        </h2>
                        <p className="text-sm text-gray-500 mt-1">Bypass capacity limits, prerequisites, and holds.</p>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-6 space-y-6">
                    {/* Section Selector */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Find Section (Course Code)</label>
                        <Input
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            placeholder="e.g. CS101"
                        />
                        {sections.length > 0 && (
                            <div className="mt-2 border border-gray-200 rounded-lg divide-y divide-gray-100 max-h-40 overflow-y-auto">
                                {sections.map(sec => (
                                    <div
                                        key={sec.id}
                                        className={`p-3 cursor-pointer hover:bg-blue-50 flex justify-between items-center ${selectedSection?.id === sec.id ? 'bg-blue-50 border-l-4 border-blue-500' : ''}`}
                                        onClick={() => setSelectedSection(sec)}
                                    >
                                        <div>
                                            <p className="font-medium text-sm">{sec.courses.code} - {sec.courses.name}</p>
                                            <p className="text-xs text-gray-500">Sec {sec.section_number} · Cap: {sec.enrolled_count}/{sec.capacity}</p>
                                        </div>
                                        {selectedSection?.id === sec.id && <Check className="w-4 h-4 text-blue-600" />}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Student Selector */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Find Student (Email)</label>
                        <Input
                            value={studentSearch}
                            onChange={e => setStudentSearch(e.target.value)}
                            placeholder="student@university.edu"
                        />
                        {students.length > 0 && (
                            <div className="mt-2 border border-gray-200 rounded-lg divide-y divide-gray-100 max-h-40 overflow-y-auto">
                                {students.map(std => (
                                    <div
                                        key={std.id}
                                        className={`p-3 cursor-pointer hover:bg-blue-50 flex justify-between items-center ${selectedStudent === std.id ? 'bg-blue-50 border-l-4 border-blue-500' : ''}`}
                                        onClick={() => setSelectedStudent(std.id)}
                                    >
                                        <div>
                                            <p className="font-medium text-sm">{std.first_name} {std.last_name}</p>
                                            <p className="text-xs text-gray-500">{std.email} · ID: {std.student_id}</p>
                                        </div>
                                        {selectedStudent === std.id && <Check className="w-4 h-4 text-blue-600" />}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Reason */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Override Reason</label>
                        <Input
                            value={overrideReason}
                            onChange={e => setOverrideReason(e.target.value)}
                        />
                    </div>

                    {message && (
                        <div className={`p-3 rounded-lg text-sm ${message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                            {message.text}
                        </div>
                    )}
                </div>

                <div className="p-6 border-t border-gray-100 bg-gray-50 flex justify-end gap-3 rounded-b-xl">
                    <Button variant="outline" onClick={onClose} disabled={loading}>Cancel</Button>
                    <Button variant="primary" onClick={handleOverride} disabled={loading || !selectedSection || !selectedStudent}>
                        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Confirm Override'}
                    </Button>
                </div>
            </div>
        </div>
    );
}
