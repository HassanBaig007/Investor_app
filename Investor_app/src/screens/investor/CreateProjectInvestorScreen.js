import React, { useState, useRef } from 'react';
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
    Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
import LinearGradient from 'react-native-linear-gradient';
import { theme } from '../../components/Theme';
import NotificationService from '../../services/notificationService';
import api from '../../services/api';

export default function CreateProjectInvestorScreen({ navigation }) {
    const [submitting, setSubmitting] = useState(false);
    const buttonScale = useRef(new Animated.Value(1)).current;

    const [formData, setFormData] = useState({
        name: '',
        type: 'real_estate',
        description: '',
        target: '',
        minInvestment: '',
        expectedReturn: '',
        duration: '',
        riskLevel: 'medium',
    });

    const projectTypes = [
        { id: 'real_estate', label: 'Real Estate', icon: 'business' },
        { id: 'venture_capital', label: 'Venture Capital', icon: 'rocket' },
        { id: 'fixed_income', label: 'Fixed Income', icon: 'trending-up' },
        { id: 'private_equity', label: 'Private Equity', icon: 'briefcase' },
    ];

    const riskLevels = [
        { id: 'low', label: 'Low', color: '#10B981' },
        { id: 'medium', label: 'Medium', color: '#F59E0B' },
        { id: 'high', label: 'High', color: '#EF4444' },
    ];

    const animateButton = () => {
        Animated.sequence([
            Animated.timing(buttonScale, { toValue: 0.95, duration: 100, useNativeDriver: true }),
            Animated.timing(buttonScale, { toValue: 1, duration: 100, useNativeDriver: true }),
        ]).start();
    };

    const handleSubmit = async () => {
        if (!formData.name.trim()) {
            Alert.alert('Validation Error', 'Please enter a project name');
            return;
        }
        if (!formData.target.trim()) {
            Alert.alert('Validation Error', 'Please enter a target amount');
            return;
        }

        animateButton();

        try {
            setSubmitting(true);
            // REAL API CALL
            const projectData = {
                name: formData.name.trim(),
                type: formData.type,
                description: formData.description.trim(),
                targetAmount: Number.parseFloat(formData.target),
                minInvestment: Number.parseFloat(formData.minInvestment) || 100000,
                riskLevel: formData.riskLevel,
                returnRate: formData.expectedReturn || '15',
                duration: formData.duration || '24',
            };

            const response = await api.createProject(projectData);

            // Send push notification
            NotificationService.sendLocalNotification(
                '🎉 Project Created!',
                `"${formData.name}" has been created. You are now the admin.`,
                { type: 'project_created', projectId: response._id || response.id }
            );

            Alert.alert(
                '🎉 Project Created!',
                `Congratulations! You are now the Project Admin for "${formData.name}".\n\nYou can now add members and track spendings.`,
                [
                    {
                        text: 'View Project',
                        onPress: () => {
                            navigation.replace('ProjectDetail', { projectId: response._id || response.id });
                        }
                    },
                    {
                        text: 'Back to Dashboard',
                        style: 'cancel',
                        onPress: () => navigation.goBack()
                    }
                ]
            );
        } catch (error) {
            console.error('Create project failed:', error);
            Alert.alert('Error', 'Failed to create project. Please try again.');
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
                <Text style={styles.headerTitle}>Create Project</Text>
                <View style={{ width: 32 }} />
            </View>

            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={{ flex: 1 }}
            >
                <ScrollView showsVerticalScrollIndicator={false} style={styles.content}>
                    {/* Info Banner */}
                    <View style={styles.infoBanner}>
                        <LinearGradient
                            colors={['#F59E0B', '#D97706']}
                            style={styles.infoIcon}
                        >
                            <Ionicons name="shield-checkmark" size={20} color="white" />
                        </LinearGradient>
                        <View style={styles.infoContent}>
                            <Text style={styles.infoTitle}>Become a Project Admin</Text>
                            <Text style={styles.infoDescription}>
                                As the creator, you'll have admin privileges to add investors and manage approvals.
                            </Text>
                        </View>
                    </View>

                    {/* Basic Info */}
                    {/* Basic Info */}
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Basic Information</Text>

                        <View style={styles.inputGroup}>
                            <Text style={styles.inputLabel}>
                                Project Name <Text style={styles.required}>*</Text>
                            </Text>
                            <TextInput
                                style={styles.input}
                                value={formData.name}
                                onChangeText={(text) => setFormData({ ...formData, name: text })}
                                placeholder="Enter project name"
                                placeholderTextColor={theme.colors.textTertiary}
                            />
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.inputLabel}>Project Type</Text>
                            <View style={styles.typeGrid}>
                                {projectTypes.map((type) => (
                                    <TouchableOpacity
                                        key={type.id}
                                        style={[
                                            styles.typeButton,
                                            formData.type === type.id && styles.typeButtonActive
                                        ]}
                                        onPress={() => setFormData({ ...formData, type: type.id })}
                                    >
                                        <Ionicons
                                            name={type.icon}
                                            size={20}
                                            color={formData.type === type.id ? theme.colors.primary : theme.colors.textSecondary}
                                        />
                                        <Text style={[
                                            styles.typeButtonText,
                                            formData.type === type.id && styles.typeButtonTextActive
                                        ]}>
                                            {type.label}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.inputLabel}>Description</Text>
                            <TextInput
                                style={[styles.input, styles.inputMultiline]}
                                value={formData.description}
                                onChangeText={(text) => setFormData({ ...formData, description: text })}
                                placeholder="Describe your project..."
                                placeholderTextColor={theme.colors.textTertiary}
                                multiline
                                numberOfLines={4}
                            />
                        </View>
                    </View>

                    {/* Financial Details */}
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Financial Details</Text>

                        <View style={styles.inputGroup}>
                            <Text style={styles.inputLabel}>
                                Target Amount (₹) <Text style={styles.required}>*</Text>
                            </Text>
                            <TextInput
                                style={styles.input}
                                value={formData.target}
                                onChangeText={(text) => setFormData({ ...formData, target: text })}
                                placeholder="e.g., 10000000"
                                placeholderTextColor={theme.colors.textTertiary}
                                keyboardType="numeric"
                            />
                        </View>

                        <View style={styles.inputRow}>
                            <View style={[styles.inputGroup, { flex: 1, marginRight: 10 }]}>
                                <Text style={styles.inputLabel}>Min Investment (₹)</Text>
                                <TextInput
                                    style={styles.input}
                                    value={formData.minInvestment}
                                    onChangeText={(text) => setFormData({ ...formData, minInvestment: text })}
                                    placeholder="100000"
                                    placeholderTextColor={theme.colors.textTertiary}
                                    keyboardType="numeric"
                                />
                            </View>
                            <View style={[styles.inputGroup, { flex: 1 }]}>
                                <Text style={styles.inputLabel}>Expected Return (%)</Text>
                                <TextInput
                                    style={styles.input}
                                    value={formData.expectedReturn}
                                    onChangeText={(text) => setFormData({ ...formData, expectedReturn: text })}
                                    placeholder="15"
                                    placeholderTextColor={theme.colors.textTertiary}
                                    keyboardType="numeric"
                                />
                            </View>
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.inputLabel}>Duration (months)</Text>
                            <TextInput
                                style={styles.input}
                                value={formData.duration}
                                onChangeText={(text) => setFormData({ ...formData, duration: text })}
                                placeholder="e.g., 24"
                                placeholderTextColor={theme.colors.textTertiary}
                                keyboardType="numeric"
                            />
                        </View>
                    </View>

                    {/* Risk Level */}
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Risk Assessment</Text>

                        <View style={styles.inputGroup}>
                            <Text style={styles.inputLabel}>Risk Level</Text>
                            <View style={styles.riskButtons}>
                                {riskLevels.map((level) => (
                                    <TouchableOpacity
                                        key={level.id}
                                        style={[
                                            styles.riskButton,
                                            formData.riskLevel === level.id && {
                                                backgroundColor: level.color + '15',
                                                borderColor: level.color,
                                            },
                                        ]}
                                        onPress={() => setFormData({ ...formData, riskLevel: level.id })}
                                    >
                                        <View style={[styles.riskDot, { backgroundColor: level.color }]} />
                                        <Text
                                            style={[
                                                styles.riskButtonText,
                                                formData.riskLevel === level.id && { color: level.color, fontWeight: '600' },
                                            ]}
                                        >
                                            {level.label}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </View>
                    </View>

                    {/* Privilege Chain Info */}
                    <View style={styles.privilegeInfo}>
                        <Ionicons name="information-circle" size={20} color={theme.colors.primary} />
                        <Text style={styles.privilegeText}>
                            All project modifications will require approval from all investors before execution
                        </Text>
                    </View>

                    {/* Submit Button */}
                    <Animated.View style={{ transform: [{ scale: buttonScale }] }}>
                        <TouchableOpacity
                            style={styles.submitButton}
                            onPress={handleSubmit}
                            disabled={submitting}
                            activeOpacity={0.8}
                        >
                            <LinearGradient
                                colors={submitting ? ['#9CA3AF', '#6B7280'] : ['#10B981', '#059669']}
                                style={styles.submitGradient}
                            >
                                {submitting ? (
                                    <>
                                        <ActivityIndicator color="white" size="small" />
                                        <Text style={styles.submitText}>Creating...</Text>
                                    </>
                                ) : (
                                    <>
                                        <Ionicons name="rocket" size={20} color="white" />
                                        <Text style={styles.submitText}>Create Project</Text>
                                    </>
                                )}
                            </LinearGradient>
                        </TouchableOpacity>
                    </Animated.View>

                    <View style={{ height: 40 }} />
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

CreateProjectInvestorScreen.propTypes = {
    navigation: PropTypes.shape({
        goBack: PropTypes.func.isRequired,
        replace: PropTypes.func.isRequired,
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
    infoBanner: {
        flexDirection: 'row',
        backgroundColor: theme.colors.warningLight,
        marginHorizontal: 16,
        marginTop: 16,
        padding: 16,
        borderRadius: 16,
        alignItems: 'center',
    },
    infoIcon: {
        width: 44,
        height: 44,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 14,
    },
    infoContent: {
        flex: 1,
    },
    infoTitle: {
        fontSize: 15,
        fontWeight: '600',
        color: theme.colors.warning,
        marginBottom: 4,
    },
    infoDescription: {
        fontSize: 13,
        color: theme.colors.textSecondary,
        lineHeight: 18,
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
    sectionTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: theme.colors.textPrimary,
        marginBottom: 16,
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
    inputMultiline: {
        minHeight: 100,
        textAlignVertical: 'top',
    },
    inputRow: {
        flexDirection: 'row',
    },
    typeGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
    },
    typeButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderRadius: 12,
        backgroundColor: theme.colors.surfaceAlt,
        borderWidth: 1,
        borderColor: theme.colors.border,
        gap: 8,
    },
    typeButtonActive: {
        backgroundColor: theme.colors.primaryLight,
        borderColor: theme.colors.primary,
    },
    typeButtonText: {
        fontSize: 13,
        color: theme.colors.textSecondary,
    },
    typeButtonTextActive: {
        color: theme.colors.primary,
        fontWeight: '600',
    },
    riskButtons: {
        flexDirection: 'row',
        gap: 10,
    },
    riskButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: theme.colors.border,
        backgroundColor: theme.colors.surfaceAlt,
        gap: 6,
    },
    riskDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
    },
    riskButtonText: {
        fontSize: 13,
        color: theme.colors.textSecondary,
    },
    privilegeInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: theme.colors.primaryLight,
        marginHorizontal: 16,
        marginTop: 16,
        padding: 14,
        borderRadius: 12,
        gap: 10,
    },
    privilegeText: {
        flex: 1,
        fontSize: 13,
        color: theme.colors.primary,
        lineHeight: 18,
    },
    submitButton: {
        marginHorizontal: 16,
        marginTop: 24,
        borderRadius: 14,
        overflow: 'hidden',
    },
    submitGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 16,
        gap: 10,
    },
    submitText: {
        fontSize: 16,
        fontWeight: '600',
        color: 'white',
    },
});
