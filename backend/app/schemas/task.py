from datetime import date, datetime

from pydantic import BaseModel

from app.schemas.user import UserOut


class TaskCreate(BaseModel):
    title: str
    description: str | None = None
    due_date: date | None = None
    priority: str = "medium"
    assignee_ids: list[str] = []


class TaskUpdate(BaseModel):
    title: str | None = None
    description: str | None = None
    due_date: date | None = None
    priority: str | None = None
    status: str | None = None
    assignee_ids: list[str] | None = None


class TaskStatusUpdate(BaseModel):
    status: str


class TaskOut(BaseModel):
    id: str
    title: str
    description: str | None
    due_date: date | None
    priority: str
    status: str
    project_id: str
    assigned_to: str | None
    created_by: str | None
    created_at: datetime
    assignee: UserOut | None = None
    assignees: list[UserOut] = []

    model_config = {"from_attributes": True}
