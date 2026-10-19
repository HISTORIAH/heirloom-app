# Agent conventions

These apply to the whole repo. Sections name the packages they cover.

## Changelogs

- `programs/heirloom` and `programs/heirloom-ika` each keep a `CHANGELOG.md`
  ([Keep a Changelog](https://keepachangelog.com/en/1.1.0/)) covering the program and
  its generated clients.
- When a change affects a program's interface or its generated client (accounts,
  instruction args, errors, client API, client dependencies), add an entry under
  `## [Unreleased]` in that program's changelog, in the same change. Mark breaking
  changes with **Breaking:**.
- Don't add changelog entries for app/, mobile/, landing/ or docs/.

## Shared code between web and mobile

Covers `packages/core` and, once it exists, `packages/react`.

### What goes where

- `@heirloom/core` (`packages/core`): logic both apps run the same way. Plain
  TypeScript: no React, no `window`, `document`, `localStorage`, Node or React Native
  APIs. Platform things (RPC client, URLs, signer, transaction version) come in as
  arguments.
- `@heirloom/react` (`packages/react`, not created yet): react-query hooks over core,
  reading the RPC, config and signer from one provider. Create it only once two or
  three hooks are identical in both apps; until then each app keeps thin hooks of
  its own over core.
- Stays in each app: UI and styling, navigation, wallet connection and signing
  (wallet-standard on web; Mobile Wallet Adapter and NFC on mobile), storage and
  secrets, environment variables, and the wording users see.
- Imports only go one way: apps → `@heirloom/react` → `@heirloom/core` →
  `@historiah/heirloom`. Core never imports React or an app; packages never import
  from `app/`, `app-ika/` or `mobile/`.

### Shared first

- Before writing logic in `app/`, `app-ika/` or `mobile/`, check whether the other
  app has it or will need it: API calls, DAS lookups, estate reads, role checks
  (owner, heir, guardian), instruction builders, transaction planning and error
  handling. If so, write it in `@heirloom/core` and import it from both, instead
  of adding a second copy.
- When you touch logic that is still duplicated in both apps, move it to core in the
  same change if it's small; otherwise note the duplication in your summary.
- Share only what is the same. Code that only looks alike (different dust rules,
  sorting, fallbacks, copy) stays in each app; don't merge it behind flags. Share
  the common part and keep the differences in the app, like mobile's `assetLabel`
  over core's `assetDisplay`.
- Never hard-code a transaction message version in shared code. Web picks v1 or v0
  per wallet (`transactionVersionFor`); MWA only signs v0. Core takes the version as
  an argument.

### Layout

- Organise core by domain, one folder each: `src/assets/`, later `src/estate/`,
  `src/tx/`, `src/api/`. Each domain is one entry in `package.json` `exports`
  (`@heirloom/core/assets`) with an `index.ts`. A file that fits no domain is
  usually app code; add a domain only for a real new area, never `utils`, `lib`,
  `helpers` or `common`.
- Types go in `src/types/<domain>.ts`; fixed values in `src/<domain>/constants.ts`.
  Apps import both from the package (`import type { DasAsset } from
  "@heirloom/core/assets"`) and don't redeclare them in their own `types/`.
- Inside packages, use relative imports. Never use `@/`: packages are consumed as
  source, so `@/` would resolve to the importing app's `src/`.
- Tests live in `packages/<name>/tests/`, mirroring `src/`, and import through the
  public entry point (`@heirloom/core/assets`). Run them with `bun test tests`.
- A new package must be added to both bundlers: `optimizeDeps.exclude` and
  `server.watch` in `app/vite.config.ts`, and `watchFolders` in
  `mobile/metro.config.js`. Pin dev dependencies to versions the repo already uses.

## TypeScript apps — separation of concerns

Covers `app/`, `app-ika/` and `mobile/`. `<pkg>` below is the package's `src/`.

### Types

- Use `export type X = { ... }`, never `interface`.
- Never define shared types inline in services, hooks, components or screens. A
  type used by more than one file belongs in `<pkg>/types/`. Props and state types
  used only inside one component may stay in that file.
- Before adding a type, search `<pkg>/types/` and reuse what exists (e.g. `EstateKind`).
- If nothing exists, add it to `<pkg>/types/<domain>.ts`, matching the service or
  feature (`services/api/reminders.ts` ↔ `types/reminders.ts`, the create flow ↔
  `types/create.ts`). Create the file if missing.
- Types built on the generated Heirloom client (`@historiah/heirloom`) go in
  `<pkg>/types/program.ts`, not the domain file. Domain files hold backend API
  and app-level types only.
- Import types with `import type { ... } from "@/types/<domain>"`.

### Config and environment

- Environment variables are read in one place only: `app/src/config/`,
  `app-ika/src/config/`, `mobile/src/config.ts`. Everything else imports the
  value from there. Never touch `import.meta.env` or `process.env` elsewhere.
- Web apps use `VITE_*`; mobile uses `EXPO_PUBLIC_*`.

### Constants

- Fixed values — amounts, durations, limits, addresses, preset lists, defaults —
  go in `<pkg>/lib/constants.ts`, or in the domain module that already owns that
  kind of value (mobile timing limits and presets live in `lib/estateTiming.ts`).
  Search both before adding; reuse rather than redefine.
- Don't declare them at the top of a screen, component or hook.
- Exception: purely visual measurements used by one component (a frame size, a
  bar count) may stay in that component.

### Tests

- Tests never sit next to the code they test. Each package keeps them in a
  top-level `tests/` folder beside `src/` (e.g. `mobile/tests/`).
- In these apps, `tests/` mirrors `src/`: `src/lib/nfc/apdu.ts` is tested in
  `tests/lib/nfc/apdu.test.ts`.
- Import the code under test through the `@/` alias, not relative paths.
- The generated clients are different: `clients/*/js/tests/` stays flat, one file
  per program instruction or flow (`claim.test.ts`, `revoke.test.ts`), since
  their `src/` is generated.

### Colours

- Mobile: every colour comes from `mobile/src/theme.ts`. No hex values in
  components; add a named token to the theme instead.
- Web: use the Tailwind tokens from `index.css` / `global.css`, not raw hex.
