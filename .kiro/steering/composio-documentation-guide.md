---
inclusion: always
---

# Composio Documentation Reference Guide

This guide provides a structured index of Composio documentation to help you quickly locate relevant information when working with Composio integration. Use the decision logic and quick reference sections to identify which documentation files to load.

## 🤖 Agent Decision Logic

**Use this section first to determine which file(s) to load based on the user's query.**

### Query Type → File Mapping

**Getting Started / Setup:**
- First-time setup, provider integration → **File 01**
- "How do I start?", "Which provider?" → **File 01**

**Architecture / Concepts:**
- How Composio works, meta tools, sessions → **File 02**
- "What is a session?", "What are meta tools?" → **File 02**
- Workbench, triggers overview → **File 02**

**Configuration / Implementation:**
- Session configuration, toolkit filtering → **File 03**
- Authentication implementation (in-chat/manual) → **File 03**
- Creating/managing triggers → **File 03**
- Fetching tools and toolkits → **File 03**

**Advanced Features / Production:**
- White-labeling, custom OAuth apps → **File 04**
- Multiple accounts per user → **File 04**
- Webhook verification → **File 04**
- Connection expiry handling → **File 04**
- Native Tools vs MCP comparison → **File 04**
- Sessions vs Direct Execution → **File 04**

**Multi-tenancy / MCP Servers:**
- Projects, environment isolation → **File 05**
- Single-toolkit MCP servers → **File 05**

**Direct Tool Execution (Alternative to Sessions):**
- Fetching tools without sessions → **File 06**
- Authenticating tools directly → **File 06**
- Executing tools without meta tools → **File 06**
- Creating custom tools → **File 06**
- Modifying tool behavior (schema, before/after execution) → **File 06**
- Proxy execute for custom endpoints → **File 06**
- File handling (upload/download) → **File 06**

**FAQs / Troubleshooting / Migration:**
- Common questions about Composio features → **File 07**
- Terminology definitions (glossary) → **File 07**
- Migrating from older SDK versions → **File 07**
- Troubleshooting auth, API, CLI, dashboard, MCP → **File 07**
- Finding debugging info and support → **File 07**

**Toolkit Catalog:**
- Browsing all 980 available toolkits → **File 08**
- Finding toolkit slugs and authentication methods → **File 08**
- Checking tools and triggers count per toolkit → **File 08**

**API Reference:**
- API overview, authentication, rate limits, errors → **File 09**
- Auth Configs API endpoints and schemas → **File 10**
- Authentication session info API → **File 11**
- Connected Accounts API endpoints and schemas → **File 12**
- File management, uploads, S3 presigned URLs → **File 13**
- MCP server management and configuration → **File 14**
- UUID to NanoId migration, v1/v2 to v3 migration → **File 15**
- Projects API, multi-tenancy, project configuration → **File 16**
- Tool Router API (Labs), session management, tool execution → **File 17**
- Toolkits API, listing, filtering, categories, changelog → **File 18**
- Tools API, listing, execution, natural language, proxy requests → **File 19**
- Triggers API, event listeners, webhook/poll triggers, lifecycle → **File 20**
- Webhooks API, subscriptions, event types, secret rotation → **File 21**

**SDK Reference:**
- TypeScript SDK, classes, methods, installation, usage → **File 22**
- Python SDK, classes, methods, decorators, installation, usage → **File 23**

**Cookbooks & Templates:**
- Practical tutorials, working examples, templates, use cases → **File 24**
- Chat apps, dashboards, servers, background agents, RAG systems → **File 24**

### Loading Strategy

1. **Single Topic Query**: Load only the primary file
   - Example: "How do I create a session?" → Load File 02 or 03

2. **Multi-aspect Query**: Load related files in order
   - Example: "How do I set up white-labeled auth?" → Load Files 03 (auth basics) + 04 (white-labeling)

3. **Troubleshooting Query**: Check Quick Reference section below, then load indicated file(s)

4. **Use the file reference syntax**: `#[[file:COMPOSIO DOCS/XX-FILENAME.md]]`

---

## Document Index

### 01-COMPOSIO-GET-STARTED.md
**Purpose:** Entry point for Composio SDK - Getting started, quickstart guides, and provider integrations

**Key Topics:**
- Welcome and overview of Composio capabilities (1000+ toolkits, tool search, authentication, sandboxed workbench)
- Installation methods (Skills, CLI, Context files)
- Quickstart guides for multiple providers:
  - OpenAI Agents SDK (Native Tools & MCP)
  - Claude Agent SDK (Native Tools & MCP)
  - Vercel AI SDK (Native Tools & MCP)
  - OpenAI (Responses API & Chat Completions)
  - Anthropic (Claude Messages API)
  - AutoGen
  - CrewAI
  - Google Generative AI (Gemini)
  - Google ADK
  - LangChain
  - LangGraph
  - LlamaIndex
  - Mastra

**Critical Integration Patterns:**
- Always use `composio.create(user_id)` to create a session
- Use `session.tools()` for native tool integration
- Use `session.mcp.url` and `session.mcp.headers` for MCP integration
- Provider packages follow naming: `composio_<provider>` (Python), `@composio/<provider>` (TypeScript)

**Terminology (v3):**
- user ID (not entity ID)
- tools (not actions)
- toolkits (not apps/appType)
- auth config (not integration)
- connected account (not connection)
- provider (not toolset)

**When to Reference:**
- Starting a new Composio integration
- Choosing between Native Tools vs MCP
- Setting up authentication and API keys
- Understanding correct SDK patterns
- Migrating from v1/v2 terminology

**Code Examples Include:**
- Python and TypeScript implementations for all providers
- Both Native Tools and MCP integration patterns
- Agentic loops for tool execution
- Multi-turn conversation handling

---

## Quick Reference by Use Case

### "I need to integrate Composio with [Framework]"
→ Reference: 01-COMPOSIO-GET-STARTED.md
→ Look for: Provider-specific section (OpenAI, Claude, Vercel, LangChain, etc.)

### "What's the difference between Native Tools and MCP?"
→ Reference: 01-COMPOSIO-GET-STARTED.md
→ Look for: Integration modes comparison

### "How do I set up authentication?"
→ Reference: 02-COMPOSIO-CORE-CONCEPTS.md, 03-COMPOSIO-GETTING-STARTED.md
→ Look for: Authentication section (in-chat vs manual)

### "I'm getting terminology errors (entity ID, actions, etc.)"
→ Reference: 01-COMPOSIO-GET-STARTED.md or 02-COMPOSIO-CORE-CONCEPTS.md
→ Look for: Terminology Migration table

### "How do I create a session for a user?"
→ Reference: 02-COMPOSIO-CORE-CONCEPTS.md, 03-COMPOSIO-GETTING-STARTED.md
→ Pattern: `composio.create(user_id="user_123")`
→ Look for: Sessions section, Configuring Sessions

### "What are meta tools and how do they work?"
→ Reference: 02-COMPOSIO-CORE-CONCEPTS.md
→ Look for: Meta tools section (5 core tools)

### "How do I handle bulk operations or large data?"
→ Reference: 02-COMPOSIO-CORE-CONCEPTS.md
→ Look for: Workbench section (persistent Python sandbox)

### "How do I set up event-driven workflows?"
→ Reference: 02-COMPOSIO-CORE-CONCEPTS.md, 03-COMPOSIO-GETTING-STARTED.md
→ Look for: Triggers section (webhooks and polling), Creating/Subscribing/Managing triggers

### "How do I manage multiple accounts per user?"
→ Reference: 02-COMPOSIO-CORE-CONCEPTS.md, 03-COMPOSIO-GETTING-STARTED.md
→ Look for: Users & Sessions section (multiple connections), Account selection

### "When should I create a new session?"
→ Reference: 02-COMPOSIO-CORE-CONCEPTS.md
→ Look for: Sessions behavior (immutable, create when config changes)

### "How do I restrict which toolkits my agent can use?"
→ Reference: 03-COMPOSIO-GETTING-STARTED.md
→ Look for: Enable and disable toolkits, Configuring Sessions

### "How do I filter tools by behavior (read-only, destructive, etc.)?"
→ Reference: 03-COMPOSIO-GETTING-STARTED.md
→ Look for: Filtering tools by tags (readOnlyHint, destructiveHint, etc.)

### "How do I implement in-chat authentication?"
→ Reference: 03-COMPOSIO-GETTING-STARTED.md
→ Look for: In-chat authentication section with full examples

### "How do I pre-authenticate users before they chat?"
→ Reference: 03-COMPOSIO-GETTING-STARTED.md
→ Look for: Manual authentication section with session.authorize()

### "How do I receive events from connected apps?"
→ Reference: 03-COMPOSIO-GETTING-STARTED.md
→ Look for: Creating triggers, Subscribing to triggers (webhooks and SDK)

### "How do I list available toolkits and their connection status?"
→ Reference: 03-COMPOSIO-GETTING-STARTED.md
→ Look for: Fetching tools and toolkits, session.toolkits()

### "How do I get a tool's input/output schema?"
→ Reference: 03-COMPOSIO-GETTING-STARTED.md
→ Look for: Get a tool's schema (getRawComposioToolBySlug)

### "How do I white-label the authentication experience?"
→ Reference: 04-COMPOSIO-GUIDES.md
→ Look for: White-labeling authentication (Connect Link, OAuth apps, custom redirect)

### "How do I let users connect multiple accounts (work/personal)?"
→ Reference: 04-COMPOSIO-GUIDES.md
→ Look for: Managing multiple connected accounts

### "How do I use my own OAuth app instead of Composio's?"
→ Reference: 04-COMPOSIO-GUIDES.md
→ Look for: Using your own OAuth apps, Custom auth configuration

### "How do I verify webhook signatures?"
→ Reference: 04-COMPOSIO-GUIDES.md
→ Look for: Verifying webhooks (SDK and manual verification)

### "How do I handle expired OAuth connections?"
→ Reference: 04-COMPOSIO-GUIDES.md
→ Look for: Subscribing to connection expiry events

### "Should I use Native Tools or MCP?"
→ Reference: 04-COMPOSIO-GUIDES.md
→ Look for: Native Tools vs MCP (comparison table and trade-offs)

### "Should I use Sessions or Direct Execution?"
→ Reference: 04-COMPOSIO-GUIDES.md
→ Look for: Sessions vs Direct Execution (comparison table and use cases)

### "How do I execute tools directly without meta tools?"
→ Reference: 04-COMPOSIO-GUIDES.md
→ Look for: Direct execution (composio.tools.get() and execute())

### "How do I set up multi-tenant architecture?"
→ Reference: 05-COMPOSIO-FEATURES.md
→ Look for: Projects (multi-tenancy primitive)

### "How do I isolate production and staging environments?"
→ Reference: 05-COMPOSIO-FEATURES.md
→ Look for: Projects (separate environments use case)

### "How do I create a single-toolkit MCP server?"
→ Reference: 05-COMPOSIO-FEATURES.md
→ Look for: Single Toolkit MCP (create, generate URLs, use with providers)

### "What's the difference between a tool and a toolkit?"
→ Reference: 07-COMPOSIO-RESOURCES.md
→ Look for: General FAQs or Glossary

### "Do I need an AI agent to use Composio?"
→ Reference: 07-COMPOSIO-RESOURCES.md
→ Look for: General FAQs

### "How do I migrate from v1/v2 SDK to v3?"
→ Reference: 07-COMPOSIO-RESOURCES.md
→ Look for: Migration Guides (Legacy SDK to Current SDK)

### "How do I migrate from direct tools to sessions?"
→ Reference: 07-COMPOSIO-RESOURCES.md
→ Look for: Migration Guides (Direct Tools to Sessions)

### "I'm getting authentication errors"
→ Reference: 07-COMPOSIO-RESOURCES.md
→ Look for: Troubleshooting → Authentication Issues

### "I'm getting API errors"
→ Reference: 07-COMPOSIO-RESOURCES.md
→ Look for: Troubleshooting → API Issues

### "MCP server connection issues"
→ Reference: 07-COMPOSIO-RESOURCES.md
→ Look for: Troubleshooting → MCP Issues

### "What does [term] mean in Composio?"
→ Reference: 07-COMPOSIO-RESOURCES.md
→ Look for: Glossary section

### "Where can I find my debugging info?"
→ Reference: 07-COMPOSIO-RESOURCES.md
→ Look for: Debugging Info section

### "Which toolkits are available?"
→ Reference: 08-COMPOSIO-TOOLKITS.md
→ Look for: Complete toolkit catalog with slugs and auth methods

### "What authentication does [toolkit] support?"
→ Reference: 08-COMPOSIO-TOOLKITS.md
→ Look for: Toolkit table with auth column

### "How do I authenticate API calls?"
→ Reference: 09-API-REFERENCE-COMPOSIO-OVERVIEW.md
→ Look for: Authentication section (API keys, headers)

### "What are the rate limits?"
→ Reference: 09-API-REFERENCE-COMPOSIO-OVERVIEW.md
→ Look for: Rate Limits section (by plan, headers, best practices)

