import uuid
from datetime import datetime, date, timedelta
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, joinedload
from typing import Optional, List
from pydantic import BaseModel
from database import get_db
import models
from routers.auth import get_current_user

router = APIRouter(prefix="/api/tasks", tags=["tasks"])


# ── Priority Learning ──────────────────────────────────────────────────────────

def compute_score(task: models.Task) -> float:
    pw = {"low": 1, "medium": 2, "high": 3, "urgent": 4}
    base = pw.get(task.priority, 2) * 2.5
    urgency = 0.0
    if task.due_date:
        try:
            due = datetime.strptime(task.due_date, "%Y-%m-%d").date()
            days = (due - date.today()).days
            if days < 0:
                urgency = 12.0
            elif days == 0:
                urgency = 9.0
            elif days <= 2:
                urgency = 6.0
            elif days <= 7:
                urgency = 3.0
            else:
                urgency = max(0.0, 2.0 - days / 30)
        except Exception:
            pass
    defer_bump = task.defer_count * 0.4
    return base + urgency + defer_bump


def suggest_priority(task: models.Task, db: Session) -> str:
    """Auto-escalate priority if overdue or deferred too many times."""
    pw = ["low", "medium", "high", "urgent"]
    idx = pw.index(task.priority) if task.priority in pw else 1
    if task.defer_count >= 3 and idx < 3:
        idx += 1
    if task.due_date:
        try:
            due = datetime.strptime(task.due_date, "%Y-%m-%d").date()
            if (due - date.today()).days < 0 and idx < 3:
                idx = max(idx, 2)  # at least high for overdue
        except Exception:
            pass
    return pw[idx]


# ── Schemas ────────────────────────────────────────────────────────────────────

class TaskIn(BaseModel):
    title: str
    description: Optional[str] = None
    status: str = "todo"
    priority: str = "medium"
    due_date: Optional[str] = None
    due_time: Optional[str] = None
    scheduled_date: Optional[str] = None
    scheduled_time: Optional[str] = None
    is_recurring: bool = False
    recurrence: Optional[str] = None
    recurrence_interval: int = 1
    recurrence_days: Optional[list] = None
    recurrence_end_date: Optional[str] = None
    recurrence_count: Optional[int] = None
    estimated_minutes: Optional[int] = None
    category: Optional[str] = None
    color: Optional[str] = None
    notes: Optional[str] = None
    tags: List[str] = []
    parent_id: Optional[str] = None
    label_ids: List[str] = []

class TaskUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None
    priority: Optional[str] = None
    due_date: Optional[str] = None
    due_time: Optional[str] = None
    scheduled_date: Optional[str] = None
    scheduled_time: Optional[str] = None
    is_recurring: Optional[bool] = None
    recurrence: Optional[str] = None
    recurrence_interval: Optional[int] = None
    recurrence_days: Optional[list] = None
    recurrence_end_date: Optional[str] = None
    recurrence_count: Optional[int] = None
    estimated_minutes: Optional[int] = None
    actual_minutes: Optional[int] = None
    category: Optional[str] = None
    color: Optional[str] = None
    notes: Optional[str] = None
    tags: Optional[List[str]] = None
    label_ids: Optional[List[str]] = None
    order_index: Optional[int] = None


def task_to_dict(t: models.Task) -> dict:
    return {
        "id": t.id, "user_id": t.user_id, "parent_id": t.parent_id,
        "title": t.title, "description": t.description,
        "status": t.status, "priority": t.priority,
        "due_date": t.due_date, "due_time": t.due_time,
        "scheduled_date": t.scheduled_date, "scheduled_time": t.scheduled_time,
        "created_at": t.created_at.isoformat() if t.created_at else None,
        "updated_at": t.updated_at.isoformat() if t.updated_at else None,
        "completed_at": t.completed_at.isoformat() if t.completed_at else None,
        "is_recurring": t.is_recurring, "recurrence": t.recurrence,
        "recurrence_interval": t.recurrence_interval, "recurrence_days": t.recurrence_days,
        "recurrence_end_date": t.recurrence_end_date, "recurrence_count": t.recurrence_count,
        "estimated_minutes": t.estimated_minutes, "actual_minutes": t.actual_minutes,
        "category": t.category, "color": t.color, "notes": t.notes,
        "order_index": t.order_index, "defer_count": t.defer_count,
        "tags": t.tags or [],
        "priority_score": round(compute_score(t), 2),
        "suggested_priority": suggest_priority(t, None),
        "subtasks": [task_to_dict(s) for s in t.subtasks],
        "labels": [{"id": tl.label.id, "name": tl.label.name, "color": tl.label.color}
                   for tl in t.task_labels if tl.label],
    }


def _load(q):
    return q.options(
        joinedload(models.Task.subtasks),
        joinedload(models.Task.task_labels).joinedload(models.TaskLabel.label),
    )


# ── Routes ─────────────────────────────────────────────────────────────────────

