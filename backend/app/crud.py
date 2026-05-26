from app.database import get_db, DEFAULT_CATEGORIES
from app.ai_service import ai_service


def seed_categories_for_user(user_id):
    db = None
    cursor = None
    try:
        db = get_db()
        db.start_transaction()
        cursor = db.cursor(dictionary=True)
        for name in DEFAULT_CATEGORIES:
            cursor.execute("SELECT id FROM categories WHERE LOWER(name)=LOWER(%s) AND user_id=%s", (name, user_id))
            if not cursor.fetchone():
                cursor.execute("INSERT INTO categories (name, user_id) VALUES (%s, %s)", (name, user_id))
        db.commit()
    except Exception as e:
        if db:
            db.rollback()
        raise e
    finally:
        if cursor:
            cursor.close()
        if db:
            db.close()


# =====================================================
# AUTH
# =====================================================

def authenticate_user(username, password):
    db = None
    cursor = None
    try:
        db = get_db()
        cursor = db.cursor(dictionary=True)
        cursor.execute(
            "SELECT id, username FROM users WHERE username=%s AND password=%s",
            (username, password),
        )
        return cursor.fetchone()
    finally:
        if cursor:
            cursor.close()
        if db:
            db.close()


def create_user(username, password):
    db = None
    cursor = None
    try:
        db = get_db()
        db.start_transaction()
        cursor = db.cursor(dictionary=True)

        # Check if username already exists
        cursor.execute("SELECT id FROM users WHERE username=%s", (username,))
        existing = cursor.fetchone()
        if existing:
            return None

        # Insert user
        cursor.execute(
            "INSERT INTO users (username, password) VALUES (%s, %s)",
            (username, password),
        )
        user_id = cursor.lastrowid

        # Seed default categories for the new user (same transaction)
        for name in DEFAULT_CATEGORIES:
            cursor.execute(
                "INSERT INTO categories (name, user_id) VALUES (%s, %s)",
                (name, user_id),
            )
        db.commit()

        return {"id": user_id, "username": username}
    except Exception as e:
        if db:
            db.rollback()
        raise e
    finally:
        if cursor:
            cursor.close()
        if db:
            db.close()


def reset_password(username, new_password):
    db = None
    cursor = None
    try:
        db = get_db()
        cursor = db.cursor(dictionary=True)

        cursor.execute("SELECT id FROM users WHERE username=%s", (username,))
        user = cursor.fetchone()
        if not user:
            return False

        cursor.execute(
            "UPDATE users SET password=%s WHERE username=%s",
            (new_password, username),
        )
        db.commit()
        return True
    finally:
        if cursor:
            cursor.close()
        if db:
            db.close()


# =====================================================
# EXPENSES & SAVINGS
# =====================================================

def create_expense(expense):
    db = None
    cursor = None
    try:
        db = get_db()
        cursor = db.cursor()

        cursor.execute(
            """
            INSERT INTO expenses
            (user_id, category_id, amount, description, expense_date, type, is_recurring, recurrence_interval)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
            """,
            (
                expense.user_id,
                expense.category_id,
                expense.amount,
                expense.description,
                expense.expense_date,
                expense.type,
                expense.is_recurring,
                expense.recurrence_interval,
            ),
        )
        db.commit()
    finally:
        if cursor:
            cursor.close()
        if db:
            db.close()


def get_expenses(user_id):
    db = None
    cursor = None
    try:
        db = get_db()
        cursor = db.cursor(dictionary=True)

        cursor.execute(
            """
            SELECT
                e.id,
                e.expense_date,
                e.type,
                e.amount,
                e.description,
                c.name AS category
            FROM expenses e
            LEFT JOIN categories c ON e.category_id = c.id
            WHERE e.user_id = %s
            ORDER BY e.expense_date DESC
            """,
            (user_id,),
        )
        return cursor.fetchall()
    finally:
        if cursor:
            cursor.close()
        if db:
            db.close()


# =====================================================
# CATEGORIES
# =====================================================

