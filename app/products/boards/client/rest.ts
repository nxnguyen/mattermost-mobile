// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import type {FocalboardBlock, FocalboardBlockPatch, FocalboardBoard, FocalboardBoardMember} from '../kanban/types';
import type ClientBase from '@client/rest/base';

const baseRoute = '/plugins/focalboard/api/v2';
const headers = {'X-Requested-With': 'XMLHttpRequest'};
const invalidResponse = () => new Error('Invalid board response.');
const isRecord = (value: unknown): value is Record<string, unknown> => Boolean(value && typeof value === 'object' && !Array.isArray(value));
const isStringArray = (value: unknown): value is string[] => Array.isArray(value) && value.every((item) => typeof item === 'string');

function parseArray<T>(value: unknown, parse: (item: unknown) => T): T[] {
    if (value === null) {
        return [];
    }
    if (!Array.isArray(value)) {
        throw invalidResponse();
    }
    return value.map(parse);
}

function parseBoard(value: unknown): FocalboardBoard {
    if (!isRecord(value) || ['id', 'teamId', 'title', 'type', 'minimumRole'].some((key) => typeof value[key] !== 'string')) {
        throw invalidResponse();
    }
    const cardProperties = parseArray(value.cardProperties ?? [], (property) => {
        if (!isRecord(property) || ['id', 'name', 'type'].some((key) => typeof property[key] !== 'string')) {
            throw invalidResponse();
        }
        const options = parseArray(property.options ?? [], (option) => {
            if (!isRecord(option) || typeof option.id !== 'string' || typeof option.value !== 'string' || (option.color !== undefined && typeof option.color !== 'string')) {
                throw invalidResponse();
            }
            return option;
        });
        return {...property, options};
    });
    return {...value, cardProperties} as FocalboardBoard;
}

function parseBlock(value: unknown): FocalboardBlock {
    if (!isRecord(value) || ['id', 'boardId', 'parentId', 'title', 'type'].some((key) => typeof value[key] !== 'string') ||
        ['schema', 'createAt', 'updateAt', 'deleteAt'].some((key) => typeof value[key] !== 'number') || !isRecord(value.fields)) {
        throw invalidResponse();
    }
    const fields = {...value.fields};
    for (const key of ['cardOrder', 'columnOrder', 'visibleOptionIds', 'hiddenOptionIds']) {
        if (fields[key] != null && !isStringArray(fields[key])) {
            throw invalidResponse();
        }
    }
    if (fields.properties != null && !isRecord(fields.properties)) {
        throw invalidResponse();
    }
    if (fields.contentOrder != null && (!Array.isArray(fields.contentOrder) || !fields.contentOrder.every((row) => typeof row === 'string' || isStringArray(row)))) {
        throw invalidResponse();
    }
    if (fields.viewType != null && typeof fields.viewType !== 'string') {
        throw invalidResponse();
    }
    if (fields.groupById != null && typeof fields.groupById !== 'string') {
        throw invalidResponse();
    }
    return {...value, fields} as FocalboardBlock;
}

function parseMember(value: unknown): FocalboardBoardMember {
    if (!isRecord(value) || typeof value.boardId !== 'string' || typeof value.userId !== 'string' ||
        ['minimumRole', 'roles'].some((key) => value[key] !== undefined && typeof value[key] !== 'string') ||
        ['schemeAdmin', 'schemeEditor', 'schemeCommenter', 'schemeViewer', 'synthetic'].some((key) => value[key] !== undefined && typeof value[key] !== 'boolean')) {
        throw invalidResponse();
    }
    return value as FocalboardBoardMember;
}