### "How do I handle API errors?"
→ Reference: 09-API-REFERENCE-COMPOSIO-OVERVIEW.md
→ Look for: Error Handling section (error types, status codes)

### "How do I create/manage auth configs via API?"
→ Reference: 10-API-REFERENCE-COMPOSIO-AUTH-CONFIGS.md
→ Look for: Auth Configs endpoints (POST, GET, PATCH, DELETE)

### "How do I verify my API authentication status?"
→ Reference: 11-API-REFERENCE-COMPOSIO-AUTHENTICATION.md
→ Look for: Get session info endpoint

### "How do I manage connected accounts via API?"
→ Reference: 12-API-REFERENCE-COMPOSIO-CONNECTED-ACCOUNTS.md
→ Look for: Connected Accounts endpoints (list, create, get, delete, enable/disable, refresh, link)

### "How do I create a connection for a user via API?"
→ Reference: 12-API-REFERENCE-COMPOSIO-CONNECTED-ACCOUNTS.md
→ Look for: Create connected account (POST)

### "How do I refresh expired authentication?"
→ Reference: 12-API-REFERENCE-COMPOSIO-CONNECTED-ACCOUNTS.md
→ Look for: Refresh authentication endpoint

### "What are the connection statuses?"
→ Reference: 12-API-REFERENCE-COMPOSIO-CONNECTED-ACCOUNTS.md
→ Look for: Connection statuses (INITIALIZING, INITIATED, ACTIVE, EXPIRED, FAILED, INACTIVE)

### "How do I upload files for tool execution?"
→ Reference: 13-API-REFERENCE-COMPOSIO-FILES.md
→ Look for: File upload endpoints, presigned URLs, S3 upload

### "How do I list uploaded files?"
→ Reference: 13-API-REFERENCE-COMPOSIO-FILES.md
→ Look for: List files endpoint with filters

### "How do I handle file deduplication?"
→ Reference: 13-API-REFERENCE-COMPOSIO-FILES.md
→ Look for: MD5 hash for deduplication

### "How do I create an MCP server?"
→ Reference: 14-API-REFERENCE-COMPOSIO-MCP.md
→ Look for: Create MCP server endpoints (standard and custom)

### "How do I manage MCP server instances?"
→ Reference: 14-API-REFERENCE-COMPOSIO-MCP.md
→ Look for: MCP server instances endpoints (list, create, delete)

### "How do I configure MCP servers for AI assistants?"
→ Reference: 14-API-REFERENCE-COMPOSIO-MCP.md
→ Look for: MCP server configuration, commands for Claude/Cursor/Windsurf

### "How do I generate MCP URLs for users?"
→ Reference: 14-API-REFERENCE-COMPOSIO-MCP.md
→ Look for: Generate MCP URL endpoint with custom parameters

### "How do I convert legacy UUIDs to NanoIds?"
→ Reference: 15-API-REFERENCE-COMPOSIO-MIGRATION.md
→ Look for: Get NanoId from UUID endpoint

### "How do I migrate from v1/v2 identifiers to v3?"
→ Reference: 15-API-REFERENCE-COMPOSIO-MIGRATION.md
→ Look for: Migration endpoint for connected accounts, auth configs, trigger instances

### "How do I create a project via API?"
→ Reference: 16-API-REFERENCE-COMPOSIO-PROJECTS.md
→ Look for: Create project endpoint, project configuration

### "How do I manage projects programmatically?"
→ Reference: 16-API-REFERENCE-COMPOSIO-PROJECTS.md
→ Look for: List, get, update, delete project endpoints

### "How do I configure project settings?"
→ Reference: 16-API-REFERENCE-COMPOSIO-PROJECTS.md
→ Look for: Project configuration endpoints (2FA, logo, display name, log visibility)

### "How do I regenerate project API keys?"
→ Reference: 16-API-REFERENCE-COMPOSIO-PROJECTS.md
→ Look for: Regenerate API key endpoint

### "What is Tool Router and how do I use it?"
→ Reference: 17-API-REFERENCE-COMPOSIO-TOOL-ROUTER.md
→ Look for: Tool Router overview, session creation

### "How do I create a Tool Router session?"
→ Reference: 17-API-REFERENCE-COMPOSIO-TOOL-ROUTER.md
→ Look for: Create session endpoint with configuration options

### "How do I execute tools in a Tool Router session?"
→ Reference: 17-API-REFERENCE-COMPOSIO-TOOL-ROUTER.md
→ Look for: Execute tool and execute meta tool endpoints

### "How do I search for tools in Tool Router?"
→ Reference: 17-API-REFERENCE-COMPOSIO-TOOL-ROUTER.md
→ Look for: Search endpoint with use case queries

### "How do I manage workbench files in Tool Router?"
→ Reference: 17-API-REFERENCE-COMPOSIO-TOOL-ROUTER.md
→ Look for: Mount endpoints (list, upload, download, delete)

### "How do I list available toolkits via API?"
→ Reference: 18-API-REFERENCE-COMPOSIO-TOOLKITS.md
→ Look for: List toolkits endpoint with filtering options

### "How do I get detailed information about a specific toolkit?"
→ Reference: 18-API-REFERENCE-COMPOSIO-TOOLKITS.md
→ Look for: Get toolkit by slug endpoint

### "What authentication methods does a toolkit support?"
→ Reference: 18-API-REFERENCE-COMPOSIO-TOOLKITS.md
→ Look for: Toolkit auth_schemes and auth_config_details

### "How do I browse toolkit categories?"
→ Reference: 18-API-REFERENCE-COMPOSIO-TOOLKITS.md
→ Look for: List toolkit categories endpoint

### "How do I fetch multiple toolkits at once?"
→ Reference: 18-API-REFERENCE-COMPOSIO-TOOLKITS.md
→ Look for: Fetch multiple toolkits endpoint (POST /toolkits/multi)

### "How do I view toolkit version history?"
→ Reference: 18-API-REFERENCE-COMPOSIO-TOOLKITS.md
→ Look for: Get toolkits changelog endpoint

### "How do I list available tools via API?"
→ Reference: 19-API-REFERENCE-COMPOSIO-TOOLS.md
→ Look for: List tools endpoint with filtering options

### "How do I get detailed information about a specific tool?"
→ Reference: 19-API-REFERENCE-COMPOSIO-TOOLS.md
→ Look for: Get tool by slug endpoint

### "How do I execute a tool programmatically?"
→ Reference: 19-API-REFERENCE-COMPOSIO-TOOLS.md
→ Look for: Execute tool endpoint with structured arguments

### "How do I execute a tool using natural language?"
→ Reference: 19-API-REFERENCE-COMPOSIO-TOOLS.md
→ Look for: Execute tool with text parameter, Generate tool inputs endpoint

### "How do I make authenticated API calls to third-party services?"
→ Reference: 19-API-REFERENCE-COMPOSIO-TOOLS.md
→ Look for: Execute proxy request endpoint

### "How do I filter tools by tags or scopes?"
→ Reference: 19-API-REFERENCE-COMPOSIO-TOOLS.md
→ Look for: List tools with tags and scopes parameters

### "How do I get all tool slugs/enums?"
→ Reference: 19-API-REFERENCE-COMPOSIO-TOOLS.md
→ Look for: Get tool enum list endpoint

### "What are the tool input/output schemas?"
→ Reference: 19-API-REFERENCE-COMPOSIO-TOOLS.md
→ Look for: Tool response schema with input_parameters and output_parameters

### "How do I create a trigger instance?"
→ Reference: 20-API-REFERENCE-COMPOSIO-TRIGGERS.md
→ Look for: Create or update trigger endpoint (upsert)

### "How do I list active triggers?"
→ Reference: 20-API-REFERENCE-COMPOSIO-TRIGGERS.md
→ Look for: List active triggers with filtering options

### "How do I enable or disable a trigger?"
→ Reference: 20-API-REFERENCE-COMPOSIO-TRIGGERS.md
→ Look for: Enable or disable trigger endpoint (PATCH)

### "How do I delete a trigger?"
→ Reference: 20-API-REFERENCE-COMPOSIO-TRIGGERS.md
→ Look for: Delete trigger endpoint (permanent deletion)

### "What trigger types are available?"
→ Reference: 20-API-REFERENCE-COMPOSIO-TRIGGERS.md
→ Look for: List trigger types, Get trigger type by slug

### "What's the difference between webhook and poll triggers?"
→ Reference: 20-API-REFERENCE-COMPOSIO-TRIGGERS.md
→ Look for: Trigger type field (webhook vs poll)

### "What configuration does a trigger require?"
→ Reference: 20-API-REFERENCE-COMPOSIO-TRIGGERS.md
→ Look for: Trigger type config schema

### "What data does a trigger event contain?"
→ Reference: 20-API-REFERENCE-COMPOSIO-TRIGGERS.md
→ Look for: Trigger type payload schema

### "How do I create a webhook subscription?"
→ Reference: 21-API-REFERENCE-COMPOSIO-WEBHOOKS.md
→ Look for: Create webhook subscription endpoint

### "How do I update my webhook URL or events?"
→ Reference: 21-API-REFERENCE-COMPOSIO-WEBHOOKS.md
→ Look for: Update webhook subscription endpoint

### "How do I rotate my webhook secret?"
→ Reference: 21-API-REFERENCE-COMPOSIO-WEBHOOKS.md
→ Look for: Rotate webhook secret endpoint

### "What event types can I subscribe to?"
→ Reference: 21-API-REFERENCE-COMPOSIO-WEBHOOKS.md
→ Look for: List available event types endpoint

### "What are webhook payload versions (V1, V2, V3)?"
→ Reference: 21-API-REFERENCE-COMPOSIO-WEBHOOKS.md
→ Look for: Webhook version field and descriptions

### "How do I list my webhook subscriptions?"
→ Reference: 21-API-REFERENCE-COMPOSIO-WEBHOOKS.md
→ Look for: List webhook subscriptions endpoint

### "How do I delete a webhook subscription?"
→ Reference: 21-API-REFERENCE-COMPOSIO-WEBHOOKS.md
→ Look for: Delete webhook subscription endpoint

### "How do I use the TypeScript SDK?"
→ Reference: 22-SDK-REFERENCE-COMPOSIO-TYPESCRIPT-SDK.md
→ Look for: Installation, Quick Start, Core classes

### "What classes are available in the TypeScript SDK?"
→ Reference: 22-SDK-REFERENCE-COMPOSIO-TYPESCRIPT-SDK.md
→ Look for: Classes section (Composio, AuthConfigs, ConnectedAccounts, MCP, Toolkits, Tools, Triggers)

### "How do I create a custom tool in TypeScript?"
→ Reference: 22-SDK-REFERENCE-COMPOSIO-TYPESCRIPT-SDK.md
→ Look for: Tools class, createCustomTool() method

### "How do I manage auth configs in TypeScript?"
→ Reference: 22-SDK-REFERENCE-COMPOSIO-TYPESCRIPT-SDK.md
→ Look for: AuthConfigs class methods

### "How do I execute tools in TypeScript?"
→ Reference: 22-SDK-REFERENCE-COMPOSIO-TYPESCRIPT-SDK.md
→ Look for: Tools class, execute() method

### "How do I use the Python SDK?"
→ Reference: 23-SDK-REFERENCE-COMPOSIO-PYTHON-SDK.md
→ Look for: Installation, Quick Start, Core classes

### "What classes are available in the Python SDK?"
→ Reference: 23-SDK-REFERENCE-COMPOSIO-PYTHON-SDK.md
→ Look for: Classes section (Composio, Tools, Toolkits, Triggers, ConnectedAccounts, AuthConfigs, MCP)

### "How do I use tool modifiers in Python?"
→ Reference: 23-SDK-REFERENCE-COMPOSIO-PYTHON-SDK.md
→ Look for: Decorators section (before_execute, after_execute, schema_modifier)

### "How do I create a custom tool in Python?"
→ Reference: 23-SDK-REFERENCE-COMPOSIO-PYTHON-SDK.md
→ Look for: Tools class, custom tool creation

### "How do I modify tool schemas before execution?"
→ Reference: 23-SDK-REFERENCE-COMPOSIO-PYTHON-SDK.md
→ Look for: schema_modifier decorator

### "How do I inject arguments before tool execution?"
→ Reference: 23-SDK-REFERENCE-COMPOSIO-PYTHON-SDK.md
→ Look for: before_execute decorator

### "How do I modify tool results after execution?"
→ Reference: 23-SDK-REFERENCE-COMPOSIO-PYTHON-SDK.md
→ Look for: after_execute decorator

### "How do I build a chat app with Composio?"
→ Reference: 24-COOKBOOKS-GUIDE.md
→ Look for: Build a Chat App tutorial (Next.js)

### "How do I create a connections dashboard?"
→ Reference: 24-COOKBOOKS-GUIDE.md
→ Look for: Build an App Connections Dashboard tutorial

### "How do I build a FastAPI server with Composio?"
→ Reference: 24-COOKBOOKS-GUIDE.md
→ Look for: Basic FastAPI Server tutorial

### "How do I build a Hono server with Composio?"
→ Reference: 24-COOKBOOKS-GUIDE.md
→ Look for: Basic Hono Server tutorial

