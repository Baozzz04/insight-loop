# Local Agent Setup and Usage Guide

Use this guide to setup and configure the Local Agent with your choice of local LLM backend.

**Table of Contents**
- [Setup](#setup)
- [Testing](#testing)
- [Usage](#usage)
- [Adding More Tools](#adding-more-tools)

### Setup
1. Clone the repository:
    ```sh
    git clone https://github.com/thatrandomfrenchdude/local-agent.git
    cd local-agent
    ```
2. Create your configuration file `config.yaml` in the project root using the following template:

   ```yaml
   # general variables
    MODEL_PROVIDER: "your-provider-here"  # options: anythingllm, lmstudio, nexa
    STREAM: False  # not working, do not use yet (or submit a PR!)
    STREAM_TIMEOUT: 30
    
    # memory settings
    SHORT_MEMORY_SIZE: 20  # messages
    LONG_MEMORY_SIZE: 5096  # tokens
    DISABLE_SHORT_MEMORY: False
    DISABLE_LONG_MEMORY: True # not working, do not use yet (or submit a PR!)

    # AnythingLLM configuration
    ANYTHINGLLM_API_KEY: "your-api-key"
    ANYTHINGLLM_WORKSPACE: "local-agent"
    ANYTHINGLLM_URL: "http://localhost:3001/api/v1"

    # LM Studio configuration
    LM_STUDIO_API_KEY: "lm-studio" # placeholder, not used
    LM_STUDIO_MODEL: "hugging-quants/llama-3.2-3b-instruct"
    LM_STUDIO_URL: "http://localhost:1234/v1"

    # Nexa configuration
    NEXA_API_KEY: "nexa" # placeholder, configured in the sdk
    NEXA_URL: "http://127.0.0.1:18181/v1/chat/completions"
   ```
   Adjust the values as needed for the providers you want to use, sensible defaults have been chosen.
   
   **Note**: You only need to fill in the variables relevant to the model backend(s) you plan to use.
3. Create and activate a virtual environment:
    ```sh
    python3 -m venv venv
    source venv/bin/activate
    ```
4. Install the required dependencies:
    ```sh
    pip install openai pyyaml requests asyncio httpx pytest
    ```
5. Follow the additional instructions for the model backend(s) you want to use:
- [AnythingLLM Backend Instructions](anythingllm_setup.md)
- [LM Studio Backend Instructions](lmstudio_setup.md)
- [Nexa Backend Instructions](nexa_setup.md)

---

### Testing

Run the tests from the base directory to verify your setup:
```
# use flags to select specific backend tests, none for all
# -a: AnythingLLM
# -c: Core tests
# -l: LM Studio
# -n: Nexa  # ARM64 Windows only

# Windows PowerShell (running all tests)
.\scripts\run_tests.ps1 

# Mac/Linux (running core and LM Studio tests only)
./scripts/run_tests.sh -c -l
```

---

### Usage
Start your chosen model server(s), then run the local agent:
```sh
python main.py
```

---

### Adding More Tools

You can add new tools by defining a Python function and registering it with the agent.

1. Define your tool function

    ```python
    def my_tool(arg: str) -> str:
        # Your logic here
        return f"Processed: {arg}"
    ```

2. Create a `Tool` object

    ```python
    from src.tools import Tool

    my_tool_obj = Tool(
        "MyTool",
        my_tool,
        "Describe what your tool does. Usage: MyTool(argument)"
    )
    ```

3. Add it to the `tools` list

    ```python
    tools = [
        Tool(
            "Echo",
            echo_tool,
            "Prints the input text prefixed with ECHO. Usage: return the string 'Echo(<text>)' where <text> is the text to echo."
        ),
        Tool(
            "Time",
            time_tool,
            "Prints the current date and time. Usage: return the string 'Time()'"
        ),
        my_tool_obj,  # Add your tool here
    ]
    ```
4. Restart the agent to use the new tool.

---