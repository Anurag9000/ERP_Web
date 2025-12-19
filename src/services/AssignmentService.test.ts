import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AssignmentService } from './AssignmentService';
import { supabase } from '../lib/supabase';

vi.mock('../lib/supabase', () => ({
    supabase: {
        from: vi.fn(),
    },
}));

describe('AssignmentService', () => {
    let service: AssignmentService;

    beforeEach(() => {
        vi.clearAllMocks();
        service = new AssignmentService();
    });

    describe('fetchStudentAssignments', () => {
        it('should fetch and format student assignments', async () => {
            const mockData = [
                {
                    id: 'a1',
                    name: 'Project 1',
                    due_date: '2023-12-31T23:59:59',
                    sections: {
                        section_number: '101',
                        courses: { code: 'CS101', name: 'Intro CS' },
                        enrollments: [{ student_id: 'st1', grades: [{ submitted_at: '2023-12-20' }] }]
                    }
                }
            ];
            const mockChain = {
                select: vi.fn().mockReturnThis(),
                eq: vi.fn().mockReturnThis(),
                order: vi.fn().mockReturnThis(),
                then: vi.fn((cb) => cb({ data: mockData, error: null })),
            };
            (supabase.from as any).mockReturnValue(mockChain);

            const result = await service.fetchStudentAssignments('st1');
            expect(result).toHaveLength(1);
            expect(result[0].name).toBe('Project 1');
            expect(result[0].submitted).toBe(true);
        });
    });

    describe('submitAssignment', () => {
        it('should record assignment submission', async () => {
            (supabase.from as any).mockImplementation((table: string) => {
                if (table === 'enrollments') {
                    return {
                        select: vi.fn().mockReturnThis(),
                        eq: vi.fn().mockReturnThis(),
                        single: vi.fn().mockResolvedValue({ data: { id: 'e1' }, error: null })
                    };
                }
                if (table === 'grades') {
                    return {
                        upsert: vi.fn().mockResolvedValue({ error: null })
                    };
                }
                return {};
            });

            const result = await service.submitAssignment('a1', 'st1', new File([], 'test.pdf'));
            expect(result.success).toBe(true);
        });
    });
});
