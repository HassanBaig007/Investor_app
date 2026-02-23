/**
 * ProfileMenu Component
 * 
 * A tap-to-dismiss profile menu modal that replaces Alert.alert()
 * for profile/settings menus across the app.
 */

import React from 'react';
import PropTypes from 'prop-types';
import {
    View,
    Text,
    TouchableOpacity,
    TouchableWithoutFeedback,
    Modal,
    StyleSheet,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { theme } from './Theme';

export default function ProfileMenu({
    visible,
    onClose,
    onProfile,
    onSettings,
    onLogout,
    onShare,
    userName = 'User',
}) {
    const menuItems = [
        {
            icon: 'account-outline',
            label: 'My Profile',
            onPress: () => {
                onClose();
                onProfile?.();
            },
            color: theme.colors.primary,
        },
        {
            icon: 'share-variant',
            label: 'Share to Friends',
            onPress: () => {
                onClose();
                onShare?.();
            },
            color: '#10B981',
        },
        {
            icon: 'cog-outline',
            label: 'Settings',
            onPress: () => {
                onClose();
                onSettings?.();
            },
            color: theme.colors.textSecondary,
        },
        {
            icon: 'logout',
            label: 'Sign Out',
            onPress: () => {
                onClose();
                onLogout?.();
            },
            color: theme.colors.danger,
            isDanger: true,
        },
    ];

    return (
        <Modal
            visible={visible}
            transparent={true}
            animationType="fade"
            onRequestClose={onClose}
        >
            <TouchableWithoutFeedback onPress={onClose}>
                <View style={styles.overlay}>
                    <TouchableWithoutFeedback onPress={(e) => e.stopPropagation()}>
                        <View style={styles.menuContainer}>
                            {/* Header with User Info */}
                            <View style={styles.header}>
                                <LinearGradient
                                    colors={['#6366F1', '#8B5CF6']}
                                    style={styles.avatarGradient}
                                >
                                    <Text style={styles.avatarText}>
                                        {userName.split(' ').map(n => n[0]).join('').toUpperCase()}
                                    </Text>
                                </LinearGradient>
                                <View style={styles.headerInfo}>
                                    <Text style={styles.headerTitle}>Account</Text>
                                    <Text style={styles.headerSubtitle} numberOfLines={1}>
                                        {userName}
                                    </Text>
                                </View>
                                <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                                    <MaterialCommunityIcons
                                        name="close"
                                        size={22}
                                        color={theme.colors.textSecondary}
                                    />
                                </TouchableOpacity>
                            </View>

                            {/* Divider */}
                            <View style={styles.divider} />

                            {/* Menu Items */}
                            <View style={styles.menuItems}>
                                {menuItems.map((item, index) => (
                                    <TouchableOpacity
                                        key={item.label}
                                        style={[
                                            styles.menuItem,
                                            item.isDanger && styles.menuItemDanger,
                                            index === menuItems.length - 1 && styles.menuItemLast,
                                        ]}
                                        onPress={item.onPress}
                                        activeOpacity={0.7}
                                    >
                                        <View style={[
                                            styles.menuItemIcon,
                                            { backgroundColor: item.color + '15' }
                                        ]}>
                                            <MaterialCommunityIcons
                                                name={item.icon}
                                                size={22}
                                                color={item.color}
                                            />
                                        </View>
                                        <Text style={[
                                            styles.menuItemLabel,
                                            item.isDanger && styles.menuItemLabelDanger
                                        ]}>
                                            {item.label}
                                        </Text>
                                        <MaterialCommunityIcons
                                            name="chevron-right"
                                            size={20}
                                            color={theme.colors.textTertiary}
                                        />
                                    </TouchableOpacity>
                                ))}
                            </View>

                            {/* Cancel Button */}
                            <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
                                <Text style={styles.cancelText}>Cancel</Text>
                            </TouchableOpacity>
                        </View>
                    </TouchableWithoutFeedback>
                </View>
            </TouchableWithoutFeedback>
        </Modal>
    );
}

ProfileMenu.propTypes = {
    visible: PropTypes.bool.isRequired,
    onClose: PropTypes.func.isRequired,
    onProfile: PropTypes.func,
    onSettings: PropTypes.func,
    onLogout: PropTypes.func,
    onShare: PropTypes.func,
    userName: PropTypes.string,
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
    },
    menuContainer: {
        width: '100%',
        maxWidth: 340,
        backgroundColor: theme.colors.surface,
        borderRadius: 24,
        overflow: 'hidden',
        ...theme.shadows.lg,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 20,
        gap: 14,
    },
    avatarGradient: {
        width: 52,
        height: 52,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
    },
    avatarText: {
        color: 'white',
        fontSize: 18,
        fontWeight: '700',
    },
    headerInfo: {
        flex: 1,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: theme.colors.textPrimary,
    },
    headerSubtitle: {
        fontSize: 14,
        color: theme.colors.textSecondary,
        marginTop: 2,
    },
    closeBtn: {
        width: 36,
        height: 36,
        borderRadius: 10,
        backgroundColor: theme.colors.surfaceAlt,
        alignItems: 'center',
        justifyContent: 'center',
    },
    divider: {
        height: 1,
        backgroundColor: theme.colors.border,
        marginHorizontal: 20,
    },
    menuItems: {
        padding: 12,
    },
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 14,
        borderRadius: 14,
        marginBottom: 6,
    },
    menuItemDanger: {
        marginTop: 8,
        borderTopWidth: 1,
        borderTopColor: theme.colors.border,
        paddingTop: 20,
    },
    menuItemLast: {
        marginBottom: 0,
    },
    menuItemIcon: {
        width: 44,
        height: 44,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 14,
    },
    menuItemLabel: {
        flex: 1,
        fontSize: 16,
        fontWeight: '500',
        color: theme.colors.textPrimary,
    },
    menuItemLabelDanger: {
        color: theme.colors.danger,
    },
    cancelBtn: {
        paddingVertical: 16,
        alignItems: 'center',
        backgroundColor: theme.colors.surfaceAlt,
        borderTopWidth: 1,
        borderTopColor: theme.colors.border,
    },
    cancelText: {
        fontSize: 16,
        fontWeight: '600',
        color: theme.colors.textSecondary,
    },
});
