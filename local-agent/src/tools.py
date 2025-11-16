from datetime import datetime
from typing import Callable

class Tool:
    def __init__(self, name: str, func: Callable[[str], str], description: str):
        self.name = name
        self.func = func
        self.description = description

    def run(self, arg: str) -> str:
        return self.func(arg) if arg != "" else self.func()

# Example prompt to use the time tool: "What time is it?"
def time_tool() -> str:
    now = datetime.now()
    return f"The current time is {now.strftime('%I:%M%p').lstrip('0').lower()} on {now.strftime('%d %B %Y')}"

# Define available tools
tools = [
    Tool(
        "Time",
        time_tool,
        "Prints the current date and time. Usage: return 'Time()'"
    )
]
# Build tool descriptions for the instructions
tool_descriptions = "\n".join(
    f"- {tool.name}: {tool.description}" for tool in tools
)