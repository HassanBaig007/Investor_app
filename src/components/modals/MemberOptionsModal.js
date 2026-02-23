import React from 'react';
import PropTypes from 'prop-types';
import {
    View,
    Text,
    Modal,
    StyleSheet,
    TouchableOpacity,
    TouchableWithoutFeedback,
} from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { theme } from '../Theme';

/**
 * MemberOptionsModal - Modal for managing project member permissions and removal
 */
export default function MemberOptionsModal({
    visible,
    member,
    onClose,
    onToggleStatus,
    onRemove,
    project
}) {
    if (!member) return null;

    const isPassive = member.role === 'passive';

    return (
        <Modal
            visible={visible}
            animationType="fade"
            transparent={true}
            onRequestClose={onClose}
        >
            <TouchableWithoutFeedback onPress={onClose}>
                <View style={styles.optionsOverlay}>
                    <TouchableWithoutFeedback onPress={(e) => e.stopPropagation()}>
                        <View style={styles.optionsContent}>
                            <Text style={styles.optionsTitle}>{member.name}</Text>

                            <TouchableOpacity
                                style={[styles.optionItem, { borderBottomWidth: 1, borderBottomColor: theme.colors.border }]}
                                onPress={() => onToggleStatus(member)}
                            >
                                <MaterialCommunityIcons
                                    name={isPassive ? "account-check" : "eye-off"}
                                    size={22}
                                    color={theme.colors.primary}
                                />
                                <View>
                                    <Text style={styles.optionText}>
                                        {isPassive ? 'Make Member Active' : 'Make Member Passive'}
                                    </Text>
                                    <Text style={styles.optionSubText}>
                                        {isPassive ? 'Allow adding expenses' : 'Restrict to view only'}
                                    </Text>
                                </View>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.optionItem, styles.optionItemDanger]}
                                onPress={() => onRemove(member)}
                            >
                                <MaterialCommunityIcons name="account-remove" size={22} color={theme.colors.danger} />
                                <Text style={[styles.optionText, styles.optionTextDanger]}>Remove from Project</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={styles.optionItemCancel}
                                onPress={onClose}
                            >
                                <Text style={styles.optionCancelText}>Cancel</Text>
                            </TouchableOpacity>
                        </View>
                    </TouchableWithoutFeedback>
                </View>
            </TouchableWithoutFeedback>
        </Modal>
    );
}

MemberOptionsModal.propTypes = {
    visible: PropTypes.bool.isRequired,
    member: PropTypes.object,
    onClose: PropTypes.func.isRequired,
    onToggleStatus: PropTypes.func.isRequired,
    onRemove: PropTypes.func.isRequired,
    project: PropTypes.shape({
        investorRoles: PropTypes.object
    }).isRequired,
};

const styles = StyleSheet.create({
    optionsOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    optionsContent: {
        backgroundColor: theme.colors.surface,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        padding: 20,
        paddingBottom: 40,
    },
    optionsTitle: {
        ...theme.typography.h4,
        color: theme.colors.textPrimary,
        textAlign: 'center',
        marginBottom: 20,
    },
    optionItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 16,
        gap: 12,
    },
    optionItemDanger: {
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.borderLight,
    },
    optionText: {
        ...theme.typography.body,
        color: theme.colors.textPrimary,
    },
    optionSubText: {
        fontSize: 12,
        color: theme.colors.textSecondary,
        marginTop: 2,
    },
    optionTextDanger: {
        color: theme.colors.danger,
    },
    optionItemCancel: {
        paddingVertical: 16,
        alignItems: 'center',
    },
    optionCancelText: {
        ...theme.typography.bodyMedium,
        color: theme.colors.textSecondary,
    },
});
