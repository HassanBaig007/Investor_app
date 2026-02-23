import React, { useState, useCallback, useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import {
    View,
    Text,
    ScrollView,
    SectionList,
    StyleSheet,
    TouchableOpacity,
    StatusBar,
    Alert,
    Share,
    Modal,
    Platform,
    Dimensions,
    Animated,
    TextInput,
    Vibration,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { theme } from '../../components/Theme';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import Ionicons from 'react-native-vector-icons/Ionicons';
import LinearGradient from 'react-native-linear-gradient';
import ProfileMenu from '../../components/ProfileMenu';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NotificationService from '../../services/notificationService';

import {
    getRelativeTime,
} from '../../utils/dateTimeUtils';

import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const FOOTER_TAB_IDS = ['home', 'projects', 'approvals', 'analytics', 'expenses'];
const DASHBOARD_MARKET_PRICE_CAP = 5;
const DASHBOARD_NEWS_CAP = 3;
const MODAL_MARKET_PRICE_INITIAL_CAP = 6;
// Calculate precise tab width for full-width footer
// Screen Width - PaddingHorizontal (8*2)
const TAB_WIDTH = (SCREEN_WIDTH - 16) / 5;

const getTrendColor = (trend) => {
    if (typeof trend !== 'string') return theme.colors.secondary;
    if (trend.startsWith('+')) return theme.colors.success;
    if (trend.startsWith('-')) return theme.colors.danger;
    return theme.colors.secondary;
};

const getRefId = (value) => {
    if (!value) return null;
    if (typeof value === 'string') return value;
    if (value._id) return String(value._id);
    if (value.id) return String(value.id);
    return null;
};

const getProjectMemberCount = (project) => {
    const creatorId = getRefId(project?.createdBy);
    const investorIds = (project?.investors || [])
        .map((inv) => getRefId(inv?.user))
        .filter(Boolean);
    return new Set([creatorId, ...investorIds].filter(Boolean)).size;
};

const getProjectStartDisplay = (project) => {
    const raw =
        project?.startDate ||
        project?.startedAt ||
        project?.startAt ||
        project?.createdAt ||
        null;

    if (!raw) return 'N/A';
    const parsed = new Date(raw);
    if (Number.isNaN(parsed.getTime())) return String(raw);

    return parsed.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
    });
};

const asArray = (value) => (Array.isArray(value) ? value : []);
const getMarketItemId = (item) => item?._id || item?.id;

