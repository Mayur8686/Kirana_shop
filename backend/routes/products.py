from fastapi import APIRouter, HTTPException, status, Query, Header
from motor.motor_asyncio import AsyncIOMotorDatabase
from models.product import ProductCreate, ProductUpdate, ProductResponse
from utils.auth_middleware import get_current_user
from datetime import datetime
from bson import ObjectId
from typing import List, Optional

router = APIRouter(prefix="/products", tags=["Products"])

def get_db():
    from server import db
    return db

@router.post("/", response_model=ProductResponse)
async def create_product(product_data: ProductCreate, authorization: Optional[str] = Header(None)):
    """Add new product to inventory"""
    db = get_db()
    user = await get_current_user(authorization=authorization, db=db)
    user_id = str(user["_id"])
    
    # Check if barcode already exists for this user
    existing_product = await db.products.find_one({
        "user_id": user_id,
        "barcode": product_data.barcode
    })
    if existing_product:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Product with this barcode already exists"
        )
    
    # Create product document
    product_dict = product_data.dict()
    product_dict.update({
        "user_id": user_id,
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow()
    })
    
    result = await db.products.insert_one(product_dict)
    product_dict["_id"] = result.inserted_id
    
    return ProductResponse(
        id=str(product_dict["_id"]),
        user_id=product_dict["user_id"],
        name=product_dict["name"],
        barcode=product_dict["barcode"],
        price=product_dict["price"],
        stock=product_dict["stock"],
        min_stock_alert=product_dict["min_stock_alert"],
        category=product_dict.get("category"),
        image_base64=product_dict.get("image_base64"),
        gst_rate=product_dict["gst_rate"],
        created_at=product_dict["created_at"].isoformat(),
        updated_at=product_dict["updated_at"].isoformat()
    )

@router.get("/", response_model=List[ProductResponse])
async def get_products(
    authorization: Optional[str] = Header(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    search: Optional[str] = None
):
    """Get all products for the authenticated user"""
    db = get_db()
    user = await get_current_user(authorization=authorization, db=db)
    user_id = str(user["_id"])
    
    # Build query
    query = {"user_id": user_id}
    if search:
        query["name"] = {"$regex": search, "$options": "i"}
    
    # Fetch products
    products = await db.products.find(query).skip(skip).limit(limit).to_list(limit)
    
    return [
        ProductResponse(
            id=str(p["_id"]),
            user_id=p["user_id"],
            name=p["name"],
            barcode=p["barcode"],
            price=p["price"],
            stock=p["stock"],
            min_stock_alert=p["min_stock_alert"],
            category=p.get("category"),
            image_base64=p.get("image_base64"),
            gst_rate=p["gst_rate"],
            created_at=p["created_at"].isoformat(),
            updated_at=p["updated_at"].isoformat()
        )
        for p in products
    ]

@router.get("/barcode/{barcode}", response_model=ProductResponse)
async def get_product_by_barcode(barcode: str, authorization: Optional[str] = Header(None)):
    """Get product by barcode"""
    db = get_db()
    user = await get_current_user(authorization=authorization, db=db)
    user_id = str(user["_id"])
    
    product = await db.products.find_one({
        "user_id": user_id,
        "barcode": barcode
    })
    
    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product not found"
        )
    
    return ProductResponse(
        id=str(product["_id"]),
        user_id=product["user_id"],
        name=product["name"],
        barcode=product["barcode"],
        price=product["price"],
        stock=product["stock"],
        min_stock_alert=product["min_stock_alert"],
        category=product.get("category"),
        image_base64=product.get("image_base64"),
        gst_rate=product["gst_rate"],
        created_at=product["created_at"].isoformat(),
        updated_at=product["updated_at"].isoformat()
    )

