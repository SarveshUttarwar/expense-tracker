from app.database import get_db

db = get_db()
cursor = db.cursor()

user_id = 3

# 1. Merge "food" into "Food"
# Find Category ID for "food" and "Food"
cursor.execute("SELECT id, name FROM categories WHERE user_id = %s", (user_id,))
cats = cursor.fetchall()

food_id_upper = None
food_id_lower = None

for cid, name in cats:
    if name == "Food": food_id_upper = cid
    if name == "food": food_id_lower = cid

if food_id_upper and food_id_lower:
    print(f"Merging 'food'({food_id_lower}) into 'Food'({food_id_upper})")
    cursor.execute("UPDATE expenses SET category_id = %s WHERE category_id = %s AND user_id = %s", (food_id_upper, food_id_lower, user_id))
    cursor.execute("UPDATE goals SET category_id = %s WHERE category_id = %s AND user_id = %s", (food_id_upper, food_id_lower, user_id))
    cursor.execute("DELETE FROM categories WHERE id = %s", (food_id_lower,))

# 2. Normalize other names to capitalized and delete case-duplicates
cursor.execute("SELECT id, name FROM categories WHERE user_id = %s", (user_id,))
cats = cursor.fetchall()
seen = {} # lower_name -> id

for cid, name in cats:
    lower = name.lower()
    if lower in seen:
        target_id = seen[lower]
        print(f"Deleting duplicate category '{name}'({cid}) and merging into {target_id}")
        cursor.execute("UPDATE expenses SET category_id = %s WHERE category_id = %s AND user_id = %s", (target_id, cid, user_id))
        cursor.execute("UPDATE goals SET category_id = %s WHERE category_id = %s AND user_id = %s", (target_id, cid, user_id))
        cursor.execute("DELETE FROM categories WHERE id = %s", (cid,))
    else:
        seen[lower] = cid
        # Capitalize the name
        new_name = name.capitalize()
        if new_name != name:
            cursor.execute("UPDATE categories SET name = %s WHERE id = %s", (new_name, cid))

db.commit()
cursor.close()
db.close()
print("Cleanup complete")
