# Persona App – Multi‑Phase Product Spec (UI, Features, Runtime Behavior)

This spec extends the engine spec and assumes the current UI layout (sidebar chats, central chat pane, right "Character & Memory" panel). It focuses on *product‑level* behavior, UX, and runtime features, updated with your decisions.

Implementation stack (current decision):

- Backend data store: PostgreSQL 18.x with pgvector in the same cluster, run via Docker Compose for local development and tests (separate dev/test databases).
- ORM: DrizzleORM for PostgreSQL.
- Testing: dedicated PostgreSQL test database used by automated tests (unit + e2e).

---

## Phase 1 – Solid Core UX (Chats, Characters, RAG Basics)

Goal: Turn the prototype into a stable, daily‑usable core for a single power user.

### 1.0. Auth & Identity (Dev Mode)

- Email/password auth for a single dev user, stored in Postgres with session-based sign-in.
- `user_id` is required on all user-owned entities (chats, characters, knowledge base, tools config, usage stats).
- Seed a default dev user and per-user settings row for local use (e.g. keyboard preferences like “Enter sends vs Ctrl+Enter”).

### 1.1. Chats & Sessions

- Persist conversations per user, per character (each conversation has a `character_id` that can be changed later from the UI).
- Sidebar:
  - Each chat shows title, last message preview, and a small character avatar/initial.
  - Support rename, archive, delete.
- Chat actions:
  - "New Chat" (with last‑used character).
  - "New Chat with This Character" from character panel.
- Archive vs delete semantics:
  - **Archive**: remove from active views and from normal recall, but keep in an Archived collapsible area in the sidebar; these messages are excluded from RAG and cognitive consolidation.
  - **Delete**: hard delete from storage and embeddings; later phases add subconscious recalibration jobs to remove traces from higher memory layers.

### 1.2. Character Panel Integration

- Character Profile dropdown fully wired:
  - List of all constructs owned by the current user.
  - Search/filter.
  - Actions: Edit, Duplicate, Archive, Delete, Export.
- Character selection is per chat; switching the character in a chat updates the conversation’s `character_id` and shows a visual separator in the UI noting the change (no extra message is stored).
- Character panel shows:
  - Name, avatar, tagline.
  - Brief description of role with the user.

### 1.3. Model Settings (Per Character, Per Chat Overrides)

- Model list shows:
  - Cloud vs Local badges.
  - Approx context (e.g. 8K, 32K).
  - Relative speed/cost indicators.
  - Model catalog loaded from `config/models.json` (per-model id, provider, and metadata).
- Per character:
  - Default model/profile selection (e.g. "Fast local", "Smart cloud").
  - Default temperature and other basic sampling knobs.
- Per chat:
  - Can override the model/profile for that thread.
  - Remember last used model for that chat.
- Plan for future multi‑model routing, but for now one active model per request.

### 1.4. RAG / Knowledge Base (Per Character)

- Right panel: compact "Memory (RAG)" status plus an entry point into the advanced Settings / Memory viewer.
- For each character:
  - Upload documents (PDF, TXT, DOCX, code bundles from repomix once integrated), stored on the local filesystem with a future path to S3-style storage.
  - Enforce a 10MB per-file size limit (no strict file type restrictions initially).
  - Show file list with name, type, size, status (Indexing, Ready, Failed).
  - Actions: Remove, Re‑index, Pause (exclude from retrieval without deletion).
- Simple retrieval behavior:
  - For each turn, fetch a configurable top‑K (default 8) of relevant chunks tied to this user+character, excluding archived conversations.
  - Inject them into the prompt in a compact way as a "Relevant past info" block.
  - Log which memory items were used for each assistant reply (for later Memory Inspector tooling).
  - Store the default top‑K (8) in a small RAG config so it can be tuned without code changes or exposed in advanced settings later.

### 1.5. Message Copy & Export (Day‑One Requirement)

- Every assistant and user message has a "Copy" button, shown on hover.
- Keyboard shortcut: `Ctrl+Shift+C` copies the last assistant message.
- Chat‑level export menu:
  - Export conversation as Markdown and/or JSON including system and tool messages as well as user/assistant messages.
  - All timestamps are exported in UTC and include character + model metadata.
  - Later phases can add "Export summary" and richer formats.

### 1.6. Basic UX Polish

- Keyboard shortcuts:
  - `Ctrl+Enter` / `Cmd+Enter` to send.
  - `Enter` vs `Ctrl+Enter` behavior is configurable per user and stored in settings.
  - `Esc` to blur input.
