# Nexa Backend

Before following these steps, ensure you have completed the initial [Setup Guide](README.md).

## Requirements
- Python 3.11 to Python 3.13

## Setup

1. [Download](https://nexa-model-hub-bucket.s3.us-west-1.amazonaws.com/public/nexa_sdk/downloads/nexa-cli_windows_arm64.exe) and install the [Nexa](https://nexa.ai) SDK.
2. Configure your Nexa token

    Note: All NPU models require a valid license token.
    - Sign up for a Nexa account on the [Nexa website](https://nexa.ai)
    - Navigate to your profile by clicking on your avatar in the top right corner
    - Click on `Access Token` in the left sidebar
    - Click the `+ Create Token` button, give it a name, and copy the generated token
    - Set the token in the Nexa CLI:
        ```sh
        nexa config set license '<your_token_here>'
        ```
3. Start the Nexa server:
    ```sh
    nexa serve
    ```
    Note: Local Agent is coded to call the Nexa backend with the `NexaAI/Qwen3-4B-Instruct-2507-npu` model. It will be downloaded automatically when you start chat with the server for the first time, which may take some time depending on your internet speed.

Return to the [Testing](README.md/#testing) and [Usage](README.md/#usage) sections in the [Setup Guide](README.md) to verify your setup and run the local agent.