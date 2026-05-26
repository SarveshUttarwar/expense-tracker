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
from datetime import datetime
from typing import Optional

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
def ai_parse_text(text: str, user_id: Optional[int] = Query(None)):
    res = ai_service.parse_nlp_expense(text, user_id)
    if not res:
        raise HTTPException(status_code=500, detail="AI failed to parse text")
    return res

@app.post("/ai/ocr")
async def ai_ocr_receipt(file: UploadFile = File(...), user_id: Optional[int] = Query(None)):
    # Validate file type
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(
            status_code=400,
            detail="Unsupported file format. Please upload a valid PNG, JPG, or JPEG image."
        )

    try:
        content = await file.read()
        if not content or len(content) == 0:
            raise HTTPException(
                status_code=400,
                detail="Empty file uploaded. Please upload a valid image."
            )

        # Fetch user categories for semantic OCR category matching
        existing_categories = None
        if user_id:
            try:
                cats = crud.get_categories(user_id)
                existing_categories = [c["name"] for c in cats] if cats else None
            except Exception:
                pass

        res = ai_service.extract_receipt_data(content, file.content_type, existing_categories=existing_categories)
        if not res:
            raise HTTPException(
                status_code=500,
                detail="AI failed to extract structured data from the receipt. Please ensure it is readable."
            )
        return res
    except HTTPException as he:
        raise he
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"OCR Service error: {str(e)}"
        )


@app.post("/search")
def search_expenses(query: SearchQuery):
    return crud.search_expenses(query.user_id, query.query)

# ===================== EXPORT ENDPOINTS =====================

@app.get("/expenses/export")
def export_expenses(user_id: int, format: str = "pdf"):
    expenses = crud.get_all_expenses_for_export(user_id)
    if not expenses:
        raise HTTPException(status_code=404, detail="No expenses found to export")

    date_stamp = datetime.now().strftime("%Y-%m-%d")

    if format == "excel":
        file_stream = generate_excel_report(expenses)
        filename = f"expenses_{date_stamp}.xlsx"
        return StreamingResponse(
            file_stream,
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={"Content-Disposition": f'attachment; filename="{filename}"'}
        )
    else:
        file_stream = generate_pdf_report(expenses)
        filename = f"expenses_{date_stamp}.pdf"
        return StreamingResponse(
            file_stream,
            media_type="application/pdf",
            headers={"Content-Disposition": f'attachment; filename="{filename}"'}
        )