// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {defineMessages} from 'react-intl';

export const messages = defineMessages({
    title: {id: 'amobi.kanban.title', defaultMessage: 'Kanban'},
    reload: {id: 'amobi.kanban.reload', defaultMessage: 'Reload'},
    loading: {id: 'amobi.kanban.loading', defaultMessage: 'Loading board…'},
    loadFailed: {id: 'amobi.kanban.load_failed', defaultMessage: 'Could not load this board. Check your connection and try again.'},
    noTeam: {id: 'amobi.kanban.no_team', defaultMessage: 'Select a project to open its Kanban board.'},
    noBoards: {id: 'amobi.kanban.no_boards', defaultMessage: 'This project has no boards you can access.'},
    noColumns: {id: 'amobi.kanban.no_columns', defaultMessage: 'This board has no status columns yet.'},
    noCards: {id: 'amobi.kanban.no_cards', defaultMessage: 'No cards in this column.'},
    noStatus: {id: 'amobi.kanban.no_status', defaultMessage: 'No status'},
    readOnly: {id: 'amobi.kanban.read_only', defaultMessage: 'You can view this board. Editing requires an editor role.'},
    addCard: {id: 'amobi.kanban.add_card', defaultMessage: 'Add card'},
    newCard: {id: 'amobi.kanban.new_card', defaultMessage: 'New card'},
    card: {id: 'amobi.kanban.card', defaultMessage: 'Card'},
    cardTitle: {id: 'amobi.kanban.card_title', defaultMessage: 'Title'},
    description: {id: 'amobi.kanban.description', defaultMessage: 'Description'},
    status: {id: 'amobi.kanban.status', defaultMessage: 'Status'},
    save: {id: 'amobi.kanban.save', defaultMessage: 'Save'},
    saving: {id: 'amobi.kanban.saving', defaultMessage: 'Saving…'},
    close: {id: 'amobi.kanban.close', defaultMessage: 'Close'},
    emptyTitle: {id: 'amobi.kanban.empty_title', defaultMessage: 'Enter a card title.'},
    saveFailed: {id: 'amobi.kanban.save_failed', defaultMessage: 'Could not save the card. Your changes are still here. Try again.'},
    permissionDenied: {id: 'amobi.kanban.permission_denied', defaultMessage: 'You no longer have permission to edit this board. Reload to check your access.'},
    changed: {id: 'amobi.kanban.changed', defaultMessage: 'This card changed since you opened it. Close and reload the board before editing again.'},
    discardTitle: {id: 'amobi.kanban.discard_title', defaultMessage: 'Discard changes?'},
    discard: {id: 'amobi.kanban.discard', defaultMessage: 'Discard'},
    keepEditing: {id: 'amobi.kanban.keep_editing', defaultMessage: 'Keep editing'},
    deleteCard: {id: 'amobi.kanban.delete_card', defaultMessage: 'Delete card'},
    deleteConfirm: {id: 'amobi.kanban.delete_confirm', defaultMessage: 'Delete this card and its content?'},
    deleteFailed: {id: 'amobi.kanban.delete_failed', defaultMessage: 'Could not delete the card. Reload and try again.'},
    extraContent: {id: 'amobi.kanban.extra_content', defaultMessage: 'Other card content is preserved. The description editor changes text content only.'},
});