def create_category_if_not_exists(user_id, name):
    db = None
    cursor = None
    try:
        db = get_db()
        cursor = db.cursor(dictionary=True)

        name = name.strip()

        # 1. Fetch all existing categories for this user
        cursor.execute(
            "SELECT id, name FROM categories WHERE user_id=%s",
            (user_id,),
        )
        existing = cursor.fetchall()
        existing_names = [row["name"] for row in existing]

        # 2. Use AI semantic matching to decide: reuse existing or create new
        resolved_name = ai_service.map_proposed_category(name, existing_names)

        # 3. Check if the resolved name already exists (case-insensitive)
        cursor.execute(
            "SELECT id FROM categories WHERE LOWER(name)=LOWER(%s) AND user_id=%s",
            (resolved_name, user_id),
        )
        category = cursor.fetchone()

        if category:
            return category["id"]

        # 4. Create new category with the resolved specific name
        display_name = resolved_name.strip()

        cursor.execute(
            "INSERT INTO categories (name, user_id) VALUES (%s, %s)",
            (display_name, user_id),
        )
        db.commit()
        return cursor.lastrowid
    finally:
        if cursor:
            cursor.close()
        if db:
            db.close()


def get_categories(user_id):
    db = None
    cursor = None
    try:
        db = get_db()
        cursor = db.cursor(dictionary=True)

        cursor.execute(
            "SELECT id, name FROM categories WHERE user_id=%s ORDER BY name",
            (user_id,),
        )
        return cursor.fetchall()
    finally:
        if cursor:
            cursor.close()
        if db:
            db.close()


def delete_category(category_id, user_id):
    db = None
    cursor = None
    try:
        db = get_db()
        cursor = db.cursor()

        cursor.execute(
            "DELETE FROM categories WHERE id=%s AND user_id=%s",
            (category_id, user_id),
        )
        db.commit()
    finally:
        if cursor:
            cursor.close()
        if db:
            db.close()


# =====================================================
# GOALS
# =====================================================

def upsert_goal(data):
    db = None
    cursor = None
    try:
        db = get_db()
        cursor = db.cursor()

        cursor.execute(
            """
            INSERT INTO goals (user_id, category_id, monthly_goal, month, year)
            VALUES (%s, %s, %s, %s, %s)
            ON DUPLICATE KEY UPDATE
                monthly_goal = VALUES(monthly_goal)
            """,
            (
                data.user_id,
                data.category_id,
                data.monthly_goal,
                data.month,
                data.year,
            ),
        )
        db.commit()
    finally:
        if cursor:
            cursor.close()
        if db:
            db.close()


def delete_goal(goal_id, user_id):
    db = None
    cursor = None
    try:
        db = get_db()
        cursor = db.cursor()
        cursor.execute(
            "DELETE FROM goals WHERE id = %s AND user_id = %s",
            (goal_id, user_id),
        )
        db.commit()
    finally:
        if cursor:
            cursor.close()
        if db:
            db.close()


def get_goals_summary(user_id, month, year):
    db = None
    cursor = None
    try:
        db = get_db()
        cursor = db.cursor(dictionary=True)

        cursor.execute(
            """
            SELECT
                g.id,
                g.user_id,
                g.category_id,
                c.name AS category_name,
                g.monthly_goal,
                COALESCE(SUM(e.amount), 0) AS spent
            FROM goals g
            JOIN categories c ON g.category_id = c.id
            LEFT JOIN expenses e
              ON g.user_id = e.user_id
             AND MONTH(e.expense_date) = g.month
             AND YEAR(e.expense_date) = g.year
             AND (
               (LOWER(c.name) IN ('savings', 'saving') AND LOWER(e.type) = 'saving')
               OR
               (LOWER(c.name) NOT IN ('savings', 'saving') AND g.category_id = e.category_id AND LOWER(e.type) = 'expense')
             )
            WHERE g.user_id = %s
              AND g.month = %s
              AND g.year = %s
            GROUP BY g.id, g.user_id, g.category_id, c.name, g.monthly_goal
            """,
            (user_id, month, year),
        )
        data = cursor.fetchall()
        
        normalized_data = []
        for r in data:
            monthly_goal = float(r["monthly_goal"])
            spent = float(r["spent"])
            remaining = monthly_goal - spent
            progress_percent = min((spent / monthly_goal) * 100, 100) if monthly_goal > 0 else 0
            
            normalized_data.append({
                "id": r["id"],
                "category_id": r["category_id"],
                "category_name": r["category_name"],
                "category": r["category_name"],  # Legacy compatibility
                "monthly_goal": monthly_goal,
                "goal": monthly_goal,            # Legacy compatibility
                "spent": spent,
                "remaining": remaining,
                "progress_percent": progress_percent
            })
            
        return normalized_data
    finally:
        if cursor:
            cursor.close()
        if db:
            db.close()


