# Project Structure

## Root Directory

```
.
├── src/                    # Source code
├── .checkpoints/           # Persistent execution checkpoints
├── examples/               # Example requests and documentation
├── temp/                   # Temporary files (Composio docs)
├── .env                    # Environment configuration (gitignored)
├── .env.example            # Environment template
├── package.json            # Dependencies and scripts
├── README.md               # User documentation
├── ARCHITECTURE.md         # Technical architecture details
└── IMPROVEMENTS.md         # Implementation improvements log
```

## Source Code Organization (`src/`)

### Core Orchestration (3-Phase Pipeline)

- **`agent.js`** - Main orchestrator, integrates all phases, manages sessions
- **`planner.js`** - Phase 1: Task planning and decomposition
- **`executor-enhanced.js`** - Phase 2: Execution with guardrails
- **`verifier.js`** - Phase 3: Verification and response building

### Production Enhancements

- **`validator.js`** - Schema validation (Ajv-based, pre-execution)
- **`checkpoint-manager.js`** - Idempotency and persistence
- **`retry-policy.js`** - Error classification and intelligent retry
- **`pagination-manager.js`** - Pagination control and optimization
- **`response-formatter.js`** - LLM-powered response formatting

### Infrastructure

- **`logger.js`** - Structured logging with colors and trace IDs
- **`types.js`** - Data structures (ExecutionPlan, Subtask, ExecutionState)
- **`index.js`** - Express HTTP server and API routes

### Legacy (Deprecated)

- **`executor.js`** - Original executor (replaced by executor-enhanced.js)

## Key Files

### Configuration

- **`agent.md`** - Agent instructions (loaded by planner and executor)
- **`.env`** - API keys and configuration
- **`.npmrc`** - npm configuration

### Documentation

- **`README.md`** - Quick start, API reference, examples
- **`ARCHITECTURE.md`** - Detailed architecture and design decisions
- **`IMPROVEMENTS.md`** - Production improvements documentation
- **`composio-documentation-guide.md`** - Composio integration guide

### Examples

- **`examples/test-requests.http`** - HTTP request examples
- **`examples/test-improvements.http`** - Testing production features
- **`examples/payloads.md`** - Example payloads
- **`examples/response-formatter-flow.md`** - Response formatting flow

## Module Dependencies

```
index.js (HTTP server)
    └── agent.js (orchestrator)
        ├── planner.js
        ├── executor-enhanced.js
        │   ├── validator.js
        │   ├── checkpoint-manager.js
        │   ├── retry-policy.js
        │   └── pagination-manager.js
        ├── verifier.js
        │   └── response-formatter.js
        ├── logger.js
        └── types.js
```

## Data Flow

1. **Request** → `index.js` receives POST /execute
2. **Orchestration** → `agent.js` coordinates 3 phases
3. **Planning** → `planner.js` creates ExecutionPlan
4. **Execution** → `executor-enhanced.js` runs subtasks with guardrails
5. **Verification** → `verifier.js` validates and formats response
6. **Response** → Returns formatted JSON to client

## Checkpoint Storage

- **Location**: `.checkpoints/`
- **Naming**: `checkpoint_{idempotency_key}.json`
- **Content**: Subtask status, artifacts, outputs, tool calls, duration
- **Purpose**: Idempotency, audit trails, resume capability

## Naming Conventions

- **Files**: kebab-case (e.g., `checkpoint-manager.js`)
- **Classes**: PascalCase (e.g., `TaskPlanner`, `ExecutionState`)
- **Functions**: camelCase (e.g., `executeTask`, `planTask`)
- **Constants**: UPPER_SNAKE_CASE (e.g., `ExecutionMode.STRICT`)
