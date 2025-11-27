# Repository Guidelines

## Project Structure & Module Organization

- `app/`: Next.js App Router surface (`layout.tsx`, `page.tsx`, `globals.css`); API routes under `app/api/*` (e.g. `app/api/chat/route.ts` streams OpenAI responses when `OPENAI_API_KEY` is set).
- `components/`: UI system (`components/ui/*` Radix wrappers) plus feature views like `chat-interface.tsx`, `sidebar-left.tsx`, `sidebar-right.tsx`.
- `lib/`: shared logic (`store.ts` Zustand state, `types.ts` Zod schemas, `utils.ts` helpers, `lib/db/*` drizzle ORM, `lib/hooks/*`).
- `config/`, `scripts/`, `drizzle.config.ts`: model/RAG config and DB tooling; `scripts/seed.ts` seeds test data.
- `tests/` (Vitest unit/integration) and `e2e/` (Playwright); `public/` for static assets; `specs/app_mockup.png` is the UI reference.

## Build, Test, and Development Commands

- `pnpm install` — install deps; use pnpm only (lockfile is pnpm-lock.yaml).
- `pnpm dev` — start the app at <http://localhost:3000>.
- `pnpm lint` / `pnpm format` — oxlint (type-aware) and oxfmt across the repo.
- `pnpm build` / `pnpm start` — production build + TypeScript check, then serve.
- `pnpm test` / `pnpm test:watch` — Vitest suite; single test: `pnpm test -- tests/chat-export.test.ts` or `pnpm test -- -t "test name"`.
- `pnpm test:e2e` / `pnpm test:e2e:all` / `pnpm test:e2e:ui` — Playwright E2E; run one file with `pnpm test:e2e -- e2e/chat.spec.ts`.
- Database/Drizzle: prefer `pnpm db:generate`, `pnpm db:push`, `pnpm db:migrate`, `pnpm db:studio`, `pnpm db:seed`. If you invoke `drizzle-kit push` directly, always pass `--force` (non-interactive, auto-approve) instead of relying on interactive prompts.

## Coding Style & Naming Conventions

- Language: TypeScript + React 19, Next 16 App Router. Prefer Server Components unless hooks or browser APIs require `"use client"`.
- Files: kebab-case for component files (`chat-interface.tsx`); PascalCase for component names. Shared utilities live in `lib/` with concise names (`store.ts`, `types.ts`).
- Styling: Tailwind CSS v4 with tokens in `app/globals.css`; prefer existing CSS variables. Use Radix wrappers in `components/ui/*` instead of new primitives.

## Testing & Workflow Guidelines

- Happy path: `pnpm dev`, open `/`, send a chat, switch personas/models, verify export and basic RAG.
- When adding tests, name them `<feature>.test.ts` or `<feature>.spec.ts` and colocate under `tests/` or `e2e/`. Aim for quick-running, focused specs.

## Commit & Scope Guidelines

- Commits: ultra-short, imperative, lowercase (e.g. `add persona slider`, `fix chat stream`).
