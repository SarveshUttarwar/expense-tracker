import os
from openai import OpenAI
from dotenv import load_dotenv

load_dotenv()

api_key = os.getenv("NVIDIA_API_KEY")

try:
    client = OpenAI(
        base_url="https://integrate.api.nvidia.com/v1",
        api_key=api_key
    )
    
    models = client.models.list()
    with open("models_list.txt", "w") as f:
        for model in models:
            f.write(f"{model.id}\n")
    print("Models list saved to models_list.txt")
except Exception as e:
    print(f"FAILED: {e}")
