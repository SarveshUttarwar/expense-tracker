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


def init_db():
    # Use a direct connection (NOT from pool) for startup init
    db = mysql.connector.connect(**get_db_config())
    cursor = db.cursor()
    try:
        cursor.execute("CREATE TABLE IF NOT EXISTS users (id INT AUTO_INCREMENT PRIMARY KEY, username VARCHAR(255) UNIQUE NOT NULL, password VARCHAR(255) NOT NULL)")
        cursor.execute("CREATE TABLE IF NOT EXISTS categories (id INT AUTO_INCREMENT PRIMARY KEY, name VARCHAR(255) NOT NULL, user_id INT, FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE)")
        cursor.execute("CREATE TABLE IF NOT EXISTS expenses (id INT AUTO_INCREMENT PRIMARY KEY, user_id INT NOT NULL, category_id INT, amount DECIMAL(10,2) NOT NULL, description TEXT, expense_date DATE NOT NULL, type VARCHAR(50) NOT NULL, is_recurring BOOLEAN DEFAULT FALSE, recurrence_interval VARCHAR(50), FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE, FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL)")
        cursor.execute("CREATE TABLE IF NOT EXISTS goals (id INT AUTO_INCREMENT PRIMARY KEY, user_id INT NOT NULL, category_id INT NOT NULL, monthly_goal DECIMAL(10,2) NOT NULL, month INT NOT NULL, year INT NOT NULL, UNIQUE KEY uq_goal (user_id, category_id, month, year), FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE, FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE)")

        # Ensure default user exists
        cursor.execute("SELECT id FROM users WHERE username='sarvesh18'")
        row = cursor.fetchone()
        if not row:
            cursor.execute("INSERT INTO users (username, password) VALUES ('sarvesh18', 'Nikisumu@18')")
            db.commit()
            cursor.execute("SELECT id FROM users WHERE username='sarvesh18'")
            row = cursor.fetchone()

        # Seed default categories for default user
        uid = row[0]
        for name in DEFAULT_CATEGORIES:
            cursor.execute("SELECT id FROM categories WHERE LOWER(name)=LOWER(%s) AND user_id=%s", (name, uid))
            if not cursor.fetchone():
                cursor.execute("INSERT INTO categories (name, user_id) VALUES (%s, %s)", (name, uid))
        db.commit()
        logging.info("DB init complete.")
    except Exception as e:
        logging.error(f"DB init error: {e}")
    finally:
        cursor.close()
        db.close()