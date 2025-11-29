# Persona

Persona is an AI companion app that lets you chat with custom personality constructs, tweak model behavior, and experiment with memory controls. Think of it as a sandbox for testing how tone, prompts, and retrieval settings change the feel of an AI chat experience.

> Prototype-first mindset: we prioritize showing the experience quickly, then layering depth.

## Features

- **Multiple characters** – Sam (friend), Therapist, Coding Guru, Creative Writer, Data Analyst, or create custom personas via the Character Builder
- **Local-first AI** – LM Studio for chat models, KoboldCpp for embeddings—no cloud dependency required
- **RAG memory system** – Upload documents, auto-index with BGE-M3 embeddings, retrieve relevant context per conversation
- **Model dial-ins** – Swap between local and cloud models, adjust temperature, per-character and per-chat overrides
- **Streaming chat** – Real-time message streaming via AI SDK v5
- **Character versioning** – Snapshots, checkpoints, import/export for portability

## Architecture

```text
┌─────────────────────────────────────────────────────────────┐
│                    Next.js 16 App                           │
│                   (localhost:3000)                          │
└─────────────┬─────────────────────────────┬─────────────────┘
              │                             │
              ▼                             ▼
┌─────────────────────────┐   ┌─────────────────────────┐
│      LM Studio          │   │      KoboldCpp          │
│    (localhost:1234)     │   │    (localhost:5001)     │
│                         │   │                         │
│  • Chat completions     │   │  • BGE-M3 embeddings    │
│  • OpenAI-compatible    │   │  • 1024 dimensions      │
│  • Local LLMs           │   │  • Docker container     │
└─────────────────────────┘   └─────────────────────────┘
              │                             │
              └──────────────┬──────────────┘
                             ▼
              ┌─────────────────────────┐
              │      PostgreSQL 18      │
              │    (localhost:5432)     │
              │                         │
              │  • pgvector extension   │
              │  • Conversations        │
              │  • Characters           │
              │  • Memory items         │
              │  • Background jobs      │
              └─────────────────────────┘
```

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 16, React 19, Tailwind v4, shadcn/ui |
| State | Zustand + Zod v4 validation |
| Database | PostgreSQL 18 + pgvector + DrizzleORM |
| Chat | AI SDK v5, LM Studio (local), OpenAI (cloud fallback) |
| Embeddings | KoboldCpp + BGE-M3 (local), OpenAI (fallback) |
| Jobs | pg-boss (PostgreSQL-backed queue) |

## Quick Start

### Prerequisites

- Node.js 20+
- pnpm
- Docker Desktop
- LM Studio (for chat models)

### 1. Clone and install

```bash
git clone <repo-url>
cd persona
pnpm install
cp .env.example .env
```

### 2. Start infrastructure

```bash
docker compose up -d
```

This starts:
- **PostgreSQL** on port 5432 (with pgvector)
- **KoboldCpp** on port 5001 (downloads BGE-M3 model on first run, ~438MB)

Wait for KoboldCpp to be ready:
```bash
# Check health
curl http://localhost:5001/api/v1/models
```

### 3. Initialize database

```bash
pnpm db:push    # Apply schema
pnpm db:seed    # Seed default characters
```

### 4. Start LM Studio

1. Open LM Studio
2. Load a chat model (e.g., Qwen3-8B, Llama 3.2)
3. Start the local server on port 1234

### 5. Run the app

```bash
# Terminal 1: Next.js dev server
pnpm dev

# Terminal 2: Background job worker
pnpm worker:dev
```

Open <http://localhost:3000>

## Environment Variables

```bash
# Database
DATABASE_URL="postgresql://persona:persona_dev@localhost:5432/persona_dev"

# LM Studio (chat models)
LM_STUDIO_BASE_URL="http://localhost:1234/v1"

# KoboldCpp (embeddings) - Docker handles this
EMBEDDING_BASE_URL="http://localhost:5001/v1"

# Optional: OpenAI fallback
OPENAI_API_KEY="sk-..."
```

## Scripts

| Command | Purpose |
|---------|---------|
| `pnpm dev` | Start Next.js dev server |
| `pnpm build` | Production build |
| `pnpm worker:dev` | Start background job worker |
| `pnpm db:push` | Push schema to database |
| `pnpm db:seed` | Seed default data |
| `pnpm db:studio` | Open Drizzle Studio |
| `pnpm test` | Run test suite |
| `pnpm lint` | Run oxlint |

## Project Structure

```text
app/                    # Next.js App Router
├── api/                # API routes (chat, conversations, characters, etc.)
├── characters/         # Character library and builder
├── knowledge-base/     # Knowledge base management
components/             # React components
├── chat/               # Chat interface
├── sidebar-left/       # Conversation list
├── sidebar-right/      # Character & memory panel
lib/
├── db/                 # DrizzleORM schema and client
├── rag/                # RAG system (embedding, retrieval, indexing)
├── jobs/               # pg-boss job queue
├── providers/          # LM Studio, OpenAI providers
config/
├── models.json         # Available chat models
├── rag.json            # RAG configuration
├── characters/         # Built-in character templates
```

## RAG System

The RAG (Retrieval-Augmented Generation) system provides per-character knowledge bases:

1. **Upload** – Files are stored locally, metadata in PostgreSQL
2. **Index** – Background worker chunks files and generates embeddings via KoboldCpp
3. **Retrieve** – On each chat turn, relevant chunks are fetched via pgvector similarity search
4. **Inject** – Retrieved context is added to the system prompt

Configuration in `config/rag.json`:
- Default top-K: 8 chunks per query
- Embedding model: BGE-M3 (1024 dimensions)
- Chunk size: 500 tokens with 50 token overlap

## Roadmap

See [TODO.md](./TODO.md) for detailed progress. Current phase: **Phase 3 – Dev-Grade Memory Controls**

- ✅ Phase 0: Foundation & UI shell
- ✅ Phase 1: Core UX (chats, characters, RAG basics)
- ✅ Phase 2: Character Studio & Import/Export
- 🟡 Phase 3: Memory controls & forgetting tools
- ⬜ Phase 4: Voice I/O and local tools
- ⬜ Phase 5: Productivity workflows

## Contributing

Issues and PRs welcome. Keep commits tight and descriptive.
