import { describe, it, expect, vi, beforeEach } from 'vitest';
import { InstructorMessagingService } from './InstructorMessagingService';
import { supabase } from '../lib/supabase';

vi.mock('../lib/supabase', () => ({
    supabase: {
        from: vi.fn(),
    },
}));

describe('InstructorMessagingService', () => {
    let service: InstructorMessagingService;

    beforeEach(() => {
        vi.clearAllMocks();
        service = new InstructorMessagingService();
    });

    describe('fetchSections', () => {
        it('should fetch sections for instructor', async () => {
            const mockData = [{ id: 's1', courses: { code: 'CS101' }, terms: { name: 'Fall 2023' } }];
            const mockChain = {
                select: vi.fn().mockReturnThis(),
                eq: vi.fn().mockReturnThis(),
                order: vi.fn().mockReturnThis(),
                then: vi.fn((cb) => cb({ data: mockData, error: null }))
            };
            (supabase.from as any).mockReturnValue(mockChain);

            const result = await service.fetchSections('inst1');
            expect(result).toHaveLength(1);
            expect(result[0].courseCode).toBe('CS101');
        });
    });

    describe('sendMessage', () => {
        it('should create message and recipients', async () => {
            (supabase.from as any).mockImplementation((table: string) => {
                if (table === 'section_messages') {
                    return {
                        insert: vi.fn().mockReturnThis(),
                        select: vi.fn().mockReturnThis(),
                        single: vi.fn().mockResolvedValue({ data: { id: 'm1' }, error: null })
                    };
                }
                if (table === 'section_message_recipients') {
                    return {
                        insert: vi.fn().mockResolvedValue({ error: null })
                    };
                }
                return {};
            });

            await service.sendMessage('inst1', {
                sectionId: 's1',
                title: 'Hello',
                body: 'World',
                deliveryScope: 'SECTION',
                deliveryChannel: 'IN_APP',
                recipientIds: ['st1']
            });

            expect(supabase.from).toHaveBeenCalledWith('section_messages');
            expect(supabase.from).toHaveBeenCalledWith('section_message_recipients');
        });
    });
});
