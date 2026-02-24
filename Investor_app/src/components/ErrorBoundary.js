import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import PropTypes from 'prop-types';

class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static propTypes = {
        children: PropTypes.node.isRequired,
    };

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        // You can also log the error to an error reporting service
        console.error("Uncaught error:", error, errorInfo);
    }

    handleReset = () => {
        this.setState({ hasError: false, error: null });
        // Optional: Trigger a full app reload if needed, but often resetting state is enough
        // navigation.reset(...) could be passed as prop if needed
    };

    render() {
        if (this.state.hasError) {
            return (
                <View style={styles.container}>
                    <View style={styles.content}>
                        <MaterialCommunityIcons name="alert-circle-outline" size={64} color="#EF4444" />
                        <Text style={styles.title}>Something went wrong</Text>
                        <Text style={styles.subtitle}>
                            We're sorry, but an unexpected error occurred.
                        </Text>
                        {this.state.error && (
                            <View style={styles.errorBox}>
                                <Text style={styles.errorText} numberOfLines={3}>
                                    {this.state.error.toString()}
                                </Text>
                            </View>
                        )}
                        <TouchableOpacity style={styles.button} onPress={this.handleReset}>
                            <Text style={styles.buttonText}>Try Again</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            );
        }

        return this.props.children;
    }
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F9FAFB', // Light gray background
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    content: {
        alignItems: 'center',
        maxWidth: 400,
        width: '100%',
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#1F2937', // Gray 800
        marginTop: 16,
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 16,
        color: '#6B7280', // Gray 500
        textAlign: 'center',
        marginBottom: 24,
    },
    errorBox: {
        backgroundColor: '#FEF2F2', // Red 50
        borderColor: '#FECACA', // Red 200
        borderWidth: 1,
        borderRadius: 8,
        padding: 12,
        marginBottom: 24,
        width: '100%',
    },
    errorText: {
        color: '#B91C1C', // Red 700
        fontFamily: 'monospace',
        fontSize: 12,
        textAlign: 'center',
    },
    button: {
        backgroundColor: '#6366F1', // Indigo 500
        paddingVertical: 12,
        paddingHorizontal: 24,
        borderRadius: 8,
        elevation: 2,
    },
    buttonText: {
        color: 'white',
        fontWeight: '600',
        fontSize: 16,
    },
});

export default ErrorBoundary;
