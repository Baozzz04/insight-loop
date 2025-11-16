import sys
import os
import tempfile
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..')))

import pytest
import asyncio
from src.agent import Agent
from src.tools import Tool

class DummyModel:
    def chat_completion(self, messages):
        return "Hello, world!"

def dummy_tool_func(arg=None):
    return f"Echo: {arg}" if arg else "Echo:"

def test_agent_run_and_memory(monkeypatch):
    # Patch input to simulate user interaction
    inputs = ["test message", "exit"]
    monkeypatch.setattr("builtins.input", lambda _: inputs.pop(0))
    # Patch ModelInterface to DummyModel
    monkeypatch.setattr("src.agent.ModelInterface", lambda: DummyModel())
    tools = [Tool("Echo", dummy_tool_func, "Echoes input")]
    agent = Agent(tools, "Test agent identity")
    # Use a platform-independent temp file
    agent.transcript_file = os.path.join(tempfile.gettempdir(), "test_transcript.txt")
    agent.run()
    assert agent.short_memory[-1]["content"] == "Hello, world!"

def test_agent_tool_call(monkeypatch):
    monkeypatch.setattr("src.agent.ModelInterface", lambda: DummyModel())
    tools = [Tool("Echo", dummy_tool_func, "Echoes input")]
    agent = Agent(tools, "Test agent identity")
    # Simulate a tool call response
    agent.model.chat_completion = lambda messages: "Echo(test)"
    result = asyncio.run(agent.chat_completion("test"))
    assert result == "Echo: test"
