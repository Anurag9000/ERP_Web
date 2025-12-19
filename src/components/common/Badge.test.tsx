import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { Badge } from './Badge';

describe('Badge', () => {
    it('renders children correctly', () => {
        render(<Badge>Test Badge</Badge>);
        expect(screen.getByText('Test Badge')).toBeInTheDocument();
    });

    it('applies variant classes correctly', () => {
        const { container } = render(<Badge variant="success">Success</Badge>);
        expect(container.firstChild).toHaveClass('bg-[var(--pastel-green-bg)]');
    });

    it('renders a dot when dot prop is true', () => {
        const { container } = render(<Badge dot>Dot Badge</Badge>);
        const dot = container.querySelector('.w-2.h-2.rounded-full');
        expect(dot).toBeInTheDocument();
    });

    it('applies custom color style', () => {
        const { container } = render(<Badge color="#ff0000">Color Badge</Badge>);
        expect(container.firstChild).toHaveStyle({ backgroundColor: '#ff0000' });
    });
});
