import React, { useState } from 'react';
import PropTypes from 'prop-types';
import {
    View,
    Text,
    ScrollView,
    StyleSheet,
    TouchableOpacity,
    TextInput,
    Alert,
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
import LinearGradient from 'react-native-linear-gradient';
import { theme } from '../../components/Theme';
import { api } from '../../services/api';
import { validateEmail, validateName } from '../../utils/validationUtils';

const InputField = ({ label, value, onChangeText, placeholder, keyboardType, error, required, secureTextEntry }) => (
    <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>
            {label} {required && <Text style={styles.required}>*</Text>}
        </Text>
        <TextInput
            style={[styles.input, error && styles.inputError]}
            value={value}
            onChangeText={onChangeText}
            placeholder={placeholder}
            placeholderTextColor={theme.colors.textTertiary}
            keyboardType={keyboardType || 'default'}
            secureTextEntry={secureTextEntry}
            autoCapitalize={keyboardType === 'email-address' ? 'none' : 'words'}
        />
        {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
);

InputField.propTypes = {
    label: PropTypes.string.isRequired,
    value: PropTypes.string.isRequired,
    onChangeText: PropTypes.func.isRequired,
    placeholder: PropTypes.string,
    keyboardType: PropTypes.string,
    error: PropTypes.string,
    required: PropTypes.bool,
    secureTextEntry: PropTypes.bool,
};

// PAN Card format: AAAAA9999A (5 letters, 4 digits, 1 letter)
const PAN_REGEX = /^[A-Z]{5}\d{4}[A-Z]$/;
// Aadhar format: 12 digits (can have spaces)
const AADHAR_REGEX = /^\d{12}$/;
// IFSC Code format: First 4 chars are bank code (letters), 5th is 0, last 6 are branch code
const IFSC_REGEX = /^[A-Z]{4}0[A-Z0-9]{6}$/;
// Phone: 10 digits for Indian numbers
const PHONE_REGEX = /^[6-9]\d{9}$/;

const buildTemporaryPassword = () => {
    const randomChunk = Math.random().toString(36).slice(-6);
    return `Tmp#${Date.now().toString().slice(-4)}${randomChunk}A1`;
};

export default function AddInvestorScreen({ navigation, route }) {
    const [submitting, setSubmitting] = useState(false);

    const [formData, setFormData] = useState({
        name: '',
        email: '',
        phone: '',
        panCard: '',
        aadhar: '',
        address: '',
        bankName: '',
        accountNumber: '',
        ifscCode: '',
        initialInvestment: '',
        nomineeDetails: '',
    });

    const [errors, setErrors] = useState({});

    const validatePhone = (phone) => {
        const cleanPhone = phone.replaceAll(/[\s\-+]/g, '');
        const phoneDigits = cleanPhone.replace(/^91/, '');
        if (!phoneDigits) return 'Phone number is required';
        if (PHONE_REGEX.test(phoneDigits)) return null;
        if (phoneDigits.length !== 10) return 'Phone number must be 10 digits';
        if (/^[6-9]/.test(phoneDigits)) return 'Invalid phone number format';
        return 'Indian phone numbers must start with 6, 7, 8, or 9';
    };

    const validateOptionalField = (value, regex, errorMsg) => {
        const trimmed = value.trim();
        if (!trimmed) return null;
        const cleaned = trimmed.replaceAll(/\s/g, '');
        return regex.test(cleaned) ? null : errorMsg;
    };

    const validateInvestment = (value) => {
        if (!value.trim()) return null;
        const amount = Number.parseInt(value.replaceAll(',', ''), 10);
        if (Number.isNaN(amount) || amount < 0) return 'Please enter a valid amount';
        if (amount > 0 && amount < 1000) return 'Minimum investment is ₹1,000';
        return null;
    };

    const validateForm = () => {
        const newErrors = {};

        const nameValidation = validateName(formData.name);
        if (!nameValidation.isValid) newErrors.name = nameValidation.message;

        const emailValidation = validateEmail(formData.email);
        if (!emailValidation.isValid) newErrors.email = emailValidation.message;

        const phoneError = validatePhone(formData.phone);
        if (phoneError) newErrors.phone = phoneError;

        const cleanPan = formData.panCard.trim().toUpperCase();
        if (!cleanPan) {
            newErrors.panCard = 'PAN Card number is required';
        } else if (!PAN_REGEX.test(cleanPan)) {
            newErrors.panCard = 'Invalid PAN format (e.g., ABCDE1234F)';
        }

        const aadharError = validateOptionalField(formData.aadhar, AADHAR_REGEX, 'Aadhar must be 12 digits');
        if (aadharError) newErrors.aadhar = aadharError;

        const ifscError = validateOptionalField(formData.ifscCode, IFSC_REGEX, 'Invalid IFSC format (e.g., SBIN0001234)');
        if (ifscError) newErrors.ifscCode = ifscError;

        const accountError = validateOptionalField(formData.accountNumber, /^\d{9,18}$/, 'Account number must be 9-18 digits');
        if (accountError) newErrors.accountNumber = accountError;

        const investError = validateInvestment(formData.initialInvestment);
        if (investError) newErrors.initialInvestment = investError;

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async () => {
        if (!validateForm()) {
            Alert.alert('Validation Error', 'Please fix the errors before submitting');
            return;
        }

        const projectId = route?.params?.projectId;
        if (!projectId) {
            Alert.alert('Error', 'Project context is missing. Please navigate from a specific project.');
            return;
        }

        try {
            setSubmitting(true);

            // 1. Register the investor as a user first (if they don't exist)
            // For this P1 fix, we attempt registration. 
            // If they exist, we might get a 400 but we can proceed to add them to project if we have their ID.
            // In a mature app, we'd search for user first.
            let userId;
            try {
                const temporaryPassword = buildTemporaryPassword();
                const regResult = await api.register(formData.name, formData.email, temporaryPassword, 'investor');
                userId = regResult.user?.id || regResult.id || regResult._id;
            } catch (error_) {
                if (error_.response?.status === 400 || error_.response?.status === 409) {
                    const users = await api.getUsers();
                    const existing = (users || []).find(u =>
                        (u.email || '').toLowerCase() === formData.email.toLowerCase()
                    );
                    userId = existing?._id || existing?.id;
                    if (!userId) {
                        throw new Error('User already exists but could not resolve user ID.');
                    }
                } else {
                    throw error_;
                }
            }

            // 2. Invite to project
            // Note: We need a userId. If registration failed we might not have it.
            // This is a P1 limitation: assume new user or provide ID lookup in P2.
            const result = await api.inviteUserToProject(
                projectId,
                userId, // Need real ID here
                'passive' // Default role for added investors. Could be made configurable.
            );

            // In a fuller implementation, we might still want to pass the initialInvestment 
            // and nomineeDetails somewhere, but the inviteUserToProject endpoint doesn't currently accept them.

            if (result.success) {
                Alert.alert(
                    'Success',
                    'Investor registered and invited successfully!',
                    [{ text: 'OK', onPress: () => navigation.goBack() }]
                );
            }
        } catch (error) {
            const msg = error.response?.data?.message || error.message;
            Alert.alert('Error', 'Failed to invite investor: ' + msg);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color={theme.colors.textPrimary} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Add Investor</Text>
                <View style={{ width: 32 }} />
            </View>

            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={{ flex: 1 }}
            >
                <ScrollView showsVerticalScrollIndicator={false} style={styles.content}>
                    {/* Personal Info */}
                    <View style={styles.section}>
                        <View style={styles.sectionHeader}>
                            <Ionicons name="person-outline" size={20} color={theme.colors.primary} />
                            <Text style={styles.sectionTitle}>Personal Information</Text>
                        </View>

                        <InputField
                            label="Full Name"
                            value={formData.name}
                            onChangeText={(text) => setFormData({ ...formData, name: text })}
                            placeholder="Enter full name"
                            error={errors.name}
                            required
                        />

                        <InputField
                            label="Email Address"
                            value={formData.email}
                            onChangeText={(text) => setFormData({ ...formData, email: text })}
                            placeholder="investor@email.com"
                            keyboardType="email-address"
                            error={errors.email}
                            required
                        />

                        <InputField
                            label="Phone Number"
                            value={formData.phone}
                            onChangeText={(text) => setFormData({ ...formData, phone: text })}
                            placeholder="+91 98765 43210"
                            keyboardType="phone-pad"
                            error={errors.phone}
                            required
                        />

                        <InputField
                            label="Address"
                            value={formData.address}
                            onChangeText={(text) => setFormData({ ...formData, address: text })}
                            placeholder="Enter full address"
                        />
                    </View>

                    {/* KYC Details */}
                    <View style={styles.section}>
                        <View style={styles.sectionHeader}>
                            <Ionicons name="card-outline" size={20} color={theme.colors.primary} />
                            <Text style={styles.sectionTitle}>KYC Details</Text>
                        </View>

                        <InputField
                            label="PAN Card Number"
                            value={formData.panCard}
                            onChangeText={(text) => setFormData({ ...formData, panCard: text.toUpperCase() })}
                            placeholder="ABCDE1234F"
                            error={errors.panCard}
                            required
                        />

                        <InputField
                            label="Aadhar Number"
                            value={formData.aadhar}
                            onChangeText={(text) => setFormData({ ...formData, aadhar: text })}
                            placeholder="1234 5678 9012"
                            keyboardType="numeric"
                            error={errors.aadhar}
                        />

                        <View style={styles.infoBox}>
                            <Ionicons name="shield-checkmark" size={18} color={theme.colors.success} />
                            <Text style={styles.infoBoxText}>
                                KYC verification will be completed within 24-48 hours after document submission.
                            </Text>
                        </View>
                    </View>

                    {/* Bank Details */}
                    <View style={styles.section}>
                        <View style={styles.sectionHeader}>
                            <Ionicons name="wallet-outline" size={20} color={theme.colors.primary} />
                            <Text style={styles.sectionTitle}>Bank Details</Text>
                        </View>

                        <InputField
                            label="Bank Name"
                            value={formData.bankName}
                            onChangeText={(text) => setFormData({ ...formData, bankName: text })}
                            placeholder="Enter bank name"
                        />

                        <InputField
                            label="Account Number"
                            value={formData.accountNumber}
                            onChangeText={(text) => setFormData({ ...formData, accountNumber: text })}
                            placeholder="Enter account number"
                            keyboardType="numeric"
                            error={errors.accountNumber}
                        />

                        <InputField
                            label="IFSC Code"
                            value={formData.ifscCode}
                            onChangeText={(text) => setFormData({ ...formData, ifscCode: text.toUpperCase() })}
                            placeholder="SBIN0001234"
                            error={errors.ifscCode}
                        />
                    </View>

                    {/* Investment Details */}
                    <View style={styles.section}>
                        <View style={styles.sectionHeader}>
                            <Ionicons name="trending-up-outline" size={20} color={theme.colors.primary} />
                            <Text style={styles.sectionTitle}>Investment Details</Text>
                        </View>

                        <InputField
                            label="Initial Investment Amount (INR)"
                            value={formData.initialInvestment}
                            onChangeText={(text) => setFormData({ ...formData, initialInvestment: text })}
                            placeholder="e.g., 500000"
                            keyboardType="numeric"
                            error={errors.initialInvestment}
                        />

                        <InputField
                            label="Nominee Details"
                            value={formData.nomineeDetails}
                            onChangeText={(text) => setFormData({ ...formData, nomineeDetails: text })}
                            placeholder="Nominee name and relationship"
                        />
                    </View>

                    {/* Submit Button */}
                    <TouchableOpacity
                        style={styles.submitButton}
                        onPress={handleSubmit}
                        disabled={submitting}
                    >
                        <LinearGradient
                            colors={[theme.colors.primary, theme.colors.primaryDark]}
                            style={styles.submitGradient}
                        >
                            {submitting ? (
                                <ActivityIndicator color="white" />
                            ) : (
                                <>
                                    <Ionicons name="person-add" size={20} color="white" />
                                    <Text style={styles.submitText}>Add Investor</Text>
                                </>
                            )}
                        </LinearGradient>
                    </TouchableOpacity>

                    <View style={{ height: 40 }} />
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

AddInvestorScreen.propTypes = {
    navigation: PropTypes.shape({
        goBack: PropTypes.func.isRequired,
    }).isRequired,
    route: PropTypes.shape({
        params: PropTypes.shape({
            projectId: PropTypes.string,
        }),
    }),
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
    content: {
        flex: 1,
    },
    section: {
        backgroundColor: theme.colors.surface,
        marginTop: 16,
        marginHorizontal: 16,
        borderRadius: 16,
        padding: 20,
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: theme.colors.textPrimary,
        marginLeft: 10,
    },
    inputGroup: {
        marginBottom: 16,
    },
    inputLabel: {
        fontSize: 14,
        fontWeight: '500',
        color: theme.colors.textSecondary,
        marginBottom: 8,
    },
    required: {
        color: theme.colors.danger,
    },
    input: {
        backgroundColor: theme.colors.surfaceAlt,
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 14,
        fontSize: 16,
        color: theme.colors.textPrimary,
        borderWidth: 1,
        borderColor: theme.colors.border,
    },
    inputError: {
        borderColor: theme.colors.danger,
    },
    errorText: {
        fontSize: 12,
        color: theme.colors.danger,
        marginTop: 6,
    },
    infoBox: {
        flexDirection: 'row',
        backgroundColor: theme.colors.successLight,
        padding: 12,
        borderRadius: 10,
        alignItems: 'flex-start',
    },
    infoBoxText: {
        flex: 1,
        fontSize: 13,
        color: theme.colors.success,
        marginLeft: 10,
        lineHeight: 18,
    },
    submitButton: {
        marginHorizontal: 16,
        marginTop: 24,
        borderRadius: 12,
        overflow: 'hidden',
    },
    submitGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 16,
        gap: 8,
    },
    submitText: {
        fontSize: 16,
        fontWeight: '600',
        color: 'white',
    },
});
