import { render, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MaintenanceProvider, useMaintenance } from './MaintenanceContext';
import { supabase } from '../lib/supabase';

vi.mock('../lib/supabase', () => ({
    supabase: {
        from: vi.fn(),
        channel: vi.fn().mockReturnThis(),
        on: vi.fn().mockReturnThis(),
        subscribe: vi.fn().mockReturnThis(),
        removeChannel: vi.fn(),
        auth: {
            getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
            onAuthStateChange: vi.fn().mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } }),
        },
    },
}));

const TestComponent = () => {
    const { maintenanceActive, maintenanceMessage, canWrite } = useMaintenance();
    return (
        <div>
            <div data-testid="active">{maintenanceActive.toString()}</div>
            <div data-testid="message">{maintenanceMessage}</div>
            <div data-testid="can-write">{canWrite.toString()}</div>
        </div>
    );
};

describe('MaintenanceContext', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('sets maintenanceActive to false when no settings or windows are active', async () => {
        (supabase.from as any).mockImplementation(() => ({
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            gte: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
        }));

        const { getByTestId } = render(
            <MaintenanceProvider>
                <TestComponent />
            </MaintenanceProvider>
        );

        await waitFor(() => {
            expect(getByTestId('active')).toHaveTextContent('false');
            expect(getByTestId('can-write')).toHaveTextContent('true');
        });
    });

    it('sets maintenanceActive to true when system_settings has maintenance_mode=true', async () => {
        (supabase.from as any).mockImplementation((table: string) => ({
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            gte: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValue({
                data: table === 'system_settings' ? { value: 'true' } : null,
                error: null
            }),
        }));

        const { getByTestId } = render(
            <MaintenanceProvider>
                <TestComponent />
            </MaintenanceProvider>
        );

        await waitFor(() => {
            expect(getByTestId('active')).toHaveTextContent('true');
            expect(getByTestId('can-write')).toHaveTextContent('false');
            expect(getByTestId('message')).toHaveTextContent(/maintenance mode/i);
        });
    });
});
