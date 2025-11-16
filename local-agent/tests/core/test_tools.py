import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..')))
from src.tools import Tool, time_tool

def test_time_tool_format():
    result = time_tool()
    assert "The current time is" in result
    assert "on" in result

def test_tool_run_with_arg():
    def echo(arg):
        return f"Echo: {arg}"
    tool = Tool("Echo", echo, "Echoes input")
    assert tool.run("test") == "Echo: test"

def test_tool_run_without_arg():
    def echo():
        return "Echo:"
    tool = Tool("Echo", echo, "Echoes input")
    assert tool.run("") == "Echo:"