export default function InvestorDashboard({ navigation, onLogout }) {
    const { user: currentUser } = useAuth();
    const currentUserName = currentUser?.name || 'Investor';
    const [activeTab, setActiveTab] = useState('home');
    const tabAnimationsRef = React.useRef(
        FOOTER_TAB_IDS.reduce((acc, tabId) => {
            acc[tabId] = new Animated.Value(tabId === 'home' ? 1 : 0);
            return acc;
        }, {})
    );

    // Get safe area insets for proper Android navigation bar handling
    const insets = useSafeAreaInsets();

    // State for expanded project menu
    const [expandedProject, setExpandedProject] = useState(null);

    // State for profile menu
    const [showProfileMenu, setShowProfileMenu] = useState(false);
    const [showInvitationsModal, setShowInvitationsModal] = useState(false);
    // State for news modal
    const [showNewsModal, setShowNewsModal] = useState(false);
    // Local state for first-time user info modal (persisted with AsyncStorage)
    const [showInfoModal, setShowInfoModal] = useState(false);

    // API-driven state
    const [projects, setProjects] = useState([]);
    const [notifications, setNotifications] = useState([]);

    // Check if user has seen the welcome modal before (on mount)
    useEffect(() => {
        const checkWelcome = async () => {
            if (!currentUser?.id) return;
            try {
                const key = `splitflow_welcome_shown_${currentUser?.id}`;
                const hasSeenWelcome = await AsyncStorage.getItem(key);
                if (hasSeenWelcome !== 'true') {
                    // First time user - show the modal
                    setShowInfoModal(true);
                }
            } catch (error) {
                console.log('Error checking first-time user:', error);
            }
        };
        if (currentUser?.id) {
            checkWelcome();
        }
    }, [currentUser?.id]);

    // Dismiss the info modal and save state so it never shows again
    const dismissInfoModal = async () => {
        setShowInfoModal(false);
        try {
            const key = `splitflow_welcome_shown_${currentUser?.id}`;
            await AsyncStorage.setItem(key, 'true');
        } catch (error) {
            console.log('Error saving welcome modal state:', error);
        }
    };

    // Ref to prevent double navigation
    const isNavigatingRef = React.useRef(false);

    // State for pending approvals - this will refresh on focus
    const [pendingApprovals, setPendingApprovals] = useState([]);

    // Market prices & news fetched from backend
    const [marketPrices, setMarketPrices] = useState([]);
    const [newsItems, setNewsItems] = useState([]);
    const [marketPricesModalCap, setMarketPricesModalCap] = useState(MODAL_MARKET_PRICE_INITIAL_CAP);
    const [isMarketEditMode, setIsMarketEditMode] = useState(false);

    const [editingPrice, setEditingPrice] = useState(null);
    const [editingPriceForm, setEditingPriceForm] = useState({
        name: '',
        price: '',
        trend: '',
        icon: '',
        color: '',
        positive: true,
    });
    const [savingPrice, setSavingPrice] = useState(false);

    const [editingNews, setEditingNews] = useState(null);
    const [editingNewsForm, setEditingNewsForm] = useState({
        title: '',
        time: '',
        category: '',
        description: '',
        trend: '',
    });
    const [savingNews, setSavingNews] = useState(false);

    useEffect(() => {
        FOOTER_TAB_IDS.forEach((tabId) => {
            const toValue = activeTab === tabId ? 1 : 0;
            Animated.spring(tabAnimationsRef.current[tabId], {
                toValue,
                friction: 8,
                tension: 90,
                useNativeDriver: true,
            }).start();
        });
    }, [activeTab]);

    const enrichProjectsWithSpendings = useCallback(async (projectsList) => {
        const safeProjectsList = asArray(projectsList).filter(Boolean);
        const projectIds = safeProjectsList.map((p) => p?._id || p?.id).filter(Boolean);
        const bulkResult = await api.getBulkSpendingSummary(projectIds).catch(() => ({ summaries: [] }));
        const summaryMap = new Map((bulkResult?.summaries || []).map((s) => [String(s.projectId), s]));

        return safeProjectsList.map((proj) => {
            const projectId = String(proj._id || proj.id || '');
            const summary = summaryMap.get(projectId) || null;
            return {
                ...proj,
                _spendingSummary: summary,
                spendings: [],
                pendingSpendings: [],
            };
        });
    }, []);

    const fetchDashboardData = useCallback(async () => {
        // Fetch market data & news independently (non-blocking, always runs)
        Promise.all([
            api.getMarketPrices().catch(() => []),
            api.getNews().catch(() => []),
        ]).then(([prices, news]) => {
            setMarketPrices(asArray(prices).filter(Boolean));
            setNewsItems(asArray(news).filter(Boolean));
        });

        try {
            const [projectsData, notificationsData, modificationsData, pendingSpendingApprovals] = await Promise.all([
                api.getProjects().catch(() => []),
                api.getNotifications().catch(() => []),
                api.getModifications().catch(() => []),
                api.getMyPendingApprovals().catch(() => ({ approvals: [] })),
            ]);

            // Fetch spendings for each project to compute totals
            const enrichedProjects = await enrichProjectsWithSpendings(asArray(projectsData));

            setProjects(asArray(enrichedProjects).filter(Boolean));
            setNotifications(asArray(notificationsData).filter(Boolean));

            // Calculate pending approvals from API data
            const isSuperAdmin = currentUser?.role === 'super_admin';
            const pendingMods = asArray(modificationsData).filter((m) => m?.status === 'pending');
            const pendingModificationApprovals = isSuperAdmin
                ? pendingMods
                : pendingMods.filter(m => {
                    const userId = currentUser?.id || currentUser?._id;
                    const votesMap = m.votesMap || {};
                    return !votesMap[userId];
                });

            const spendingApprovals = asArray(pendingSpendingApprovals?.approvals).filter(Boolean);

            const normalizedModificationApprovals = (pendingModificationApprovals || []).map((m) => ({
                ...m,
                type: m.type || 'modification',
                title: m.title || 'Pending Modification Approval',
                projectName: m.projectName || 'Project',
                proposedAt: m.proposedAt || m.createdAt || m.updatedAt,
            }));

            setPendingApprovals([
                ...normalizedModificationApprovals,
                ...spendingApprovals,
            ]);
        } catch (err) {
            console.error('Failed to load dashboard data:', err);
        }
    }, [currentUser, enrichProjectsWithSpendings]);

    // Refresh data when screen comes into focus
    useFocusEffect(
        useCallback(() => {
            // Reset navigation guard
            isNavigatingRef.current = false;
            fetchDashboardData();
        }, [fetchDashboardData])
    );

    // Data
    // Check for Super Admin Role
    const isSuperAdmin = currentUser?.role === 'super_admin';
    const safeProjects = asArray(projects).filter(Boolean);

    // Data - If Super Admin, show ALL projects
    const myProjects = isSuperAdmin ? safeProjects : safeProjects.filter((p) => {
        const userId = currentUser?.id || currentUser?._id;
        const creatorId = p?.createdBy?._id || p?.createdBy;
        const isInvestor = asArray(p?.investors).some((inv) => {
            const invUserId = inv?.user?._id || inv?.user;
            return invUserId === userId;
        });
        return creatorId === userId || isInvestor;
    });

    const myCreatedProjects = safeProjects.filter((p) => {
        const creatorId = p?.createdBy?._id || p?.createdBy;
        return creatorId === (currentUser?.id || currentUser?._id);
    });

    const handleProfilePress = () => {
        setShowProfileMenu(true);
    };

    const openNewsModal = () => {
        setMarketPricesModalCap(MODAL_MARKET_PRICE_INITIAL_CAP);
        setIsMarketEditMode(false);
        setShowNewsModal(true);
    };

    const closeNewsModal = () => {
        setShowNewsModal(false);
        setIsMarketEditMode(false);
    };

    const openEditPriceModal = (item) => {
        setEditingPrice(item);
        setEditingPriceForm({
            name: item?.name || '',
            price: item?.price || '',
            trend: item?.trend || '',
            icon: item?.icon || 'finance',
            color: item?.color || '#5B5CFF',
            positive: Boolean(item?.positive),
        });
    };

    const closeEditPriceModal = () => {
        setEditingPrice(null);
        setSavingPrice(false);
    };

    const openEditNewsModal = (item) => {
        setEditingNews(item);
        setEditingNewsForm({
            title: item?.title || '',
            time: item?.time || '',
            category: item?.category || '',
            description: item?.description || '',
            trend: item?.trend || '',
        });
    };

    const closeEditNewsModal = () => {
        setEditingNews(null);
        setSavingNews(false);
    };

    const saveMarketPriceEdit = async () => {
        const priceId = getMarketItemId(editingPrice);
        if (!priceId) {
            Alert.alert('Error', 'Invalid market price item.');
            return;
        }
        if (!editingPriceForm.name || !editingPriceForm.price || !editingPriceForm.trend) {
            Alert.alert('Validation', 'Name, price, and trend are required.');
            return;
        }

        try {
            setSavingPrice(true);
            const updated = await api.updateMarketPrice(priceId, editingPriceForm);
            setMarketPrices((prev) => asArray(prev).map((item) => (
                String(getMarketItemId(item)) === String(priceId) ? { ...item, ...updated } : item
            )));
            closeEditPriceModal();
            Alert.alert('Success', 'Market price updated.');
        } catch (error) {
            Alert.alert('Error', error?.response?.data?.message || 'Failed to update market price.');
            setSavingPrice(false);
        }
    };

    const saveNewsEdit = async () => {
        const newsId = getMarketItemId(editingNews);
        if (!newsId) {
            Alert.alert('Error', 'Invalid news item.');
            return;
        }
        if (!editingNewsForm.title || !editingNewsForm.category || !editingNewsForm.time) {
            Alert.alert('Validation', 'Title, category, and time are required.');
            return;
        }

        try {
            setSavingNews(true);
            const updated = await api.updateMarketNewsItem(newsId, editingNewsForm);
            setNewsItems((prev) => asArray(prev).map((item) => (
                String(getMarketItemId(item)) === String(newsId) ? { ...item, ...updated } : item
            )));
            closeEditNewsModal();
            Alert.alert('Success', 'News item updated.');
        } catch (error) {
            Alert.alert('Error', error?.response?.data?.message || 'Failed to update news item.');
            setSavingNews(false);
        }
    };

    // Calculate pending invitations
    const myInvitations = safeProjects.flatMap((p) =>
        asArray(p?.pendingInvitations)
            .filter((inv) => {
                if (!inv) return false;
                const invUserId = inv.userId?._id || inv.userId?.id || inv.userId;
                return String(invUserId) === String(currentUser?.id || currentUser?._id);
            })
            .map((inv) => ({ ...inv, project: p }))
    );

    const handleInviteFriends = async () => {
        try {
            await Share.share({
                message: 'Join me on SplitFlow - the easiest way to manage project expenses with your team! Download now: https://splitflow.app',
                title: 'Invite to SplitFlow',
            });
        } catch (error) {
            console.error('Could not open share dialog:', error);
            Alert.alert('Error', 'Could not open share dialog');
        }
    };

    const handleAcceptInvitation = async (invitation) => {
        try {
            const projectId = invitation.project?._id || invitation.project?.id;
            await api.acceptInvitation(projectId);
            NotificationService.notifyMemberAdded(currentUser.name, invitation.project?.name);
            Alert.alert('🎉 Welcome!', `You have joined ${invitation.project?.name}`);

            // Reload dashboard data live so the new project shows up instantly
            await fetchDashboardData();
        } catch (err) {
            console.error('Accept invitation failed:', err);
            Alert.alert('Error', err.response?.data?.message || 'Failed to accept invitation.');
        }
    };

    const handleDeclineInvitation = async (invitation) => {
        try {
            const projectId = invitation.project?._id || invitation.project?.id;
            await api.declineInvitation(projectId);
            Alert.alert('Declined', 'Invitation declined.');

            // Refetch live from backend to ensure state consistency
            await fetchDashboardData();
        } catch (err) {
            console.error('Decline invitation failed:', err);
            Alert.alert('Error', err.response?.data?.message || 'Failed to decline invitation.');
        }
    };

    // Project item - Account Book Style with Expandable Menu
    const renderProjectItem = (project, index = 0) => {
        const investorCount = getProjectMemberCount(project);
        const creatorId = project.createdBy?._id || project.createdBy;
        const projectId = getRefId(project);
        const projectKey = projectId || `${project?.name || 'project'}-${index}`;
        const isCreator = creatorId === (currentUser?.id || currentUser?._id);
        const isExpanded = expandedProject === projectKey;

        const summary = project._spendingSummary || {};
        const totalSpent = Number(summary.approvedSpent || 0);
        const pendingCount = Number(summary.pendingCount || 0);
        const totalTransactions = Number(summary.spendingCount || 0);

        // Get creator info from populated investors array
        const creatorInvestor = project.investors?.find(inv => {
            const invUserId = inv.user?._id || inv.user;
            return invUserId === creatorId;
        });
        const creatorInfo = creatorInvestor?.user || { name: 'Unknown' };

        return (
            <View key={projectKey} style={styles.projectCardWrapper}>
                <TouchableOpacity
                    style={[styles.projectCard, isExpanded && styles.projectCardExpanded]}
                    onPress={() => {
                        // Only navigate if menu is NOT expanded and not already navigating
                        if (!isExpanded && !isNavigatingRef.current) {
                            if (!projectId) {
                                Alert.alert('Project unavailable', 'Project ID is missing for this item. Please refresh and try again.');
                                return;
                            }
                            isNavigatingRef.current = true;
                            navigation.navigate('ProjectDetail', { projectId });
                            setTimeout(() => { isNavigatingRef.current = false; }, 500);
                        }
                    }}
                    activeOpacity={0.7}
                >
                    {/* Top Row - Project Info */}
                    <View style={styles.projectCardTop}>
                        <View style={[styles.projectIconBox, { backgroundColor: isCreator ? '#FFF3E0' : '#E8E8FF' }]}>
                            <MaterialCommunityIcons
                                name="book-open-page-variant"
                                size={22}
                                color={isCreator ? '#FF9500' : '#5B5CFF'}
                            />
                        </View>
                        <View style={styles.projectCardContent}>
                            <Text style={styles.projectCardTitle} numberOfLines={1}>{project.name}</Text>
                            <View style={styles.projectCardMeta}>
                                <MaterialCommunityIcons name="account-group-outline" size={12} color={theme.colors.textTertiary} />
                                <Text style={styles.projectCardSubtitle}>{investorCount} members</Text>
                            </View>
                        </View>
                        {isCreator && (
                            <View style={styles.adminChip}>
                                <MaterialCommunityIcons name="crown" size={14} color="#FF9500" />
                            </View>
                        )}
                        {/* Hamburger Menu Button */}
                        <TouchableOpacity
                            style={styles.hamburgerBtn}
                            onPress={(e) => {
                                e.stopPropagation();
                                setExpandedProject(isExpanded ? null : projectKey);
                            }}
                        >
                            <MaterialCommunityIcons
                                name={isExpanded ? "chevron-up" : "menu"}
                                size={22}
                                color={theme.colors.textSecondary}
                            />
                        </TouchableOpacity>
                    </View>

                    {/* Ledger Line */}
                    <View style={styles.projectLedgerLine} />

                    {/* Bottom Row - Spending Summary */}
                    <View style={styles.projectCardBottom}>
                        <View style={styles.spendingSummary}>
                            <Text style={styles.spendingLabel}>Total Spent</Text>
                            <Text style={styles.spendingAmount}>₹{totalSpent.toLocaleString()}</Text>
                        </View>
                        {pendingCount > 0 && (
                            <View style={styles.pendingIndicator}>
                                <MaterialCommunityIcons name="clock-outline" size={14} color="#FFB300" />
                                <Text style={styles.pendingIndicatorText}>{pendingCount} pending</Text>
                            </View>
                        )}
                        <MaterialCommunityIcons name="chevron-right" size={20} color={theme.colors.textTertiary} />
                    </View>
                </TouchableOpacity>

                {/* ========== EXPANDABLE METADATA SECTION ========== */}
                {isExpanded && (
                    <View style={styles.metadataSection}>
                        {/* Header with Close Button */}
                        <View style={styles.metadataHeaderRow}>
                            <View style={styles.metadataHeader}>
                                <MaterialCommunityIcons name="information-outline" size={18} color={theme.colors.primary} />
                                <Text style={styles.metadataHeaderTitle}>Project Overview</Text>
                            </View>
                            <TouchableOpacity
                                style={styles.closeMenuBtn}
                                onPress={() => setExpandedProject(null)}
                            >
                                <MaterialCommunityIcons name="close" size={20} color={theme.colors.textSecondary} />
                            </TouchableOpacity>
                        </View>

                        {/* Metadata Grid */}
                        <View style={styles.metadataGrid}>
                            <View style={styles.metadataItem}>
                                <MaterialCommunityIcons name="folder-outline" size={16} color={theme.colors.textTertiary} />
                                <Text style={styles.metadataLabel}>Type</Text>
                                <Text style={styles.metadataValue}>{project.type || 'General'}</Text>
                            </View>
                            <View style={styles.metadataItem}>
                                <MaterialCommunityIcons name="check-circle-outline" size={16} color="#00C853" />
                                <Text style={styles.metadataLabel}>Status</Text>
                                <Text style={[styles.metadataValue, { color: '#00C853' }]}>{project.status || 'Active'}</Text>
                            </View>
                            <View style={styles.metadataItem}>
                                <MaterialCommunityIcons name="calendar-outline" size={16} color={theme.colors.textTertiary} />
                                <Text style={styles.metadataLabel}>Started</Text>
                                <Text style={styles.metadataValue}>{getProjectStartDisplay(project)}</Text>
                            </View>
                            <View style={styles.metadataItem}>
                                <MaterialCommunityIcons name="receipt" size={16} color={theme.colors.textTertiary} />
                                <Text style={styles.metadataLabel}>Entries</Text>
                                <Text style={styles.metadataValue}>{totalTransactions}</Text>
                            </View>
                        </View>

                        {/* Divider */}
                        <View style={styles.metadataDivider} />

                        {/* Creator Info */}
                        <View style={styles.creatorRow}>
                            <MaterialCommunityIcons name="account-star" size={18} color="#F59E0B" />
                            <Text style={styles.creatorLabel}>Created by</Text>
                            <Text style={styles.creatorValue}>{creatorInfo?.name || 'Unknown'}</Text>
                        </View>

                        {/* Quick Summary Stats */}
                        <View style={styles.quickSummaryRow}>
                            <View style={styles.quickSummaryItem}>
                                <LinearGradient
                                    colors={['#5B5CFF', '#7C3AED']}
                                    style={styles.quickSummaryIcon}
                                >
                                    <MaterialCommunityIcons name="account-group" size={16} color="white" />
                                </LinearGradient>
                                <View>
                                    <Text style={styles.quickSummaryValue}>{investorCount}</Text>
                                    <Text style={styles.quickSummaryLabel}>Members</Text>
                                </View>
                            </View>
                            <View style={styles.quickSummaryItem}>
                                <LinearGradient
                                    colors={['#10B981', '#059669']}
                                    style={styles.quickSummaryIcon}
                                >
                                    <MaterialCommunityIcons name="currency-inr" size={16} color="white" />
                                </LinearGradient>
                                <View>
                                    <Text style={styles.quickSummaryValue}>₹{totalSpent.toLocaleString()}</Text>
                                    <Text style={styles.quickSummaryLabel}>Total Spent</Text>
                                </View>
                            </View>
                        </View>

                        {/* Divider */}
                        <View style={styles.metadataDivider} />

                        {/* Quick Actions */}
                        <View style={styles.quickActionsRow}>
                            <TouchableOpacity
                                style={styles.quickActionBtn}
                                onPress={(e) => {
                                    e.stopPropagation();
                                    // Prevent double navigation
                                    if (isNavigatingRef.current) return;
                                    if (!projectId) {
                                        Alert.alert('Project unavailable', 'Project ID is missing for this item. Please refresh and try again.');
                                        return;
                                    }
                                    isNavigatingRef.current = true;
                                    setExpandedProject(null);
                                    navigation.navigate('ProjectDetail', {
                                        projectId,
                                        viewMode: 'details'
                                    });
                                    // Reset after navigation
                                    setTimeout(() => { isNavigatingRef.current = false; }, 500);
                                }}
                            >
                                <MaterialCommunityIcons name="eye-outline" size={18} color={theme.colors.primary} />
                                <Text style={styles.quickActionText}>View Details</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.quickActionBtn, styles.quickActionBtnPrimary]}
                                onPress={(e) => {
                                    e.stopPropagation();
                                    // Prevent double navigation
                                    if (isNavigatingRef.current) return;
                                    if (!projectId) {
                                        Alert.alert('Project unavailable', 'Project ID is missing for this item. Please refresh and try again.');
                                        return;
                                    }
                                    isNavigatingRef.current = true;
                                    setExpandedProject(null);
                                    navigation.navigate('ProjectDetail', {
                                        projectId,
                                        focusOnAdd: true
                                    });
                                    // Reset after navigation
                                    setTimeout(() => { isNavigatingRef.current = false; }, 500);
                                }}
                            >
                                <MaterialCommunityIcons name="plus" size={18} color="white" />
                                <Text style={styles.quickActionTextPrimary}>Add Spending</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                )}
            </View>
        );
    };

    // Render content based on active tab
    const renderContent = () => {
        switch (activeTab) {
            case 'home':
                return (
                    <>


                        {/* Pending Approvals Section - HIGHLIGHTED */}
                        {pendingApprovals.length > 0 ? (
                            <View style={styles.approvalsSection}>
                                {/* Highlighted Header with Gradient */}
                                <LinearGradient
                                    colors={['#FEF3C7', '#FDE68A']}
                                    style={styles.approvalsSectionHighlight}
                                >
                                    <View style={styles.approvalsHeaderRow}>
                                        <View style={styles.approvalsHeaderLeft}>
                                            <View style={styles.pulsingDot} />
                                            <Text style={styles.approvalsHeaderTitle}>🔔 Action Required</Text>
                                        </View>
                                        <View style={styles.pendingBadgeLarge}>
                                            <Text style={styles.pendingBadgeLargeText}>{pendingApprovals.length}</Text>
                                        </View>
                                    </View>
                                    <Text style={styles.approvalsHeaderSubtitle}>
                                        You have {pendingApprovals.length} pending approval{pendingApprovals.length > 1 ? 's' : ''} waiting for your review
                                    </Text>
                                </LinearGradient>

                                {pendingApprovals.slice(0, 3).map((approval, index) => (
                                    <TouchableOpacity
                                        key={approval.id || approval._id || `${approval.projectName || 'approval'}-${index}`}
                                        style={styles.approvalCardHighlighted}
                                        onPress={() => {
                                            if (approval.type === 'spending') {
                                                navigation.navigate('ProjectDetail', { projectId: approval.projectId });
                                                return;
                                            }
                                            navigation.navigate('ProjectApprovalDetail', { modificationId: approval.id });
                                        }}
                                    >
                                        <View style={styles.approvalIconHighlighted}>
                                            <MaterialCommunityIcons
                                                name={approval.type === 'spending' ? 'cash-plus' : 'alert-circle'}
                                                size={22}
                                                color="#F59E0B"
                                            />
                                        </View>
                                        <View style={styles.approvalContent}>
                                            <Text style={styles.approvalTitle} numberOfLines={1}>{approval.title}</Text>
                                            <Text style={styles.approvalMeta} numberOfLines={1}>
                                                {approval.projectName} • {getRelativeTime(approval.proposedAt)}
                                            </Text>
                                        </View>
                                        <View style={styles.reviewNowBadge}>
                                            <Text style={styles.reviewNowText}>Review</Text>
                                            <MaterialCommunityIcons name="chevron-right" size={14} color="#F59E0B" />
                                        </View>
                                    </TouchableOpacity>
                                ))}
                                {pendingApprovals.length > 3 && (
                                    <TouchableOpacity
                                        style={styles.viewAllBtn}
                                        onPress={() => setActiveTab('approvals')}
                                    >
                                        <Text style={styles.viewAllText}>View All Approvals</Text>
                                        <MaterialCommunityIcons name="arrow-right" size={16} color={theme.colors.primary} />
                                    </TouchableOpacity>
                                )}
                            </View>
                        ) : (
                            /* ✅ No Actions Pending - SUCCESS STATE */
                            <View style={styles.approvalsSection}>
                                <LinearGradient
                                    colors={['#D1FAE5', '#A7F3D0']}
                                    style={styles.noActionsSectionHighlight}
                                >
                                    <View style={styles.noActionsContent}>
                                        <View style={styles.noActionsIconContainer}>
                                            <LinearGradient
                                                colors={['#10B981', '#059669']}
                                                style={styles.noActionsIconGradient}
                                            >
                                                <MaterialCommunityIcons name="check-circle" size={32} color="white" />
                                            </LinearGradient>
                                        </View>
                                        <View style={styles.noActionsTextContainer}>
                                            <Text style={styles.noActionsTitle}>✨ All Caught Up!</Text>
                                            <Text style={styles.noActionsSubtitle}>
                                                No pending actions. You're all set!
                                            </Text>
                                        </View>
                                    </View>
                                    <View style={styles.noActionsBadge}>
                                        <MaterialCommunityIcons name="shield-check" size={16} color="#059669" />
                                        <Text style={styles.noActionsBadgeText}>0 Pending</Text>
                                    </View>
                                </LinearGradient>
                            </View>
                        )}

                        {/* Project Invitations Section */}
                        {myInvitations.length > 0 && (
                            <View style={styles.invitationsSection}>
                                <LinearGradient
                                    colors={['#EEF2FF', '#E0E7FF']}
                                    style={styles.invitationsHeader}
                                >
                                    <View style={styles.sectionHeaderRow}>
                                        <MaterialCommunityIcons name="email-fast-outline" size={20} color="#5B5CFF" />
                                        <Text style={styles.invitationsTitle}>Project Invitations ({myInvitations.length})</Text>
                                    </View>
                                </LinearGradient>
                                {myInvitations.slice(0, 1).map((invitation, index) => (
                                    <View key={invitation.id || invitation._id || `${invitation.project?.name || 'invitation'}-${index}`} style={styles.invitationCard}>
                                        <View style={styles.invitationInfo}>
                                            <Text style={styles.invitationProjectName}>{invitation.project.name}</Text>
                                            <Text style={styles.invitationRole}>
                                                Invited as <Text style={{ fontWeight: '700' }}>{invitation.role === 'active' ? 'Active Member' : 'Passive Member'}</Text>
                                            </Text>
                                        </View>
                                        <View style={styles.invitationActions}>
                                            <TouchableOpacity
                                                style={styles.declineBtn}
                                                onPress={() => handleDeclineInvitation(invitation)}
                                            >
                                                <Text style={styles.declineBtnText}>Decline</Text>
                                            </TouchableOpacity>
                                            <TouchableOpacity
                                                style={styles.acceptBtn}
                                                onPress={() => handleAcceptInvitation(invitation)}
                                            >
                                                <Text style={styles.acceptBtnText}>Accept</Text>
                                            </TouchableOpacity>
                                        </View>
                                    </View>
                                ))}
                                {myInvitations.length > 1 && (
                                    <TouchableOpacity
                                        style={styles.viewAllBtn}
                                        onPress={() => setShowInvitationsModal(true)}
                                    >
                                        <Text style={styles.viewAllText}>View All {myInvitations.length} Invitations</Text>
                                        <MaterialCommunityIcons name="arrow-right" size={16} color={theme.colors.primary} />
                                    </TouchableOpacity>
                                )}
                            </View>
                        )}

                        {/* My Projects Section */}
                        <View style={styles.projectsSection}>
                            <View style={styles.sectionHeader}>
                                <Text style={styles.sectionTitle}>My Projects</Text>
                                <TouchableOpacity
                                    style={styles.newProjectBtn}
                                    onPress={() => navigation.navigate('CreateProjectInvestor')}
                                >
                                    <MaterialCommunityIcons name="plus" size={18} color={theme.colors.primary} />
                                    <Text style={styles.newProjectText}>New</Text>
                                </TouchableOpacity>
                            </View>

                            {myProjects.length > 0 ? (
                                <>
                                    {myProjects.slice(0, 4).map((project, index) => renderProjectItem(project, index))}
                                    {myProjects.length > 4 && (
                                        <TouchableOpacity
                                            style={styles.viewAllBtn}
                                            onPress={() => setActiveTab('projects')}
                                        >
                                            <Text style={styles.viewAllText}>View All Projects ({myProjects.length})</Text>
                                            <MaterialCommunityIcons name="arrow-right" size={16} color={theme.colors.primary} />
                                        </TouchableOpacity>
                                    )}
                                </>
                            ) : (
                                <View style={styles.emptyState}>
                                    <MaterialCommunityIcons name="briefcase-plus-outline" size={56} color={theme.colors.textTertiary} />
                                    <Text style={styles.emptyTitle}>No projects yet</Text>
                                    <Text style={styles.emptySubtitle}>Create a project to get started</Text>
                                    <TouchableOpacity
                                        style={styles.emptyButton}
                                        onPress={() => navigation.navigate('CreateProjectInvestor')}
                                    >
                                        <MaterialCommunityIcons name="plus" size={18} color="white" />
                                        <Text style={styles.emptyButtonText}>Create Project</Text>
                                    </TouchableOpacity>
                                </View>
                            )}
                        </View>

                        {/* Market News Section */}
                        <View style={styles.marketNewsSection}>
                            <View style={styles.marketNewsHeader}>
                                <View style={styles.marketNewsTitleRow}>
                                    <LinearGradient
                                        colors={['#00C853', '#00A844']}
                                        style={styles.marketNewsIconGradient}
                                    >
                                        <MaterialCommunityIcons name="leaf" size={18} color="white" />
                                    </LinearGradient>
                                    <Text style={styles.sectionTitle}>Market News</Text>
                                </View>
                                <TouchableOpacity style={styles.viewAllBtn} onPress={openNewsModal}>
                                    <Text style={styles.viewAllText}>View All</Text>
                                    <MaterialCommunityIcons name="chevron-right" size={16} color={theme.colors.primary} />
                                </TouchableOpacity>
                            </View>

                            {/* Market Prices Horizontal Scroll */}
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.pricesScroll} contentContainerStyle={{ paddingHorizontal: 20 }}>
                                {marketPrices.slice(0, DASHBOARD_MARKET_PRICE_CAP).map((item, index) => (
                                    <View key={getMarketItemId(item) || `${item?.name || 'price'}-${index}`} style={[styles.priceCard, { borderColor: (item?.color || theme.colors.primary) + '40' }]}>
                                        <View style={[styles.priceCardIcon, { backgroundColor: (item?.color || theme.colors.primary) + '20' }]}>
                                            <MaterialCommunityIcons name={item?.icon || 'finance'} size={22} color={item?.color || theme.colors.primary} />
                                        </View>
                                        <Text style={styles.priceCardName}>{item?.name || 'Market Item'}</Text>
                                        <View style={styles.priceCardRow}>
                                            <Text style={styles.priceCardValue}>{item?.price || '-'}</Text>
                                            <Text style={[styles.priceCardTrend, { color: item?.positive ? theme.colors.success : theme.colors.danger }]}>
                                                {item?.trend || '--'}
                                            </Text>
                                        </View>
                                    </View>
                                ))}
                            </ScrollView>

                            {/* News Items */}
                            {newsItems.slice(0, DASHBOARD_NEWS_CAP).map((news, index) => (
                                <TouchableOpacity key={getMarketItemId(news) || `${news?.title || 'news'}-${index}`} style={styles.newsItemCard} onPress={openNewsModal}>
                                    <View style={styles.newsItemIcon}>
                                        <MaterialCommunityIcons name="leaf" size={22} color={theme.colors.secondary} />
                                    </View>
                                    <View style={styles.newsItemContent}>
                                        <Text style={styles.newsItemTitle}>{news?.title || 'Market update'}</Text>
                                        <View style={styles.newsItemMeta}>
                                            <View style={styles.newsItemBadge}>
                                                <Text style={styles.newsItemBadgeText}>{news?.category || 'Update'}</Text>
                                            </View>
                                            <Text style={styles.newsItemTime}>{news?.time || 'Now'}</Text>
                                        </View>
                                    </View>
                                    <MaterialCommunityIcons name="chevron-right" size={18} color={theme.colors.textTertiary} />
                                </TouchableOpacity>
                            ))}
                        </View>
                    </>
                );

            case 'projects':
                return (
                    <View style={styles.tabContent}>
                        <View style={styles.sectionHeader}>
                            <Text style={styles.sectionTitle}>All Projects</Text>
                            <TouchableOpacity
                                style={styles.newProjectBtn}
                                onPress={() => navigation.navigate('CreateProjectInvestor')}
                            >
                                <MaterialCommunityIcons name="plus" size={18} color={theme.colors.primary} />
                                <Text style={styles.newProjectText}>New</Text>
                            </TouchableOpacity>
                        </View>
                        {myProjects.length > 0 ? (
                            myProjects.map((project, index) => renderProjectItem(project, index))
                        ) : (
                            <View style={styles.emptyState}>
                                <MaterialCommunityIcons name="briefcase-plus-outline" size={56} color={theme.colors.textTertiary} />
                                <Text style={styles.emptyTitle}>No projects yet</Text>
                                <Text style={styles.emptySubtitle}>Create your first project</Text>
                            </View>
                        )}
                    </View>
                );

            case 'approvals':
                return (
                    <View style={styles.tabContent}>
                        <Text style={styles.sectionTitle}>All Approvals</Text>
                        {pendingApprovals.length > 0 ? (
                            pendingApprovals.map((approval, index) => (
                                <TouchableOpacity
                                    key={approval.id || approval._id || `${approval.projectName || 'approval'}-${index}`}
                                    style={styles.approvalCard}
                                    onPress={() => navigation.navigate('ProjectApprovalDetail', { modificationId: approval.id })}
                                >
                                    <View style={styles.approvalIcon}>
                                        <MaterialCommunityIcons name="alert-circle" size={20} color="#F59E0B" />
                                    </View>
                                    <View style={styles.approvalContent}>
                                        <Text style={styles.approvalTitle} numberOfLines={1}>{approval.title}</Text>
                                        <Text style={styles.approvalMeta} numberOfLines={1}>
                                            {approval.projectName} • {getRelativeTime(approval.proposedAt)}
                                        </Text>
                                    </View>
                                    <MaterialCommunityIcons name="chevron-right" size={20} color={theme.colors.textTertiary} />
                                </TouchableOpacity>
                            ))
                        ) : (
                            <View style={styles.emptyState}>
                                <MaterialCommunityIcons name="check-circle-outline" size={56} color={theme.colors.success} />
                                <Text style={styles.emptyTitle}>All caught up!</Text>
                                <Text style={styles.emptySubtitle}>No pending approvals</Text>
                            </View>
                        )}
                    </View>
                );

            case 'analytics':
                return (
                    <View style={styles.tabContent}>
                        <Text style={styles.sectionTitle}>Analytics</Text>
                        <View style={styles.analyticsGrid}>
                            <View style={styles.analyticsCard}>
                                <LinearGradient colors={['#5B5CFF', '#7C3AED']} style={styles.analyticsIconBox}>
                                    <MaterialCommunityIcons name="briefcase-check" size={24} color="white" />
                                </LinearGradient>
                                <Text style={styles.analyticsValue}>{myProjects.length}</Text>
                                <Text style={styles.analyticsLabel}>Active Projects</Text>
                            </View>
                            <View style={styles.analyticsCard}>
                                <LinearGradient colors={['#00C853', '#00A844']} style={styles.analyticsIconBox}>
                                    <MaterialCommunityIcons name="account-group" size={24} color="white" />
                                </LinearGradient>
                                <Text style={styles.analyticsValue}>
                                    {myProjects.reduce((sum, p) => sum + getProjectMemberCount(p), 0)}
                                </Text>
                                <Text style={styles.analyticsLabel}>Total Members</Text>
                            </View>
                            <View style={styles.analyticsCard}>
                                <LinearGradient colors={['#FFB300', '#FF9500']} style={styles.analyticsIconBox}>
                                    <MaterialCommunityIcons name="crown" size={24} color="white" />
                                </LinearGradient>
                                <Text style={styles.analyticsValue}>{myCreatedProjects.length}</Text>
                                <Text style={styles.analyticsLabel}>Created by You</Text>
                            </View>
                            <View style={styles.analyticsCard}>
                                <LinearGradient colors={['#FF3D57', '#E53935']} style={styles.analyticsIconBox}>
                                    <MaterialCommunityIcons name="clock-alert-outline" size={24} color="white" />
                                </LinearGradient>
                                <Text style={styles.analyticsValue}>{pendingApprovals.length}</Text>
                                <Text style={styles.analyticsLabel}>Pending Approvals</Text>
                            </View>
                        </View>
                        <TouchableOpacity
                            style={styles.fullAnalyticsBtn}
                            onPress={() => navigation.navigate('PortfolioAnalytics')}
                        >
                            <Text style={styles.fullAnalyticsText}>View Full Analytics</Text>
                            <MaterialCommunityIcons name="arrow-right" size={18} color="white" />
                        </TouchableOpacity>
                    </View>
                );

            case 'invite':
                return (
                    <View style={styles.tabContent}>
                        <View style={styles.inviteSection}>
                            <LinearGradient
                                colors={['#5B5CFF', '#7C3AED']}
                                style={styles.inviteCard}
                            >
                                <MaterialCommunityIcons name="account-multiple-plus" size={64} color="white" />
                                <Text style={styles.inviteTitle}>Invite Friends</Text>
                                <Text style={styles.inviteSubtitle}>
                                    Share SplitFlow with your team and manage project expenses together
                                </Text>
                                <TouchableOpacity
                                    style={styles.inviteButton}
                                    onPress={handleInviteFriends}
                                >
                                    <MaterialCommunityIcons name="share-variant" size={20} color="#5B5CFF" />
                                    <Text style={styles.inviteButtonText}>Share Invite Link</Text>
                                </TouchableOpacity>
                            </LinearGradient>
                        </View>
                    </View>
                );

            default:
                return null;
        }
    };

    // Sliding Indicator Animation
    const slideAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        const tabIndex = FOOTER_TAB_IDS.indexOf(activeTab);
        if (tabIndex >= 0) {
            Animated.spring(slideAnim, {
                toValue: tabIndex * TAB_WIDTH,
                tension: 60,
                friction: 9,
                useNativeDriver: true,
            }).start();
        }
    }, [activeTab, slideAnim]);

    // Footer tabs with Premium Icon Pairs
    const footerTabs = [
        { id: 'home', icon: 'home-outline', activeIcon: 'home', label: 'Home' },
        { id: 'projects', icon: 'briefcase-variant-outline', activeIcon: 'briefcase-variant', label: 'Projects' },
        { id: 'approvals', icon: 'clipboard-check-outline', activeIcon: 'clipboard-check', label: 'Approvals', badge: pendingApprovals.length },
        { id: 'analytics', icon: 'poll', activeIcon: 'poll', label: 'Analytics' },
        { id: 'expenses', icon: 'credit-card-outline', activeIcon: 'credit-card', label: 'Expenses', isNavigation: true, navScreen: 'DailyExpenses' },
    ];

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <StatusBar barStyle="dark-content" backgroundColor={theme.colors.background} />

            {/* Header */}
            <View style={styles.appBar}>
                <View style={styles.appBarContent}>
                    <Text style={styles.greeting}>Welcome back</Text>
                    <Text style={styles.userName} numberOfLines={1}>{currentUserName}</Text>
                </View>
                <View style={styles.appBarActions}>
                    <TouchableOpacity
                        style={styles.iconButton}
                        onPress={() => navigation.navigate('Notifications')}
                        activeOpacity={0.7}
                    >
                        <MaterialCommunityIcons name="bell" size={26} color="#FFB300" />
                        {notifications.some(u => !u.isRead) && (
                            <View style={styles.notifBadge}>
                                <Text style={styles.notifBadgeText}>
                                    {notifications.filter(u => !u.isRead).length > 9
                                        ? '9+'
                                        : notifications.filter(u => !u.isRead).length}
                                </Text>
                            </View>
                        )}
                    </TouchableOpacity>
                    <TouchableOpacity onPress={handleProfilePress} style={styles.avatarButton}>
                        <LinearGradient colors={['#5B5CFF', '#7C3AED']} style={styles.avatar}>
                            <Text style={styles.avatarText}>
                                {currentUser?.name ? currentUser.name.split(' ').map(n => n[0]).join('') : 'U'}
                            </Text>
                        </LinearGradient>
                    </TouchableOpacity>
                </View>
            </View>

            {/* Main Content */}
            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                {renderContent()}
                <View style={{ height: 100 }} />
            </ScrollView>

            {/* Footer Navigation - Safe Bottom Container */}
            <View
                style={{
                    backgroundColor: '#FFFFFF',
                    paddingBottom: Platform.OS === 'android' ? Math.max(insets.bottom, 20) : Math.max(insets.bottom, 8),
                    borderTopWidth: 1,
                    borderTopColor: theme.colors.border, // WCAG compliant structural boundary
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: -4 },
                    shadowOpacity: 0.08,
                    shadowRadius: 16,
                    elevation: 16, // Strong drop shadow against scrolling content background
                }}
            >
                <LinearGradient
                    colors={['#FFFFFF', '#F7F9FC', '#EDF2F7']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.footer}
                >
                    {/* Visual Sliding Indicator */}
                    <Animated.View
                        style={[
                            styles.slidingIndicator,
                            {
                                transform: [{ translateX: slideAnim }],
                                width: TAB_WIDTH,
                            },
                        ]}
                    >
                        <LinearGradient
                            colors={[theme.colors.primaryDark, theme.colors.primary]} // WCAG compliant contrast against white icon
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            style={styles.slidingIndicatorGradient}
                        />
                    </Animated.View>

                    {footerTabs.map((tab) => {
                        const tabAnim = tabAnimationsRef.current[tab.id];
                        const iconAnimatedStyle = {
                            transform: [
                                {
                                    translateY: tabAnim.interpolate({
                                        inputRange: [0, 1],
                                        outputRange: [0, -6], // Slight jump
                                    }),
                                },
                                {
                                    scale: tabAnim.interpolate({
                                        inputRange: [0, 1],
                                        outputRange: [1, 1.15],
                                    }),
                                },
                            ],
                        };

                        const labelAnimatedStyle = {
                            opacity: tabAnim.interpolate({
                                inputRange: [0, 1],
                                outputRange: [0, 1],
                            }),
                            transform: [
                                {
                                    scale: tabAnim.interpolate({
                                        inputRange: [0, 1],
                                        outputRange: [0.8, 1],
                                    }),
                                },
                            ],
                        };

                        const isActive = activeTab === tab.id;

                        return (
                            <TouchableOpacity
                                key={tab.id}
                                style={[styles.footerTab, isActive && styles.footerTabActive]}
                                onPress={() => {
                                    Vibration.vibrate(10); // Haptic feedback
                                    if (tab.isNavigation && tab.navScreen) {
                                        navigation.navigate(tab.navScreen);
                                    } else {
                                        setActiveTab(tab.id);
                                    }
                                }}
                                activeOpacity={0.7}
                            >
                                <Animated.View style={[styles.footerIconContainer, iconAnimatedStyle]}>
                                    <View style={[styles.footerTabIcon]}>
                                        <MaterialCommunityIcons
                                            name={isActive ? tab.activeIcon : tab.icon}
                                            size={26} // Slightly larger icons
                                            color={isActive ? 'white' : theme.colors.textSecondary} // WCAG: High contrast for inactive
                                        />
                                        {tab.badge > 0 && (
                                            <View style={styles.footerBadge}>
                                                <Text style={styles.footerBadgeText}>
                                                    {tab.badge > 9 ? '9+' : tab.badge}
                                                </Text>
                                            </View>
                                        )}
                                    </View>
                                </Animated.View>
                                {isActive && (
                                    <Animated.Text style={[styles.footerTabLabel, labelAnimatedStyle]}>
                                        {tab.label}
                                    </Animated.Text>
                                )}
                            </TouchableOpacity>
                        );
                    })}
                </LinearGradient>
            </View>

            {/* Profile Menu Modal */}
            <ProfileMenu
                visible={showProfileMenu}
                onClose={() => setShowProfileMenu(false)}
                onProfile={() => navigation.navigate('Profile')}
                onSettings={() => navigation.navigate('Settings')}
                onLogout={onLogout}
                onShare={handleInviteFriends}
                userName={currentUserName}
            />

            {/* First Time User Info Modal */}
            <Modal visible={showInfoModal} transparent animationType="fade">
                <View style={styles.infoModalOverlay}>
                    <View style={styles.infoModalContent}>
                        <LinearGradient
                            colors={['#5B5CFF', '#7C3AED']}
                            style={styles.infoIconContainer}
                        >
                            <MaterialCommunityIcons name="star-four-points" size={40} color="white" />
                        </LinearGradient>
                        <Text style={styles.infoTitle}>Welcome to SplitFlow! 🎉</Text>
                        <Text style={styles.infoSubtitle}>Your smart investment & expense management companion</Text>

                        <View style={styles.infoFeatures}>
                            <View style={styles.infoFeatureItem}>
                                <View style={styles.infoFeatureIcon}>
                                    <Ionicons name="trending-up" size={20} color={theme.colors.primary} />
                                </View>
                                <View style={styles.infoFeatureText}>
                                    <Text style={styles.infoFeatureTitle}>Track Investments</Text>
                                    <Text style={styles.infoFeatureDesc}>Monitor your portfolio in real-time</Text>
                                </View>
                            </View>
                            <View style={styles.infoFeatureItem}>
                                <View style={styles.infoFeatureIcon}>
                                    <Ionicons name="analytics-outline" size={20} color={theme.colors.primary} />
                                </View>
                                <View style={styles.infoFeatureText}>
                                    <Text style={styles.infoFeatureTitle}>Expense Analytics</Text>
                                    <Text style={styles.infoFeatureDesc}>Get insights on your spending</Text>
                                </View>
                            </View>
                            <View style={styles.infoFeatureItem}>
                                <View style={styles.infoFeatureIcon}>
                                    <Ionicons name="leaf-outline" size={20} color={theme.colors.primary} />
                                </View>
                                <View style={styles.infoFeatureText}>
                                    <Text style={styles.infoFeatureTitle}>Market News</Text>
                                    <Text style={styles.infoFeatureDesc}>Stay updated with agriculture prices</Text>
                                </View>
                            </View>
                        </View>

                        <TouchableOpacity style={styles.infoBtn} onPress={dismissInfoModal}>
                            <LinearGradient colors={['#5B5CFF', '#7C3AED']} style={styles.infoBtnGradient}>
                                <Text style={styles.infoBtnText}>Get Started</Text>
                            </LinearGradient>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            {/* All Invitations Modal */}
            <Modal visible={showInvitationsModal} animationType="slide" transparent={true}>
                <View style={[styles.newsModalContainer, { backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end', margin: 0 }]}>
                    <View style={{
                        backgroundColor: theme.colors.background,
                        borderTopLeftRadius: 32,
                        borderTopRightRadius: 32,
                        height: SCREEN_HEIGHT * 0.85,
                        overflow: 'hidden',
                        shadowColor: '#000',
                        shadowOffset: { width: 0, height: -10 },
                        shadowOpacity: 0.1,
                        shadowRadius: 20,
                        elevation: 20,
                    }}>
                        {/* Drag indicator */}
                        <View style={{ alignItems: 'center', paddingTop: 12, paddingBottom: 8 }}>
                            <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: '#E0E0E0' }} />
                        </View>

                        <View style={[styles.newsModalHeader, { paddingTop: 10, paddingBottom: 20, borderBottomWidth: 0 }]}>
                            <View style={styles.newsModalTitleRow}>
                                <LinearGradient colors={['#7C3AED', '#5B5CFF']} style={[styles.newsModalIcon, { borderRadius: 16, width: 48, height: 48 }]}>
                                    <MaterialCommunityIcons name="email-fast-outline" size={24} color="white" />
                                </LinearGradient>
                                <View>
                                    <Text style={[styles.newsModalTitle, { fontSize: 22 }]}>Pending Invitations</Text>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
                                        <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#F59E0B', marginRight: 6 }} />
                                        <Text style={[styles.newsModalSubtitle, { color: '#F59E0B', fontWeight: '600' }]}>{myInvitations.length} awaiting response</Text>
                                    </View>
                                </View>
                            </View>
                            <View style={styles.newsModalActions}>
                                <TouchableOpacity
                                    style={[styles.newsModalClose, { backgroundColor: '#F3F4F6' }]}
                                    onPress={() => setShowInvitationsModal(false)}
                                >
                                    <Ionicons name="close" size={20} color={theme.colors.textSecondary} />
                                </TouchableOpacity>
                            </View>
                        </View>

                        <ScrollView
                            style={{ flex: 1 }}
                            contentContainerStyle={{ padding: 24, paddingBottom: 100 }}
                            showsVerticalScrollIndicator={false}
                        >
                            {myInvitations.map((invitation, index) => (
                                <View key={invitation.id || invitation._id || `modal-invitation-${index}`} style={{
                                    backgroundColor: theme.colors.surface,
                                    borderRadius: 20,
                                    padding: 20,
                                    marginBottom: 16,
                                    borderWidth: 1,
                                    borderColor: 'rgba(91, 92, 255, 0.15)',
                                    shadowColor: '#5B5CFF',
                                    shadowOffset: { width: 0, height: 8 },
                                    shadowOpacity: 0.08,
                                    shadowRadius: 16,
                                    elevation: 6,
                                }}>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
                                        <View style={{
                                            width: 44,
                                            height: 44,
                                            borderRadius: 22,
                                            backgroundColor: '#EEF2FF',
                                            justifyContent: 'center',
                                            alignItems: 'center',
                                            marginRight: 12
                                        }}>
                                            <MaterialCommunityIcons name="briefcase-outline" size={22} color="#5B5CFF" />
                                        </View>
                                        <View style={{ flex: 1 }}>
                                            <Text style={{ fontSize: 18, fontWeight: '700', color: theme.colors.textPrimary, marginBottom: 2 }}>{invitation.project.name}</Text>
                                            <Text style={{ fontSize: 14, color: theme.colors.textSecondary }}>
                                                Invited as <Text style={{ fontWeight: '700', color: theme.colors.textPrimary }}>{invitation.role === 'active' ? 'Active Member' : 'Passive Member'}</Text>
                                            </Text>
                                        </View>
                                    </View>

                                    <View style={{ flexDirection: 'row', gap: 12 }}>
                                        <TouchableOpacity
                                            style={{
                                                flex: 1,
                                                backgroundColor: '#FEE2E2',
                                                paddingVertical: 14,
                                                borderRadius: 12,
                                                alignItems: 'center',
                                            }}
                                            onPress={async () => {
                                                await handleDeclineInvitation(invitation);
                                                if (myInvitations.length <= 1) setShowInvitationsModal(false);
                                            }}
                                        >
                                            <Text style={{ color: '#EF4444', fontWeight: '700', fontSize: 15 }}>Decline</Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            style={{
                                                flex: 1,
                                                backgroundColor: '#5B5CFF',
                                                paddingVertical: 14,
                                                borderRadius: 12,
                                                alignItems: 'center',
                                                shadowColor: '#5B5CFF',
                                                shadowOffset: { width: 0, height: 4 },
                                                shadowOpacity: 0.3,
                                                shadowRadius: 8,
                                                elevation: 4,
                                            }}
                                            onPress={async () => {
                                                await handleAcceptInvitation(invitation);
                                                if (myInvitations.length <= 1) setShowInvitationsModal(false);
                                            }}
                                        >
                                            <Text style={{ color: 'white', fontWeight: '700', fontSize: 15 }}>Accept</Text>
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            ))}
                            {myInvitations.length === 0 && (
                                <View style={{ alignItems: 'center', marginTop: 60 }}>
                                    <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: '#F3F4F6', justifyContent: 'center', alignItems: 'center', marginBottom: 16 }}>
                                        <MaterialCommunityIcons name="email-open-outline" size={36} color="#9CA3AF" />
                                    </View>
                                    <Text style={{ color: theme.colors.textSecondary, fontSize: 16, fontWeight: '500' }}>No pending invitations left</Text>
                                </View>
                            )}
                        </ScrollView>
                    </View>
                </View>
            </Modal>

            {/* News Modal */}
            <Modal visible={showNewsModal} animationType="slide">
                <View style={{ flex: 1, backgroundColor: theme.colors.background, height: SCREEN_HEIGHT, width: SCREEN_WIDTH }}>
                    {/* Header */}
                    <View style={styles.newsModalHeader}>
                        <View style={styles.newsModalTitleRow}>
                            <LinearGradient colors={['#00C853', '#00A844']} style={styles.newsModalIcon}>
                                <MaterialCommunityIcons name="leaf" size={24} color="white" />
                            </LinearGradient>
                            <View>
                                <Text style={styles.newsModalTitle}>Agriculture News</Text>
                                <Text style={styles.newsModalSubtitle}>Market prices & updates</Text>
                            </View>
                        </View>
                        <View style={styles.newsModalActions}>
                            {isSuperAdmin && (
                                <TouchableOpacity
                                    style={styles.newsModalEditToggle}
                                    onPress={() => setIsMarketEditMode((prev) => !prev)}
                                >
                                    <MaterialCommunityIcons
                                        name={isMarketEditMode ? 'check' : 'pencil'}
                                        size={18}
                                        color={theme.colors.primary}
                                    />
                                    <Text style={styles.newsModalEditToggleText}>{isMarketEditMode ? 'Done' : 'Edit'}</Text>
                                </TouchableOpacity>
                            )}
                            <TouchableOpacity style={styles.newsModalClose} onPress={closeNewsModal}>
                                <Ionicons name="close" size={24} color={theme.colors.textSecondary} />
                            </TouchableOpacity>
                        </View>
                    </View>

                    <SectionList
                        style={{ flex: 1, minHeight: 0 }}
                        contentContainerStyle={{ paddingBottom: 40 }}
                        stickySectionHeadersEnabled={true}
                        sections={[{ title: 'Latest News', data: newsItems }]}
                        keyExtractor={(item, index) => getMarketItemId(item) || `${item?.title || 'news'}-${index}`}
                        keyboardShouldPersistTaps="handled"
                        showsVerticalScrollIndicator={true}
                        bounces={true}
                        overScrollMode="always"
                        scrollEnabled={true}
                        removeClippedSubviews={false}
                        initialNumToRender={20}
                        ListHeaderComponent={
                            <View style={{ paddingHorizontal: 20, paddingTop: 12, paddingBottom: 4 }}>
                                <View style={styles.livePricesSection}>
                                    <View style={styles.livePricesHeader}>
                                        <View style={styles.liveIndicator} />
                                        <Text style={styles.livePricesTitle}>Live Market Prices</Text>
                                    </View>
                                    <View style={styles.pricesTable}>
                                        {marketPrices.slice(0, marketPricesModalCap).map((priceItem, priceIndex) => (
                                            <View key={getMarketItemId(priceItem) || `${priceItem?.name || 'price'}-${priceIndex}`} style={styles.priceTableRow}>
                                                <Text style={styles.priceTableName}>{priceItem?.name || 'Market Item'}</Text>
                                                <Text style={styles.priceTableValue}>{priceItem?.price || '-'}</Text>
                                                <View style={[styles.priceTableChange, { backgroundColor: priceItem?.positive ? '#D1FAE5' : '#FEE2E2' }]}>
                                                    <Text style={[styles.priceTableChangeText, { color: priceItem?.positive ? theme.colors.success : theme.colors.danger }]}>
                                                        {priceItem?.trend || '--'}
                                                    </Text>
                                                </View>
                                                {isSuperAdmin && isMarketEditMode && (
                                                    <TouchableOpacity
                                                        style={styles.marketRowEditBtn}
                                                        onPress={() => openEditPriceModal(priceItem)}
                                                    >
                                                        <MaterialCommunityIcons name="pencil" size={16} color={theme.colors.primary} />
                                                    </TouchableOpacity>
                                                )}
                                            </View>
                                        ))}
                                    </View>
                                    {marketPrices.length > MODAL_MARKET_PRICE_INITIAL_CAP && marketPricesModalCap <= MODAL_MARKET_PRICE_INITIAL_CAP && (
                                        <TouchableOpacity
                                            style={styles.modalViewMoreBtn}
                                            onPress={() => setMarketPricesModalCap(marketPrices.length)}
                                        >
                                            <Text style={styles.modalViewMoreText}>View More</Text>
                                            <MaterialCommunityIcons name="chevron-down" size={16} color={theme.colors.primary} />
                                        </TouchableOpacity>
                                    )}
                                    {marketPrices.length > MODAL_MARKET_PRICE_INITIAL_CAP && marketPricesModalCap > MODAL_MARKET_PRICE_INITIAL_CAP && (
                                        <TouchableOpacity
                                            style={styles.modalViewMoreBtn}
                                            onPress={() => setMarketPricesModalCap(MODAL_MARKET_PRICE_INITIAL_CAP)}
                                        >
                                            <Text style={styles.modalViewMoreText}>Show Less</Text>
                                            <MaterialCommunityIcons name="chevron-up" size={16} color={theme.colors.primary} />
                                        </TouchableOpacity>
                                    )}
                                </View>
                            </View>
                        }
                        renderSectionHeader={() => (
                            <View style={{
                                paddingHorizontal: 20,
                                paddingTop: 12,
                                paddingBottom: 10,
                                backgroundColor: theme.colors.background,
                                borderBottomWidth: 1,
                                borderBottomColor: theme.colors.border,
                            }}>
                                <Text style={styles.newsListTitle}>Latest News</Text>
                            </View>
                        )}
                        renderItem={({ item }) => (
                            <View style={[styles.newsCard, { marginHorizontal: 20 }]}>
                                <View style={styles.newsCardHeader}>
                                    <View style={styles.newsCardBadge}>
                                        <Text style={styles.newsCardBadgeText}>{item?.category || 'Update'}</Text>
                                    </View>
                                    <Text style={[
                                        styles.newsCardTrend,
                                        { color: getTrendColor(item?.trend || '') }
                                    ]}>
                                        {item?.trend || item?.time || 'Update'}
                                    </Text>
                                </View>
                                <Text style={styles.newsCardTitle}>{item?.title || 'Market update'}</Text>
                                <Text style={styles.newsCardDesc}>{item?.description || item?.time || 'No details available.'}</Text>
                                {isSuperAdmin && isMarketEditMode && (
                                    <TouchableOpacity
                                        style={styles.newsCardEditBtn}
                                        onPress={() => openEditNewsModal(item)}
                                    >
                                        <MaterialCommunityIcons name="pencil" size={16} color={theme.colors.primary} />
                                        <Text style={styles.newsCardEditText}>Edit</Text>
                                    </TouchableOpacity>
                                )}
                            </View>
                        )}
                        ListEmptyComponent={
                            <View style={{ alignItems: 'center', paddingVertical: 40 }}>
                                <MaterialCommunityIcons name="newspaper-variant-outline" size={48} color={theme.colors.textTertiary} />
                                <Text style={{ color: theme.colors.textSecondary, marginTop: 12, fontSize: 15 }}>No news available</Text>
                            </View>
                        }
                    />
                </View>
            </Modal>

            <Modal visible={Boolean(editingPrice)} transparent animationType="fade">
                <View style={styles.editorOverlay}>
                    <View style={styles.editorCard}>
                        <Text style={styles.editorTitle}>Edit Market Price</Text>
                        <TextInput style={styles.editorInput} value={editingPriceForm.name} onChangeText={(text) => setEditingPriceForm((prev) => ({ ...prev, name: text }))} placeholder="Name" />
                        <TextInput style={styles.editorInput} value={editingPriceForm.price} onChangeText={(text) => setEditingPriceForm((prev) => ({ ...prev, price: text }))} placeholder="Price" />
                        <TextInput style={styles.editorInput} value={editingPriceForm.trend} onChangeText={(text) => setEditingPriceForm((prev) => ({ ...prev, trend: text }))} placeholder="Trend (e.g. +2.4%)" />
                        <TextInput style={styles.editorInput} value={editingPriceForm.icon} onChangeText={(text) => setEditingPriceForm((prev) => ({ ...prev, icon: text }))} placeholder="Icon name" />
                        <TextInput style={styles.editorInput} value={editingPriceForm.color} onChangeText={(text) => setEditingPriceForm((prev) => ({ ...prev, color: text }))} placeholder="Color hex (e.g. #5B5CFF)" />
                        <TouchableOpacity
                            style={styles.positiveToggleBtn}
                            onPress={() => setEditingPriceForm((prev) => ({ ...prev, positive: !prev.positive }))}
                        >
                            <Text style={styles.positiveToggleLabel}>Trend Direction</Text>
                            <Text style={[styles.positiveToggleValue, { color: editingPriceForm.positive ? theme.colors.success : theme.colors.danger }]}>
                                {editingPriceForm.positive ? 'Positive' : 'Negative'}
                            </Text>
                        </TouchableOpacity>
                        <View style={styles.editorActions}>
                            <TouchableOpacity style={styles.editorCancelBtn} onPress={closeEditPriceModal} disabled={savingPrice}>
                                <Text style={styles.editorCancelText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.editorSaveBtn} onPress={saveMarketPriceEdit} disabled={savingPrice}>
                                <Text style={styles.editorSaveText}>{savingPrice ? 'Saving...' : 'Save'}</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            <Modal visible={Boolean(editingNews)} transparent animationType="fade">
                <View style={styles.editorOverlay}>
                    <View style={styles.editorCard}>
                        <Text style={styles.editorTitle}>Edit News Item</Text>
                        <TextInput style={styles.editorInput} value={editingNewsForm.title} onChangeText={(text) => setEditingNewsForm((prev) => ({ ...prev, title: text }))} placeholder="Title" />
                        <TextInput style={styles.editorInput} value={editingNewsForm.category} onChangeText={(text) => setEditingNewsForm((prev) => ({ ...prev, category: text }))} placeholder="Category" />
                        <TextInput style={styles.editorInput} value={editingNewsForm.time} onChangeText={(text) => setEditingNewsForm((prev) => ({ ...prev, time: text }))} placeholder="Time (e.g. 2 hours ago)" />
                        <TextInput style={styles.editorInput} value={editingNewsForm.trend} onChangeText={(text) => setEditingNewsForm((prev) => ({ ...prev, trend: text }))} placeholder="Trend (e.g. +15% / New)" />
                        <TextInput
                            style={[styles.editorInput, styles.editorInputMultiline]}
                            value={editingNewsForm.description}
                            onChangeText={(text) => setEditingNewsForm((prev) => ({ ...prev, description: text }))}
                            placeholder="Description"
                            multiline
                        />
                        <View style={styles.editorActions}>
                            <TouchableOpacity style={styles.editorCancelBtn} onPress={closeEditNewsModal} disabled={savingNews}>
                                <Text style={styles.editorCancelText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.editorSaveBtn} onPress={saveNewsEdit} disabled={savingNews}>
                                <Text style={styles.editorSaveText}>{savingNews ? 'Saving...' : 'Save'}</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>

    );
}

