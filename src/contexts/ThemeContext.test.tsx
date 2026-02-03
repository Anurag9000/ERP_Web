import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, beforeEach } from 'vitest';
import { ThemeProvider, useTheme } from './ThemeContext';

const TestComponent = () => {
    const { theme, toggleTheme, setTheme } = useTheme();
    return (
        <div>
            <div data-testid="theme">{theme}</div>
            <button onClick={toggleTheme}>Toggle</button>
            <button onClick={() => setTheme('dark')}>Set Dark</button>
        </div>
    );
};

describe('ThemeContext', () => {
    beforeEach(() => {
        localStorage.clear();
        document.body.className = '';
    });

    it('initializes from localStorage or defaults to light', () => {
        localStorage.setItem('theme', 'dark');
        render(
            <ThemeProvider>
                <TestComponent />
            </ThemeProvider>
        );
        expect(screen.getByTestId('theme')).toHaveTextContent('dark');
        expect(document.body.classList.contains('dark')).toBe(true);
    });

    it('toggles theme correctly', () => {
        render(
            <ThemeProvider>
                <TestComponent />
            </ThemeProvider>
        );
        const toggleBtn = screen.getByText('Toggle');

        act(() => {
            fireEvent.click(toggleBtn);
        });

        expect(screen.getByTestId('theme')).toHaveTextContent('high-contrast');
        expect(document.body.classList.contains('high-contrast')).toBe(true);
    });

    it('applies explicit theme updates', () => {
        render(
            <ThemeProvider>
                <TestComponent />
            </ThemeProvider>
        );
        const setDarkBtn = screen.getByText('Set Dark');

        act(() => {
            fireEvent.click(setDarkBtn);
        });

        expect(screen.getByTestId('theme')).toHaveTextContent('dark');
        expect(document.body.classList.contains('dark')).toBe(true);
    });
});
