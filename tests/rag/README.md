# RAG Test Suite

Comprehensive tests for the RAG (Retrieval-Augmented Generation) system.

## Prerequisites

### Local Development (Default)

1. **LM Studio** running on `http://localhost:1234` with `text-embedding-bge-m3` loaded
2. **PostgreSQL** with pgvector extension (use Docker Compose)
3. **Test database** schema pushed

### Quick Setup

```bash
# Start PostgreSQL
docker compose up -d

# Push schema to test database
DATABASE_URL="postgresql://persona:persona_dev@localhost:5432/persona_test" pnpm db:push

# Run tests
pnpm test tests/rag/
```

## Test Files

| File | Tests | Description |
|------|-------|-------------|
| `config.test.ts` | 18 | RAG config schema validation and service methods |
| `chunking.test.ts` | 17 | Text chunking utility edge cases |
| `embedding.test.ts` | 20 | Embedding generation, LM Studio integration |
| `retrieval.test.ts` | 21 | Memory retrieval, prompt formatting |
| `indexing.test.ts` | 16 | File indexing pipeline |
| `performance.test.ts` | 11 | Benchmarks and resource estimates |

## Configuration

### Embedding Model

The default model is `text-embedding-bge-m3` (1024 dimensions). To change:
1. Update `config/rag.json` → `embedding.model` and `embedding.dimensions`
2. Update `lib/rag/constants.ts` → `DEFAULT_EMBEDDING_MODEL`
3. Push new schema: `pnpm db:push`

### Test Environment Variables

Configured in `vitest.config.ts`:
- `DATABASE_URL` - Test database connection
- `LM_STUDIO_BASE_URL` - LM Studio endpoint
- `TEST_RETRY_ATTEMPTS` - Faster retries for tests (default: 2)
- `TEST_RETRY_DELAY_MS` - Shorter retry delay (default: 500ms)

## CI Behavior

Integration tests that require LM Studio are **skipped** in CI environments.
CI is detected via: `CI`, `GITHUB_ACTIONS`, `GITLAB_CI`, `CIRCLECI`, `TRAVIS` env vars.

**Local** (default): All tests run, including LM Studio integration  
**CI**: Only unit tests run (no external dependencies)

## Fixtures

Use `tests/rag/fixtures.ts` for:
- `TEST_UUIDS` - Valid UUID format test data
- `TEST_TEXTS` - Sample texts for embeddings
- `SEMANTIC_PAIRS` - Similarity test pairs
- `isCI()` - CI environment detection
- `cosineSimilarity()` - Vector similarity helper

## Running Specific Tests

```bash
# All RAG tests
pnpm test tests/rag/

# Single file
pnpm test tests/rag/embedding.test.ts

# With verbose output
pnpm test tests/rag/ -- --reporter=verbose

# Performance benchmarks only
pnpm test tests/rag/performance.test.ts
```

## Troubleshooting

### Tests hang with no output

- Check LM Studio is running: `curl http://localhost:1234/v1/models`
- Check the correct model is loaded (bge-m3, not jina-embeddings-v3)

### Database connection errors

- Check PostgreSQL is running: `docker compose ps`
- Check test database exists: `psql postgresql://persona:persona_dev@localhost:5432/persona_test`

### Timeout errors

- Increase timeout in `vitest.config.ts` → `testTimeout`
- Or use a faster embedding model
