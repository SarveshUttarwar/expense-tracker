from app.database import get_db
import json

db = get_db()
cursor = db.cursor(dictionary=True)

user_id = 3
month = 4
year = 2026

output = []
output.append(f"--- DATA FOR USER {user_id}, {month}/{year} ---")

cursor.execute("""
    SELECT type, category_id, COUNT(*) as count, SUM(amount) as total
    FROM expenses 
    WHERE user_id = %s AND MONTH(expense_date) = %s AND YEAR(expense_date) = %s
    GROUP BY type, category_id
""", (user_id, month, year))

output.append("Expenses Summary:")
for r in cursor.fetchall():
    output.append(str(r))

output.append("\nGoals in DB:")
cursor.execute("""
    SELECT g.*, c.name as category_name 
    FROM goals g 
    JOIN categories c ON g.category_id = c.id 
    WHERE g.user_id = %s AND g.month = %s AND g.year = %s
""", (user_id, month, year))
for r in cursor.fetchall():
    output.append(str(r))

with open("db_output.txt", "w", encoding="utf-8") as f:
    f.write("\n".join(output))

cursor.close()
db.close()
print("Done")
