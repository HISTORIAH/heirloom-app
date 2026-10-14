# mobile

Android client. Expo 57, Expo Router. Chrome is `src/components/ui.tsx` and `src/theme.ts`.

```bash
bun install          # from repo root
bun dev:mobile
bun android          # expo run:android. Needs ANDROID_HOME. JDK 17 or 21, not 25.
```

`android/` is generated and gitignored. `bun android` installs the Heirloom APK. Expo Go is a different app and will not show our splash. JDK 17 or 21. On JDK 25, CMake dies until you `export JAVA_TOOL_OPTIONS=--enable-native-access=ALL-UNNAMED`.

`bun run test` runs the unit tests in `tests/`, which mirrors `src/` (keep the `run`: bare `bun test` is Bun's own runner and skips the script). `bun lint` runs oxlint (`.oxlintrc.json`, same rules as `app/`).

Tangem cards: see `modules/tangem-card/README.md`, including what to re-check when updating the SDK.

## Env files

All gitignored except `.env.example`. Never `VITE_*`. `EXPO_PUBLIC_*` values are compiled into the APK and readable by anyone with the app: no secrets, and RPC keys should be usage-limited at the provider.

| File | Used by |
|---|---|
| `.env.example` | Template with every variable; copy it to make the others |
| `.env` | `bun dev:mobile`, `bun android`: your local setup |
| `.env.devnet` | `bun apk:devnet`, `bun release:mobile:devnet` |
| `.env.mainnet` | `bun apk:mainnet`, `bun release:mobile:mainnet` |

`apk:devnet` is `bun --env-file=.env.devnet apk`. Expo also loads `.env` while bundling and `--env-file` values win, so a variable missing from `.env.devnet` silently comes from your `.env`. Keep the cluster files complete; they're in the password manager.

| Variable | |
|---|---|
| `EXPO_PUBLIC_SOLANA_RPC_ENDPOINT` | RPC URL. Defaults to public Solana devnet. A laptop validator from the emulator is `http://10.0.2.2:8899`, not `127.0.0.1` |
| `EXPO_PUBLIC_SOLANA_RPC_WS_ENDPOINT` | Websocket URL for the same RPC |
| `EXPO_PUBLIC_DAS_RPC_URL` | Optional. A separate RPC for DAS (token names, prices, wallet tokens) |
| `EXPO_PUBLIC_BACKEND_URL` | Heirloom backend |
| `EXPO_PUBLIC_DEMO_TIMING` | `true` adds a 1-minute check-in and wait to the create wizard, for demos and testing claims. Ignored on mainnet |

## Releases

`bun release:mobile:devnet` or `bun release:mobile:mainnet` from the repo root. See `RELEASING.md`.
