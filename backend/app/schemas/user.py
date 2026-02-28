from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime


class UserCreate(BaseModel):
    id: str
    username: str
    email: Optional[EmailStr] = None


class UserOut(BaseModel):
    id: str
    username: str
    email: Optional[EmailStr] = None
    created_at: datetime

    class Config:
        form_attributes = True
