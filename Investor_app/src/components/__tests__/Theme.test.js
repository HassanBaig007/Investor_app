import {
    theme,
    formatCurrency,
    getStatusColor,
    getStatusBgColor,
} from '../Theme';

describe('Theme helpers', () => {
    it('exposes core palette keys', () => {
        expect(theme.colors.primary).toBeDefined();
        expect(theme.colors.success).toBeDefined();
        expect(theme.typography.hero.fontSize).toBeGreaterThan(0);
    });

    it('formats currency across ranges and signed mode', () => {
        expect(formatCurrency(123)).toBe('₹123');
        expect(formatCurrency(1200)).toBe('₹1.2K');
        expect(formatCurrency(150000)).toBe('₹1.50L');
        expect(formatCurrency(20000000)).toBe('₹2.00Cr');
        expect(formatCurrency(5000, true)).toBe('+₹5.0K');
        expect(formatCurrency(-5000, true)).toBe('-₹5.0K');
    });

    it('maps status color tokens', () => {
        expect(getStatusColor('active')).toBe(theme.colors.success);
        expect(getStatusColor('pending')).toBe(theme.colors.warning);
        expect(getStatusColor('rejected')).toBe(theme.colors.danger);
        expect(getStatusColor('unknown')).toBe(theme.colors.textSecondary);
    });

    it('maps status background color tokens', () => {
        expect(getStatusBgColor('approved')).toBe(theme.colors.successLight);
        expect(getStatusBgColor('in_progress')).toBe(theme.colors.warningLight);
        expect(getStatusBgColor('overdue')).toBe(theme.colors.dangerLight);
        expect(getStatusBgColor('other')).toBe(theme.colors.surfaceAlt);
    });
});
