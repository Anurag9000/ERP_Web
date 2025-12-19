import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AnalyticsService } from './AnalyticsService';
import { supabase } from '../lib/supabase';

vi.mock('../lib/supabase', () => ({
    supabase: {
        from: vi.fn(),
    },
}));

describe('AnalyticsService', () => {
    let service: AnalyticsService;

    beforeEach(() => {
        vi.clearAllMocks();
        service = new AnalyticsService();
    });

    describe('fetchGpaTrend', () => {
        it('should calculate GPA and trend correctly', async () => {
            const mockData = [
                {
                    status: 'COMPLETED',
                    grade_points: 12,
                    sections: {
                        terms: { code: 'FALL2023', name: 'Fall 2023' },
                        courses: { credits: 3 }
                    }
                },
                {
                    status: 'COMPLETED',
                    grade_points: 9,
                    sections: {
                        terms: { code: 'WINTER2024', name: 'Winter 2024' },
                        courses: { credits: 3 }
                    }
                }
            ];
            const mockChain = {
                select: vi.fn().mockReturnThis(),
                eq: vi.fn().mockReturnThis(),
                then: vi.fn((cb) => cb({ data: mockData, error: null })),
            };
            (supabase.from as any).mockReturnValue(mockChain);

            const result = await service.fetchGpaTrend('st1');

            // Term 1: 12/3 = 4.0
            // Term 2: 9/3 = 3.0
            // Total: 21/6 = 3.5
            // Term 1: 12/3 = 4.0 SGPA, 4.0 CGPA
            // Term 2: 9/3 = 3.0 SGPA, 3.5 CGPA
            // Total: 21/6 = 3.5
            expect(result.cgpa).toBe(3.5);
            expect(result.totalCredits).toBe(6);
            expect(result.trend).toHaveLength(2);
            expect(result.trend[0].sgpa).toBe(4.0);
            expect(result.trend[1].sgpa).toBe(3.0);
            expect(result.trend[1].cgpa).toBe(3.5);
            expect(result.standing).toBe('WARNING'); // 3.0 - 4.0 = -1.0, which is <= -0.4
        });
    });
});
