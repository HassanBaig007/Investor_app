import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import {
    View,
    Text,
    ScrollView,
    StyleSheet,
    TouchableOpacity,
    Alert,
    TextInput,
    Switch,
    KeyboardAvoidingView,
    Platform,
    ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import LinearGradient from 'react-native-linear-gradient';
import { theme, formatCurrency } from '../../components/Theme';
import { api } from '../../services/api';
import NotificationService from '../../services/notificationService';
import { useAuth } from '../../context/AuthContext';

export default function ManageProjectInvestorsScreen({ navigation, route }) {
    const projectId = route?.params?.projectId;
    const [project, setProject] = useState(null);
    const [allUsers, setAllUsers] = useState([]);
    const [modifications, setModifications] = useState([]);
    const [isDataLoading, setIsDataLoading] = useState(true);
    const [showAddForm, setShowAddForm] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [showPrivacySettings, setShowPrivacySettings] = useState(false);
    const [lastUpdate, setLastUpdate] = useState(Date.now());

    // Dynamic current user
    const { user: currentUser } = useAuth();

    const getRefId = (value) => {
        if (!value) return null;
        if (typeof value === 'string') return value;
        if (value._id) return String(value._id);
        if (value.id) return String(value.id);
        return null;
    };

    // Current user's privacy state
    const [isAnonymous, setIsAnonymous] = useState(false);

    useEffect(() => {
        const fetchData = async () => {
            setIsDataLoading(true);
            try {
                const [projectsData, modsData] = await Promise.all([
                    api.getProjects(),
                    api.getModifications().catch(() => []),
                ]);
                const found = (projectsData || []).find(
                    (p) => String(getRefId(p)) === String(projectId)
                );

                let usersData = [];
                try {
                    usersData = await api.getProjectInviteCandidates(projectId);
                } catch {
                    usersData = await api.getUsers().catch(() => []);
                }

                setProject(found || null);
                setAllUsers(usersData || []);
                setModifications((modsData || []).filter(m => {
                    const modProjectId = getRefId(m.projectId || m.project);
                    return String(modProjectId) === String(projectId);
                }));

                // Extract current user's privacy settings from project
                const userId = getRefId(currentUser);
                const myInvestor = found?.investors?.find(
                    (inv) => String(getRefId(inv.user)) === String(userId)
                );
                setIsAnonymous(myInvestor?.privacySettings?.isAnonymous || false);
            } catch (err) {
                console.error('Failed to load project data:', err);
            } finally {
                setIsDataLoading(false);
            }
        };
        fetchData();
    }, [projectId, lastUpdate]);

    if (isDataLoading) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.errorContainer}>
                    <ActivityIndicator size="large" color={theme.colors.primary} />
                </View>
            </SafeAreaView>
        );
    }

    if (!project) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.errorContainer}>
                    <Text style={styles.errorText}>Project not found</Text>
                </View>
            </SafeAreaView>
        );
    }

    // Roles check with null guards
    const userId = getRefId(currentUser);
    const creatorId = getRefId(project.createdBy);
    const isAdmin = ['super_admin', 'project_admin', 'admin'].includes(currentUser?.role);
    const isCreator = String(creatorId) === String(userId);
    const isUserInvestor = project.investors?.some(
        (inv) => String(getRefId(inv.user)) === String(userId)
    );

    // Get investors with privacy filtering by mapping from project.investors + allUsers
    const projectInvestorIds = new Set(
        (project.investors || [])
            .map((inv) => String(getRefId(inv.user)))
            .filter(Boolean)
    );
    const projectInvestors = (project.investors || [])
        .filter(inv => inv?.user?.role !== 'super_admin')
        .map(inv => {
            const invUserId = getRefId(inv.user);
            const userData = inv.user?.name
                ? inv.user
                : allUsers.find((u) => String(getRefId(u)) === String(invUserId));
            return {
                id: invUserId,
                _id: invUserId,
                name: userData?.name || 'Unknown',
                email: userData?.email || '',
                role: inv.role || 'active',
                investedAmount: inv.investedAmount || 0,
                privacySettings: inv.privacySettings || {},
            };
        });

    const availableInvestors = allUsers.filter(
        (u) => !projectInvestorIds.has(String(getRefId(u))) && u?.role !== 'super_admin'
    );
    const projectModifications = modifications;

    // Ensure pendingInvitations exists
    if (!project.pendingInvitations) {
        project.pendingInvitations = [];
    }

    // Check if a user is already invited
    const isUserInvited = (userId) => {
        return project.pendingInvitations.some(
            (inv) => {
                const invUserId = inv.userId?._id || inv.userId?.id || inv.userId;
                return String(invUserId) === String(userId);
            }
        );
    };



    // Helper: invite member with specific role
    const inviteMemberWithRole = async (investor, role) => {
        try {
            const invId = getRefId(investor);
            const projId = getRefId(project);
            await api.inviteUserToProject(projId, invId, role);
            setLastUpdate(Date.now()); // Refresh data

            NotificationService.sendLocalNotification(
                'Invitation Sent',
                `Invitation to join project sent to ${investor.name}`,
                { type: 'invitation', projectId: projId }
            );

            const roleLabel = role === 'active' ? 'Active Member' : 'Passive Member';
            Alert.alert(
                '✅ Invitation Sent',
                `${investor.name} has been invited as a ${roleLabel}.`,
                [{ text: 'OK' }]
            );
            setShowAddForm(false);
        } catch (err) {
            console.error('Failed to send invitation:', err);
            Alert.alert('Error', err.response?.data?.message || err.friendlyMessage || 'Failed to send invitation.');
        }
    };

    // Role selection when adding new member
    const handleAddInvestor = (investor) => {
        Alert.alert(
            '👤 Add Member',
            `Select role for ${investor.name}:`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: '👁️ Passive (View Only)',
                    onPress: () => inviteMemberWithRole(investor, 'passive'),
                },
                {
                    text: '⚡ Active (Full Access)',
                    onPress: () => inviteMemberWithRole(investor, 'active'),
                },
            ]
        );
    };

    // Show options when clicking existing member
    const handleMemberPress = (investor) => {
        const memberId = getRefId(investor);
        const isCreatorMember = String(memberId) === String(creatorId);
        const isSelfMember = String(memberId) === String(userId);
        const currentRole = investor.role || 'active';

        // Creator cannot be modified
        if (isCreatorMember) {
            Alert.alert('Project Creator', `${investor.name} is the project creator and cannot be modified.`);
            return;
        }

        // Can't modify yourself
        if (isSelfMember) {
            Alert.alert('Cannot Modify', 'You cannot change your own role or remove yourself.');
            return;
        }

        // Only creator/admin can modify members
        if (!isCreator && !isAdmin) {
            return;
        }

        const roleToggleText = currentRole === 'active'
            ? '👁️ Make Passive (View Only)'
            : '⚡ Make Active (Full Access)';

        Alert.alert(
            `${investor.name}`,
            `Current Role: ${currentRole === 'active' ? 'Active Member' : 'Passive Member'}`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: roleToggleText,
                    onPress: () => toggleMemberRole(investor, currentRole),
                },
                {
                    text: '🗑️ Remove from Project',
                    style: 'destructive',
                    onPress: () => removeMember(investor),
                },
            ]
        );
    };

    // Toggle member role
    const toggleMemberRole = async (investor, currentRole) => {
        const newRole = currentRole === 'active' ? 'passive' : 'active';
        try {
            const projId = getRefId(project);
            const memberId = getRefId(investor);
            await api.updateMemberRole(projId, memberId, newRole);
            setLastUpdate(Date.now()); // Refresh data

            const roleLabel = newRole === 'active' ? 'Active Member' : 'Passive Member';
            Alert.alert(
                '✅ Role Updated',
                `${investor.name} is now a ${roleLabel}.`,
                [{ text: 'OK' }]
            );
        } catch (err) {
            console.error('Failed to update role:', err);
            Alert.alert('Error', err.friendlyMessage || 'Failed to update role.');
        }
    };

    // Remove member from project
    const removeMember = (investor) => {
        Alert.alert(
            'Remove Member',
            `Are you sure you want to remove ${investor.name} from this project?`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Remove',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            const projId = getRefId(project);
                            const memberId = getRefId(investor);
                            await api.removeInvestor(projId, memberId);
                            setLastUpdate(Date.now()); // Refresh data
                            Alert.alert('Removed', `${investor.name} has been removed from the project.`);
                        } catch (err) {
                            console.error('Failed to remove member:', err);
                            Alert.alert('Error', err.friendlyMessage || 'Failed to remove member.');
                        }
                    },
                },
            ]
        );
    };

    const handleToggleAnonymous = (value) => {
        setIsAnonymous(value);
        Alert.alert(
            value ? 'Privacy Enabled' : 'Privacy Disabled',
            value
                ? 'Other investors will now see you as "Anonymous Investor"'
                : 'Your identity is now visible to all project members',
            [{ text: 'OK' }]
        );
    };

    // Render investor card with privacy-aware display
    const renderInvestorCard = (investor, isCreatorMember = false) => {
        const isAnonymousInvestor = investor.visibilityLevel === 'anonymous';
        const showFullAsAdmin = investor.visibilityLevel === 'admin' && investor.isAnonymous;
        const memberId = getRefId(investor);
        const isSelf = String(memberId) === String(userId);
        const memberRole = investor.role || 'active';
        const canTapToEdit = (isCreator || isAdmin) && !isCreatorMember && !isSelf;

        const getAvatarGradient = () => {
            if (isCreatorMember) return ['#F59E0B', '#D97706'];
            if (isSelf) return ['#10B981', '#059669'];
            return theme.gradients.primary;
        };

        return (
            <TouchableOpacity
                key={investor.id}
                style={styles.investorCard}
                onPress={() => handleMemberPress(investor)}
                activeOpacity={canTapToEdit ? 0.7 : 1}
            >
                {/* Avatar */}
                {isAnonymousInvestor ? (
                    <View style={[styles.investorAvatar, styles.anonymousAvatar]}>
                        <MaterialCommunityIcons name="incognito" size={22} color={theme.colors.textSecondary} />
                    </View>
                ) : (
                    <LinearGradient
                        colors={getAvatarGradient()}
                        style={styles.investorAvatar}
                    >
                        <Text style={styles.investorInitials}>
                            {investor.name.split(' ').map(n => n[0]).join('')}
                        </Text>
                    </LinearGradient>
                )}

                {/* Info */}
                <View style={styles.investorInfo}>
                    <View style={styles.investorNameRow}>
                        <Text
                            style={[styles.investorName, isAnonymousInvestor && styles.anonymousText]}
                            numberOfLines={1}
                        >
                            {investor.name}
                        </Text>

                        {/* Badges */}
                        {isSelf && (
                            <View style={styles.selfBadge}>
                                <Text style={styles.selfBadgeText}>You</Text>
                            </View>
                        )}
                        {isCreatorMember && (
                            <View style={styles.creatorBadge}>
                                <MaterialCommunityIcons name="shield-check" size={10} color={theme.colors.warning} />
                                <Text style={styles.creatorBadgeText}>Creator</Text>
                            </View>
                        )}
                        {/* Role Badge - Active or Passive */}
                        {!isCreatorMember && (
                            <View style={[
                                styles.roleBadge,
                                { backgroundColor: memberRole === 'active' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(107, 114, 128, 0.15)' }
                            ]}>
                                <MaterialCommunityIcons
                                    name={memberRole === 'active' ? 'flash' : 'eye'}
                                    size={10}
                                    color={memberRole === 'active' ? '#10B981' : '#6B7280'}
                                />
                                <Text style={[
                                    styles.roleBadgeText,
                                    { color: memberRole === 'active' ? '#10B981' : '#6B7280' }
                                ]}>
                                    {memberRole === 'active' ? 'Active' : 'Passive'}
                                </Text>
                            </View>
                        )}
                        {showFullAsAdmin && (
                            <View style={styles.anonymousBadge}>
                                <MaterialCommunityIcons name="incognito" size={10} color={theme.colors.primary} />
                                <Text style={styles.anonymousBadgeText}>Anon</Text>
                            </View>
                        )}
                    </View>
                    <Text style={[styles.investorEmail, isAnonymousInvestor && styles.anonymousText]} numberOfLines={1}>
                        {investor.email}
                    </Text>
                </View>

                {/* Stats + Tap indicator */}
                <View style={styles.investorStats}>
                    {investor.totalInvested === null ? (
                        <View style={styles.hiddenAmount}>
                            <MaterialCommunityIcons name="eye-off-outline" size={16} color={theme.colors.textTertiary} />
                            <Text style={styles.investorLabel}>Hidden</Text>
                        </View>
                    ) : (
                        <>
                            <Text style={styles.investorAmount} numberOfLines={1}>
                                {formatCurrency(investor.totalInvested)}
                            </Text>
                            <Text style={styles.investorLabel}>Invested</Text>
                        </>
                    )}
                    {canTapToEdit && (
                        <MaterialCommunityIcons name="chevron-right" size={18} color={theme.colors.textTertiary} style={{ marginTop: 4 }} />
                    )}
                </View>
            </TouchableOpacity>
        );
    };

    const renderApprovalStatus = (modification) => {
        const approvedCount = modification.votes.approved;
        const totalCount = modification.votes.total;
        const progressPercent = (approvedCount / totalCount) * 100;

        return (
            <View key={modification.id} style={styles.approvalCard}>
                <View style={styles.approvalHeader}>
                    <View style={styles.approvalTypeIcon}>
                        <MaterialCommunityIcons
                            name={modification.type === 'timeline' ? 'clock-outline' : 'cash'}
                            size={16}
                            color={theme.colors.warning}
                        />
                    </View>
                    <View style={styles.approvalInfo}>
                        <Text style={styles.approvalTitle} numberOfLines={1}>{modification.title}</Text>
                        <Text style={styles.approvalStatus}>
                            {approvedCount}/{totalCount} approved
                        </Text>
                    </View>
                </View>
                <View style={styles.approvalProgressBar}>
                    <View style={[styles.approvalProgressFill, { width: `${progressPercent}%` }]} />
                </View>
            </View>
        );
    };

    return (
        <SafeAreaView style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <MaterialCommunityIcons name="arrow-left" size={24} color={theme.colors.textPrimary} />
                </TouchableOpacity>
                <View style={styles.headerCenter}>
                    <Text style={styles.headerTitle} numberOfLines={1}>{project.name}</Text>
                    <Text style={styles.headerSubtitle}>Project Management</Text>
                </View>
                {isAdmin && (
                    <View style={styles.adminBadgeHeader}>
                        <MaterialCommunityIcons name="shield-check" size={16} color={theme.colors.warning} />
                    </View>
                )}
            </View>

            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                style={{ flex: 1 }}
            >
                <ScrollView showsVerticalScrollIndicator={false} style={styles.content}>
                    {/* Project Stats */}
                    <View style={styles.statsContainer}>
                        <View style={styles.statCard}>
                            <MaterialCommunityIcons name="account-group-outline" size={24} color={theme.colors.primary} />
                            <Text style={styles.statValue}>{projectInvestors.length}</Text>
                            <Text style={styles.statLabel}>Investors</Text>
                        </View>
                        <View style={styles.statCard}>
                            <MaterialCommunityIcons name="cash-multiple" size={24} color={theme.colors.success} />
                            <Text style={styles.statValue}>{formatCurrency(project.raised)}</Text>
                            <Text style={styles.statLabel}>Raised</Text>
                        </View>
                        <View style={styles.statCard}>
                            <MaterialCommunityIcons name="clock-outline" size={24} color={theme.colors.warning} />
                            <Text style={styles.statValue}>{projectModifications.length}</Text>
                            <Text style={styles.statLabel}>Pending</Text>
                        </View>
                    </View>

                    {/* My Privacy Settings - Only for investors */}
                    {isUserInvestor && (
                        <TouchableOpacity
                            style={styles.privacyCard}
                            onPress={() => setShowPrivacySettings(!showPrivacySettings)}
                            activeOpacity={0.8}
                        >
                            <View style={styles.privacyIcon}>
                                <MaterialCommunityIcons
                                    name={isAnonymous ? "eye-off-outline" : "eye-outline"}
                                    size={24}
                                    color={isAnonymous ? theme.colors.primary : theme.colors.success}
                                />
                            </View>
                            <View style={styles.privacyContent}>
                                <Text style={styles.privacyTitle}>My Privacy</Text>
                                <Text style={styles.privacyDescription}>
                                    {isAnonymous
                                        ? 'You appear as "Anonymous Investor" to others'
                                        : 'Your identity is visible to all members'}
                                </Text>
                            </View>
                            <Switch
                                value={isAnonymous}
                                onValueChange={handleToggleAnonymous}
                                trackColor={{ false: theme.colors.border, true: theme.colors.primaryLight }}
                                thumbColor={isAnonymous ? theme.colors.primary : theme.colors.surface}
                            />
                        </TouchableOpacity>
                    )}

                    {/* Privacy Info Banner */}
                    {showPrivacySettings && (
                        <View style={styles.privacyInfoBanner}>
                            <MaterialCommunityIcons name="information-outline" size={18} color={theme.colors.textSecondary} />
                            <Text style={styles.privacyInfoText}>
                                When anonymous, only project admins can see your real identity.
                                Other investors see "Anonymous Investor".
                            </Text>
                        </View>
                    )}

                    {/* Privilege Chain Info */}
                    <View style={styles.privilegeCard}>
                        <View style={styles.privilegeIcon}>
                            <MaterialCommunityIcons name="source-branch" size={24} color={theme.colors.primary} />
                        </View>
                        <View style={styles.privilegeContent}>
                            <Text style={styles.privilegeTitle}>Privilege Chain Active</Text>
                            <Text style={styles.privilegeDescription}>
                                All modifications require unanimous approval from all investors
                            </Text>
                        </View>
                    </View>

                    {/* Current Investors */}
                    <View style={styles.section}>
                        <View style={styles.sectionHeader}>
                            <Text style={styles.sectionTitle}>Project Investors</Text>
                            <View style={styles.badge}>
                                <Text style={styles.badgeText}>{projectInvestors.length}</Text>
                            </View>
                        </View>

                        {projectInvestors.map((investor) =>
                            renderInvestorCard(
                                investor,
                                String(investor.id) === String(getRefId(project.createdBy))
                            )
                        )}
                    </View>

                    {/* Pending Invitations Section - Only for Admins */}
                    {isAdmin && project.pendingInvitations && project.pendingInvitations.length > 0 && (
                        <View style={styles.section}>
                            <View style={styles.sectionHeader}>
                                <Text style={styles.sectionTitle}>Pending Invitations</Text>
                                <View style={[styles.badge, { backgroundColor: theme.colors.primaryLight }]}>
                                    <Text style={[styles.badgeText, { color: theme.colors.primary }]}>
                                        {project.pendingInvitations.length}
                                    </Text>
                                </View>
                            </View>

                            {project.pendingInvitations.map((invitation) => {
                                const popUserId = invitation.userId?._id || invitation.userId?.id || invitation.userId;
                                const invitedUser = invitation.userId?.name ? invitation.userId : allUsers.find(
                                    (i) => String(getRefId(i)) === String(popUserId)
                                );
                                if (!invitedUser) return null;
                                return (
                                    <View key={invitation.id} style={styles.investorCard}>
                                        <View style={[styles.investorAvatar, { opacity: 0.6 }]}>
                                            <Text style={styles.investorInitials}>
                                                {invitedUser.name.split(' ').map(n => n[0]).join('')}
                                            </Text>
                                        </View>
                                        <View style={styles.investorInfo}>
                                            <Text style={styles.investorName}>{invitedUser.name}</Text>
                                            <Text style={styles.investorEmail}>Invited as {invitation.role === 'active' ? 'Active' : 'Passive'}</Text>
                                        </View>
                                        <View style={styles.pendingBadge}>
                                            <MaterialCommunityIcons name="clock-outline" size={14} color={theme.colors.warning} />
                                            <Text style={styles.pendingBadgeText}>Pending</Text>
                                        </View>
                                    </View>
                                );
                            })}
                        </View>
                    )}

                    {/* Add Investor Section - Only for Admins */}
                    {isAdmin && (
                        <View style={styles.section}>
                            <View style={styles.sectionHeader}>
                                <Text style={styles.sectionTitle}>Add Investors</Text>
                                <TouchableOpacity
                                    style={styles.toggleBtn}
                                    onPress={() => setShowAddForm(!showAddForm)}
                                >
                                    <MaterialCommunityIcons
                                        name={showAddForm ? 'chevron-up' : 'chevron-down'}
                                        size={20}
                                        color={theme.colors.primary}
                                    />
                                </TouchableOpacity>
                            </View>

                            {showAddForm && (
                                <>
                                    <View style={styles.searchContainer}>
                                        <MaterialCommunityIcons name="magnify" size={20} color={theme.colors.textTertiary} />
                                        <TextInput
                                            style={styles.searchInput}
                                            placeholder="Search investors..."
                                            placeholderTextColor={theme.colors.textTertiary}
                                            value={searchQuery}
                                            onChangeText={setSearchQuery}
                                        />
                                    </View>

                                    {availableInvestors.length > 0 ? (
                                        availableInvestors
                                            .filter(i => i.name.toLowerCase().includes(searchQuery.toLowerCase()))
                                            .map((investor) => {
                                                const invited = isUserInvited(investor.id);
                                                return (
                                                    <TouchableOpacity
                                                        key={investor.id}
                                                        style={[styles.addInvestorCard, invited && { opacity: 0.7 }]}
                                                        onPress={() => !invited && handleAddInvestor(investor)}
                                                        disabled={invited}
                                                    >
                                                        <View style={styles.addInvestorAvatar}>
                                                            <Text style={styles.addInvestorInitials}>
                                                                {investor.name.split(' ').map(n => n[0]).join('')}
                                                            </Text>
                                                        </View>
                                                        <View style={styles.addInvestorInfo}>
                                                            <Text style={styles.addInvestorName} numberOfLines={1}>{investor.name}</Text>
                                                            <Text style={styles.addInvestorEmail} numberOfLines={1}>{investor.email}</Text>
                                                        </View>
                                                        {invited ? (
                                                            <View style={styles.invitedBadge}>
                                                                <Text style={styles.invitedBadgeText}>Invited</Text>
                                                            </View>
                                                        ) : (
                                                            <TouchableOpacity
                                                                style={styles.addBtn}
                                                                onPress={() => handleAddInvestor(investor)}
                                                            >
                                                                <MaterialCommunityIcons name="plus" size={20} color="white" />
                                                            </TouchableOpacity>
                                                        )}
                                                    </TouchableOpacity>
                                                )
                                            })
                                    ) : (
                                        <View style={styles.emptyState}>
                                            <Text style={styles.emptyText}>No available investors to add</Text>
                                        </View>
                                    )}
                                </>
                            )}

                            {!showAddForm && (
                                <TouchableOpacity
                                    style={styles.addNewBtn}
                                    onPress={() => setShowAddForm(true)}
                                >
                                    <LinearGradient
                                        colors={theme.gradients.primary}
                                        style={styles.addNewGradient}
                                    >
                                        <MaterialCommunityIcons name="account-plus" size={20} color="white" />
                                        <Text style={styles.addNewText}>Add New Investor</Text>
                                    </LinearGradient>
                                </TouchableOpacity>
                            )}
                        </View>
                    )}

                    {/* Pending Approvals */}
                    {projectModifications.length > 0 && (
                        <View style={styles.section}>
                            <View style={styles.sectionHeader}>
                                <Text style={styles.sectionTitle}>Approval Status</Text>
                                <View style={[styles.badge, { backgroundColor: theme.colors.warningLight }]}>
                                    <Text style={[styles.badgeText, { color: theme.colors.warning }]}>
                                        {projectModifications.length}
                                    </Text>
                                </View>
                            </View>

                            {projectModifications.map(renderApprovalStatus)}
                        </View>
                    )}

                    <View style={{ height: 40 }} />
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

ManageProjectInvestorsScreen.propTypes = {
    navigation: PropTypes.shape({
        goBack: PropTypes.func.isRequired,
    }).isRequired,
    route: PropTypes.shape({
        params: PropTypes.shape({
            projectId: PropTypes.string,
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
        ...theme.typography.body,
        color: theme.colors.textSecondary,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: theme.colors.surface,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
    },
    backButton: {
        padding: 4,
    },
    headerCenter: {
        flex: 1,
        marginLeft: 12,
    },
    headerTitle: {
        ...theme.typography.h4,
        color: theme.colors.textPrimary,
    },
    headerSubtitle: {
        ...theme.typography.caption,
        color: theme.colors.textSecondary,
    },
    adminBadgeHeader: {
        width: 36,
        height: 36,
        borderRadius: 10,
        backgroundColor: theme.colors.warningLight,
        alignItems: 'center',
        justifyContent: 'center',
    },
    content: {
        flex: 1,
    },
    statsContainer: {
        flexDirection: 'row',
        paddingHorizontal: 16,
        paddingTop: 16,
        gap: 12,
    },
    statCard: {
        flex: 1,
        backgroundColor: theme.colors.surface,
        padding: 16,
        borderRadius: 16,
        alignItems: 'center',
        ...theme.shadows.soft,
    },
    statValue: {
        ...theme.typography.bodyMedium,
        color: theme.colors.textPrimary,
        marginTop: 8,
    },
    statLabel: {
        ...theme.typography.caption,
        color: theme.colors.textSecondary,
        marginTop: 4,
    },
    // Privacy Card
    privacyCard: {
        flexDirection: 'row',
        backgroundColor: theme.colors.surface,
        marginHorizontal: 16,
        marginTop: 16,
        padding: 16,
        borderRadius: 16,
        alignItems: 'center',
        ...theme.shadows.soft,
    },
    privacyIcon: {
        width: 48,
        height: 48,
        borderRadius: 14,
        backgroundColor: theme.colors.surfaceAlt,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 14,
    },
    privacyContent: {
        flex: 1,
    },
    privacyTitle: {
        ...theme.typography.bodyMedium,
        color: theme.colors.textPrimary,
        marginBottom: 2,
    },
    privacyDescription: {
        ...theme.typography.caption,
        color: theme.colors.textSecondary,
    },
    privacyInfoBanner: {
        flexDirection: 'row',
        backgroundColor: theme.colors.primaryLight,
        marginHorizontal: 16,
        marginTop: 8,
        padding: 12,
        borderRadius: 12,
        gap: 10,
    },
    privacyInfoText: {
        flex: 1,
        ...theme.typography.caption,
        color: theme.colors.textSecondary,
        lineHeight: 18,
    },
    privilegeCard: {
        flexDirection: 'row',
        backgroundColor: theme.colors.primaryLight,
        marginHorizontal: 16,
        marginTop: 16,
        padding: 16,
        borderRadius: 16,
        alignItems: 'center',
    },
    privilegeIcon: {
        width: 48,
        height: 48,
        borderRadius: 14,
        backgroundColor: theme.colors.surface,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 14,
    },
    privilegeContent: {
        flex: 1,
    },
    privilegeTitle: {
        ...theme.typography.bodyMedium,
        color: theme.colors.primary,
        marginBottom: 4,
    },
    privilegeDescription: {
        ...theme.typography.caption,
        color: theme.colors.textSecondary,
        lineHeight: 18,
    },
    section: {
        backgroundColor: theme.colors.surface,
        marginTop: 16,
        marginHorizontal: 16,
        borderRadius: 16,
        padding: 20,
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 16,
    },
    sectionTitle: {
        ...theme.typography.h4,
        color: theme.colors.textPrimary,
    },
    badge: {
        backgroundColor: theme.colors.primaryLight,
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 10,
    },
    badgeText: {
        ...theme.typography.captionBold,
        color: theme.colors.primary,
    },
    toggleBtn: {
        padding: 4,
    },
    // Investor Card
    investorCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: theme.colors.surfaceAlt,
        padding: 14,
        borderRadius: 14,
        marginBottom: 10,
    },
    investorAvatar: {
        width: 44,
        height: 44,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    anonymousAvatar: {
        backgroundColor: theme.colors.border,
    },
    investorInitials: {
        color: 'white',
        fontWeight: '700',
        fontSize: 14,
    },
    investorInfo: {
        flex: 1,
    },
    investorNameRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        flexWrap: 'wrap',
    },
    investorName: {
        ...theme.typography.bodyMedium,
        color: theme.colors.textPrimary,
    },
    anonymousText: {
        color: theme.colors.textSecondary,
        fontStyle: 'italic',
    },
    selfBadge: {
        backgroundColor: theme.colors.successLight,
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 6,
    },
    selfBadgeText: {
        fontSize: 10,
        fontWeight: '600',
        color: theme.colors.success,
    },
    creatorBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: theme.colors.warningLight,
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 6,
        gap: 3,
    },
    creatorBadgeText: {
        fontSize: 10,
        fontWeight: '600',
        color: theme.colors.warning,
    },
    pendingBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FEF3C7',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
        gap: 4,
    },
    pendingBadgeText: {
        fontSize: 11,
        fontWeight: '600',
        color: theme.colors.warning,
    },
    anonymousBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: theme.colors.primaryLight,
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 6,
        gap: 3,
    },
    anonymousBadgeText: {
        fontSize: 10,
        fontWeight: '600',
        color: theme.colors.primary,
    },
    investorEmail: {
        ...theme.typography.caption,
        color: theme.colors.textSecondary,
        marginTop: 2,
    },
    investorStats: {
        alignItems: 'flex-end',
    },
    investorAmount: {
        ...theme.typography.bodyMedium,
        fontWeight: '700',
        color: theme.colors.textPrimary,
    },
    // Role Badge Styles (Active/Passive)
    roleBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 8,
        marginLeft: 6,
        gap: 3,
    },
    roleBadgeText: {
        fontSize: 9,
        fontWeight: '600',
    },

    investorLabel: {
        ...theme.typography.caption,
        color: theme.colors.textSecondary,
    },
    hiddenAmount: {
        alignItems: 'center',
    },
    // Search & Add
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: theme.colors.surfaceAlt,
        borderRadius: 12,
        paddingHorizontal: 14,
        marginBottom: 14,
    },
    searchInput: {
        flex: 1,
        paddingVertical: 12,
        paddingHorizontal: 10,
        ...theme.typography.body,
        color: theme.colors.textPrimary,
    },
    addInvestorCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: theme.colors.surfaceAlt,
        padding: 12,
        borderRadius: 12,
        marginBottom: 10,
    },
    addInvestorAvatar: {
        width: 40,
        height: 40,
        borderRadius: 10,
        backgroundColor: theme.colors.border,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    addInvestorInitials: {
        color: theme.colors.textSecondary,
        fontWeight: '600',
        fontSize: 13,
    },
    addInvestorInfo: {
        flex: 1,
    },
    addInvestorName: {
        ...theme.typography.smallMedium,
        color: theme.colors.textPrimary,
    },
    addInvestorEmail: {
        ...theme.typography.caption,
        color: theme.colors.textSecondary,
    },
    addBtn: {
        width: 32,
        height: 32,
        borderRadius: 8,
        backgroundColor: theme.colors.primary,
        alignItems: 'center',
        justifyContent: 'center',
    },
    emptyState: {
        padding: 20,
        alignItems: 'center',
    },
    emptyText: {
        ...theme.typography.small,
        color: theme.colors.textSecondary,
    },
    addNewBtn: {
        borderRadius: 12,
        overflow: 'hidden',
    },
    addNewGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 14,
        gap: 8,
    },
    addNewText: {
        ...theme.typography.cta,
        color: 'white',
    },
    // Approval Card
    approvalCard: {
        backgroundColor: theme.colors.surfaceAlt,
        padding: 14,
        borderRadius: 12,
        marginBottom: 10,
    },
    approvalHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    approvalTypeIcon: {
        width: 32,
        height: 32,
        borderRadius: 8,
        backgroundColor: theme.colors.warningLight,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 10,
    },
    approvalInfo: {
        flex: 1,
    },
    approvalTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: theme.colors.textPrimary,
        marginBottom: 2,
    },
    approvalStatus: {
        ...theme.typography.caption,
        color: theme.colors.textSecondary,
    },
    approvalProgressBar: {
        height: 4,
        backgroundColor: theme.colors.border,
        borderRadius: 2,
        overflow: 'hidden',
    },
    approvalProgressFill: {
        height: '100%',
        backgroundColor: theme.colors.success,
        borderRadius: 2,
    },
    invitedBadge: {
        backgroundColor: '#E0E7FF',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
    },
    invitedBadgeText: {
        fontSize: 11,
        color: '#5B5CFF',
        fontWeight: '600',
    },
});
