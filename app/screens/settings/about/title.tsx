// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {Text} from 'react-native';

import {APP_NAME} from '@constants/branding';
import {useTheme} from '@context/theme';
import {makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

const getStyleSheet = makeStyleSheetFromTheme((theme) => {
    return {
        title: {
            ...typography('Heading', 700, 'SemiBold'),
            color: theme.centerChannelColor,
            textAlign: 'center',
            marginTop: 8,
            marginBottom: 8,
        },
    };
});

const Title = () => {
    const theme = useTheme();
    const style = getStyleSheet(theme);

    return (
        <Text
            style={style.title}
            testID='about.title'
        >
            {APP_NAME}
        </Text>
    );
};

export default Title;
