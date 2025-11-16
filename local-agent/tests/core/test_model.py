import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..')))

import pytest
import io
from src.model import ModelInterface

class DummyClient:
    pass

def test_model_provider_config(monkeypatch):
    config_yaml = "MODEL_PROVIDER: anythingllm"
    mock_file = io.StringIO(config_yaml)
    monkeypatch.setattr("builtins.open", lambda f, mode="r": mock_file)
    monkeypatch.setattr("src.model.setup_anythingllm_client", lambda config: DummyClient())
    model = ModelInterface()
    assert model.model_provider == "anythingllm"
    assert isinstance(model.client, DummyClient)

def test_model_chat_completion(monkeypatch):
    config_yaml = "MODEL_PROVIDER: anythingllm"
    mock_file = io.StringIO(config_yaml)
    monkeypatch.setattr("builtins.open", lambda f, mode="r": mock_file)
    monkeypatch.setattr("src.model.setup_anythingllm_client", lambda config: DummyClient())
    monkeypatch.setattr("src.model.anythingllm_chat_completion", lambda client, messages, temperature, stream: "response")
    model = ModelInterface()
    result = model.chat_completion([{"role": "user", "content": "hi"}])
    assert result == "response"
