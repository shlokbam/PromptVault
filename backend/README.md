# PromptVault Backend - FastAPI Service Workspace

This is the Python web API backend for **PromptVault**, built with **FastAPI**, **SQLAlchemy ORM**, and **Pydantic validation**.

---

## Technical Stack & Configuration

- **API Engine**: FastAPI (Python 3.13)
- **ASGI Web Server**: Uvicorn
- **Object Relational Mapper**: SQLAlchemy 2.0 (configured to interchange SQLite and PostgreSQL drivers easily)
- **Database Migrations**: Configured for SQLAlchemy model synchronizations
- **Data Validation**: Pydantic v2 (leveraging `email-validator` for structured schema bindings)
- **Security**: JWT (JSON Web Tokens) with direct `bcrypt` password hashing
- **Testing Suite**: `pytest` and `fastapi.testclient` integration tests

---

## Directory Structure

```text
backend/
├── app/
│   ├── api/
│   │   └── endpoints.py   # Router routes for authentication, CRUD, and search
│   ├── core/
│   │   ├── config.py      # Base PydanticSettings and dotenv config loading
│   │   └── security.py    # Password hashing and token generation/validation
│   ├── database/
│   │   └── session.py     # Engine initialization and db session context manager
│   ├── models/
│   │   └── models.py      # Relational SQLAlchemy model tables mapping
│   ├── schemas/
│   │   └── schemas.py     # Pydantic schemas for endpoint data serialization
│   └── main.py            # FastAPI entry point, CORS config, and startup seed rules
├── tests/
│   └── test_api.py        # Pytest integration validation routines
├── requirements.txt       # Project dependencies
└── promptvault.db         # Local prototyping database (SQLite)
```

---

## Local Setup

Ensure that you have Python (3.10+) installed.

1. **Create and Activate Virtual Environment**:
   ```bash
   python3 -m venv venv
   source venv/bin/activate
   ```

2. **Install Dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

3. **Launch Server**:
   ```bash
   PYTHONPATH=. uvicorn app.main:app --host 0.0.0.0 --port 8000
   ```
   *The server lifespan will automatically create `promptvault.db` SQLite database and seed it with pre-built admin, manager, and developer accounts along with sample version history data.*

4. **Verify Swagger UI**:
   - Swagger documentation is available at `http://localhost:8000/docs`.

5. **Run Tests**:
   ```bash
   PYTHONPATH=. pytest
   ```
