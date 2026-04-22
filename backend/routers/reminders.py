import uuid
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Optional
from pydantic import BaseModel
from database import get_db
import models
from routers.auth import get_current_user

router = APIRouter(prefix="/api/reminders", tags=["reminders"])


class ReminderIn(BaseModel):
    title: str
    message: Optional[str] = None
    remind_at: str          # ISO datetime "YYYY-MM-DDTHH:MM:SS"
    task_id: Optional[str] = None
    repeat: Optional[str] = None  # none|daily|weekly

class ReminderUpdate(BaseModel):
    title: Optional[str] = None
    message: Optional[str] = None
    remind_at: Optional[str] = None
    is_dismissed: Optional[bool] = None


def rem_dict(r: models.Reminder) -> dict:
    return {
        "id": r.id, "task_id": r.task_id, "user_id": r.user_id,
        "title": r.title, "message": r.message,
        "remind_at": r.remind_at.isoformat() if r.remind_at else None,
        "is_sent": r.is_sent, "is_dismissed": r.is_dismissed,
        "repeat": r.repeat,
        "created_at": r.created_at.isoformat() if r.created_at else None,
        "task_title": r.task.title if r.task else None,
    }


@router.get("/")
def list_reminders(
    upcoming: bool = False,
    user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    q = db.query(models.Reminder).filter(models.Reminder.user_id == user.id)
    if upcoming:
        q = q.filter(
            models.Reminder.remind_at >= datetime.utcnow(),
            models.Reminder.is_dismissed == False,
        )
    rows = q.order_by(models.Reminder.remind_at).all()
    return [rem_dict(r) for r in rows]


@router.get("/pending")
def pending_reminders(user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Returns reminders whose remind_at has passed and not yet sent or dismissed."""
    now = datetime.utcnow()
    rows = db.query(models.Reminder).filter(
        models.Reminder.user_id == user.id,
        models.Reminder.remind_at <= now,
        models.Reminder.is_sent == False,
        models.Reminder.is_dismissed == False,
    ).all()
    return [rem_dict(r) for r in rows]


@router.post("/")
def create_reminder(data: ReminderIn, user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    remind_at = datetime.fromisoformat(data.remind_at)
    r = models.Reminder(
        id=str(uuid.uuid4()), user_id=user.id,
        task_id=data.task_id, title=data.title,
        message=data.message, remind_at=remind_at, repeat=data.repeat,
    )
    db.add(r)
    db.commit()
    return rem_dict(r)


@router.put("/{reminder_id}")
def update_reminder(reminder_id: str, data: ReminderUpdate,
                    user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    r = db.query(models.Reminder).filter(
        models.Reminder.id == reminder_id, models.Reminder.user_id == user.id
    ).first()
    if not r:
        raise HTTPException(404, "Reminder not found")
    if data.title is not None: r.title = data.title
    if data.message is not None: r.message = data.message
    if data.remind_at is not None: r.remind_at = datetime.fromisoformat(data.remind_at)
    if data.is_dismissed is not None: r.is_dismissed = data.is_dismissed
    db.commit()
    return rem_dict(r)


@router.post("/{reminder_id}/sent")
def mark_sent(reminder_id: str, user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    r = db.query(models.Reminder).filter(
        models.Reminder.id == reminder_id, models.Reminder.user_id == user.id
    ).first()
    if not r:
        raise HTTPException(404, "Reminder not found")
    r.is_sent = True
    # Schedule next if repeating
    if r.repeat == "daily":
        new_r = models.Reminder(
            id=str(uuid.uuid4()), user_id=user.id, task_id=r.task_id,
            title=r.title, message=r.message, repeat=r.repeat,
            remind_at=r.remind_at + timedelta(days=1),
        )
        db.add(new_r)
    elif r.repeat == "weekly":
        new_r = models.Reminder(
            id=str(uuid.uuid4()), user_id=user.id, task_id=r.task_id,
            title=r.title, message=r.message, repeat=r.repeat,
            remind_at=r.remind_at + timedelta(weeks=1),
        )
        db.add(new_r)
    db.commit()
    return {"message": "Marked sent"}


@router.post("/{reminder_id}/snooze")
def snooze_reminder(reminder_id: str, minutes: int = 15,
                    user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    r = db.query(models.Reminder).filter(
        models.Reminder.id == reminder_id, models.Reminder.user_id == user.id
    ).first()
    if not r:
        raise HTTPException(404, "Reminder not found")
    r.remind_at = datetime.utcnow() + timedelta(minutes=minutes)
    r.is_sent = False
    db.commit()
    return {"message": f"Snoozed for {minutes} minutes"}


@router.delete("/{reminder_id}")
def delete_reminder(reminder_id: str, user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    r = db.query(models.Reminder).filter(
        models.Reminder.id == reminder_id, models.Reminder.user_id == user.id
    ).first()
    if not r:
        raise HTTPException(404, "Reminder not found")
    db.delete(r)
    db.commit()
    return {"message": "Deleted"}
