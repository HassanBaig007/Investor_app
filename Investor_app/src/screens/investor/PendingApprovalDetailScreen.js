import React, { useEffect, useMemo, useState } from 'react';
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
import { getDaysRemaining } from '../../utils/dateTimeUtils';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

const getRefId = (value) => {
    if (!value) return null;
    if (typeof value === 'string') return value;
    if (value._id) return String(value._id);
    if (value.id) return String(value.id);
    return null;
};

const getDisplayName = (value, fallback = 'Unknown') => {
    if (!value) return fallback;
    if (typeof value === 'string') return value;
    return value.name || fallback;
};

const getInitials = (name) => {
    if (!name || typeof name !== 'string') return '??';
    return name
        .split(' ')
        .map((part) => part?.[0] || '')
        .join('')
        .slice(0, 2)
        .toUpperCase();
};

const toStatusOrder = (status) => {
    if (status === 'approved') return 0;
    if (status === 'pending') return 1;
    if (status === 'rejected') return 2;
    return 3;
};

const extractProjectUsers = (project) => {
    const investors = (project?.investors || [])
        .map((inv) => inv?.user)
        .filter(Boolean);

    const creator = project?.createdBy ? [project.createdBy] : [];
    const all = [...investors, ...creator];

    const deduped = [];
    const seen = new Set();
    for (const user of all) {
        const id = getRefId(user);
        if (!id || seen.has(id)) continue;
        seen.add(id);
        deduped.push(user);
    }

    return deduped;
};

const formatApprovalDate = (value) => {
    if (!value) return null;
    const parsedDate = new Date(value);
    if (Number.isNaN(parsedDate.getTime())) return String(value);
    return parsedDate.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
    });
};

const toCleanText = (value) => {
    if (typeof value !== 'string') return '';
    return value.trim();
};

