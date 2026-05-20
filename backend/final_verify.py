from app.database import get_db

db = get_db()
cursor = db.cursor(dictionary=True)

user_id = 3
month = 4
year = 2026

print(f"--- FINAL SUMMARY FOR USER {user_id} ---")

cursor.execute("""
    SELECT 
        c.name, 
        g.monthly_goal, 
        COALESCE(SUM(e.amount), 0) as actual_spent
    FROM goals g
    JOIN categories c ON g.category_id = c.id
    LEFT JOIN expenses e ON e.category_id = g.category_id AND e.user_id = g.user_id AND MONTH(e.expense_date) = %s AND YEAR(e.expense_date) = %s
    WHERE g.user_id = %s AND g.month = %s AND g.year = %s
    GROUP BY g.id
""", (month, year, user_id, month, year))

for r in cursor.fetchall():
    print(r)

cursor.close()
db.close()
