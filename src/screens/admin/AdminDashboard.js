import React, { useState, useEffect, useRef } from 'react';
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
    Dimensions,
    Animated,
    Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme, formatCurrency, getStatusColor, getStatusBgColor } from '../../components/Theme';
import Ionicons from 'react-native-vector-icons/Ionicons';
import LinearGradient from 'react-native-linear-gradient';
import ProfileMenu from '../../components/ProfileMenu';

// Import from centralized data
import { getRelativeTime } from '../../utils/dateTimeUtils';
import { api } from '../../services/api';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const DASHBOARD_MARKET_PRICE_CAP = 5;
const DASHBOARD_NEWS_CAP = 3;
const MODAL_MARKET_PRICE_INITIAL_CAP = 6;

// KPICard component moved outside AdminDashboard to avoid nested component definition
const KPICard = ({ icon, label, value, color }) => (
    <Animated.View
        style={[
            styles.kpiCard,
            {
                transform: [{ translateY: new Animated.Value(0) }]
            }
        ]}
    >
        <View style={[styles.kpiIcon, { backgroundColor: color + '15' }]}>
            <Ionicons name={icon} size={18} color={color} />
        </View>
        <Text style={styles.kpiValue}>{value}</Text>
        <Text style={styles.kpiLabel} numberOfLines={1}>{label}</Text>
    </Animated.View>
);

const getTrendColor = (trend) => {
    if (typeof trend !== 'string') return theme.colors.secondary;
    if (trend.startsWith('+')) return theme.colors.success;
    if (trend.startsWith('-')) return theme.colors.danger;
    return theme.colors.secondary;
};

KPICard.propTypes = {
    icon: PropTypes.string.isRequired,
    label: PropTypes.string.isRequired,
    value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
    color: PropTypes.string.isRequired,
};

