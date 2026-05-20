from app.database import get_db

db = get_db()
cursor = db.cursor(dictionary=True)

user_id = 3
month = 4
year = 2026

print(f"--- DATA FOR USER {user_id}, {month}/{year} ---")

cursor.execute("""
    SELECT type, category_id, COUNT(*) as count, SUM(amount) as total
    FROM expenses 
    WHERE user_id = %s AND MONTH(expense_date) = %s AND YEAR(expense_date) = %s
    GROUP BY type, category_id
""", (user_id, month, year))
print("Expenses Summary:")
for r in cursor.fetchall():
    print(r)

print("\nGoals in DB:")
cursor.execute("SELECT * FROM goals WHERE user_id = %s AND month = %s AND year = %s", (user_id, month, year))
for r in cursor.fetchall():
    print(r)

cursor.close()
db.close()
