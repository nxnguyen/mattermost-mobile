// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

/* eslint-disable no-process-env */

import {existsSync} from 'node:fs';

import {bare} from '@hot-updater/bare';
import {standaloneRepository, standaloneStorage} from '@hot-updater/standalone';
import {defineConfig} from 'hot-updater';
import {apiKeys, insights} from 'hot-updater/plugins';

if (existsSync('.env.hotupdater')) {
    process.loadEnvFile('.env.hotupdater');
}

// Publisher credentials are only read by the CLI, never imported by the app.
const updaterUrl = 'https://updates.152.42.230.207.sslip.io';
const otaQaBuild = process.env.AMOBI_OTA_QA === 'true';

export default defineConfig({
    platform: {
        android: {androidManifestPaths: ['android/app/src/main/AndroidManifest.xml']},
        ios: {infoPlistPaths: ['ios/Mattermost/Info.plist']},
    },
    build: bare({enableHermes: true, entryFile: 'index.tsx', outDir: '.hot-updater/build'}),
    database: standaloneRepository({
        baseUrl: `${updaterUrl}/hot-updater/admin`,
        commonHeaders: {Authorization: `Bearer ${process.env.HOT_UPDATER_ADMIN_TOKEN || ''}`},
    }),
    storage: standaloneStorage({
        baseUrl: `${updaterUrl}/storage`,
        protocol: 'amobi-ota',
        commonHeaders: {Authorization: `Bearer ${process.env.HOT_UPDATER_STORAGE_TOKEN || ''}`},
    }),
    plugins: [apiKeys(), insights()],
    updateStrategy: 'fingerprint',
    signing: {
        enabled: true,
        privateKeyPath: process.env.HOT_UPDATER_SIGNING_PRIVATE_KEY_PATH || '../deployment/secrets/ota-signing/private-key.pem',
    },
    fingerprint: {
        extraSources: {
            android: [
                'android/app/src/**/*.{kt,java,c,cc,cpp,cxx,h,hpp}',
                'android/build.gradle',
                'android/settings.gradle',
                'android/gradle.properties',
                'android/app/build.gradle',
                'android/app/proguard-rules.pro',
                otaQaBuild ? 'android/app/qa/google-services.json' : 'android/app/google-services.json',
                'android/app/src/main/res/**/*.xml',
                otaQaBuild ? 'ota/native-compatibility-qa.json' : 'ota/native-compatibility.json',
                'ota/public-key.pem',
            ],
            ios: [
                'ios/Mattermost/**/*.{swift,h,m,mm,c,cc,cpp,cxx,hpp}',
                'ios/Podfile',
                'ios/Mattermost.xcodeproj/project.pbxproj',
                'ota/native-compatibility.json',
                'ota/public-key.pem',
            ],
        },
    },
});
