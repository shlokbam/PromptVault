import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_, func

from app.core import security
from app.database.session import get_db
from app.models import models
from app.schemas import schemas

router = APIRouter()

oauth2_scheme = OAuth2PasswordBearer(tokenUrl=f"{security.settings.API_V1_STR}/login")

# Helper function to log activity
def log_activity(db: Session, user_id: int, action: str, entity_type: str, entity_id: Optional[int] = None):
    activity = models.ActivityLog(
        user_id=user_id,
        action=action,
        entity_type=entity_type,
        entity_id=entity_id
    )
    db.add(activity)
    db.commit()

# Dependency to get current authenticated user
def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)) -> models.User:
    email = security.decode_access_token(token)
    if not email:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
    user = db.query(models.User).filter(models.User.email == email).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
        )
    return user

# Helper to verify role permission
def verify_admin_role(user: models.User):
    if user.role.lower() != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only Admins are authorized to perform this operation",
        )

def verify_manager_or_admin_role(user: models.User):
    if user.role.lower() not in ["admin", "manager"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only Managers and Admins are authorized to perform this operation",
        )


# =====================================================================
# AUTHENTICATION ENDPOINTS
# =====================================================================
@router.post("/login", response_model=schemas.Token)
def login(login_data: schemas.UserLogin, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.email == login_data.email).first()
    if not user or not security.verify_password(login_data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
        )
    
    access_token = security.create_access_token(subject=user.email)
    
    # Log login activity
    log_activity(db, user.id, "Logged in", "User", user.id)
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": user
    }

