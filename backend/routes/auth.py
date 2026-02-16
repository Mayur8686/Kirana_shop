from fastapi import APIRouter, HTTPException, status, Header
from motor.motor_asyncio import AsyncIOMotorDatabase
from models.user import UserSignup, UserLogin, UserResponse
from utils.password import hash_password, verify_password
from utils.jwt_handler import create_access_token
from utils.auth_middleware import get_current_user
from datetime import datetime
from bson import ObjectId
from typing import Optional

router = APIRouter(prefix="/auth", tags=["Authentication"])

def get_db():
    from server import db
    return db

@router.post("/signup", response_model=dict)
async def signup(user_data: UserSignup):
    """Register new store owner"""
    db = get_db()
    
    # Check if email already exists
    existing_user = await db.users.find_one({"email": user_data.email})
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    # Check if store_code already exists
    existing_store = await db.users.find_one({"store_code": user_data.store_code})
    if existing_store:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Store code already taken. Please use a different code."
        )
    
    # Hash password
    hashed_password = hash_password(user_data.password)
    
    # Create user document
    user_dict = {
        "email": user_data.email,
        "password_hash": hashed_password,
        "store_name": user_data.store_name,
        "owner_name": user_data.owner_name,
        "phone": user_data.phone,
        "gst_number": user_data.gst_number,
        "store_code": user_data.store_code.upper(),
        "created_at": datetime.utcnow()
    }
    
    result = await db.users.insert_one(user_dict)
    
    # Create access token
    access_token = create_access_token({"user_id": str(result.inserted_id)})
    
    return {
        "message": "Store registered successfully",
        "access_token": access_token,
        "token_type": "bearer"
    }

@router.post("/login", response_model=dict)
async def login(credentials: UserLogin):
    """Login with email and password"""
    db = get_db()
    
    # Find user by email
    user = await db.users.find_one({"email": credentials.email})
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )
    
    # Verify password
    if not verify_password(credentials.password, user["password_hash"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )
    
    # Create access token
    access_token = create_access_token({"user_id": str(user["_id"])})
    
    return {
        "message": "Login successful",
        "access_token": access_token,
        "token_type": "bearer",
        "user": {
            "id": str(user["_id"]),
            "email": user["email"],
            "store_name": user["store_name"],
            "owner_name": user["owner_name"],
            "store_code": user["store_code"]
        }
    }

@router.get("/me", response_model=UserResponse)
async def get_current_user_info(authorization: Optional[str] = Header(None)):
    """Get current authenticated user info"""
    db = get_db()
    user = await get_current_user(authorization=authorization, db=db)
    
    return UserResponse(
        id=str(user["_id"]),
        email=user["email"],
        store_name=user["store_name"],
        owner_name=user["owner_name"],
        phone=user["phone"],
        gst_number=user.get("gst_number"),
        store_code=user["store_code"],
        created_at=user["created_at"].isoformat()
    )
