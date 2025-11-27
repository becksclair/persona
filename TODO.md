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

### 1.1 Chats & Sessions

- [ ] Choose and implement persistence stack (e.g. Postgres/SQLite + ORM) for conversations/messages.
- [ ] Define DB schema for Conversation + Message matching engine spec (character_id, timestamps, context tags, etc.).
- [ ] Implement server APIs for creating conversations, listing by user/character, renaming, archiving, deleting.
- [ ] Wire left sidebar chat list to real conversations (title, last message preview, avatar).
- [ ] Implement "New Chat" action that creates a new conversation with last-used character.
- [ ] Implement "New Chat with This Character" action from character panel.
- [ ] Implement archive semantics (hide from active views and RAG, but keep in Archived area).
- [ ] Implement delete semantics (hard delete messages + embeddings, trigger memory recalibration hooks).
- [ ] Add basic tests/e2e coverage for chat creation, switching, archive/delete.

### 1.2 Character Panel Integration

- [ ] Replace mock personalities store with persisted Character entities aligned to engine `Character` model (persona_fields, behavior_rules, flags, etc.).
- [ ] Load list of characters for the current user into right panel dropdown.
- [ ] Add search/filter for characters in dropdown.
- [ ] Add actions from panel: Edit (open builder), Duplicate, Archive, Delete, Export.
- [ ] Ensure character selection is per-chat and stored on Conversation.
- [ ] When switching character in a chat, append a system message noting the change.
- [ ] Show name, avatar, tagline, and brief role description in the character panel header.

### 1.3 Model Settings (Per Character, Per Chat Overrides)

- [ ] Extend model metadata to include context window + rough speed/cost indicators.
- [ ] Persist per-character default model/profile, temperature, and basic sampling knobs (operational_profile).
- [ ] Allow per-chat overrides of model/profile and remember last-used model per conversation.
- [ ] Ensure /api/chat uses per-chat overrides falling back to per-character defaults.
- [ ] Update right panel UI to display Cloud vs Local badges, context size, speed/cost hints.
- [ ] Add tests to ensure correct model/provider is chosen for each chat turn.

### 1.4 RAG / Knowledge Base (Per Character)

- [ ] Implement backend file upload endpoint + storage for knowledge base files (per user + character).
- [ ] Store file metadata (name, type, size, status, tags).
- [ ] Implement indexing pipeline: chunk files, embed, and store MemoryItems as per engine spec.
- [ ] Surface file status in UI (Indexing, Ready, Failed).
- [ ] Implement actions: Remove (soft delete), Re-index, Pause (exclude from retrieval).
- [ ] On each chat turn, retrieve top-K relevant MemoryItems for (user, character, conversation).
- [ ] Inject compact "Relevant past info" block into prompts.
- [ ] Add minimal per-character memory viewer listing files and key stats.

### 1.5 Message Copy & Export

- [ ] Add per-message "Copy" button for user + assistant messages.
- [ ] Implement chat-level export menu (Markdown + JSON).
- [ ] Ensure exports include character, model, and timestamps.
- [ ] Basic tests for export formats.

### 1.6 Basic UX Polish

- [ ] Implement `Ctrl+Enter` / `Cmd+Enter` to send; `Enter` optional depending on setting.
- [ ] Implement `Esc` to blur input.
- [ ] Ensure theme toggle fully wired (light/dark/system) and persisted.
- [ ] Implement graceful error UI using structured errors from /api/chat with "Retry" action.
- [ ] Add small loading/streaming indicators in chat header or input area.

---

## Phase 2 – Character Studio & Import/Export

### 2.1 Character Library

- [ ] Add dedicated "Characters" view/route.
- [ ] Render cards for each character with avatar, name, tagline, and tags.
- [ ] Implement filters and search (e.g. Friend, Work, NSFW).
- [ ] Wire actions per card: Open in builder, Duplicate, Archive/Delete, Export.

### 2.2 Character Builder

- [ ] Implement multi-step character builder UI:
  - [ ] Step 1: Basics (name, avatar, tagline, archetype).
  - [ ] Step 2: Personality & behavior (tone, traits, boundaries, how to treat you).
  - [ ] Step 3: Background & life history.
  - [ ] Step 4: Current life details / present situation.
  - [ ] Step 5: Advanced (custom instructions, NSFW toggle, model defaults, tool permissions).
- [ ] Add per-field "Enhance with AI" / "Fill with AI" buttons calling a model.
- [ ] Implement side-by-side preview with apply/cancel.
- [ ] Persist structured persona_fields and behavior_rules to DB.

### 2.3 Archetypes & Templates

- [ ] Define built-in archetypes (Coding Partner, Daily Check-In, Emotional Anchor, Writing Coach, NSFW Lover, etc.).
- [ ] Implement archetype selector that pre-fills builder fields.
- [ ] Allow saving any character as a reusable template.
- [ ] Allow creating new characters from templates.

### 2.4 Import / Export & Portability

- [ ] Define portable character export format (persona_fields, behavior_rules, custom instructions, model profile).
- [ ] Implement "Export character" to file.
- [ ] Implement "Import character" from file with validation and conflict handling.
- [ ] Document how to combine character exports with vector DB backups for portability.

### 2.5 Versioning & Checkpoints

- [ ] Implement PersonaSnapshot model aligned with engine spec.
- [ ] Add UI in builder to create labelled checkpoints.
- [ ] Allow switching between checkpoints and duplicating from a checkpoint.
- [ ] Track basic change history per character.

---

## Phase 3 – Dev-Grade Memory Controls (RAG-Level)

### 3.1 Knowledge Base Management

- [ ] Add knowledge-base management view/tab per character.
- [ ] Show all files and their tags (Work, Personal, Code, Docs, etc.).
- [ ] Allow toggling inclusion per chat (e.g. "use only Work files for this conversation").
- [ ] Implement global per-character toggles: "Use RAG heavily / lightly / ignore".

### 3.2 Memory Inspector Lite

- [ ] Add developer drawer showing RAG snippets used for last N replies.
- [ ] Show file + source metadata for each snippet.
- [ ] Implement "snippet was wrong/misleading" action that lowers priority or excludes it.

### 3.3 Forgetting Tools

- [ ] Add per-conversation "Forget this conversation" action.
- [ ] On forget: delete messages + embeddings and enqueue recalibration job.
- [ ] Add per-file remove/purge actions for vector store chunks.
- [ ] Ensure RAG + cognitive layers respect deletions.

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

- [ ] Implement basic auth (single-tenant dev mode first, then optional OAuth).
- [ ] Introduce `user_id` scoping for all entities (chats, characters, RAG, tools, usage stats).
- [ ] Ensure no cross-user data leakage.
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

- [ ] Implement MoodState model and update rules (ephemeral tone layer).
- [ ] Integrate mood snapshot into prompts and UI mood badges.
- [ ] Implement inner monologue + subconscious agent (`executive_subconscious_think`).
- [ ] Implement cognitive memory tier (CognitiveNode + CognitiveEdge) and consolidation jobs.
- [ ] Implement RelationshipState and Evolve mode behavior modulation.
- [ ] Build graph inspector UI + APIs (Insight Mode) for advanced users.
- [ ] Add developer tooling to inspect logs, monologue, and cognitive graph during dev.
