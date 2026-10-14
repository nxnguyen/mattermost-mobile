import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';

const hash = (text) => createHash('sha256').update(text.replace(/\s+/g, ' ').trim()).digest('hex');

// The CLI embeds these hashes in native files. Exclude that generated field to
// avoid changing the next fingerprint when the current hash is embedded.
export function getNativeMetadataHashes() {
    const manifest = readFileSync('android/app/src/main/AndroidManifest.xml', 'utf8').replace(/<meta-data\s+android:name="com\.hotupdater\.FINGERPRINT_HASH"[^>]*\/>/g, '');
    const plist = readFileSync('ios/Mattermost/Info.plist', 'utf8').replace(/<key>HOT_UPDATER_FINGERPRINT_HASH<\/key>\s*<string>[^<]*<\/string>/g, '');
    return {androidManifestSha256: hash(manifest), iosInfoPlistSha256: hash(plist)};
}
