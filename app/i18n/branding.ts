// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import en from '@assets/i18n/en.json';
import {APP_NAME} from '@constants/branding';

type Translations = Record<string, string>;

// Product display copy only. Attribution, provider labels and URLs retain their source text.
const PRODUCT_MESSAGES = [
    'about.mattermost',
    'about.planNameLearn',
    'about.teamEditionLearn',
    'extension.no_memberships.description',
    'extension.no_servers.description',
    'invite_people_to_team.message',
    'mobile.calls_mic_error',
    'mobile.calls.foreground_service.channel_name',
    'mobile.calls.foreground_service.title',
    'mobile.managed.not_secured.android',
    'mobile.managed.not_secured.ios',
    'mobile.server_upgrade.description',
    'onboaring.welcome_description',
    'rate.title',
    'share_extension.channel_error',
];

const english: Translations = en;
const brandedCatalogs = new WeakMap<Translations, Translations>();

export function getBrandedTranslations(translations: Translations): Translations {
    const cached = brandedCatalogs.get(translations);
    if (cached) {
        return cached;
    }

    const branded = {...translations};
    for (const id of PRODUCT_MESSAGES) {
        const message = translations[id] || english[id];
        if (message) {
            branded[id] = message.replace(/\bMattermost\b/g, APP_NAME);
        }
    }
    brandedCatalogs.set(translations, branded);
    return branded;
}
