import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RegistrarService } from './RegistrarService';
import { supabase } from '../lib/supabase';

vi.mock('../lib/supabase', () => ({
    supabase: {
        from: vi.fn(),
    },
}));

describe('RegistrarService', () => {
    let service: RegistrarService;

    beforeEach(() => {
        vi.clearAllMocks();
        service = new RegistrarService();
    });

    describe('fetchRequests', () => {
        it('should fetch registrar requests for a student', async () => {
            const mockData = [{ id: 'r1', request_type: 'TRANSCRIPT' }];
            const mockChain = {
                select: vi.fn().mockReturnThis(),
                eq: vi.fn().mockReturnThis(),
                order: vi.fn().mockReturnThis(),
                then: vi.fn((cb) => cb({ data: mockData, error: null }))
            };
            (supabase.from as any).mockReturnValue(mockChain);

            const result = await service.fetchRequests('st1');
            expect(result).toHaveLength(1);
            expect(result[0].request_type).toBe('TRANSCRIPT');
        });
    });

    describe('submitRequest', () => {
        it('should insert request successfully', async () => {
            const mockChain = {
                insert: vi.fn().mockResolvedValue({ error: null })
            };
            (supabase.from as any).mockReturnValue(mockChain);

            await service.submitRequest('st1', {
                requestType: 'TRANSCRIPT',
                deliveryFormat: 'PDF',
                preferredChannel: 'EMAIL',
                message: 'Urgent'
            });

            expect(supabase.from).toHaveBeenCalledWith('registrar_requests');
        });
    });
});
