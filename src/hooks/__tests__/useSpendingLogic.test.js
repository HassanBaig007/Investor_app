import React from 'react';
import { Alert } from 'react-native';
import { act, render, waitFor } from '@testing-library/react-native';
import { useSpendingLogic } from '../useSpendingLogic';
import { api } from '../../services/api';

jest.mock('../../services/api', () => ({
    api: {
        addSpending: jest.fn(),
        voteSpending: jest.fn(),
    },
}));

describe('useSpendingLogic', () => {
    let hook;
    let onRefresh;

    const TestHarness = (props) => {
        hook = useSpendingLogic(props);
        return null;
    };

    const baseProps = () => ({
        project: { _id: 'project-1', id: 'project-1' },
        currentUser: { _id: 'user-1', id: 'user-1' },
        projectMemberIds: ['user-1'],
        pendingSpendings: [],
        setPendingSpendings: jest.fn(),
        approvedSpendings: [],
        setApprovedSpendings: jest.fn(),
        onRefresh,
    });

    beforeEach(() => {
        hook = undefined;
        onRefresh = jest.fn();
        jest.clearAllMocks();
        jest.spyOn(Alert, 'alert').mockImplementation(() => { });
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    it('validates invalid amount before submitting', () => {
        render(<TestHarness {...baseProps()} />);

        act(() => {
            hook.setSpendingDescription('Cement bags');
            hook.setSpendingAmount('0');
        });

        act(() => {
            hook.handleAddSpending();
        });

        expect(Alert.alert).toHaveBeenCalledWith(
            'Invalid Amount',
            'Please enter a valid amount greater than 0',
        );
        expect(api.addSpending).not.toHaveBeenCalled();
    });

    it('submits approved spending and resets form state', async () => {
        api.addSpending.mockResolvedValue({ status: 'approved' });
        render(<TestHarness {...baseProps()} />);

        act(() => {
            hook.setSpendingAmount('1,500');
            hook.setSpendingDescription('Steel purchase');
            hook.setSelectedLedgerId('ledger-1');
            hook.setSelectedSubLedger('Steel');
        });

        act(() => {
            hook.handleAddSpending();
        });

        await waitFor(() => expect(api.addSpending).toHaveBeenCalledTimes(1));
        expect(api.addSpending).toHaveBeenCalledWith(expect.objectContaining({
            amount: 1500,
            category: 'Product',
            materialType: 'Steel',
            fundedBy: 'user-1',
            ledgerId: 'ledger-1',
            subLedger: 'Steel',
        }));

        await waitFor(() => expect(onRefresh).toHaveBeenCalledTimes(1));
        expect(hook.spendingAmount).toBe('');
        expect(hook.spendingDescription).toBe('');
        expect(hook.selectedLedgerId).toBe('');
    });

    it('approves spending and triggers refresh callback', async () => {
        api.voteSpending.mockResolvedValue({ ok: true });
        render(<TestHarness {...baseProps()} />);

        await act(async () => {
            await hook.handleApproveSpending({ _id: 'spending-1' });
        });

        expect(api.voteSpending).toHaveBeenCalledWith('spending-1', 'approved');
        expect(onRefresh).toHaveBeenCalledTimes(1);
    });

    it('rejects spending after confirmation dialog', async () => {
        api.voteSpending.mockResolvedValue({ ok: true });
        render(<TestHarness {...baseProps()} />);

        act(() => {
            hook.handleRejectSpending({ _id: 'spending-2' });
        });

        expect(Alert.alert).toHaveBeenCalledWith(
            'Reject Spending',
            'Are you sure you want to reject this spending?',
            expect.any(Array),
        );

        const rejectButton = Alert.alert.mock.calls[0][2][1];
        await act(async () => {
            await rejectButton.onPress();
        });

        expect(api.voteSpending).toHaveBeenCalledWith('spending-2', 'rejected');
        expect(onRefresh).toHaveBeenCalledTimes(1);
    });

    it('requires category when custom sub-ledger path is selected', () => {
        render(<TestHarness {...baseProps()} />);

        act(() => {
            hook.setSpendingAmount('250');
            hook.setSpendingDescription('Custom');
            hook.setSelectedLedgerId('ledger-1');
            hook.setSelectedSubLedger(hook.othersSubLedgerValue);
        });

        act(() => {
            hook.handleAddSpending();
        });

        expect(Alert.alert).toHaveBeenCalledWith('Select Category', 'Please select Service or Product');
        expect(api.addSpending).not.toHaveBeenCalled();
    });

    it('shows pending approval message for non-approved spending responses', async () => {
        api.addSpending.mockResolvedValue({ status: 'pending' });
        render(<TestHarness {...baseProps()} />);

        act(() => {
            hook.setSpendingAmount('500');
            hook.setSpendingDescription('Approval path');
            hook.setSelectedLedgerId('ledger-1');
            hook.setSelectedSubLedger('Fuel');
        });

        act(() => {
            hook.handleAddSpending();
        });

        await waitFor(() => expect(api.addSpending).toHaveBeenCalledTimes(1));
        expect(Alert.alert).toHaveBeenCalledWith('Pending Approval', 'Spending submitted for approval.');
    });

    it('shows API error message when add spending fails', async () => {
        const error = { friendlyMessage: 'Budget exceeded' };
        api.addSpending.mockRejectedValue(error);
        const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => { });
        render(<TestHarness {...baseProps()} />);

        act(() => {
            hook.setSpendingAmount('100');
            hook.setSpendingDescription('Failing path');
            hook.setSelectedLedgerId('ledger-1');
            hook.setSelectedSubLedger('Fuel');
        });

        act(() => {
            hook.handleAddSpending();
        });

        await waitFor(() => expect(Alert.alert).toHaveBeenCalledWith('Error', 'Budget exceeded'));
        errorSpy.mockRestore();
    });

    it('updates category-specific state through selectSpendingCategory helper', () => {
        render(<TestHarness {...baseProps()} />);

        act(() => {
            hook.setMaterialType('Cement');
            hook.selectSpendingCategory('Service');
        });
        expect(hook.materialType).toBe('');

        act(() => {
            hook.setPaidToPerson('Vendor');
            hook.setPaidToPlace('Delhi');
            hook.selectSpendingCategory('Product');
        });
        expect(hook.paidToPerson).toBe('');
        expect(hook.paidToPlace).toBe('');
    });
});
