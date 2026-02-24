import React from 'react';
import PropTypes from 'prop-types';
import {
    View,
    Text,
    Modal,
    StyleSheet,
    TouchableOpacity,
    TouchableWithoutFeedback,
    ScrollView,
    TextInput,
    Keyboard,
    Dimensions
} from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { theme } from '../Theme';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

/**
 * SubLedgerSelectModal - Modal for selecting and managing sub-ledgers
 */
export default function SubLedgerSelectModal({
    visible,
    onClose,
    selectedLedgerObj,
    isAdmin,
    editMode,
    onEditModeChange,
    newName,
    onNewNameChange,
    onAdd,
    onSelect,
    selectedSubLedger,
    othersValue = '__OTHERS__',
    onDelete
}) {
    const isOthersSelected = selectedSubLedger === othersValue;

    return (
        <Modal
            visible={visible}
            animationType="fade"
            transparent={true}
            onRequestClose={onClose}
        >
            <TouchableWithoutFeedback onPress={onClose}>
                <View style={styles.modalOverlayCenter}>
                    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                        <View style={styles.modalContainerFancy}>
                            {/* Header */}
                            <View style={styles.modalHeaderInfo}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                    <MaterialCommunityIcons name="account-group" size={24} color={theme.colors.primary} />
                                    <Text style={styles.modalTitleFancy}>Select Sub-Ledger</Text>
                                </View>
                                <Text style={styles.modalSubtitleFancy}>
                                    Under: <Text style={{ fontWeight: '700', color: theme.colors.primary }}>{selectedLedgerObj?.name}</Text>
                                </Text>
                            </View>

                            {/* Controls */}
                            <View style={styles.modalControlsRow}>
                                <View style={{ flex: 1 }} />

                                {isAdmin && (
                                    <TouchableOpacity
                                        style={[styles.manageBtnFancy, editMode && styles.manageBtnActive]}
                                        onPress={() => onEditModeChange(!editMode)}
                                    >
                                        <MaterialCommunityIcons name={editMode ? "check" : "pencil"} size={20} color={editMode ? "white" : theme.colors.primary} />
                                        <Text style={[styles.manageBtnText, editMode && { color: 'white' }]}>
                                            {editMode ? 'Done' : 'Edit'}
                                        </Text>
                                    </TouchableOpacity>
                                )}
                            </View>

                            {/* Add New (Edit Mode) */}
                            {editMode && (
                                <View style={styles.addNewRowFancy}>
                                    <TextInput
                                        style={styles.addNewInputFancy}
                                        placeholder="Add Name (e.g. John Doe)"
                                        placeholderTextColor={theme.colors.textTertiary}
                                        value={newName}
                                        onChangeText={onNewNameChange}
                                    />
                                    <TouchableOpacity
                                        style={[styles.addBtnFancy, !newName.trim() && styles.disabledBtn]}
                                        onPress={onAdd}
                                        disabled={!newName.trim()}
                                    >
                                        <MaterialCommunityIcons name="plus" size={22} color="white" />
                                    </TouchableOpacity>
                                </View>
                            )}

                            <ScrollView style={styles.listFancy} showsVerticalScrollIndicator={false}>
                                {!editMode && (
                                    <TouchableOpacity
                                        style={[
                                            styles.listItemFancy,
                                            styles.othersRow,
                                            isOthersSelected && styles.listItemSelected,
                                        ]}
                                        onPress={() => onSelect(othersValue)}
                                        activeOpacity={0.7}
                                    >
                                        <View style={[styles.iconBoxFancy, isOthersSelected && { backgroundColor: theme.colors.primary }]}>
                                            <MaterialCommunityIcons name="shape-plus" size={20} color={isOthersSelected ? 'white' : theme.colors.primary} />
                                        </View>

                                        <View style={styles.listItemContent}>
                                            <Text style={[
                                                styles.listItemTitle,
                                                isOthersSelected && styles.listItemTitleSelected,
                                            ]}>Others</Text>
                                            <Text style={styles.othersHintText}>Use category details instead of a sub-ledger</Text>
                                        </View>

                                        {isOthersSelected && (
                                            <MaterialCommunityIcons name="check-circle" size={22} color={theme.colors.primary} />
                                        )}
                                    </TouchableOpacity>
                                )}

                                {selectedLedgerObj?.subLedgers && selectedLedgerObj.subLedgers.length > 0 ? (
                                    selectedLedgerObj.subLedgers.map((subName) => (
                                        <TouchableOpacity
                                            key={subName}
                                            style={[
                                                styles.listItemFancy,
                                                selectedSubLedger === subName && !editMode && styles.listItemSelected
                                            ]}
                                            onPress={() => onSelect(subName)}
                                            activeOpacity={0.7}
                                            disabled={editMode}
                                        >
                                            <View style={[styles.iconBoxFancy, selectedSubLedger === subName && !editMode && { backgroundColor: theme.colors.primary }]}>
                                                <MaterialCommunityIcons name="account" size={20} color={selectedSubLedger === subName && !editMode ? "white" : theme.colors.primary} />
                                            </View>

                                            <View style={styles.listItemContent}>
                                                <Text style={[
                                                    styles.listItemTitle,
                                                    selectedSubLedger === subName && !editMode && styles.listItemTitleSelected
                                                ]}>{subName}</Text>
                                            </View>

                                            {/* Action Icon */}
                                            {editMode ? (
                                                <TouchableOpacity
                                                    onPress={() => onDelete(subName)}
                                                    style={styles.deleteIconBtn}
                                                >
                                                    <MaterialCommunityIcons name="trash-can-outline" size={20} color="#EF4444" />
                                                </TouchableOpacity>
                                            ) : (
                                                selectedSubLedger === subName && (
                                                    <MaterialCommunityIcons name="check-circle" size={22} color={theme.colors.primary} />
                                                )
                                            )}
                                        </TouchableOpacity>
                                    ))
                                ) : (
                                    <View style={styles.emptyStateFancy}>
                                        <Text style={styles.emptyTextFancy}>No sub-ledgers found.</Text>
                                        <Text style={styles.emptySubTextFancy}>Add one to get started.</Text>
                                    </View>
                                )}
                            </ScrollView>

                            <TouchableOpacity style={styles.closeModalBtn} onPress={onClose}>
                                <Text style={styles.closeModalText}>Close</Text>
                            </TouchableOpacity>
                        </View>
                    </TouchableWithoutFeedback>
                </View>
            </TouchableWithoutFeedback>
        </Modal>
    );
}

