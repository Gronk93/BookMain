# BookMind

BookMind is a focused reading workspace that turns personal books into a more intentional, interactive reading experience.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `artifacts/bookmind/src/App.tsx` — current library and reader prototype
- `artifacts/bookmind/src/index.css` — BookMind visual tokens and reading surface styles
- `attached_assets/` — source product requirements and uploaded reference files

## Architecture decisions

- The first vertical slice is browser-local so the reading experience can be validated before adding accounts, OCR, storage, or AI services.
- Book progress, notes, bookmarks, imported book metadata, and reader theme are persisted in localStorage.
- The reader keeps the original document / future interpreted text boundary open for a later PDF processing service.

## Product

The current prototype includes a personal library, local PDF import with a visible preparation state, continue-reading progress, a responsive reading surface, page navigation, theme switching, bookmarks, notes, and a contextual explanation panel.

## User preferences

The product should feel calm, warm, focused, and useful rather than like an enterprise dashboard.

## Gotchas

- The first version is intentionally local-only; an imported PDF is represented as a book record and does not yet run real parsing or OCR.
- Run the artifact workflow for the preview because Vite expects `PORT` and `BASE_PATH` from the managed workflow.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
