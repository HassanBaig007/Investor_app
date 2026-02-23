/**
 * Expense History Screen (PhonePe Style)
 * 
 * Design: Read-only transaction history view showing all expenses
 * (both personal and project-approved) in a clean, scrollable list.
 * 
 * Features:
 * - Combined view of personal + project expenses
 * - Filter by source (All/Personal/Project)
 * - Month-wise grouping
 * - Detailed transaction cards
 * - Export functionality
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import PropTypes from 'prop-types';
import {
    View,
    Text,
    ScrollView,
    StyleSheet,
    TouchableOpacity,
    TouchableWithoutFeedback,
    StatusBar,
    Dimensions,
    Modal,
    TextInput,
    KeyboardAvoidingView,
    Platform,
    Keyboard,
    Alert,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { theme } from '../../components/Theme';
import LedgerSelectModal from '../../components/modals/LedgerSelectModal';
import SubLedgerSelectModal from '../../components/modals/SubLedgerSelectModal';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import { writeExportFile, deleteExportFile, FILE_EXPORT_ENCODING } from '../../utils/fileExport';
import { shareFileUri } from '../../utils/fileShare';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Category icons mapping (including project categories)
const CATEGORY_ICONS = {
    food: 'food',
    transport: 'car',
    shopping: 'shopping',
    bills: 'receipt',
    entertainment: 'movie-open',
    health: 'medical-bag',
    education: 'school',
    grocery: 'cart',
    other: 'dots-horizontal',
    project_service: 'account-hard-hat',
    project_product: 'package-variant',
    Service: 'account-hard-hat',
    Product: 'package-variant',
};

const CATEGORY_COLORS = {
    food: '#F59E0B',
    transport: '#3B82F6',
    shopping: '#EC4899',
    bills: '#EF4444',
    entertainment: '#8B5CF6',
    health: '#10B981',
    education: '#06B6D4',
    grocery: '#84CC16',
    other: '#6B7280',
    project_service: '#6366F1',
    project_product: '#10B981',
    Service: '#6366F1',
    Product: '#10B981',
};

const EXPORT_FORMATS = [
    {
        id: 'csv',
        label: 'CSV Spreadsheet',
        description: 'Best for Excel and data analysis',
        icon: 'file-delimited',
        color: '#10B981',
    },
    {
        id: 'xlsx',
        label: 'Excel Workbook',
        description: 'Professional formatted .xlsx report',
        icon: 'microsoft-excel',
        color: '#6366F1',
    },
];

export default function DailyExpensesScreen({ navigation }) { // NOSONAR
    const insets = useSafeAreaInsets();
    const { user: currentUser } = useAuth();
    const [transactions, setTransactions] = useState([]);
    const [allProjects, setAllProjects] = useState([]);
    const [summary, setSummary] = useState({});
    const [selectedProject, setSelectedProject] = useState('all');
    const [ledgers, setLedgers] = useState([]);
    const [selectedLedgerId, setSelectedLedgerId] = useState('');
    const [selectedSubLedger, setSelectedSubLedger] = useState('');
    const [showLedgerSelectModal, setShowLedgerSelectModal] = useState(false);
    const [showSubLedgerSelectModal, setShowSubLedgerSelectModal] = useState(false);
    const [ledgerSearchQuery, setLedgerSearchQuery] = useState('');
    const [ledgersLoading, setLedgersLoading] = useState(false);
    const [showExportModal, setShowExportModal] = useState(false);

    // ScrollView ref for scrolling to top
    const scrollViewRef = useRef(null);

    // Toggle state for inline meta details (Second Feature)
    const [visibleMetaId, setVisibleMetaId] = useState(null);

    const toggleMeta = (id) => {
        setVisibleMetaId(prev => prev === id ? null : id);
    };
    const [exportLoading, setExportLoading] = useState(false);
    const [selectedTransaction, setSelectedTransaction] = useState(null);
    const [showProjectFilter, setShowProjectFilter] = useState(false); // Hamburger menu state
    const [searchQuery, setSearchQuery] = useState(''); // NEW: Search functionality
    const [showSearch, setShowSearch] = useState(false); // NEW: Toggle search bar visibility

    const getRefId = (value) => {
        if (!value) return null;
        if (typeof value === 'string') return value;
        if (value._id) return String(value._id);
        if (value.id) return String(value.id);
        return null;
    };

    const getProjectKey = (project) => getRefId(project?._id || project?.id || project);

    const getProjectMemberCount = (project) => {
        const creatorId = getRefId(project?.createdBy);
        const investorIds = (project?.investors || [])
            .map((inv) => getRefId(inv?.user))
            .filter(Boolean);
        return new Set([creatorId, ...investorIds].filter(Boolean)).size;
    };

    const selectedLedger = ledgers.find((ledger) => String(ledger?.id || ledger?._id) === String(selectedLedgerId));

    // Get user's invested projects
    const isSuperAdmin = currentUser?.role === 'super_admin';
    const userId = currentUser?.id || currentUser?._id;
    const userProjects = allProjects.filter((project) => {
        if (isSuperAdmin) return true;
        const creatorId = getRefId(project?.createdBy);
        if (String(creatorId) === String(userId)) return true;
        const investors = project?.investors || [];
        return investors.some((inv) => {
            const investorId = getRefId(inv?.user);
            return String(investorId) === String(userId);
        });
    });
    const getEmptyStateMessage = () => {
        if (userProjects.length === 0) {
            return 'Join a project to add and track your spendings';
        }
        if (selectedProject !== 'all' && selectedLedgerId && selectedSubLedger) {
            return 'No spendings found for the selected ledger and sub-ledger';
        }
        if (selectedProject === 'all') {
            return 'Your approved spendings will appear here';
        }
        return 'You haven\'t added any spendings in this project';
    };

    useEffect(() => {
        let isMounted = true;

        const loadLedgers = async () => {
            if (selectedProject === 'all') {
                setLedgers([]);
                setSelectedLedgerId('');
                setSelectedSubLedger('');
                setLedgerSearchQuery('');
                return;
            }

            try {
                setLedgersLoading(true);
                const result = await api.getLedgers(selectedProject);
                if (!isMounted) return;
                setLedgers(result || []);
                setSelectedLedgerId((previousLedgerId) => {
                    const hasSelectedLedger = (result || []).some(
                        (ledger) => String(ledger?.id || ledger?._id) === String(previousLedgerId) // NOSONAR
                    );
                    if (!hasSelectedLedger) {
                        setSelectedSubLedger('');
                        return '';
                    }
                    return previousLedgerId;
                });
            } catch (error) {
                console.error('Failed to load ledgers:', error);
                if (isMounted) {
                    setLedgers([]);
                    setSelectedLedgerId('');
                    setSelectedSubLedger('');
                }
            } finally {
                if (isMounted) setLedgersLoading(false);
            }
        };

        loadLedgers();

        return () => {
            isMounted = false;
        };
    }, [selectedProject]);

    useEffect(() => {
        setSelectedSubLedger('');
    }, [selectedLedgerId]);

    const loadTransactions = useCallback(async () => {
        if (!userId) return;

        // Get last 60 days of project expenses — single consolidated API call (no N+1)
        const now = new Date();
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - 60);
        const startStr = startDate.toISOString().split('T')[0];
        const endStr = now.toISOString().split('T')[0];

        try {
            // Fetch projects list for filter UI + consolidated expenses in parallel
            const [projects, expenseResult] = await Promise.all([
                api.getProjects(),
                api.getMyExpenses({
                    fromDate: startStr,
                    toDate: endStr,
                    projectId: selectedProject === 'all' ? undefined : selectedProject,
                    ledgerId: selectedLedgerId || undefined,
                    subLedger: selectedSubLedger || undefined,
                    limit: 200,
                }),
            ]);

            const accessibleProjects = (projects || []).filter((project) => {
                if (isSuperAdmin) return true;
                const creatorId = getRefId(project?.createdBy);
                if (String(creatorId) === String(userId)) return true;
                const investors = project?.investors || [];
                return investors.some((inv) => {
                    const investorId = getRefId(inv?.user);
                    return String(investorId) === String(userId);
                });
            });
            setAllProjects(accessibleProjects);

            // Backend already joins project names and populates fields
            const allExpenses = (expenseResult?.expenses || [])
                .map((expense) => {
                    const createdAt = expense.createdAt ? new Date(expense.createdAt) : null;
                    const fallbackDate = createdAt && !Number.isNaN(createdAt.getTime())
                        ? createdAt.toISOString().split('T')[0]
                        : endStr;
                    const fallbackTime = createdAt && !Number.isNaN(createdAt.getTime())
                        ? createdAt.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false })
                        : '';

                    const projectId = expense.project?._id || expense.project;
                    return {
                        ...expense,
                        id: expense.id || expense._id,
                        source: 'project',
                        projectId,
                        projectName: expense.projectName || expense.project?.name || 'Project',
                        ledgerId: expense.ledgerId || expense.ledger?._id || expense.ledger || null,
                        ledgerName: expense.detailDisplay?.ledgerName || expense.ledgerName || expense.ledger?.name || '',
                        subLedger: expense.detailDisplay?.subLedger || expense.subLedger || '',
                        note: expense.note || expense.description || '',
                        date: expense.date || fallbackDate,
                        time: expense.time || fallbackTime,
                        detailMode: expense.detailMode || '',
                        detailDisplay: expense.detailDisplay || null,
                        productName: expense.productName || '',
                        paidTo: expense.paidTo || {
                            person: expense.detailDisplay?.paidToPerson || expense.paidToPerson || '',
                            place: expense.detailDisplay?.paidToPlace || expense.paidToPlace || '',
                        },
                        materialType: expense.materialType || expense.detailDisplay?.productName || '',
                    };
                });

            setTransactions(allExpenses);

            const newSummary = {
                projectTotal: allExpenses.reduce((sum, expense) => sum + (expense.amount || 0), 0),
                categoryBreakdown: allExpenses.reduce((acc, expense) => {
                    const category = expense.category || 'other';
                    acc[category] = (acc[category] || 0) + (expense.amount || 0);
                    return acc;
                }, {})
            };
            setSummary(newSummary);
        } catch (error) {
            console.error('Failed to load expense transactions:', error);
            setTransactions([]);
            setSummary({ projectTotal: 0, categoryBreakdown: {} });
        }
    }, [isSuperAdmin, selectedLedgerId, selectedProject, selectedSubLedger, userId]);

    // Refresh data whenever screen comes into focus
    useFocusEffect(
        React.useCallback(() => {
            loadTransactions();
        }, [loadTransactions])
    );

    // Handle export
    const handleExport = async (format) => {
        let fileUri = null;
        try {
            if (!canDownloadExport) {
                Alert.alert('Select Ledger & Sub-Ledger', 'Choose a project, ledger, and sub-ledger with visible expenses before downloading.');
                return;
            }

            setExportLoading(true);

            const now = new Date();
            const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
            const today = now.toISOString().split('T')[0];

            const exportPayload = await api.exportExpenses(format, {
                fromDate: startOfMonth,
                toDate: today,
                projectId: selectedProject === 'all' ? undefined : selectedProject,
                ledgerId: selectedLedgerId || undefined,
                subLedger: selectedSubLedger || undefined,
            });

            const content = exportPayload?.content || '';
            const fileName = exportPayload?.filename || `expenses_${today}.${format}`;
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
                !shouldUseBase64 && format === 'csv' && !content.startsWith('\uFEFF')
                    ? `\uFEFF${content}`
                    : content;

            fileUri = await writeExportFile({
                fileName,
                content: writableContent,
                encoding: writeEncoding,
            });

            const didShare = await shareFileUri(fileUri, {
                dialogTitle: 'Export Expense History',
                mimeType,
            });

            if (!didShare) {
                Alert.alert(
                    'Export Complete',
                    `File saved successfully: ${fileName}`
                );
                setShowExportModal(false);
                return;
            }

            setShowExportModal(false);
        } catch (error) {
            console.error('Export failed:', error);
            const backendMessage = error?.response?.data?.message;
            Alert.alert(
                'Export Failed',
                backendMessage || error?.friendlyMessage || 'Could not export expenses. Please try again.'
            );
        } finally {
            await deleteExportFile(fileUri);
            setExportLoading(false);
        }
    };

    // Format date for display
    const formatDate = (dateStr) => {
        const date = new Date(dateStr);
        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);

        if (dateStr === today.toISOString().split('T')[0]) {
            return 'Today';
        } else if (dateStr === yesterday.toISOString().split('T')[0]) {
            return 'Yesterday';
        } else {
            const showYear = date.getFullYear() === today.getFullYear();
            return date.toLocaleDateString('en-IN', {
                day: 'numeric',
                month: 'short',
                year: showYear ? undefined : 'numeric'
            });
        }
    };

    // NEW: Convert 24-hour time to AM/PM format
    const formatTimeAMPM = (time24) => {
        if (!time24) return '';
        const [hours, minutes] = time24.split(':').map(Number);
        const period = hours >= 12 ? 'PM' : 'AM';
        const hours12 = hours % 12 || 12;
        return `${hours12}:${String(minutes).padStart(2, '0')} ${period}`;
    };

    // Filter transactions based on search query
    const filteredTransactions = transactions.filter(transaction => {
        if (!searchQuery.trim()) return true;
        const query = searchQuery.toLowerCase();
        const matchNote = (transaction.note || '').toLowerCase().includes(query);
        const matchCategory = (transaction.category || '').toLowerCase().includes(query);
        const matchProject = (transaction.projectName || '').toLowerCase().includes(query);
        const matchMaterial = (transaction.materialType || '').toLowerCase().includes(query);
        const matchDescription = (transaction.description || '').toLowerCase().includes(query);
        return matchNote || matchCategory || matchProject || matchMaterial || matchDescription;
    });

    // Group filtered transactions by date
    const groupedTransactions = filteredTransactions.reduce((groups, transaction) => {
        const date = transaction.date;
        if (!groups[date]) {
            groups[date] = [];
        }
        groups[date].push(transaction);
        return groups;
    }, {});
    const hasGroupedTransactions = Object.keys(groupedTransactions).length > 0;
    const hasLedgerScopedExpenses =
        selectedProject !== 'all' &&
        Boolean(selectedLedgerId) &&
        Boolean(selectedSubLedger) &&
        transactions.length > 0;
    const canDownloadExport = hasLedgerScopedExpenses && !exportLoading;

    const detailContext = React.useMemo(() => {
        if (!selectedTransaction) {
            return {
                resolvedLedgerName: '',
                resolvedSubLedgerName: '',
                showLedgerDetails: false,
                showSubLedgerDetails: false,
                showProductFallback: false,
                showServiceFallback: false,
                resolvedProductName: '',
                resolvedPaidToPerson: '',
                resolvedPaidToPlace: '',
            };
        }

        const resolvedLedgerName =
            selectedTransaction?.detailDisplay?.ledgerName ||
            selectedTransaction?.ledgerName ||
            selectedTransaction?.ledger?.name ||
            ledgers.find((ledger) => String(ledger?.id || ledger?._id) === String(selectedTransaction?.ledgerId))?.name ||
            '';

        const resolvedSubLedgerName = String(
            selectedTransaction?.detailDisplay?.subLedger || selectedTransaction?.subLedger || ''
        ).trim();

        const backendDetailMode = String(selectedTransaction?.detailMode || '').toLowerCase();
        const showLedgerDetails = backendDetailMode
            ? backendDetailMode === 'ledger'
            : Boolean(resolvedLedgerName || resolvedSubLedgerName || selectedTransaction?.ledgerId);

        const showSubLedgerDetails = Boolean(showLedgerDetails && resolvedSubLedgerName);
        const showCategoryFallbackUnderLedger = Boolean(showLedgerDetails && !resolvedSubLedgerName);

        const resolvedProductName = String(
            selectedTransaction?.detailDisplay?.productName ||
            selectedTransaction?.productName ||
            selectedTransaction?.materialType ||
            selectedTransaction?.subLedger ||
            ''
        ).trim();

        const resolvedPaidToPerson = String(
            selectedTransaction?.detailDisplay?.paidToPerson || selectedTransaction?.paidTo?.person || ''
        ).trim();
        const resolvedPaidToPlace = String(
            selectedTransaction?.detailDisplay?.paidToPlace || selectedTransaction?.paidTo?.place || ''
        ).trim();

        const showProductFallback =
            (showCategoryFallbackUnderLedger || !showLedgerDetails) &&
            (backendDetailMode === 'product' || selectedTransaction?.category === 'Product') &&
            Boolean(resolvedProductName);

        const showServiceFallback =
            (showCategoryFallbackUnderLedger || !showLedgerDetails) &&
            (backendDetailMode === 'service' || selectedTransaction?.category === 'Service');

        return {
            resolvedLedgerName,
            resolvedSubLedgerName,
            showLedgerDetails,
            showSubLedgerDetails,
            showProductFallback,
            showServiceFallback,
            resolvedProductName,
            resolvedPaidToPerson,
            resolvedPaidToPlace,
        };
    }, [selectedTransaction, ledgers]);

    // Render transaction card with improved layout
    const renderTransactionCard = (transaction) => {
        const icon = CATEGORY_ICONS[transaction.category] || CATEGORY_ICONS.other;
        const color = CATEGORY_COLORS[transaction.category] || CATEGORY_COLORS.other;
        const showMeta = visibleMetaId === transaction.id;

        return (
            <TouchableOpacity
                key={transaction.id}
                style={styles.transactionCard}
                onPress={() => setSelectedTransaction(transaction)}
                activeOpacity={0.7}
            >
                {/* Left: Icon */}
                <View style={[styles.transactionIcon, { backgroundColor: `${color}15` }]}>
                    <MaterialCommunityIcons name={icon} size={24} color={color} />
                </View>

                {/* Center: Details - Improved layout */}
                <View style={styles.transactionDetails}>
                    <View style={styles.transactionTitleRow}>
                        <Text style={styles.transactionTitle}>
                            {transaction.note || transaction.description || transaction.category}
                        </Text>
                        <TouchableOpacity
                            style={styles.infoBtnSmall}
                            onPress={(e) => {
                                e.stopPropagation();
                                toggleMeta(transaction.id);
                            }}
                            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                        >
                            <MaterialCommunityIcons
                                name={showMeta ? "information" : "information-outline"}
                                size={18}
                                color={theme.colors.primary}
                            />
                        </TouchableOpacity>
                    </View>

                    {showMeta && (
                        <Text style={styles.transactionMeta}>
                            {transaction.projectName} • {formatDate(transaction.date)} • {formatTimeAMPM(transaction.time)}
                        </Text>
                    )}
                </View>

                {/* Right: Amount - Made more prominent */}
                <View style={styles.transactionAmountContainer}>
                    <Text style={[styles.transactionAmount, styles.projectAmount]}>
                        -₹{transaction.amount.toLocaleString('en-IN')}
                    </Text>
                    <MaterialCommunityIcons
                        name="chevron-right"
                        size={16}
                        color={theme.colors.textTertiary}
                    />
                </View>
            </TouchableOpacity>
        );
    };

    // Render date section
    const renderDateSection = ([date, transactions]) => {
        const dayTotal = transactions.reduce((sum, t) => sum + t.amount, 0);

        return (
            <View key={date} style={styles.dateSection}>
                {/* Date Header */}
                <View style={styles.dateHeader}>
                    <Text style={styles.dateText}>{formatDate(date)}</Text>
                    <Text style={styles.dateTotalText}>₹{dayTotal.toLocaleString('en-IN')}</Text>
                </View>

                {/* Transactions */}
                <View style={styles.transactionsList}>
                    {transactions.map(renderTransactionCard)}
                </View>
            </View>
        );
    };

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <StatusBar barStyle="dark-content" backgroundColor={theme.colors.background} />

            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity
                    onPress={() => navigation.goBack()}
                    style={styles.backBtn}
                >
                    <MaterialCommunityIcons name="arrow-left" size={24} color={theme.colors.textPrimary} />
                </TouchableOpacity>

                <View style={styles.headerCenter}>
                    <Text style={styles.headerTitle}>My Spendings</Text>
                    <Text style={styles.headerSubtitle}>
                        {filteredTransactions.length} of my transactions
                    </Text>
                </View>

                <View style={styles.headerActions}>
                    <TouchableOpacity
                        style={[styles.searchBtn, showSearch && styles.searchBtnActive]}
                        onPress={() => {
                            setShowSearch(!showSearch);
                            if (showSearch) setSearchQuery('');
                        }}
                    >
                        <MaterialCommunityIcons
                            name={showSearch ? "close" : "magnify"}
                            size={20}
                            color={showSearch ? "#fff" : theme.colors.primary}
                        />
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.exportBtn, !canDownloadExport && styles.exportBtnDisabled]}
                        onPress={() => {
                            if (!hasLedgerScopedExpenses) {
                                Alert.alert(
                                    'Download Locked',
                                    'Select a project, ledger, and sub-ledger that has expenses to enable download.'
                                );
                                return;
                            }
                            setShowExportModal(true);
                        }}
                    >
                        <MaterialCommunityIcons
                            name="download"
                            size={20}
                            color={canDownloadExport ? theme.colors.primary : theme.colors.textTertiary}
                        />
                    </TouchableOpacity>
                </View>
            </View>

            {showSearch && (
                <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                    <LinearGradient
                        colors={['#F8FAFC', '#EEF2FF']}
                        style={styles.searchContainer}
                    >
                        <View style={styles.searchInputWrapper}>
                            <LinearGradient
                                colors={['#6366F1', '#8B5CF6']}
                                style={styles.searchIconGradient}
                            >
                                <MaterialCommunityIcons name="magnify" size={18} color="white" />
                            </LinearGradient>
                            <TextInput
                                style={styles.searchInput}
                                placeholder="Search products, categories, projects..."
                                placeholderTextColor={theme.colors.textTertiary}
                                value={searchQuery}
                                onChangeText={setSearchQuery}
                                autoFocus={true}
                                returnKeyType="search"
                                onSubmitEditing={Keyboard.dismiss}
                                clearButtonMode="while-editing"
                            />
                            {searchQuery.length > 0 && (
                                <TouchableOpacity
                                    style={styles.clearSearchBtn}
                                    onPress={() => setSearchQuery('')}
                                >
                                    <MaterialCommunityIcons name="close-circle" size={20} color={theme.colors.textTertiary} />
                                </TouchableOpacity>
                            )}
                        </View>
                        {searchQuery.length > 0 && (
                            <View style={styles.searchResultBadge}>
                                <MaterialCommunityIcons name="filter-check" size={14} color={theme.colors.primary} />
                                <Text style={styles.searchResultCount}>
                                    {filteredTransactions.length} result{filteredTransactions.length === 1 ? '' : 's'} found
                                </Text>
                            </View>
                        )}
                    </LinearGradient>
                </TouchableWithoutFeedback>
            )}

            <KeyboardAvoidingView
                style={{ flex: 1 }}
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
            >

                {!showSearch && (
                    <>
                        {/* Summary Cards - Project Focus */}
                        <View style={styles.summarySection}>
                            <LinearGradient
                                colors={['#6366F1', '#8B5CF6']}
                                style={styles.summaryCard}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 1 }}
                            >
                                <View style={styles.summaryCardContent}>
                                    <Text style={styles.summaryLabel}>My Spendings This Month</Text>
                                    <Text style={styles.summaryAmount}>
                                        ₹{(summary.projectTotal || 0).toLocaleString('en-IN')}
                                    </Text>
                                    <View style={styles.summaryBreakdown}>
                                        <View style={styles.summaryItem}>
                                            <View style={[styles.summaryDot, { backgroundColor: '#6366F1' }]} />
                                            <Text style={styles.summaryItemText}>
                                                Services: ₹{((summary.categoryBreakdown?.project_service || 0) + (summary.categoryBreakdown?.Service || 0)).toLocaleString('en-IN')}
                                            </Text>
                                        </View>
                                        <View style={styles.summaryItem}>
                                            <View style={[styles.summaryDot, { backgroundColor: '#10B981' }]} />
                                            <Text style={styles.summaryItemText}>
                                                Products: ₹{((summary.categoryBreakdown?.project_product || 0) + (summary.categoryBreakdown?.Product || 0)).toLocaleString('en-IN')}
                                            </Text>
                                        </View>
                                    </View>
                                </View>
                                <View style={styles.summaryIconContainer}>
                                    <MaterialCommunityIcons name="briefcase" size={48} color="rgba(255,255,255,0.2)" />
                                </View>
                            </LinearGradient>
                        </View>

                        {/* Project Filter Button (Hamburger Menu) */}
                        <TouchableOpacity
                            style={styles.filterButton}
                            onPress={() => setShowProjectFilter(true)}
                        >
                            <View style={styles.filterButtonContent}>
                                <MaterialCommunityIcons name="menu" size={24} color={theme.colors.primary} />
                                <View style={styles.filterButtonTextContainer}>
                                    <Text style={styles.filterButtonLabel}>Filter by Project</Text>
                                    <Text style={styles.filterButtonValue}>
                                        {selectedProject === 'all'
                                            ? 'All Projects'
                                            : userProjects.find((p) => String(getProjectKey(p)) === String(selectedProject))?.name || 'Select Project'}
                                    </Text>
                                </View>
                            </View>
                            <MaterialCommunityIcons name="chevron-down" size={24} color={theme.colors.textSecondary} />
                        </TouchableOpacity>

                        {selectedProject !== 'all' && (
                            <View style={styles.ledgerFilterCard}>
                                <Text style={styles.ledgerFilterTitle}>Ledger Filters</Text>

                                <View style={styles.ledgerSelectorRow}>
                                    <View style={styles.ledgerSelectorCol}>
                                        <Text style={styles.ledgerFilterLabel}>Ledger</Text>
                                        <TouchableOpacity
                                            style={styles.ledgerDropdownButton}
                                            onPress={() => setShowLedgerSelectModal(true)}
                                        >
                                            <Text
                                                style={[
                                                    styles.ledgerDropdownText,
                                                    !selectedLedgerId && styles.placeholderText,
                                                ]}
                                                numberOfLines={1}
                                            >
                                                {selectedLedger?.name || 'Select Ledger'}
                                            </Text>
                                            <MaterialCommunityIcons name="chevron-down" size={20} color={theme.colors.textSecondary} />
                                        </TouchableOpacity>
                                    </View>

                                    <View style={styles.ledgerSelectorCol}>
                                        <Text style={styles.ledgerFilterLabel}>Sub-Ledger</Text>
                                        <TouchableOpacity
                                            style={[styles.ledgerDropdownButton, !selectedLedgerId && styles.disabledInput]}
                                            onPress={() => {
                                                if (!selectedLedgerId) {
                                                    Alert.alert('Select Ledger', 'Please select a ledger first.');
                                                    return;
                                                }
                                                setShowSubLedgerSelectModal(true);
                                            }}
                                            disabled={!selectedLedgerId}
                                        >
                                            <Text
                                                style={[
                                                    styles.ledgerDropdownText,
                                                    !selectedSubLedger && styles.placeholderText,
                                                ]}
                                                numberOfLines={1}
                                            >
                                                {selectedSubLedger || 'Select Sub-Ledger'}
                                            </Text>
                                            <MaterialCommunityIcons
                                                name="chevron-down"
                                                size={20}
                                                color={selectedLedgerId ? theme.colors.textSecondary : theme.colors.border}
                                            />
                                        </TouchableOpacity>
                                    </View>
                                </View>

                                {!ledgersLoading && ledgers.length === 0 && (
                                    <Text style={styles.ledgerHintText}>No ledgers found for this project</Text>
                                )}
                            </View>
                        )}
                    </>
                )}

                {/* Project Filter Modal (Hamburger Menu) */}
                <Modal
                    visible={showProjectFilter}
                    transparent={true}
                    animationType="slide"
                    onRequestClose={() => setShowProjectFilter(false)}
                >
                    <TouchableWithoutFeedback onPress={() => setShowProjectFilter(false)}>
                        <View style={styles.filterModalOverlay}>
                            <TouchableWithoutFeedback onPress={(e) => e.stopPropagation()}>
                                <View style={styles.filterModalContent}>
                                    {/* Modal Header */}
                                    <View style={styles.filterModalHeader}>
                                        <View style={styles.handleBar} />
                                    </View>

                                    <View style={styles.filterModalBody}>
                                        {/* Title */}
                                        <View style={styles.filterModalTitleRow}>
                                            <LinearGradient
                                                colors={['#6366F1', '#8B5CF6']}
                                                style={styles.filterModalIcon}
                                            >
                                                <MaterialCommunityIcons name="filter-variant" size={28} color="white" />
                                            </LinearGradient>
                                            <View>
                                                <Text style={styles.filterModalTitle}>Select Project</Text>
                                                <Text style={styles.filterModalSubtitle}>View spendings by project</Text>
                                            </View>
                                        </View>

                                        {/* Filter Options */}
                                        <ScrollView style={styles.filterOptionsScroll} showsVerticalScrollIndicator={false}>
                                            {/* All Projects Option */}
                                            <TouchableOpacity
                                                style={[
                                                    styles.filterOption,
                                                    selectedProject === 'all' && styles.filterOptionActive
                                                ]}
                                                onPress={() => {
                                                    setSelectedProject('all');
                                                    setShowProjectFilter(false);
                                                }}
                                            >
                                                <View style={[
                                                    styles.filterOptionIconContainer,
                                                    selectedProject === 'all' && styles.filterOptionIconActive
                                                ]}>
                                                    <MaterialCommunityIcons
                                                        name="view-grid"
                                                        size={28}
                                                        color={selectedProject === 'all' ? 'white' : '#6366F1'}
                                                    />
                                                </View>
                                                <View style={styles.filterOptionContent}>
                                                    <Text style={[
                                                        styles.filterOptionLabel,
                                                        selectedProject === 'all' && styles.filterOptionLabelActive
                                                    ]}>
                                                        All Projects
                                                    </Text>
                                                    <Text style={styles.filterOptionDescription}>
                                                        View all your spendings
                                                    </Text>
                                                </View>
                                                {selectedProject === 'all' && (
                                                    <MaterialCommunityIcons name="check-circle" size={28} color="#10B981" />
                                                )}
                                            </TouchableOpacity>

                                            {/* Individual Project Options */}
                                            {userProjects.map(project => {
                                                const projectKey = getProjectKey(project);
                                                const investorCount = getProjectMemberCount(project);
                                                return (
                                                    <TouchableOpacity
                                                        key={projectKey}
                                                        style={[
                                                            styles.filterOption,
                                                            String(selectedProject) === String(projectKey) && styles.filterOptionActive
                                                        ]}
                                                        onPress={() => {
                                                            setSelectedProject(projectKey);
                                                            setShowProjectFilter(false);
                                                        }}
                                                    >
                                                        <View style={[
                                                            styles.filterOptionIconContainer,
                                                            String(selectedProject) === String(projectKey) && styles.filterOptionIconActive
                                                        ]}>
                                                            <MaterialCommunityIcons
                                                                name="briefcase"
                                                                size={28}
                                                                color={String(selectedProject) === String(projectKey) ? 'white' : '#6366F1'}
                                                            />
                                                        </View>
                                                        <View style={styles.filterOptionContent}>
                                                            <Text style={[
                                                                styles.filterOptionLabel,
                                                                String(selectedProject) === String(projectKey) && styles.filterOptionLabelActive
                                                            ]}>
                                                                {project.name}
                                                            </Text>
                                                            <Text style={styles.filterOptionDescription}>
                                                                {project.type} • {investorCount} investors
                                                            </Text>
                                                        </View>
                                                        {String(selectedProject) === String(projectKey) && (
                                                            <MaterialCommunityIcons name="check-circle" size={28} color="#10B981" />
                                                        )}
                                                    </TouchableOpacity>
                                                );
                                            })}
                                        </ScrollView>

                                        {/* Cancel Button */}
                                        <TouchableOpacity
                                            style={styles.filterCancelBtn}
                                            onPress={() => setShowProjectFilter(false)}
                                        >
                                            <Text style={styles.filterCancelText}>Cancel</Text>
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            </TouchableWithoutFeedback>
                        </View>
                    </TouchableWithoutFeedback>
                </Modal>

                <LedgerSelectModal
                    visible={showLedgerSelectModal}
                    onClose={() => setShowLedgerSelectModal(false)}
                    ledgers={ledgers}
                    searchQuery={ledgerSearchQuery}
                    onSearchChange={setLedgerSearchQuery}
                    isAdmin={false}
                    editMode={false}
                    onEditModeChange={() => { }}
                    newName=""
                    onNewNameChange={() => { }}
                    onAdd={() => { }}
                    onSelect={(ledger) => {
                        setSelectedLedgerId(ledger?.id || ledger?._id || '');
                        setSelectedSubLedger('');
                        setShowLedgerSelectModal(false);
                    }}
                    selectedId={selectedLedgerId}
                    onDelete={() => { }}
                />

                <SubLedgerSelectModal
                    visible={showSubLedgerSelectModal}
                    onClose={() => setShowSubLedgerSelectModal(false)}
                    selectedLedgerObj={selectedLedger}
                    isAdmin={false}
                    editMode={false}
                    onEditModeChange={() => { }}
                    newName=""
                    onNewNameChange={() => { }}
                    onAdd={() => { }}
                    onSelect={(subName) => {
                        setSelectedSubLedger(subName);
                        setShowSubLedgerSelectModal(false);
                    }}
                    selectedSubLedger={selectedSubLedger}
                    onDelete={() => { }}
                />

                {/* Transactions List */}
                <ScrollView
                    ref={scrollViewRef}
                    style={styles.scrollView}
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={false}
                >
                    {hasGroupedTransactions ? (
                        Object.entries(groupedTransactions)
                            .sort((a, b) => b[0].localeCompare(a[0]))
                            .map(renderDateSection)
                    ) : (
                        <View style={styles.emptyState}>
                            <MaterialCommunityIcons
                                name="receipt"
                                size={64}
                                color={theme.colors.textMuted}
                            />
                            <Text style={styles.emptyStateTitle}>No Spendings Yet</Text>
                            <Text style={styles.emptyStateText}>
                                {getEmptyStateMessage()}
                            </Text>
                        </View>
                    )}

                    <View style={{ height: 40 }} />
                </ScrollView>
            </KeyboardAvoidingView>

            {/* Transaction Detail Modal */}
            <Modal
                visible={selectedTransaction !== null}
                transparent={true}
                animationType="slide"
                onRequestClose={() => setSelectedTransaction(null)}
            >
                <TouchableWithoutFeedback onPress={() => setSelectedTransaction(null)}>
                    <View style={styles.detailModalOverlay}>
                        <TouchableWithoutFeedback onPress={(e) => e.stopPropagation()}>
                            <View style={styles.detailModalContent}>
                                <View style={styles.detailModalHandle}>
                                    <View style={styles.handleBar} />
                                </View>

                                {selectedTransaction && (
                                    <>
                                        <ScrollView
                                            showsVerticalScrollIndicator={false}
                                            contentContainerStyle={styles.detailScrollContent}
                                        >
                                            {/* Amount Header */}
                                            <View style={styles.detailHeader}>
                                                <View style={[
                                                    styles.detailIconLarge,
                                                    { backgroundColor: `${CATEGORY_COLORS[selectedTransaction.category] || CATEGORY_COLORS.other}15` }
                                                ]}>
                                                    <MaterialCommunityIcons
                                                        name={CATEGORY_ICONS[selectedTransaction.category] || CATEGORY_ICONS.other}
                                                        size={32}
                                                        color={CATEGORY_COLORS[selectedTransaction.category] || CATEGORY_COLORS.other}
                                                    />
                                                </View>
                                                <Text style={styles.detailAmount}>
                                                    ₹{selectedTransaction.amount.toLocaleString('en-IN')}
                                                </Text>
                                                <Text style={styles.detailDescription}>
                                                    {selectedTransaction.note || selectedTransaction.category}
                                                </Text>

                                            </View>

                                            {/* Details Section */}
                                            <View style={styles.detailSection}>
                                                <View style={styles.detailSectionHeader}>
                                                    <Text style={styles.detailSectionTitle}>Transaction Details</Text>
                                                    <Text style={styles.detailSectionTime}>
                                                        {formatTimeAMPM(selectedTransaction.time) || selectedTransaction.time || '—'}
                                                    </Text>
                                                </View>

                                                <View style={styles.detailRow}>
                                                    <Text style={styles.detailLabel}>Date</Text>
                                                    <Text style={styles.detailValue}>
                                                        {new Date(selectedTransaction.date).toLocaleDateString('en-IN', {
                                                            weekday: 'long',
                                                            day: 'numeric',
                                                            month: 'long',
                                                            year: 'numeric'
                                                        })}
                                                    </Text>
                                                </View>

                                                <View style={styles.detailRow}>
                                                    <Text style={styles.detailLabel}>Project</Text>
                                                    <Text style={[styles.detailValue, { color: '#6366F1' }]}>
                                                        {selectedTransaction.projectName}
                                                    </Text>
                                                </View>

                                                {detailContext.showLedgerDetails && detailContext.resolvedLedgerName ? (
                                                    <View style={styles.detailRow}>
                                                        <Text style={styles.detailLabel}>Ledger</Text>
                                                        <Text style={styles.detailValue}>{detailContext.resolvedLedgerName}</Text>
                                                    </View>
                                                ) : null}

                                                {detailContext.showSubLedgerDetails ? (
                                                    <View style={styles.detailRow}>
                                                        <Text style={styles.detailLabel}>Sub-Ledger</Text>
                                                        <Text style={styles.detailValue}>{detailContext.resolvedSubLedgerName}</Text>
                                                    </View>
                                                ) : null}

                                                {detailContext.showProductFallback ? (
                                                    <View style={styles.detailRow}>
                                                        <Text style={styles.detailLabel}>Product Name</Text>
                                                        <Text style={styles.detailValue}>{detailContext.resolvedProductName}</Text>
                                                    </View>
                                                ) : null}

                                                {detailContext.showServiceFallback && detailContext.resolvedPaidToPerson ? (
                                                    <View style={styles.detailRow}>
                                                        <Text style={styles.detailLabel}>Paid To</Text>
                                                        <Text style={styles.detailValue}>{detailContext.resolvedPaidToPerson}</Text>
                                                    </View>
                                                ) : null}

                                                {detailContext.showServiceFallback && detailContext.resolvedPaidToPlace ? (
                                                    <View style={styles.detailRow}>
                                                        <Text style={styles.detailLabel}>Place</Text>
                                                        <Text style={styles.detailValue}>{detailContext.resolvedPaidToPlace}</Text>
                                                    </View>
                                                ) : null}
                                            </View>

                                        </ScrollView>
                                        <View style={[styles.detailFooter, { paddingBottom: Math.max(insets.bottom + 12, 12) }]}>
                                            <TouchableOpacity
                                                style={styles.closeDetailBtnFooter}
                                                onPress={() => setSelectedTransaction(null)}
                                            >
                                                <Text style={styles.closeDetailBtnText}>Close</Text>
                                            </TouchableOpacity>
                                        </View>
                                    </>
                                )}
                            </View>
                        </TouchableWithoutFeedback>
                    </View>
                </TouchableWithoutFeedback>
            </Modal>

            {/* Export Modal */}
            <Modal
                visible={showExportModal}
                transparent={true}
                animationType="slide"
                onRequestClose={() => setShowExportModal(false)}
            >
                <TouchableWithoutFeedback onPress={() => setShowExportModal(false)}>
                    <View style={styles.exportModalOverlay}>
                        <TouchableWithoutFeedback onPress={(e) => e.stopPropagation()}>
                            <View style={styles.exportModalContent}>
                                <View style={styles.exportModalHeader}>
                                    <View style={styles.handleBar} />
                                </View>

                                <View style={styles.exportModalBody}>
                                    <View style={styles.exportModalTitleRow}>
                                        <LinearGradient
                                            colors={['#6366F1', '#8B5CF6']}
                                            style={styles.exportModalIcon}
                                        >
                                            <MaterialCommunityIcons name="download" size={24} color="white" />
                                        </LinearGradient>
                                        <View>
                                            <Text style={styles.exportModalTitle}>Export History</Text>
                                            <Text style={styles.exportModalSubtitle}>Download your expense data</Text>
                                        </View>
                                    </View>

                                    <View style={styles.exportOptions}>
                                        {EXPORT_FORMATS.map((format) => (
                                            <TouchableOpacity
                                                key={format.id}
                                                style={[
                                                    styles.exportOption,
                                                    (!hasLedgerScopedExpenses || exportLoading) && styles.exportOptionDisabled,
                                                ]}
                                                onPress={() => handleExport(format.id)}
                                                disabled={exportLoading || !hasLedgerScopedExpenses}
                                            >
                                                <View style={[styles.exportOptionIcon, { backgroundColor: `${format.color}15` }]}>
                                                    <MaterialCommunityIcons
                                                        name={format.icon}
                                                        size={24}
                                                        color={format.color}
                                                    />
                                                </View>
                                                <View style={styles.exportOptionContent}>
                                                    <Text style={styles.exportOptionLabel}>{format.label}</Text>
                                                    <Text style={styles.exportOptionDescription}>{format.description}</Text>
                                                </View>
                                                <MaterialCommunityIcons
                                                    name="chevron-right"
                                                    size={20}
                                                    color={theme.colors.textTertiary}
                                                />
                                            </TouchableOpacity>
                                        ))}
                                    </View>

                                    <View style={styles.exportInfo}>
                                        <MaterialCommunityIcons name="information-outline" size={16} color={theme.colors.textTertiary} />
                                        <Text style={styles.exportInfoText}>
                                            {hasLedgerScopedExpenses
                                                ? 'Download includes filtered project, ledger, and sub-ledger expenses for this month'
                                                : 'Select project, ledger, and sub-ledger with available expenses to enable download'}
                                        </Text>
                                    </View>

                                    <TouchableOpacity
                                        style={styles.exportCancelBtn}
                                        onPress={() => setShowExportModal(false)}
                                    >
                                        <Text style={styles.exportCancelText}>Cancel</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        </TouchableWithoutFeedback>
                    </View>
                </TouchableWithoutFeedback>
            </Modal>
        </SafeAreaView>
    );
}

