# Synthetic Character Engine – Multi‑Phase Spec (Working Title)

## 0. Vision & Core Principles

You’re building a **multi‑character AI harness** with:

- Deep, structured personas (not just one big prompt).
- Real memory: short‑term context, long‑term RAG, plus a higher “cognitive” tier that shapes behavior.
- A lightweight **mood engine** for short‑term tone and behavior.
- An asynchronous **subconscious / analyst layer** that tracks patterns, builds inner monologue, and consolidates memory.
- An optional **Evolve mode** that lets constructs change their relationship to the user over time.
- A **graph inspector / Insight Mode** for you (and advanced users) to see and edit what the system thinks.

Stack baseline (conceptual, not binding):

- Frontend: Next.js + Vercel AI SDK + React.
- Providers: OpenAI/Anthropic/etc. via HTTP; LM Studio/local via custom adapter.
- Backend: API routes / serverless functions (or a small backend service) for chat routing, RAG, and background jobs.
- Storage: PostgreSQL 18.x with pgvector in the same cluster for vector embeddings.
- File storage: local filesystem in early phases, behind an abstraction that can later point to S3-style storage.

---

## 1. Domain Model & Core Concepts

### 1.1. Character (Construct)

A Character is a **frontstage persona** users talk to.

Core fields:

- `id`
- `name`
- `avatar`
- `system_role`: high‑level description (“dominant best friend,” etc.)
- `persona_fields` (structured):
  - `description`
  - `personality`
  - `background`
  - `life_history`
  - `current_context`
- `behavior_rules`:
  - tone & style guidelines
  - boundaries (safe/unsafe topics)
  - role‑specific rules (e.g. “challenge half‑baked logic,” “never gaslight,” etc.)
- `custom_instructions_local`:
  - user‑tunable overrides per character (“don’t store venting rants,” “don’t reference internal mechanics,” etc.)
- `operational_profile`:
  - preferred model(s) per mode (casual, deep‑thought, NSFW, etc.)
  - max context window assumptions
  - cost/latency preferences (local vs remote)
- `flags`:
  - `evolve_enabled` (bool)
  - `nsfw_enabled` (bool)


### 1.2. Conversation & Message

- `Conversation`:
  - `id`
  - `character_id`
  - `user_id` (required; single dev user in early phases, multi‑user later)
  - timestamps: created/updated
  - `settings` (per‑thread overrides: language, mode, etc.)

- `Message`:
  - `id`
  - `conversation_id`
  - `role`: `user` | `assistant` | `system` | `inner_monologue`
  - `content`
  - `created_at`
  - `context_tags`: `roleplay`, `venting`, `planning`, `filthy`, `joke`, etc.
  - `mood_snapshot` (compact vector at time of message)
  - `meta`: tokens, provider, etc.

`inner_monologue` messages are never exposed to the user in normal mode; they’re written by the **subconscious/analyst** agent.


### 1.3. Mood State

Per‑conversation (and optionally per‑character) ephemeral state.

- `energy`: drained ↔ wired
- `valence`: heavy ↔ light
- `stance`: grounding ↔ playful
- `intimacy`: distant ↔ close
- `desire`: low ↔ high (if NSFW mode enabled)

This is stored in:

- A small `MoodState` object held in session/DB.
- A `mood_snapshot` per message for later analysis.

Mood has a **low weight multiplier** in prompt construction; it nudges tone, doesn’t override core values.


### 1.4. Memory Layers

Three main layers:

1. **Short‑term context:** recent messages in the conversation.
2. **Long‑term RAG:** vector store of chunks from messages + uploaded files.
3. **Cognitive Memory Tier:** structured, curated facts and patterns that actively shape behavior.

Initial MVP focuses on 1 + 2; later phases add 3.


#### 1.4.1. Long‑Term Memory Items (RAG)