export default function PendingApprovalDetailScreen({ navigation, route }) {
    const { user: currentUser } = useAuth();

    const routedApproval = route?.params?.approval || null;
    const routedModification = route?.params?.modification || null;
    const routedType = route?.params?.approvalType || routedApproval?.type || routedModification?.type || 'modification';
    const routedProjectId = route?.params?.projectId || routedApproval?.projectId || routedModification?.projectId || null;
    const routedSpendingId = route?.params?.spendingId || routedApproval?.id || routedApproval?._id || null;
    const routedModificationId = route?.params?.modificationId || routedModification?.id || routedModification?._id || null;

    const initialDetail = routedApproval || routedModification || null;

    const [detail, setDetail] = useState(initialDetail);
    const [investors, setInvestors] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmittingVote, setIsSubmittingVote] = useState(false);

    const isSpendingApproval = (detail?.type || routedType) === 'spending';
    const currentUserId = String(currentUser?._id || currentUser?.id || '');

    useEffect(() => {
        let isMounted = true;

        const loadDetail = async () => {
            setIsLoading(true);

            try {
                if (routedType === 'spending') {
                    let resolvedSpending = routedApproval;
                    const projectId = String(getRefId(routedProjectId) || getRefId(routedApproval?.projectId) || '');
                    const spendingId = String(getRefId(routedSpendingId) || getRefId(routedApproval) || '');

                    if (projectId) {
                        const [project, spendings] = await Promise.all([
                            api.getProjectById(projectId).catch(() => null),
                            api.getSpendings(projectId, { status: 'pending' }).catch(() => []),
                        ]);

                        if (!isMounted) return;

                        if (project) {
                            setInvestors(extractProjectUsers(project));
                        }

                        if (spendingId) {
                            const match = (spendings || []).find((spending) => String(getRefId(spending)) === spendingId);
                            if (match) {
                                resolvedSpending = {
                                    ...resolvedSpending,
                                    ...match,
                                    type: 'spending',
                                    projectId: match?.projectId || projectId,
                                    projectName: match?.projectName || resolvedSpending?.projectName,
                                };
                            }
                        }
                    }

                    if (isMounted) {
                        setDetail(resolvedSpending ? { ...resolvedSpending, type: 'spending' } : null);
                    }
                } else {
                    let resolvedModification = routedModification;
                    const modificationId = String(getRefId(routedModificationId) || getRefId(routedModification) || '');

                    if (!resolvedModification && modificationId) {
                        const modifications = await api.getModifications().catch(() => []);
                        resolvedModification = (modifications || []).find((item) => String(getRefId(item)) === modificationId) || null;
                    }

                    const projectId = String(
                        getRefId(
                            resolvedModification?.projectId ||
                            resolvedModification?.project?._id ||
                            resolvedModification?.project ||
                            routedProjectId
                        ) || ''
                    );

                    if (projectId) {
                        const project = await api.getProjectById(projectId).catch(() => null);
                        if (isMounted && project) {
                            setInvestors(extractProjectUsers(project));
                        }
                    } else if (isMounted) {
                        setInvestors([]);
                    }

                    if (isMounted) {
                        setDetail(
                            resolvedModification
                                ? {
                                    ...resolvedModification,
                                    type: resolvedModification?.type || 'modification',
                                }
                                : null
                        );
                    }
                }
            } catch (error) {
                console.error('Failed to load pending approval detail:', error);
            } finally {
                if (isMounted) {
                    setIsLoading(false);
                }
            }
        };

        loadDetail();

        return () => {
            isMounted = false;
        };
    }, [routedType, routedApproval, routedModification, routedProjectId, routedSpendingId, routedModificationId]);

    const investorApprovals = useMemo(() => {
        if (!detail) return [];

        if ((detail?.type || routedType) === 'spending') {
            const approvalSummary = detail?.approvalSummary || {};
            const rawApprovals = detail?.approvals || {};
            const chainMap = new Map();
            const addedById = String(getRefId(detail?.addedBy) || detail?.addedById || '');

            const approvedBy = Array.isArray(approvalSummary.approvedBy) ? approvalSummary.approvedBy : [];
            const waitingFor = Array.isArray(approvalSummary.waitingFor) ? approvalSummary.waitingFor : [];

            approvedBy.forEach((entry) => {
                const id = String(getRefId(entry?.id) || '');
                if (!id) return;
                chainMap.set(id, {
                    status: 'approved',
                    user: id,
                    userName: entry?.name || null,
                    date: null,
                });
            });

            waitingFor.forEach((entry) => {
                const id = String(getRefId(entry?.id) || '');
                if (!id || chainMap.has(id)) return;
                chainMap.set(id, {
                    status: 'pending',
                    user: id,
                    userName: entry?.name || null,
                    date: null,
                });
            });

            Object.entries(rawApprovals).forEach(([approvalKey, approval]) => {
                const approvalUserId = String(getRefId(approval?.user) || approvalKey || '');
                if (!approvalUserId) return;

                const existing = chainMap.get(approvalUserId) || {};
                chainMap.set(approvalUserId, {
                    ...existing,
                    status: approval?.status || existing?.status || 'pending',
                    user: approvalUserId,
                    userName: approval?.userName || existing?.userName || null,
                    date: approval?.date || existing?.date || null,
                });
            });

            if (chainMap.size === 0 && investors.length > 0) {
                investors.forEach((investor) => {
                    const id = String(getRefId(investor) || '');
                    if (!id) return;
                    chainMap.set(id, {
                        status: 'pending',
                        user: id,
                        userName: getDisplayName(investor),
                        date: null,
                    });
                });
            }

            return Array.from(chainMap.entries())
                .map(([investorId, approval]) => {
                    const investor =
                        investors.find((item) => String(getRefId(item) || '') === String(investorId)) ||
                        {
                            _id: investorId,
                            id: investorId,
                            name: approval?.userName || 'Unknown',
                        };

                    return {
                        ...approval,
                        investorId,
                        investor,
                        isCurrentUser: String(investorId) === currentUserId,
                        isCreator: String(investorId) === addedById,
                        votedAt: approval?.date || null,
                    };
                })
                .sort((left, right) => {
                    if (left.isCreator) return -1;
                    if (right.isCreator) return 1;
                    return toStatusOrder(left.status) - toStatusOrder(right.status);
                });
        }

        const sourceApprovals = detail?.investorApprovals || detail?.votesMap || {};
        const proposerId = String(getRefId(detail?.proposedBy) || getRefId(detail?.createdBy) || '');

        return Object.entries(sourceApprovals)
            .map(([investorId, approval]) => {
                const resolvedInvestorId = String(getRefId(investorId) || getRefId(approval?.user) || investorId || '');
                const fallbackName = approval?.userName || approval?.name || 'Unknown';
                const investor =
                    investors.find((user) => String(getRefId(user) || '') === resolvedInvestorId) ||
                    approval?.investor ||
                    {
                        _id: resolvedInvestorId,
                        id: resolvedInvestorId,
                        name: fallbackName,
                    };

                return {
                    ...approval,
                    investorId: resolvedInvestorId,
                    investor,
                    status: approval?.status || 'pending',
                    votedAt: approval?.votedAt || approval?.date || null,
                    isCurrentUser: resolvedInvestorId === currentUserId,
                    isCreator: resolvedInvestorId === proposerId,
                };
            })
            .sort((left, right) => {
                if (left.isCreator) return -1;
                if (right.isCreator) return 1;
                return toStatusOrder(left.status) - toStatusOrder(right.status);
            });
    }, [detail, investors, currentUserId, routedType]);

    const voteSummary = useMemo(() => {
        if (!detail) {
            return {
                approved: 0,
                rejected: 0,
                pending: 0,
                total: 1,
            };
        }

        if (isSpendingApproval) {
            const approvalSummary = detail?.approvalSummary || {};
            const total = Math.max(
                Number(approvalSummary.requiredApproverCount || investorApprovals.length || detail?.votes?.total || 1),
                1
            );
            const approved = Number(
                approvalSummary.approvedRequiredCount ??
                detail?.votes?.approved ??
                investorApprovals.filter((entry) => entry.status === 'approved').length
            );
            const rejected = Number(
                detail?.votes?.rejected ?? investorApprovals.filter((entry) => entry.status === 'rejected').length
            );
            const pending = Math.max(
                Number(approvalSummary.pendingRequiredCount ?? (total - approved - rejected)),
                0
            );

            return { approved, rejected, pending, total };
        }

        const votes = detail?.votes || {};
        const total = Math.max(Number(votes.total || investorApprovals.length || 1), 1);
        const approved = Number(votes.approved || investorApprovals.filter((entry) => entry.status === 'approved').length);
        const rejected = Number(votes.rejected || investorApprovals.filter((entry) => entry.status === 'rejected').length);
        const pending = Math.max(Number(votes.pending ?? (total - approved - rejected)), 0);
        return { approved, rejected, pending, total };
    }, [detail, investorApprovals, isSpendingApproval]);

    const progressPercent = Math.min((voteSummary.approved / Math.max(voteSummary.total, 1)) * 100, 100);
    const approvalRecords = detail?.votesMap || detail?.approvals || {};
    const myVoteStatus = approvalRecords[currentUserId]?.status ||
        Object.values(approvalRecords).find((approval) => String(getRefId(approval?.user) || '') === currentUserId)?.status ||
        null;
    const isAlreadyApproved = detail?.status === 'approved';
    const needsMyVote = !isAlreadyApproved && myVoteStatus !== 'approved' && myVoteStatus !== 'rejected';

    const handleVote = (voteType) => {
        const isApproveAction = voteType === 'approve';
        const actionText = isApproveAction ? 'approve' : 'reject';

        Alert.alert(
            `${isApproveAction ? 'Approve' : 'Reject'} Request`,
            `Are you sure you want to ${actionText} this request?`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: isApproveAction ? 'Approve' : 'Reject',
                    style: isApproveAction ? 'default' : 'destructive',
                    onPress: async () => {
                        const detailId = getRefId(detail) || getRefId(routedSpendingId) || getRefId(routedModificationId);
                        if (!detailId) {
                            Alert.alert('Error', 'Unable to find approval request id.');
                            return;
                        }

                        try {
                            setIsSubmittingVote(true);
                            if (isSpendingApproval) {
                                await api.voteSpending(detailId, isApproveAction ? 'approved' : 'rejected');
                            } else if (isApproveAction) {
                                await api.approveRequest(detailId);
                            } else {
                                await api.rejectRequest(detailId, 'Rejected by investor');
                            }

                            Alert.alert(
                                isApproveAction ? '✅ Vote Recorded' : '❌ Vote Recorded',
                                isApproveAction
                                    ? 'Your approval has been recorded.'
                                    : 'Your rejection has been recorded.',
                                [{ text: 'OK', onPress: () => navigation.goBack() }]
                            );
                        } catch (error) {
                            console.error('Pending approval vote failed:', error);
                            Alert.alert('Error', error?.friendlyMessage || 'Failed to submit vote.');
                        } finally {
                            setIsSubmittingVote(false);
                        }
                    },
                },
            ]
        );
    };

    if (isLoading) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.errorContainer}>
                    <ActivityIndicator size="large" color={theme.colors.primary} />
                </View>
            </SafeAreaView>
        );
    }

    if (!detail) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.errorContainer}>
                    <Text style={styles.errorText}>Approval request not found</Text>
                </View>
            </SafeAreaView>
        );
    }

    const deadlineDaysRemaining = detail?.deadline ? getDaysRemaining(detail.deadline) : null;
    const rawTitle = toCleanText(detail?.title);
    const rawDescription = toCleanText(detail?.description);
    const spendingTitleSummary = isSpendingApproval
        ? rawTitle.replace(/^Approve expense:\s*/i, '').trim()
        : '';
    const spendingSummaryText = isSpendingApproval
        ? (spendingTitleSummary || toCleanText(detail?.productName))
        : '';

    const detailTitle = isSpendingApproval
        ? 'Expense Approval Request'
        : rawTitle || 'Pending Modification Approval';
    const detailProjectName = toCleanText(detail?.projectName) || toCleanText(detail?.project?.name) || 'Project';
    const defaultDescription = isSpendingApproval
        ? 'Please review this expense request and cast your vote.'
        : 'Please review this modification request and cast your vote.';
    const hasDistinctRawDescription =
        !!rawDescription &&
        (!spendingSummaryText || rawDescription.toLowerCase() !== spendingSummaryText.toLowerCase());
    const detailDescription = hasDistinctRawDescription ? rawDescription : defaultDescription;
    const requestIconName = detail?.type === 'timeline' ? 'time' : 'cash';

    const renderInvestorApproval = (approval, index) => {
        const status = approval?.status || 'pending';

        const getStatusPalette = () => {
            if (status === 'approved') {
                return {
                    label: 'Approved',
                    tone: theme.colors.success,
                    soft: theme.colors.successLight,
                    card: theme.colors.successLight,
                    border: theme.colors.success,
                };
            }

            if (status === 'rejected') {
                return {
                    label: 'Rejected',
                    tone: theme.colors.danger,
                    soft: theme.colors.dangerLight,
                    card: theme.colors.dangerLight,
                    border: theme.colors.danger,
                };
            }

            return {
                label: 'Pending',
                tone: theme.colors.info,
                soft: theme.colors.infoLight,
                card: theme.colors.surfaceAlt,
                border: theme.colors.border,
            };
        };

        const getStatusIcon = () => {
            if (status === 'approved') return 'checkmark-circle';
            if (status === 'rejected') return 'close-circle';
            return 'time';
        };

        const investorName = getDisplayName(approval?.investor);
        const statusPalette = getStatusPalette();

        return (
            <View key={`${approval.investorId}-${index}`} style={styles.approvalItem}>
                {index > 0 && (
                    <View
                        style={[
                            styles.timelineConnector,
                            status === 'approved'
                                ? styles.timelineConnectorApproved
                                : status === 'rejected'
                                    ? styles.timelineConnectorRejected
                                    : styles.timelineConnectorPending,
                        ]}
                    />
                )}

                <View style={[styles.approvalDot, { backgroundColor: statusPalette.soft }]}> 
                    <Ionicons name={getStatusIcon()} size={16} color={statusPalette.tone} />
                </View>

                <View
                    style={[
                        styles.approvalContent,
                        {
                            backgroundColor: statusPalette.card,
                            borderColor: statusPalette.border,
                        },
                    ]}
                >
                    <View style={styles.approvalHeader}>
                        <View style={styles.investorInfo}>
                            <LinearGradient
                                colors={approval?.isCreator ? theme.gradients.gold : theme.gradients.primary}
                                style={styles.investorAvatar}
                            >
                                <Text style={styles.investorInitials}>{getInitials(investorName)}</Text>
                            </LinearGradient>

                            <View style={styles.investorDetails}>
                                <View style={styles.nameRow}>
                                    <Text style={styles.investorName} numberOfLines={1}>
                                        {investorName}
                                        {approval?.isCurrentUser ? ' (You)' : ''}
                                    </Text>
                                </View>

                                <View style={styles.badgeRow}>
                                    {approval?.isCreator && (
                                        <View style={styles.creatorTag}>
                                            <Text style={styles.creatorTagText}>Creator</Text>
                                        </View>
                                    )}
                                    <View
                                        style={[
                                            styles.statusBadge,
                                            {
                                                backgroundColor: statusPalette.soft,
                                                borderColor: statusPalette.border,
                                            },
                                        ]}
                                    >
                                        <Text style={[styles.statusText, { color: statusPalette.tone }]}> 
                                            {statusPalette.label}
                                        </Text>
                                    </View>
                                </View>

                                <Text
                                    style={[
                                        styles.approvalTime,
                                        status === 'pending' ? styles.approvalTimePending : null,
                                    ]}
                                >
                                    {approval?.votedAt || approval?.date
                                        ? formatApprovalDate(approval?.votedAt || approval?.date)
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
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color={theme.colors.textPrimary} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Approval Details</Text>
                <View style={{ width: 32 }} />
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={styles.content}>
                <View style={styles.mainCard}>
                    <View style={styles.typeRow}>
                        <View style={styles.requestIdentityRow}>
                            <View style={styles.typeIcon}>
                                <Ionicons
                                    name={requestIconName}
                                    size={22}
                                    color={theme.colors.warning}
                                />
                            </View>

                            <View style={styles.typeInfo}>
                                <Text style={styles.modTitle}>{detailTitle}</Text>
                                <Text style={styles.modProject} numberOfLines={2}>{detailProjectName}</Text>
                            </View>
                        </View>
                    </View>

                    {needsMyVote && (
                        <LinearGradient
                            colors={theme.colors.dangerGradient}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                            style={styles.needsVoteBadge}
                        >
                            <Text style={styles.needsVoteText}>Vote Required</Text>
                        </LinearGradient>
                    )}

                    {isSpendingApproval && !!spendingSummaryText && (
                        <View style={styles.expenseSummaryCard}>
                            <Text style={styles.expenseSummaryLabel}>Expense Approval Required</Text>
                            <Text style={styles.expenseSummaryText}>{spendingSummaryText}</Text>
                        </View>
                    )}

                    <View style={styles.requestTextBlock}>
                        <Text style={styles.modDescription}>{detailDescription}</Text>
                    </View>

                    {deadlineDaysRemaining !== null && (
                        <View
                            style={[
                                styles.deadlineRow,
                                deadlineDaysRemaining <= 3
                                    ? styles.deadlineRowUrgent
                                    : styles.deadlineRowCalm,
                            ]}
                        >
                            <Ionicons
                                name="calendar"
                                size={18}
                                color={
                                    deadlineDaysRemaining <= 3
                                        ? theme.colors.danger
                                        : theme.colors.textSecondary
                                }
                            />
                            <Text
                                style={[
                                    styles.deadlineText,
                                    deadlineDaysRemaining <= 3
                                        ? { color: theme.colors.danger }
                                        : null,
                                ]}
                            >
                                {deadlineDaysRemaining > 0
                                    ? `${deadlineDaysRemaining} days remaining`
                                    : 'Deadline passed'}
                            </Text>
                        </View>
                    )}
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Approval Progress</Text>

                    <View style={styles.progressCard}>
                        <View style={styles.progressStats}>
                            <View style={styles.progressStatItem}>
                                <Text style={styles.progressStatValue}>{voteSummary.approved}</Text>
                                <Text style={styles.progressStatLabel}>Approved</Text>
                            </View>
                            <View style={styles.progressCircle}>
                                <Text style={styles.progressPercent}>{Math.round(progressPercent)}%</Text>
                            </View>
                            <View style={styles.progressStatItem}>
                                <Text style={styles.progressStatValue}>{voteSummary.pending}</Text>
                                <Text style={styles.progressStatLabel}>Pending</Text>
                            </View>
                        </View>

                        <View style={styles.progressBarContainer}>
                            <View style={styles.progressBar}>
                                <LinearGradient
                                    colors={theme.gradients.success}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 0 }}
                                    style={[styles.progressFill, { width: `${progressPercent}%` }]}
                                />
                            </View>
                        </View>

                        <Text style={styles.progressNote}>
                            Requires 100% approval ({Math.max(voteSummary.total - voteSummary.approved, 0)} more needed)
                        </Text>
                    </View>
                </View>

                <View style={styles.section}>
                    <View style={styles.sectionHeaderRow}>
                        <Text style={styles.sectionTitle}>Investor Approvals</Text>
                        <View style={styles.chainBadge}>
                            <Ionicons name="git-branch" size={14} color={theme.colors.primary} />
                            <Text style={styles.chainBadgeText}>Privilege Chain</Text>
                        </View>
                    </View>

                    <View style={styles.timelineContainer}>
                        <View pointerEvents="none" style={styles.timelineRail} />
                        {investorApprovals.map((approval, index) => renderInvestorApproval(approval, index))}
                    </View>
                </View>

                {needsMyVote && (
                    <View style={styles.voteContainer}>
                        <TouchableOpacity
                            style={[styles.rejectBtn, isSubmittingVote ? styles.voteButtonDisabled : null]}
                            onPress={() => handleVote('reject')}
                            disabled={isSubmittingVote}
                            activeOpacity={0.9}
                        >
                            <Ionicons name="close-circle" size={22} color={theme.colors.danger} />
                            <Text style={styles.rejectText}>{isSubmittingVote ? 'Submitting...' : 'Reject'}</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.approveBtn, isSubmittingVote ? styles.voteButtonDisabled : null]}
                            onPress={() => handleVote('approve')}
                            disabled={isSubmittingVote}
                            activeOpacity={0.9}
                        >
                            <LinearGradient
                                colors={theme.gradients.success}
                                style={styles.approveGradient}
                            >
                                <Ionicons name="checkmark-circle" size={22} color={theme.colors.textLight} />
                                <Text style={styles.approveText}>{isSubmittingVote ? 'Submitting...' : 'Approve'}</Text>
                            </LinearGradient>
                        </TouchableOpacity>
                    </View>
                )}

                <View style={{ height: 40 }} />
            </ScrollView>
        </SafeAreaView>
    );
}

