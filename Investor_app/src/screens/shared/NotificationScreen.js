import React, { useState, useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    Animated,
    Easing,
    Alert,
    LayoutAnimation,
    Platform,
    UIManager,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { theme } from '../../components/Theme';
import { getRelativeTime } from '../../utils/dateTimeUtils';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

const isAnnouncementReadByUser = (announcement, userId) =>
    (announcement?.readBy || []).some((id) => String(id) === String(userId));

if (Platform.OS === 'android') {
    if (UIManager.setLayoutAnimationEnabledExperimental) {
        UIManager.setLayoutAnimationEnabledExperimental(true);
    }
}

const NotificationItem = ({ item, index, animation, onPress, onLongPress, selectionMode, isSelected, isExpanded }) => {
    const translateY = animation.interpolate({
        inputRange: [0, 1],
        outputRange: [50, 0],
    });

    const opacity = animation;

    // Determine icon and color based on type/priority
    let iconName, iconColor, iconBg;

    if (item.type === 'update') {
        iconName = 'update';
        iconColor = '#6366F1'; // Business Blue
        iconBg = '#E0E7FF';
    } else if (item.priority === 'high') {
        iconName = 'alert-circle';
        iconColor = '#EF4444'; // Red
        iconBg = '#FEE2E2';
    } else if (item.priority === 'medium') {
        iconName = 'information';
        iconColor = '#F59E0B'; // Amber
        iconBg = '#FEF3C7';
    } else {
        iconName = 'bullhorn';
        iconColor = '#10B981'; // Green
        iconBg = '#D1FAE5';
    }

    return (
        <Animated.View
            style={[
                styles.itemContainer,
                isSelected && styles.itemSelected,
                isExpanded && styles.itemExpanded, // Aesthetic expanded style
                {
                    opacity,
                    transform: [{ translateY }],
                },
            ]}
        >
            <TouchableOpacity
                onPress={onPress}
                onLongPress={onLongPress}
                activeOpacity={0.9} // Higher opacity for nicer feel
                style={styles.itemPressable}
            >
                {selectionMode && (
                    <View style={styles.selectionCheckContainer}>
                        <MaterialCommunityIcons
                            name={isSelected ? "checkbox-marked-circle" : "checkbox-blank-circle-outline"}
                            size={24}
                            color={isSelected ? theme.colors.primary : theme.colors.textTertiary}
                        />
                    </View>
                )}
                <View style={[styles.iconContainer, { backgroundColor: iconBg }]}>
                    <MaterialCommunityIcons name={iconName} size={24} color={iconColor} />
                </View>
                <View style={styles.textContainer}>
                    <View style={styles.headerRow}>
                        <Text style={styles.title} numberOfLines={isExpanded ? undefined : 1}>
                            {item.title || item.type || 'Notification'}
                        </Text>
                        <Text style={styles.time}>{getRelativeTime(item.timestamp || item.createdAt)}</Text>
                    </View>
                    <Text
                        style={[styles.description, isExpanded && styles.descriptionExpanded]}
                        numberOfLines={isExpanded ? undefined : 2}
                    >
                        {item.body || item.content || item.description || item.message || (item.project ? `Update for ${item.project}` : 'No details available')}
                    </Text>

                    {/* Aesthetic Slide Box Content */}
                    {isExpanded && (
                        <View style={styles.expandedContentBox}>
                            {item.priority && (
                                <View style={styles.tagRow}>
                                    <View style={[styles.tag, { backgroundColor: iconBg }]}>
                                        <Text style={[styles.tagText, { color: iconColor }]}>
                                            {item.priority.toUpperCase()} priority
                                        </Text>
                                    </View>
                                </View>
                            )}
                        </View>
                    )}
                </View>
                {!item.read && !selectionMode && <View style={styles.unreadDot} />}
            </TouchableOpacity>
        </Animated.View>
    );
};

NotificationItem.propTypes = {
    item: PropTypes.shape({
        type: PropTypes.string,
        priority: PropTypes.string,
        title: PropTypes.string,
        project: PropTypes.string,
        timestamp: PropTypes.string,
        createdAt: PropTypes.string,
        content: PropTypes.string,
        description: PropTypes.string,
        body: PropTypes.string,
        message: PropTypes.string,
        read: PropTypes.bool,
    }).isRequired,
    index: PropTypes.number.isRequired,
    animation: PropTypes.object.isRequired,
    onPress: PropTypes.func.isRequired,
    onLongPress: PropTypes.func,
    selectionMode: PropTypes.bool,
    isSelected: PropTypes.bool,
    isExpanded: PropTypes.bool,
};

export default function NotificationScreen({ navigation }) {
    const { user: currentUser } = useAuth();
    const currentUserId = currentUser?.id || currentUser?._id;
    // Merge updates and announcements for a fuller list
    const [notifications, setNotifications] = useState([]);
    // Algorithm for selection
    const [selectionMode, setSelectionMode] = useState(false);
    const [selectedIds, setSelectedIds] = useState(new Set());
    const [expandedId, setExpandedId] = useState(null);

    // Animation values array
    const animatedValues = useRef([]).current;

    useEffect(() => {
        const fetchNotifications = async () => {
            try {
                const [notifData, announcementData] = await Promise.all([
                    api.getNotifications().catch(() => []),
                    api.getAnnouncements().catch(() => []),
                ]);

                // Merge notifications and announcements
                const formattedNotifs = (notifData || []).map(n => ({
                    ...n,
                    type: 'update',
                    read: n.isRead,
                    timestamp: n.createdAt,
                }));
                const formattedAnnouncements = (announcementData || []).map(a => ({
                    ...a,
                    type: 'announcement',
                    read: isAnnouncementReadByUser(a, currentUserId),
                    timestamp: a.createdAt,
                }));

                const allNotifs = [...formattedNotifs, ...formattedAnnouncements].sort((a, b) => {
                    const dateA = new Date(a.timestamp || a.createdAt);
                    const dateB = new Date(b.timestamp || b.createdAt);
                    return dateB - dateA;
                });

                // Initialize animations for each item
                allNotifs.forEach((_, index) => {
                    animatedValues[index] = new Animated.Value(0);
                });

                setNotifications(allNotifs);

                // Staggered animation effect
                const animations = allNotifs.map((_, index) => {
                    return Animated.timing(animatedValues[index], {
                        toValue: 1,
                        duration: 400,
                        delay: index * 100,
                        useNativeDriver: true,
                        easing: Easing.out(Easing.cubic),
                    });
                });

                Animated.stagger(50, animations).start();
            } catch (err) {
                console.error('Failed to load notifications:', err);
            }
        };
        fetchNotifications();
    }, [currentUserId]);

    const handleOpenItem = async (item) => {
        if (item.read) return;

        try {
            if (item.type === 'announcement') {
                await api.markAnnouncementRead(item._id || item.id);
            } else {
                await api.markNotificationRead(item._id || item.id);
            }
        } catch (error) {
            console.error('Failed to mark item read:', error);
        } finally {
            const itemId = item._id || item.id;
            setNotifications((prev) => prev.map((n) => {
                const id = n._id || n.id;
                return id === itemId ? { ...n, read: true, isRead: true } : n;
            }));
        }
    };

    const handleClearAll = async () => {
        try {
            await api.markAllNotificationsRead();

            const unreadAnnouncementIds = notifications
                .filter((n) => n.type === 'announcement' && !n.read)
                .map((n) => n._id || n.id)
                .filter(Boolean);

            if (unreadAnnouncementIds.length > 0) {
                await Promise.allSettled(
                    unreadAnnouncementIds.map((id) => api.markAnnouncementRead(id))
                );
            }

            setNotifications(prev => prev.map(n => ({ ...n, read: true, isRead: true })));
        } catch (err) {
            console.error('Failed to mark all read:', err);
            // Fallback: mark locally
            setNotifications(prev => prev.map(n => ({ ...n, read: true, isRead: true })));
        }
    };


    // Selection Handlers
    const enterSelectionMode = (item) => {
        setSelectionMode(true);
        const newSelected = new Set(selectedIds);
        const id = item._id || item.id;
        newSelected.add(id);
        setSelectedIds(newSelected);
    };

    const toggleSelection = (item) => {
        const id = item._id || item.id;
        const newSelected = new Set(selectedIds);
        if (newSelected.has(id)) {
            newSelected.delete(id);
            if (newSelected.size === 0) {
                setSelectionMode(false);
            }
        } else {
            newSelected.add(id);
        }
        setSelectedIds(newSelected);
    };

    const handleSelectAll = () => {
        if (selectedIds.size === notifications.length) {
            setSelectedIds(new Set()); // Deselect all
            setSelectionMode(false);
            return;
        }
        const allIds = new Set(notifications.map(n => n._id || n.id));
        setSelectedIds(allIds);
    };

    const exitSelectionMode = () => {
        setSelectionMode(false);
        setSelectedIds(new Set());
    };

    const handleDeleteSelected = () => {
        Alert.alert(
            "Delete Notifications",
            `Are you sure you want to delete ${selectedIds.size} selected items?`,
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Delete",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            const idsToDelete = Array.from(selectedIds);

                            // Optimistic update
                            setNotifications(prev => prev.filter(n => !selectedIds.has(n._id || n.id)));
                            exitSelectionMode();

                            // Handle mixed types (Notifications vs Announcements)
                            await Promise.allSettled(
                                idsToDelete.map(id => {
                                    const item = notifications.find(n => (n._id || n.id) === id);
                                    if (item?.type === 'announcement') {
                                        return api.deleteAnnouncement(id).catch(e => console.log(`Failed delete announcement ${id}`, e));
                                    }
                                    return api.deleteNotification(id).catch(e => console.log(`Failed delete notification ${id}`, e));
                                })
                            );

                        } catch (err) {
                            console.error("Failed to delete notifications:", err);
                            Alert.alert("Error", "Could not delete some notifications.");
                        }
                    }
                }
            ]
        );
    };

    const handleItemPress = (item) => {
        if (selectionMode) {
            toggleSelection(item);
        } else {
            // Aesthetic Slide Animation
            LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
            const id = item._id || item.id;
            setExpandedId(expandedId === id ? null : id);

            // Mark as read if not already
            if (!item.read) {
                handleOpenItem(item);
            }
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            {/* Header */}
            {selectionMode ? (
                <View style={[styles.header, styles.selectionHeader]}>
                    <TouchableOpacity onPress={exitSelectionMode} style={styles.headerActionBtn}>
                        <MaterialCommunityIcons name="close" size={24} color={theme.colors.textPrimary} />
                    </TouchableOpacity>
                    <Text style={styles.selectionTitle}>{selectedIds.size} Selected</Text>
                    <View style={styles.selectionActions}>
                        <TouchableOpacity onPress={handleSelectAll} style={styles.headerActionBtn}>
                            <MaterialCommunityIcons
                                name={selectedIds.size === notifications.length ? "checkbox-marked-circle-outline" : "checkbox-multiple-marked-outline"}
                                size={24}
                                color={theme.colors.textPrimary}
                            />
                        </TouchableOpacity>
                        <TouchableOpacity onPress={handleDeleteSelected} style={styles.headerActionBtn}>
                            <MaterialCommunityIcons name="trash-can-outline" size={24} color={theme.colors.danger} />
                        </TouchableOpacity>
                    </View>
                </View>
            ) : (
                <View style={styles.header}>
                    <TouchableOpacity
                        onPress={() => navigation.goBack()}
                        style={styles.backButton}
                    >
                        <MaterialCommunityIcons name="arrow-left" size={24} color={theme.colors.textPrimary} />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Notifications</Text>
                    <TouchableOpacity onPress={handleClearAll} style={styles.markReadButton}>
                        <Text style={styles.markReadText}>Mark all read</Text>
                    </TouchableOpacity>
                </View>
            )}

            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                {notifications.length > 0 ? (
                    notifications.map((item, index) => (
                        <NotificationItem
                            key={item.id || index}
                            item={item}
                            index={index}
                            animation={animatedValues[index]}
                            onPress={() => handleItemPress(item)}
                            onLongPress={() => enterSelectionMode(item)}
                            selectionMode={selectionMode}
                            isSelected={selectedIds.has(item.id || item._id)}
                            isExpanded={expandedId === (item.id || item._id)}
                        />
                    ))
                ) : (
                    <View style={styles.emptyState}>
                        <MaterialCommunityIcons name="bell-sleep-outline" size={64} color={theme.colors.textTertiary} />
                        <Text style={styles.emptyTitle}>No Notifications</Text>
                        <Text style={styles.emptySubtitle}>You're all caught up!</Text>
                    </View>
                )}
            </ScrollView>
        </SafeAreaView>
    );
}