- `MemoryItem`:
  - `id`
  - `owner_type`: `user` | `character` | `relationship` (user+character)
  - `owner_id`
  - `source_type`: `message` | `file` | `manual`
  - `source_id`
  - `content` (text chunk)
  - `embedding` (vector)
  - `created_at`
  - `tags`: topics, entities, context tags
  - `visibility_policy`: `normal` | `sensitive` | `exclude_from_rag`

RAG queries retrieve a small set of relevant items for each turn.


#### 1.4.2. Cognitive Memory Nodes (Later Phase)

Higher tier representation used to **shape persona behavior**.

- `CognitiveNode`:
  - `id`
  - `type`: `fact`, `preference`, `trait`, `pattern`, `event`, `meta_rule`
  - `owner_type`: `user` | `character` | `relationship`
  - `owner_id`
  - `summary` (human‑readable text)
  - `details` (richer text)
  - `importance_score` (glow)
  - `emotional_weight`
  - `stability_score` (how cross‑mood/cross‑context it is)
  - `created_at` / `updated_at`

- `CognitiveEdge`:
  - `from_node_id`
  - `to_node_id`
  - `type`: `supports`, `contradicts`, `derived_from`, `temporal`, `co_occurs`, `is_about`
  - `weight`

These form the **graph view** you’ll later visualize and edit.


### 1.5. Relationship State (Evolve Mode)

Per (user, character) pair, **only if** `evolve_enabled`.

- `RelationshipState`:
  - `id`
  - `user_id`
  - `character_id`
  - `scores`:
    - `trust`
    - `affection`
    - `worry`
    - `resentment`
    - `respect`
  - `last_update_at`
  - `change_log` (links to events that nudged these scores)

These scores **modulate behavior**, but do not change core ethics.


### 1.6. Snapshots / Checkpoints

- `PersonaSnapshot`:
  - full serialized view of:
    - character persona_fields + behavior_rules
    - relationship state
    - key cognitive nodes and their weights
  - `label` (e.g. “Sam v1.2 – pre‑breakup arc”)
  - `created_at`

Used for dev experiments and manual rollback; user‑facing flows can be much more conservative.


### 1.7. Portable Character Export Format (`PortableCharacterV1`)

- JSON structure used for:
  - Seeding built-in characters from files in the repo.
  - Exporting/importing characters between machines and future hosted mode.
- Fields (mapping 1:1 onto `Character` fields):
  - `schema_version` (e.g. `"portable-character-v1"`).
  - `name`, `avatar`, `system_role`.
  - `persona_fields` (description, personality, background, life_history, current_context).
  - `behavior_rules`.
  - `custom_instructions_local`.
  - `operational_profile` (preferred models, context limits, cost/latency prefs).
  - `flags` (evolve_enabled, nsfw_enabled).
  - optional `tags` / `categories`.
- On import:
  - Bound to a specific `user_id`.
  - May get a new internal `id` while remaining round‑trippable.


### 1.8. Subsystems

- **Chat Orchestrator:** builds prompts, calls models, handles streaming.
- **Provider Adapters:** unify OpenAI, Anthropic, LM Studio, etc.
- **Tool System:** defines callable tools using the OpenAI tools/functions JSON schema for arguments and result types; orchestrator exposes these to models and executes Python/JS/HTTP/MCP calls.
- **Subconscious Agent (`executive_subconscious_think`):** async jobs that read logs and maintain inner monologue + candidate memories.
- **Dream/Consolidation Jobs:** periodic passes that promote/demote cognitive nodes.
- **Graph Inspector & Insight Mode:** UI and APIs to inspect/edit memory graph and relationship states.

---

## 2. Phase Breakdown

### Phase 1 – Core App & Character Builder (MVP Shell)

Goal: **Usable chat app** with structured character sheets, multi‑provider routing, and basic conversations.

Scope:

- Auth: simple email/password plus session for a single dev user, with a real `user_id` column in the DB from day one (multi‑user later).
- Character CRUD with the structured persona fields:
  - description
  - personality
  - background
  - life history
  - current life details
- Per‑field “Enhance with AI” / “Fill with AI” buttons:
  - Take user text + instructions.
  - Call a model to expand/cohere while preserving user voice.
  - Present diff/preview, then allow apply.
