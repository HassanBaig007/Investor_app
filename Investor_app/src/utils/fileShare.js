import Share from 'react-native-share';

export const canShareFiles = async () => {
    return true;
};

export const shareFileUri = async (fileUri, { mimeType, dialogTitle } = {}) => {
    const canShare = await canShareFiles();
    if (!canShare) return false;

    try {
        const normalizedUri = String(fileUri || '').startsWith('file://')
            ? String(fileUri)
            : `file://${String(fileUri || '')}`;

        await Share.open({
            url: normalizedUri,
            type: mimeType ? String(mimeType).split(';')[0] : undefined,
            title: dialogTitle,
            failOnCancel: false,
        });
    } catch (error) {
        console.warn('Share dialog could not be opened:', error?.message || error);
        return false;
    }

    return true;
};
