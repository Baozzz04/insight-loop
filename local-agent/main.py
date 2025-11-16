import asyncio

from src.agent import Agent
from src.tools import tools, tool_descriptions

def agent_identity() -> str:
    """Build the agent identity with system prompt and instructions."""
    system_prompt = "You are a tool-calling agent that may use tools by responding according to their instructions.\n"
    instructions = (
        "You may use the following tools to assist with user queries.\n"
        "Avoid using tools if the user query can be answered without them.\n"
        "Here are the tools you can use:\n"
        f"{tool_descriptions}\n"
        "When you decide to use a tool, respond with the format:"
        "'ToolName(arg)' where ToolName is the name of the tool and arg is the argument to pass to the tool."
        "If the tool does not require an argument, use 'ToolName()'.\n"
        "Only use one tool per response.\n"
    )
    return system_prompt + instructions

def main():
    agent = Agent(
        tools=tools,
        identity=agent_identity()
    )
    agent.run()

if __name__ == "__main__":
    main()