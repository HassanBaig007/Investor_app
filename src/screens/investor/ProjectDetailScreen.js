import React, { useState, useRef, useEffect } from 'react';
import PropTypes from 'prop-types';
import {
    View,
    Text,
    ScrollView,
    StyleSheet,
    TouchableOpacity,
    TouchableWithoutFeedback,
    Alert,
    TextInput,
    Modal,
    Dimensions,
    KeyboardAvoidingView,
    Platform,
    Keyboard,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { theme, formatCurrency } from '../../components/Theme';
import { projects, investors, getCurrentUser, userAccounts, addProjectSpending } from '../../data/mockData';
import NotificationService from '../../services/notificationService';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

/**
 * ProjectDetailScreen - Comprehensive Project View
 * 
 * Features:
 * - Project overview with stats
 * - Add spending form (with date picker, category-specific fields)
 * - Member management
 * - Spending history with filter
 * - Exit project button
 * - Pending/Approved spending sections
 */
export default function ProjectDetailScreen({ navigation, route }) {
    const projectId = route?.params?.projectId || 'PRJ002';
    const focusOnAdd = route?.params?.focusOnAdd || false;
    const project = projects.find(p => p.id === projectId);

    // Ref for scrolling
    const scrollViewRef = useRef(null);

    // Dynamic current user
    const currentUser = getCurrentUser();

    // Get navigation parameters
    const viewMode = route?.params?.viewMode || null;

    // State for spending form
    const [spendingAmount, setSpendingAmount] = useState('');
    const [spendingDescription, setSpendingDescription] = useState('');
    const [spendingCategory, setSpendingCategory] = useState('');

    // NEW: Date selection state (default to current date)
    const [spendingDate, setSpendingDate] = useState(new Date().toISOString().split('T')[0]);
    const [showDatePicker, setShowDatePicker] = useState(false);

    // NEW: Service-specific fields (person & place)
    const [paidToPerson, setPaidToPerson] = useState('');
    const [paidToPlace, setPaidToPlace] = useState('');

    // NEW: Product-specific fields (material type)
    const [materialType, setMaterialType] = useState('');
    const materialTypes = ['Electronics', 'Construction', 'Office Supplies', 'Equipment', 'Raw Materials', 'Other'];

    // NEW: Ledger & Subledger State
    // NEW: Ledger & Subledger State
    const [ledgers, setLedgers] = useState(project?.ledgers || []);
    const [selectedLedgerId, setSelectedLedgerId] = useState('');
    const [selectedSubLedger, setSelectedSubLedger] = useState('');

    // UI States for Selection Modals
    const [showLedgerSelectModal, setShowLedgerSelectModal] = useState(false);
    const [showSubLedgerSelectModal, setShowSubLedgerSelectModal] = useState(false);

    // UI States for Management (Admin)
    const [searchLedgerQuery, setSearchLedgerQuery] = useState('');
    const [newLedgerName, setNewLedgerName] = useState('');
    const [newSubLedgerName, setNewSubLedgerName] = useState('');
    const [editMode, setEditMode] = useState(false); // Toggle inside modals to show delete/add options

    // Get currently selected ledger object
    const selectedLedgerObj = ledgers.find(l => l.id === selectedLedgerId);

    // Function to format amount with commas (Indian Format)
    const formatAmount = (value) => {
        if (!value) return '';
        // Remove existing commas and non-numeric chars
        const clean = value.replace(/[^0-9.]/g, '');
        const parts = clean.split('.');
        // Format integer part
        let integerPart = parts[0];
        if (integerPart.length > 3) {
            const lastThree = integerPart.substring(integerPart.length - 3);
            const otherNumbers = integerPart.substring(0, integerPart.length - 3);
            integerPart = otherNumbers.replace(/\B(?=(\d{2})+(?!\d))/g, ",") + "," + lastThree;
        }
        return parts.length > 1 ? integerPart + '.' + parts[1] : integerPart;
    };


    // State for modals
    const [showAddMemberModal, setShowAddMemberModal] = useState(false);
    const [showMemberOptions, setShowMemberOptions] = useState(null);
    const [showSpendingDetail, setShowSpendingDetail] = useState(null);
    const [showPendingApprovals, setShowPendingApprovals] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    // NEW: Filter by investor
    const [spendingFilter, setSpendingFilter] = useState('all');

    // NEW: Show investor investments modal
    const [showInvestorBreakdown, setShowInvestorBreakdown] = useState(viewMode === 'details');

    // Auto-expand based on navigation parameters (NO auto-scroll)
    useEffect(() => {
        if (viewMode === 'details') {
            // Auto-expand investor breakdown for View Details mode
            setShowInvestorBreakdown(true);
        }
        // Note: focusOnAdd just shows the form - no scrolling needed, page starts at top
    }, [viewMode]);

    // Instant feedback states
    const [actionFeedback, setActionFeedback] = useState(null);
    const [rejectedSpendings, setRejectedSpendings] = useState([]);

    // State for project members
    const [projectMemberIds, setProjectMemberIds] = useState(project?.projectInvestors || []);
    const [projectAdminIds, setProjectAdminIds] = useState(project?.projectAdmins || []);

    // Spending with approval system
    const [pendingSpendings, setPendingSpendings] = useState(project?.pendingSpendings || []);
    const [approvedSpendings, setApprovedSpendings] = useState(project?.spendings || []);

    // Only 2 categories: Service & Product
    const categories = [
        { id: 'Service', icon: 'account-hard-hat', color: '#6366F1' },
        { id: 'Product', icon: 'package-variant', color: '#10B981' },
    ];

    if (!project) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.errorContainer}>
                    <MaterialCommunityIcons name="alert-circle-outline" size={64} color={theme.colors.textTertiary} />
                    <Text style={styles.errorText}>Project not found</Text>
                    <TouchableOpacity style={styles.errorButton} onPress={() => navigation.goBack()}>
                        <Text style={styles.errorButtonText}>Go Back</Text>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        );
    }

    // Permission checks
    const isCreator = project.createdBy === currentUser.id;
    const isAdmin = isCreator || projectAdminIds.includes(currentUser.id);
    const isMember = projectMemberIds.includes(currentUser.id);
    const canAddSpending = isMember || isAdmin;

    // Get project members sorted
    const projectMembers = investors
        .filter(i => projectMemberIds.includes(i.id))
        .sort((a, b) => {
            if (a.id === project.createdBy) return -1;
            if (b.id === project.createdBy) return 1;
            return 0;
        });
    const availableMembers = investors.filter(i => !projectMemberIds.includes(i.id));

    // Get creator info
    // Get creator info
    const creator = userAccounts[project.createdBy] || investors.find(i => i.id === project.createdBy);

    // Role-based access control
    // 'passive' = View Only (can see everything but cannot add expenses or perform actions)
    // 'active' = Full Access (can add expenses, approve, reject, etc.)
    const userRole = project.investorRoles?.[currentUser.id] || 'active'; // Default to active
    const isPassiveViewer = userRole === 'passive';
    const canAddData = !isPassiveViewer && (isMember || isAdmin);

    // Calculate totals
    const totalApprovedSpent = approvedSpendings.reduce((sum, s) => sum + (s.amount || 0), 0);
    const totalPendingSpent = pendingSpendings.reduce((sum, s) => sum + (s.amount || 0), 0);

    // Handle exit from project
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
                    onPress: () => {
                        // Remove current user from project
                        setProjectMemberIds(prev => prev.filter(id => id !== currentUser.id));
                        const index = project.projectInvestors.indexOf(currentUser.id);
                        if (index > -1) {
                            project.projectInvestors.splice(index, 1);
                        }
                        Alert.alert('Left Project', 'You have left the project successfully.');
                        navigation.goBack();
                    }
                }
            ]
        );
    };

    // Add spending - goes to pending first
    const handleAddSpending = () => {
        const cleanedAmount = spendingAmount.replace(/[^0-9.]/g, '');
        const parsedAmount = parseFloat(cleanedAmount);

        if (!cleanedAmount || isNaN(parsedAmount) || parsedAmount <= 0) {
            Alert.alert('Invalid Amount', 'Please enter a valid amount greater than 0');
            return;
        }
        if (!spendingDescription.trim()) {
            Alert.alert('Missing Description', 'Please add a description for this spending');
            return;
        }
        if (!spendingCategory) {
            Alert.alert('Select Category', 'Please select Service or Product');
            return;
        }

        // Validate category-specific fields
        if (spendingCategory === 'Service' && (!paidToPerson.trim() || !paidToPlace.trim())) {
            Alert.alert('Missing Details', 'Please enter the person name and place for this service');
            return;
        }
        if (spendingCategory === 'Product' && !materialType) {
            Alert.alert('Missing Details', 'Please select the material type for this product');
            return;
        }

        // Create spending with approval tracking and new fields
        const newSpending = {
            id: Date.now().toString(),
            amount: parsedAmount,
            description: spendingDescription.trim(),
            category: spendingCategory,
            date: spendingDate,
            time: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }),
            addedBy: currentUser.id,
            status: 'pending',
            // NEW: Category-specific details
            paidTo: spendingCategory === 'Service' ? {
                person: paidToPerson.trim(),
                place: paidToPlace.trim(),
            } : null,
            materialType: spendingCategory === 'Product' ? materialType : null,
            ledgerId: selectedLedgerId,
            subLedger: selectedSubLedger,
            approvals: {
                [currentUser.id]: { status: 'approved', at: new Date().toISOString() }
            },
            rejections: {},
            totalMembers: projectMemberIds.length,
        };

        // Check if all other members have approved (if only 1 member, auto-approve)
        if (projectMemberIds.length <= 1) {
            const approvedSpending = { ...newSpending, status: 'approved' };
            setApprovedSpendings([approvedSpending, ...approvedSpendings]);

            // ✅ AUTO-SYNC: Add to central expense tracker immediately
            addProjectSpending(approvedSpending, {
                id: project.id,
                name: project.name,
            });

            NotificationService.notifySpendingAdded(parsedAmount, spendingCategory, project.name);
            Alert.alert('Success', `₹${parsedAmount.toLocaleString()} added to spendings & expense history!`);
        } else {
            setPendingSpendings([newSpending, ...pendingSpendings]);
            NotificationService.sendLocalNotification(
                '📋 New Spending Approval',
                `${currentUser.name} added ₹${parsedAmount.toLocaleString()} - needs approval`,
                { type: 'spending_approval', projectId: project.id }
            );
            Alert.alert(
                'Pending Approval',
                `Spending of ₹${parsedAmount.toLocaleString()} has been submitted for approval from all project members.`
            );
        }

        // Reset all form fields
        setSpendingAmount('');
        setSpendingDescription('');
        setSpendingCategory('');
        setSpendingDate(new Date().toISOString().split('T')[0]);
        setPaidToPerson('');
        setPaidToPlace('');
        setPaidToPlace('');
        setMaterialType('');
        setSelectedLedgerId('');
        setSelectedSubLedger('');
    };

    // Show instant feedback
    const showFeedback = (type, message) => {
        setActionFeedback({ type, message });
        setTimeout(() => setActionFeedback(null), 3000);
    };

    // Approve a pending spending with instant feedback
    const handleApproveSpending = (spending) => {
        const updatedApprovals = {
            ...spending.approvals,
            [currentUser.id]: { status: 'approved', at: new Date().toISOString(), name: currentUser.name }
        };

        const approvedCount = Object.values(updatedApprovals).filter(a => a.status === 'approved').length;
        const allApproved = approvedCount >= projectMemberIds.length;

        // Instant UI update
        const updatedPending = pendingSpendings.map(s =>
            s.id === spending.id ? { ...s, approvals: updatedApprovals } : s
        );
        setPendingSpendings(updatedPending);

        // Show instant feedback
        showFeedback('approve', `✓ You approved this spending`);

        if (allApproved) {
            // Move to approved spendings after a short delay for visual effect
            setTimeout(() => {
                const approvedSpending = { ...spending, status: 'approved', approvals: updatedApprovals };
                setApprovedSpendings([approvedSpending, ...approvedSpendings]);
                setPendingSpendings(prev => prev.filter(s => s.id !== spending.id));

                // ✅ AUTO-SYNC: Add to central expense tracker for all project members
                addProjectSpending(approvedSpending, {
                    id: project.id,
                    name: project.name,
                });

                showFeedback('success', `🎉 Spending approved & added to expense history!`);
                NotificationService.notifySpendingAdded(spending.amount, spending.category, project.name);
            }, 500);
        }
    };

    // Reject a pending spending with instant feedback
    const handleRejectSpending = (spending) => {
        Alert.alert(
            'Reject Spending',
            'Are you sure you want to reject this spending?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Reject',
                    style: 'destructive',
                    onPress: () => {
                        const rejectedSpending = {
                            ...spending,
                            status: 'rejected',
                            rejectedBy: currentUser.id,
                            rejectedAt: new Date().toISOString(),
                            rejectorName: currentUser.name
                        };

                        // Instant UI update - move to rejected list
                        setPendingSpendings(pendingSpendings.filter(s => s.id !== spending.id));
                        setRejectedSpendings([rejectedSpending, ...rejectedSpendings]);

                        // Show instant feedback
                        showFeedback('reject', `✗ Spending rejected`);

                        NotificationService.sendLocalNotification(
                            '❌ Spending Rejected',
                            `${currentUser.name} rejected a spending of ₹${spending.amount.toLocaleString()} `,
                            { type: 'spending_rejected', projectId: project.id }
                        );
                    }
                }
            ]
        );
    };

    // Invite member to project
    const handleAddMember = (member) => {
        // Check if already invited
        if (project.pendingInvitations && project.pendingInvitations.some(inv => inv.userId === member.id)) {
            Alert.alert('Already Invited', `${member.name} has already been invited.`);
            return;
        }

        Alert.alert(
            'Invite Member',
            `Send start invitation to ${member.name}?`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Invite as Passive',
                    onPress: () => sendInvitation(member, 'passive')
                },
                {
                    text: 'Invite as Active',
                    onPress: () => sendInvitation(member, 'active')
                }
            ]
        );
    };

    const sendInvitation = (member, role) => {
        if (!project.pendingInvitations) {
            project.pendingInvitations = [];
        }

        project.pendingInvitations.push({
            id: `INV${Date.now()}`,
            userId: member.id,
            role: role,
            invitedBy: currentUser.id,
            invitedAt: new Date().toISOString(),
        });

        // Trigger update
        setProjectMemberIds([...project.projectInvestors]); // Just to force re-render if needed, but really just cleaning up state

        NotificationService.sendLocalNotification(
            'Invitation Sent',
            `Invitation sent to ${member.name}`,
            { type: 'invitation', projectId: project.id }
        );

        Alert.alert('✅ Invitation Sent', `Invitation sent to ${member.name} to join as ${role}.`);
        setShowAddMemberModal(false);
        setSearchQuery('');
    };

    // Remove member from project
    const handleRemoveMember = (member) => {
        if (member.id === project.createdBy) {
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
                    onPress: () => {
                        setProjectMemberIds(prev => prev.filter(id => id !== member.id));
                        setProjectAdminIds(prev => prev.filter(id => id !== member.id));
                        const index = project.projectInvestors.indexOf(member.id);
                        if (index > -1) project.projectInvestors.splice(index, 1);
                        NotificationService.notifyMemberRemoved(member.name, project.name);
                        Alert.alert('Removed', `${member.name} has been removed`);
                        setShowMemberOptions(null);
                    }
                }
            ]
        );
    };

    // Toggle Member Status (Active/Passive)
    const handleToggleMemberStatus = (member) => {
        const currentRole = project.investorRoles?.[member.id] || 'active';
        const newRole = currentRole === 'active' ? 'passive' : 'active';

        Alert.alert(
            `Make ${newRole === 'active' ? 'Active' : 'Passive'}?`,
            `Change ${member.name}'s status to ${newRole === 'active' ? 'Active (Full Access)' : 'Passive (View Only)'}?`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Confirm',
                    onPress: () => {
                        // In a real app, this would be an API call
                        if (!project.investorRoles) project.investorRoles = {};
                        project.investorRoles[member.id] = newRole;

                        // Force update local state if needed (or just modal state to refresh)
                        setShowMemberOptions(null);
                        Alert.alert('Success', `Updated ${member.name}'s role to ${newRole}`);

                        // Trigger a re-render by updating dummy state or similar if needed, 
                        // but setting showMemberOptions(null) usually triggers re-render of parent/modal
                        setProjectMemberIds([...projectMemberIds]); // Hack to force re-render
                    }
                }
            ]
        );
    };

    // --- LEDGER MANAGEMENT FUNCTIONS ---

    const handleAddLedger = () => {
        if (!newLedgerName.trim()) return;

        // Removed limit check as requested

        const newLedger = { id: Date.now().toString(), name: newLedgerName.trim(), subLedgers: [] };
        const updatedLedgers = [...ledgers, newLedger];
        setLedgers(updatedLedgers);
        project.ledgers = updatedLedgers;
        setNewLedgerName('');
        Alert.alert('Success', 'Ledger added successfully!');
    };

    const handleDeleteLedger = (id) => {
        Alert.alert('Delete Ledger', 'Are you sure?', [
            { text: 'Cancel' },
            {
                text: 'Delete',
                style: 'destructive',
                onPress: () => {
                    const updatedLedgers = ledgers.filter(l => l.id !== id);
                    setLedgers(updatedLedgers);
                    project.ledgers = updatedLedgers;
                    if (selectedLedgerId === id) {
                        setSelectedLedgerId('');
                        setSelectedSubLedger('');
                    }
                }
            }
        ]);
    };

    const handleAddSubLedger = () => {
        if (!selectedLedgerId || !newSubLedgerName.trim()) return;

        const updatedLedgers = ledgers.map(l => {
            if (l.id === selectedLedgerId) {
                // Check dupes
                if (l.subLedgers && l.subLedgers.includes(newSubLedgerName.trim())) {
                    Alert.alert('Exists', 'This sub-ledger already exists.');
                    return l;
                }
                const newSubs = l.subLedgers ? [...l.subLedgers, newSubLedgerName.trim()] : [newSubLedgerName.trim()];
                return { ...l, subLedgers: newSubs };
            }
            return l;
        });

        setLedgers(updatedLedgers);
        project.ledgers = updatedLedgers;
        setNewSubLedgerName('');
        Alert.alert('Success', 'Sub-Ledger added successfully!');
    };

    const handleDeleteSubLedger = (subName) => {
        Alert.alert('Delete Sub-Ledger', `Are you sure you want to delete "${subName}"?`, [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Delete',
                style: 'destructive',
                onPress: () => {
                    const updatedLedgers = ledgers.map(l => {
                        if (l.id === selectedLedgerId) {
                            return { ...l, subLedgers: l.subLedgers.filter(s => s !== subName) };
                        }
                        return l;
                    });
                    setLedgers(updatedLedgers);
                    project.ledgers = updatedLedgers;
                    if (selectedSubLedger === subName) setSelectedSubLedger('');
                    Alert.alert('Success', 'Sub-Ledger deleted successfully');
                }
            }
        ]);
    };

    // State for Note Modal
    const [showNoteModal, setShowNoteModal] = useState(false);
    const [currentNoteSpending, setCurrentNoteSpending] = useState(null);
    const [noteContent, setNoteContent] = useState('');

    // Handle opening note modal
    const handleOpenNote = (spending, e) => {
        e.stopPropagation();
        setCurrentNoteSpending(spending);
        setNoteContent(spending.note || '');
        setShowNoteModal(true);
    };

    // Save note
    const handleSaveNote = () => {
        if (currentNoteSpending) {
            const updated = approvedSpendings.map(s =>
                s.id === currentNoteSpending.id ? { ...s, note: noteContent } : s
            );
            setApprovedSpendings(updated);
            Alert.alert('Success', 'Note attached successfully');
            setShowNoteModal(false);
        }
    };

    // Render spending item (clickable for details)
    const renderSpendingItem = (spending) => {
        const addedByUser = userAccounts[spending.addedBy];
        return (
            <TouchableOpacity
                key={spending.id}
                style={styles.spendingItem}
                onPress={() => setShowSpendingDetail(spending)}
                activeOpacity={0.7}
            >
                <View style={[styles.spendingIcon, { backgroundColor: spending.category === 'Service' ? '#EEF2FF' : '#D1FAE5' }]}>
                    <MaterialCommunityIcons
                        name={spending.category === 'Service' ? 'account-hard-hat' : 'package-variant'}
                        size={22}
                        color={spending.category === 'Service' ? '#6366F1' : '#10B981'}
                    />
                </View>
                <View style={styles.spendingContent}>
                    <Text style={styles.spendingDescription} numberOfLines={1}>{spending.description}</Text>
                    <Text style={styles.spendingMeta}>
                        {ledgers.find(l => l.id === spending.ledgerId)?.name || userAccounts[spending.addedBy]?.name || spending.category} • {spending.date}
                    </Text>
                </View>

                {/* Note Button */}
                <TouchableOpacity
                    style={[styles.noteButton, spending.note && styles.noteButtonActive]}
                    onPress={(e) => handleOpenNote(spending, e)}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                    <MaterialCommunityIcons
                        name={spending.note ? "note-text" : "note-plus-outline"}
                        size={20}
                        color={spending.note ? theme.colors.primary : theme.colors.textTertiary}
                    />
                </TouchableOpacity>

                <View style={styles.spendingRight}>
                    <Text style={styles.spendingAmount}>₹{spending.amount.toLocaleString()}</Text>
                    <MaterialCommunityIcons name="chevron-right" size={16} color={theme.colors.textTertiary} />
                </View>
            </TouchableOpacity>
        );
    };

    // Render pending spending item - Fixed layout
    const renderPendingSpendingItem = (spending) => {
        const addedByUser = userAccounts[spending.addedBy];
        const myApproval = spending.approvals?.[currentUser.id];
        const approvedCount = Object.values(spending.approvals || {}).filter(a => a.status === 'approved').length;
        const isMySpending = spending.addedBy === currentUser.id;

        // Get list of who approved
        const approvedByNames = Object.entries(spending.approvals || {})
            .filter(([_, a]) => a.status === 'approved')
            .map(([userId]) => userAccounts[userId]?.name || 'Unknown');

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
                        <Text style={styles.pendingMetaText}>{addedByUser?.name || 'Unknown'}</Text>
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
                        <Text style={styles.approvalProgressCount}>{approvedCount} of {projectMemberIds.length}</Text>
                    </View>
                    <View style={styles.approvalProgressBar}>
                        <View style={[styles.approvalProgressFill, { width: `${(approvedCount / projectMemberIds.length) * 100}% ` }]} />
                    </View>
                    {approvedByNames.length > 0 && (
                        <Text style={styles.approvedByText}>Approved by: {approvedByNames.join(', ')}</Text>
                    )}
                </View>

                {/* Action Buttons */}
                {!myApproval && !isMySpending && (
                    <View style={styles.pendingActionButtons}>
                        <TouchableOpacity
                            style={styles.rejectActionBtn}
                            onPress={() => handleRejectSpending(spending)}
                        >
                            <MaterialCommunityIcons name="close-circle" size={20} color="#EF4444" />
                            <Text style={styles.rejectActionText}>Reject</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.approveActionBtn}
                            onPress={() => handleApproveSpending(spending)}
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
            </View>
        );
    };

    // Render rejected spending item
    const renderRejectedSpendingItem = (spending) => {
        const addedByUser = userAccounts[spending.addedBy];
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
        <SafeAreaView style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <MaterialCommunityIcons name="arrow-left" size={24} color={theme.colors.textPrimary} />
                </TouchableOpacity>
                <View style={styles.headerCenter}>
                    <Text style={styles.headerTitle} numberOfLines={1}>{project.name}</Text>
                    <Text style={styles.headerSubtitle}>
                        {projectMembers.length} members • {creator?.name || 'Unknown'}
                    </Text>
                </View>
                <TouchableOpacity onPress={handleExitProject} style={styles.exitButtonWithText}>
                    <View style={styles.exitIconContainer}>
                        <MaterialCommunityIcons name="exit-run" size={20} color="#EF4444" />
                    </View>
                    <Text style={styles.exitButtonLabel}>Exit</Text>
                </TouchableOpacity>
            </View>

            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                style={{ flex: 1 }}
            >
                <ScrollView
                    ref={scrollViewRef}
                    showsVerticalScrollIndicator={false}
                    style={styles.content}
                >
                    {/* =================== PENDING APPROVALS ALERT =================== */}
                    {pendingSpendings.length > 0 && (
                        <TouchableOpacity
                            style={styles.pendingAlert}
                            onPress={() => setShowPendingApprovals(true)}
                        >
                            <View style={styles.pendingAlertIcon}>
                                <MaterialCommunityIcons name="clock-alert-outline" size={24} color="#F59E0B" />
                            </View>
                            <View style={styles.pendingAlertContent}>
                                <Text style={styles.pendingAlertTitle}>
                                    {pendingSpendings.length} pending approval{pendingSpendings.length > 1 ? 's' : ''}
                                </Text>
                                <Text style={styles.pendingAlertSubtitle}>Tap to review and vote</Text>
                            </View>
                            <View style={styles.pendingAlertBadge}>
                                <Text style={styles.pendingAlertBadgeText}>₹{totalPendingSpent.toLocaleString()}</Text>
                            </View>
                        </TouchableOpacity>
                    )}

                    {/* =================== VIEW ONLY BANNER FOR PASSIVE MEMBERS =================== */}
                    {viewMode !== 'details' && isPassiveViewer && (
                        <View style={styles.viewOnlyBanner}>
                            <View style={styles.viewOnlyIconContainer}>
                                <MaterialCommunityIcons name="eye" size={24} color="#6B7280" />
                            </View>
                            <View style={styles.viewOnlyContent}>
                                <Text style={styles.viewOnlyTitle}>👁️ View Only Access</Text>
                                <Text style={styles.viewOnlySubtitle}>
                                    You are a passive member. You can view all project details and expenses, but you cannot add or modify anything.
                                </Text>
                            </View>
                        </View>
                    )}

                    {/* =================== ADD SPENDING FORM - ACCOUNT BOOK STYLE =================== */}
                    {/* Only show for Active members who can add data */}
                    {viewMode !== 'details' && canAddData && (
                        <View style={styles.spendingFormCard}>
                            {/* Account Book Header */}
                            <View style={styles.accountBookHeader}>
                                <View style={styles.accountBookHeaderLeft}>
                                    <View style={styles.ledgerIcon}>
                                        <MaterialCommunityIcons name="book-open-page-variant" size={24} color="#6366F1" />
                                    </View>
                                    <View>
                                        <Text style={styles.formTitle}>Add Spending</Text>
                                        <Text style={styles.formSubtitle}>Record a new expense</Text>
                                    </View>
                                </View>
                                <View style={styles.entryNumberBadge}>
                                    <Text style={styles.entryNumberText}>#{(approvedSpendings.length + pendingSpendings.length + 1).toString().padStart(4, '0')}</Text>
                                </View>
                            </View>

                            {/* Ledger Line Separator */}
                            <View style={styles.ledgerLine} />

                            {/* Date Selection - Account Book Style */}
                            <View style={styles.dateSection}>
                                <Text style={styles.fieldLabel}>📅 Date</Text>
                                <TouchableOpacity
                                    style={styles.datePickerButton}
                                    onPress={() => setShowDatePicker(!showDatePicker)}
                                >
                                    <MaterialCommunityIcons name="calendar" size={20} color="#6366F1" />
                                    <Text style={styles.datePickerText}>
                                        {new Date(spendingDate).toLocaleDateString('en-IN', {
                                            weekday: 'short',
                                            day: 'numeric',
                                            month: 'short',
                                            year: 'numeric'
                                        })}
                                    </Text>
                                    <MaterialCommunityIcons name="chevron-down" size={18} color={theme.colors.textSecondary} />
                                </TouchableOpacity>

                                {/* 7-Day Scrollable Calendar */}
                                {showDatePicker && (
                                    <ScrollView
                                        horizontal
                                        showsHorizontalScrollIndicator={false}
                                        contentContainerStyle={styles.calendarScrollContainer}
                                        style={styles.calendarScroll}
                                    >
                                        {Array.from({ length: 7 }, (_, idx) => {
                                            const date = new Date();
                                            date.setDate(date.getDate() - idx);
                                            const dateStr = date.toISOString().split('T')[0];
                                            const isSelected = spendingDate === dateStr;
                                            const dayName = idx === 0 ? 'Today' : idx === 1 ? 'Yesterday' : date.toLocaleDateString('en-IN', { weekday: 'short' });
                                            const dayNum = date.getDate();
                                            const monthName = date.toLocaleDateString('en-IN', { month: 'short' });
                                            return (
                                                <TouchableOpacity
                                                    key={dateStr}
                                                    style={[styles.calendarDay, isSelected && styles.calendarDaySelected]}
                                                    onPress={() => {
                                                        setSpendingDate(dateStr);
                                                        setShowDatePicker(false);
                                                    }}
                                                >
                                                    <Text style={[styles.calendarDayName, isSelected && styles.calendarDayNameSelected]}>
                                                        {dayName}
                                                    </Text>
                                                    <Text style={[styles.calendarDayNum, isSelected && styles.calendarDayNumSelected]}>
                                                        {dayNum}
                                                    </Text>
                                                    <Text style={[styles.calendarMonth, isSelected && styles.calendarMonthSelected]}>
                                                        {monthName}
                                                    </Text>
                                                </TouchableOpacity>
                                            );
                                        })}
                                    </ScrollView>
                                )}
                            </View>

                            {/* Ledger & Subledger Section - Scrollable */}
                            {/* Ledger & Subledger Section - Revamped */}
                            <View style={styles.ledgerSection}>
                                <View style={{ flexDirection: 'row', gap: 12 }}>
                                    {/* LEDGER SELECTOR */}
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.fieldLabel}>📚 Ledger</Text>
                                        <TouchableOpacity
                                            style={styles.dropdownButton}
                                            onPress={() => {
                                                setEditMode(false);
                                                setShowLedgerSelectModal(true);
                                            }}
                                        >
                                            <Text style={[
                                                styles.dropdownButtonText,
                                                !selectedLedgerId && styles.placeholderText
                                            ]} numberOfLines={1}>
                                                {selectedLedgerObj?.name || 'Select Ledger'}
                                            </Text>
                                            <MaterialCommunityIcons name="chevron-down" size={20} color={theme.colors.textSecondary} />
                                        </TouchableOpacity>
                                    </View>

                                    {/* SUB-LEDGER SELECTOR */}
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.fieldLabel}>👤 Sub-Ledger</Text>
                                        <TouchableOpacity
                                            style={[styles.dropdownButton, !selectedLedgerId && styles.disabledInput]}
                                            onPress={() => {
                                                if (selectedLedgerId) {
                                                    setEditMode(false);
                                                    setShowSubLedgerSelectModal(true);
                                                } else {
                                                    Alert.alert('Select Ledger', 'Please select a main ledger first.');
                                                }
                                            }}
                                            disabled={!selectedLedgerId}
                                        >
                                            <Text style={[
                                                styles.dropdownButtonText,
                                                !selectedSubLedger && styles.placeholderText
                                            ]} numberOfLines={1}>
                                                {selectedSubLedger || 'Select Name'}
                                            </Text>
                                            <MaterialCommunityIcons name="chevron-down" size={20} color={selectedLedgerId ? theme.colors.textSecondary : theme.colors.border} />
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            </View>

                            {/* Amount Input - Ledger Style */}
                            <View style={styles.amountSection}>
                                <Text style={styles.fieldLabel}>💰 Amount</Text>
                                <View style={styles.amountInputContainer}>
                                    <Text style={styles.currencySymbol}>₹</Text>
                                    <TextInput
                                        style={styles.amountInput}
                                        value={spendingAmount}
                                        onChangeText={(text) => setSpendingAmount(formatAmount(text))}
                                        placeholder="0.00"
                                        placeholderTextColor={theme.colors.textTertiary}
                                        keyboardType="decimal-pad"
                                        maxLength={12}
                                        returnKeyType="next"
                                        blurOnSubmit={true}
                                    />
                                </View>
                            </View>

                            {/* Description Input */}
                            <View style={styles.descSection}>
                                <Text style={styles.fieldLabel}>📝 Description</Text>
                                <TextInput
                                    style={styles.descriptionInput}
                                    value={spendingDescription}
                                    onChangeText={setSpendingDescription}
                                    placeholder="What's this spending for?"
                                    placeholderTextColor={theme.colors.textTertiary}
                                    multiline
                                    numberOfLines={3}
                                    returnKeyType="done"
                                    blurOnSubmit={true}
                                    onSubmitEditing={Keyboard.dismiss}
                                />
                            </View>

                            {/* Category Selection */}
                            <Text style={styles.fieldLabel}>🏷️ Category</Text>
                            <View style={styles.categoryRow}>
                                {categories.map(cat => (
                                    <TouchableOpacity
                                        key={cat.id}
                                        style={[
                                            styles.categoryChip,
                                            spendingCategory === cat.id && { backgroundColor: cat.color, borderColor: cat.color }
                                        ]}
                                        onPress={() => {
                                            setSpendingCategory(cat.id);
                                            // Reset category-specific fields when switching
                                            if (cat.id === 'Service') {
                                                setMaterialType('');
                                            } else {
                                                setPaidToPerson('');
                                                setPaidToPlace('');
                                            }
                                        }}
                                    >
                                        <MaterialCommunityIcons
                                            name={cat.icon}
                                            size={22}
                                            color={spendingCategory === cat.id ? 'white' : cat.color}
                                        />
                                        <Text style={[
                                            styles.categoryChipText,
                                            spendingCategory === cat.id && styles.categoryChipTextActive
                                        ]}>
                                            {cat.id}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>

                            {/* ========== SERVICE SPECIFIC FIELDS ========== */}
                            {spendingCategory === 'Service' && (
                                <View style={styles.categorySpecificSection}>
                                    <View style={styles.categorySpecificHeader}>
                                        <MaterialCommunityIcons name="account-hard-hat" size={18} color="#6366F1" />
                                        <Text style={styles.categorySpecificTitle}>Service Details</Text>
                                    </View>

                                    {/* Paid To Person */}
                                    <View style={styles.inputRow}>
                                        <View style={styles.inputHalf}>
                                            <Text style={styles.subFieldLabel}>👤 Paid To (Person)</Text>
                                            <TextInput
                                                style={styles.subFieldInput}
                                                value={paidToPerson}
                                                onChangeText={setPaidToPerson}
                                                placeholder="e.g., John Contractor"
                                                placeholderTextColor={theme.colors.textTertiary}
                                            />
                                        </View>
                                        <View style={styles.inputHalf}>
                                            <Text style={styles.subFieldLabel}>📍 Place</Text>
                                            <TextInput
                                                style={styles.subFieldInput}
                                                value={paidToPlace}
                                                onChangeText={setPaidToPlace}
                                                placeholder="e.g., Site Office"
                                                placeholderTextColor={theme.colors.textTertiary}
                                            />
                                        </View>
                                    </View>
                                </View>
                            )}

                            {/* ========== PRODUCT SPECIFIC FIELDS ========== */}
                            {spendingCategory === 'Product' && (
                                <View style={styles.categorySpecificSection}>
                                    <View style={styles.categorySpecificHeader}>
                                        <MaterialCommunityIcons name="package-variant" size={18} color="#10B981" />
                                        <Text style={[styles.categorySpecificTitle, { color: '#059669' }]}>Product Details</Text>
                                    </View>

                                    {/* Product Name/Type Input */}
                                    <Text style={styles.subFieldLabel}>📦 Product Name / Category</Text>
                                    <TextInput
                                        style={styles.productNameInput}
                                        value={materialType}
                                        onChangeText={setMaterialType}
                                        placeholder="e.g., Cement, Steel Rods, Paint..."
                                        placeholderTextColor={theme.colors.textTertiary}
                                        returnKeyType="done"
                                        onSubmitEditing={Keyboard.dismiss}
                                        blurOnSubmit={true}
                                    />
                                </View>
                            )}

                            {/* Add Button */}
                            <TouchableOpacity style={styles.addSpendingBtn} onPress={handleAddSpending}>
                                <LinearGradient colors={['#10B981', '#059669']} style={styles.addSpendingGradient}>
                                    <MaterialCommunityIcons name="plus" size={20} color="white" />
                                    <Text style={styles.addSpendingText}>
                                        {projectMemberIds.length > 1 ? 'Submit for Approval' : 'Add Spending'}
                                    </Text>
                                </LinearGradient>
                            </TouchableOpacity>

                            {projectMemberIds.length > 1 && (
                                <Text style={styles.approvalNote}>
                                    * Requires approval from all {projectMemberIds.length} members
                                </Text>
                            )}
                        </View>
                    )}

                    {/* =================== INVESTOR CONTRIBUTIONS LEADERBOARD =================== */}
                    <View style={styles.investorContributionsCard}>
                        <TouchableOpacity
                            style={styles.contributionsHeader}
                            onPress={() => setShowInvestorBreakdown(!showInvestorBreakdown)}
                        >
                            <View style={styles.contributionsHeaderLeft}>
                                <LinearGradient
                                    colors={['#F59E0B', '#D97706']}
                                    style={styles.trophyIcon}
                                >
                                    <MaterialCommunityIcons name="trophy" size={20} color="white" />
                                </LinearGradient>
                                <View>
                                    <Text style={styles.contributionsTitle}>Member Contributions</Text>
                                    <Text style={styles.contributionsSubtitle}>
                                        Total: ₹{(totalApprovedSpent + totalPendingSpent).toLocaleString()}
                                    </Text>
                                </View>
                            </View>
                            <View style={styles.expandIndicator}>
                                <MaterialCommunityIcons
                                    name={showInvestorBreakdown ? "chevron-up" : "chevron-down"}
                                    size={24}
                                    color={theme.colors.textSecondary}
                                />
                            </View>
                        </TouchableOpacity>

                        {showInvestorBreakdown && (
                            <View style={styles.contributionsList}>
                                {/* Calculate contributions per member */}
                                {projectMembers
                                    .map(member => {
                                        const memberUser = userAccounts[member.id] || member;
                                        const memberSpendings = [...approvedSpendings, ...pendingSpendings]
                                            .filter(s => s.addedBy === member.id);
                                        const totalContribution = memberSpendings.reduce((sum, s) => sum + s.amount, 0);
                                        return {
                                            member,
                                            memberUser,
                                            totalContribution,
                                            spendingCount: memberSpendings.length
                                        };
                                    })
                                    .sort((a, b) => b.totalContribution - a.totalContribution)
                                    .map((item, index) => {
                                        const isTop3 = index < 3;
                                        const rankColors = ['#F59E0B', '#9CA3AF', '#CD7F32'];
                                        const rankIcons = ['medal', 'medal-outline', 'medal-outline'];
                                        const isCurrentUser = item.member.id === currentUser.id;

                                        return (
                                            <View
                                                key={item.member.id}
                                                style={[
                                                    styles.contributorRow,
                                                    isCurrentUser && styles.contributorRowHighlight
                                                ]}
                                            >
                                                {/* No Rank Badge anymore, just Avatar */}
                                                <View style={styles.contributorAvatarWrapper}>
                                                    <LinearGradient
                                                        colors={isTop3 ? [rankColors[index], rankColors[index]] : ['#6366F1', '#8B5CF6']}
                                                        style={styles.contributorAvatar}
                                                    >
                                                        <Text style={styles.contributorInitials}>
                                                            {item.memberUser.name?.charAt(0) || '?'}
                                                        </Text>
                                                    </LinearGradient>
                                                </View>

                                                {/* Info */}
                                                <View style={[styles.contributorInfo, { marginRight: 20 }]}>
                                                    <Text style={styles.contributorName} numberOfLines={1}>
                                                        {isCurrentUser ? 'Self Account' : item.memberUser.name}
                                                    </Text>
                                                    {/* Funded By Logic */}
                                                    <Text style={styles.contributorMeta}>
                                                        Funded By: {ledgers.find(l => l.id === item.member.id)?.name || item.memberUser.name.split(' ')[0]}
                                                    </Text>
                                                </View>

                                                {/* Amount */}
                                                <Text style={[
                                                    styles.contributorAmount,
                                                    isTop3 && { color: rankColors[index] }
                                                ]}>
                                                    ₹{item.totalContribution.toLocaleString()}
                                                </Text>
                                            </View>
                                        );
                                    })}
                            </View>
                        )}

                        {/* Average Investment Encouragement */}
                        <View style={styles.averageSection}>
                            <View style={styles.averageBox}>
                                <MaterialCommunityIcons name="chart-line" size={18} color="#6366F1" />
                                <Text style={styles.averageLabel}>Average contribution:</Text>
                                <Text style={styles.averageValue}>
                                    ₹{Math.round((totalApprovedSpent + totalPendingSpent) / Math.max(projectMembers.length, 1)).toLocaleString()}
                                </Text>
                            </View>
                        </View>
                    </View>

                    {/* =================== APPROVED SPENDING HISTORY WITH FILTER =================== */}
                    <View style={styles.section}>
                        {/* Section Header */}
                        <View style={styles.sectionHeaderRow}>
                            <View style={styles.sectionHeaderLeft}>
                                <Text style={styles.sectionTitle}>Recent Spendings</Text>
                                <Text style={styles.sectionSubtitle}>Approved transactions</Text>
                            </View>
                            <View style={styles.totalBadge}>
                                <Text style={styles.totalBadgeText}>₹{totalApprovedSpent.toLocaleString()}</Text>
                            </View>
                        </View>

                        {/* Filter Row - Separate Line */}
                        <View style={styles.filterContainer}>
                            <MaterialCommunityIcons name="filter-variant" size={16} color={theme.colors.primary} />
                            <ScrollView
                                horizontal
                                showsHorizontalScrollIndicator={false}
                                contentContainerStyle={styles.filterScrollContent}
                            >
                                <TouchableOpacity
                                    style={[styles.filterChip, spendingFilter === 'all' && styles.filterChipActive]}
                                    onPress={() => setSpendingFilter('all')}
                                >
                                    <Text style={[styles.filterChipText, spendingFilter === 'all' && styles.filterChipTextActive]}>All</Text>
                                </TouchableOpacity>
                                {projectMembers.slice(0, 5).map(member => {
                                    const memberUser = userAccounts[member.id] || member;
                                    const isActive = spendingFilter === member.id;
                                    const firstName = memberUser.name?.split(' ')[0] || 'User';
                                    return (
                                        <TouchableOpacity
                                            key={member.id}
                                            style={[styles.filterChip, isActive && styles.filterChipActive]}
                                            onPress={() => setSpendingFilter(member.id)}
                                        >
                                            <Text style={[styles.filterChipText, isActive && styles.filterChipTextActive]}>
                                                {firstName.length > 8 ? firstName.substring(0, 8) + '...' : firstName}
                                            </Text>
                                        </TouchableOpacity>
                                    );
                                })}
                            </ScrollView>
                        </View>

                        {/* Filtered Spending List */}
                        {(() => {
                            const filteredSpendings = spendingFilter === 'all'
                                ? approvedSpendings
                                : approvedSpendings.filter(s => s.addedBy === spendingFilter);

                            return filteredSpendings.length > 0 ? (
                                filteredSpendings.slice(0, 5).map(renderSpendingItem)
                            ) : (
                                <View style={styles.emptyState}>
                                    <MaterialCommunityIcons name="cash-remove" size={48} color={theme.colors.textTertiary} />
                                    <Text style={styles.emptyText}>
                                        {spendingFilter === 'all' ? 'No approved spendings yet' : 'No spendings from this member'}
                                    </Text>
                                </View>
                            );
                        })()}
                    </View>

                    {/* =================== PROJECT MEMBERS =================== */}
                    <View style={styles.sectionNoPadding}>
                        <View style={styles.sectionHeaderHorizontal}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                                <Text style={styles.sectionTitle}>Members</Text>
                                <View style={styles.memberCountBadge}>
                                    <Text style={styles.memberCountText}>{projectMembers.length}</Text>
                                </View>
                            </View>
                            <TouchableOpacity
                                style={styles.headerAddMemberBtn}
                                onPress={() => setShowAddMemberModal(true)}
                            >
                                <MaterialCommunityIcons name="account-plus-outline" size={18} color={theme.colors.primary} />
                                <Text style={styles.headerAddMemberText}>Add</Text>
                            </TouchableOpacity>
                        </View>

                        <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            contentContainerStyle={styles.membersScrollContent}
                        >
                            {projectMembers.map(member => {
                                const memberIsCreator = member.id === project.createdBy;
                                const isSelf = member.id === currentUser.id;
                                const memberUser = userAccounts[member.id] || member;
                                const memIsAdmin = projectAdminIds.includes(member.id);
                                return (
                                    <TouchableOpacity
                                        key={member.id}
                                        style={styles.memberAvatarCard}
                                        onPress={() => isAdmin && !memberIsCreator && setShowMemberOptions(member)}
                                    >
                                        <View style={styles.avatarWrapper}>
                                            <LinearGradient
                                                colors={memberIsCreator ? ['#F59E0B', '#D97706'] : isSelf ? ['#10B981', '#059669'] : theme.gradients.primary}
                                                style={styles.memberAvatarCircle}
                                            >
                                                <Text style={styles.memberInitials}>
                                                    {memberUser.name.split(' ').map(n => n[0]).join('')}
                                                </Text>
                                            </LinearGradient>
                                            {memberIsCreator && (
                                                <View style={styles.crownBadge}>
                                                    <MaterialCommunityIcons name="crown" size={12} color="#F59E0B" />
                                                </View>
                                            )}
                                        </View>
                                        <Text style={styles.memberAvatarName} numberOfLines={1}>
                                            {isSelf ? 'You' : memberUser.name.split(' ')[0]}
                                        </Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </ScrollView>
                    </View>

                    <View style={{ height: 40 }} />
                </ScrollView>
            </KeyboardAvoidingView>

            {/* =================== PENDING APPROVALS MODAL =================== */}
            <Modal
                visible={showPendingApprovals}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setShowPendingApprovals(false)}
            >
                <View style={styles.modalOverlay} pointerEvents="box-none">
                    <TouchableOpacity
                        style={StyleSheet.absoluteFill}
                        onPress={() => setShowPendingApprovals(false)}
                        activeOpacity={1}
                    >
                        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' }} />
                    </TouchableOpacity>

                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Pending Approvals</Text>
                            <TouchableOpacity onPress={() => setShowPendingApprovals(false)}>
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
                                    <Text style={styles.modalSectionTitle}>Awaiting Approval ({pendingSpendings.length})</Text>
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

            {/* =================== SPENDING DETAIL MODAL =================== */}
            <Modal
                visible={showSpendingDetail !== null}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setShowSpendingDetail(null)}
            >
                <TouchableWithoutFeedback onPress={() => setShowSpendingDetail(null)}>
                    <View style={styles.modalOverlay}>
                        <TouchableWithoutFeedback onPress={(e) => e.stopPropagation()}>
                            <View style={styles.modalContent}>
                                <View style={styles.modalHeader}>
                                    <Text style={styles.modalTitle}>Spending Details</Text>
                                    <TouchableOpacity onPress={() => setShowSpendingDetail(null)}>
                                        <MaterialCommunityIcons name="close" size={24} color={theme.colors.textPrimary} />
                                    </TouchableOpacity>
                                </View>
                                {showSpendingDetail && (
                                    <ScrollView style={styles.modalList}>
                                        <View style={styles.detailCard}>
                                            <View style={styles.detailAmountRow}>
                                                <Text style={styles.detailAmount}>₹{showSpendingDetail.amount?.toLocaleString()}</Text>
                                                <View style={[styles.detailCategoryBadge, { backgroundColor: showSpendingDetail.category === 'Service' ? '#EEF2FF' : '#D1FAE5' }]}>
                                                    <MaterialCommunityIcons
                                                        name={showSpendingDetail.category === 'Service' ? 'account-hard-hat' : 'package-variant'}
                                                        size={16}
                                                        color={showSpendingDetail.category === 'Service' ? '#6366F1' : '#10B981'}
                                                    />
                                                    <Text style={[styles.detailCategoryText, { color: showSpendingDetail.category === 'Service' ? '#6366F1' : '#10B981' }]}>
                                                        {showSpendingDetail.category}
                                                    </Text>
                                                </View>
                                            </View>

                                            <Text style={styles.detailDescription}>{showSpendingDetail.description}</Text>

                                            <View style={styles.detailInfoRows}>
                                                <View style={styles.detailInfoRow}>
                                                    <MaterialCommunityIcons name="calendar" size={18} color={theme.colors.textSecondary} />
                                                    <Text style={styles.detailInfoText}>{showSpendingDetail.date}</Text>
                                                </View>
                                                <View style={styles.detailInfoRow}>
                                                    <MaterialCommunityIcons name="clock-outline" size={18} color={theme.colors.textSecondary} />
                                                    <Text style={styles.detailInfoText}>
                                                        {(() => {
                                                            const rawTime = showSpendingDetail.time;
                                                            if (!rawTime) return '—';
                                                            const t = String(rawTime).trim();

                                                            // If already has am/pm
                                                            if (/am|pm/i.test(t)) return t;

                                                            // Try parsing HH:mm or H:mm
                                                            const parts = t.split(':');
                                                            if (parts.length >= 2) {
                                                                let h = parseInt(parts[0], 10);
                                                                const m = parts[1];
                                                                if (!isNaN(h)) {
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
                                                        Added by {userAccounts[showSpendingDetail.addedBy]?.name || 'Unknown'}
                                                    </Text>
                                                </View>

                                                {/* Funded By Row */}
                                                <View style={styles.detailInfoRow}>
                                                    <MaterialCommunityIcons name="wallet-outline" size={18} color={theme.colors.textSecondary} />
                                                    <Text style={styles.detailInfoText}>
                                                        Funded By: <Text style={{ fontWeight: '600', color: theme.colors.textPrimary }}>
                                                            {ledgers.find(l => l.id === showSpendingDetail.ledgerId)?.name || 'General'}
                                                        </Text>
                                                        {showSpendingDetail.subLedger ? ` • ${showSpendingDetail.subLedger}` : ''}
                                                    </Text>
                                                </View>
                                            </View>
                                        </View>

                                        {/* Approvals List */}
                                        {showSpendingDetail.approvals && Object.keys(showSpendingDetail.approvals).length > 0 && (
                                            <View style={styles.approvalsSection}>
                                                <Text style={styles.approvalsSectionTitle}>Approvals</Text>
                                                {Object.entries(showSpendingDetail.approvals).map(([userId, approval]) => (
                                                    <View key={userId} style={styles.approvalRow}>
                                                        <View style={styles.approvalUserBadge}>
                                                            <Text style={styles.approvalUserInitial}>
                                                                {(userAccounts[userId]?.name || 'U').charAt(0)}
                                                            </Text>
                                                        </View>
                                                        <Text style={styles.approvalUserName}>
                                                            {userAccounts[userId]?.name || 'Unknown'}
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
                                )}
                            </View>
                        </TouchableWithoutFeedback>
                    </View>
                </TouchableWithoutFeedback>
            </Modal>

            {/* =================== ADD MEMBER MODAL =================== */}
            <Modal
                visible={showAddMemberModal}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setShowAddMemberModal(false)}
            >
                <TouchableWithoutFeedback onPress={() => setShowAddMemberModal(false)}>
                    <KeyboardAvoidingView
                        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                        style={styles.modalOverlay}
                    >
                        <TouchableWithoutFeedback onPress={(e) => e.stopPropagation()}>
                            <View style={styles.modalContent}>
                                <View style={styles.modalHeader}>
                                    <Text style={styles.modalTitle}>Add Member</Text>
                                    <TouchableOpacity onPress={() => setShowAddMemberModal(false)}>
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
                                            onPress={() => handleAddMember(member)}
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
            </Modal >

            {/* Member Options Modal */}
            < Modal
                visible={showMemberOptions !== null}
                animationType="fade"
                transparent={true}
                onRequestClose={() => setShowMemberOptions(null)}
            >
                <TouchableWithoutFeedback onPress={() => setShowMemberOptions(null)}>
                    <View style={styles.optionsOverlay}>
                        <TouchableWithoutFeedback onPress={(e) => e.stopPropagation()}>
                            <View style={styles.optionsContent}>
                                {showMemberOptions && (
                                    <>
                                        <Text style={styles.optionsTitle}>{showMemberOptions.name}</Text>

                                        <TouchableOpacity
                                            style={[styles.optionItem, { borderBottomWidth: 1, borderBottomColor: theme.colors.border }]}
                                            onPress={() => handleToggleMemberStatus(showMemberOptions)}
                                        >
                                            <MaterialCommunityIcons
                                                name={project.investorRoles?.[showMemberOptions.id] === 'passive' ? "account-check" : "eye-off"}
                                                size={22}
                                                color={theme.colors.primary}
                                            />
                                            <View>
                                                <Text style={styles.optionText}>
                                                    {project.investorRoles?.[showMemberOptions.id] === 'passive' ? 'Make Member Active' : 'Make Member Passive'}
                                                </Text>
                                                <Text style={styles.optionSubText}>
                                                    {project.investorRoles?.[showMemberOptions.id] === 'passive' ? 'Allow adding expenses' : 'Restrict to view only'}
                                                </Text>
                                            </View>
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            style={[styles.optionItem, styles.optionItemDanger]}
                                            onPress={() => handleRemoveMember(showMemberOptions)}
                                        >
                                            <MaterialCommunityIcons name="account-remove" size={22} color={theme.colors.danger} />
                                            <Text style={[styles.optionText, styles.optionTextDanger]}>Remove from Project</Text>
                                        </TouchableOpacity>

                                        <TouchableOpacity
                                            style={styles.optionItemCancel}
                                            onPress={() => setShowMemberOptions(null)}
                                        >
                                            <Text style={styles.optionCancelText}>Cancel</Text>
                                        </TouchableOpacity>
                                    </>
                                )}
                            </View>
                        </TouchableWithoutFeedback>
                    </View>
                </TouchableWithoutFeedback>
            </Modal >

            {/* Note Input Modal */}
            < Modal
                visible={showNoteModal}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setShowNoteModal(false)}
            >
                <TouchableWithoutFeedback onPress={() => setShowNoteModal(false)}>
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
                                    <TouchableOpacity onPress={() => setShowNoteModal(false)} style={styles.closeNoteBtn}>
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
                                        onPress={() => setShowNoteModal(false)}
                                    >
                                        <Text style={styles.modalCancelText}>Cancel</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={styles.saveNoteBtn}
                                        onPress={handleSaveNote}
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
            </Modal >

            {/* ================= LEDGER SELECTION & MANAGEMENT MODAL ================= */}
            < Modal
                visible={showLedgerSelectModal}
                animationType="fade"
                transparent={true}
                onRequestClose={() => setShowLedgerSelectModal(false)}
            >
                <TouchableWithoutFeedback onPress={() => setShowLedgerSelectModal(false)}>
                    <View style={styles.modalOverlayCenter}>
                        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                            <View style={styles.modalContainerFancy}>
                                {/* Header */}
                                <View style={styles.modalHeaderInfo}>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                                        <MaterialCommunityIcons name="book-open-page-variant" size={24} color={theme.colors.primary} />
                                        <Text style={styles.modalTitleFancy}>Select Ledger</Text>
                                    </View>
                                    <Text style={styles.modalSubtitleFancy}>Major Account Head</Text>
                                </View>

                                {/* Controls Row */}
                                <View style={styles.modalControlsRow}>
                                    <View style={styles.searchBoxFancy}>
                                        <MaterialCommunityIcons name="magnify" size={20} color={theme.colors.textTertiary} />
                                        <TextInput
                                            style={styles.searchInputFancy}
                                            placeholder="Search ledgers..."
                                            placeholderTextColor={theme.colors.textTertiary}
                                            value={searchLedgerQuery}
                                            onChangeText={setSearchLedgerQuery}
                                        />
                                    </View>

                                    {isAdmin && (
                                        <TouchableOpacity
                                            style={[styles.manageBtnFancy, editMode && styles.manageBtnActive]}
                                            onPress={() => setEditMode(!editMode)}
                                        >
                                            <MaterialCommunityIcons name={editMode ? "check" : "pencil"} size={20} color={editMode ? "white" : theme.colors.primary} />
                                            <Text style={[styles.manageBtnText, editMode && { color: 'white' }]}>
                                                {editMode ? 'Done' : 'Edit'}
                                            </Text>
                                        </TouchableOpacity>
                                    )}
                                </View>

                                {/* Add New (Only in Edit Mode) */}
                                {editMode && (
                                    <View style={styles.addNewRowFancy}>
                                        <TextInput
                                            style={styles.addNewInputFancy}
                                            placeholder="Ex: Solar Installation"
                                            placeholderTextColor={theme.colors.textTertiary}
                                            value={newLedgerName}
                                            onChangeText={setNewLedgerName}
                                        />
                                        <TouchableOpacity
                                            style={[styles.addBtnFancy, !newLedgerName.trim() && styles.disabledBtn]}
                                            onPress={handleAddLedger}
                                            disabled={!newLedgerName.trim()}
                                        >
                                            <MaterialCommunityIcons name="plus" size={22} color="white" />
                                        </TouchableOpacity>
                                    </View>
                                )}

                                {/* List */}
                                <ScrollView style={styles.listFancy} showsVerticalScrollIndicator={false}>
                                    {ledgers.filter(l => l.name.toLowerCase().includes(searchLedgerQuery.toLowerCase())).map(l => (
                                        <TouchableOpacity
                                            key={l.id}
                                            style={[
                                                styles.listItemFancy,
                                                selectedLedgerId === l.id && !editMode && styles.listItemSelected
                                            ]}
                                            onPress={() => {
                                                if (!editMode) {
                                                    setSelectedLedgerId(l.id);
                                                    setSelectedSubLedger('');
                                                    setShowLedgerSelectModal(false);
                                                }
                                            }}
                                            activeOpacity={0.7}
                                            disabled={editMode}
                                        >
                                            <View style={[styles.iconBoxFancy, selectedLedgerId === l.id && !editMode && { backgroundColor: theme.colors.primary }]}>
                                                <MaterialCommunityIcons name="book-variant" size={20} color={selectedLedgerId === l.id && !editMode ? "white" : theme.colors.primary} />
                                            </View>

                                            <View style={styles.listItemContent}>
                                                <Text style={[
                                                    styles.listItemTitle,
                                                    selectedLedgerId === l.id && !editMode && styles.listItemTitleSelected
                                                ]}>{l.name}</Text>
                                                <Text style={styles.listItemSubtitle}>{l.subLedgers?.length || 0} sub-accounts</Text>
                                            </View>

                                            {/* Action Icon */}
                                            {editMode ? (
                                                <TouchableOpacity
                                                    onPress={() => handleDeleteLedger(l.id)}
                                                    style={styles.deleteIconBtn}
                                                >
                                                    <MaterialCommunityIcons name="trash-can-outline" size={20} color="#EF4444" />
                                                </TouchableOpacity>
                                            ) : (
                                                selectedLedgerId === l.id && (
                                                    <MaterialCommunityIcons name="check-circle" size={22} color={theme.colors.primary} />
                                                )
                                            )}
                                        </TouchableOpacity>
                                    ))}

                                    {ledgers.length === 0 && (
                                        <View style={styles.emptyStateFancy}>
                                            <Text style={styles.emptyTextFancy}>No ledgers found.</Text>
                                        </View>
                                    )}
                                </ScrollView>

                                <TouchableOpacity style={styles.closeModalBtn} onPress={() => setShowLedgerSelectModal(false)}>
                                    <Text style={styles.closeModalText}>Close</Text>
                                </TouchableOpacity>
                            </View>
                        </TouchableWithoutFeedback>
                    </View>
                </TouchableWithoutFeedback>
            </Modal>

            {/* ================= SUB-LEDGER SELECTION & MANAGEMENT MODAL ================= */}
            <Modal
                visible={showSubLedgerSelectModal}
                animationType="fade"
                transparent={true}
                onRequestClose={() => setShowSubLedgerSelectModal(false)}
            >
                <TouchableWithoutFeedback onPress={() => setShowSubLedgerSelectModal(false)}>
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
                                            onPress={() => setEditMode(!editMode)}
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
                                            value={newSubLedgerName}
                                            onChangeText={setNewSubLedgerName}
                                        />
                                        <TouchableOpacity
                                            style={[styles.addBtnFancy, !newSubLedgerName.trim() && styles.disabledBtn]}
                                            onPress={handleAddSubLedger}
                                            disabled={!newSubLedgerName.trim()}
                                        >
                                            <MaterialCommunityIcons name="plus" size={22} color="white" />
                                        </TouchableOpacity>
                                    </View>
                                )}

                                <ScrollView style={styles.listFancy} showsVerticalScrollIndicator={false}>
                                    {selectedLedgerObj?.subLedgers && selectedLedgerObj.subLedgers.length > 0 ? (
                                        selectedLedgerObj.subLedgers.map((subName, idx) => (
                                            <TouchableOpacity
                                                key={idx}
                                                style={[
                                                    styles.listItemFancy,
                                                    selectedSubLedger === subName && !editMode && styles.listItemSelected
                                                ]}
                                                onPress={() => {
                                                    if (!editMode) {
                                                        setSelectedSubLedger(subName);
                                                        setShowSubLedgerSelectModal(false);
                                                    }
                                                }}
                                                activeOpacity={0.7}
                                                disabled={editMode}
                                            >
                                                <LinearGradient
                                                    colors={['#EEF2FF', '#E0E7FF']}
                                                    style={styles.avatarFancy}
                                                >
                                                    <Text style={styles.avatarTextFancy}>{subName.charAt(0)}</Text>
                                                </LinearGradient>

                                                <View style={styles.listItemContent}>
                                                    <Text style={[
                                                        styles.listItemTitle,
                                                        selectedSubLedger === subName && !editMode && styles.listItemTitleSelected
                                                    ]}>{subName}</Text>
                                                </View>

                                                {/* Actions */}
                                                {editMode ? (
                                                    <TouchableOpacity
                                                        onPress={() => handleDeleteSubLedger(subName)}
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
                                            <MaterialCommunityIcons name="account-search-outline" size={48} color={theme.colors.textTertiary} />
                                            <Text style={styles.emptyTextFancy}>No names added yet.</Text>
                                            {isAdmin && <Text style={styles.emptySubTextFancy}>Tap 'Edit' to add people.</Text>}
                                        </View>
                                    )}
                                </ScrollView>

                                <TouchableOpacity style={styles.closeModalBtn} onPress={() => setShowSubLedgerSelectModal(false)}>
                                    <Text style={styles.closeModalText}>Close</Text>
                                </TouchableOpacity>
                            </View>
                        </TouchableWithoutFeedback>
                    </View >
                </TouchableWithoutFeedback >
            </Modal >
        </SafeAreaView >
    );
}

ProjectDetailScreen.propTypes = {
    navigation: PropTypes.shape({
        goBack: PropTypes.func.isRequired,
        navigate: PropTypes.func.isRequired,
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
        padding: 40,
    },
    errorText: {
        ...theme.typography.body,
        color: theme.colors.textSecondary,
        marginTop: 16,
        marginBottom: 24,
    },
    errorButton: {
        paddingHorizontal: 24,
        paddingVertical: 12,
        backgroundColor: theme.colors.primary,
        borderRadius: 12,
    },
    errorButtonText: {
        color: 'white',
        fontWeight: '600',
    },
    // Header
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: theme.colors.surface,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
    },
    exitButton: {
        width: 40,
        height: 40,
        borderRadius: 12,
        backgroundColor: '#FEE2E2',
        alignItems: 'center',
        justifyContent: 'center',
    },
    exitButtonWithText: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    exitIconContainer: {
        width: 36,
        height: 36,
        borderRadius: 10,
        backgroundColor: '#FEE2E2',
        alignItems: 'center',
        justifyContent: 'center',
    },
    exitButtonLabel: {
        fontSize: 10,
        fontWeight: '600',
        color: '#EF4444',
        marginTop: 2,
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
        marginTop: 2,
    },
    addMemberBtn: {
        width: 40,
        height: 40,
        borderRadius: 12,
        backgroundColor: theme.colors.primaryLight,
        alignItems: 'center',
        justifyContent: 'center',
    },
    content: {
        flex: 1,
    },
    // Pending Alert
    pendingAlert: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFBEB',
        margin: 16,
        padding: 16,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#FDE68A',
    },
    pendingAlertIcon: {
        width: 48,
        height: 48,
        borderRadius: 14,
        backgroundColor: '#FEF3C7',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    pendingAlertContent: {
        flex: 1,
    },
    pendingAlertTitle: {
        ...theme.typography.bodyMedium,
        color: theme.colors.textPrimary,
    },
    pendingAlertSubtitle: {
        ...theme.typography.caption,
        color: theme.colors.textSecondary,
        marginTop: 2,
    },
    pendingAlertBadge: {
        backgroundColor: '#F59E0B',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 12,
    },
    pendingAlertBadgeText: {
        color: 'white',
        fontWeight: '700',
        fontSize: 12,
    },
    // Spending Form - Account Book Style
    spendingFormCard: {
        backgroundColor: theme.colors.surface,
        margin: 16,
        borderRadius: 20,
        padding: 20,
        borderWidth: 1,
        borderColor: theme.colors.border,
        ...theme.shadows.card,
    },
    accountBookHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    accountBookHeaderLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
    },
    ledgerIcon: {
        width: 44,
        height: 44,
        borderRadius: 12,
        backgroundColor: '#EEF2FF',
        alignItems: 'center',
        justifyContent: 'center',
    },
    formHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        marginBottom: 20,
    },
    formTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: theme.colors.textPrimary,
    },
    formSubtitle: {
        fontSize: 12,
        color: theme.colors.textSecondary,
        marginTop: 2,
    },
    entryNumberBadge: {
        backgroundColor: '#F1F5F9',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 8,
    },
    entryNumberText: {
        fontFamily: 'monospace',
        fontSize: 12,
        fontWeight: '600',
        color: theme.colors.textSecondary,
    },
    ledgerLine: {
        height: 2,
        backgroundColor: '#EEF2FF',
        marginVertical: 16,
        borderStyle: 'dashed',
    },
    // Date Section
    dateSection: {
        marginBottom: 16,
    },
    fieldLabel: {
        fontSize: 13,
        fontWeight: '600',
        color: theme.colors.textSecondary,
        marginBottom: 8,
    },
    datePickerButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: theme.colors.surfaceAlt,
        padding: 14,
        borderRadius: 12,
        gap: 10,
    },
    datePickerText: {
        flex: 1,
        fontSize: 15,
        fontWeight: '500',
        color: theme.colors.textPrimary,
    },
    dateOptionsContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        marginTop: 10,
    },
    dateOption: {
        paddingHorizontal: 14,
        paddingVertical: 8,
        backgroundColor: theme.colors.surfaceAlt,
        borderRadius: 20,
    },
    dateOptionSelected: {
        backgroundColor: '#6366F1',
    },
    dateOptionText: {
        fontSize: 13,
        color: theme.colors.textSecondary,
    },
    dateOptionTextSelected: {
        color: 'white',
        fontWeight: '600',
    },
    amountSection: {
        marginBottom: 16,
    },
    descSection: {
        marginBottom: 16,
    },
    amountInputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: theme.colors.surfaceAlt,
        borderRadius: 12,
        paddingHorizontal: 16,
    },
    currencySymbol: {
        fontSize: 28,
        fontWeight: '700',
        color: theme.colors.textSecondary,
    },
    amountInput: {
        flex: 1,
        fontSize: 36,
        fontWeight: '700',
        color: theme.colors.textPrimary,
        paddingVertical: 12,
        marginLeft: 8,
    },
    descriptionInput: {
        backgroundColor: theme.colors.surfaceAlt,
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 14,
        fontSize: 15,
        color: theme.colors.textPrimary,
        minHeight: 60,
        textAlignVertical: 'top',
    },
    categoryLabel: {
        ...theme.typography.caption,
        color: theme.colors.textSecondary,
        marginBottom: 10,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    categoryRow: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 16,
    },
    categoryChip: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        paddingVertical: 16,
        borderRadius: 14,
        backgroundColor: theme.colors.surfaceAlt,
        borderWidth: 2,
        borderColor: theme.colors.border,
    },
    categoryChipText: {
        fontSize: 15,
        fontWeight: '600',
        color: theme.colors.textSecondary,
    },
    categoryChipTextActive: {
        color: 'white',
    },
    // Category Specific Sections
    categorySpecificSection: {
        backgroundColor: theme.colors.surfaceAlt,
        borderRadius: 14,
        padding: 16,
        marginBottom: 16,
    },
    categorySpecificHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 14,
    },
    categorySpecificTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: '#4F46E5',
    },
    inputRow: {
        flexDirection: 'row',
        gap: 12,
    },
    inputHalf: {
        flex: 1,
    },
    subFieldLabel: {
        fontSize: 12,
        fontWeight: '500',
        color: theme.colors.textSecondary,
        marginBottom: 8,
    },
    subFieldInput: {
        backgroundColor: 'white',
        borderRadius: 10,
        paddingHorizontal: 12,
        paddingVertical: 12,
        fontSize: 14,
        color: theme.colors.textPrimary,
        borderWidth: 1,
        borderColor: theme.colors.border,
    },
    materialTypeGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    materialTypeChip: {
        paddingHorizontal: 14,
        paddingVertical: 10,
        backgroundColor: 'white',
        borderRadius: 10,
        borderWidth: 1,
        borderColor: theme.colors.border,
    },
    materialTypeChipSelected: {
        backgroundColor: '#10B981',
        borderColor: '#10B981',
    },
    materialTypeText: {
        fontSize: 13,
        color: theme.colors.textSecondary,
    },
    materialTypeTextSelected: {
        color: 'white',
        fontWeight: '600',
    },
    // Enhanced Product Name Input
    productNameInput: {
        backgroundColor: '#FEFEFE',
        borderRadius: 14,
        paddingHorizontal: 16,
        paddingVertical: 14,
        fontSize: 15,
        fontWeight: '500',
        color: theme.colors.textPrimary,
        borderWidth: 2,
        borderColor: '#10B981' + '30',
        shadowColor: '#10B981',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.1,
        shadowRadius: 6,
        elevation: 3,
    },
    // Enhanced 7-Day Calendar Styles
    calendarScroll: {
        maxHeight: 110,
        marginTop: 10,
    },
    calendarScrollContainer: {
        paddingVertical: 10,
        paddingHorizontal: 2,
        gap: 10,
    },
    calendarDay: {
        width: 68,
        paddingVertical: 14,
        paddingHorizontal: 10,
        backgroundColor: '#FAFAFA',
        borderRadius: 16,
        alignItems: 'center',
        borderWidth: 1.5,
        borderColor: '#E8E8E8',
        marginHorizontal: 4,
    },
    calendarDaySelected: {
        backgroundColor: '#6366F1',
        borderColor: '#6366F1',
        shadowColor: '#6366F1',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.35,
        shadowRadius: 10,
        elevation: 8,
        transform: [{ scale: 1.02 }],
    },
    calendarDayName: {
        fontSize: 10,
        fontWeight: '700',
        color: theme.colors.textSecondary,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    calendarDayNameSelected: {
        color: 'rgba(255,255,255,0.9)',
    },
    calendarDayNum: {
        fontSize: 22,
        fontWeight: '800',
        color: theme.colors.textPrimary,
        marginVertical: 6,
    },
    calendarDayNumSelected: {
        color: 'white',
    },
    calendarMonth: {
        fontSize: 10,
        fontWeight: '500',
        color: theme.colors.textTertiary,
    },
    calendarMonthSelected: {
        color: 'rgba(255,255,255,0.8)',
    },
    addSpendingBtn: {
        borderRadius: 14,
        overflow: 'hidden',
    },
    addSpendingGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 16,
        gap: 8,
    },
    addSpendingText: {
        color: 'white',
        fontSize: 16,
        fontWeight: '600',
    },
    approvalNote: {
        ...theme.typography.caption,
        color: theme.colors.textTertiary,
        textAlign: 'center',
        marginTop: 12,
    },
    // Investor Contributions Leaderboard
    investorContributionsCard: {
        backgroundColor: theme.colors.surface,
        marginHorizontal: 16,
        marginBottom: 16,
        borderRadius: 20,
        overflow: 'hidden',
        ...theme.shadows.card,
    },
    contributionsHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
    },
    contributionsHeaderLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    trophyIcon: {
        width: 44,
        height: 44,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    contributionsTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: theme.colors.textPrimary,
    },
    contributionsSubtitle: {
        fontSize: 12,
        color: theme.colors.textSecondary,
        marginTop: 2,
    },
    expandIndicator: {
        padding: 4,
    },
    contributionsList: {
        paddingHorizontal: 16,
        paddingBottom: 8,
    },
    contributorRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.borderLight,
    },
    contributorRowHighlight: {
        backgroundColor: '#EEF2FF',
        marginHorizontal: -16,
        paddingHorizontal: 16,
        borderRadius: 0,
    },
    rankBadge: {
        width: 28,
        height: 28,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: theme.colors.surfaceAlt,
        marginRight: 10,
    },
    rankNumber: {
        fontSize: 11,
        fontWeight: '700',
        color: theme.colors.textSecondary,
    },
    contributorAvatar: {
        width: 36,
        height: 36,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    contributorInitials: {
        color: 'white',
        fontWeight: '700',
        fontSize: 14,
    },
    contributorInfo: {
        flex: 1,
        minWidth: 0, // Enables proper text truncation
    },
    contributorName: {
        fontSize: 14,
        fontWeight: '600',
        color: theme.colors.textPrimary,
    },
    contributorMeta: {
        fontSize: 12,
        color: theme.colors.textSecondary,
        marginTop: 2,
    },
    contributorAmount: {
        fontSize: 15,
        fontWeight: '700',
        color: theme.colors.textPrimary,
        minWidth: 75,
        textAlign: 'right',
        marginLeft: 8,
    },
    averageSection: {
        borderTopWidth: 1,
        borderTopColor: theme.colors.borderLight,
        padding: 12,
    },
    averageBox: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        backgroundColor: '#EEF2FF',
        padding: 12,
        borderRadius: 10,
    },
    averageLabel: {
        fontSize: 13,
        color: theme.colors.textSecondary,
    },
    averageValue: {
        fontSize: 15,
        fontWeight: '700',
        color: '#6366F1',
    },
    // Spending Filter
    sectionHeaderWithFilter: {
        marginBottom: 16,
    },
    sectionSubtitle: {
        fontSize: 12,
        color: theme.colors.textSecondary,
        marginTop: 2,
    },
    // Section Header with Total Badge
    sectionHeaderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 12,
    },
    sectionHeaderLeft: {
        flex: 1,
    },
    // Filter Container - Separate Row
    filterContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 16,
        paddingBottom: 12,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.borderLight,
    },
    filterScrollContent: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingRight: 8,
    },
    filterChip: {
        paddingHorizontal: 14,
        paddingVertical: 8,
        backgroundColor: theme.colors.surfaceAlt,
        borderRadius: 20,
        marginRight: 8,
    },
    filterChipActive: {
        backgroundColor: '#6366F1',
    },
    filterChipText: {
        fontSize: 13,
        fontWeight: '500',
        color: theme.colors.textSecondary,
    },
    filterChipTextActive: {
        color: 'white',
        fontWeight: '600',
    },
    // Section
    section: {
        backgroundColor: theme.colors.surface,
        marginHorizontal: 16,
        marginBottom: 16,
        borderRadius: 16,
        padding: 20,
        ...theme.shadows.soft,
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
    totalBadge: {
        backgroundColor: theme.colors.dangerLight || '#FEE2E2',
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 12,
    },
    totalBadgeText: {
        ...theme.typography.captionBold,
        color: theme.colors.danger,
    },
    // Spending Items
    spendingItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.borderLight,
    },
    spendingIcon: {
        width: 40,
        height: 40,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    spendingContent: {
        flex: 1,
    },
    spendingDescription: {
        ...theme.typography.bodyMedium,
        color: theme.colors.textPrimary,
    },
    spendingMeta: {
        ...theme.typography.caption,
        color: theme.colors.textSecondary,
        marginTop: 2,
    },
    spendingRight: {
        alignItems: 'flex-end',
    },
    spendingAmount: {
        ...theme.typography.bodySemibold,
        color: theme.colors.danger,
    },
    emptyState: {
        alignItems: 'center',
        paddingVertical: 32,
    },
    emptyText: {
        ...theme.typography.bodyMedium,
        color: theme.colors.textSecondary,
        marginTop: 12,
    },
    emptySubText: {
        ...theme.typography.caption,
        color: theme.colors.textTertiary,
        marginTop: 4,
    },
    // Feedback Banner
    feedbackBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        paddingHorizontal: 16,
        marginHorizontal: 16,
        marginBottom: 12,
        borderRadius: 12,
        gap: 8,
    },
    feedbackApprove: {
        backgroundColor: '#6366F1',
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
    // Modal Section Header
    modalSectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 12,
        marginTop: 8,
    },
    modalSectionTitle: {
        ...theme.typography.bodyMedium,
        color: '#F59E0B',
    },
    // Pending Card - Redesigned for no overlapping
    pendingCard: {
        backgroundColor: theme.colors.surface,
        borderRadius: 16,
        padding: 14,
        marginBottom: 12,
        borderWidth: 1.5,
        borderColor: '#FDE68A',
        ...theme.shadows.card,
    },
    pendingTopRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 10,
    },
    pendingCategoryIcon: {
        width: 44,
        height: 44,
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
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    pendingAmountValue: {
        fontSize: 22,
        fontWeight: '700',
        color: '#F59E0B',
    },
    pendingDescriptionText: {
        ...theme.typography.bodyMedium,
        color: theme.colors.textPrimary,
        fontSize: 14,
        marginBottom: 10,
    },
    pendingMetaRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
        marginBottom: 10,
    },
    pendingMetaItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    pendingMetaText: {
        ...theme.typography.caption,
        color: theme.colors.textSecondary,
    },
    // Approval Progress Section
    approvalProgressSection: {
        backgroundColor: theme.colors.surfaceAlt,
        borderRadius: 10,
        padding: 10,
        marginBottom: 12,
    },
    approvalProgressHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 6,
    },
    approvalProgressTitle: {
        ...theme.typography.captionBold,
        color: theme.colors.textSecondary,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    approvalProgressCount: {
        ...theme.typography.bodyMedium,
        color: '#10B981',
    },
    approvalProgressBar: {
        height: 6,
        backgroundColor: theme.colors.border,
        borderRadius: 3,
        overflow: 'hidden',
    },
    approvalProgressFill: {
        height: '100%',
        backgroundColor: '#10B981',
        borderRadius: 4,
    },
    approvedByText: {
        ...theme.typography.caption,
        color: theme.colors.textSecondary,
        marginTop: 6,
        fontSize: 11,
    },
    pendingActionButtons: {
        flexDirection: 'row',
        gap: 10,
        marginTop: 4,
    },
    rejectActionBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 10,
        borderRadius: 10,
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
        paddingVertical: 10,
        borderRadius: 10,
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
        gap: 6,
        paddingVertical: 8,
        backgroundColor: '#D1FAE5',
        borderRadius: 10,
    },
    yourStatusText: {
        color: '#10B981',
        fontWeight: '600',
        fontSize: 13,
    },
    // Rejected Card
    rejectedCard: {
        backgroundColor: '#FEF2F2',
        borderRadius: 14,
        padding: 14,
        marginBottom: 10,
        borderWidth: 1,
        borderColor: '#FECACA',
    },
    rejectedHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    rejectedInfo: {
        flex: 1,
    },
    rejectedDescription: {
        ...theme.typography.body,
        color: theme.colors.textPrimary,
    },
    rejectedMeta: {
        ...theme.typography.caption,
        color: '#EF4444',
        marginTop: 2,
    },
    // Old styles kept for backward compatibility
    approvalProgress: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 14,
        gap: 10,
    },
    approvalBar: {
        flex: 1,
        height: 6,
        backgroundColor: theme.colors.border,
        borderRadius: 3,
        overflow: 'hidden',
    },
    approvalFill: {
        height: '100%',
        backgroundColor: '#10B981',
        borderRadius: 3,
    },
    approvalCount: {
        ...theme.typography.caption,
        color: theme.colors.textSecondary,
    },
    approvalActions: {
        flexDirection: 'row',
        gap: 10,
        marginTop: 14,
    },
    rejectBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        borderRadius: 12,
        backgroundColor: '#FEE2E2',
        gap: 6,
    },
    rejectBtnText: {
        color: '#EF4444',
        fontWeight: '600',
    },
    approveBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        borderRadius: 12,
        backgroundColor: '#10B981',
        gap: 6,
    },
    approveBtnText: {
        color: 'white',
        fontWeight: '600',
    },
    approvedBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 14,
        gap: 6,
    },
    approvedText: {
        color: '#10B981',
        fontWeight: '500',
    },
    // Members Section
    sectionNoPadding: {
        marginBottom: 16,
    },
    sectionHeaderHorizontal: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        marginBottom: 12,
    },
    memberCountBadge: {
        backgroundColor: theme.colors.primaryLight,
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 10,
    },
    memberCountText: {
        ...theme.typography.captionBold,
        color: theme.colors.primary,
    },
    headerAddMemberBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: theme.colors.primaryLight,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 20,
        gap: 6,
    },
    headerAddMemberText: {
        fontSize: 13,
        fontWeight: '600',
        color: theme.colors.primary,
    },
    membersScrollContent: {
        flexDirection: 'row',
        gap: 16,
        paddingHorizontal: 16,
        alignItems: 'center',
    },
    memberAvatarCard: {
        alignItems: 'center',
        width: 72,
    },
    avatarWrapper: {
        position: 'relative',
        marginBottom: 6,
    },
    memberAvatarCircle: {
        width: 60,
        height: 60,
        borderRadius: 30,
        alignItems: 'center',
        justifyContent: 'center',
    },
    memberInitials: {
        color: 'white',
        fontWeight: '700',
        fontSize: 16,
    },
    crownBadge: {
        position: 'absolute',
        bottom: -2,
        right: -2,
        backgroundColor: '#FEF3C7',
        width: 22,
        height: 22,
        borderRadius: 11,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2,
        borderColor: 'white',
    },
    memberAvatarName: {
        fontSize: 12,
        color: theme.colors.textSecondary,
        textAlign: 'center',
        fontWeight: '500',
    },
    // Modal Styles
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    modalOverlayCenter: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
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
    // Spending Detail Modal
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
    // Options Modal
    optionsOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    optionsContent: {
        backgroundColor: theme.colors.surface,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        padding: 20,
        paddingBottom: 40,
    },
    optionsTitle: {
        ...theme.typography.h4,
        color: theme.colors.textPrimary,
        textAlign: 'center',
        marginBottom: 20,
    },
    optionItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 16,
        gap: 12,
    },
    optionItemDanger: {
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.borderLight,
    },
    optionText: {
        ...theme.typography.body,
        color: theme.colors.textPrimary,
    },
    optionTextDanger: {
        color: theme.colors.danger,
    },
    optionItemCancel: {
        paddingVertical: 16,
        alignItems: 'center',
    },
    optionCancelText: {
        ...theme.typography.bodyMedium,
        color: theme.colors.textSecondary,
    },
    // Note Feature Styles
    noteButton: {
        width: 36,
        height: 36,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: theme.colors.surfaceAlt,
        marginRight: 8,
    },
    noteButtonActive: {
        backgroundColor: '#EEF2FF',
        borderWidth: 1,
        borderColor: '#6366F1',
    },
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
    // View Only Banner (for Passive Members)
    viewOnlyBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(107, 114, 128, 0.12)',
        borderRadius: 16,
        padding: 16,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: 'rgba(107, 114, 128, 0.25)',
        gap: 14,
    },
    viewOnlyIconContainer: {
        width: 50,
        height: 50,
        borderRadius: 12,
        backgroundColor: 'rgba(107, 114, 128, 0.18)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    viewOnlyContent: {
        flex: 1,
    },
    viewOnlyTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: '#4B5563',
        marginBottom: 4,
    },
    viewOnlySubtitle: {
        fontSize: 13,
        lineHeight: 19,
        color: '#6B7280',
    },
    // Ledger UI
    // Styles for New Ledger Dropdowns
    dropdownButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: theme.colors.surfaceAlt,
        borderRadius: 12,
        paddingHorizontal: 12,
        paddingVertical: 12,
        borderWidth: 1,
        borderColor: theme.colors.border,
        marginTop: 6,
    },
    dropdownButtonText: {
        ...theme.typography.body,
        color: theme.colors.textPrimary,
        flex: 1,
        marginRight: 8,
    },
    placeholderText: {
        color: theme.colors.textTertiary,
    },
    disabledInput: {
        backgroundColor: theme.colors.background,
        opacity: 0.6,
    },

    // FANCY MODAL STYLES
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
    searchBoxFancy: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: theme.colors.surfaceAlt,
        borderRadius: 12,
        paddingHorizontal: 12,
        height: 44,
        borderWidth: 1,
        borderColor: theme.colors.border,
    },
    searchInputFancy: {
        flex: 1,
        marginLeft: 8,
        fontSize: 15,
        color: theme.colors.textPrimary,
        height: '100%',
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
    iconBoxFancy: {
        width: 40,
        height: 40,
        borderRadius: 10,
        backgroundColor: '#F3F4F6',
        alignItems: 'center',
        justifyContent: 'center',
    },
    avatarFancy: {
        width: 40,
        height: 40,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
    },
    avatarTextFancy: {
        fontSize: 16,
        fontWeight: '700',
        color: theme.colors.primary,
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
    listItemSubtitle: {
        fontSize: 12,
        color: theme.colors.textTertiary,
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
    // Missing Styles for Account Book Header
    accountBookHeaderLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12, // Ensure gap between icon and title
    },
    ledgerIcon: {
        width: 48,
        height: 48,
        borderRadius: 14,
        backgroundColor: '#EEF2FF',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 4, // Backup gap
    },
    formTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: theme.colors.textPrimary,
    },
    formSubtitle: {
        fontSize: 12,
        color: theme.colors.textSecondary,
        marginTop: 2,
    },
    entryNumberBadge: {
        backgroundColor: '#F3F4F6',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
    },
    entryNumberText: {
        fontSize: 12,
        fontWeight: '600',
        color: theme.colors.textSecondary,
    },
    ledgerLine: {
        height: 1,
        backgroundColor: theme.colors.borderLight,
        marginVertical: 16,
    },
});
