
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from backend.auth import create_access_token
from backend.database import Base, get_db
from backend.main import app
from backend.models import User
from backend.auth import hash_password

@pytest.fixture
def client():
    test_engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )

    TestSessionLocal = sessionmaker(
        bind=test_engine,
        autoflush=False,
        autocommit=False,
    )

    Base.metadata.create_all(bind=test_engine)

    def override_get_db():
        db = TestSessionLocal()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = override_get_db

    try:
        with TestClient(app) as test_client:
            db = TestSessionLocal()
            try:
                test_user = User(
                    email="test@example.com",
                    hashed_password=hash_password("TestPassword123!"),
                    is_active=True,
                )
                db.add(test_user)
                db.commit()
                db.refresh(test_user)
                token = create_access_token(test_user.id)
            finally:
                db.close()

            test_client.headers["Authorization"] = f"Bearer {token}"
            test_client.test_user_id = test_user.id
            test_client.test_session_local = TestSessionLocal
            yield test_client
    finally:
        app.dependency_overrides.clear()
        Base.metadata.drop_all(bind=test_engine)
        test_engine.dispose()
