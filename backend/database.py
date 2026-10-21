from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker

from backend.config import settings


database_url = settings.database_url

if database_url.startswith("sqlite"):
    connect_args = {"check_same_thread": False, "timeout": 10}
else:
    connect_args = {"connect_timeout": 10}


engine = create_engine(
    database_url,
    pool_pre_ping=True,
    connect_args=connect_args,
)


SessionLocal = sessionmaker(
    bind=engine,
    autoflush=False,
    autocommit=False,
)


class Base(DeclarativeBase):
    pass


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()