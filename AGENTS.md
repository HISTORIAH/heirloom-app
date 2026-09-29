# Agent conventions

## Changelogs

- `programs/heirloom` and `programs/heirloom-ika` each keep a `CHANGELOG.md`
  ([Keep a Changelog](https://keepachangelog.com/en/1.1.0/)) covering the program and
  its generated clients.
- When a change affects a program's interface or its generated client (accounts,
  instruction args, errors, client API, client dependencies), add an entry under
  `## [Unreleased]` in that program's changelog, in the same change. Mark breaking
  changes with **Breaking:**.
- Don't add changelog entries for app/, mobile/, landing/ or docs/.

## app/ — TypeScript types

- Use `export type X = { ... }`, never `interface`.
- Never define shared types inline in services, hooks or components.
- Before adding a type, search `app/src/types/` and reuse what exists (e.g. `EstateKind`).
- If nothing exists, add it to `app/src/types/<domain>.ts`, matching the service
  (`services/api/reminders.ts` ↔ `types/reminders.ts`). Create the file if missing.
- Types built on the generated Heirloom client (`@historiah/heirloom`) go in
  `app/src/types/program.ts`, not the domain file. Domain files hold backend API
  and app-level types only.
- Import types with `import type { ... } from "@/types/<domain>"`.
