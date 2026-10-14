// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import type UserModel from '@typings/database/models/servers/user';

type DisplayNameUser = Pick<UserModel, 'firstName' | 'lastName' | 'nickname' | 'email'>;

export function getAccountDisplayName(user: DisplayNameUser): string {
    const fullName = [user.firstName.trim(), user.lastName.trim()].filter(Boolean).join(' ');
    const displayName = fullName || user.email.trim();
    const nickname = user.nickname.trim();
    if (!displayName) {
        return nickname;
    }

    const duplicateNickname = [displayName, user.email.trim()].some((value) => value.toLowerCase() === nickname.toLowerCase());
    return nickname && !duplicateNickname ? `${displayName} (${nickname})` : displayName;
}
