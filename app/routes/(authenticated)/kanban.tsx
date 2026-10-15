// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import KanbanScreen from '@boards/kanban/screens';
import {messages} from '@boards/kanban/screens/messages';
import {useIntl} from 'react-intl';

import {useAppNavigationHeader} from '@hooks/navigation_header';

export default function KanbanRoute() {
    const {formatMessage} = useIntl();
    useAppNavigationHeader(formatMessage(messages.title), false, 0, false, 'kanban.header.title');
    return <KanbanScreen/>;
}