@router.post("/logout")
def logout(current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    log_activity(db, current_user.id, "Logged out", "User", current_user.id)
    return {"message": "Successfully logged out"}


# =====================================================================
# USERS ENDPOINTS
# =====================================================================
@router.get("/users", response_model=List[schemas.UserResponse])
def get_users(current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    # All authenticated users can list users
    return db.query(models.User).all()

@router.get("/users/me", response_model=schemas.UserResponse)
def get_current_user_info(current_user: models.User = Depends(get_current_user)):
    return current_user


# =====================================================================
# AGENT MANAGEMENT ENDPOINTS
# =====================================================================
@router.get("/agents", response_model=List[schemas.AgentResponse])
def get_agents(current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    agents = db.query(models.Agent).all()
    # Populate creator name
    res = []
    for agent in agents:
        creator_name = agent.creator.name if agent.creator else "System"
        res.append(
            schemas.AgentResponse(
                id=agent.id,
                name=agent.name,
                description=agent.description,
                created_by=agent.created_by,
                created_at=agent.created_at,
                creator_name=creator_name
            )
        )
    return res

@router.post("/agents", response_model=schemas.AgentResponse)
def create_agent(agent_in: schemas.AgentCreate, current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    # Create the agent
    agent = models.Agent(
        name=agent_in.name,
        description=agent_in.description,
        created_by=current_user.id
    )
    db.add(agent)
    db.commit()
    db.refresh(agent)
    
    # Auto-create default prompt types for this agent (System, SQL, Chart, Validation)
    default_types = ["System", "SQL", "Chart", "Validation"]
    for type_name in default_types:
        prompt_type = models.PromptType(agent_id=agent.id, type_name=type_name)
        db.add(prompt_type)
    db.commit()
    db.refresh(agent)

    # Log action
    log_activity(db, current_user.id, f"Created Agent '{agent.name}'", "Agent", agent.id)

    return schemas.AgentResponse(
        id=agent.id,
        name=agent.name,
        description=agent.description,
        created_by=agent.created_by,
        created_at=agent.created_at,
        creator_name=current_user.name
    )

@router.put("/agents/{id}", response_model=schemas.AgentResponse)
def update_agent(id: int, agent_in: schemas.AgentUpdate, current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    agent = db.query(models.Agent).filter(models.Agent.id == id).first()
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")
    
    if agent_in.name is not None:
        agent.name = agent_in.name
    if agent_in.description is not None:
        agent.description = agent_in.description
        
    db.commit()
    db.refresh(agent)
    
    log_activity(db, current_user.id, f"Updated Agent '{agent.name}'", "Agent", agent.id)
    
    return schemas.AgentResponse(
        id=agent.id,
        name=agent.name,
        description=agent.description,
        created_by=agent.created_by,
        created_at=agent.created_at,
        creator_name=agent.creator.name if agent.creator else "System"
    )

@router.delete("/agents/{id}")
def delete_agent(id: int, current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    # Deleting an agent requires Manager/Admin privilege
    verify_manager_or_admin_role(current_user)
    
    agent = db.query(models.Agent).filter(models.Agent.id == id).first()
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")
        
    name = agent.name
    db.delete(agent)
    db.commit()
    
    log_activity(db, current_user.id, f"Deleted Agent '{name}'", "Agent", id)
    return {"message": f"Successfully deleted agent '{name}'"}


# =====================================================================
# PROMPT TYPES ENDPOINTS
# =====================================================================
@router.get("/agents/{id}/prompt-types", response_model=List[schemas.PromptTypeResponse])
def get_agent_prompt_types(id: int, current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    agent = db.query(models.Agent).filter(models.Agent.id == id).first()
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")
    return agent.prompt_types

@router.post("/prompt-types", response_model=schemas.PromptTypeResponse)
def create_custom_prompt_type(prompt_type_in: schemas.PromptTypeBase, agent_id: int, current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    # Verify that agent exists
    agent = db.query(models.Agent).filter(models.Agent.id == agent_id).first()
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")
    
    # Check if duplicate type
    existing = db.query(models.PromptType).filter(
        and_(models.PromptType.agent_id == agent_id, models.PromptType.type_name == prompt_type_in.type_name)
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Prompt type already exists for this Agent")

    prompt_type = models.PromptType(agent_id=agent_id, type_name=prompt_type_in.type_name)
    db.add(prompt_type)
    db.commit()
    db.refresh(prompt_type)

    log_activity(db, current_user.id, f"Created Prompt Type '{prompt_type.type_name}' for Agent '{agent.name}'", "PromptType", prompt_type.id)
    return prompt_type


# =====================================================================
# PROMPT VERSIONS ENDPOINTS
# =====================================================================
@router.get("/prompt-types/{id}/versions", response_model=List[schemas.PromptVersionResponse])
def get_prompt_versions(id: int, current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    prompt_type = db.query(models.PromptType).filter(models.PromptType.id == id).first()
    if not prompt_type:
        raise HTTPException(status_code=404, detail="Prompt type not found")
        
    versions = db.query(models.PromptVersion).filter(models.PromptVersion.prompt_type_id == id).order_by(models.PromptVersion.version_number.desc()).all()
    
    res = []
    for v in versions:
        res.append(
            schemas.PromptVersionResponse(
                id=v.id,
                prompt_type_id=v.prompt_type_id,
                version_number=v.version_number,
                content=v.content,
                change_summary=v.change_summary,
                status=v.status,
                author_id=v.author_id,
                author_name=v.author.name if v.author else "Unknown",
                created_at=v.created_at,
                restored_from_version=v.restored_from_version,
                prompt_type_name=prompt_type.type_name,
                agent_name=prompt_type.agent.name if prompt_type.agent else "Unknown",
                agent_id=prompt_type.agent_id
            )
        )
    return res

@router.post("/prompt-types/{id}/versions", response_model=schemas.PromptVersionResponse)
def create_prompt_version(id: int, version_in: schemas.PromptVersionCreate, current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    prompt_type = db.query(models.PromptType).filter(models.PromptType.id == id).first()
    if not prompt_type:
        raise HTTPException(status_code=404, detail="Prompt type not found")

    # Determine next version number
    max_ver = db.query(func.max(models.PromptVersion.version_number)).filter(models.PromptVersion.prompt_type_id == id).scalar()
    next_ver = (max_ver or 0) + 1

    # Create the version
    version = models.PromptVersion(
        prompt_type_id=id,
        version_number=next_ver,
        content=version_in.content,
        change_summary=version_in.change_summary,
        status=version_in.status,
        author_id=current_user.id
    )
    db.add(version)
    db.commit()
    db.refresh(version)

    log_activity(
        db, 
        current_user.id, 
        f"Saved Version {version.version_number} of {prompt_type.type_name} (Agent: {prompt_type.agent.name})", 
        "PromptVersion", 
        version.id
    )

    return schemas.PromptVersionResponse(
        id=version.id,
        prompt_type_id=version.prompt_type_id,
        version_number=version.version_number,
        content=version.content,
        change_summary=version.change_summary,
        status=version.status,
        author_id=version.author_id,
        author_name=current_user.name,
        created_at=version.created_at,
        restored_from_version=version.restored_from_version,
        prompt_type_name=prompt_type.type_name,
        agent_name=prompt_type.agent.name,
        agent_id=prompt_type.agent_id
    )

@router.get("/versions/{id}", response_model=schemas.PromptVersionResponse)
def get_version_details(id: int, current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    v = db.query(models.PromptVersion).filter(models.PromptVersion.id == id).first()
    if not v:
        raise HTTPException(status_code=404, detail="Version not found")
        
    return schemas.PromptVersionResponse(
        id=v.id,
        prompt_type_id=v.prompt_type_id,
        version_number=v.version_number,
        content=v.content,
        change_summary=v.change_summary,
        status=v.status,
        author_id=v.author_id,
        author_name=v.author.name if v.author else "Unknown",
        created_at=v.created_at,
        restored_from_version=v.restored_from_version,
        prompt_type_name=v.prompt_type.type_name if v.prompt_type else "Unknown",
        agent_name=v.prompt_type.agent.name if v.prompt_type and v.prompt_type.agent else "Unknown",
        agent_id=v.prompt_type.agent_id if v.prompt_type else None
    )

@router.post("/versions/{id}/restore", response_model=schemas.PromptVersionResponse)
def restore_prompt_version(id: int, restore_in: schemas.PromptVersionRestore, current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    # Fetch target version
    target_version = db.query(models.PromptVersion).filter(models.PromptVersion.id == id).first()
    if not target_version:
        raise HTTPException(status_code=404, detail="Version to restore not found")

    prompt_type_id = target_version.prompt_type_id
    prompt_type = db.query(models.PromptType).filter(models.PromptType.id == prompt_type_id).first()

    # Determine next version number
    max_ver = db.query(func.max(models.PromptVersion.version_number)).filter(models.PromptVersion.prompt_type_id == prompt_type_id).scalar()
    next_ver = (max_ver or 0) + 1

    # Create restored version (preserving history - do not edit the previous ones)
    restored_version = models.PromptVersion(
        prompt_type_id=prompt_type_id,
        version_number=next_ver,
        content=target_version.content,
        change_summary=restore_in.reason,
        status="Production",  # Default restored prompts to Production or draft
        author_id=current_user.id,
        restored_from_version=target_version.version_number
    )
    db.add(restored_version)
    db.commit()
    db.refresh(restored_version)

    # Log action
    log_activity(
        db, 
        current_user.id, 
        f"Restored Version {target_version.version_number} as Version {restored_version.version_number} of {prompt_type.type_name}", 
        "PromptVersion", 
        restored_version.id
    )

    return schemas.PromptVersionResponse(
        id=restored_version.id,
        prompt_type_id=restored_version.prompt_type_id,
        version_number=restored_version.version_number,
        content=restored_version.content,
        change_summary=restored_version.change_summary,
        status=restored_version.status,
        author_id=restored_version.author_id,
        author_name=current_user.name,
        created_at=restored_version.created_at,
        restored_from_version=restored_version.restored_from_version,
        prompt_type_name=prompt_type.type_name,
        agent_name=prompt_type.agent.name,
        agent_id=prompt_type.agent_id
    )

@router.delete("/versions/{id}")
def delete_prompt_version(id: int, current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    # Deleting is Admin only
    verify_admin_role(current_user)

    v = db.query(models.PromptVersion).filter(models.PromptVersion.id == id).first()
    if not v:
        raise HTTPException(status_code=404, detail="Version not found")

    prompt_name = f"Version {v.version_number} of {v.prompt_type.type_name if v.prompt_type else ''}"
    db.delete(v)
    db.commit()

    log_activity(db, current_user.id, f"Deleted {prompt_name}", "PromptVersion", id)
    return {"message": f"Successfully deleted {prompt_name}"}


# =====================================================================
# COMMENTS ENDPOINTS
# =====================================================================
@router.get("/versions/{id}/comments", response_model=List[schemas.CommentResponse])
def get_version_comments(id: int, current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    v = db.query(models.PromptVersion).filter(models.PromptVersion.id == id).first()
    if not v:
        raise HTTPException(status_code=404, detail="Version not found")

    comments = db.query(models.Comment).filter(models.Comment.prompt_version_id == id).order_by(models.Comment.created_at.asc()).all()
    
    res = []
    for c in comments:
        res.append(
            schemas.CommentResponse(
                id=c.id,
                prompt_version_id=c.prompt_version_id,
                author_id=c.author_id,
                author_name=c.author.name if c.author else "Unknown",
                comment=c.comment,
                created_at=c.created_at
            )
        )
    return res

@router.post("/versions/{id}/comments", response_model=schemas.CommentResponse)
def create_version_comment(id: int, comment_in: schemas.CommentCreate, current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    v = db.query(models.PromptVersion).filter(models.PromptVersion.id == id).first()
    if not v:
        raise HTTPException(status_code=404, detail="Version not found")

    comment = models.Comment(
        prompt_version_id=id,
        author_id=current_user.id,
        comment=comment_in.comment
    )
    db.add(comment)
    db.commit()
    db.refresh(comment)

    log_activity(
        db, 
        current_user.id, 
        f"Commented on Version {v.version_number} of {v.prompt_type.type_name}", 
        "Comment", 
        comment.id
    )

    return schemas.CommentResponse(
        id=comment.id,
        prompt_version_id=comment.prompt_version_id,
        author_id=comment.author_id,
        author_name=current_user.name,
        comment=comment.comment,
        created_at=comment.created_at
    )


# =====================================================================
# TEST CASES ENDPOINTS
# =====================================================================
@router.get("/versions/{id}/tests", response_model=List[schemas.TestedQuestionResponse])
def get_version_tests(id: int, current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    v = db.query(models.PromptVersion).filter(models.PromptVersion.id == id).first()
    if not v:
        raise HTTPException(status_code=404, detail="Version not found")

    tests = db.query(models.TestedQuestion).filter(models.TestedQuestion.prompt_version_id == id).all()
    return tests

@router.post("/versions/{id}/tests", response_model=schemas.TestedQuestionResponse)
def create_version_test_case(id: int, test_in: schemas.TestedQuestionCreate, current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    v = db.query(models.PromptVersion).filter(models.PromptVersion.id == id).first()
    if not v:
        raise HTTPException(status_code=404, detail="Version not found")

    test = models.TestedQuestion(
        prompt_version_id=id,
        question=test_in.question,
        expected_output=test_in.expected_output,
        actual_output=test_in.actual_output,
        status=test_in.status,
        notes=test_in.notes
    )
    db.add(test)
    db.commit()
    db.refresh(test)

    log_activity(
        db,
        current_user.id,
        f"Added Test Question to Version {v.version_number} of {v.prompt_type.type_name}",
        "TestedQuestion",
        test.id
    )
    return test


# =====================================================================
# GLOBAL SEARCH
# =====================================================================
@router.get("/search", response_model=schemas.SearchResponse)
def global_search(q: str, current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    if not q or len(q.strip()) < 2:
        return {"query": q, "results": []}

    results = []

    # 1. Search Agents
    agents = db.query(models.Agent).filter(
        or_(models.Agent.name.ilike(f"%{q}%"), models.Agent.description.ilike(f"%{q}%"))
    ).all()
    for agent in agents:
        results.append(
            schemas.SearchMatch(
                id=agent.id,
                type="agent",
                title=f"Agent: {agent.name}",
                subtitle=agent.description or "No description",
                snippet=f"Matches agent name/description: {agent.name}",
                route_path=f"/agents/{agent.id}"
            )
        )

    # 2. Search Prompt Content & Change Summaries
    versions = db.query(models.PromptVersion).filter(
        or_(models.PromptVersion.content.ilike(f"%{q}%"), models.PromptVersion.change_summary.ilike(f"%{q}%"))
    ).all()
    for v in versions:
        pt_name = v.prompt_type.type_name if v.prompt_type else "Unknown"
        ag_name = v.prompt_type.agent.name if v.prompt_type and v.prompt_type.agent else "Unknown"
        ag_id = v.prompt_type.agent_id if v.prompt_type else 0
        
        # Snippet preview
        content_preview = ""
        if q.lower() in v.content.lower():
            idx = v.content.lower().find(q.lower())
            start = max(0, idx - 40)
            end = min(len(v.content), idx + len(q) + 40)
            content_preview = f"...{v.content[start:end]}..."
        else:
            content_preview = v.change_summary

        results.append(
            schemas.SearchMatch(
                id=v.id,
                type="version",
                title=f"{ag_name} > {pt_name} (v{v.version_number})",
                subtitle=f"Change summary: {v.change_summary}",
                snippet=content_preview,
                route_path=f"/agents/{ag_id}/prompts/{pt_name}?versionId={v.id}"
            )
        )

    # 3. Search Tested Questions
    tests = db.query(models.TestedQuestion).filter(
        or_(
            models.TestedQuestion.question.ilike(f"%{q}%"),
            models.TestedQuestion.expected_output.ilike(f"%{q}%"),
            models.TestedQuestion.actual_output.ilike(f"%{q}%")
        )
    ).all()
    for t in tests:
        v = t.prompt_version
        pt_name = v.prompt_type.type_name if v and v.prompt_type else "Unknown"
        ag_name = v.prompt_type.agent.name if v and v.prompt_type and v.prompt_type.agent else "Unknown"
        ag_id = v.prompt_type.agent_id if v and v.prompt_type else 0

        results.append(
            schemas.SearchMatch(
                id=t.id,
                type="test_case",
                title=f"Test Question in {ag_name} > {pt_name} (v{v.version_number})",
                subtitle=f"Q: {t.question}",
                snippet=f"Expected: {t.expected_output} | Actual: {t.actual_output} [{t.status}]",
                route_path=f"/agents/{ag_id}/prompts/{pt_name}?versionId={v.id}&tab=tests"
            )
        )

    # 4. Search Comments
    comments = db.query(models.Comment).filter(models.Comment.comment.ilike(f"%{q}%")).all()
    for c in comments:
        v = c.prompt_version
        pt_name = v.prompt_type.type_name if v and v.prompt_type else "Unknown"
        ag_name = v.prompt_type.agent.name if v and v.prompt_type and v.prompt_type.agent else "Unknown"
        ag_id = v.prompt_type.agent_id if v and v.prompt_type else 0

        results.append(
            schemas.SearchMatch(
                id=c.id,
                type="comment",
                title=f"Comment by {c.author.name if c.author else 'Unknown'} on {ag_name} > {pt_name} (v{v.version_number})",
                subtitle=c.comment,
                snippet=f"Posted on version {v.version_number} history",
                route_path=f"/agents/{ag_id}/prompts/{pt_name}?versionId={v.id}&tab=comments"
            )
        )

    return {"query": q, "results": results}


# =====================================================================
# ACTIVITY LOG ENDPOINT
# =====================================================================
@router.get("/activity", response_model=List[schemas.ActivityLogResponse])
def get_activity_log(current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    logs = db.query(models.ActivityLog).order_by(models.ActivityLog.created_at.desc()).limit(100).all()
    res = []
    for log in logs:
        res.append(
            schemas.ActivityLogResponse(
                id=log.id,
                user_id=log.user_id,
                user_name=log.user.name if log.user else "System",
                action=log.action,
                entity_type=log.entity_type,
                entity_id=log.entity_id,
                created_at=log.created_at
            )
        )
    return res


# =====================================================================
# SYSTEM STATS (DASHBOARD)
# =====================================================================
@router.get("/stats", response_model=schemas.DashboardStats)
def get_dashboard_stats(current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    total_agents = db.query(models.Agent).count()
    total_prompts = db.query(models.PromptType).count()
    total_versions = db.query(models.PromptVersion).count()
    
    # Updates today
    today_start = datetime.datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    total_updates_today = db.query(models.PromptVersion).filter(models.PromptVersion.created_at >= today_start).count()
    
    return {
        "total_agents": total_agents,
        "total_prompts": total_prompts,
        "total_versions": total_versions,
        "total_updates_today": total_updates_today
    }
