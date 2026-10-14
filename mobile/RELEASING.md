# Releasing the mobile app

From the repo root, on an up-to-date `main`:

```bash
bun release:mobile:devnet    # preview: GitHub pre-release, never goes to the dApp Store
bun release:mobile:mainnet   # product: GitHub draft, then the dApp Store
```

release-it prompts in the terminal; `Ctrl+c` to stop.

Rehearse first with `bun release:mobile:devnet --dry-run`. It runs the
git checks and prints every step without running any. To test the signed build itself:
`cd mobile && bunx expo prebuild -p android && HEIRLOOM_RELEASE_SIGNING=required bun apk:devnet`.

## Setup

- `gh auth login`, plus the Android setup and env files from `README.md`.
- The release keystore in `~/.gradle/gradle.properties` (below).

## Names and versions

| | Devnet | Mainnet |
|---|---|---|
| Version | `0.2.0` | `1.0.0` and up |
| Tag | `mobile/v0.2.0` | `mobile/v1.0.0` |
| GitHub release | `Heirloom Mobile 0.2.0 (Devnet)`, pre-release | `Heirloom Mobile 1.0.0`, draft |
| APK | `heirloom-0.2.0-devnet.apk` + `.sha256` | `heirloom-1.0.0.apk` + `.sha256` |

The release asks for the bump. Patch: fixes only. Minor: anything new. Major: `1.0.0` is mainnet
launch; after that, only when users must act (e.g. an app that can't talk to an upgraded program).
Plain `MAJOR.MINOR.PATCH`, minor and patch below 100, never reused. Android's `versionCode` is
derived from it in `app.config.ts`; don't set it.

## Release keystore

The `.jks` file is a password-protected container holding the private key that signs every
release APK. Phones only install an update signed by the same key as the installed app, so it is
created once and kept forever.

**Once, by one person:**

```bash
keytool -genkeypair -v -keystore heirloom-release.jks -alias heirloom \
  -keyalg EC -groupname secp256r1 -validity 10000
```

Put the file and both passwords in the password manager, plus an encrypted offline backup.

**On each machine that releases:** download the `.jks` outside the repo, then add to
`~/.gradle/gradle.properties`:

```properties
HEIRLOOM_RELEASE_STORE_FILE=/absolute/path/to/heirloom-release.jks
HEIRLOOM_RELEASE_STORE_PASSWORD=...
HEIRLOOM_RELEASE_KEY_ALIAS=heirloom
HEIRLOOM_RELEASE_KEY_PASSWORD=...
```

Lost, it can never be replaced: users would have to uninstall and reinstall a new app. Leaked,
someone can sign APKs that install over ours when sideloaded (not via the dApp Store, which also
needs the publisher keypair).

## What a release does

1. Checks: on `main`, clean, up to date, mobile changes since the last tag, env file and keystore
   present, lint, tests, typecheck.
2. Asks for the bump; stops if the tag already exists (or if mainnet is below `1.0.0`).
3. Bumps `app.json` and `package.json`, builds the signed APK into `dist/` with its checksum.
4. Commits, tags, pushes, creates the GitHub release with the APK attached.

If the build fails, only the two version files changed: `git checkout -- mobile/app.json mobile/package.json`.

## After a mainnet release

A draft release is only visible to the team. It is the release candidate.

1. Install its APK and run the checks below. If one fails: delete the draft, fix, release the next patch.
2. Publish it: `gh release edit mobile/v<version> --draft=false --latest`.
3. Upload that same APK to the dApp Store with the publisher keypair. Never rebuild for the store.

## Shared secrets

In the password manager, never in the repo.

| Secret | Who needs it |
|---|---|
| Release keystore and passwords | Whoever releases |
| dApp Store publisher keypair | Whoever publishes to the store |
| `.env.devnet`, `.env.mainnet` | Anyone building APKs |

## Device checks

- Create an estate with SOL and with two tokens
- Top up SOL, top up a held token, add a new token
- Check in; change heir; close an estate that holds tokens
- Wallet claim
- Card claim with a sweep, on a JCOP 4 card and on a Tangem card
- Fail a card claim mid-way (lift the card), then retry
- Toasts, and the email reminder code entry

## Don'ts

- Don't release from a branch or a dirty tree.
- Don't edit `versionCode` by hand, or use version suffixes.
- Don't sign a store build with the debug keystore.
- Don't reuse a version: bump, even for a one-line fix.
- Don't rebuild for the dApp Store: publish the file from the GitHub release.
- Don't send devnet builds to the dApp Store.
- Don't put secrets in `EXPO_PUBLIC_*`: they ship inside the APK.
