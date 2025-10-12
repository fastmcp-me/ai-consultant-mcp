# AI Consultant MCP Server

A Model Context Protocol (MCP) server that enables AI agents to consult with multiple AI models through OpenRouter. Features intelligent model auto-selection, conversation history, caching, and robust error handling.

## What is this?

This MCP server allows your AI assistant (like Claude Desktop) to consult with various AI models (GPT, Gemini, Grok, etc.) through a single interface. It automatically selects the best model for your task or lets you choose a specific one.

## Quick Start

### Installation from npm

```bash
npm install -g ai-consultant-mcp
```

### Prerequisites

You'll need an OpenRouter API key. Get one at [OpenRouter](https://openrouter.ai/).

## Configuration

### Option 1: Using npm package (Recommended)

Edit your MCP client configuration file:

**For Claude Desktop:**

- macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`
- Windows: `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "ai-consultant": {
      "command": "npx",
      "args": ["-y", "ai-consultant-mcp"],
      "env": {
        "OPENROUTER_API_KEY": "your-openrouter-api-key"
      }
    }
  }
}
```

**For other MCP clients:**

Configure according to your client's documentation, using `npx -y ai-consultant-mcp` as the command.

### Option 2: Running locally (Development)

1. Clone the repository:

```bash
git clone https://github.com/filipkrayem/ai-consultant-mcp.git
cd ai-consultant-mcp
```

2. Install dependencies:

```bash
npm install
```

3. Build the project:

```bash
npm run build
```

4. Configure your MCP client:

```json
{
  "mcpServers": {
    "ai-consultant": {
      "command": "node",
      "args": ["/absolute/path/to/ai-consultant-mcp/dist/index.js"],
      "env": {
        "OPENROUTER_API_KEY": "your-openrouter-api-key"
      }
    }
  }
}
```

### Environment Variables

- `OPENROUTER_API_KEY` (required): Your OpenRouter API key
- `VERBOSE_LOGGING` (optional): Set to `true` or `1` to enable detailed logging. Default: `false`

## Available Models

- **gemini-2.5-pro**: Google's Gemini 2.5 Pro - general purpose tasks and quick questions
- **gpt-5-codex**: OpenAI's GPT-5 Codex - coding tasks, debugging, and refactoring
- **grok-code-fast-1**: xAI's Grok Code Fast 1 - code review, complex reasoning, and analysis

## Features

- 🤖 **Multiple AI models** - Access GPT, Gemini, Grok, and more through one interface
- 🎯 **Smart model selection** - Automatically picks the best model for your task
- 💬 **Conversation history** - Maintain context across multiple questions
- ⚡ **Response caching** - Reduces API calls and costs
- 🔄 **Automatic retries** - Handles transient failures gracefully
- 🛡️ **Circuit breaker** - Prevents cascading failures
- 📊 **Token tracking** - Monitor usage for each consultation

## Usage

Once configured, your AI assistant can use these tools:

- **`consult_ai`** - Ask questions to AI models (auto-selects or specify a model)
- **`list_models`** - See all available models and their capabilities

Simply ask your AI assistant to consult with AI models. For example:

- "Consult this change with Grok and Codex"
- "Have Grok review your code first"

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT

## Links

- [GitHub Repository](https://github.com/filipkrayem/ai-consultant-mcp)
- [npm Package](https://www.npmjs.com/package/ai-consultant-mcp)
- [OpenRouter](https://openrouter.ai/)
- [Model Context Protocol](https://modelcontextprotocol.io/)
