import os
import json
from openai import OpenAI
from dotenv import load_dotenv

load_dotenv()

# Configure NVIDIA Client
# NVIDIA NIM uses the OpenAI-compatible SDK
api_key = os.getenv("NVIDIA_API_KEY")
client = None
if api_key:
    client = OpenAI(
        base_url="https://integrate.api.nvidia.com/v1",
        api_key=api_key
    )

class AIService:
    def __init__(self):
        # Using Llama 3.1 8B which is available on NVIDIA NIM
        self.model = "meta/llama-3.1-8b-instruct"

    def parse_nlp_expense(self, text: str):
        """
        Parses natural language into a structured expense JSON using Qwen via NVIDIA NIM.
        """
        if not client:
            return None

        prompt = f"""
        Extract expense details from the following text and return a valid JSON object.
        Text: "{text}"
        
        The JSON should have:
        - amount (number)
        - description (string)
        - type (either 'expense' or 'saving')
        - category (suggested category name string)
        
        Return ONLY the JSON. No markdown code blocks.
        """
        
        try:
            response = client.chat.completions.create(
                model=self.model,
                messages=[{"role": "user", "content": prompt}],
                temperature=0.2,
                top_p=0.7,
                max_tokens=1024,
            )
            text_res = response.choices[0].message.content.strip()
            # Handle potential markdown code blocks
            if "```json" in text_res:
                text_res = text_res.split("```json")[1].split("```")[0].strip()
            elif "```" in text_res:
                 text_res = text_res.split("```")[1].split("```")[0].strip()
            return json.loads(text_res)
        except Exception as e:
            print(f"Qwen AI Parsing Error: {e}")
            return None

    def extract_receipt_data(self, image_data: bytes, mime_type: str = "image/jpeg"):
        """
        Note: Simple LLMs like Qwen-72B might not support direct image bytes as NIMs 
        unless using a Vision-specific NIM. For now, we stub this or use a Vision model if available.
        NVIDIA offers 'nvidia/neva-22b' for vision.
        """
        # For now, let's try a vision-enabled model if possible or inform user it's text-only.
        # Stubbing for now to ensure stability.
        print("Vision feature disabled in Qwen text-only mode.")
        return None

    def categorize_expense(self, description: str, categories: list):
        """
        Suggests the best category for a description from a list of available categories.
        """
        if not client:
            return None

        prompt = f"""
        Given the expense description: "{description}"
        And the available categories: {categories}
        
        Which category fits best? Return ONLY the category name. If none fit well, return "Other".
        """

        try:
            response = client.chat.completions.create(
                model=self.model,
                messages=[{"role": "user", "content": prompt}]
            )
            return response.choices[0].message.content.strip()
        except Exception as e:
            print(f"Categorization AI Error: {e}")
            return None

ai_service = AIService()
