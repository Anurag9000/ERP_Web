import { describe, it, expect, vi, beforeEach } from 'vitest';
import { FacultyService } from './FacultyService';
import { supabase } from '../lib/supabase';

vi.mock('../lib/supabase', () => ({
    supabase: {
        from: vi.fn(),
    },
}));

describe('FacultyService', () => {
    let service: FacultyService;

    beforeEach(() => {
        vi.clearAllMocks();
        service = new FacultyService();
    });

    describe('fetchInstructors', () => {
        it('should fetch and format instructors correctly', async () => {
            const mockData = [{
                id: 'inst1',
                first_name: 'Jane',
                last_name: 'Doe',
                email: 'jane@example.com',
                office_hours: '9-5',
                office_location: 'Room 101',
                departments: { name: 'Engineering' }
            }];
            const mockChain = {
                select: vi.fn().mockReturnThis(),
                eq: vi.fn().mockReturnThis(),
                order: vi.fn().mockReturnThis(),
                then: vi.fn((cb) => cb({ data: mockData, error: null })),
            };
            (supabase.from as any).mockReturnValue(mockChain);

            const result = await service.fetchInstructors();
            expect(result).toHaveLength(1);
            expect(result[0].name).toBe('Jane Doe');
            expect(result[0].department).toBe('Engineering');
        });
    });

    describe('requestAppointment', () => {
        it('should insert appointment request', async () => {
            const mockChain = {
                insert: vi.fn().mockResolvedValue({ error: null }),
            };
            (supabase.from as any).mockReturnValue(mockChain);

            const result = await service.requestAppointment('st1', 'inst1', new Date(), '10:00', 'Talk about project');
            expect(result.success).toBe(true);
            expect(supabase.from).toHaveBeenCalledWith('appointment_requests');
        });

        it('should return error on failure', async () => {
            const mockChain = {
                insert: vi.fn().mockResolvedValue({ error: new Error('Insert failed') }),
            };
            (supabase.from as any).mockReturnValue(mockChain);

            const result = await service.requestAppointment('st1', 'inst1', new Date(), '10:00', 'Talk about project');
            expect(result.success).toBe(false);
            expect(result.error).toBe('Insert failed');
        });
    });
});
