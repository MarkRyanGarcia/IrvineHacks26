from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime


class PropertiesCreate(BaseModel):
    user_id: str
    address: str
    city: str
    price: float
    sqft: float
    beds: int
    baths: float
    property_type: str
    school_score: float
    zip_code: str
    commute_minutes: int


class PropertiesOut(BaseModel):
    id: int
    user_id: str
    address: str
    city: str
    price: float
    sqft: float
    beds: int
    baths: float
    property_type: str
    school_score: float
    zip_code: str
    commute_minutes: int
    created_at: datetime
