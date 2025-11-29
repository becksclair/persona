# Persona App - Implementation Progress

## Completed (Phase 0 – Foundation & UI shell)

- [x] Project setup (Next.js 16, React 19.2, Tailwind v4, shadcn)
- [x] Zustand store with persistence for personalities + model/RAG settings
- [x] Zod v4 schemas for app state and model settings
- [x] Three-panel layout (left sidebar, chat, right sidebar)
- [x] React Compiler enabled
- [x] oxlint/oxfmt configured
- [x] Dark teal theme matching mockup
- [x] Left sidebar (Persona branding, search, mock chat history, theme toggle)
- [x] Right sidebar (Character & Memory panel) with model selection + RAG controls UI
- [x] AI SDK v5 streaming integration via /api/chat
- [x] Initial personality set (Sam, Therapist, Coding Guru, Creative Writer, Data Analyst, Custom)
- [x] Model selection UI (OpenAI + local LM Studio models)
- [x] Temperature slider with badge
- [x] Knowledge Base upload area UI (stubbed)
- [x] Long-term memory toggle (UI only)
- [x] Context recall slider (UI only)

---

## Phase 1 – Solid Core UX (Chats, Characters, RAG Basics)

### 1.0 User Auth & Identity

- [x] Implement basic email/password auth with sessions for a single-tenant dev user (no OAuth yet).
- [x] Introduce `user_id` on core entities (User, Character, Conversation, Message, MemoryItem, KnowledgeBaseFile) and scope all queries to the current user.
- [x] Seed a default dev user via migration for local development and tests.
- [x] Add per-user settings table to persist chat UX preferences (e.g. "Enter sends vs Ctrl+Enter").

### 1.1 Chats & Sessions

- [x] Add Docker Compose configuration for PostgreSQL 18.x with pgvector extension enabled (volumes, ports, basic auth).
- [x] Create separate development and test databases (e.g. `persona_dev`, `persona_test`) and configure connection URLs via environment variables.
- [x] Install and configure DrizzleORM for PostgreSQL (client, schema registration, migration runner).
- [x] Define DB schema for Conversation + Message using Drizzle models matching engine spec (user_id, character_id, timestamps, context tags, meta fields for tokens/provider/tool calls, etc.).
- [x] Implement REST API routes for conversations (create on first message send, list by user/character, rename, archive, delete) using Drizzle.
- [x] Wire left sidebar chat list to real conversations (title, last message preview, avatar), including an "Archived" collapsible section.
- [x] Implement "New Chat" action that selects the last-used character and persists the conversation when the first message is sent.
- [x] Implement "New Chat with This Character" action from character panel.
- [x] Implement archive semantics (move to Archived section, hide from active views, and exclude from RAG).
- [x] Implement delete semantics (hard delete messages + embeddings; stub memory recalibration hook for later phases).
- [ ] Add unit/integration tests (Vitest) and e2e coverage (Playwright) for chat creation, switching, archive/delete, and basic error cases.

### 1.2 Character Panel Integration

- [x] Replace mock personalities store with persisted Character entities aligned to engine `Character` model (persona_fields, behavior_rules, flags, etc.), using explicit text columns rather than JSON blobs.
- [x] Seed initial built-in characters (Sam, Therapist, Coding Guru, Creative Writer, Data Analyst) via seed script (config/characters templates deferred to later phase).
- [x] Load list of characters for the current user into right panel dropdown.
- [x] Add search/filter for characters in dropdown.
- [x] Add actions from panel: Edit (disabled until builder), Duplicate, Archive, Delete. Export deferred to 2.4.
- [x] Ensure character selection is per-chat and stored on Conversation.
- [ ] When switching character in a chat, render a UI-only separator noting the change (do not persist an extra system message in the conversation history).
- [x] Show name, avatar, tagline, and brief role description in the character panel header.

### 1.3 Model Settings (Per Character, Per Chat Overrides)