# =====================================================
# CATEGORY ANALYTICS
# =====================================================

def category_analytics(user_id, month, year):
    db = None
    cursor = None
    try:
        db = get_db()
        cursor = db.cursor(dictionary=True)

        cursor.execute(
            """
            SELECT c.name AS category, SUM(e.amount) AS total
            FROM expenses e
            JOIN categories c ON e.category_id = c.id
            WHERE e.user_id = %s AND LOWER(e.type) = 'expense'
              AND MONTH(e.expense_date) = %s AND YEAR(e.expense_date) = %s
            GROUP BY c.id, c.name
            ORDER BY total DESC
            """,
            (user_id, month, year),
        )
        categories = cursor.fetchall()

        cursor.execute(
            """
            SELECT COALESCE(SUM(amount),0) AS total
            FROM expenses
            WHERE user_id=%s AND LOWER(type)='saving'
              AND MONTH(expense_date)=%s AND YEAR(expense_date)=%s
            """,
            (user_id, month, year),
        )
        savings = cursor.fetchone()["total"]

        return {
            "categories": categories,
            "savings": savings,
        }
    finally:
        if cursor:
            cursor.close()
        if db:
            db.close()


# =====================================================
# DASHBOARD SUMMARY
# =====================================================

def dashboard_summary(user_id, month=None, year=None, start_date=None, end_date=None, category_id=None):
    from datetime import datetime, date, timedelta
    db = None
    cursor = None
    try:
        db = get_db()
        cursor = db.cursor(dictionary=True)

        # 1. Determine Current and Previous date ranges
        if start_date and end_date:
            cur_start = datetime.strptime(start_date, "%Y-%m-%d").date()
            cur_end = datetime.strptime(end_date, "%Y-%m-%d").date()
            delta = cur_end - cur_start
            prev_end = cur_start - timedelta(days=1)
            prev_start = prev_end - delta
        else:
            if not month or not year:
                now = datetime.now()
                month = now.month
                year = now.year
            cur_start = date(year, month, 1)
            if month == 12:
                cur_end = date(year, month, 31)
            else:
                cur_end = date(year, month + 1, 1) - timedelta(days=1)
            
            prev_month = month - 1 if month > 1 else 12
            prev_year = year if month > 1 else year - 1
            prev_start = date(prev_year, prev_month, 1)
            if prev_month == 12:
                prev_end = date(prev_year, prev_month, 31)
            else:
                prev_end = date(prev_year, prev_month + 1, 1) - timedelta(days=1)

        # 2. Build Category Filters
        cat_filter_sql = ""
        cat_filter_params = []
        is_savings_category = False
        if category_id:
            cursor.execute("SELECT name FROM categories WHERE id = %s", (category_id,))
            cat_row = cursor.fetchone()
            if cat_row:
                cat_name = cat_row["name"].lower()
                if cat_name in ("saving", "savings"):
                    is_savings_category = True
            
            if is_savings_category:
                # If filtered by savings category, return no expenses (since savings aren't expenses)
                cat_filter_sql = "AND e.category_id = -1"
            else:
                cat_filter_sql = "AND e.category_id = %s"
                cat_filter_params = [category_id]

        # Use LEFT JOIN categories to ensure uncategorized items (category_id = NULL) are included
        query = f"""
            SELECT
                COALESCE(c.name, 'Uncategorized') AS category,
                SUM(CASE WHEN e.expense_date BETWEEN %s AND %s THEN e.amount ELSE 0 END) AS current_total,
                SUM(CASE WHEN e.expense_date BETWEEN %s AND %s THEN e.amount ELSE 0 END) AS prev_total
            FROM expenses e
            LEFT JOIN categories c ON e.category_id = c.id
            WHERE e.user_id = %s AND LOWER(e.type) = 'expense' {cat_filter_sql}
            AND (
                (e.expense_date BETWEEN %s AND %s) OR
                (e.expense_date BETWEEN %s AND %s)
            )
            GROUP BY COALESCE(c.name, 'Uncategorized')
        """
        params = [cur_start, cur_end, prev_start, prev_end, user_id] + cat_filter_params + [cur_start, cur_end, prev_start, prev_end]
        cursor.execute(query, tuple(params))
        combined_expenses = cursor.fetchall()

        current = [{"category": r["category"], "total": float(r["current_total"] or 0)} for r in combined_expenses if r["current_total"] > 0]
        previous = [{"category": r["category"], "total": float(r["prev_total"] or 0)} for r in combined_expenses if r["prev_total"] > 0]

        # 3. Fetch savings for current and previous period
        if category_id:
            if is_savings_category:
                savings_filter_sql = ""
                savings_filter_params = []
            else:
                savings_filter_sql = "AND 1=0"
                savings_filter_params = []
        else:
            savings_filter_sql = ""
            savings_filter_params = []

        savings_query = f"""
            SELECT
                SUM(CASE WHEN expense_date BETWEEN %s AND %s THEN amount ELSE 0 END) AS savings_current,
                SUM(CASE WHEN expense_date BETWEEN %s AND %s THEN amount ELSE 0 END) AS savings_previous
            FROM expenses
            WHERE user_id = %s AND LOWER(type) = 'saving' {savings_filter_sql}
        """
        savings_params = [cur_start, cur_end, prev_start, prev_end, user_id] + savings_filter_params
        cursor.execute(savings_query, tuple(savings_params))
        savings_data = cursor.fetchone()

        return {
            "current": current,
            "previous": previous,
            "savings_current": float(savings_data["savings_current"] or 0) if savings_data else 0.0,
            "savings_previous": float(savings_data["savings_previous"] or 0) if savings_data else 0.0,
        }
    finally:
        if cursor:
            cursor.close()
        if db:
            db.close()


