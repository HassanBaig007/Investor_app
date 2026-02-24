import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import {
    View,
    Text,
    ScrollView,
    StyleSheet,
    TouchableOpacity,
    Switch,
    Alert,
    ActivityIndicator,
    Share,

    Modal,
    TextInput,
    KeyboardAvoidingView,
    Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import LinearGradient from 'react-native-linear-gradient';
import { theme } from '../../components/Theme';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

const SettingRow = ({ icon, title, subtitle, value, onToggle, showArrow }) => (
    <View style={styles.settingRow}>
        <View style={styles.settingIcon}>
            <Ionicons name={icon} size={22} color={theme.colors.primary} />
        </View>
        <View style={styles.settingContent}>
            <Text style={styles.settingTitle}>{title}</Text>
            {subtitle && <Text style={styles.settingSubtitle}>{subtitle}</Text>}
        </View>
        {onToggle !== undefined && (
            <Switch
                value={value}
                onValueChange={onToggle}
                trackColor={{ false: theme.colors.border, true: theme.colors.primaryLight }}
                thumbColor={value ? theme.colors.primary : theme.colors.textTertiary}
            />
        )}
        {showArrow && (
            <Ionicons name="chevron-forward" size={20} color={theme.colors.textTertiary} />
        )}
    </View>
);

SettingRow.propTypes = {
    icon: PropTypes.string.isRequired,
    title: PropTypes.string.isRequired,
    subtitle: PropTypes.string,
    value: PropTypes.bool,
    onToggle: PropTypes.func,
    showArrow: PropTypes.bool,
};

export default function SettingsScreen({ navigation }) {
    const [settings, setSettings] = useState(null);
    const [loading, setLoading] = useState(true);
    const { user: currentUser, logout, biometricAvailable, biometricEnabled, enableBiometric, disableBiometric } = useAuth();
    const [activeProjectsCount, setActiveProjectsCount] = useState(0);
    const [totalProjectsCount, setTotalProjectsCount] = useState(0);
    const [deleteAccountLoading, setDeleteAccountLoading] = useState(false);
    const [showDeleteAccountModal, setShowDeleteAccountModal] = useState(false);
    const [deleteAccountPassword, setDeleteAccountPassword] = useState('');
    const [exportLoading, setExportLoading] = useState(false);
    const [showBiometricPasswordModal, setShowBiometricPasswordModal] = useState(false);
    const [biometricPassword, setBiometricPassword] = useState('');

    useEffect(() => {
        loadSettings();
    }, [currentUser?._id, currentUser?.id]);

    const loadSettings = async () => {
        try {
            const [data, projectsData] = await Promise.all([
                api.getSettings(),
                api.getProjects().catch(() => []),
            ]);
            setSettings(data);
            const myProjects = (projectsData || []).filter(p => {
                const userId = currentUser?._id || currentUser?.id;
                return p.createdBy === userId ||
                    p.createdBy?._id === userId ||
                    p.investors?.some(inv => (inv.user?._id || inv.user) === userId);
            });
            setTotalProjectsCount(myProjects.length);
            setActiveProjectsCount(myProjects.filter(p => p.status === 'active').length);
        } catch (error) {
            console.error('Failed to load settings:', error);
            Alert.alert('Error', 'Failed to load settings');
        } finally {
            setLoading(false);
        }
    };

    const updateNotificationSetting = async (key, value) => {
        const previousSettings = settings;
        const newSettings = {
            ...settings,
            notifications: {
                ...settings.notifications,
                [key]: value,
            },
        };
        setSettings(newSettings);
        try {
            const updatedNotifications = await api.updateNotificationPreferences({ [key]: value });
            setSettings((prev) => ({
                ...prev,
                notifications: updatedNotifications,
            }));
        } catch (error) {
            console.error('Failed to update notification setting:', error);
            setSettings(previousSettings);
            Alert.alert('Error', 'Failed to save notification preference');
        }
    };

    const updateSetting = async (key, value) => {
        const previousSettings = settings;
        const newSettings = { ...settings, [key]: value };
        setSettings(newSettings);
        try {
            const updatedSettings = await api.updateSettings({ [key]: value });
            setSettings(updatedSettings);
        } catch (error) {
            console.error('Failed to update setting:', error);
            setSettings(previousSettings);
            Alert.alert('Error', 'Failed to save setting');
        }
    };

    const handleLanguageSelect = () => {
        Alert.alert(
            'Language',
            'Choose language',
            [
                { text: 'English', onPress: () => updateSetting('language', 'en') },
                { text: 'Hindi', onPress: () => updateSetting('language', 'hi') },
                { text: 'Cancel', style: 'cancel' },
            ]
        );
    };

    const handleCurrencySelect = () => {
        Alert.alert(
            'Currency',
            'Choose currency',
            [
                { text: 'INR (₹)', onPress: () => updateSetting('currency', 'INR') },
                { text: 'USD ($)', onPress: () => updateSetting('currency', 'USD') },
                { text: 'Cancel', style: 'cancel' },
            ]
        );
    };

    const languageLabel = settings?.language === 'hi' ? 'Hindi' : 'English';
    const currencyLabel = settings?.currency === 'USD' ? 'USD ($)' : 'INR (₹)';

    // NEW: Share App functionality
    const handleShareApp = async () => {
        try {
            const shareMessage = `🚀 Check out SplitFlow - The smart expense tracker for collaborative projects!

💰 Track project expenses together
📊 Get detailed analytics
✅ Multi-member approval system
📱 Beautiful, easy-to-use interface

Download now: https://splitflow.app/download`;

            const result = await Share.share({
                message: shareMessage,
                title: 'Share SplitFlow App',
            });

            if (result.action === Share.sharedAction) {
                if (result.activityType) {
                    // Shared with activity type
                    console.log('Shared via:', result.activityType);
                } else {
                    // Shared successfully
                    console.log('App shared successfully');
                }
            }
        } catch (error) {
            console.error('Could not share the app:', error);
            Alert.alert('Error', 'Could not share the app. Please try again.');
        }
    };

    const handleDeleteAccount = async () => {
        if (!deleteAccountPassword?.trim()) {
            Alert.alert('Password Required', 'Please enter your password to continue.');
            return;
        }

        setDeleteAccountLoading(true);
        try {
            await api.deleteAccount(deleteAccountPassword.trim());
            setShowDeleteAccountModal(false);
            setDeleteAccountPassword('');
            Alert.alert('Account Deleted', 'Your account has been permanently deleted.');
            if (logout) logout();
        } catch (error) {
            Alert.alert('Error', error?.friendlyMessage || 'Failed to delete account. Please check your password and try again.');
        } finally {
            setDeleteAccountLoading(false);
        }
    };

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={theme.colors.primary} />
            </View>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color={theme.colors.textPrimary} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Settings</Text>
                <View style={{ width: 32 }} />
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
                {/* Account Statistics - Only Active Projects */}
                <View style={styles.statsSection}>
                    <Text style={styles.sectionTitle}>Account Statistics</Text>
                    <View style={styles.statsCard}>
                        <LinearGradient
                            colors={['#6366F1', '#8B5CF6']}
                            style={styles.statsGradient}
                        >
                            <View style={styles.statsIconBox}>
                                <MaterialCommunityIcons name="briefcase-check" size={32} color="white" />
                            </View>
                            <View style={styles.statsContent}>
                                <Text style={styles.statsValue}>{activeProjectsCount}</Text>
                                <Text style={styles.statsLabel}>Active Projects</Text>
                            </View>
                            <MaterialCommunityIcons name="chevron-right" size={24} color="rgba(255,255,255,0.6)" />
                        </LinearGradient>
                    </View>
                    <Text style={styles.statsNote}>
                        You are a member of {totalProjectsCount} project{totalProjectsCount === 1 ? '' : 's'}
                    </Text>
                </View>

                {/* Appearance */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Appearance</Text>
                    <SettingRow
                        icon="moon-outline"
                        title="Dark Mode"
                        subtitle="Use dark theme"
                        value={settings?.theme === 'dark'}
                        onToggle={(val) => updateSetting('theme', val ? 'dark' : 'light')}
                    />
                    <SettingRow
                        icon="finger-print-outline"
                        title="Biometric Login"
                        subtitle={biometricAvailable ? 'Use fingerprint or face ID' : 'Not available on this device'}
                        value={biometricEnabled}
                        onToggle={async (val) => {
                            if (val) {
                                if (!biometricAvailable) {
                                    Alert.alert('Not Supported', 'Biometric authentication is not available on this device.');
                                    return;
                                }
                                // Ask for password to store credentials
                                setShowBiometricPasswordModal(true);
                            } else {
                                const result = await disableBiometric();
                                if (result.success) {
                                    Alert.alert('Biometric Disabled', 'Biometric login has been turned off.');
                                }
                            }
                        }}
                    />
                </View>

                {/* Notifications */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Notifications</Text>
                    <SettingRow
                        icon="notifications-outline"
                        title="Push Notifications"
                        subtitle="Receive push notifications"
                        value={settings?.notifications?.pushEnabled}
                        onToggle={(val) => updateNotificationSetting('pushEnabled', val)}
                    />
                    <SettingRow
                        icon="mail-outline"
                        title="Email Notifications"
                        subtitle="Receive email updates"
                        value={settings?.notifications?.emailEnabled}
                        onToggle={(val) => updateNotificationSetting('emailEnabled', val)}
                    />
                    <SettingRow
                        icon="checkbox-outline"
                        title="Approval Reminders"
                        subtitle="Remind about pending approvals"
                        value={settings?.notifications?.approvalReminders}
                        onToggle={(val) => updateNotificationSetting('approvalReminders', val)}
                    />
                    <SettingRow
                        icon="cash-outline"
                        title="Spending Alerts"
                        subtitle="Get notified on new spendings"
                        value={settings?.notifications?.reportAlerts}
                        onToggle={(val) => updateNotificationSetting('reportAlerts', val)}
                    />
                </View>

                {/* General */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>General</Text>
                    <TouchableOpacity
                        style={styles.settingRow}
                        onPress={handleLanguageSelect}
                    >
                        <View style={styles.settingIcon}>
                            <Ionicons name="language-outline" size={22} color={theme.colors.primary} />
                        </View>
                        <View style={styles.settingContent}>
                            <Text style={styles.settingTitle}>Language</Text>
                            <Text style={styles.settingSubtitle}>{languageLabel}</Text>
                        </View>
                        <Ionicons name="chevron-forward" size={20} color={theme.colors.textTertiary} />
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={styles.settingRow}
                        onPress={handleCurrencySelect}
                    >
                        <View style={styles.settingIcon}>
                            <Ionicons name="cash-outline" size={22} color={theme.colors.primary} />
                        </View>
                        <View style={styles.settingContent}>
                            <Text style={styles.settingTitle}>Currency</Text>
                            <Text style={styles.settingSubtitle}>{currencyLabel}</Text>
                        </View>
                        <Ionicons name="chevron-forward" size={20} color={theme.colors.textTertiary} />
                    </TouchableOpacity>

                    {/* Share App Button */}
                    <TouchableOpacity
                        style={styles.shareAppButton}
                        onPress={handleShareApp}
                    >
                        <LinearGradient
                            colors={['#10B981', '#059669']}
                            style={styles.shareAppGradient}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                        >
                            <View style={styles.shareAppContent}>
                                <Ionicons name="share-social" size={24} color="white" />
                                <View style={styles.shareAppTextContainer}>
                                    <Text style={styles.shareAppTitle}>Share App</Text>
                                    <Text style={styles.shareAppSubtitle}>Invite friends via WhatsApp, SMS...</Text>
                                </View>
                            </View>
                            <Ionicons name="chevron-forward" size={20} color="rgba(255,255,255,0.8)" />
                        </LinearGradient>
                    </TouchableOpacity>
                </View>

                {/* Support */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Support</Text>
                    <TouchableOpacity
                        style={styles.settingRow}
                        onPress={() => Alert.alert('Help Center', 'Visit our support portal for assistance.')}
                    >
                        <View style={styles.settingIcon}>
                            <Ionicons name="help-circle-outline" size={22} color={theme.colors.primary} />
                        </View>
                        <View style={styles.settingContent}>
                            <Text style={styles.settingTitle}>Help Center</Text>
                        </View>
                        <Ionicons name="chevron-forward" size={20} color={theme.colors.textTertiary} />
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={styles.settingRow}
                        onPress={() => Alert.alert('Privacy Policy', 'Privacy Policy will be available soon.')}
                    >
                        <View style={styles.settingIcon}>
                            <Ionicons name="shield-outline" size={22} color={theme.colors.primary} />
                        </View>
                        <View style={styles.settingContent}>
                            <Text style={styles.settingTitle}>Privacy Policy</Text>
                        </View>
                        <Ionicons name="chevron-forward" size={20} color={theme.colors.textTertiary} />
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={styles.settingRow}
                        onPress={() => Alert.alert('Terms of Service', 'Terms of Service will be available soon.')}
                    >
                        <View style={styles.settingIcon}>
                            <Ionicons name="document-outline" size={22} color={theme.colors.primary} />
                        </View>
                        <View style={styles.settingContent}>
                            <Text style={styles.settingTitle}>Terms of Service</Text>
                        </View>
                        <Ionicons name="chevron-forward" size={20} color={theme.colors.textTertiary} />
                    </TouchableOpacity>
                </View>

                {/* Data & Account Management */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Data & Account</Text>

                    {/* Export My Data (GDPR) */}
                    <TouchableOpacity
                        style={styles.settingRow}
                        onPress={async () => {
                            setExportLoading(true);
                            try {
                                const data = await api.exportUserData();
                                Alert.alert(
                                    'Data Export Ready',
                                    `Your data has been exported (${JSON.stringify(data).length} bytes). The export includes your profile, settings, and account information.`,
                                    [{ text: 'OK' }]
                                );
                            } catch {
                                Alert.alert('Error', 'Failed to export your data. Please try again.');
                            } finally {
                                setExportLoading(false);
                            }
                        }}
                    >
                        <View style={styles.settingIcon}>
                            <Ionicons name="download-outline" size={22} color={theme.colors.primary} />
                        </View>
                        <View style={styles.settingContent}>
                            <Text style={styles.settingTitle}>Export My Data</Text>
                            <Text style={styles.settingSubtitle}>Download all your personal data</Text>
                        </View>
                        {exportLoading ? (
                            <ActivityIndicator size="small" color={theme.colors.primary} />
                        ) : (
                            <Ionicons name="chevron-forward" size={20} color={theme.colors.textTertiary} />
                        )}
                    </TouchableOpacity>

                    {/* Delete Account (Apple App Store § 5.1.1 & Google Play requirement) */}
                    <TouchableOpacity
                        style={[styles.settingRow, { borderBottomWidth: 0 }]}
                        onPress={() => {
                            Alert.alert(
                                'Delete Account',
                                'This action is permanent and cannot be undone. All your personal data will be anonymized. Your financial records will be preserved for audit compliance.\n\nTo confirm, you must enter your password.',
                                [
                                    { text: 'Cancel', style: 'cancel' },
                                    {
                                        text: 'Continue',
                                        style: 'destructive',
                                        onPress: () => setShowDeleteAccountModal(true),
                                    },
                                ]
                            );
                        }}
                    >
                        <View style={[styles.settingIcon, { backgroundColor: '#FEE2E2' }]}>
                            <Ionicons name="trash-outline" size={22} color="#EF4444" />
                        </View>
                        <View style={styles.settingContent}>
                            <Text style={[styles.settingTitle, { color: '#EF4444' }]}>Delete Account</Text>
                            <Text style={styles.settingSubtitle}>Permanently remove your account and data</Text>
                        </View>
                        {deleteAccountLoading ? (
                            <ActivityIndicator size="small" color="#EF4444" />
                        ) : (
                            <Ionicons name="chevron-forward" size={20} color={theme.colors.textTertiary} />
                        )}
                    </TouchableOpacity>
                </View>

                {/* About */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>About</Text>
                    <View style={styles.settingRow}>
                        <View style={styles.settingIcon}>
                            <Ionicons name="information-circle-outline" size={22} color={theme.colors.primary} />
                        </View>
                        <View style={styles.settingContent}>
                            <Text style={styles.settingTitle}>App Version</Text>
                            <Text style={styles.settingSubtitle}>2.0.0 - SplitFlow</Text>
                        </View>
                    </View>
                </View>

                <View style={{ height: 40 }} />
            </ScrollView>

            <Modal
                visible={showDeleteAccountModal}
                transparent
                animationType="fade"
                onRequestClose={() => {
                    if (!deleteAccountLoading) setShowDeleteAccountModal(false);
                }}
            >
                <View style={styles.modalOverlay}>
                    <KeyboardAvoidingView
                        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                        style={styles.deleteModalContainer}
                    >
                        <View style={styles.deleteModalCard}>
                            <Text style={styles.deleteModalTitle}>Confirm Account Deletion</Text>
                            <Text style={styles.deleteModalSubtitle}>
                                Enter your password to permanently delete your account.
                            </Text>

                            <TextInput
                                style={styles.deleteModalInput}
                                placeholder="Password"
                                placeholderTextColor={theme.colors.textTertiary}
                                secureTextEntry
                                autoCapitalize="none"
                                autoCorrect={false}
                                value={deleteAccountPassword}
                                onChangeText={setDeleteAccountPassword}
                                editable={!deleteAccountLoading}
                            />

                            <View style={styles.deleteModalActions}>
                                <TouchableOpacity
                                    style={styles.deleteModalCancelBtn}
                                    disabled={deleteAccountLoading}
                                    onPress={() => {
                                        setShowDeleteAccountModal(false);
                                        setDeleteAccountPassword('');
                                    }}
                                >
                                    <Text style={styles.deleteModalCancelText}>Cancel</Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={styles.deleteModalConfirmBtn}
                                    disabled={deleteAccountLoading}
                                    onPress={handleDeleteAccount}
                                >
                                    {deleteAccountLoading ? (
                                        <ActivityIndicator size="small" color="white" />
                                    ) : (
                                        <Text style={styles.deleteModalConfirmText}>Delete</Text>
                                    )}
                                </TouchableOpacity>
                            </View>
                        </View>
                    </KeyboardAvoidingView>
                </View>
            </Modal>

            {/* Biometric Password Confirmation Modal */}
            <Modal
                visible={showBiometricPasswordModal}
                transparent
                animationType="fade"
                onRequestClose={() => {
                    setShowBiometricPasswordModal(false);
                    setBiometricPassword('');
                }}
            >
                <View style={styles.modalOverlay}>
                    <KeyboardAvoidingView
                        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                        style={styles.deleteModalContainer}
                    >
                        <View style={styles.deleteModalCard}>
                            <Text style={styles.deleteModalTitle}>Enable Biometric Login</Text>
                            <Text style={styles.deleteModalSubtitle}>
                                Enter your password to securely store your credentials for biometric login.
                            </Text>

                            <TextInput
                                style={styles.deleteModalInput}
                                value={biometricPassword}
                                onChangeText={setBiometricPassword}
                                placeholder="Enter your password"
                                placeholderTextColor={theme.colors.textTertiary}
                                secureTextEntry
                                autoFocus
                            />

                            <View style={styles.deleteModalActions}>
                                <TouchableOpacity
                                    style={styles.deleteModalCancelBtn}
                                    onPress={() => {
                                        setShowBiometricPasswordModal(false);
                                        setBiometricPassword('');
                                    }}
                                >
                                    <Text style={styles.deleteModalCancelText}>Cancel</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[
                                        styles.deleteModalConfirmBtn,
                                        { backgroundColor: theme.colors.primary },
                                        !biometricPassword && { opacity: 0.5 },
                                    ]}
                                    disabled={!biometricPassword}
                                    onPress={async () => {
                                        const email = currentUser?.email;
                                        if (!email) {
                                            Alert.alert('Error', 'Could not determine your email.');
                                            return;
                                        }
                                        const result = await enableBiometric(email, biometricPassword);
                                        setShowBiometricPasswordModal(false);
                                        setBiometricPassword('');
                                        if (result.success) {
                                            Alert.alert('Biometric Enabled', 'You can now login with your fingerprint or face ID.');
                                        } else {
                                            Alert.alert('Error', result.error || 'Failed to enable biometric login.');
                                        }
                                    }}
                                >
                                    <Text style={styles.deleteModalConfirmText}>Enable</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </KeyboardAvoidingView>
                </View>
            </Modal>
        </SafeAreaView>
    );
}

SettingsScreen.propTypes = {
    navigation: PropTypes.shape({
        goBack: PropTypes.func.isRequired,
    }).isRequired,
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors.background,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: theme.colors.background,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: theme.colors.surface,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
    },
    backButton: {
        padding: 4,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: theme.colors.textPrimary,
    },
    // Stats Section
    statsSection: {
        padding: 16,
    },
    statsCard: {
        borderRadius: 20,
        overflow: 'hidden',
        marginTop: 12,
    },
    statsGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 20,
    },
    statsIconBox: {
        width: 56,
        height: 56,
        borderRadius: 16,
        backgroundColor: 'rgba(255,255,255,0.2)',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 16,
    },
    statsContent: {
        flex: 1,
    },
    statsValue: {
        fontSize: 32,
        fontWeight: '700',
        color: 'white',
    },
    statsLabel: {
        fontSize: 14,
        color: 'rgba(255,255,255,0.8)',
        marginTop: 2,
    },
    statsNote: {
        ...theme.typography.caption,
        color: theme.colors.textSecondary,
        textAlign: 'center',
        marginTop: 12,
    },
    section: {
        backgroundColor: theme.colors.surface,
        marginTop: 16,
        paddingHorizontal: 16,
    },
    sectionTitle: {
        fontSize: 13,
        fontWeight: '600',
        color: theme.colors.textSecondary,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        paddingTop: 16,
        paddingBottom: 8,
    },
    settingRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 14,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.borderLight,
    },
    settingIcon: {
        width: 36,
        height: 36,
        borderRadius: 8,
        backgroundColor: theme.colors.primaryLight,
        justifyContent: 'center',
        alignItems: 'center',
    },
    settingContent: {
        flex: 1,
        marginLeft: 12,
    },
    settingTitle: {
        fontSize: 16,
        fontWeight: '500',
        color: theme.colors.textPrimary,
    },
    settingSubtitle: {
        fontSize: 13,
        color: theme.colors.textSecondary,
        marginTop: 2,
    },
    // NEW: Share App Button Styles
    shareAppButton: {
        marginTop: 12,
        marginBottom: 8,
        borderRadius: 14,
        overflow: 'hidden',
        shadowColor: '#10B981',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 6,
    },
    shareAppGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 16,
    },
    shareAppContent: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    shareAppTextContainer: {
        marginLeft: 14,
    },
    shareAppTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: 'white',
    },
    shareAppSubtitle: {
        fontSize: 12,
        color: 'rgba(255,255,255,0.85)',
        marginTop: 2,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        paddingHorizontal: 20,
    },
    deleteModalContainer: {
        width: '100%',
    },
    deleteModalCard: {
        backgroundColor: theme.colors.surface,
        borderRadius: 14,
        padding: 16,
    },
    deleteModalTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: theme.colors.textPrimary,
    },
    deleteModalSubtitle: {
        fontSize: 13,
        color: theme.colors.textSecondary,
        marginTop: 8,
    },
    deleteModalInput: {
        marginTop: 14,
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderRadius: 10,
        paddingHorizontal: 12,
        paddingVertical: 10,
        color: theme.colors.textPrimary,
        backgroundColor: theme.colors.background,
    },
    deleteModalActions: {
        marginTop: 16,
        flexDirection: 'row',
        justifyContent: 'flex-end',
        alignItems: 'center',
        gap: 10,
    },
    deleteModalCancelBtn: {
        paddingHorizontal: 12,
        paddingVertical: 10,
    },
    deleteModalCancelText: {
        fontSize: 14,
        color: theme.colors.textSecondary,
        fontWeight: '600',
    },
    deleteModalConfirmBtn: {
        minWidth: 90,
        borderRadius: 10,
        backgroundColor: '#EF4444',
        paddingHorizontal: 14,
        paddingVertical: 10,
        alignItems: 'center',
        justifyContent: 'center',
    },
    deleteModalConfirmText: {
        color: 'white',
        fontSize: 14,
        fontWeight: '700',
    },
});
