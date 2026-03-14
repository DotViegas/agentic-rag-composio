# Installation Scripts
## Install the required packages to get started
´´´bash
npm install @composio/core @composio/openai-agents @openai/agents
´´´

## Agent Code (MCP)
Example code to integrate Composio tool router with OpenAI Agents SDK using MCP tools

´´´
import { Composio } from "@composio/core";
import { Agent, run, hostedMcpTool } from "@openai/agents";

// Initialize Composio
const composio = new Composio({
  apiKey: "ak_AG0Q-_9raVR3XlScUurE",
});

const externalUserId = "pg-test-fcaf616d-e03a-452f-bf18-69f505823f89";

// Create a tool router session
const session = await composio.create(externalUserId);

// Create agent with MCP tool
const agent = new Agent({
  name: "Email Manager",
  model: "gpt-4o",
  instructions: "You are a helpful assistant. Use Composio tools to execute tasks.",
  tools: [
    hostedMcpTool({
      serverLabel: "composio",
      serverUrl: session.mcp.url,
      headers: session.mcp.headers,
    }),
  ],
});

// Run the agent
console.log(`🔄 Running agent...`);
const result = await run(
  agent,
  "Send an email to energiaa.cloud@gmail.com with the subject 'Hello from Composio' and the body 'This is a test email!'"
);

console.log(`✅ Received response from agent`);
if (result.finalOutput) {
  console.log(result.finalOutput);
}


´´´