export interface ClientBoardsMix {
    getFocalboardBoards: (teamId: string) => Promise<FocalboardBoard[]>;
    getFocalboardBoard: (boardId: string) => Promise<FocalboardBoard>;
    getFocalboardBlocks: (boardId: string) => Promise<FocalboardBlock[]>;
    getFocalboardBoardMembers: (boardId: string) => Promise<FocalboardBoardMember[]>;
    getFocalboardMyMemberships: () => Promise<FocalboardBoardMember[]>;
    insertFocalboardBlocks: (boardId: string, blocks: FocalboardBlock[]) => Promise<FocalboardBlock[]>;
    patchFocalboardBlock: (boardId: string, blockId: string, patch: FocalboardBlockPatch) => Promise<void>;
    patchFocalboardBlocks: (boardId: string, updates: Array<{blockId: string; patch: FocalboardBlockPatch}>) => Promise<void>;
    deleteFocalboardBlock: (boardId: string, blockId: string) => Promise<void>;
}

const ClientBoards = <TBase extends Constructor<ClientBase>>(superclass: TBase) => class extends superclass {
    fetchFocalboard = async <T>(path: string, options: ClientOptions, parse: (value: unknown) => T, message: string): Promise<T> => {
        try {
            const response: unknown = await this.doFetch(`${baseRoute}${path}`, {...options, headers});
            return parse(response);
        } catch (error) {
            // Preserve actionable status codes, never backend payloads or URLs.
            const safeError: Error & {status_code?: number} = new Error(message);
            if (isRecord(error) && typeof error.status_code === 'number') {
                safeError.status_code = error.status_code;
            }
            throw safeError;
        }
    };

    getFocalboardBoards = (teamId: string): Promise<FocalboardBoard[]> => this.fetchFocalboard(
        `/teams/${encodeURIComponent(teamId)}/boards`, {method: 'get'}, (value) => parseArray(value, parseBoard), 'Could not load boards.',
    );

    getFocalboardBoard = (boardId: string): Promise<FocalboardBoard> => this.fetchFocalboard(
        `/boards/${encodeURIComponent(boardId)}`, {method: 'get'}, parseBoard, 'Could not load board.',
    );

    getFocalboardBlocks = (boardId: string): Promise<FocalboardBlock[]> => this.fetchFocalboard(
        `/boards/${encodeURIComponent(boardId)}/blocks?all=true`, {method: 'get'}, (value) => parseArray(value, parseBlock), 'Could not load board cards.',
    );

    getFocalboardBoardMembers = (boardId: string): Promise<FocalboardBoardMember[]> => this.fetchFocalboard(
        `/boards/${encodeURIComponent(boardId)}/members`, {method: 'get'}, (value) => parseArray(value, parseMember), 'Could not load board permissions.',
    );

    getFocalboardMyMemberships = (): Promise<FocalboardBoardMember[]> => this.fetchFocalboard(
        '/users/me/memberships', {method: 'get'}, (value) => parseArray(value, parseMember), 'Could not load board permissions.',
    );

    insertFocalboardBlocks = (boardId: string, blocks: FocalboardBlock[]): Promise<FocalboardBlock[]> => this.fetchFocalboard(
        `/boards/${encodeURIComponent(boardId)}/blocks`, {method: 'post', body: blocks}, (value) => parseArray(value, parseBlock), 'Could not create board card.',
    );

    patchFocalboardBlock = (boardId: string, blockId: string, patch: FocalboardBlockPatch): Promise<void> => this.fetchFocalboard(
        `/boards/${encodeURIComponent(boardId)}/blocks/${encodeURIComponent(blockId)}`, {method: 'patch', body: patch}, () => undefined, 'Could not update board card.',
    );

    patchFocalboardBlocks = (boardId: string, updates: Array<{blockId: string; patch: FocalboardBlockPatch}>): Promise<void> => this.fetchFocalboard(
        `/boards/${encodeURIComponent(boardId)}/blocks`, {method: 'patch', body: {block_ids: updates.map((update) => update.blockId), block_patches: updates.map((update) => update.patch)}}, () => undefined, 'Could not update board card.',
    );

    deleteFocalboardBlock = (boardId: string, blockId: string): Promise<void> => this.fetchFocalboard(
        `/boards/${encodeURIComponent(boardId)}/blocks/${encodeURIComponent(blockId)}`, {method: 'delete'}, () => undefined, 'Could not delete board card.',
    );
};

export default ClientBoards;
