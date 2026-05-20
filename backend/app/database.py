import mysql.connector
from mysql.connector import pooling
import os
from dotenv import load_dotenv

load_dotenv()

from urllib.parse import urlparse

# Create a connection pool
db_config = {}

database_url = os.getenv("DATABASE_URL")
if database_url:
    # Example Aiven URL: mysql://avnadmin:password@host:port/defaultdb
    url = urlparse(database_url)
    db_config = {
        "host": url.hostname,
        "user": url.username,
        "password": url.password,
        "database": url.path.lstrip("/"),
        "port": url.port or 3306
    }
else:
    db_config = {
        "host": os.getenv("DB_HOST"),
        "user": os.getenv("DB_USER"),
        "password": os.getenv("DB_PASSWORD"),
        "database": os.getenv("DB_NAME")
    }

# pool_size can be adjusted based on expected load
pool = pooling.MySQLConnectionPool(
    pool_name="mypool",
    pool_size=5,
    pool_reset_session=True,
    **db_config
)

def get_db():
    return pool.get_connection()