export default function AdminDashboard({ navigation, onLogout }) {
    const [approvals, setApprovals] = useState([]);
    const [activeTab, setActiveTab] = useState('overview');
    const [showProfileMenu, setShowProfileMenu] = useState(false);

    // API-driven state
    const [adminStats, setAdminStats] = useState(null);
    const [projects, setProjects] = useState([]);
    const [showNewsModal, setShowNewsModal] = useState(false);
    const [marketPrices, setMarketPrices] = useState([]);
    const [newsItems, setNewsItems] = useState([]);
    const [marketPricesModalCap, setMarketPricesModalCap] = useState(MODAL_MARKET_PRICE_INITIAL_CAP);

    // Animation values
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const headerSlide = useRef(new Animated.Value(-50)).current;
    const kpiScale = useRef(new Animated.Value(0.8)).current;
    const contentSlide = useRef(new Animated.Value(50)).current;

    useEffect(() => {
        const fetchAdminData = async () => {
            try {
                const [statsData, projectsData, modificationsData] = await Promise.all([
                    api.getAdminStats(),
                    api.getProjects(),
                    api.getModifications().catch(() => []),
                ]);
                setAdminStats(statsData);
                setProjects(projectsData || []);
                // Pending approvals are modifications with status 'pending'
                const pending = (modificationsData || []).filter(m => m.status === 'pending');
                setApprovals(pending);

                const [pricesData, newsData] = await Promise.all([
                    api.getMarketPrices().catch(() => []),
                    api.getNews().catch(() => []),
                ]);
                setMarketPrices(Array.isArray(pricesData) ? pricesData.filter(Boolean) : []);
                setNewsItems(Array.isArray(newsData) ? newsData.filter(Boolean) : []);
            } catch (err) {
                console.error('Failed to load admin data:', err);
                Alert.alert('Error', 'Failed to load dashboard data');
            }
        };
        fetchAdminData();

        Animated.parallel([
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 600,
                useNativeDriver: true,
            }),
            Animated.spring(headerSlide, {
                toValue: 0,
                tension: 50,
                friction: 8,
                useNativeDriver: true,
            }),
            Animated.spring(kpiScale, {
                toValue: 1,
                tension: 60,
                friction: 6,
                delay: 200,
                useNativeDriver: true,
            }),
            Animated.spring(contentSlide, {
                toValue: 0,
                tension: 50,
                friction: 8,
                delay: 300,
                useNativeDriver: true,
            }),
        ]).start();
    }, []);

    // Animate tab change
    const animateTabChange = (tab) => {
        if (tab === activeTab) return;

        // Fade out
        Animated.parallel([
            Animated.timing(fadeAnim, {
                toValue: 0,
                duration: 150,
                useNativeDriver: true,
            }),
            Animated.timing(contentSlide, {
                toValue: 20,
                duration: 150,
                useNativeDriver: true,
            }),
        ]).start(() => {
            setActiveTab(tab);
            contentSlide.setValue(20);

            // Fade in
            Animated.parallel([
                Animated.timing(fadeAnim, {
                    toValue: 1,
                    duration: 250,
                    useNativeDriver: true,
                }),
                Animated.spring(contentSlide, {
                    toValue: 0,
                    tension: 50,
                    friction: 7,
                    useNativeDriver: true,
                }),
            ]).start();
        });
    };

    const handleApprove = async (approvalId) => {
        try {
            await api.approveRequest(approvalId);
            setApprovals(prev => prev.filter(a => a.id !== approvalId));
            Alert.alert('✅ Success', 'Request approved successfully');
        } catch {
            // Handle approval error
            Alert.alert('Error', 'Failed to approve request');
        }
    };

    const processReject = async (approvalId) => {
        try {
            await api.rejectRequest(approvalId, 'Rejected by admin');
            setApprovals(prev => prev.filter(a => a.id !== approvalId));
        } catch {
            // Handle rejection error
            Alert.alert('Error', 'Failed to reject request');
        }
    };

    const handleReject = (approvalId) => {
        Alert.alert(
            'Confirm Rejection',
            'Are you sure you want to reject this request?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Reject',
                    style: 'destructive',
                    onPress: () => {
                        processReject(approvalId);
                    }
                },
            ]
        );
    };



    const handleProfilePress = () => {
        setShowProfileMenu(true);
    };

    const openNewsModal = () => {
        setMarketPricesModalCap(MODAL_MARKET_PRICE_INITIAL_CAP);
        setShowNewsModal(true);
    };

    const closeNewsModal = () => {
        setShowNewsModal(false);
    };

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <StatusBar barStyle="dark-content" />

            {/* Premium Header */}
            <Animated.View
                style={[
                    styles.header,
                    {
                        opacity: fadeAnim,
                        transform: [{ translateY: headerSlide }]
                    }
                ]}
            >
                <View>
                    <Text style={styles.headerLabel}>ADMIN PORTAL</Text>
                    <Text style={styles.headerTitle}>Dashboard</Text>
                </View>
                <TouchableOpacity onPress={handleProfilePress}>
                    <LinearGradient
                        colors={['#667eea', '#764ba2']}
                        style={styles.profileBtn}
                    >
                        <Text style={styles.profileInitials}>LM</Text>
                    </LinearGradient>
                </TouchableOpacity>
            </Animated.View>

            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                {/* Hero AUM Card */}
                <Animated.View style={{ transform: [{ scale: kpiScale }] }}>
                    <LinearGradient
                        colors={['#667eea', '#764ba2']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.aumCard}
                    >
                        {/* Decorative Elements */}
                        <View style={styles.aumDecor1} />
                        <View style={styles.aumDecor2} />

                        <View style={styles.aumHeader}>
                            <View style={styles.aumLabelContainer}>
                                <Ionicons name="wallet" size={16} color="rgba(255,255,255,0.7)" />
                                <Text style={styles.aumLabel}>Total Assets Under Management</Text>
                            </View>
                            <View style={styles.aumGrowth}>
                                <Ionicons name="trending-up" size={14} color="#4ADE80" />
                                <Text style={styles.aumGrowthText}>+{adminStats?.monthlyGrowth || 0}%</Text>
                            </View>
                        </View>
                        <Text style={styles.aumValue}>{formatCurrency(adminStats?.totalAUM || 0)}</Text>
                        <Text style={styles.aumSubtext}>Across {adminStats?.activeProjects || 0} active projects</Text>
                    </LinearGradient>
                </Animated.View>

                {/* KPI Grid */}
                <Animated.View
                    style={[
                        styles.kpiGrid,
                        {
                            opacity: fadeAnim,
                            transform: [{ translateY: contentSlide }]
                        }
                    ]}
                >
                    <KPICard
                        icon="briefcase"
                        label="Projects"
                        value={adminStats?.activeProjects || 0}
                        color={theme.colors.success}
                    />
                    <KPICard
                        icon="people"
                        label="Investors"
                        value={adminStats?.totalInvestors || 0}
                        color={theme.colors.info}
                    />
                    <KPICard
                        icon="time"
                        label="Pending"
                        value={approvals.length}
                        color={approvals.length > 0 ? theme.colors.warning : theme.colors.success}
                    />
                </Animated.View>

                {/* Tab Navigation */}
                <View style={styles.tabBar}>
                    {[
                        { key: 'overview', label: 'Overview', icon: 'grid' },
                        { key: 'approvals', label: 'Approvals', icon: 'checkmark-circle', badge: approvals.length },
                        { key: 'projects', label: 'Projects', icon: 'business' },
                    ].map(tab => (
                        <TouchableOpacity
                            key={tab.key}
                            style={[
                                styles.tab,
                                // Remove dynamic background here, handled by wrapper or logic below
                            ]}
                            onPress={() => animateTabChange(tab.key)}
                            activeOpacity={0.8}
                        >
                            {activeTab === tab.key && (
                                <LinearGradient
                                    colors={theme.colors.primaryGradient}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 0 }}
                                    style={[StyleSheet.absoluteFillObject, { borderRadius: 12 }]}
                                />
                            )}
                            <Ionicons
                                name={tab.icon}
                                size={18}
                                color={activeTab === tab.key ? 'white' : theme.colors.textSecondary}
                            />
                            <Text style={[styles.tabLabel, activeTab === tab.key && styles.tabLabelActive]}>
                                {tab.label}
                            </Text>
                            {tab.badge > 0 && (
                                <View style={styles.tabBadge}>
                                    <Text style={styles.tabBadgeText}>
                                        {tab.badge > 9 ? '9+' : tab.badge}
                                    </Text>
                                </View>
                            )}
                        </TouchableOpacity>
                    ))}
                </View>

                {/* Tab Content */}
                <Animated.View style={{ opacity: fadeAnim }}>
                    {/* Overview Tab */}
                    {activeTab === 'overview' && (
                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>Quick Actions</Text>
                            <View style={styles.actionsGrid}>
                                {[
                                    { icon: 'add-circle', label: 'New Project', colors: [theme.colors.primary, '#8B5CF6'], screen: 'CreateProject' },
                                    { icon: 'megaphone', label: 'Announce', colors: [theme.colors.success, '#06B6D4'], screen: 'Announcements' },
                                    { icon: 'document-text', label: 'Reports', colors: ['#F59E0B', '#F97316'], screen: null },
                                    { icon: 'person-add', label: 'Add Investor', colors: ['#3B82F6', '#6366F1'], screen: 'AddInvestor' },
                                ].map((action) => (
                                    <TouchableOpacity
                                        key={action.label}
                                        style={styles.actionCard}
                                        activeOpacity={0.8}
                                        onPress={() => {
                                            if (action.screen) {
                                                navigation.navigate(action.screen);
                                            } else {
                                                Alert.alert("Coming Soon", `${action.label} feature is under development`);
                                            }
                                        }}
                                    >
                                        <LinearGradient
                                            colors={action.colors}
                                            start={{ x: 0, y: 0 }}
                                            end={{ x: 1, y: 1 }}
                                            style={styles.actionCardGradient}
                                        >
                                            <Ionicons name={action.icon} size={28} color="white" />
                                            <Text style={styles.actionCardLabel}>{action.label}</Text>
                                        </LinearGradient>
                                    </TouchableOpacity>
                                ))}
                            </View>

                            <Text style={[styles.sectionTitle, { marginTop: theme.spacing.l }]}>Recent Activity</Text>
                            <View style={styles.activityCard}>
                                <View style={styles.activityItem}>
                                    <View style={[styles.activityDot, { backgroundColor: theme.colors.success }]} />
                                    <View style={styles.activityContent}>
                                        <Text style={styles.activityText}>New investment from <Text style={styles.activityBold}>Priya Patel</Text></Text>
                                        <Text style={styles.activityTime}>2 hours ago</Text>
                                    </View>
                                </View>
                                <View style={styles.activityItem}>
                                    <View style={[styles.activityDot, { backgroundColor: theme.colors.info }]} />
                                    <View style={styles.activityContent}>
                                        <Text style={styles.activityText}>Q3 Report published for <Text style={styles.activityBold}>Green Valley</Text></Text>
                                        <Text style={styles.activityTime}>Yesterday</Text>
                                    </View>
                                </View>
                            </View>

                            <View style={styles.marketNewsSection}>
                                <View style={styles.marketNewsHeader}>
                                    <View style={styles.marketNewsTitleRow}>
                                        <LinearGradient
                                            colors={['#00C853', '#00A844']}
                                            style={styles.marketNewsIconGradient}
                                        >
                                            <Ionicons name="leaf" size={18} color="white" />
                                        </LinearGradient>
                                        <Text style={styles.sectionTitle}>Market News</Text>
                                    </View>
                                    <TouchableOpacity style={styles.viewAllBtn} onPress={openNewsModal}>
                                        <Text style={styles.viewAllText}>View All</Text>
                                        <Ionicons name="chevron-forward" size={16} color={theme.colors.primary} />
                                    </TouchableOpacity>
                                </View>

                                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.pricesScroll} contentContainerStyle={{ paddingHorizontal: 0 }}>
                                    {marketPrices.slice(0, DASHBOARD_MARKET_PRICE_CAP).map((item, index) => (
                                        <View key={item?._id || item?.id || `${item?.name || 'price'}-${index}`} style={[styles.priceCard, { borderColor: (item?.color || theme.colors.primary) + '40' }]}>
                                            <View style={[styles.priceCardIcon, { backgroundColor: (item?.color || theme.colors.primary) + '20' }]}>
                                                <Ionicons name="trending-up" size={20} color={item?.color || theme.colors.primary} />
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

                                {newsItems.slice(0, DASHBOARD_NEWS_CAP).map((news, index) => (
                                    <TouchableOpacity key={news?._id || news?.id || `${news?.title || 'news'}-${index}`} style={styles.newsItemCard} onPress={openNewsModal}>
                                        <View style={styles.newsItemIcon}>
                                            <Ionicons name="newspaper-outline" size={20} color={theme.colors.secondary} />
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
                                        <Ionicons name="chevron-forward" size={18} color={theme.colors.textTertiary} />
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </View>
                    )}

                    {/* Approvals Tab */}
                    {activeTab === 'approvals' && (
                        <View style={styles.section}>
                            {approvals.length === 0 ? (
                                <View style={styles.emptyState}>
                                    <View style={styles.emptyIcon}>
                                        <Ionicons name="checkmark-done-circle" size={64} color={theme.colors.success} />
                                    </View>
                                    <Text style={styles.emptyStateTitle}>All Caught Up!</Text>
                                    <Text style={styles.emptyStateText}>No pending approvals at the moment.</Text>
                                </View>
                            ) : (
                                approvals.map((item) => (
                                    <View key={item.id} style={styles.approvalCard}>
                                        <View style={styles.approvalHeader}>
                                            <View style={[styles.approvalTypeIcon, {
                                                backgroundColor: item.type === 'withdrawal' ? theme.colors.dangerLight : theme.colors.successLight
                                            }]}>
                                                <Ionicons
                                                    name={item.type === 'withdrawal' ? 'arrow-up-circle' : 'add-circle'}
                                                    size={24}
                                                    color={item.type === 'withdrawal' ? theme.colors.danger : theme.colors.success}
                                                />
                                            </View>
                                            <View style={styles.approvalInfo}>
                                                <Text style={styles.approvalType}>
                                                    {item.type === 'withdrawal' ? 'Withdrawal Request' : 'New Investment'}
                                                </Text>
                                                <Text style={styles.approvalInvestor}>{item.investor.name}</Text>
                                                <Text style={styles.approvalMeta}>{item.project}</Text>
                                            </View>
                                            <View style={styles.approvalAmountContainer}>
                                                <Text style={styles.approvalAmount}>{formatCurrency(item.amount)}</Text>
                                                <Text style={styles.approvalTime}>{getRelativeTime(item.requestedAt)}</Text>
                                            </View>
                                        </View>

                                        <View style={styles.approvalActions}>
                                            <TouchableOpacity
                                                style={styles.rejectBtn}
                                                onPress={() => handleReject(item.id)}
                                                activeOpacity={0.7}
                                            >
                                                <Ionicons name="close" size={18} color={theme.colors.danger} />
                                                <Text style={styles.rejectBtnText}>Reject</Text>
                                            </TouchableOpacity>
                                            <TouchableOpacity
                                                style={styles.approveBtn}
                                                onPress={() => handleApprove(item.id)}
                                                activeOpacity={0.7}
                                            >
                                                <LinearGradient
                                                    colors={[theme.colors.success, '#059669']}
                                                    start={{ x: 0, y: 0 }}
                                                    end={{ x: 1, y: 0 }}
                                                    style={styles.approveBtnGradient}
                                                >
                                                    <Ionicons name="checkmark" size={18} color="white" />
                                                    <Text style={styles.approveBtnText}>Approve</Text>
                                                </LinearGradient>
                                            </TouchableOpacity>
                                        </View>
                                    </View>
                                ))
                            )}
                        </View>
                    )}

                    {/* Projects Tab */}
                    {activeTab === 'projects' && (
                        <View style={styles.section}>
                            {projects.map((project, index) => (
                                <TouchableOpacity key={project.id} style={styles.projectCard} activeOpacity={0.8}>
                                    <View style={styles.projectHeader}>
                                        <View style={styles.projectIcon}>
                                            <LinearGradient
                                                colors={[theme.colors.primary, '#8B5CF6']}
                                                style={styles.projectIconGradient}
                                            >
                                                <Ionicons name="business" size={22} color="white" />
                                            </LinearGradient>
                                        </View>
                                        <View style={styles.projectInfo}>
                                            <Text style={styles.projectName}>{project.name}</Text>
                                            <Text style={styles.projectType}>{project.type} • {project.phase}</Text>
                                        </View>
                                        <View style={[styles.statusBadge, { backgroundColor: getStatusBgColor(project.status) }]}>
                                            <Text style={[styles.statusText, { color: getStatusColor(project.status) }]}>
                                                {project.status}
                                            </Text>
                                        </View>
                                    </View>

                                    <View style={styles.projectStats}>
                                        <View style={styles.projectStat}>
                                            <Text style={styles.projectStatValue}>{project.investorCount}</Text>
                                            <Text style={styles.projectStatLabel}>Investors</Text>
                                        </View>
                                        <View style={styles.projectStat}>
                                            <Text style={styles.projectStatValue}>{formatCurrency(project.raised)}</Text>
                                            <Text style={styles.projectStatLabel}>Raised</Text>
                                        </View>
                                        <View style={styles.projectStat}>
                                            <Text style={[styles.projectStatValue, { color: theme.colors.success }]}>{project.progress}%</Text>
                                            <Text style={styles.projectStatLabel}>Progress</Text>
                                        </View>
                                    </View>

                                    <View style={styles.progressBar}>
                                        <LinearGradient
                                            colors={[theme.colors.success, '#06B6D4']}
                                            start={{ x: 0, y: 0 }}
                                            end={{ x: 1, y: 0 }}
                                            style={[styles.progressFill, { width: `${project.progress}%` }]}
                                        />
                                    </View>
                                </TouchableOpacity>
                            ))}

                            <TouchableOpacity
                                style={styles.addProjectBtn}
                                activeOpacity={0.7}
                                onPress={() => Alert.alert("Coming Soon", "Create New Project feature is under development")}
                            >
                                <Ionicons name="add" size={24} color={theme.colors.primary} />
                                <Text style={styles.addProjectText}>Create New Project</Text>
                            </TouchableOpacity>
                        </View>
                    )}
                </Animated.View>
            </ScrollView>

            {/* Profile Menu Modal */}
            <ProfileMenu
                visible={showProfileMenu}
                onClose={() => setShowProfileMenu(false)}
                onProfile={() => navigation.navigate('Profile')}
                onSettings={() => navigation.navigate('Settings')}
                onLogout={onLogout}
                userName="Admin"
            />

            <Modal visible={showNewsModal} animationType="slide">
                <View style={styles.newsModalContainer}>
                    <View style={styles.newsModalHeader}>
                        <View style={styles.newsModalTitleRow}>
                            <LinearGradient colors={['#00C853', '#00A844']} style={styles.newsModalIcon}>
                                <Ionicons name="leaf" size={24} color="white" />
                            </LinearGradient>
                            <View>
                                <Text style={styles.newsModalTitle}>Agriculture News</Text>
                                <Text style={styles.newsModalSubtitle}>Market prices & updates</Text>
                            </View>
                        </View>
                        <TouchableOpacity style={styles.newsModalClose} onPress={closeNewsModal}>
                            <Ionicons name="close" size={24} color={theme.colors.textSecondary} />
                        </TouchableOpacity>
                    </View>

                    <SectionList
                        style={{ flex: 1 }}
                        contentContainerStyle={{ paddingBottom: 40 }}
                        stickySectionHeadersEnabled={true}
                        sections={[{ title: 'Latest News', data: newsItems }]}
                        keyExtractor={(item, index) => item?._id || item?.id || `${item?.title || 'news'}-${index}`}
                        keyboardShouldPersistTaps="handled"
                        showsVerticalScrollIndicator={true}
                        bounces={true}
                        overScrollMode="always"
                        ListHeaderComponent={
                            <View style={{ paddingHorizontal: 20, paddingTop: 12, paddingBottom: 4 }}>
                                <View style={styles.livePricesSection}>
                                    <View style={styles.livePricesHeader}>
                                        <View style={styles.liveIndicator} />
                                        <Text style={styles.livePricesTitle}>Live Market Prices</Text>
                                    </View>
                                    <View style={styles.pricesTable}>
                                        {marketPrices.slice(0, marketPricesModalCap).map((item, index) => (
                                            <View key={item?._id || item?.id || `${item?.name || 'price'}-${index}`} style={styles.priceTableRow}>
                                                <Text style={styles.priceTableName}>{item?.name || 'Market Item'}</Text>
                                                <Text style={styles.priceTableValue}>{item?.price || '-'}</Text>
                                                <View style={[styles.priceTableChange, { backgroundColor: item?.positive ? '#D1FAE5' : '#FEE2E2' }]}>
                                                    <Text style={[styles.priceTableChangeText, { color: item?.positive ? theme.colors.success : theme.colors.danger }]}>
                                                        {item?.trend || '--'}
                                                    </Text>
                                                </View>
                                            </View>
                                        ))}
                                    </View>
                                    {marketPrices.length > MODAL_MARKET_PRICE_INITIAL_CAP && marketPricesModalCap <= MODAL_MARKET_PRICE_INITIAL_CAP && (
                                        <TouchableOpacity
                                            style={styles.modalViewMoreBtn}
                                            onPress={() => setMarketPricesModalCap(marketPrices.length)}
                                        >
                                            <Text style={styles.modalViewMoreText}>View More</Text>
                                            <Ionicons name="chevron-down" size={16} color={theme.colors.primary} />
                                        </TouchableOpacity>
                                    )}
                                    {marketPrices.length > MODAL_MARKET_PRICE_INITIAL_CAP && marketPricesModalCap > MODAL_MARKET_PRICE_INITIAL_CAP && (
                                        <TouchableOpacity
                                            style={styles.modalViewMoreBtn}
                                            onPress={() => setMarketPricesModalCap(MODAL_MARKET_PRICE_INITIAL_CAP)}
                                        >
                                            <Text style={styles.modalViewMoreText}>Show Less</Text>
                                            <Ionicons name="chevron-up" size={16} color={theme.colors.primary} />
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
                                    <Text style={[styles.newsCardTrend, { color: getTrendColor(item?.trend) }]}>
                                        {item?.trend || item?.time || 'Update'}
                                    </Text>
                                </View>
                                <Text style={styles.newsCardTitle}>{item?.title || 'Market update'}</Text>
                                <Text style={styles.newsCardDesc}>{item?.description || item?.time || 'No details available.'}</Text>
                            </View>
                        )}
                        ListEmptyComponent={
                            <View style={{ alignItems: 'center', paddingVertical: 40 }}>
                                <Ionicons name="newspaper-outline" size={48} color={theme.colors.textTertiary} />
                                <Text style={{ color: theme.colors.textSecondary, marginTop: 12, fontSize: 15 }}>No news available</Text>
                            </View>
                        }
                    />
                </View>
            </Modal>
        </SafeAreaView>
    );
}

AdminDashboard.propTypes = {
    navigation: PropTypes.shape({
        navigate: PropTypes.func,
    }),
    onLogout: PropTypes.func,
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors.background,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: theme.spacing.l,
        paddingVertical: theme.spacing.m,
        backgroundColor: theme.colors.surface,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.borderLight,
    },
    headerLabel: {
        ...theme.typography.captionMedium,
        color: theme.colors.primary,
        letterSpacing: 1,
    },
    headerTitle: {
        ...theme.typography.h2,
        color: theme.colors.textPrimary,
    },
    profileBtn: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: theme.colors.primary,
        alignItems: 'center',
        justifyContent: 'center',
        ...theme.shadows.soft,
    },
    profileInitials: {
        color: 'white',
        fontWeight: '700',
        fontSize: 16,
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        paddingBottom: theme.spacing.xxl,
    },
    aumCard: {
        marginHorizontal: theme.spacing.l,
        marginTop: theme.spacing.m,
        padding: theme.spacing.l,
        borderRadius: theme.borderRadius.xl,
        ...theme.shadows.glow,
        overflow: 'hidden',
    },
    aumDecor1: {
        position: 'absolute',
        top: -30,
        right: -30,
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: 'rgba(255,255,255,0.08)',
    },
    aumDecor2: {
        position: 'absolute',
        bottom: -20,
        left: -20,
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: 'rgba(255,255,255,0.05)',
    },
    aumHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: theme.spacing.xs,
    },
    aumLabel: {
        ...theme.typography.small,
        color: 'rgba(255,255,255,0.7)',
        marginLeft: 6,
    },
    aumLabelContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    aumGrowth: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(74, 222, 128, 0.2)',
        paddingHorizontal: theme.spacing.s,
        paddingVertical: 4,
        borderRadius: theme.borderRadius.full,
    },
    aumGrowthText: {
        ...theme.typography.captionMedium,
        color: '#4ADE80',
        marginLeft: 4,
    },
    aumValue: {
        ...theme.typography.amountLarge,
        color: 'white',
        marginBottom: theme.spacing.xs,
    },
    aumSubtext: {
        ...theme.typography.caption,
        color: 'rgba(255,255,255,0.6)',
    },
    kpiGrid: {
        flexDirection: 'row',
        paddingHorizontal: theme.spacing.m,
        marginTop: theme.spacing.l,
        marginBottom: theme.spacing.m,
        gap: 12,
    },
    kpiCard: {
        flex: 1,
        flexDirection: 'column',
        backgroundColor: theme.colors.surface,
        paddingVertical: 12,
        paddingHorizontal: 10,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        minWidth: 0,
        ...theme.shadows.soft,
        borderWidth: 1,
        borderColor: theme.colors.surfaceAlt,
    },
    kpiIcon: {
        width: 36,
        height: 36,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 8,
    },
    kpiValue: {
        fontSize: 20,
        fontWeight: '700',
        color: theme.colors.textPrimary,
        textAlign: 'center',
    },
    kpiLabel: {
        fontSize: 11,
        color: theme.colors.textSecondary,
        fontWeight: '500',
        textAlign: 'center',
        marginTop: 2,
    },
    tabBar: {
        flexDirection: 'row',
        backgroundColor: theme.colors.surface,
        padding: 6,
        marginHorizontal: theme.spacing.l,
        borderRadius: 16,
        marginBottom: theme.spacing.l,
        ...theme.shadows.soft,
    },
    tab: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        borderRadius: 12,
        gap: 6,
        position: 'relative',
        // overflow: 'hidden' removed to allow badge to hang
    },
    tabActive: {
        // No longer used, handled by Gradient
    },
    tabLabel: {
        fontSize: 13,
        color: theme.colors.textSecondary,
        fontWeight: '500',
        zIndex: 1,
    },
    tabLabelActive: {
        color: 'white',
        fontWeight: '700',
        zIndex: 1,
    },
    tabBadge: {
        position: 'absolute',
        top: -6,
        right: -6, // Hanging off the edge
        backgroundColor: theme.colors.danger,
        borderRadius: 10,
        minWidth: 20,
        height: 20,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1.5,
        borderColor: 'white',
        paddingHorizontal: 4,
        zIndex: 10,
        elevation: 5,
    },
    tabBadgeText: {
        color: 'white',
        fontSize: 10,
        fontWeight: '700',
    },
    section: {
        paddingHorizontal: theme.spacing.l,
    },
    sectionTitle: {
        ...theme.typography.h4,
        color: theme.colors.textPrimary,
        marginBottom: theme.spacing.m,
    },
    actionsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        marginHorizontal: -theme.spacing.xs,
    },
    actionCard: {
        width: (SCREEN_WIDTH - theme.spacing.l * 2 - theme.spacing.s * 2) / 2,
        marginHorizontal: theme.spacing.xs,
        marginBottom: theme.spacing.s,
        borderRadius: theme.borderRadius.l,
        overflow: 'hidden',
        ...theme.shadows.card,
    },
    actionCardGradient: {
        paddingVertical: theme.spacing.l,
        paddingHorizontal: theme.spacing.m,
        alignItems: 'center',
    },
    actionCardLabel: {
        ...theme.typography.smallMedium,
        color: 'white',
        marginTop: theme.spacing.s,
    },
    activityCard: {
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.l,
        padding: theme.spacing.m,
        ...theme.shadows.soft,
    },
    activityItem: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        paddingVertical: theme.spacing.s,
    },
    activityDot: {
        width: 10,
        height: 10,
        borderRadius: 5,
        marginTop: 5,
        marginRight: theme.spacing.m,
    },
    activityContent: {
        flex: 1,
    },
    activityText: {
        ...theme.typography.small,
        color: theme.colors.textSecondary,
    },
    activityBold: {
        fontWeight: '600',
        color: theme.colors.textPrimary,
    },
    activityTime: {
        ...theme.typography.caption,
        color: theme.colors.textTertiary,
        marginTop: 2,
    },
    emptyState: {
        alignItems: 'center',
        paddingVertical: theme.spacing.xxl,
    },
    emptyIcon: {
        marginBottom: theme.spacing.m,
    },
    emptyStateTitle: {
        ...theme.typography.h3,
        color: theme.colors.textPrimary,
    },
    emptyStateText: {
        ...theme.typography.body,
        color: theme.colors.textSecondary,
        marginTop: theme.spacing.xs,
    },
    approvalCard: {
        backgroundColor: theme.colors.surface,
        padding: theme.spacing.m,
        borderRadius: theme.borderRadius.l,
        marginBottom: theme.spacing.m,
        ...theme.shadows.card,
    },
    approvalHeader: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginBottom: theme.spacing.m,
    },
    approvalTypeIcon: {
        width: 48,
        height: 48,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: theme.spacing.m,
    },
    approvalInfo: {
        flex: 1,
    },
    approvalType: {
        ...theme.typography.captionMedium,
        color: theme.colors.textSecondary,
    },
    approvalInvestor: {
        ...theme.typography.bodyMedium,
        color: theme.colors.textPrimary,
    },
    approvalMeta: {
        ...theme.typography.caption,
        color: theme.colors.textTertiary,
    },
    approvalAmountContainer: {
        alignItems: 'flex-end',
    },
    approvalAmount: {
        ...theme.typography.bodySemibold,
        color: theme.colors.textPrimary,
    },
    approvalTime: {
        ...theme.typography.caption,
        color: theme.colors.textTertiary,
    },
    approvalActions: {
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
        paddingVertical: theme.spacing.s + 2,
        borderRadius: theme.borderRadius.m,
        borderWidth: 1,
        borderColor: theme.colors.border,
        marginRight: theme.spacing.s,
    },
    rejectBtnText: {
        ...theme.typography.smallMedium,
        color: theme.colors.danger,
        marginLeft: 4,
    },
    approveBtn: {
        flex: 1,
        borderRadius: theme.borderRadius.m,
        overflow: 'hidden',
    },
    approveBtnGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: theme.spacing.s + 2,
    },
    approveBtnText: {
        ...theme.typography.smallMedium,
        color: 'white',
        marginLeft: 4,
    },
    projectCard: {
        backgroundColor: theme.colors.surface,
        padding: theme.spacing.m,
        borderRadius: theme.borderRadius.l,
        marginBottom: theme.spacing.m,
        ...theme.shadows.card,
    },
    projectHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: theme.spacing.m,
    },
    projectIcon: {
        marginRight: theme.spacing.m,
    },
    projectIconGradient: {
        width: 48,
        height: 48,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
    },
    projectInfo: {
        flex: 1,
    },
    projectName: {
        ...theme.typography.bodyMedium,
        color: theme.colors.textPrimary,
    },
    projectType: {
        ...theme.typography.caption,
        color: theme.colors.textSecondary,
    },
    statusBadge: {
        paddingHorizontal: theme.spacing.s,
        paddingVertical: 4,
        borderRadius: theme.borderRadius.full,
    },
    statusText: {
        ...theme.typography.captionMedium,
    },
    projectStats: {
        flexDirection: 'row',
        marginBottom: theme.spacing.m,
        paddingTop: theme.spacing.m,
        borderTopWidth: 1,
        borderTopColor: theme.colors.borderLight,
    },
    projectStat: {
        flex: 1,
        alignItems: 'center',
    },
    projectStatValue: {
        ...theme.typography.bodySemibold,
        color: theme.colors.textPrimary,
    },
    projectStatLabel: {
        ...theme.typography.caption,
        color: theme.colors.textSecondary,
    },
    progressBar: {
        height: 8,
        backgroundColor: theme.colors.surfaceAlt,
        borderRadius: 4,
        overflow: 'hidden',
    },
    progressFill: {
        height: '100%',
        borderRadius: 4,
    },
    addProjectBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: theme.spacing.l,
        borderRadius: theme.borderRadius.l,
        borderWidth: 2,
        borderColor: theme.colors.border,
        borderStyle: 'dashed',
    },
    addProjectText: {
        ...theme.typography.bodyMedium,
        color: theme.colors.primary,
        marginLeft: theme.spacing.s,
    },
    marketNewsSection: {
        marginTop: theme.spacing.l,
    },
    marketNewsHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 14,
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
    viewAllBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    viewAllText: {
        fontSize: 13,
        fontWeight: '600',
        color: theme.colors.primary,
    },
    pricesScroll: {
        marginBottom: 12,
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
        width: 38,
        height: 38,
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
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    priceCardValue: {
        fontSize: 12,
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
        width: 42,
        height: 42,
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
});
