import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { View, Text, TouchableOpacity, StyleSheet, Modal, Dimensions, TouchableWithoutFeedback } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { theme } from './Theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

/**
 * Tooltip - Contextual help for complex terms
 * Helps non-investors understand investment concepts
 */
export function Tooltip({ content, title, children, position = 'bottom' }) {
    const [visible, setVisible] = useState(false);

    return (
        <View style={styles.container}>
            <TouchableOpacity
                onPress={() => setVisible(true)}
                style={styles.trigger}
                activeOpacity={0.7}
            >
                {children || (
                    <View style={styles.helpIcon}>
                        <Ionicons name="help-circle-outline" size={16} color={theme.colors.textTertiary} />
                    </View>
                )}
            </TouchableOpacity>

            <Modal
                visible={visible}
                transparent
                animationType="fade"
                onRequestClose={() => setVisible(false)}
            >
                <TouchableWithoutFeedback onPress={() => setVisible(false)}>
                    <View style={styles.overlay}>
                        <TouchableWithoutFeedback onPress={(e) => e.stopPropagation()}>
                            <View style={styles.tooltipCard}>
                                {title && <Text style={styles.tooltipTitle}>{title}</Text>}
                                <Text style={styles.tooltipContent}>{content}</Text>
                                <TouchableOpacity
                                    style={styles.closeBtn}
                                    onPress={() => setVisible(false)}
                                >
                                    <Text style={styles.closeBtnText}>Got it</Text>
                                </TouchableOpacity>
                            </View>
                        </TouchableWithoutFeedback>
                    </View>
                </TouchableWithoutFeedback>
            </Modal>
        </View>
    );
}

Tooltip.propTypes = {
    content: PropTypes.string.isRequired,
    title: PropTypes.string,
    children: PropTypes.node,
    position: PropTypes.oneOf(['top', 'bottom', 'left', 'right']),
};

/**
 * InfoTooltip - Quick inline help icon with tooltip
 */
export function InfoTooltip({ content, title }) {
    return (
        <Tooltip content={content} title={title}>
            <View style={styles.infoIcon}>
                <Ionicons name="information-circle" size={18} color={theme.colors.primary} />
            </View>
        </Tooltip>
    );
}

InfoTooltip.propTypes = {
    content: PropTypes.string.isRequired,
    title: PropTypes.string,
};

/**
 * LabelWithHelp - Label text with attached tooltip
 */
export function LabelWithHelp({ label, helpText, helpTitle }) {
    return (
        <View style={styles.labelContainer}>
            <Text style={styles.label}>{label}</Text>
            <Tooltip content={helpText} title={helpTitle}>
                <Ionicons name="help-circle-outline" size={16} color={theme.colors.textTertiary} />
            </Tooltip>
        </View>
    );
}

LabelWithHelp.propTypes = {
    label: PropTypes.string.isRequired,
    helpText: PropTypes.string.isRequired,
    helpTitle: PropTypes.string,
};

/**
 * Investment term definitions for non-investors
 */
export const INVESTMENT_TERMS = {
    portfolio: {
        title: 'Portfolio Value',
        content: 'This is the total current value of all your investments combined. It shows how much your investments are worth right now.',
    },
    returns: {
        title: 'Returns',
        content: 'Returns are the profit (or loss) you\'ve made on your investments. A positive return means you\'ve earned money, while a negative return means you\'ve lost some.',
    },
    roi: {
        title: 'ROI (Return on Investment)',
        content: 'ROI shows the percentage gain or loss on your investment. For example, 15% ROI means you earned 15% profit on your original investment.',
    },
    privilegeChain: {
        title: 'Privilege Chain',
        content: 'The Privilege Chain ensures all investors must approve major project changes. This protects your investment by requiring everyone\'s consent.',
    },
    projectAdmin: {
        title: 'Project Admin',
        content: 'A Project Admin is an investor who created a project. They can add other investors and propose changes, but still need everyone\'s approval.',
    },
    riskLevel: {
        title: 'Risk Level',
        content: 'Risk level indicates how safe or risky an investment is. Low risk means safer but often lower returns. High risk means potential for higher returns but also higher chance of loss.',
    },
};

const styles = StyleSheet.create({
    container: {
        position: 'relative',
    },
    trigger: {
        padding: 4,
    },
    helpIcon: {
        opacity: 0.8,
    },
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
    },
    tooltipCard: {
        backgroundColor: 'white',
        borderRadius: 16,
        padding: 20,
        maxWidth: SCREEN_WIDTH - 48,
        width: '100%',
        ...theme.shadows.card,
    },
    tooltipTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: theme.colors.textPrimary,
        marginBottom: 10,
    },
    tooltipContent: {
        fontSize: 15,
        color: theme.colors.textSecondary,
        lineHeight: 22,
        marginBottom: 16,
    },
    closeBtn: {
        backgroundColor: theme.colors.primary,
        paddingVertical: 12,
        borderRadius: 10,
        alignItems: 'center',
    },
    closeBtnText: {
        color: 'white',
        fontSize: 15,
        fontWeight: '600',
    },
    infoIcon: {
        padding: 2,
    },
    labelContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    label: {
        fontSize: 14,
        fontWeight: '500',
        color: theme.colors.textSecondary,
    },
});

export default Tooltip;
