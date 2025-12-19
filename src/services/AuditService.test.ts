import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AuditService } from './AuditService';
import { supabase } from '../lib/supabase';

vi.mock('../lib/supabase', () => ({
    supabase: {
        from: vi.fn(),
    },
}));

describe('AuditService', () => {
    let service: AuditService;

    beforeEach(() => {
        vi.clearAllMocks();
        service = new AuditService();
    });

    describe('record', () => {
        it('should insert audit log', async () => {
            const mockChain = {
                insert: vi.fn().mockResolvedValue({ error: null })
            };
            (supabase.from as any).mockReturnValue(mockChain);

            await service.record({
                userId: 'u1',
                action: 'TEST',
                entityType: 'UNIT_TEST'
            });

            expect(supabase.from).toHaveBeenCalledWith('audit_logs');
        });
    });

    describe('maintenanceToggle', () => {
        it('should record maintenance toggle action', async () => {
            const mockChain = {
                insert: vi.fn().mockResolvedValue({ error: null })
            };
            (supabase.from as any).mockReturnValue(mockChain);

            await service.maintenanceToggle('u1', true);
            expect(supabase.from).toHaveBeenCalledWith('audit_logs');
        });
    });
});
