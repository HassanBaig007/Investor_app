import { useState, useEffect, useCallback } from 'react';
import { Alert } from 'react-native';
import { api } from '../services/api';
import NotificationService from '../services/notificationService';

export const useProjectData = (navigation, route) => {
    const projectId = route?.params?.projectId || route?.params?.project?._id || route?.params?.project?.id;
    const [project, setProject] = useState(null);
    const [currentUser, setCurrentUser] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    // Local State
    const [projectMemberIds, setProjectMemberIds] = useState([]);
    const [projectAdminIds, setProjectAdminIds] = useState([]);
    const [pendingSpendings, setPendingSpendings] = useState([]);
    const [approvedSpendings, setApprovedSpendings] = useState([]);
    const [spendingSummary, setSpendingSummary] = useState(null);
    const [allUsers, setAllUsers] = useState([]);

    const getRefId = (value) => {
        if (!value) return null;
        if (typeof value === 'string') return value;
        if (value._id) return String(value._id);
        if (value.id) return String(value.id);
        return null;
    };

    const fetchData = useCallback(async () => {
        if (!projectId) {
            setIsLoading(false);
            Alert.alert('Error', 'Project ID is missing. Please open the project again.');
            return;
        }
        setIsLoading(true);
        try {
            const [projData, userData, spendingsData, summaryData] = await Promise.all([
                api.getProjectById(projectId),
                api.getProfile(),
                api.getSpendings(projectId),
                api.getSpendingSummary(projectId).catch(() => null),
            ]);

            // Fetch all users for member management (admin feature)
            let usersData = [];
            try {
                usersData = await api.getProjectInviteCandidates(projectId);
            } catch (error_) {
                if (error_?.response?.status === 403) {
                    console.log('[useProjectData] User does not have permission to fetch invite candidates (likely passive role).');
                } else {
                    console.warn('[useProjectData] Could not fetch project invite candidates:', error_?.message || 'unknown error');
                }
                const canReadUserDirectory = ['admin', 'project_admin', 'super_admin'].includes(userData?.role);
                if (canReadUserDirectory) {
                    try {
                        usersData = await api.getUsers();
                    } catch (error_) {
                        console.warn('Could not fetch users list:', error_?.message || 'unknown error');
                        usersData = [];
                    }
                }
            }
            setAllUsers(usersData);

            setProject(projData);
            setCurrentUser(userData);

            // Map members from populated investors array + always include creator
            const creatorId = getRefId(projData.createdBy);
            const investorIds = (projData.investors || [])
                .map(inv => getRefId(inv?.user))
                .filter(Boolean);
            const memberIds = [...new Set([creatorId, ...investorIds].filter(Boolean))];
            setProjectMemberIds(memberIds);

            // Map admins (if the backend provides them, otherwise use createdBy)
            setProjectAdminIds([projData.createdBy?._id || projData.createdBy]);

            // Map spendings
            const pending = spendingsData.filter(s => s.status === 'pending');
            const approved = spendingsData.filter(s => s.status === 'approved');
            setPendingSpendings(pending);
            setApprovedSpendings(approved);
            setSpendingSummary(summaryData);

        } catch (err) {
            console.error('Fetch project data failed:', err);
            Alert.alert('Error', 'Failed to load project data. Please try again.');
        } finally {
            setIsLoading(false);
        }
    }, [projectId]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    // Derived State
    // Derived State with null safety
    const creatorId = getRefId(project?.createdBy);
    const currentUserId = getRefId(currentUser);
    const isCreator = creatorId === currentUserId;
    const isSuperAdmin = currentUser?.role === 'super_admin';
    const isPrivilegedRole = ['admin', 'project_admin', 'super_admin'].includes(currentUser?.role);
    const isAdmin = isCreator || projectAdminIds.includes(currentUserId) || isPrivilegedRole;
    const isMember = projectMemberIds.includes(currentUserId);

    // Role Check – derive from investors array (backend has no investorRoles map)
    const userInvestorEntry = (project?.investors || []).find(inv => getRefId(inv?.user) === currentUserId);
    const userRole = userInvestorEntry?.role || 'active';
    const isPassiveViewer = userRole === 'passive';
    // Super admins can view everything but cannot add spendings
    const canAddData = !isSuperAdmin && !isPassiveViewer && (isMember || isAdmin);

    // Members Calculation — derived from API data (project.investors is populated with user name/email)
    const projectMembers = (project?.investors || [])
        .filter(inv => inv?.user?.role !== 'super_admin')
        .map(inv => ({
            id: getRefId(inv?.user),
            name: inv.user?.name || 'Unknown',
            email: inv.user?.email || '',
            role: inv.role || 'active',
            investedAmount: inv.investedAmount || 0,
            privacySettings: inv.privacySettings || {},
        }))
        .filter((member) => member.id)
        .concat(
            creatorId && !(project?.investors || []).some((inv) => getRefId(inv?.user) === creatorId)
                ? [{
                    id: creatorId,
                    name: project?.createdBy?.name || 'Project Creator',
                    email: project?.createdBy?.email || '',
                    role: 'active',
                    investedAmount: 0,
                    privacySettings: {},
                }]
                : []
        )
        .filter((member, index, arr) => arr.findIndex((candidate) => candidate.id === member.id) === index)
        .sort((a, b) => {
            if (a.id === creatorId) return -1;
            if (b.id === creatorId) return 1;
            return 0;
        });

    const availableMembers = allUsers.filter(u => {
        const userId_ = u._id || u.id;
        return !projectMemberIds.includes(userId_) && u?.role !== 'super_admin';
    }).map(u => ({
        id: u._id || u.id,
        name: u.name || 'Unknown',
        email: u.email || '',
    }));

    const creator = projectMembers.find(m => m.id === creatorId) ||
        (project?.createdBy?.name ? { id: creatorId, name: project.createdBy.name, email: project.createdBy.email } : null);

    // Totals Calculation
    const totalApprovedSpent = Number(
        spendingSummary?.approvedSpent
        ?? approvedSpendings.reduce((sum, s) => sum + (s.amount || 0), 0)
    );
    const totalPendingSpent = Number(
        spendingSummary?.pendingSpent
        ?? pendingSpendings.reduce((sum, s) => sum + (s.amount || 0), 0)
    );

    // Handlers
    const handleExitProject = () => {
        if (isCreator) {
            Alert.alert(
                'Cannot Leave',
                'As the project creator, you cannot leave this project. You can transfer ownership or delete the project.',
                [{ text: 'OK' }]
            );
            return;
        }

        Alert.alert(
            'Leave Project',
            `Are you sure you want to leave "${project.name}" ?\n\nYou will no longer have access to project data.`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Leave',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await api.removeInvestor(projectId, currentUser.id || currentUser._id);
                            Alert.alert('Left Project', 'You have left the project successfully.');
                            navigation.goBack();
                        } catch (err) {
                            console.error('Exit project failed:', err);
                            Alert.alert('Error', 'Failed to leave project. Please try again.');
                        }
                    }
                }
            ]
        );
    };

    const handleAddMember = (member, onSuccess) => {
        Alert.alert(
            'Invite Member',
            `Send invitation to ${member.name}?`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Invite as Passive',
                    onPress: () => sendInvitation(member, 'passive', onSuccess)
                },
                {
                    text: 'Invite as Active',
                    onPress: () => sendInvitation(member, 'active', onSuccess)
                }
            ]
        );
    };

    const sendInvitation = async (member, role, onSuccess) => {
        try {
            await api.inviteUserToProject(projectId, member.id || member._id, role);

            NotificationService.sendLocalNotification(
                'Invitation Sent',
                `Invitation sent to ${member.name}`,
                { type: 'invitation', projectId: projectId }
            );

            Alert.alert('✅ Invitation Sent', `An invitation has been sent to ${member.name} as a ${role} member.`);
            // Refresh data to reflect the change
            await fetchData();
            if (onSuccess) onSuccess();
        } catch (err) {
            console.error('Add member failed:', err);
            Alert.alert('Error', err.friendlyMessage || 'Failed to add member. Please try again.');
        }
    };

    const handleRemoveMember = (member, onSuccess) => {
        const membCreatorId = project?.createdBy?._id || project?.createdBy;
        if (member.id === membCreatorId) {
            Alert.alert('Cannot Remove', 'The project creator cannot be removed');
            return;
        }

        Alert.alert(
            'Remove Member',
            `Remove ${member.name} from "${project.name}" ? `,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Remove',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await api.removeInvestor(projectId, member.id || member._id);
                            NotificationService.notifyMemberRemoved(member.name, project.name);
                            Alert.alert('Removed', `${member.name} has been removed`);
                            // Refresh data to reflect the change
                            await fetchData();
                            if (onSuccess) onSuccess();
                        } catch (err) {
                            console.error('Remove member failed:', err);
                            Alert.alert('Error', err.friendlyMessage || 'Failed to remove member. Please try again.');
                        }
                    }
                }
            ]
        );
    };

    const handleToggleMemberStatus = (member, onSuccess) => {
        const currentRole = member.role || 'active';
        const newRole = currentRole === 'active' ? 'passive' : 'active';

        Alert.alert(
            `Make ${newRole === 'active' ? 'Active' : 'Passive'}?`,
            `Change ${member.name}'s status to ${newRole === 'active' ? 'Active (Full Access)' : 'Passive (View Only)'}?`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Confirm',
                    onPress: async () => {
                        try {
                            await api.updateMemberRole(projectId, member.id || member._id, newRole);
                            Alert.alert('Success', `Updated ${member.name}'s role to ${newRole}`);
                            await fetchData();
                            if (onSuccess) onSuccess();
                        } catch (err) {
                            console.error('Toggle member status failed:', err);
                            Alert.alert('Error', err.friendlyMessage || 'Failed to update member role.');
                        }
                    }
                }
            ]
        );
    };

    return {
        project,
        currentUser,
        projectMemberIds,
        setProjectMemberIds,
        projectAdminIds,
        setProjectAdminIds,
        pendingSpendings,
        setPendingSpendings,
        approvedSpendings,
        setApprovedSpendings,
        isLoading,
        onRefresh: fetchData,
        isCreator,
        isAdmin,
        isMember,
        userRole,
        isPassiveViewer,
        canAddData,
        projectMembers,
        availableMembers,
        creator,
        totalApprovedSpent,
        totalPendingSpent,
        handleExitProject,
        handleAddMember,
        handleRemoveMember,
        handleToggleMemberStatus
    };
};
