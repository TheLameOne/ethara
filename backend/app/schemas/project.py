from datetime import datetime

from pydantic import BaseModel, EmailStr

from app.schemas.user import UserOut


class ProjectCreate(BaseModel):
    name: str
    description: str | None = None


class ProjectUpdate(BaseModel):
    name: str | None = None
    description: str | None = None


class MemberOut(BaseModel):
    user: UserOut
    role: str

    model_config = {"from_attributes": True}


class ProjectOut(BaseModel):
    id: str
    name: str
    description: str | None
    created_by: str | None
    created_at: datetime
    members: list[MemberOut] = []

    model_config = {"from_attributes": True}


class AddMemberRequest(BaseModel):
    email: EmailStr
    role: str = "member"