- [x] Load authoritative model metadata from `config/models.json` (JSON config file including provider type enum and Cloud vs Local flags).
- [x] Define `config/models.json` schema (id, provider, metadata) and add a loader in `lib` to read it at runtime.
- [x] Extend model metadata to include context window + rough speed/cost indicators, deriving values from providers when simple enough.
- [x] Persist per-character default model/profile, temperature, and basic sampling knobs (`operational_profile`).
- [x] Allow per-chat overrides of model/profile and remember last-used model per conversation (overrides affect that conversation only).
- [x] Ensure existing conversations keep their current model if a character's default model changes later.
- [x] Ensure `/api/chat` uses per-chat overrides falling back to per-character defaults.
- [x] Update right panel UI to display Cloud vs Local badges, context size, speed/cost hints.
- [x] Add tests to ensure correct model/provider is chosen for each chat turn (including local vs cloud selection).

### 1.4 RAG / Knowledge Base (Per Character)

- [x] Implement backend file upload endpoint + storage for knowledge base files (per user + character), storing files on local filesystem with an abstraction that can later support S3-style storage.
- [x] Enforce a 10MB per-file size limit (no file type restrictions for now).
- [x] Store file metadata (name, type, size, status, tags).
- [x] Implement indexing pipeline: chunk files, embed using a local embedding provider, and store `MemoryItem`s in PostgreSQL 18 pgvector storage as per engine spec.
- [x] Surface file status in UI (Indexing, Ready, Failed).
- [x] Implement actions: Remove (soft delete), Re-index, Pause (exclude from retrieval).
- [x] On each chat turn, retrieve a configurable top-K (default 8) relevant `MemoryItem`s for (user, character, conversation), excluding archived conversations.
- [x] Inject compact "Relevant past info" block into prompts.
- [x] Log which `MemoryItem`s were used for each chat turn to support future inspector tools.
- [x] Add minimal per-character memory viewer listing files and key stats, accessible from the advanced Settings dialog.
- [x] Centralize the RAG retrieval top-K default (8) in a small config so it can be tuned without code changes.
- [ ] Refactor indexing pipeline in a later phase to run asynchronously via a background job queue instead of synchronously in the upload request.

### 1.5 Message Copy & Export

- [x] Add per-message "Copy" button for user + assistant messages, visible on hover.
- [x] Implement `Ctrl+Shift+C` keyboard shortcut to copy the last assistant message.
- [x] Implement chat-level export menu (Markdown + JSON).
- [x] Ensure exports include character, model, and UTC timestamps, and include system + tool messages as well as user/assistant messages.
- [x] Basic tests for export formats and copy interactions (including keyboard shortcut).

### 1.6 Basic UX Polish

- [x] Implement `Ctrl+Enter` / `Cmd+Enter` to send; `Enter` behavior is configurable via a setting.
- [x] Persist "Enter sends vs Ctrl+Enter" preference in the per-user settings table.
- [x] Implement `Esc` to blur input.
- [x] Ensure theme toggle fully wired (light/dark/system) and persisted using Next.js theme libraries.
- [x] Implement graceful error UI using structured errors from `/api/chat` with "Retry" action that re-sends the last user message.
- [x] Standardize `/api/chat` error payload shape (e.g. `{ code, message, retryable }`) and log failures for debugging.
- [x] Add small loading/streaming indicators in chat header or input area.
- [x] Add a Settings dialog/page for advanced configuration (keyboard preferences, RAG on/off, entry point to per-character memory viewer and advanced character configuration).

---

## Phase 2 – Character Studio & Import/Export

### 2.1 Character Library

- [x] Add dedicated "Characters" view/route.
- [x] Render cards for each character with avatar, name, tagline, and tags.
- [x] Implement filters and search (e.g. Friend, Work, NSFW).
- [x] Wire actions per card: Open in builder, Duplicate, Archive/Delete, Export.

### 2.2 Character Builder

