import { useCallback, useEffect, useState } from 'react';
import { Alert } from 'react-native';
import { api } from '../services/api';

export const useLedgerLogic = (
    project,
    selectedLedgerId,
    selectedSubLedger,
    setSelectedLedgerId,
    setSelectedSubLedger
) => {
    // Ledger Data State
    const [ledgers, setLedgers] = useState([]);

    // UI States for Selection Modals
    const [showLedgerSelectModal, setShowLedgerSelectModal] = useState(false);
    const [showSubLedgerSelectModal, setShowSubLedgerSelectModal] = useState(false);

    // UI States for Management (Admin)
    const [searchLedgerQuery, setSearchLedgerQuery] = useState('');
    const [newLedgerName, setNewLedgerName] = useState('');
    const [newSubLedgerName, setNewSubLedgerName] = useState('');
    const [editMode, setEditMode] = useState(false);

    // Derived
    const selectedLedgerObj = ledgers.find(l => l.id === selectedLedgerId);

    const removeLedgerFromState = (id) => {
        const updated = ledgers.filter((l) => l.id !== id);
        setLedgers(updated);
    };

    const replaceLedgerInState = (ledgerId, updatedLedger) => {
        const updated = ledgers.map((l) => (l.id === ledgerId ? updatedLedger : l));
        setLedgers(updated);
    };

    const fetchLedgers = useCallback(async () => {
        const projectId = project?._id || project?.id;
        if (!projectId) {
            setLedgers([]);
            return;
        }

        try {
            const data = await api.getLedgers(projectId);
            setLedgers(data || []);
        } catch (error) {
            console.error('Failed to load ledgers:', error);
            setLedgers([]);
        }
    }, [project?._id, project?.id]);

    useEffect(() => {
        fetchLedgers();
    }, [fetchLedgers]);

    // Handlers
    const handleAddLedger = async () => {
        if (!newLedgerName.trim()) return;

        const projectId = project?._id || project?.id;
        if (!projectId) {
            Alert.alert('Error', 'Project not found for creating ledger.');
            return;
        }

        try {
            const created = await api.createLedger({
                name: newLedgerName.trim(),
                project: projectId,
                subLedgers: [],
            });
            setLedgers((prev) => [...prev, created]);
            setNewLedgerName('');
            Alert.alert('Success', 'Ledger added successfully!');
        } catch (error) {
            console.error('Create ledger failed:', error);
            Alert.alert('Error', error.friendlyMessage || 'Failed to add ledger.');
        }
    };

    const handleDeleteLedger = (id) => {
        Alert.alert('Delete Ledger', 'Are you sure?', [
            { text: 'Cancel' },
            {
                text: 'Delete',
                style: 'destructive',
                onPress: async () => {
                    try {
                        await api.deleteLedger(id);
                        removeLedgerFromState(id);

                        if (selectedLedgerId === id) {
                            setSelectedLedgerId('');
                            setSelectedSubLedger('');
                        }
                    } catch (error) {
                        console.error('Delete ledger failed:', error);
                        Alert.alert('Error', error.friendlyMessage || 'Failed to delete ledger.');
                    }
                }
            }
        ]);
    };

    const handleAddSubLedger = async () => {
        if (!selectedLedgerId || !newSubLedgerName.trim()) return;

        const selected = ledgers.find((l) => l.id === selectedLedgerId);
        if (!selected) return;

        if (selected.subLedgers?.includes(newSubLedgerName.trim())) {
            Alert.alert('Exists', 'This sub-ledger already exists.');
            return;
        }

        const updatedSubLedgers = [...(selected.subLedgers || []), newSubLedgerName.trim()];

        try {
            const updatedLedger = await api.updateLedger(selectedLedgerId, { subLedgers: updatedSubLedgers });
            setLedgers((prev) => prev.map((l) => (l.id === selectedLedgerId ? updatedLedger : l)));
            setNewSubLedgerName('');
            Alert.alert('Success', 'Sub-Ledger added successfully!');
        } catch (error) {
            console.error('Add sub-ledger failed:', error);
            Alert.alert('Error', error.friendlyMessage || 'Failed to add sub-ledger.');
        }
    };

    const handleDeleteSubLedger = (subName) => {
        Alert.alert('Delete Sub-Ledger', `Are you sure you want to delete "${subName}"?`, [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Delete',
                style: 'destructive',
                onPress: async () => {
                    const selected = ledgers.find((l) => l.id === selectedLedgerId);
                    if (!selected) return;

                    const updatedSubLedgers = (selected.subLedgers || []).filter((s) => s !== subName);

                    try {
                        const updatedLedger = await api.updateLedger(selectedLedgerId, { subLedgers: updatedSubLedgers });
                        replaceLedgerInState(selectedLedgerId, updatedLedger);

                        if (selectedSubLedger === subName) {
                            setSelectedSubLedger('');
                        }
                    } catch (error) {
                        console.error('Delete sub-ledger failed:', error);
                        Alert.alert('Error', error.friendlyMessage || 'Failed to delete sub-ledger.');
                    }
                }
            }
        ]);
    };

    return {
        ledgers, setLedgers,
        selectedLedgerObj,
        showLedgerSelectModal, setShowLedgerSelectModal,
        showSubLedgerSelectModal, setShowSubLedgerSelectModal,
        searchLedgerQuery, setSearchLedgerQuery,
        newLedgerName, setNewLedgerName,
        newSubLedgerName, setNewSubLedgerName,
        editMode, setEditMode,
        handleAddLedger,
        handleDeleteLedger,
        handleAddSubLedger,
        handleDeleteSubLedger
    };
};
