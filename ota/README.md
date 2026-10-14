# Amobi Collab OTA

Self-hosted Hot Updater 1.0.5 updates JavaScript and bundled assets. Native dependency, permission, Firebase, signing trust-anchor and native code changes require a new APK.

## App runtime

- Client: `https://updates.152.42.230.207.sslip.io/hot-updater`; client read credential only in ignored `ota/client.json` (shape in `client.example.json`).
- Native verification: RSA4096 public SPKI in `public-key.pem`, Android manifest and iOS main app plist. Keep this public key tracked; never copy its private key into the app or Linux native build.
- Startup checks and stages a compatible fingerprint update. Account → Check for updates offers an explicit restart after download; the current chat remains open until the user restarts.
- Insights reports download/apply/recovery to the same server. Automatic native rollback restores the previous working bundle after a failed first launch.

## Publisher

Use supported Node22/24. Materialize owner-only `.env.hotupdater` locally from the deployment secret store with `HOT_UPDATER_ADMIN_TOKEN`, `HOT_UPDATER_STORAGE_TOKEN`, and `HOT_UPDATER_SIGNING_PRIVATE_KEY_PATH`. This ignored file is excluded from Linux snapshots. Admin root is `/hot-updater/admin`; storage root is `/storage` with URI protocol `amobi-ota`. Publisher credentials never belong in `ota/client.json`.

Before every new native build, regenerate the native metadata marker and fingerprint:

```sh
npm run ota:fingerprint
npm run ota:doctor
```

Keep `fingerprint.json` and the embedded native hash together. The metadata marker hashes manifest/plist content excluding the generated fingerprint field, preventing self-referential hashes. Native source/resource files are explicit fingerprint inputs. A JavaScript-only deployment must pass the existing fingerprint check:

```sh
npm run ota:deploy:android -- --channel production --message "Describe the update"
```

Do not run fingerprint generation to bypass an incompatible OTA deployment; rebuild and distribute the native APK when the hash changes. Changing the public signing key also requires a new native app; existing installations trust the old key.

## Android QA

QA uses `com.amobi.collab.platform.otaqa`, display name Amobi Collab OTA QA, native channel `ota-qa`, separate Firebase Android configuration and a separate QA keystore. It is installed alongside the original app. It is not a production signing identity.

```sh
AMOBI_OTA_QA=true npm run ota:fingerprint
AMOBI_OTA_QA=true npm run ota:doctor
AMOBI_OTA_QA=true npm run ota:deploy:android -- --channel ota-qa --message "QA update"
```

Native QA Gradle properties include `amobiQaBuild=true` and `reactNativeArchitectures=arm64-v8a`. Firebase QA configuration is ignored `android/app/qa/google-services.json`, selected only for the explicit QA build. Release compilation uses the Linux runner and `--build-only --gradle-properties-file`; follow the workspace Linux release guide. Never sign production implicitly with the QA or debug key.

After QA, revoke the temporary test session, remove the QA-only app and disable QA-only failing Releases. Regenerate the production fingerprint before a production native build.

## iOS deferred

The main delegate and public trust anchor are wired. CocoaPods installation, signed native build, device OTA/rollback testing and App Store distribution still need the iOS phase. No iOS delivery has been claimed.

## Official sources

- [App/native setup](https://hot-updater.dev/docs/get-started/app-setup)
- [Fingerprint strategy](https://hot-updater.dev/docs/guides/update-strategies/fingerprint)
- [Bundle signing](https://hot-updater.dev/docs/guides/bundle-signing)
- [Automatic rollback](https://hot-updater.dev/docs/concepts/automatic-rollback)
- [Standalone repository](https://hot-updater.dev/docs/database-adapters/standalone)
- [Standalone storage contract](https://hot-updater.dev/docs/storage-adapters/standalone)
