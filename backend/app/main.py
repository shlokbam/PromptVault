import contextlib
import datetime
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

from app.core.config import settings
from app.database.session import engine, SessionLocal, Base
from app.models import models
from app.core import security
from app.api import endpoints

def seed_db(db: Session):
    # Check if database is already seeded
    if db.query(models.User).first() is not None:
        return

    print("Seeding database...")
    
    # 1. Seed Users
    admin_pw = security.get_password_hash("AdminPass123!")
    manager_pw = security.get_password_hash("ManagerPass123!")
    member_pw = security.get_password_hash("MemberPass123!")

    admin_user = models.User(name="Shlok Bam", email="admin@promptvault.com", password_hash=admin_pw, role="Admin")
    manager_user = models.User(name="Rahul Sharma", email="manager@promptvault.com", password_hash=manager_pw, role="Manager")
    member_user = models.User(name="Alex Mercer", email="member@promptvault.com", password_hash=member_pw, role="Member")

    db.add_all([admin_user, manager_user, member_user])
    db.commit()
    db.refresh(admin_user)
    db.refresh(manager_user)
    db.refresh(member_user)

    # 2. Seed Agents
    agent_forecast = models.Agent(
        name="Forecast",
        description="AI agent designed to handle product sales forecasts for Otezla, Maritide, Eliquis, and Dupixent",
        created_by=admin_user.id
    )
    agent_support = models.Agent(
        name="Support Copilot",
        description="Customer support automation agent for ticket parsing and routing",
        created_by=manager_user.id
    )
    
    db.add_all([agent_forecast, agent_support])
    db.commit()
    db.refresh(agent_forecast)
    db.refresh(agent_support)

    # 3. Create default Prompt Types for the seeded agents
    default_types = ["System", "SQL", "Chart", "Validation"]
    
    forecast_types = {}
    for t_name in default_types:
        pt = models.PromptType(agent_id=agent_forecast.id, type_name=t_name)
        db.add(pt)
        forecast_types[t_name] = pt
        
    support_types = {}
    for t_name in default_types:
        pt = models.PromptType(agent_id=agent_support.id, type_name=t_name)
        db.add(pt)
        support_types[t_name] = pt

    db.commit()
    for t_name in default_types:
        db.refresh(forecast_types[t_name])
        db.refresh(support_types[t_name])

    # 4. Seed Prompt Versions for Forecast SQL Prompt
    sql_type = forecast_types["SQL"]
    
    v1_content = """-- Version 1: Basic retrieval
SELECT * 
FROM forecast_data 
WHERE year = 2026 
  AND product_name = :product;
"""
    v1 = models.PromptVersion(
        prompt_type_id=sql_type.id,
        version_number=1,
        content=v1_content,
        change_summary="Initial SQL prompt setup for products",
        status="Archived",
        author_id=admin_user.id
    )

    v2_content = """-- Version 2: Added aggregations
SELECT 
    month,
    SUM(demand) as total_demand,
    AVG(confidence) as avg_confidence
FROM forecast_data 
WHERE year = 2026 
  AND product_name = :product
GROUP BY month
ORDER BY month ASC;
"""
    v2 = models.PromptVersion(
        prompt_type_id=sql_type.id,
        version_number=2,
        content=v2_content,
        change_summary="Added SQL aggregations and monthly grouping rule",
        status="Testing",
        author_id=manager_user.id
    )

    v3_content = """-- Version 3: Optimizing performance and filter bindings
SELECT 
    month,
    SUM(demand) as total_demand,
    AVG(confidence) as avg_confidence,
    LOWER(product_name) as formatted_product
FROM forecast_data 
WHERE year = 2026 
  AND LOWER(product_name) = LOWER(:product)
GROUP BY month, product_name
ORDER BY total_demand DESC;
"""
    v3 = models.PromptVersion(
        prompt_type_id=sql_type.id,
        version_number=3,
        content=v3_content,
        change_summary="Improved fiscal year and case-insensitive product matching",
        status="Production",
        author_id=member_user.id
    )

    db.add_all([v1, v2, v3])
    db.commit()
    db.refresh(v1)
    db.refresh(v2)
    db.refresh(v3)

    # 5. Seed Test Cases on Version 3
    t1 = models.TestedQuestion(
        prompt_version_id=v3.id,
        question="Show monthly demand for Otezla.",
        expected_output="A table grouped by month detailing sum demand and avg confidence for Otezla.",
        actual_output="Output contains month, total_demand, avg_confidence, and formatted_product=otezla. Looks correct.",
        status="PASS",
        notes="Correct chart generated on UI side."
    )
    t2 = models.TestedQuestion(
        prompt_version_id=v3.id,
        question="Compare yearly forecast.",
        expected_output="Comparison across multiple years.",
        actual_output="SQL Error: column forecast_data.year not found in grouping or aggregation mismatch.",
        status="FAIL",
        notes="Fails because grouping requires product_name or year binds."
    )
    db.add_all([t1, t2])

    # 6. Seed Comments on Version 3
    c1 = models.Comment(
        prompt_version_id=v3.id,
        author_id=manager_user.id,
        comment="Need better SQL logic for Otezla grouping.",
        created_at=datetime.datetime.utcnow() - datetime.timedelta(hours=2)
    )
    c2 = models.Comment(
        prompt_version_id=v3.id,
        author_id=member_user.id,
        comment="Updated query with lower() checks to fix capitalization issues.",
        created_at=datetime.datetime.utcnow() - datetime.timedelta(hours=1)
    )
    c3 = models.Comment(
        prompt_version_id=v3.id,
        author_id=admin_user.id,
        comment="Looks good, passing main test cases. Ready to promote to production.",
        created_at=datetime.datetime.utcnow() - datetime.timedelta(minutes=30)
    )
    db.add_all([c1, c2, c3])

    # 7. Seed System Activity Logs
    log1 = models.ActivityLog(user_id=admin_user.id, action="Created Agent 'Forecast'", entity_type="Agent", entity_id=agent_forecast.id)
    log2 = models.ActivityLog(user_id=manager_user.id, action="Created Agent 'Support Copilot'", entity_type="Agent", entity_id=agent_support.id)
    log3 = models.ActivityLog(user_id=admin_user.id, action="Saved Version 1 of SQL", entity_type="PromptVersion", entity_id=v1.id)
    log4 = models.ActivityLog(user_id=manager_user.id, action="Saved Version 2 of SQL", entity_type="PromptVersion", entity_id=v2.id)
    log5 = models.ActivityLog(user_id=member_user.id, action="Saved Version 3 of SQL", entity_type="PromptVersion", entity_id=v3.id)
    log6 = models.ActivityLog(user_id=member_user.id, action="Added Test Question to Version 3", entity_type="TestedQuestion", entity_id=t1.id)
    log7 = models.ActivityLog(user_id=member_user.id, action="Added Test Question to Version 3", entity_type="TestedQuestion", entity_id=t2.id)

    db.add_all([log1, log2, log3, log4, log5, log6, log7])
    
    db.commit()
    print("Database seeding completed.")


@contextlib.asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize DB tables
    Base.metadata.create_all(bind=engine)
    # Seed DB
    db = SessionLocal()
    try:
        seed_db(db)
    finally:
        db.close()
    yield

app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    lifespan=lifespan
)

# CORS Middleware config
# In prototyping, allow all origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(endpoints.router, prefix=settings.API_V1_STR)

@app.get("/")
def read_root():
    return {"message": "Welcome to the PromptVault API. Visit /docs for documentation."}
