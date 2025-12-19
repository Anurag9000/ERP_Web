import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CalendarService } from './CalendarService';
import { supabase } from '../lib/supabase';

vi.mock('../lib/supabase', () => ({
    supabase: {
        from: vi.fn(),
    },
}));

describe('CalendarService', () => {
    let service: CalendarService;

    beforeEach(() => {
        vi.clearAllMocks();
        service = new CalendarService();
    });

    describe('fetchStudentSchedule', () => {
        it('should fetch and format student sections', async () => {
            const mockData = [
                {
                    sections: {
                        id: 's1',
                        section_number: '101',
                        start_time: '09:00',
                        end_time: '10:00',
                        schedule_days: ['MONDAY'],
                        courses: { code: 'CS101', name: 'Intro CS' },
                        rooms: { code: 'R1' },
                        user_profiles: { first_name: 'John', last_name: 'Doe' }
                    }
                }
            ];
            const mockChain = {
                select: vi.fn().mockReturnThis(),
                eq: vi.fn().mockReturnThis(),
                then: vi.fn((cb) => cb({ data: mockData, error: null }))
            };
            (supabase.from as any).mockReturnValue(mockChain);

            const result = await service.fetchStudentSchedule('st1');
            expect(result).toHaveLength(1);
            expect(result[0].course_code).toBe('CS101');
            expect(result[0].instructor).toBe('John Doe');
        });
    });

    describe('fetchUpcomingEvents', () => {
        it('should fetch assessments and opted-in events', async () => {
            const mockAssessments = [{ id: 'a1', name: 'Quiz', due_date: '2025-01-01T10:00:00Z', courses: { courses: { code: 'CS101' } } }];
            const mockParticipants = [{ event_id: 'e1' }];
            const mockEvents = [{ id: 'e1', title: 'Workshop', start_time: '2025-01-01T14:00:00Z', end_time: '2025-01-01T16:00:00Z' }];

            const fromMock = vi.fn().mockImplementation((table) => {
                if (table === 'assessments') {
                    return {
                        select: vi.fn().mockReturnThis(),
                        eq: vi.fn().mockReturnThis(),
                        gt: vi.fn().mockReturnThis(),
                        order: vi.fn().mockReturnThis(),
                        limit: vi.fn().mockReturnThis(),
                        then: vi.fn((cb) => cb({ data: mockAssessments, error: null }))
                    };
                }
                if (table === 'event_participants') {
                    return {
                        select: vi.fn().mockReturnThis(),
                        eq: vi.fn().mockReturnThis(),
                        then: vi.fn((cb) => cb({ data: mockParticipants, error: null }))
                    };
                }
                if (table === 'calendar_events') {
                    return {
                        select: vi.fn().mockReturnThis(),
                        or: vi.fn().mockReturnThis(),
                        gt: vi.fn().mockReturnThis(),
                        order: vi.fn().mockReturnThis(),
                        limit: vi.fn().mockReturnThis(),
                        then: vi.fn((cb) => cb({ data: mockEvents, error: null }))
                    };
                }
                return {};
            });

            (supabase.from as any).mockImplementation(fromMock);

            const result = await service.fetchUpcomingEvents('st1');
            expect(result).toHaveLength(2);
            expect(result[0].type).toBe('EXAM');
            expect(result[1].type).toBe('EVENT');
            expect(result[1].id).toBe('e1');
        });
    });

    describe('toggleEventOptIn', () => {
        it('should upsert when opting in', async () => {
            const mockChain = {
                upsert: vi.fn().mockResolvedValue({ error: null })
            };
            (supabase.from as any).mockReturnValue(mockChain);

            const result = await service.toggleEventOptIn('u1', 'e1', true);
            expect(result.success).toBe(true);
            expect(supabase.from).toHaveBeenCalledWith('event_participants');
        });

        it('should delete when opting out', async () => {
            const mockChain = {
                delete: vi.fn().mockReturnThis(),
                eq: vi.fn().mockReturnThis(),
                then: vi.fn((cb) => cb({ error: null }))
            };
            (supabase.from as any).mockReturnValue(mockChain);

            const result = await service.toggleEventOptIn('u1', 'e1', false);
            expect(result.success).toBe(true);
        });
    });
});
