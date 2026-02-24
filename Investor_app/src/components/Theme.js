// InvestFlow Theme - Premium Design System
// Royal, Elegant, Professional Investment Platform
// Enhanced for Android with vibrant colors and high contrast

import { Platform } from 'react-native';

export const theme = {
    colors: {
        // Premium Primary - Vibrant Electric Indigo (Higher contrast for Android)
        primary: '#5B5CFF',        // Electric Indigo - More vivid
        primaryLight: '#E8E8FF',   // Soft Indigo Tint
        primaryDark: '#3D3EDB',    // Deep Indigo
        primaryGradient: ['#667eea', '#764ba2'],
        primaryVibrant: '#7C3AED', // Vibrant Purple accent

        // Accent - Brilliant Gold/Amber (Pop on Android screens)
        accent: '#FF9500',         // Brilliant Orange-Gold
        accentLight: '#FFF3E0',    // Soft Gold Tint        
        accentDark: '#E68A00',     // Deep Gold

        // Secondary - Electric Teal (High visibility)
        secondary: '#00D1B2',      // Electric Teal - Prosperity
        secondaryLight: '#E0FFF9', // Teal 100
        secondaryGradient: ['#00D1B2', '#00A896'],

        // Background Colors - Clean with subtle warmth
        background: '#F5F7FA',     // Warm Light Gray
        surface: '#FFFFFF',        // Clean White
        surfaceAlt: '#EDF1F7',     // Subtle Gray with warmth
        surfaceElevated: '#FFFFFF',
        surfaceDark: '#1A1A2E',    // Dark mode surface

        // Text Colors - Maximum Contrast for Android readability
        textPrimary: '#0D0D1A',    // Near Black - Maximum readability
        textSecondary: '#3D4663',  // Dark Gray - High contrast
        textTertiary: '#7A839E',   // Medium Gray
        textLight: '#FFFFFF',
        textMuted: '#B8BECC',

        // Semantic Colors - Vivid and Clear
        success: '#00C853',        // Brilliant Green - Profit, Growth
        successLight: '#E8F5E9',   // Soft Green
        successGradient: ['#00C853', '#00A844'],
        successVibrant: '#2ECC71', // Extra pop for success states

        warning: '#FFB300',        // Brilliant Amber - Attention
        warningLight: '#FFF8E1',   // Soft Amber

        danger: '#FF3D57',         // Vivid Red - Alert, Loss
        dangerLight: '#FFEBEE',    // Soft Red
        dangerGradient: ['#FF3D57', '#E53935'],

        info: '#2196F3',           // Vivid Blue - Information
        infoLight: '#E3F2FD',      // Soft Blue

        // Border Colors - Refined
        border: '#E0E5EC',         // Subtle Border
        borderLight: '#EDF1F7',    // Very Light Border
        borderFocus: '#5B5CFF',    // Focus State
        borderAccent: 'rgba(91, 92, 255, 0.3)', // Glowing border

        // Premium Card Colors - Richer gradients
        cardGradientStart: 'rgba(91, 92, 255, 0.12)',
        cardGradientEnd: 'rgba(124, 58, 237, 0.06)',
        cardHighlight: 'rgba(255, 149, 0, 0.1)', // Gold highlight

        // Chart Colors - Harmonious and Vibrant
        chart: {
            profit: '#00C853',
            loss: '#FF3D57',
            neutral: '#546E7A',
            line1: '#5B5CFF',
            line2: '#00D1B2',
            line3: '#FFB300',
            line4: '#7C3AED',
            area: 'rgba(91, 92, 255, 0.18)',
        },

        // Glassmorphism - Enhanced for Android
        glass: 'rgba(255, 255, 255, 0.92)',
        glassLight: 'rgba(255, 255, 255, 0.75)',
        glassDark: 'rgba(13, 13, 26, 0.85)',
        glassAccent: 'rgba(91, 92, 255, 0.08)',

        // Gradient overlays
        overlayLight: 'rgba(255, 255, 255, 0.95)',
        overlayDark: 'rgba(0, 0, 0, 0.6)',
    },

    // Premium Gradients - More vibrant and eye-catching
    gradients: {
        primary: ['#667eea', '#764ba2'],
        primaryVertical: ['#5B5CFF', '#3D3EDB'],
        primaryVibrant: ['#7C3AED', '#5B5CFF'],
        success: ['#00C853', '#00A844'],
        successVibrant: ['#2ECC71', '#27AE60'],
        royal: ['#1e3a8a', '#3730a3', '#4c1d95'],
        gold: ['#FFB300', '#FF9500'],
        sunset: ['#FF6B6B', '#FF8E53'],
        ocean: ['#00D1B2', '#0096C7'],
        purple: ['#7C3AED', '#5B21B6'],
        dark: ['#1A1A2E', '#16213E'],
        premium: ['#5B5CFF', '#7C3AED', '#A855F7'],
        warmGold: ['#FF9500', '#FFB300', '#FFCC00'],
        electricBlue: ['#2196F3', '#00BCD4'],
        nightSky: ['#0F0C29', '#302B63', '#24243E'],
    },

    spacing: {
        xs: 4,
        s: 8,
        m: 16,
        l: 24,
        xl: 32,
        xxl: 48,
    },

    borderRadius: {
        xs: 6,
        s: 10,
        m: 14,
        l: 18,
        xl: 24,
        xxl: 32,
        full: 9999,
    },

    // Neuromarketing Typography System
    // Based on emotional impact, visual hierarchy, and trust-building principles
    typography: {
        // Hero - Maximum Emotional Impact (Portfolio Value, Key Numbers)
        hero: { fontSize: 42, fontWeight: '800', lineHeight: 48, letterSpacing: -1.5 },
        heroMedium: { fontSize: 36, fontWeight: '700', lineHeight: 42, letterSpacing: -1 },

        // Headers - Authority & Trust (Premium Weights for confidence)
        h1: { fontSize: 28, fontWeight: '700', lineHeight: 36, letterSpacing: -0.5 },
        h2: { fontSize: 22, fontWeight: '700', lineHeight: 30, letterSpacing: -0.3 },
        h3: { fontSize: 18, fontWeight: '600', lineHeight: 26, letterSpacing: -0.2 },
        h4: { fontSize: 16, fontWeight: '600', lineHeight: 22 },

        // Body - Optimal Readability (14-16px per neuromarketing research)
        body: { fontSize: 15, fontWeight: '400', lineHeight: 22 },
        bodyMedium: { fontSize: 15, fontWeight: '500', lineHeight: 22 },
        bodySemibold: { fontSize: 15, fontWeight: '600', lineHeight: 22 },

        // Small - Supporting Info (Clear but not dominant)
        small: { fontSize: 13, fontWeight: '400', lineHeight: 18 },
        smallMedium: { fontSize: 13, fontWeight: '500', lineHeight: 18 },
        smallSemibold: { fontSize: 13, fontWeight: '600', lineHeight: 18 },

        // Caption - Subtle Context (Labels, timestamps)
        caption: { fontSize: 11, fontWeight: '500', lineHeight: 14, letterSpacing: 0.3 },
        captionMedium: { fontSize: 11, fontWeight: '600', lineHeight: 14, letterSpacing: 0.3 },
        captionBold: { fontSize: 11, fontWeight: '700', lineHeight: 14, letterSpacing: 0.5 },

        // Money/Numbers - Trust & Impact (Tight letter spacing for professionalism)
        amount: { fontSize: 32, fontWeight: '700', lineHeight: 38, letterSpacing: -0.8 },
        amountLarge: { fontSize: 40, fontWeight: '800', lineHeight: 46, letterSpacing: -1.2 },
        amountSmall: { fontSize: 20, fontWeight: '600', lineHeight: 26, letterSpacing: -0.3 },

        // Labels - Scannability (Uppercase for quick recognition)
        label: { fontSize: 10, fontWeight: '600', lineHeight: 12, letterSpacing: 1, textTransform: 'uppercase' },
        labelLarge: { fontSize: 12, fontWeight: '600', lineHeight: 16, letterSpacing: 0.8, textTransform: 'uppercase' },

        // Urgency - Action-Oriented (Slightly bold for CTAs)
        cta: { fontSize: 15, fontWeight: '600', lineHeight: 20, letterSpacing: 0.2 },
        ctaLarge: { fontSize: 17, fontWeight: '700', lineHeight: 24, letterSpacing: 0.1 },

        // Friendly - Approachable (For onboarding, tips)
        friendly: { fontSize: 16, fontWeight: '500', lineHeight: 24, letterSpacing: 0.1 },
        friendlyLarge: { fontSize: 18, fontWeight: '600', lineHeight: 28, letterSpacing: 0 },
    },

    shadows: {
        none: {
            shadowColor: 'transparent',
            shadowOffset: { width: 0, height: 0 },
            shadowOpacity: 0,
            shadowRadius: 0,
            elevation: 0,
        },
        soft: {
            shadowColor: '#5B5CFF',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.08,
            shadowRadius: 10,
            elevation: Platform.OS === 'android' ? 3 : 2,
        },
        card: {
            shadowColor: '#0D0D1A',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.08,
            shadowRadius: 16,
            elevation: Platform.OS === 'android' ? 5 : 4,
        },
        elevated: {
            shadowColor: '#0D0D1A',
            shadowOffset: { width: 0, height: 8 },
            shadowOpacity: 0.12,
            shadowRadius: 24,
            elevation: Platform.OS === 'android' ? 8 : 6,
        },
        strong: {
            shadowColor: '#0D0D1A',
            shadowOffset: { width: 0, height: 12 },
            shadowOpacity: 0.18,
            shadowRadius: 32,
            elevation: Platform.OS === 'android' ? 12 : 10,
        },
        glow: {
            shadowColor: '#5B5CFF',
            shadowOffset: { width: 0, height: 8 },
            shadowOpacity: 0.4,
            shadowRadius: 20,
            elevation: Platform.OS === 'android' ? 12 : 10,
        },
        successGlow: {
            shadowColor: '#00C853',
            shadowOffset: { width: 0, height: 6 },
            shadowOpacity: 0.4,
            shadowRadius: 16,
            elevation: Platform.OS === 'android' ? 8 : 6,
        },
        dangerGlow: {
            shadowColor: '#FF3D57',
            shadowOffset: { width: 0, height: 6 },
            shadowOpacity: 0.4,
            shadowRadius: 16,
            elevation: Platform.OS === 'android' ? 8 : 6,
        },
        goldGlow: {
            shadowColor: '#FFB300',
            shadowOffset: { width: 0, height: 6 },
            shadowOpacity: 0.4,
            shadowRadius: 16,
            elevation: Platform.OS === 'android' ? 8 : 6,
        },
        premium: {
            shadowColor: '#3D3EDB',
            shadowOffset: { width: 0, height: 16 },
            shadowOpacity: 0.3,
            shadowRadius: 32,
            elevation: Platform.OS === 'android' ? 16 : 12,
        },
        floating: {
            shadowColor: '#0D0D1A',
            shadowOffset: { width: 0, height: -4 },
            shadowOpacity: 0.08,
            shadowRadius: 16,
            elevation: Platform.OS === 'android' ? 10 : 8,
        },
    },
};