- [x] Implement multi-step character builder UI:
  - [x] Step 1: Basics (name, avatar, tagline, archetype).
  - [x] Step 2: Personality & behavior (tone, traits, boundaries, how to treat you).
  - [x] Step 3: Background & life history.
  - [x] Step 4: Current life details / present situation.
  - [x] Step 5: Advanced (custom instructions, NSFW toggle, model defaults, tool permissions).
- [x] Add per-field "Enhance with AI" / "Fill with AI" buttons calling a model.
- [x] Implement side-by-side preview with apply/cancel.
- [x] Persist structured persona_fields and behavior_rules to DB.

### 2.3 Archetypes & Templates

- [x] Define built-in archetypes (Coding Partner, Daily Check-In, Emotional Anchor, Writing Coach, NSFW Lover, etc.).
- [x] Implement archetype selector that pre-fills builder fields.
- [x] Allow saving any character as a reusable template.
- [x] Allow creating new characters from templates.

### 2.4 Import / Export & Portability

- [x] Define `PortableCharacterV1` export format (persona_fields, behavior_rules, custom instructions, operational/model profile, flags) aligned with engine spec.
- [x] Implement "Export character" to file.
- [x] Implement "Import character" from file with validation and conflict handling (auto-rename on conflict).
- [x] Document how to combine character exports with vector DB backups for portability (see docs/portability.md).
- [x] Store built-in character templates as markdown files under `config/characters` and ensure seeding/import flows use that location.

### 2.5 Versioning & Checkpoints

- [x] Implement PersonaSnapshot model aligned with engine spec.
- [x] Add UI in builder to create labelled checkpoints.
- [x] Allow switching between checkpoints and duplicating from a checkpoint.
- [x] Track basic change history per character.
- [x] Move snapshot capture/restore guard saves onto the shared background job queue once it exists (non-blocking now).

### Background Jobs (spillover)

- [ ] Introduce lightweight job queue abstraction.
- [ ] Move KB indexing (currently sync on upload) onto the job queue.
- [ ] Add snapshot-related jobs (create/guard/restore) to the queue for long-running work.

---

## Phase 3 – Dev-Grade Memory Controls (RAG-Level)

### 3.1 Knowledge Base Management

- [x] Show all files and their tags in sidebar KB panel (name, size, chunks, status badges, tag pills).
- [x] Allow toggling inclusion per chat via tag-based filtering (stored in `conversations.ragOverrides.tagFilters`).
- [x] Implement global per-character toggles: "Use RAG heavily / lightly / ignore" (stored in `characters.ragMode`).
- [x] File actions: Pause/Resume, Re-index, Hard delete with embeddings.
- [x] Add dedicated knowledge-base management view/tab per character (beyond sidebar UI).
- [x] Define preset tag categories (Work, Personal, Code, Docs) with management UI.

### 3.2 Memory Inspector Lite

- [ ] Add developer drawer showing RAG snippets used for last N replies.
- [ ] Show file + source metadata for each snippet (schema supports `memoryItems.sourceId/sourceType`, no UI).
- [ ] Implement "snippet was wrong/misleading" action that lowers priority or excludes it.

### 3.3 Forgetting Tools

- [x] Add per-file remove/purge actions for vector store chunks (`deleteFileMemoryItems()` in indexing pipeline).
- [ ] Add per-conversation "Forget this conversation" UI action.
- [ ] On conversation forget: delete associated embeddings (TODO exists in code, not implemented).
- [ ] Implement recalibration background job for memory consolidation post-deletion.
- [ ] Ensure RAG retrieval respects `visibilityPolicy` field for exclusions.

---

## Phase 4 – Voice I/O and Local Tools

### 4.1 Voice Input (Whisper.cpp)

- [ ] Add push-to-talk button in chat input.
- [ ] Integrate local whisper.cpp transcription (simple HTTP/CLI bridge).
- [ ] Add options for input language and auto-detect.
- [ ] Show live transcript before sending as a message.

### 4.2 Local TTS (VibeVoice or equivalent)

