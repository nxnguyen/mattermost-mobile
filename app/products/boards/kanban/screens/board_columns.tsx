// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {memo, useCallback} from 'react';
import {useIntl} from 'react-intl';
import {FlatList, Pressable, Text, View, useWindowDimensions, type ListRenderItemInfo} from 'react-native';

import Button from '@components/button';
import FormattedText from '@components/formatted_text';
import {useTheme} from '@context/theme';
import {usePreventDoubleTap} from '@hooks/utils';

import {messages} from './messages';
import {getStyleSheet} from './styles';

import type {FocalboardBlock, KanbanColumn} from '../types';

const cardKey = (card: FocalboardBlock) => card.id;
const columnKey = (column: KanbanColumn) => column.id;

const Card = memo(({card, onOpen}: {card: FocalboardBlock; onOpen: (card: FocalboardBlock) => void}) => {
    const styles = getStyleSheet(useTheme());
    const open = usePreventDoubleTap(useCallback(() => onOpen(card), [onOpen, card]));
    return (
        <Pressable
            accessibilityRole='button'
            onPress={open}
            style={({pressed}) => [styles.card, pressed && styles.pressed]}
            testID={`kanban.card.${card.id}`}
        >
            <Text style={styles.cardTitle}>{card.title}</Text>
        </Pressable>
    );
});
Card.displayName = 'KanbanCard';

function Column({column, width, canEdit, onOpen, onCreate}: {
    column: KanbanColumn;
    width: number;
    canEdit: boolean;
    onOpen: (card: FocalboardBlock) => void;
    onCreate: (statusId: string) => void;
}) {
    const theme = useTheme();
    const styles = getStyleSheet(theme);
    const {formatMessage} = useIntl();
    const add = usePreventDoubleTap(useCallback(() => onCreate(column.id), [onCreate, column.id]));
    const renderCard = useCallback(({item}: ListRenderItemInfo<FocalboardBlock>) => (
        <Card
            card={item}
            onOpen={onOpen}
        />
    ), [onOpen]);
    return (
        <View
            style={[styles.column, {width}]}
            testID={`kanban.column.${column.id || 'none'}`}
        >
            <View style={styles.columnHeader}>
                <View style={styles.row}>
                    <Text style={styles.columnTitle}>{column.title || formatMessage(messages.noStatus)}</Text>
                    <Text style={styles.count}>{column.cards.length}</Text>
                </View>
                {canEdit && (
                    <Button
                        theme={theme}
                        text={formatMessage(messages.addCard)}
                        emphasis='tertiary'
                        size='s'
                        iconName='plus'
                        onPress={add}
                        testID={`kanban.column.${column.id || 'none'}.add`}
                    />
                )}
            </View>
            <FlatList
                data={column.cards}
                keyExtractor={cardKey}
                renderItem={renderCard}
                contentContainerStyle={styles.cards}
                ListEmptyComponent={
                    <FormattedText
                        {...messages.noCards}
                        style={[styles.hint, styles.empty]}
                    />
                }
                testID={`kanban.column.${column.id || 'none'}.cards`}
            />
        </View>
    );
}

export default function BoardColumns({columns, canEdit, onOpen, onCreate}: {
    columns: KanbanColumn[];
    canEdit: boolean;
    onOpen: (card: FocalboardBlock) => void;
    onCreate: (statusId: string) => void;
}) {
    const {width} = useWindowDimensions();
    const styles = getStyleSheet(useTheme());
    const columnWidth = Math.min(360, Math.max(260, width - 48));
    const renderColumn = useCallback(({item}: ListRenderItemInfo<KanbanColumn>) => (
        <Column
            column={item}
            width={columnWidth}
            canEdit={canEdit}
            onOpen={onOpen}
            onCreate={onCreate}
        />
    ), [columnWidth, canEdit, onOpen, onCreate]);
    return (
        <FlatList
            horizontal={true}
            data={columns}
            renderItem={renderColumn}
            keyExtractor={columnKey}
            contentContainerStyle={styles.columns}
            snapToInterval={columnWidth + 12}
            decelerationRate='fast'
            showsHorizontalScrollIndicator={true}
            testID='kanban.columns'
        />
    );
}
