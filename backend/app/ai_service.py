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

# Configure NVIDIA Client for text queries (NLP parsing — do NOT touch)
api_key = os.getenv("NVIDIA_API_KEY")
client = None
if api_key:
    client = OpenAI(
        base_url="https://integrate.api.nvidia.com/v1",
        api_key=api_key
    )

# Configure Google GenAI Client for bill OCR extraction + semantic mapping
gemini_key = os.getenv("GEMINI_API_KEY")
gemini_client = None
if gemini_key:
    gemini_client = genai.Client(api_key=gemini_key)

GEMINI_MODEL = "gemini-2.5-flash"


class BillData(BaseModel):
    vendor_name: str = Field(description="The name of the company/merchant/store issuing the bill")
    invoice_date: str = Field(description="The date the bill was issued in YYYY-MM-DD format")
    total_amount: float = Field(description="The final total amount due/paid, including taxes")
    category: str = Field(description="The suggested category name that best fits this receipt. Must be an exact match from the provided list if a semantically identical category exists, otherwise suggest a new specific category name.")


class AIService:
    def __init__(self):
        # Using Llama 3.1 8B which is available on NVIDIA NIM
        self.model = "meta/llama-3.1-8b-instruct"

    def parse_nlp_expense(self, text: str, user_id: int = None):
        """
        Parses natural language into a structured expense JSON using Qwen via NVIDIA NIM.
        DO NOT MODIFY the model choice — working as intended.
        """
        if not client:
            return None

        # Fetch existing categories to guide Qwen's classification
        existing_categories = []
        if user_id:
            from app.database import get_db
            db = None
            cursor = None
            try:
                db = get_db()
                cursor = db.cursor(dictionary=True)
                cursor.execute("SELECT name FROM categories WHERE user_id=%s", (user_id,))
                existing_categories = [row["name"] for row in cursor.fetchall()]
            except Exception as e:
                print(f"Error fetching user categories in NLP: {e}")
            finally:
                if cursor:
                    cursor.close()
                if db:
                    db.close()

        cats_str = ", ".join([f'"{c}"' for c in existing_categories]) if existing_categories else ""

        prompt = f"""
        Extract expense details from the following text and return a valid JSON object.
        Text: "{text}"
        
        Rules for suggesting the 'category' field:
        1. If the text matches or is highly related to one of the user's existing categories, return that category name exactly.
           Existing categories: [{cats_str}]
        2. Do NOT force unrelated expenses into broad existing categories. Prioritize specificity over broad grouping. For example:
           - "groceries" should suggest a new "Groceries" category, not map to "Food".
           - "chicken" should suggest a new "Chicken" category, not map to "Food".
           - "petrol" should suggest a new "Petrol" category, not map to "Travel".
        3. If no existing category is highly related, suggest a new specific category name in Proper Case.
        
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

    def map_proposed_category(self, proposed_name: str, existing_categories: list) -> str:
        """
        Intelligently maps a proposed category name to an existing one via semantic matching,
        or returns a clean new specific category name if no match is found.

        Rules:
        - Exact/near-identical name → return existing name (case-insensitive)
        - Semantically identical meaning → return existing name
        - Distinct item or intent → return a new clean, specific name
        - Never force unrelated expenses into broad categories
        """
        if not existing_categories:
            return proposed_name.strip().title()

        # Step 1: Fast exact case-insensitive check (no LLM needed)
        proposed_lower = proposed_name.strip().lower()
        for cat in existing_categories:
            if cat.strip().lower() == proposed_lower:
                return cat  # exact match, return existing name as-is

        # Step 2: Use Gemini for semantic matching
        if not gemini_client:
            print("Gemini client unavailable; falling back to proposed name.")
            return proposed_name.strip().title()

        cat_list = ", ".join([f'"{c}"' for c in existing_categories])
        prompt = f"""You are a precise expense category classifier.

Proposed category: "{proposed_name}"
Existing categories: [{cat_list}]

Rules:
1. If the proposed category is EXACTLY the same or nearly identical in meaning (e.g. "food" = "Food"), return the EXACT existing category name.
2. If the proposed category is a SPECIFIC ITEM or DISTINCT concept that only loosely relates to an existing broad category, return a NEW clean specific name (e.g. "Chicken", "Petrol", "Groceries").
3. NEVER group specific items under broad categories (e.g. "Chicken" should NOT go under "Food").
4. Return ONLY the final category name. No explanation. No punctuation. Just the name.

Output:"""

        try:
            response = gemini_client.models.generate_content(
                model=GEMINI_MODEL,
                contents=[prompt],
                config=types.GenerateContentConfig(temperature=0.0),
            )
            result = response.text.strip().strip('"').strip("'")
            return result if result else proposed_name.strip().title()
        except Exception as e:
            print(f"Gemini semantic mapping error: {e}")
            return proposed_name.strip().title()

    def extract_receipt_data(self, image_data: bytes, mime_type: str = "image/jpeg", existing_categories: list = None):
        """
        Extracts structured bill details from an uploaded receipt/bill image using Gemini 2.5 Flash.
        Accepts existing_categories list to guide semantic category suggestion.
        """
        if not gemini_client:
            print("Gemini API Client is not initialized. Please verify GEMINI_API_KEY.")
            return None

        try:
            bill_image = Image.open(io.BytesIO(image_data))
        except Exception as e:
            print(f"Failed to open receipt image: {e}")
            return None

        if existing_categories:
            cat_list = ", ".join([f'"{c}"' for c in existing_categories])
            prompt = (
                f"Extract the vendor name, invoice date, total amount, and suggested category from this bill image. "
                f"For the category field, choose the EXACT name from this list if the meaning is identical: [{cat_list}]. "
                f"Only suggest a new specific category name if none of the existing ones match closely."
            )
        else:
            prompt = "Extract the vendor name, invoice date, total amount, and suggested category from this bill image."

        try:
            response = gemini_client.models.generate_content(
                model=GEMINI_MODEL,
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

            return {
                "amount": float(parsed_data.get("total_amount") or 0.0),
                "vendor": parsed_data.get("vendor_name") or "Unknown",
                "date": parsed_data.get("invoice_date") or "",
                "category": parsed_data.get("category") or "General"
            }
        except Exception as e:
            print(f"Gemini OCR Processing Error: {e}")
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
