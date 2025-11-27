# Persona ✨

Persona is an AI companion app that lets you chat with custom built personality constructs, tweak model behavior, and experiment with memory controls—all without leaving a single screen. Think of it as a sandbox for testing how tone, prompts, and retrieval settings change the feel of an AI chat experience.

> Prototype-first mindset: we prioritize showing the experience quickly, then layering depth. Security and polish are intentionally light for now.

## 💡 Why you'll like it

- **Multiple characters** – Pick from Sam (friend), Therapist, Coding Guru, Creative Writer, Data Analyst, or roll your own custom persona with a bespoke system prompt.
- **Model dial-ins** – Swap between models (GPT-3.5, GPT-4, Claude 2, Local Llama), adjust temperature, and set token budgets on the fly.
- **Memory playground** – Toggle long-term memory, upload knowledge bases (UI only for now), and control context recall via sliders.
- **Streaming chat** – Messages stream in real time with OpenAI's SDK, giving that "typing" feel users expect.
- **State persistence** – Zustand keeps your settings and personalities across reloads so your setup is always waiting for you.

## 🧱 Tech stack

- Next.js 16 (App Router) + React 19
- Tailwind CSS v4 with custom dark-teal theme
- shadcn/Radix UI primitives for consistent widgets
- Zustand + Zod for state and validation
- Vercel AI SDK for streaming chat transport

## 🚀 Quick start

```bash
pnpm install      # install dependencies
pnpm dev          # start the dev server on <http://localhost:3000>
```

To actually hit OpenAI, set `OPENAI_API_KEY` in your environment before running the dev server. Without it, the UI works but chat will error.

## 🧭 Project tour

```text
app/              # App Router pages, layouts, and API routes
components/       # UI building blocks plus chat + sidebar surfaces
lib/              # Global store, schemas, and utilities
public/           # Static assets (avatars, icons)
specs/            # Mockups and design references
```

Key UI flow lives in `components/app-shell.tsx`, which composes the left history rail, central chat interface, and right control panel.

## 🧪 Useful scripts

| Command        | Purpose |
| -------------- | ------- |
| `pnpm dev`     | Run the local dev server |
| `pnpm build`   | Production build + type check |
| `pnpm lint`    | oxlint (type-aware) |
| `pnpm format`  | oxfmt auto-formatting |

## 🗺️ Roadmap snapshot

- ✅ Core layout, personalities, streaming chat, knobs for model + memory, and themed UI are already in.
- 🟡 Still missing: real file uploads for the knowledge base, persistent chat threads, and multi-thread management.

## 🤝 Contributing

Issues and PRs are welcome—keep commits tight and descriptive per the repo guidelines (`add persona slider`, `fix chat stream`, etc.). If you tweak UI, include before/after screenshots in the PR.

---

Have ideas for new personas or memory tricks? File an issue or open a PR—we iterate fast.
