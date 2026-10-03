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

### Colours

- Mobile: every colour comes from `mobile/src/theme.ts`. No hex values in
  components; add a named token to the theme instead.
- Web: use the Tailwind tokens from `index.css` / `global.css`, not raw hex.