@router.get("/low-stock", response_model=List[ProductResponse])
async def get_low_stock_products(authorization: Optional[str] = Header(None)):
    """Get products with low stock"""
    db = get_db()
    user = await get_current_user(authorization=authorization, db=db)
    user_id = str(user["_id"])
    
    # Find products where stock <= min_stock_alert
    products = await db.products.find({
        "user_id": user_id,
        "$expr": {"$lte": ["$stock", "$min_stock_alert"]}
    }).to_list(1000)
    
    return [
        ProductResponse(
            id=str(p["_id"]),
            user_id=p["user_id"],
            name=p["name"],
            barcode=p["barcode"],
            price=p["price"],
            stock=p["stock"],
            min_stock_alert=p["min_stock_alert"],
            category=p.get("category"),
            image_base64=p.get("image_base64"),
            gst_rate=p["gst_rate"],
            created_at=p["created_at"].isoformat(),
            updated_at=p["updated_at"].isoformat()
        )
        for p in products
    ]

@router.get("/{product_id}", response_model=ProductResponse)
async def get_product(product_id: str, authorization: Optional[str] = Header(None)):
    """Get single product by ID"""
    db = get_db()
    user = await get_current_user(authorization=authorization, db=db)
    user_id = str(user["_id"])
    
    try:
        product = await db.products.find_one({
            "_id": ObjectId(product_id),
            "user_id": user_id
        })
    except:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid product ID"
        )
    
    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product not found"
        )
    
    return ProductResponse(
        id=str(product["_id"]),
        user_id=product["user_id"],
        name=product["name"],
        barcode=product["barcode"],
        price=product["price"],
        stock=product["stock"],
        min_stock_alert=product["min_stock_alert"],
        category=product.get("category"),
        image_base64=product.get("image_base64"),
        gst_rate=product["gst_rate"],
        created_at=product["created_at"].isoformat(),
        updated_at=product["updated_at"].isoformat()
    )

@router.put("/{product_id}", response_model=ProductResponse)
async def update_product(
    product_id: str,
    product_data: ProductUpdate,
    authorization: Optional[str] = Header(None)
):
    """Update product details"""
    db = get_db()
    user = await get_current_user(authorization=authorization, db=db)
    user_id = str(user["_id"])
    
    try:
        obj_id = ObjectId(product_id)
    except:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid product ID"
        )
    
    # Check if product exists and belongs to user
    existing_product = await db.products.find_one({
        "_id": obj_id,
        "user_id": user_id
    })
    
    if not existing_product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product not found"
        )
    
    # Update only provided fields
    update_data = {k: v for k, v in product_data.dict(exclude_unset=True).items()}
    if update_data:
        update_data["updated_at"] = datetime.utcnow()
        await db.products.update_one(
            {"_id": obj_id},
            {"$set": update_data}
        )
    
    # Fetch updated product
    updated_product = await db.products.find_one({"_id": obj_id})
    
    return ProductResponse(
        id=str(updated_product["_id"]),
        user_id=updated_product["user_id"],
        name=updated_product["name"],
        barcode=updated_product["barcode"],
        price=updated_product["price"],
        stock=updated_product["stock"],
        min_stock_alert=updated_product["min_stock_alert"],
        category=updated_product.get("category"),
        image_base64=updated_product.get("image_base64"),
        gst_rate=updated_product["gst_rate"],
        created_at=updated_product["created_at"].isoformat(),
        updated_at=updated_product["updated_at"].isoformat()
    )

@router.delete("/{product_id}")
async def delete_product(product_id: str, authorization: Optional[str] = Header(None)):
    """Delete a product"""
    db = get_db()
    user = await get_current_user(authorization=authorization, db=db)
    user_id = str(user["_id"])
    
    try:
        obj_id = ObjectId(product_id)
    except:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid product ID"
        )
    
    result = await db.products.delete_one({
        "_id": obj_id,
        "user_id": user_id
    })
    
    if result.deleted_count == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product not found"
        )
    
    return {"message": "Product deleted successfully"}