- Character‑level `custom_instructions_local` field.
- Basic chat UI:
  - Select character.
  - Conversation history per character.
  - Streamed responses via Vercel AI SDK.
- Model routing basics:
  - Global provider config.
  - Per‑character defaults (e.g., local Qwen for casual, cloud model toggle for “Deep Think” mode).

Prompt construction (v1):

- System prompt: global rules.
- Character block: compiled persona_fields + behavior_rules + custom instructions.
- Recent messages (last N turns).

No inner monologue, no RAG yet.


### Phase 2 – Basic Memory (Recent Context + RAG)

Goal: **Stop being a goldfish.** Introduce long‑term recall via vector store.

Scope:

- Log all messages to DB.
- RAG pipeline:
  - Chunk messages (and files, once uploads land).
  - Embed chunks using the configured local embedding provider and store as `MemoryItem`s in pgvector.
- Retrieval:
  - For each turn, retrieve top‑K relevant items for this (user, character, conversation).
  - Inject them into the prompt as a compact “Relevant past info” section.
- Basic policies:
  - Respect `visibility_policy` (don’t use `exclude_from_rag`).
  - Don’t over‑stuff; focus on short, relevant snippets.
  - Exclude archived conversations from retrieval by default so they don’t influence new turns.
- Instrumentation:
  - For each assistant message, record the IDs of `MemoryItem`s actually used (e.g. in message `meta`) to support future Memory Inspector tooling.

UI additions:

- Minimal memory viewer per character/conversation:
  - list of memory items
  - ability to delete/mark “don’t use for now”

Still no cognitive tier or graph; just base RAG.


### Phase 3 – Mood Engine (Ephemeral Tone Layer)

Goal: Add **short‑term mood** that slightly shapes tone and is recorded for later analysis.

Scope:

- Define `MoodState` object with a handful of axes.
- Mood update rules:
  - Based on recent message sentiment, conversation duration, time of day, tags (roleplay, venting, filthy), etc.
  - Slow decay back to baseline over time.
- Prompt integration:
  - Add a compact textual representation to the system prompt: “Internal state: calm, protective, slightly tired, medium desire.”
  - Use low weight; tone only.
- Store mood snapshot per message.

UI:

- Tiny mood badge on character avatar/name in chat (optional, vague adjective).


### Phase 4 – Subconscious Agent & Inner Monologue

Goal: Introduce **hidden inner monologue** and a separate “subconscious” worker.

Scope:

- Define `inner_monologue` messages in the DB.
- Implement `executive_subconscious_think` pipeline:
  - Triggered after each user/assistant turn (or batched).
  - Input: recent messages, mood state, last inner monologue, RAG memories.
  - Output:
    - Updated inner monologue text (“what I think is going on, what I plan, what I notice”).
    - Tags: hypothesized user state, candidate memory summaries, mood adjustments.
- Save inner monologue messages **hidden from user**.
- Next chat turn prompt includes:
  - A compressed summary of last inner monologue (“internal understanding of situation”), not the raw text.

Dev tooling:

- Debug panel to inspect inner monologue stream per conversation.


### Phase 5 – Cognitive Memory Tier & Consolidation Jobs (Dream)

Goal: Add **structured, higher‑tier memory** that shapes behavior.

Scope:

- Implement `CognitiveNode` and `CognitiveEdge` tables.
- Dream/consolidation job:
  - Runs periodically (e.g., cron or queue).
  - Reads:
    - recent messages
    - inner monologue
    - existing RAG items
  - Generates or updates cognitive nodes:
    - stable facts about user
    - preferences
    - traits/patterns
    - relationship patterns (for Evolve)
  - Adjusts `importance_score`, `stability_score`, `emotional_weight`.
  - Establishes edges: `supports`, `contradicts`, `derived_from`, etc.
- Prompt integration:
  - Before each turn, fetch a small set of **high‑importance nodes** relevant to the conversation.
  - Inject as “What I know that matters here” block.

