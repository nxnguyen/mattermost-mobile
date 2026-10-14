// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
import {checkAndStageUpdate, hotUpdater, restartForUpdate} from './index';

describe('Amobi Collab app updates', () => {
    const originalDev = __DEV__;
    const globalWithDev = global as typeof global & {__DEV__: boolean};
    const check = jest.mocked(hotUpdater.checkForUpdate);
    const downloaded = jest.mocked(hotUpdater.isUpdateDownloaded);
    const reload = jest.mocked(hotUpdater.reload);

    beforeEach(() => {
        globalWithDev.__DEV__ = false;
        check.mockReset().mockResolvedValue(null);
        downloaded.mockReset().mockReturnValue(false);
        reload.mockClear();
    });

    afterAll(() => {
        globalWithDev.__DEV__ = originalDev;
    });

    const makeUpdate = (updateBundle = jest.fn().mockResolvedValue(true)) => ({
        id: '01929f2a-1d5e-7b8c-a3f6-4c9e2b7d0f18',
        message: null,
        rolloutCohortCount: 1000,
        shouldForceUpdate: false,
        status: 'UPDATE' as const,
        targetCohorts: [],
        updateBundle,
    });

    it('checks native fingerprint and reports a successful empty catalog', async () => {
        expect(await checkAndStageUpdate()).toBe('current');
        expect(check).toHaveBeenCalledWith(expect.objectContaining({updateStrategy: 'fingerprint'}));
    });

    it('does not report up to date when the SDK reports a check error', async () => {
        check.mockImplementation(async (options) => {
            options.onError?.(new Error('network unavailable'));
            return null;
        });
        expect(await checkAndStageUpdate()).toBe('failed');
    });

    it('stages an update without restarting the current chat session', async () => {
        const update = makeUpdate();
        check.mockResolvedValue(update);
        expect(await checkAndStageUpdate()).toBe('ready');
        expect(update.updateBundle).toHaveBeenCalledTimes(1);
        expect(reload).not.toHaveBeenCalled();
    });

    it('reports failed downloads and rejected verification', async () => {
        check.mockResolvedValue(makeUpdate(jest.fn().mockResolvedValue(false)));
        expect(await checkAndStageUpdate()).toBe('failed');
        check.mockResolvedValue(makeUpdate(jest.fn().mockRejectedValue(new Error('invalid signature'))));
        expect(await checkAndStageUpdate()).toBe('failed');
    });

    it('shares a concurrent startup and manual check', async () => {
        const first = checkAndStageUpdate();
        const second = checkAndStageUpdate();
        expect(first).toBe(second);
        await first;
        expect(check).toHaveBeenCalledTimes(1);
    });

    it('keeps a downloaded bundle ready for an explicit restart', async () => {
        downloaded.mockReturnValue(true);
        expect(await checkAndStageUpdate()).toBe('ready');
        expect(check).not.toHaveBeenCalled();
        await restartForUpdate();
        expect(reload).toHaveBeenCalledTimes(1);
    });

    it('skips OTA checks in development', async () => {
        globalWithDev.__DEV__ = true;
        expect(await checkAndStageUpdate()).toBe('development');
        expect(check).not.toHaveBeenCalled();
    });
});
