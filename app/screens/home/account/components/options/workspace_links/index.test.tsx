// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {act, fireEvent, waitFor} from '@testing-library/react-native';
import {router} from 'expo-router';
import React from 'react';
import {Linking} from 'react-native';

import LocalConfig from '@assets/config.json';
import {setCurrentTeamId} from '@queries/servers/system';
import {renderWithEverything} from '@test/intl-test-helper';
import TestHelper from '@test/test_helper';

import WorkspaceLinks from './index';

import type {Database} from '@nozbe/watermelondb';

describe('Account workspace links', () => {
    const serverUrl = 'https://collab.example';
    let database: Database;

    beforeAll(async () => {
        const server = await TestHelper.setupServerDatabase(serverUrl);
        database = server.database;
        const team = TestHelper.fakeTeam({name: 'bitrix-48', description: 'Bitrix24 project #48'});
        await server.operator.handleTeam({teams: [team], prepareRecordsOnly: false});
        await setCurrentTeamId(server.operator, team.id);
    });

    beforeEach(() => {
        jest.clearAllMocks();
        jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined);
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    afterAll(async () => {
        await TestHelper.tearDown(serverUrl);
    });

    it('should open the Amobi Git organization while a migrated Bitrix project is selected', async () => {
        const {getByTestId} = renderWithEverything(<WorkspaceLinks/>, {database, serverUrl});
        await waitFor(() => expect(getByTestId('account.amobi.git')).toBeTruthy());

        await act(async () => {
            fireEvent.press(getByTestId('account.amobi.git'));
        });

        expect(Linking.openURL).toHaveBeenCalledWith(`${LocalConfig.GitServerUrl}/amobi/`);
    });

    it('should keep opening the native Kanban screen', async () => {
        const {getByTestId} = renderWithEverything(<WorkspaceLinks/>, {database, serverUrl});
        await waitFor(() => expect(getByTestId('account.amobi.kanban')).toBeTruthy());

        await act(async () => {
            fireEvent.press(getByTestId('account.amobi.kanban'));
        });

        expect(router.push).toHaveBeenCalledWith('/(authenticated)/kanban');
        expect(Linking.openURL).not.toHaveBeenCalled();
    });
});
