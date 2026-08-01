from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime

# ----------------- User Schemas -----------------
class UserBase(BaseModel):
    name: str
    email: EmailStr
    role: str  # Admin, Manager, Member

class UserCreate(UserBase):
    password: str

class UserResponse(UserBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str
    user: UserResponse

class TokenPayload(BaseModel):
    sub: Optional[str] = None


# ----------------- Agent Schemas -----------------
class AgentBase(BaseModel):
    name: str
    description: Optional[str] = None

class AgentCreate(AgentBase):
    pass

class AgentUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None

class AgentResponse(AgentBase):
    id: int
    created_by: int
    created_at: datetime
    creator_name: Optional[str] = None

    class Config:
        from_attributes = True


# ----------------- Prompt Type Schemas -----------------
class PromptTypeBase(BaseModel):
    type_name: str  # System, SQL, Chart, Validation

class PromptTypeResponse(PromptTypeBase):
    id: int
    agent_id: int

    class Config:
        from_attributes = True


# ----------------- Prompt Version Schemas -----------------
class PromptVersionBase(BaseModel):
    content: str
    change_summary: str
    status: str  # Draft, Testing, Production, Archived

class PromptVersionCreate(PromptVersionBase):
    pass

class PromptVersionResponse(PromptVersionBase):
    id: int
    prompt_type_id: int
    version_number: int
    author_id: int
    author_name: Optional[str] = None
    created_at: datetime
    restored_from_version: Optional[int] = None
    prompt_type_name: Optional[str] = None
    agent_name: Optional[str] = None
    agent_id: Optional[int] = None

    class Config:
        from_attributes = True

class PromptVersionRestore(BaseModel):
    reason: str


# ----------------- Tested Question Schemas -----------------
class TestedQuestionBase(BaseModel):
    question: str
    expected_output: str
    actual_output: str
    status: str  # PASS, FAIL
    notes: Optional[str] = None

class TestedQuestionCreate(TestedQuestionBase):
    pass

class TestedQuestionResponse(TestedQuestionBase):
    id: int
    prompt_version_id: int

    class Config:
        from_attributes = True


# ----------------- Comment Schemas -----------------
class CommentBase(BaseModel):
    comment: str

class CommentCreate(CommentBase):
    pass

class CommentResponse(CommentBase):
    id: int
    prompt_version_id: int
    author_id: int
    author_name: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


# ----------------- Activity Log Schemas -----------------
class ActivityLogResponse(BaseModel):
    id: int
    user_id: int
    user_name: Optional[str] = None
    action: str
    entity_type: str
    entity_id: Optional[int] = None
    created_at: datetime

    class Config:
        from_attributes = True


# ----------------- Search Schemas -----------------
class SearchMatch(BaseModel):
    id: int
    type: str  # agent, version, test_case, comment
    title: str
    subtitle: str
    snippet: str
    route_path: str  # Where to navigate in frontend

class SearchResponse(BaseModel):
    query: str
    results: List[SearchMatch]


# ----------------- Dashboard Stats Schemas -----------------
class DashboardStats(BaseModel):
    total_agents: int
    total_prompts: int  # Total active prompt types configured
    total_versions: int
    total_updates_today: int
