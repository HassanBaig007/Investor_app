import React, { useState, useRef, useEffect, useMemo } from 'react';
import PropTypes from 'prop-types';
import {
    View,
    Text,
    ScrollView,
    Modal,
    StyleSheet,
    TextInput,
    Dimensions,
    KeyboardAvoidingView,
    Platform,
    Keyboard,
    TouchableOpacity,
    ActivityIndicator,
    Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import LinearGradient from 'react-native-linear-gradient';
import { theme } from '../../components/Theme';

import NoteModal from '../../components/modals/NoteModal';
import MemberOptionsModal from '../../components/modals/MemberOptionsModal';
import AddMemberModal from '../../components/modals/AddMemberModal';
import SpendingDetailModal from '../../components/modals/SpendingDetailModal';
import PendingApprovalsModal from '../../components/modals/PendingApprovalsModal';
import LedgerSelectModal from '../../components/modals/LedgerSelectModal';
import SubLedgerSelectModal from '../../components/modals/SubLedgerSelectModal';
import { useProjectData } from '../../hooks/useProjectData';
import { useSpendingLogic } from '../../hooks/useSpendingLogic';
import { useLedgerLogic } from '../../hooks/useLedgerLogic';
import { api } from '../../services/api';
import { writeExportFile, deleteExportFile, FILE_EXPORT_ENCODING } from '../../utils/fileExport';
import { shareFileUri } from '../../utils/fileShare';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const formatDateKey = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

const parseDateKey = (value) => {
    if (!value || typeof value !== 'string') return null;
    const [year, month, day] = value.split('-').map(Number);
    if (!year || !month || !day) return null;
    const parsed = new Date(year, month - 1, day);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const getSpendingButtonLabel = (isSubmitting, memberCount) => {
    if (isSubmitting) return 'Processing...';
    if (memberCount > 1) return 'Submit for Approval';
    return 'Add Spending';
};

const getMemberAvatarGradient = (isCreator, isSelf, gradients) => {
    if (isCreator) return ['#F59E0B', '#D97706'];
    if (isSelf) return ['#10B981', '#059669'];
    return gradients.primary;
};

const renderSpendingItemRow = ({
    spending,
    ledgers,
    onOpenDetail,
    onOpenNote,
    getUserName,
    theme,
}) => {
    const isSelfFunded = !spending.fundedBy || spending.fundedBy === spending.addedBy;
    const funderName = getUserName(spending.fundedBy, 'Unknown', spending.fundedByName);
    const funderDisplay = isSelfFunded
        ? getUserName(spending.addedBy, 'You', spending.addedByName)
        : `Funded by ${funderName}`;

    const ledgerName = ledgers.find((ledger) => ledger.id === spending.ledgerId)?.name;
    const prefix = ledgerName || spending.category;

    return (
        <View
            style={styles.spendingItem}
        >
            <TouchableOpacity
                style={{ flex: 1, flexDirection: 'row', alignItems: 'center' }}
                onPress={() => onOpenDetail(spending)}
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
                        {`${prefix} • ${funderDisplay} • ${spending.date}`}
                    </Text>
                </View>
            </TouchableOpacity>

            <TouchableOpacity
                style={[styles.noteButton, spending.note && styles.noteButtonActive, { marginHorizontal: 8 }]}
                onPress={(event) => onOpenNote(spending, event)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
                <MaterialCommunityIcons
                    name={spending.note ? 'note-text' : 'note-plus-outline'}
                    size={20}
                    color={spending.note ? theme.colors.primary : theme.colors.textTertiary}
                />
            </TouchableOpacity>

            <TouchableOpacity
                style={styles.spendingRight}
                onPress={() => onOpenDetail(spending)}
                activeOpacity={0.7}
            >
                <Text style={styles.spendingAmount}>₹{spending.amount.toLocaleString()}</Text>
                <MaterialCommunityIcons name="chevron-right" size={16} color={theme.colors.textTertiary} />
            </TouchableOpacity>
        </View>
    );
};

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
export default function ProjectDetailScreen({ navigation, route }) { // NOSONAR
    // 1. Project Data Hook
    const {
        project, currentUser, projectMemberIds, isAdmin, isPassiveViewer, canAddData,
        projectMembers, availableMembers, creator, totalApprovedSpent, totalPendingSpent,
        handleExitProject, handleAddMember, handleRemoveMember, handleToggleMemberStatus,
        pendingSpendings, setPendingSpendings, approvedSpendings, setApprovedSpendings,
        isLoading, onRefresh
    } = useProjectData(navigation, route);

    // 2. Spending Logic Hook
    const {
        spendingAmount, setSpendingAmount, spendingDescription, setSpendingDescription,
        spendingCategory, spendingDate, setSpendingDate,
        showDatePicker, setShowDatePicker, paidToPerson, setPaidToPerson,
        paidToPlace, setPaidToPlace, materialType, setMaterialType,
        investmentType, setInvestmentType, selectedFunder, setSelectedFunder,
        selectedLedgerId, setSelectedLedgerId, selectedSubLedger, setSelectedSubLedger,
        actionFeedback, rejectedSpendings, formatAmount,
        clearCategorySpecificState, othersSubLedgerValue, selectSpendingCategory, handleAddSpending,
        handleApproveSpending, handleRejectSpending, isSubmitting
    } = useSpendingLogic({
        project,
        currentUser,
        projectMemberIds,
        pendingSpendings,
        setPendingSpendings,
        approvedSpendings,
        setApprovedSpendings,
        onRefresh,
    });

    // 3. Ledger Logic Hook
    const {
        ledgers, selectedLedgerObj,
        showLedgerSelectModal, setShowLedgerSelectModal,
        showSubLedgerSelectModal, setShowSubLedgerSelectModal,
        searchLedgerQuery, setSearchLedgerQuery,
        newLedgerName, setNewLedgerName,
        newSubLedgerName, setNewSubLedgerName,
        editMode, setEditMode,
        handleAddLedger, handleDeleteLedger,
        handleAddSubLedger, handleDeleteSubLedger
    } = useLedgerLogic(
        project, selectedLedgerId, selectedSubLedger, setSelectedLedgerId, setSelectedSubLedger
    );

    // 4. Local UI State & Refs
    const scrollViewRef = useRef(null);
    const viewMode = route?.params?.viewMode || null;


    // Modals
    const [showAddMemberModal, setShowAddMemberModal] = useState(false);
    const [showMemberOptions, setShowMemberOptions] = useState(null);
    const [showSpendingDetail, setShowSpendingDetail] = useState(null);
    const [showPendingApprovals, setShowPendingApprovals] = useState(false);
    const [showAllRecentSpendings, setShowAllRecentSpendings] = useState(false);
    const [calendarViewMonth, setCalendarViewMonth] = useState(() => {
        const selectedDate = parseDateKey(spendingDate) || new Date();
        return new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1);
    });
    const [searchQuery, setSearchQuery] = useState('');

    // Filters & Views
    const [spendingFilter, setSpendingFilter] = useState('all');
    const [showInvestorBreakdown, setShowInvestorBreakdown] = useState(viewMode === 'details');
    const currentUserId = String(currentUser?.id || currentUser?._id || '');

    const categories = [
        { id: 'Service', icon: 'account-hard-hat', color: '#6366F1' },
        { id: 'Product', icon: 'package-variant', color: '#10B981' },
    ];

    const shouldShowCategorySelection = Boolean(
        selectedLedgerId && selectedSubLedger === othersSubLedgerValue,
    );

    const memberMap = useMemo(() => {
        const entries = (projectMembers || [])
            .filter((member) => member?.id)
            .map((member) => [String(member.id), member]);
        return Object.fromEntries(entries);
    }, [projectMembers]);

    const userAccounts = useMemo(() => {
        const accounts = { ...memberMap };
        if (currentUser?.id) {
            accounts[String(currentUser.id)] = {
                ...accounts[String(currentUser.id)],
                id: currentUser.id,
                name: currentUser.name || 'You',
                email: currentUser.email || '',
            };
        }
        if (currentUser?._id) {
            accounts[String(currentUser._id)] = {
                ...accounts[String(currentUser._id)],
                id: currentUser._id,
                name: currentUser.name || 'You',
                email: currentUser.email || '',
            };
        }
        return accounts;
    }, [memberMap, currentUser]);

    const getUserName = (userId, fallback = 'Unknown', nameHint = null) => {
        if (nameHint) return nameHint;
        if (!userId) return fallback;
        if (String(userId) === String(currentUser?.id)) {
            return currentUser?.name || 'You';
        }

        return memberMap[String(userId)]?.name || fallback;
    };

    const getMemberUser = (member) => {
        if (!member?.id) return member;
        return memberMap[String(member.id)] || member;
    };

    const getSpendingInitiatorId = (spending) => {
        if (!spending) return '';
        if (spending.addedById) return String(spending.addedById);
        if (typeof spending.addedBy === 'string') return String(spending.addedBy);
        if (spending.addedBy?._id) return String(spending.addedBy._id);
        if (spending.addedBy?.id) return String(spending.addedBy.id);
        return '';
    };

    const getSpendingFunderId = (spending) => {
        if (!spending) return '';
        if (spending.fundedById) return String(spending.fundedById);
        if (typeof spending.fundedBy === 'string') return String(spending.fundedBy);
        if (spending.fundedBy?._id) return String(spending.fundedBy._id);
        if (spending.fundedBy?.id) return String(spending.fundedBy.id);
        return getSpendingInitiatorId(spending);
    };

    const getSpendingTrackedAccountId = (spending) => {
        if (!spending) return '';
        const status = String(spending.status || '').toLowerCase();
        if (status === 'approved') {
            return getSpendingFunderId(spending) || getSpendingInitiatorId(spending);
        }
        return getSpendingInitiatorId(spending);
    };

    const getRefId = (value) => {
        if (!value) return null;
        if (typeof value === 'string') return String(value);
        if (value._id) return String(value._id);
        if (value.id) return String(value.id);
        return null;
    };

    const effectiveApproverIds = useMemo(() => {
        const activeInvestors = (project?.investors || []).filter((inv) => (inv?.role || 'active') === 'active');
        const creatorId = getRefId(project?.createdBy);
        const hasCreator = activeInvestors.some((inv) => getRefId(inv?.user) === creatorId);

        const ids = activeInvestors.map((inv) => getRefId(inv?.user)).filter(Boolean);
        if (creatorId && !hasCreator) ids.push(creatorId);

        return [...new Set(ids)];
    }, [project]);

    const pendingApprovalRequestsCount = useMemo(() => {
        if (!pendingSpendings?.length) return 0;

        return pendingSpendings.reduce((total, spending) => {
            if (spending?.approvalSummary && Number.isFinite(Number(spending.approvalSummary.pendingRequiredCount))) {
                return total + Number(spending.approvalSummary.pendingRequiredCount || 0);
            }

            const votedIds = new Set(
                Object.entries(spending?.approvals || {}).map(([approvalKey, approval]) => {
                    return String(getRefId(approval?.user) || approvalKey);
                })
            );

            const waitingForThisSpending = effectiveApproverIds.filter((id) => !votedIds.has(String(id))).length;
            return total + Math.max(waitingForThisSpending, 0);
        }, 0);
    }, [pendingSpendings, effectiveApproverIds]);

    // Material Types constant for UI


    // Auto-expand based on navigation parameters
    useEffect(() => {
        if (viewMode === 'details') {
            setShowInvestorBreakdown(true);
        }
    }, [viewMode]);



    // State for Note Modal
    const [showNoteModal, setShowNoteModal] = useState(false);
    const [currentNoteSpending, setCurrentNoteSpending] = useState(null);
    const [noteContent, setNoteContent] = useState('');
    const [exportingProject, setExportingProject] = useState(false);
    const [showExportFormatModal, setShowExportFormatModal] = useState(false);

    // Handle opening note modal
    const handleOpenNote = (spending, e) => {
        e.stopPropagation();
        setCurrentNoteSpending(spending);
        setNoteContent(spending.note || '');
        setShowNoteModal(true);
    };

    const handleSpendingFilterChange = (nextFilter) => {
        setSpendingFilter(nextFilter);
        setShowAllRecentSpendings(false);
    };

    const selectedFilter = String(spendingFilter);
    const allRecentSpendings = [...approvedSpendings, ...pendingSpendings]
        .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
    const filteredRecentSpendings = spendingFilter === 'all'
        ? allRecentSpendings
        : allRecentSpendings.filter((spending) => getSpendingTrackedAccountId(spending) === selectedFilter);
    const recentSpendingsPreview = filteredRecentSpendings.slice(0, 2);
    const hasMoreRecentSpendings = filteredRecentSpendings.length > 2;
    const todayDateKey = formatDateKey(new Date());

    const calendarMonthLabel = useMemo(
        () => calendarViewMonth.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' }),
        [calendarViewMonth],
    );

    const calendarDays = useMemo(() => {
        const year = calendarViewMonth.getFullYear();
        const month = calendarViewMonth.getMonth();
        const firstDayOfMonth = new Date(year, month, 1);
        const lastDayOfMonth = new Date(year, month + 1, 0);
        const startOffset = firstDayOfMonth.getDay();
        const daysInMonth = lastDayOfMonth.getDate();

        const cells = [];
        for (let index = 0; index < startOffset; index += 1) {
            cells.push({
                key: `empty-${year}-${month + 1}-${index}`,
                isEmpty: true,
            });
        }

        for (let dayNumber = 1; dayNumber <= daysInMonth; dayNumber += 1) {
            const cellDate = new Date(year, month, dayNumber);
            cells.push({
                key: formatDateKey(cellDate),
                dayNumber,
                isFuture: formatDateKey(cellDate) > todayDateKey,
            });
        }

        return cells;
    }, [calendarViewMonth, todayDateKey]);

    useEffect(() => {
        if (!showDatePicker) return;
        const selectedDate = parseDateKey(spendingDate) || new Date();
        setCalendarViewMonth(new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1));
    }, [showDatePicker, spendingDate]);

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

    const handleProjectDetailsExport = async (format = 'xlsx') => {
        let fileUri = null;
        try {
            if (exportingProject) return;

            const projectId = project?._id || project?.id;
            if (!projectId) {
                Alert.alert('Export Failed', 'Project ID is missing. Please refresh and try again.');
                return;
            }

            setExportingProject(true);

            const exportPayload = await api.exportProjectDetails(projectId, format);
            const nowDate = new Date().toISOString().split('T')[0];
            const content = exportPayload?.content || '';
            const fileName = exportPayload?.filename || `project_details_${nowDate}.${format}`;
            const mimeType =
                exportPayload?.mimeType ||
                (format === 'xlsx'
                    ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
                    : 'text/csv;charset=utf-8');

            const shouldUseBase64 = exportPayload?.encoding === 'base64' || format === 'xlsx';
            const writeEncoding = shouldUseBase64
                ? FILE_EXPORT_ENCODING.BASE64
                : FILE_EXPORT_ENCODING.UTF8;

            const writableContent =
                !shouldUseBase64 && format === 'csv' && !String(content).startsWith('\uFEFF')
                    ? `\uFEFF${content}`
                    : content;

            fileUri = await writeExportFile({
                fileName,
                content: writableContent,
                encoding: writeEncoding,
            });

            const didShare = await shareFileUri(fileUri, {
                dialogTitle: 'Export Project Details',
                mimeType,
            });

            if (!didShare) {
                Alert.alert('Export Complete', `File saved successfully: ${fileName}`);
            }
        } catch (error) {
            console.error('Project export failed:', error);
            const backendMessage = error?.response?.data?.message;
            Alert.alert(
                'Export Failed',
                backendMessage || error?.friendlyMessage || 'Could not export project details. Please try again.'
            );
        } finally {
            await deleteExportFile(fileUri);
            setExportingProject(false);
        }
    };

    const showProjectExportOptions = () => {
        if (exportingProject) return;

        setShowExportFormatModal(true);
    };

    const handleSelectExportFormat = (format) => {
        if (exportingProject) return;
        setShowExportFormatModal(false);
        handleProjectDetailsExport(format);
    };



    if (isLoading && !project) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.errorContainer}>
                    <ActivityIndicator size="large" color={theme.colors.primary} />
                    <Text style={[styles.errorText, { marginTop: 16 }]}>Loading project...</Text>
                </View>
            </SafeAreaView>
        );
    }

    if (!project && !isLoading) {
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
                <View style={styles.headerActions}>
                    <TouchableOpacity
                        onPress={showProjectExportOptions}
                        style={styles.downloadButtonWithText}
                        disabled={exportingProject}
                    >
                        <View style={styles.downloadIconContainer}>
                            {exportingProject ? (
                                <ActivityIndicator size="small" color={theme.colors.primary} />
                            ) : (
                                <MaterialCommunityIcons name="download" size={20} color={theme.colors.primary} />
                            )}
                        </View>
                        <Text style={styles.downloadButtonLabel}>Export</Text>
                    </TouchableOpacity>

                    <TouchableOpacity onPress={handleExitProject} style={styles.exitButtonWithText}>
                        <View style={styles.exitIconContainer}>
                            <MaterialCommunityIcons name="exit-run" size={20} color="#EF4444" />
                        </View>
                        <Text style={styles.exitButtonLabel}>Exit</Text>
                    </TouchableOpacity>
                </View>
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
                                    {pendingApprovalRequestsCount} pending approval{pendingApprovalRequestsCount > 1 ? 's' : ''}
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
                                    onPress={() => setShowDatePicker(true)}
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
                                    <MaterialCommunityIcons name="chevron-right" size={18} color={theme.colors.textSecondary} />
                                </TouchableOpacity>
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
                                                {selectedSubLedger === othersSubLedgerValue
                                                    ? 'Others'
                                                    : (selectedSubLedger || 'Select Name')}
                                            </Text>
                                            <MaterialCommunityIcons name="chevron-down" size={20} color={selectedLedgerId ? theme.colors.textSecondary : theme.colors.border} />
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            </View>

                            {shouldShowCategorySelection && (
                                <>
                                    <Text style={styles.fieldLabel}>🏷️ Category</Text>
                                    <View style={styles.categoryRow}>
                                        {categories.map(cat => (
                                            <TouchableOpacity
                                                key={cat.id}
                                                style={[
                                                    styles.categoryChip,
                                                    spendingCategory === cat.id && { backgroundColor: cat.color, borderColor: cat.color }
                                                ]}
                                                onPress={() => selectSpendingCategory(cat.id)}
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

                                    {spendingCategory === 'Service' && (
                                        <View style={styles.categorySpecificSection}>
                                            <View style={styles.categorySpecificHeader}>
                                                <MaterialCommunityIcons name="account-hard-hat" size={18} color="#6366F1" />
                                                <Text style={styles.categorySpecificTitle}>Service Details</Text>
                                            </View>

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

                                    {spendingCategory === 'Product' && (
                                        <View style={styles.categorySpecificSection}>
                                            <View style={styles.categorySpecificHeader}>
                                                <MaterialCommunityIcons name="package-variant" size={18} color="#10B981" />
                                                <Text style={[styles.categorySpecificTitle, { color: '#059669' }]}>Product Details</Text>
                                            </View>

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
                                </>
                            )}

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

                            {/* Investment Type Selection */}
                            <Text style={styles.fieldLabel}>💳 Investment Type</Text>
                            <View style={styles.investmentTypeRow}>
                                <TouchableOpacity
                                    style={[styles.typeButton, investmentType === 'self' && styles.typeButtonActive]}
                                    onPress={() => {
                                        setInvestmentType('self');
                                        setSelectedFunder(null);
                                    }}
                                >
                                    <Text style={[styles.typeButtonText, investmentType === 'self' && styles.typeButtonTextActive]}>Self Account</Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={[styles.typeButton, investmentType === 'other' && styles.typeButtonActive]}
                                    onPress={() => setInvestmentType('other')}
                                >
                                    <Text style={[styles.typeButtonText, investmentType === 'other' && styles.typeButtonTextActive]}>Funded By...</Text>
                                </TouchableOpacity>
                            </View>

                            {/* Dynamic Member List for 'Funded By' */}
                            {investmentType === 'other' && (
                                <View style={{ marginBottom: 16 }}>
                                    <Text style={[styles.fieldLabel, { fontSize: 13, marginBottom: 8 }]}>Select Funder:</Text>
                                    <ScrollView
                                        horizontal
                                        showsHorizontalScrollIndicator={false}
                                        style={styles.funderList}
                                        contentContainerStyle={{ paddingRight: 20 }}
                                    >
                                        {projectMembers
                                            .filter((member) => String(member?.id || '') !== currentUserId)
                                            .map(member => {
                                                const uName = getUserName(member.id, member.name || 'Unknown');
                                                return (
                                                    <TouchableOpacity
                                                        key={member.id}
                                                        style={[styles.funderChip, selectedFunder === member.id && styles.funderChipActive]}
                                                        onPress={() => setSelectedFunder(member.id)}
                                                    >
                                                        <View style={styles.funderAvatarSmall}>
                                                            <Text style={styles.funderAvatarText}>{uName.charAt(0)}</Text>
                                                        </View>
                                                        <Text style={[styles.funderText, selectedFunder === member.id && styles.funderTextActive]}>
                                                            {uName.split(' ')[0]}
                                                        </Text>
                                                    </TouchableOpacity>
                                                );
                                            })}
                                    </ScrollView>
                                </View>
                            )}

                            {/* Add Button */}
                            <TouchableOpacity
                                style={[styles.addSpendingBtn, isSubmitting && styles.disabledButton]}
                                onPress={handleAddSpending}
                                disabled={isSubmitting}
                            >
                                <LinearGradient colors={isSubmitting ? ['#9CA3AF', '#6B7280'] : ['#10B981', '#059669']} style={styles.addSpendingGradient}>
                                    {isSubmitting ? (
                                        <ActivityIndicator size="small" color="white" />
                                    ) : (
                                        <MaterialCommunityIcons name="plus" size={20} color="white" />
                                    )}
                                    <Text style={styles.addSpendingText}>
                                        {getSpendingButtonLabel(isSubmitting, projectMemberIds.length)}
                                    </Text>
                                </LinearGradient>
                            </TouchableOpacity>

                            {effectiveApproverIds.length > 1 && (
                                <Text style={styles.approvalNote}>
                                    * Requires approval from all {effectiveApproverIds.length} active members
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
                                        const memberId = String(member.id);
                                        const memberUser = getMemberUser(member);
                                        const memberSpendings = [...approvedSpendings, ...pendingSpendings]
                                            .filter(s => getSpendingTrackedAccountId(s) === memberId);
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
                                        const isCurrentUser = String(item.member?.id || '') === currentUserId;

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
                                                    {/* Funded By Logic - Dynamic based on majority funding for this member */}
                                                    <Text style={styles.contributorMeta}>
                                                        {(() => {
                                                            // Logic: If member has spent money, check if it was mostly self-funded or funded by others
                                                            const memberId = String(item.member.id);
                                                            const memberTxns = [...approvedSpendings, ...pendingSpendings]
                                                                .filter(s => getSpendingTrackedAccountId(s) === memberId);
                                                            if (memberTxns.length === 0) return 'No contributions';

                                                            // Count occurrences of funders
                                                            const fundingStats = {};
                                                            memberTxns.forEach(s => {
                                                                const funder = getSpendingFunderId(s);
                                                                fundingStats[funder] = (fundingStats[funder] || 0) + 1;
                                                            });

                                                            // Find dominant funder
                                                            let maxCount = 0;
                                                            let dominantFunder = memberId;
                                                            Object.keys(fundingStats).forEach(fId => {
                                                                if (fundingStats[fId] > maxCount) {
                                                                    maxCount = fundingStats[fId];
                                                                    dominantFunder = fId;
                                                                }
                                                            });

                                                            if (dominantFunder === memberId) return 'Self Funded';
                                                            return `Funded by ${getUserName(dominantFunder, 'Unknown')}`;
                                                        })()}
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
                                <Text style={styles.sectionSubtitle}>All transactions</Text>
                            </View>
                            <View style={styles.totalBadge}>
                                <Text style={styles.totalBadgeText}>₹{(totalApprovedSpent + totalPendingSpent).toLocaleString()}</Text>
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
                                    onPress={() => handleSpendingFilterChange('all')}
                                >
                                    <Text style={[styles.filterChipText, spendingFilter === 'all' && styles.filterChipTextActive]}>All</Text>
                                </TouchableOpacity>
                                {projectMembers.slice(0, 5).map(member => {
                                    const memberUser = getMemberUser(member);
                                    const isActive = spendingFilter === member.id;
                                    const firstName = memberUser.name?.split(' ')[0] || 'User';
                                    return (
                                        <TouchableOpacity
                                            key={member.id}
                                            style={[styles.filterChip, isActive && styles.filterChipActive]}
                                            onPress={() => handleSpendingFilterChange(member.id)}
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
                        {filteredRecentSpendings.length > 0 ? (
                            <>
                                {recentSpendingsPreview.map((spending) => (
                                    <View key={spending.id}>
                                        {spending.status === 'pending' && (
                                            <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 6 }}>
                                                <View style={{ backgroundColor: '#FEF3C7', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 }}>
                                                    <Text style={{ fontSize: 10, color: '#D97706', fontWeight: '600' }}>PENDING</Text>
                                                </View>
                                            </View>
                                        )}
                                        {renderSpendingItemRow({
                                            spending,
                                            ledgers,
                                            onOpenDetail: setShowSpendingDetail,
                                            onOpenNote: handleOpenNote,
                                            getUserName,
                                            theme,
                                        })}
                                    </View>
                                ))}

                                {hasMoreRecentSpendings && (
                                    <TouchableOpacity
                                        style={styles.viewMoreButton}
                                        onPress={() => setShowAllRecentSpendings(true)}
                                        activeOpacity={0.8}
                                    >
                                        <Text style={styles.viewMoreButtonText}>
                                            View More ({filteredRecentSpendings.length} total)
                                        </Text>
                                        <MaterialCommunityIcons
                                            name="open-in-new"
                                            size={18}
                                            color={theme.colors.primary}
                                        />
                                    </TouchableOpacity>
                                )}
                            </>
                        ) : (
                            <View style={styles.emptyState}>
                                <MaterialCommunityIcons name="cash-remove" size={48} color={theme.colors.textTertiary} />
                                <Text style={styles.emptyText}>
                                    {spendingFilter === 'all' ? 'No spendings yet' : 'No spendings from this member'}
                                </Text>
                            </View>
                        )}
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
                                const creatorId = project?.createdBy?._id || project?.createdBy;
                                const memberIsCreator = String(member.id) === String(creatorId);
                                const isSelf = String(member.id) === String(currentUser?.id || currentUser?._id);
                                const memberUser = getMemberUser(member);
                                const memberGradient = getMemberAvatarGradient(memberIsCreator, isSelf, theme.gradients);
                                return (
                                    <TouchableOpacity
                                        key={member.id}
                                        style={styles.memberAvatarCard}
                                        onPress={() => isAdmin && !memberIsCreator && setShowMemberOptions(member)}
                                    >
                                        <View style={styles.avatarWrapper}>
                                            <LinearGradient
                                                colors={memberGradient}
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

            {currentUser && (
                <PendingApprovalsModal
                    visible={showPendingApprovals}
                    onClose={() => setShowPendingApprovals(false)}
                    pendingSpendings={pendingSpendings}
                    rejectedSpendings={rejectedSpendings}
                    currentUser={currentUser}
                    project={project}
                    projectMemberIds={projectMemberIds}
                    onApprove={handleApproveSpending}
                    onReject={handleRejectSpending}
                    actionFeedback={actionFeedback}
                    isPassiveViewer={isPassiveViewer}
                    userAccounts={userAccounts}
                />
            )}

            <SpendingDetailModal
                visible={showSpendingDetail !== null}
                spending={showSpendingDetail}
                onClose={() => setShowSpendingDetail(null)}
                userAccounts={userAccounts}
                ledgers={ledgers}
            />

            <AddMemberModal
                visible={showAddMemberModal}
                onClose={() => setShowAddMemberModal(false)}
                availableMembers={availableMembers}
                onAddMember={handleAddMember}
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
            />

            <MemberOptionsModal
                visible={showMemberOptions !== null}
                member={showMemberOptions}
                onClose={() => setShowMemberOptions(null)}
                onToggleStatus={handleToggleMemberStatus}
                onRemove={handleRemoveMember}
                project={project}
            />

            <NoteModal
                visible={showNoteModal}
                onClose={() => setShowNoteModal(false)}
                noteContent={noteContent}
                setNoteContent={setNoteContent}
                onSave={handleSaveNote}
            />

            <Modal
                visible={showExportFormatModal}
                transparent
                animationType="fade"
                onRequestClose={() => setShowExportFormatModal(false)}
            >
                <View style={styles.exportFormatModalOverlay}>
                    <TouchableOpacity
                        style={styles.exportFormatModalBackdrop}
                        activeOpacity={1}
                        onPress={() => setShowExportFormatModal(false)}
                    />

                    <View style={styles.exportFormatModalCard}>
                        <View style={styles.exportFormatHandle} />

                        <View style={styles.exportFormatHeader}>
                            <LinearGradient
                                colors={['#6366F1', '#8B5CF6']}
                                style={styles.exportFormatIconWrap}
                            >
                                <MaterialCommunityIcons name="download-circle" size={24} color="white" />
                            </LinearGradient>
                            <View style={styles.exportFormatHeaderTextWrap}>
                                <Text style={styles.exportFormatTitle}>Export Project Details</Text>
                                <Text style={styles.exportFormatSubtitle}>
                                    Choose a professional report format for this project
                                </Text>
                            </View>
                        </View>

                        <TouchableOpacity
                            style={styles.exportFormatOption}
                            onPress={() => handleSelectExportFormat('xlsx')}
                            disabled={exportingProject}
                        >
                            <View style={[styles.exportFormatOptionIcon, { backgroundColor: '#DBEAFE' }]}>
                                <MaterialCommunityIcons name="file-excel" size={22} color="#2563EB" />
                            </View>
                            <View style={styles.exportFormatOptionTextWrap}>
                                <Text style={styles.exportFormatOptionTitle}>Excel Workbook (.xlsx)</Text>
                                <Text style={styles.exportFormatOptionDesc}>
                                    Best for professional review with styled sheets and analytics
                                </Text>
                            </View>
                            <MaterialCommunityIcons name="chevron-right" size={20} color={theme.colors.textTertiary} />
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.exportFormatOption}
                            onPress={() => handleSelectExportFormat('csv')}
                            disabled={exportingProject}
                        >
                            <View style={[styles.exportFormatOptionIcon, { backgroundColor: '#DCFCE7' }]}>
                                <MaterialCommunityIcons name="file-delimited-outline" size={22} color="#16A34A" />
                            </View>
                            <View style={styles.exportFormatOptionTextWrap}>
                                <Text style={styles.exportFormatOptionTitle}>CSV Spreadsheet (.csv)</Text>
                                <Text style={styles.exportFormatOptionDesc}>
                                    Best for data analysis, BI tools, and quick tabular processing
                                </Text>
                            </View>
                            <MaterialCommunityIcons name="chevron-right" size={20} color={theme.colors.textTertiary} />
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.exportFormatCancelBtn}
                            onPress={() => setShowExportFormatModal(false)}
                            disabled={exportingProject}
                        >
                            <Text style={styles.exportFormatCancelText}>Cancel</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            <Modal
                visible={showAllRecentSpendings}
                animationType="slide"
                transparent={false}
                onRequestClose={() => setShowAllRecentSpendings(false)}
            >
                <SafeAreaView style={styles.fullListContainer}>
                    <View style={styles.fullListHeader}>
                        <TouchableOpacity
                            onPress={() => setShowAllRecentSpendings(false)}
                            style={styles.fullListBackButton}
                        >
                            <MaterialCommunityIcons name="arrow-left" size={24} color={theme.colors.textPrimary} />
                        </TouchableOpacity>
                        <View style={styles.fullListHeaderTextWrap}>
                            <Text style={styles.fullListTitle}>Recent Spendings</Text>
                            <Text style={styles.fullListSubtitle}>{filteredRecentSpendings.length} transactions</Text>
                        </View>
                    </View>

                    <ScrollView
                        showsVerticalScrollIndicator={false}
                        contentContainerStyle={styles.fullListScrollContent}
                    >
                        {filteredRecentSpendings.map((spending) => (
                            <View key={`${spending.id}-full-list`}>
                                {spending.status === 'pending' && (
                                    <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 6 }}>
                                        <View style={{ backgroundColor: '#FEF3C7', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 }}>
                                            <Text style={{ fontSize: 10, color: '#D97706', fontWeight: '600' }}>PENDING</Text>
                                        </View>
                                    </View>
                                )}
                                {renderSpendingItemRow({
                                    spending,
                                    ledgers,
                                    onOpenDetail: setShowSpendingDetail,
                                    onOpenNote: handleOpenNote,
                                    getUserName,
                                    theme,
                                })}
                            </View>
                        ))}
                    </ScrollView>
                </SafeAreaView>
            </Modal>

            <Modal
                visible={showDatePicker}
                animationType="fade"
                transparent
                onRequestClose={() => setShowDatePicker(false)}
            >
                <View style={styles.calendarModalOverlay}>
                    <TouchableOpacity style={styles.calendarBackdrop} onPress={() => setShowDatePicker(false)} />
                    <View style={styles.calendarModalCard}>
                        <View style={styles.calendarModalHeader}>
                            <Text style={styles.calendarModalTitle}>Select Date</Text>
                            <TouchableOpacity onPress={() => setShowDatePicker(false)} style={styles.calendarCloseButton}>
                                <MaterialCommunityIcons name="close" size={20} color={theme.colors.textSecondary} />
                            </TouchableOpacity>
                        </View>

                        <View style={styles.calendarMonthNavRow}>
                            <TouchableOpacity
                                style={styles.calendarNavButton}
                                onPress={() => setCalendarViewMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))}
                            >
                                <MaterialCommunityIcons name="chevron-left" size={20} color={theme.colors.textPrimary} />
                            </TouchableOpacity>

                            <Text style={styles.calendarMonthTitle}>{calendarMonthLabel}</Text>

                            <TouchableOpacity
                                style={styles.calendarNavButton}
                                onPress={() => setCalendarViewMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))}
                            >
                                <MaterialCommunityIcons name="chevron-right" size={20} color={theme.colors.textPrimary} />
                            </TouchableOpacity>
                        </View>

                        <View style={styles.calendarWeekdayRow}>
                            {WEEKDAY_LABELS.map((weekday) => (
                                <Text key={weekday} style={styles.calendarWeekdayText}>{weekday}</Text>
                            ))}
                        </View>

                        <View style={styles.calendarGrid}>
                            {calendarDays.map((cell) => {
                                if (cell.isEmpty) {
                                    return <View key={cell.key} style={styles.calendarDayCellEmpty} />;
                                }

                                const isSelected = spendingDate === cell.key;
                                return (
                                    <TouchableOpacity
                                        key={cell.key}
                                        style={[
                                            styles.calendarDayCell,
                                            isSelected && styles.calendarDayCellSelected,
                                            cell.isFuture && styles.calendarDayCellDisabled,
                                        ]}
                                        onPress={() => {
                                            if (cell.isFuture) return;
                                            setSpendingDate(cell.key);
                                            setShowDatePicker(false);
                                        }}
                                        disabled={cell.isFuture}
                                    >
                                        <Text
                                            style={[
                                                styles.calendarDayCellText,
                                                isSelected && styles.calendarDayCellTextSelected,
                                                cell.isFuture && styles.calendarDayCellTextDisabled,
                                            ]}
                                        >
                                            {cell.dayNumber}
                                        </Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>

                        <View style={styles.calendarModalFooter}>
                            <TouchableOpacity
                                style={styles.calendarFooterSecondaryButton}
                                onPress={() => {
                                    setSpendingDate(todayDateKey);
                                    setCalendarViewMonth(new Date());
                                }}
                            >
                                <Text style={styles.calendarFooterSecondaryText}>Today</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={styles.calendarFooterPrimaryButton}
                                onPress={() => setShowDatePicker(false)}
                            >
                                <Text style={styles.calendarFooterPrimaryText}>Done</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* ================= LEDGER SELECTION & MANAGEMENT MODAL ================= */}
            <LedgerSelectModal
                visible={showLedgerSelectModal}
                onClose={() => setShowLedgerSelectModal(false)}
                ledgers={ledgers}
                searchQuery={searchLedgerQuery}
                onSearchChange={setSearchLedgerQuery}
                isAdmin={isAdmin}
                editMode={editMode}
                onEditModeChange={setEditMode}
                newName={newLedgerName}
                onNewNameChange={setNewLedgerName}
                onAdd={handleAddLedger}
                onSelect={(l) => {
                    setSelectedLedgerId(l.id);
                    setSelectedSubLedger('');
                    clearCategorySpecificState();
                    setShowLedgerSelectModal(false);
                }}
                selectedId={selectedLedgerId}
                onDelete={handleDeleteLedger}
            />

            {/* ================= SUB-LEDGER SELECTION & MANAGEMENT MODAL ================= */}
            <SubLedgerSelectModal
                visible={showSubLedgerSelectModal}
                onClose={() => setShowSubLedgerSelectModal(false)}
                selectedLedgerObj={selectedLedgerObj}
                isAdmin={isAdmin}
                editMode={editMode}
                onEditModeChange={setEditMode}
                newName={newSubLedgerName}
                onNewNameChange={setNewSubLedgerName}
                onAdd={handleAddSubLedger}
                onSelect={(subName) => {
                    setSelectedSubLedger(subName);
                    clearCategorySpecificState();
                    setShowSubLedgerSelectModal(false);
                }}
                selectedSubLedger={selectedSubLedger}
                othersValue={othersSubLedgerValue}
                onDelete={handleDeleteSubLedger}
            />
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
            viewMode: PropTypes.string,
            focusOnAdd: PropTypes.bool,
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
    headerActions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    downloadButtonWithText: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    downloadIconContainer: {
        width: 36,
        height: 36,
        borderRadius: 10,
        backgroundColor: theme.colors.primaryLight,
        alignItems: 'center',
        justifyContent: 'center',
    },
    downloadButtonLabel: {
        fontSize: 10,
        fontWeight: '600',
        color: theme.colors.primary,
        marginTop: 2,
    },
    exportFormatModalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(15, 23, 42, 0.45)',
        justifyContent: 'flex-end',
    },
    exportFormatModalBackdrop: {
        flex: 1,
    },
    exportFormatModalCard: {
        backgroundColor: theme.colors.surface,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        paddingHorizontal: 18,
        paddingTop: 10,
        paddingBottom: 22,
        borderWidth: 1,
        borderColor: theme.colors.border,
    },
    exportFormatHandle: {
        alignSelf: 'center',
        width: 44,
        height: 5,
        borderRadius: 3,
        backgroundColor: theme.colors.border,
        marginBottom: 14,
    },
    exportFormatHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 14,
    },
    exportFormatIconWrap: {
        width: 44,
        height: 44,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    exportFormatHeaderTextWrap: {
        flex: 1,
    },
    exportFormatTitle: {
        ...theme.typography.h4,
        color: theme.colors.textPrimary,
    },
    exportFormatSubtitle: {
        ...theme.typography.caption,
        color: theme.colors.textSecondary,
        marginTop: 2,
    },
    exportFormatOption: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: theme.colors.surfaceAlt,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: theme.colors.border,
        paddingHorizontal: 12,
        paddingVertical: 12,
        marginBottom: 10,
    },
    exportFormatOptionIcon: {
        width: 40,
        height: 40,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 10,
    },
    exportFormatOptionTextWrap: {
        flex: 1,
        marginRight: 8,
    },
    exportFormatOptionTitle: {
        fontSize: 15,
        fontWeight: '700',
        color: theme.colors.textPrimary,
    },
    exportFormatOptionDesc: {
        fontSize: 12,
        color: theme.colors.textSecondary,
        marginTop: 2,
        lineHeight: 17,
    },
    exportFormatCancelBtn: {
        marginTop: 4,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: theme.colors.border,
        backgroundColor: theme.colors.surfaceAlt,
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
    },
    exportFormatCancelText: {
        fontSize: 14,
        fontWeight: '600',
        color: theme.colors.textSecondary,
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
    // Ledger Section
    ledgerSection: {
        marginBottom: 16,
    },
    othersCategorySection: {
        marginTop: -6,
        marginBottom: 14,
    },
    othersButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        borderWidth: 1,
        borderColor: theme.colors.primary,
        borderRadius: 12,
        paddingVertical: 10,
        backgroundColor: theme.colors.surface,
    },
    othersButtonActive: {
        backgroundColor: theme.colors.primary,
        borderColor: theme.colors.primary,
    },
    othersButtonText: {
        fontSize: 14,
        fontWeight: '600',
        color: theme.colors.primary,
    },
    othersButtonTextActive: {
        color: 'white',
    },
    dropdownButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: theme.colors.surfaceAlt,
        borderRadius: 12,
        paddingHorizontal: 14,
        paddingVertical: 12,
        borderWidth: 1,
        borderColor: theme.colors.border,
    },
    dropdownButtonText: {
        fontSize: 14,
        color: theme.colors.textPrimary,
        flex: 1,
        marginRight: 8,
    },
    placeholderText: {
        color: theme.colors.textTertiary,
    },
    disabledInput: {
        opacity: 0.6,
        backgroundColor: '#F3F4F6',
    },
    amountSection: {
        marginTop: 16,
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
    calendarModalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(15, 23, 42, 0.45)',
        justifyContent: 'center',
        paddingHorizontal: 16,
    },
    calendarBackdrop: {
        ...StyleSheet.absoluteFillObject,
    },
    calendarModalCard: {
        backgroundColor: theme.colors.surface,
        borderRadius: 20,
        padding: 16,
        borderWidth: 1,
        borderColor: theme.colors.border,
        ...theme.shadows.card,
    },
    calendarModalHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 12,
    },
    calendarModalTitle: {
        ...theme.typography.h4,
        color: theme.colors.textPrimary,
    },
    calendarCloseButton: {
        width: 32,
        height: 32,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: theme.colors.surfaceAlt,
    },
    calendarMonthNavRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 14,
    },
    calendarNavButton: {
        width: 34,
        height: 34,
        borderRadius: 17,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: theme.colors.surfaceAlt,
    },
    calendarMonthTitle: {
        ...theme.typography.bodySemibold,
        color: theme.colors.textPrimary,
    },
    calendarWeekdayRow: {
        flexDirection: 'row',
        marginBottom: 8,
    },
    calendarWeekdayText: {
        flex: 1,
        textAlign: 'center',
        ...theme.typography.caption,
        color: theme.colors.textSecondary,
    },
    calendarGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
    },
    calendarDayCell: {
        width: '14.2857%',
        aspectRatio: 1,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 6,
    },
    calendarDayCellEmpty: {
        width: '14.2857%',
        aspectRatio: 1,
        marginBottom: 6,
    },
    calendarDayCellSelected: {
        backgroundColor: theme.colors.primary,
    },
    calendarDayCellDisabled: {
        opacity: 0.4,
    },
    calendarDayCellText: {
        ...theme.typography.bodyMedium,
        color: theme.colors.textPrimary,
    },
    calendarDayCellTextSelected: {
        color: 'white',
        fontWeight: '700',
    },
    calendarDayCellTextDisabled: {
        color: theme.colors.textTertiary,
    },
    calendarModalFooter: {
        flexDirection: 'row',
        gap: 10,
        marginTop: 10,
    },
    calendarFooterSecondaryButton: {
        flex: 1,
        borderRadius: 12,
        paddingVertical: 11,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: theme.colors.border,
        backgroundColor: theme.colors.surfaceAlt,
    },
    calendarFooterSecondaryText: {
        ...theme.typography.bodySemibold,
        color: theme.colors.textSecondary,
    },
    calendarFooterPrimaryButton: {
        flex: 1,
        borderRadius: 12,
        paddingVertical: 11,
        alignItems: 'center',
        backgroundColor: theme.colors.primary,
    },
    calendarFooterPrimaryText: {
        ...theme.typography.bodySemibold,
        color: 'white',
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
    noteButton: {
        width: 36,
        height: 36,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: theme.colors.surfaceAlt,
    },
    noteButtonActive: {
        backgroundColor: theme.colors.primaryLight,
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
    viewMoreButton: {
        marginTop: 10,
        marginBottom: 4,
        paddingVertical: 10,
        paddingHorizontal: 12,
        borderRadius: 10,
        backgroundColor: theme.colors.primaryLight,
        borderWidth: 1,
        borderColor: theme.colors.primary + '33',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
    },
    viewMoreButtonText: {
        ...theme.typography.bodySemibold,
        color: theme.colors.primary,
    },
    fullListContainer: {
        flex: 1,
        backgroundColor: theme.colors.background,
    },
    fullListHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.borderLight,
    },
    fullListBackButton: {
        width: 36,
        height: 36,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: theme.colors.surfaceAlt,
    },
    fullListHeaderTextWrap: {
        marginLeft: 12,
        flex: 1,
    },
    fullListTitle: {
        ...theme.typography.h4,
        color: theme.colors.textPrimary,
    },
    fullListSubtitle: {
        ...theme.typography.caption,
        color: theme.colors.textSecondary,
    },
    fullListScrollContent: {
        paddingHorizontal: 16,
        paddingBottom: 32,
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


    // NEW Styles for Investment Type
    investmentTypeRow: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 16,
    },
    typeButton: {
        flex: 1,
        paddingVertical: 12,
        backgroundColor: theme.colors.surfaceAlt,
        borderRadius: 12,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: theme.colors.border,
    },
    typeButtonActive: {
        backgroundColor: theme.colors.primary,
        borderColor: theme.colors.primary,
    },
    typeButtonText: {
        fontWeight: '600',
        color: theme.colors.textSecondary,
        fontSize: 14,
    },
    typeButtonTextActive: {
        color: 'white',
    },
    funderList: {
        flexGrow: 0,
        marginBottom: 8,
    },
    funderChip: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 8,
        backgroundColor: theme.colors.surfaceAlt,
        borderRadius: 20,
        marginRight: 8,
        borderWidth: 1,
        borderColor: theme.colors.border,
        gap: 6,
    },
    funderChipActive: {
        backgroundColor: theme.colors.primary,
        borderColor: theme.colors.primary,
    },
    funderAvatarSmall: {
        width: 20,
        height: 20,
        borderRadius: 10,
        backgroundColor: 'rgba(255,255,255,0.3)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    funderAvatarText: {
        fontSize: 10,
        fontWeight: 'bold',
        color: theme.colors.textPrimary,
    },
    funderText: {
        fontSize: 13,
        color: theme.colors.textSecondary,
    },
    funderTextActive: {
        color: 'white',
        fontWeight: '600',
    },
});
