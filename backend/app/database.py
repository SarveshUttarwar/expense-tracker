import mysql.connector
from mysql.connector import pooling
import os
from dotenv import load_dotenv

load_dotenv()

from urllib.parse import urlparse, parse_qs
import logging

pool = None

def get_db_config():
    db_config = {}
    database_url = os.getenv("DATABASE_URL")
    if database_url:
        # Example Aiven URL: mysql://avnadmin:password@host:port/defaultdb?ssl-mode=REQUIRED
        url = urlparse(database_url)
        db_config = {
            "host": url.hostname,
            "user": url.username,
            "password": url.password,
            "database": url.path.lstrip("/"),
            "port": url.port or 3306
        }
        # Parse query parameters (e.g., ssl-mode=REQUIRED)
        if url.query:
            query_params = parse_qs(url.query)
            for k, v in query_params.items():
                # mysql-connector-python expects ssl_mode (with underscore)
                config_key = k.replace("-", "_")
                db_config[config_key] = v[0]
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