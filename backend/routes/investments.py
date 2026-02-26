"""
Investment routes (vehicles and holdings)
"""
from fastapi import APIRouter, HTTPException, Depends, status, Query
from datetime import datetime, timezone
from bson import ObjectId
from typing import List, Optional

from database import get_db
from models import (
    InvestmentVehicleInput, InvestmentVehicleResponse,
    InvestmentHoldingInput, InvestmentHoldingResponse
)
from auth import get_current_user

router = APIRouter()

# ============= Investment Vehicles =============

@router.get("/vehicles", response_model=List[InvestmentVehicleResponse])
async def list_vehicles(
    entity_id: Optional[str] = Query(None),
    is_active: bool = Query(True),
    current_user: dict = Depends(get_current_user)
):
    """List investment vehicles with optional filters"""
    db = get_db()
    
    query = {"is_active": is_active}
    if entity_id:
        query["entity_id"] = entity_id
    
    vehicles = await db.investment_vehicles.find(query).to_list(length=1000)
    
    return [{
        "id": v["_id"],
        "entity_id": v["entity_id"],
        "name": v["name"],
        "type": v["type"],
        "provider": v.get("provider", ""),
        "is_active": v.get("is_active", True),
        "created_at": v["created_at"],
        "updated_at": v["updated_at"]
    } for v in vehicles]

@router.post("/vehicles", response_model=InvestmentVehicleResponse, status_code=status.HTTP_201_CREATED)
async def create_vehicle(input: InvestmentVehicleInput, current_user: dict = Depends(get_current_user)):
    """Create a new investment vehicle"""
    db = get_db()
    now = datetime.now(timezone.utc).isoformat()
    
    vehicle_id = str(ObjectId())
    vehicle_doc = {
        "_id": vehicle_id,
        "entity_id": input.entity_id,
        "name": input.name,
        "type": input.type,
        "provider": input.provider or "",
        "is_active": True,
        "created_at": now,
        "updated_at": now
    }
    
    await db.investment_vehicles.insert_one(vehicle_doc)
    
    return {
        "id": vehicle_id,
        "entity_id": input.entity_id,
        "name": input.name,
        "type": input.type,
        "provider": input.provider or "",
        "is_active": True,
        "created_at": now,
        "updated_at": now
    }

@router.get("/vehicles/{vehicle_id}", response_model=InvestmentVehicleResponse)
async def get_vehicle(vehicle_id: str, current_user: dict = Depends(get_current_user)):
    """Get a specific investment vehicle"""
    db = get_db()
    
    vehicle = await db.investment_vehicles.find_one({"_id": vehicle_id})
    if not vehicle:
        raise HTTPException(status_code=404, detail="Investment vehicle not found")
    
    return {
        "id": vehicle["_id"],
        "entity_id": vehicle["entity_id"],
        "name": vehicle["name"],
        "type": vehicle["type"],
        "provider": vehicle.get("provider", ""),
        "is_active": vehicle.get("is_active", True),
        "created_at": vehicle["created_at"],
        "updated_at": vehicle["updated_at"]
    }

@router.put("/vehicles/{vehicle_id}", response_model=InvestmentVehicleResponse)
async def update_vehicle(vehicle_id: str, input: InvestmentVehicleInput, current_user: dict = Depends(get_current_user)):
    """Update an investment vehicle"""
    db = get_db()
    
    vehicle = await db.investment_vehicles.find_one({"_id": vehicle_id})
    if not vehicle:
        raise HTTPException(status_code=404, detail="Investment vehicle not found")
    
    now = datetime.now(timezone.utc).isoformat()
    await db.investment_vehicles.update_one(
        {"_id": vehicle_id},
        {"$set": {
            "name": input.name,
            "type": input.type,
            "provider": input.provider or "",
            "updated_at": now
        }}
    )
    
    return {
        "id": vehicle_id,
        "entity_id": input.entity_id,
        "name": input.name,
        "type": input.type,
        "provider": input.provider or "",
        "is_active": vehicle.get("is_active", True),
        "created_at": vehicle["created_at"],
        "updated_at": now
    }

