import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { Card } from './Card';

describe('Card', () => {
    it('renders children correctly', () => {
        render(<Card>Card Content</Card>);
        expect(screen.getByText('Card Content')).toBeInTheDocument();
    });

    it('renders title and subtitle when provided', () => {
        render(<Card title="My Title" subtitle="My Subtitle">Content</Card>);
        expect(screen.getByText('My Title')).toBeInTheDocument();
        expect(screen.getByText('My Subtitle')).toBeInTheDocument();
    });

    it('applies border color style', () => {
        const { container } = render(<Card color="#00ff00">Content</Card>);
        expect(container.firstChild).toHaveStyle({ borderLeftColor: '#00ff00', borderLeftWidth: '4px' });
    });

    it('applies custom className', () => {
        const { container } = render(<Card className="custom-card">Content</Card>);
        expect(container.firstChild).toHaveClass('custom-card');
    });
});
