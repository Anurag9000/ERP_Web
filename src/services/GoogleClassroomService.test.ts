import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GoogleClassroomService } from './GoogleClassroomService';
import { supabase } from '../lib/supabase';

vi.mock('../lib/supabase', () => ({
    supabase: {
        from: vi.fn(),
    },
}));

describe('GoogleClassroomService', () => {
    let service: GoogleClassroomService;

    beforeEach(() => {
        vi.clearAllMocks();
        service = new GoogleClassroomService();
    });

    describe('fetchCourses', () => {
        it('should return mock courses (until API is implemented)', async () => {
            const result = await service.fetchCourses();
            expect(result).toHaveLength(2);
            expect(result[0].id).toBe('gc-course-1');
        });
    });

    describe('syncCourseToERP', () => {
        it('should upsert mapping to database', async () => {
            const mockChain = {
                upsert: vi.fn().mockResolvedValue({ error: null })
            };
            (supabase.from as any).mockReturnValue(mockChain);

            const result = await service.syncCourseToERP({ id: 'gc1', name: 'CS', section: 'A', descriptionHeading: 'CS1' }, 'erp1');
            expect(result.success).toBe(true);
            expect(supabase.from).toHaveBeenCalledWith('google_classroom_mappings');
        });
    });

    describe('importAssignments', () => {
        it('should fetch from Google and insert into ERP', async () => {
            const mockChain = {
                insert: vi.fn().mockResolvedValue({ error: null })
            };
            (supabase.from as any).mockReturnValue(mockChain);

            const result = await service.importAssignments('gc1', 's1');
            expect(result.success).toBe(true);
            expect(result.imported).toBe(2); // Based on mock fetchAssignments
            expect(supabase.from).toHaveBeenCalledWith('assessments');
        });
    });
});
