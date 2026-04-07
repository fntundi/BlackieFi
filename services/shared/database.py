"""
BlackieFi 3.0 - Database Utilities
Shared database connection utilities for all services.
"""
from motor.motor_asyncio import AsyncIOMotorClient
from typing import Optional
import redis.asyncio as redis
from .config import settings


class MongoDB:
    """MongoDB connection manager."""
    
    _client: Optional[AsyncIOMotorClient] = None
    _db = None
    
    @classmethod
    def get_client(cls) -> AsyncIOMotorClient:
        if cls._client is None:
            cls._client = AsyncIOMotorClient(settings.MONGO_URL)
        return cls._client
    
    @classmethod
    def get_db(cls):
        if cls._db is None:
            cls._db = cls.get_client()[settings.MONGO_DB]
        return cls._db
    
    @classmethod
    async def close(cls):
        if cls._client is not None:
            cls._client.close()
            cls._client = None
            cls._db = None


class RedisClient:
    """Redis connection manager."""
    
    _client: Optional[redis.Redis] = None
    
    @classmethod
    async def get_client(cls) -> redis.Redis:
        if cls._client is None:
            cls._client = redis.from_url(
                settings.REDIS_URL,
                password=settings.REDIS_PASSWORD if settings.REDIS_PASSWORD else None,
                decode_responses=True
            )
        return cls._client
    
    @classmethod
    async def close(cls):
        if cls._client is not None:
            await cls._client.close()
            cls._client = None


def get_db():
    """Get database instance."""
    return MongoDB.get_db()


async def get_redis():
    """Get Redis client."""
    return await RedisClient.get_client()
