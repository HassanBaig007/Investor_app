import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import {
    View,
    Text,
    ScrollView,
    StyleSheet,
    TouchableOpacity,
    StatusBar,
    Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme, formatCurrency } from '../../components/Theme';
import Ionicons from 'react-native-vector-icons/Ionicons';
// LinearGradient removed - unused import

// Import from centralized data
import { getDaysRemaining } from '../../utils/dateTimeUtils';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

export default function ApprovalsScreen({ navigation }) {
    const { user: currentUser } = useAuth();
    const [modifications, setModifications] = useState([]);
    const [submitting, setSubmitting] = useState(null);
    const [approvalThreshold, setApprovalThreshold] = useState(0.5); // default; overridden by backend

    useEffect(() => {
        const fetchModifications = async () => {
            try {
                const [data, appConfig] = await Promise.all([
                    api.getModifications(),
                    api.getAppConfig().catch(() => null),
                ]);
                setModifications((data || []).filter(m => m.status === 'pending'));
                // Use backend-authoritative approval threshold if available
                if (appConfig?.approvalThresholdPercent != null) {
                    setApprovalThreshold(appConfig.approvalThresholdPercent / 100);
                }
            } catch (err) {
                console.error('Failed to load modifications:', err);
            }
        };
        fetchModifications();
    }, []);

    const processVote = async (modId, vote, action) => {
        setSubmitting(modId);
        try {
            if (vote === 'approve') {
                await api.approveRequest(modId);
            } else {
                await api.rejectRequest(modId, 'Rejected by investor');
            }
            // Remove from local list after successful vote
            setModifications(prev => prev.filter(m => (m._id || m.id) !== modId));
            Alert.alert('Vote Submitted', `Your ${action} has been recorded.`);
        } catch (err) {
            console.error('Vote failed:', err);
            Alert.alert('Error', err.friendlyMessage || 'Failed to submit vote.');
        } finally {
            setSubmitting(null);
        }
    };

    const handleVote = (modId, vote) => {
        const action = vote === 'approve' ? 'approve' : 'reject';

        Alert.alert(
            `Confirm ${vote === 'approve' ? 'Approval' : 'Rejection'}`,
            `Are you sure you want to ${action} this modification request?`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: vote === 'approve' ? 'Approve' : 'Reject',
                    style: vote === 'approve' ? 'default' : 'destructive',
                    onPress: () => {
                        processVote(modId, vote, action);
                    }
                }
            ]
        );
    };

    const getVoteProgress = (votes) => {
        const safeTotal = Math.max(votes?.total || 0, 1);
        const threshold = Math.ceil(safeTotal * approvalThreshold); // backend-driven threshold
        return {
            approvalPercent: ((votes?.approved || 0) / safeTotal) * 100,
            needed: threshold,
            current: votes?.approved || 0,
        };
    };

    const currentUserId = currentUser?.id || currentUser?._id;
    const pendingCount = modifications.filter((m) => {
        const votesMap = m.votesMap || {};
        const myVote = votesMap[currentUserId] ||
            Object.values(votesMap).find(v => String(v?.user || '') === String(currentUserId));
        return !myVote && m.status !== 'approved';
    }).length;

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <StatusBar barStyle="dark-content" />

            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity style={styles.backBtn} onPress={() => navigation?.goBack()}>
                    <Ionicons name="arrow-back" size={24} color={theme.colors.textPrimary} />
                </TouchableOpacity>
                <View style={styles.headerCenter}>
                    <Text style={styles.headerTitle}>Project Approvals</Text>
                    {pendingCount > 0 && (
                        <View style={styles.headerBadge}>
                            <Text style={styles.headerBadgeText}>{pendingCount} pending</Text>
                        </View>
                    )}
                </View>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                {/* Info Banner */}
                <View style={styles.infoBanner}>
                    <Ionicons name="information-circle" size={20} color={theme.colors.info} />
                    <Text style={styles.infoBannerText}>
                        Your vote is required for project modifications. Decisions need majority approval.
                    </Text>
                </View>

                {modifications.length === 0 ? (
                    <View style={styles.emptyState}>
                        <Ionicons name="checkmark-done-circle" size={64} color={theme.colors.success} />
                        <Text style={styles.emptyStateTitle}>No Pending Approvals</Text>
                        <Text style={styles.emptyStateText}>All project modifications have been reviewed.</Text>
                    </View>
                ) : (
                    modifications.map((mod) => { // NOSONAR
                        const daysLeft = mod.deadline ? getDaysRemaining(mod.deadline) : 999;
                        const progress = getVoteProgress(mod.votes);
                        const isUrgent = daysLeft <= 3;
                        const myVote = (mod.votesMap || {})[currentUserId]?.status ||
                            Object.values(mod.votesMap || {}).find(v => String(v?.user || '') === String(currentUserId))?.status;
                        const hasVoted = !!myVote;
                        const isAlreadyApproved = mod.status === 'approved';
                        const modId = mod.id || mod._id;
                        const votedStateColor =
                            isAlreadyApproved || myVote === 'approved'
                                ? theme.colors.success
                                : theme.colors.danger;
                        let votedStateIcon = 'close-circle';
                        if (isAlreadyApproved) {
                            votedStateIcon = 'checkmark-done-circle';
                        } else if (myVote === 'approved') {
                            votedStateIcon = 'checkmark-circle';
                        }

                        return (
                            <View key={modId} style={styles.modCard}>
                                {/* Header */}
                                <View style={styles.modHeader}>
                                    <View style={[styles.modTypeIcon, {
                                        backgroundColor: mod.type === 'timeline' ? theme.colors.warningLight : theme.colors.primaryLight
                                    }]}>
                                        <Ionicons
                                            name={mod.type === 'timeline' ? 'time' : 'cash'}
                                            size={20}
                                            color={mod.type === 'timeline' ? theme.colors.warning : theme.colors.primary}
                                        />
                                    </View>
                                    <View style={styles.modHeaderInfo}>
                                        <Text style={styles.modProject}>{mod.projectName}</Text>
                                        <Text style={styles.modTitle}>{mod.title}</Text>
                                    </View>
                                    {isUrgent && !hasVoted && (
                                        <View style={styles.urgentBadge}>
                                            <Text style={styles.urgentBadgeText}>{daysLeft}d left</Text>
                                        </View>
                                    )}
                                </View>

                                {/* Description */}
                                <Text style={styles.modDescription}>{mod.description}</Text>

                                {/* Impact Card */}
                                <View style={styles.impactCard}>
                                    <Text style={styles.impactTitle}>Impact</Text>
                                    {mod.type === 'timeline' ? (
                                        <View style={styles.impactRow}>
                                            <View style={styles.impactItem}>
                                                <Text style={styles.impactLabel}>Current</Text>
                                                <Text style={styles.impactValue}>{mod.impact.currentTimeline}</Text>
                                            </View>
                                            <Ionicons name="arrow-forward" size={16} color={theme.colors.textTertiary} />
                                            <View style={styles.impactItem}>
                                                <Text style={styles.impactLabel}>Proposed</Text>
                                                <Text style={[styles.impactValue, { color: theme.colors.warning }]}>
                                                    {mod.impact.proposedTimeline}
                                                </Text>
                                            </View>
                                        </View>
                                    ) : (
                                        <View style={styles.impactRow}>
                                            <View style={styles.impactItem}>
                                                <Text style={styles.impactLabel}>Amount</Text>
                                                <Text style={styles.impactValue}>Up to {formatCurrency(mod.impact.maxAmount)}</Text>
                                            </View>
                                            <View style={styles.impactItem}>
                                                <Text style={styles.impactLabel}>Expected</Text>
                                                <Text style={[styles.impactValue, { color: theme.colors.success }]}>
                                                    {mod.impact.expectedReturn}
                                                </Text>
                                            </View>
                                        </View>
                                    )}
                                </View>

                                {/* Vote Progress */}
                                <View style={styles.voteProgress}>
                                    <View style={styles.voteProgressHeader}>
                                        <Text style={styles.voteProgressTitle}>Investor Votes</Text>
                                        <Text style={styles.voteProgressCount}>
                                            {(mod.votes?.approved || 0) + (mod.votes?.rejected || 0)}/{mod.votes?.total || 0} voted
                                        </Text>
                                    </View>
                                    <View style={styles.voteProgressBar}>
                                        <View
                                            style={[styles.voteProgressFill, {
                                                width: `${progress.approvalPercent}%`,
                                                backgroundColor: theme.colors.success
                                            }]}
                                        />
                                    </View>
                                    <View style={styles.voteStats}>
                                        <View style={styles.voteStat}>
                                            <View style={[styles.voteStatDot, { backgroundColor: theme.colors.success }]} />
                                            <Text style={styles.voteStatText}>{mod.votes?.approved || 0} Approved</Text>
                                        </View>
                                        <View style={styles.voteStat}>
                                            <View style={[styles.voteStatDot, { backgroundColor: theme.colors.danger }]} />
                                            <Text style={styles.voteStatText}>{mod.votes?.rejected || 0} Rejected</Text>
                                        </View>
                                        <View style={styles.voteStat}>
                                            <View style={[styles.voteStatDot, { backgroundColor: theme.colors.textTertiary }]} />
                                            <Text style={styles.voteStatText}>{mod.votes?.pending || 0} Pending</Text>
                                        </View>
                                    </View>
                                </View>

                                {/* Actions */}
                                {hasVoted || isAlreadyApproved ? (
                                    <View style={styles.votedBanner}>
                                        <Ionicons
                                            name={votedStateIcon}
                                            size={20}
                                            color={votedStateColor}
                                        />
                                        <Text style={[styles.votedBannerText, {
                                            color: votedStateColor,
                                        }]}>
                                            {isAlreadyApproved ? 'This modification is fully approved' : `You ${myVote} this request`}
                                        </Text>
                                    </View>
                                ) : (
                                    <View style={styles.voteActions}>
                                        <TouchableOpacity
                                            style={styles.rejectBtn}
                                            onPress={() => handleVote(modId, 'reject')}
                                            disabled={submitting === modId}
                                        >
                                            <Ionicons name="close" size={20} color={theme.colors.danger} />
                                            <Text style={styles.rejectBtnText}>Reject</Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            style={styles.approveBtn}
                                            onPress={() => handleVote(modId, 'approve')}
                                            disabled={submitting === modId}
                                        >
                                            {submitting === modId ? (
                                                <Text style={styles.approveBtnText}>Submitting...</Text>
                                            ) : (
                                                <>
                                                    <Ionicons name="checkmark" size={20} color="white" />
                                                    <Text style={styles.approveBtnText}>Approve</Text>
                                                </>
                                            )}
                                        </TouchableOpacity>
                                    </View>
                                )}
                            </View>
                        );
                    })
                )}
            </ScrollView>
        </SafeAreaView>
    );
}

