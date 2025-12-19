import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ExaminationService } from './ExaminationService';
import { supabase } from '../lib/supabase';

vi.mock('../lib/supabase', () => ({
    supabase: {
        from: vi.fn(),
    },
}));

describe('ExaminationService', () => {
    let service: ExaminationService;

    beforeEach(() => {
        vi.clearAllMocks();
        service = new ExaminationService();
    });

    describe('submitExamForm', () => {
        it('should submit exam form successfully', async () => {
            const mockChain = {
                insert: vi.fn().mockResolvedValue({ error: null })
            };
            (supabase.from as any).mockReturnValue(mockChain);

            const result = await service.submitExamForm('st1', 't1');
            expect(result.success).toBe(true);
            expect(supabase.from).toHaveBeenCalledWith('exam_forms');
        });
    });

    describe('generateAdmitCard', () => {
        it('should generate admit card with exam schedule', async () => {
            (supabase.from as any).mockImplementation((table: string) => {
                if (table === 'user_profiles') {
                    return {
                        select: vi.fn().mockReturnThis(),
                        eq: vi.fn().mockReturnThis(),
                        single: vi.fn().mockResolvedValue({ data: { student_id: 'S123', first_name: 'John', last_name: 'Doe' }, error: null })
                    };
                }
                if (table === 'enrollments') {
                    return {
                        select: vi.fn().mockReturnThis(),
                        eq: vi.fn().mockReturnThis(),
                        then: vi.fn((cb) => cb({
                            data: [
                                {
                                    sections: {
                                        courses: { code: 'CS101', name: 'Intro CS' },
                                        assessments: [{ assessment_type: 'EXAM', due_date: '2023-12-25T10:00:00' }]
                                    }
                                }
                            ], error: null
                        }))
                    };
                }
                return {};
            });

            const result = await service.generateAdmitCard('st1', 't1');
            expect(result).not.toBeNull();
            expect(result?.studentName).toBe('John Doe');
            expect(result?.courses).toHaveLength(1);
            expect(result?.courses[0].code).toBe('CS101');
        });
    });
});
