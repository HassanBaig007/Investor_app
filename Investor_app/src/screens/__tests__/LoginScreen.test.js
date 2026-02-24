import React from 'react';
import { Alert } from 'react-native';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import LoginScreen from '../LoginScreen';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import { validateLoginForm } from '../../utils/validationUtils';

jest.mock('react-native/Libraries/Animated/NativeAnimatedHelper');

jest.mock('react-native-safe-area-context', () => ({
    SafeAreaView: ({ children, ...props }) => {
        const React = require('react');
        const { View } = require('react-native');
        return <View {...props}>{children}</View>;
    },
}));

jest.mock('react-native-linear-gradient', () => (
    ({ children, ...props }) => {
        const React = require('react');
        const { View } = require('react-native');
        return <View {...props}>{children}</View>;
    }
));

jest.mock('react-native-vector-icons/MaterialCommunityIcons', () => 'Icon');

jest.mock('../../context/AuthContext', () => ({
    useAuth: jest.fn(),
}));

jest.mock('../../services/api', () => ({
    api: {
        login: jest.fn(),
        getBaseUrl: jest.fn(() => 'http://localhost:3000'),
    },
}));

jest.mock('../../utils/validationUtils', () => ({
    ...jest.requireActual('../../utils/validationUtils'),
    validateLoginForm: jest.fn(),
}));

describe('LoginScreen', () => {
    const navigation = { navigate: jest.fn() };
    const onLogin = jest.fn();
    let biometricLogin;

    beforeEach(() => {
        biometricLogin = jest.fn();
        jest.clearAllMocks();
        jest.spyOn(Alert, 'alert').mockImplementation(() => { });
        useAuth.mockReturnValue({
            biometricAvailable: false,
            biometricEnabled: false,
            loginWithBiometric: biometricLogin,
        });
        validateLoginForm.mockReturnValue({ isValid: true, errors: {} });
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    it('shows validation alert and does not call API on invalid form', () => {
        validateLoginForm.mockReturnValue({
            isValid: false,
            errors: { email: 'Email is invalid' },
        });
        const screen = render(<LoginScreen navigation={navigation} onLogin={onLogin} />);

        pressSignIn(screen);

        expect(Alert.alert).toHaveBeenCalledWith('Validation Error', 'Email is invalid');
        expect(api.login).not.toHaveBeenCalled();
        expect(onLogin).not.toHaveBeenCalled();
    });

    it('calls onLogin for successful standard login', async () => {
        api.login.mockResolvedValue({
            success: true,
            user: { _id: 'user-1', role: 'investor' },
        });
        const screen = render(<LoginScreen navigation={navigation} onLogin={onLogin} />);

        fireEvent.changeText(
            screen.getByPlaceholderText('Email address, phone number, or user name'),
            'investor@example.com',
        );
        fireEvent.changeText(screen.getByPlaceholderText('Password'), 'Password123!');
        pressSignIn(screen);

        await waitFor(() => expect(api.login).toHaveBeenCalledWith('investor@example.com', 'Password123!'));
        expect(onLogin).toHaveBeenCalledWith({ _id: 'user-1', role: 'investor' });
    });

    it('blocks super admin mode for non-admin accounts', async () => {
        api.login.mockResolvedValue({
            success: true,
            user: { _id: 'user-2', role: 'investor' },
        });
        const screen = render(<LoginScreen navigation={navigation} onLogin={onLogin} />);

        fireEvent.press(screen.getByText('Admin'));
        fireEvent.changeText(screen.getByPlaceholderText('Password'), 'AdminSecret!');
        pressSignIn(screen);

        await waitFor(() => expect(api.login).toHaveBeenCalledTimes(1));
        expect(Alert.alert).toHaveBeenCalledWith(
            'Access Denied',
            'This account does not have Admin privileges.',
        );
        expect(onLogin).not.toHaveBeenCalled();
    });

    it('supports biometric login path when enabled', async () => {
        biometricLogin.mockResolvedValue({
            success: true,
            user: { _id: 'bio-user', role: 'investor' },
        });
        useAuth.mockReturnValue({
            biometricAvailable: true,
            biometricEnabled: true,
            loginWithBiometric: biometricLogin,
        });

        const screen = render(<LoginScreen navigation={navigation} onLogin={onLogin} />);
        fireEvent.press(screen.getByText('Login with Fingerprint'));

        await waitFor(() => expect(biometricLogin).toHaveBeenCalledTimes(1));
        expect(onLogin).toHaveBeenCalledWith({ _id: 'bio-user', role: 'investor' });
    });

    it('shows backend login error message from API response', async () => {
        api.login.mockRejectedValue({
            response: { data: { message: 'Invalid credentials' } },
        });
        const screen = render(<LoginScreen navigation={navigation} onLogin={onLogin} />);

        fireEvent.changeText(
            screen.getByPlaceholderText('Email address, phone number, or user name'),
            'bad@example.com',
        );
        fireEvent.changeText(screen.getByPlaceholderText('Password'), 'bad-pass');
        pressSignIn(screen);

        await waitFor(() => expect(Alert.alert).toHaveBeenCalledWith('Login Failed', 'Invalid credentials'));
    });

    it('shows connection error with active base URL when API is unreachable', async () => {
        api.getBaseUrl.mockReturnValue('http://10.0.2.2:3000');
        api.login.mockRejectedValue(new Error('Network error'));
        const screen = render(<LoginScreen navigation={navigation} onLogin={onLogin} />);

        fireEvent.changeText(
            screen.getByPlaceholderText('Email address, phone number, or user name'),
            'user@example.com',
        );
        fireEvent.changeText(screen.getByPlaceholderText('Password'), 'Password123!');
        pressSignIn(screen);

        await waitFor(() => expect(Alert.alert).toHaveBeenCalledWith(
            'Connection Failed',
            'Cannot reach server at http://10.0.2.2:3000. Make sure the backend is running and your device is on the same network.',
        ));
    });

    it('navigates to signup and opens legal alerts', () => {
        const screen = render(<LoginScreen navigation={navigation} onLogin={onLogin} />);

        fireEvent.press(screen.getByText('Sign Up'));
        fireEvent.press(screen.getByText('Privacy Policy'));
        fireEvent.press(screen.getByText('Terms of Service'));

        expect(navigation.navigate).toHaveBeenCalledWith('SignUp');
        expect(Alert.alert).toHaveBeenCalledWith(
            'Privacy Policy',
            'Privacy Policy will be available soon.',
        );
        expect(Alert.alert).toHaveBeenCalledWith(
            'Terms of Service',
            'Terms of Service will be available soon.',
        );
    });
});
    const pressSignIn = (screen) => {
        const signInTexts = screen.getAllByText('Sign In');
        fireEvent.press(signInTexts[signInTexts.length - 1]);
    };
