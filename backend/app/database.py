import mysql.connector
from mysql.connector import pooling
import os
from dotenv import load_dotenv
from urllib.parse import urlparse
import logging

load_dotenv()

pool = None

DEFAULT_CATEGORIES = [
    "Food", "Transport", "Shopping", "Rent",
    "Entertainment", "Health", "Utilities", "Education"
]


def get_db_config():
    database_url = os.getenv("DATABASE_URL")
    if database_url:
        url = urlparse(database_url)
        return {
            "host": url.hostname,
            "user": url.username,
            "password": url.password,
            "database": url.path.lstrip("/"),
            "port": url.port or 3306,
            "ssl_disabled": False,
        }
    return {
        "host": os.getenv("DB_HOST"),
        "user": os.getenv("DB_USER"),
        "password": os.getenv("DB_PASSWORD"),
        "database": os.getenv("DB_NAME"),
        "port": 3306,
    }


def get_db():
    global pool
    if pool is None:
        pool = pooling.MySQLConnectionPool(
            pool_name="mypool",
            pool_size=5,
            **get_db_config()
        )
    return pool.get_connection()


def add_unique_constraint(cursor, table, constraint_name, definition):
    cursor.execute("""
        SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS 
        WHERE CONSTRAINT_SCHEMA = DATABASE() 
          AND CONSTRAINT_NAME = %s
    """, (constraint_name,))
    exists = cursor.fetchone()[0]
    if not exists:
        try:
            cursor.execute(f"ALTER TABLE {table} ADD CONSTRAINT {constraint_name} UNIQUE {definition}")
            logging.info(f"Added unique constraint {constraint_name} to {table}")
        except Exception as e:
            logging.error(f"Error adding unique constraint {constraint_name}: {e}")


def add_foreign_key(cursor, table, constraint_name, definition):
    cursor.execute("""
        SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS 
        WHERE CONSTRAINT_SCHEMA = DATABASE() 
          AND CONSTRAINT_NAME = %s
    """, (constraint_name,))
    exists = cursor.fetchone()[0]
    if not exists:
        try:
            cursor.execute(f"ALTER TABLE {table} ADD CONSTRAINT {constraint_name} FOREIGN KEY {definition}")
            logging.info(f"Added foreign key {constraint_name} to {table}")
        except Exception as e:
            logging.error(f"Error adding foreign key {constraint_name}: {e}")


