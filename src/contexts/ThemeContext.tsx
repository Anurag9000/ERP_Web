import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

type Theme = 'light' | 'high-contrast' | 'dark' | 'colorblind-deuteranopia' | 'colorblind-protanopia';
type FontSize = 'small' | 'medium' | 'large';

interface ThemeContextType {
    theme: Theme;
    fontSize: FontSize;
    toggleTheme: () => void;
    setTheme: (theme: Theme) => void;
    setFontSize: (size: FontSize) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function useTheme() {
    const context = useContext(ThemeContext);
    if (!context) {
        throw new Error('useTheme must be used within a ThemeProvider');
    }
    return context;
}

export function ThemeProvider({ children }: { children: ReactNode }) {
    const [theme, setTheme] = useState<Theme>(() => {
        return (localStorage.getItem('theme') as Theme) || 'light';
    });

    const [fontSize, setFontSize] = useState<FontSize>(() => {
        return (localStorage.getItem('fontSize') as FontSize) || 'medium';
    });

    useEffect(() => {
        localStorage.setItem('theme', theme);

        // Remove all theme classes
        document.body.classList.remove('high-contrast', 'dark', 'colorblind-deuteranopia', 'colorblind-protanopia');
        document.documentElement.style.filter = '';

        // Apply theme
        if (theme === 'high-contrast') {
            document.body.classList.add('high-contrast');
            document.documentElement.style.filter = 'contrast(125%) saturate(110%)';
        } else if (theme === 'dark') {
            document.body.classList.add('dark');
        } else if (theme === 'colorblind-deuteranopia') {
            document.body.classList.add('colorblind-deuteranopia');
        } else if (theme === 'colorblind-protanopia') {
            document.body.classList.add('colorblind-protanopia');
        }
    }, [theme]);

    useEffect(() => {
        localStorage.setItem('fontSize', fontSize);

        // Remove all font size classes
        document.documentElement.classList.remove('text-sm', 'text-base', 'text-lg');

        // Apply font size
        const sizeClasses = {
            small: 'text-sm',
            medium: 'text-base',
            large: 'text-lg'
        };
        document.documentElement.classList.add(sizeClasses[fontSize]);
    }, [fontSize]);

    function toggleTheme() {
        setTheme((prev) => (prev === 'light' ? 'high-contrast' : 'light'));
    }

    return (
        <ThemeContext.Provider value={{ theme, fontSize, toggleTheme, setTheme, setFontSize }}>
            {children}
        </ThemeContext.Provider>
    );
}
