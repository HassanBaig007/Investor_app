import React from 'react';
import PropTypes from 'prop-types';
import { View, Text, StyleSheet } from 'react-native';
import { theme } from './Theme';

/**
 * Badge - Status and count badges with consistent styling
 * Prevents text overflow with ellipsis
 */
export function Badge({
    label,
    variant = 'default',
    size = 'medium',
    icon,
    count,
}) {
    const variantStyles = {
        default: { bg: theme.colors.surfaceAlt, text: theme.colors.textSecondary },
        primary: { bg: theme.colors.primaryLight, text: theme.colors.primary },
        success: { bg: theme.colors.successLight, text: theme.colors.success },
        warning: { bg: theme.colors.warningLight, text: theme.colors.warning },
        danger: { bg: theme.colors.dangerLight, text: theme.colors.danger },
        info: { bg: theme.colors.infoLight, text: theme.colors.info },
    };

    const sizeStyles = {
        small: { paddingH: 6, paddingV: 2, fontSize: 10, iconSize: 10 },
        medium: { paddingH: 10, paddingV: 4, fontSize: 12, iconSize: 12 },
        large: { paddingH: 12, paddingV: 6, fontSize: 14, iconSize: 14 },
    };

    const colors = variantStyles[variant] || variantStyles.default;
    const sizing = sizeStyles[size] || sizeStyles.medium;

    // If it's just a count badge (no label)
    if (count !== undefined && !label) {
        return (
            <View style={[
                styles.countBadge,
                { backgroundColor: colors.bg },
            ]}>
                <Text style={[styles.countText, { color: colors.text }]}>
                    {count > 99 ? '99+' : count}
                </Text>
            </View>
        );
    }

    return (
        <View style={[
            styles.badge,
            {
                backgroundColor: colors.bg,
                paddingHorizontal: sizing.paddingH,
                paddingVertical: sizing.paddingV,
            },
        ]}>
            {icon && <View style={styles.badgeIcon}>{icon}</View>}
            <Text
                style={[
                    styles.badgeText,
                    { color: colors.text, fontSize: sizing.fontSize },
                ]}
                numberOfLines={1}
            >
                {label}
            </Text>
            {count !== undefined && (
                <View style={[styles.badgeCount, { backgroundColor: colors.text }]}>
                    <Text style={styles.badgeCountText}>{count > 99 ? '99+' : count}</Text>
                </View>
            )}
        </View>
    );
}

Badge.propTypes = {
    label: PropTypes.string,
    variant: PropTypes.oneOf(['default', 'primary', 'success', 'warning', 'danger', 'info']),
    size: PropTypes.oneOf(['small', 'medium', 'large']),
    icon: PropTypes.node,
    count: PropTypes.number,
};

/**
 * StatusBadge - Predefined status badges
 */
export function StatusBadge({ status }) {
    const statusConfig = {
        active: { label: 'Active', variant: 'success' },
        pending: { label: 'Pending', variant: 'warning' },
        completed: { label: 'Completed', variant: 'primary' },
        rejected: { label: 'Rejected', variant: 'danger' },
        approved: { label: 'Approved', variant: 'success' },
        draft: { label: 'Draft', variant: 'default' },
    };

    const config = statusConfig[status] || { label: status, variant: 'default' };

    return <Badge label={config.label} variant={config.variant} size="small" />;
}

StatusBadge.propTypes = {
    status: PropTypes.string.isRequired,
};

/**
 * RoleBadge - User role indicator
 */
export function RoleBadge({ role }) {
    const roleConfig = {
        investor: { label: 'Investor', variant: 'primary' },
        project_admin: { label: 'Admin', variant: 'warning' },
        super_admin: { label: 'Super Admin', variant: 'danger' },
        guest: { label: 'Guest', variant: 'default' },
    };

    const config = roleConfig[role] || { label: role, variant: 'default' };

    return <Badge label={config.label} variant={config.variant} size="small" />;
}

RoleBadge.propTypes = {
    role: PropTypes.string.isRequired,
};

const styles = StyleSheet.create({
    badge: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 20,
        alignSelf: 'flex-start',
        maxWidth: 150,
    },
    badgeIcon: {
        marginRight: 4,
    },
    badgeText: {
        fontWeight: '600',
        flexShrink: 1,
    },
    badgeCount: {
        marginLeft: 6,
        paddingHorizontal: 6,
        paddingVertical: 1,
        borderRadius: 10,
        minWidth: 20,
        alignItems: 'center',
    },
    badgeCountText: {
        fontSize: 10,
        fontWeight: '700',
        color: 'white',
    },
    countBadge: {
        width: 20,
        height: 20,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
    },
    countText: {
        fontSize: 11,
        fontWeight: '700',
    },
});

export default Badge;
