import React from 'react';
import PropTypes from 'prop-types';
import { View, StyleSheet } from 'react-native';
import { theme } from './Theme';

/**
 * Card - Standardized card component with consistent styling
 * Prevents text overflow and maintains visual consistency
 */
export function Card({
    children,
    variant = 'default',
    padding = 'medium',
    style,
    noPadding = false,
}) {
    const paddingValue = noPadding ? 0 : (
        padding === 'small' ? 12 :
            padding === 'medium' ? 16 :
                padding === 'large' ? 24 : 16
    );

    const variantStyles = {
        default: styles.cardDefault,
        elevated: styles.cardElevated,
        outlined: styles.cardOutlined,
        ghost: styles.cardGhost,
    };

    return (
        <View style={[
            styles.card,
            variantStyles[variant],
            { padding: paddingValue },
            style,
        ]}>
            {children}
        </View>
    );
}

Card.propTypes = {
    children: PropTypes.node.isRequired,
    variant: PropTypes.oneOf(['default', 'elevated', 'outlined', 'ghost']),
    padding: PropTypes.oneOf(['small', 'medium', 'large']),
    style: PropTypes.oneOfType([PropTypes.object, PropTypes.array]),
    noPadding: PropTypes.bool,
};

/**
 * CardHeader - Consistent card header with title and optional action
 */
export function CardHeader({ title, subtitle, action, icon }) {
    return (
        <View style={styles.cardHeader}>
            <View style={styles.cardHeaderContent}>
                {icon && <View style={styles.cardHeaderIcon}>{icon}</View>}
                <View style={styles.cardHeaderText}>
                    <Text style={styles.cardHeaderTitle} numberOfLines={1}>{title}</Text>
                    {subtitle && (
                        <Text style={styles.cardHeaderSubtitle} numberOfLines={1}>{subtitle}</Text>
                    )}
                </View>
            </View>
            {action && <View style={styles.cardHeaderAction}>{action}</View>}
        </View>
    );
}

import { Text } from 'react-native';

CardHeader.propTypes = {
    title: PropTypes.string.isRequired,
    subtitle: PropTypes.string,
    action: PropTypes.node,
    icon: PropTypes.node,
};

/**
 * CardRow - Horizontal row with label and value, prevents overflow
 */
export function CardRow({ label, value, valueColor, icon }) {
    return (
        <View style={styles.cardRow}>
            <View style={styles.cardRowLabel}>
                {icon && <View style={styles.cardRowIcon}>{icon}</View>}
                <Text style={styles.cardRowLabelText} numberOfLines={1}>{label}</Text>
            </View>
            <Text
                style={[styles.cardRowValue, valueColor && { color: valueColor }]}
                numberOfLines={1}
            >
                {value}
            </Text>
        </View>
    );
}

CardRow.propTypes = {
    label: PropTypes.string.isRequired,
    value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
    valueColor: PropTypes.string,
    icon: PropTypes.node,
};

const styles = StyleSheet.create({
    card: {
        backgroundColor: theme.colors.surface,
        borderRadius: 16,
        overflow: 'hidden', // Prevents content overflow
    },
    cardDefault: {
        ...theme.shadows.soft,
    },
    cardElevated: {
        ...theme.shadows.card,
    },
    cardOutlined: {
        borderWidth: 1,
        borderColor: theme.colors.border,
    },
    cardGhost: {
        backgroundColor: 'transparent',
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 12,
    },
    cardHeaderContent: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        marginRight: 12,
    },
    cardHeaderIcon: {
        marginRight: 12,
    },
    cardHeaderText: {
        flex: 1,
    },
    cardHeaderTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: theme.colors.textPrimary,
    },
    cardHeaderSubtitle: {
        fontSize: 13,
        color: theme.colors.textSecondary,
        marginTop: 2,
    },
    cardHeaderAction: {
        flexShrink: 0,
    },
    cardRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 8,
    },
    cardRowLabel: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        marginRight: 12,
    },
    cardRowIcon: {
        marginRight: 8,
    },
    cardRowLabelText: {
        fontSize: 14,
        color: theme.colors.textSecondary,
        flexShrink: 1,
    },
    cardRowValue: {
        fontSize: 14,
        fontWeight: '600',
        color: theme.colors.textPrimary,
        textAlign: 'right',
        flexShrink: 0,
        maxWidth: '50%',
    },
});

export default Card;
