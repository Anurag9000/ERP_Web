import { describe, it, expect, vi } from 'vitest';
import {
    cn,
    formatDate,
    formatTime,
    formatCurrency,
    getDayAbbreviation,
    calculateGPA,
    getLetterGrade,
    getGradePoints,
    debounce
} from './utils';

describe('utils', () => {
    describe('cn', () => {
        it('merges class names correctly', () => {
            expect(cn('a', 'b')).toBe('a b');
            expect(cn('a', { b: true, c: false })).toBe('a b');
        });
    });

    describe('formatDate', () => {
        it('formats date string correctly', () => {
            const date = '2025-01-01';
            expect(formatDate(date)).toBe('Jan 1, 2025');
        });
    });

    describe('formatTime', () => {
        it('formats 24h time to 12h AM/PM', () => {
            expect(formatTime('09:30')).toBe('9:30 AM');
            expect(formatTime('14:45')).toBe('2:45 PM');
            expect(formatTime('00:00')).toBe('12:00 AM');
        });
    });

    describe('formatCurrency', () => {
        it('formats number to USD currency', () => {
            expect(formatCurrency(1234.56)).toContain('$1,234.56');
        });
    });

    describe('getDayAbbreviation', () => {
        it('returns correct abbreviations', () => {
            expect(getDayAbbreviation('MONDAY')).toBe('Mon');
            expect(getDayAbbreviation('FRIDAY')).toBe('Fri');
            expect(getDayAbbreviation('UNKNOWN')).toBe('UNKNOWN');
        });
    });

    describe('calculateGPA', () => {
        it('calculates average weighted by credits', () => {
            const grades = [
                { credits: 3, gradePoints: 4 },
                { credits: 4, gradePoints: 3 },
            ];
            // (3*4 + 4*3) / 7 = 24 / 7 = 3.428...
            expect(calculateGPA(grades)).toBeCloseTo(3.43, 2);
        });

        it('returns 0 for no grades', () => {
            expect(calculateGPA([])).toBe(0);
        });
    });

    describe('getLetterGrade', () => {
        it('returns correct letter for percentage', () => {
            expect(getLetterGrade(95)).toBe('A');
            expect(getLetterGrade(85)).toBe('B');
            expect(getLetterGrade(55)).toBe('F');
        });
    });

    describe('getGradePoints', () => {
        it('returns correct points for letter grade', () => {
            expect(getGradePoints('A')).toBe(4.0);
            expect(getGradePoints('B+')).toBe(3.3);
            expect(getGradePoints('F')).toBe(0.0);
        });
    });

    describe('debounce', () => {
        it('delays function execution', async () => {
            vi.useFakeTimers();
            const func = vi.fn();
            const debouncedFunc = debounce(func, 100);

            debouncedFunc();
            debouncedFunc();
            debouncedFunc();

            expect(func).not.toHaveBeenCalled();

            vi.advanceTimersByTime(100);
            expect(func).toHaveBeenCalledTimes(1);
            vi.useRealTimers();
        });
    });
});
