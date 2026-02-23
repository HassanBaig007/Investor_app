import RNFS from 'react-native-fs';

const MODERN_ENCODING_BASE64 = 'base64';
const MODERN_ENCODING_UTF8 = 'utf8';

export const writeExportFile = async ({ fileName, content, encoding = MODERN_ENCODING_UTF8 }) => {
    const resolvedEncoding = String(encoding || MODERN_ENCODING_UTF8).toLowerCase();
    const path = `${RNFS.CachesDirectoryPath}/${fileName}`;
    await RNFS.writeFile(path, String(content ?? ''), resolvedEncoding === MODERN_ENCODING_BASE64 ? 'base64' : 'utf8');
    return `file://${path}`;
};

export const deleteExportFile = async (fileUri) => {
    if (!fileUri) return;

    try {
        const normalizedPath = String(fileUri).replace(/^file:\/\//, '');
        const exists = await RNFS.exists(normalizedPath);
        if (exists) {
            await RNFS.unlink(normalizedPath);
        }
    } catch (error) {
        console.warn('Failed to cleanup export file:', error?.message || error);
    }
};

export const FILE_EXPORT_ENCODING = {
    BASE64: MODERN_ENCODING_BASE64,
    UTF8: MODERN_ENCODING_UTF8,
};