@router.get("/")
def list_tasks(
    status: Optional[str] = None,
    priority: Optional[str] = None,
    category: Optional[str] = None,
    search: Optional[str] = None,
    due_from: Optional[str] = None,
    due_to: Optional[str] = None,
    label_id: Optional[str] = None,
    sort_by: str = "smart",  # smart|due_date|priority|created|title
    include_subtasks: bool = False,
    user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    q = db.query(models.Task).filter(models.Task.user_id == user.id)
    if not include_subtasks:
        q = q.filter(models.Task.parent_id == None)
    if status:
        q = q.filter(models.Task.status == status)
    if priority:
        q = q.filter(models.Task.priority == priority)
    if category:
        q = q.filter(models.Task.category == category)
    if search:
        q = q.filter(models.Task.title.ilike(f"%{search}%"))
    if due_from:
        q = q.filter(models.Task.due_date >= due_from)
    if due_to:
        q = q.filter(models.Task.due_date <= due_to)
    if label_id:
        q = q.join(models.TaskLabel).filter(models.TaskLabel.label_id == label_id)

    tasks = _load(q).all()

    if sort_by == "smart":
        tasks.sort(key=compute_score, reverse=True)
    elif sort_by == "due_date":
        tasks.sort(key=lambda t: (t.due_date or "9999-99-99"))
    elif sort_by == "priority":
        pw = {"urgent": 0, "high": 1, "medium": 2, "low": 3}
        tasks.sort(key=lambda t: pw.get(t.priority, 2))
    elif sort_by == "created":
        tasks.sort(key=lambda t: t.created_at or datetime.min, reverse=True)
    elif sort_by == "title":
        tasks.sort(key=lambda t: t.title.lower())

    return [task_to_dict(t) for t in tasks]


@router.get("/today")
def today_tasks(user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    today = date.today().isoformat()
    q = db.query(models.Task).filter(
        models.Task.user_id == user.id,
        models.Task.due_date == today,
        models.Task.status.in_(["todo", "in_progress"]),
        models.Task.parent_id == None,
    )
    tasks = _load(q).all()
    tasks.sort(key=compute_score, reverse=True)
    return [task_to_dict(t) for t in tasks]


@router.get("/upcoming")
def upcoming_tasks(days: int = 7, user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    today = date.today()
    end = (today + timedelta(days=days)).isoformat()
    today_s = today.isoformat()
    q = db.query(models.Task).filter(
        models.Task.user_id == user.id,
        models.Task.due_date >= today_s,
        models.Task.due_date <= end,
        models.Task.status.in_(["todo", "in_progress"]),
        models.Task.parent_id == None,
    )
    tasks = _load(q).all()
    tasks.sort(key=lambda t: t.due_date or "")
    return [task_to_dict(t) for t in tasks]


@router.get("/overdue")
def overdue_tasks(user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    today = date.today().isoformat()
    q = db.query(models.Task).filter(
        models.Task.user_id == user.id,
        models.Task.due_date < today,
        models.Task.status.in_(["todo", "in_progress"]),
        models.Task.parent_id == None,
    )
    tasks = _load(q).all()
    tasks.sort(key=compute_score, reverse=True)
    return [task_to_dict(t) for t in tasks]


@router.get("/stats")
def task_stats(user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    all_tasks = db.query(models.Task).filter(
        models.Task.user_id == user.id,
        models.Task.parent_id == None,
    ).all()
    today = date.today().isoformat()
    return {
        "total": len(all_tasks),
        "todo": sum(1 for t in all_tasks if t.status == "todo"),
        "in_progress": sum(1 for t in all_tasks if t.status == "in_progress"),
        "completed": sum(1 for t in all_tasks if t.status == "completed"),
        "overdue": sum(1 for t in all_tasks if t.status in ["todo","in_progress"] and t.due_date and t.due_date < today),
        "due_today": sum(1 for t in all_tasks if t.due_date == today and t.status in ["todo","in_progress"]),
        "high_priority": sum(1 for t in all_tasks if t.priority in ["high","urgent"] and t.status != "completed"),
    }


@router.get("/{task_id}")
def get_task(task_id: str, user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    t = _load(db.query(models.Task)).filter(models.Task.id == task_id, models.Task.user_id == user.id).first()
    if not t:
        raise HTTPException(404, "Task not found")
    return task_to_dict(t)


@router.post("/")
def create_task(data: TaskIn, user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    task = models.Task(
        id=str(uuid.uuid4()), user_id=user.id,
        title=data.title, description=data.description,
        status=data.status, priority=data.priority,
        due_date=data.due_date, due_time=data.due_time,
        scheduled_date=data.scheduled_date, scheduled_time=data.scheduled_time,
        is_recurring=data.is_recurring, recurrence=data.recurrence,
        recurrence_interval=data.recurrence_interval, recurrence_days=data.recurrence_days,
        recurrence_end_date=data.recurrence_end_date, recurrence_count=data.recurrence_count,
        estimated_minutes=data.estimated_minutes, category=data.category,
        color=data.color, notes=data.notes, tags=data.tags, parent_id=data.parent_id,
    )
    db.add(task)
    db.flush()
    for lid in data.label_ids:
        db.add(models.TaskLabel(task_id=task.id, label_id=lid))
    db.commit()
    return task_to_dict(_load(db.query(models.Task)).filter(models.Task.id == task.id).first())


@router.put("/{task_id}")
def update_task(task_id: str, data: TaskUpdate, user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    t = db.query(models.Task).filter(models.Task.id == task_id, models.Task.user_id == user.id).first()
    if not t:
        raise HTTPException(404, "Task not found")

    # Track deferral
    if data.due_date and t.due_date and data.due_date > t.due_date and t.status != "completed":
        t.defer_count += 1

    for field in ["title","description","status","priority","due_date","due_time",
                  "scheduled_date","scheduled_time","is_recurring","recurrence",
                  "recurrence_interval","recurrence_days","recurrence_end_date",
                  "recurrence_count","estimated_minutes","actual_minutes","category",
                  "color","notes","tags","order_index"]:
        val = getattr(data, field)
        if val is not None:
            setattr(t, field, val)

    if data.status == "completed" and not t.completed_at:
        t.completed_at = datetime.utcnow()
        # Auto-create next recurring instance
        if t.is_recurring and t.recurrence:
            _create_next_recurring(t, db, user.id)

    if data.label_ids is not None:
        db.query(models.TaskLabel).filter(models.TaskLabel.task_id == task_id).delete()
        for lid in data.label_ids:
            db.add(models.TaskLabel(task_id=task_id, label_id=lid))

    db.commit()
    return task_to_dict(_load(db.query(models.Task)).filter(models.Task.id == task_id).first())


def _create_next_recurring(t: models.Task, db: Session, user_id: str):
    """Create next instance of recurring task."""
    from datetime import date, timedelta
    if not t.due_date:
        return
    try:
        due = datetime.strptime(t.due_date, "%Y-%m-%d").date()
    except Exception:
        return

    delta = None
    if t.recurrence == "daily":
        delta = timedelta(days=t.recurrence_interval or 1)
    elif t.recurrence == "weekly":
        delta = timedelta(weeks=t.recurrence_interval or 1)
    elif t.recurrence == "monthly":
        # approximate
        delta = timedelta(days=30 * (t.recurrence_interval or 1))
    elif t.recurrence == "yearly":
        delta = timedelta(days=365)

    if not delta:
        return

    next_due = (due + delta).isoformat()
    if t.recurrence_end_date and next_due > t.recurrence_end_date:
        return

    new_task = models.Task(
        id=str(uuid.uuid4()), user_id=user_id,
        title=t.title, description=t.description,
        priority=t.priority, due_date=next_due, due_time=t.due_time,
        is_recurring=True, recurrence=t.recurrence,
        recurrence_interval=t.recurrence_interval, recurrence_days=t.recurrence_days,
        recurrence_end_date=t.recurrence_end_date, recurrence_count=t.recurrence_count,
        estimated_minutes=t.estimated_minutes, category=t.category,
        color=t.color, notes=t.notes, tags=t.tags or [], parent_id=t.parent_id,
    )
    db.add(new_task)


@router.post("/{task_id}/complete")
def complete_task(task_id: str, user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    t = db.query(models.Task).filter(models.Task.id == task_id, models.Task.user_id == user.id).first()
    if not t:
        raise HTTPException(404, "Task not found")
    t.status = "completed"
    t.completed_at = datetime.utcnow()
    if t.is_recurring and t.recurrence:
        _create_next_recurring(t, db, user.id)
    db.commit()
    return {"message": "Task completed"}


@router.post("/{task_id}/defer")
def defer_task(task_id: str, days: int = 1, user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    t = db.query(models.Task).filter(models.Task.id == task_id, models.Task.user_id == user.id).first()
    if not t:
        raise HTTPException(404, "Task not found")
    t.defer_count += 1
    if t.due_date:
        try:
            due = datetime.strptime(t.due_date, "%Y-%m-%d").date()
            t.due_date = (due + timedelta(days=days)).isoformat()
        except Exception:
            pass
    db.commit()
    return {"message": f"Task deferred by {days} day(s)", "defer_count": t.defer_count}


@router.delete("/{task_id}")
def delete_task(task_id: str, user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    t = db.query(models.Task).filter(models.Task.id == task_id, models.Task.user_id == user.id).first()
    if not t:
        raise HTTPException(404, "Task not found")
    db.delete(t)
    db.commit()
    return {"message": "Task deleted"}


@router.get("/categories/list")
def list_categories(user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    rows = db.query(models.Task.category).filter(
        models.Task.user_id == user.id,
        models.Task.category != None,
    ).distinct().all()
    return [r[0] for r in rows if r[0]]
