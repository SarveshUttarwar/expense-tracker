from app.database import get_db
import json

db = get_db()
cursor = db.cursor(dictionary=True)

user_id = 3

with open("full_audit.txt", "w", encoding="utf-8") as f:
    f.write("--- CATEGORIES ---\n")
    cursor.execute("SELECT * FROM categories WHERE user_id = %s", (user_id,))
    for r in cursor.fetchall():
        f.write(f"{r}\n")

    f.write("\n--- GOALS (April 2026) ---\n")
    cursor.execute("SELECT g.*, c.name as category_name FROM goals g JOIN categories c ON g.category_id = c.id WHERE g.user_id = %s AND g.month = 4 AND g.year = 2026", (user_id,))
    for r in cursor.fetchall():
        f.write(f"{r}\n")

    f.write("\n--- EXPENSES (April 2026) ---\n")
    cursor.execute("SELECT e.*, c.name as category_name FROM expenses e JOIN categories c ON e.category_id = c.id WHERE e.user_id = %s AND MONTH(e.expense_date) = 4 AND YEAR(e.expense_date) = 2026", (user_id,))
    for r in cursor.fetchall():
        f.write(f"{r}\n")

cursor.close()
db.close()
print("Audit complete")
