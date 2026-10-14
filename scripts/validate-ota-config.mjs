import {createHash, createPublicKey} from 'node:crypto';
import {readFileSync} from 'node:fs';

import {getNativeMetadataHashes} from './ota-native-metadata.mjs';

const client = JSON.parse(readFileSync('ota/client.json', 'utf8'));
const compatibilityPath = process.env.AMOBI_OTA_QA === 'true' ? 'ota/native-compatibility-qa.json' : 'ota/native-compatibility.json';
const compatibility = JSON.parse(readFileSync(compatibilityPath, 'utf8'));
const publicKey = readFileSync('ota/public-key.pem');
if (client.baseURL !== 'https://updates.152.42.230.207.sslip.io/hot-updater' || !client.apiKey || client.apiKey.length < 10) {
    throw new Error('A registered Hot Updater client API key and HTTPS server URL are required');
}
const key = createPublicKey(publicKey);
if (key.asymmetricKeyType !== 'rsa' || key.asymmetricKeyDetails.modulusLength < 3072) {
    throw new Error('The OTA trust anchor must be RSA 3072 or stronger');
}
if (createHash('sha256').update(publicKey).digest('hex') !== compatibility.signingPublicKeySha256) {
    throw new Error('The OTA native compatibility marker does not match the public signing key');
}
const metadata = getNativeMetadataHashes();
if (Object.keys(metadata).some((key) => metadata[key] !== compatibility[key])) {
    throw new Error('Native metadata changed: run npm run ota:fingerprint, then rebuild the native app');
}
const manifest = readFileSync('android/app/src/main/AndroidManifest.xml', 'utf8');
if (!manifest.includes(publicKey.toString('utf8').trim())) {
    throw new Error('The Android OTA trust anchor is missing or does not match');
}
console.log('Hot Updater client configuration and public trust anchor validated');
