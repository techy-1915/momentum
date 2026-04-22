"""Seed demo data for Momentum."""
import sys, os, uuid
sys.path.insert(0, os.path.dirname(__file__))

from database import engine, SessionLocal
import models
from auth_utils import hash_password
from datetime import datetime, date, timedelta

models.Base.metadata.create_all(bind=engine)
db = SessionLocal()

# Wipe
for m in [models.TimerSession, models.TaskLabel, models.Reminder, models.TimeBlock, models.Task, models.Label, models.User]:
    db.query(m).delete()
db.commit()

# ── User ──────────────────────────────────────────────────────────────────────
user = models.User(
    id=str(uuid.uuid4()), email="demo@momentum.app",
    password_hash=hash_password("demo123"),
    name="Alex Johnson", auth_token=str(uuid.uuid4()),
    avatar_color="#7C3AED", theme="dark",
)
db.add(user)
db.flush()

# ── Labels ────────────────────────────────────────────────────────────────────
labels = {}
for name, color in [("Work","#3B82F6"),("Personal","#10B981"),("Health","#EF4444"),("Learning","#F59E0B"),("Finance","#8B5CF6")]:
    l = models.Label(id=str(uuid.uuid4()), user_id=user.id, name=name, color=color)
    db.add(l)
    labels[name] = l
db.flush()

today = date.today()
def d(offset): return (today + timedelta(days=offset)).isoformat()

# ── Tasks ─────────────────────────────────────────────────────────────────────
tasks_data = [
    dict(title="Complete project proposal", priority="urgent", due_date=d(1), category="Work", status="in_progress",
         description="Finalize the Q3 proposal document and send to stakeholders", estimated_minutes=90, tags=["proposal","q3"]),
    dict(title="Team standup meeting", priority="high", due_date=d(0), due_time="09:30", category="Work", status="todo",
         description="Daily sync with engineering team", estimated_minutes=30, is_recurring=True, recurrence="daily"),
    dict(title="Morning workout", priority="medium", due_date=d(0), due_time="06:30", category="Health", status="todo",
         description="30 min cardio + strength training", estimated_minutes=45, is_recurring=True, recurrence="daily"),
    dict(title="Review pull requests", priority="high", due_date=d(0), category="Work", status="todo",
         estimated_minutes=60, tags=["code-review"]),
    dict(title="Read: Atomic Habits (ch. 7-9)", priority="low", due_date=d(3), category="Learning", status="todo",
         estimated_minutes=40),
    dict(title="Pay electricity bill", priority="high", due_date=d(2), category="Finance", status="todo"),
    dict(title="Grocery shopping", priority="medium", due_date=d(1), category="Personal", status="todo",
         description="Vegetables, fruits, milk, eggs", tags=["shopping"]),
    dict(title="Dentist appointment", priority="high", due_date=d(5), due_time="14:00", category="Health", status="todo"),
    dict(title="Weekly review", priority="medium", due_date=d(6), category="Work", status="todo",
         description="Review goals, plan next week", estimated_minutes=30, is_recurring=True, recurrence="weekly"),
    dict(title="Update resume", priority="low", due_date=d(14), category="Personal", status="todo"),
    dict(title="Fix login bug #234", priority="urgent", due_date=d(-1), category="Work", status="todo",
         description="Users can't login on Safari — investigate", defer_count=2),
    dict(title="Meditation session", priority="low", due_date=d(0), due_time="07:00", category="Health", status="completed",
         completed_at=datetime.utcnow()),
    dict(title="Call mom", priority="medium", due_date=d(-2), category="Personal", status="completed",
         completed_at=datetime.utcnow() - timedelta(days=2)),
    dict(title="Deploy staging release", priority="high", due_date=d(0), category="Work", status="todo",
         estimated_minutes=20),
    dict(title="Budget review for June", priority="medium", due_date=d(7), category="Finance", status="todo"),
]

task_objs = []
for td in tasks_data:
    t = models.Task(id=str(uuid.uuid4()), user_id=user.id, **td)
    db.add(t)
    task_objs.append((t, td))
