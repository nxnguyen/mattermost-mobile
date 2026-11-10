import assert from 'node:assert/strict';
import {mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync, renameSync, symlinkSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join, dirname} from 'node:path';
import {test} from 'node:test';

import {getNativeMetadataHashes} from './ota-native-metadata.mjs';

const androidIcon = 'android/app/src/main/res/drawable/icon.png';
const iosIcon = 'ios/Mattermost/Images.xcassets/AppIcon.appiconset/icon.png';

function fixture(t, reverse = false) {
    const root = mkdtempSync(join(tmpdir(), 'amobi-native-metadata-'));
    t.after(() => rmSync(root, {recursive: true, force: true}));
    const files = [
        ['android/app/src/main/AndroidManifest.xml', '<manifest><application><meta-data android:name="com.hotupdater.FINGERPRINT_HASH" android:value="initial"/></application></manifest>'],
        ['ios/Mattermost/Info.plist', '<plist><dict><key>HOT_UPDATER_FINGERPRINT_HASH</key><string>initial</string></dict></plist>'],
        [androidIcon, Buffer.from([0x80])],
        ['android/app/src/main/res/values/strings.xml', '<resources/>'],
        [iosIcon, Buffer.from([0x80])],
        ['ios/Mattermost/Images.xcassets/AppIcon.appiconset/Contents.json', '{"images":[]}'],
        ['ios/SplashScreenResource/SplashScreen.storyboard', '<document/>'],
    ];
    for (const [path, bytes] of reverse ? files.reverse() : files) {
        mkdirSync(dirname(join(root, path)), {recursive: true});
        writeFileSync(join(root, path), bytes);
    }
    return root;
}

function assertResourceHashes(hashes) {
    assert.match(hashes.androidResourcesSha256, /^[a-f0-9]{64}$/);
    assert.match(hashes.iosResourcesSha256, /^[a-f0-9]{64}$/);
}

test('resource hashes are independent of checkout path and creation order', (t) => {
    const first = getNativeMetadataHashes(fixture(t));
    const second = getNativeMetadataHashes(fixture(t, true));
    assertResourceHashes(first);
    assert.deepEqual(first, second);
});

for (const [platform, icon] of [['android', androidIcon], ['ios', iosIcon]]) {
    test(`${platform} resource hashing retains binary differences lost by UTF-8 decoding`, (t) => {
        const root = fixture(t);
        const before = getNativeMetadataHashes(root);
        assertResourceHashes(before);
        assert.equal(Buffer.from([0x80]).toString('utf8'), Buffer.from([0x81]).toString('utf8'));
        writeFileSync(join(root, icon), Buffer.from([0x81]));
        const after = getNativeMetadataHashes(root);
        const other = platform === 'android' ? 'ios' : 'android';
        assert.notEqual(before[`${platform}ResourcesSha256`], after[`${platform}ResourcesSha256`]);
        assert.equal(before[`${other}ResourcesSha256`], after[`${other}ResourcesSha256`]);
        assert.deepEqual(readFileSync(join(root, icon)), Buffer.from([0x81]));
    });
}

test('resource membership and native XML, catalog and storyboard changes are tracked', (t) => {
    const root = fixture(t);
    const baseline = getNativeMetadataHashes(root);
    assertResourceHashes(baseline);
    const added = join(root, 'android/app/src/main/res/drawable/added.png');
    writeFileSync(added, Buffer.from([0x80]));
    assert.notEqual(getNativeMetadataHashes(root).androidResourcesSha256, baseline.androidResourcesSha256);
    rmSync(added);
    assert.deepEqual(getNativeMetadataHashes(root), baseline);
    const renamed = join(root, 'android/app/src/main/res/drawable/renamed.png');
    renameSync(join(root, androidIcon), renamed);
    assert.notEqual(getNativeMetadataHashes(root).androidResourcesSha256, baseline.androidResourcesSha256);
    renameSync(renamed, join(root, androidIcon));
    writeFileSync(join(root, 'android/app/src/main/res/values/strings.xml'), '<resources><string name="app_name">Amobi Collab</string></resources>');
    assert.notEqual(getNativeMetadataHashes(root).androidResourcesSha256, baseline.androidResourcesSha256);
    for (const path of ['ios/Mattermost/Images.xcassets/AppIcon.appiconset/Contents.json', 'ios/SplashScreenResource/SplashScreen.storyboard']) {
        const before = getNativeMetadataHashes(root);
        writeFileSync(join(root, path), 'changed');
        assert.notEqual(getNativeMetadataHashes(root).iosResourcesSha256, before.iosResourcesSha256);
    }
    const beforeIgnored = getNativeMetadataHashes(root);
    writeFileSync(join(root, 'android/app/src/main/res/drawable/ignored.txt'), 'ignored');
    assert.deepEqual(getNativeMetadataHashes(root), beforeIgnored);
});

test('generated fingerprint fields do not feed back into metadata hashes', (t) => {
    const root = fixture(t);
    const before = getNativeMetadataHashes(root);
    for (const path of ['android/app/src/main/AndroidManifest.xml', 'ios/Mattermost/Info.plist']) {
        const target = join(root, path);
        writeFileSync(target, readFileSync(target, 'utf8').replace('initial', 'regenerated'));
    }
    assert.deepEqual(getNativeMetadataHashes(root), before);
    const manifest = join(root, 'android/app/src/main/AndroidManifest.xml');
    writeFileSync(manifest, readFileSync(manifest, 'utf8').replace('<application>', '<application android:label="Amobi Collab">'));
    assert.notEqual(getNativeMetadataHashes(root).androidManifestSha256, before.androidManifestSha256);
});

test('resource hashing fails closed on missing roots and symbolic links', (t) => {
    const missing = fixture(t);
    rmSync(join(missing, 'android/app/src/main/res'), {recursive: true});
    assert.throws(() => getNativeMetadataHashes(missing), /ENOENT/);
    const linked = fixture(t);
    symlinkSync('icon.png', join(linked, 'android/app/src/main/res/drawable/linked.png'));
    assert.throws(() => getNativeMetadataHashes(linked), /symbolic link/i);
});