ApprovalsScreen.propTypes = {
    navigation: PropTypes.shape({
        goBack: PropTypes.func,
        navigate: PropTypes.func,
    }),
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors.background,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: theme.spacing.m,
        paddingVertical: theme.spacing.m,
    },
    backBtn: {
        width: 40,
        height: 40,
        borderRadius: 12,
        backgroundColor: theme.colors.surface,
        alignItems: 'center',
        justifyContent: 'center',
        ...theme.shadows.soft,
    },
    headerCenter: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    headerTitle: {
        ...theme.typography.h3,
        color: theme.colors.textPrimary,
    },
    headerBadge: {
        backgroundColor: theme.colors.danger,
        paddingHorizontal: theme.spacing.s,
        paddingVertical: 2,
        borderRadius: theme.borderRadius.full,
        marginLeft: theme.spacing.s,
    },
    headerBadgeText: {
        ...theme.typography.caption,
        color: 'white',
        fontWeight: '600',
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        paddingHorizontal: theme.spacing.l,
        paddingBottom: theme.spacing.xxl,
    },
    infoBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: theme.colors.infoLight,
        padding: theme.spacing.m,
        borderRadius: theme.borderRadius.m,
        marginBottom: theme.spacing.l,
    },
    infoBannerText: {
        ...theme.typography.small,
        color: theme.colors.info,
        flex: 1,
        marginLeft: theme.spacing.s,
    },
    emptyState: {
        alignItems: 'center',
        paddingVertical: theme.spacing.xxl,
    },
    emptyStateTitle: {
        ...theme.typography.h3,
        color: theme.colors.textPrimary,
        marginTop: theme.spacing.m,
    },
    emptyStateText: {
        ...theme.typography.body,
        color: theme.colors.textSecondary,
        marginTop: theme.spacing.xs,
    },
    modCard: {
        backgroundColor: theme.colors.surface,
        padding: theme.spacing.m,
        borderRadius: theme.borderRadius.l,
        marginBottom: theme.spacing.m,
        ...theme.shadows.card,
    },
    modHeader: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginBottom: theme.spacing.m,
    },
    modTypeIcon: {
        width: 44,
        height: 44,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: theme.spacing.m,
    },
    modHeaderInfo: {
        flex: 1,
    },
    modProject: {
        ...theme.typography.caption,
        color: theme.colors.textSecondary,
    },
    modTitle: {
        ...theme.typography.bodyMedium,
        color: theme.colors.textPrimary,
    },
    urgentBadge: {
        backgroundColor: theme.colors.dangerLight,
        paddingHorizontal: theme.spacing.s,
        paddingVertical: 4,
        borderRadius: theme.borderRadius.full,
    },
    urgentBadgeText: {
        ...theme.typography.captionMedium,
        color: theme.colors.danger,
    },
    modDescription: {
        ...theme.typography.small,
        color: theme.colors.textSecondary,
        lineHeight: 20,
        marginBottom: theme.spacing.m,
    },
    impactCard: {
        backgroundColor: theme.colors.surfaceAlt,
        padding: theme.spacing.m,
        borderRadius: theme.borderRadius.m,
        marginBottom: theme.spacing.m,
    },
    impactTitle: {
        ...theme.typography.captionMedium,
        color: theme.colors.textSecondary,
        marginBottom: theme.spacing.s,
    },
    impactRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-around',
    },
    impactItem: {
        alignItems: 'center',
    },
    impactLabel: {
        ...theme.typography.caption,
        color: theme.colors.textTertiary,
        marginBottom: 2,
    },
    impactValue: {
        ...theme.typography.bodyMedium,
        color: theme.colors.textPrimary,
    },
    voteProgress: {
        marginBottom: theme.spacing.m,
    },
    voteProgressHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: theme.spacing.xs,
    },
    voteProgressTitle: {
        ...theme.typography.captionMedium,
        color: theme.colors.textSecondary,
    },
    voteProgressCount: {
        ...theme.typography.caption,
        color: theme.colors.textTertiary,
    },
    voteProgressBar: {
        height: 8,
        backgroundColor: theme.colors.surfaceAlt,
        borderRadius: 4,
        overflow: 'hidden',
        marginBottom: theme.spacing.s,
    },
    voteProgressFill: {
        height: '100%',
        borderRadius: 4,
    },
    voteStats: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    voteStat: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    voteStatDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        marginRight: 4,
    },
    voteStatText: {
        ...theme.typography.caption,
        color: theme.colors.textSecondary,
    },
    votedBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: theme.spacing.m,
        borderTopWidth: 1,
        borderTopColor: theme.colors.borderLight,
    },
    votedBannerText: {
        ...theme.typography.smallMedium,
        marginLeft: theme.spacing.xs,
    },
    voteActions: {
        flexDirection: 'row',
        borderTopWidth: 1,
        borderTopColor: theme.colors.borderLight,
        paddingTop: theme.spacing.m,
    },
    rejectBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: theme.spacing.m,
        borderRadius: theme.borderRadius.m,
        borderWidth: 1,
        borderColor: theme.colors.border,
        marginRight: theme.spacing.s,
    },
    rejectBtnText: {
        ...theme.typography.bodyMedium,
        color: theme.colors.danger,
        marginLeft: theme.spacing.xs,
    },
    approveBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: theme.spacing.m,
        borderRadius: theme.borderRadius.m,
        backgroundColor: theme.colors.primary,
    },
    approveBtnText: {
        ...theme.typography.bodyMedium,
        color: 'white',
        marginLeft: theme.spacing.xs,
    },
});
