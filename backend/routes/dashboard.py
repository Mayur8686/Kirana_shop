from fastapi import APIRouter, HTTPException, status, Header
from motor.motor_asyncio import AsyncIOMotorDatabase
from utils.auth_middleware import get_current_user
from datetime import datetime, timedelta
from bson import ObjectId
from typing import List, Dict, Optional

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])

def get_db():
    from server import db
    return db

@router.get("/stats")
async def get_dashboard_stats(authorization: Optional[str] = Header(None)):
    """Get dashboard statistics"""
    db = get_db()
    user = await get_current_user(authorization=authorization, db=db)
    user_id = str(user["_id"])
    
    # Get today's date range
    today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    today_end = today_start + timedelta(days=1)
    
    # Today's sales
    today_bills = await db.bills.find({
        "user_id": user_id,
        "created_at": {"$gte": today_start, "$lt": today_end}
    }).to_list(1000)
    
    today_sales = sum(bill["total"] for bill in today_bills)
    today_transactions = len(today_bills)
    
    # Total products
    total_products = await db.products.count_documents({"user_id": user_id})
    
    # Low stock count
    low_stock_products = await db.products.count_documents({
        "user_id": user_id,
        "$expr": {"$lte": ["$stock", "$min_stock_alert"]}
    })
    
    # Total inventory value
    products = await db.products.find({"user_id": user_id}).to_list(10000)
    total_inventory_value = sum(p["price"] * p["stock"] for p in products)
    
    return {
        "today_sales": round(today_sales, 2),
        "today_transactions": today_transactions,
        "total_products": total_products,
        "low_stock_count": low_stock_products,
        "total_inventory_value": round(total_inventory_value, 2)
    }

@router.get("/recent-bills")
async def get_recent_bills(authorization: Optional[str] = Header(None), limit: int = 5):
    """Get recent bills for dashboard"""
    db = get_db()
    user = await get_current_user(authorization=authorization, db=db)
    user_id = str(user["_id"])
    
    bills = await db.bills.find(
        {"user_id": user_id}
    ).sort("created_at", -1).limit(limit).to_list(limit)
    
    return [
        {
            "id": str(b["_id"]),
            "bill_number": b["bill_number"],
            "total": b["total"],
            "items_count": len(b["items"]),
            "created_at": b["created_at"].isoformat()
        }
        for b in bills
    ]
