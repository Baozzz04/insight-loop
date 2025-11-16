

import pytest
import yaml
import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
from src.servers.nexa import NexaClient

def load_config():
    with open("config.yaml", "r") as f:
        return yaml.safe_load(f)

CONFIG = load_config()

def test_server_running():
    import requests
    try:
        response = requests.post(
            CONFIG["NEXA_URL"],
            headers={"Authorization": "Bearer " + CONFIG["NEXA_API_KEY"]},
            json={"model": "NexaAI/Qwen3-4B-Instruct-2507-npu", "messages": [{"role": "user", "content": "ping"}], "max_tokens": 10, "temperature": 0.7, "stream": False},
            timeout=30
        )
        assert response.status_code == 200
    except Exception as e:
        pytest.fail(f"Nexa server not running or unreachable: {e}")

def test_chat_endpoint():
    client = NexaClient(CONFIG)
    messages = [{"role": "user", "content": "Hello, Nexa!"}]
    reply = client.chat(messages)
    assert isinstance(reply, str)
    assert reply != "Response is not valid JSON"
    assert not reply.startswith("Chat request failed")
