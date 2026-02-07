import React, { useState, useCallback, useEffect } from 'react';
import PropTypes from 'prop-types';
import {
    View,
    Text,
    ScrollView,
    StyleSheet,
    TouchableOpacity,
    StatusBar,
    Alert,
    Dimensions,
    Share,
    Modal,
    Platform,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { theme } from '../../components/Theme';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import ProfileMenu from '../../components/ProfileMenu';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NotificationService from '../../services/notificationService';

import {
    recentUpdates,
    getCurrentUser,
    getRelativeTime,
    pendingModifications,
    projects,
    investors,
} from '../../data/mockData';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function InvestorDashboard({ navigation, onLogout }) {
    const currentUser = getCurrentUser();
    const [activeTab, setActiveTab] = useState('home');

    // Get safe area insets for proper Android navigation bar handling
    const insets = useSafeAreaInsets();

    // State for expanded project menu
    const [expandedProject, setExpandedProject] = useState(null);

    // State for profile menu
    const [showProfileMenu, setShowProfileMenu] = useState(false);

    // State for news modal
    const [showNewsModal, setShowNewsModal] = useState(false);

    // Local state for first-time user info modal (persisted with AsyncStorage)
    const [showInfoModal, setShowInfoModal] = useState(false);

    // Check if user has seen the welcome modal before (on mount)
    useEffect(() => {
        const checkFirstTimeUser = async () => {
            try {
                const key = `splitflow_welcome_shown_${currentUser.id}`;
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
            checkFirstTimeUser();
        }
    }, [currentUser?.id]);

    // Dismiss the info modal and save state so it never shows again
    const dismissInfoModal = async () => {
        setShowInfoModal(false);
        try {
            const key = `splitflow_welcome_shown_${currentUser.id}`;
            await AsyncStorage.setItem(key, 'true');
        } catch (error) {
            console.log('Error saving welcome modal state:', error);
        }
    };

    // Ref to prevent double navigation
    const isNavigatingRef = React.useRef(false);

    // State for pending approvals - this will refresh on focus
    const [pendingApprovals, setPendingApprovals] = useState([]);
    const [refreshKey, setRefreshKey] = useState(0);

    // Market prices data
    const marketPrices = [
        { name: 'Coconut', price: '₹28/kg', trend: '+5%', icon: 'tree', color: '#00C853', positive: true },
        { name: 'Rice', price: '₹45/kg', trend: '+2%', icon: 'grain', color: '#FFB300', positive: true },
        { name: 'Tomato', price: '₹35/kg', trend: '-8%', icon: 'food-apple', color: '#FF3D57', positive: false },
        { name: 'Wheat', price: '₹32/kg', trend: '+3%', icon: 'barley', color: '#7C3AED', positive: true },
        { name: 'Copra', price: '₹125/kg', trend: '+12%', icon: 'circle-slice-8', color: '#00D1B2', positive: true },
    ];

    // News items
    const newsItems = [
        { title: "Coconut prices surge in Karnataka markets", time: "2 hours ago", category: "Trending" },
        { title: "New MSP announced for Rabi crops", time: "5 hours ago", category: "Policy" },
        { title: "Organic farming subsidies doubled", time: "1 day ago", category: "Policy" },
    ];

    // Refresh data when screen comes into focus
    useFocusEffect(
        useCallback(() => {
            // Reset navigation guard
            isNavigatingRef.current = false;
            // Recalculate pending approvals from mock data
            const newPendingApprovals = pendingModifications.filter(m => !m.myVote || m.myVote === null);
            setPendingApprovals(newPendingApprovals);
            setRefreshKey(prev => prev + 1);
        }, [])
    );

    // Data 
    const myProjects = projects.filter(p =>
        p.createdBy === currentUser.id ||
        p.projectInvestors?.includes(currentUser.id)
    );
    const myCreatedProjects = projects.filter(p => p.createdBy === currentUser.id);

    const handleProfilePress = () => {
        setShowProfileMenu(true);
    };

    // Calculate pending invitations
    const myInvitations = projects.flatMap(p =>
        (p.pendingInvitations || [])
            .filter(inv => inv.userId === currentUser.id)
            .map(inv => ({ ...inv, project: p }))
    );

    const handleInviteFriends = async () => {
        try {
            await Share.share({
                message: 'Join me on SplitFlow - the easiest way to manage project expenses with your team! Download now: https://splitflow.app',
                title: 'Invite to SplitFlow',
            });
        } catch (error) {
            Alert.alert('Error', 'Could not open share dialog');
        }
    };

    const handleAcceptInvitation = (invitation) => {
        const project = projects.find(p => p.id === invitation.project.id);
        if (project) {
            // Add to investors
            if (!project.projectInvestors.includes(currentUser.id)) {
                project.projectInvestors.push(currentUser.id);
            }
            // Set role
            if (!project.investorRoles) project.investorRoles = {};
            project.investorRoles[currentUser.id] = invitation.role;

            // Remove invitation
            project.pendingInvitations = project.pendingInvitations.filter(inv => inv.id !== invitation.id);

            // Force refresh
            setRefreshKey(prev => prev + 1);

            NotificationService.notifyMemberAdded(currentUser.name, project.name);

            Alert.alert('🎉 Welcome!', `You have joined ${project.name}`);
        }
    };

    const handleDeclineInvitation = (invitation) => {
        const project = projects.find(p => p.id === invitation.project.id);
        if (project) {
            // Remove invitation
            project.pendingInvitations = project.pendingInvitations.filter(inv => inv.id !== invitation.id);
            setRefreshKey(prev => prev + 1);
        }
    };

    // Project item - Account Book Style with Expandable Menu
    const renderProjectItem = (project) => {
        const investorCount = project.projectInvestors?.length || 0;
        const isCreator = project.createdBy === currentUser.id;
        const isExpanded = expandedProject === project.id;

        // Calculate total spending for this project
        const totalSpent = (project.spendings || []).reduce((sum, s) => sum + s.amount, 0);
        const pendingCount = (project.pendingSpendings || []).length;
        const totalTransactions = (project.spendings?.length || 0) + pendingCount;

        // Get project members for metadata
        const projectMembers = (project.projectInvestors || [])
            .map(id => investors.find(inv => inv.id === id))
            .filter(Boolean);

        // Get creator info
        const creatorInfo = investors.find(inv => inv.id === project.createdBy);

        return (
            <View key={project.id} style={styles.projectCardWrapper}>
                <TouchableOpacity
                    style={[styles.projectCard, isExpanded && styles.projectCardExpanded]}
                    onPress={() => {
                        // Only navigate if menu is NOT expanded and not already navigating
                        if (!isExpanded && !isNavigatingRef.current) {
                            isNavigatingRef.current = true;
                            navigation.navigate('ProjectDetail', { projectId: project.id });
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
                                setExpandedProject(isExpanded ? null : project.id);
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
                                <Text style={styles.metadataValue}>{project.startDate || 'N/A'}</Text>
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
                                    isNavigatingRef.current = true;
                                    setExpandedProject(null);
                                    navigation.navigate('ProjectDetail', {
                                        projectId: project.id,
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
                                    isNavigatingRef.current = true;
                                    setExpandedProject(null);
                                    navigation.navigate('ProjectDetail', {
                                        projectId: project.id,
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

                                {pendingApprovals.slice(0, 3).map((approval) => (
                                    <TouchableOpacity
                                        key={approval.id}
                                        style={styles.approvalCardHighlighted}
                                        onPress={() => navigation.navigate('ProjectApprovalDetail', { modificationId: approval.id })}
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
                                {myInvitations.map(invitation => (
                                    <View key={invitation.id} style={styles.invitationCard}>
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
                                myProjects.map(renderProjectItem)
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
                                <TouchableOpacity style={styles.viewAllBtn} onPress={() => setShowNewsModal(true)}>
                                    <Text style={styles.viewAllText}>View All</Text>
                                    <MaterialCommunityIcons name="chevron-right" size={16} color={theme.colors.primary} />
                                </TouchableOpacity>
                            </View>

                            {/* Market Prices Horizontal Scroll */}
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.pricesScroll} contentContainerStyle={{ paddingHorizontal: 20 }}>
                                {marketPrices.map((item, index) => (
                                    <View key={item.name} style={[styles.priceCard, { borderColor: item.color + '40' }]}>
                                        <View style={[styles.priceCardIcon, { backgroundColor: item.color + '20' }]}>
                                            <MaterialCommunityIcons name={item.icon} size={22} color={item.color} />
                                        </View>
                                        <Text style={styles.priceCardName}>{item.name}</Text>
                                        <View style={styles.priceCardRow}>
                                            <Text style={styles.priceCardValue}>{item.price}</Text>
                                            <Text style={[styles.priceCardTrend, { color: item.positive ? theme.colors.success : theme.colors.danger }]}>
                                                {item.trend}
                                            </Text>
                                        </View>
                                    </View>
                                ))}
                            </ScrollView>

                            {/* News Items */}
                            {newsItems.slice(0, 2).map((news, index) => (
                                <TouchableOpacity key={index} style={styles.newsItemCard} onPress={() => setShowNewsModal(true)}>
                                    <View style={styles.newsItemIcon}>
                                        <MaterialCommunityIcons name="leaf" size={22} color={theme.colors.secondary} />
                                    </View>
                                    <View style={styles.newsItemContent}>
                                        <Text style={styles.newsItemTitle}>{news.title}</Text>
                                        <View style={styles.newsItemMeta}>
                                            <View style={styles.newsItemBadge}>
                                                <Text style={styles.newsItemBadgeText}>{news.category}</Text>
                                            </View>
                                            <Text style={styles.newsItemTime}>{news.time}</Text>
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
                            myProjects.map(renderProjectItem)
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
                            pendingApprovals.map((approval) => (
                                <TouchableOpacity
                                    key={approval.id}
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
                                    {myProjects.reduce((sum, p) => sum + (p.projectInvestors?.length || 0), 0)}
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

    // Footer tabs - Approvals in center, Expenses at last
    const footerTabs = [
        { id: 'home', icon: 'home', label: 'Home' },
        { id: 'projects', icon: 'briefcase-outline', label: 'Projects' },
        { id: 'approvals', icon: 'check-circle-outline', label: 'Approvals', badge: pendingApprovals.length },
        { id: 'analytics', icon: 'chart-line', label: 'Analytics' },
        { id: 'expenses', icon: 'wallet-outline', label: 'Expenses', isNavigation: true, navScreen: 'DailyExpenses' },
    ];

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <StatusBar barStyle="dark-content" backgroundColor={theme.colors.background} />

            {/* Header */}
            <View style={styles.appBar}>
                <View style={styles.appBarContent}>
                    <Text style={styles.greeting}>Welcome back</Text>
                    <Text style={styles.userName} numberOfLines={1}>{currentUser.name}</Text>
                </View>
                <View style={styles.appBarActions}>
                    <TouchableOpacity
                        style={styles.iconButton}
                        onPress={() => navigation.navigate('Notifications')}
                        activeOpacity={0.7}
                    >
                        <MaterialCommunityIcons name="bell" size={26} color="#FFB300" />
                        {recentUpdates.filter(u => !u.read).length > 0 && (
                            <View style={styles.notifBadge}>
                                <Text style={styles.notifBadgeText}>
                                    {recentUpdates.filter(u => !u.read).length > 9
                                        ? '9+'
                                        : recentUpdates.filter(u => !u.read).length}
                                </Text>
                            </View>
                        )}
                    </TouchableOpacity>
                    <TouchableOpacity onPress={handleProfilePress} style={styles.avatarButton}>
                        <LinearGradient colors={['#5B5CFF', '#7C3AED']} style={styles.avatar}>
                            <Text style={styles.avatarText}>
                                {currentUser.name.split(' ').map(n => n[0]).join('')}
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

            {/* Footer Navigation */}
            <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, Platform.OS === 'android' ? 16 : 20) }]}>
                {footerTabs.map((tab) => (
                    <TouchableOpacity
                        key={tab.id}
                        style={styles.footerTab}
                        onPress={() => {
                            if (tab.isNavigation && tab.navScreen) {
                                navigation.navigate(tab.navScreen);
                            } else {
                                setActiveTab(tab.id);
                            }
                        }}
                        activeOpacity={0.7}
                    >
                        <View style={[styles.footerTabIcon, activeTab === tab.id && styles.footerTabIconActive]}>
                            <MaterialCommunityIcons
                                name={tab.icon}
                                size={24}
                                color={activeTab === tab.id ? theme.colors.primary : theme.colors.textTertiary}
                            />
                            {tab.badge > 0 && (
                                <View style={styles.footerBadge}>
                                    <Text style={styles.footerBadgeText}>
                                        {tab.badge > 9 ? '9+' : tab.badge}
                                    </Text>
                                </View>
                            )}
                        </View>
                        <Text style={[
                            styles.footerTabLabel,
                            activeTab === tab.id && styles.footerTabLabelActive
                        ]}>
                            {tab.label}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>

            {/* Profile Menu Modal */}
            <ProfileMenu
                visible={showProfileMenu}
                onClose={() => setShowProfileMenu(false)}
                onProfile={() => navigation.navigate('Profile')}
                onSettings={() => navigation.navigate('Settings')}
                onLogout={onLogout}
                onShare={handleInviteFriends}
                userName={currentUser.name}
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

            {/* News Modal */}
            <Modal visible={showNewsModal} animationType="slide">
                <View style={styles.newsModalContainer}>
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
                        <TouchableOpacity style={styles.newsModalClose} onPress={() => setShowNewsModal(false)}>
                            <Ionicons name="close" size={24} color={theme.colors.textSecondary} />
                        </TouchableOpacity>
                    </View>

                    <ScrollView style={styles.newsModalScroll} contentContainerStyle={{ paddingBottom: 40 }}>
                        {/* Live Prices */}
                        <View style={styles.livePricesSection}>
                            <View style={styles.livePricesHeader}>
                                <View style={styles.liveIndicator} />
                                <Text style={styles.livePricesTitle}>Live Market Prices</Text>
                            </View>
                            <View style={styles.pricesTable}>
                                {[
                                    { name: 'Coconut (Raw)', price: '₹28/kg', change: '+5.2%', positive: true },
                                    { name: 'Copra', price: '₹12,500/q', change: '+8.1%', positive: true },
                                    { name: 'Coconut Oil', price: '₹185/L', change: '+3.4%', positive: true },
                                    { name: 'Rice (Basmati)', price: '₹95/kg', change: '+1.2%', positive: true },
                                    { name: 'Wheat', price: '₹32/kg', change: '+2.8%', positive: true },
                                    { name: 'Tomato', price: '₹35/kg', change: '-8.0%', positive: false },
                                ].map((item, index) => (
                                    <View key={item.name} style={styles.priceTableRow}>
                                        <Text style={styles.priceTableName}>{item.name}</Text>
                                        <Text style={styles.priceTableValue}>{item.price}</Text>
                                        <View style={[styles.priceTableChange, { backgroundColor: item.positive ? '#D1FAE5' : '#FEE2E2' }]}>
                                            <Text style={[styles.priceTableChangeText, { color: item.positive ? theme.colors.success : theme.colors.danger }]}>
                                                {item.change}
                                            </Text>
                                        </View>
                                    </View>
                                ))}
                            </View>
                        </View>

                        {/* News List */}
                        <Text style={styles.newsListTitle}>Latest News</Text>
                        {[
                            { title: "Coconut prices surge 15% in Karnataka", desc: "Strong demand from oil mills drives prices higher across southern markets.", category: "Coconut", trend: "+15%" },
                            { title: "Rice exports hit record high", desc: "India becomes world's largest rice exporter with 22 million tonnes.", category: "Rice", trend: "+8%" },
                            { title: "Tomato prices stabilize after monsoon", desc: "Supply improves as harvest season begins in major producing states.", category: "Vegetables", trend: "-12%" },
                            { title: "New MSP for Rabi crops 2026", desc: "Government announces minimum support prices for wheat, mustard, gram.", category: "Policy", trend: "New" },
                            { title: "Organic farming subsidies doubled", desc: "State government increases support for sustainable agriculture.", category: "Policy", trend: "New" },
                        ].map((news, index) => (
                            <View key={index} style={styles.newsCard}>
                                <View style={styles.newsCardHeader}>
                                    <View style={styles.newsCardBadge}>
                                        <Text style={styles.newsCardBadgeText}>{news.category}</Text>
                                    </View>
                                    <Text style={[
                                        styles.newsCardTrend,
                                        { color: news.trend.startsWith('+') ? theme.colors.success : news.trend.startsWith('-') ? theme.colors.danger : theme.colors.secondary }
                                    ]}>
                                        {news.trend}
                                    </Text>
                                </View>
                                <Text style={styles.newsCardTitle}>{news.title}</Text>
                                <Text style={styles.newsCardDesc}>{news.desc}</Text>
                            </View>
                        ))}
                    </ScrollView>
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
    // Footer - Enhanced Premium Design
    footer: {
        flexDirection: 'row',
        backgroundColor: theme.colors.surface,
        borderTopWidth: 0,
        paddingTop: 8,
        paddingHorizontal: 4,
        // Premium shadow for floating effect
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.06,
        shadowRadius: 12,
        elevation: 8,
        // Subtle rounded corners
        borderTopLeftRadius: 16,
        borderTopRightRadius: 16,
    },
    footerTab: {
        flex: 1,
        alignItems: 'center',
        paddingVertical: 4,
    },
    footerTabIcon: {
        position: 'relative',
        width: 38,
        height: 38,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 12,
    },
    footerTabIconActive: {
        backgroundColor: 'rgba(91, 92, 255, 0.14)',
    },
    footerBadge: {
        position: 'absolute',
        top: 4,
        right: 4,
        minWidth: 18,
        height: 18,
        borderRadius: 9,
        backgroundColor: '#FF3D57',
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 4,
        borderWidth: 2,
        borderColor: theme.colors.surface,
    },
    footerBadgeText: {
        color: 'white',
        fontSize: 10,
        fontWeight: '700',
    },
    footerTabLabel: {
        fontSize: 10,
        color: theme.colors.textTertiary,
        marginTop: 2,
        fontWeight: '500',
    },
    footerTabLabelActive: {
        color: theme.colors.primary,
        fontWeight: '700',
    },
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
    newsModalScroll: {
        flex: 1,
        padding: 20,
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
    newsListTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: theme.colors.textPrimary,
        marginBottom: 12,
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
