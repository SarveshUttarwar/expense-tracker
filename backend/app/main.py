from fastapi import FastAPI, HTTPException, UploadFile, File, Query, Response
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from app.schemas import GoalCreate, LoginRequest, ExpenseCreate, SearchQuery
from app import crud
from app.ai_service import ai_service
from app.exporter import generate_excel_report, generate_pdf_report
from app.database import init_db
import os
import io

app = FastAPI()

@app.on_event("startup")
def startup_event():
    init_db()

# ===================== CORS =====================
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ===================== HEALTH CHECK =====================
@app.get("/")
def health_check():
    return {"status": "ok", "message": "Expense Tracker API is running"}

# ===================== ROUTES =====================

@app.post("/login")
def login(data: LoginRequest):
    user = crud.authenticate_user(data.username, data.password)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    return user


@app.post("/signup")
def signup(data: LoginRequest):
    user = crud.create_user(data.username, data.password)
    if not user:
        raise HTTPException(status_code=400, detail="Username already registered")
    return user


@app.post("/reset-password")
def reset_password(data: LoginRequest):
    success = crud.reset_password(data.username, data.password)
    if not success:
        raise HTTPException(status_code=404, detail="User not found")
    return {"message": "Password reset successful"}


@app.post("/expenses")
def add_expense(expense: ExpenseCreate):
    crud.create_expense(expense)
    return {"message": "Expense added successfully"}

@app.get("/expenses")
def list_expenses(user_id: int):
    return crud.get_expenses(user_id)

@app.post("/goals")
def save_goal(goal: GoalCreate):
    crud.upsert_goal(goal)
    return {"message": "Goal saved"}

@app.post("/categories")
def create_category(user_id: int, name: str):
    category_id = crud.create_category_if_not_exists(user_id, name)
    return {"id": category_id, "name": name}

@app.get("/goals/summary")
def goals_summary(user_id: int, month: int, year: int):
    return crud.get_goals_summary(user_id, month, year)

@app.get("/categories")
def list_categories(user_id: int):
    cats = crud.get_categories(user_id)
    if not cats:
        # User has no categories yet — seed defaults now
        crud.seed_categories_for_user(user_id)
        cats = crud.get_categories(user_id)
    return cats


@app.delete("/categories/{category_id}")
def remove_category(category_id: int, user_id: int):
    crud.delete_category(category_id, user_id)
    return {"message": "Category deleted"}

@app.get("/analytics/categories")
def categories_analytics(user_id: int, month: int, year: int):
    return crud.category_analytics(user_id, month, year)

@app.get("/analytics/dashboard")
def dashboard_analytics(user_id: int, month: int, year: int):
    return crud.dashboard_summary(user_id, month, year)

from fastapi import Query

@app.delete("/expenses/{expense_id}")
def delete_expense(expense_id: int, user_id: int = Query(...)):
    crud.delete_expense(expense_id, user_id)
    return {"message": "Transaction deleted"}

@app.delete("/goals/{goal_id}")
def delete_goal(goal_id: int, user_id: int = Query(...)):
    crud.delete_goal(goal_id, user_id)
    return {"message": "Goal deleted"}

# ===================== AI ENDPOINTS =====================

@app.post("/ai/parse")
def ai_parse_text(text: str):
    res = ai_service.parse_nlp_expense(text)
    if not res:
        raise HTTPException(status_code=500, detail="AI failed to parse text")
    return res

@app.post("/ai/ocr")
async def ai_ocr_receipt(file: UploadFile = File(...)):
    content = await file.read()
    res = ai_service.extract_receipt_data(content, file.content_type)
    if not res:
        raise HTTPException(status_code=500, detail="AI failed to process receipt")
    return res

@app.post("/search")
def search_expenses(query: SearchQuery):
    return crud.search_expenses(query.user_id, query.query)

# ===================== EXPORT ENDPOINTS =====================

@app.get("/expenses/export")
def export_expenses(user_id: int, format: str = "pdf"):
    expenses = crud.get_all_expenses_for_export(user_id)
    if not expenses:
        raise HTTPException(status_code=404, detail="No expenses found to export")
    
    if format == "excel":
        file_stream = generate_excel_report(expenses)
        return StreamingResponse(
            file_stream, 
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={"Content-Disposition": "attachment; filename=expenses.xlsx"}
        )
    else:
        file_stream = generate_pdf_report(expenses)
        return StreamingResponse(
            file_stream,
            media_type="application/pdf",
            headers={"Content-Disposition": "attachment; filename=expenses.pdf"}
        )