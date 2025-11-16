import yaml
from typing import List, Dict, Any
# from openai import OpenAI

from src.servers.anythingllm import setup_anythingllm_client # , anythingllm_chat_completion
from src.servers.lmstudio import setup_lm_studio_client # , lmstudio_chat_completion
from src.servers.nexa import setup_nexa_client # , nexa_chat_completion

# A message is a dictionary with a role and content
Message = Dict[str, str]

class ModelInterface:
    def __init__(self):
        """Initialize the model interface."""
        # read the configuration file
        with open("config.yaml", "r") as f:
            config = yaml.safe_load(f)
        self.model_provider = config.get("MODEL_PROVIDER", None)
        self.client = self._setup_client(config)

    def _setup_client(self, config: Dict[str, Any]):
        """Setup the model client based on the provider."""
        if not self.model_provider:
            raise ValueError("MODEL_PROVIDER is not set in config.yaml")
        
        if self.model_provider.lower() == "anythingllm":
            return setup_anythingllm_client(config)
        elif self.model_provider.lower() == "lmstudio":
            return setup_lm_studio_client(config)
        elif self.model_provider.lower() == "nexa":
            return setup_nexa_client(config)
        else:
            raise ValueError(f"Unsupported MODEL_PROVIDER: {self.model_provider}")

    def chat_completion(
        self,
        messages: List[Message],
        temperature: float = 0.7,
        stream: bool = False
    ) -> Any:
        """Send messages to the language model and get a response."""
        if not self.model_provider:
            raise ValueError("MODEL_PROVIDER is not set in config.yaml")
        
        if self.model_provider.lower() == "anythingllm":
            if stream:
                raise NotImplementedError("AnythingLLM streaming chat is not implemented yet.")
            return self.client.chat(messages)
            
            # return anythingllm_chat_completion(
            #     client=self.client,
            #     messages=messages,
            #     temperature=temperature,
            #     stream=stream
            # )
        elif self.model_provider.lower() == "lmstudio":
            if stream:
                raise NotImplementedError("LM Studio streaming chat is not implemented yet.")
            return self.client.chat(messages, temperature=temperature)

            # return lmstudio_chat_completion(
            #     client=self.client,
            #     messages=messages,
            #     temperature=temperature,
            #     stream=stream
            # )
        elif self.model_provider.lower() == "nexa":
            if stream:
                raise NotImplementedError("Nexa streaming chat is not implemented yet.")
            return self.client.chat(messages, temperature=temperature)
            # return nexa_chat_completion(
            #     client=self.client,
            #     messages=messages,
            #     temperature=temperature,
            #     stream=stream
            # )
        else:
            raise ValueError(f"Unsupported MODEL_PROVIDER: {self.model_provider}")