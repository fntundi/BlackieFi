"""
Reports routes - Financial reporting
"""
from fastapi import APIRouter, HTTPException, Depends
from typing import List
from datetime import datetime, timezone
from bson import ObjectId

from database import get_db
from models import ReportFilterPresetInput, ReportFilterPresetResponse, GenerateReportInput
from auth import get_current_user
from services.rbac_service import ensure_entity_access

router = APIRouter()

@router.post("/generate")
async def generate_report(request: GenerateReportInput, current_user: dict = Depends(get_current_user)):
    """Generate a financial report"""
    db = get_db()
    await ensure_entity_access(db, current_user.get("user_id"), request.entity_id, "reports")
    
    # Get transactions for the period
    transactions = await db.transactions.find({
        "entity_id": request.entity_id,
        "date": {"$gte": request.start_date, "$lte": request.end_date}
    }).to_list(1000)
    
    # Get categories
    categories = await db.categories.find().to_list(100)
    cat_names = {str(c["_id"]): c["name"] for c in categories}
    
    if request.report_type == "profit_loss":
        return generate_profit_loss(transactions, cat_names, request)
    elif request.report_type == "balance_sheet":
        return await generate_balance_sheet(db, request, transactions, cat_names)
    elif request.report_type == "cash_flow":
        return generate_cash_flow(transactions, request)
    elif request.report_type == "budget_vs_actual":
        return await generate_budget_vs_actual(db, request, transactions, cat_names)
    else:
        raise HTTPException(status_code=400, detail="Invalid report type")


def generate_profit_loss(transactions, cat_names, request):
    """Generate Profit & Loss report"""
    income_by_category = {}
    expenses_by_category = {}
    
    for t in transactions:
        cat_name = cat_names.get(t.get("category_id", ""), "Uncategorized")
        amount = t.get("amount", 0)
        
        if t.get("type") == "income":
            income_by_category[cat_name] = income_by_category.get(cat_name, 0) + amount
        elif t.get("type") == "expense":
            expenses_by_category[cat_name] = expenses_by_category.get(cat_name, 0) + amount
    
    total_income = sum(income_by_category.values())
    total_expenses = sum(expenses_by_category.values())
    net_income = total_income - total_expenses
    profit_margin = (net_income / total_income * 100) if total_income > 0 else 0
    
    # Calculate EBITDA (simplified - no depreciation/amortization data)
    ebitda = net_income  # In a full implementation, add back D&A
    ebitda_margin = (ebitda / total_income * 100) if total_income > 0 else 0
    
    return {
        "report_type": "profit_loss",
        "period": {"start_date": request.start_date, "end_date": request.end_date},
        "report_data": {
            "income": income_by_category,
            "expenses": expenses_by_category,
            "total_income": total_income,
            "total_expenses": total_expenses,
            "net_income": net_income,
            "profit_margin": profit_margin,
            "ebitda": ebitda,
            "ebitda_margin": ebitda_margin
        }
    }


async def generate_balance_sheet(db, request, transactions, cat_names):
    """Generate Balance Sheet report"""
    # Get assets
    assets = await db.assets.find({"entity_id": request.entity_id, "is_active": True}).to_list(100)
    
    # Get debts/liabilities
    debts = await db.debts.find({"entity_id": request.entity_id, "is_active": True}).to_list(100)
    
    # Get accounts (cash equivalents)
    accounts = await db.accounts.find({"entity_id": request.entity_id, "is_active": True}).to_list(50)
    
    # Calculate asset values
    asset_values = {}
    for asset in assets:
        asset_type = asset.get("type", "other")
        value = asset.get("current_value") or asset.get("purchase_price", 0)
        asset_values[asset_type] = asset_values.get(asset_type, 0) + value
    
    # Add cash/accounts
    for account in accounts:
        asset_values["cash_and_bank"] = asset_values.get("cash_and_bank", 0) + account.get("balance", 0)
    
    # Calculate liabilities
    liabilities = {}
    for debt in debts:
        debt_type = debt.get("type", "other")
        liabilities[debt_type] = liabilities.get(debt_type, 0) + debt.get("current_balance", 0)
    
    total_assets = sum(asset_values.values())
    total_liabilities = sum(liabilities.values())
    equity = total_assets - total_liabilities
    debt_to_equity = (total_liabilities / equity) if equity > 0 else 0
    
    return {
        "report_type": "balance_sheet",
        "period": {"start_date": request.start_date, "end_date": request.end_date},
        "report_data": {
            "assets": asset_values,
            "liabilities": liabilities,
            "total_assets": total_assets,
            "total_liabilities": total_liabilities,
            "equity": equity,
            "debt_to_equity_ratio": debt_to_equity
        }
    }