// Helper function
const capitalizeFirst = (str) => {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1).replaceAll('_', ' ');
};

DailyExpensesScreen.propTypes = {
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

    // Header
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
    },
    backBtn: {
        width: 40,
        height: 40,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 12,
        backgroundColor: theme.colors.surfaceAlt,
    },
    headerCenter: {
        flex: 1,
        marginLeft: 14,
        marginRight: 14,
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: theme.colors.textPrimary,
    },
    headerSubtitle: {
        fontSize: 13,
        color: theme.colors.textSecondary,
        marginTop: 4,
    },
    exportBtn: {
        width: 44,
        height: 44,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 14,
        backgroundColor: theme.colors.primaryLight,
    },
    exportBtnDisabled: {
        backgroundColor: theme.colors.surfaceAlt,
    },
    // NEW: Header Actions Container
    headerActions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    // NEW: Search Button Styles
    searchBtn: {
        width: 44,
        height: 44,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 14,
        backgroundColor: theme.colors.primaryLight,
        shadowColor: theme.colors.primary,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 4,
        elevation: 3,
    },
    searchBtnActive: {
        backgroundColor: theme.colors.primary,
        shadowOpacity: 0.3,
    },
    // Enhanced Search Container Styles
    searchContainer: {
        paddingHorizontal: 16,
        paddingVertical: 16,
        borderBottomWidth: 0,
    },
    searchInputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'white',
        borderRadius: 16,
        paddingRight: 16,
        paddingVertical: 4,
        borderWidth: 2,
        borderColor: theme.colors.primary + '25',
        shadowColor: theme.colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
        elevation: 6,
    },
    searchIconGradient: {
        width: 40,
        height: 40,
        borderRadius: 12,
        marginLeft: 6,
        alignItems: 'center',
        justifyContent: 'center',
    },
    searchInput: {
        flex: 1,
        marginLeft: 12,
        fontSize: 15,
        fontWeight: '500',
        color: theme.colors.textPrimary,
        paddingVertical: 12,
    },
    clearSearchBtn: {
        padding: 4,
    },
    searchResultBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: theme.colors.primaryLight,
        alignSelf: 'center',
        paddingHorizontal: 14,
        paddingVertical: 6,
        borderRadius: 20,
        marginTop: 12,
        gap: 6,
    },
    searchResultCount: {
        fontSize: 12,
        fontWeight: '600',
        color: theme.colors.primary,
    },

    // Summary Section
    summarySection: {
        paddingHorizontal: 16,
        paddingTop: 8,
        paddingBottom: 16,
    },
    summaryCard: {
        borderRadius: 20,
        padding: 24,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        ...theme.shadows.glow,
    },
    summaryCardContent: {
        flex: 1,
    },
    summaryLabel: {
        fontSize: 14,
        fontWeight: '500',
        color: 'rgba(255,255,255,0.8)',
    },
    summaryAmount: {
        fontSize: 32,
        fontWeight: '700',
        color: 'white',
        marginTop: 6,
    },
    summaryBreakdown: {
        marginTop: 16,
        gap: 8,
    },
    summaryItem: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    summaryDot: {
        width: 10,
        height: 10,
        borderRadius: 5,
        marginRight: 10,
    },
    summaryItemText: {
        fontSize: 14,
        fontWeight: '500',
        color: 'rgba(255,255,255,0.9)',
    },
    summaryIconContainer: {
        justifyContent: 'center',
        alignItems: 'center',
    },

    // Filter Button (Hamburger Menu Trigger)
    filterButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: theme.colors.surface,
        marginHorizontal: 16,
        marginBottom: 16,
        padding: 16,
        borderRadius: 16,
        ...theme.shadows.soft,
    },
    filterButtonContent: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    filterButtonTextContainer: {
        flexDirection: 'column',
    },
    filterButtonLabel: {
        ...theme.typography.caption,
        color: theme.colors.textSecondary,
    },
    filterButtonValue: {
        ...theme.typography.bodySemibold,
        color: theme.colors.textPrimary,
        marginTop: 2,
    },

    // Filter Modal
    filterModalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'flex-end',
    },
    filterModalContent: {
        backgroundColor: theme.colors.surface,
        borderTopLeftRadius: 28,
        borderTopRightRadius: 28,
        maxHeight: '75%',
        ...theme.shadows.elevated,
    },
    filterModalHeader: {
        alignItems: 'center',
        paddingTop: 12,
        paddingBottom: 8,
    },
    filterModalBody: {
        padding: 20,
    },
    filterModalTitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 24,
        gap: 16,
    },
    filterModalIcon: {
        width: 56,
        height: 56,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
    },
    filterModalTitle: {
        ...theme.typography.h3,
        color: theme.colors.textPrimary,
    },
    filterModalSubtitle: {
        ...theme.typography.small,
        color: theme.colors.textSecondary,
        marginTop: 2,
    },
    filterOptionsScroll: {
        maxHeight: 350,
    },
    filterOption: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderRadius: 16,
        marginBottom: 12,
        backgroundColor: theme.colors.surfaceAlt,
        gap: 14,
    },
    filterOptionActive: {
        backgroundColor: '#EEF2FF',
        borderWidth: 2,
        borderColor: '#6366F1',
    },
    filterOptionIconContainer: {
        width: 56,
        height: 56,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#EEF2FF',
    },
    filterOptionIconActive: {
        backgroundColor: '#6366F1',
    },
    filterOptionContent: {
        flex: 1,
    },
    filterOptionLabel: {
        ...theme.typography.bodySemibold,
        fontSize: 17,
        color: theme.colors.textPrimary,
    },
    filterOptionLabelActive: {
        color: '#6366F1',
    },
    filterOptionDescription: {
        ...theme.typography.small,
        color: theme.colors.textSecondary,
        marginTop: 4,
    },
    filterCancelBtn: {
        alignItems: 'center',
        paddingVertical: 16,
        borderRadius: 14,
        backgroundColor: theme.colors.surfaceAlt,
        marginTop: 8,
    },
    filterCancelText: {
        ...theme.typography.bodySemibold,
        color: theme.colors.textSecondary,
    },

    ledgerFilterCard: {
        backgroundColor: theme.colors.surface,
        marginHorizontal: 16,
        marginBottom: 16,
        padding: 16,
        borderRadius: 16,
        ...theme.shadows.soft,
    },
    ledgerFilterTitle: {
        ...theme.typography.bodySemibold,
        color: theme.colors.textPrimary,
        marginBottom: 12,
    },
    ledgerSelectorRow: {
        flexDirection: 'row',
        gap: 12,
    },
    ledgerSelectorCol: {
        flex: 1,
    },
    ledgerFilterLabel: {
        ...theme.typography.caption,
        color: theme.colors.textSecondary,
        marginBottom: 8,
    },
    ledgerDropdownButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderRadius: 12,
        paddingHorizontal: 12,
        minHeight: 44,
        backgroundColor: theme.colors.surface,
    },
    ledgerDropdownText: {
        flex: 1,
        color: theme.colors.textPrimary,
    },
    ledgerHintText: {
        ...theme.typography.small,
        color: theme.colors.textTertiary,
        paddingVertical: 8,
    },
    placeholderText: {
        color: theme.colors.textTertiary,
    },
    disabledInput: {
        backgroundColor: theme.colors.surfaceAlt,
        borderColor: theme.colors.borderLight,
    },

    // Scroll View
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        paddingHorizontal: 16,
    },

    // Date Section
    dateSection: {
        marginBottom: 20,
    },
    dateHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
        paddingHorizontal: 6,
    },
    dateText: {
        fontSize: 15,
        fontWeight: '700',
        color: theme.colors.textPrimary,
    },
    dateTotalText: {
        fontSize: 14,
        fontWeight: '600',
        color: theme.colors.textSecondary,
    },
    transactionsList: {
        backgroundColor: theme.colors.surface,
        borderRadius: 20,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: theme.colors.border,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 8,
        elevation: 2,
    },

    // Enhanced Transaction Card
    transactionCard: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.borderLight,
        backgroundColor: 'transparent',
    },
    transactionIcon: {
        width: 44,
        height: 44,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
    },
    transactionDetails: {
        flex: 1,
        marginLeft: 12,
        marginRight: 10,
    },
    transactionTitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 6,
    },
    transactionTitle: {
        fontSize: 14,
        fontWeight: '700',
        color: theme.colors.textPrimary,
        flex: 1,
    },
    projectBadge: {
        width: 18,
        height: 18,
        borderRadius: 6,
        backgroundColor: '#EEF2FF',
        alignItems: 'center',
        justifyContent: 'center',
        marginLeft: 6,
    },
    infoBtnSmall: {
        marginLeft: 8,
        padding: 4,
    },
    transactionMeta: {
        fontSize: 11,
        color: theme.colors.textSecondary,
        lineHeight: 16,
        fontWeight: '500',
        marginTop: 2,
    },
    transactionAmountContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        flexShrink: 0,
    },
    transactionAmount: {
        fontSize: 15,
        fontWeight: '800',
        color: theme.colors.textPrimary,
        marginRight: 6,
    },
    projectAmount: {
        color: '#6366F1',
    },

    // Empty State
    emptyState: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 60,
    },
    emptyStateTitle: {
        ...theme.typography.h4,
        color: theme.colors.textSecondary,
        marginTop: 16,
    },
    emptyStateText: {
        ...theme.typography.body,
        color: theme.colors.textTertiary,
        textAlign: 'center',
        marginTop: 8,
        paddingHorizontal: 40,
    },

    // Detail Modal
    detailModalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        justifyContent: 'flex-end',
    },
    detailModalContent: {
        backgroundColor: theme.colors.surface,
        borderTopLeftRadius: 28,
        borderTopRightRadius: 28,
        maxHeight: '85%',
        minHeight: 400,
        ...theme.shadows.elevated,
    },
    detailModalHandle: {
        alignItems: 'center',
        paddingTop: 14,
        paddingBottom: 10,
    },
    detailScrollContent: {
        paddingBottom: 8,
    },
    handleBar: {
        width: 48,
        height: 5,
        backgroundColor: theme.colors.border,
        borderRadius: 3,
    },
    detailHeader: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 24,
        paddingHorizontal: 20,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.borderLight,
    },
    detailIconLarge: {
        width: 72,
        height: 72,
        borderRadius: 22,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 16,
    },
    detailAmount: {
        fontSize: 36,
        fontWeight: '700',
        color: theme.colors.textPrimary,
        textAlign: 'center',
    },
    detailDescription: {
        ...theme.typography.body,
        color: theme.colors.textSecondary,
        marginTop: 8,
        textAlign: 'center',
        paddingHorizontal: 20,
    },
    sourceBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        marginTop: 16,
        gap: 8,
    },
    personalSourceBadge: {
        backgroundColor: '#D1FAE5',
    },
    projectSourceBadge: {
        backgroundColor: '#EEF2FF',
    },
    sourceBadgeText: {
        fontSize: 14,
        fontWeight: '600',
    },
    detailSection: {
        paddingHorizontal: 20,
        paddingTop: 20,
        paddingBottom: 10,
    },
    detailSectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 16,
    },
    detailSectionTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: theme.colors.textPrimary,
    },
    detailSectionTime: {
        fontSize: 14,
        fontWeight: '600',
        color: theme.colors.textSecondary,
    },
    detailRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        paddingVertical: 14,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.borderLight,
        minHeight: 50,
    },
    detailLabel: {
        fontSize: 15,
        color: theme.colors.textSecondary,
        fontWeight: '500',
        minWidth: 100,
        flexShrink: 0,
    },
    detailValue: {
        fontSize: 15,
        fontWeight: '600',
        color: theme.colors.textPrimary,
        textAlign: 'right',
        flex: 1,
        marginLeft: 16,
        lineHeight: 22,
    },
    categoryBadgeSmall: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'flex-end',
        flex: 1,
        marginLeft: 16,
    },
    closeDetailBtn: {
        marginHorizontal: 20,
        marginTop: 16,
        marginBottom: 24,
        paddingVertical: 16,
        borderRadius: 14,
        backgroundColor: theme.colors.primary,
        alignItems: 'center',
        justifyContent: 'center',
    },
    closeDetailBtnText: {
        fontSize: 16,
        fontWeight: '600',
        color: 'white',
    },
    detailFooter: {
        paddingHorizontal: 20,
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: theme.colors.borderLight,
        backgroundColor: theme.colors.surface,
    },
    closeDetailBtnFooter: {
        paddingVertical: 16,
        borderRadius: 14,
        backgroundColor: theme.colors.primary,
        alignItems: 'center',
        justifyContent: 'center',
    },

    // Export Modal
    exportModalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'flex-end',
    },
    exportModalContent: {
        backgroundColor: theme.colors.surface,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        ...theme.shadows.elevated,
    },
    exportModalHeader: {
        alignItems: 'center',
        paddingTop: 12,
        paddingBottom: 8,
    },
    exportModalBody: {
        padding: 20,
    },
    exportModalTitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 20,
    },
    exportModalIcon: {
        width: 48,
        height: 48,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 14,
    },
    exportModalTitle: {
        ...theme.typography.h3,
        color: theme.colors.textPrimary,
    },
    exportModalSubtitle: {
        ...theme.typography.small,
        color: theme.colors.textTertiary,
        marginTop: 2,
    },
    exportOptions: {
        gap: 10,
        marginBottom: 16,
    },
    exportOption: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: theme.colors.surfaceAlt,
        borderRadius: theme.borderRadius.m,
        padding: 14,
    },
    exportOptionDisabled: {
        opacity: 0.55,
    },
    exportOptionIcon: {
        width: 44,
        height: 44,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 14,
    },
    exportOptionContent: {
        flex: 1,
    },
    exportOptionLabel: {
        ...theme.typography.bodySemibold,
        color: theme.colors.textPrimary,
    },
    exportOptionDescription: {
        ...theme.typography.caption,
        color: theme.colors.textTertiary,
        marginTop: 2,
    },
    exportInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: theme.colors.primaryLight,
        borderRadius: theme.borderRadius.s,
        padding: 12,
        marginBottom: 16,
        gap: 8,
    },
    exportInfoText: {
        ...theme.typography.small,
        color: theme.colors.primary,
        flex: 1,
    },
    exportCancelBtn: {
        alignItems: 'center',
        paddingVertical: 14,
        borderRadius: theme.borderRadius.m,
        borderWidth: 1,
        borderColor: theme.colors.border,
    },
    exportCancelText: {
        ...theme.typography.bodySemibold,
        color: theme.colors.textSecondary,
    },
});