### "How do I create a background automation agent?"
→ Reference: 24-COOKBOOKS-GUIDE.md
→ Look for: Background Agent tutorial (scheduled sweeps)

### "How do I build a support agent with RAG?"
→ Reference: 24-COOKBOOKS-GUIDE.md
→ Look for: Support Knowledge Agent tutorial

### "What template projects are available?"
→ Reference: 24-COOKBOOKS-GUIDE.md
→ Look for: Templates section (TrustClaw, Data Analyst, etc.)

### "How do I implement in-chat authentication?"
→ Reference: 24-COOKBOOKS-GUIDE.md
→ Look for: Build a Chat App tutorial, authentication flow

### "How do I schedule agents with cron?"
→ Reference: 24-COOKBOOKS-GUIDE.md
→ Look for: Background Agent tutorial, scheduling section

---

## File Reference Pattern

When referencing documentation in this folder, use:
```
#[[file:COMPOSIO DOCS/[filename].md]]
```

Example:
```
#[[file:COMPOSIO DOCS/01-COMPOSIO-GET-STARTED.md]]
```

---

### 02-COMPOSIO-CORE-CONCEPTS.md
**Purpose:** Deep dive into Composio's architecture - sessions, meta tools, authentication, workbench, and triggers

**Key Topics:**

**1. How Composio Works (Overview)**
- High-level architecture connecting AI agents to external services
- Five core concepts: Users & Sessions, Authentication, Tools & Toolkits, Workbench, Triggers
- Meta tools system for runtime discovery and execution

**2. Sessions**
- Session creation: `composio.create(user_id="user_123")`
- Sessions tie together: user, available toolkits, auth configuration
- Sessions are immutable - create new session when config changes
- Session methods: `tools()`, `mcp.url`, `authorize()`, `toolkits()`
- Connected accounts persist across sessions

**3. Meta Tools (5 Core Tools)**
- `COMPOSIO_SEARCH_TOOLS` - Discover relevant tools across 1000+ apps
- `COMPOSIO_MANAGE_CONNECTIONS` - Handle OAuth and API key authentication
- `COMPOSIO_MULTI_EXECUTE_TOOL` - Execute up to 20 tools in parallel
- `COMPOSIO_REMOTE_WORKBENCH` - Run Python code in persistent sandbox
- `COMPOSIO_REMOTE_BASH_TOOL` - Execute bash commands for file/data processing
- Meta tools share context via `session_id`
- SEARCH_TOOLS returns: tools with schemas, connection status, execution plan, related tools

**4. Users & Sessions (Detailed)**
- User ID best practices: Use DB UUID/primary key, avoid emails, never use "default" in production
- Multiple connections per toolkit supported (e.g., work and personal email)
- Triggers scoped to connected accounts
- Sessions don't expire, no need to cache session IDs

**5. Authentication**
- Two approaches: In-chat authentication (default) vs Manual authentication
- In-chat: Agent automatically prompts with Connect Links during conversation
- Manual: Call `session.authorize()` during onboarding or from settings
- OAuth flows, token refresh, credential management handled automatically
- Connections persist across sessions

**6. Tools and Toolkits**
- Toolkit = collection of related tools for a service (e.g., `github`)
- Tool = individual action (e.g., `GITHUB_CREATE_ISSUE`)
- Naming pattern: `{TOOLKIT}_{ACTION}`
- Default: All toolkits accessible via SEARCH_TOOLS (not loaded into context)
- Tools execute with user's authenticated credentials

**7. Workbench (Persistent Python Sandbox)**
- Part of meta tools system (not available with direct tool execution)
- Persistent Jupyter notebook environment
- Built-in helpers:
  - `run_composio_tool` - Execute any Composio tool
  - `invoke_llm` - Call LLM for classification/summarization
  - `upload_local_file` - Upload files to cloud storage
  - `proxy_execute` - Direct API calls to connected services
  - `web_search` - Search the web
  - `smart_file_extract` - Extract text from PDFs/images
- Pre-installed libraries: pandas, numpy, matplotlib, Pillow, PyTorch, reportlab
- Auto-installs additional packages as needed
- Error correction for common mistakes
- State persists across calls within a session
- Common patterns: bulk operations, data analysis/reporting, multi-step workflows

**8. Triggers (Event-Driven)**
- Two types: Webhook triggers (real-time) and Polling triggers (every minute)
- Workflow: Configure endpoint → Discover trigger types → Create active trigger → Receive events → Manage
- Trigger type = template defining event and required config
- Active trigger = scoped to specific user and connected account
- Examples: `GITHUB_COMMIT_EVENT`, Slack messages, incoming emails

**When to Reference:**
- Understanding Composio's architecture and how components work together
- Learning about meta tools and their capabilities
- Implementing session management and user isolation
- Setting up authentication flows (in-chat vs manual)
- Working with the workbench for complex operations
- Implementing event-driven workflows with triggers
- Understanding toolkit and tool structure
- Managing multiple connections per user

**Related Guides Referenced:**
- Managing Multiple Connections
- White-labeling authentication
- Custom auth configs
- Enable and disable toolkits
- Fetching tools and toolkits
- Direct tool execution
- Creating triggers
- Subscribing to events
- Verifying webhooks
- Managing triggers

---

### 03-COMPOSIO-GETTING-STARTED.md
**Purpose:** Practical guides for configuring sessions, authentication, toolkits, and triggers

**Key Topics:**

**1. Configuring Sessions**
- Creating sessions: `composio.create(user_id="user_123")`
- Default: Access to all toolkits via COMPOSIO_SEARCH_TOOLS
- Enabling specific toolkits: `toolkits=["github", "gmail", "slack"]`
- Disabling specific toolkits: `toolkits={"disable": ["exa", "firecrawl"]}`
- Custom auth configs: `auth_configs={"github": "ac_your_config"}`
- Account selection: `connected_accounts={"gmail": "ca_work_gmail"}`
- Connected account precedence order (5 levels)
- Session methods: `mcp`, `tools()`, `authorize()`, `toolkits()`

**2. In-Chat Authentication**
- Default behavior: Agent prompts users with Connect Links during chat
- Enabled by default via `manage_connections=True`
- Workflow: Search tools → Check connection → Return Connect Link → User authenticates → Agent continues
- Custom callback URL configuration
- Full Python and TypeScript examples with OpenAI Agents

**3. Manual Authentication**
- Pre-authenticate users before chat or build custom connections UI
- `session.authorize(toolkit)` generates Connect Link URL
- `connection_request.wait_for_connection(timeout)` polls for completion
- Callback URL with query parameters for context
- Redirect parameters: `status`, `connected_account_id`
- Check connection status with `session.toolkits()`
- Disable in-chat auth: `manage_connections=False`
- Complete example: Verify required connections before starting agent

**4. Fetching Tools and Toolkits**
- For sessions: Fetch through session object
- `session.toolkits()` - List enabled toolkits (top 20 by default, paginated)
- Filter by connection status: `is_connected=True`
- `session.tools()` - Get 5 meta tools formatted for provider
- Browsing catalog: `composio.toolkits.get()`, `composio.tools.get()`
- Get tool schema: `getRawComposioToolBySlug("GMAIL_SEND_EMAIL")`
- Returns: name, description, input_parameters, output_parameters

**5. Enable and Disable Toolkits**
- Enable specific toolkits: Array or `{"enable": [...]}`
- Disable specific toolkits: `{"disable": [...]}`
- Enable/disable specific tools within toolkit: `tools={"gmail": {"enable": [...]}}`
- Shorthand array syntax for tools
- Tag filtering (global and per-toolkit):
  - `readOnlyHint` - Read-only tools
  - `destructiveHint` - Modify/delete data
  - `idempotentHint` - Safely retryable
  - `openWorldHint` - Open world context
- Per-toolkit tag overrides

**6. Creating Triggers**
- Prerequisites: Auth config and connected account
- Inspect trigger type config: `composio.triggers.get_type("GITHUB_COMMIT_EVENT")`
- Create trigger: `composio.triggers.create(slug, user_id, trigger_config)`
- SDK auto-finds connected account (most recent if multiple)
- Can pass `connected_account_id` directly for control
- Dashboard creation workflow
- Trigger uses toolkit version from initialization

**7. Subscribing to Triggers**
- Webhooks (recommended for production):
  - Event types: `composio.trigger.message`, `composio.connected_account.expired`
  - Set webhook URL in dashboard or via API
  - Response includes `secret` for signature verification
  - Route on `type` field to handle events
  - Inspect payload schema: `composio.triggers.get_type().payload`
  - V3 payload structure: id, type, metadata, data, timestamp
- SDK subscriptions (testing):
  - WebSocket-based, no webhook endpoint needed
  - `composio.triggers.subscribe()` with handler
- Testing locally with ngrok
- Event identification via metadata fields

**8. Managing Triggers**
- List active triggers: `composio.triggers.list_active()`
- Filters: connected_account_ids, trigger_ids, trigger_names, auth_config_ids, show_disabled
- Cursor pagination support
- Enable/disable: `composio.triggers.enable/disable(trigger_id)`
- Delete (permanent): `composio.triggers.delete(trigger_id)`
- Dashboard toggle for enable/disable

**When to Reference:**
- Configuring session options (toolkits, auth, accounts)
- Implementing authentication flows (in-chat vs manual)
- Building custom connections UI
- Fetching and filtering toolkits/tools
- Controlling toolkit and tool availability
- Setting up event-driven workflows with triggers
- Managing trigger lifecycle (create, subscribe, manage)
- Testing triggers locally
- Understanding webhook payload structure

**Code Examples Include:**
- Complete session configuration patterns
- In-chat authentication with multi-turn conversation
- Manual authentication with connection verification
- Toolkit and tool filtering strategies
- Tag-based tool filtering
- Trigger creation and subscription
- Webhook handler implementation
- SDK subscription patterns

---

### 04-COMPOSIO-GUIDES.md
**Purpose:** Advanced guides for white-labeling, multiple accounts, custom auth, webhooks, and integration patterns

**Key Topics:**

**1. White-labeling Authentication**
- Three branding touchpoints: Connect Link page, OAuth consent screen, Browser address bar
- Customizing Connect Link: Upload logo and app title in Project Settings → Auth Screen
- Using your own OAuth apps:
  - Register OAuth app with toolkit's developer portal
  - Set callback URL: `https://backend.composio.dev/api/v3/toolkits/auth/callback`
  - Create auth config in Composio dashboard with Client ID/Secret
  - Pass auth config ID in session: `auth_configs={"github": "ac_your_config"}`
- When to use: Production apps, enterprise customers, custom scopes
- Custom redirect domain: Proxy OAuth redirect through your domain
  - Set redirect URI to your endpoint
  - Create 302 redirect proxy endpoint
  - Update auth config with custom redirect URI
- Troubleshooting: "Secured by Composio" badge, logo issues, upload failures

**2. Managing Multiple Connected Accounts**
- Users can connect multiple accounts per toolkit (work/personal)
- Default behavior: Most recently connected account used
- Each session uses one account per toolkit at a time
- Connecting multiple accounts: Call `session.authorize()` multiple times
- Store account IDs for explicit selection
- Selecting specific account: Pass in `connected_accounts` parameter
- Listing all user accounts
- Viewing session's active account: `session.toolkits()`

**3. Using Custom Auth Configuration**
- When needed: No managed auth, white-labeling, rate limits, custom scopes, custom instance
- Check if toolkit needs custom credentials in platform
- Create auth config workflow:
  - Dashboard → Authentication management → Create Auth Config
  - Select toolkit and auth scheme (OAuth2, API Key, etc.)
  - Enter credentials
  - Copy auth config ID
- Use in session: `auth_configs={"posthog": "ac_your_config"}`

**4. Verifying Webhooks**
- Composio signs every webhook request
- SDK verification: `composio.triggers.verify_webhook()`
  - Handles signature verification, payload parsing, version detection
  - Parameters: id, payload, signature, timestamp, secret
  - Optional tolerance parameter (default: 300 seconds)
- Manual verification: HMAC SHA256 with base64 encoding
  - Headers: webhook-signature, webhook-id, webhook-timestamp
  - Signing string: `{id}.{timestamp}.{body}`
- Webhook payload versions:
  - V3 (default): Metadata separated from event data
  - V2 (legacy): Metadata mixed into data object
  - V1 (legacy): Different structure
- Webhook secret returned only once at creation or rotation

**5. Subscribing to Connection Expiry Events**
- Event: `composio.connected_account.expired`
- Only available with V3 webhook payloads
- Composio auto-refreshes OAuth tokens, but refresh token can expire
- Subscribe: Add to `enabled_events` in webhook subscription
- Event payload includes: account ID, toolkit, auth config, status, status_reason
- Handle event: Look up user, generate re-auth link with `session.authorize()`
- Re-authenticate user: Send Connect Link URL

**6. Native Tools vs MCP**
- Comparison table: Setup, intercepting tool calls, context window, latency
- Native tools:
  - Provider package for specific framework
  - Full control over tool schemas in context
  - Can log, retry, require approval
  - SDK calls Composio API directly
