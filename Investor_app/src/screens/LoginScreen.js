import React, { useState } from 'react';
import PropTypes from 'prop-types';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    KeyboardAvoidingView,
    Platform,
    Alert,
    StatusBar,
    Dimensions,
    ScrollView,

} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import LinearGradient from 'react-native-linear-gradient';
import { theme } from '../components/Theme';
import { validateLoginForm } from '../utils/validationUtils';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

/**
 * LoginScreen with Authentication
 */
export default function LoginScreen({ navigation, onLogin }) {
    const { biometricAvailable, biometricEnabled, loginWithBiometric } = useAuth();

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [emailFocused, setEmailFocused] = useState(false);
    const [passwordFocused, setPasswordFocused] = useState(false);
    const [errors, setErrors] = useState({});

    // Role Toggle State
    const [isSuperAdmin, setIsSuperAdmin] = useState(false);

    // Auto-fill credentials when switching roles
    const toggleRole = (adminMode) => {
        setIsSuperAdmin(adminMode);
        setEmail('');
        setPassword('');
        setErrors({});
    };

    const handleBiometricLogin = async () => {
        setIsLoading(true);
        try {
            const result = await loginWithBiometric();
            if (result.success) {
                onLogin?.(result.user);
            } else if (result.error && result.error !== 'Biometric verification cancelled.') {
                Alert.alert('Biometric Login', result.error);
            }
        } catch {
            Alert.alert('Error', 'Biometric login failed. Please use your password.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleLogin = () => {
        if (Object.keys(errors).length > 0) {
            setErrors({});
        }

        // Validate form
        // Special bypass for 'admin' username OR if in Super Admin mode
        let validation;
        if (isSuperAdmin || email.toLowerCase() === 'admin') {
            validation = { isValid: true };
            if (!password) {
                validation = { isValid: false, errors: { password: 'Password is required' } };
            }
        } else {
            validation = validateLoginForm({ email, password });
        }

        if (!validation.isValid) {
            setErrors(validation.errors);
            const firstError = Object.values(validation.errors)[0];
            Alert.alert('Validation Error', firstError);
            return;
        }

        setErrors({});
        setIsLoading(true);

        // REAL API LOGIN
        const attemptLogin = async () => {
            try {
                const response = await api.login(email, password);
                setIsLoading(false);

                if (response.success) {
                    const userRole = response.user?.role || 'investor';
                    if (isSuperAdmin && userRole !== 'super_admin' && userRole !== 'admin') {
                        Alert.alert('Access Denied', 'This account does not have Admin privileges.');
                        return;
                    }
                    // This triggers the navigate in RootNavigator
                    onLogin?.(response.user);
                } else {
                    Alert.alert('Login Failed', response.message || 'Invalid email or password');
                }
            } catch (err) {
                setIsLoading(false);
                const baseUrl = api.getBaseUrl?.() || 'unknown';
                if (err.response?.data?.message) {
                    Alert.alert('Login Failed', err.response.data.message);
                } else {
                    Alert.alert(
                        'Connection Failed',
                        `Cannot reach server at ${baseUrl}. Make sure the backend is running and your device is on the same network.`,
                    );
                }
            }
        };

        attemptLogin();
    };

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="dark-content" backgroundColor={theme.colors.background} />
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.keyboardView}
            >
                <ScrollView
                    contentContainerStyle={styles.scrollContent}
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={false}
                >
                    {/* Logo & Branding */}
                    <View style={styles.header}>
                        <View style={styles.logoBox}>
                            <LinearGradient colors={['#5B5CFF', '#7C3AED']} style={styles.logoGradient}>
                                <MaterialCommunityIcons name="chart-donut" size={36} color="white" />
                            </LinearGradient>
                        </View>
                        <Text style={styles.appName}>SplitFlow</Text>
                        <Text style={styles.tagline}>Project expenses, simplified</Text>
                    </View>

                    {/* ROLE TOGGLE */}
                    <View style={styles.roleToggleContainer}>
                        <TouchableOpacity
                            style={[styles.roleButton, !isSuperAdmin && styles.roleButtonActive]}
                            onPress={() => toggleRole(false)}
                            activeOpacity={0.8}
                        >
                            <Text style={[styles.roleButtonText, !isSuperAdmin && styles.roleButtonTextActive]}>User</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.roleButton, isSuperAdmin && styles.roleButtonActive]}
                            onPress={() => toggleRole(true)}
                            activeOpacity={0.8}
                        >
                            <Text style={[styles.roleButtonText, isSuperAdmin && styles.roleButtonTextActive]}>Admin</Text>
                        </TouchableOpacity>
                    </View>

                    {/* Login Card */}
                    <View style={styles.card}>
                        <Text style={styles.cardTitle}>{isSuperAdmin ? 'Admin Login' : 'Sign In'}</Text>
                        <Text style={styles.cardSubtitle}>
                            {isSuperAdmin ? 'Access global dashboard' : 'Sign in through email address, phone number or user name'}
                        </Text>

                        {/* Email Field */}
                        <View style={[styles.inputContainer, emailFocused && styles.inputFocused]}>
                            <MaterialCommunityIcons
                                name="email-outline"
                                size={22}
                                color={emailFocused ? theme.colors.primary : theme.colors.textTertiary}
                            />
                            <TextInput
                                style={styles.input}
                                placeholder="Email address, phone number, or user name"
                                placeholderTextColor={theme.colors.textTertiary}
                                value={email}
                                onChangeText={setEmail}
                                keyboardType="email-address"
                                autoCapitalize="none"
                                autoCorrect={false}
                                textContentType="username"
                                autoComplete="email"
                                onFocus={() => setEmailFocused(true)}
                                onBlur={() => setEmailFocused(false)}
                            />
                        </View>

                        {/* Password Field */}
                        <View style={[styles.inputContainer, passwordFocused && styles.inputFocused]}>
                            <MaterialCommunityIcons
                                name="lock-outline"
                                size={22}
                                color={passwordFocused ? theme.colors.primary : theme.colors.textTertiary}
                            />
                            <TextInput
                                style={styles.input}
                                placeholder="Password"
                                placeholderTextColor={theme.colors.textTertiary}
                                value={password}
                                onChangeText={setPassword}
                                secureTextEntry={!showPassword}
                                textContentType="password"
                                autoComplete="password"
                                onFocus={() => setPasswordFocused(true)}
                                onBlur={() => setPasswordFocused(false)}
                            />
                            <TouchableOpacity
                                onPress={() => setShowPassword(!showPassword)}
                                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                            >
                                <MaterialCommunityIcons
                                    name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                                    size={22}
                                    color={theme.colors.textTertiary}
                                />
                            </TouchableOpacity>
                        </View>

                        {/* Sign In Button */}
                        <TouchableOpacity
                            style={styles.signInButton}
                            onPress={handleLogin}
                            disabled={isLoading}
                            activeOpacity={0.8}
                        >
                            <LinearGradient colors={['#5B5CFF', '#3D3EDB']} style={styles.signInGradient}>
                                {isLoading ? (
                                    <Text style={styles.signInText}>Signing in...</Text>
                                ) : (
                                    <>
                                        <Text style={styles.signInText}>Sign In</Text>
                                        <MaterialCommunityIcons name="arrow-right" size={20} color="white" />
                                    </>
                                )}
                            </LinearGradient>
                        </TouchableOpacity>

                    </View>

                    {/* Biometric Login Button */}
                    {!isSuperAdmin && biometricAvailable && biometricEnabled && (
                        <View style={styles.biometricSection}>
                            <View style={styles.biometricDivider}>
                                <View style={styles.biometricDividerLine} />
                                <Text style={styles.biometricDividerText}>or</Text>
                                <View style={styles.biometricDividerLine} />
                            </View>
                            <TouchableOpacity
                                style={styles.biometricButton}
                                onPress={handleBiometricLogin}
                                disabled={isLoading}
                                activeOpacity={0.7}
                            >
                                <LinearGradient
                                    colors={['#10B981', '#059669']}
                                    style={styles.biometricGradient}
                                >
                                    <MaterialCommunityIcons name="fingerprint" size={28} color="white" />
                                    <Text style={styles.biometricText}>Login with Fingerprint</Text>
                                </LinearGradient>
                            </TouchableOpacity>
                        </View>
                    )}

                    {/* Footer / Sign Up Link */}
                    {!isSuperAdmin && (
                        <View style={styles.footer}>
                            <Text style={styles.footerText}>Don't have an account?</Text>
                            <TouchableOpacity onPress={() => navigation.navigate('SignUp')}>
                                <Text style={styles.footerLink}>Sign Up</Text>
                            </TouchableOpacity>
                        </View>
                    )}

                    <View style={styles.legalRow}>
                        <TouchableOpacity
                            onPress={() => Alert.alert('Privacy Policy', 'Privacy Policy will be available soon.')}
                            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        >
                            <Text style={styles.legalLink}>Privacy Policy</Text>
                        </TouchableOpacity>
                        <Text style={styles.legalSeparator}>•</Text>
                        <TouchableOpacity
                            onPress={() => Alert.alert('Terms of Service', 'Terms of Service will be available soon.')}
                            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        >
                            <Text style={styles.legalLink}>Terms of Service</Text>
                        </TouchableOpacity>
                    </View>

                    {/* Trust Indicators */}
                    <View style={styles.trustRow}>
                        <View style={styles.trustItem}>
                            <MaterialCommunityIcons name="shield-check-outline" size={20} color={theme.colors.success} />
                            <Text style={styles.trustText}>Secure</Text>
                        </View>
                        <View style={styles.trustDivider} />
                        <View style={styles.trustItem}>
                            <MaterialCommunityIcons name="lock-outline" size={20} color={theme.colors.primary} />
                            <Text style={styles.trustText}>Encrypted</Text>
                        </View>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