// Helper function to format currency in INR
export const formatCurrency = (amount, showSign = false) => {
    const absAmount = Math.abs(amount);
    let formatted;

    if (absAmount >= 10000000) {
        formatted = `₹${(absAmount / 10000000).toFixed(2)}Cr`;
    } else if (absAmount >= 100000) {
        formatted = `₹${(absAmount / 100000).toFixed(2)}L`;
    } else if (absAmount >= 1000) {
        formatted = `₹${(absAmount / 1000).toFixed(1)}K`;
    } else {
        formatted = `₹${absAmount.toLocaleString('en-IN')}`;
    }

    if (showSign && amount !== 0) {
        return amount > 0 ? `+${formatted}` : `-${formatted}`;
    }
    return formatted;
};

// Helper to get status color
export const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
        case 'active':
        case 'completed':
        case 'approved':
            return theme.colors.success;
        case 'pending':
        case 'in_progress':
            return theme.colors.warning;
        case 'delayed':
        case 'rejected':
        case 'overdue':
            return theme.colors.danger;
        default:
            return theme.colors.textSecondary;
    }
};

// Helper to get status background color
export const getStatusBgColor = (status) => {
    switch (status?.toLowerCase()) {
        case 'active':
        case 'completed':
        case 'approved':
            return theme.colors.successLight;
        case 'pending':
        case 'in_progress':
            return theme.colors.warningLight;
        case 'delayed':
        case 'rejected':
        case 'overdue':
            return theme.colors.dangerLight;
        default:
            return theme.colors.surfaceAlt;
    }
};
