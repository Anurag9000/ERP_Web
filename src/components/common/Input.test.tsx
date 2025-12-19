import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { Input } from './Input';

describe('Input', () => {
    it('renders with label correctly', () => {
        render(<Input label="Username" />);
        expect(screen.getByText('Username')).toBeInTheDocument();
    });

    it('displays error message when error prop is provided', () => {
        render(<Input error="Invalid input" />);
        expect(screen.getByText('Invalid input')).toBeInTheDocument();
        const input = screen.getByRole('textbox');
        expect(input).toHaveClass('border-red-500');
    });

    it('passes extra props to the input element', () => {
        render(<Input placeholder="Enter your name" />);
        expect(screen.getByPlaceholderText('Enter your name')).toBeInTheDocument();
    });

    it('handles change events correctly', () => {
        const handleChange = vi.fn();
        render(<Input onChange={handleChange} />);
        const input = screen.getByRole('textbox');
        fireEvent.change(input, { target: { value: 'test value' } });
        expect(handleChange).toHaveBeenCalledTimes(1);
    });

    it('is disabled when disabled prop is true', () => {
        render(<Input disabled />);
        const input = screen.getByRole('textbox');
        expect(input).toBeDisabled();
    });
});