LoginScreen.propTypes = {
    navigation: PropTypes.object,
    onLogin: PropTypes.func,
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors.background,
    },
    scrollContent: {
        flexGrow: 1,
        justifyContent: 'center',
    },
    keyboardView: {
        flex: 1,
        width: '100%',
        maxWidth: 400,
        alignSelf: 'center',
        paddingHorizontal: 24,
        paddingVertical: 24,
    },
    // Header
    header: {
        alignItems: 'center',
        marginBottom: 32,
    },
    logoBox: {
        marginBottom: 16,
    },
    logoGradient: {
        width: 80,
        height: 80,
        borderRadius: 24,
        alignItems: 'center',
        justifyContent: 'center',
        ...theme.shadows.card,
    },
    appName: {
        fontSize: 32,
        fontWeight: 'bold',
        color: theme.colors.textPrimary,
        letterSpacing: -0.5,
    },
    tagline: {
        fontSize: 16,
        color: theme.colors.textSecondary,
        marginTop: 8,
    },
    // Card
    card: {
        backgroundColor: theme.colors.surface,
        borderRadius: 24,
        paddingHorizontal: 24,
        paddingVertical: 20,
        ...theme.shadows.card,
    },
    cardTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: theme.colors.textPrimary,
        textAlign: 'center',
    },
    cardSubtitle: {
        fontSize: 14,
        color: theme.colors.textSecondary,
        textAlign: 'center',
        marginTop: 4,
        marginBottom: 24,
    },
    // Inputs
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: theme.colors.surfaceAlt,
        borderRadius: 14,
        paddingHorizontal: 16,
        height: 56,
        marginBottom: 16,
        borderWidth: 1.5,
        borderColor: theme.colors.border,
    },
    inputFocused: {
        borderColor: theme.colors.primary,
        backgroundColor: theme.colors.surface,
    },
    input: {
        flex: 1,
        fontSize: 16,
        color: theme.colors.textPrimary,
        marginLeft: 12,
    },
    // Role Toggle
    roleToggleContainer: {
        flexDirection: 'row',
        backgroundColor: theme.colors.surfaceAlt,
        borderRadius: 16,
        padding: 4,
        marginBottom: 24,
        marginHorizontal: 24,
    },
    roleButton: {
        flex: 1,
        paddingVertical: 12,
        alignItems: 'center',
        borderRadius: 12,
    },
    roleButtonActive: {
        backgroundColor: 'white',
        ...theme.shadows.card,
    },
    roleButtonText: {
        fontSize: 14,
        fontWeight: '600',
        color: theme.colors.textSecondary,
    },
    roleButtonTextActive: {
        color: theme.colors.primary,
        fontWeight: '700',
    },
    // Sign In Button
    signInButton: {
        borderRadius: 14,
        overflow: 'hidden',
        marginTop: 8,
        ...theme.shadows.soft,
    },
    signInGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 16,
        gap: 8,
    },
    signInText: {
        fontSize: 16,
        fontWeight: '700',
        color: 'white',
    },
    // Footer
    footer: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 24,
        gap: 6,
    },
    footerText: {
        color: theme.colors.textSecondary,
        fontSize: 14,
    },
    footerLink: {
        color: theme.colors.primary,
        fontSize: 14,
        fontWeight: '700',
    },
    legalRow: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 12,
        gap: 8,
    },
    legalLink: {
        color: theme.colors.textSecondary,
        fontSize: 12,
        textDecorationLine: 'underline',
    },
    legalSeparator: {
        color: theme.colors.textTertiary,
        fontSize: 12,
    },
    // Trust Row
    trustRow: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 40,
    },
    trustItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    trustText: {
        fontSize: 12,
        color: theme.colors.textSecondary,
        fontWeight: '500',
    },
    trustDivider: {
        width: 1,
        height: 16,
        backgroundColor: theme.colors.border,
        marginHorizontal: 16,
    },
    // Biometric
    biometricSection: {
        marginTop: 16,
        alignItems: 'center',
    },
    biometricDivider: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
        width: '100%',
    },
    biometricDividerLine: {
        flex: 1,
        height: 1,
        backgroundColor: theme.colors.border,
    },
    biometricDividerText: {
        marginHorizontal: 12,
        fontSize: 13,
        color: theme.colors.textTertiary,
        fontWeight: '500',
    },
    biometricButton: {
        borderRadius: 14,
        overflow: 'hidden',
        width: '100%',
        ...theme.shadows.soft,
    },
    biometricGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 14,
        gap: 10,
    },
    biometricText: {
        fontSize: 15,
        fontWeight: '600',
        color: 'white',
    },
});