- MCP:
  - SDK or just URL, no provider package
  - Client loads all tools from server
  - Limited interception (client-dependent)
  - Protocol adds overhead
- Context window consideration: 5-server MCP setup can consume ~55K tokens
- Native tools give more control over cost

**7. Sessions vs Direct Execution**
- Comparison table: Discovery, context cost, guidance, memory, auth, workbench, human approval, latency
- Sessions:
  - Agent discovers tools at runtime via meta tools
  - Only meta tools in context, app tools on demand
  - Search returns recommended steps and pitfalls
  - Meta tools share context across calls
  - In-chat or manual auth
  - Workbench built-in
  - Configure approval rules on session
  - Multiple LLM turns
- Direct execution:
  - You select tools upfront
  - Every tool schema loaded upfront
  - Tool schemas only
  - You manage state
  - You build auth flow with connect links
  - No workbench
  - Intercept before each call in code
  - Single call
- Sessions are configurable: enable/disable toolkits, auth configs, connected accounts
- Direct execution: `composio.tools.get()` and `composio.tools.execute()`
- Default limit: 20 tools (increase for multiple toolkits)

**When to Reference:**
- Implementing white-labeled authentication
- Managing multiple accounts per user (work/personal)
- Setting up custom OAuth apps
- Creating custom auth configs for toolkits without managed auth
- Verifying webhook signatures
- Handling connection expiry events
- Choosing between Native Tools and MCP
- Choosing between Sessions and Direct Execution
- Understanding trade-offs between integration patterns

**Code Examples Include:**
- White-labeling setup (OAuth apps, custom redirect proxy)
- Multiple account connection and selection
- Custom auth config creation and usage
- Webhook verification (SDK and manual)
- Connection expiry event handling
- Native tools vs MCP setup for various frameworks
- Direct tool execution patterns

---

### 05-COMPOSIO-FEATURES.md
**Purpose:** Projects (multi-tenancy) and Single Toolkit MCP server configuration

**Key Topics:**

**1. Projects (Multi-tenancy)**
- Projects are Composio's multi-tenancy primitive
- Organization structure: Account → Organization → Projects
- Projects are isolated environments that scope:
  - API keys
  - Connected accounts
  - Auth configs
  - Webhook configurations
- Resources in one project not accessible from another
- Common use cases:
  - Separate environments (production/staging)
  - Separate products (different apps)
  - Client isolation (per-client credentials and data)

**Managing Projects:**
- Manage via dashboard or API using organization API key (`x-org-api-key`)
- Create project: POST `/api/v3/org/owner/project/new`
  - Parameters: name, should_create_api_key
  - Returns: project ID and optional API key
- List projects: GET `/api/v3/org/owner/project/list`
  - Supports pagination (limit, cursor)
- Get project details: GET `/api/v3/org/owner/project/{project_id}`
- Project settings: PATCH `/api/v3/org/project/config`
  - Uses project API key (`x-api-key`), not org key
  - Settings: mask_secret_keys_in_connected_account, log_visibility_setting
  - Also configurable via dashboard: Settings → Project Settings

**2. Single Toolkit MCP**
- Alternative to quickstart for specific use cases
- Recommendation: Use quickstart for most cases (dynamic tool access, better MCP experience)

**Setup Workflow:**
1. Install SDK (composio for Python, @composio/core for TypeScript)
2. Initialize Composio with API key
3. Create auth configuration for toolkit (prerequisite)
4. Create MCP server configuration:
   - `composio.mcp.create(name, toolkits, allowed_tools)`
   - Specify toolkit and auth_config
   - Filter allowed tools
   - Can create via dashboard or API
5. Generate user URLs:
   - Users must authenticate first
   - `composio.mcp.generate(user_id, mcp_config_id)`
   - Returns MCP server URL
6. Use with AI providers:
   - OpenAI: responses.create with MCP tools
   - Anthropic: beta.messages.create with mcp_servers
   - Mastra: MCPClient with server URLs

**Server Management:**
- List servers: `composio.mcp.list()`
  - Filter by toolkit, auth configs
  - Pagination support (limit, page)
- Get server details: `composio.mcp.get(server_id)`
- Update server: `composio.mcp.update(server_id, name, allowed_tools)`
- Delete server: `composio.mcp.delete(server_id)`

**When to Reference:**
- Setting up multi-tenant architecture
- Isolating environments (prod/staging)
- Managing per-client resources
- Creating single-toolkit MCP servers
- Configuring MCP for specific AI providers
- Managing MCP server lifecycle

**Code Examples Include:**
- Project creation and management via API
- MCP server creation with toolkit configuration
- User URL generation for MCP
- Integration with OpenAI, Anthropic, Mastra
- MCP server CRUD operations

---

### 06-COMPOSIO-DIRECT-TOOL-EXECUTION-GUIDES.md
**Purpose:** Complete guide for direct tool execution (alternative to sessions) - fetching, authenticating, executing, and customizing tools

**Note:** Sessions are recommended for most use cases. This file is for users who need full control over tool selection and execution.

**Key Topics:**

**1. Fetching Tools and Schemas**
- Basic usage: `composio.tools.get(user_id, toolkits=["GITHUB"])`
- Returns top 20 tools by default
- Tool schemas without user_id: `get_raw_composio_tool_by_slug()`
- Generate type-safe code: `composio generate` CLI command
- Filtering options:
  - By toolkit: `toolkits=["GITHUB"]`
  - By name: `tools=["GITHUB_CREATE_ISSUE", ...]`
  - By scopes: `scopes=["write:org"]` (single toolkit only)
  - By search (experimental): `search="create calendar event"`
- Toolkit versioning: Use `toolkit_versions="latest"` or specific version
- Never use `latest` in production

**2. Authenticating Tools**
- Auth Config = blueprint for authentication across all users
- Defines: authentication method, scopes, credentials
- Creating auth config:
  - Dashboard: Auth Configs → Create Auth Config
  - Select toolkit, auth method (OAuth, API Key, Bearer Token, Basic Auth)
  - Configure scopes
  - Use Composio managed auth (dev/test) or own credentials (production)
- When to create multiple auth configs: Different methods, scopes, OAuth apps, permission levels
- Redirecting users: Custom query parameters preserved, Composio appends status and connected_account_id

**Direct SDK Setup:**
- OAuth connections: `composio.connected_accounts.initiate()` → redirect_url → `wait_for_connection()`
- Services with additional parameters (e.g., Zendesk subdomain)
- API Key connections: Collect from user or use your own
- Other methods: Bearer Token, Basic Auth, Custom Schemes
- Fetching auth config parameters: `composio.auth_configs.get(auth_config_id)`

**Connection Statuses:**
- ACTIVE: Working, tools can execute
- INITIATED: OAuth started, not completed (expires in 10 min)
- EXPIRED: Credentials invalid, cannot refresh
- FAILED: Authentication failed
- INACTIVE: Manually disabled

**Why connections expire:**
- User revoked access
- OAuth app deleted/disabled
- Refresh token expired
- Provider-side revocation
- Repeated transient failures

**Waiting for connection:** `wait_for_connection(timeout)` polls until ACTIVE or terminal state
**Checking status:** `composio.connected_accounts.get()` or `list()` with filters

**3. Executing Tools**
- User scoping: All tools require `user_id`
- Three execution methods:
  1. **Chat Completions**: Use with OpenAI, Anthropic, Google AI
     - Get tools: `composio.tools.get(user_id, tools=[...])`
     - LLM generates tool calls
     - Handle: `composio.provider.handle_tool_calls(user_id, response)`
  2. **Agentic Frameworks**: OpenAI Agents, Vercel AI, etc.
     - Frameworks handle execution loop automatically
     - Tools formatted for framework
  3. **Direct Execution**: `composio.tools.execute(slug, user_id, arguments)`
     - No LLM involved
     - Find parameters in dashboard or use `composio generate`

**Proxy Execute:**
- `composio.tools.proxy()` for endpoints not available as predefined tools
- Composio injects authentication
- Endpoint can be relative or absolute URL

**Automatic File Handling:**
- File upload: Pass local paths, URLs, or File objects
- File download: Composio downloads to local directory, provides path
- Disable: `autoUploadDownloadFiles=false` (TypeScript)
- Manual handling: `composio.files.upload()` and `download()`

**4. Schema Modifiers**
- Transform tool schema before agent sees it
- Use cases:
  - Modify tool description
  - Add/hide arguments
  - Add default values
- Decorator: `@schema_modifier(tools=[...])`
- Modify: tool description, input parameters, required fields
- Example: Remove `page` argument, make `size` required

**5. Before Execution Modifiers**
- Called before tool execution
- Modify arguments from LLM before execution
- Use cases:
  - Inject arguments
  - Override LLM arguments
- Decorator: `@before_execute(tools=[...])`
- Two patterns:
  - Chat Completions: Configure on `tools.execute()` or `handle_tool_calls()`
  - Agentic Frameworks: Configure on `tools.get()`

**6. After Execution Modifiers**
- Called after tool execution
- Modify result before returning to agent
- Use cases:
  - Truncate output
  - Convert format
- Decorator: `@after_execute(tools=[...])`
- Two patterns:
  - Chat Completions: Configure on `tools.execute()` or `handle_tool_calls()`
  - Agentic Frameworks: Configure on `tools.get()`

**7. Creating Custom Tools**
- Two types:
  1. **Standalone tools**: No authentication required
     - Define input schema with Pydantic/Zod
     - Implement execute function
     - Decorator: `@composio.tools.custom_tool`
  2. **Toolkit-based tools**: Require authentication
     - Access to `execute_request` (recommended) or `auth_credentials`
     - `execute_request`: Composio handles auth injection and baseURL
     - `connectionConfig`: For direct API calls
     - Decorator: `@composio.tools.custom_tool(toolkit="github")`

**Custom Headers and Query Parameters:**
- Use `parameters` option in `executeToolRequest`
- Add headers: `{name: "X-Custom", value: "val", in: "header"}`
- Add query params: `{name: "page", value: "1", in: "query"}`

**Executing Custom Tools:**
- Same as regular tools: `composio.tools.execute(slug, user_id, arguments)`

**Best Practices:**
- Descriptive names and slugs
- Provide parameter descriptions
- Handle errors gracefully
- Prefer `executeToolRequest` over direct API calls
- Use relative paths with `executeToolRequest`
- Chain operations using `executeToolRequest`

**Limitations:**
- Custom tools stored in memory (not persisted)
- Recreate on app restart
- Toolkit-based tools need valid connected account
- `executeToolRequest` only executes tools from same toolkit
- One connected account per toolkit-based tool

**When to Reference:**
- Need full control over tool selection
- Implementing deterministic workflows
- Building without sessions/meta tools
- Creating custom tools
- Modifying tool behavior (schema, before/after execution)
- Understanding authentication flow details
- Handling file uploads/downloads
- Using proxy execute for custom endpoints

**Code Examples Include:**
- Complete auth config setup and connection flow
- Chat completions with OpenAI, Anthropic, Google
- Agentic framework integration
- Direct tool execution
- Proxy execute
- File handling
- All three modifier types with examples
- Custom tool creation (standalone and toolkit-based)

---

### 07-COMPOSIO-RESOURCES.md
**Purpose:** FAQs, Glossary, Debugging Info, Migration Guides, and Troubleshooting resources

**Key Topics:**

**1. General FAQs**
- White-labeling auth screens
- Tools vs toolkits difference
- Using Composio without AI agents
- Browsing available toolkits
- Default toolkit availability in sessions
- Requesting new tools
- User ID usage and best practices
- Auth config vs MCP config difference
- Authentication types supported
- Toolkit versioning
- API returning fewer tools (version parameter)
- Multiple accounts per user
- Token refresh handling
- Triggers support
- Masked secrets in connected accounts
- Execution logs location
- Redirect after connection
- Using own API key for users
- Security and compliance (SOC 2)
- IP ranges for MCP servers
- Quota increases
- Session creation timing
- Custom auth config configuration
- Debug logging (SDK)
- Self-hosting availability

**2. SDK Instructions for AI Code Generators**
- Correct integration patterns (Native Tools vs MCP)
- Critical instructions (always/never/discouraged patterns)
- Terminology migration table (v1/v2 → v3)
- Provider package naming conventions

**3. Glossary**
- Auth Config, Auth Scheme, Callback URL
- Composio API Key, Composio Managed Auth
- Connect Link, Connected Account, Connection Request
- Custom Tool, In-Chat Authentication, MCP
- Manual Authentication, Meta Tools, Modifiers
- Native Tools, Organization, Organization API Key
- Project, Proxy Execute, Provider
- Session, Session ID, Tool, Tool Slug
- Toolkit, Toolkit Slug, Toolkit Versioning
- Trigger, Trigger Instance, User ID
- White-Labeling, Workbench

**4. Debugging Info**
- Finding project ID, org ID, org member email
- What to share when getting help
- Support channels (Discord, Request Tools, GitHub, Email)

