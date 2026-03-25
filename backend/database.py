"""
MongoDB database connection and utilities
"""
import os
from motor.motor_asyncio import AsyncIOMotorClient
from typing import Optional

client: Optional[AsyncIOMotorClient] = None
db = None

async def init_db():
    """Initialize database connection"""
    global client, db
    mongo_url = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
    db_name = os.environ.get("DB_NAME", "blackiefi")
    
    client = AsyncIOMotorClient(mongo_url)
    db = client[db_name]
    
    # Create indexes
    await create_indexes()
    
    # Seed initial data if needed
    await seed_initial_data()
    
    print(f"Connected to MongoDB database: {db_name}")

async def close_db():
    """Close database connection"""
    global client
    if client:
        client.close()
        print("MongoDB connection closed")

async def create_indexes():
    """Create necessary indexes for performance"""
    # Users collection
    await db.users.create_index("username", unique=True)
    await db.users.create_index("email", unique=True)
    
    # Entities collection
    await db.entities.create_index("owner_id")
    # Entity details
    await db.business_entities.create_index("entity_id", unique=True)
    await db.personal_entities.create_index("entity_id", unique=True)
    await db.entity_documents.create_index("entity_id")
    await db.entity_documents.create_index("owner_id")

    
    # Accounts collection
    await db.accounts.create_index("entity_id")
    
    # Transactions collection
    await db.transactions.create_index([("entity_id", 1), ("date", -1)])
    await db.transactions.create_index("category_id")
    
    # Categories collection
    await db.categories.create_index("entity_id")
    
    # Recurring transactions
    await db.recurring_transactions.create_index("entity_id")
    
    # Budgets
    await db.budgets.create_index([("entity_id", 1), ("month", 1)])
    
    # Debts
    await db.debts.create_index("entity_id")
    
    # Investment vehicles and holdings
    await db.investment_vehicles.create_index("entity_id")
    await db.investment_holdings.create_index("vehicle_id")
    
    # Assets
    await db.assets.create_index("entity_id")
    
    # Inventory
    await db.inventory.create_index("entity_id")
    
    # Financial goals
    await db.goals.create_index("entity_id")

async def seed_initial_data():
    """Seed initial data if database is empty"""
    from datetime import datetime, timezone
    from bson import ObjectId
    from auth import hash_password

    # Check if system settings exist
    settings = await db.system_settings.find_one({"_id": "system"})
    if not settings:
        await db.system_settings.insert_one({
            "_id": "system",
            "ai_enabled": False,
            "default_llm_provider": "openrouter"
        })
        print("Created initial system settings")

    # Seed demo/admin users if enabled
    seed_demo = os.environ.get("SEED_DEMO_USERS", "").lower() in {"1", "true", "yes"}
    if seed_demo:
        now = datetime.now(timezone.utc).isoformat()

        demo_user = await db.users.find_one({"username": "demo"})
        if not demo_user:
            demo_id = str(ObjectId())
            demo_entity_id = str(ObjectId())
            await db.users.insert_one({
                "_id": demo_id,
                "username": "demo",
                "email": "demo@example.com",
                "password_hash": hash_password("user123"),
                "full_name": "Demo User",
                "role": "admin",
                "ai_enabled": False,
                "preferred_llm_provider": None,
                "password_reset_token": None,
                "password_reset_expires": None,
                "created_at": now,
                "updated_at": now
            })
            await db.entities.insert_one({
                "_id": demo_entity_id,
                "owner_id": demo_id,
                "name": "Personal",
                "type": "personal",
                "created_at": now,
                "updated_at": now
            })
            await db.personal_entities.insert_one({
                "_id": str(ObjectId()),
                "entity_id": demo_entity_id,
                "owner_id": demo_id,
                "created_at": now,
                "updated_at": now
            })
            print("Created demo user")

        admin_user = await db.users.find_one({"username": "admin"})
        if not admin_user:
            admin_id = str(ObjectId())
            admin_entity_id = str(ObjectId())
            await db.users.insert_one({
                "_id": admin_id,
                "username": "admin",
                "email": "admin@example.com",
                "password_hash": hash_password("P@ssw0rd"),
                "full_name": "System Admin",
                "role": "admin",
                "ai_enabled": False,
                "preferred_llm_provider": None,
                "password_reset_token": None,
                "password_reset_expires": None,
                "created_at": now,
                "updated_at": now
            })
            await db.entities.insert_one({
                "_id": admin_entity_id,
                "owner_id": admin_id,
                "name": "Admin",
                "type": "business",
                "created_at": now,
                "updated_at": now
            })
            await db.business_entities.insert_one({
                "_id": str(ObjectId()),
                "entity_id": admin_entity_id,
                "owner_id": admin_id,
                "created_at": now,
                "updated_at": now
            })
            print("Created admin user")

    # Create default categories if none exist
    now = datetime.now(timezone.utc).isoformat()
    count = await db.categories.count_documents({})
    if count == 0:
        default_categories = [
            {"name": "Salary", "type": "income", "is_default": True},
            {"name": "Freelance", "type": "income", "is_default": True},
            {"name": "Investment Income", "type": "income", "is_default": True},
            {"name": "Food & Dining", "type": "expense", "is_default": True},
            {"name": "Transportation", "type": "expense", "is_default": True},
            {"name": "Housing", "type": "expense", "is_default": True},
            {"name": "Utilities", "type": "expense", "is_default": True},
            {"name": "Healthcare", "type": "expense", "is_default": True},
            {"name": "Entertainment", "type": "expense", "is_default": True},
            {"name": "Shopping", "type": "expense", "is_default": True},
            {"name": "Education", "type": "expense", "is_default": True},
            {"name": "Personal Care", "type": "expense", "is_default": True},
            {"name": "Insurance", "type": "expense", "is_default": True},
            {"name": "Savings", "type": "both", "is_default": True},
            {"name": "Transfer", "type": "both", "is_default": True},
        ]
        
        for cat in default_categories:
            cat["_id"] = str(ObjectId())
            cat["entity_id"] = None
            cat["parent_category"] = None
            cat["auto_categorization_rules"] = []
            cat["created_at"] = now
            cat["updated_at"] = now
        
        await db.categories.insert_many(default_categories)
        print(f"Created {len(default_categories)} default categories")

def get_db():
    """Get database instance"""
    return db
