from app.database import get_db

db = get_db()
cursor = db.cursor(dictionary=True)

print("--- RECENT EXPENSES ---")
cursor.execute("SELECT * FROM expenses ORDER BY id DESC LIMIT 5")
for r in cursor.fetchall():
    print(r)

print("\n--- CATEGORIES ---")
cursor.execute("SELECT * FROM categories")
for r in cursor.fetchall():
    print(r)

print("\n--- GOALS ---")
cursor.execute("SELECT * FROM goals")
for r in cursor.fetchall():
    print(r)

cursor.close()
db.close()
