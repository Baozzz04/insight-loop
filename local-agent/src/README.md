# Source Code Documentation

This directory contains the core implementation of the local-agent framework, a flexible and extensible tool-using AI agent system that runs entirely on your machine with support for multiple LLM providers.

**Table of Contents**
- [Overview](#overview)
- [Design Philosophy](#design-philosophy)
- [Architecture](#architecture)
- [`agent.py` - Agent Orchestration](#agentpy---agent-orchestration)
- [`model.py` - Model Interface](#modelpy---model-interface)
- [`tools.py` - Tool System](#toolspy---tool-system)
- [`servers/` - Server Integrations](#server-integrations-servers)
- [Troubleshooting](#troubleshooting)

## Overview

The local-agent is built on three core components:
- **Agent**: The orchestration layer that manages conversation flow, memory, and tool execution
- **Model Interface**: An abstraction layer that supports multiple LLM providers
- **Tools**: A simple, extensible system for giving the agent capabilities

## Design Philosophy

This codebase follows several key principles:

1. **Simplicity**: Each component has a clear, singular purpose
2. **Extensibility**: Adding new providers, tools, or behaviors is straightforward
3. **Local-first**: Designed to run entirely on your machine, with your choice of model
4. **Transparency**: Transcripts and clear logging make agent behavior observable
5. **Flexibility**: Configuration-driven design allows easy experimentation

## Architecture

```
src/
├── agent.py          # Main agent orchestration and memory management
├── model.py          # LLM provider abstraction layer
├── tools.py          # Tool definition framework and built-in tools
└── servers/          # LLM provider implementations
    ├── anythingllm.py
    ├── lmstudio.py
    └── nexa.py
```

## `agent.py` - Agent Orchestration

The `Agent` class is the heart of the system, managing conversation flow, memory, and tool execution.

### Key Features
- **Memory Management**: Long-term and short-term memory handling
- **Tool Integration**: Custom python functions as tools for the agent
- **Transcript Logging**: Automatically saves timestamped logs

### Usage

```python
from src.agent import Agent
from src.tools import tools

# Create agent with tools and identity
agent = Agent(
    tools=tools,
    identity="You are a helpful assistant with access to tools."
)

# Run interactive loop
agent.run()

# Or use programmatically
import asyncio
response = asyncio.run(agent.chat_completion("What time is it?"))
```

### Configuration

Configure the agent via `config.yaml` in the project root:

```yaml
# Memory settings
SHORT_MEMORY_SIZE: 20          # Number of messages to keep
DISABLE_SHORT_MEMORY: false    # Set to true to disable

LONG_MEMORY_SIZE: 5096         # Token budget for summary
DISABLE_LONG_MEMORY: true      # Set to false to enable
```

## `model.py` - Model Interface

The `ModelInterface` class provides a unified API for interacting with different LLM providers. It reads configuration from `config.yaml` and routes requests to the appropriate provider.

### Usage

```python
from src.model import ModelInterface

# Initialize (reads config.yaml automatically)
model = ModelInterface()

# Send a chat completion request
messages = [
    {"role": "system", "content": "You are a helpful assistant."},
    {"role": "user", "content": "Hello!"}
]

response = model.chat_completion(
    messages=messages,
    temperature=0.7,
    stream=False
)
```

### Configuration

Set your provider and provider settings in `config.yaml`:

```yaml
MODEL_PROVIDER: "lmstudio"  # or "anythingllm" or "nexa"

# Provider-specific settings (see docs/ folder for details)
LM_STUDIO_URL: "http://localhost:1234/v1"
LM_STUDIO_MODEL: "hugging-quants/llama-3.2-3b-instruct"
# ... etc
```

## `tools.py` - Tool System

A simple framework for extending agent capabilities with custom functions.

### The Tool Class

```python
class Tool:
    def __init__(self, name: str, func: Callable[[str], str], description: str):
        self.name = name          # Tool identifier (used in tool calls)
        self.func = func          # The function to execute
        self.description = description  # Instructions for the LLM
```

### Creating Custom Tools
Tools can do anything Python can do! For example, a tool that makes an API call:
```python
import json
from typing import Dict

def api_call_tool(params: str) -> str:
    """Tool that makes external API calls."""
    try:
        # Parse the parameter string
        data = json.loads(params)
        
        # Make your API call
        result = your_api_function(data)
        
        return json.dumps(result)
    except Exception as e:
        return f"Error: {str(e)}"

api_tool = Tool(
    name="APICall",
    func=api_call_tool,
    description="Makes an API call. Usage: return 'APICall({\"endpoint\": \"...\", \"params\": {...}})'"
)
```

###  Examples
**No-argument tool**
```python
from src.tools import Tool

def my_tool() -> str:
    return "Tool result"

my_custom_tool = Tool(
    name="MyTool",
    func=my_tool,
    description="Does something useful. Usage: return 'MyTool()'"
)
```

**Tool with arguments**
```python
def search_tool(query: str) -> str:
    # Your search logic here
    return f"Search results for: {query}"

search = Tool(
    name="Search",
    func=search_tool,
    description="Searches for information. Usage: return 'Search(query string)'"
)
```

## Server Integrations (`servers/`)

Integrates with [AnythingLLM](https://anythingllm.com/), [LM Studio](https://lmstudio.ai/), and [Nexa AI](https://www.nexaai.com/).

**Note**: Currently supports basic chat completion; streaming is not yet implemented.

### Common Provider Pattern
All server modules follow this pattern:

```python
# 1. Client class with provider-specific configuration
class ProviderClient:
    def __init__(self, config: Dict[str, Any]):
        # Setup connection, API keys, URLs, etc.
        pass
    
    def chat(self, messages, temperature):
        # Send request and return response
        pass

# 2. Setup function
def setup_provider_client(config: Dict[str, Any]) -> ProviderClient:
    return ProviderClient(config)
```

### Add a New LLM Provider

1. **Create provider module**: `src/servers/your_provider.py`
2. **Implement the pattern**:
   ```python
   class YourProviderClient:
       def __init__(self, config): ...
       def chat(self, messages, temperature): ...
   
   def setup_your_provider_client(config): ...
   ```
3. **Update `model.py`**: Add your provider to `_setup_client()` and `chat_completion()`
4. **Document it**: Add setup guide to `docs/` folder

## Troubleshooting

### Agent not calling tools
- Performance varies with different models and is not guaranteed
- Ensure tool descriptions are clear and included in agent identity
- Check that tool calls match the pattern: `ToolName(argument)`
- Review transcripts to see what the LLM is generating

### Provider connection issues
- Confirm your LLM server is running (LM Studio, Nexa, AnythingLLM)
- Verify URLs and ports in `config.yaml` match your server
- Check API keys if required by your provider
