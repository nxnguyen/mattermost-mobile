// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import * as General from '@utils/general';

import {buildCardPatch, buildDescriptionUpdate, canEditBoard, canEditCardDescription, createCardBlocks, getCardDescription, getKanbanColumns, getStatusProperty} from './model';

import type {FocalboardBlock, FocalboardBoard, FocalboardBoardMember} from './types';

const board: FocalboardBoard = {
    id: 'board',
    teamId: 'team',
    title: 'Project',
    type: 'O',
    minimumRole: 'editor',
    cardProperties: [{id: 'status', name: 'Status', type: 'select', options: [{id: 'todo', value: 'To do'}, {id: 'done', value: 'Done'}, {id: 'review', value: 'Review'}]}],
};

const block = (id: string, overrides: Partial<FocalboardBlock> = {}): FocalboardBlock => ({
    id,
    boardId: board.id,
    parentId: '',
    title: id,
    type: 'card',
    fields: {},
    schema: 1,
    createdBy: 'user',
    modifiedBy: 'user',
    createAt: 1,
    updateAt: 1,
    deleteAt: 0,
    ...overrides,
});

describe('native Kanban model', () => {
    it('should honor the board view grouping property and order without losing unknown statuses', () => {
        const secondary = {id: 'priority', name: 'Priority', type: 'select', options: [{id: 'high', value: 'High'}]};
        const view = block('view', {type: 'view', fields: {viewType: 'board', groupById: 'priority'}});
        expect(getStatusProperty({...board, cardProperties: [...board.cardProperties, secondary]}, [view])).toEqual(secondary);

        const blocks = [
            block('view', {type: 'view', fields: {viewType: 'board', groupById: 'status', visibleOptionIds: ['done', 'todo'], cardOrder: ['second', 'first']}}),
            block('first', {fields: {properties: {status: 'todo'}}}),
            block('second', {fields: {properties: {status: 'todo'}}}),
            block('unsorted'),
            block('removed-option', {fields: {properties: {status: 'removed'}}}),
            block('deleted', {fields: {properties: {status: 'done'}}, deleteAt: 2}),
            block('template', {fields: {isTemplate: true}}),
            block('other-board', {boardId: 'elsewhere'}),
        ];
        const columns = getKanbanColumns(board, blocks);
        expect(columns.map((column) => column.id)).toEqual(['done', 'todo', 'review', '']);
        expect(columns[1].cards.map((card) => card.id)).toEqual(['second', 'first']);
        expect(columns[3].cards.map((card) => card.id)).toEqual(['unsorted', 'removed-option']);
        expect(columns.flatMap((column) => column.cards)).toHaveLength(4);
    });

    it('should keep cards visible when no select property or view exists', () => {
        const cards = [block('only')];
        expect(getStatusProperty({...board, cardProperties: []}, [])).toBeUndefined();
        expect(getKanbanColumns({...board, cardProperties: []}, cards)).toEqual([{id: '', title: '', cards}]);
    });

    it('should honor an explicitly ordered unsorted column and retain hidden status cards', () => {
        const view = block('view', {type: 'view', fields: {viewType: 'board', groupById: 'status', columnOrder: ['', 'done'], hiddenOptionIds: ['todo']}});
        const card = block('card', {fields: {properties: {status: 'todo'}}});
        const columns = getKanbanColumns(board, [view, card]);
        expect(columns.map((column) => column.id)).toEqual(['', 'done', 'todo', 'review']);
        expect(columns[2].cards).toEqual([card]);
    });

    it('should preserve unknown card properties and patch only changed fields', () => {
        const card = block('card', {fields: {properties: {status: 'todo', assignee: ['someone'], future: {nested: true}}, futureField: 'retained'}});
        expect(buildCardPatch(card, {title: 'New title', status: {propertyId: 'status', optionId: 'done'}})).toEqual({
            title: 'New title', updatedFields: {properties: {status: 'done', assignee: ['someone'], future: {nested: true}}},
        });
        expect(buildCardPatch(card, {title: card.title, status: {propertyId: 'status', optionId: 'todo'}})).toEqual({});
        expect(card.fields.properties?.status).toBe('todo');
        expect(card.fields.futureField).toBe('retained');
    });

    it('should create a card and native description child with linked content order', () => {
        const generateId = jest.spyOn(General, 'generateId').mockReturnValueOnce('12345678-1234-1234-1234-123456789012').mockReturnValueOnce('abcdefgh-abcd-abcd-abcd-abcdefghijkl');
        const created = createCardBlocks('board', 'author', '  New task  ', 'status', 'todo', 'Description');
        generateId.mockRestore();
        expect(created).toHaveLength(2);
        expect(created[0]).toMatchObject({boardId: 'board', parentId: '', title: 'New task', type: 'card', createdBy: 'author', fields: {properties: {status: 'todo'}, contentOrder: [created[1].id]}});
        expect(created[1]).toMatchObject({boardId: 'board', parentId: created[0].id, title: 'Description', type: 'text'});
        expect(created[0].id).not.toBe(created[1].id);
        expect(() => createCardBlocks('board', 'author', '   ', 'status', '', '')).toThrow();
    });

    it('should read descriptions in content order while ignoring comments and deleted children', () => {
        const card = block('card', {fields: {contentOrder: [['second', 'image'], 'first']}});
        const children = [
            block('first', {parentId: card.id, type: 'text', title: 'First'}),
            block('second', {parentId: card.id, type: 'text', title: 'Second'}),
            block('image', {parentId: card.id, type: 'image'}),
            block('comment', {parentId: card.id, type: 'comment'}),
            block('deleted', {parentId: card.id, type: 'text', deleteAt: 2}),
        ];
        expect(getCardDescription(card, children)).toBe('Second\n\nFirst');
        expect(canEditCardDescription(card, children)).toBe(false);
        expect(() => buildDescriptionUpdate(card, children, 'Replacement', 'user')).toThrow();
    });

    it('should update one text child without changing rich content, order, or comments', () => {
        const card = block('card', {fields: {contentOrder: [['text', 'image'], 'comment']}});
        const text = block('text', {parentId: card.id, type: 'text', title: 'Before', fields: {unknown: 42}});
        const image = block('image', {parentId: card.id, type: 'image'});
        const comment = block('comment', {parentId: card.id, type: 'comment'});
        const children = [text, image, comment];
        expect(buildDescriptionUpdate(card, children, 'After', 'user')).toEqual({blocks: [], patches: [{blockId: 'text', patch: {title: 'After'}}], cardPatch: {}});
        expect(buildDescriptionUpdate(card, children, 'Before', 'user')).toEqual({blocks: [], patches: [], cardPatch: {}});
        expect(card.fields.contentOrder).toEqual([['text', 'image'], 'comment']);
        expect(text.fields).toEqual({unknown: 42});
        expect(children).toHaveLength(3);
    });

    it('should append a missing description while retaining nested content order', () => {
        const card = block('card', {fields: {contentOrder: [['image', 'attachment']]}});
        const update = buildDescriptionUpdate(card, [], 'New description', 'user');
        expect(update.blocks).toHaveLength(1);
        expect(update.blocks[0]).toMatchObject({parentId: card.id, type: 'text', title: 'New description'});
        expect(update.cardPatch).toEqual({updatedFields: {contentOrder: [['image', 'attachment'], update.blocks[0].id]}});
        expect(card.fields.contentOrder).toEqual([['image', 'attachment']]);
    });

    it('should require membership and editor authority rather than a board default alone', () => {
        const member: FocalboardBoardMember = {boardId: 'board', userId: 'user', schemeViewer: true, minimumRole: 'viewer'};
        expect(canEditBoard(board, [], 'user')).toBe(false);
        expect(canEditBoard(board, [member], 'other')).toBe(false);
        expect(canEditBoard(board, [member], 'user')).toBe(false);
        expect(canEditBoard(board, [{...member, schemeCommenter: true}], 'user')).toBe(false);
        expect(canEditBoard(board, [{...member, schemeEditor: true}], 'user')).toBe(true);
        expect(canEditBoard(board, [{...member, minimumRole: 'editor', synthetic: true}], 'user')).toBe(true);
        expect(canEditBoard(board, [{...member, schemeAdmin: true}], 'user')).toBe(true);
    });
});
