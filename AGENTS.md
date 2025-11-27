# Repository Guidelines

## Project Structure & Module Organization
- `app/` holds the Next.js App Router surface (`layout.tsx`, `page.tsx`, `globals.css`). API routes live under `app/api/` (e.g., `app/api/chat/route.ts` streams OpenAI responses when `OPENAI_API_KEY` is set).
- `components/` contains the UI system (`components/ui/*` Radix wrappers) plus feature views such as `chat-interface.tsx`, `sidebar-left.tsx`, `sidebar-right.tsx`.
- `lib/` keeps shared logic (`store.ts` Zustand state with persistence, `types.ts` Zod schemas, `utils.ts` helpers).
- `public/` serves static assets; `specs/app_mockup.png` is the reference mock.

## Build, Test, and Development Commands
- `pnpm install` — install deps; use pnpm only (lockfile is pnpm-lock.yaml).
- `pnpm dev` — start the local server at http://localhost:3000.
- `pnpm lint` — type-aware oxlint with the Next core-web-vitals rules.
- `pnpm format` — run oxfmt across the repo.
- `pnpm build` — production build + TypeScript check; fails if types break.
- `pnpm start` — serve the last build. Use when verifying a production bundle.

## Coding Style & Naming Conventions
- Language: TypeScript + React 19, Next 16 App Router. Prefer Server Components unless hooks or browser APIs require "use client".
- Files: keep kebab-case for component files (`chat-interface.tsx`); component names PascalCase. Shared utilities stay in `lib/` with concise names (`store.ts`, `types.ts`).
- Styling: Tailwind CSS v4 with theme tokens defined in `globals.css`; use existing CSS variables before adding new ones. Radix UI primitives already wrapped in `components/ui/*`—reuse them rather than new bespoke elements.

## Testing Guidelines
- No automated suite yet; do a manual pass: `npm run dev`, load the main page, send a chat, toggle personalities and model settings. Treat this as the happy-path check until tests exist.
- When adding tests, keep names `<feature>.spec.tsx` and colocate with the feature or under `__tests__/` if shared. Aim for quick-running UI smoke tests first.

## Commit & Pull Request Guidelines
- Commits: ultra-short, imperative, lowercase preferred (e.g., `add persona slider`, `fix chat stream`). Keep scope tight.
- PRs: describe intent, link issue (if any), and include before/after notes or screenshots for UI changes. Call out any new env vars (e.g., `OPENAI_API_KEY`), migrations, or breaking behavior.

## Scope & Configuration Notes
- This repo is an MVP: favor minimal, demonstrable value over completeness. Security and validation are intentionally light; do not block on auth.
- Reuse existing patterns first (Zustand store, Radix wrappers, Tailwind tokens). Add new dependencies only when necessary. Keep dependencies managed by pnpm; do not reintroduce npm/yarn lockfiles.
