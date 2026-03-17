# Technology Stack

## Runtime & Language

- **Node.js** with ES modules (`"type": "module"`)
- **JavaScript** (no TypeScript, no build step)

## Core Dependencies

- **@composio/core** (^0.6.5) - Composio platform SDK
- **@composio/openai-agents** (^0.6.5) - Composio OpenAI integration
- **@openai/agents** (^0.7.1) - OpenAI agents SDK
- **openai** (^4.73.0) - OpenAI API client
- **express** (^4.18.2) - HTTP server
- **cors** (^2.8.5) - CORS middleware
- **dotenv** (^17.3.1) - Environment configuration
- **ajv** (^8.12.0) + **ajv-formats** (^2.1.1) - JSON Schema validation

## LLM Configuration

- **Model**: gpt-4o-mini (planning, execution, formatting)
- **Cost**: ~$0.0005-0.002 per task
- **Calls**: 3-12 per task depending on complexity

## Common Commands

```bash
# Install dependencies
npm install

# Start server (production)
npm start

# Development with auto-reload
npm run dev

# Server runs on
http://localhost:3000
```

## Environment Variables

Required in `.env`:
```env
COMPOSIO_API_KEY=your_composio_key
OPENAI_API_KEY=your_openai_key
PORT=3000
```

## API Endpoints

- `POST /execute` - Execute task
- `GET /health` - Health check
- `DELETE /session/:userId` - Clear session

## File Persistence

- **Checkpoints**: `.checkpoints/` directory
- **Format**: JSON files with idempotency keys
- **Purpose**: Audit trails, resume capability, deduplication

## Code Conventions

- ES6+ features (async/await, destructuring, arrow functions)
- ES modules (import/export, not require)
- No transpilation or bundling
- Functional style with classes for modules
- Structured logging with color-coded output
