from fastapi import FastAPI
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path

# Import routes
from routes import auth, products, bills, dashboard

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ.get('DB_NAME', 'kirana_shop_db')]

# Create the main app
app = FastAPI(title="Kirana Shop Management API", version="1.0.0")

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers with /api prefix
app.include_router(auth.router, prefix="/api")
app.include_router(products.router, prefix="/api")
app.include_router(bills.router, prefix="/api")
app.include_router(dashboard.router, prefix="/api")

# Root endpoint
@app.get("/")
async def root():
    return {"message": "Kirana Shop Management API", "version": "1.0.0"}

# Health check
@app.get("/api/health")
async def health_check():
    return {"status": "healthy", "database": "connected"}

# Create database indexes on startup
@app.on_event("startup")
async def startup_db_client():
    """Create database indexes for performance"""
    try:
        # Users collection indexes
        await db.users.create_index("email", unique=True)
        await db.users.create_index("store_code", unique=True)
        
        # Products collection indexes
        await db.products.create_index([("user_id", 1), ("barcode", 1)], unique=True)
        await db.products.create_index("user_id")
        await db.products.create_index([("user_id", 1), ("name", 1)])
        
        # Bills collection indexes
        await db.bills.create_index("user_id")
        await db.bills.create_index("bill_number", unique=True)
        await db.bills.create_index([("user_id", 1), ("created_at", -1)])
        
        # Sales logs collection indexes
        await db.sales_logs.create_index("user_id")
        await db.sales_logs.create_index([("user_id", 1), ("date", -1)])
        
        logging.info("Database indexes created successfully")
    except Exception as e:
        logging.error(f"Error creating indexes: {e}")

@app.on_event("shutdown")
async def shutdown_db_client():
    """Close database connection on shutdown"""
    client.close()

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)