NotificationScreen.propTypes = {
    navigation: PropTypes.shape({
        goBack: PropTypes.func.isRequired,
    }).isRequired,
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors.background,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 16,
        backgroundColor: theme.colors.surface,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
        ...theme.shadows.soft,
        zIndex: 10,
    },
    backButton: {
        padding: 4,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: theme.colors.textPrimary,
    },
    markReadButton: {
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderRadius: 20,
        backgroundColor: '#F3F4F6',
    },
    markReadText: {
        fontSize: 12,
        fontWeight: '600',
        color: theme.colors.primary,
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        padding: 20,
        paddingBottom: 40,
    },

    // Notification Item Styles
    itemContainer: {
        backgroundColor: theme.colors.surface,
        borderRadius: 16,
        marginBottom: 12,
        ...theme.shadows.card, // Nice subtle shadow
    },
    itemSelected: {
        backgroundColor: '#F3F4F6',
        borderColor: theme.colors.primary,
        borderWidth: 1,
    },
    itemExpanded: {
        backgroundColor: '#FFFFFF',
        borderColor: 'rgba(99, 102, 241, 0.3)', // Subtle glow border
        borderWidth: 1,
        ...theme.shadows.medium, // Elevated shadow
    },
    selectionCheckContainer: {
        marginRight: 12,
    },
    selectionHeader: {
        backgroundColor: '#E0E7FF', // Light indigo bg for selection mode
    },
    selectionTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: theme.colors.primary,
        flex: 1,
        marginLeft: 16,
    },
    selectionActions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
    },
    headerActionBtn: {
        padding: 4,
    },
    itemPressable: {
        flexDirection: 'row',
        padding: 16,
        alignItems: 'center',
    },
    iconContainer: {
        width: 48,
        height: 48,
        borderRadius: 24,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 16,
    },
    textContainer: {
        flex: 1,
        marginRight: 8,
    },
    headerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 4,
    },
    title: {
        fontSize: 16,
        fontWeight: '600',
        color: theme.colors.textPrimary,
        flex: 1,
        marginRight: 8,
    },
    time: {
        fontSize: 12,
        color: theme.colors.textTertiary,
    },
    description: {
        fontSize: 14,
        color: theme.colors.textSecondary,
        lineHeight: 20,
    },
    descriptionExpanded: {
        color: theme.colors.textPrimary,
        lineHeight: 22,
        marginBottom: 12,
    },
    expandedContentBox: {
        marginTop: 8,
    },
    tagRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    tag: {
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 6,
    },
    tagText: {
        fontSize: 10,
        fontWeight: '700',
    },
    unreadDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: theme.colors.primary,
        marginLeft: 8,
    },

    // Empty State
    emptyState: {
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 100,
        opacity: 0.7,
    },
    emptyTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: theme.colors.textSecondary,
        marginTop: 16,
    },
    emptySubtitle: {
        fontSize: 14,
        color: theme.colors.textTertiary,
        marginTop: 4,
    },
});
