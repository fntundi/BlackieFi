"""
BlackieFi 3.0 - Shared Pydantic Models
Common models used across services.
"""
from pydantic import BaseModel, Field, ConfigDict, EmailStr
from typing import Optional, List, Any
from datetime import datetime, timezone
import uuid


def generate_uuid() -> str:
    return str(uuid.uuid4())


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


class BaseDocument(BaseModel):
    """Base model for MongoDB documents."""
    model_config = ConfigDict(extra="ignore", populate_by_name=True)
    
    id: str = Field(default_factory=generate_uuid, alias="_id")
    created_at: datetime = Field(default_factory=utc_now)
    updated_at: datetime = Field(default_factory=utc_now)


# User Models
class UserBase(BaseModel):
    email: EmailStr
    full_name: str
    is_active: bool = True
    is_admin: bool = False


class UserCreate(UserBase):
    password: str


class User(UserBase, BaseDocument):
    hashed_password: str


class UserResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str
    email: EmailStr
    full_name: str
    is_active: bool
    is_admin: bool
    created_at: datetime


# Token Models
class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class TokenPayload(BaseModel):
    sub: str
    exp: datetime
    iat: datetime


# Entity Models
class EntityType(str):
    LLC = "llc"
    TRUST = "trust"
    CORPORATION = "corporation"


class EntityBase(BaseModel):
    name: str
    entity_type: str
    jurisdiction: Optional[str] = None
    description: Optional[str] = None


class EntityCreate(EntityBase):
    pass


class Entity(EntityBase, BaseDocument):
    owner_id: str
    status: str = "active"


class EntityResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str
    name: str
    entity_type: str
    jurisdiction: Optional[str]
    description: Optional[str]
    owner_id: str
    status: str
    created_at: datetime
    updated_at: datetime


# Account Models
class AccountType(str):
    CHECKING = "checking"
    SAVINGS = "savings"
    INVESTMENT = "investment"
    CRYPTO = "crypto"


class AccountBase(BaseModel):
    name: str
    account_type: str
    institution: Optional[str] = None
    balance: float = 0.0
    currency: str = "USD"


class AccountCreate(AccountBase):
    entity_id: Optional[str] = None


class Account(AccountBase, BaseDocument):
    owner_id: str
    entity_id: Optional[str] = None


class AccountResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str
    name: str
    account_type: str
    institution: Optional[str]
    balance: float
    currency: str
    owner_id: str
    entity_id: Optional[str]
    created_at: datetime
    updated_at: datetime


# Asset Models
class AssetType(str):
    REAL_ESTATE = "real_estate"
    PRECIOUS_METALS = "precious_metals"
    VEHICLE = "vehicle"
    COLLECTIBLE = "collectible"
    OTHER = "other"


class AssetBase(BaseModel):
    name: str
    asset_type: str
    value: float
    description: Optional[str] = None
    location: Optional[str] = None


class AssetCreate(AssetBase):
    entity_id: Optional[str] = None


class Asset(AssetBase, BaseDocument):
    owner_id: str
    entity_id: Optional[str] = None


class AssetResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str
    name: str
    asset_type: str
    value: float
    description: Optional[str]
    location: Optional[str]
    owner_id: str
    entity_id: Optional[str]
    created_at: datetime
    updated_at: datetime


# Health Check
class HealthCheck(BaseModel):
    status: str = "healthy"
    service: str
    version: str = "3.0.0"
    timestamp: datetime = Field(default_factory=utc_now)


# API Response
class APIResponse(BaseModel):
    success: bool
    message: str
    data: Optional[Any] = None
