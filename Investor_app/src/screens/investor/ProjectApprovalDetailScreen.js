import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import {
    View,
    Text,
    ScrollView,
    StyleSheet,
    TouchableOpacity,
    Alert,
    ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
import LinearGradient from 'react-native-linear-gradient';
import { theme, formatCurrency } from '../../components/Theme';
import { getRelativeTime, getDaysRemaining } from '../../utils/dateTimeUtils';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

export default function ProjectApprovalDetailScreen({ navigation, route }) {
    const { user: currentUser } = useAuth();
    const modificationId = route?.params?.modificationId;
    const [modification, setModification] = useState(route?.params?.modification || null);
    const [investors, setInvestors] = useState([]);
    const [isLoading, setIsLoading] = useState(!modification);

    useEffect(() => {
        const fetchData = async () => {
            try {
                let resolvedModification = modification;
                if (!modification && modificationId) {
                    const mods = await api.getModifications();
                    const found = (mods || []).find(m => (m._id || m.id) === modificationId);
                    setModification(found);
                    resolvedModification = found;
                }

                const modProjectId = (resolvedModification?.projectId || resolvedModification?.project?._id || resolvedModification?.project || '').toString();
                let users = [];
                if (modProjectId) {
                    try {
                        const project = await api.getProjectById(modProjectId);
                        users = (project?.investors || []).map((inv) => inv.user).filter(Boolean);
                    } catch {
                        users = [];
                    }
                } else {
                    users = await api.getUsers().catch(() => []);
                }
                setInvestors(users || []);
            } catch (err) {
                console.error('Failed to load modification details:', err);
            } finally {
                setIsLoading(false);
            }
        };
        fetchData();
    }, [modificationId]);

    if (isLoading) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.errorContainer}>
                    <ActivityIndicator size="large" color={theme.colors.primary} />
                </View>
            </SafeAreaView>
        );
    }

    if (!modification) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.errorContainer}>
                    <Text style={styles.errorText}>Modification not found</Text>
                </View>
            </SafeAreaView>
        );
    }

    const daysRemaining = getDaysRemaining(modification.deadline);
    const approvedCount = modification.votes?.approved || 0;
    const totalCount = modification.votes?.total || 1;
    const progressPercent = (approvedCount / totalCount) * 100;
    const currentUserId = currentUser?._id || currentUser?.id;
    const votesMap = modification.votesMap || {};
    // Check if current user has already voted (by key match or by user field inside vote)
    const myVoteStatus = votesMap[currentUserId]?.status ||
        Object.values(votesMap).find(v => String(v?.user || '') === String(currentUserId))?.status;
    const isAlreadyApproved = modification.status === 'approved';
    const needsMyVote = !myVoteStatus && !isAlreadyApproved;

    // Get investor details for each approval
    const getInvestorApprovalDetails = () => {
        const sourceApprovals = modification.investorApprovals || modification.votesMap || {};
        return Object.entries(sourceApprovals).map(([investorId, approval]) => {
            const investor = investors.find(i => (i._id || i.id) === investorId);
            return {
                ...approval,
                investorId,
                investor,
                isCurrentUser: investorId === currentUserId,
                isCreator: investorId === modification.proposedBy,
            };
        }).sort((a, b) => {
            // Sort: Creator first, then by status (approved > pending > rejected)
            if (a.isCreator) return -1;
            if (b.isCreator) return 1;
            if (a.status === 'approved' && b.status !== 'approved') return -1;
            if (b.status === 'approved' && a.status !== 'approved') return 1;
            return 0;
        });
    };

    const investorApprovals = getInvestorApprovalDetails();

    const handleVote = (voteType) => {
        const action = voteType === 'approve' ? 'approve' : 'reject';
        Alert.alert(
            `${voteType === 'approve' ? 'Approve' : 'Reject'} Modification`,
            `Are you sure you want to ${action} this modification ? `,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: voteType === 'approve' ? 'Approve' : 'Reject',
                    style: voteType === 'approve' ? 'default' : 'destructive',
                    onPress: async () => {
                        try {
                            const modId = modification._id || modification.id;
                            if (voteType === 'approve') {
                                await api.approveRequest(modId);
                            } else {
                                await api.rejectRequest(modId, 'Rejected by investor');
                            }
                            Alert.alert(
                                voteType === 'approve' ? '✅ Vote Recorded' : '❌ Vote Recorded',
                                voteType === 'approve'
                                    ? 'Your approval has been recorded.'
                                    : 'Your rejection has been recorded.',
                                [{ text: 'OK', onPress: () => navigation.goBack() }]
                            );
                        } catch (err) {
                            console.error('Vote failed:', err);
                            Alert.alert('Error', err.friendlyMessage || 'Failed to submit vote.');
                        }
                    }
                }
            ]
        );
    };

    const renderInvestorApproval = (approval, index) => {
        const getStatusColor = () => {
            switch (approval.status) {
                case 'approved': return theme.colors.success;
                case 'rejected': return theme.colors.danger;
                default: return theme.colors.textTertiary;
            }
        };

        const getStatusBg = () => {
            switch (approval.status) {
                case 'approved': return theme.colors.successLight;
                case 'rejected': return theme.colors.dangerLight;
                default: return theme.colors.surfaceAlt;
            }
        };

        const getStatusIcon = () => {
            switch (approval.status) {
                case 'approved': return 'checkmark-circle';
                case 'rejected': return 'close-circle';
                default: return 'time';
            }
        };

        return (
            <View key={approval.investorId} style={styles.approvalItem}>
                {/* Timeline connector */}
                {index > 0 && <View style={styles.timelineConnector} />}

                <View style={[styles.approvalDot, { backgroundColor: getStatusBg() }]}>
                    <Ionicons name={getStatusIcon()} size={16} color={getStatusColor()} />
                </View>

                <View style={styles.approvalContent}>
                    <View style={styles.approvalHeader}>
                        <View style={styles.investorInfo}>
                            <LinearGradient
                                colors={approval.isCreator ? ['#F59E0B', '#D97706'] : theme.gradients.primary}
                                style={styles.investorAvatar}
                            >
                                <Text style={styles.investorInitials}>
                                    {approval.investor?.name.split(' ').map(n => n[0]).join('') || '??'}
                                </Text>
                            </LinearGradient>
                            <View style={styles.investorDetails}>
                                <View style={styles.nameRow}>
                                    <Text style={styles.investorName} numberOfLines={1}>
                                        {approval.investor?.name || 'Unknown'}
                                        {approval.isCurrentUser && ' (You)'}
                                    </Text>
                                </View>
                                <View style={styles.badgeRow}>
                                    {approval.isCreator && (
                                        <View style={styles.creatorTag}>
                                            <Text style={styles.creatorTagText}>Creator</Text>
                                        </View>
                                    )}
                                    <View style={[styles.statusBadge, { backgroundColor: getStatusBg() }]}>
                                        <Text style={[styles.statusText, { color: getStatusColor() }]}>
                                            {approval.status.charAt(0).toUpperCase() + approval.status.slice(1)}
                                        </Text>
                                    </View>
                                </View>
                                <Text style={styles.approvalTime}>
                                    {approval.votedAt || approval.date
                                        ? getRelativeTime(approval.votedAt || approval.date)
                                        : 'Awaiting vote'}
                                </Text>
                            </View>
                        </View>
                    </View>
                </View>
            </View>
        );
    };

    return (
        <SafeAreaView style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color={theme.colors.textPrimary} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Approval Details</Text>
                <View style={{ width: 32 }} />
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={styles.content}>
                {/* Main Card */}
                <View style={styles.mainCard}>
                    <View style={styles.typeRow}>
                        <View style={styles.typeIcon}>
                            <Ionicons
                                name={modification.type === 'timeline' ? 'time' : 'cash'}
                                size={22}
                                color={theme.colors.warning}
                            />
                        </View>
                        <View style={styles.typeInfo}>
                            <Text style={styles.modTitle}>{modification.title}</Text>
                            <Text style={styles.modProject}>{modification.projectName}</Text>
                        </View>
                        {needsMyVote && (
                            <View style={styles.needsVoteBadge}>
                                <Text style={styles.needsVoteText}>Vote Required</Text>
                            </View>
                        )}
                    </View>

                    <Text style={styles.modDescription}>{modification.description}</Text>

                    {/* Deadline */}
                    <View style={styles.deadlineRow}>
                        <Ionicons name="calendar" size={18} color={daysRemaining <= 3 ? theme.colors.danger : theme.colors.textSecondary} />
                        <Text style={[styles.deadlineText, daysRemaining <= 3 && { color: theme.colors.danger }]}>
                            {daysRemaining > 0 ? `${daysRemaining} days remaining` : 'Deadline passed'}
                        </Text>
                    </View>
                </View>

                {/* Impact Analysis */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Impact Analysis</Text>

                    {modification.type === 'timeline' ? (
                        <View style={styles.impactGrid}>
                            <View style={styles.impactItem}>
                                <Text style={styles.impactLabel}>Current Timeline</Text>
                                <Text style={styles.impactValue}>{modification.impact.currentTimeline}</Text>
                            </View>
                            <View style={styles.impactArrow}>
                                <Ionicons name="arrow-forward" size={20} color={theme.colors.textSecondary} />
                            </View>
                            <View style={styles.impactItem}>
                                <Text style={styles.impactLabel}>Proposed</Text>
                                <Text style={[styles.impactValue, { color: theme.colors.warning }]}>
                                    {modification.impact.proposedTimeline}
                                </Text>
                            </View>
                        </View>
                    ) : (
                        <View style={styles.impactGrid}>
                            <View style={styles.impactItem}>
                                <Text style={styles.impactLabel}>Investment Range</Text>
                                <Text style={styles.impactValue}>
                                    {formatCurrency(modification.impact.minAmount)} - {formatCurrency(modification.impact.maxAmount)}
                                </Text>
                            </View>
                            <View style={styles.impactItem}>
                                <Text style={styles.impactLabel}>Expected Return</Text>
                                <Text style={[styles.impactValue, { color: theme.colors.success }]}>
                                    {modification.impact.expectedReturn}
                                </Text>
                            </View>
                        </View>
                    )}

                    {modification.impact.returnImpact && (
                        <View style={styles.returnImpact}>
                            <Ionicons name="information-circle" size={18} color={theme.colors.primary} />
                            <Text style={styles.returnImpactText}>{modification.impact.returnImpact}</Text>
                        </View>
                    )}
                </View>

                {/* Overall Progress */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Approval Progress</Text>

                    <View style={styles.progressCard}>
                        <View style={styles.progressStats}>
                            <View style={styles.progressStatItem}>
                                <Text style={styles.progressStatValue}>{approvedCount}</Text>
                                <Text style={styles.progressStatLabel}>Approved</Text>
                            </View>
                            <View style={styles.progressCircle}>
                                <Text style={styles.progressPercent}>{Math.round(progressPercent)}%</Text>
                            </View>
                            <View style={styles.progressStatItem}>
                                <Text style={styles.progressStatValue}>{modification.votes.pending}</Text>
                                <Text style={styles.progressStatLabel}>Pending</Text>
                            </View>
                        </View>

                        <View style={styles.progressBarContainer}>
                            <View style={styles.progressBar}>
                                <LinearGradient
                                    colors={['#10B981', '#059669']}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 0 }}
                                    style={[styles.progressFill, { width: `${progressPercent}% ` }]}
                                />
                            </View>
                        </View>

                        <Text style={styles.progressNote}>
                            Requires 100% approval ({totalCount - approvedCount} more needed)
                        </Text>
                    </View>
                </View>

                {/* Privilege Chain Timeline */}
                <View style={styles.section}>
                    <View style={styles.sectionHeaderRow}>
                        <Text style={styles.sectionTitle}>Investor Approvals</Text>
                        <View style={styles.chainBadge}>
                            <Ionicons name="git-branch" size={14} color={theme.colors.primary} />
                            <Text style={styles.chainBadgeText}>Privilege Chain</Text>
                        </View>
                    </View>

                    <View style={styles.timelineContainer}>
                        {investorApprovals.map((approval, index) => renderInvestorApproval(approval, index))}
                    </View>
                </View>

                {/* Vote Buttons */}
                {needsMyVote && (
                    <View style={styles.voteContainer}>
                        <TouchableOpacity
                            style={styles.rejectBtn}
                            onPress={() => handleVote('reject')}
                        >
                            <Ionicons name="close-circle" size={22} color={theme.colors.danger} />
                            <Text style={styles.rejectText}>Reject</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.approveBtn}
                            onPress={() => handleVote('approve')}
                        >
                            <LinearGradient
                                colors={['#10B981', '#059669']}
                                style={styles.approveGradient}
                            >
                                <Ionicons name="checkmark-circle" size={22} color="white" />
                                <Text style={styles.approveText}>Approve</Text>
                            </LinearGradient>
                        </TouchableOpacity>
                    </View>
                )}

                <View style={{ height: 40 }} />
            </ScrollView>
        </SafeAreaView>
    );
}

