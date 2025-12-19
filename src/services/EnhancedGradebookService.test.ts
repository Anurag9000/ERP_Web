import { describe, it, expect, vi, beforeEach } from 'vitest';
import { EnhancedGradebookService } from './EnhancedGradebookService';
import { supabase } from '../lib/supabase';

vi.mock('../lib/supabase', () => ({
    supabase: {
        from: vi.fn(),
    },
}));

describe('EnhancedGradebookService', () => {
    let service: EnhancedGradebookService;

    beforeEach(() => {
        vi.clearAllMocks();
        service = new EnhancedGradebookService();
    });

    describe('createAssessment', () => {
        it('should create assessment successfully', async () => {
            const mockChain = {
                insert: vi.fn().mockReturnThis(),
                select: vi.fn().mockReturnThis(),
                single: vi.fn().mockResolvedValue({ data: { id: 'a1' }, error: null })
            };
            (supabase.from as any).mockReturnValue(mockChain);

            const result = await service.createAssessment('s1', 'Exam', 'FINAL', 100, new Date());
            expect(result.success).toBe(true);
            expect(result.assessmentId).toBe('a1');
        });
    });

    describe('calculateFinalGrades', () => {
        it('should calculate and update letter grades', async () => {
            (supabase.from as any).mockImplementation((table: string) => {
                if (table === 'enrollments') {
                    const mockChain = {
                        select: vi.fn().mockReturnThis(),
                        eq: vi.fn().mockReturnThis(),
                        update: vi.fn().mockReturnThis(),
                        then: vi.fn((cb) => cb({
                            data: [
                                {
                                    id: 'e1',
                                    grades: [{ marks_obtained: 85, assessments: { max_marks: 100 } }]
                                }
                            ], error: null
                        }))
                    };
                    return mockChain;
                }
                return {};
            });

            const result = await service.calculateFinalGrades('s1');
            expect(result.success).toBe(true);
            expect(supabase.from).toHaveBeenCalledWith('enrollments');
        });
    });
});
