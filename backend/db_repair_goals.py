from app.database import get_db

db = get_db()
cursor = db.cursor(dictionary=True)

user_id = 3

# 1. Get all categories for user 3
cursor.execute("SELECT id, name FROM categories WHERE user_id = %s", (user_id,))
cats = cursor.fetchall()
name_to_id = {c["name"].lower(): c["id"] for c in cats}

print(f"User 3 categories: {name_to_id}")

# 2. Get all goals for user 3
cursor.execute("SELECT g.id, g.category_id, c.name FROM goals g LEFT JOIN categories c ON g.category_id = c.id WHERE g.user_id = %s", (user_id,))
goals = cursor.fetchall()

for g in goals:
    goal_id = g["id"]
    current_cat_id = g["category_id"]
    cat_name = g["name"]
    
    # If cat_name is None, it means category_id is invalid
    if cat_name is None:
         # Try to find what it SHOULD have been
         # We need to look up by category_id 1 in the WHOLE table to see the name
         cursor.execute("SELECT name FROM categories WHERE id = %s", (current_cat_id,))
         res = cursor.fetchone()
         if res:
             cat_name = res["name"]
             print(f"Goal {goal_id} was pointing to '{cat_name}'({current_cat_id}) which is not user 3's.")
         else:
             print(f"Goal {goal_id} was pointing to non-existent ID {current_cat_id}")
             continue

    lower_name = cat_name.lower()
    if lower_name in name_to_id:
        correct_id = name_to_id[lower_name]
        if correct_id != current_cat_id:
            print(f"Repairing Goal {goal_id}: changing category_id {current_cat_id} -> {correct_id} ({lower_name})")
            cursor.execute("UPDATE goals SET category_id = %s WHERE id = %s", (correct_id, goal_id))
    else:
        # Category doesn't exist for user 3, create it
        from app.crud import create_category_if_not_exists
        # actually I'll just do it here to avoid import issues in this script
        print(f"Creating missing category '{cat_name}' for user 3")
        cursor.execute("INSERT INTO categories (name, user_id) VALUES (%s, %s)", (cat_name.capitalize(), user_id))
        new_id = cursor.lastrowid
        cursor.execute("UPDATE goals SET category_id = %s WHERE id = %s", (new_id, goal_id))
        name_to_id[lower_name] = new_id

db.commit()
cursor.close()
db.close()
print("Repair complete")