**5. Migration Guides**
- **Direct Tools to Sessions**: Migrating from direct tool execution to sessions pattern
  - What changes: tool discovery, authentication, execution, toolkit versions
  - Pass existing auth configs to session
  - Replace manual tool fetching with session tools
  - Remove manual auth flows (in-chat auth automatic)
  - Remove toolkit version management
  - Restricting toolkits, multiple connected accounts
  - Triggers and white-labeling carry over
  
- **Experimental Tool Router to Stable Sessions**: Migrating from beta tool router
  - Upgrade package
  - Update session creation API
  - Moving users (auth config detection)
  
- **Toolkit Versioning Migration**: Breaking change requiring explicit versions
  - Three migration strategies: SDK level, per execution, environment variables
  - Migration checklist
  - Temporary workaround (dangerouslySkipVersionCheck)
  
- **Legacy SDK (v1) to Current SDK (v3)**: Major SDK upgrade
  - What's new: faster execution, simpler SDK, better naming, TypeScript parity
  - State of new SDK (preview release)
  - Nomenclature changes (Actions→Tools, Apps→Toolkits, etc.)
  - Switch to nano IDs from UUIDs
  - Replacing ToolSets with Providers
  - Fetching tools and schemas
  - Executing tools (Chat Completions, Agentic Frameworks, Direct Execution)
  - Tool Modifiers (formerly Tool Processors): schema, before, after
  - Custom tools (execute_request pattern)
  - Auth configs (formerly integrations)
  - Connected accounts / User IDs
  - Triggers (creating, enabling/disabling, listening)
  - Coming soon: Local tools
  - API endpoint migration table

**6. Troubleshooting**
- **API Issues**: Reporting with cURL, request ID, error details, reproduction steps
- **Authentication Issues**: 
  - Using Composio's default OAuth app (scope limitations)
  - Using custom OAuth apps (redirect URL, scopes, credentials)
  - Common issues: invalid redirect URI, scope mismatch, expired tokens, rate limits, masked credentials
  - Reporting: error message, auth config/account IDs, OAuth provider
- **CLI Issues**: 
  - Command not found, authentication errors
  - Type generation issues (project type detection, output directory)
  - Debug CLI with log-level flag
  - Common issues: API key, project type, network, permissions
- **Dashboard Issues**: Reporting with screenshots, error details, network logs
- **MCP Issues**:
  - Connected account not found error (specify account, default behavior, verification)
  - 404 errors (URL format verification)
  - Testing with Postman/MCP Inspector
  - Reporting: error message, MCP server URL, testing results, connected account ID

**When to Reference:**
- Answering common questions about Composio features
- Understanding terminology and concepts
- Migrating from older SDK versions or patterns
- Troubleshooting authentication, API, CLI, dashboard, or MCP issues
- Finding support channels and debugging information
- Understanding correct SDK integration patterns for AI code generation
- Looking up definitions of Composio-specific terms

**Code Examples Include:**
- Migration patterns for all four migration paths
- Troubleshooting examples for each category
- Correct vs incorrect SDK usage patterns
- Debug logging configuration

---

### 08-COMPOSIO-TOOLKITS.md
**Purpose:** Comprehensive list of all 980 available toolkits in Composio

**Key Topics:**
- Complete toolkit catalog with 980 toolkits
- Each toolkit entry includes:
  - Toolkit name and link to detailed documentation
  - Toolkit slug (e.g., `GITHUB`, `GMAIL`, `SLACK`)
  - Number of tools available
  - Number of triggers available
  - Authentication methods supported (OAUTH2, API_KEY, BASIC, etc.)

**Toolkit Categories (Examples):**
- Communication: Slack, Discord, Microsoft Teams, Telegram, WhatsApp
- Project Management: Jira, Asana, Monday, Trello, ClickUp, Linear
- CRM: Salesforce, HubSpot, Pipedrive, Zoho, Dynamics 365
- Development: GitHub, GitLab, Bitbucket, Vercel, Docker Hub
- Productivity: Google Suite (Calendar, Docs, Drive, Sheets, Gmail), Microsoft Office
- Marketing: Mailchimp, SendGrid, Brevo, ActiveCampaign
- E-commerce: Shopify, WooCommerce, Stripe, Square
- Cloud Storage: Dropbox, Box, OneDrive, Google Drive
- Analytics: Google Analytics, Mixpanel, Amplitude
- AI/ML: OpenAI, Hugging Face, Replicate, Anthropic
- And 900+ more toolkits across various categories

**When to Reference:**
- Browsing available toolkits
- Finding toolkit slugs for configuration
- Checking authentication methods for a toolkit
- Discovering tools and triggers count
- Exploring toolkit categories

**Note:** This file is a reference catalog. For detailed toolkit documentation, implementation guides, and tool-specific information, refer to individual toolkit pages.

---

### 09-API-REFERENCE-COMPOSIO-OVERVIEW.md
**Purpose:** API Reference overview, authentication, rate limits, and error handling

**Key Topics:**

**1. API Overview**
- Base URL: `https://backend.composio.dev/api/v3`
- Authentication methods: `x-api-key` (project), `x-org-api-key` (organization)
- Rate limits: 20K-100K requests per 10 minutes (plan-dependent)

**2. REST API Categories**
- Tool Router: Session-based API for AI agents
- Tools: List, search, and execute individual actions
- Connected Accounts: Manage user OAuth connections
- Auth Configs: Configure authentication to toolkits
- Triggers: Subscribe to webhooks from connected apps
- Toolkits: Browse available apps and their tools

**3. Authentication**
- Getting API keys from dashboard (Project Settings → API Keys)
- Getting Organization API keys (Organization Settings → General Settings)
- Using API keys in headers (`x-api-key`, `x-org-api-key`)
- Project-level vs organization-level access

**4. Rate Limits**
- Rate limits by plan: Starter/Hobby (20K), Growth (100K), Enterprise (Unlimited)
- Rolling 10-minute window per organization
- Rate limit headers: `X-RateLimit`, `X-RateLimit-Remaining`, `X-RateLimit-Window-Size`, `Retry-After`
- 429 Too Many Requests response
- Best practices: Monitor usage, implement backoff, cache responses

**5. Error Handling**
- Error object structure: message, status, request_id, suggested_fix
- HTTP status codes: 2xx (success), 4xx (client errors), 5xx (server errors)
- Error types:
  - Authentication errors (invalid API key, no auth, insufficient permissions)
  - Tool errors (tool not found, no connected account, execution failed)
  - Connection errors (account not found, auth refresh required, deleted)
  - Trigger errors (trigger not found, instance deleted)
- Rate limiting (429 status code)
- Getting help (include request_id when contacting support)

**When to Reference:**
- Understanding API structure and base URLs
- Setting up authentication for API calls
- Handling rate limits and implementing backoff strategies
- Debugging API errors and understanding error codes
- Finding support channels for API issues

**Code Examples Include:**
- cURL examples with authentication headers
- Rate limit response handling
- Error response structures

---

### 10-API-REFERENCE-COMPOSIO-AUTH-CONFIGS.md
**Purpose:** API Reference for Auth Configs endpoints - creating, listing, updating, and managing authentication configurations

**Key Topics:**

**1. Auth Configs Endpoints**
- `POST /api/v3/auth_configs` - Create new authentication configuration
- `GET /api/v3/auth_configs` - List authentication configurations with filters
- `GET /api/v3/auth_configs/{nanoid}` - Get single auth config by ID
- `PATCH /api/v3/auth_configs/{nanoid}` - Update an auth configuration
- `DELETE /api/v3/auth_configs/{nanoid}` - Delete an auth configuration (soft delete)
- `PATCH /api/v3/auth_configs/{nanoid}/{status}` - Enable or disable auth config

**2. Create Auth Config (POST)**
- Purpose: Create auth config for custom OAuth apps or API keys
- Request body: toolkit slug, auth_config (type, credentials, restrict_to_following_tools)
- Response: toolkit info, auth_config (id, auth_scheme, is_composio_managed, restrict_to_following_tools)
- Use cases: Custom OAuth apps, custom scopes, non-managed toolkits

**3. List Auth Configs (GET)**
- Query parameters: is_composio_managed, toolkit_slug, show_disabled, search, limit, cursor
- Response: Paginated list with items array, next_cursor, total_pages, current_page, total_items
- Each item includes: id, uuid, type, toolkit, name, auth_scheme, credentials, status, created_at, no_of_connections, tool_access_config
- Filters: By toolkit, by managed status, search by name/id

**4. Get Single Auth Config (GET)**
- Path parameter: nanoid (auth config ID)
- Response: Complete auth config details including credentials, proxy_config, expected_input_fields, shared_credentials
- Use case: Retrieving specific auth config details

**5. Update Auth Config (PATCH)**
- Path parameter: nanoid (auth config ID)
- Request body: name, credentials (scopes, user_scopes), proxy_config, tool_access_config, shared_credentials, is_enabled_for_tool_router
- Two types: custom (full credentials) or default (scopes only)
- Use case: Updating OAuth scopes, credentials, or tool restrictions

**6. Delete Auth Config (DELETE)**
- Path parameter: nanoid (auth config ID)
- Soft-delete operation (cannot be undone)
- Response: 200 on success, 404 if not found

**7. Enable/Disable Auth Config (PATCH)**
- Path parameters: nanoid (auth config ID), status (ENABLED/DISABLED)
- Use case: Temporarily disabling auth configs without deletion
- Disabled configs cannot be used for new connections

**8. Common Response Schemas**
- Success responses (200, 201)
- Error responses (400 Bad Request, 401 Unauthorized, 404 Not Found, 500 Internal Server Error)
- Error object structure: message, code, slug, status, request_id, suggested_fix, errors array

**When to Reference:**
- Creating custom auth configurations programmatically
- Listing and filtering auth configs for a project
- Updating OAuth scopes or credentials
- Managing auth config lifecycle (enable/disable/delete)
- Understanding auth config API request/response schemas
- Troubleshooting auth config API calls

**Code Examples Include:**
- cURL examples for all endpoints
- Request body examples (JSON)
- Response examples with full schemas
- Authentication header usage

---

### 11-API-REFERENCE-COMPOSIO-AUTHENTICATION.md
**Purpose:** API Reference for Authentication endpoints - session information retrieval

**Key Topics:**

**1. Authentication Endpoints**
- `GET /api/v3/auth/session/info` - Get current user session information

**2. Get Session Info (GET)**
- Purpose: Retrieve detailed information about authenticated user session
- Authentication: `x-api-key` or `x-user-api-key` header
- Response includes:
  - `project` (object, null): Current active project details (null if org-level credentials)
  - `api_key` (object, null): API key details used for authentication (null if session auth)
  - `org_member` (object): Authenticated user information
    - `id` (string): UUID identifier for organization member
    - `email` (string): Email address
    - `name` (string): Display name
    - `role` (string): Access role within organization
- Use cases:
  - Verifying authentication status
  - Retrieving contextual information about authenticated user
  - Checking access privileges
  - Debugging authentication issues

**3. Response Codes**
- 200: Session valid and active (returns user, project, org details)
- 400: Bad request (invalid format or missing parameters)
- 401: Unauthorized (invalid or expired credentials)
- 403: Forbidden (insufficient permissions)
- 404: Not found (project, organization, or member not found)
- 500: Internal server error

**When to Reference:**
- Verifying API authentication status
- Retrieving current user session details
- Checking project and organization membership
- Debugging authentication issues
- Understanding session info API request/response schemas

**Code Examples Include:**
- cURL example with authentication header
- Response example with full schema
- Error response structures

---

### 12-API-REFERENCE-COMPOSIO-CONNECTED-ACCOUNTS.md
**Purpose:** API Reference for Connected Accounts endpoints - managing user connections to external services

**Key Topics:**

**1. Connected Accounts Endpoints**
- `GET /api/v3/connected_accounts` - List connected accounts with filters
- `POST /api/v3/connected_accounts` - Create a new connected account
- `GET /api/v3/connected_accounts/{nanoid}` - Get connected account details by ID
- `DELETE /api/v3/connected_accounts/{nanoid}` - Delete a connected account (soft delete)
- `PATCH /api/v3/connected_accounts/{nanoId}/status` - Enable or disable account
- `POST /api/v3/connected_accounts/{nanoid}/refresh` - Refresh authentication
- `POST /api/v3/connected_accounts/link` - Create new auth link session

**2. List Connected Accounts (GET)**
- Query parameters: toolkit_slugs, statuses, cursor, limit, user_ids, auth_config_ids, connected_account_ids, order_by, order_direction
- Response: Paginated list with items array, next_cursor, total_pages, current_page, total_items
- Each item includes: toolkit, auth_config, id, user_id, status, created_at, updated_at, state, data, status_reason, is_disabled
- Connection statuses: INITIALIZING, INITIATED, ACTIVE, EXPIRED, FAILED, INACTIVE
- Filters: By toolkit, status, user ID, auth config

**3. Create Connected Account (POST)**
- Request body: auth_config (id), connection (state, data, user_id, callback_url), validate_credentials
- For OAuth: Returns redirect_url to complete authentication
- For API Key: Provide credentials directly in request
- Response: id, connectionData, status, redirect_url, deprecated fields
- Use case: Initiating new connection to external service