PendingApprovalDetailScreen.propTypes = {
    navigation: PropTypes.shape({
        goBack: PropTypes.func.isRequired,
    }).isRequired,
    route: PropTypes.shape({
        params: PropTypes.shape({
            approvalType: PropTypes.string,
            approval: PropTypes.object,
            spendingId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
            modificationId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
            modification: PropTypes.object,
            projectId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
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
        alignItems: 'flex-start',
        marginBottom: 10,
    },
    requestIdentityRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        flex: 1,
        minWidth: 0,
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
        minWidth: 0,
    },
    modTitle: {
        fontSize: 17,
        fontWeight: '600',
        color: theme.colors.textPrimary,
        lineHeight: 24,
    },
    modProject: {
        fontSize: 14,
        color: theme.colors.textSecondary,
        marginTop: 4,
    },
    needsVoteBadge: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 12,
        alignSelf: 'flex-start',
        flexShrink: 0,
        marginBottom: 12,
    },
    needsVoteText: {
        fontSize: 11,
        fontWeight: '700',
        color: 'white',
    },
    expenseSummaryCard: {
        backgroundColor: theme.colors.warningLight,
        borderRadius: 12,
        paddingHorizontal: 12,
        paddingVertical: 10,
        borderWidth: 1,
        borderColor: theme.colors.warning,
        marginBottom: 12,
    },
    expenseSummaryLabel: {
        fontSize: 11,
        fontWeight: '700',
        color: theme.colors.warning,
        textTransform: 'uppercase',
        letterSpacing: 0.4,
        marginBottom: 6,
    },
    expenseSummaryText: {
        fontSize: 14,
        fontWeight: '600',
        color: theme.colors.textPrimary,
        lineHeight: 20,
    },
    modDescription: {
        fontSize: 15,
        color: theme.colors.textSecondary,
        lineHeight: 22,
    },
    requestTextBlock: {
        marginBottom: 16,
    },
    deadlineRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 10,
    },
    deadlineRowCalm: {
        backgroundColor: theme.colors.warningLight,
    },
    deadlineRowUrgent: {
        backgroundColor: theme.colors.dangerLight,
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
        borderWidth: 1,
        borderColor: theme.colors.border,
        ...theme.shadows.card,
    },
    sectionTitle: {
        ...theme.typography.h4,
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
        ...theme.typography.captionBold,
        color: theme.colors.primary,
    },
    progressCard: {
        backgroundColor: theme.colors.surface,
        padding: 20,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: theme.colors.borderLight,
        ...theme.shadows.soft,
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
        backgroundColor: theme.colors.successLight,
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
        backgroundColor: theme.colors.surface,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: theme.colors.borderLight,
        padding: 14,
        ...theme.shadows.soft,
    },
    timelineRail: {
        position: 'absolute',
        left: 30,
        top: 22,
        bottom: 22,
        width: 4,
        borderRadius: 999,
        backgroundColor: theme.colors.primaryLight,
        borderWidth: 1,
        borderColor: theme.colors.borderAccent,
        opacity: 0.95,
    },
    approvalItem: {
        flexDirection: 'row',
        marginBottom: 18,
    },
    timelineConnector: {
        position: 'absolute',
        left: 16,
        top: -21,
        width: 4,
        height: 24,
        borderRadius: 999,
    },
    timelineConnectorPending: {
        backgroundColor: theme.colors.primary,
    },
    timelineConnectorApproved: {
        backgroundColor: theme.colors.success,
    },
    timelineConnectorRejected: {
        backgroundColor: theme.colors.danger,
    },
    approvalDot: {
        width: 36,
        height: 36,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 14,
        borderWidth: 1,
        borderColor: theme.colors.borderLight,
    },
    approvalContent: {
        flex: 1,
        padding: 14,
        borderRadius: 14,
        borderWidth: 1,
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
        ...theme.typography.bodySemibold,
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
        ...theme.typography.captionBold,
        color: theme.colors.warning,
    },
    approvalTime: {
        ...theme.typography.small,
        color: theme.colors.textSecondary,
        marginTop: 4,
    },
    approvalTimePending: {
        color: theme.colors.textTertiary,
    },
    statusBadge: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 999,
        borderWidth: 1,
    },
    statusText: {
        ...theme.typography.captionBold,
        textTransform: 'uppercase',
    },
    voteContainer: {
        flexDirection: 'row',
        paddingHorizontal: 16,
        paddingTop: 20,
        paddingBottom: 4,
        gap: 12,
    },
    rejectBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: theme.colors.surface,
        borderWidth: 1,
        borderColor: theme.colors.danger,
        paddingVertical: 16,
        borderRadius: 14,
        gap: 8,
    },
    rejectText: {
        ...theme.typography.cta,
        color: theme.colors.danger,
    },
    approveBtn: {
        flex: 1.5,
        borderRadius: 14,
        overflow: 'hidden',
        ...theme.shadows.successGlow,
    },
    approveGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 16,
        gap: 8,
    },
    approveText: {
        ...theme.typography.ctaLarge,
        color: theme.colors.textLight,
    },
    voteButtonDisabled: {
        opacity: 0.65,
    },
});