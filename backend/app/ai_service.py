import os
import json
import io
from openai import OpenAI
from google import genai
from google.genai import types
from PIL import Image
from pydantic import BaseModel, Field
from dotenv import load_dotenv

load_dotenv()

# Configure NVIDIA Client for text queries
api_key = os.getenv("NVIDIA_API_KEY")
client = None
if api_key:
    client = OpenAI(
        base_url="https://integrate.api.nvidia.com/v1",
        api_key=api_key
    )

# Configure Google GenAI Client for bill OCR extraction
gemini_key = os.getenv("GEMINI_API_KEY")
gemini_client = None
if gemini_key:
    gemini_client = genai.Client(api_key=gemini_key)


class BillData(BaseModel):
    vendor_name: str = Field(description="The name of the company/merchant/store issuing the bill")
    invoice_date: str = Field(description="The date the bill was issued in YYYY-MM-DD format")
    total_amount: float = Field(description="The final total amount due/paid, including taxes")
    category: str = Field(description="The suggested category name from options: Food, Transport, Shopping, Rent, Entertainment, Health, Utilities, Education, Savings, or General")


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
        Extracts structured bill details from an uploaded receipt/bill image using Gemini 2.0 Flash.
        """
        if not gemini_client:
            print("Gemini API Client is not initialized. Please verify GEMINI_API_KEY.")
            return None

        try:
            # Load image from bytes
            bill_image = Image.open(io.BytesIO(image_data))
        except Exception as e:
            print(f"Failed to open receipt image: {e}")
            return None

        prompt = "Extract the vendor name, invoice date, total amount, and suggested category from this bill image."

        try:
            response = gemini_client.models.generate_content(
                model='gemini-2.0-flash',
                contents=[bill_image, prompt],
                config=types.GenerateContentConfig(
                    response_mime_type="application/json",
                    response_schema=BillData,
                    temperature=0.0,
                ),
            )
            
            if not response.text:
                return None
                
            parsed_data = json.loads(response.text)
            
            # Map standard keys
            return {
                "amount": float(parsed_data.get("total_amount") or 0.0),
                "vendor": parsed_data.get("vendor_name") or "Unknown",
                "date": parsed_data.get("invoice_date") or "",
                "category": parsed_data.get("category") or "General"
            }
        except Exception as e:
            print(f"Gemini 2.0 OCR Processing Error: {e}")
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
