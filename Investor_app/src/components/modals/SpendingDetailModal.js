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
} from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { theme } from '../Theme';

/**
 * SpendingDetailModal - Modal for viewing details of an approved spending
 */
export default function SpendingDetailModal( // NOSONAR
{
    visible,
    spending,
    onClose,
    userAccounts = {},
    ledgers = [],
}) {
    if (!spending) return null;

    const resolvedLedgerName =
        spending?.detailDisplay?.ledgerName ||
        spending?.ledgerName ||
        spending?.ledger?.name ||
        ledgers.find((ledger) => String(ledger?.id) === String(spending?.ledgerId))?.name ||
        '';
    const resolvedSubLedgerName = String(spending?.detailDisplay?.subLedger || spending?.subLedger || '').trim();
    const backendDetailMode = String(spending?.detailMode || '').toLowerCase();
    const shouldShowLedgerDetails = backendDetailMode
        ? backendDetailMode === 'ledger'
        : Boolean(resolvedLedgerName || resolvedSubLedgerName || spending?.ledgerId);
    const shouldShowSubLedgerDetails = Boolean(shouldShowLedgerDetails && resolvedSubLedgerName);
    const shouldShowCategoryFallbackUnderLedger = Boolean(shouldShowLedgerDetails && !resolvedSubLedgerName);

    const resolvedProductName =
        String(
            spending?.detailDisplay?.productName ||
            spending?.productName ||
            spending?.materialType ||
            spending?.subLedger ||
            '',
        ).trim();
    const resolvedPaidToPerson = String(spending?.detailDisplay?.paidToPerson || spending?.paidTo?.person || '').trim();
    const resolvedPaidToPlace = String(spending?.detailDisplay?.paidToPlace || spending?.paidTo?.place || '').trim();

    return (
        <Modal
            visible={visible}
            animationType="slide"
            transparent={true}
            onRequestClose={onClose}
        >
            <TouchableWithoutFeedback onPress={onClose}>
                <View style={styles.modalOverlay}>
                    <TouchableWithoutFeedback onPress={(e) => e.stopPropagation()}>
                        <View style={styles.modalContent}>
                            <View style={styles.modalHeader}>
                                <Text style={styles.modalTitle}>Spending Details</Text>
                                <TouchableOpacity onPress={onClose}>
                                    <MaterialCommunityIcons name="close" size={24} color={theme.colors.textPrimary} />
                                </TouchableOpacity>
                            </View>
                            <ScrollView style={styles.modalList}>
                                <View style={styles.detailCard}>
                                    <View style={styles.detailAmountRow}>
                                        <Text style={styles.detailAmount}>₹{spending.amount?.toLocaleString()}</Text>
                                        <View style={[styles.detailCategoryBadge, { backgroundColor: spending.category === 'Service' ? '#EEF2FF' : '#D1FAE5' }]}>
                                            <MaterialCommunityIcons
                                                name={spending.category === 'Service' ? 'account-hard-hat' : 'package-variant'}
                                                size={16}
                                                color={spending.category === 'Service' ? '#6366F1' : '#10B981'}
                                            />
                                            <Text style={[styles.detailCategoryText, { color: spending.category === 'Service' ? '#6366F1' : '#10B981' }]}>
                                                {spending.category}
                                            </Text>
                                        </View>
                                    </View>

                                    <Text style={styles.detailDescription}>{spending.description}</Text>

                                    <View style={styles.detailInfoRows}>
                                        <View style={styles.detailInfoRow}>
                                            <MaterialCommunityIcons name="calendar" size={18} color={theme.colors.textSecondary} />
                                            <Text style={styles.detailInfoText}>{spending.date}</Text>
                                        </View>
                                        <View style={styles.detailInfoRow}>
                                            <MaterialCommunityIcons name="clock-outline" size={18} color={theme.colors.textSecondary} />
                                            <Text style={styles.detailInfoText}>
                                                {(() => {
                                                    const rawTime = spending.time;
                                                    if (!rawTime) return '—';
                                                    const t = String(rawTime).trim();

                                                    // If already has am/pm
                                                    if (/am|pm/i.test(t)) return t;

                                                    // Try parsing HH:mm or H:mm
                                                    const parts = t.split(':');
                                                    if (parts.length >= 2) {
                                                        let h = Number.parseInt(parts[0], 10);
                                                        const m = parts[1];
                                                        if (!Number.isNaN(h)) {
                                                            const ampm = h >= 12 ? 'PM' : 'AM';
                                                            h = h % 12;
                                                            h = h === 0 ? 12 : h;
                                                            return `${h}:${m} ${ampm}`;
                                                        }
                                                    }
                                                    return t;
                                                })()}
                                            </Text>
                                        </View>
                                        <View style={styles.detailInfoRow}>
                                            <MaterialCommunityIcons name="account" size={18} color={theme.colors.textSecondary} />
                                            <Text style={styles.detailInfoText}>
                                                Added by {spending.addedByName || userAccounts[spending.addedBy]?.name || userAccounts[spending.addedById]?.name || 'Unknown'}
                                            </Text>
                                        </View>

                                        {/* Funded By Row */}
                                        <View style={styles.detailInfoRow}>
                                            <MaterialCommunityIcons name="wallet-outline" size={18} color={theme.colors.textSecondary} />
                                            <Text style={styles.detailInfoText}>
                                                Funded By: <Text style={{ fontWeight: '600', color: theme.colors.textPrimary }}>
                                                    {(() => {
                                                        if (!spending.fundedBy || spending.fundedBy === spending.addedBy) {
                                                            return spending.addedByName || userAccounts[spending.addedBy]?.name || 'Self Funded';
                                                        }
                                                        return spending.fundedByName || userAccounts[spending.fundedBy]?.name || 'Unknown';
                                                    })()}
                                                </Text>
                                            </Text>
                                        </View>

                                        {shouldShowLedgerDetails && resolvedLedgerName ? (
                                            <View style={styles.detailInfoRow}>
                                                <MaterialCommunityIcons name="book-open-page-variant" size={18} color={theme.colors.textSecondary} />
                                                <Text style={styles.detailInfoText}>
                                                    Ledger: <Text style={styles.detailInfoValueStrong}>{resolvedLedgerName}</Text>
                                                </Text>
                                            </View>
                                        ) : null}

                                        {shouldShowSubLedgerDetails ? (
                                            <View style={styles.detailInfoRow}>
                                                <MaterialCommunityIcons name="account-group-outline" size={18} color={theme.colors.textSecondary} />
                                                <Text style={styles.detailInfoText}>
                                                    Sub-Ledger: <Text style={styles.detailInfoValueStrong}>{resolvedSubLedgerName}</Text>
                                                </Text>
                                            </View>
                                        ) : null}

                                        {(shouldShowCategoryFallbackUnderLedger || !shouldShowLedgerDetails) && (backendDetailMode === 'product' || spending?.category === 'Product') && resolvedProductName ? (
                                            <View style={styles.detailInfoRow}>
                                                <MaterialCommunityIcons name="package-variant" size={18} color={theme.colors.textSecondary} />
                                                <Text style={styles.detailInfoText}>
                                                    Product Name: <Text style={styles.detailInfoValueStrong}>{resolvedProductName}</Text>
                                                </Text>
                                            </View>
                                        ) : null}

                                        {(shouldShowCategoryFallbackUnderLedger || !shouldShowLedgerDetails) && (backendDetailMode === 'service' || spending?.category === 'Service') && resolvedPaidToPerson ? (
                                            <View style={styles.detailInfoRow}>
                                                <MaterialCommunityIcons name="account-outline" size={18} color={theme.colors.textSecondary} />
                                                <Text style={styles.detailInfoText}>
                                                    Paid To: <Text style={styles.detailInfoValueStrong}>{resolvedPaidToPerson}</Text>
                                                </Text>
                                            </View>
                                        ) : null}

                                        {(shouldShowCategoryFallbackUnderLedger || !shouldShowLedgerDetails) && (backendDetailMode === 'service' || spending?.category === 'Service') && resolvedPaidToPlace ? (
                                            <View style={styles.detailInfoRow}>
                                                <MaterialCommunityIcons name="map-marker-outline" size={18} color={theme.colors.textSecondary} />
                                                <Text style={styles.detailInfoText}>
                                                    Place: <Text style={styles.detailInfoValueStrong}>{resolvedPaidToPlace}</Text>
                                                </Text>
                                            </View>
                                        ) : null}
                                    </View>
                                </View>

                                {/* Approvals List */}
                                {spending.approvals && Object.keys(spending.approvals).length > 0 && (
                                    <View style={styles.approvalsSection}>
                                        <Text style={styles.approvalsSectionTitle}>Approvals</Text>
                                        {Object.entries(spending.approvals).map(([userId, approval]) => (
                                            <View key={userId} style={styles.approvalRow}>
                                                <View style={styles.approvalUserBadge}>
                                                    <Text style={styles.approvalUserInitial}>
                                                        {(approval?.userName || userAccounts[userId]?.name || 'U').charAt(0)}
                                                    </Text>
                                                </View>
                                                <Text style={styles.approvalUserName}>
                                                    {approval?.userName || userAccounts[userId]?.name || 'Unknown'}
                                                </Text>
                                                <View style={styles.approvalStatusBadge}>
                                                    <MaterialCommunityIcons name="check" size={14} color="#10B981" />
                                                    <Text style={styles.approvalStatusText}>Approved</Text>
                                                </View>
                                            </View>
                                        ))}
                                    </View>
                                )}
                            </ScrollView>
                        </View>
                    </TouchableWithoutFeedback>
                </View>
            </TouchableWithoutFeedback>
        </Modal>
    );
}

