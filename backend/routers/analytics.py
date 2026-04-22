from datetime import datetime, date, timedelta
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from database import get_db
import models
from routers.auth import get_current_user

router = APIRouter(prefix="/api/analytics", tags=["analytics"])


@router.get("/summary")
def summary(user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    all_tasks = db.query(models.Task).filter(
        models.Task.user_id == user.id,
        models.Task.parent_id == None,
    ).all()
    today = date.today().isoformat()
    week_ago = (date.today() - timedelta(days=7)).isoformat()

    completed_total = [t for t in all_tasks if t.status == "completed"]
    completed_week = [t for t in completed_total
                      if t.completed_at and t.completed_at.date().isoformat() >= week_ago]

    total_focus_s = sum(
        s.actual_seconds for s in
        db.query(models.TimerSession).filter(models.TimerSession.user_id == user.id).all()
    )

    # Streak: consecutive days with at least 1 completion
    streak = 0
    check = date.today()
    while True:
        day_str = check.isoformat()
        completed_on_day = any(
            t.completed_at and t.completed_at.date().isoformat() == day_str
            for t in completed_total
        )
        if completed_on_day:
            streak += 1
            check -= timedelta(days=1)
        else:
            break

    return {
        "total_tasks": len(all_tasks),
        "completed_total": len(completed_total),
        "completed_this_week": len(completed_week),
        "completion_rate": round(len(completed_total) / len(all_tasks) * 100, 1) if all_tasks else 0,
        "overdue": sum(1 for t in all_tasks if t.status in ["todo","in_progress"] and t.due_date and t.due_date < today),
        "high_priority_pending": sum(1 for t in all_tasks if t.priority in ["high","urgent"] and t.status != "completed"),
        "total_focus_hours": round(total_focus_s / 3600, 1),
        "streak_days": streak,
    }


@router.get("/completion-trend")
def completion_trend(days: int = 30, user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    completed = db.query(models.Task).filter(
        models.Task.user_id == user.id,
        models.Task.status == "completed",
        models.Task.completed_at != None,
    ).all()
    result = []
    for i in range(days - 1, -1, -1):
        d = (date.today() - timedelta(days=i)).isoformat()
        count = sum(1 for t in completed if t.completed_at and t.completed_at.date().isoformat() == d)
        result.append({"date": d, "completed": count})
    return result


@router.get("/priority-distribution")
def priority_dist(user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    tasks = db.query(models.Task).filter(
        models.Task.user_id == user.id,
        models.Task.status != "completed",
        models.Task.parent_id == None,
    ).all()
    dist = {"low": 0, "medium": 0, "high": 0, "urgent": 0}
    for t in tasks:
        if t.priority in dist:
            dist[t.priority] += 1
    return [{"priority": k, "count": v} for k, v in dist.items()]


@router.get("/category-breakdown")
def category_breakdown(user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    tasks = db.query(models.Task).filter(
        models.Task.user_id == user.id,
        models.Task.parent_id == None,
    ).all()
    cats: dict = {}
    for t in tasks:
        cat = t.category or "Uncategorized"
        if cat not in cats:
            cats[cat] = {"total": 0, "completed": 0}
        cats[cat]["total"] += 1
        if t.status == "completed":
            cats[cat]["completed"] += 1
    return [{"category": k, **v, "rate": round(v["completed"]/v["total"]*100,1) if v["total"] else 0}
            for k, v in cats.items()]


@router.get("/focus-trend")
def focus_trend(days: int = 14, user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    sessions = db.query(models.TimerSession).filter(
        models.TimerSession.user_id == user.id,
    ).all()
    result = []
    for i in range(days - 1, -1, -1):
        d = (date.today() - timedelta(days=i)).isoformat()
        secs = sum(s.actual_seconds for s in sessions
                   if s.started_at and s.started_at.date().isoformat() == d)
        result.append({"date": d, "minutes": round(secs / 60)})
    return result


@router.get("/weekly-heatmap")
def weekly_heatmap(user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    completed = db.query(models.Task).filter(
        models.Task.user_id == user.id,
        models.Task.status == "completed",
        models.Task.completed_at != None,
    ).all()
    # Last 12 weeks
    result = []
    for i in range(83, -1, -1):
        d = (date.today() - timedelta(days=i))
        count = sum(1 for t in completed if t.completed_at and t.completed_at.date() == d)
        result.append({"date": d.isoformat(), "count": count, "weekday": d.weekday()})
    return result
