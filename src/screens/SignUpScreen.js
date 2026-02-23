import React, { useMemo, useState } from 'react';
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
    ScrollView,

} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import LinearGradient from 'react-native-linear-gradient';
import { theme } from '../components/Theme';
import api from '../services/api';
import {
    validatePassword,
    validateEmail,
    validateName,
    validateSignupForm,
    getPasswordStrengthColor,
    getPasswordStrengthLabel
} from '../utils/validationUtils';

const getInputIconColor = (hasError, isFocused) => {
    if (hasError) return '#EF4444';
    if (isFocused) return theme.colors.primary;
    return theme.colors.textTertiary;
};

const getStrengthWidth = (strength) => {
    if (strength === 'strong') return '100%';
    if (strength === 'medium') return '60%';
    return '30%';
};

const RequirementItem = ({ met, label }) => (
    <View style={styles.requirementItem}>
        <MaterialCommunityIcons
            name={met ? 'check-circle' : 'circle-outline'}
            size={16}
            color={met ? '#10B981' : theme.colors.textTertiary}
        />
        <Text style={[styles.requirementText, met && styles.requirementMet]}>
            {label}
        </Text>
    </View>
);

RequirementItem.propTypes = {
    met: PropTypes.bool,
    label: PropTypes.string.isRequired,
};

const PasswordRequirements = ({ password, passwordValidation }) => {
    if (!password) return null;

    const requirements = passwordValidation.requirements || {};

    return (
        <View style={styles.requirementsContainer}>
            <Text style={styles.requirementsTitle}>Password Requirements:</Text>
            <View style={styles.requirementsGrid}>
                <RequirementItem met={requirements.minLength} label="10+ characters" />
                <RequirementItem met={requirements.hasUppercase} label="Uppercase (A-Z)" />
                <RequirementItem met={requirements.hasLowercase} label="Lowercase (a-z)" />
                <RequirementItem met={requirements.hasNumber} label="Number (0-9)" />
                <RequirementItem met={requirements.hasSpecial} label="Special char" />
                <RequirementItem met={requirements.noSpaces} label="No spaces" />
                <RequirementItem met={requirements.notCommon} label="Not common" />
                <RequirementItem met={requirements.noSequential} label="No sequences" />
                <RequirementItem met={requirements.noRepeating} label="No repeating" />
                <RequirementItem met={requirements.noPersonalInfo} label="No personal info" />
            </View>
        </View>
    );
};

PasswordRequirements.propTypes = {
    password: PropTypes.string.isRequired,
    passwordValidation: PropTypes.shape({
        requirements: PropTypes.object,
    }).isRequired,
};

