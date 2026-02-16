from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime

class BillItem(BaseModel):
    product_id: str
    product_name: str
    barcode: str
    quantity: int = Field(..., gt=0)
    price: float = Field(..., gt=0)
    gst_rate: float = Field(..., ge=0, le=100)
    item_total: float
    gst_amount: float

class BillCreate(BaseModel):
    items: List[BillItem]
    payment_method: str = Field(default="cash")  # cash, card, upi
    customer_name: Optional[str] = None

class BillResponse(BaseModel):
    id: str
    user_id: str
    bill_number: str
    items: List[BillItem]
    subtotal: float
    gst_amount: float
    total: float
    payment_method: str
    customer_name: Optional[str] = None
    created_at: str
