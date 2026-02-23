import React from 'react';
import { Text } from 'react-native';
import { render } from '@testing-library/react-native';
import Card, { CardHeader, CardRow } from '../Card';

describe('Card components', () => {
    it('renders card content', () => {
        const { getByText } = render(
            <Card>
                <Text>Card Body</Text>
            </Card>,
        );

        expect(getByText('Card Body')).toBeTruthy();
    });

    it('renders card header with subtitle and action', () => {
        const { getByText } = render(
            <CardHeader
                title="Portfolio"
                subtitle="Monthly snapshot"
                action={<Text>Action</Text>}
                icon={<Text>Icon</Text>}
            />,
        );

        expect(getByText('Portfolio')).toBeTruthy();
        expect(getByText('Monthly snapshot')).toBeTruthy();
        expect(getByText('Action')).toBeTruthy();
        expect(getByText('Icon')).toBeTruthy();
    });

    it('renders card row label and value', () => {
        const { getByText } = render(
            <CardRow
                label="Invested"
                value="₹50,000"
                icon={<Text>₹</Text>}
            />,
        );

        expect(getByText('Invested')).toBeTruthy();
        expect(getByText('₹50,000')).toBeTruthy();
    });
});
