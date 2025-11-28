# Character Markdown Format

This directory contains built-in character definitions in YAML frontmatter + Markdown format.

## File Structure

Each character file uses:
- **YAML frontmatter** (between `---` delimiters) for structured metadata
- **Markdown body** with `## Section` headers for longer text fields

## Required Fields (Frontmatter)

| Field | Type | Description |
|-------|------|-------------|
| `id` | UUID string | Stable identifier for idempotent seeding |
| `name` | string | Character display name |

## Optional Fields (Frontmatter)

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `tagline` | string | null | Short character description |
| `systemRole` | string | null | Role description for system prompt |
| `archetype` | string | null | Archetype ID (coding-partner, emotional-anchor, etc.) |
| `toneStyle` | string | null | Communication style description |
| `boundaries` | string | null | Topics/behaviors to avoid |
| `roleRules` | string | null | How the character treats the user |
| `customInstructionsLocal` | string | null | Additional system instructions |
| `tags` | string[] | [] | Tags for filtering (Friend, Work, Creative, Technical, Personal, NSFW) |
| `defaultModelId` | string | null | Preferred LLM model ID |
| `defaultTemperature` | number | 0.7 | Temperature setting (0-1) |
| `nsfwEnabled` | boolean | false | Enable adult content |
| `evolveEnabled` | boolean | false | Enable character evolution |

## Markdown Body Sections

Longer text fields can be written as markdown sections:

| Section Header | Maps to Field |
|----------------|---------------|
| `## Personality` | personality |
| `## Description` | description |
| `## Background` | background |
| `## Life History` | lifeHistory |
| `## Current Context` | currentContext |

Markdown body sections override frontmatter values if both are present.

## Example

```markdown
---
id: "00000000-0000-0000-0001-000000000001"
name: Sam (Friend)
tagline: A supportive and friendly companion
systemRole: friendly companion
toneStyle: Friendly, casual
tags: ["Friend", "Personal"]
defaultTemperature: 0.7
nsfwEnabled: false
evolveEnabled: false
---

## Personality

Warm, encouraging, and great at brainstorming. Uses casual language and occasional emojis.

## Description

A supportive and friendly companion for daily conversations and brainstorming.
```

## Loading

Characters are loaded by `lib/character-loader.ts` and seeded via `scripts/seed.ts`.
Files starting with `_` (like this one) are ignored during loading.