db.flush()

# Add labels to tasks
label_map = {"Work":"Work","Health":"Health","Personal":"Personal","Learning":"Learning","Finance":"Finance"}
for t, td in task_objs:
    cat = td.get("category")
    if cat and cat in label_map:
        db.add(models.TaskLabel(task_id=t.id, label_id=labels[label_map[cat]].id))

# ── Reminders ─────────────────────────────────────────────────────────────────
reminders_data = [
    dict(title="Team standup in 15 mins", remind_at=datetime.utcnow() + timedelta(minutes=15)),
    dict(title="Electricity bill due tomorrow!", remind_at=datetime.utcnow() + timedelta(hours=2)),
    dict(title="Dentist appointment reminder", remind_at=datetime.utcnow() + timedelta(days=4, hours=20)),
]
for rd in reminders_data:
    db.add(models.Reminder(id=str(uuid.uuid4()), user_id=user.id, message="Don't forget!", **rd))

# ── Timetable ─────────────────────────────────────────────────────────────────
blocks = [
    dict(title="Deep Work Block", day_of_week=0, start_time="09:00", end_time="11:00", color="#7C3AED", category="Work"),
    dict(title="Deep Work Block", day_of_week=1, start_time="09:00", end_time="11:00", color="#7C3AED", category="Work"),
    dict(title="Deep Work Block", day_of_week=2, start_time="09:00", end_time="11:00", color="#7C3AED", category="Work"),
    dict(title="Deep Work Block", day_of_week=3, start_time="09:00", end_time="11:00", color="#7C3AED", category="Work"),
    dict(title="Deep Work Block", day_of_week=4, start_time="09:00", end_time="11:00", color="#7C3AED", category="Work"),
    dict(title="Morning Workout", day_of_week=0, start_time="06:30", end_time="07:30", color="#EF4444", category="Health"),
    dict(title="Morning Workout", day_of_week=2, start_time="06:30", end_time="07:30", color="#EF4444", category="Health"),
    dict(title="Morning Workout", day_of_week=4, start_time="06:30", end_time="07:30", color="#EF4444", category="Health"),
    dict(title="Lunch Break", day_of_week=0, start_time="13:00", end_time="14:00", color="#10B981", category="Personal"),
    dict(title="Lunch Break", day_of_week=1, start_time="13:00", end_time="14:00", color="#10B981", category="Personal"),
    dict(title="Lunch Break", day_of_week=2, start_time="13:00", end_time="14:00", color="#10B981", category="Personal"),
    dict(title="Lunch Break", day_of_week=3, start_time="13:00", end_time="14:00", color="#10B981", category="Personal"),
    dict(title="Lunch Break", day_of_week=4, start_time="13:00", end_time="14:00", color="#10B981", category="Personal"),
    dict(title="Learning Time", day_of_week=1, start_time="19:00", end_time="20:30", color="#F59E0B", category="Learning"),
    dict(title="Learning Time", day_of_week=3, start_time="19:00", end_time="20:30", color="#F59E0B", category="Learning"),
    dict(title="Weekly Review", day_of_week=6, start_time="10:00", end_time="11:00", color="#3B82F6", category="Work"),
]
for b in blocks:
    db.add(models.TimeBlock(id=str(uuid.uuid4()), user_id=user.id, is_recurring=True, **b))

# ── Timer sessions (history) ──────────────────────────────────────────────────
for i in range(5):
    db.add(models.TimerSession(
        id=str(uuid.uuid4()), user_id=user.id, timer_type="pomodoro",
        target_seconds=1500, actual_seconds=1500, status="completed",
        started_at=datetime.utcnow() - timedelta(days=i, hours=2),
        ended_at=datetime.utcnow() - timedelta(days=i, hours=1, minutes=35),
    ))

db.commit()
print("✅ Momentum seeded successfully!")
print(f"   Login: demo@momentum.app / demo123")
print(f"   Tasks: {len(tasks_data)} | Labels: {len(labels)} | Blocks: {len(blocks)}")
