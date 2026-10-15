// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useMemo, useState} from 'react';
import {useIntl} from 'react-intl';
import {Pressable, ScrollView, Text, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';

import Button from '@components/button';
import FormattedText from '@components/formatted_text';
import Loading from '@components/loading';
import {useTheme} from '@context/theme';
import {usePreventDoubleTap} from '@hooks/utils';

import {canEditCardDescription, getCardDescription, getKanbanColumns, getStatusProperty} from '../model';
import {saveCard, deleteCard} from '../service';

import BoardColumns from './board_columns';
import CardEditor, {type CardDraft, type CardEditorState} from './card_editor';
import {messages} from './messages';
import {getStyleSheet} from './styles';
import {useBoard} from './use_board';

import type {FocalboardBlock, FocalboardBoard} from '../types';
import type TeamModel from '@typings/database/models/servers/team';
import type UserModel from '@typings/database/models/servers/user';

const safeEdges = ['bottom'] as const;
function BoardChoice({board, selected, onSelect}: {board: FocalboardBoard; selected: boolean; onSelect: (id: string) => void}) {
    const styles = getStyleSheet(useTheme());
    const select = usePreventDoubleTap(useCallback(() => onSelect(board.id), [board.id, onSelect]));
    return (
        <Pressable
            accessibilityRole='button'
            accessibilityState={{selected}}
            onPress={select}
            style={({pressed}) => [styles.chip, selected && styles.selectedChip, pressed && styles.pressed]}
            testID={`kanban.board.${board.id}`}
        >
            <Text style={[styles.chipText, selected && styles.selectedText]}>{board.title}</Text>
        </Pressable>
    );
}

export type WorkspaceProps = {serverUrl: string; team?: Pick<TeamModel, 'id' | 'displayName'>; user?: Pick<UserModel, 'id'>};

export default function KanbanWorkspace({serverUrl, team, user}: WorkspaceProps) {
    const theme = useTheme();
    const styles = getStyleSheet(theme);
    const {formatMessage} = useIntl();
    const {boards, data, loading, error, reload, selectBoard} = useBoard(serverUrl, team?.id || '', team?.displayName || '', user?.id || '');
    const [editor, setEditor] = useState<CardEditorState>();
    const board = data?.board.teamId === team?.id ? data?.board : undefined;
    const blocks = data?.blocks;
    const canEdit = Boolean(board && data?.canEdit && !loading && !error);
    const columns = useMemo(() => (board && blocks ? getKanbanColumns(board, blocks) : []), [board, blocks]);
    const statusProperty = useMemo(() => (board && blocks ? getStatusProperty(board, blocks) : undefined), [board, blocks]);
    const statuses = useMemo(() => columns.map((column) => ({id: column.id, title: column.title || formatMessage(messages.noStatus)})), [columns, formatMessage]);
    const refresh = usePreventDoubleTap(useCallback(() => {
        reload();
    }, [reload]));
    const openCard = useCallback((card: FocalboardBlock) => {
        if (blocks) {
            const value = statusProperty ? card.fields.properties?.[statusProperty.id] : '';
            setEditor({cardId: card.id, original: {title: card.title, description: getCardDescription(card, blocks), statusId: typeof value === 'string' ? value : ''}, descriptionEditable: canEditCardDescription(card, blocks)});
        }
    }, [blocks, statusProperty]);
    const createCard = useCallback((statusId: string) => {
        if (canEdit) {
            setEditor({original: {title: '', description: '', statusId}, descriptionEditable: true});
        }
    }, [canEdit]);
    const close = useCallback(() => setEditor(undefined), []);
    const chooseBoard = useCallback((id: string) => {
        setEditor(undefined);
        selectBoard(id);
    }, [selectBoard]);
    const save = useCallback(async (draft: CardDraft) => {
        if (!board || !user || !editor || !blocks) {
            return 'permissionDenied' as const;
        }
        const result = await saveCard(serverUrl, board, blocks, user.id, editor.cardId, editor.original, draft);
        if (!result) {
            setEditor(undefined);
            await reload();
        }
        return result;
    }, [serverUrl, board, blocks, user, editor, reload]);
    const remove = useCallback(async () => {
        if (!board || !user || !editor?.cardId) {
            return 'permissionDenied' as const;
        }
        const result = await deleteCard(serverUrl, board.id, user.id, editor.cardId);
        if (!result) {
            setEditor(undefined);
            await reload();
        }
        return result;
    }, [serverUrl, board, user, editor, reload]);

    return (
        <SafeAreaView
            style={styles.screen}
            edges={safeEdges}
            testID='kanban.screen'
        >
            <View style={styles.toolbar}>
                <Text style={styles.project}>{team?.displayName}</Text>
                <View style={styles.row}>
                    <Text style={[styles.boardTitle, styles.flex]}>{board?.title || formatMessage(messages.title)}</Text>
                    <Button
                        theme={theme}
                        text={formatMessage(messages.reload)}
                        iconName='refresh'
                        emphasis='tertiary'
                        size='s'
                        onPress={refresh}
                        disabled={loading}
                        testID='kanban.reload'
                    />
                </View>
                {board && !data?.canEdit && (
                    <FormattedText
                        {...messages.readOnly}
                        style={styles.hint}
                        testID='kanban.read_only'
                    />
                )}
            </View>
            {boards.length > 1 && (
                <View>
                    <ScrollView
                        horizontal={true}
                        contentContainerStyle={styles.boardChoices}
                    >
                        {boards.map((item) => (
                            <BoardChoice
                                key={item.id}
                                board={item}
                                selected={item.id === board?.id}
                                onSelect={chooseBoard}
                            />
                        ))}
                    </ScrollView>
                </View>
            )}
            {loading && (
                <Loading
                    containerStyle={styles.state}
                    footerText={formatMessage(messages.loading)}
                    footerTextStyles={styles.body}
                    testID='kanban.loading'
                />
            )}
            {!loading && error && (
                <View style={styles.state}>
                    <FormattedText
                        {...messages[error]}
                        style={styles.error}
                        testID='kanban.error'
                    />
                </View>
            )}
            {!loading && !error && !board && (
                <View style={styles.state}>
                    <FormattedText
                        {...(team?.id ? messages.noBoards : messages.noTeam)}
                        style={styles.body}
                        testID='kanban.empty'
                    />
                </View>
            )}
            {!loading && !error && board && !columns.length && (
                <View style={styles.state}>
                    <FormattedText
                        {...messages.noColumns}
                        style={styles.body}
                    />
                </View>
            )}
            {!loading && !error && board && columns.length > 0 && (
                <BoardColumns
                    columns={columns}
                    canEdit={canEdit}
                    onOpen={openCard}
                    onCreate={createCard}
                />
            )}
            {editor && board && (
                <CardEditor
                    editor={editor}
                    statuses={statuses}
                    canEdit={canEdit}
                    onClose={close}
                    onSave={save}
                    onDelete={remove}
                />
            )}
        </SafeAreaView>
    );
}
