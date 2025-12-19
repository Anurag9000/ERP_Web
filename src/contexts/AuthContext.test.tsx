import { render, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AuthProvider, useAuth } from './AuthContext';
import { supabase } from '../lib/supabase';

vi.mock('../lib/supabase', () => ({
    supabase: {
        auth: {
            getSession: vi.fn(),
            onAuthStateChange: vi.fn(),
            signInWithPassword: vi.fn(),
            signOut: vi.fn(),
            updateUser: vi.fn(),
        },
        from: vi.fn(),
    },
}));

const TestComponent = () => {
    const { user, profile, loading } = useAuth();
    if (loading) return <div>Loading...</div>;
    return (
        <div>
            <div data-testid="user-email">{user?.email}</div>
            <div data-testid="profile-role">{profile?.role}</div>
        </div>
    );
};

describe('AuthContext', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        (supabase.auth.getSession as any).mockResolvedValue({ data: { session: null } });
        (supabase.auth.onAuthStateChange as any).mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } });
    });

    it('provides initial null state when no session exists', async () => {
        const { getByText, queryByTestId } = render(
            <AuthProvider>
                <TestComponent />
            </AuthProvider>
        );

        await waitFor(() => expect(getByText('Loading...')).toBeInTheDocument());
        await waitFor(() => expect(queryByTestId('user-email')).toBeEmptyDOMElement());
    });

    it('loads profile when session exists', async () => {
        const mockUser = { id: 'u1', email: 'test@example.com' };
        const mockSession = { user: mockUser };
        const mockProfile = { id: 'u1', role: 'STUDENT' };

        (supabase.auth.getSession as any).mockResolvedValue({ data: { session: mockSession } });
        (supabase.from as any).mockReturnValue({
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValue({ data: mockProfile, error: null }),
        });

        const { getByTestId } = render(
            <AuthProvider>
                <TestComponent />
            </AuthProvider>
        );

        await waitFor(() => {
            expect(getByTestId('user-email')).toHaveTextContent('test@example.com');
            expect(getByTestId('profile-role')).toHaveTextContent('STUDENT');
        });
    });

    it('handles sign out correctly', async () => {
        const mockUser = { id: 'u1', email: 'test@example.com' };
        const mockSession = { user: mockUser };
        (supabase.auth.getSession as any).mockResolvedValue({ data: { session: mockSession } });
        (supabase.from as any).mockReturnValue({
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValue({ data: { id: 'u1', role: 'STUDENT' }, error: null }),
        });

        let authValue: any;
        const CapturingComponent = () => {
            authValue = useAuth();
            return null;
        };

        render(
            <AuthProvider>
                <CapturingComponent />
            </AuthProvider>
        );

        await waitFor(() => expect(authValue.loading).toBe(false));

        await authValue.signOut();
        expect(supabase.auth.signOut).toHaveBeenCalled();
        await waitFor(() => expect(authValue.user).toBeNull());
        expect(authValue.profile).toBeNull();
    });
});
