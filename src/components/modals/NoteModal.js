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
    Keyboard,
    Dimensions,
} from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import LinearGradient from 'react-native-linear-gradient';
import { theme } from '../Theme';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

/**
 * NoteModal - Modal for adding/editing notes on transactions
 */
export default function NoteModal({
    visible,
    onClose,
    noteContent,
    setNoteContent,
    onSave
}) {
    return (
        <Modal
            visible={visible}
            transparent={true}
            animationType="fade"
            onRequestClose={onClose}
        >
            <TouchableWithoutFeedback onPress={onClose}>
                <View style={styles.noteModalOverlay}>
                    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                        <View style={styles.noteModalContainer}>
                            <View style={styles.noteModalHeader}>
                                <View style={styles.noteModalTitleRow}>
                                    <View style={styles.noteIconBadge}>
                                        <MaterialCommunityIcons name="note-text-outline" size={20} color={theme.colors.primary} />
                                    </View>
                                    <Text style={styles.noteModalTitle}>Add Note / Receipt</Text>
                                </View>
                                <TouchableOpacity onPress={onClose} style={styles.closeNoteBtn}>
                                    <MaterialCommunityIcons name="close" size={20} color={theme.colors.textSecondary} />
                                </TouchableOpacity>
                            </View>

                            <Text style={styles.noteAlertText}>
                                Add extra details, links to receipts, or comments for this transaction.
                            </Text>

                            <View style={styles.noteInputWrapper}>
                                <TextInput
                                    style={styles.noteInput}
                                    placeholder="E.g., https://drive.google.com/... or 'Bought from Local Store'"
                                    placeholderTextColor={theme.colors.textTertiary}
                                    value={noteContent}
                                    onChangeText={setNoteContent}
                                    multiline
                                    numberOfLines={4}
                                    textAlignVertical="top"
                                />
                            </View>

                            <View style={styles.noteModalFooter}>
                                <TouchableOpacity
                                    style={styles.modalCancelBtn}
                                    onPress={onClose}
                                >
                                    <Text style={styles.modalCancelText}>Cancel</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={styles.saveNoteBtn}
                                    onPress={onSave}
                                >
                                    <LinearGradient
                                        colors={theme.gradients.primary}
                                        style={styles.saveNoteGradient}
                                    >
                                        <Text style={styles.saveNoteText}>Save Note</Text>
                                    </LinearGradient>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </TouchableWithoutFeedback>
                </View>
            </TouchableWithoutFeedback>
        </Modal>
    );
}

NoteModal.propTypes = {
    visible: PropTypes.bool.isRequired,
    onClose: PropTypes.func.isRequired,
    noteContent: PropTypes.string.isRequired,
    setNoteContent: PropTypes.func.isRequired,
    onSave: PropTypes.func.isRequired,
};

const styles = StyleSheet.create({
    noteModalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    noteModalContainer: {
        backgroundColor: theme.colors.surface,
        marginHorizontal: 20,
        borderRadius: 24,
        padding: 24,
        width: SCREEN_WIDTH - 40,
        maxHeight: SCREEN_HEIGHT * 0.7,
        elevation: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.15,
        shadowRadius: 20,
    },
    noteModalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    noteModalTitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    noteIconBadge: {
        width: 40,
        height: 40,
        borderRadius: 12,
        backgroundColor: '#EEF2FF',
        alignItems: 'center',
        justifyContent: 'center',
    },
    noteModalTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: theme.colors.textPrimary,
    },
    closeNoteBtn: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: theme.colors.surfaceAlt,
        alignItems: 'center',
        justifyContent: 'center',
    },
    noteAlertText: {
        fontSize: 14,
        color: theme.colors.textSecondary,
        marginBottom: 16,
        lineHeight: 20,
    },
    noteInputWrapper: {
        backgroundColor: '#F8FAFC',
        borderRadius: 16,
        padding: 4,
        borderWidth: 1,
        borderColor: theme.colors.border,
        marginBottom: 20,
    },
    noteInput: {
        padding: 12,
        fontSize: 15,
        color: theme.colors.textPrimary,
        minHeight: 100,
        textAlignVertical: 'top',
    },
    noteModalFooter: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'flex-end',
        gap: 12,
    },
    modalCancelBtn: {
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderRadius: 12,
    },
    modalCancelText: {
        fontSize: 15,
        fontWeight: '600',
        color: theme.colors.textSecondary,
    },
    saveNoteBtn: {
        borderRadius: 12,
        overflow: 'hidden',
    },
    saveNoteGradient: {
        paddingHorizontal: 20,
        paddingVertical: 12,
    },
    saveNoteText: {
        fontSize: 15,
        fontWeight: '600',
        color: 'white',
    },
});
