import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ReportingService } from './ReportingService';
import { supabase } from '../lib/supabase';

vi.mock('../lib/supabase', () => ({
    supabase: {
        from: vi.fn(),
    },
}));

describe('ReportingService', () => {
    let service: ReportingService;

    beforeEach(() => {
        vi.clearAllMocks();
        service = new ReportingService();
    });

    describe('getEnrollmentTrends', () => {
        it('should aggregate enrollment data by term and department', async () => {
            const mockData = [
                {
                    enrolled_count: 20,
                    capacity: 30,
                    terms: { name: 'Fall 2023' },
                    courses: { departments: { name: 'CS' } }
                }
            ];
            const mockChain = {
                select: vi.fn().mockReturnThis(),
                eq: vi.fn().mockReturnThis(),
                then: vi.fn((cb) => cb({ data: mockData, error: null })),
            };
            (supabase.from as any).mockReturnValue(mockChain);

            const result = await service.getEnrollmentTrends();
            expect(result).toHaveLength(1);
            expect(result[0].utilizationRate).toBeCloseTo(66.67, 1);
        });
    });

    describe('getAttendanceCompliance', () => {
        it('should calculate attendance rates correctly using status field', async () => {
            const mockData = [
                {
                    id: 's1',
                    section_number: '101',
                    courses: { code: 'CS101' },
                    enrollments: [
                        {
                            student_id: 'st1',
                            attendance_records: [
                                { status: 'PRESENT' },
                                { status: 'ABSENT' },
                                { status: 'LATE' }
                            ]
                        }
                    ]
                }
            ];
            const mockChain = {
                select: vi.fn().mockReturnThis(),
                eq: vi.fn().mockReturnThis(),
                then: vi.fn((cb) => cb({ data: mockData, error: null })),
            };
            (supabase.from as any).mockReturnValue(mockChain);

            const result = await service.getAttendanceCompliance();
            expect(result).toHaveLength(1);
            // 2 out of 3 were present/late = 66.67%
            expect(result[0].averageAttendance).toBeCloseTo(66.67, 1);
            expect(result[0].belowThreshold).toBe(1);
        });
    });
});
