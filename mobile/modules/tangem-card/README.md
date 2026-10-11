# tangem-card

Expo module for Tangem cards as an NFC credential: read the card's Solana key, sign Solana
messages. Android only. JS lives in `src/lib/nfc/tangem/`; the card-kind adapter in
`src/lib/nfc/credentials.ts`.

## The vendored SDK

`vendor/tangem-sdk-android` is Tangem's SDK at a pinned commit, built from source by the two Gradle
subprojects in `android/sdk/` (wired in by `plugins/with-tangem-sdk`). It isn't in git: the first
Android build downloads it from GitHub and checks its SHA-256 (`android/sdk/vendor.gradle`). It used
to be a submodule, but Cloudflare's web deploys couldn't fetch submodules.

`android/sdk/android/src/overrides/` holds our copies of vendor files that don't work in this app
as they are. `android/sdk/android/build.gradle` swaps them in (`overriddenSources`); each file says
why. Today that's one:

- `NoAutofillTextInputEditText.kt`: upstream reads `com.google.android.material.R.attr.editTextStyle`,
  which Material 1.13 (the version the app resolves) no longer has, so Tangem's access-code sheet
  crashed on open. Ours reads it from AppCompat's R.

## Updating the SDK

1. In `android/sdk/vendor.gradle`, set `TANGEM_SDK_COMMIT` to the new upstream commit and
   `TANGEM_SDK_SHA256` to the hash of its archive:
   `curl -sSL https://codeload.github.com/tangem/tangem-sdk-android/tar.gz/<commit> | sha256sum`.
   The next build downloads it.
2. For each file in `android/sdk/android/src/overrides/`, diff it against the new upstream file.
   Carry over upstream changes, or delete the override (and its `overriddenSources` entry) if
   upstream fixed the problem itself.
3. Check upstream's dependency versions (`vendor/tangem-sdk-android/gradle/libs.versions.toml`)
   against `android/sdk/*/build.gradle`.
4. Build a release APK and open a Tangem read on a phone: the sheet must open and ask for the
   access code.
