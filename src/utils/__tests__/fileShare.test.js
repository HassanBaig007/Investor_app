import Share from 'react-native-share';
import { canShareFiles, shareFileUri } from '../fileShare';

jest.mock('react-native-share', () => ({
    open: jest.fn(),
}));

describe('fileShare utils', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('canShareFiles returns true', async () => {
        await expect(canShareFiles()).resolves.toBe(true);
    });

    it('shareFileUri normalizes file path and strips mime suffix', async () => {
        Share.open.mockResolvedValue(undefined);

        const result = await shareFileUri('/tmp/cache/report.csv', {
            mimeType: 'text/csv;charset=utf-8',
            dialogTitle: 'Share Report',
        });

        expect(Share.open).toHaveBeenCalledWith({
            url: 'file:///tmp/cache/report.csv',
            type: 'text/csv',
            title: 'Share Report',
            failOnCancel: false,
        });
        expect(result).toBe(true);
    });

    it('returns false when share dialog throws', async () => {
        const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => { });
        Share.open.mockRejectedValue(new Error('Share unavailable'));

        const result = await shareFileUri('file:///tmp/cache/report.csv');

        expect(result).toBe(false);
        expect(warnSpy).toHaveBeenCalled();
        warnSpy.mockRestore();
    });
});