- Light/Dark/System theme toggle using the Next.js theme libraries; default to the system theme when no preference is stored.
- Graceful error UI when a model call fails; message can be retried by re-sending the last user message.
- Standardized `/api/chat` error payload shape (e.g. `{ code, message, retryable }`) for consistent handling.
- Global Settings dialog/page for advanced configuration:
  - Keyboard preferences.
  - RAG on/off per user/character (simple toggle in early phases).
  - Entry point to the per-character memory viewer and advanced character configuration.

---

## Phase 2 – Character Studio & Import/Export

Goal: Let you create, tune, version, and move constructs between machines.

### 2.1. Character Library

- Separate "Characters" view:
  - Cards for each construct with name, avatar, tagline, and tags (Friend, Work, NSFW, etc.).
  - Filters and search.
- Actions per character:
  - Open in builder.
  - Duplicate.
  - Archive / Delete.
  - Export.

### 2.2. Character Builder

- Multi‑step builder:
  1. Basics: name, avatar, tagline, high‑level archetype.
  2. Personality & behavior: tone, traits, boundaries, how to treat you.
  3. Background & life history.
  4. Current life details / present situation.
  5. Advanced: local custom instructions, NSFW toggle, model defaults, tool permissions.
- Per field:
  - "Enhance with AI" / "Fill with AI" using a model call.
  - Side‑by‑side preview with apply/cancel.

### 2.3. Archetypes & Templates

- Built‑in starter archetypes (e.g. Coding Partner, Daily Check‑In, Emotional Anchor, Writing Coach, NSFW Lover).
- Choosing an archetype pre‑fills sections; everything remains editable.
- Any constructed persona can be saved as a reusable template.

### 2.4. Import / Export & Portability

- Portable character export format (`PortableCharacterV1`) that includes:
  - Persona fields and behavior rules.
  - Custom instructions.
  - Model profile preferences / operational profile.
- Same format is used for:
  - Seeding built-in characters from markdown templates stored under `config/characters`.
  - Import/export flows between machines and future hosted mode.
- When combined with a copy of the user’s vector database, constructs are **portable** between machines.
- No public gallery or share‑link in this phase; sharing is manual via files.

### 2.5. Versioning & Checkpoints (Construct‑Level)

- Ability to take a snapshot of a character configuration:
  - Labelled versions (e.g. "Sam v1.0", "Sam v1.1 – after new boundaries").
  - Snapshot includes persona, behavior rules, and later: relationship state and cognitive highlights.
- Simple UI in builder to switch between or duplicate from a checkpoint.

---

## Phase 3 – Dev‑Grade Memory Controls (RAG‑Level)

Goal: Keep RAG transparent and tweakable without exposing full cognitive graph yet.

### 3.1. Knowledge Base Management

- In the right panel or a dedicated sub‑tab:
  - Show all files contributing to this character’s RAG.
  - Tag files (Work, Personal, Code, Docs, etc.).
- File actions:
  - Toggle inclusion per chat (e.g. "use only Work files in this conversation").
  - Global toggle per character: "Use RAG heavily" vs "Use RAG lightly" vs "Ignore RAG".

### 3.2. Memory Inspector Lite

- Developer‑oriented drawer showing for the last N replies:
  - Which RAG snippets were retrieved.
  - Which file each snippet came from.
- One‑click actions:
  - "This snippet was wrong / misleading" → lower its priority or mark as excluded.

### 3.3. Forgetting Tools

- Per‑conversation action: "Forget this conversation":
  - Deletes messages and related embeddings.
  - Enqueues a subconscious recalibration job to update memory representation.
- Per‑file: remove and optionally purge chunks from the vector store.

---

## Phase 4 – Voice I/O and Local Tools

Goal: Bring in local voice and tool use so the app becomes your main AI cockpit.

### 4.1. Voice Input (Whisper.cpp)

- Push‑to‑talk button in the chat input area.
- Uses local whisper.cpp for transcription.
- Options per user:
  - Input language and auto‑detect.
  - Show live transcript before sending.

### 4.2. Local TTS (VibeVoice)

- Per character, optional **voice profile** for playback (TTS only; does not affect writing style yet).
- Toggle per chat: "Read replies aloud".
- Basic playback controls and per‑character voice selection.

### 4.3. Tool System (Python/JS, HTTP, MCP)

- Define a tool layer where characters can call:
  - Local Python or Node.js scripts (with configurable sandbox boundaries).
  - HTTP fetch for web search and APIs.
  - MCP tools for more structured capabilities.