SpendingDetailModal.propTypes = {
    visible: PropTypes.bool.isRequired,
    spending: PropTypes.object,
    onClose: PropTypes.func.isRequired,
    userAccounts: PropTypes.object,
    ledgers: PropTypes.array,
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
    detailCard: {
        marginTop: 16,
    },
    detailAmountRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 16,
    },
    detailAmount: {
        ...theme.typography.hero,
        color: theme.colors.textPrimary,
    },
    detailCategoryBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 12,
        gap: 6,
    },
    detailCategoryText: {
        fontWeight: '600',
    },
    detailDescription: {
        ...theme.typography.body,
        color: theme.colors.textPrimary,
        marginBottom: 20,
    },
    detailInfoRows: {
        gap: 12,
    },
    detailInfoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    detailInfoText: {
        ...theme.typography.body,
        color: theme.colors.textSecondary,
    },
    detailInfoValueStrong: {
        color: theme.colors.textPrimary,
        fontWeight: '600',
    },
    approvalsSection: {
        marginTop: 24,
        paddingTop: 16,
        borderTopWidth: 1,
        borderTopColor: theme.colors.border,
    },
    approvalsSectionTitle: {
        ...theme.typography.bodyMedium,
        color: theme.colors.textPrimary,
        marginBottom: 12,
    },
    approvalRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 10,
    },
    approvalUserBadge: {
        width: 32,
        height: 32,
        borderRadius: 10,
        backgroundColor: theme.colors.primary,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 10,
    },
    approvalUserInitial: {
        color: 'white',
        fontWeight: '700',
        fontSize: 12,
    },
    approvalUserName: {
        flex: 1,
        ...theme.typography.body,
        color: theme.colors.textPrimary,
    },
    approvalStatusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#D1FAE5',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 10,
        gap: 4,
    },
    approvalStatusText: {
        color: '#10B981',
        fontWeight: '500',
        fontSize: 12,
    },
});
