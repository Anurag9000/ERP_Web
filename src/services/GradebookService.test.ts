import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GradebookService } from './GradebookService';
import { supabase } from '../lib/supabase';

vi.mock('../lib/supabase', () => ({
    supabase: {
        from: vi.fn(),
    },
}));

describe('GradebookService', () => {
    let service: GradebookService;
    let mockAudit: any;

    beforeEach(() => {
        vi.clearAllMocks();
        mockAudit = {
            gradeEdit: vi.fn(),
        };
        service = new GradebookService(mockAudit);
    });

    describe('listSections', () => {
        it('should list sections for an instructor', async () => {
            const mockData = [{ id: 's1', section_number: '101' }];
            const mockChain = {
                select: vi.fn().mockReturnThis(),
                eq: vi.fn().mockReturnThis(),
                order: vi.fn().mockReturnThis(),
                then: vi.fn((cb) => cb({ data: mockData, error: null })),
            };
            (supabase.from as any).mockReturnValue(mockChain);

            const result = await service.listSections('inst-1');
            expect(result).toEqual(mockData);
            expect(supabase.from).toHaveBeenCalledWith('sections');
        });
    });

    describe('fetchSectionData', () => {
        it('should fetch assessments and enrollments', async () => {
            (supabase.from as any).mockImplementation((table: string) => {
                let data: any = [];
                if (table === 'assessments') data = [{ id: 'a1', name: 'Test 1', max_marks: 100, weight: 10 }];
                if (table === 'enrollments') data = [{ student_id: 'st1' }];
                if (table === 'user_profiles') data = [{ id: 'st1', first_name: 'John' }];
                if (table === 'grades') data = [{ assessment_id: 'a1', student_id: 'st1', marks_obtained: 90 }];

                return {
                    select: vi.fn().mockReturnThis(),
                    eq: vi.fn().mockReturnThis(),
                    order: vi.fn().mockReturnThis(),
                    in: vi.fn().mockReturnThis(),
                    then: vi.fn((cb) => cb({ data, error: null })),
                } as any;
            });

            const result = await service.fetchSectionData('s1');
            expect(result.assessments).toHaveLength(1);
            expect(result.students).toHaveLength(1);
            expect(result.rows).toHaveLength(1);
        });
    });
});
