// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {router} from 'expo-router';
import React, {useCallback} from 'react';
import {defineMessages, useIntl} from 'react-intl';

import LocalConfig from '@assets/config.json';
import OptionItem from '@components/option_item';
import {usePreventDoubleTap} from '@hooks/utils';
import {tryOpenURL} from '@utils/url';

const messages = defineMessages({
    kanban: {id: 'amobi.workspace.kanban', defaultMessage: 'Kanban'},
    git: {id: 'amobi.workspace.git', defaultMessage: 'Git repositories'},
});

function WorkspaceLinks() {
    const {formatMessage} = useIntl();
    const gitUrl = `${LocalConfig.GitServerUrl}/amobi/`;

    const openKanban = usePreventDoubleTap(useCallback(() => {
        router.push('/(authenticated)/kanban');
    }, []));
    const openGit = usePreventDoubleTap(useCallback(() => {
        tryOpenURL(gitUrl);
    }, [gitUrl]));

    return (
        <>
            <OptionItem
                action={openKanban}
                icon='product-boards'
                label={formatMessage(messages.kanban)}
                testID='account.amobi.kanban'
                type='default'
            />
            <OptionItem
                action={openGit}
                icon='source-branch'
                label={formatMessage(messages.git)}
                testID='account.amobi.git'
                type='default'
            />
        </>
    );
}

export default WorkspaceLinks;
