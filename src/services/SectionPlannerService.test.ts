import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SectionPlannerService } from './SectionPlannerService';
import { supabase } from '../lib/supabase';

vi.mock('../lib/supabase', () => ({
    supabase: {
        from: vi.fn(),
    },
}));

describe('SectionPlannerService', () => {
    let service: SectionPlannerService;

    beforeEach(() => {
        vi.clearAllMocks();
        service = new SectionPlannerService();
    });

    describe('detectRoomConflicts', () => {
        it('should detect actual time/day conflicts', async () => {
            const mockData = [
                {
                    id: 's2',
                    start_time: '10:00',
                    end_time: '11:00',
                    schedule_days: ['MONDAY']
                }
            ];
            const mockChain = {
                select: vi.fn().mockReturnThis(),
                eq: vi.fn().mockReturnThis(),
                then: vi.fn((cb) => cb({ data: mockData, error: null }))
            };
            (supabase.from as any).mockReturnValue(mockChain);

            // Conflict: overlapping time on same day
            const result = await service.detectRoomConflicts('r1', '10:30', '11:30', ['MONDAY'], 't1');
            expect(result.hasConflict).toBe(true);
            expect(result.conflicts).toHaveLength(1);

            // No conflict: different day
            const result2 = await service.detectRoomConflicts('r1', '10:30', '11:30', ['TUESDAY'], 't1');
            expect(result2.hasConflict).toBe(false);
        });
    });

    describe('validateCapacity', () => {
        it('should validate against room capacity', async () => {
            const mockChain = {
                select: vi.fn().mockReturnThis(),
                eq: vi.fn().mockReturnThis(),
                single: vi.fn().mockResolvedValue({ data: { capacity: 30 }, error: null })
            };
            (supabase.from as any).mockReturnValue(mockChain);

            const result = await service.validateCapacity('r1', 25);
            expect(result.valid).toBe(true);

            const result2 = await service.validateCapacity('r1', 35);
            expect(result2.valid).toBe(false);
        });
    });
});
