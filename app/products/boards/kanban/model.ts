// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {generateId} from '@utils/general';

import type {CardChanges, DescriptionUpdate, FocalboardBlock, FocalboardBlockPatch, FocalboardBoard, FocalboardBoardMember, FocalboardProperty, KanbanColumn} from './types';

const getBoardView = (board: FocalboardBoard, blocks: FocalboardBlock[]) => blocks.find((block) => (
    block.boardId === board.id && !block.deleteAt && block.type === 'view' && block.fields.viewType === 'board'
));

export function getStatusProperty(board: FocalboardBoard, blocks: FocalboardBlock[]): FocalboardProperty | undefined {
    const groupById = getBoardView(board, blocks)?.fields.groupById;
    const selects = board.cardProperties.filter((property) => property.type === 'select');
    return selects.find((property) => property.id === groupById) ??
        selects.find((property) => property.name.toLowerCase() === 'status') ?? selects[0];
}

export function getKanbanColumns(board: FocalboardBoard, blocks: FocalboardBlock[]): KanbanColumn[] {
    const property = getStatusProperty(board, blocks);
    const view = getBoardView(board, blocks);
    const options = property?.options ?? [];
    const requestedOrder = [...(view?.fields.columnOrder ?? []), ...(view?.fields.visibleOptionIds ?? []), ...(view?.fields.hiddenOptionIds ?? [])];
    const orderedIds = [...new Set([...requestedOrder, ...options.map((option) => option.id), ''])];
    const unsorted: KanbanColumn = {id: '', title: '', cards: []};
    const columns: KanbanColumn[] = orderedIds.flatMap((id) => {
        if (id === '') {
            return [unsorted];
        }
        const option = options.find((candidate) => candidate.id === id);
        return option ? [{id: option.id, title: option.value, ...(option.color && {color: option.color}), cards: []}] : [];
    });
    const cardOrder = new Map((view?.fields.cardOrder ?? []).map((id, index) => [id, index]));
    const cards = blocks.filter((block) => block.boardId === board.id && block.type === 'card' && !block.deleteAt && !block.fields.isTemplate);
    cards.sort((first, second) => (cardOrder.get(first.id) ?? Number.MAX_SAFE_INTEGER) - (cardOrder.get(second.id) ?? Number.MAX_SAFE_INTEGER));
    for (const card of cards) {
        const status = property ? card.fields.properties?.[property.id] : undefined;
        const column = columns.find((candidate) => candidate.id === status);
        (column ?? unsorted).cards.push(card);
    }
    return columns;
}

export function canEditBoard(board: FocalboardBoard, memberships: FocalboardBoardMember[], userId: string): boolean {
    if (!userId || board.deleteAt || board.isTemplate) {
        return false;
    }
    const member = memberships.find((candidate) => candidate.boardId === board.id && candidate.userId === userId);

    // Match server/services/permissions/mmpermissions: membership is required.
    // Administrative team permissions cannot be inferred from a board response.
    return Boolean(member && (member.schemeAdmin === true || member.schemeEditor === true || member.minimumRole === 'admin' || member.minimumRole === 'editor'));
}

function getDescriptionBlocks(card: FocalboardBlock, blocks: FocalboardBlock[]): FocalboardBlock[] {
    const order = new Map((card.fields.contentOrder ?? []).flat().map((id, index) => [id, index]));
    return blocks.filter((block) => block.boardId === card.boardId && block.parentId === card.id && block.type === 'text' && !block.deleteAt).
        sort((first, second) => (order.get(first.id) ?? Number.MAX_SAFE_INTEGER) - (order.get(second.id) ?? Number.MAX_SAFE_INTEGER));
}

export function getCardDescription(card: FocalboardBlock, blocks: FocalboardBlock[]): string {
    return getDescriptionBlocks(card, blocks).map((block) => block.title).join('\n\n');
}

// A single native text block can be edited without flattening a rich description.
export function canEditCardDescription(card: FocalboardBlock, blocks: FocalboardBlock[]): boolean {
    return getDescriptionBlocks(card, blocks).length <= 1;
}

function createBlock(boardId: string, userId: string, type: string, title: string, parentId = ''): FocalboardBlock {
    const now = Date.now();
    return {

        // POST remaps IDs; callers must use the blocks returned by the server.
        id: `b${generateId().replace(/-/g, '').slice(0, 26)}`,
        boardId,
        parentId,
        title,
        type,
        schema: 1,
        fields: {},
        createdBy: userId,
        modifiedBy: userId,
        createAt: now,
        updateAt: now,
        deleteAt: 0,
    };
}

export function createCardBlocks(boardId: string, userId: string, title: string, statusPropertyId: string, statusId: string, description: string): FocalboardBlock[] {
    if (!title.trim()) {
        throw new Error('A card title is required.');
    }
    const card = createBlock(boardId, userId, 'card', title.trim());
    card.fields = {properties: statusPropertyId ? {[statusPropertyId]: statusId} : {}, contentOrder: []};
    if (!description) {
        return [card];
    }
    const text = createBlock(boardId, userId, 'text', description, card.id);
    card.fields.contentOrder = [text.id];
    return [card, text];
}

export function buildCardPatch(card: FocalboardBlock, changes: CardChanges): FocalboardBlockPatch {
    const patch: FocalboardBlockPatch = {};
    if (changes.title !== undefined && changes.title.trim() !== card.title) {
        if (!changes.title.trim()) {
            throw new Error('A card title is required.');
        }
        patch.title = changes.title.trim();
    }
    if (changes.status && card.fields.properties?.[changes.status.propertyId] !== changes.status.optionId) {
        patch.updatedFields = {properties: {...card.fields.properties, [changes.status.propertyId]: changes.status.optionId}};
    }
    if (changes.contentOrder !== undefined && JSON.stringify(changes.contentOrder) !== JSON.stringify(card.fields.contentOrder ?? [])) {
        patch.updatedFields = {...patch.updatedFields, contentOrder: changes.contentOrder.map((row) => (Array.isArray(row) ? [...row] : row))};
    }
    return patch;
}

export function buildDescriptionUpdate(card: FocalboardBlock, blocks: FocalboardBlock[], description: string, userId: string): DescriptionUpdate {
    const existing = getDescriptionBlocks(card, blocks);
    if (existing.length > 1) {
        throw new Error('Edit this description in the full board editor.');
    }
    const update: DescriptionUpdate = {blocks: [], patches: [], cardPatch: {}};
    if (existing[0]) {
        if (existing[0].title !== description) {
            update.patches.push({blockId: existing[0].id, patch: {title: description}});
        }
        return update;
    }
    if (!description) {
        return update;
    }
    const text = createBlock(card.boardId, userId, 'text', description, card.id);
    update.blocks.push(text);

    // Replace text.id with the POST response ID before applying this patch.
    update.cardPatch = buildCardPatch(card, {contentOrder: [...(card.fields.contentOrder ?? []), text.id]});
    return update;
}
