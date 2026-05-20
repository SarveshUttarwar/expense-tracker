from app.database import get_db

db = get_db()
cursor = db.cursor(dictionary=True)

cursor.execute("SELECT * FROM users")
users = cursor.fetchall()

print("Users in database:")
for user in users:
    print(user)

cursor.close()
db.close()
