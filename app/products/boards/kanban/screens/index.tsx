// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase, withObservables} from '@nozbe/watermelondb/react';
import React from 'react';

import {Screens} from '@constants';
import {useServerUrl} from '@context/server';
import useAndroidHardwareBackHandler from '@hooks/android_back_handler';
import {observeCurrentTeam} from '@queries/servers/team';
import {observeCurrentUser} from '@queries/servers/user';
import {navigateBack} from '@screens/navigation';

import KanbanWorkspace, {type WorkspaceProps} from './workspace';

import type {WithDatabaseArgs} from '@typings/database/database';

export function KanbanScreen({team, user}: Omit<WorkspaceProps, 'serverUrl'>) {
    const serverUrl = useServerUrl();
    useAndroidHardwareBackHandler(Screens.KANBAN, navigateBack);

    // Drafts, requests and responses belong to exactly one server/project/user.
    // A context change disposes the old workspace before mounting the new one.
    return (
        <KanbanWorkspace
            key={`${serverUrl}:${team?.id}:${user?.id}`}
            serverUrl={serverUrl}
            team={team}
            user={user}
        />
    );
}

const enhanced = withObservables([], ({database}: WithDatabaseArgs) => ({team: observeCurrentTeam(database), user: observeCurrentUser(database)}));
export default withDatabase(enhanced(KanbanScreen));