def delete_expense(expense_id, user_id):
    db = None
    cursor = None
    try:
        db = get_db()
        cursor = db.cursor()

        cursor.execute(
            "DELETE FROM expenses WHERE id = %s AND user_id = %s",
            (expense_id, user_id),
        )
        db.commit()
    finally:
        if cursor:
            cursor.close()
        if db:
            db.close()


def search_expenses(user_id, query):
    db = None
    cursor = None
    try:
        db = get_db()
        cursor = db.cursor(dictionary=True)

        cursor.execute(
            """
            SELECT
                e.id, e.expense_date, e.type, e.amount, e.description, c.name as category
            FROM expenses e
            LEFT JOIN categories c ON e.category_id = c.id
            WHERE e.user_id = %s AND (e.description LIKE %s OR c.name LIKE %s)
            ORDER BY e.expense_date DESC
            """,
            (user_id, f"%{query}%", f"%{query}%"),
        )
        return cursor.fetchall()
    finally:
        if cursor:
            cursor.close()
        if db:
            db.close()


def get_all_expenses_for_export(user_id):
    db = None
    cursor = None
    try:
        db = get_db()
        cursor = db.cursor(dictionary=True)

        cursor.execute(
            """
            SELECT
                e.expense_date as Date,
                e.type as Type,
                c.name as Category,
                e.amount as Amount,
                e.description as Description
            FROM expenses e
            LEFT JOIN categories c ON e.category_id = c.id
            WHERE e.user_id = %s
            ORDER BY e.expense_date ASC
            """,
            (user_id,),
        )
        return cursor.fetchall()
    finally:
        if cursor:
            cursor.close()
        if db:
            db.close()