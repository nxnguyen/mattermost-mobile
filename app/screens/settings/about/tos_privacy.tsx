// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {Text} from 'react-native';

import FormattedText from '@components/formatted_text';
import AboutLinks from '@constants/about_links';
import {useTheme} from '@context/theme';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

const DEFAULT_TERMS_URLS = new Set([
    AboutLinks.TERMS_OF_SERVICE,
    'https://mattermost.com/pl/terms-of-use/',
]);
const DEFAULT_PRIVACY_URLS = new Set([
    AboutLinks.PRIVACY_POLICY,
    'https://mattermost.com/pl/privacy-policy/',
]);

const getStyleSheet = makeStyleSheetFromTheme((theme) => {
    return {
        noticeLink: {
            color: theme.linkColor,
            ...typography('Body', 50),
            textDecorationLine: 'underline',
            flexShrink: 1,
        },
        footerText: {
            color: changeOpacity(theme.centerChannelColor, 0.5),
            ...typography('Body', 50),
            marginBottom: 10,
        },
        hyphenText: {
            marginBottom: 0,
        },
    };
});

type TosPrivacyContainerProps = {
    config: ClientConfig;
    onPressTOS: () => void;
    onPressPrivacyPolicy: () => void;
}
const TosPrivacyContainer = ({config, onPressTOS, onPressPrivacyPolicy}: TosPrivacyContainerProps) => {
    const theme = useTheme();
    const style = getStyleSheet(theme);

    const hasTermsOfServiceLink = Boolean(config.TermsOfServiceLink && !DEFAULT_TERMS_URLS.has(config.TermsOfServiceLink));
    const hasPrivacyPolicyLink = Boolean(config.PrivacyPolicyLink && !DEFAULT_PRIVACY_URLS.has(config.PrivacyPolicyLink));

    return (
        <>
            {hasTermsOfServiceLink && (
                <FormattedText
                    id={'mobile.tos_link'}
                    defaultMessage='Terms of Service'
                    style={style.noticeLink}
                    onPress={onPressTOS}
                    accessibilityRole='link'
                    testID='about.terms_of_service'
                />
            )}
            {hasTermsOfServiceLink && hasPrivacyPolicyLink && (
                <Text style={[style.footerText, style.hyphenText]}>
                    {' - '}
                </Text>
            )}
            {hasPrivacyPolicyLink && (
                <FormattedText
                    id={'mobile.privacy_link'}
                    defaultMessage='Privacy Policy'
                    style={style.noticeLink}
                    onPress={onPressPrivacyPolicy}
                    accessibilityRole='link'
                    testID='about.privacy_policy'
                />
            )}
        </>
    );
};

export default TosPrivacyContainer;
