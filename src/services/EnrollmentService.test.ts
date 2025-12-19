import { describe, it, expect, vi, beforeEach } from 'vitest';
import { EnrollmentService } from './EnrollmentService';
import { supabase } from '../lib/supabase';

vi.mock('../lib/supabase', () => ({
    supabase: {
        from: vi.fn(),
    },
}));

describe('EnrollmentService', () => {
    let service: EnrollmentService;
    let mockAudit: any;

    beforeEach(() => {
        vi.clearAllMocks();
        mockAudit = {
            record: vi.fn(),
            enrollment: vi.fn(),
        };
        service = new EnrollmentService(mockAudit);
    });

    describe('fetchRegistrationData', () => {
        it('should fetch all required data', async () => {
            const mockChain = {
                select: vi.fn().mockReturnThis(),
                eq: vi.fn().mockReturnThis(),
                neq: vi.fn().mockReturnThis(),
                order: vi.fn().mockReturnThis(),
                then: vi.fn((cb) => cb({ data: [], error: null })),
            };
            (supabase.from as any).mockReturnValue(mockChain);

            const result = await service.fetchRegistrationData('student-1');

            expect(supabase.from).toHaveBeenCalledWith('enrollments');
            expect(supabase.from).toHaveBeenCalledWith('waitlists');
            expect(supabase.from).toHaveBeenCalledWith('sections');
            expect(supabase.from).toHaveBeenCalledWith('departments');
            expect(result).toHaveProperty('enrollments');
        });
    });

    describe('enrollInSection', () => {
        it('should enroll if there is a seat and no conflicts', async () => {
            const section = {
                id: 's1',
                status: 'OPEN',
                enrolled_count: 5,
                capacity: 10,
                term_id: 't1',
                courses: { id: 'c1' },
                schedule_days: ['MON'],
                start_time: '10:00',
                end_time: '11:00',
                rooms: { code: 'R101' }
            } as any;

            // Mock getCourseIdsByStatus calls (ACTIVE and COMPLETED)
            const mockChain = {
                select: vi.fn().mockReturnThis(),
                eq: vi.fn().mockReturnThis(),
                then: vi.fn((cb) => cb({ data: [], error: null })),
            };
            (supabase.from as any).mockReturnValue(mockChain);

            // Mock ensureCourseRequirements calls
            // (Actually ensureCourseRequirements calls multiple tables)
            // We need a more sophisticated mock for multiple parallel calls

            let callCount = 0;
            (supabase.from as any).mockImplementation((table: string) => {
                return {
                    select: vi.fn().mockReturnThis(),
                    eq: vi.fn().mockReturnThis(),
                    neq: vi.fn().mockReturnThis(),
                    maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
                    insert: vi.fn().mockResolvedValue({ error: null }),
                    update: vi.fn().mockReturnThis(),
                    then: vi.fn((cb) => {
                        if (table === 'enrollments' && callCount < 2) {
                            // First two calls are getCourseIdsByStatus
                            callCount++;
                            return cb({ data: [], error: null });
                        }
                        return cb({ data: [], error: null });
                    }),
                } as any;
            });

            const result = await service.enrollInSection('st1', section, []);
            expect(result.status).toBe('ENROLLED');
        });
    });
});
