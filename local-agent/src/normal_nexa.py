import requests

class NexaClient:
    def __init__(self, api_url: str, api_key: str, model: str):
        self.api_url = api_url
        self.api_key = api_key
        self.model = model

        self.headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {api_key}",
        }

    def chat(self, prompt: str) -> str:
        payload = {
            "model": self.model,
            "messages": [{"role": "user", "content": prompt}],
            "max_tokens": 256,
            "temperature": 0.7,
            "stream": False
        }

        response = requests.post(
            self.api_url,
            headers=self.headers,
            json=payload,
            timeout=10
        )
        
        try:
            return response.json()['choices'][0]['message']['content']
        except Exception as e:
            return f"Error: {e}"


# Example usage
if __name__ == "__main__":
    client = NexaClient(
        api_url="http://127.0.0.1:18181/v1/chat/completions",  # example
        api_key="nexa",
        model="NexaAI/Llama3.2-3B-NPU-Turbo"
    )

    while True:
        user_input = input("You: ")
        if user_input.lower() in {"exit", "quit"}:
            break

        result = client.chat(user_input)
        print("Nexa:", result)
