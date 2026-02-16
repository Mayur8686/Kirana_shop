from pydantic import BaseModel, EmailStr, Field
from typing import Optional
from datetime import datetime

class UserSignup(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=6)
    store_name: str
    owner_name: str
    phone: str
    gst_number: Optional[str] = None
    store_code: str = Field(..., min_length=2, max_length=4)  # For bill numbering

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    id: str
    email: str
    store_name: str
    owner_name: str
    phone: str
    gst_number: Optional[str] = None
    store_code: str
    created_at: str
