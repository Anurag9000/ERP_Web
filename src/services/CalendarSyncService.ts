export interface CalendarEvent {
    id: string;
    title: string;
    description: string;
    startTime: Date;
    endTime: Date;
    location?: string;
}

export class CalendarSyncService {
    /**
     * Generate iCal feed for a user's events
     */
    generateICalFeed(events: CalendarEvent[], userId: string): string {
        const lines: string[] = [];

        // iCal header
        lines.push('BEGIN:VCALENDAR');
        lines.push('VERSION:2.0');
        lines.push('PRODID:-//University ERP//Calendar//EN');
        lines.push('CALSCALE:GREGORIAN');
        lines.push('METHOD:PUBLISH');
        lines.push(`X-WR-CALNAME:University Schedule - ${userId}`);
        lines.push('X-WR-TIMEZONE:UTC');

        // Add events
        events.forEach(event => {
            lines.push('BEGIN:VEVENT');
            lines.push(`UID:${event.id}@university-erp.com`);
            lines.push(`DTSTAMP:${this.formatICalDate(new Date())}`);
            lines.push(`DTSTART:${this.formatICalDate(event.startTime)}`);
            lines.push(`DTEND:${this.formatICalDate(event.endTime)}`);
            lines.push(`SUMMARY:${this.escapeICalText(event.title)}`);

            if (event.description) {
                lines.push(`DESCRIPTION:${this.escapeICalText(event.description)}`);
            }

            if (event.location) {
                lines.push(`LOCATION:${this.escapeICalText(event.location)}`);
            }

            lines.push('STATUS:CONFIRMED');
            lines.push('END:VEVENT');
        });

        // iCal footer
        lines.push('END:VCALENDAR');

        return lines.join('\r\n');
    }

    /**
     * Format date for iCal (YYYYMMDDTHHMMSSZ)
     */
    private formatICalDate(date: Date): string {
        const year = date.getUTCFullYear();
        const month = String(date.getUTCMonth() + 1).padStart(2, '0');
        const day = String(date.getUTCDate()).padStart(2, '0');
        const hours = String(date.getUTCHours()).padStart(2, '0');
        const minutes = String(date.getUTCMinutes()).padStart(2, '0');
        const seconds = String(date.getUTCSeconds()).padStart(2, '0');

        return `${year}${month}${day}T${hours}${minutes}${seconds}Z`;
    }

    /**
     * Escape special characters for iCal
     */
    private escapeICalText(text: string): string {
        return text
            .replace(/\\/g, '\\\\')
            .replace(/;/g, '\\;')
            .replace(/,/g, '\\,')
            .replace(/\n/g, '\\n');
    }

    /**
     * Generate feed URL for a user
     */
    generateFeedUrl(userId: string): string {
        // In production, this would be a real endpoint
        return `/api/calendar/feed/${userId}.ics`;
    }

    /**
     * Get Google Calendar subscription URL
     */
    getGoogleCalendarUrl(feedUrl: string): string {
        const encodedUrl = encodeURIComponent(feedUrl);
        return `https://calendar.google.com/calendar/r?cid=${encodedUrl}`;
    }

    /**
     * Get Apple Calendar subscription instructions
     */
    getAppleCalendarInstructions(feedUrl: string): string {
        return `To add to Apple Calendar:
1. Open Calendar app
2. Go to File → New Calendar Subscription
3. Enter this URL: ${feedUrl}
4. Click Subscribe`;
    }

    /**
     * Download iCal file
     */
    downloadICalFile(content: string, filename: string = 'schedule.ics'): void {
        const blob = new Blob([content], { type: 'text/calendar;charset=utf-8' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(link.href);
    }
}
