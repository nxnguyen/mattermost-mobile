// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase, withObservables} from '@nozbe/watermelondb/react';
import {router} from 'expo-router';
import React, {useCallback} from 'react';
import {defineMessages, useIntl} from 'react-intl';

import LocalConfig from '@assets/config.json';
import OptionItem from '@components/option_item';
import {usePreventDoubleTap} from '@hooks/utils';
import {observeCurrentTeam} from '@queries/servers/team';
import {tryOpenURL} from '@utils/url';

import type {WithDatabaseArgs} from '@typings/database/database';
import type TeamModel from '@typings/database/models/servers/team';

const messages = defineMessages({
    kanban: {id: 'amobi.workspace.kanban', defaultMessage: 'Kanban'},
    git: {id: 'amobi.workspace.git', defaultMessage: 'Git repositories'},
});

function WorkspaceLinks({team}: {team?: TeamModel}) {
    const {formatMessage} = useIntl();
    const groupId = team?.name.match(/^bitrix-(\d+)$/)?.[1] || team?.description?.match(/Bitrix24 project #(\d+)/i)?.[1];
    const gitUrl = `${LocalConfig.GitServerUrl}/amobi${groupId ? `/bitrix-${groupId}` : ''}`;

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

const enhanced = withObservables([], ({database}: WithDatabaseArgs) => ({team: observeCurrentTeam(database)}));
export default withDatabase(enhanced(WorkspaceLinks));
