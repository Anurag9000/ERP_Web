import { describe, it, expect, vi, beforeEach } from 'vitest';
import { EnhancedAttendanceService } from './EnhancedAttendanceService';
import { supabase } from '../lib/supabase';

vi.mock('../lib/supabase', () => ({
    supabase: {
        from: vi.fn(),
    },
}));

describe('EnhancedAttendanceService', () => {
    let service: EnhancedAttendanceService;

    beforeEach(() => {
        vi.clearAllMocks();
        service = new EnhancedAttendanceService();
    });

    describe('markAllAttendance', () => {
        it('should mark all students present', async () => {
            (supabase.from as any).mockImplementation((table: string) => {
                if (table === 'enrollments') {
                    return {
                        select: vi.fn().mockReturnThis(),
                        eq: vi.fn().mockReturnThis(),
                        then: vi.fn((cb) => cb({ data: [{ id: 'e1', student_id: 'st1' }], error: null }))
                    };
                }
                if (table === 'attendance_records') {
                    return {
                        upsert: vi.fn().mockResolvedValue({ error: null })
                    };
                }
                return {};
            });

            const result = await service.markAllAttendance('s1', new Date(), true);
            expect(result.success).toBe(true);
            expect(result.marked).toBe(1);
            expect(supabase.from).toHaveBeenCalledWith('attendance_records');
        });
    });

    describe('getAttendanceStats', () => {
        it('should calculate attendance rates correctly', async () => {
            const mockData = [
                {
                    status: 'PRESENT',
                    attendance_date: '2023-12-20',
                    enrollments: { user_profiles: { student_id: 'S1', first_name: 'John', last_name: 'Doe' } }
                }
            ];
            const mockChain = {
                select: vi.fn().mockReturnThis(),
                eq: vi.fn().mockReturnThis(),
                then: vi.fn((cb) => cb({ data: mockData, error: null }))
            };
            (supabase.from as any).mockReturnValue(mockChain);

            const result = await service.getAttendanceStats('s1');
            expect(result.totalClasses).toBe(1);
            expect(result.attendanceRate).toBe(100);
        });
    });
});
