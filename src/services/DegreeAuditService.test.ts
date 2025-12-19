import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DegreeAuditService } from './DegreeAuditService';
import { supabase } from '../lib/supabase';

vi.mock('../lib/supabase', () => ({
    supabase: {
        from: vi.fn(),
    },
}));

describe('DegreeAuditService', () => {
    let service: DegreeAuditService;

    beforeEach(() => {
        vi.clearAllMocks();
        service = new DegreeAuditService();
    });

    describe('calculateDegreeProgress', () => {
        it('should calculate completed and in-progress credits correctly', async () => {
            (supabase.from as any).mockImplementation((table: string) => {
                if (table === 'enrollments') {
                    const mockChain = {
                        select: vi.fn().mockReturnThis(),
                        eq: vi.fn().mockReturnThis(),
                        in: vi.fn().mockReturnThis(),
                        not: vi.fn().mockReturnThis(),
                        then: vi.fn((cb) => {
                            // Mock both completed and active calls
                            // Simple detection by checking if 'in' with COMPLETED was called
                            const isCompletedCall = mockChain.in.mock.calls.some(c => c[1].includes('COMPLETED'));
                            if (isCompletedCall) {
                                return cb({
                                    data: [
                                        { grade: 'A', sections: { courses: { credits: 3, course_type: 'CORE' } } },
                                        { grade: 'B', sections: { courses: { credits: 4, course_type: 'MAJOR' } } }
                                    ], error: null
                                });
                            } else {
                                return cb({
                                    data: [
                                        { sections: { courses: { credits: 3, course_type: 'ELECTIVE' } } }
                                    ], error: null
                                });
                            }
                        }),
                    };
                    return mockChain;
                }
                return {};
            });

            const result = await service.calculateDegreeProgress('st1');
            expect(result.completedCredits).toBe(7);
            expect(result.inProgressCredits).toBe(3);
            expect(result.cgpa).toBeCloseTo(3.43, 2); // (4*3 + 3*4) / 7 = 24 / 7 = 3.428...

            const core = result.requirements.find(r => r.category === 'CORE');
            expect(core?.completed).toBe(3);
            expect(core?.remaining).toBe(57);
        });
    });
});
