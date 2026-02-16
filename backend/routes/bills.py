from fastapi import APIRouter, HTTPException, status, Query, Header
from motor.motor_asyncio import AsyncIOMotorDatabase
from models.bill import BillCreate, BillResponse, BillItem
from utils.auth_middleware import get_current_user
from datetime import datetime
from bson import ObjectId
from typing import List, Optional

router = APIRouter(prefix="/bills", tags=["Bills"])

def get_db():
    from server import db
    return db

async def generate_bill_number(db, user_id: str, store_code: str) -> str:
    """Generate bill number in format: STORECODE-YYYYMMDD-001"""
    today = datetime.utcnow().strftime("%Y%m%d")
    prefix = f"{store_code}-{today}"
    
    # Count today's bills
    count = await db.bills.count_documents({
        "user_id": user_id,
        "bill_number": {"$regex": f"^{prefix}"}
    })
    
    sequence = str(count + 1).zfill(3)
    return f"{prefix}-{sequence}"

@router.post("/", response_model=BillResponse)
async def create_bill(bill_data: BillCreate, authorization: Optional[str] = Header(None)):
    """Create new bill and deduct stock"""
    db = get_db()
    user = await get_current_user(authorization=authorization, db=db)
    user_id = str(user["_id"])
    store_code = user["store_code"]
    
    if not bill_data.items:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Bill must contain at least one item"
        )
    
    # Validate stock availability for all items
    for item in bill_data.items:
        try:
            product = await db.products.find_one({
                "_id": ObjectId(item.product_id),
                "user_id": user_id
            })
        except:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid product ID: {item.product_id}"
            )
        
        if not product:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Product not found: {item.product_name}"
            )
        
        # Check stock availability
        if product["stock"] < item.quantity:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Insufficient stock for {item.product_name}. Available: {product['stock']}, Requested: {item.quantity}"
            )
    
    # Calculate totals
    subtotal = sum(item.item_total for item in bill_data.items)
    total_gst = sum(item.gst_amount for item in bill_data.items)
    grand_total = subtotal + total_gst
    
    # Generate bill number
    bill_number = await generate_bill_number(db, user_id, store_code)
    
    # Create bill document
    bill_dict = {
        "user_id": user_id,
        "bill_number": bill_number,
        "items": [item.dict() for item in bill_data.items],
        "subtotal": subtotal,
        "gst_amount": total_gst,
        "total": grand_total,
        "payment_method": bill_data.payment_method,
        "customer_name": bill_data.customer_name,
        "created_at": datetime.utcnow()
    }
    
    # Insert bill
    result = await db.bills.insert_one(bill_dict)
    bill_id = str(result.inserted_id)
    
    # Deduct stock for each item
    for item in bill_data.items:
        await db.products.update_one(
            {"_id": ObjectId(item.product_id)},
            {"$inc": {"stock": -item.quantity}}
        )
        
        # Create sales log entry
        await db.sales_logs.insert_one({
            "user_id": user_id,
            "product_id": item.product_id,
            "product_name": item.product_name,
            "quantity": item.quantity,
            "price": item.price,
            "total": item.item_total + item.gst_amount,
            "bill_id": bill_id,
            "date": datetime.utcnow()
        })
    
    return BillResponse(
        id=bill_id,
        user_id=user_id,
        bill_number=bill_number,
        items=bill_data.items,
        subtotal=subtotal,
        gst_amount=total_gst,
        total=grand_total,
        payment_method=bill_data.payment_method,
        customer_name=bill_data.customer_name,
        created_at=bill_dict["created_at"].isoformat()
    )

@router.get("/", response_model=List[BillResponse])
async def get_bills(
    authorization: Optional[str] = Header(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=500)
):
    """Get all bills for authenticated user"""
    db = get_db()
    user = await get_current_user(authorization=authorization, db=db)
    user_id = str(user["_id"])
    
    bills = await db.bills.find(
        {"user_id": user_id}
    ).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
    
    return [
        BillResponse(
            id=str(b["_id"]),
            user_id=b["user_id"],
            bill_number=b["bill_number"],
            items=[BillItem(**item) for item in b["items"]],
            subtotal=b["subtotal"],
            gst_amount=b["gst_amount"],
            total=b["total"],
            payment_method=b["payment_method"],
            customer_name=b.get("customer_name"),
            created_at=b["created_at"].isoformat()
        )
        for b in bills
    ]

@router.get("/{bill_id}", response_model=BillResponse)
async def get_bill(bill_id: str, authorization: Optional[str] = Header(None)):
    """Get single bill by ID"""
    db = get_db()
    user = await get_current_user(authorization=authorization, db=db)
    user_id = str(user["_id"])
    
    try:
        bill = await db.bills.find_one({
            "_id": ObjectId(bill_id),
            "user_id": user_id
        })
    except:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid bill ID"
        )
    
    if not bill:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Bill not found"
        )
    
    return BillResponse(
        id=str(bill["_id"]),
        user_id=bill["user_id"],
        bill_number=bill["bill_number"],
        items=[BillItem(**item) for item in bill["items"]],
        subtotal=bill["subtotal"],
        gst_amount=bill["gst_amount"],
        total=bill["total"],
        payment_method=bill["payment_method"],
        customer_name=bill.get("customer_name"),
        created_at=bill["created_at"].isoformat()
    )