export default function SignUpScreen({ navigation, onLogin }) { // NOSONAR

    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [focusedField, setFocusedField] = useState(null);
    const [errors, setErrors] = useState({});
    const [touched, setTouched] = useState({});

    // Real-time validation
    const passwordValidation = useMemo(() =>
        validatePassword(password, email, name),
        [password, email, name]
    );

    const emailValidation = useMemo(() =>
        validateEmail(email),
        [email]
    );

    const nameValidation = useMemo(() =>
        validateName(name),
        [name]
    );


    const handleRegister = () => {
        // Mark all fields as touched
        setTouched({ name: true, email: true, password: true, confirmPassword: true });

        // Validate form
        const validation = validateSignupForm({ name, email, password, confirmPassword });

        if (!validation.isValid) {
            setErrors(validation.errors);
            // Show first error as alert
            const firstError = Object.values(validation.errors)[0];
            Alert.alert('Validation Error', firstError);
            return;
        }

        setErrors({});
        // REAL API CALL
        const attemptRegister = async () => {
            try {
                await api.register(name, email, password, 'investor');
                setIsLoading(false);

                Alert.alert(
                    'Account Created!',
                    `Welcome to SplitFlow, ${name.split(' ')[0]}! Please login to continue.`,
                    [
                        {
                            text: "Login",
                            onPress: () => navigation.navigate('Login')
                        }
                    ]
                );
            } catch (err) {
                setIsLoading(false);
                const msg = err.response?.data?.message || 'Registration failed. Please try again.';
                Alert.alert('Registration Error', msg);
            }
        };

        attemptRegister();
    };

    const handleBlur = (field) => {
        setFocusedField(null);
        setTouched(prev => ({ ...prev, [field]: true }));
    };

    return (
        <SafeAreaView style={styles.container}>
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.keyboardView}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 20 : 0}
            >
                <ScrollView
                    contentContainerStyle={styles.scrollContent}
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={false}
                >
                    {/* Header */}
                    <View style={styles.header}>
                        <TouchableOpacity
                            onPress={() => navigation.goBack()}
                            style={styles.backButton}
                        >
                            <MaterialCommunityIcons name="arrow-left" size={24} color={theme.colors.textPrimary} />
                        </TouchableOpacity>
                    </View>

                    <View style={styles.titleSection}>
                        <Text style={styles.title}>Create Account</Text>
                        <Text style={styles.subtitle}>Join SplitFlow to manage project expenses</Text>
                    </View>

                    {/* Form Card */}
                    <View style={styles.card}>
                        {/* Name Input */}
                        <Text style={styles.inputLabel}>Full Name <Text style={styles.required}>*</Text></Text>
                        <View style={[
                            styles.inputContainer,
                            focusedField === 'name' && styles.inputFocused,
                            touched.name && !nameValidation.isValid && styles.inputError
                        ]}>
                            <MaterialCommunityIcons
                                name="account-outline"
                                size={22}
                                color={getInputIconColor(touched.name && !nameValidation.isValid, focusedField === 'name')}
                            />
                            <TextInput
                                style={styles.input}
                                placeholder="First Last (e.g., John Doe)"
                                placeholderTextColor={theme.colors.textTertiary}
                                value={name}
                                onChangeText={(text) => {
                                    setName(text);
                                    if (errors.name) setErrors({ ...errors, name: null });
                                }}
                                autoCapitalize="words"
                                autoComplete="off"
                                autoCorrect={false}
                                textContentType="none"
                                onFocus={() => setFocusedField('name')}
                                onBlur={() => handleBlur('name')}
                            />
                            {touched.name && nameValidation.isValid && (
                                <MaterialCommunityIcons name="check-circle" size={20} color="#10B981" />
                            )}
                        </View>
                        {touched.name && !nameValidation.isValid && (
                            <Text style={styles.errorText}>{nameValidation.message}</Text>
                        )}

                        {/* Email Input */}
                        <Text style={styles.inputLabel}>Email Address <Text style={styles.required}>*</Text></Text>
                        <View style={[
                            styles.inputContainer,
                            focusedField === 'email' && styles.inputFocused,
                            touched.email && !emailValidation.isValid && styles.inputError
                        ]}>
                            <MaterialCommunityIcons
                                name="email-outline"
                                size={22}
                                color={getInputIconColor(touched.email && !emailValidation.isValid, focusedField === 'email')}
                            />
                            <TextInput
                                style={styles.input}
                                placeholder="name@company.com"
                                placeholderTextColor={theme.colors.textTertiary}
                                value={email}
                                onChangeText={(text) => {
                                    setEmail(text.toLowerCase());
                                    if (errors.email) setErrors({ ...errors, email: null });
                                }}
                                keyboardType="email-address"
                                autoCapitalize="none"
                                autoCorrect={false}
                                autoComplete="off"
                                textContentType="none"
                                onFocus={() => setFocusedField('email')}
                                onBlur={() => handleBlur('email')}
                            />
                            {touched.email && emailValidation.isValid && (
                                <MaterialCommunityIcons name="check-circle" size={20} color="#10B981" />
                            )}
                        </View>
                        {touched.email && !emailValidation.isValid && (
                            <Text style={styles.errorText}>{emailValidation.message}</Text>
                        )}

                        {/* Password Input */}
                        <Text style={styles.inputLabel}>Password <Text style={styles.required}>*</Text></Text>
                        <View style={[
                            styles.inputContainer,
                            focusedField === 'password' && styles.inputFocused,
                            touched.password && !passwordValidation.isValid && styles.inputError
                        ]}>
                            <MaterialCommunityIcons
                                name="lock-outline"
                                size={22}
                                color={getInputIconColor(touched.password && !passwordValidation.isValid, focusedField === 'password')}
                            />
                            <TextInput
                                style={styles.input}
                                placeholder="Create a strong password"
                                placeholderTextColor={theme.colors.textTertiary}
                                value={password}
                                onChangeText={(text) => {
                                    setPassword(text);
                                    if (errors.password) setErrors({ ...errors, password: null });
                                }}
                                secureTextEntry={!showPassword}
                                // COMPLETELY BLOCK ALL AUTO-SUGGESTIONS & PASSWORD MANAGERS
                                autoComplete="off"
                                autoCorrect={false}
                                autoCapitalize="none"
                                textContentType="oneTimeCode"
                                passwordRules=""
                                importantForAutofill="no"
                                spellCheck={false}
                                dataDetectorTypes="none"
                                keyboardType="default"
                                selectTextOnFocus={false}
                                contextMenuHidden={true}
                                onFocus={() => setFocusedField('password')}
                                onBlur={() => handleBlur('password')}
                            />
                            <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                                <MaterialCommunityIcons
                                    name={showPassword ? "eye-off-outline" : "eye-outline"}
                                    size={22}
                                    color={theme.colors.textTertiary}
                                />
                            </TouchableOpacity>
                        </View>

                        {/* Password Strength Indicator */}
                        {password.length > 0 && (
                            <View style={styles.strengthContainer}>
                                <View style={styles.strengthBar}>
                                    <View style={[
                                        styles.strengthFill,
                                        {
                                            width: getStrengthWidth(passwordValidation.strength),
                                            backgroundColor: getPasswordStrengthColor(passwordValidation.strength)
                                        }
                                    ]} />
                                </View>
                                <Text style={[styles.strengthText, { color: getPasswordStrengthColor(passwordValidation.strength) }]}>
                                    {getPasswordStrengthLabel(passwordValidation.strength)}
                                </Text>
                            </View>
                        )}

                        {/* Password Requirements Checklist */}
                        <PasswordRequirements password={password} passwordValidation={passwordValidation} />

                        {/* Confirm Password Input */}
                        <Text style={styles.inputLabel}>Confirm Password <Text style={styles.required}>*</Text></Text>
                        <View style={[
                            styles.inputContainer,
                            focusedField === 'confirm' && styles.inputFocused,
                            touched.confirmPassword && password !== confirmPassword && styles.inputError
                        ]}>
                            <MaterialCommunityIcons
                                name="lock-check-outline"
                                size={22}
                                color={getInputIconColor(touched.confirmPassword && password !== confirmPassword, focusedField === 'confirm')}
                            />
                            <TextInput
                                style={styles.input}
                                placeholder="Re-enter your password"
                                placeholderTextColor={theme.colors.textTertiary}
                                value={confirmPassword}
                                onChangeText={(text) => {
                                    setConfirmPassword(text);
                                    if (errors.confirmPassword) setErrors({ ...errors, confirmPassword: null });
                                }}
                                secureTextEntry={!showConfirmPassword}
                                // DISABLE all auto-suggestions
                                autoComplete="off"
                                autoCorrect={false}
                                autoCapitalize="none"
                                textContentType="none"
                                passwordRules=""
                                importantForAutofill="no"
                                onFocus={() => setFocusedField('confirm')}
                                onBlur={() => handleBlur('confirmPassword')}
                            />
                            <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)}>
                                <MaterialCommunityIcons
                                    name={showConfirmPassword ? "eye-off-outline" : "eye-outline"}
                                    size={22}
                                    color={theme.colors.textTertiary}
                                />
                            </TouchableOpacity>
                        </View>
                        {touched.confirmPassword && confirmPassword && password !== confirmPassword && (
                            <Text style={styles.errorText}>Passwords do not match</Text>
                        )}
                        {confirmPassword.length > 0 && password === confirmPassword && (
                            <View style={styles.matchBadge}>
                                <MaterialCommunityIcons name="check-circle" size={16} color="#10B981" />
                                <Text style={styles.matchText}>Passwords match</Text>
                            </View>
                        )}

                        {/* Sign Up Button */}
                        <TouchableOpacity
                            style={[styles.signUpButton, (!passwordValidation.isValid || !emailValidation.isValid || !nameValidation.isValid || password !== confirmPassword) && styles.signUpButtonDisabled]}
                            onPress={handleRegister}
                            disabled={isLoading}
                            activeOpacity={0.8}
                        >
                            <LinearGradient
                                colors={(!passwordValidation.isValid || !emailValidation.isValid || !nameValidation.isValid || password !== confirmPassword)
                                    ? ['#9CA3AF', '#6B7280']
                                    : ['#6366F1', '#4F46E5']}
                                style={styles.signUpGradient}
                            >
                                {isLoading ? (
                                    <Text style={styles.signUpText}>Creating Account...</Text>
                                ) : (
                                    <>
                                        <Text style={styles.signUpText}>Create Account</Text>
                                        <MaterialCommunityIcons name="arrow-right" size={20} color="white" />
                                    </>
                                )}
                            </LinearGradient>
                        </TouchableOpacity>
                    </View>

                    {/* Footer */}
                    <View style={styles.footer}>
                        <Text style={styles.footerText}>Already have an account?</Text>
                        <TouchableOpacity onPress={() => navigation.navigate('Login')}>
                            <Text style={styles.footerLink}>Sign In</Text>
                        </TouchableOpacity>
                    </View>

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
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

