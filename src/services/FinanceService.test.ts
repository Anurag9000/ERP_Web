import { describe, it, expect, vi, beforeEach } from 'vitest';
import { FinanceService } from './FinanceService';
import { supabase } from '../lib/supabase';

vi.mock('../lib/supabase', () => ({
    supabase: {
        from: vi.fn(),
    },
}));

describe('FinanceService', () => {
    let service: FinanceService;

    beforeEach(() => {
        vi.clearAllMocks();
        service = new FinanceService();
    });

    describe('fetchStudentFees', () => {
        it('should fetch and format student fees', async () => {
            const mockData = [
                {
                    id: 'f1',
                    amount: 1000,
                    amount_paid: 200,
                    status: 'PARTIAL',
                    fee_structures: { name: 'Tuition' }
                }
            ];
            const mockChain = {
                select: vi.fn().mockReturnThis(),
                eq: vi.fn().mockReturnThis(),
                order: vi.fn().mockReturnThis(),
                then: vi.fn((cb) => cb({ data: mockData, error: null })),
            };
            (supabase.from as any).mockReturnValue(mockChain);

            const result = await service.fetchStudentFees('st1');
            expect(result).toHaveLength(1);
            expect(result[0].fee_type).toBe('Tuition');
        });
    });

    describe('recordPayment', () => {
        it('should record payment and update fee status', async () => {
            (supabase.from as any).mockImplementation((table: string) => {
                if (table === 'payments') {
                    return {
                        insert: vi.fn().mockReturnThis(),
                        select: vi.fn().mockReturnThis(),
                        single: vi.fn().mockResolvedValue({ data: { id: 'p1' }, error: null })
                    };
                }
                if (table === 'student_fees') {
                    return {
                        select: vi.fn().mockReturnThis(),
                        eq: vi.fn().mockReturnThis(),
                        single: vi.fn().mockResolvedValue({ data: { amount: 1000, amount_paid: 500 }, error: null }),
                        update: vi.fn().mockReturnThis(),
                    };
                }
                return {};
            });

            const result = await service.recordPayment('st1', 'f1', 500, 'CARD');
            expect(result.id).toBe('p1');
            expect(supabase.from).toHaveBeenCalledWith('payments');
            expect(supabase.from).toHaveBeenCalledWith('student_fees');
        });
    });
});
