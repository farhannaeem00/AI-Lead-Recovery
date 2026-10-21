
from sqlalchemy import text

from backend.database import engine


try:
    with engine.connect() as connection:
        result = connection.execute(text("SELECT current_database()"))
        print("Database connected successfully:", result.scalar())
except Exception as error:
    print("Database connection failed.")
    print(type(error).__name__, error)
