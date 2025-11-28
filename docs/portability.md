# Character Portability & Backup Guide

This guide covers exporting, importing, and backing up your Persona data.

## Table of Contents

1. [PortableCharacterV1 Format](#portablecharacterv1-format)
2. [Export/Import Guide](#exportimport-guide)
3. [Full Backup & Restore](#full-backup--restore)
4. [Migration Between Devices](#migration-between-devices)

---

## PortableCharacterV1 Format

### Markdown Schema

Character exports are markdown files with YAML frontmatter and optional sections:

```markdown
---
version: PortableCharacterV1
schemaVersion: 1
exportedAt: 2024-01-15T10:30:00.000Z
name: Character Name
avatar: null
tagline: Short description
archetype: coding-partner
description: Full description...
personality: Personality traits...
background: Background history...
lifeHistory: Life events...
currentContext: Current situation...
toneStyle: Communication style...
boundaries: What they won't do...
roleRules: How they treat you...
customInstructionsLocal: Additional instructions...
tags:
  - Work
  - Technical
defaultModelId: gpt-4
defaultTemperature: 0.7
nsfwEnabled: false
evolveEnabled: false
---

## Personality
Personality traits...

## Description
Full description...
```

### Field Descriptions

| Field | Type | Required | Max Length | Description |
|-------|------|----------|------------|-------------|
| `version` | string | Yes | - | Always "PortableCharacterV1" |
| `exportedAt` | ISO datetime | Yes | - | When the export was created |
| `character.name` | string | Yes | 100 | Character display name |
| `character.avatar` | string | No | - | URL to avatar image |
| `character.tagline` | string | No | 200 | Short description |
| `character.archetype` | string | No | - | Archetype ID |
| `character.systemRole` | string | No | 2000 | System prompt used by engine |
| `character.description` | string | No | 2000 | Full description |
| `character.personality` | string | No | 2000 | Personality traits |
| `character.background` | string | No | 2000 | Background history |
| `character.lifeHistory` | string | No | 2000 | Key life events |
| `character.currentContext` | string | No | 2000 | Current situation |
| `character.toneStyle` | string | No | 1000 | Communication style |
| `character.boundaries` | string | No | 1000 | Topics/behaviors to avoid |
| `character.roleRules` | string | No | 1000 | How they treat user |
| `character.customInstructionsLocal` | string | No | 4000 | Additional instructions |
| `character.tags` | string[] | No | - | Tags for filtering |
| `character.defaultModelId` | string | No | - | Preferred LLM model |
| `character.defaultTemperature` | number | No | 0-2 | Temperature setting |
| `character.maxContextWindow` | number | No | - | Explicit context window override |
| `character.nsfwEnabled` | boolean | No | - | Adult content flag |
| `character.evolveEnabled` | boolean | No | - | Evolution flag |

### Version Compatibility

- `PortableCharacterV1` is the current and only version
- Future versions will maintain backward compatibility
- Older exports will continue to work with newer app versions

---

## Export/Import Guide

### Exporting a Character

1. Navigate to the **Character Library** (`/characters`)
2. Find the character you want to export
3. Click the **⋯** menu on the character card
4. Select **Export**
5. A markdown file will download: `{character-name}-character.md`

**What's included:**
- All persona fields (name, personality, background, etc.)
- Behavior rules (tone, boundaries, role rules)
- Operational settings (model, temperature)
- Tags and flags

**What's NOT included:**
- Character ID (new ID assigned on import)
- User ownership (assigned to importing user)
- Conversation history
- Knowledge base files and embeddings

### Importing a Character

1. Navigate to the **Character Library** (`/characters`)
2. Click the **Import** button in the header
3. Select a `.md` (preferred) or `.json` file containing `PortableCharacterV1` data
4. The character will import; a toast confirms success (no redirect)

**Name Conflict Handling:**

If a character with the same name already exists:
1. First try: `"{name} (Imported)"`
2. If that exists too: `"{name} (2)"`, `"{name} (3)"`, etc.

The original name from the file is preserved in the import notification.

---

## Full Backup & Restore

### What to Back Up

A complete Persona backup includes:

| Component | Location | Contains |
|-----------|----------|----------|
| PostgreSQL Database | Docker volume | Characters, conversations, messages, embeddings |
| Knowledge Base Files | `uploads/` directory | Uploaded documents |
| Character Exports | Manual exports | Individual character markdown files (`*.md`) |

### Database Backup

#### Full Database Backup

```bash
# Backup entire database
docker exec persona-postgres pg_dump -U postgres persona_dev > backup_full.sql

# With timestamp
docker exec persona-postgres pg_dump -U postgres persona_dev > backup_$(date +%Y%m%d_%H%M%S).sql
```

#### Knowledge Base Only (Vectors + File Metadata)

```bash
# Export just the RAG-related tables
docker exec persona-postgres pg_dump -U postgres \
  -t memory_items \
  -t knowledge_base_files \
  persona_dev > backup_knowledge_base.sql
```

#### Characters Only

```bash
# Export character and template tables
docker exec persona-postgres pg_dump -U postgres \
  -t characters \
  -t character_templates \
  persona_dev > backup_characters.sql
```

### Database Restore

```bash
# Restore full database (WARNING: overwrites existing data)
docker exec -i persona-postgres psql -U postgres -d persona_dev < backup_full.sql

# Restore to a fresh database
docker exec persona-postgres createdb -U postgres persona_restored
docker exec -i persona-postgres psql -U postgres -d persona_restored < backup_full.sql
```

### File System Backup

```bash
# Backup uploaded knowledge base files
tar -czvf backup_uploads.tar.gz uploads/

# Backup character markdown templates
tar -czvf backup_characters_config.tar.gz config/characters/
```

### File System Restore

```bash
# Restore uploads
tar -xzvf backup_uploads.tar.gz

# Restore character templates
tar -xzvf backup_characters_config.tar.gz
```

---

## Migration Between Devices

### Complete Migration Checklist

Follow these steps to migrate Persona to a new machine:

#### 1. Prepare Source Machine

```bash
# Export database
docker exec persona-postgres pg_dump -U postgres persona_dev > migration_db.sql

# Archive uploads
tar -czvf migration_uploads.tar.gz uploads/

# Archive config
tar -czvf migration_config.tar.gz config/
```

#### 2. Transfer Files

Copy these to the new machine:
- `migration_db.sql`
- `migration_uploads.tar.gz`
- `migration_config.tar.gz`
- `.env.local` (environment variables)

#### 3. Setup New Machine

```bash
# Clone repository
git clone <repo-url> persona
cd persona

# Install dependencies
pnpm install

# Copy environment file
cp /path/to/migration/.env.local .env.local

# Start database
docker compose up -d postgres

# Wait for database to be ready
sleep 5
```

#### 4. Restore Data

**Order matters: Database first, then files**

```bash
# Restore database
docker exec -i persona-postgres psql -U postgres -d persona_dev < migration_db.sql

# Restore uploads
tar -xzvf migration_uploads.tar.gz

# Restore config
tar -xzvf migration_config.tar.gz
```

#### 5. Verify Migration

```bash
# Run migrations (if any pending)
pnpm db:migrate

# Start development server
pnpm dev

# Check:
# - Characters appear in library
# - Conversations are intact
# - Knowledge base files are accessible
# - RAG retrieval works
```

### Partial Migration (Characters Only)

For migrating just characters without conversation history:

1. Export each character from the UI (Export button)
2. Copy the markdown export files (`*.md`) to the new machine
3. Import each character from the UI (Import button)

**Note:** This method preserves character definitions but not:
- Conversation history
- Knowledge base files and embeddings
- User-specific settings

### Troubleshooting

#### Database Connection Issues

```bash
# Check if PostgreSQL is running
docker ps | grep postgres

# Check logs
docker logs persona-postgres

# Verify connection
docker exec persona-postgres psql -U postgres -c "SELECT 1"
```

#### Missing Embeddings After Restore

If RAG retrieval doesn't work after restore:
1. Check `memory_items` table has data
2. Verify pgvector extension is enabled:
   ```sql
   SELECT * FROM pg_extension WHERE extname = 'vector';
   ```
3. Re-index knowledge base files if needed

#### File Permission Issues

```bash
# Fix uploads directory permissions
chmod -R 755 uploads/

# Ensure directory exists
mkdir -p uploads
```

---

## Best Practices

1. **Regular Backups**: Schedule weekly full database backups
2. **Export Important Characters**: Keep markdown exports (`*.md`) of key characters
3. **Version Control Config**: Keep `config/characters/` in version control
4. **Test Restores**: Periodically test backup restoration
5. **Document Changes**: Track character modifications for rollback