InvestorDashboard.propTypes = {
    navigation: PropTypes.shape({ navigate: PropTypes.func }),
    onLogout: PropTypes.func,
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors.background,
    },
    // App Bar
    appBar: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 12,
    },
    appBarContent: {},
    greeting: {
        ...theme.typography.caption,
        color: theme.colors.textSecondary,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    userName: {
        ...theme.typography.h2,
        color: theme.colors.textPrimary,
        marginTop: 2,
        maxWidth: SCREEN_WIDTH * 0.6,
    },
    appBarActions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    iconButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: theme.colors.surfaceAlt,
        alignItems: 'center',
        justifyContent: 'center',
    },
    notifBadge: {
        position: 'absolute',
        top: -5,
        right: -5,
        minWidth: 18,
        height: 18,
        borderRadius: 9,
        backgroundColor: theme.colors.danger,
        borderWidth: 2,
        borderColor: theme.colors.surfaceAlt,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 2,
    },
    notifBadgeText: {
        color: 'white',
        fontSize: 10,
        fontWeight: 'bold',
    },
    avatarButton: {
        borderRadius: 22,
    },
    avatar: {
        width: 44,
        height: 44,
        borderRadius: 22,
        alignItems: 'center',
        justifyContent: 'center',
    },
    avatarText: {
        color: 'white',
        fontWeight: '700',
        fontSize: 15,
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        paddingHorizontal: 20,
        paddingBottom: 24,
    },
    // Sections
    approvalsSection: {
        marginBottom: 24,
    },
    projectsSection: {
        marginBottom: 24,
    },
    activitySection: {
        marginBottom: 24,
    },
    tabContent: {
        flex: 1,
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    sectionTitle: {
        ...theme.typography.h4,
        color: theme.colors.textPrimary,
    },
    pendingBadge: {
        backgroundColor: '#FEE2E2',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
    },
    pendingBadgeText: {
        color: '#EF4444',
        fontWeight: '700',
        fontSize: 12,
    },
    newProjectBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: theme.colors.primaryLight,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 20,
        gap: 4,
    },
    newProjectText: {
        color: theme.colors.primary,
        fontWeight: '600',
        fontSize: 13,
    },
    viewAllBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        gap: 6,
    },
    viewAllText: {
        color: theme.colors.primary,
        fontWeight: '600',
        fontSize: 14,
    },
    // Enhanced Project Card - Premium Style
    projectCard: {
        backgroundColor: theme.colors.surface,
        borderRadius: 20,
        padding: 18,
        marginBottom: 14,
        borderWidth: 1,
        borderColor: theme.colors.border,
        shadowColor: '#5B5CFF',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 14,
        elevation: Platform.OS === 'android' ? 6 : 4,
    },
    projectCardTop: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    projectIconBox: {
        width: 52,
        height: 52,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 14,
        shadowColor: '#5B5CFF',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: Platform.OS === 'android' ? 5 : 3,
    },
    projectCardContent: {
        flex: 1,
    },
    projectCardTitle: {
        fontSize: 17,
        fontWeight: '700',
        color: theme.colors.textPrimary,
    },
    projectCardMeta: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        marginTop: 5,
    },
    projectCardSubtitle: {
        fontSize: 12,
        fontWeight: '500',
        color: theme.colors.textTertiary,
    },
    projectLedgerLine: {
        height: 1,
        backgroundColor: theme.colors.borderLight,
        marginVertical: 14,
    },
    projectCardBottom: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    spendingSummary: {
        flex: 1,
    },
    spendingLabel: {
        fontSize: 11,
        fontWeight: '600',
        color: theme.colors.textTertiary,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    spendingAmount: {
        fontSize: 20,
        fontWeight: '800',
        color: theme.colors.textPrimary,
        marginTop: 3,
    },
    pendingIndicator: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFBEB',
        paddingHorizontal: 12,
        paddingVertical: 7,
        borderRadius: 12,
        gap: 5,
        marginRight: 10,
        shadowColor: '#F59E0B',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 4,
        elevation: 2,
    },
    pendingIndicatorText: {
        fontSize: 12,
        fontWeight: '700',
        color: '#F59E0B',
    },
    // Expandable Project Card
    projectCardWrapper: {
        marginBottom: 12,
    },
    projectCardExpanded: {
        borderBottomLeftRadius: 0,
        borderBottomRightRadius: 0,
        borderBottomWidth: 0,
        marginBottom: 0,
    },
    hamburgerBtn: {
        width: 36,
        height: 36,
        borderRadius: 10,
        backgroundColor: theme.colors.surfaceAlt,
        alignItems: 'center',
        justifyContent: 'center',
        marginLeft: 8,
    },
    // Enhanced Metadata Section
    metadataSection: {
        backgroundColor: '#F8FAFC',
        borderWidth: 1,
        borderTopWidth: 0,
        borderColor: theme.colors.border,
        borderBottomLeftRadius: 20,
        borderBottomRightRadius: 20,
        padding: 18,
    },
    metadataHeaderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    metadataHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    metadataHeaderTitle: {
        fontSize: 15,
        fontWeight: '700',
        color: theme.colors.primary,
    },
    closeMenuBtn: {
        width: 34,
        height: 34,
        borderRadius: 17,
        backgroundColor: 'white',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: theme.colors.border,
    },
    metadataGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        marginBottom: 14,
        backgroundColor: 'white',
        borderRadius: 14,
        padding: 4,
        borderWidth: 1,
        borderColor: theme.colors.borderLight,
    },
    metadataItem: {
        width: '50%',
        paddingVertical: 12,
        paddingHorizontal: 12,
        flexDirection: 'column',
        alignItems: 'flex-start',
        gap: 5,
    },
    metadataLabel: {
        fontSize: 11,
        color: theme.colors.textTertiary,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    metadataValue: {
        fontSize: 14,
        fontWeight: '600',
        color: theme.colors.textPrimary,
    },
    metadataRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingVertical: 10,
        borderTopWidth: 1,
        borderTopColor: theme.colors.borderLight,
    },
    metadataRowLabel: {
        fontSize: 13,
        color: theme.colors.textSecondary,
    },
    metadataRowValue: {
        fontSize: 13,
        fontWeight: '600',
        color: theme.colors.textPrimary,
    },
    metadataDivider: {
        height: 1,
        backgroundColor: theme.colors.borderLight,
        marginVertical: 14,
    },
    creatorRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        paddingVertical: 4,
    },
    creatorLabel: {
        fontSize: 13,
        color: theme.colors.textSecondary,
    },
    creatorValue: {
        fontSize: 14,
        fontWeight: '600',
        color: theme.colors.textPrimary,
    },
    // Member Contributions in Menu
    contributionSection: {
        marginVertical: 4,
    },
    contributionSectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 12,
    },
    contributionSectionTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: '#F59E0B',
    },
    contributionList: {
        gap: 8,
    },
    contributionItem: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'white',
        borderRadius: 10,
        padding: 10,
        gap: 10,
    },
    contributionItemHighlight: {
        backgroundColor: '#EEF2FF',
        borderWidth: 1,
        borderColor: '#C7D2FE',
    },
    contributionRank: {
        width: 24,
        alignItems: 'center',
        justifyContent: 'center',
    },
    contributionRankText: {
        fontSize: 11,
        fontWeight: '700',
        color: theme.colors.textSecondary,
    },
    contributionAvatar: {
        width: 32,
        height: 32,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
    },
    contributionAvatarText: {
        fontSize: 13,
        fontWeight: '700',
        color: 'white',
    },
    contributionInfo: {
        flex: 1,
        minWidth: 0,
    },
    contributionName: {
        fontSize: 13,
        fontWeight: '600',
        color: theme.colors.textPrimary,
    },
    contributionEntries: {
        fontSize: 11,
        color: theme.colors.textTertiary,
        marginTop: 2,
    },
    contributionAmount: {
        fontSize: 14,
        fontWeight: '700',
        color: theme.colors.textPrimary,
        minWidth: 70,
        textAlign: 'right',
    },
    averageRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#EEF2FF',
        borderRadius: 8,
        padding: 10,
        marginTop: 12,
        gap: 8,
    },
    averageRowLabel: {
        fontSize: 12,
        color: theme.colors.textSecondary,
    },
    averageRowValue: {
        fontSize: 14,
        fontWeight: '700',
        color: theme.colors.primary,
    },
    // NEW: Quick Summary Styles (replaces member contributions in hamburger menu)
    quickSummaryRow: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        marginTop: 16,
        gap: 12,
    },
    quickSummaryItem: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: theme.colors.surfaceAlt,
        borderRadius: 12,
        padding: 12,
        gap: 10,
    },
    quickSummaryIcon: {
        width: 36,
        height: 36,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
    },
    quickSummaryValue: {
        fontSize: 15,
        fontWeight: '700',
        color: theme.colors.textPrimary,
    },
    quickSummaryLabel: {
        fontSize: 11,
        color: theme.colors.textTertiary,
        marginTop: 1,
    },
    membersPreview: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 10,
        borderTopWidth: 1,
        borderTopColor: theme.colors.borderLight,
        gap: 10,
    },
    membersPreviewLabel: {
        fontSize: 13,
        color: theme.colors.textSecondary,
    },
    membersAvatarRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    memberMiniAvatar: {
        width: 28,
        height: 28,
        borderRadius: 14,
        borderWidth: 2,
        borderColor: theme.colors.surfaceAlt,
        overflow: 'hidden',
    },
    memberMiniAvatarGradient: {
        width: '100%',
        height: '100%',
        alignItems: 'center',
        justifyContent: 'center',
    },
    memberMiniInitials: {
        fontSize: 11,
        fontWeight: '700',
        color: 'white',
    },
    memberMoreText: {
        fontSize: 10,
        fontWeight: '700',
        color: theme.colors.textSecondary,
        alignSelf: 'center',
        marginTop: 6,
    },
    quickActionsRow: {
        flexDirection: 'row',
        gap: 10,
        marginTop: 14,
        paddingTop: 14,
        borderTopWidth: 1,
        borderTopColor: theme.colors.borderLight,
    },
    quickActionBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 10,
        borderRadius: 10,
        backgroundColor: theme.colors.primaryLight,
        gap: 6,
    },
    quickActionBtnPrimary: {
        backgroundColor: theme.colors.primary,
    },
    quickActionText: {
        fontSize: 13,
        fontWeight: '600',
        color: theme.colors.primary,
    },
    quickActionTextPrimary: {
        fontSize: 13,
        fontWeight: '600',
        color: 'white',
    },
    // Highlighted Approvals Section
    approvalsSectionHighlight: {
        borderRadius: 16,
        padding: 16,
        marginBottom: 12,
        borderWidth: 2,
        borderColor: '#F59E0B',
    },
    approvalsHeaderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    approvalsHeaderLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    pulsingDot: {
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: '#EF4444',
    },
    approvalsHeaderTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: '#92400E',
    },
    approvalsHeaderSubtitle: {
        fontSize: 13,
        color: '#B45309',
        lineHeight: 18,
    },
    pendingBadgeLarge: {
        backgroundColor: '#EF4444',
        paddingHorizontal: 14,
        paddingVertical: 6,
        borderRadius: 20,
    },
    pendingBadgeLargeText: {
        color: 'white',
        fontWeight: '800',
        fontSize: 14,
    },
    approvalCardHighlighted: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'white',
        padding: 16,
        borderRadius: 14,
        marginBottom: 10,
        borderWidth: 1,
        borderColor: '#FDE68A',
        ...theme.shadows.soft,
    },
    approvalIconHighlighted: {
        width: 48,
        height: 48,
        borderRadius: 14,
        backgroundColor: '#FFFBEB',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
        borderWidth: 1,
        borderColor: '#FDE68A',
    },
    reviewNowBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FEF3C7',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 12,
        gap: 2,
    },
    reviewNowText: {
        color: '#F59E0B',
        fontWeight: '700',
        fontSize: 12,
    },
    // No Actions Pending - Success State
    noActionsSectionHighlight: {
        borderRadius: 16,
        padding: 20,
        borderWidth: 2,
        borderColor: '#10B981',
    },
    noActionsContent: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    noActionsIconContainer: {
        marginRight: 16,
    },
    noActionsIconGradient: {
        width: 56,
        height: 56,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
    },
    noActionsTextContainer: {
        flex: 1,
    },
    noActionsTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#065F46',
        marginBottom: 4,
    },
    noActionsSubtitle: {
        fontSize: 14,
        color: '#047857',
        lineHeight: 20,
    },
    noActionsBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'flex-start',
        backgroundColor: 'white',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
        marginTop: 12,
        gap: 6,
    },
    noActionsBadgeText: {
        color: '#059669',
        fontWeight: '700',
        fontSize: 12,
    },
    // Approval Cards
    approvalCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: theme.colors.surface,
        padding: 16,
        borderRadius: 14,
        marginBottom: 10,
        ...theme.shadows.soft,
    },
    approvalIcon: {
        width: 44,
        height: 44,
        borderRadius: 12,
        backgroundColor: '#FFFBEB',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    approvalContent: {
        flex: 1,
    },
    approvalTitle: {
        ...theme.typography.bodyMedium,
        color: theme.colors.textPrimary,
    },
    approvalMeta: {
        ...theme.typography.caption,
        color: theme.colors.textSecondary,
        marginTop: 2,
    },
    // Cards
    card: {
        backgroundColor: theme.colors.surface,
        borderRadius: 16,
        padding: 16,
        marginBottom: 12,
        ...theme.shadows.soft,
    },
    cardRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    iconBox: {
        width: 48,
        height: 48,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    cardContent: {
        flex: 1,
    },
    cardTitle: {
        ...theme.typography.bodyMedium,
        color: theme.colors.textPrimary,
    },
    cardMeta: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        marginTop: 4,
    },
    cardSubtitle: {
        ...theme.typography.caption,
        color: theme.colors.textTertiary,
    },
    adminChip: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FEF3C7',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 12,
        gap: 4,
    },
    adminChipText: {
        color: '#F59E0B',
        fontWeight: '600',
        fontSize: 12,
    },
    // Empty State
    emptyState: {
        alignItems: 'center',
        paddingVertical: 48,
    },
    emptyTitle: {
        ...theme.typography.h4,
        color: theme.colors.textPrimary,
        marginTop: 16,
    },
    emptySubtitle: {
        ...theme.typography.body,
        color: theme.colors.textSecondary,
        marginTop: 4,
    },
    emptyButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: theme.colors.primary,
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderRadius: 12,
        marginTop: 20,
        gap: 8,
    },
    emptyButtonText: {
        color: 'white',
        fontWeight: '600',
        fontSize: 14,
    },
    // Analytics
    analyticsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
        marginTop: 12,
    },
    analyticsCard: {
        width: (SCREEN_WIDTH - 52) / 2,
        backgroundColor: theme.colors.surface,
        borderRadius: 16,
        padding: 16,
        alignItems: 'center',
        ...theme.shadows.soft,
    },
    analyticsIconBox: {
        width: 48,
        height: 48,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 12,
    },
    analyticsValue: {
        ...theme.typography.h2,
        color: theme.colors.textPrimary,
    },
    analyticsLabel: {
        ...theme.typography.caption,
        color: theme.colors.textSecondary,
        marginTop: 4,
    },
    fullAnalyticsBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: theme.colors.primary,
        paddingVertical: 14,
        borderRadius: 12,
        marginTop: 20,
        gap: 8,
    },
    fullAnalyticsText: {
        color: 'white',
        fontWeight: '600',
        fontSize: 15,
    },
    // Invite
    inviteSection: {
        marginTop: 20,
    },
    inviteCard: {
        borderRadius: 24,
        padding: 32,
        alignItems: 'center',
    },
    inviteTitle: {
        ...theme.typography.h2,
        color: 'white',
        marginTop: 16,
    },
    inviteSubtitle: {
        ...theme.typography.body,
        color: 'rgba(255,255,255,0.8)',
        textAlign: 'center',
        marginTop: 8,
        lineHeight: 22,
    },
    inviteButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'white',
        paddingHorizontal: 24,
        paddingVertical: 14,
        borderRadius: 14,
        marginTop: 24,
        gap: 8,
    },
    inviteButtonText: {
        color: '#6366F1',
        fontWeight: '700',
        fontSize: 15,
    },
    // Footer - Clean Sticky Bottom Design
    footer: {
        flexDirection: 'row',
        height: 70,
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 8,
        // Sticky to bottom (no longer absolute/floating)
        backgroundColor: '#FFFFFF',
        width: '100%',
        overflow: 'hidden',
    },
    slidingIndicator: {
        position: 'absolute',
        top: 0,
        bottom: 0,
        left: 8,
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 0,
    },
    slidingIndicatorGradient: {
        width: 50,
        height: 50,
        borderRadius: 25,
        transform: [{ translateY: -6 }], // Align with the active icon's lifted position
    },
    footerTab: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
        zIndex: 1, // Above indicator
    },
    footerTabActive: {
        // No special container style needed, indicator handles bg
    },
    footerIconContainer: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    footerTabIcon: {
        position: 'relative',
        width: 44,
        height: 44,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 22,
        backgroundColor: 'transparent',
        // Removed individual active background
    },
    footerTabIconActive: {
        // Removed, using sliding indicator now
    },
    footerBadge: {
        position: 'absolute',
        top: -2,
        right: -2,
        minWidth: 16,
        height: 16,
        borderRadius: 8,
        backgroundColor: '#EF4444',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2,
        borderColor: '#FFFFFF',
    },
    footerBadgeText: {
        color: 'white',
        fontSize: 9,
        fontWeight: '800',
    },
    footerTabLabel: {
        fontSize: 10,
        color: theme.colors.primaryDark, // WCAG compliant for text on white
        fontWeight: '700',
        position: 'absolute',
        bottom: 2, // Position inside the floating bar (moved down)
        zIndex: 20, // Ensure text is above icon elevation
        elevation: 20,
    },
    // footerTabLabelActive and simple footerTabLabel are handled in JSX logic now
    // Hamburger Button
    hamburgerButton: {
        width: 38,
        height: 38,
        borderRadius: 10,
        backgroundColor: theme.colors.surfaceAlt,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    // Info Modal Styles
    infoModalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    infoModalContent: {
        backgroundColor: theme.colors.surface,
        borderRadius: 24,
        padding: 24,
        width: '100%',
        maxWidth: 360,
        alignItems: 'center',
    },
    infoIconContainer: {
        width: 80,
        height: 80,
        borderRadius: 40,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 20,
    },
    infoTitle: {
        fontSize: 22,
        fontWeight: '700',
        color: theme.colors.textPrimary,
        textAlign: 'center',
        marginBottom: 8,
    },
    infoSubtitle: {
        fontSize: 14,
        color: theme.colors.textSecondary,
        textAlign: 'center',
        marginBottom: 20,
    },
    infoFeatures: {
        width: '100%',
        gap: 16,
        marginBottom: 24,
    },
    infoFeatureItem: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    infoFeatureIcon: {
        width: 40,
        height: 40,
        borderRadius: 12,
        backgroundColor: 'rgba(99, 102, 241, 0.1)',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    infoFeatureText: {
        flex: 1,
    },
    infoFeatureTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: theme.colors.textPrimary,
    },
    infoFeatureDesc: {
        fontSize: 12,
        color: theme.colors.textSecondary,
    },
    infoBtn: {
        width: '100%',
        borderRadius: 14,
        overflow: 'hidden',
    },
    infoBtnGradient: {
        paddingVertical: 14,
        alignItems: 'center',
    },
    infoBtnText: {
        color: 'white',
        fontSize: 16,
        fontWeight: '600',
    },
    // Hamburger Menu Styles
    hamburgerOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
    },
    hamburgerContainer: {
        width: SCREEN_WIDTH * 0.8,
        height: '100%',
        backgroundColor: theme.colors.surface,
    },
    hamburgerHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 20,
        paddingTop: 50,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
    },
    hamburgerLogoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    hamburgerLogo: {
        width: 44,
        height: 44,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    hamburgerTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: theme.colors.textPrimary,
    },
    hamburgerVersion: {
        fontSize: 12,
        color: theme.colors.textTertiary,
    },
    hamburgerClose: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: theme.colors.background,
        alignItems: 'center',
        justifyContent: 'center',
    },
    hamburgerUserCard: {
        flexDirection: 'row',
        alignItems: 'center',
        margin: 20,
        padding: 16,
        borderRadius: 16,
        gap: 12,
    },
    hamburgerUserAvatar: {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: theme.colors.primary,
        alignItems: 'center',
        justifyContent: 'center',
    },
    hamburgerUserInitials: {
        color: 'white',
        fontSize: 18,
        fontWeight: '700',
    },
    hamburgerUserName: {
        fontSize: 16,
        fontWeight: '600',
        color: theme.colors.textPrimary,
    },
    hamburgerUserBadge: {
        fontSize: 12,
        color: theme.colors.secondary,
    },
    hamburgerItems: {
        flex: 1,
        paddingHorizontal: 12,
    },
    hamburgerItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 14,
        borderRadius: 12,
        marginBottom: 4,
    },
    hamburgerItemActive: {
        backgroundColor: 'rgba(99, 102, 241, 0.1)',
    },
    hamburgerItemIcon: {
        width: 40,
        height: 40,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    hamburgerItemLabel: {
        flex: 1,
        fontSize: 15,
        fontWeight: '500',
        color: theme.colors.textPrimary,
    },
    hamburgerLogout: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
        borderTopWidth: 1,
        borderTopColor: theme.colors.border,
        gap: 8,
    },
    hamburgerLogoutText: {
        fontSize: 15,
        fontWeight: '600',
        color: theme.colors.danger,
    },
    // News Modal Styles
    newsModalContainer: {
        flex: 1,
        backgroundColor: theme.colors.background,
    },
    newsModalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 20,
        paddingTop: 50,
        backgroundColor: theme.colors.surface,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
    },
    newsModalTitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    newsModalIcon: {
        width: 44,
        height: 44,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    newsModalTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: theme.colors.textPrimary,
    },
    newsModalSubtitle: {
        fontSize: 12,
        color: theme.colors.textSecondary,
    },
    newsModalClose: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: theme.colors.background,
        alignItems: 'center',
        justifyContent: 'center',
    },
    newsModalActions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    newsModalEditToggle: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: 'rgba(91, 92, 255, 0.1)',
        borderRadius: 12,
        paddingHorizontal: 10,
        paddingVertical: 8,
    },
    newsModalEditToggleText: {
        fontSize: 13,
        fontWeight: '600',
        color: theme.colors.primary,
    },
    newsModalList: {
        flex: 1,
        padding: 20,
    },
    newsModalListContent: {
        paddingBottom: 40,
    },
    livePricesSection: {
        backgroundColor: theme.colors.surface,
        borderRadius: 16,
        padding: 20,
        marginBottom: 20,
    },
    livePricesHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 16,
    },
    liveIndicator: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: theme.colors.success,
    },
    livePricesTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: theme.colors.textPrimary,
    },
    pricesTable: {
        gap: 8,
    },
    priceTableRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 8,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
    },
    marketRowEditBtn: {
        width: 30,
        height: 30,
        borderRadius: 8,
        backgroundColor: theme.colors.surfaceAlt,
        alignItems: 'center',
        justifyContent: 'center',
        marginLeft: 10,
    },
    priceTableName: {
        flex: 1,
        fontSize: 14,
        color: theme.colors.textPrimary,
    },
    priceTableValue: {
        fontSize: 14,
        fontWeight: '600',
        color: theme.colors.textPrimary,
        marginRight: 12,
    },
    priceTableChange: {
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 10,
    },
    priceTableChangeText: {
        fontSize: 12,
        fontWeight: '600',
    },
    modalViewMoreBtn: {
        marginTop: 12,
        alignSelf: 'flex-start',
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: 'rgba(91, 92, 255, 0.1)',
        borderRadius: 10,
        paddingHorizontal: 10,
        paddingVertical: 7,
    },
    modalViewMoreText: {
        fontSize: 12,
        fontWeight: '600',
        color: theme.colors.primary,
    },
    newsStickyHeader: {
        backgroundColor: theme.colors.background,
        paddingTop: 4,
        paddingBottom: 8,
    },
    newsListTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: theme.colors.textPrimary,
        marginBottom: 8,
    },
    newsCard: {
        backgroundColor: theme.colors.surface,
        borderRadius: 16,
        padding: 16,
        marginBottom: 12,
    },
    newsCardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    newsCardBadge: {
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
    },
    newsCardBadgeText: {
        fontSize: 11,
        fontWeight: '600',
        color: theme.colors.secondary,
    },
    newsCardTrend: {
        fontSize: 13,
        fontWeight: '700',
    },
    newsCardTitle: {
        fontSize: 15,
        fontWeight: '600',
        color: theme.colors.textPrimary,
        marginBottom: 4,
    },
    newsCardDesc: {
        fontSize: 13,
        color: theme.colors.textSecondary,
        lineHeight: 20,
    },
    newsCardEditBtn: {
        marginTop: 10,
        alignSelf: 'flex-start',
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: theme.colors.surfaceAlt,
        borderRadius: 10,
        paddingHorizontal: 10,
        paddingVertical: 6,
    },
    newsCardEditText: {
        fontSize: 12,
        fontWeight: '600',
        color: theme.colors.primary,
    },
    editorOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.45)',
        justifyContent: 'center',
        padding: 20,
    },
    editorCard: {
        backgroundColor: theme.colors.surface,
        borderRadius: 16,
        padding: 16,
    },
    editorTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: theme.colors.textPrimary,
        marginBottom: 12,
    },
    editorInput: {
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderRadius: 10,
        paddingHorizontal: 12,
        paddingVertical: 10,
        marginBottom: 10,
        color: theme.colors.textPrimary,
        backgroundColor: theme.colors.surface,
    },
    editorInputMultiline: {
        minHeight: 90,
        textAlignVertical: 'top',
    },
    positiveToggleBtn: {
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderRadius: 10,
        paddingHorizontal: 12,
        paddingVertical: 10,
        marginBottom: 12,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    positiveToggleLabel: {
        fontSize: 13,
        fontWeight: '500',
        color: theme.colors.textSecondary,
    },
    positiveToggleValue: {
        fontSize: 13,
        fontWeight: '700',
    },
    editorActions: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        gap: 10,
    },
    editorCancelBtn: {
        paddingHorizontal: 14,
        paddingVertical: 9,
        borderRadius: 10,
        backgroundColor: theme.colors.surfaceAlt,
    },
    editorCancelText: {
        fontSize: 13,
        fontWeight: '600',
        color: theme.colors.textSecondary,
    },
    editorSaveBtn: {
        paddingHorizontal: 14,
        paddingVertical: 9,
        borderRadius: 10,
        backgroundColor: theme.colors.primary,
    },
    editorSaveText: {
        fontSize: 13,
        fontWeight: '600',
        color: 'white',
    },
    // Market News Section on Home Tab
    marketNewsSection: {
        marginTop: 24,
    },
    marketNewsHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    marketNewsTitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    marketNewsIconGradient: {
        width: 32,
        height: 32,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
    },
    pricesScroll: {
        marginBottom: 16,
        marginHorizontal: -20,
    },
    priceCard: {
        width: 128,
        padding: 14,
        backgroundColor: theme.colors.surface,
        borderRadius: 14,
        marginRight: 12,
        borderWidth: 1,
    },
    priceCardIcon: {
        width: 40,
        height: 40,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 10,
    },
    priceCardName: {
        fontSize: 13,
        fontWeight: '600',
        color: theme.colors.textPrimary,
        marginBottom: 4,
    },
    priceCardRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    priceCardValue: {
        fontSize: 12,
        fontWeight: '500',
        color: theme.colors.textSecondary,
    },
    priceCardTrend: {
        fontSize: 11,
        fontWeight: '600',
    },
    newsItemCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: theme.colors.surface,
        padding: 14,
        borderRadius: 14,
        marginBottom: 10,
    },
    newsItemIcon: {
        width: 44,
        height: 44,
        borderRadius: 12,
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    newsItemContent: {
        flex: 1,
    },
    newsItemTitle: {
        fontSize: 14,
        fontWeight: '500',
        color: theme.colors.textPrimary,
        marginBottom: 4,
    },
    newsItemMeta: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    newsItemBadge: {
        backgroundColor: 'rgba(99, 102, 241, 0.1)',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 10,
    },
    newsItemBadgeText: {
        fontSize: 10,
        fontWeight: '600',
        color: theme.colors.primary,
    },
    newsItemTime: {
        fontSize: 11,
        color: theme.colors.textTertiary,
    },
    // Invitations Styles
    invitationsSection: {
        marginBottom: 20,
        backgroundColor: theme.colors.surface,
        borderRadius: 16,
        overflow: 'hidden',
        ...theme.shadows.soft,
    },
    invitationsHeader: {
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#E0E7FF',
    },
    sectionHeaderRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    invitationsTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: '#5B5CFF',
        marginLeft: 8,
    },
    invitationCard: {
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
    },
    invitationInfo: {
        marginBottom: 4,
    },
    invitationProjectName: {
        fontSize: 16,
        fontWeight: '700',
        color: theme.colors.textPrimary,
        marginBottom: 4,
    },
    invitationRole: {
        fontSize: 14,
        color: theme.colors.textSecondary,
    },
    invitationActions: {
        flexDirection: 'row',
        marginTop: 12,
        gap: 12,
    },
    acceptBtn: {
        flex: 1,
        backgroundColor: '#5B5CFF',
        paddingVertical: 10,
        borderRadius: 8,
        alignItems: 'center',
    },
    acceptBtnText: {
        color: 'white',
        fontWeight: '600',
    },
    declineBtn: {
        flex: 1,
        backgroundColor: '#F3F4F6',
        paddingVertical: 10,
        borderRadius: 8,
        alignItems: 'center',
    },
    declineBtnText: {
        color: theme.colors.textSecondary,
        fontWeight: '600',
    },
});
