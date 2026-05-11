from pydantic import BaseModel


class UserTaskCount(BaseModel):
    user_id: str
    user_name: str
    task_count: int


class OverdueTaskItem(BaseModel):
    id: str
    title: str
    project_name: str
    due_date: str
    priority: str


class UpcomingTaskItem(BaseModel):
    id: str
    title: str
    project_name: str
    due_date: str
    priority: str


class DashboardStats(BaseModel):
    total_tasks: int
    todo: int
    in_progress: int
    done: int
    overdue: int
    completion_rate: float
    tasks_per_user: list[UserTaskCount]
    priority_breakdown: dict[str, int]
    recent_overdue: list[OverdueTaskItem]
    upcoming_tasks: list[UpcomingTaskItem]
