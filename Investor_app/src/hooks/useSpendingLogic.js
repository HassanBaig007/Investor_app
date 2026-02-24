import { useState } from 'react';
import { Alert } from 'react-native';
import { api } from '../services/api';

const OTHERS_SUB_LEDGER_VALUE = '__OTHERS__';

export const useSpendingLogic = ({
    project,
    currentUser,
    projectMemberIds,
    pendingSpendings,
    setPendingSpendings,
    approvedSpendings,
    setApprovedSpendings,
    onRefresh,
}) => {
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Form State
    const [spendingAmount, setSpendingAmount] = useState('');
    const [spendingDescription, setSpendingDescription] = useState('');
    const [spendingCategory, setSpendingCategory] = useState('');
    const [spendingDate, setSpendingDate] = useState(new Date().toISOString().split('T')[0]);
    const [showDatePicker, setShowDatePicker] = useState(false);

    // Category Specific State
    const [paidToPerson, setPaidToPerson] = useState('');
    const [paidToPlace, setPaidToPlace] = useState('');
    const [materialType, setMaterialType] = useState('');

    // Investment Type State
    const [investmentType, setInvestmentType] = useState('self');
    const [selectedFunder, setSelectedFunder] = useState(null);

    // Ledger Selection State (Managed here as it's part of the form)
    const [selectedLedgerId, setSelectedLedgerId] = useState('');
    const [selectedSubLedger, setSelectedSubLedger] = useState('');

    // Feedback State
    const [actionFeedback, setActionFeedback] = useState(null);
    const [rejectedSpendings] = useState([]); // This might be used in UI, keep for now or clean if not

    const showFeedback = (type, message) => {
        setActionFeedback({ type, message });
        setTimeout(() => setActionFeedback(null), 3000);
    };

    const formatAmount = (value) => {
        if (!value) return '';
        const clean = value.replaceAll(/[^0-9.]/g, '');
        const parts = clean.split('.');
        let integerPart = parts[0];
        if (integerPart.length > 3) {
            const lastThree = integerPart.substring(integerPart.length - 3);
            const otherNumbers = integerPart.substring(0, integerPart.length - 3);
            integerPart = otherNumbers.replaceAll(/\B(?=(\d{2})+(?!\d))/g, ',') + ',' + lastThree;
        }
        return parts.length > 1 ? integerPart + '.' + parts[1] : integerPart;
    };

    const getCategoryContext = () => {
        const shouldUseManualCategory = Boolean(
            selectedLedgerId && selectedSubLedger === OTHERS_SUB_LEDGER_VALUE,
        );

        const effectiveCategory = shouldUseManualCategory ? spendingCategory : 'Product';
        let resolvedMaterialType = null;
        if (effectiveCategory === 'Product') {
            if (shouldUseManualCategory) {
                resolvedMaterialType = materialType;
            } else {
                resolvedMaterialType = selectedSubLedger || 'General';
            }
        }

        return {
            shouldUseManualCategory,
            effectiveCategory,
            resolvedMaterialType,
        };
    };

    const handleAddSpending = () => {
        const cleanedAmount = spendingAmount.replaceAll(/[^0-9.]/g, '');
        const parsedAmount = Number.parseFloat(cleanedAmount);
        const {
            shouldUseManualCategory,
            effectiveCategory,
            resolvedMaterialType,
        } = getCategoryContext();
        const shouldUseLedgerDetails = !shouldUseManualCategory;

        // Validation
        if (!cleanedAmount || Number.isNaN(parsedAmount) || parsedAmount <= 0) {
            Alert.alert('Invalid Amount', 'Please enter a valid amount greater than 0');
            return;
        }
        if (!spendingDescription.trim()) {
            Alert.alert('Missing Description', 'Please add a description for this spending');
            return;
        }
        if (shouldUseManualCategory && !spendingCategory) {
            Alert.alert('Select Category', 'Please select Service or Product');
            return;
        }
        if (shouldUseManualCategory && effectiveCategory === 'Service' && (!paidToPerson.trim() || !paidToPlace.trim())) {
            Alert.alert('Missing Details', 'Please enter the person name and place for this service');
            return;
        }
        if (shouldUseManualCategory && effectiveCategory === 'Product' && !materialType) {
            Alert.alert('Missing Details', 'Please select the material type for this product');
            return;
        }
        if (investmentType === 'other' && !selectedFunder) {
            Alert.alert('Select Funder', 'Please select which member funded this spending');
            return;
        }

        // Create Spending Object for Backend
        const spendingData = {
            amount: parsedAmount,
            description: spendingDescription.trim(),
            category: effectiveCategory,
            date: spendingDate,
            projectId: project._id || project.id,
            paidTo: shouldUseManualCategory && effectiveCategory === 'Service' ? {
                person: paidToPerson.trim(),
                place: paidToPlace.trim(),
            } : null,
            materialType: resolvedMaterialType,
            productName: effectiveCategory === 'Product' ? (resolvedMaterialType || '') : undefined,
            ledgerId: selectedLedgerId || undefined,
            subLedger: shouldUseLedgerDetails ? (selectedSubLedger || undefined) : undefined,
            fundedBy: investmentType === 'self'
                ? currentUser._id || currentUser.id
                : (selectedFunder?._id || selectedFunder?.id || selectedFunder),
            investmentType: investmentType,
        };

        setIsSubmitting(true);
        api.addSpending(spendingData)
            .then((res) => {
                setIsSubmitting(false);
                if (res.status === 'approved') {
                    Alert.alert('Success', `₹${parsedAmount.toLocaleString()} added successfully!`);
                } else {
                    Alert.alert('Pending Approval', `Spending submitted for approval.`);
                }

                // Reset Form
                setSpendingAmount('');
                setSpendingDescription('');
                setSpendingCategory('');
                setPaidToPerson('');
                setPaidToPlace('');
                setMaterialType('');
                setSelectedLedgerId('');
                setSelectedSubLedger('');
                setInvestmentType('self');
                setSelectedFunder(null);

                if (onRefresh) onRefresh();
            })
            .catch(err => {
                setIsSubmitting(false);
                console.error('Add spending failed:', err);
                const message = err?.friendlyMessage || err?.response?.data?.message || 'Failed to add spending.';
                Alert.alert('Error', message);
            });
    };

    const handleApproveSpending = async (spending) => {
        try {
            setIsSubmitting(true);
            await api.voteSpending(spending._id || spending.id, 'approved');
            setIsSubmitting(false);
            showFeedback('success', `✓ Spending approved`);
            if (onRefresh) onRefresh();
        } catch (err) {
            setIsSubmitting(false);
            console.error('Approve spending failed:', err);
            Alert.alert('Error', 'Failed to approve spending.');
        }
    };

    const handleRejectSpending = (spending) => {
        Alert.alert(
            'Reject Spending',
            'Are you sure you want to reject this spending?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Reject',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            setIsSubmitting(true);
                            await api.voteSpending(spending._id || spending.id, 'rejected');
                            setIsSubmitting(false);
                            showFeedback('reject', `✗ Spending rejected`);
                            if (onRefresh) onRefresh();
                        } catch (err) {
                            setIsSubmitting(false);
                            console.error('Reject spending failed:', err);
                            Alert.alert('Error', 'Failed to reject spending.');
                        }
                    }
                }
            ]
        );
    };

    return {
        spendingAmount, setSpendingAmount,
        spendingDescription, setSpendingDescription,
        spendingCategory, setSpendingCategory,
        spendingDate, setSpendingDate,
        showDatePicker, setShowDatePicker,
        paidToPerson, setPaidToPerson,
        paidToPlace, setPaidToPlace,
        materialType, setMaterialType,
        investmentType, setInvestmentType,
        selectedFunder, setSelectedFunder,
        selectedLedgerId, setSelectedLedgerId,
        selectedSubLedger, setSelectedSubLedger,
        actionFeedback,
        rejectedSpendings,
        isSubmitting,
        onRefresh,
        formatAmount,
        clearCategorySpecificState: () => {
            setSpendingCategory('');
            setPaidToPerson('');
            setPaidToPlace('');
            setMaterialType('');
        },
        othersSubLedgerValue: OTHERS_SUB_LEDGER_VALUE,
        selectSpendingCategory: (category) => {
            setSpendingCategory(category);
            if (category === 'Service') {
                setMaterialType('');
            } else if (category === 'Product') {
                setPaidToPerson('');
                setPaidToPlace('');
            }
        },
        handleAddSpending,
        handleApproveSpending,
        handleRejectSpending
    };
};
