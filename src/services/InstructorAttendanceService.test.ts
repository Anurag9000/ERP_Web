import { describe, it, expect, vi, beforeEach } from 'vitest';
import { InstructorAttendanceService } from './InstructorAttendanceService';
import { supabase } from '../lib/supabase';

vi.mock('../lib/supabase', () => ({
    supabase: {
        from: vi.fn(),
    },
}));

describe('InstructorAttendanceService', () => {
    let service: InstructorAttendanceService;

    beforeEach(() => {
        vi.clearAllMocks();
        service = new InstructorAttendanceService();
    });

    describe('fetchSections', () => {
        it('should fetch teaching sections', async () => {
            const mockData = [{ id: 's1', courses: { code: 'CS101' }, terms: { name: 'Fall 2023' } }];
            const mockChain = {
                select: vi.fn().mockReturnThis(),
                eq: vi.fn().mockReturnThis(),
                order: vi.fn().mockReturnThis(),
                then: vi.fn((cb) => cb({ data: mockData, error: null }))
            };
            (supabase.from as any).mockReturnValue(mockChain);

            const result = await service.fetchSections('inst1');
            expect(result).toHaveLength(1);
            expect(result[0].courseCode).toBe('CS101');
        });
    });

    describe('saveAttendance', () => {
        it('should upsert attendance records', async () => {
            const mockChain = {
                upsert: vi.fn().mockResolvedValue({ error: null })
            };
            (supabase.from as any).mockReturnValue(mockChain);

            await service.saveAttendance('s1', '2023-12-20', [{ studentId: 'st1', status: 'PRESENT', minutesLate: 0, notes: null }]);
            expect(supabase.from).toHaveBeenCalledWith('attendance_records');
        });
    });
});
