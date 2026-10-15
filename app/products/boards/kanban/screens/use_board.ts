// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {useCallback, useEffect, useRef, useState} from 'react';

import NetworkManager from '@managers/network_manager';
import {isErrorWithStatusCode} from '@utils/errors';

import {canEditBoard} from '../model';

import type {FocalboardBlock, FocalboardBoard} from '../types';

export type BoardData = {board: FocalboardBoard; blocks: FocalboardBlock[]; canEdit: boolean};

export function useBoard(serverUrl: string, teamId: string, teamTitle: string, userId: string) {
    const [boards, setBoards] = useState<FocalboardBoard[]>([]);
    const [data, setData] = useState<BoardData>();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<'loadFailed' | 'permissionDenied'>();
    const selected = useRef('');
    const sequence = useRef(0);

    const load = useCallback(async (boardId?: string) => {
        const requestId = ++sequence.current;
        setLoading(true);
        setError(undefined);
        if (!teamId || !userId) {
            setData(undefined);
            setBoards([]);
            setLoading(false);
            return;
        }
        try {
            const client = NetworkManager.getClient(serverUrl);
            const available = (await client.getFocalboardBoards(teamId)).filter((board) => !board.deleteAt && !board.isTemplate);
            const id = available.find((board) => board.id === boardId)?.id || available.find((board) => board.title === teamTitle)?.id || available[0]?.id;
            const next = id ? await Promise.all([
                client.getFocalboardBoard(id), client.getFocalboardBlocks(id), client.getFocalboardMyMemberships(),
            ]) : undefined;
            if (requestId !== sequence.current) {
                return;
            }
            selected.current = id || '';
            setBoards(available);
            setData(next ? {board: next[0], blocks: next[1], canEdit: canEditBoard(next[0], next[2], userId)} : undefined);
        } catch (cause) {
            if (requestId === sequence.current) {
                setError(isErrorWithStatusCode(cause) && (cause.status_code === 401 || cause.status_code === 403) ? 'permissionDenied' : 'loadFailed');
                setData(undefined);
            }
        } finally {
            if (requestId === sequence.current) {
                setLoading(false);
            }
        }
    }, [serverUrl, teamId, teamTitle, userId]);

    const invalidate = useCallback(() => {
        sequence.current++;
    }, []);

    useEffect(() => {
        selected.current = '';
        setBoards([]);
        setData(undefined);
        load();
        return invalidate;
    }, [load, invalidate]);

    const reload = useCallback(() => load(selected.current), [load]);
    const selectBoard = useCallback((boardId: string) => {
        setData(undefined);
        load(boardId);
    }, [load]);
    return {boards, data, loading, error, reload, selectBoard};
}
