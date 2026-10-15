// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import NetworkManager from '@managers/network_manager';
import {isErrorWithStatusCode} from '@utils/errors';

import {buildCardPatch, buildDescriptionUpdate, canEditBoard, canEditCardDescription, createCardBlocks, getCardDescription, getStatusProperty} from './model';

import type {FocalboardBlock, FocalboardBlockPatch, FocalboardBoard} from './types';

type CardDraft = {title: string; description: string; statusId: string};
type SaveError = 'emptyTitle' | 'permissionDenied' | 'changed' | 'saveFailed';

const denied = (cause: unknown) => isErrorWithStatusCode(cause) && (cause.status_code === 401 || cause.status_code === 403);

/** Read fresh board permissions and fields before every mutation. The server remains authoritative. */
export async function saveCard(serverUrl: string, board: FocalboardBoard, initialBlocks: FocalboardBlock[], userId: string, cardId: string | undefined, original: CardDraft, draft: CardDraft): Promise<SaveError | undefined> {
    if (!draft.title.trim()) {
        return 'emptyTitle';
    }
    let insertedChild: {id: string; parentId: string; snapshot: string} | undefined;
    try {
        const client = NetworkManager.getClient(serverUrl);
        const [freshBoard, memberships, blocks] = await Promise.all([
            client.getFocalboardBoard(board.id), client.getFocalboardMyMemberships(), client.getFocalboardBlocks(board.id),
        ]);
        if (!canEditBoard(freshBoard, memberships, userId)) {
            return 'permissionDenied';
        }
        const status = getStatusProperty(freshBoard, blocks);
        if ((!status && draft.statusId !== original.statusId) || (status && (!cardId || draft.statusId !== original.statusId) && draft.statusId && !status.options?.some((option) => option.id === draft.statusId))) {
            return 'changed';
        }
        if (!cardId) {
            await client.insertFocalboardBlocks(board.id, createCardBlocks(board.id, userId, draft.title.trim(), status?.id ?? '', draft.statusId, draft.description));
            return undefined;
        }
        const card = blocks.find((block) => block.id === cardId && !block.deleteAt);
        const initial = initialBlocks.find((block) => block.id === cardId);
        if (!card || !initial || card.updateAt !== initial.updateAt) {
            return 'changed';
        }
        const descriptionChanged = draft.description !== original.description;
        if (descriptionChanged && (!canEditCardDescription(card, blocks) || getCardDescription(card, blocks) !== original.description)) {
            return 'changed';
        }
        const patch = buildCardPatch(card, {
            ...(draft.title !== original.title && {title: draft.title.trim()}),
            ...(status && draft.statusId !== original.statusId && {status: {propertyId: status.id, optionId: draft.statusId}}),
        });
        let childPatches: Array<{blockId: string; patch: FocalboardBlockPatch}> = [];
        if (descriptionChanged) {
            const description = buildDescriptionUpdate(card, blocks, draft.description, userId);
            childPatches = description.patches;
            if (description.blocks.length) {
                // POST rewrites provisional IDs. Attach the actual response ID to the card.
                const created = await client.insertFocalboardBlocks(board.id, description.blocks);
                const text = created.find((block) => block.type === 'text' && block.parentId === card.id);
                if (!text) {
                    return 'saveFailed';
                }
                insertedChild = {id: text.id, parentId: card.id, snapshot: JSON.stringify(text)};
                const temporaryId = description.blocks[0].id;
                const order = description.cardPatch.updatedFields?.contentOrder?.map((entry) => {
                    const mapId = (id: string) => (id === temporaryId ? text.id : id);
                    return Array.isArray(entry) ? entry.map(mapId) : mapId(entry);
                });
                description.cardPatch = buildCardPatch(card, {contentOrder: order});
            }
            patch.updatedFields = {...patch.updatedFields, ...description.cardPatch.updatedFields};
        }
        const updates = [...childPatches];
        if (patch.title !== undefined || (patch.updatedFields && Object.keys(patch.updatedFields).length)) {
            updates.push({blockId: card.id, patch});
        }
        if (updates.length) {
            // Official batch PATCH commits existing text, title and status in one change set.
            await client.patchFocalboardBlocks(board.id, updates);
        }
        return undefined;
    } catch (cause) {
        if (insertedChild) {
            try {
                const client = NetworkManager.getClient(serverUrl);
                const blocks = await client.getFocalboardBlocks(board.id);
                const childId = insertedChild.id;
                const child = blocks.find((block) => block.id === childId && block.parentId === insertedChild?.parentId && !block.deleteAt);
                const referenced = blocks.some((block) => (block.fields.contentOrder ?? []).flat().includes(childId));
                if (child && !referenced && JSON.stringify(child) === insertedChild.snapshot) {
                    await client.deleteFocalboardBlock(board.id, childId);
                }
            } catch {
                // A disconnected or revoked client cannot safely compensate. Keep the
                // draft and report failure; never delete text whose attachment is unknown.
            }
        }
        return denied(cause) ? 'permissionDenied' : 'saveFailed';
    }
}

export async function deleteCard(serverUrl: string, boardId: string, userId: string, cardId: string): Promise<'permissionDenied' | 'deleteFailed' | undefined> {
    try {
        const client = NetworkManager.getClient(serverUrl);
        const [board, memberships] = await Promise.all([client.getFocalboardBoard(boardId), client.getFocalboardMyMemberships()]);
        if (!canEditBoard(board, memberships, userId)) {
            return 'permissionDenied';
        }

        // Focalboard deletes children of a card with this request as well.
        await client.deleteFocalboardBlock(boardId, cardId);
        return undefined;
    } catch (cause) {
        return denied(cause) ? 'permissionDenied' : 'deleteFailed';
    }
}