SignUpScreen.propTypes = {
    navigation: PropTypes.object.isRequired,
    onLogin: PropTypes.func,
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors.background,
    },
    scrollContent: {
        flexGrow: 1,
        padding: 24,
        paddingBottom: 40,
    },
    keyboardView: {
        flex: 1,
    },
    header: {
        marginBottom: 20,
        alignItems: 'flex-start',
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: theme.colors.surface,
        justifyContent: 'center',
        alignItems: 'center',
        ...theme.shadows.soft,
    },
    titleSection: {
        marginBottom: 24,
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        color: theme.colors.textPrimary,
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 15,
        color: theme.colors.textSecondary,
    },
    card: {
        backgroundColor: theme.colors.surface,
        borderRadius: 20,
        padding: 20,
        ...theme.shadows.card,
    },
    inputLabel: {
        fontSize: 13,
        fontWeight: '600',
        color: theme.colors.textSecondary,
        marginBottom: 8,
        marginTop: 16,
    },
    required: {
        color: '#EF4444',
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: theme.colors.surfaceAlt,
        borderRadius: 12,
        paddingHorizontal: 14,
        height: 52,
        borderWidth: 1.5,
        borderColor: theme.colors.border,
    },
    inputFocused: {
        borderColor: theme.colors.primary,
        backgroundColor: theme.colors.surface,
    },
    inputError: {
        borderColor: '#EF4444',
        backgroundColor: '#FEF2F2',
    },
    input: {
        flex: 1,
        marginLeft: 10,
        fontSize: 15,
        color: theme.colors.textPrimary,
    },
    errorText: {
        color: '#EF4444',
        fontSize: 12,
        marginTop: 6,
        marginLeft: 2,
    },
    strengthContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 10,
        gap: 10,
    },
    strengthBar: {
        flex: 1,
        height: 6,
        backgroundColor: theme.colors.border,
        borderRadius: 3,
        overflow: 'hidden',
    },
    strengthFill: {
        height: '100%',
        borderRadius: 3,
    },
    strengthText: {
        fontSize: 12,
        fontWeight: '600',
        minWidth: 100,
    },
    // Requirements
    requirementsContainer: {
        backgroundColor: theme.colors.surfaceAlt,
        borderRadius: 12,
        padding: 14,
        marginTop: 12,
    },
    requirementsTitle: {
        fontSize: 12,
        fontWeight: '600',
        color: theme.colors.textSecondary,
        marginBottom: 10,
    },
    requirementsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    requirementItem: {
        flexDirection: 'row',
        alignItems: 'center',
        width: '48%',
        gap: 6,
    },
    requirementText: {
        fontSize: 11,
        color: theme.colors.textTertiary,
    },
    requirementMet: {
        color: '#10B981',
    },
    matchBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginTop: 8,
    },
    matchText: {
        color: '#10B981',
        fontSize: 12,
        fontWeight: '500',
    },
    signUpButton: {
        borderRadius: 12,
        overflow: 'hidden',
        marginTop: 24,
        ...theme.shadows.soft,
    },
    signUpButtonDisabled: {
        opacity: 0.7,
    },
    signUpGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 16,
        gap: 8,
    },
    signUpText: {
        fontSize: 16,
        fontWeight: '700',
        color: 'white',
    },
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
});
