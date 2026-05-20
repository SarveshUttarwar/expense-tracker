from app.database import get_db

db = get_db()
cursor = db.cursor(dictionary=True)

user_id = 3

cursor.execute("SELECT * FROM categories WHERE user_id = %s", (user_id,))
print("--- ALL CATEGORIES FOR USER 3 ---")
for r in cursor.fetchall():
    print(r)

cursor.close()
db.close()