@router.delete("/vehicles/{vehicle_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_vehicle(vehicle_id: str, current_user: dict = Depends(get_current_user)):
    """Delete (deactivate) an investment vehicle"""
    db = get_db()
    
    result = await db.investment_vehicles.update_one(
        {"_id": vehicle_id},
        {"$set": {"is_active": False, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Investment vehicle not found")
    
    return None

# ============= Investment Holdings =============

@router.get("/holdings", response_model=List[InvestmentHoldingResponse])
async def list_holdings(
    vehicle_id: Optional[str] = Query(None),
    current_user: dict = Depends(get_current_user)
):
    """List investment holdings with optional filters"""
    db = get_db()
    
    query = {}
    if vehicle_id:
        query["vehicle_id"] = vehicle_id
    
    holdings = await db.investment_holdings.find(query).to_list(length=1000)
    
    return [{
        "id": h["_id"],
        "vehicle_id": h["vehicle_id"],
        "asset_name": h["asset_name"],
        "asset_class": h["asset_class"],
        "quantity": h["quantity"],
        "cost_basis": h["cost_basis"],
        "current_price": h.get("current_price"),
        "benchmark_symbol": h.get("benchmark_symbol"),
        "last_updated": h.get("last_updated"),
        "created_at": h["created_at"],
        "updated_at": h["updated_at"]
    } for h in holdings]

@router.post("/holdings", response_model=InvestmentHoldingResponse, status_code=status.HTTP_201_CREATED)
async def create_holding(input: InvestmentHoldingInput, current_user: dict = Depends(get_current_user)):
    """Create a new investment holding"""
    db = get_db()
    now = datetime.now(timezone.utc).isoformat()
    
    holding_id = str(ObjectId())
    holding_doc = {
        "_id": holding_id,
        "vehicle_id": input.vehicle_id,
        "asset_name": input.asset_name,
        "asset_class": input.asset_class,
        "quantity": input.quantity,
        "cost_basis": input.cost_basis,
        "current_price": input.current_price,
        "benchmark_symbol": input.benchmark_symbol,
        "last_updated": now,
        "created_at": now,
        "updated_at": now
    }
    
    await db.investment_holdings.insert_one(holding_doc)
    
    return {
        "id": holding_id,
        "vehicle_id": input.vehicle_id,
        "asset_name": input.asset_name,
        "asset_class": input.asset_class,
        "quantity": input.quantity,
        "cost_basis": input.cost_basis,
        "current_price": input.current_price,
        "benchmark_symbol": input.benchmark_symbol,
        "last_updated": now,
        "created_at": now,
        "updated_at": now
    }

@router.get("/holdings/{holding_id}", response_model=InvestmentHoldingResponse)
async def get_holding(holding_id: str, current_user: dict = Depends(get_current_user)):
    """Get a specific investment holding"""
    db = get_db()
    
    holding = await db.investment_holdings.find_one({"_id": holding_id})
    if not holding:
        raise HTTPException(status_code=404, detail="Investment holding not found")
    
    return {
        "id": holding["_id"],
        "vehicle_id": holding["vehicle_id"],
        "asset_name": holding["asset_name"],
        "asset_class": holding["asset_class"],
        "quantity": holding["quantity"],
        "cost_basis": holding["cost_basis"],
        "current_price": holding.get("current_price"),
        "benchmark_symbol": holding.get("benchmark_symbol"),
        "last_updated": holding.get("last_updated"),
        "created_at": holding["created_at"],
        "updated_at": holding["updated_at"]
    }

@router.put("/holdings/{holding_id}", response_model=InvestmentHoldingResponse)
async def update_holding(holding_id: str, input: InvestmentHoldingInput, current_user: dict = Depends(get_current_user)):
    """Update an investment holding"""
    db = get_db()
    
    holding = await db.investment_holdings.find_one({"_id": holding_id})
    if not holding:
        raise HTTPException(status_code=404, detail="Investment holding not found")
    
    now = datetime.now(timezone.utc).isoformat()
    await db.investment_holdings.update_one(
        {"_id": holding_id},
        {"$set": {
            "asset_name": input.asset_name,
            "asset_class": input.asset_class,
            "quantity": input.quantity,
            "cost_basis": input.cost_basis,
            "current_price": input.current_price,
            "benchmark_symbol": input.benchmark_symbol,
            "last_updated": now,
            "updated_at": now
        }}
    )
    
    return {
        "id": holding_id,
        "vehicle_id": input.vehicle_id,
        "asset_name": input.asset_name,
        "asset_class": input.asset_class,
        "quantity": input.quantity,
        "cost_basis": input.cost_basis,
        "current_price": input.current_price,
        "benchmark_symbol": input.benchmark_symbol,
        "last_updated": now,
        "created_at": holding["created_at"],
        "updated_at": now
    }

@router.delete("/holdings/{holding_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_holding(holding_id: str, current_user: dict = Depends(get_current_user)):
    """Delete an investment holding"""
    db = get_db()
    
    result = await db.investment_holdings.delete_one({"_id": holding_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Investment holding not found")
    
    return None