- Per character:
  - Tool permissions (which tools they can use).
  - Defaults (e.g. coding partner can run code, emotional support character cannot).
- Tool definitions follow the OpenAI tools/functions JSON schema for arguments and result types where supported by providers.
- UI hints when a tool is used (e.g. small label under a message).

### 4.4. Code Context via Repomix

- "Attach code" button in the chat:
  - Run repomix on a chosen folder/repo.
  - Upload the packed result as a temporary or persistent knowledge base for that chat/character.
- Show an info row in the right panel when a repo bundle is attached.

---

## Phase 5 – Productivity Workflows and Conversation Summaries

Goal: Turn Persona into a daily workbench for writing, coding, planning, and emotional check‑ins.

### 5.1. Saved Prompts and Quick Actions

- Per character and global saved prompts.
- Quick actions near the input:
  - Summarize selection.
  - Rewrite with tone adjustments.
  - Ask follow‑up based on last answer.

### 5.2. Scratchpad / Notes

- Chat‑attached markdown scratchpad for TODOs, ideas, and working plans.
- Optional export of scratchpad along with conversation.

### 5.3. Conversation Export Enhancements

- In addition to full chat export:
  - "Export conversation summary" → generate and download a Markdown summary (key points, decisions, TODOs).

### 5.4. Coding QoL

- Code blocks with syntax highlighting and copy buttons.
- Optional monospace chat view mode for coding‑heavy characters.

---

## Phase 6 – Multi‑User, Auth, and Tenancy Prep

Goal: Prepare for eventual hosted/product mode with clear data isolation and billing.

### 6.1. Authentication

- Extend the basic email/password auth from Phase 1 to multi-user mode.
- Optional OAuth providers (GitHub/Google, etc.) for hosted mode.
- Distinct single‑tenant dev mode vs multi‑tenant hosted mode, both using the same `user_id`-scoped data model.

### 6.2. Per‑User Isolation

- All data (chats, characters, knowledge base, tools config, usage stats) is namespaced by `user_id`.
- No cross‑user leakage of characters or data by default.

### 6.3. Billing‑Ready Architecture

- Internal usage tracking per user:
  - Tokens by provider.
  - Local vs cloud usage.
- Hooks for future pricing:
  - Subscription tiers.
  - Usage‑based metering (provider token price + 20% margin).

---

## Phase 7 – NSFW Handling and Construct Boundaries

Goal: Normalize NSFW as a first‑class capability while keeping future product switches available.

### 7.1. Default Behavior

- If the underlying model and character instructions allow it, NSFW emerges naturally from the conversation.
- No global app‑level NSFW kill switch in your personal build.

### 7.2. Per‑Character Controls

- In character builder:
  - NSFW toggle (for future hosted builds) – currently advisory.
  - Optional "intimacy / explicitness" slider controlling how far the persona is allowed to go in sexual content.
- Future ‑ when productized:
  - In hosted mode, global NSFW policy can override per‑character settings.

---

## Phase 8 – Evaluation, Ratings, and Insight Lite

Goal: Give you tools to measure vibe and performance, and to generate data for deeper analysis.

### 8.1. Internal Rating UI

- Per assistant message or per chat segment, a small rating widget (e.g. 1–5 or simple thumbs up/down with tags).
- Ratings stored with:
  - Character id.
  - Model used.
  - Context tags (topic, NSFW, work vs emotional, etc.).
- Exportable ratings dataset for offline/statistical analysis.

### 8.2. Conversation and Character Summaries

- From the export menu:
  - "Export conversation summary" → model‑generated Markdown summary.
  - Optional "What did you learn about me in this conversation?" view (Insight Lite).

### 8.3. Basic Test Harness

- Hidden dev panel to:
  - Pick a character.
  - Run a small suite of canned prompts (comfort, critique, explanation, flirting under constraints).
  - Show outputs and allow you to rate/tweak.

---

## Phase 9 – Future: Sessions, Mood, Evolve, Deep Insight

The deep memory graph, mood engine, subconscious, and Evolve mode are specced in the **Synthetic Character Engine** document. Product‑wise, this phase will:

- Add light session semantics (ongoing vs one‑off chats).
- Show subtle mood badges in the UI.
- Gate Insight Mode and graph inspector behind an advanced/dev toggle.
- Introduce construct checkpoints tied not just to persona, but to evolving relationship state.

These features should be layered only after Phases 1–5 feel rock‑solid in daily use, so you’re building complexity on top of a dependable core.
