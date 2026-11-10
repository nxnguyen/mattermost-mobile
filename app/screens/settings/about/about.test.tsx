// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import Clipboard from '@react-native-clipboard/clipboard';
import {act, fireEvent} from '@testing-library/react-native';
import * as Application from 'expo-application';
import React from 'react';
import {Linking} from 'react-native';

import * as License from '@actions/remote/license';
import AboutLinks from '@constants/about_links';
import {APP_NAME} from '@constants/branding';
import {renderWithIntlAndTheme} from '@test/intl-test-helper';
import * as SnackBar from '@utils/snack_bar';

import About from './about';

const config = {
    BuildEnterpriseReady: 'false',
    BuildNumber: 'amobi-build-20261015',
    Version: '11.7.0',
    SQLDriverName: 'postgres',
    SchemaVersion: '153',
    BuildHash: 'abcdef1234567890',
    BuildHashEnterprise: 'none',
    BuildDate: '2026-10-15T12:00:00Z',
    SiteName: APP_NAME,
    TermsOfServiceLink: '',
    PrivacyPolicyLink: '',
} as ClientConfig;

describe('Amobi About', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        jest.replaceProperty(Application, 'applicationId', 'com.amobi.collab.platform');
        jest.spyOn(License, 'getLicenseLoadMetric').mockResolvedValue(null);
        jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined);
        jest.spyOn(SnackBar, 'showSnackBar').mockImplementation(() => {});
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    it.each(['false', 'true'])('should show the same product title and description for enterprise-ready=%s', (enterpriseReady) => {
        const {getByTestId, queryByTestId} = renderWithIntlAndTheme(
            <About config={{...config, BuildEnterpriseReady: enterpriseReady}}/>,
        );

        expect(getByTestId('about.title')).toHaveTextContent(/^Amobi Collab$/);
        expect(getByTestId('about.subtitle')).toHaveTextContent(/^Team chat, projects and collaboration in one place\.$/);
        expect(queryByTestId('about.learn_more.text')).toBeNull();
        expect(queryByTestId('about.powered_by')).toBeNull();
        expect(queryByTestId('about.copyright')).toBeNull();
    });

    it('should open the source attribution and license notices through an accessible link', async () => {
        const {getByRole} = renderWithIntlAndTheme(<About config={config}/>);

        await act(async () => {
            fireEvent.press(getByRole('link', {name: 'Open source licenses and notices'}));
        });

        expect(Linking.openURL).toHaveBeenCalledWith('https://152.42.230.207.sslip.io/static/amobi-open-source-notices.txt');
    });

    it.each([
        ['legacy mobile defaults', AboutLinks.TERMS_OF_SERVICE, AboutLinks.PRIVACY_POLICY],
        ['backend defaults', 'https://mattermost.com/pl/terms-of-use/', 'https://mattermost.com/pl/privacy-policy/'],
    ])('should hide upstream default Terms and Privacy links for %s', (_name, terms, privacy) => {
        const {queryByTestId} = renderWithIntlAndTheme(
            <About config={{...config, TermsOfServiceLink: terms, PrivacyPolicyLink: privacy}}/>,
        );

        expect(queryByTestId('about.terms_of_service')).toBeNull();
        expect(queryByTestId('about.privacy_policy')).toBeNull();
    });

    it.each([
        ['company URLs', 'https://company.example/legal/terms', 'https://company.example/legal/privacy'],
        ['non-default exact URLs', 'https://mattermost.com/pl/terms-of-use/?policy=custom', 'https://mattermost.com/pl/privacy-policy'],
    ])('should open explicitly configured policies for %s when each link is pressed', async (_name, terms, privacy) => {
        const {getByTestId} = renderWithIntlAndTheme(
            <About config={{...config, TermsOfServiceLink: terms, PrivacyPolicyLink: privacy}}/>,
        );

        await act(async () => {
            fireEvent.press(getByTestId('about.terms_of_service'));
            fireEvent.press(getByTestId('about.privacy_policy'));
        });

        expect(Linking.openURL).toHaveBeenNthCalledWith(1, terms);
        expect(Linking.openURL).toHaveBeenNthCalledWith(2, privacy);
        expect(getByTestId('about.terms_of_service')).toHaveProp('accessibilityRole', 'link');
        expect(getByTestId('about.privacy_policy')).toHaveProp('accessibilityRole', 'link');
    });

    it('should omit policy links when no company policy has been configured', () => {
        const {queryByTestId} = renderWithIntlAndTheme(<About config={config}/>);

        expect(queryByTestId('about.terms_of_service')).toBeNull();
        expect(queryByTestId('about.privacy_policy')).toBeNull();
    });

    it('should retain full UTF-8 version text in a wrapping row and copy all build metadata', async () => {
        const longVersion = `11.7.0-${'bản-dựng-研发🚀'.repeat(12)}`;
        const props = {...config, Version: longVersion};
        const {getByTestId} = renderWithIntlAndTheme(<About config={props}/>);
        const serverVersion = getByTestId('about.server_version.value');

        expect(serverVersion).toHaveTextContent(`${longVersion} (Build ${config.BuildNumber})`);
        expect(serverVersion).toHaveStyle({flex: 1, minWidth: 0});
        expect(serverVersion.props.numberOfLines).toBeUndefined();
        expect(getByTestId('about.build_hash.value')).toHaveTextContent(config.BuildHash);
        expect(getByTestId('about.build_hash_enterprise.value')).toHaveTextContent(config.BuildHashEnterprise);
        expect(getByTestId('about.build_date.value')).toHaveTextContent(config.BuildDate);

        await act(async () => {
            fireEvent.press(getByTestId('about.copy_info'));
        });

        expect(Clipboard.setString).toHaveBeenCalledWith(
            `App Version: ${Application.nativeApplicationVersion} (Build ${Application.nativeBuildVersion})\n` +
            `Server Version: ${longVersion} (Build ${config.BuildNumber})\n` +
            `Database: ${config.SQLDriverName}\nDatabase Schema Version: ${config.SchemaVersion}`,
        );
    });
});
