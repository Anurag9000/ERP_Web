import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ImportExportService } from './ImportExportService';
import { supabase } from '../lib/supabase';

vi.mock('../lib/supabase', () => ({
    supabase: {
        from: vi.fn(),
        auth: {
            admin: {
                createUser: vi.fn(),
                deleteUser: vi.fn(),
            }
        }
    },
}));

describe('ImportExportService', () => {
    let service: ImportExportService;

    beforeEach(() => {
        vi.clearAllMocks();
        service = new ImportExportService();
    });

    describe('validateStudentData', () => {
        it('should catch missing required fields', () => {
            const data = [{ first_name: 'John' }]; // Missing other fields
            const errors = service.validateStudentData(data);
            expect(errors).toHaveLength(3); // student_id, last_name, email
        });

        it('should catch invalid email', () => {
            const data = [{ student_id: 'S1', first_name: 'J', last_name: 'D', email: 'invalid' }];
            const errors = service.validateStudentData(data);
            expect(errors[0].message).toBe('Invalid email format');
        });
    });

    describe('importCourses', () => {
        it('should import courses and link departments', async () => {
            (supabase.from as any).mockImplementation((table: string) => {
                if (table === 'departments') {
                    return {
                        select: vi.fn().mockReturnThis(),
                        eq: vi.fn().mockReturnThis(),
                        single: vi.fn().mockResolvedValue({ data: { id: 'd1' }, error: null })
                    };
                }
                if (table === 'courses') {
                    return {
                        insert: vi.fn().mockResolvedValue({ error: null })
                    };
                }
                return {};
            });

            const data = [{ code: 'CS101', name: 'Intro', credits: '3', department_code: 'CS' }];
            const result = await service.importCourses(data);
            expect(result.success).toBe(true);
            expect(result.imported).toBe(1);
        });
    });
});