**4. Get Connected Account Details (GET)**
- Path parameter: nanoid (connected account ID)
- Response: Complete account details including toolkit, auth_config, status, state, params
- Includes authentication parameters needed for API requests
- Use case: Retrieving comprehensive connection information

**5. Delete Connected Account (DELETE)**
- Path parameter: nanoid (connected account ID)
- Soft-delete operation (marks as deleted, preserves for audit)
- Response: success boolean
- Use case: Removing user connections

**6. Enable/Disable Connected Account (PATCH)**
- Path parameter: nanoId (connected account ID)
- Request body: enabled (boolean)
- Sets status to ACTIVE (enabled=true) or INACTIVE (enabled=false)
- Response: success boolean
- Use case: Temporarily disabling connections without deletion

**7. Refresh Authentication (POST)**
- Path parameter: nanoid (connected account ID)
- Query/Body parameters: redirect_url, validate_credentials
- Initiates new auth flow when credentials expired/invalid
- Response: id, status, redirect_url (for OAuth flows)
- Use case: Re-authenticating expired connections

**8. Create Auth Link Session (POST)**
- Request body: auth_config_id, user_id, callback_url, connection_data (optional pre-fill)
- Response: link_token, redirect_url, expires_at, connected_account_id
- Use case: Creating authentication links for users

**9. Connection State Object**
- authScheme: OAUTH1, OAUTH2, API_KEY, BEARER_TOKEN, BASIC, etc.
- val: Contains auth-specific fields (subdomain, region, tokens, credentials, etc.)
- status: Connection status
- Various toolkit-specific configuration fields

**10. Common Response Schemas**
- Success responses (200, 201)
- Error responses (400, 401, 403, 404, 422, 500, 501)
- Error object structure: message, code, slug, status, request_id, suggested_fix, errors array

**When to Reference:**
- Managing connected accounts programmatically
- Listing and filtering user connections
- Creating new connections via API
- Refreshing expired authentication
- Understanding connection statuses and state management
- Troubleshooting connected account API calls
- Implementing auth link generation

**Code Examples Include:**
- cURL examples for all endpoints
- Request body examples with full schemas
- Response examples with connection state
- Authentication header usage

---

## Status

✅ Analyzed: 01-COMPOSIO-GET-STARTED.md, 02-COMPOSIO-CORE-CONCEPTS.md, 03-COMPOSIO-GETTING-STARTED.md, 04-COMPOSIO-GUIDES.md, 05-COMPOSIO-FEATURES.md, 06-COMPOSIO-DIRECT-TOOL-EXECUTION-GUIDES.md, 07-COMPOSIO-RESOURCES.md, 08-COMPOSIO-TOOLKITS.md, 09-API-REFERENCE-COMPOSIO-OVERVIEW.md, 10-API-REFERENCE-COMPOSIO-AUTH-CONFIGS.md, 11-API-REFERENCE-COMPOSIO-AUTHENTICATION.md, 12-API-REFERENCE-COMPOSIO-CONNECTED-ACCOUNTS.md
⏳ Pending: Files 13-24

This guide will be updated as more documentation files are analyzed.


## File 13: API Reference - Files
**File Reference:** `#[[file:COMPOSIO DOCS/13-API-REFERENCE-COMPOSIO-FILES.md]]`

**Query Types:**
- File management operations
- Uploading files to S3 with presigned URLs
- Listing files with filters by toolkit and tool
- File deduplication using MD5 hashing
- File metadata and storage backend information

**Key Endpoints:**
- `GET /api/v3/files/list` - List files with optional app and action filters
- `POST /api/v3/files/upload/request` - Create presigned URL for file upload to S3

**Use Cases:**
- When you need to upload files for tool execution (e.g., attachments for email, documents for processing)
- When you need to list previously uploaded files
- When working with file-based tools that require file inputs
- When implementing file deduplication to avoid redundant uploads

---

## File 14: API Reference - MCP (Model Control Protocol)
**File Reference:** `#[[file:COMPOSIO DOCS/14-API-REFERENCE-COMPOSIO-MCP.md]]`

**Query Types:**
- MCP server creation and management
- MCP server configuration and updates
- MCP server instance management
- Custom MCP servers with multiple apps
- MCP URL generation with custom parameters
- Integration with AI assistants (Claude Desktop, Cursor, Windsurf, OpenAI Agents)

**Key Endpoints:**
- `GET /api/v3/mcp/servers` - List MCP servers with filters and pagination
- `POST /api/v3/mcp/servers` - Create a new MCP server
- `POST /api/v3/mcp/servers/custom` - Create custom MCP server with multiple apps
- `POST /api/v3/mcp/servers/generate` - Generate MCP URL with custom parameters
- `GET /api/v3/mcp/{id}` - Get MCP server details by ID
- `PATCH /api/v3/mcp/{id}` - Update MCP server configuration
- `DELETE /api/v3/mcp/{id}` - Delete an MCP server
- `GET /api/v3/mcp/app/{appKey}` - List MCP servers for a specific app
- `GET /api/v3/mcp/servers/{serverId}/instances` - List all instances for an MCP server
- `POST /api/v3/mcp/servers/{serverId}/instances` - Create a new MCP server instance
- `DELETE /api/v3/mcp/servers/{serverId}/instances/{instanceId}` - Delete MCP server instance

**Use Cases:**
- When setting up MCP integration for AI assistants
- When you need to create connection points for AI agents to access applications
- When managing multiple MCP server instances for different users
- When configuring toolkits and allowed tools for MCP servers
- When generating MCP URLs for specific users or connected accounts
- When working with managed authentication via Composio
- When integrating with Claude Desktop, Cursor, Windsurf, or OpenAI Agents

**Important Notes:**
- MCP servers provide connection points for AI assistants to access applications
- Use `session.mcp.url` and `session.mcp.headers` for MCP integration
- No provider package needed for MCP integration
- MCP servers can be configured with specific auth configs and allowed tools
- Supports both managed and unmanaged authentication modes

---

## File 15: API Reference - Migration
**File Reference:** `#[[file:COMPOSIO DOCS/15-API-REFERENCE-COMPOSIO-MIGRATION.md]]`

**Query Types:**
- Converting legacy UUIDs to NanoIds
- Migration from v1/v2 to v3 API
- Identifier format conversion

**Key Endpoints:**
- `GET /api/v3/migration/get-nanoid` - Convert UUID to NanoId

**Use Cases:**
- When migrating from Composio v1 or v2 to v3
- When you have legacy UUID identifiers that need to be converted to NanoId format
- When updating existing integrations to use the new v3 identifier format
- When working with connected accounts, auth configs, or trigger instances from older versions

**Supported Resource Types:**
- CONNECTED_ACCOUNT
- AUTH_CONFIG
- TRIGGER_INSTANCE

**Important Notes:**
- This endpoint facilitates the transition from UUID-based identifiers to NanoId format
- Required for maintaining compatibility when upgrading from older API versions
- The NanoId format is more compact than UUID


## File 16: API Reference - Projects
**File Reference:** `#[[file:COMPOSIO DOCS/16-API-REFERENCE-COMPOSIO-PROJECTS.md]]`

**Query Types:**
- Project creation and management via API
- Multi-tenancy and environment isolation
- Project configuration (2FA, branding, security settings)
- API key management and regeneration
- Organization-level project operations

**Key Endpoints:**
- `POST /api/v3/org/owner/project/new` - Create a new project
- `GET /api/v3/org/owner/project/list` - List all projects with pagination
- `GET /api/v3/org/owner/project/{nano_id}` - Get project details by ID
- `DELETE /api/v3/org/owner/project/{nano_id}` - Delete a project (soft delete)
- `POST /api/v3/org/owner/project/{nano_id}/regenerate_api_key` - Regenerate project API key
- `GET /api/v3/org/project/config` - Get project configuration
- `PATCH /api/v3/org/project/config` - Update project configuration

**Use Cases:**
- When setting up multi-tenant architecture programmatically
- When creating isolated environments (production, staging, development)
- When managing per-client projects and resources
- When configuring project-level settings (2FA, logo, display name)
- When regenerating compromised API keys
- When managing log visibility and secret masking settings
- When configuring MCP API key requirements
- When setting up white-labeled authentication screens

**Project Configuration Options:**
- `is_2FA_enabled` - Enable two-factor authentication
- `logo_url` - Custom logo for authentication screens
- `display_name` - Custom display name for branding
- `mask_secret_keys_in_connected_account` - Hide sensitive credentials
- `log_visibility_setting` - Control execution log storage (show_all, dont_store_data)
- `require_mcp_api_key` - Require API key for MCP server access
- `signed_url_file_expiry_in_seconds` - File URL expiration time

**Important Notes:**
- Projects are isolated environments within an organization
- Each project has its own API keys, connected accounts, auth configs, and webhooks
- Resources in one project are not accessible from another
- Use organization API key (`x-org-api-key`) for project management endpoints
- Use project API key (`x-api-key`) for project configuration endpoints
- Soft-delete operation preserves data for audit purposes

---

## File 17: API Reference - Tool Router (Labs)
**File Reference:** `#[[file:COMPOSIO DOCS/17-API-REFERENCE-COMPOSIO-TOOL-ROUTER.md]]`

**Query Types:**
- Tool Router session creation and management
- Tool execution within sessions
- Meta tool execution (COMPOSIO_* tools)
- Tool search with use case queries
- Workbench file management (mount operations)
- Toolkit connection management
- Authentication link generation

**Key Endpoints:**
- `POST /api/v3/tool_router/session` - Create a new tool router session
- `GET /api/v3/tool_router/session/{session_id}` - Get session details
- `POST /api/v3/tool_router/session/{session_id}/execute` - Execute a tool
- `POST /api/v3/tool_router/session/{session_id}/execute_meta` - Execute a meta tool
- `POST /api/v3/tool_router/session/{session_id}/search` - Search for tools
- `GET /api/v3/tool_router/session/{session_id}/toolkits` - Get available toolkits
- `GET /api/v3/tool_router/session/{session_id}/tools` - List meta tools with schemas
- `POST /api/v3/tool_router/session/{session_id}/link` - Create auth link for toolkit
- `GET /api/v3/tool_router/session/{session_id}/mounts/{mount_id}/items` - List mount files
- `POST /api/v3/tool_router/session/{session_id}/mounts/{mount_id}/upload_url` - Create upload URL
- `POST /api/v3/tool_router/session/{session_id}/mounts/{mount_id}/download_url` - Create download URL
- `POST /api/v3/tool_router/session/{session_id}/mounts/{mount_id}/delete` - Delete mount file

**Use Cases:**
- When building AI agents with dynamic tool discovery
- When implementing session-based tool execution
- When searching for tools based on use case descriptions
- When managing workbench files and storage mounts
- When executing tools with automatic authentication
- When creating authentication links for users
- When filtering tools by tags (readOnlyHint, destructiveHint, etc.)
- When configuring connection management and callbacks
- When working with experimental features (assistive prompts, timezone config)

**Session Configuration Options:**
- `user_id` - User identifier for session isolation
- `toolkits` - Enable/disable specific toolkits (allowlist/denylist)
- `auth_configs` - Override default auth configs per toolkit
- `connected_accounts` - Specify connected accounts per toolkit
- `manage_connections` - Configure automatic connection handling
- `tools` - Enable/disable specific tools within toolkits
- `tags` - Filter tools by MCP annotation hints (global and per-toolkit)
- `workbench` - Configure proxy execution and auto-offload threshold
- `experimental` - Experimental features (assistive prompts, timezone)

**Tool Search Features:**
- Parallel search queries (up to 7 queries)
- Use case-based tool discovery
- Known field hints for better results
- Execution guidance and difficulty assessment
- Recommended plan steps and known pitfalls
- Reference workbench code snippets
- Toolkit connection status checking
- Tool schema retrieval
- Memory and session management

**Workbench Mount Operations:**
- List files with pagination and filtering
- Generate presigned upload URLs for file storage
- Generate presigned download URLs for file retrieval
- Delete files from mounts
- Support for subdirectories and MIME types
- Expiration timestamps for URLs

**Important Notes:**
- Tool Router is a Labs feature (experimental, may change)
- Sessions provide isolated environments for tool execution
- MCP server URL available via `session.mcp.url`
- Supports both managed and manual connection flows
- Workbench provides persistent storage across tool executions
- Tool execution returns data, error, and log_id
- Search results include cached plans when available
- Assistive prompts can be customized with timezone information

---

## File 18: API Reference - Toolkits
**File Reference:** `#[[file:COMPOSIO DOCS/18-API-REFERENCE-COMPOSIO-TOOLKITS.md]]`

**Query Types:**
- Listing available toolkits with filtering and pagination
- Getting detailed toolkit information by slug
- Browsing toolkit categories
- Fetching multiple toolkits in bulk
- Viewing toolkit version changelogs
- Understanding toolkit authentication schemes and configuration

