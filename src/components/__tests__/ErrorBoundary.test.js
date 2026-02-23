import React from 'react';
import { Text } from 'react-native';
import { fireEvent, render } from '@testing-library/react-native';
import ErrorBoundary from '../ErrorBoundary';

jest.mock('react-native-vector-icons/MaterialCommunityIcons', () => 'Icon');

const Thrower = ({ shouldThrow }) => {
    if (shouldThrow) {
        throw new Error('Boom from child');
    }
    return <Text>Healthy Child</Text>;
};

describe('ErrorBoundary', () => {
    it('renders children when no error is thrown', () => {
        const { getByText } = render(
            <ErrorBoundary>
                <Text>Safe content</Text>
            </ErrorBoundary>,
        );

        expect(getByText('Safe content')).toBeTruthy();
    });

    it('renders fallback UI and allows reset flow', () => {
        const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => { });

        const { getByText, queryByText, rerender } = render(
            <ErrorBoundary>
                <Thrower shouldThrow />
            </ErrorBoundary>,
        );

        expect(getByText('Something went wrong')).toBeTruthy();
        expect(getByText(/Boom from child/)).toBeTruthy();
        expect(getByText('Try Again')).toBeTruthy();

        rerender(
            <ErrorBoundary>
                <Thrower shouldThrow={false} />
            </ErrorBoundary>,
        );
        fireEvent.press(getByText('Try Again'));

        expect(queryByText('Something went wrong')).toBeNull();
        expect(getByText('Healthy Child')).toBeTruthy();

        consoleSpy.mockRestore();
    });
});