def init_db():
    # Use a direct connection (NOT from pool) for startup init
    db = mysql.connector.connect(**get_db_config())
    cursor = db.cursor(dictionary=True)
    try:
        # Create core tables first (if they do not exist)
        cursor.execute("CREATE TABLE IF NOT EXISTS users (id INT AUTO_INCREMENT PRIMARY KEY, username VARCHAR(255) UNIQUE NOT NULL, password VARCHAR(255) NOT NULL)")
        cursor.execute("CREATE TABLE IF NOT EXISTS categories (id INT AUTO_INCREMENT PRIMARY KEY, name VARCHAR(255) NOT NULL, user_id INT, FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE)")
        cursor.execute("CREATE TABLE IF NOT EXISTS expenses (id INT AUTO_INCREMENT PRIMARY KEY, user_id INT NOT NULL, category_id INT, amount DECIMAL(10,2) NOT NULL, description TEXT, expense_date DATE NOT NULL, type VARCHAR(50) NOT NULL, is_recurring BOOLEAN DEFAULT FALSE, recurrence_interval VARCHAR(50), FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE, FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL)")
        cursor.execute("CREATE TABLE IF NOT EXISTS goals (id INT AUTO_INCREMENT PRIMARY KEY, user_id INT NOT NULL, category_id INT NOT NULL, monthly_goal DECIMAL(10,2) NOT NULL, month INT NOT NULL, year INT NOT NULL, FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE, FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE)")
        db.commit()

        # =====================================================
        # DATA DEDUPLICATION & MIGRATION BEFORE ADDING CONSTRAINTS
        # =====================================================

        # 1. Trim name spaces and Deduplicate Categories (keep first inserted, update referencing rows)
        cursor.execute("UPDATE categories SET name = TRIM(name)")
        db.commit()

        cursor.execute("""
            SELECT user_id, LOWER(name) as name_lower, MIN(id) as keep_id
            FROM categories
            GROUP BY user_id, LOWER(name)
            HAVING COUNT(*) > 1
        """)
        dup_cats = cursor.fetchall()
        for group in dup_cats:
            user_id = group['user_id']
            name_lower = group['name_lower']
            keep_id = group['keep_id']

            cursor.execute("""
                SELECT id FROM categories 
                WHERE user_id = %s AND LOWER(name) = %s AND id != %s
            """, (user_id, name_lower, keep_id))
            to_delete = [r['id'] for r in cursor.fetchall()]

            if to_delete:
                format_strings = ','.join(['%s'] * len(to_delete))
                # Point referencing expenses to keep_id
                cursor.execute(f"UPDATE expenses SET category_id = %s WHERE category_id IN ({format_strings})", [keep_id] + to_delete)
                # Point referencing goals to keep_id
                cursor.execute(f"UPDATE goals SET category_id = %s WHERE category_id IN ({format_strings})", [keep_id] + to_delete)
                # Delete duplicate categories
                cursor.execute(f"DELETE FROM categories WHERE id IN ({format_strings})", to_delete)
            
            # Format keep category name to clean Capitalized Proper Case
            cursor.execute("UPDATE categories SET name = %s WHERE id = %s", (name_lower.title(), keep_id))
        db.commit()

        # 2. Deduplicate Goals (keep latest goal/id for same user/category/month/year)
        cursor.execute("""
            SELECT user_id, category_id, month, year, MAX(id) as keep_id
            FROM goals
            GROUP BY user_id, category_id, month, year
            HAVING COUNT(*) > 1
        """)
        dup_goals = cursor.fetchall()
        for goal in dup_goals:
            user_id = goal['user_id']
            category_id = goal['category_id']
            month = goal['month']
            year = goal['year']
            keep_id = goal['keep_id']

            cursor.execute("""
                DELETE FROM goals 
                WHERE user_id = %s AND category_id = %s AND month = %s AND year = %s AND id != %s
            """, (user_id, category_id, month, year, keep_id))
        db.commit()

        # 3. Migrate and normalize all savings-related categories to "Savings" (case-insensitive)
        cursor.execute("SELECT id FROM users")
        user_list = [u['id'] for u in cursor.fetchall()]
        savings_keywords = [
            "saved", "saving", "savings", "mutual funds", "stocks", "bonds", 
            "fd", "fixed deposit", "sip", "investment", "investments", 
            "equity", "gold investment", "crypto", "retirement", "emergency fund"
        ]
        
        for u_id in user_list:
            # Check if "Savings" category exists for the user, if not create it
            cursor.execute("SELECT id FROM categories WHERE user_id = %s AND LOWER(name) = 'savings'", (u_id,))
            savings_row = cursor.fetchone()
            if savings_row:
                savings_cat_id = savings_row['id']
            else:
                cursor.execute("INSERT INTO categories (name, user_id) VALUES ('Savings', %s)", (u_id,))
                db.commit()
                savings_cat_id = cursor.lastrowid
                
            # Find all other categories matching savings keywords (excluding the main "Savings" category itself)
            format_strings = ','.join(['%s'] * len(savings_keywords))
            query_params = [u_id] + savings_keywords + [savings_cat_id]
            cursor.execute(f"""
                SELECT id FROM categories 
                WHERE user_id = %s AND LOWER(name) IN ({format_strings}) AND id != %s
            """, query_params)
            dup_cats = [r['id'] for r in cursor.fetchall()]
            
            if dup_cats:
                dup_format = ','.join(['%s'] * len(dup_cats))
                # Reassign expenses to "Savings"
                cursor.execute(f"UPDATE expenses SET category_id = %s WHERE category_id IN ({dup_format})", [savings_cat_id] + dup_cats)
                # Safely delete duplicate goals to avoid UNIQUE constraint violations
                cursor.execute(f"DELETE FROM goals WHERE category_id IN ({dup_format})", dup_cats)
                # Delete duplicate categories
                cursor.execute(f"DELETE FROM categories WHERE id IN ({dup_format})", dup_cats)
                db.commit()

        # =====================================================
        # ADD UNIQUE CONSTRAINTS AND FOREIGN KEYS
        # =====================================================
        
        # Switch back to non-dictionary tuple fetch for helper functions
        cursor.close()
        cursor = db.cursor()

        # Unique Constraints
        add_unique_constraint(cursor, "categories", "unique_user_category", "(user_id, name)")
        add_unique_constraint(cursor, "goals", "unique_goal_per_period", "(user_id, category_id, month, year)")

        # Foreign Key Constraints
        add_foreign_key(cursor, "expenses", "fk_expense_category", "(category_id) REFERENCES categories(id) ON DELETE SET NULL")
        add_foreign_key(cursor, "goals", "fk_goal_category", "(category_id) REFERENCES categories(id) ON DELETE CASCADE")
        db.commit()

        # Ensure default user exists (without seeding categories here)
        cursor.execute("SELECT id FROM users WHERE username='sarvesh18'")
        row = cursor.fetchone()
        if not row:
            cursor.execute("INSERT INTO users (username, password) VALUES ('sarvesh18', 'Nikisumu@18')")
            db.commit()

        logging.info("DB init complete.")
    except Exception as e:
        logging.error(f"DB init error: {e}")
    finally:
        cursor.close()
        db.close()