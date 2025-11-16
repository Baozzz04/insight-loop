from typing import List, Dict, Any
import requests

class NexaClient:
    def __init__(self, config: Dict[str, Any]):
        self.chat_url = config.get("NEXA_URL")
        self.api_key = config.get("NEXA_API_KEY")

        self.headers = {
            "accept": "application/json",
            "Content-Type": "application/json",
            "Authorization": "Bearer " + self.api_key
        }

    def chat(
        self,
        messages: List[Dict[str, str]],
        temperature: float = 0.7
    ) -> str:
        """Send a blocking chat request to the Nexa model and return the response."""
        data = {
            "model": "NexaAI/Llama3.2-3B-NPU-Turbo",
            "messages": messages,
            "max_tokens": 256,
            "temperature": temperature,
            "stream": False
        }

        chat_response = requests.post(
            self.chat_url,
            headers=self.headers,
            json=data
        )
        
        try:
            return chat_response.json()['choices'][0]['message']['content']
        except ValueError:
            return "Response is not valid JSON"
        except Exception as e:
            return f"Chat request failed. Error: {e}"

    def streaming_chat(self):
        raise NotImplementedError("Nexa streaming chat is not implemented yet.")

def setup_nexa_client(
    config: Dict[str, Any]
) -> NexaClient:
    return NexaClient(config)

# def nexa_chat_completion(
#     client: NexaClient,
#     messages: List[Dict[str, str]],
#     temperature: float = 0.7,
#     stream: bool = False
# ) -> Any:
#     """Send messages to the Nexa language model and get a response."""
#     if stream:
#         # return client.streaming_chat(messages, temperature=temperature)
#         raise NotImplementedError("Nexa streaming chat is not implemented yet.")
#     else:
#         return client.chat(messages, temperature=temperature)