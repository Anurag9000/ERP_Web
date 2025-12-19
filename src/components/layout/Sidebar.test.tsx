import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { Sidebar } from './Sidebar';
import { useAuth } from '../../contexts/AuthContext';
import { MemoryRouter } from 'react-router-dom';

vi.mock('../../contexts/AuthContext', () => ({
    useAuth: vi.fn(),
}));

describe('Sidebar', () => {
    it('renders links specific to STUDENT role', () => {
        (useAuth as any).mockReturnValue({
            profile: { role: 'STUDENT' }
        });

        render(
            <MemoryRouter>
                <Sidebar />
            </MemoryRouter>
        );

        expect(screen.getByText('Dashboard')).toBeInTheDocument();
        expect(screen.getByText('My Registration')).toBeInTheDocument();
        expect(screen.getByText('Fees & Payments')).toBeInTheDocument();
        // Should NOT show Admin links
        expect(screen.queryByText('User Management')).not.toBeInTheDocument();
    });

    it('renders links specific to INSTRUCTOR role', () => {
        (useAuth as any).mockReturnValue({
            profile: { role: 'INSTRUCTOR' }
        });

        render(
            <MemoryRouter>
                <Sidebar />
            </MemoryRouter>
        );

        expect(screen.getByText('My Sections')).toBeInTheDocument();
        expect(screen.getByText('Gradebook')).toBeInTheDocument();
        expect(screen.getByText('Attendance')).toBeInTheDocument();
        // Should NOT show student specific links
        expect(screen.queryByText('My Registration')).not.toBeInTheDocument();
    });

    it('renders links specific to ADMIN role', () => {
        (useAuth as any).mockReturnValue({
            profile: { role: 'ADMIN' }
        });

        render(
            <MemoryRouter>
                <Sidebar />
            </MemoryRouter>
        );

        expect(screen.getByText('User Management')).toBeInTheDocument();
        expect(screen.getByText('System Settings')).toBeInTheDocument();
        expect(screen.getByText('Audit Trail')).toBeInTheDocument();
    });
});