- [ ] Integrate local TTS engine.
- [ ] Add per-character voice profile configuration.
- [ ] Add per-chat "Read replies aloud" toggle and playback controls.

### 4.3 Tool System (Python/JS, HTTP, MCP)

- [ ] Design tool invocation layer and schema.
- [ ] Implement ability for characters to call:
  - [ ] Local Python/Node scripts.
  - [ ] HTTP tools (web search, APIs).
  - [ ] MCP tools.
- [ ] Add per-character tool permissions and sensible defaults.
- [ ] Surface small UI hint under messages when tools are used.

### 4.4 Code Context via Repomix

- [ ] Add "Attach code" button in chat.
- [ ] Run repomix on selected folder/repo and upload packed result.
- [ ] Treat repo bundles as temporary/persistent knowledge bases for chat/character.
- [ ] Show attached repo info in right panel.

---

## Phase 5 – Productivity Workflows and Conversation Summaries

### 5.1 Saved Prompts and Quick Actions

- [ ] Implement global + per-character saved prompts.
- [ ] Add quick actions near input (summarize selection, rewrite with tone, ask follow-up).

### 5.2 Scratchpad / Notes

- [ ] Add chat-attached markdown scratchpad.
- [ ] Persist scratchpad and include in exports (optional).

### 5.3 Conversation Export Enhancements

- [ ] Add "Export conversation summary" (model-generated Markdown).
- [ ] Allow exporting summaries alongside full transcripts.

### 5.4 Coding QoL

- [ ] Ensure code blocks render with syntax highlighting and copy buttons.
- [ ] Add optional monospace chat view mode for coding-heavy characters.

---

## Phase 6 – Multi-User, Auth, and Tenancy Prep

- [ ] Extend basic email/password auth from Phase 1 to multi-user mode suitable for hosted deployment.
- [ ] Add optional OAuth providers (GitHub/Google, etc.) for hosted mode.
- [ ] Ensure all entities (chats, characters, RAG, tools, usage stats) are correctly scoped by `user_id` and enforce no cross-user data leakage.
- [ ] Add internal usage tracking per user (tokens by provider, local vs cloud).
- [ ] Add hooks for future pricing tiers and metering (no UI yet).

---

## Phase 7 – NSFW Handling and Construct Boundaries

- [ ] Add per-character NSFW toggle + optional "intimacy/explicitness" slider.
- [ ] Ensure instructions and behavior_rules honor NSFW settings.
- [ ] Prepare for future global NSFW policy overrides (hosted mode) without affecting personal build.

---

## Phase 8 – Evaluation, Ratings, and Insight Lite

- [ ] Add rating widget per assistant message or chat segment.
- [ ] Store ratings with character id, model, and context tags.
- [ ] Implement export of ratings dataset for offline analysis.
- [ ] Add "Export conversation summary" & "What did you learn about me?" views wired to engine cognitive tier once available.
- [ ] Build hidden dev test harness: pick character, run canned prompts, rate/tweak outputs.

---

## Phase 9 – Sessions, Mood, Evolve, Deep Insight (Engine)

### 9.1 Engine Features

- [ ] Implement MoodState model and update rules (ephemeral tone layer).
- [ ] Integrate mood snapshot into prompts and UI mood badges.
- [ ] Implement inner monologue + subconscious agent (`executive_subconscious_think`).
- [ ] Implement cognitive memory tier (CognitiveNode + CognitiveEdge) and consolidation jobs.
- [ ] Implement RelationshipState and Evolve mode behavior modulation.
- [ ] Build graph inspector UI + APIs (Insight Mode) for advanced users.
- [ ] Add developer tooling to inspect logs, monologue, and cognitive graph during dev.

### Maintenance

- [ ] Revisit deprecated subdependencies (`@esbuild-kit/core-utils`, `@esbuild-kit/esm-loader`) on the next toolchain upgrade cycle and replace or remove them if upstream fixes are available.
