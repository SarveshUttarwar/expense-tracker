from app.database import get_db, DEFAULT_CATEGORIES


def seed_categories_for_user(user_id):
    db = None
    cursor = None
    try:
        db = get_db()
        cursor = db.cursor(dictionary=True)
        for name in DEFAULT_CATEGORIES:
            cursor.execute("SELECT id FROM categories WHERE LOWER(name)=LOWER(%s) AND user_id=%s", (name, user_id))
            if not cursor.fetchone():
                cursor.execute("INSERT INTO categories (name, user_id) VALUES (%s, %s)", (name, user_id))
        db.commit()
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
        db.commit()
        user_id = cursor.lastrowid

        # Seed default categories for the new user (same connection, no leak)
        for name in DEFAULT_CATEGORIES:
            cursor.execute(
                "SELECT id FROM categories WHERE LOWER(name)=LOWER(%s) AND user_id=%s",
                (name, user_id),
            )
            if not cursor.fetchone():
                cursor.execute(
                    "INSERT INTO categories (name, user_id) VALUES (%s, %s)",
                    (name, user_id),
                )
        db.commit()

        return {"id": user_id, "username": username}
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

        cursor.execute(
            "SELECT id FROM categories WHERE LOWER(name)=LOWER(%s) AND user_id=%s",
            (name, user_id),
        )
        category = cursor.fetchone()

        if category:
            return category["id"]

        display_name = name.capitalize()

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


def get_goals_summary(user_id, month, year):
    db = None
    cursor = None
    try:
        db = get_db()
        cursor = db.cursor(dictionary=True)

        # Robust join by matching lowercase category names rather than IDs
        # This fixes any category ID mismatch issues between legacy/seeding data.
        cursor.execute(
            """
            SELECT
                c_goal.name AS category,
                g.monthly_goal AS goal,
                COALESCE(SUM(
                    CASE 
                        WHEN LOWER(c_expense.name) = LOWER(c_goal.name) THEN e.amount 
                        ELSE 0 
                    END
                ), 0) AS spent
            FROM goals g
            JOIN categories c_goal ON g.category_id = c_goal.id
            LEFT JOIN expenses e
              ON e.user_id = g.user_id
             AND LOWER(e.type) = 'expense'
             AND MONTH(e.expense_date) = g.month
             AND YEAR(e.expense_date) = g.year
            LEFT JOIN categories c_expense ON e.category_id = c_expense.id
            WHERE g.user_id = %s
              AND g.month = %s
              AND g.year = %s
            GROUP BY g.id, c_goal.name, g.monthly_goal
            """,
            (user_id, month, year),
        )
        return cursor.fetchall()
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
            GROUP BY c.id
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

def dashboard_summary(user_id, month, year):
    db = None
    cursor = None
    try:
        db = get_db()
        cursor = db.cursor(dictionary=True)

        prev_month = month - 1 if month > 1 else 12
        prev_year = year if month > 1 else year - 1

        cursor.execute(
            """
            SELECT
                c.name AS category,
                SUM(CASE WHEN MONTH(e.expense_date) = %s AND YEAR(e.expense_date) = %s THEN e.amount ELSE 0 END) AS current_total,
                SUM(CASE WHEN MONTH(e.expense_date) = %s AND YEAR(e.expense_date) = %s THEN e.amount ELSE 0 END) AS prev_total
            FROM expenses e
            JOIN categories c ON e.category_id = c.id
            WHERE e.user_id = %s AND LOWER(e.type) = 'expense'
            AND (
                (MONTH(e.expense_date) = %s AND YEAR(e.expense_date) = %s) OR
                (MONTH(e.expense_date) = %s AND YEAR(e.expense_date) = %s)
            )
            GROUP BY c.id
            HAVING current_total > 0 OR prev_total > 0
            """,
            (month, year, prev_month, prev_year, user_id, month, year, prev_month, prev_year),
        )
        combined_expenses = cursor.fetchall()

        current = [{"category": r["category"], "total": r["current_total"]} for r in combined_expenses if r["current_total"] > 0]
        previous = [{"category": r["category"], "total": r["prev_total"]} for r in combined_expenses if r["prev_total"] > 0]

        cursor.execute(
            """
            SELECT
                SUM(CASE WHEN MONTH(expense_date) = %s AND YEAR(expense_date) = %s THEN amount ELSE 0 END) AS savings_current,
                SUM(CASE WHEN MONTH(expense_date) = %s AND YEAR(expense_date) = %s THEN amount ELSE 0 END) AS savings_previous
            FROM expenses
            WHERE user_id = %s AND LOWER(type) = 'saving'
            """,
            (month, year, prev_month, prev_year, user_id),
        )
        savings_data = cursor.fetchone()

        return {
            "current": current,
            "previous": previous,
            "savings_current": savings_data["savings_current"] or 0,
            "savings_previous": savings_data["savings_previous"] or 0,
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