// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {Text, View} from 'react-native';

import ProfilePicture from '@components/profile_picture';
import {makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

import {getAccountDisplayName} from './display_name';

import type UserModel from '@typings/database/models/servers/user';

type Props = {
    user: UserModel;
    showFullName: boolean;
    theme: Theme;
};

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => {
    return {
        container: {
            backgroundColor: theme.sidebarBg,
            paddingBottom: 20,
            top: 0,
            paddingTop: 22,
            paddingHorizontal: 20,
        },
        statusStyle: {
            right: 10,
            bottom: 10,
            borderColor: theme.sidebarBg,
            backgroundColor: theme.sidebarBg,
        },
        textFullName: {
            ...typography('Heading', 700, 'SemiBold'),
            color: theme.sidebarText,
            marginTop: 16,
        },
        textUserName: {
            ...typography('Body', 200),
            color: theme.sidebarText,
            marginTop: 4,
        },
    };
});

const AccountUserInfo = ({user, showFullName, theme}: Props) => {
    const styles = getStyleSheet(theme);
    const title = getAccountDisplayName(user);
    const userName = `@${user.username}`;
    const accountUserInfoTestId = `account.user_info.${user.id}`;

    return (
        <View style={styles.container}>
            <ProfilePicture
                size={120}
                iconSize={28}
                showStatus={true}
                author={user}
                statusStyle={styles.statusStyle}
                statusSize={24}
                testID={`${accountUserInfoTestId}.profile_picture`}
            />
            {showFullName &&
            <Text
                style={styles.textFullName}
                testID={`${accountUserInfoTestId}.display_name`}
            >
                {title}
            </Text>
            }
            <Text
                style={showFullName ? styles.textUserName : styles.textFullName}
                testID={`${accountUserInfoTestId}.username`}
            >
                {`${userName}`}
            </Text>
        </View>
    );
};

export default AccountUserInfo;
