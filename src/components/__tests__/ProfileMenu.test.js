import React from 'react';
import { TouchableWithoutFeedback } from 'react-native';
import { fireEvent, render } from '@testing-library/react-native';
import ProfileMenu from '../ProfileMenu';

jest.mock('react-native-linear-gradient', () => (
    ({ children, ...props }) => {
        const React = require('react');
        const { View } = require('react-native');
        return <View {...props}>{children}</View>;
    }
));

jest.mock('react-native-vector-icons/MaterialCommunityIcons', () => 'Icon');

describe('ProfileMenu', () => {
    it('renders user initials and calls profile action handlers', () => {
        const onClose = jest.fn();
        const onProfile = jest.fn();
        const onSettings = jest.fn();
        const onShare = jest.fn();
        const onLogout = jest.fn();

        const screen = render(
            <ProfileMenu
                visible={true}
                userName="John Doe"
                onClose={onClose}
                onProfile={onProfile}
                onSettings={onSettings}
                onShare={onShare}
                onLogout={onLogout}
            />,
        );

        expect(screen.getByText('JD')).toBeTruthy();
        fireEvent.press(screen.getByText('My Profile'));
        expect(onClose).toHaveBeenCalledTimes(1);
        expect(onProfile).toHaveBeenCalledTimes(1);
    });

    it('calls logout flow and close handler from menu', () => {
        const onClose = jest.fn();
        const onLogout = jest.fn();

        const screen = render(
            <ProfileMenu
                visible={true}
                userName="User"
                onClose={onClose}
                onProfile={jest.fn()}
                onSettings={jest.fn()}
                onShare={jest.fn()}
                onLogout={onLogout}
            />,
        );

        fireEvent.press(screen.getByText('Sign Out'));
        expect(onClose).toHaveBeenCalledTimes(1);
        expect(onLogout).toHaveBeenCalledTimes(1);
    });

    it('runs share/settings handlers and cancel close action', () => {
        const onClose = jest.fn();
        const onShare = jest.fn();
        const onSettings = jest.fn();

        const screen = render(
            <ProfileMenu
                visible={true}
                userName="User"
                onClose={onClose}
                onProfile={jest.fn()}
                onSettings={onSettings}
                onShare={onShare}
                onLogout={jest.fn()}
            />,
        );

        fireEvent.press(screen.getByText('Share to Friends'));
        fireEvent.press(screen.getByText('Settings'));
        fireEvent.press(screen.getByText('Cancel'));

        expect(onShare).toHaveBeenCalledTimes(1);
        expect(onSettings).toHaveBeenCalledTimes(1);
        expect(onClose).toHaveBeenCalledTimes(3);
    });

    it('prevents inner menu press from bubbling to overlay', () => {
        const screen = render(
            <ProfileMenu
                visible={true}
                userName="User"
                onClose={jest.fn()}
                onProfile={jest.fn()}
                onSettings={jest.fn()}
                onShare={jest.fn()}
                onLogout={jest.fn()}
            />,
        );

        const stopPropagation = jest.fn();
        const touchables = screen.UNSAFE_getAllByType(TouchableWithoutFeedback);
        touchables[1].props.onPress({ stopPropagation });

        expect(stopPropagation).toHaveBeenCalledTimes(1);
    });
});
