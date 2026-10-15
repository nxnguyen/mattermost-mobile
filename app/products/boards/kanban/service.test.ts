// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import NetworkManager from '@managers/network_manager';

import {deleteCard, saveCard} from './service';

import type {FocalboardBlock, FocalboardBoard} from './types';

const board: FocalboardBoard = {id: 'board', teamId: 'team', title: 'Project', type: 'P', minimumRole: 'viewer', cardProperties: [{id: 'status', name: 'Status', type: 'select', options: [{id: 'todo', value: 'Todo'}, {id: 'done', value: 'Done'}]}]};
const card: FocalboardBlock = {id: 'card', boardId: 'board', parentId: '', schema: 1, type: 'card', title: 'Old', fields: {properties: {status: 'todo', unknown: 'preserve'}, contentOrder: ['text']}, createdBy: 'user', modifiedBy: 'user', createAt: 1, updateAt: 2, deleteAt: 0};
const text: FocalboardBlock = {...card, id: 'text', parentId: 'card', type: 'text', title: 'Description', fields: {}};
const original = {title: 'Old', description: 'Description', statusId: 'todo'};

function setup(role = 'editor', fresh = [card, text]) {
    const client = {
        getFocalboardBoard: jest.fn().mockResolvedValue(board),
        getFocalboardBlocks: jest.fn().mockResolvedValue(fresh),
        getFocalboardMyMemberships: jest.fn().mockResolvedValue([{boardId: 'board', userId: 'user', schemeEditor: role === 'editor', schemeViewer: role === 'viewer'}]),
        insertFocalboardBlocks: jest.fn().mockResolvedValue([]),
        patchFocalboardBlocks: jest.fn().mockResolvedValue(undefined),
        deleteFocalboardBlock: jest.fn().mockResolvedValue(undefined),
    };
    jest.spyOn(NetworkManager, 'getClient').mockReturnValue(client as unknown as ReturnType<typeof NetworkManager.getClient>);
    return client;
}

afterEach(() => jest.restoreAllMocks());

