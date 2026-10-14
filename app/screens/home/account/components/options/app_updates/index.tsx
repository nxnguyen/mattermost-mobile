// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
import React, {useCallback, useState} from 'react';
import {defineMessages, useIntl} from 'react-intl';
import {Alert} from 'react-native';

import OptionItem from '@components/option_item';
import {checkAndStageUpdate, restartForUpdate} from '@utils/ota';

const messages = defineMessages({
    ready: {id: 'amobi.updates.ready', defaultMessage: 'An update is ready. Restart Amobi Collab to apply it.'},
    later: {id: 'amobi.updates.later', defaultMessage: 'Later'},
    restart: {id: 'amobi.updates.restart', defaultMessage: 'Restart'},
    restartFailed: {id: 'amobi.updates.restart_failed', defaultMessage: 'Restart the app to apply the update.'},
    current: {id: 'amobi.updates.current', defaultMessage: 'Amobi Collab is up to date.'},
    development: {id: 'amobi.updates.development', defaultMessage: 'App updates are unavailable during development.'},
    failed: {id: 'amobi.updates.failed', defaultMessage: 'Could not check for updates. Please try again.'},
    checking: {id: 'amobi.updates.checking', defaultMessage: 'Checking for updates…'},
    check: {id: 'amobi.updates.check', defaultMessage: 'Check for updates'},
});

export default function AppUpdates() {
    const {formatMessage} = useIntl();
    const [checking, setChecking] = useState(false);
    const title = 'Amobi Collab';
    const checkUpdates = useCallback(async () => {
        setChecking(true);
        const result = await checkAndStageUpdate();
        setChecking(false);
        if (result === 'ready') {
            Alert.alert(title, formatMessage(messages.ready), [
                {text: formatMessage(messages.later), style: 'cancel'},
                {text: formatMessage(messages.restart),
                    onPress: () => {
                        restartForUpdate().catch(() => Alert.alert(title, formatMessage(messages.restartFailed)));
                    }},
            ]);
        } else if (result === 'current') {
            Alert.alert(title, formatMessage(messages.current));
        } else if (result === 'development') {
            Alert.alert(title, formatMessage(messages.development));
        } else {
            Alert.alert(title, formatMessage(messages.failed));
        }
    }, [formatMessage]);

    return (
        <OptionItem
            action={checkUpdates}
            disabled={checking}
            icon='refresh'
            label={checking ? formatMessage(messages.checking) : formatMessage(messages.check)}
            testID='account.amobi.updates'
            type='default'
        />
    );
}
