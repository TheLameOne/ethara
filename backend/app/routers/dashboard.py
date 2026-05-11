from datetime import timedelta
from datetime import date, timezone
from datetime import datetime as dt

from fastapi import APIRouter, Depends
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core.deps import get_current_user, get_db
from app.models.project import Project, ProjectMember
from app.models.task import Task, TaskAssignee
from app.models.user import User
from app.schemas.dashboard import (
    DashboardStats,
    OverdueTaskItem,
    UpcomingTaskItem,
    UserTaskCount,
)

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("", response_model=DashboardStats)
def get_dashboard(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # Projects the user belongs to
    project_ids = [
        m.project_id
        for m in db.query(ProjectMember)
        .filter(ProjectMember.user_id == current_user.id)
        .all()
    ]

    if not project_ids:
        return DashboardStats(
            total_tasks=0,
            todo=0,
            in_progress=0,
            done=0,
            overdue=0,
            completion_rate=0.0,
            tasks_per_user=[],
            priority_breakdown={"high": 0, "medium": 0, "low": 0},
            recent_overdue=[],
            upcoming_tasks=[],
        )

    tasks_q = db.query(Task).filter(Task.project_id.in_(project_ids))
    all_tasks = tasks_q.all()

    today = dt.now(timezone.utc).date()
    total = len(all_tasks)
    todo = sum(1 for t in all_tasks if t.status == "todo")
    in_progress = sum(1 for t in all_tasks if t.status == "in_progress")
    done = sum(1 for t in all_tasks if t.status == "done")
    overdue = sum(
        1
        for t in all_tasks
        if t.due_date and t.due_date < today and t.status != "done"
    )
    completion_rate = round((done / total * 100) if total > 0 else 0.0, 1)

    priority_breakdown = {
        "high": sum(1 for t in all_tasks if t.priority == "high"),
        "medium": sum(1 for t in all_tasks if t.priority == "medium"),
        "low": sum(1 for t in all_tasks if t.priority == "low"),
    }

    # Tasks per user (via junction table)
    rows = (
        db.query(User.id, User.name, func.count(TaskAssignee.task_id).label("cnt"))
        .join(TaskAssignee, TaskAssignee.user_id == User.id)
        .join(Task, Task.id == TaskAssignee.task_id)
        .filter(Task.project_id.in_(project_ids))
        .group_by(User.id, User.name)
        .all()
    )
    tasks_per_user = [
        UserTaskCount(user_id=str(r.id), user_name=r.name, task_count=r.cnt)
        for r in rows
    ]

    # Recent overdue (up to 5)
    overdue_rows = (
        db.query(Task, Project.name.label("project_name"))
        .join(Project, Project.id == Task.project_id)
        .filter(
            Task.project_id.in_(project_ids),
            Task.due_date < today,
            Task.status != "done",
        )
        .order_by(Task.due_date.asc())
        .limit(5)
        .all()
    )
    recent_overdue = [
        OverdueTaskItem(
            id=str(t.Task.id),
            title=t.Task.title,
            project_name=t.project_name,
            due_date=str(t.Task.due_date),
            priority=t.Task.priority,
        )
        for t in overdue_rows
    ]

    # Upcoming tasks — next 7 days (up to 5)
    upcoming_rows = (
        db.query(Task, Project.name.label("project_name"))
        .join(Project, Project.id == Task.project_id)
        .filter(
            Task.project_id.in_(project_ids),
            Task.due_date >= today,
            Task.due_date <= today + timedelta(days=7),
            Task.status != "done",
        )
        .order_by(Task.due_date.asc())
        .limit(5)
        .all()
    )
    upcoming_tasks = [
        UpcomingTaskItem(
            id=str(t.Task.id),
            title=t.Task.title,
            project_name=t.project_name,
            due_date=str(t.Task.due_date),
            priority=t.Task.priority,
        )
        for t in upcoming_rows
    ]

    return DashboardStats(
        total_tasks=total,
        todo=todo,
        in_progress=in_progress,
        done=done,
        overdue=overdue,
        completion_rate=completion_rate,
        tasks_per_user=tasks_per_user,
        priority_breakdown=priority_breakdown,
        recent_overdue=recent_overdue,
        upcoming_tasks=upcoming_tasks,
    )
