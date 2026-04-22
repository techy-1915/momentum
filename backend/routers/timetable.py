import uuid
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Optional
from pydantic import BaseModel
from database import get_db
import models
from routers.auth import get_current_user

router = APIRouter(prefix="/api/timetable", tags=["timetable"])


class TimeBlockIn(BaseModel):
    title: str
    description: Optional[str] = None
    day_of_week: Optional[int] = None   # 0=Mon … 6=Sun
    specific_date: Optional[str] = None
    start_time: str                     # "HH:MM"
    end_time: str
    color: str = "#7C3AED"
    category: Optional[str] = None
    is_recurring: bool = True


def block_dict(b: models.TimeBlock) -> dict:
    return {
        "id": b.id, "user_id": b.user_id, "title": b.title,
        "description": b.description, "day_of_week": b.day_of_week,
        "specific_date": b.specific_date, "start_time": b.start_time,
        "end_time": b.end_time, "color": b.color, "category": b.category,
        "is_recurring": b.is_recurring,
        "created_at": b.created_at.isoformat() if b.created_at else None,
    }


@router.get("/")
def list_blocks(
    week_date: Optional[str] = None,  # any date in the week "YYYY-MM-DD"
    user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    blocks = db.query(models.TimeBlock).filter(models.TimeBlock.user_id == user.id).all()
    if week_date:
        # Return recurring + blocks whose specific_date falls in same week
        from datetime import datetime, timedelta
        ref = datetime.strptime(week_date, "%Y-%m-%d").date()
        week_start = ref - timedelta(days=ref.weekday())
        week_end = week_start + timedelta(days=6)
        blocks = [b for b in blocks if b.is_recurring or (
            b.specific_date and week_start.isoformat() <= b.specific_date <= week_end.isoformat()
        )]
    return [block_dict(b) for b in blocks]


@router.post("/")
def create_block(data: TimeBlockIn, user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    b = models.TimeBlock(
        id=str(uuid.uuid4()), user_id=user.id,
        title=data.title, description=data.description,
        day_of_week=data.day_of_week, specific_date=data.specific_date,
        start_time=data.start_time, end_time=data.end_time,
        color=data.color, category=data.category, is_recurring=data.is_recurring,
    )
    db.add(b)
    db.commit()
    return block_dict(b)


@router.put("/{block_id}")
def update_block(block_id: str, data: TimeBlockIn,
                 user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    b = db.query(models.TimeBlock).filter(models.TimeBlock.id == block_id, models.TimeBlock.user_id == user.id).first()
    if not b:
        raise HTTPException(404, "Block not found")
    for field in ["title","description","day_of_week","specific_date","start_time","end_time","color","category","is_recurring"]:
        setattr(b, field, getattr(data, field))
    db.commit()
    return block_dict(b)


@router.delete("/{block_id}")
def delete_block(block_id: str, user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    b = db.query(models.TimeBlock).filter(models.TimeBlock.id == block_id, models.TimeBlock.user_id == user.id).first()
    if not b:
        raise HTTPException(404, "Block not found")
    db.delete(b)
    db.commit()
    return {"message": "Deleted"}
