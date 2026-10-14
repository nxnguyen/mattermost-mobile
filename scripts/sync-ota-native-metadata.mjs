import {readFileSync, writeFileSync} from 'node:fs';

import {getNativeMetadataHashes} from './ota-native-metadata.mjs';

for (const path of ['ota/native-compatibility.json', 'ota/native-compatibility-qa.json']) {
    const compatibility = JSON.parse(readFileSync(path, 'utf8'));
    writeFileSync(path, `${JSON.stringify({...compatibility, ...getNativeMetadataHashes()}, null, 2)}\n`);
}
console.log('Native manifest compatibility marker updated; regenerate fingerprint before building');
