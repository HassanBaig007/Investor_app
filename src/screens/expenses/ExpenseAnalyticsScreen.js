/**
 * Expense Analytics Screen
 * 
 * Provides visualization and insights for daily expenses.
 * Features category breakdown, trends, and spending patterns.
 */

import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import {
    View,
    Text,
    ScrollView,
    StyleSheet,
    TouchableOpacity,
    StatusBar,
    Dimensions,
    Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { theme } from '../../components/Theme';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import { writeExportFile, FILE_EXPORT_ENCODING } from '../../utils/fileExport';
import { shareFileUri } from '../../utils/fileShare';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Category icons mapping
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
};

const EXPENSE_CATEGORIES = [
    { id: 'food', label: 'Food' },
    { id: 'transport', label: 'Transport' },
    { id: 'shopping', label: 'Shopping' },
    { id: 'bills', label: 'Bills' },
    { id: 'entertainment', label: 'Entertainment' },
    { id: 'health', label: 'Health' },
    { id: 'education', label: 'Education' },
    { id: 'grocery', label: 'Grocery' },
    { id: 'Service', label: 'Service' },
    { id: 'Product', label: 'Product' },
    { id: 'other', label: 'Other' },
];

export default function ExpenseAnalyticsScreen({ navigation }) {
    const { user: currentUser } = useAuth();
    const [summary, setSummary] = useState({});
    const [trends, setTrends] = useState([]);
    const [exporting, setExporting] = useState(false);

    useEffect(() => {
        loadAnalytics();
    }, [currentUser?.id, currentUser?._id, currentUser?.role]);

    const loadAnalytics = async () => {
        const userId = currentUser?.id || currentUser?._id;
        if (!userId) return;
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
        const today = now.toISOString().split('T')[0];

        try {
            // Single consolidated API call — replaces N+1 getSpendings per project
            const [analytics, expenseResult, appConfig] = await Promise.all([
                api.getExpenseAnalytics({ fromDate: startOfMonth, toDate: today }),
                api.getMyExpenses({ fromDate: startOfMonth, toDate: today, limit: 200 }),
                api.getAppConfig().catch(() => null),
            ]);

            // Keep raw expenses for export functionality
            const allExpenses = (expenseResult?.expenses || []).map((expense) => {
                const createdAt = expense.createdAt ? new Date(expense.createdAt) : null;
                const fallbackDate = createdAt && !Number.isNaN(createdAt.getTime())
                    ? createdAt.toISOString().split('T')[0]
                    : today;
                const fallbackTime = createdAt && !Number.isNaN(createdAt.getTime())
                    ? createdAt.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false })
                    : '';  
                return {
                    ...expense,
                    id: expense.id || expense._id,
                    source: 'project',
                    projectName: expense.projectName || expense.project?.name || 'Project',
                    date: expense.date || fallbackDate,
                    time: expense.time || fallbackTime,
                    note: expense.note || expense.description || '',
                };
            });

            // Use server-computed analytics instead of client-side reduce
            const categoryBreakdown = {};
            (analytics?.categoryBreakdown || []).forEach(item => {
                categoryBreakdown[item.category] = item.amount;
            });

            setSummary({
                monthTotal: analytics?.totalSpent || 0,
                budget: Number(appConfig?.defaultBudget || 100000),
                transactionCount: allExpenses.length,
                dailyAverage: analytics?.dailyAverage || Math.round((analytics?.totalSpent || 0) / 30),
                categoryBreakdown,
            });

            // Build 7-day trends from raw expenses (lightweight since data is already fetched)
            const trendsData = [];
            for (let i = 6; i >= 0; i--) {
                const dateObj = new Date();
                dateObj.setDate(dateObj.getDate() - i);
                const dateString = dateObj.toISOString().split('T')[0];
                const dayExpenses = allExpenses.filter((expense) => expense.date === dateString);
                trendsData.push({
                    date: dateString,
                    dayName: dateObj.toLocaleDateString('en-US', { weekday: 'short' }),
                    total: dayExpenses.reduce((sum, expense) => sum + (expense.amount || 0), 0),
                });
            }
            setTrends(trendsData);
        } catch (error) {
            console.error('Failed to load expense analytics:', error);
            setSummary({ monthTotal: 0, budget: 0, transactionCount: 0, dailyAverage: 0, categoryBreakdown: {} });
            setTrends([]);
        }
    };

    // Quick export to Excel report (includes personal + project)
    const handleQuickExport = async () => {
        try {
            setExporting(true);
            const now = new Date();
            const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
            const today = now.toISOString().split('T')[0];

            const exportPayload = await api.exportExpenses('xlsx', {
                fromDate: startOfMonth,
                toDate: today,
            });

            const fileName = exportPayload?.filename || `expense_analytics_${today}.xlsx`;
            const shouldUseBase64 = exportPayload?.encoding === 'base64';
            const fileUri = await writeExportFile({
                fileName,
                content: exportPayload?.content || '',
                encoding: shouldUseBase64
                    ? FILE_EXPORT_ENCODING.BASE64
                    : FILE_EXPORT_ENCODING.UTF8,
            });

            const didShare = await shareFileUri(fileUri, {
                dialogTitle: 'Expense Analytics Report',
                mimeType: exportPayload?.mimeType || 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            });

            if (!didShare) {
                Alert.alert('Export Complete', `File saved successfully: ${fileName}`);
                return;
            }
        } catch (error) {
            console.error('Failed to export analytics report:', error);
            const backendMessage = error?.response?.data?.message;
            Alert.alert(
                'Export Failed',
                backendMessage || 'Could not export analytics report. Please try again.'
            );
        } finally {
            setExporting(false);
        }
    };

    // Calculate max trend value for chart scaling
    const maxTrendValue = Math.max(...trends.map(t => t.total), 1);

    // Get sorted categories by amount
    const sortedCategories = EXPENSE_CATEGORIES
        .map(cat => ({
            ...cat,
            amount: summary.categoryBreakdown?.[cat.id] || 0,
        }))
        .filter(cat => cat.amount > 0)
        .sort((a, b) => b.amount - a.amount);

    // Calculate percentages
    const totalSpent = summary.monthTotal || 1;

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

                <Text style={styles.headerTitle}>Expense Analytics</Text>

                <TouchableOpacity
                    style={styles.exportReportBtn}
                    onPress={handleQuickExport}
                    disabled={exporting}
                >
                    <MaterialCommunityIcons
                        name={exporting ? "loading" : "download"}
                        size={20}
                        color="white"
                    />
                </TouchableOpacity>
            </View>

            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                {/* Summary Cards */}
                <View style={styles.summaryCards}>
                    <LinearGradient
                        colors={['#6366F1', '#8B5CF6']}
                        style={styles.mainSummaryCard}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                    >
                        <View style={styles.mainSummaryContent}>
                            <Text style={styles.mainSummaryLabel}>Total This Month</Text>
                            <Text style={styles.mainSummaryAmount}>
                                ₹{(summary.monthTotal || 0).toLocaleString()}
                            </Text>
                            <View style={styles.budgetProgress}>
                                <View style={styles.budgetProgressBar}>
                                    <View
                                        style={[
                                            styles.budgetProgressFill,
                                            {
                                                width: `${Math.min((summary.monthTotal / (summary.budget || 30000)) * 100, 100)}%`,
                                                backgroundColor: (summary.monthTotal / (summary.budget || 30000)) > 0.8 ? '#FCD34D' : 'rgba(255,255,255,0.8)',
                                            }
                                        ]}
                                    />
                                </View>
                                <Text style={styles.budgetText}>
                                    {Math.round((summary.monthTotal / (summary.budget || 30000)) * 100)}% of ₹{(summary.budget || 30000).toLocaleString()} budget
                                </Text>
                            </View>
                        </View>
                        <View style={styles.mainSummaryIcon}>
                            <MaterialCommunityIcons name="chart-arc" size={48} color="rgba(255,255,255,0.3)" />
                        </View>
                    </LinearGradient>

                    <View style={styles.miniCardsRow}>
                        <View style={styles.miniCard}>
                            <View style={[styles.miniCardIcon, { backgroundColor: theme.colors.successLight }]}>
                                <MaterialCommunityIcons name="receipt" size={20} color={theme.colors.success} />
                            </View>
                            <Text style={styles.miniCardValue}>{summary.transactionCount || 0}</Text>
                            <Text style={styles.miniCardLabel}>Transactions</Text>
                        </View>
                        <View style={styles.miniCard}>
                            <View style={[styles.miniCardIcon, { backgroundColor: theme.colors.warningLight }]}>
                                <MaterialCommunityIcons name="chart-timeline-variant" size={20} color={theme.colors.warning} />
                            </View>
                            <Text style={styles.miniCardValue}>₹{(summary.dailyAverage || 0).toLocaleString()}</Text>
                            <Text style={styles.miniCardLabel}>Daily Avg</Text>
                        </View>
                    </View>
                </View>

                {/* 7-Day Trend Chart */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <MaterialCommunityIcons name="chart-line" size={20} color={theme.colors.primary} />
                        <Text style={styles.sectionTitle}>7-Day Trend</Text>
                    </View>

                    <View style={styles.trendChart}>
                        <View style={styles.trendBars}>
                            {trends.map((day, index) => (
                                <View key={day.date} style={styles.trendBarContainer}>
                                    <View style={styles.trendBarWrapper}>
                                        <LinearGradient
                                            colors={index === trends.length - 1 ? ['#6366F1', '#8B5CF6'] : ['#CBD5E1', '#E2E8F0']}
                                            style={[
                                                styles.trendBar,
                                                {
                                                    height: `${Math.max((day.total / maxTrendValue) * 100, 5)}%`,
                                                }
                                            ]}
                                        />
                                    </View>
                                    <Text style={[
                                        styles.trendDayLabel,
                                        index === trends.length - 1 && styles.trendDayLabelActive
                                    ]}>
                                        {day.dayName}
                                    </Text>
                                    {day.total > 0 && (
                                        <Text style={styles.trendAmount}>₹{(day.total / 1000).toFixed(1)}k</Text>
                                    )}
                                </View>
                            ))}
                        </View>
                    </View>
                </View>

                {/* Category Breakdown */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <MaterialCommunityIcons name="shape" size={20} color={theme.colors.primary} />
                        <Text style={styles.sectionTitle}>By Category</Text>
                    </View>

                    {sortedCategories.length > 0 ? (
                        <View style={styles.categoryList}>
                            {sortedCategories.map((category, index) => {
                                const percentage = Math.round((category.amount / totalSpent) * 100);
                                const color = CATEGORY_COLORS[category.id] || CATEGORY_COLORS.other;
                                const icon = CATEGORY_ICONS[category.id] || CATEGORY_ICONS.other;

                                return (
                                    <View key={category.id} style={styles.categoryItem}>
                                        <View style={styles.categoryItemLeft}>
                                            <View style={[styles.categoryIcon, { backgroundColor: `${color}20` }]}>
                                                <MaterialCommunityIcons name={icon} size={18} color={color} />
                                            </View>
                                            <View style={styles.categoryInfo}>
                                                <Text style={styles.categoryName}>{category.label}</Text>
                                                <View style={styles.categoryBarContainer}>
                                                    <View
                                                        style={[
                                                            styles.categoryBar,
                                                            {
                                                                width: `${percentage}%`,
                                                                backgroundColor: color,
                                                            }
                                                        ]}
                                                    />
                                                </View>
                                            </View>
                                        </View>
                                        <View style={styles.categoryItemRight}>
                                            <Text style={styles.categoryAmount}>₹{category.amount.toLocaleString()}</Text>
                                            <Text style={styles.categoryPercent}>{percentage}%</Text>
                                        </View>
                                    </View>
                                );
                            })}
                        </View>
                    ) : (
                        <View style={styles.emptyCategory}>
                            <MaterialCommunityIcons name="chart-pie" size={48} color={theme.colors.textMuted} />
                            <Text style={styles.emptyCategoryText}>No expense data yet</Text>
                        </View>
                    )}
                </View>

                {/* Insights Section */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <MaterialCommunityIcons name="lightbulb-outline" size={20} color={theme.colors.warning} />
                        <Text style={styles.sectionTitle}>Insights</Text>
                    </View>

                    <View style={styles.insightCards}>
                        <View style={styles.insightCard}>
                            <View style={styles.insightCardIcon}>
                                <MaterialCommunityIcons name="trending-up" size={20} color={theme.colors.danger} />
                            </View>
                            <View style={styles.insightCardContent}>
                                <Text style={styles.insightCardTitle}>Highest Spending</Text>
                                <Text style={styles.insightCardValue}>
                                    {sortedCategories[0]?.label || 'N/A'} - ₹{(sortedCategories[0]?.amount || 0).toLocaleString()}
                                </Text>
                            </View>
                        </View>

                        <View style={styles.insightCard}>
                            <View style={styles.insightCardIcon}>
                                <MaterialCommunityIcons name="target" size={20} color={theme.colors.success} />
                            </View>
                            <View style={styles.insightCardContent}>
                                <Text style={styles.insightCardTitle}>Budget Status</Text>
                                <Text style={[
                                    styles.insightCardValue,
                                    { color: (summary.monthTotal / (summary.budget || 30000)) > 0.8 ? theme.colors.danger : theme.colors.success }
                                ]}>
                                    ₹{((summary.budget || 30000) - (summary.monthTotal || 0)).toLocaleString()} remaining
                                </Text>
                            </View>
                        </View>
                    </View>
                </View>

                <View style={{ height: 40 }} />
            </ScrollView>
        </SafeAreaView>
    );
}

ExpenseAnalyticsScreen.propTypes = {
    navigation: PropTypes.shape({
        goBack: PropTypes.func,
        navigate: PropTypes.func,
    }),
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F8FAFC',
    },

    // Header
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 16,
        backgroundColor: 'white',
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(0,0,0,0.05)',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.03,
        shadowRadius: 8,
        elevation: 2,
    },
    backBtn: {
        width: 44,
        height: 44,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 14,
        backgroundColor: '#F4F4F5',
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#1E293B',
    },
    exportReportBtn: {
        width: 44,
        height: 44,
        borderRadius: 14,
        backgroundColor: theme.colors.primary,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: theme.colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 4,
    },

    // Scroll
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        padding: 20,
        paddingBottom: 40,
    },

    // Summary Cards
    summaryCards: {
        marginBottom: 26,
    },
    mainSummaryCard: {
        borderRadius: 24,
        padding: 24,
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 16,
        shadowColor: '#6366F1',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.25,
        shadowRadius: 16,
        elevation: 8,
    },
    mainSummaryContent: {
        flex: 1,
    },
    mainSummaryLabel: {
        fontSize: 13,
        fontWeight: '600',
        color: 'rgba(255,255,255,0.85)',
        marginBottom: 6,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    mainSummaryAmount: {
        fontSize: 32,
        fontWeight: '800',
        color: 'white',
        marginBottom: 14,
    },
    mainSummaryIcon: {
        justifyContent: 'center',
        opacity: 0.9,
    },
    budgetProgress: {
        marginTop: 4,
    },
    budgetProgressBar: {
        height: 8,
        backgroundColor: 'rgba(255,255,255,0.2)',
        borderRadius: 4,
        overflow: 'hidden',
    },
    budgetProgressFill: {
        height: '100%',
        borderRadius: 4,
    },
    budgetText: {
        fontSize: 12,
        fontWeight: '500',
        color: 'rgba(255,255,255,0.9)',
        marginTop: 8,
    },

    // Mini Cards
    miniCardsRow: {
        flexDirection: 'row',
        gap: 14,
    },
    miniCard: {
        flex: 1,
        backgroundColor: 'white',
        borderRadius: 20,
        padding: 18,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.03)',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.06,
        shadowRadius: 12,
        elevation: 3,
    },
    miniCardIcon: {
        width: 46,
        height: 46,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 10,
    },
    miniCardValue: {
        fontSize: 18,
        fontWeight: '700',
        color: '#1E293B',
        marginBottom: 4,
    },
    miniCardLabel: {
        fontSize: 12,
        fontWeight: '500',
        color: '#64748B',
    },

    // Section
    section: {
        marginBottom: 28,
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
        gap: 10,
    },
    sectionTitle: {
        fontSize: 17,
        fontWeight: '700',
        color: '#1E293B',
    },

    // Trend Chart
    trendChart: {
        backgroundColor: 'white',
        borderRadius: 24,
        padding: 20,
        borderWidth: 1,
        borderColor: '#F1F5F9',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.04,
        shadowRadius: 12,
        elevation: 2,
    },
    trendBars: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        height: 160,
        alignItems: 'flex-end',
    },
    trendBarContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'flex-end',
        height: '100%',
    },
    trendBarWrapper: {
        width: '100%',
        alignItems: 'center',
        justifyContent: 'flex-end',
        flex: 1,
        marginBottom: 10,
    },
    trendBar: {
        width: 12,
        borderRadius: 6,
        minHeight: 6,
    },
    trendDayLabel: {
        fontSize: 11,
        fontWeight: '600',
        color: '#94A3B8',
        marginBottom: 4,
    },
    trendDayLabelActive: {
        color: theme.colors.primary,
        fontWeight: '700',
    },
    trendAmount: {
        fontSize: 9,
        fontWeight: '700',
        color: '#64748B',
        marginBottom: 4,
    },

    // Category List
    categoryList: {
        backgroundColor: 'white',
        borderRadius: 24,
        borderWidth: 1,
        borderColor: '#F1F5F9',
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.04,
        shadowRadius: 12,
        elevation: 2,
    },
    categoryItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#F1F5F9',
    },
    categoryItemLeft: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
    },
    categoryIcon: {
        width: 44,
        height: 44,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 14,
    },
    categoryInfo: {
        flex: 1,
        marginRight: 12,
    },
    categoryName: {
        fontSize: 15,
        fontWeight: '600',
        color: '#1E293B',
        marginBottom: 8,
    },
    categoryBarContainer: {
        height: 6,
        backgroundColor: '#F1F5F9',
        borderRadius: 3,
        overflow: 'hidden',
        width: '100%',
    },
    categoryBar: {
        height: '100%',
        borderRadius: 3,
    },
    categoryItemRight: {
        alignItems: 'flex-end',
        minWidth: 70,
    },
    categoryAmount: {
        fontSize: 15,
        fontWeight: '700',
        color: '#1E293B',
    },
    categoryPercent: {
        fontSize: 12,
        fontWeight: '500',
        color: '#64748B',
        marginTop: 4,
    },

    // Empty Category
    emptyCategory: {
        backgroundColor: 'white',
        borderRadius: 24,
        padding: 48,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#F1F5F9',
        borderStyle: 'dashed',
    },
    emptyCategoryText: {
        fontSize: 16,
        fontWeight: '500',
        color: '#94A3B8',
        marginTop: 16,
    },

    // Insights
    insightCards: {
        gap: 14,
    },
    insightCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'white',
        borderRadius: 20,
        padding: 18,
        borderWidth: 1,
        borderColor: '#F1F5F9',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.03,
        shadowRadius: 8,
        elevation: 2,
    },
    insightCardIcon: {
        width: 46,
        height: 46,
        borderRadius: 16,
        backgroundColor: '#F8FAFC',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 16,
    },
    insightCardContent: {
        flex: 1,
    },
    insightCardTitle: {
        fontSize: 12,
        fontWeight: '600',
        color: '#64748B',
        marginBottom: 4,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    insightCardValue: {
        fontSize: 15,
        fontWeight: '700',
        color: '#1E293B',
    },
});
