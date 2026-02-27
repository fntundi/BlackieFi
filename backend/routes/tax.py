"""
Tax Planning routes
"""
from fastapi import APIRouter, HTTPException, Depends
from typing import List
from datetime import datetime, timezone
from bson import ObjectId

from database import get_db
from models import TaxScenarioInput, TaxScenarioResponse
from auth import get_current_user

router = APIRouter()

@router.get("/scenarios", response_model=List[TaxScenarioResponse])
async def list_tax_scenarios(
    entity_id: str,
    tax_year: int = None,
    current_user: dict = Depends(get_current_user)
):
    """List tax scenarios for an entity"""
    db = get_db()
    query = {"entity_id": entity_id}
    if tax_year:
        query["tax_year"] = tax_year
    
    scenarios = await db.tax_scenarios.find(query).sort("created_at", -1).to_list(50)
    return [{**s, "id": s["_id"]} for s in scenarios]

@router.post("/scenarios", response_model=TaxScenarioResponse)
async def create_tax_scenario(scenario: TaxScenarioInput, current_user: dict = Depends(get_current_user)):
    """Create a new tax scenario"""
    db = get_db()
    now = datetime.now(timezone.utc).isoformat()
    
    scenario_data = {
        "_id": str(ObjectId()),
        **scenario.model_dump(),
        "created_at": now,
        "updated_at": now
    }
    
    await db.tax_scenarios.insert_one(scenario_data)
    return {**scenario_data, "id": scenario_data["_id"]}

@router.get("/scenarios/{scenario_id}", response_model=TaxScenarioResponse)
async def get_tax_scenario(scenario_id: str, current_user: dict = Depends(get_current_user)):
    """Get a specific tax scenario"""
    db = get_db()
    scenario = await db.tax_scenarios.find_one({"_id": scenario_id})
    if not scenario:
        raise HTTPException(status_code=404, detail="Scenario not found")
    return {**scenario, "id": scenario["_id"]}

@router.delete("/scenarios/{scenario_id}")
async def delete_tax_scenario(scenario_id: str, current_user: dict = Depends(get_current_user)):
    """Delete a tax scenario"""
    db = get_db()
    result = await db.tax_scenarios.delete_one({"_id": scenario_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Scenario not found")
    return {"success": True, "message": "Scenario deleted"}
