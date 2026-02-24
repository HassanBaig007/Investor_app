import React from 'react';
import PropTypes from 'prop-types';
import {
    View,
    Text,
    Modal,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
} from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { theme } from '../Theme';

/**
 * PendingApprovalsModal - Modal to view and act on pending spendings
 */
export default function PendingApprovalsModal({
    visible,
    onClose,
    pendingSpendings,
    rejectedSpendings,
    currentUser,
    project,
    projectMemberIds,
    onApprove,
    onReject,
    actionFeedback,
    isPassiveViewer,
    userAccounts = {},
}) {

    const getRefId = (value) => {
        if (!value) return null;
        if (typeof value === 'string') return value;
        if (value._id) return String(value._id);
        if (value.id) return String(value.id);
        return null;
    };

    const currentUserId = String(currentUser?.id || currentUser?._id || '');

    const getEffectiveApprovers = () => {
        // Only active investors who are NOT super_admin can approve
        const investors = (project?.investors || []).filter((inv) => {
            const memberRole = inv.role || 'active';
            const accountRole = inv.user?.role;
            return memberRole === 'active' && accountRole !== 'super_admin';
        });

        const creatorId = getRefId(project?.createdBy);
        const creatorIsSuperAdmin = project?.createdBy?.role === 'super_admin';
        const hasCreator = investors.some((inv) => getRefId(inv?.user) === creatorId);

        if (creatorId && !hasCreator && !creatorIsSuperAdmin) {
            investors.push({
                role: 'active',
                user: project?.createdBy,
                privacySettings: { displayName: project?.createdBy?.name || 'Creator' },
            });
        }

        const deduped = [];
        const seen = new Set();
        for (const inv of investors) {
            const id = getRefId(inv?.user);
            if (!id || seen.has(id)) continue;
            seen.add(id);
            deduped.push(inv);
        }
        return deduped;
    };

    const getPendingApprovalRequestsCount = () => {
        const approverIds = new Set(getEffectiveApprovers().map((inv) => String(getRefId(inv?.user))).filter(Boolean));
        return (pendingSpendings || []).reduce((total, spending) => {
            if (spending?.approvalSummary && Number.isFinite(Number(spending.approvalSummary.pendingRequiredCount))) {
                return total + Number(spending.approvalSummary.pendingRequiredCount || 0);
            }

            const votedIds = new Set(
                Object.entries(spending?.approvals || {}).map(([approvalKey, approval]) => String(getRefId(approval?.user) || approvalKey))
            );
            const waitingCount = [...approverIds].filter((id) => !votedIds.has(id)).length;
            return total + Math.max(waitingCount, 0);
        }, 0);
    };

    const resolveUserName = (value, fallback = 'Unknown', nameHint = null) => {
        // If we have a direct name hint (e.g., from addedByName or userName), use it
        if (nameHint) return nameHint;

        if (!value) return fallback;

        if (typeof value === 'object') {
            if (value.name) return value.name;
            const objectId = getRefId(value);
            if (objectId && userAccounts[objectId]?.name) return userAccounts[objectId].name;
            return fallback;
        }

        const id = String(value);
        if (userAccounts[id]?.name) return userAccounts[id].name;
        if (id === currentUserId) return currentUser?.name || 'You';
        return fallback;
    };

    // Render pending spending item
    const renderPendingSpendingItem = (spending) => {
        const addedById = getRefId(spending.addedBy) || String(spending.addedBy || '');
        const approvals = spending.approvals || {};
        const isMySpending = addedById === currentUserId;

        // Check if current user has already voted (by key match or by user field inside approval)
        const myApproval = approvals[currentUserId] ||
            Object.values(approvals).find(a => String(getRefId(a?.user) || '') === currentUserId);

        // Check if spending is already fully approved
        const isAlreadyApproved = spending.status === 'approved';

        // Use backend-computed approvalSummary when available (production), fallback to local computation
        const summary = spending.approvalSummary;
        let approvedCount, activeInvestorCount, approvedByNames, waitingForNames;

        if (summary && Array.isArray(summary.approvedBy) && Array.isArray(summary.waitingFor)) {
            // Backend provides authoritative approval data with names
            approvedCount = summary.approvedRequiredCount ?? summary.approvedBy.length;
            activeInvestorCount = summary.requiredApproverCount ?? (summary.approvedBy.length + summary.waitingFor.length);
            approvedByNames = summary.approvedBy
                .map(a => a.name || resolveUserName(a.id, 'Unknown'))
                .filter(Boolean);
            waitingForNames = summary.waitingFor
                .map(a => a.name || resolveUserName(a.id, 'Unknown'))
                .filter(Boolean);
        } else {
            // Fallback: local computation from project data
            const effectiveApprovers = getEffectiveApprovers();
            const approverIds = new Set(effectiveApprovers.map((inv) => String(getRefId(inv?.user))).filter(Boolean));
            approvedCount = Object.entries(approvals)
                .filter(([approvalKey, approval]) => {
                    if (approval?.status !== 'approved') return false;
                    const approvalUserId = String(getRefId(approval?.user) || approvalKey);
                    return approverIds.has(approvalUserId);
                })
                .length;
            activeInvestorCount = effectiveApprovers.length;
            approvedByNames = Object.entries(approvals)
                .filter(([_, a]) => a.status === 'approved')
                .map(([userId, approval]) => {
                    const approvalUserId = getRefId(approval?.user) || userId;
                    return resolveUserName(approvalUserId, 'Unknown', approval?.userName);
                });
            const votedUserIds = new Set(Object.keys(approvals));
            waitingForNames = effectiveApprovers
                .filter(inv => {
                    const invId = String(inv.user?._id || inv.user || '');
                    return !votedUserIds.has(invId);
                })
                .map(inv => inv.user?.name || inv.privacySettings?.displayName || resolveUserName(inv.user?._id || inv.user, 'Unknown'));
        }

        return (
            <View key={spending.id} style={styles.pendingCard}>
                {/* Top Row: Category Icon + Amount */}
                <View style={styles.pendingTopRow}>
                    <View style={[styles.pendingCategoryIcon, { backgroundColor: spending.category === 'Service' ? '#EEF2FF' : '#D1FAE5' }]}>
                        <MaterialCommunityIcons
                            name={spending.category === 'Service' ? 'account-hard-hat' : 'package-variant'}
                            size={24}
                            color={spending.category === 'Service' ? '#6366F1' : '#10B981'}
                        />
                    </View>
                    <View style={styles.pendingAmountContainer}>
                        <Text style={styles.pendingAmountLabel}>Amount</Text>
                        <Text style={styles.pendingAmountValue}>₹{spending.amount.toLocaleString()}</Text>
                    </View>
                </View>

                {/* Description */}
                <Text style={styles.pendingDescriptionText}>{spending.description}</Text>

                {/* Meta Info */}
                <View style={styles.pendingMetaRow}>
                    <View style={styles.pendingMetaItem}>
                        <MaterialCommunityIcons name="account" size={14} color={theme.colors.textTertiary} />
                        <Text style={styles.pendingMetaText}>{resolveUserName(spending.addedBy, 'Unknown', spending.addedByName)}</Text>
                    </View>
                    <View style={styles.pendingMetaItem}>
                        <MaterialCommunityIcons name="calendar" size={14} color={theme.colors.textTertiary} />
                        <Text style={styles.pendingMetaText}>{spending.date}</Text>
                    </View>
                    <View style={styles.pendingMetaItem}>
                        <MaterialCommunityIcons name="clock-outline" size={14} color={theme.colors.textTertiary} />
                        <Text style={styles.pendingMetaText}>{spending.time}</Text>
                    </View>
                </View>

                {/* Approval Progress */}
                <View style={styles.approvalProgressSection}>
                    <View style={styles.approvalProgressHeader}>
                        <Text style={styles.approvalProgressTitle}>Approval Progress</Text>

                        <Text style={styles.approvalProgressCount}>
                            {approvedCount} of {activeInvestorCount}
                        </Text>
                    </View>
                    <View style={styles.approvalProgressBar}>
                        <View style={[styles.approvalProgressFill, { width: `${(approvedCount / Math.max(activeInvestorCount, 1)) * 100}%` }]} />
                    </View>
                    {approvedByNames.length > 0 && (
                        <Text style={styles.approvedByText}>Approved by: {approvedByNames.join(', ')}</Text>
                    )}
                    {waitingForNames.length > 0 && (
                        <Text style={[styles.approvedByText, { color: '#F59E0B', marginTop: 4 }]}>
                            Waiting for: {waitingForNames.join(', ')}
                        </Text>
                    )}
                </View>

                {/* Action Buttons - Only for Active Members who haven't voted and spending not yet approved */}
                {!myApproval && !isMySpending && !isPassiveViewer && !isAlreadyApproved && currentUser?.role !== 'super_admin' && (
                    <View style={styles.pendingActionButtons}>
                        <TouchableOpacity
                            style={styles.rejectActionBtn}
                            onPress={() => onReject(spending)}
                        >
                            <MaterialCommunityIcons name="close-circle" size={20} color="#EF4444" />
                            <Text style={styles.rejectActionText}>Reject</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.approveActionBtn}
                            onPress={() => onApprove(spending)}
                        >
                            <MaterialCommunityIcons name="check-circle" size={20} color="white" />
                            <Text style={styles.approveActionText}>Approve</Text>
                        </TouchableOpacity>
                    </View>
                )}

                {/* Your Status Badge */}
                {myApproval && (
                    <View style={styles.yourStatusBadge}>
                        <MaterialCommunityIcons name="check-decagram" size={18} color="#10B981" />
                        <Text style={styles.yourStatusText}>You approved this spending</Text>
                    </View>
                )}

                {isMySpending && !myApproval && (
                    <View style={styles.yourStatusBadge}>
                        <MaterialCommunityIcons name="account-check" size={18} color="#6366F1" />
                        <Text style={[styles.yourStatusText, { color: '#6366F1' }]}>You submitted this</Text>
                    </View>
                )}

                {/* Passive Member View - No Actions */}
                {isPassiveViewer && !myApproval && !isMySpending && (
                    <View style={styles.yourStatusBadge}>
                        <MaterialCommunityIcons name="eye-off-outline" size={18} color={theme.colors.textSecondary} />
                        <Text style={[styles.yourStatusText, { color: theme.colors.textSecondary }]}>View Only (Cannot Approve)</Text>
                    </View>
                )}

                {/* Super Admin View - Observer only */}
                {currentUser?.role === 'super_admin' && !myApproval && !isMySpending && !isPassiveViewer && (
                    <View style={styles.yourStatusBadge}>
                        <MaterialCommunityIcons name="shield-account-outline" size={18} color={theme.colors.textSecondary} />
                        <Text style={[styles.yourStatusText, { color: theme.colors.textSecondary }]}>Observer (Super Admin)</Text>
                    </View>
                )}
            </View>
        );
    };

    // Render rejected spending item
    const renderRejectedSpendingItem = (spending) => {
        return (
            <View key={spending.id} style={styles.rejectedCard}>
                <View style={styles.rejectedHeader}>
                    <MaterialCommunityIcons name="close-circle" size={24} color="#EF4444" />
                    <View style={styles.rejectedInfo}>
                        <Text style={styles.rejectedDescription}>{spending.description}</Text>
                        <Text style={styles.rejectedMeta}>₹{spending.amount.toLocaleString()} • Rejected by {spending.rejectorName}</Text>
                    </View>
                </View>
            </View>
        );
    };

    return (
        <Modal
            visible={visible}
            animationType="slide"
            transparent={true}
            onRequestClose={onClose}
        >
            <View style={styles.modalOverlay} pointerEvents="box-none">
                <TouchableOpacity
                    style={StyleSheet.absoluteFill}
                    onPress={onClose}
                    activeOpacity={1}
                >
                    <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' }} />
                </TouchableOpacity>

                <View style={styles.modalContent}>
                    <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>Pending Approvals</Text>
                        <TouchableOpacity onPress={onClose}>
                            <MaterialCommunityIcons name="close" size={24} color={theme.colors.textPrimary} />
                        </TouchableOpacity>
                    </View>

                    {/* Instant Feedback Banner */}
                    {actionFeedback && (
                        <View style={[
                            styles.feedbackBanner,
                            actionFeedback.type === 'approve' && styles.feedbackApprove,
                            actionFeedback.type === 'reject' && styles.feedbackReject,
                            actionFeedback.type === 'success' && styles.feedbackSuccess,
                        ]}>
                            <MaterialCommunityIcons
                                name={actionFeedback.type === 'reject' ? 'close-circle' : 'check-circle'}
                                size={20}
                                color="white"
                            />
                            <Text style={styles.feedbackText}>{actionFeedback.message}</Text>
                        </View>
                    )}

                    <ScrollView
                        style={{ paddingHorizontal: 16 }}
                        contentContainerStyle={{ paddingBottom: 30, paddingTop: 10 }}
                        showsVerticalScrollIndicator={true}
                    >
                        {/* Pending Section */}
                        {pendingSpendings.length > 0 && (
                            <View style={styles.modalSectionHeader}>
                                <MaterialCommunityIcons name="clock-outline" size={18} color="#F59E0B" />
                                <Text style={[styles.modalSectionTitle, { color: '#F59E0B' }]}>Awaiting Approval ({getPendingApprovalRequestsCount()})</Text>
                            </View>
                        )}
                        {pendingSpendings.map(renderPendingSpendingItem)}

                        {/* Rejected Section */}
                        {rejectedSpendings.length > 0 && (
                            <>
                                <View style={[styles.modalSectionHeader, { marginTop: 24 }]}>
                                    <MaterialCommunityIcons name="close-circle-outline" size={18} color="#EF4444" />
                                    <Text style={[styles.modalSectionTitle, { color: '#EF4444' }]}>Rejected ({rejectedSpendings.length})</Text>
                                </View>
                                {rejectedSpendings.map(renderRejectedSpendingItem)}
                            </>
                        )}

                        {pendingSpendings.length === 0 && rejectedSpendings.length === 0 && (
                            <View style={styles.emptyState}>
                                <MaterialCommunityIcons name="check-circle" size={48} color="#10B981" />
                                <Text style={styles.emptyText}>All caught up!</Text>
                                <Text style={styles.emptySubText}>No pending or rejected spendings</Text>
                            </View>
                        )}
                    </ScrollView>
                </View>
            </View>
        </Modal>
    );
}

