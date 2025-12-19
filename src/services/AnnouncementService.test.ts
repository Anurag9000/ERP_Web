import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AnnouncementService } from './AnnouncementService';
import { supabase } from '../lib/supabase';

vi.mock('../lib/supabase', () => ({
    supabase: {
        from: vi.fn(),
    },
}));

describe('AnnouncementService', () => {
    let service: AnnouncementService;

    beforeEach(() => {
        vi.clearAllMocks();
        service = new AnnouncementService();
    });

    describe('fetchAnnouncements', () => {
        it('should fetch announcements for a student', async () => {
            (supabase.from as any).mockImplementation((table: string) => {
                if (table === 'user_profiles') {
                    return {
                        select: vi.fn().mockReturnThis(),
                        eq: vi.fn().mockReturnThis(),
                        single: vi.fn().mockResolvedValue({ data: { role: 'STUDENT' }, error: null })
                    };
                }
                if (table === 'announcements') {
                    const mockChain = {
                        select: vi.fn().mockReturnThis(),
                        or: vi.fn().mockReturnThis(),
                        order: vi.fn().mockReturnThis(),
                        limit: vi.fn().mockReturnThis(),
                        then: vi.fn((cb) => cb({ data: [{ id: 'a1', title: 'Welcome', target_audience: 'ALL' }], error: null }))
                    };
                    return mockChain;
                }
                return {};
            });

            const result = await service.fetchAnnouncements('u1');
            expect(result).toHaveLength(1);
            expect(result[0].title).toBe('Welcome');
            expect(supabase.from).toHaveBeenCalledWith('user_profiles');
            expect(supabase.from).toHaveBeenCalledWith('announcements');
        });
    });

    describe('createAnnouncement', () => {
        it('should insert new announcement', async () => {
            const mockChain = {
                insert: vi.fn().mockResolvedValue({ error: null })
            };
            (supabase.from as any).mockReturnValue(mockChain);

            const result = await service.createAnnouncement('u1', {
                title: 'New Event',
                message: 'Details here',
                category: 'EVENT',
                priority: 'NORMAL',
                targetAudience: 'ALL'
            });

            expect(result.success).toBe(true);
            expect(supabase.from).toHaveBeenCalledWith('announcements');
        });
    });
});
