import { supabase } from '../lib/supabase';

export interface Announcement {
    id: string;
    title: string;
    message: string;
    category: 'ACADEMIC' | 'EVENT' | 'CLUB' | 'DEPARTMENT' | 'GENERAL';
    priority: 'LOW' | 'NORMAL' | 'HIGH';
    publishedAt: Date;
    expiresAt?: Date;
    targetAudience: 'ALL' | 'STUDENTS' | 'INSTRUCTORS' | 'STAFF';
    createdBy: string;
}

export class AnnouncementService {
    /**
     * Fetch announcements for a user
     */
    async fetchAnnouncements(
        userId: string,
        categories?: string[]
    ): Promise<Announcement[]> {
        // Get user role
        const { data: profile } = await (supabase
            .from('user_profiles')
            .select('role')
            .eq('id', userId)
            .single() as any);

        const userRole = profile?.role || 'STUDENT';

        let query = supabase
            .from('announcements')
            .select('*')
            .or(`target_audience.eq.ALL,target_audience.eq.${userRole}S`)
            .order('published_at', { ascending: false })
            .limit(50);

        if (categories && categories.length > 0) {
            query = query.in('category', categories);
        }

        // Only show non-expired announcements
        query = query.or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`);

        const { data, error } = await (query as any);
        if (error) throw error;

        return (data || []).map((a: any) => ({
            id: a.id,
            title: a.title,
            message: a.message,
            category: a.category,
            priority: a.priority,
            publishedAt: new Date(a.published_at),
            expiresAt: a.expires_at ? new Date(a.expires_at) : undefined,
            targetAudience: a.target_audience,
            createdBy: a.created_by
        }));
    }

    /**
     * Create announcement (admin/instructor only)
     */
    async createAnnouncement(
        userId: string,
        announcement: Omit<Announcement, 'id' | 'publishedAt' | 'createdBy'>
    ): Promise<{ success: boolean; error?: string }> {
        try {
            const { error } = await (supabase
                .from('announcements')
                .insert({
                    title: announcement.title,
                    message: announcement.message,
                    category: announcement.category,
                    priority: announcement.priority,
                    target_audience: announcement.targetAudience,
                    expires_at: announcement.expiresAt?.toISOString(),
                    created_by: userId,
                    published_at: new Date().toISOString()
                } as any) as any);

            if (error) throw error;
            return { success: true };
        } catch (error: any) {
            return { success: false, error: error.message };
        }
    }

    /**
     * Add announcement to personal calendar
     */
    async addToCalendar(
        userId: string,
        announcementId: string
    ): Promise<{ success: boolean; error?: string }> {
        try {
            // Get announcement details
            const { data: announcement, error: fetchError } = await (supabase
                .from('announcements')
                .select('*')
                .eq('id', announcementId)
                .single() as any);

            if (fetchError) throw fetchError;

            // Create calendar event
            const { error: insertError } = await (supabase
                .from('calendar_events')
                .insert({
                    organizer_id: userId,
                    title: announcement.title,
                    description: announcement.message,
                    start_time: new Date().toISOString(),
                    end_time: announcement.expires_at || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
                    is_all_day: true,
                    color: 'blue'
                } as any) as any);

            if (insertError) throw insertError;
            return { success: true };
        } catch (error: any) {
            return { success: false, error: error.message };
        }
    }
}