describe('native Kanban mutations', () => {
    it('rechecks permission before writing and keeps a viewer read only', async () => {
        const client = setup('viewer');
        expect(await saveCard('server', board, [card, text], 'user', 'card', original, {...original, title: 'Changed'})).toBe('permissionDenied');
        expect(client.patchFocalboardBlocks).not.toHaveBeenCalled();
    });

    it('refuses an edit when another writer changed the card', async () => {
        const client = setup('editor', [{...card, updateAt: 3}, text]);
        expect(await saveCard('server', board, [card, text], 'user', 'card', original, {...original, title: 'Changed'})).toBe('changed');
        expect(client.patchFocalboardBlocks).not.toHaveBeenCalled();
    });

    it('saves title, status and existing text in one patch without dropping other properties', async () => {
        const client = setup();
        expect(await saveCard('server', board, [card, text], 'user', 'card', original, {title: 'New', description: 'Edited', statusId: 'done'})).toBeUndefined();
        const updates = client.patchFocalboardBlocks.mock.calls[0][1];
        expect(updates).toHaveLength(2);
        expect(updates.find((update: {blockId: string}) => update.blockId === 'card').patch).toEqual({title: 'New', updatedFields: {properties: {status: 'done', unknown: 'preserve'}}});
        expect(updates.find((update: {blockId: string}) => update.blockId === 'text').patch).toEqual({title: 'Edited'});
    });

    it('keeps the draft when the network write fails', async () => {
        const client = setup();
        client.patchFocalboardBlocks.mockRejectedValue(new Error('offline'));
        expect(await saveCard('server', board, [card, text], 'user', 'card', original, {...original, title: 'New'})).toBe('saveFailed');
    });

    it('creates card and description together using the selected status', async () => {
        const client = setup();
        expect(await saveCard('server', board, [], 'user', undefined, {title: '', description: '', statusId: 'todo'}, {title: 'New card', description: 'New description', statusId: 'done'})).toBeUndefined();
        const inserted = client.insertFocalboardBlocks.mock.calls[0][1] as FocalboardBlock[];
        expect(inserted).toHaveLength(2);
        const newCard = inserted.find((block) => block.type === 'card');
        expect(newCard?.fields.properties).toEqual({status: 'done'});
        expect(inserted.find((block) => block.type === 'text')?.parentId).toBe(newCard?.id);
    });

    it('attaches the actual server-created description ID without replacing other content', async () => {
        const noText = {...card, fields: {...card.fields, contentOrder: ['image']}};
        const client = setup('editor', [noText]);
        client.insertFocalboardBlocks.mockResolvedValue([{...text, id: 'server-text'}]);
        const before = {...original, description: ''};
        expect(await saveCard('server', board, [noText], 'user', 'card', before, {...before, description: 'New'})).toBeUndefined();
        expect(client.patchFocalboardBlocks.mock.calls[0][1]).toEqual([{blockId: 'card', patch: {updatedFields: {contentOrder: ['image', 'server-text']}}}]);
    });

    it('cleans an unreferenced new description after its card patch fails', async () => {
        const noText = {...card, fields: {...card.fields, contentOrder: []}};
        const created = {...text, id: 'server-text'};
        const client = setup('editor', [noText]);
        client.insertFocalboardBlocks.mockResolvedValue([created]);
        client.patchFocalboardBlocks.mockRejectedValue(new Error('write failed'));
        client.getFocalboardBlocks.mockResolvedValueOnce([noText]).mockResolvedValue([noText, created]);
        const before = {...original, description: ''};
        expect(await saveCard('server', board, [noText], 'user', 'card', before, {...before, description: 'New'})).toBe('saveFailed');
        expect(client.deleteFocalboardBlock).toHaveBeenCalledWith('board', 'server-text');
    });

    it('preserves new text when the card patch applied but its response was lost', async () => {
        const noText = {...card, fields: {...card.fields, contentOrder: []}};
        const created = {...text, id: 'server-text'};
        const applied = {...card, fields: {...card.fields, contentOrder: ['server-text']}};
        const client = setup('editor', [noText]);
        client.insertFocalboardBlocks.mockResolvedValue([created]);
        client.patchFocalboardBlocks.mockRejectedValue(new Error('response lost'));
        client.getFocalboardBlocks.mockResolvedValueOnce([noText]).mockResolvedValue([applied, created]);
        const before = {...original, description: ''};
        expect(await saveCard('server', board, [noText], 'user', 'card', before, {...before, description: 'New'})).toBe('saveFailed');
        expect(client.deleteFocalboardBlock).not.toHaveBeenCalled();
    });

    it('preserves newly inserted text that a collaborator edited before compensation', async () => {
        const noText = {...card, fields: {...card.fields, contentOrder: []}};
        const created = {...text, id: 'server-text'};
        const edited = {...created, title: 'Collaborator text', updateAt: 3};
        const client = setup('editor', [noText]);
        client.insertFocalboardBlocks.mockResolvedValue([created]);
        client.patchFocalboardBlocks.mockRejectedValue(new Error('write failed'));
        client.getFocalboardBlocks.mockResolvedValueOnce([noText]).mockResolvedValue([noText, edited]);
        const before = {...original, description: ''};
        expect(await saveCard('server', board, [noText], 'user', 'card', before, {...before, description: 'New'})).toBe('saveFailed');
        expect(client.deleteFocalboardBlock).not.toHaveBeenCalled();
    });

    it('preserves an unknown existing status when only the title changes', async () => {
        const unknown = {...card, fields: {...card.fields, properties: {status: 'removed-option', other: 'keep'}}};
        const client = setup('editor', [unknown, text]);
        const before = {...original, statusId: 'removed-option'};
        expect(await saveCard('server', board, [unknown, text], 'user', 'card', before, {...before, title: 'Renamed'})).toBeUndefined();
        expect(client.patchFocalboardBlocks.mock.calls[0][1]).toEqual([{blockId: 'card', patch: {title: 'Renamed'}}]);
    });

    it('edits title and description on a board without a status property', async () => {
        const client = setup();
        client.getFocalboardBoard.mockResolvedValue({...board, cardProperties: []});
        const before = {...original, statusId: ''};
        expect(await saveCard('server', {...board, cardProperties: []}, [card, text], 'user', 'card', before, {...before, title: 'New', description: 'Edited'})).toBeUndefined();
        expect(client.patchFocalboardBlocks.mock.calls[0][1]).toHaveLength(2);
    });

    it('refuses deletion after editing permission is revoked', async () => {
        const client = setup('viewer');
        expect(await deleteCard('server', 'board', 'user', 'card')).toBe('permissionDenied');
        expect(client.deleteFocalboardBlock).not.toHaveBeenCalled();
    });
});
