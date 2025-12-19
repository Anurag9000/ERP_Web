import { describe, it, expect, beforeEach } from 'vitest';
import { CalendarSyncService } from './CalendarSyncService';

describe('CalendarSyncService', () => {
    let service: CalendarSyncService;

    beforeEach(() => {
        service = new CalendarSyncService();
    });

    describe('generateICalFeed', () => {
        it('should generate valid iCal format', () => {
            const events = [
                {
                    id: '1',
                    title: 'Class',
                    description: 'Desc',
                    startTime: new Date('2023-12-25T10:00:00Z'),
                    endTime: new Date('2023-12-25T11:00:00Z')
                }
            ];
            const feed = service.generateICalFeed(events, 'user1');

            expect(feed).toContain('BEGIN:VCALENDAR');
            expect(feed).toContain('SUMMARY:Class');
            expect(feed).toContain('DTSTART:20231225T100000Z');
            expect(feed).toContain('END:VCALENDAR');
        });
    });

    describe('getGoogleCalendarUrl', () => {
        it('should encode feed URL correctly', () => {
            const url = service.getGoogleCalendarUrl('http://test.com/feed.ics');
            expect(url).toContain('cid=http%3A%2F%2Ftest.com%2Ffeed.ics');
        });
    });
});
