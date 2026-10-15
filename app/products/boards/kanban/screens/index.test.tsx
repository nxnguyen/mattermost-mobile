// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {router} from 'expo-router';
import React from 'react';
import {BackHandler} from 'react-native';

import {Screens} from '@constants';
import ServerUrlProvider from '@context/server';
import NetworkManager from '@managers/network_manager';
import * as NavigationStore from '@store/navigation_store';
import {act, fireEvent, renderWithIntlAndTheme, waitFor} from '@test/intl-test-helper';

import {KanbanScreen} from './index';

import type {FocalboardBlock, FocalboardBoard} from '../types';

const board = (teamId: string): FocalboardBoard => ({id: `board-${teamId}`, teamId, title: `Board ${teamId}`, type: 'P', minimumRole: 'viewer', cardProperties: [{id: 'status', name: 'Status', type: 'select', options: [{id: 'todo', value: 'Todo'}]}]});
function screen(teamId: string) {
    return (
        <ServerUrlProvider server={{url: 'server', displayName: 'Server'}}>
            <KanbanScreen
                team={{id: teamId, displayName: `Project ${teamId}`}}
                user={{id: 'user'}}
            />
        </ServerUrlProvider>
    );
}
function setup() {
    const client = {
        getFocalboardBoards: jest.fn(async (id: string) => [board(id)]),
        getFocalboardBoard: jest.fn(async (id: string) => board(id.replace('board-', ''))),
        getFocalboardBlocks: jest.fn<Promise<FocalboardBlock[]>, [string]>().mockResolvedValue([]),
        getFocalboardMyMemberships: jest.fn().mockResolvedValue(['one', 'two'].map((id) => ({boardId: `board-${id}`, userId: 'user', schemeEditor: true}))),
        insertFocalboardBlocks: jest.fn<Promise<FocalboardBlock[]>, [string, FocalboardBlock[]]>().mockResolvedValue([]),
    };
    jest.spyOn(NetworkManager, 'getClient').mockReturnValue(client as unknown as ReturnType<typeof NetworkManager.getClient>);
    return client;
}

afterEach(() => jest.restoreAllMocks());

describe('native Kanban project context', () => {
    it('discards the previous project draft when the active project changes', async () => {
        setup();
        const view = renderWithIntlAndTheme(screen('one'));
        await waitFor(() => expect(view.getByTestId('kanban.column.todo.add')).toBeTruthy());
        fireEvent.press(view.getByTestId('kanban.column.todo.add'));
        fireEvent.changeText(view.getByTestId('kanban.editor.title'), 'Project one draft');
        view.rerender(screen('two'));
        await waitFor(() => expect(view.getByText('Board two')).toBeTruthy());
        expect(view.queryByTestId('kanban.editor.title')).toBeNull();
        fireEvent.press(view.getByTestId('kanban.column.todo.add'));
        expect(view.getByTestId('kanban.editor.title').props.value).toBe('');
    });

    it('opens a viewer card without editing or deletion controls', async () => {
        const client = setup();
        client.getFocalboardMyMemberships.mockResolvedValue([{boardId: 'board-one', userId: 'user', schemeViewer: true}]);
        client.getFocalboardBlocks.mockResolvedValue([{id: 'card', boardId: 'board-one', parentId: '', schema: 1, type: 'card', title: 'Read only card', fields: {properties: {status: 'todo'}}, createdBy: 'user', modifiedBy: 'user', createAt: 1, updateAt: 1, deleteAt: 0}]);
        const view = renderWithIntlAndTheme(screen('one'));
        await waitFor(() => expect(view.getByTestId('kanban.read_only')).toBeTruthy());
        expect(view.queryByTestId('kanban.column.todo.add')).toBeNull();
        fireEvent.press(view.getByTestId('kanban.card.card'));
        expect(view.getByTestId('kanban.editor.title').props.editable).toBe(false);
        expect(view.queryByTestId('kanban.editor.save')).toBeNull();
        expect(view.queryByTestId('kanban.editor.delete')).toBeNull();
    });

    it('shows a failed load and recovers when the user reloads', async () => {
        const client = setup();
        client.getFocalboardBoard.mockRejectedValueOnce(new Error('offline'));
        const view = renderWithIntlAndTheme(screen('one'));
        await waitFor(() => expect(view.getByTestId('kanban.error')).toBeTruthy());
        expect(view.queryByTestId('kanban.columns')).toBeNull();
        fireEvent.press(view.getByTestId('kanban.reload'));
        await waitFor(() => expect(view.getByTestId('kanban.columns')).toBeTruthy());
        expect(view.queryByTestId('kanban.error')).toBeNull();
    });

    it('keeps the new project visible when a previous project save finishes late', async () => {
        const client = setup();
        let finish: (blocks: FocalboardBlock[]) => void = () => {};
        client.insertFocalboardBlocks.mockReturnValue(new Promise((resolve) => {
            finish = resolve;
        }));
        const view = renderWithIntlAndTheme(screen('one'));
        await waitFor(() => expect(view.getByTestId('kanban.column.todo.add')).toBeTruthy());
        fireEvent.press(view.getByTestId('kanban.column.todo.add'));
        fireEvent.changeText(view.getByTestId('kanban.editor.title'), 'Project one card');
        fireEvent.press(view.getByTestId('kanban.editor.save'));
        await waitFor(() => expect(client.insertFocalboardBlocks).toHaveBeenCalledTimes(1));
        view.rerender(screen('two'));
        await waitFor(() => expect(view.getByText('Board two')).toBeTruthy());
        await act(async () => {
            finish([]);
        });
        expect(view.getByText('Board two')).toBeTruthy();
        expect(view.queryByTestId('kanban.editor.title')).toBeNull();
        expect(client.insertFocalboardBlocks.mock.calls[0][0]).toBe('board-one');
    });

    it('consumes hardware Back on Kanban and returns through the app navigator', async () => {
        setup();
        jest.spyOn(NavigationStore, 'useCurrentScreen').mockReturnValue('kanban');
        const remove = jest.fn();
        const listener = jest.spyOn(BackHandler, 'addEventListener').mockReturnValue({remove});
        const view = renderWithIntlAndTheme(screen('one'));
        await waitFor(() => expect(view.getByTestId('kanban.columns')).toBeTruthy());

        expect(listener).toHaveBeenCalledWith('hardwareBackPress', expect.any(Function));
        expect(listener.mock.calls[0][1]()).toBe(true);
        expect(router.back).toHaveBeenCalledTimes(1);

        view.unmount();
        expect(remove).toHaveBeenCalledTimes(1);
    });

    it('does not intercept hardware Back while a different screen is visible', async () => {
        setup();
        jest.spyOn(NavigationStore, 'useCurrentScreen').mockReturnValue(Screens.ACCOUNT);
        const listener = jest.spyOn(BackHandler, 'addEventListener');
        const view = renderWithIntlAndTheme(screen('one'));
        await waitFor(() => expect(view.getByTestId('kanban.columns')).toBeTruthy());

        expect(listener).toHaveBeenCalledWith('hardwareBackPress', expect.any(Function));
        expect(listener.mock.calls[0][1]()).toBe(false);
        expect(router.back).not.toHaveBeenCalled();
    });
});
