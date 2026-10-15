// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useState} from 'react';
import {useIntl} from 'react-intl';
import {Alert, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, Text, TextInput, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';

import Button from '@components/button';
import FormattedText from '@components/formatted_text';
import {useTheme} from '@context/theme';
import {usePreventDoubleTap} from '@hooks/utils';

import {messages} from './messages';
import {getStyleSheet} from './styles';

export type CardDraft = {title: string; description: string; statusId: string};
export type CardEditorState = {cardId?: string; original: CardDraft; descriptionEditable: boolean};
export type CardSaveError = 'emptyTitle' | 'permissionDenied' | 'changed' | 'saveFailed' | 'deleteFailed';

const safeEdges = ['top', 'bottom'] as const;

function StatusOption({id, title, selected, disabled, onSelect}: {id: string; title: string; selected: boolean; disabled: boolean; onSelect: (id: string) => void}) {
    const styles = getStyleSheet(useTheme());
    const select = useCallback(() => onSelect(id), [id, onSelect]);
    return (
        <Pressable
            accessibilityRole='radio'
            accessibilityState={{checked: selected, disabled}}
            disabled={disabled}
            onPress={select}
            style={({pressed}) => [styles.statusOption, selected && styles.selectedChip, pressed && styles.pressed]}
            testID={`kanban.editor.status.${id || 'none'}`}
        >
            <View style={[styles.statusDot, selected && styles.selectedDot]}/>
            <Text style={[styles.body, styles.flex]}>{title}</Text>
        </Pressable>
    );
}

export default function CardEditor({editor, statuses, canEdit, onClose, onSave, onDelete}: {
    editor: CardEditorState;
    statuses: Array<{id: string; title: string}>;
    canEdit: boolean;
    onClose: () => void;
    onSave: (draft: CardDraft) => Promise<CardSaveError | undefined>;
    onDelete: () => Promise<CardSaveError | undefined>;
}) {
    const theme = useTheme();
    const styles = getStyleSheet(theme);
    const {formatMessage} = useIntl();
    const [draft, setDraft] = useState(editor.original);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<CardSaveError>();
    const dirty = draft.title !== editor.original.title || draft.description !== editor.original.description || draft.statusId !== editor.original.statusId;
    const close = usePreventDoubleTap(useCallback(() => {
        if (saving) {
            return;
        }
        if (canEdit && dirty) {
            Alert.alert(formatMessage(messages.discardTitle), undefined, [
                {text: formatMessage(messages.keepEditing), style: 'cancel'},
                {text: formatMessage(messages.discard), style: 'destructive', onPress: onClose},
            ]);
        } else {
            onClose();
        }
    }, [saving, canEdit, dirty, formatMessage, onClose]));
    const setTitle = useCallback((title: string) => setDraft((value) => ({...value, title})), []);
    const setDescription = useCallback((description: string) => setDraft((value) => ({...value, description})), []);
    const setStatus = useCallback((statusId: string) => setDraft((value) => ({...value, statusId})), []);
    const save = usePreventDoubleTap(useCallback(async () => {
        if (saving || !canEdit) {
            return;
        }
        setSaving(true);
        setError(undefined);
        try {
            setError(await onSave(draft));
        } finally {
            setSaving(false);
        }
    }, [saving, canEdit, onSave, draft]));
    const remove = usePreventDoubleTap(useCallback(() => {
        Alert.alert(formatMessage(messages.deleteConfirm), undefined, [
            {text: formatMessage(messages.close), style: 'cancel'},
            {text: formatMessage(messages.deleteCard),
                style: 'destructive',
                onPress: async () => {
                    setSaving(true);
                    setError(undefined);
                    try {
                        setError(await onDelete());
                    } finally {
                        setSaving(false);
                    }
                }},
        ]);
    }, [formatMessage, onDelete]));

    return (
        <Modal
            visible={true}
            animationType='slide'
            onRequestClose={close}
        >
            <SafeAreaView
                style={styles.screen}
                edges={safeEdges}
            >
                <KeyboardAvoidingView
                    style={styles.flex}
                    behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                >
                    <View style={styles.modalHeader}>
                        <FormattedText
                            {...(editor.cardId ? messages.card : messages.newCard)}
                            style={[styles.boardTitle, styles.flex]}
                        />
                        <Button
                            theme={theme}
                            text={formatMessage(messages.close)}
                            emphasis='tertiary'
                            onPress={close}
                            disabled={saving}
                            testID='kanban.editor.close'
                        />
                    </View>
                    <ScrollView
                        contentContainerStyle={styles.form}
                        keyboardShouldPersistTaps='handled'
                        testID='kanban.editor.scroll'
                    >
                        <View style={styles.field}>
                            <FormattedText
                                {...messages.cardTitle}
                                style={styles.body}
                            />
                            <TextInput
                                value={draft.title}
                                onChangeText={setTitle}
                                editable={canEdit && !saving}
                                accessibilityLabel={formatMessage(messages.cardTitle)}
                                style={styles.input}
                                multiline={true}
                                testID='kanban.editor.title'
                            />
                        </View>
                        <View style={styles.field}>
                            <FormattedText
                                {...messages.description}
                                style={styles.body}
                            />
                            <TextInput
                                value={draft.description}
                                onChangeText={setDescription}
                                editable={canEdit && editor.descriptionEditable && !saving}
                                accessibilityLabel={formatMessage(messages.description)}
                                style={[styles.input, styles.description]}
                                multiline={true}
                                testID='kanban.editor.description'
                            />
                            {!editor.descriptionEditable && (
                                <FormattedText
                                    {...messages.extraContent}
                                    style={styles.hint}
                                />
                            )}
                        </View>
                        <View style={styles.field}>
                            <FormattedText
                                {...messages.status}
                                style={styles.body}
                            />
                            <View
                                style={styles.statuses}
                                accessibilityRole='radiogroup'
                            >
                                {statuses.map((status) => (
                                    <StatusOption
                                        key={status.id}
                                        id={status.id}
                                        title={status.title}
                                        selected={draft.statusId === status.id}
                                        disabled={!canEdit || saving}
                                        onSelect={setStatus}
                                    />
                                ))}
                            </View>
                        </View>
                        {!canEdit && (
                            <FormattedText
                                {...messages.readOnly}
                                style={styles.hint}
                            />
                        )}
                    </ScrollView>
                    {canEdit && (
                        <View style={styles.footer}>
                            {error && (
                                <FormattedText
                                    {...messages[error]}
                                    style={styles.error}
                                    testID='kanban.editor.error'
                                />
                            )}
                            <Button
                                theme={theme}
                                text={formatMessage(saving ? messages.saving : messages.save)}
                                onPress={save}
                                disabled={saving || !draft.title.trim()}
                                showLoader={saving}
                                testID='kanban.editor.save'
                            />
                            {editor.cardId && (
                                <Button
                                    theme={theme}
                                    text={formatMessage(messages.deleteCard)}
                                    onPress={remove}
                                    isDestructive={true}
                                    emphasis='tertiary'
                                    disabled={saving}
                                    testID='kanban.editor.delete'
                                />
                            )}
                        </View>
                    )}
                </KeyboardAvoidingView>
            </SafeAreaView>
        </Modal>
    );
}