**Key Endpoints:**
- `GET /api/v3/toolkits` - List available toolkits with filters (category, managed_by, sort_by, search)
- `GET /api/v3/toolkits/{slug}` - Get comprehensive toolkit details by slug
- `GET /api/v3/toolkits/categories` - List all toolkit categories
- `POST /api/v3/toolkits/multi` - Fetch multiple toolkits by slugs
- `GET /api/v3/toolkits/changelog` - Get last 10 versions changelog for all toolkits

**Use Cases:**
- When browsing available toolkits programmatically
- When filtering toolkits by category (Communication, CRM, Development, etc.)
- When checking toolkit authentication methods and schemes
- When retrieving toolkit metadata (logo, description, tools count, triggers count)
- When understanding toolkit versioning and available versions
- When checking if a toolkit is Composio-managed or project-managed
- When viewing toolkit changelog history
- When fetching specific toolkits by their slugs in bulk
- When building toolkit selection UI or discovery features

**Toolkit Response Details:**
- `slug` - URL-friendly unique identifier (e.g., "github", "gmail")
- `name` - Human-readable name
- `auth_schemes` - Supported authentication methods (OAUTH2, API_KEY, etc.)
- `composio_managed_auth_schemes` - Auth methods managed by Composio
- `no_auth` - Whether toolkit can be used without authentication
- `meta` - Metadata including description, logo, categories, tools_count, triggers_count, version
- `auth_config_details` - Complete authentication configuration for each auth method
- `base_url` - Base URL for API requests (may require connection info)
- `get_current_user_endpoint` - Endpoint to retrieve current user information

**Filtering Options:**
- By category (e.g., "communication", "crm", "development")
- By management type (composio, all, project)
- By search query (name, slug, description)
- Sort by usage or alphabetically
- Include/exclude deprecated toolkits
- Pagination with cursor and limit

**Important Notes:**
- Toolkits represent integration points with external services
- Each toolkit contains a collection of tools and triggers
- Default returns latest versions unless specific version requested
- `is_local_toolkit` field is deprecated and always returns false
- Categories help organize toolkits by functionality or industry

---

## File 19: API Reference - Tools
**File Reference:** `#[[file:COMPOSIO DOCS/19-API-REFERENCE-COMPOSIO-TOOLS.md]]`

**Query Types:**
- Listing and filtering available tools
- Getting detailed tool information by slug
- Executing tools with structured arguments or natural language
- Generating tool inputs from natural language descriptions
- Executing proxy requests to third-party APIs
- Understanding tool schemas (input/output parameters)
- Tool versioning and deprecation management

**Key Endpoints:**
- `GET /api/v3/tools` - List available tools with comprehensive filtering
- `GET /api/v3/tools/enum` - Get list of all tool slugs (enums)
- `GET /api/v3/tools/{tool_slug}` - Get detailed tool information by slug
- `POST /api/v3/tools/execute/{tool_slug}` - Execute a tool with arguments or natural language
- `POST /api/v3/tools/execute/{tool_slug}/input` - Generate structured inputs from natural language
- `POST /api/v3/tools/execute/proxy` - Execute authenticated proxy request to third-party API

**Use Cases:**
- When listing tools for a specific toolkit
- When searching for tools by name, description, or functionality
- When filtering tools by tags (readOnlyHint, destructiveHint, idempotentHint, openWorldHint)
- When executing tools programmatically with structured arguments
- When allowing users to describe tasks in natural language
- When making direct API calls to connected services
- When checking tool input/output schemas
- When managing tool versions and handling deprecated tools
- When filtering by scopes or auth configs
- When building tool execution workflows

**Tool Execution Methods:**
1. **Structured Arguments**: Provide key-value pairs matching tool's input schema
2. **Natural Language**: Provide text description, AI generates structured arguments
3. **Proxy Execution**: Make direct HTTP requests to third-party APIs with authentication

**Tool Response Details:**
- `slug` - Unique identifier (e.g., "GITHUB_CREATE_ISSUE")
- `name` - Human-readable display name
- `description` - Detailed functionality explanation
- `toolkit` - Parent toolkit information (slug, name, logo)
- `input_parameters` - JSON schema of required inputs
- `output_parameters` - JSON schema of return values
- `scopes` - Required OAuth scopes
- `tags` - Categorization tags for filtering
- `version` - Current version
- `available_versions` - List of all available versions
- `is_deprecated` - Deprecation status
- `no_auth` - Whether authentication is required

**Filtering Options:**
- By toolkit slug
- By specific tool slugs (comma-separated)
- By auth config IDs
- By importance/featured status
- By tags (multiple tags supported)
- By scopes (array of scopes)
- By search query (name, slug, description)
- By toolkit versions (latest or specific versions)
- Include/exclude deprecated tools
- Pagination with cursor and limit

**Tool Execution Parameters:**
- `connected_account_id` - Account to use for authentication
- `user_id` - User identifier (replaces deprecated entity_id)
- `version` - Tool version to execute
- `arguments` - Structured input parameters (mutually exclusive with text)
- `text` - Natural language description (mutually exclusive with arguments)
- `custom_auth_params` - Custom authentication parameters (base_url, headers, query params)
- `custom_connection_data` - Custom connection data for various auth schemes

**Natural Language Input Generation:**
- Translates plain language to structured arguments
- Supports custom tool descriptions for better accuracy
- Supports custom system prompts for LLM guidance
- Returns generated arguments or error message

**Proxy Execution Features:**
- Make authenticated HTTP requests to any API endpoint
- Supports all HTTP methods (GET, POST, PUT, PATCH, DELETE, etc.)
- Automatic authentication injection using connected account
- Support for custom headers and query parameters
- Support for JSON and binary request/response bodies
- Binary upload via URL or base64
- Returns response data, status, headers, and binary data (if applicable)

**Error Handling:**
- 400: Bad request (invalid parameters)
- 401: Unauthorized (invalid credentials)
- 403: Forbidden (insufficient permissions)
- 404: Not found (tool or account not found)
- 410: Gone (tool deprecated)
- 413: Payload too large
- 422: Unprocessable entity (invalid account state)
- 429: Rate limit exceeded
- 500: Internal server error
- 501: Not implemented
- 502: Bad gateway (upstream API error)
- 503: Service unavailable (upstream API down)
- 504: Gateway timeout

**Important Notes:**
- Tools are individual actions within toolkits
- Tool naming pattern: `{TOOLKIT}_{ACTION}` (e.g., GITHUB_CREATE_ISSUE)
- Tools execute with user's authenticated credentials
- Natural language execution uses AI to generate structured arguments
- Proxy execution allows calling any API endpoint not available as predefined tool
- Tool versions should be specified explicitly in production (avoid "latest")
- Execution returns data, error, successful flag, session_info, and log_id

---

## File 20: API Reference - Triggers
**File Reference:** `#[[file:COMPOSIO DOCS/20-API-REFERENCE-COMPOSIO-TRIGGERS.md]]`

**Query Types:**
- Creating and managing trigger instances (event listeners)
- Listing active triggers with filtering
- Getting trigger type information and schemas
- Enabling/disabling triggers temporarily
- Deleting triggers permanently
- Understanding webhook vs polling triggers
- Trigger configuration and payload schemas

**Key Endpoints:**
- `POST /api/v3/trigger_instances/{slug}/upsert` - Create or update a trigger instance
- `GET /api/v3/trigger_instances/active` - List active triggers with filters
- `DELETE /api/v3/trigger_instances/manage/{triggerId}` - Delete a trigger permanently
- `PATCH /api/v3/trigger_instances/manage/{triggerId}` - Enable or disable a trigger
- `GET /api/v3/triggers_types` - List available trigger types with filtering
- `GET /api/v3/triggers_types/{slug}` - Get detailed trigger type information
- `GET /api/v3/triggers_types/list/enum` - Get list of all trigger type slugs

**Use Cases:**
- When setting up event-driven workflows (webhooks or polling)
- When listening for events from external services (GitHub commits, Slack messages, emails)
- When managing trigger lifecycle (create, enable, disable, delete)
- When filtering triggers by user, connected account, or auth config
- When discovering available trigger types for a toolkit
- When understanding trigger configuration requirements
- When inspecting trigger payload schemas
- When implementing event-based automation

**Trigger Types:**
- **Webhook triggers**: Real-time event-based (e.g., GitHub push, Slack message)
- **Poll triggers**: Scheduled checks (runs every minute)

**Trigger Instance Details:**
- `id` - Nano ID of the trigger instance
- `uuid` - UUID identifier (deprecated, use id)
- `trigger_name` - Name/slug of the trigger type (e.g., GITHUB_COMMIT_EVENT)
- `connected_account_id` - Associated connected account
- `user_id` - User this trigger belongs to
- `trigger_config` - Configuration parameters for the trigger
- `trigger_data` - Additional data associated with the trigger
- `state` - Current state of the trigger
- `updated_at` - Last update timestamp
- `disabled_at` - When trigger was disabled (null if active)

**Trigger Type Details:**
- `slug` - Unique identifier (e.g., GITHUB_COMMIT_EVENT)
- `name` - Human-readable name
- `description` - What the trigger does
- `instructions` - Setup instructions
- `type` - "webhook" or "poll"
- `toolkit` - Parent toolkit information
- `config` - Configuration schema (required parameters)
- `payload` - Event payload schema (data structure delivered)
- `version` - Trigger type version

**Filtering Options (List Active Triggers):**
- By user IDs (array)
- By connected account IDs (array)
- By auth config IDs (array)
- By trigger IDs (array)
- By trigger names (array, case-insensitive)
- Show disabled triggers (boolean)
- Pagination with cursor and limit

**Filtering Options (List Trigger Types):**
- By toolkit slugs (array)
- By toolkit versions (latest or specific versions)
- Pagination with cursor and limit

**Trigger Operations:**
- **Upsert**: Creates new trigger or updates existing one with same config
  - If matching trigger exists and is disabled, it will be re-enabled
  - Requires connected_account_id
  - Supports toolkit version specification
- **Enable/Disable**: Temporarily pause/resume trigger without deletion
  - Use PATCH with status "enable" or "disable"
  - Preserves trigger configuration
- **Delete**: Permanently removes trigger (cannot be undone)
  - Use DELETE endpoint
  - Stops event listening immediately

**Important Notes:**
- Triggers are scoped to connected accounts (user-specific)
- Trigger names are case-insensitive (normalized to uppercase internally)
- Upsert operation is idempotent (safe to call multiple times)
- Disabled triggers don't listen for events but retain configuration
- Trigger types define templates; trigger instances are active listeners
- Webhook triggers provide real-time events; poll triggers check every minute
- Each trigger instance requires a connected account for authentication

---

## File 21: API Reference - Webhooks
**File Reference:** `#[[file:COMPOSIO DOCS/21-API-REFERENCE-COMPOSIO-WEBHOOKS.md]]`

**Query Types:**
- Creating and managing webhook subscriptions
- Configuring webhook URLs and event types
- Rotating webhook signing secrets
- Listing available event types
- Understanding webhook payload versions (V1, V2, V3)
- Webhook subscription lifecycle management

**Key Endpoints:**
- `POST /api/v3/webhook_subscriptions` - Create webhook subscription
- `GET /api/v3/webhook_subscriptions` - List webhook subscriptions
- `GET /api/v3/webhook_subscriptions/{id}` - Get webhook subscription details
- `PATCH /api/v3/webhook_subscriptions/{id}` - Update webhook subscription
- `DELETE /api/v3/webhook_subscriptions/{id}` - Delete webhook subscription
- `POST /api/v3/webhook_subscriptions/{id}/rotate_secret` - Rotate signing secret
- `GET /api/v3/webhook_subscriptions/event_types` - List available event types

**Use Cases:**
- When receiving trigger events via webhooks
- When configuring webhook endpoints for event delivery
- When subscribing to specific event types (trigger events, connection expiry)
- When rotating compromised webhook secrets
- When verifying webhook signatures for security
- When updating webhook URLs or event subscriptions
- When discovering available event types and their supported versions
- When implementing webhook handlers for Composio events

**Webhook Subscription Details:**
- `id` - Unique subscription ID
- `webhook_url` - HTTPS URL to receive events (must be HTTPS)
- `version` - Webhook payload version (V1, V2, or V3)
- `enabled_events` - Array of subscribed event types
- `secret` - Signing secret for HMAC verification (full secret only on create/rotate)
- `created_at` - Creation timestamp
- `updated_at` - Last update timestamp

**Webhook Payload Versions:**
- **V3** (recommended): Metadata separated from event data, cleaner structure
- **V2** (legacy): Metadata mixed into data object
- **V1** (legacy): Different structure, older format

**Event Types:**
- `composio.trigger.message` - Trigger event fired (main event type)
- `composio.connected_account.expired` - Connection expired (V3 only)
- Each event type has supported_versions array
- Event types include description and identifier

