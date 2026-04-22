import uuid
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Optional
from pydantic import BaseModel
from database import get_db
import models
from routers.auth import get_current_user

router = APIRouter(prefix="/api/timers", tags=["timers"])


class TimerSessionIn(BaseModel):
    task_id: Optional[str] = None
    timer_type: str = "pomodoro"   # pomodoro|stopwatch|countdown
    target_seconds: Optional[int] = None
    actual_seconds: int = 0
    status: str = "completed"
    notes: Optional[str] = None
    started_at: Optional[str] = None  # ISO datetime


def session_dict(s: models.TimerSession) -> dict:
    return {
        "id": s.id, "task_id": s.task_id, "user_id": s.user_id,
        "timer_type": s.timer_type, "target_seconds": s.target_seconds,
        "actual_seconds": s.actual_seconds, "status": s.status, "notes": s.notes,
        "started_at": s.started_at.isoformat() if s.started_at else None,
        "ended_at": s.ended_at.isoformat() if s.ended_at else None,
        "task_title": s.task.title if s.task else None,
    }


@router.get("/")
def list_sessions(
    limit: int = 50,
    user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    rows = db.query(models.TimerSession).filter(
        models.TimerSession.user_id == user.id
    ).order_by(models.TimerSession.started_at.desc()).limit(limit).all()
    return [session_dict(s) for s in rows]


@router.get("/today")
def today_sessions(user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    rows = db.query(models.TimerSession).filter(
        models.TimerSession.user_id == user.id,
        models.TimerSession.started_at >= today_start,
    ).all()
    total_seconds = sum(s.actual_seconds for s in rows)
    pomodoros = sum(1 for s in rows if s.timer_type == "pomodoro" and s.status == "completed")
    return {
        "sessions": [session_dict(s) for s in rows],
        "total_focus_seconds": total_seconds,
        "pomodoros_completed": pomodoros,
        "total_focus_minutes": round(total_seconds / 60, 1),
    }


@router.post("/")
def save_session(data: TimerSessionIn, user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    started_at = datetime.fromisoformat(data.started_at) if data.started_at else datetime.utcnow()
    s = models.TimerSession(
        id=str(uuid.uuid4()), user_id=user.id,
        task_id=data.task_id, timer_type=data.timer_type,
        target_seconds=data.target_seconds, actual_seconds=data.actual_seconds,
        status=data.status, notes=data.notes,
        started_at=started_at, ended_at=datetime.utcnow(),
    )
    db.add(s)
    # Update actual_minutes on task
    if data.task_id and data.actual_seconds > 0:
        task = db.query(models.Task).filter(models.Task.id == data.task_id, models.Task.user_id == user.id).first()
        if task:
            task.actual_minutes = (task.actual_minutes or 0) + round(data.actual_seconds / 60)
    db.commit()
    return session_dict(s)


@router.delete("/{session_id}")
def delete_session(session_id: str, user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    s = db.query(models.TimerSession).filter(
        models.TimerSession.id == session_id, models.TimerSession.user_id == user.id
    ).first()
    if not s:
        raise HTTPException(404, "Session not found")
    db.delete(s)
    db.commit()
    return {"message": "Deleted"}
