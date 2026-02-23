import React, { useState, useRef, useEffect } from 'react';
import PropTypes from 'prop-types';
import {
    View,
    Text,
    ScrollView,
    StyleSheet,
    TouchableOpacity,
    StatusBar,
    Alert,
    Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme, formatCurrency } from '../../components/Theme';
import Ionicons from 'react-native-vector-icons/Ionicons';
import LinearGradient from 'react-native-linear-gradient';
import ProfileMenu from '../../components/ProfileMenu';

// Import utilities only from centralized data
import { getRelativeTime } from '../../utils/dateTimeUtils';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

export default function ClientDashboard({ navigation, onLogout }) {
    const { user: currentUser } = useAuth();
    const currentUserName = currentUser?.name || 'Investor';
    const [portfolio, setPortfolio] = useState({ totalInvested: 0, currentValue: 0, returns: 0, returnsPercent: 0 });
    const [investments, setInvestments] = useState([]);
    const [notifications, setNotifications] = useState([]);
    const [pendingCount, setPendingCount] = useState(0);
    const isPositive = portfolio.returns >= 0;

    // Derive recentUpdates from notifications
    const recentUpdates = notifications.map(n => ({
        id: n._id || n.id,
        title: n.title || n.body || 'Update',
        project: n.payload?.projectName || 'Project',
        type: n.payload?.type || 'update',
        read: n.isRead,
        timestamp: n.createdAt,
    }));

    // Animations
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(30)).current;
    const cardScale = useRef(new Animated.Value(0.95)).current;
    const [showProfileMenu, setShowProfileMenu] = useState(false);

    useEffect(() => {
        const fetchClientData = async () => {
            try {
                const [portfolioData, investmentsData, notificationsData, modificationsData] = await Promise.all([
                    api.getPortfolio().catch(() => ({ totalInvested: 0, currentValue: 0, returns: 0, returnsPercent: 0 })),
                    api.getInvestments().catch(() => []),
                    api.getNotifications().catch(() => []),
                    api.getModifications().catch(() => []),
                ]);
                setPortfolio(portfolioData);
                setInvestments(investmentsData || []);
                setNotifications(notificationsData || []);
                const pending = (modificationsData || []).filter(m => m.status === 'pending');
                setPendingCount(pending.length);
            } catch (err) {
                console.error('Failed to load client dashboard:', err);
            }
        };
        fetchClientData();

        Animated.parallel([
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 600,
                useNativeDriver: true,
            }),
            Animated.spring(slideAnim, {
                toValue: 0,
                tension: 50,
                friction: 8,
                useNativeDriver: true,
            }),
            Animated.spring(cardScale, {
                toValue: 1,
                tension: 60,
                friction: 7,
                useNativeDriver: true,
            }),
        ]).start();
    }, []);

    const handleProfilePress = () => {
        setShowProfileMenu(true);
    };

    const quickActions = [
        { icon: 'checkmark-circle', label: 'Approvals', gradient: ['#EF4444', '#F97316'], screen: 'Approvals', badge: pendingCount },
        { icon: 'document-text', label: 'Reports', gradient: ['#F59E0B', '#FBBF24'], screen: 'Reports' },
        { icon: 'pie-chart', label: 'Analytics', gradient: ['#6366F1', '#8B5CF6'], screen: 'PortfolioAnalytics' },
        { icon: 'chatbubble-ellipses', label: 'Support', gradient: ['#3B82F6', '#60A5FA'], screen: null },
    ];

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <StatusBar barStyle="dark-content" />

            {/* Premium Header */}
            <Animated.View style={[styles.header, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
                <View style={styles.headerLeft}>
                    <Text style={styles.greeting}>Welcome back,</Text>
                    <Text style={styles.userName}>{currentUser?.name || 'Investor'}</Text>
                </View>
                <View style={styles.headerActions}>
                    <TouchableOpacity style={styles.iconBtn}>
                        <Ionicons name="notifications-outline" size={22} color={theme.colors.textPrimary} />
                        {notifications.some(u => !u.isRead) && <View style={styles.notifBadge} />}
                    </TouchableOpacity>
                    <TouchableOpacity onPress={handleProfilePress}>
                        <LinearGradient
                            colors={theme.gradients.primary}
                            style={styles.profileBtn}
                        >
                            <Text style={styles.profileInitials}>
                                {currentUser?.name ? currentUser.name.split(' ').map(n => n[0]).join('') : 'U'}
                            </Text>
                        </LinearGradient>
                    </TouchableOpacity>
                </View>
            </Animated.View>

            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                {/* Premium Portfolio Card */}
                <Animated.View style={{ transform: [{ scale: cardScale }] }}>
                    <LinearGradient
                        colors={['#667eea', '#764ba2']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.portfolioCard}
                    >
                        {/* Decorative Elements */}
                        <View style={styles.cardDecor1} />
                        <View style={styles.cardDecor2} />

                        <View style={styles.portfolioHeader}>
                            <View style={styles.portfolioLabelContainer}>
                                <Ionicons name="wallet" size={16} color="rgba(255,255,255,0.7)" />
                                <Text style={styles.portfolioLabel}>Total Portfolio Value</Text>
                            </View>
                            <View style={styles.returnsBadge}>
                                <Ionicons
                                    name={isPositive ? "trending-up" : "trending-down"}
                                    size={14}
                                    color={isPositive ? '#4ADE80' : '#F87171'}
                                />
                                <Text style={[styles.returnsText, { color: isPositive ? '#4ADE80' : '#F87171' }]}>
                                    {isPositive ? '+' : ''}{portfolio.returnsPercent}%
                                </Text>
                            </View>
                        </View>

                        <Text style={styles.portfolioValue}>{formatCurrency(portfolio.currentValue)}</Text>

                        <View style={styles.portfolioStats}>
                            <View style={styles.statItem}>
                                <View style={styles.statIconContainer}>
                                    <Ionicons name="arrow-down-circle" size={18} color="rgba(255,255,255,0.8)" />
                                </View>
                                <View>
                                    <Text style={styles.statLabel}>Invested</Text>
                                    <Text style={styles.statValue}>{formatCurrency(portfolio.totalInvested)}</Text>
                                </View>
                            </View>
                            <View style={styles.statDivider} />
                            <View style={styles.statItem}>
                                <View style={[styles.statIconContainer, { backgroundColor: isPositive ? 'rgba(74, 222, 128, 0.2)' : 'rgba(248, 113, 113, 0.2)' }]}>
                                    <Ionicons name={isPositive ? "arrow-up-circle" : "arrow-down-circle"} size={18} color={isPositive ? '#4ADE80' : '#F87171'} />
                                </View>
                                <View>
                                    <Text style={styles.statLabel}>Returns</Text>
                                    <Text style={[styles.statValue, { color: isPositive ? '#4ADE80' : '#F87171' }]}>
                                        {formatCurrency(portfolio.returns, true)}
                                    </Text>
                                </View>
                            </View>
                        </View>
                    </LinearGradient>
                </Animated.View>

                {/* Premium Quick Actions */}
                <Animated.View style={[styles.quickActionsContainer, { opacity: fadeAnim }]}>
                    <Text style={styles.quickActionsTitle}>Quick Actions</Text>
                    <View style={styles.quickActions}>
                        {quickActions.map((action, index) => (
                            <TouchableOpacity
                                key={action.label}
                                style={styles.actionBtn}
                                onPress={() => {
                                    if (action.screen) {
                                        navigation.navigate(action.screen);
                                    } else {
                                        Alert.alert("Coming Soon", `${action.label} feature is under development`);
                                    }
                                }}
                                activeOpacity={0.8}
                            >
                                <View>
                                    <LinearGradient
                                        colors={action.gradient}
                                        style={styles.actionIconGradient}
                                    >
                                        <Ionicons name={action.icon} size={22} color="white" />
                                    </LinearGradient>
                                    {action.badge > 0 && (
                                        <View style={styles.actionBadge}>
                                            <Text style={styles.actionBadgeText}>{action.badge}</Text>
                                        </View>
                                    )}
                                </View>
                                <Text style={styles.actionLabel}>{action.label}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </Animated.View>

                {/* My Investments - Premium Cards */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionTitle}>My Investments</Text>
                        <View style={styles.sectionBadge}>
                            <Text style={styles.sectionBadgeText}>{investments.length} Active</Text>
                        </View>
                    </View>

                    {investments.map((investment) => {
                        const invReturn = investment.currentValue - investment.invested;
                        const invPositive = invReturn >= 0;

                        return (
                            <TouchableOpacity
                                key={investment.id}
                                style={styles.investmentCard}
                                onPress={() => Alert.alert("Investment Details", `${investment.name}\n\nType: ${investment.type}\nInvested: ${formatCurrency(investment.invested)}\nCurrent Value: ${formatCurrency(investment.currentValue)}\nProgress: ${investment.progress}%`)}
                                activeOpacity={0.9}
                            >
                                <View style={styles.investmentHeader}>
                                    <LinearGradient
                                        colors={investment.type === 'Real Estate' ? ['#6366F1', '#8B5CF6'] : ['#10B981', '#14B8A6']}
                                        style={styles.investmentIcon}
                                    >
                                        <Ionicons
                                            name={investment.type === 'Real Estate' ? 'business' : 'rocket'}
                                            size={20}
                                            color="white"
                                        />
                                    </LinearGradient>
                                    <View style={styles.investmentInfo}>
                                        <Text style={styles.investmentName} numberOfLines={1}>{investment.name}</Text>
                                        <Text style={styles.investmentType}>{investment.type}</Text>
                                    </View>
                                    <View style={[styles.returnChip, { backgroundColor: invPositive ? theme.colors.successLight : theme.colors.dangerLight }]}>
                                        <Ionicons name={invPositive ? "trending-up" : "trending-down"} size={12} color={invPositive ? theme.colors.success : theme.colors.danger} />
                                        <Text style={[styles.returnChipText, { color: invPositive ? theme.colors.success : theme.colors.danger }]}>
                                            {invPositive ? '+' : ''}{investment.returnsPercent}%
                                        </Text>
                                    </View>
                                </View>

                                <View style={styles.investmentStats}>
                                    <View style={styles.investmentStatCol}>
                                        <Text style={styles.investmentStatLabel}>Invested</Text>
                                        <Text style={styles.investmentStatValue}>{formatCurrency(investment.invested)}</Text>
                                    </View>
                                    <View style={styles.investmentStatCol}>
                                        <Text style={styles.investmentStatLabel}>Current Value</Text>
                                        <Text style={[styles.investmentStatValue, { color: invPositive ? theme.colors.success : theme.colors.danger }]}>
                                            {formatCurrency(investment.currentValue)}
                                        </Text>
                                    </View>
                                </View>

                                <View style={styles.progressContainer}>
                                    <View style={styles.progressHeader}>
                                        <Text style={styles.progressLabel}>Project Progress</Text>
                                        <Text style={styles.progressPercent}>{investment.progress}%</Text>
                                    </View>
                                    <View style={styles.progressBar}>
                                        <LinearGradient
                                            colors={['#6366F1', '#8B5CF6']}
                                            start={{ x: 0, y: 0 }}
                                            end={{ x: 1, y: 0 }}
                                            style={[styles.progressFill, { width: `${investment.progress}%` }]}
                                        />
                                    </View>
                                </View>
                            </TouchableOpacity>
                        );
                    })}
                </View>

                {/* Recent Updates - Premium Style */}
                {recentUpdates.length > 0 && (
                    <View style={styles.section}>
                        <View style={styles.sectionHeader}>
                            <Text style={styles.sectionTitle}>Recent Updates</Text>
                            <TouchableOpacity>
                                <Text style={styles.seeAllText}>See All</Text>
                            </TouchableOpacity>
                        </View>

                        {recentUpdates.slice(0, 3).map((update) => (
                            <TouchableOpacity
                                key={update.id}
                                style={styles.updateItem}
                                onPress={() => Alert.alert(update.title, `${update.project}\n\n${update.type === 'report' ? 'View full report' : 'View milestone details'} coming soon!`)}
                                activeOpacity={0.9}
                            >
                                <View style={[styles.updateIcon, !update.read && styles.updateIconUnread]}>
                                    <Ionicons
                                        name={update.type === 'report' ? 'document-text' : 'flag'}
                                        size={18}
                                        color={update.read ? theme.colors.textSecondary : theme.colors.primary}
                                    />
                                </View>
                                <View style={styles.updateContent}>
                                    <Text style={[styles.updateTitle, !update.read && styles.updateTitleUnread]} numberOfLines={1}>{update.title}</Text>
                                    <Text style={styles.updateMeta} numberOfLines={1}>{update.project} • {getRelativeTime(update.timestamp)}</Text>
                                </View>
                                <View style={styles.updateArrow}>
                                    <Ionicons name="chevron-forward" size={16} color={theme.colors.textTertiary} />
                                </View>
                            </TouchableOpacity>
                        ))}
                    </View>
                )}

                <View style={{ height: 24 }} />
            </ScrollView>

            {/* Profile Menu Modal */}
            <ProfileMenu
                visible={showProfileMenu}
                onClose={() => setShowProfileMenu(false)}
                onProfile={() => navigation.navigate('Profile')}
                onSettings={() => navigation.navigate('Settings')}
                onLogout={onLogout}
                userName={currentUserName}
            />
        </SafeAreaView>
    );
}

ClientDashboard.propTypes = {
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
        paddingHorizontal: 20,
        paddingVertical: 16,
    },
    headerLeft: {},
    greeting: {
        fontSize: 14,
        color: theme.colors.textSecondary,
        marginBottom: 2,
    },
    userName: {
        fontSize: 22,
        fontWeight: '700',
        color: theme.colors.textPrimary,
        letterSpacing: -0.3,
    },
    headerActions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    iconBtn: {
        width: 44,
        height: 44,
        borderRadius: 14,
        backgroundColor: theme.colors.surface,
        alignItems: 'center',
        justifyContent: 'center',
        ...theme.shadows.soft,
    },
    notifBadge: {
        position: 'absolute',
        top: 10,
        right: 10,
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: theme.colors.danger,
        borderWidth: 2,
        borderColor: theme.colors.surface,
    },
    profileBtn: {
        width: 44,
        height: 44,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
    },
    profileInitials: {
        color: 'white',
        fontWeight: '700',
        fontSize: 15,
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        paddingBottom: 24,
    },
    portfolioCard: {
        marginHorizontal: 20,
        padding: 24,
        borderRadius: 24,
        overflow: 'hidden',
        ...theme.shadows.premium,
    },
    cardDecor1: {
        position: 'absolute',
        top: -50,
        right: -50,
        width: 150,
        height: 150,
        borderRadius: 75,
        backgroundColor: 'rgba(255,255,255,0.1)',
    },
    cardDecor2: {
        position: 'absolute',
        bottom: -30,
        left: -30,
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: 'rgba(255,255,255,0.08)',
    },
    portfolioHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    portfolioLabelContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    portfolioLabel: {
        fontSize: 13,
        color: 'rgba(255,255,255,0.7)',
        fontWeight: '500',
    },
    returnsBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.15)',
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 20,
        gap: 4,
    },
    returnsText: {
        fontSize: 13,
        fontWeight: '700',
    },
    portfolioValue: {
        fontSize: 38,
        fontWeight: '800',
        color: 'white',
        marginBottom: 20,
        letterSpacing: -1,
    },
    portfolioStats: {
        flexDirection: 'row',
        backgroundColor: 'rgba(255,255,255,0.12)',
        borderRadius: 16,
        padding: 16,
    },
    statItem: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    statIconContainer: {
        width: 36,
        height: 36,
        borderRadius: 10,
        backgroundColor: 'rgba(255,255,255,0.15)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    statDivider: {
        width: 1,
        backgroundColor: 'rgba(255,255,255,0.2)',
        marginHorizontal: 16,
    },
    statLabel: {
        fontSize: 12,
        color: 'rgba(255,255,255,0.6)',
        marginBottom: 2,
    },
    statValue: {
        fontSize: 15,
        fontWeight: '700',
        color: 'white',
    },
    quickActionsContainer: {
        paddingHorizontal: 20,
        marginTop: 24,
    },
    quickActionsTitle: {
        fontSize: 11,
        fontWeight: '700',
        color: theme.colors.textSecondary,
        letterSpacing: 1,
        textTransform: 'uppercase',
        marginBottom: 14,
    },
    quickActions: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    actionBtn: {
        alignItems: 'center',
        flex: 1,
    },
    actionIconGradient: {
        width: 56,
        height: 56,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 8,
        ...theme.shadows.card,
    },
    actionLabel: {
        fontSize: 12,
        fontWeight: '500',
        color: theme.colors.textSecondary,
    },
    actionBadge: {
        position: 'absolute',
        top: -6,
        right: -6,
        backgroundColor: theme.colors.danger,
        borderRadius: 10,
        minWidth: 20,
        height: 20,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1.5,
        borderColor: 'white',
        paddingHorizontal: 4,
        zIndex: 2,
    },
    actionBadgeText: {
        fontSize: 11,
        fontWeight: '700',
        color: 'white',
    },
    section: {
        paddingHorizontal: 20,
        marginTop: 28,
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: theme.colors.textPrimary,
        letterSpacing: -0.3,
    },
    sectionBadge: {
        backgroundColor: theme.colors.primaryLight,
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
    },
    sectionBadgeText: {
        fontSize: 12,
        fontWeight: '600',
        color: theme.colors.primary,
    },
    seeAllText: {
        fontSize: 14,
        fontWeight: '600',
        color: theme.colors.primary,
    },
    investmentCard: {
        backgroundColor: theme.colors.surface,
        padding: 18,
        borderRadius: 20,
        marginBottom: 14,
        ...theme.shadows.card,
    },
    investmentHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
    },
    investmentIcon: {
        width: 48,
        height: 48,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 14,
    },
    investmentInfo: {
        flex: 1,
    },
    investmentName: {
        fontSize: 16,
        fontWeight: '600',
        color: theme.colors.textPrimary,
        marginBottom: 3,
    },
    investmentType: {
        fontSize: 13,
        color: theme.colors.textSecondary,
    },
    returnChip: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 20,
        gap: 4,
    },
    returnChipText: {
        fontSize: 12,
        fontWeight: '700',
    },
    investmentStats: {
        flexDirection: 'row',
        backgroundColor: theme.colors.surfaceAlt,
        borderRadius: 14,
        padding: 14,
        marginBottom: 16,
    },
    investmentStatCol: {
        flex: 1,
    },
    investmentStatLabel: {
        fontSize: 11,
        color: theme.colors.textSecondary,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        marginBottom: 4,
    },
    investmentStatValue: {
        fontSize: 16,
        fontWeight: '700',
        color: theme.colors.textPrimary,
    },
    progressContainer: {},
    progressHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    progressLabel: {
        fontSize: 12,
        color: theme.colors.textSecondary,
    },
    progressPercent: {
        fontSize: 13,
        fontWeight: '700',
        color: theme.colors.primary,
    },
    progressBar: {
        height: 6,
        backgroundColor: theme.colors.surfaceAlt,
        borderRadius: 3,
        overflow: 'hidden',
    },
    progressFill: {
        height: '100%',
        borderRadius: 3,
    },
    updateItem: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: theme.colors.surface,
        padding: 14,
        borderRadius: 16,
        marginBottom: 10,
        ...theme.shadows.soft,
    },
    updateIcon: {
        width: 42,
        height: 42,
        borderRadius: 12,
        backgroundColor: theme.colors.surfaceAlt,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 14,
    },
    updateIconUnread: {
        backgroundColor: theme.colors.primaryLight,
    },
    updateContent: {
        flex: 1,
    },
    updateTitle: {
        fontSize: 14,
        color: theme.colors.textSecondary,
        marginBottom: 3,
    },
    updateTitleUnread: {
        fontWeight: '600',
        color: theme.colors.textPrimary,
    },
    updateMeta: {
        fontSize: 12,
        color: theme.colors.textTertiary,
    },
    updateArrow: {
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: theme.colors.surfaceAlt,
        alignItems: 'center',
        justifyContent: 'center',
    },
});
