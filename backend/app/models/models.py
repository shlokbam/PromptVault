import datetime
from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from app.database.session import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    password_hash = Column(String, nullable=False)
    role = Column(String, nullable=False)  # Admin, Manager, Member
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    # Relationships
    agents_created = relationship("Agent", back_populates="creator")
    versions_authored = relationship("PromptVersion", back_populates="author")
    comments = relationship("Comment", back_populates="author")
    activity_logs = relationship("ActivityLog", back_populates="user")


class Agent(Base):
    __tablename__ = "agents"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    description = Column(String, nullable=True)
    created_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    # Relationships
    creator = relationship("User", back_populates="agents_created")
    prompt_types = relationship("PromptType", back_populates="agent", cascade="all, delete-orphan")


class PromptType(Base):
    __tablename__ = "prompt_types"

    id = Column(Integer, primary_key=True, index=True)
    agent_id = Column(Integer, ForeignKey("agents.id"), nullable=False)
    type_name = Column(String, nullable=False)  # System, SQL, Chart, Validation

    # Relationships
    agent = relationship("Agent", back_populates="prompt_types")
    versions = relationship("PromptVersion", back_populates="prompt_type", cascade="all, delete-orphan")


class PromptVersion(Base):
    __tablename__ = "prompt_versions"

    id = Column(Integer, primary_key=True, index=True)
    prompt_type_id = Column(Integer, ForeignKey("prompt_types.id"), nullable=False)
    version_number = Column(Integer, nullable=False)
    content = Column(Text, nullable=False)
    change_summary = Column(String, nullable=False)
    status = Column(String, nullable=False)  # Draft, Testing, Production, Archived
    author_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    restored_from_version = Column(Integer, nullable=True)

    # Relationships
    prompt_type = relationship("PromptType", back_populates="versions")
    author = relationship("User", back_populates="versions_authored")
    comments = relationship("Comment", back_populates="prompt_version", cascade="all, delete-orphan")
    tested_questions = relationship("TestedQuestion", back_populates="prompt_version", cascade="all, delete-orphan")


class TestedQuestion(Base):
    __tablename__ = "tested_questions"

    id = Column(Integer, primary_key=True, index=True)
    prompt_version_id = Column(Integer, ForeignKey("prompt_versions.id"), nullable=False)
    question = Column(Text, nullable=False)
    expected_output = Column(Text, nullable=False)
    actual_output = Column(Text, nullable=False)
    status = Column(String, nullable=False)  # PASS, FAIL
    notes = Column(Text, nullable=True)

    # Relationships
    prompt_version = relationship("PromptVersion", back_populates="tested_questions")


class Comment(Base):
    __tablename__ = "comments"

    id = Column(Integer, primary_key=True, index=True)
    prompt_version_id = Column(Integer, ForeignKey("prompt_versions.id"), nullable=False)
    author_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    comment = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    # Relationships
    prompt_version = relationship("PromptVersion", back_populates="comments")
    author = relationship("User", back_populates="comments")


class ActivityLog(Base):
    __tablename__ = "activity_logs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    action = Column(String, nullable=False)  # e.g., "Created Agent", "Edited Prompt"
    entity_type = Column(String, nullable=False)  # e.g., "Agent", "PromptVersion", "Comment"
    entity_id = Column(Integer, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    # Relationships
    user = relationship("User", back_populates="activity_logs")