**Webhook Operations:**
- **Create**: Establishes webhook subscription
  - Only one subscription allowed per project
  - Returns full signing secret (only time it's visible)
  - Requires HTTPS webhook URL
  - Must specify enabled_events array
  - Optional version parameter (defaults to V3)
- **Update**: Modify webhook configuration
  - Can update webhook_url, enabled_events, or version
  - At least one field must be provided
  - Secret remains unchanged (use rotate endpoint)
- **Delete**: Permanently removes subscription (cannot be undone)
- **Rotate Secret**: Generates new signing secret
  - Returns new secret (only time it's visible)
  - Old secret immediately invalidated
  - Use when secret is compromised

**Webhook Security:**
- Signing secret used for HMAC SHA256 verification
- Secret is masked in GET responses (shows only on create/rotate)
- Webhook requests include signature headers for verification
- See File 04 (Guides) for webhook verification implementation

**Filtering Options (List Subscriptions):**
- Pagination with cursor and limit
- Currently limited to one subscription per project

**Important Notes:**
- Only one webhook subscription allowed per project
- Webhook URL must use HTTPS protocol
- Signing secret is only visible on creation or rotation (store securely)
- Secret is masked in all GET responses for security
- V3 payload version is recommended for new implementations
- Connection expiry events only available in V3
- Webhook subscriptions are project-scoped
- Use webhook verification to ensure requests are from Composio
- Rotate secret immediately if compromised

**Related Documentation:**
- File 04 (Guides): Webhook verification implementation
- File 03 (Getting Started): Subscribing to triggers via webhooks
- File 02 (Core Concepts): Triggers overview

---

## File 22: SDK Reference - TypeScript SDK
**File Reference:** `#[[file:COMPOSIO DOCS/22-SDK-REFERENCE-COMPOSIO-TYPESCRIPT-SDK.md]]`

**Query Types:**
- TypeScript SDK installation and setup
- Core Composio class methods and properties
- AuthConfigs class for managing authentication configurations
- ConnectedAccounts class for managing user connections
- MCP class for Model Context Protocol operations
- Toolkits class for toolkit management and authorization
- Tools class for tool listing, execution, and custom tools
- Triggers class for event management
- SDK configuration and session management
- Provider-specific tool formatting

**Key Classes:**
1. **Composio** - Core SDK class
   - Constructor with ComposioConfig
   - Properties: authConfigs, connectedAccounts, create, files, mcp, provider, toolkits, toolRouter, tools, triggers, use
   - Methods: createSession(), flush(), getClient(), getConfig()

2. **AuthConfigs** - Authentication configuration management
   - Methods: create(), delete(), disable(), enable(), get(), list(), update(), updateStatus()
   - Manage custom OAuth apps, API keys, and auth schemes

3. **ConnectedAccounts** - User connection management
   - Methods: delete(), disable(), enable(), get(), initiate(), list(), refresh(), updateStatus()
   - Handle OAuth flows, connection status, and account lifecycle

4. **MCP** - Model Context Protocol operations
   - Methods: create(), delete(), generate(), get(), list(), update()
   - Manage MCP servers and generate user-specific URLs

5. **Toolkits** - Toolkit operations
   - Methods: authorize(), get(), getAuthConfigCreationFields(), getConnectedAccountInitiationFields(), list(), listCategories()
   - Retrieve toolkit metadata and manage user authorization

6. **Tools** - Tool management and execution
   - Methods: createCustomTool(), execute(), get(), getRawComposioToolBySlug(), getRawComposioTools(), list(), proxy()
   - List, retrieve, execute tools, and create custom tools

7. **Triggers** - Event and trigger management
   - Methods: create(), delete(), disable(), enable(), get(), getType(), list(), listActive(), subscribe(), unsubscribe(), verifyWebhook()
   - Manage webhook triggers and event subscriptions

**Use Cases:**
- When implementing Composio in TypeScript/JavaScript projects
- When working with Node.js, Deno, Bun, or browser environments
- When needing TypeScript type definitions and IntelliSense
- When building with frameworks like Next.js, Express, or Vercel
- When creating custom tools with TypeScript
- When managing authentication flows programmatically
- When executing tools and handling responses
- When setting up MCP servers for AI assistants
- When implementing webhook handlers for triggers

**Installation:**
```bash
npm install @composio/core
pnpm add @composio/core
yarn add @composio/core
bun add @composio/core
```

**Quick Start Pattern:**
```typescript
import { Composio } from '@composio/core';

const composio = new Composio({ apiKey: process.env.COMPOSIO_API_KEY });

// Session-based (recommended)
const session = await composio.create("user_123");
const tools = await session.tools();

// Direct execution (advanced)
const tools = await composio.tools.get('user-123', { toolkits: ['github'] });
const result = await composio.tools.execute('GITHUB_GET_REPOS', {
  userId: 'user-123',
  arguments: { owner: 'composio' }
});
```

**Important Notes:**
- TypeScript SDK provides full type safety and IntelliSense support
- Supports multiple JavaScript runtimes (Node.js, Deno, Bun, browsers)
- Provider packages available for framework-specific integrations
- Session management with createSession() for custom headers
- Telemetry flushing required in serverless environments (Cloudflare Workers)
- Custom tools support with createCustomTool()
- Webhook verification with verifyWebhook()
- Proxy execution for custom API endpoints

---

## File 23: SDK Reference - Python SDK
**File Reference:** `#[[file:COMPOSIO DOCS/23-SDK-REFERENCE-COMPOSIO-PYTHON-SDK.md]]`

**Query Types:**
- Python SDK installation and setup
- Core Composio class methods and properties
- Tools class for tool management and execution
- Toolkits class for toolkit operations
- Triggers class for event management
- ConnectedAccounts class for connection management
- AuthConfigs class for authentication configuration
- MCP class for Model Context Protocol operations
- Decorators for tool modifiers (before_execute, after_execute, schema_modifier)
- SDK configuration and provider integration

**Key Classes:**
1. **Composio** - Core SDK class
   - Properties: tools, toolkits, triggers, auth_configs, connected_accounts, mcp
   - Generic type parameter TTool for provider-specific tool types

2. **Tools** - Tool management and execution
   - Methods: get_raw_composio_tool_by_slug(), get_raw_composio_tools(), get_raw_tool_router_meta_tools(), get(), execute(), proxy()
   - Support for custom tools, modifiers, and proxy execution

3. **Toolkits** - Toolkit operations
   - Methods: list(), get(), list_categories(), authorize(), get_connected_account_initiation_fields(), get_auth_config_creation_fields()
   - Retrieve toolkit metadata and manage authorization

4. **Triggers** - Event and trigger management
   - Methods: get_type(), list_active(), list(), create(), delete(), disable(), enable(), subscribe(), unsubscribe()
   - Manage trigger instances and subscriptions

5. **ConnectedAccounts** - Connection management
   - Methods for managing user connections to external services
   - Handle OAuth flows and connection lifecycle

6. **AuthConfigs** - Authentication configuration
   - Methods for managing authentication configurations
   - Support for custom OAuth apps and API keys

7. **MCP** - Model Context Protocol operations
   - Methods for MCP server management
   - Generate user-specific MCP URLs

**Decorators:**
- `@before_execute` - Modify arguments before tool execution
- `@after_execute` - Modify results after tool execution
- `@schema_modifier` - Modify tool schemas before agent sees them

**Use Cases:**
- When implementing Composio in Python projects
- When working with Python AI frameworks (LangChain, LlamaIndex, CrewAI, AutoGen)
- When creating custom tools with Python
- When using tool modifiers to customize behavior
- When managing authentication flows programmatically
- When executing tools and handling responses
- When setting up MCP servers for AI assistants
- When implementing webhook handlers for triggers

**Installation:**
```bash
pip install composio
# or with uv
uv add composio
```

**Quick Start Pattern:**
```python
from composio import Composio

composio = Composio(api_key="your-api-key")

# Session-based (recommended)
session = composio.create(user_id="user_123")
tools = session.tools()

# Direct execution (advanced)
tools = composio.tools.get("user-123", toolkits=["github"])
result = composio.tools.execute(
    "GITHUB_GET_REPOS",
    arguments={"owner": "composio"},
    user_id="user-123"
)
```

**Tool Modifiers Example:**
```python
from composio import before_execute, after_execute, schema_modifier

@schema_modifier(tools=["GITHUB_CREATE_ISSUE"])
def modify_schema(tool, toolkit, schema):
    schema.description = f"Modified: {schema.description}"
    return schema

@before_execute(tools=["GITHUB_CREATE_ISSUE"])
def inject_defaults(tool, toolkit, arguments):
    arguments["labels"] = ["automated"]
    return arguments

@after_execute(tools=["GITHUB_CREATE_ISSUE"])
def log_result(tool, toolkit, result):
    print(f"Created issue: {result}")
    return result
```

**Important Notes:**
- Python SDK provides full type hints and IDE support
- Supports multiple Python AI frameworks via provider packages
- Tool modifiers allow customization without changing tool definitions
- Session management for user-scoped operations
- Proxy execution for custom API endpoints
- Custom tools support with decorators
- Webhook verification available
- Provider-specific tool formatting

---

## File 24: Cookbooks and Templates Guide
**File Reference:** `#[[file:COMPOSIO DOCS/24-COOKBOOKS-GUIDE.md]]`

**Query Types:**
- Practical tutorials and working examples
- Template projects for quick starts
- Step-by-step implementation guides
- Framework-specific integrations (Next.js, FastAPI, Hono)
- Real-world use cases and patterns
- Chat applications with tool integration
- Connection management dashboards
- Background automation agents
- Support and RAG systems

**Main Sections:**

**1. Templates** - Production-ready starting points:
- TrustClaw: Secure AI assistant with OAuth and sandboxed execution
- Data Analyst Agent: Multi-framework agent for data analysis
- Open ChatGPT Atlas: AI-powered research tool
- Open Gamma: Presentation generator for Google Slides
- Gmail Agent with FastAPI: Email assistant with managed auth
- Perplexity Email Assistant: Trigger-based email automation
- Personalised Onboarding Agent: User research and engagement
- Open Gumloop: Visual workflow builder
- Open Email Agent: Natural language email management

**2. Build a Chat App** (Next.js + Vercel AI SDK):
- Complete chat interface with tool integration
- In-chat OAuth authentication flow
- Tool call visualization with status indicators
- Session-based user scoping
- Real-time tool execution display
- ~30 lines of backend code
- Stack: Next.js, Vercel AI SDK, OpenAI, Composio

**3. Build an App Connections Dashboard** (Next.js):
- Dedicated connections management page
- List all available apps with connection status
- Connect/disconnect buttons with OAuth flows
- Pagination support for large toolkit lists
- User-scoped connection management
- Stack: Next.js, @composio/core

**4. Basic FastAPI Server** (Python):
- Chat endpoint with AI agent
- Connection management endpoints
- OAuth flow handling
- Check connection status
- List all user connections
- Stack: FastAPI, OpenAI Agents SDK, Composio

**5. Basic Hono Server** (TypeScript):
- Lightweight server with chat endpoint
- Connection checking and management
- OAuth integration
- Toolkit-scoped sessions
- Stack: Hono.js, OpenAI, @composio/core

**6. Background Agent** (Node.js):
- Autonomous scheduled agent
- Multi-app sweep (GitHub, Gmail, Slack)
- Cron job integration
- GitHub Actions deployment
- Morning digest automation
- Stack: Vercel AI SDK, OpenAI, @composio/vercel

**7. Support Knowledge Agent** (Python):
- Agentic RAG system
- Interactive CLI with streaming
- Multi-source context (Notion, Datadog, GitHub)
- Structured system prompts
- Stack: OpenAI Agents SDK, Composio

**Use Cases:**
- When learning Composio through practical examples
- When starting a new project with a template
- When implementing specific patterns (chat, dashboard, background jobs)
- When integrating with specific frameworks (Next.js, FastAPI, Hono)
- When building production-ready applications
- When understanding best practices through working code
- When deploying scheduled automation
- When building RAG systems with external data sources

**Key Patterns Demonstrated:**
- Session creation and user scoping
- In-chat vs manual authentication
- Tool discovery and execution
- Connection management UI
- OAuth flow handling
- Multi-turn conversations
- Tool call visualization
- Background job scheduling
- Streaming responses
- Error handling and graceful degradation

**Common Stack Combinations:**
- Next.js + Vercel AI SDK + Composio
- FastAPI + OpenAI Agents + Composio
- Hono + OpenAI + Composio
- Node.js + Vercel AI SDK + Composio (background jobs)
- Python + OpenAI Agents + Composio (CLI/RAG)

**Important Notes:**
- All examples use session-based architecture
- User ID scoping is consistent across examples
- In-chat authentication works out of the box
- Production apps should use manual authentication during onboarding
- Examples demonstrate both TypeScript and Python implementations
- Each cookbook includes complete working code
- GitHub repositories available for all examples
- Examples show proper error handling and edge cases
- Deployment instructions included where relevant

**Related Documentation:**
- File 01 (Get Started): Provider-specific quickstarts
- File 02 (Core Concepts): Sessions, meta tools, authentication
- File 03 (Getting Started): Configuring sessions, authentication flows
- File 04 (Guides): White-labeling, multiple accounts, custom auth
- File 22 (TypeScript SDK): SDK reference for TypeScript examples
- File 23 (Python SDK): SDK reference for Python examples

---

## Status

✅ Analyzed: All Files (01-24)

This guide is now complete with comprehensive coverage of all Composio documentation files.
