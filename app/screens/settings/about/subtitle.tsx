// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {defineMessages} from 'react-intl';

import FormattedText from '@components/formatted_text';
import {useTheme} from '@context/theme';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

const messages = defineMessages({
    description: {
        id: 'amobi.about.description',
        defaultMessage: 'Team chat, projects and collaboration in one place.',
    },
});

const getStyleSheet = makeStyleSheetFromTheme((theme) => {
    return {
        subtitle: {
            color: changeOpacity(theme.centerChannelColor, 0.72),
            ...typography('Heading', 400, 'Regular'),
            textAlign: 'center',
            paddingHorizontal: 24,
        },
    };
});

const Subtitle = () => {
    const theme = useTheme();
    const style = getStyleSheet(theme);

    return (
        <FormattedText
            {...messages.description}
            style={style.subtitle}
            testID='about.subtitle'
        />
    );
};

export default Subtitle;
