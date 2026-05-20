from pydantic import BaseModel
from datetime import date
from typing import Optional, List

class LoginRequest(BaseModel):
    username: str
    password: str

class ExpenseCreate(BaseModel):
    user_id: int
    category_id: Optional[int] = None
    amount: float
    description: Optional[str] = None
    expense_date: date
    type: str  # expense | saving
    is_recurring: Optional[bool] = False
    recurrence_interval: Optional[str] = None # monthly, weekly, yearly

class GoalCreate(BaseModel):
    user_id: int
    category_id: int
    monthly_goal: float
    month: int
    year: int

class SearchQuery(BaseModel):
    user_id: int
    query: str

