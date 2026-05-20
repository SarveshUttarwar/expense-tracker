from app.database import get_db

db = get_db()
cursor = db.cursor(dictionary=True)

user_id = 3
month = 4
year = 2026

with open("audit_v4.txt", "w", encoding="utf-8") as f:
    f.write("--- USER 3 CATEGORIES ---\n")
    cursor.execute("SELECT * FROM categories WHERE user_id = %s", (user_id,))
    for r in cursor.fetchall():
        f.write(f"{r}\n")

    f.write("\n--- USER 3 GOALS ---\n")
    cursor.execute("SELECT g.*, c.name FROM goals g LEFT JOIN categories c ON g.category_id = c.id WHERE g.user_id = %s", (user_id,))
    for r in cursor.fetchall():
        f.write(f"{r}\n")

    f.write("\n--- USER 3 EXPENSES (APRIL 2026) ---\n")
    cursor.execute("SELECT e.*, c.name FROM expenses e JOIN categories c ON e.category_id = c.id WHERE e.user_id = %s AND MONTH(e.expense_date) = %s AND YEAR(e.expense_date) = %s", (user_id, month, year))
    for r in cursor.fetchall():
        f.write(f"{r}\n")

cursor.close()
db.close()
print("Audit v4 done")
