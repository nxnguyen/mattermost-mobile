// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

export const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => ({
    screen: {flex: 1, backgroundColor: theme.centerChannelBg},
    toolbar: {padding: 16, gap: 12, borderBottomWidth: 1, borderBottomColor: changeOpacity(theme.centerChannelColor, 0.12)},
    row: {flexDirection: 'row', alignItems: 'center', gap: 12},
    flex: {flex: 1},
    project: {...typography('Body', 100), color: changeOpacity(theme.centerChannelColor, 0.72)},
    boardTitle: {...typography('Heading', 300, 'SemiBold'), color: theme.centerChannelColor, flexShrink: 1},
    hint: {...typography('Body', 100), color: changeOpacity(theme.centerChannelColor, 0.72)},
    error: {...typography('Body', 200), color: theme.errorTextColor},
    state: {flex: 1, padding: 24, gap: 16, alignItems: 'center', justifyContent: 'center'},
    body: {...typography('Body', 200), color: theme.centerChannelColor},
    boardChoices: {gap: 8, paddingHorizontal: 16, paddingVertical: 12},
    chip: {paddingHorizontal: 12, paddingVertical: 10, borderRadius: 4, borderWidth: 1, borderColor: changeOpacity(theme.centerChannelColor, 0.2)},
    selectedChip: {backgroundColor: changeOpacity(theme.buttonBg, 0.12), borderColor: theme.buttonBg},
    chipText: {...typography('Body', 100, 'SemiBold'), color: theme.centerChannelColor},
    selectedText: {color: theme.buttonBg},
    pressed: {opacity: 0.64},
    columns: {padding: 12, gap: 12},
    column: {flex: 1, borderRadius: 8, backgroundColor: changeOpacity(theme.centerChannelColor, 0.04), borderWidth: 1, borderColor: changeOpacity(theme.centerChannelColor, 0.12)},
    columnHeader: {padding: 12, gap: 10, borderBottomWidth: 1, borderBottomColor: changeOpacity(theme.centerChannelColor, 0.12)},
    columnTitle: {...typography('Body', 200, 'SemiBold'), color: theme.centerChannelColor, flex: 1},
    count: {...typography('Body', 100, 'SemiBold'), color: changeOpacity(theme.centerChannelColor, 0.72)},
    cards: {padding: 10, gap: 10, flexGrow: 1},
    card: {padding: 14, gap: 8, borderRadius: 4, backgroundColor: theme.centerChannelBg, borderWidth: 1, borderColor: changeOpacity(theme.centerChannelColor, 0.18)},
    cardTitle: {...typography('Body', 200, 'SemiBold'), color: theme.centerChannelColor},
    empty: {padding: 16},
    modalHeader: {padding: 16, gap: 16, flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: changeOpacity(theme.centerChannelColor, 0.12)},
    form: {padding: 16, gap: 18},
    field: {gap: 8},
    input: {...typography('Body', 200), color: theme.centerChannelColor, padding: 12, minHeight: 48, borderWidth: 1, borderColor: changeOpacity(theme.centerChannelColor, 0.3), borderRadius: 4, backgroundColor: theme.centerChannelBg},
    description: {minHeight: 140, textAlignVertical: 'top'},
    statuses: {gap: 8},
    statusOption: {padding: 12, flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderRadius: 4, borderColor: changeOpacity(theme.centerChannelColor, 0.2)},
    statusDot: {height: 16, width: 16, borderRadius: 8, borderWidth: 2, borderColor: theme.buttonBg},
    selectedDot: {backgroundColor: theme.buttonBg},
    footer: {padding: 16, gap: 12, borderTopWidth: 1, borderTopColor: changeOpacity(theme.centerChannelColor, 0.12)},
}));
