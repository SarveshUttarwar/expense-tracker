import os
import json
from openai import OpenAI
from dotenv import load_dotenv

load_dotenv()

api_key = os.getenv("NVIDIA_API_KEY")
print(f"Testing NVIDIA API Key: {api_key[:10]}...")

try:
    client = OpenAI(
        base_url="https://integrate.api.nvidia.com/v1",
        api_key=api_key
    )
    
    response = client.chat.completions.create(
        model="qwen/qwen2.5-7b-instruct",
        messages=[{"role": "user", "content": "Say hello!"}],
        temperature=0.2,
        top_p=0.7,
        max_tokens=1024,
    )
    
    print(f"Success! Qwen says: {response.choices[0].message.content}")
except Exception as e:
    print(f"Qwen Generation FAILED: {e}")
