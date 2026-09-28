# Agent conventions

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