ProjectApprovalDetailScreen.propTypes = {
    navigation: PropTypes.shape({
        goBack: PropTypes.func.isRequired,
    }).isRequired,
    route: PropTypes.shape({
        params: PropTypes.shape({
            modificationId: PropTypes.string,
            modification: PropTypes.object,
        }),
    }),
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors.background,
    },
    errorContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    errorText: {
        fontSize: 16,
        color: theme.colors.textSecondary,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: theme.colors.surface,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
    },
    backButton: {
        padding: 4,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: theme.colors.textPrimary,
    },
    content: {
        flex: 1,
    },
    mainCard: {
        backgroundColor: theme.colors.surface,
        marginHorizontal: 16,
        marginTop: 16,
        padding: 20,
        borderRadius: 20,
        borderLeftWidth: 4,
        borderLeftColor: theme.colors.warning,
        ...theme.shadows.card,
    },
    typeRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
    },
    typeIcon: {
        width: 48,
        height: 48,
        borderRadius: 14,
        backgroundColor: theme.colors.warningLight,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 14,
    },
    typeInfo: {
        flex: 1,
    },
    modTitle: {
        fontSize: 17,
        fontWeight: '600',
        color: theme.colors.textPrimary,
        marginBottom: 4,
    },
    modProject: {
        fontSize: 14,
        color: theme.colors.textSecondary,
    },
    needsVoteBadge: {
        backgroundColor: theme.colors.danger,
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 12,
    },
    needsVoteText: {
        fontSize: 11,
        fontWeight: '700',
        color: 'white',
    },
    modDescription: {
        fontSize: 15,
        color: theme.colors.textSecondary,
        lineHeight: 22,
        marginBottom: 16,
    },
    deadlineRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    deadlineText: {
        fontSize: 14,
        color: theme.colors.textSecondary,
    },
    section: {
        backgroundColor: theme.colors.surface,
        marginTop: 16,
        marginHorizontal: 16,
        borderRadius: 16,
        padding: 20,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: theme.colors.textPrimary,
        marginBottom: 16,
    },
    sectionHeaderRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 16,
    },
    chainBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: theme.colors.primaryLight,
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 10,
        gap: 4,
    },
    chainBadgeText: {
        fontSize: 11,
        fontWeight: '600',
        color: theme.colors.primary,
    },
    impactGrid: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    impactItem: {
        flex: 1,
        backgroundColor: theme.colors.surfaceAlt,
        padding: 14,
        borderRadius: 12,
    },
    impactLabel: {
        fontSize: 12,
        color: theme.colors.textSecondary,
        marginBottom: 6,
    },
    impactValue: {
        fontSize: 15,
        fontWeight: '600',
        color: theme.colors.textPrimary,
    },
    impactArrow: {
        paddingHorizontal: 10,
    },
    returnImpact: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: theme.colors.primaryLight,
        padding: 12,
        borderRadius: 10,
        marginTop: 14,
        gap: 8,
    },
    returnImpactText: {
        flex: 1,
        fontSize: 13,
        color: theme.colors.primary,
    },
    progressCard: {
        backgroundColor: theme.colors.surfaceAlt,
        padding: 20,
        borderRadius: 16,
    },
    progressStats: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 20,
    },
    progressStatItem: {
        alignItems: 'center',
    },
    progressStatValue: {
        fontSize: 24,
        fontWeight: '700',
        color: theme.colors.textPrimary,
    },
    progressStatLabel: {
        fontSize: 12,
        color: theme.colors.textSecondary,
        marginTop: 4,
    },
    progressCircle: {
        width: 72,
        height: 72,
        borderRadius: 36,
        backgroundColor: theme.colors.successLight,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 4,
        borderColor: theme.colors.success,
    },
    progressPercent: {
        fontSize: 20,
        fontWeight: '700',
        color: theme.colors.success,
    },
    progressBarContainer: {
        marginBottom: 12,
    },
    progressBar: {
        height: 8,
        backgroundColor: theme.colors.border,
        borderRadius: 4,
        overflow: 'hidden',
    },
    progressFill: {
        height: '100%',
        borderRadius: 4,
    },
    progressNote: {
        fontSize: 13,
        color: theme.colors.textSecondary,
        textAlign: 'center',
    },
    timelineContainer: {
        position: 'relative',
    },
    approvalItem: {
        flexDirection: 'row',
        marginBottom: 16,
    },
    timelineConnector: {
        position: 'absolute',
        left: 17,
        top: -16,
        width: 2,
        height: 16,
        backgroundColor: theme.colors.border,
    },
    approvalDot: {
        width: 36,
        height: 36,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 14,
    },
    approvalContent: {
        flex: 1,
        backgroundColor: theme.colors.surfaceAlt,
        padding: 14,
        borderRadius: 14,
    },
    approvalHeader: {
        flexDirection: 'row',
        alignItems: 'flex-start',
    },
    investorInfo: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        flex: 1,
    },
    investorAvatar: {
        width: 36,
        height: 36,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 10,
        flexShrink: 0,
    },
    investorInitials: {
        color: 'white',
        fontWeight: '600',
        fontSize: 12,
    },
    investorDetails: {
        flex: 1,
        minWidth: 0,
    },
    nameRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 4,
    },
    investorName: {
        fontSize: 14,
        fontWeight: '500',
        color: theme.colors.textPrimary,
        flexShrink: 1,
    },
    badgeRow: {
        flexDirection: 'row',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 6,
        marginBottom: 4,
    },
    creatorTag: {
        backgroundColor: theme.colors.warningLight,
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 6,
    },
    creatorTagText: {
        fontSize: 10,
        fontWeight: '600',
        color: theme.colors.warning,
    },
    approvalTime: {
        fontSize: 12,
        color: theme.colors.textSecondary,
        marginTop: 2,
    },
    statusBadge: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 8,
    },
    statusText: {
        fontSize: 12,
        fontWeight: '600',
    },
    voteContainer: {
        flexDirection: 'row',
        paddingHorizontal: 16,
        paddingTop: 20,
        gap: 12,
    },
    rejectBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: theme.colors.dangerLight,
        paddingVertical: 16,
        borderRadius: 14,
        gap: 8,
    },
    rejectText: {
        fontSize: 16,
        fontWeight: '600',
        color: theme.colors.danger,
    },
    approveBtn: {
        flex: 1.5,
        borderRadius: 14,
        overflow: 'hidden',
    },
    approveGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 16,
        gap: 8,
    },
    approveText: {
        fontSize: 16,
        fontWeight: '600',
        color: 'white',
    },
});
