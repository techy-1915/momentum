import uuid
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Optional
from pydantic import BaseModel
from database import get_db
import models
from routers.auth import get_current_user

router = APIRouter(prefix="/api/labels", tags=["labels"])


class LabelIn(BaseModel):
    name: str
    color: str = "#6366F1"
    icon: Optional[str] = None


@router.get("/")
def list_labels(user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    labels = db.query(models.Label).filter(models.Label.user_id == user.id).all()
    return [{"id": l.id, "name": l.name, "color": l.color, "icon": l.icon,
             "task_count": len(l.task_labels)} for l in labels]


@router.post("/")
def create_label(data: LabelIn, user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    l = models.Label(id=str(uuid.uuid4()), user_id=user.id,
                     name=data.name, color=data.color, icon=data.icon)
    db.add(l)
    db.commit()
    return {"id": l.id, "name": l.name, "color": l.color, "icon": l.icon, "task_count": 0}


@router.put("/{label_id}")
def update_label(label_id: str, data: LabelIn,
                 user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    l = db.query(models.Label).filter(models.Label.id == label_id, models.Label.user_id == user.id).first()
    if not l:
        raise HTTPException(404, "Label not found")
    l.name = data.name
    l.color = data.color
    if data.icon is not None:
        l.icon = data.icon
    db.commit()
    return {"id": l.id, "name": l.name, "color": l.color, "icon": l.icon}


@router.delete("/{label_id}")
def delete_label(label_id: str, user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    l = db.query(models.Label).filter(models.Label.id == label_id, models.Label.user_id == user.id).first()
    if not l:
        raise HTTPException(404, "Label not found")
    db.delete(l)
    db.commit()
    return {"message": "Deleted"}
