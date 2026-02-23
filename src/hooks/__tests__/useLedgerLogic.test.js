import React from 'react';
import { Alert } from 'react-native';
import { act, render, waitFor } from '@testing-library/react-native';
import { useLedgerLogic } from '../useLedgerLogic';
import { api } from '../../services/api';

jest.mock('../../services/api', () => ({
    api: {
        getLedgers: jest.fn(),
        createLedger: jest.fn(),
        deleteLedger: jest.fn(),
        updateLedger: jest.fn(),
    },
}));

describe('useLedgerLogic', () => {
    let hook;
    let setSelectedLedgerId;
    let setSelectedSubLedger;

    const TestHarness = (props) => {
        hook = useLedgerLogic(
            props.project,
            props.selectedLedgerId,
            props.selectedSubLedger,
            props.setSelectedLedgerId,
            props.setSelectedSubLedger,
        );
        return null;
    };

    const baseProps = (overrides = {}) => ({
        project: { _id: 'project-1', id: 'project-1' },
        selectedLedgerId: '',
        selectedSubLedger: '',
        setSelectedLedgerId,
        setSelectedSubLedger,
        ...overrides,
    });

    beforeEach(() => {
        hook = undefined;
        setSelectedLedgerId = jest.fn();
        setSelectedSubLedger = jest.fn();
        jest.clearAllMocks();
        jest.spyOn(Alert, 'alert').mockImplementation(() => { });
        api.getLedgers.mockResolvedValue([
            { id: 'ledger-1', name: 'Operations', subLedgers: ['Fuel'] },
        ]);
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    it('loads ledgers on mount for project', async () => {
        render(<TestHarness {...baseProps()} />);

        await waitFor(() => expect(api.getLedgers).toHaveBeenCalledWith('project-1'));
        expect(hook.ledgers).toEqual([
            { id: 'ledger-1', name: 'Operations', subLedgers: ['Fuel'] },
        ]);
    });

    it('creates a ledger and clears input', async () => {
        api.createLedger.mockResolvedValue({ id: 'ledger-2', name: 'Travel', subLedgers: [] });
        render(<TestHarness {...baseProps()} />);
        await waitFor(() => expect(hook.ledgers.length).toBe(1));

        act(() => {
            hook.setNewLedgerName('Travel');
        });

        await act(async () => {
            await hook.handleAddLedger();
        });

        expect(api.createLedger).toHaveBeenCalledWith({
            name: 'Travel',
            project: 'project-1',
            subLedgers: [],
        });
        expect(Alert.alert).toHaveBeenCalledWith('Success', 'Ledger added successfully!');
        expect(hook.newLedgerName).toBe('');
        expect(hook.ledgers).toEqual([
            { id: 'ledger-1', name: 'Operations', subLedgers: ['Fuel'] },
            { id: 'ledger-2', name: 'Travel', subLedgers: [] },
        ]);
    });

    it('blocks duplicate sub-ledger names', async () => {
        render(<TestHarness {...baseProps({ selectedLedgerId: 'ledger-1' })} />);
        await waitFor(() => expect(hook.ledgers.length).toBe(1));

        act(() => {
            hook.setNewSubLedgerName('Fuel');
        });

        await act(async () => {
            await hook.handleAddSubLedger();
        });

        expect(Alert.alert).toHaveBeenCalledWith('Exists', 'This sub-ledger already exists.');
        expect(api.updateLedger).not.toHaveBeenCalled();
    });

    it('deletes selected ledger and clears selected state', async () => {
        api.deleteLedger.mockResolvedValue({ success: true });
        render(<TestHarness {...baseProps({ selectedLedgerId: 'ledger-1', selectedSubLedger: 'Fuel' })} />);
        await waitFor(() => expect(hook.ledgers.length).toBe(1));

        act(() => {
            hook.handleDeleteLedger('ledger-1');
        });

        const deleteButton = Alert.alert.mock.calls[0][2][1];
        await act(async () => {
            await deleteButton.onPress();
        });

        expect(api.deleteLedger).toHaveBeenCalledWith('ledger-1');
        expect(setSelectedLedgerId).toHaveBeenCalledWith('');
        expect(setSelectedSubLedger).toHaveBeenCalledWith('');
        expect(hook.ledgers).toEqual([]);
    });

    it('shows error when adding ledger without project id', async () => {
        render(<TestHarness {...baseProps({ project: null })} />);

        act(() => {
            hook.setNewLedgerName('Emergency');
        });
        await act(async () => {
            await hook.handleAddLedger();
        });

        expect(Alert.alert).toHaveBeenCalledWith('Error', 'Project not found for creating ledger.');
        expect(api.createLedger).not.toHaveBeenCalled();
    });

    it('adds and deletes sub-ledgers through updateLedger', async () => {
        api.updateLedger
            .mockResolvedValueOnce({ id: 'ledger-1', name: 'Operations', subLedgers: ['Fuel', 'Travel'] })
            .mockResolvedValueOnce({ id: 'ledger-1', name: 'Operations', subLedgers: ['Fuel'] });
        render(<TestHarness {...baseProps({ selectedLedgerId: 'ledger-1', selectedSubLedger: 'Travel' })} />);
        await waitFor(() => expect(hook.ledgers.length).toBe(1));

        act(() => {
            hook.setNewSubLedgerName('Travel');
        });
        await act(async () => {
            await hook.handleAddSubLedger();
        });
        expect(api.updateLedger).toHaveBeenCalledWith('ledger-1', { subLedgers: ['Fuel', 'Travel'] });
        expect(Alert.alert).toHaveBeenCalledWith('Success', 'Sub-Ledger added successfully!');

        act(() => {
            hook.handleDeleteSubLedger('Travel');
        });
        const deleteButton = Alert.alert.mock.calls[Alert.alert.mock.calls.length - 1][2][1];
        await act(async () => {
            await deleteButton.onPress();
        });

        expect(api.updateLedger).toHaveBeenCalledWith('ledger-1', { subLedgers: ['Fuel'] });
        expect(setSelectedSubLedger).toHaveBeenCalledWith('');
    });

    it('handles fetch failures by clearing local ledgers', async () => {
        api.getLedgers.mockRejectedValueOnce(new Error('network'));
        const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => { });

        render(<TestHarness {...baseProps()} />);

        await waitFor(() => expect(api.getLedgers).toHaveBeenCalledWith('project-1'));
        await waitFor(() => expect(hook.ledgers).toEqual([]));
        errorSpy.mockRestore();
    });
});
