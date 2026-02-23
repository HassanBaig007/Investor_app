import RNFS from 'react-native-fs';
import {
    writeExportFile,
    deleteExportFile,
    FILE_EXPORT_ENCODING,
} from '../fileExport';

jest.mock('react-native-fs', () => ({
    CachesDirectoryPath: '/tmp/cache',
    writeFile: jest.fn(),
    exists: jest.fn(),
    unlink: jest.fn(),
}));

describe('fileExport utils', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('writes UTF8 export file and returns file URI', async () => {
        RNFS.writeFile.mockResolvedValue(undefined);

        const fileUri = await writeExportFile({
            fileName: 'report.csv',
            content: 'a,b,c',
        });

        expect(RNFS.writeFile).toHaveBeenCalledWith(
            '/tmp/cache/report.csv',
            'a,b,c',
            'utf8',
        );
        expect(fileUri).toBe('file:///tmp/cache/report.csv');
    });

    it('writes BASE64 export file when encoding is base64', async () => {
        RNFS.writeFile.mockResolvedValue(undefined);

        await writeExportFile({
            fileName: 'report.xlsx',
            content: 'YWJj',
            encoding: FILE_EXPORT_ENCODING.BASE64,
        });

        expect(RNFS.writeFile).toHaveBeenCalledWith(
            '/tmp/cache/report.xlsx',
            'YWJj',
            'base64',
        );
    });

    it('deletes existing export file and ignores missing file', async () => {
        RNFS.exists.mockResolvedValueOnce(true).mockResolvedValueOnce(false);
        RNFS.unlink.mockResolvedValue(undefined);

        await deleteExportFile('file:///tmp/cache/report.csv');
        await deleteExportFile('file:///tmp/cache/missing.csv');

        expect(RNFS.unlink).toHaveBeenCalledWith('/tmp/cache/report.csv');
        expect(RNFS.unlink).toHaveBeenCalledTimes(1);
    });

    it('swallows cleanup errors and logs warning', async () => {
        const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => { });
        RNFS.exists.mockRejectedValue(new Error('fs unavailable'));

        await expect(deleteExportFile('file:///tmp/cache/report.csv')).resolves.toBeUndefined();
        expect(warnSpy).toHaveBeenCalled();

        warnSpy.mockRestore();
    });
});
