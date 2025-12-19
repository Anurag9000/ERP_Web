import { describe, it, expect, vi, beforeEach } from 'vitest';
import { StudentAttendanceService } from './StudentAttendanceService';
import { supabase } from '../lib/supabase';

vi.mock('../lib/supabase', () => ({
    supabase: {
        from: vi.fn(),
    },
}));

describe('StudentAttendanceService', () => {
    let service: StudentAttendanceService;

    beforeEach(() => {
        vi.clearAllMocks();
        service = new StudentAttendanceService();
    });

    describe('getStudentAttendance', () => {
        it('should calculate attendance percentage correctly', async () => {
            const mockData = [
                {
                    status: 'PRESENT',
                    enrollments: {
                        sections: {
                            courses: { code: 'CS101', name: 'Intro CS' }
                        }
                    }
                },
                {
                    status: 'ABSENT',
                    enrollments: {
                        sections: {
                            courses: { code: 'CS101', name: 'Intro CS' }
                        }
                    }
                },
                {
                    status: 'LATE',
                    enrollments: {
                        sections: {
                            courses: { code: 'CS101', name: 'Intro CS' }
                        }
                    }
                }
            ];
            const mockChain = {
                select: vi.fn().mockReturnThis(),
                eq: vi.fn().mockReturnThis(),
                then: vi.fn((cb) => cb({ data: mockData, error: null }))
            };
            (supabase.from as any).mockReturnValue(mockChain);

            const result = await service.getStudentAttendance('st1');
            expect(result).toHaveLength(1);
            // 2 out of 3 = 66.67%
            expect(result[0].attendancePercentage).toBeCloseTo(66.67, 1);
            // 66.67 >= 65 and < 75 is WARNING
            expect(result[0].status).toBe('WARNING');
        });
    });
});
