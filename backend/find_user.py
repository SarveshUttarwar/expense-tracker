from app.database import get_db

try:
    db = get_db()
    cursor = db.cursor(dictionary=True)

    cursor.execute("SELECT * FROM users WHERE id = 3")
    user = cursor.fetchone()

    if user:
        print("Login details found for User 3:")
        print(f"Username: {user['username']}")
        print(f"Password: {user['password']}")
    else:
        print("User 3 not found in database. Listing all users:")
        cursor.execute("SELECT * FROM users")
        for u in cursor.fetchall():
            print(u)

    cursor.close()
    db.close()
except Exception as e:
    print(f"Error: {e}")
