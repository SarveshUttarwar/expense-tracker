import mysql.connector
from mysql.connector import pooling
import os
from dotenv import load_dotenv

load_dotenv()

from urllib.parse import urlparse
import logging

pool = None

DEFAULT_CATEGORIES = [
    "Food", "Transport", "Shopping", "Rent",
    "Entertainment", "Health", "Utilities", "Education"
]

def get_db_config():
    db_config = {}
    database_url = os.getenv("DATABASE_URL")
    if database_url:
        url = urlparse(database_url)
        db_config = {
            "host": url.hostname,
            "user": url.username,
            "password": url.password,
            "database": url.path.lstrip("/"),
            "port": url.port or 3306,
            "ssl_disabled": False
        }
    else:
        db_config = {
            "host": os.getenv("DB_HOST"),
            "user": os.getenv("DB_USER"),
            "password": os.getenv("DB_PASSWORD"),
            "database": os.getenv("DB_NAME"),
            "port": 3306
        }
    return db_config

def get_db():
    global pool
    if pool is None:
        try:
            pool = pooling.MySQLConnectionPool(
                pool_name="mypool",
                pool_size=5,
                pool_reset_session=True,
                **get_db_config()
            )
        except Exception as e:
            logging.error(f"Failed to initialize database pool: {e}")
            raise
    return pool.get_connection()

def init_db():
    db = None
    cursor = None
    try:
        db = get_db()
        cursor = db.cursor(dictionary=True)

        # ── Schema ────────────────────────────────────────────────
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS users (
            id INT AUTO_INCREMENT PRIMARY KEY,
            username VARCHAR(255) UNIQUE NOT NULL,
            password VARCHAR(255) NOT NULL
        )
        """)

        cursor.execute("""
        CREATE TABLE IF NOT EXISTS categories (
            id INT AUTO_INCREMENT PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            user_id INT,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
        """)

        cursor.execute("""
        CREATE TABLE IF NOT EXISTS expenses (
            id INT AUTO_INCREMENT PRIMARY KEY,
            user_id INT NOT NULL,
            category_id INT,
            amount DECIMAL(10, 2) NOT NULL,
            description TEXT,
            expense_date DATE NOT NULL,
            type VARCHAR(50) NOT NULL,
            is_recurring BOOLEAN DEFAULT FALSE,
            recurrence_interval VARCHAR(50),
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
            FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL
        )
        """)

        cursor.execute("""
        CREATE TABLE IF NOT EXISTS goals (
            id INT AUTO_INCREMENT PRIMARY KEY,
            user_id INT NOT NULL,
            category_id INT NOT NULL,
            monthly_goal DECIMAL(10, 2) NOT NULL,
            month INT NOT NULL,
            year INT NOT NULL,
            UNIQUE KEY unique_user_category_date (user_id, category_id, month, year),
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
            FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE
        )
        """)

        # ── Default user ─────────────────────────────────────────
        cursor.execute("SELECT id FROM users WHERE username = %s", ("sarvesh18",))
        user_row = cursor.fetchone()
        if not user_row:
            cursor.execute(
                "INSERT INTO users (username, password) VALUES (%s, %s)",
                ("sarvesh18", "Nikisumu@18")
            )
            db.commit()
            # Re-fetch to get the newly inserted id
            cursor.execute("SELECT id FROM users WHERE username = %s", ("sarvesh18",))
            user_row = cursor.fetchone()
            logging.info("Default user sarvesh18 created.")

        # ── Seed default categories (same connection, no second cursor) ──
        if user_row:
            user_id = user_row["id"]
            for name in DEFAULT_CATEGORIES:
                cursor.execute(
                    "SELECT id FROM categories WHERE LOWER(name)=LOWER(%s) AND user_id=%s",
                    (name, user_id),
                )
                if not cursor.fetchone():
                    cursor.execute(
                        "INSERT INTO categories (name, user_id) VALUES (%s, %s)",
                        (name, user_id),
                    )

        db.commit()
        logging.info("Database initialized successfully.")

    except Exception as e:
        logging.error(f"Error initializing database: {e}")
    finally:
        # Always clean up — even if an exception occurred
        if cursor:
            cursor.close()
        if db:
            db.close()