Policies:

- Automatic promotion, but allow manual overrides (lock node, mark wrong, demote, etc.).


### Phase 6 – Evolve Mode & Relationship State

Goal: Let constructs **change their relationship stance** with the user over time, without changing core ethics.

Scope:

- Implement `RelationshipState` per (user, character).
- Define scoring rules:
  - `trust`, `affection`, `worry`, `resentment`, `respect`.
  - Updated slowly based on events:
    - consistent kindness/support
    - prolonged rudeness/abuse
    - vulnerability + healthy repair
    - boundary violations
  - Use cognitive nodes + tags from subconscious to drive updates.
- Prompt integration (only if `evolve_enabled`):
  - Add structured “relationship stance” description to system prompt: “With this user: high trust, high affection, high worry, low resentment.”
  - Use it to choose tone (warmer, firmer, more distant, etc.).

Safety constraints:

- Relationship state can change **how** the construct treats the user, but not its core values.
- Extreme cases: construct may become firmer, more boundaried, or in dev/test mode, refuse further interaction with obviously harmful patterns.


### Phase 7 – Memory Graph Inspector & Insight Mode

Goal: Provide a **visual, editable graph view** of cognitive memory and relationship evolution.

Scope:

- Graph API:
  - fetch nodes + edges for a given owner (user, character, relationship)
  - edit node summaries
  - adjust importance/weights
  - delete/demote nodes
- Graph UI:
  - Obsidian‑style force‑directed graph
  - Nodes colored by type; glow intensity = importance
  - Edges showing relationships and hovering to show text
- Node detail panel:
  - summary + details
  - connected nodes and edge types
  - change history: when created, reinforced, contradicted, manually edited
- Insight Mode:
  - Opt‑in mode where you can see: “What has this construct learned about you?”
  - Reserved for dev/advanced users; not normal chat UX.


### Phase 8 – Advanced Features (Future)

- Checkpoints & branching timelines for constructs.
- Automated “Test Character” scenarios:
  - generate sample interactions (comfort, conflict, advice, flirt, etc.)
  - run them through the live character + memory state
  - inspect outputs for coherence.
- Multi‑character scenes.
- User‑facing “memory policies” per character (sliders + presets).

---

## 3. Prompting Strategy (High‑Level)

### 3.1. Chat Turn (Foreground Construct)

Inputs:

- Global system rules.
- Compiled character persona & behavior rules.
- Custom instructions (local).
- Relevant cognitive nodes (once available).
- Recent conversation messages.
- RAG snippets.
- Mood snapshot.
- Relationship stance (if evolve enabled).
- Subconscious summary (from last inner monologue).

Output:

- Assistant message (frontstage behavior only).


### 3.2. Subconscious Turn (`executive_subconscious_think`)

Inputs:

- Recent conversation transcript.
- Last inner monologue.
- Mood state.
- Key RAG items.
- Key cognitive nodes.

Outputs:

- New inner monologue chunk.
- Proposed mood adjustments.
- Candidate cognitive summaries for dream job.
- Tags/flags for events (e.g., “venting,” “breakthrough,” “boundary violation,” etc.).


### 3.3. Dream / Consolidation Turn

Inputs:

- Logs (messages + monologue) since last run.
- Existing cognitive nodes and edges.

Outputs:

- Updated cognitive graph.
- RelationshipState score adjustments.
- Change logs for Insight Mode.

---

## 4. Initial Implementation Priorities

Short, realistic sequence to get to something fun and usable:

1. Phase 1: core character builder + chat.
2. Phase 2: basic RAG memory.
3. Phase 3: mood engine (minimal vector, low‑weight effect).
4. Phase 4: subconscious agent + inner monologue (dev‑only at first).
5. Phase 5+: cognitive tier, evolve, and graph inspector once the earlier pieces feel stable.

Each phase should be shippable and dog‑foodable on its own, so you can lie in bed with your laptop and actually *talk* to the damn thing while the lab grows behind it.

