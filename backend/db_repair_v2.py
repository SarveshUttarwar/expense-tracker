from app.database import get_db

db = get_db()
cursor = db.cursor(dictionary=True)

user_id = 3

print(f"--- REPAIRING DATA FOR USER {user_id} ---")

# 1. Get user 3's real categories
cursor.execute("SELECT id, name FROM categories WHERE user_id = %s", (user_id,))
user_cats = {c["name"].lower(): c["id"] for c in cursor.fetchall()}
print(f"Real Categories: {user_cats}")

# 2. Inspect all goals for user 3
cursor.execute("SELECT * FROM goals WHERE user_id = %s", (user_id,))
goals = cursor.fetchall()

for g in goals:
    gid = g["id"]
    cid = g["category_id"]
    
    # Check if this cid belongs to user 3
    cursor.execute("SELECT name, user_id FROM categories WHERE id = %s", (cid,))
    cat = cursor.fetchone()
    
    needs_fix = False
    cat_name = None
    
    if not cat:
        print(f"Goal {gid} points to non-existent Category {cid}")
        needs_fix = True
        # We don't know the name, so we can't easily fix it unless we look at legacy names or prompt user.
        # But we saw Category 1 was named 'Food' in previous audit.
        if cid == 1: cat_name = "Food"
    elif cat["user_id"] != user_id:
        print(f"Goal {gid} points to Category {cid} ('{cat['name']}') belonging to USER {cat['user_id']}!")
        needs_fix = True
        cat_name = cat["name"]
    else:
        print(f"Goal {gid} is OK (points to correct category '{cat['name']}')")
        
    if needs_fix and cat_name:
        lower_name = cat_name.lower()
        if lower_name in user_cats:
            correct_cid = user_cats[lower_name]
            print(f"REPAIRING: Moving Goal {gid} from Cat {cid} to Cat {correct_cid} ('{cat_name}')")
            cursor.execute("UPDATE goals SET category_id = %s WHERE id = %s", (correct_cid, gid))
        else:
            print(f"ERROR: No local category found for '{cat_name}'. Creating it...")
            cursor.execute("INSERT INTO categories (name, user_id) VALUES (%s, %s)", (cat_name.capitalize(), user_id))
            new_cid = cursor.lastrowid
            user_cats[lower_name] = new_cid
            cursor.execute("UPDATE goals SET category_id = %s WHERE id = %s", (new_cid, gid))

db.commit()
cursor.close()
db.close()
print("Repair finished")
