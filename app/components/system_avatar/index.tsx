// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {Image} from 'react-native';

import {View as ViewConstants} from '@constants';

const logo = require('@assets/images/icon.png');
const style = {
    width: ViewConstants.PROFILE_PICTURE_SIZE,
    height: ViewConstants.PROFILE_PICTURE_SIZE,
    borderRadius: ViewConstants.PROFILE_PICTURE_SIZE / 2,
};

const SystemAvatar = () => {
    return (
        <Image
            source={logo}
            style={style}
        />
    );
};

export default SystemAvatar;
