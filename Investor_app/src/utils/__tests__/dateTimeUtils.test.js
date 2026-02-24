import { getRelativeTime, getDaysRemaining } from '../dateTimeUtils';

describe('dateTimeUtils', () => {
    beforeAll(() => {
        jest.useFakeTimers();
        jest.setSystemTime(new Date('2026-02-23T10:00:00Z'));
    });

    afterAll(() => {
        jest.useRealTimers();
    });

    describe('getRelativeTime', () => {
        it('should return just now for missing or invalid dates', () => {
            expect(getRelativeTime(null)).toBe('just now');
            expect(getRelativeTime('invalid-date')).toBe('just now');
        });

        it('should return just now for very recent times', () => {
            const date = new Date('2026-02-23T09:59:30Z'); // 30s ago
            expect(getRelativeTime(date)).toBe('just now');
        });

        it('should return minutes ago', () => {
            const date = new Date('2026-02-23T09:55:00Z'); // 5min ago
            expect(getRelativeTime(date)).toBe('5 min ago');
        });

        it('should return hours ago', () => {
            const date = new Date('2026-02-23T08:00:00Z'); // 2h ago
            expect(getRelativeTime(date)).toBe('2 hours ago');

            const oneHour = new Date('2026-02-23T09:00:00Z'); // 1h ago
            expect(getRelativeTime(oneHour)).toBe('1 hour ago');
        });

        it('should return days ago', () => {
            const date = new Date('2026-02-20T10:00:00Z'); // 3 days ago
            expect(getRelativeTime(date)).toBe('3 days ago');
        });

        it('should return weeks ago', () => {
            const date = new Date('2026-02-09T10:00:00Z'); // 2 weeks ago
            expect(getRelativeTime(date)).toBe('2 weeks ago');
        });

        it('should return months ago', () => {
            const date = new Date('2025-12-23T10:00:00Z'); // 2 months ago
            expect(getRelativeTime(date)).toBe('2 months ago');
        });

        it('should return years ago', () => {
            const date = new Date('2024-02-23T10:00:00Z'); // 2 years ago
            expect(getRelativeTime(date)).toBe('2 years ago');
        });
    });

    describe('getDaysRemaining', () => {
        it('should return 0 for invalid dates', () => {
            expect(getDaysRemaining(null)).toBe(0);
            expect(getDaysRemaining('invalid')).toBe(0);
        });

        it('should return 0 for past dates', () => {
            const past = new Date('2026-02-20T10:00:00Z');
            expect(getDaysRemaining(past)).toBe(0);
        });

        it('should return correct days for future dates', () => {
            const future = new Date('2026-02-24T10:00:00Z'); // Exactly 1 day away
            expect(getDaysRemaining(future)).toBe(1);

            const farther = new Date('2026-03-05T10:00:00Z'); // March 5 (Feb has 28 days) -> 24-28 (5) + 1-5 (5) = 10? 
            // 23 to 24 (1), 25 (2), 26 (3), 27 (4), 28 (5), 1 (6), 2 (7), 3 (8), 4 (9), 5 (10)
            expect(getDaysRemaining(farther)).toBe(10);
        });
    });
});
