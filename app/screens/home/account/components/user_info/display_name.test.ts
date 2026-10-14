// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {getAccountDisplayName} from './display_name';

describe('getAccountDisplayName', () => {
    it('shows the email once when the display name and nickname are the same email', () => {
        expect(getAccountDisplayName({firstName: 'owner@example.com', lastName: '', nickname: 'owner@example.com', email: 'owner@example.com'})).toBe('owner@example.com');
    });

    it('ignores whitespace and case in duplicate nicknames', () => {
        expect(getAccountDisplayName({firstName: ' owner@example.com ', lastName: '', nickname: ' OWNER@EXAMPLE.COM ', email: 'owner@example.com'})).toBe('owner@example.com');
    });

    it('keeps a different nickname', () => {
        expect(getAccountDisplayName({firstName: 'owner@example.com', lastName: '', nickname: 'Project owner', email: 'owner@example.com'})).toBe('owner@example.com (Project owner)');
    });

    it('omits a nickname that repeats the full display name', () => {
        expect(getAccountDisplayName({firstName: 'Alex', lastName: 'Smith', nickname: 'Alex Smith', email: 'owner@example.com'})).toBe('Alex Smith');
    });

    it('omits a nickname that repeats the email', () => {
        expect(getAccountDisplayName({firstName: 'Alex', lastName: 'Smith', nickname: 'owner@example.com', email: 'owner@example.com'})).toBe('Alex Smith');
    });

    it('uses the email when a full name is absent', () => {
        expect(getAccountDisplayName({firstName: '', lastName: '', nickname: '', email: 'owner@example.com'})).toBe('owner@example.com');
    });
});
