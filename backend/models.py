import uuid
from datetime import datetime
from sqlalchemy import Column, String, Boolean, Integer, Float, DateTime, Date, JSON, ForeignKey, Text
from sqlalchemy.orm import relationship
from database import Base

def gen_id():
    return str(uuid.uuid4())

class User(Base):
    __tablename__ = "users"
    id = Column(String, primary_key=True, default=gen_id)
    email = Column(String, unique=True, nullable=False, index=True)
    password_hash = Column(String, nullable=False)
    name = Column(String, nullable=False)
    auth_token = Column(String, nullable=True, index=True)
    avatar_color = Column(String, default="#7C3AED")
    timezone = Column(String, default="Asia/Kolkata")
    theme = Column(String, default="dark")
    notification_prefs = Column(JSON, default=dict)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    tasks = relationship("Task", back_populates="user", cascade="all, delete-orphan", foreign_keys="Task.user_id")
    reminders = relationship("Reminder", back_populates="user", cascade="all, delete-orphan")
    labels = relationship("Label", back_populates="user", cascade="all, delete-orphan")
    timer_sessions = relationship("TimerSession", back_populates="user", cascade="all, delete-orphan")
    time_blocks = relationship("TimeBlock", back_populates="user", cascade="all, delete-orphan")


class Task(Base):
    __tablename__ = "tasks"
    id = Column(String, primary_key=True, default=gen_id)
    user_id = Column(String, ForeignKey("users.id"), nullable=False, index=True)
    parent_id = Column(String, ForeignKey("tasks.id"), nullable=True)
    title = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    status = Column(String, default="todo")         # todo|in_progress|completed|cancelled
    priority = Column(String, default="medium")     # low|medium|high|urgent
    due_date = Column(String, nullable=True)        # "YYYY-MM-DD"
    due_time = Column(String, nullable=True)        # "HH:MM"
    scheduled_date = Column(String, nullable=True)
    scheduled_time = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    completed_at = Column(DateTime, nullable=True)
    # Recurrence
    is_recurring = Column(Boolean, default=False)
    recurrence = Column(String, nullable=True)      # daily|weekly|monthly|yearly
    recurrence_interval = Column(Integer, default=1)
    recurrence_days = Column(JSON, nullable=True)   # [0,1,4] for Mon,Tue,Fri
    recurrence_end_date = Column(String, nullable=True)
    recurrence_count = Column(Integer, nullable=True)
    # Tracking
    estimated_minutes = Column(Integer, nullable=True)
    actual_minutes = Column(Integer, nullable=True)
    category = Column(String, nullable=True)
    color = Column(String, nullable=True)
    notes = Column(Text, nullable=True)
    order_index = Column(Integer, default=0)
    defer_count = Column(Integer, default=0)
    tags = Column(JSON, default=list)

    user = relationship("User", back_populates="tasks", foreign_keys=[user_id])
    subtasks = relationship("Task",
                            primaryjoin="Task.parent_id == Task.id",
                            foreign_keys="Task.parent_id")
    reminders = relationship("Reminder", back_populates="task", cascade="all, delete-orphan")
    task_labels = relationship("TaskLabel", back_populates="task", cascade="all, delete-orphan")
    timer_sessions = relationship("TimerSession", back_populates="task")


class Reminder(Base):
    __tablename__ = "reminders"
    id = Column(String, primary_key=True, default=gen_id)
    task_id = Column(String, ForeignKey("tasks.id"), nullable=True)
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    title = Column(String, nullable=False)
    message = Column(Text, nullable=True)
    remind_at = Column(DateTime, nullable=False)
    is_sent = Column(Boolean, default=False)
    is_dismissed = Column(Boolean, default=False)
    repeat = Column(String, nullable=True)          # none|daily|weekly
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="reminders")
    task = relationship("Task", back_populates="reminders")


class Label(Base):
    __tablename__ = "labels"
    id = Column(String, primary_key=True, default=gen_id)
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    name = Column(String, nullable=False)
    color = Column(String, default="#6366F1")
    icon = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="labels")
    task_labels = relationship("TaskLabel", back_populates="label", cascade="all, delete-orphan")


class TaskLabel(Base):
    __tablename__ = "task_labels"
    task_id = Column(String, ForeignKey("tasks.id"), primary_key=True)
    label_id = Column(String, ForeignKey("labels.id"), primary_key=True)

    task = relationship("Task", back_populates="task_labels")
    label = relationship("Label", back_populates="task_labels")


class TimerSession(Base):
    __tablename__ = "timer_sessions"
    id = Column(String, primary_key=True, default=gen_id)
    task_id = Column(String, ForeignKey("tasks.id"), nullable=True)
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    timer_type = Column(String, default="pomodoro")   # pomodoro|stopwatch|countdown
    target_seconds = Column(Integer, nullable=True)
    actual_seconds = Column(Integer, default=0)
    status = Column(String, default="completed")      # completed|cancelled|interrupted
    notes = Column(Text, nullable=True)
    started_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    ended_at = Column(DateTime, nullable=True)

    user = relationship("User", back_populates="timer_sessions")
    task = relationship("Task", back_populates="timer_sessions")


class TimeBlock(Base):
    __tablename__ = "time_blocks"
    id = Column(String, primary_key=True, default=gen_id)
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    title = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    day_of_week = Column(Integer, nullable=True)    # 0=Mon…6=Sun; null = specific date
    specific_date = Column(String, nullable=True)   # "YYYY-MM-DD"
    start_time = Column(String, nullable=False)     # "HH:MM"
    end_time = Column(String, nullable=False)
    color = Column(String, default="#7C3AED")
    category = Column(String, nullable=True)
    is_recurring = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="time_blocks")
