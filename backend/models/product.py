from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime

class ProductCreate(BaseModel):
    name: str
    barcode: str
    price: float = Field(..., gt=0)
    stock: int = Field(..., ge=0)
    min_stock_alert: int = Field(default=10, ge=0)
    category: Optional[str] = None
    image_base64: Optional[str] = None
    gst_rate: float = Field(default=18.0, ge=0, le=100)  # GST percentage

class ProductUpdate(BaseModel):
    name: Optional[str] = None
    barcode: Optional[str] = None
    price: Optional[float] = Field(None, gt=0)
    stock: Optional[int] = Field(None, ge=0)
    min_stock_alert: Optional[int] = Field(None, ge=0)
    category: Optional[str] = None
    image_base64: Optional[str] = None
    gst_rate: Optional[float] = Field(None, ge=0, le=100)

class ProductResponse(BaseModel):
    id: str
    user_id: str
    name: str
    barcode: str
    price: float
    stock: int
    min_stock_alert: int
    category: Optional[str] = None
    image_base64: Optional[str] = None
    gst_rate: float
    created_at: str
    updated_at: str
