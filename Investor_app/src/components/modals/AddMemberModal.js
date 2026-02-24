import React from 'react';
import PropTypes from 'prop-types';
import {
    View,
    Text,
    Modal,
    StyleSheet,
    TouchableOpacity,
    TouchableWithoutFeedback,
    TextInput,
    ScrollView,
    KeyboardAvoidingView,
    Platform,
} from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { theme } from '../Theme';

/**
 * AddMemberModal - Modal for searching and adding new members to the project
 */
export default function AddMemberModal({
    visible,
    onClose,
    availableMembers,
    onAddMember,
    searchQuery,
    setSearchQuery
}) {
    return (
        <Modal
            visible={visible}
            animationType="slide"
            transparent={true}
            onRequestClose={onClose}
        >
            <TouchableWithoutFeedback onPress={onClose}>
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                    style={styles.modalOverlay}
                >
                    <TouchableWithoutFeedback onPress={(e) => e.stopPropagation()}>
                        <View style={styles.modalContent}>
                            <View style={styles.modalHeader}>
                                <Text style={styles.modalTitle}>Add Member</Text>
                                <TouchableOpacity onPress={onClose}>
                                    <MaterialCommunityIcons name="close" size={24} color={theme.colors.textPrimary} />
                                </TouchableOpacity>
                            </View>

                            <View style={styles.searchContainer}>
                                <MaterialCommunityIcons name="magnify" size={20} color={theme.colors.textTertiary} />
                                <TextInput
                                    style={styles.searchInput}
                                    placeholder="Search members..."
                                    placeholderTextColor={theme.colors.textTertiary}
                                    value={searchQuery}
                                    onChangeText={setSearchQuery}
                                />
                            </View>

                            <ScrollView style={styles.modalList}>
                                {availableMembers.filter(m =>
                                    m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                                    m.email.toLowerCase().includes(searchQuery.toLowerCase())
                                ).map(member => (
                                    <TouchableOpacity
                                        key={member.id}
                                        style={styles.modalMemberCard}
                                        onPress={() => onAddMember(member)}
                                    >
                                        <View style={styles.modalMemberAvatar}>
                                            <Text style={styles.modalMemberInitials}>
                                                {member.name.split(' ').map(n => n[0]).join('')}
                                            </Text>
                                        </View>
                                        <View style={styles.modalMemberInfo}>
                                            <Text style={styles.modalMemberName}>{member.name}</Text>
                                            <Text style={styles.modalMemberEmail}>{member.email}</Text>
                                        </View>
                                        <View style={styles.modalAddBtn}>
                                            <MaterialCommunityIcons name="plus" size={20} color="white" />
                                        </View>
                                    </TouchableOpacity>
                                ))}

                                {availableMembers.length === 0 && (
                                    <View style={styles.emptyState}>
                                        <MaterialCommunityIcons name="account-check" size={48} color={theme.colors.textTertiary} />
                                        <Text style={styles.emptyText}>All members are already in the project</Text>
                                    </View>
                                )}
                            </ScrollView>
                        </View>
                    </TouchableWithoutFeedback>
                </KeyboardAvoidingView>
            </TouchableWithoutFeedback>
        </Modal>
    );
}

AddMemberModal.propTypes = {
    visible: PropTypes.bool.isRequired,
    onClose: PropTypes.func.isRequired,
    availableMembers: PropTypes.array.isRequired,
    onAddMember: PropTypes.func.isRequired,
    searchQuery: PropTypes.string.isRequired,
    setSearchQuery: PropTypes.func.isRequired,
};

const styles = StyleSheet.create({
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: theme.colors.surface,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        maxHeight: '80%',
        paddingBottom: 20,
    },
    modalHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 20,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
    },
    modalTitle: {
        ...theme.typography.h4,
        color: theme.colors.textPrimary,
    },
    modalList: {
        paddingHorizontal: 20,
        maxHeight: '100%',
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: theme.colors.surfaceAlt,
        marginHorizontal: 20,
        marginTop: 16,
        marginBottom: 8,
        borderRadius: 12,
        paddingHorizontal: 14,
    },
    searchInput: {
        flex: 1,
        paddingVertical: 12,
        paddingHorizontal: 10,
        ...theme.typography.body,
        color: theme.colors.textPrimary,
    },
    modalMemberCard: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 14,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.borderLight,
    },
    modalMemberAvatar: {
        width: 44,
        height: 44,
        borderRadius: 12,
        backgroundColor: theme.colors.primary,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    modalMemberInitials: {
        color: 'white',
        fontWeight: '700',
        fontSize: 14,
    },
    modalMemberInfo: {
        flex: 1,
    },
    modalMemberName: {
        ...theme.typography.bodyMedium,
        color: theme.colors.textPrimary,
    },
    modalMemberEmail: {
        ...theme.typography.caption,
        color: theme.colors.textSecondary,
        marginTop: 2,
    },
    modalAddBtn: {
        width: 36,
        height: 36,
        borderRadius: 10,
        backgroundColor: theme.colors.success,
        alignItems: 'center',
        justifyContent: 'center',
    },
    emptyState: {
        alignItems: 'center',
        justifyContent: 'center',
        padding: 40,
        gap: 10,
    },
    emptyText: {
        ...theme.typography.body,
        color: theme.colors.textSecondary,
        textAlign: 'center',
    },
});
