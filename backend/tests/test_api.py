import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.main import app, seed_db
from app.models.models import Base, User, Agent, PromptType, PromptVersion, TestedQuestion, Comment, ActivityLog
from app.database.session import get_db
from app.core import security

import os

# Use file-based SQLite for testing to avoid connection pooling isolation in-memory
SQLALCHEMY_DATABASE_URL = "sqlite:///./test_temp.db"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False}
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


@pytest.fixture(scope="module")
def db():
    Base.metadata.create_all(bind=engine)
    db = TestingSessionLocal()
    seed_db(db)
    yield db
    db.close()
    Base.metadata.drop_all(bind=engine)
    try:
        if os.path.exists("./test_temp.db"):
            os.remove("./test_temp.db")
    except Exception:
        pass


@pytest.fixture(scope="module")
def client(db):
    def override_get_db():
        try:
            yield db
        finally:
            pass
            
    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()


def test_login(client):
    response = client.post(
        "/api/v1/login",
        json={"email": "admin@promptvault.com", "password": "AdminPass123!"}
    )
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["user"]["email"] == "admin@promptvault.com"
    assert data["user"]["role"] == "Manager"


def test_get_agents(client):
    # Log in first
    login_resp = client.post(
        "/api/v1/login",
        json={"email": "admin@promptvault.com", "password": "AdminPass123!"}
    )
    token = login_resp.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    
    response = client.get("/api/v1/agents", headers=headers)
    assert response.status_code == 200
    agents = response.json()
    assert len(agents) >= 2
    assert agents[0]["name"] == "Forecast"


def test_create_agent(client):
    login_resp = client.post(
        "/api/v1/login",
        json={"email": "admin@promptvault.com", "password": "AdminPass123!"}
    )
    token = login_resp.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    response = client.post(
        "/api/v1/agents",
        json={"name": "New Agent", "description": "New agent description"},
        headers=headers
    )
    assert response.status_code == 200
    agent = response.json()
    assert agent["name"] == "New Agent"
    
    # Confirm prompt types automatically created
    pt_resp = client.get(f"/api/v1/agents/{agent['id']}/prompt-types", headers=headers)
    assert pt_resp.status_code == 200
    types = pt_resp.json()
    assert len(types) == 4
    type_names = [t["type_name"] for t in types]
    assert "System" in type_names
    assert "SQL" in type_names
