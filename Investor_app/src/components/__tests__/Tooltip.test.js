import React from 'react';
import { Modal, Text, TouchableWithoutFeedback } from 'react-native';
import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import Tooltip, { InfoTooltip, INVESTMENT_TERMS, LabelWithHelp } from '../Tooltip';

jest.mock('react-native-vector-icons/Ionicons', () => 'Icon');

describe('Tooltip components', () => {
    it('opens and closes tooltip modal content', async () => {
        const screen = render(
            <Tooltip title="ROI" content="Return on investment explanation">
                <Text>Open Help</Text>
            </Tooltip>,
        );

        fireEvent.press(screen.getByText('Open Help'));
        expect(screen.getByText('ROI')).toBeTruthy();
        expect(screen.getByText('Return on investment explanation')).toBeTruthy();

        fireEvent.press(screen.getByText('Got it'));
        await waitFor(() => expect(screen.queryByText('ROI')).toBeNull());
    });

    it('renders InfoTooltip and LabelWithHelp wrappers', () => {
        const screen = render(
            <>
                <InfoTooltip title={INVESTMENT_TERMS.portfolio.title} content={INVESTMENT_TERMS.portfolio.content} />
                <LabelWithHelp
                    label="Risk Level"
                    helpTitle={INVESTMENT_TERMS.riskLevel.title}
                    helpText={INVESTMENT_TERMS.riskLevel.content}
                />
            </>,
        );

        expect(screen.getByText('Risk Level')).toBeTruthy();
    });

    it('handles modal request-close and inner touch stop propagation', () => {
        const screen = render(
            <Tooltip title="Risk" content="Risk text">
                <Text>Toggle</Text>
            </Tooltip>,
        );
        fireEvent.press(screen.getByText('Toggle'));

        const modal = screen.UNSAFE_getByType(Modal);
        act(() => {
            modal.props.onRequestClose();
        });
        expect(screen.queryByText('Risk')).toBeNull();

        fireEvent.press(screen.getByText('Toggle'));
        const stopPropagation = jest.fn();
        const touchables = screen.UNSAFE_getAllByType(TouchableWithoutFeedback);
        act(() => {
            touchables[0].props.onPress();
        });
        expect(screen.queryByText('Risk')).toBeNull();

        fireEvent.press(screen.getByText('Toggle'));
        const reopenedTouchables = screen.UNSAFE_getAllByType(TouchableWithoutFeedback);
        reopenedTouchables[1].props.onPress({ stopPropagation });
        expect(stopPropagation).toHaveBeenCalledTimes(1);
    });
});