def generate_cash_flow(transactions, request):
    """Generate Cash Flow report"""
    monthly_cash_flow = {}
    
    for t in transactions:
        month = t.get("date", "")[:7]
        if month not in monthly_cash_flow:
            monthly_cash_flow[month] = {"income": 0, "expenses": 0, "net": 0}
        
        amount = t.get("amount", 0)
        if t.get("type") == "income":
            monthly_cash_flow[month]["income"] += amount
        else:
            monthly_cash_flow[month]["expenses"] += amount
        
        monthly_cash_flow[month]["net"] = monthly_cash_flow[month]["income"] - monthly_cash_flow[month]["expenses"]
    
    total_cash_in = sum(m["income"] for m in monthly_cash_flow.values())
    total_cash_out = sum(m["expenses"] for m in monthly_cash_flow.values())
    
    return {
        "report_type": "cash_flow",
        "period": {"start_date": request.start_date, "end_date": request.end_date},
        "report_data": {
            "monthly_cash_flow": dict(sorted(monthly_cash_flow.items())),
            "total_cash_in": total_cash_in,
            "total_cash_out": total_cash_out,
            "net_cash_flow": total_cash_in - total_cash_out
        }
    }


async def generate_budget_vs_actual(db, request, transactions, cat_names):
    """Generate Budget vs Actual report"""
    # Get budgets for the period
    start_month = request.start_date[:7]
    end_month = request.end_date[:7]
    
    budgets = await db.budgets.find({
        "entity_id": request.entity_id,
        "month": {"$gte": start_month, "$lte": end_month}
    }).to_list(12)
    
    # Aggregate budgets by category
    budgeted_by_category = {}
    for budget in budgets:
        for cat_budget in budget.get("category_budgets", []):
            cat_id = cat_budget.get("category_id", "")
            cat_name = cat_names.get(cat_id, cat_id)
            budgeted_by_category[cat_name] = budgeted_by_category.get(cat_name, 0) + cat_budget.get("planned_amount", 0)
    
    # Calculate actual spending by category
    actual_by_category = {}
    for t in transactions:
        if t.get("type") == "expense":
            cat_name = cat_names.get(t.get("category_id", ""), "Uncategorized")
            actual_by_category[cat_name] = actual_by_category.get(cat_name, 0) + t.get("amount", 0)
    
    # Build comparison
    categories_comparison = []
    all_categories = set(budgeted_by_category.keys()) | set(actual_by_category.keys())
    
    for cat in all_categories:
        budgeted = budgeted_by_category.get(cat, 0)
        actual = actual_by_category.get(cat, 0)
        variance = budgeted - actual
        variance_percent = (variance / budgeted * 100) if budgeted > 0 else 0
        
        categories_comparison.append({
            "category_name": cat,
            "budgeted": budgeted,
            "actual": actual,
            "variance": variance,
            "variance_percent": variance_percent
        })
    
    total_budgeted = sum(budgeted_by_category.values())
    total_actual = sum(actual_by_category.values())
    
    return {
        "report_type": "budget_vs_actual",
        "period": {"start_date": request.start_date, "end_date": request.end_date},
        "report_data": {
            "categories": sorted(categories_comparison, key=lambda x: x["category_name"]),
            "total_budgeted": total_budgeted,
            "total_actual": total_actual,
            "total_variance": total_budgeted - total_actual
        }
    }


# Filter Presets
@router.get("/presets", response_model=List[ReportFilterPresetResponse])
async def list_presets(current_user: dict = Depends(get_current_user)):
    """List user's saved report filter presets"""
    db = get_db()
    user_id = current_user.get("user_id")
    
    presets = await db.report_presets.find({"user_id": user_id}).to_list(50)
    return [{**p, "id": p["_id"]} for p in presets]

@router.post("/presets", response_model=ReportFilterPresetResponse)
async def create_preset(preset: ReportFilterPresetInput, current_user: dict = Depends(get_current_user)):
    """Save a new report filter preset"""
    db = get_db()
    user_id = current_user.get("user_id")
    
    preset_data = {
        "_id": str(ObjectId()),
        "user_id": user_id,
        **preset.model_dump(),
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.report_presets.insert_one(preset_data)
    return {**preset_data, "id": preset_data["_id"]}

@router.delete("/presets/{preset_id}")
async def delete_preset(preset_id: str, current_user: dict = Depends(get_current_user)):
    """Delete a report filter preset"""
    db = get_db()
    result = await db.report_presets.delete_one({"_id": preset_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Preset not found")
    
    return {"success": True, "message": "Preset deleted"}
