---
inclusion: fileMatch
fileMatchPattern: '**/src/**/*.js'
---

# Composio Integration Guidelines

## Documentation Reference

When analyzing or implementing Composio-related features, ALWAYS use the Composio Documentation Guide as your primary reference.

**Documentation Location**: `temp/COMPOSIO DOCS/`

**Guide Location**: `composio-documentation-guide.md` (in this steering folder)

## Implementation Workflow

1. **Identify the Query Type**: Determine what aspect of Composio you're working with
   - Sessions and meta tools
   - Authentication flows
   - Tool execution
   - Triggers and webhooks
   - MCP integration
   - Custom tools

2. **Consult the Guide**: Open `composio-documentation-guide.md` and use the decision logic section to identify which documentation file(s) to load

3. **Load Relevant Documentation**: Use the file reference pattern to load specific docs:
   ```
   #[[file:temp/COMPOSIO DOCS/XX-FILENAME.md]]
   ```

4. **Follow SDK Patterns**: This project uses the TypeScript SDK with sessions-based architecture

## Core Patterns in This Project

### Session Management
- Always use `composio.create(user_id)` to create sessions
- Sessions are user-scoped and immutable
- Use `session.tools()` for meta tools
- Use `session.mcp.url` for MCP integration

### Meta Tools (5 Core Tools)
- `COMPOSIO_SEARCH_TOOLS` - Discover tools at runtime
- `COMPOSIO_MANAGE_CONNECTIONS` - Handle authentication
- `COMPOSIO_MULTI_EXECUTE_TOOL` - Execute up to 20 tools in parallel
- `COMPOSIO_REMOTE_WORKBENCH` - Python sandbox for complex operations
- `COMPOSIO_REMOTE_BASH_TOOL` - Bash commands for file/data processing

### Authentication
- In-chat authentication is default (`manage_connections=True`)
- Manual authentication for pre-onboarding flows
- Use `session.authorize()` to generate Connect Links

### Tool Execution
- Agent discovers tools via SEARCH_TOOLS
- Agent checks/manages connections via MANAGE_CONNECTIONS
- Agent executes tools via EXECUTE_TOOL
- All operations share context via `session_id`

## Terminology (v3)

Use current terminology, not legacy:
- ✅ user ID (not entity ID)
- ✅ tools (not actions)
- ✅ toolkits (not apps/appType)
- ✅ auth config (not integration)
- ✅ connected account (not connection)
- ✅ provider (not toolset)

## When Making Changes

Before implementing Composio features:
1. Check `composio-documentation-guide.md` for the relevant documentation file
2. Load the specific documentation using the file reference pattern
3. Follow the patterns established in existing code (see `src/agent.js`, `src/executor-enhanced.js`)
4. Maintain consistency with the 3-phase architecture (Planning → Execution → Verification)

## Common Documentation Lookups

- **Sessions**: Files 02, 03
- **Meta Tools**: File 02
- **Authentication**: Files 02, 03, 04
- **Tool Execution**: Files 03, 06
- **Triggers**: Files 02, 03, 20
- **Webhooks**: Files 04, 21
- **API Reference**: Files 09-21
- **SDK Reference**: File 22 (TypeScript)
- **Examples**: File 24

## Integration Points in This Codebase

- **`src/agent.js`**: Main orchestrator, session management
- **`src/planner.js`**: Uses agent.md instructions for planning
- **`src/executor-enhanced.js`**: Executes tools via Composio session
- **`src/verifier.js`**: Validates execution results
- **`agent.md`**: Contains instructions for the LLM agent (references meta tools)

## Best Practices

1. Always reference documentation before making changes
2. Use session-based architecture (not direct tool execution)
3. Let meta tools handle discovery and authentication
4. Preserve the hybrid orchestration pattern
5. Maintain idempotency and checkpoint compatibility
6. Follow existing error handling patterns
