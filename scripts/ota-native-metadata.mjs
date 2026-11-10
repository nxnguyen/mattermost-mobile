import {createHash} from 'node:crypto';
import {lstatSync, readFileSync, readdirSync} from 'node:fs';
import {join} from 'node:path';

const hash = (text) => createHash('sha256').update(text.replace(/\s+/g, ' ').trim()).digest('hex');

function hashResources(root, directory, extension, extraFiles = []) {
    const paths = [...extraFiles];
    const walk = (relative) => {
        for (const entry of readdirSync(join(root, relative), {withFileTypes: true})) {
            const path = `${relative}/${entry.name}`;
            if (entry.isSymbolicLink()) {
                throw new Error(`Native resource cannot be a symbolic link: ${path}`);
            }
            if (entry.isDirectory()) {
                walk(path);
            } else if (entry.isFile() && extension.test(entry.name)) {
                paths.push(path);
            }
        }
    };
    walk(directory);

    // Extra source files are decoded as UTF-8 by Hot Updater. Hash binary
    // resources first, then fingerprint this deterministic JSON representation.
    const resources = paths.sort().map((path) => {
        const absolute = join(root, path);
        if (!lstatSync(absolute).isFile()) {
            throw new Error(`Native resource must be a regular file: ${path}`);
        }
        return {path, sha256: createHash('sha256').update(readFileSync(absolute)).digest('hex')};
    });
    return createHash('sha256').update(JSON.stringify(resources)).digest('hex');
}

// The CLI embeds these hashes in native files. Exclude that generated field to
// avoid changing the next fingerprint when the current hash is embedded.
export function getNativeMetadataHashes(root = process.cwd()) {
    const manifest = readFileSync(join(root, 'android/app/src/main/AndroidManifest.xml'), 'utf8').replace(/<meta-data\s+android:name="com\.hotupdater\.FINGERPRINT_HASH"[^>]*\/>/g, '');
    const plist = readFileSync(join(root, 'ios/Mattermost/Info.plist'), 'utf8').replace(/<key>HOT_UPDATER_FINGERPRINT_HASH<\/key>\s*<string>[^<]*<\/string>/g, '');
    return {
        androidManifestSha256: hash(manifest),
        iosInfoPlistSha256: hash(plist),
        androidResourcesSha256: hashResources(root, 'android/app/src/main/res', /\.(?:png|xml)$/i),
        iosResourcesSha256: hashResources(root, 'ios/Mattermost/Images.xcassets', /\.(?:png|json)$/i, ['ios/SplashScreenResource/SplashScreen.storyboard']),
    };
}
