from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.deps import (
    get_current_user,
    get_db,
    require_admin_in_project,
    require_project_member,
)
from app.models.project import Project
from app.models.task import Task, TaskAssignee
from app.models.user import User
from app.schemas.task import TaskCreate, TaskOut, TaskUpdate

router = APIRouter(tags=["tasks"])

VALID_STATUSES = {"todo", "in_progress", "done"}
VALID_PRIORITIES = {"low", "medium", "high"}


@router.get("/projects/{project_id}/tasks", response_model=list[TaskOut])
def list_tasks(
    project_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    require_project_member(project_id, db, current_user)
    return db.query(Task).filter(Task.project_id == project_id).all()


@router.post(
    "/projects/{project_id}/tasks",
    response_model=TaskOut,
    status_code=status.HTTP_201_CREATED,
)
def create_task(
    project_id: str,
    payload: TaskCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    require_admin_in_project(project_id, db, current_user)
    project = db.get(Project, project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    if payload.priority not in VALID_PRIORITIES:
        raise HTTPException(status_code=400, detail="Invalid priority")
    task = Task(
        title=payload.title,
        description=payload.description,
        due_date=payload.due_date,
        priority=payload.priority,
        status="todo",
        project_id=project_id,
        assigned_to=payload.assignee_ids[0] if payload.assignee_ids else None,
        created_by=current_user.id,
    )
    db.add(task)
    db.flush()  # get task.id before adding assignees
    for uid in payload.assignee_ids:
        user_obj = db.get(User, uid)
        if user_obj:
            task.assignees.append(user_obj)
    db.commit()
    db.refresh(task)
    return task


@router.get("/tasks/{task_id}", response_model=TaskOut)
def get_task(
    task_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    task = db.get(Task, task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    require_project_member(task.project_id, db, current_user)
    return task


@router.put("/tasks/{task_id}", response_model=TaskOut)
def update_task(
    task_id: str,
    payload: TaskUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    task = db.get(Task, task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    member = require_project_member(task.project_id, db, current_user)

    is_admin = member.role == "admin"

    if not is_admin:
        # Members may only update tasks assigned to them
        assigned_ids = [a.id for a in task.assignees]
        if current_user.id not in assigned_ids and task.assigned_to != current_user.id:
            raise HTTPException(
                status_code=403, detail="Members can only update their own assigned tasks"
            )
        allowed_fields = {"status"}
        provided = {k for k, v in payload.model_dump(exclude_unset=True).items()}
        if not provided.issubset(allowed_fields):
            raise HTTPException(
                status_code=403, detail="Members can only update task status"
            )

    data = payload.model_dump(exclude_unset=True)
    if "status" in data and data["status"] not in VALID_STATUSES:
        raise HTTPException(status_code=400, detail="Invalid status")
    if "priority" in data and data["priority"] not in VALID_PRIORITIES:
        raise HTTPException(status_code=400, detail="Invalid priority")

    # Handle multi-assignee separately
    assignee_ids = data.pop("assignee_ids", None)
    if assignee_ids is not None:
        task.assignees = []
        for uid in assignee_ids:
            user_obj = db.get(User, uid)
            if user_obj:
                task.assignees.append(user_obj)
        task.assigned_to = assignee_ids[0] if assignee_ids else None

    for field, value in data.items():
        setattr(task, field, value)

    db.commit()
    db.refresh(task)
    return task


@router.delete("/tasks/{task_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_task(
    task_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    task = db.get(Task, task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    require_admin_in_project(task.project_id, db, current_user)
    db.delete(task)
    db.commit()
