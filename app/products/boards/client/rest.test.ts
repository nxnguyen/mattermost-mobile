// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import createBoardsClient from './rest';

import type ClientBase from '@client/rest/base';

const doFetch = jest.fn<Promise<unknown>, [string, ClientOptions]>();

class FetchClient {
    requestHeaders = {};
    doFetch = doFetch;
}

const BoardsClient = createBoardsClient(FetchClient as unknown as Constructor<ClientBase>);
const client = new BoardsClient();
const headers = {'X-Requested-With': 'XMLHttpRequest'};
const board = {id: 'board', teamId: 'team', title: 'Project', type: 'O', minimumRole: 'editor', cardProperties: []};

describe('Focalboard client', () => {
    beforeEach(() => {
        doFetch.mockReset();
    });

    it('should fetch team boards and board detail using authenticated per-request CSRF headers', async () => {
        doFetch.mockResolvedValueOnce([board]).mockResolvedValueOnce(board);
        expect(await client.getFocalboardBoards('team')).toEqual([board]);
        expect(await client.getFocalboardBoard('board')).toEqual(board);
        expect(doFetch.mock.calls).toEqual([
            ['/plugins/focalboard/api/v2/teams/team/boards', {method: 'get', headers}],
            ['/plugins/focalboard/api/v2/boards/board', {method: 'get', headers}],
        ]);
        expect(client.requestHeaders).toEqual({});
    });

    it('should request nested blocks and both membership endpoints without leaking IDs into URL segments', async () => {
        doFetch.mockResolvedValue([]);
        await client.getFocalboardBlocks('board/one');
        await client.getFocalboardBoardMembers('board/one');
        await client.getFocalboardMyMemberships();
        expect(doFetch.mock.calls).toEqual([
            ['/plugins/focalboard/api/v2/boards/board%2Fone/blocks?all=true', {method: 'get', headers}],
            ['/plugins/focalboard/api/v2/boards/board%2Fone/members', {method: 'get', headers}],
            ['/plugins/focalboard/api/v2/users/me/memberships', {method: 'get', headers}],
        ]);
    });

    it('should send server-native patch and delete requests', async () => {
        doFetch.mockResolvedValue({});
        const patch = {title: 'Edited', updatedFields: {properties: {status: 'done', unknown: 42}}};
        await client.patchFocalboardBlock('board', 'card', patch);
        await client.deleteFocalboardBlock('board', 'card');
        expect(doFetch.mock.calls).toEqual([
            ['/plugins/focalboard/api/v2/boards/board/blocks/card', {method: 'patch', headers, body: patch}],
            ['/plugins/focalboard/api/v2/boards/board/blocks/card', {method: 'delete', headers}],
        ]);
    });

    it('should batch existing block patches atomically using snake_case fields', async () => {
        doFetch.mockResolvedValue({});
        const updates = [{blockId: 'card', patch: {title: 'Edited'}}, {blockId: 'text', patch: {title: 'Description'}}];
        await client.patchFocalboardBlocks('board', updates);
        expect(doFetch).toHaveBeenCalledWith('/plugins/focalboard/api/v2/boards/board/blocks', {
            method: 'patch', headers, body: {block_ids: ['card', 'text'], block_patches: [{title: 'Edited'}, {title: 'Description'}]},
        });
    });

    it('should return server-assigned IDs after inserting a linked card and description', async () => {
        const card = {id: 'server-card', boardId: 'board', parentId: '', title: 'Task', type: 'card', fields: {contentOrder: ['server-text']}, schema: 1, createdBy: 'user', modifiedBy: 'user', createAt: 1, updateAt: 1, deleteAt: 0};
        const text = {...card, id: 'server-text', parentId: card.id, type: 'text', title: 'Description', fields: {}};
        doFetch.mockResolvedValue([card, text]);
        const submitted = [{...card, id: 'temporary-card'}, {...text, id: 'temporary-text'}];
        expect(await client.insertFocalboardBlocks('board', submitted)).toEqual([card, text]);
        expect(doFetch).toHaveBeenCalledWith('/plugins/focalboard/api/v2/boards/board/blocks', {method: 'post', headers, body: submitted});
    });

    it('should reject malformed responses and redact backend errors', async () => {
        doFetch.mockResolvedValueOnce([{id: 'broken'}]);
        await expect(client.getFocalboardBoards('team')).rejects.toThrow('Could not load boards.');
        doFetch.mockRejectedValueOnce(new Error('private server payload and credential'));
        await expect(client.getFocalboardBlocks('board')).rejects.toThrow('Could not load board cards.');
    });

    it('should accept null empty lists and reject malformed permission flags', async () => {
        doFetch.mockResolvedValueOnce(null).mockResolvedValueOnce([{boardId: 'board', userId: 'user', schemeEditor: 'true'}]);
        expect(await client.getFocalboardBoards('team')).toEqual([]);
        await expect(client.getFocalboardMyMemberships()).rejects.toThrow('Could not load board permissions.');
    });

    it('should retain the permission status code without returning backend error content', async () => {
        doFetch.mockRejectedValue(Object.assign(new Error('Private response'), {status_code: 403}));
        await expect(client.patchFocalboardBlock('board', 'card', {title: 'Edited'})).rejects.toMatchObject({status_code: 403, message: 'Could not update board card.'});
    });
});
