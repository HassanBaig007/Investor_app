import React, { useState, useEffect } from 'react';
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

const InputField = ({ label, value, onChangeText, placeholder, keyboardType, multiline, required }) => (
    <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>
            {label} {required && <Text style={styles.required}>*</Text>}
        </Text>
        <TextInput
            style={[styles.input, multiline && styles.inputMultiline]}
            value={value}
            onChangeText={onChangeText}
            placeholder={placeholder}
            placeholderTextColor={theme.colors.textTertiary}
            keyboardType={keyboardType || 'default'}
            multiline={multiline}
            numberOfLines={multiline ? 4 : 1}
        />
    </View>
);

InputField.propTypes = {
    label: PropTypes.string.isRequired,
    value: PropTypes.string.isRequired,
    onChangeText: PropTypes.func.isRequired,
    placeholder: PropTypes.string,
    keyboardType: PropTypes.string,
    multiline: PropTypes.bool,
    required: PropTypes.bool,
};

const SelectButton = ({ label, selected, onPress }) => (
    <TouchableOpacity
        style={[styles.selectButton, selected && styles.selectButtonActive]}
        onPress={onPress}
    >
        <Text style={[styles.selectButtonText, selected && styles.selectButtonTextActive]}>
            {label}
        </Text>
    </TouchableOpacity>
);

SelectButton.propTypes = {
    label: PropTypes.string.isRequired,
    selected: PropTypes.bool.isRequired,
    onPress: PropTypes.func.isRequired,
};

export default function CreateProjectScreen({ navigation }) {
    const [projectTypes, setProjectTypes] = useState([]);
    const [riskLevels, setRiskLevels] = useState([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);

    const [formData, setFormData] = useState({
        name: '',
        type: '',
        description: '',
        target: '',
        minInvestment: '',
        expectedReturn: '',
        duration: '',
        riskLevel: '',
        phase: 'Planning',
    });

    useEffect(() => {
        loadFormData();
    }, []);

    const loadFormData = async () => {
        try {
            const [types, risks] = await Promise.all([
                api.getProjectTypes(),
                api.getRiskLevels(),
            ]);
            setProjectTypes(types);
            setRiskLevels(risks);
        } catch (error) {
            console.error('Failed to load project form metadata:', error);
            Alert.alert('Error', 'Failed to load form data');
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async () => {
        // Validation
        if (!formData.name || !formData.type || !formData.target || !formData.riskLevel) {
            Alert.alert('Validation Error', 'Please fill in all required fields');
            return;
        }

        try {
            setSubmitting(true);
            await api.createProject({
                name: formData.name,
                type: formData.type,
                description: formData.description,
                targetAmount: Number.parseInt(formData.target, 10),
                minInvestment: Number.parseInt(formData.minInvestment, 10) || 100000,
                riskLevel: formData.riskLevel,
                returnRate: formData.expectedReturn,
                duration: formData.duration,
            });
            Alert.alert(
                'Success',
                'Project created successfully!',
                [{ text: 'OK', onPress: () => navigation.goBack() }]
            );
        } catch (error) {
            console.error('Create project failed:', error);
            Alert.alert('Error', 'Failed to create project');
        } finally {
            setSubmitting(false);
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
                <Text style={styles.headerTitle}>Create Project</Text>
                <View style={{ width: 32 }} />
            </View>

            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={{ flex: 1 }}
            >
                <ScrollView showsVerticalScrollIndicator={false} style={styles.content}>
                    {/* Basic Info */}
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Basic Information</Text>

                        <InputField
                            label="Project Name"
                            value={formData.name}
                            onChangeText={(text) => setFormData({ ...formData, name: text })}
                            placeholder="Enter project name"
                            required
                        />

                        <View style={styles.inputGroup}>
                            <Text style={styles.inputLabel}>
                                Project Type <Text style={styles.required}>*</Text>
                            </Text>
                            <View style={styles.selectGrid}>
                                {projectTypes.map((type) => (
                                    <SelectButton
                                        key={type.id}
                                        label={type.label}
                                        selected={formData.type === type.id}
                                        onPress={() => setFormData({ ...formData, type: type.id })}
                                    />
                                ))}
                            </View>
                        </View>

                        <InputField
                            label="Description"
                            value={formData.description}
                            onChangeText={(text) => setFormData({ ...formData, description: text })}
                            placeholder="Describe the project..."
                            multiline
                        />
                    </View>

                    {/* Financial Details */}
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Financial Details</Text>

                        <InputField
                            label="Target Amount (₹)"
                            value={formData.target}
                            onChangeText={(text) => setFormData({ ...formData, target: text })}
                            placeholder="e.g., 10000000"
                            keyboardType="numeric"
                            required
                        />

                        <InputField
                            label="Minimum Investment (₹)"
                            value={formData.minInvestment}
                            onChangeText={(text) => setFormData({ ...formData, minInvestment: text })}
                            placeholder="e.g., 100000"
                            keyboardType="numeric"
                        />

                        <InputField
                            label="Expected Return (%)"
                            value={formData.expectedReturn}
                            onChangeText={(text) => setFormData({ ...formData, expectedReturn: text })}
                            placeholder="e.g., 15"
                            keyboardType="numeric"
                        />

                        <InputField
                            label="Duration (months)"
                            value={formData.duration}
                            onChangeText={(text) => setFormData({ ...formData, duration: text })}
                            placeholder="e.g., 24"
                            keyboardType="numeric"
                        />
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
                                                backgroundColor: level.color + '20',
                                                borderColor: level.color,
                                            },
                                        ]}
                                        onPress={() => setFormData({ ...formData, riskLevel: level.id })}
                                    >
                                        <View style={[styles.riskDot, { backgroundColor: level.color }]} />
                                        <Text
                                            style={[
                                                styles.riskButtonText,
                                                formData.riskLevel === level.id && { color: level.color },
                                            ]}
                                        >
                                            {level.label}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </View>
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
                                    <Ionicons name="add-circle" size={20} color="white" />
                                    <Text style={styles.submitText}>Create Project</Text>
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

CreateProjectScreen.propTypes = {
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
    selectGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
    },
    selectButton: {
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 20,
        backgroundColor: theme.colors.surfaceAlt,
        borderWidth: 1,
        borderColor: theme.colors.border,
    },
    selectButtonActive: {
        backgroundColor: theme.colors.primaryLight,
        borderColor: theme.colors.primary,
    },
    selectButtonText: {
        fontSize: 14,
        color: theme.colors.textSecondary,
    },
    selectButtonTextActive: {
        color: theme.colors.primary,
        fontWeight: '600',
    },
    riskButtons: {
        flexDirection: 'row',
        gap: 8,
    },
    riskButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        paddingHorizontal: 8,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: theme.colors.border,
        backgroundColor: theme.colors.surfaceAlt,
        minWidth: 0,
    },
    riskDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        marginRight: 6,
    },
    riskButtonText: {
        fontSize: 12,
        fontWeight: '500',
        color: theme.colors.textSecondary,
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
