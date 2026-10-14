// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
import {HotUpdater, insights} from '@hot-updater/react-native';

import {logInfo, logWarning} from '@utils/log';

import config from '../../../ota/client.json';

export const hotUpdater = HotUpdater.init({
    baseURL: config.baseURL,
    requestHeaders: {'x-api-key': config.apiKey},
    requestTimeout: 15000,
    plugins: [insights()],

    // Errors may contain signed download URLs. Keep them out of device logs.
    onError: () => logWarning('Amobi Collab update failed'),
    onNotifyAppReady: (result) => logInfo('Amobi Collab update launch', result.status),
});

export type UpdateCheckStatus = 'ready' | 'current' | 'failed' | 'development';

let inFlightCheck: Promise<UpdateCheckStatus> | undefined;

async function stageUpdate(): Promise<UpdateCheckStatus> {
    if (__DEV__) {
        return 'development';
    }
    if (hotUpdater.isUpdateDownloaded()) {
        return 'ready';
    }
    try {
        let checkFailed = false;
        const update = await hotUpdater.checkForUpdate({
            updateStrategy: 'fingerprint',
            onError: () => {
                checkFailed = true;
                logWarning('Amobi Collab update check failed');
            },
        });
        if (!update) {
            return checkFailed ? 'failed' : 'current';
        }

        // Stage every update for the next start; restarting is the user's choice.
        return await update.updateBundle() ? 'ready' : 'failed';
    } catch {
        logWarning('Amobi Collab update download failed');
        return 'failed';
    }
}

export function checkAndStageUpdate(): Promise<UpdateCheckStatus> {
    if (!inFlightCheck) {
        inFlightCheck = stageUpdate().finally(() => {
            inFlightCheck = undefined;
        });
    }
    return inFlightCheck;
}

export async function restartForUpdate() {
    await hotUpdater.reload();
}