PendingApprovalsModal.propTypes = {
    visible: PropTypes.bool.isRequired,
    onClose: PropTypes.func.isRequired,
    pendingSpendings: PropTypes.array.isRequired,
    rejectedSpendings: PropTypes.array.isRequired,
    currentUser: PropTypes.object.isRequired,
    project: PropTypes.object.isRequired,
    projectMemberIds: PropTypes.array.isRequired,
    onApprove: PropTypes.func.isRequired,
    onReject: PropTypes.func.isRequired,
    actionFeedback: PropTypes.object,
    isPassiveViewer: PropTypes.bool,
    userAccounts: PropTypes.object,
};

const styles = StyleSheet.create({
    modalOverlay: {
        flex: 1,
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: theme.colors.surface,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        maxHeight: '90%', // Taller for lists
        minHeight: '50%',
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
    modalSectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
        gap: 8,
    },
    modalSectionTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: theme.colors.textSecondary,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
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
    emptySubText: {
        ...theme.typography.caption,
        color: theme.colors.textTertiary,
    },
    // Feedback Banner
    feedbackBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        marginHorizontal: 16,
        marginTop: 16,
        marginBottom: 8,
        borderRadius: 12,
        gap: 8,
    },
    feedbackApprove: {
        backgroundColor: '#10B981',
    },
    feedbackReject: {
        backgroundColor: '#EF4444',
    },
    feedbackSuccess: {
        backgroundColor: '#10B981',
    },
    feedbackText: {
        color: 'white',
        fontWeight: '600',
        fontSize: 14,
    },
    // Pending Card Styles
    pendingCard: {
        backgroundColor: '#FFFBEB', // Amber 50
        borderRadius: 16,
        padding: 16,
        marginBottom: 16,
        borderWidth: 1.5,
        borderColor: '#FDE68A', // Amber 200
        shadowColor: '#F59E0B',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 2,
    },
    pendingTopRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 12,
    },
    pendingCategoryIcon: {
        width: 40,
        height: 40,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    pendingAmountContainer: {
        alignItems: 'flex-end',
    },
    pendingAmountLabel: {
        ...theme.typography.caption,
        color: theme.colors.textTertiary,
        marginBottom: 2,
    },
    pendingAmountValue: {
        fontSize: 22,
        fontWeight: '700',
        color: '#F59E0B', // Amber 600
    },
    pendingDescriptionText: {
        fontSize: 15,
        fontWeight: '500',
        color: theme.colors.textPrimary,
        marginBottom: 12,
        lineHeight: 22,
    },
    pendingMetaRow: {
        flexDirection: 'row',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 12,
        marginBottom: 16,
        paddingBottom: 16,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(245, 158, 11, 0.2)', // Amber border
    },
    pendingMetaItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    pendingMetaText: {
        fontSize: 12,
        color: theme.colors.textSecondary,
        fontWeight: '500',
    },
    approvalProgressSection: {
        backgroundColor: '#FEF3C7', // Amber 100 - Stronger visibility
        borderRadius: 12,
        padding: 12,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: '#FDE68A',
    },
    approvalProgressHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    approvalProgressTitle: {
        fontSize: 11,
        color: '#92400E', // Amber 800
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    approvalProgressCount: {
        fontSize: 13,
        color: '#B45309', // Amber 700
        fontWeight: '700',
    },
    approvalProgressBar: {
        height: 8,
        backgroundColor: 'rgba(255,255,255,0.5)',
        borderRadius: 4,
        overflow: 'hidden',
        marginBottom: 8,
    },
    approvalProgressFill: {
        height: '100%',
        backgroundColor: '#F59E0B', // Amber 500
        borderRadius: 4,
    },
    approvedByText: {
        fontSize: 11,
        color: '#92400E', // Amber 800
        fontStyle: 'italic',
    },
    pendingActionButtons: {
        flexDirection: 'row',
        gap: 12,
    },
    rejectActionBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        borderRadius: 12,
        backgroundColor: '#FEE2E2',
        gap: 6,
    },
    rejectActionText: {
        color: '#EF4444',
        fontWeight: '600',
        fontSize: 14,
    },
    approveActionBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        borderRadius: 12,
        backgroundColor: '#10B981',
        gap: 6,
    },
    approveActionText: {
        color: 'white',
        fontWeight: '600',
        fontSize: 14,
    },
    yourStatusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 10,
        backgroundColor: theme.colors.surfaceAlt,
        borderRadius: 12,
        gap: 8,
    },
    yourStatusText: {
        color: '#10B981',
        fontWeight: '600',
        fontSize: 13,
    },
    // Rejected Card Styles
    rejectedCard: {
        backgroundColor: '#FEF2F2',
        borderRadius: 16,
        padding: 16,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: '#FECACA',
    },
    rejectedHeader: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 12,
    },
    rejectedInfo: {
        flex: 1,
    },
    rejectedDescription: {
        ...theme.typography.body,
        color: '#991B1B', // Dark red
        marginBottom: 4,
    },
    rejectedMeta: {
        ...theme.typography.caption,
        color: '#B91C1C',
    },
});