SubLedgerSelectModal.propTypes = {
    visible: PropTypes.bool.isRequired,
    onClose: PropTypes.func.isRequired,
    selectedLedgerObj: PropTypes.object,
    isAdmin: PropTypes.bool.isRequired,
    editMode: PropTypes.bool.isRequired,
    onEditModeChange: PropTypes.func.isRequired,
    newName: PropTypes.string.isRequired,
    onNewNameChange: PropTypes.func.isRequired,
    onAdd: PropTypes.func.isRequired,
    onSelect: PropTypes.func.isRequired,
    selectedSubLedger: PropTypes.string,
    othersValue: PropTypes.string,
    onDelete: PropTypes.func.isRequired,
};

const styles = StyleSheet.create({
    modalOverlayCenter: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContainerFancy: {
        width: SCREEN_WIDTH - 40,
        backgroundColor: theme.colors.surface,
        borderRadius: 24,
        padding: 20,
        maxHeight: SCREEN_HEIGHT * 0.75,
        elevation: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.2,
        shadowRadius: 20,
        alignSelf: 'center',
    },
    modalHeaderInfo: {
        marginBottom: 16,
    },
    modalTitleFancy: {
        fontSize: 22,
        fontWeight: '700',
        color: theme.colors.textPrimary,
        marginBottom: 4,
    },
    modalSubtitleFancy: {
        fontSize: 14,
        color: theme.colors.textSecondary,
    },
    modalControlsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        marginBottom: 16,
    },
    manageBtnFancy: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 14,
        height: 44,
        borderRadius: 12,
        backgroundColor: '#EEF2FF',
    },
    manageBtnActive: {
        backgroundColor: theme.colors.primary,
    },
    manageBtnText: {
        fontSize: 14,
        fontWeight: '600',
        color: theme.colors.primary,
    },
    addNewRowFancy: {
        flexDirection: 'row',
        gap: 10,
        marginBottom: 16,
    },
    addNewInputFancy: {
        flex: 1,
        height: 48,
        backgroundColor: theme.colors.surfaceAlt,
        borderRadius: 12,
        paddingHorizontal: 12,
        borderWidth: 1,
        borderColor: theme.colors.border,
        color: theme.colors.textPrimary,
    },
    addBtnFancy: {
        width: 48,
        height: 48,
        borderRadius: 12,
        backgroundColor: theme.colors.primary,
        alignItems: 'center',
        justifyContent: 'center',
    },
    disabledBtn: {
        opacity: 0.5,
        backgroundColor: theme.colors.textTertiary,
    },
    listFancy: {
        maxHeight: 300,
    },
    listItemFancy: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 12,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.borderLight,
        gap: 14,
    },
    listItemSelected: {
        backgroundColor: '#EEF2FF',
        borderRadius: 12,
        borderBottomWidth: 0,
    },
    othersRow: {
        borderWidth: 1,
        borderColor: '#E0E7FF',
        borderRadius: 12,
        marginBottom: 10,
        backgroundColor: '#F8FAFF',
        borderBottomWidth: 1,
    },
    iconBoxFancy: {
        width: 40,
        height: 40,
        borderRadius: 10,
        backgroundColor: '#F3F4F6',
        alignItems: 'center',
        justifyContent: 'center',
    },
    listItemContent: {
        flex: 1,
    },
    listItemTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: theme.colors.textPrimary,
    },
    listItemTitleSelected: {
        color: theme.colors.primary,
    },
    othersHintText: {
        fontSize: 12,
        color: theme.colors.textSecondary,
        marginTop: 2,
    },
    deleteIconBtn: {
        padding: 8,
        backgroundColor: '#FEE2E2',
        borderRadius: 8,
    },
    emptyStateFancy: {
        alignItems: 'center',
        paddingVertical: 30,
        gap: 8,
    },
    emptyTextFancy: {
        fontSize: 16,
        color: theme.colors.textSecondary,
        fontWeight: '500',
    },
    emptySubTextFancy: {
        fontSize: 14,
        color: theme.colors.textTertiary,
    },
    closeModalBtn: {
        marginTop: 16,
        alignItems: 'center',
        paddingVertical: 12,
    },
    closeModalText: {
        fontSize: 16,
        fontWeight: '600',
        color: theme.colors.textSecondary,
    },
});
