"""
AI Functions - All AI-powered features using the configurable LLM service
"""
from fastapi import APIRouter, HTTPException, Depends
from typing import List, Dict, Any
from datetime import datetime, timezone, timedelta
from bson import ObjectId
import json

from database import get_db
from auth import get_current_user
from services.llm_service import get_llm_service, LLMService

router = APIRouter()

async def check_ai_enabled(current_user: dict) -> bool:
    """Check if AI is enabled for the user"""
    db = get_db()
    system_settings = await db.system_settings.find_one({"_id": "system"})
    if not system_settings or not system_settings.get("ai_enabled", False):
        return False
    
    user_id = current_user.get("user_id")
    user = await db.users.find_one({"_id": user_id})
    if not user or not user.get("ai_enabled", False):
        return False
    
    return True

async def get_configured_llm_service(current_user: dict):
    """Get LLM service configured for the user"""
    db = get_db()
    user_id = current_user.get("user_id")
    
    # Get provider config
    system_settings = await db.system_settings.find_one({"_id": "system"})
    user = await db.users.find_one({"_id": user_id})
    
    provider = user.get("preferred_llm_provider") or system_settings.get("default_llm_provider", "emergent")
    provider_config = await db.llm_providers.find_one({"provider": provider})
    
    # Set API key in environment if available
    import os
    if provider_config and provider_config.get("api_key"):
        provider_info = next(
            (p for p in LLMService.get_available_providers() if p["id"] == provider),
            None
        )
        if provider_info and provider_info.get("env_key_name"):
            os.environ[provider_info["env_key_name"]] = provider_config["api_key"]
    
    model = provider_config.get("default_model") if provider_config else None
    base_url = provider_config.get("base_url") if provider_config else None
    return get_llm_service(provider=provider, model=model, base_url=base_url)


@router.post("/detect-anomalies")
async def detect_anomalies(entity_id: str, current_user: dict = Depends(get_current_user)):
    """Detect spending anomalies using AI"""
    if not await check_ai_enabled(current_user):
        raise HTTPException(status_code=403, detail="AI features are disabled")
    
    db = get_db()
    
    # Get recent transactions
    transactions = await db.transactions.find(
        {"entity_id": entity_id, "type": "expense"}
    ).sort("date", -1).limit(100).to_list(100)
    
    if not transactions:
        return {"anomalies": [], "message": "No transactions to analyze"}
    
    # Calculate category spending averages
    category_spending = {}
    for t in transactions:
        cat_id = t.get("category_id", "uncategorized")
        if cat_id not in category_spending:
            category_spending[cat_id] = []
        category_spending[cat_id].append(t.get("amount", 0))
    
    # Get category names
    categories = await db.categories.find().to_list(100)
    cat_names = {str(c["_id"]): c["name"] for c in categories}
    
    # Prepare data for AI analysis
    spending_summary = []
    for cat_id, amounts in category_spending.items():
        avg = sum(amounts) / len(amounts)
        max_amt = max(amounts)
        spending_summary.append({
            "category": cat_names.get(cat_id, "Uncategorized"),
            "average": round(avg, 2),
            "max": round(max_amt, 2),
            "count": len(amounts)
        })
    
    try:
        llm = await get_configured_llm_service(current_user)
        prompt = f"""Analyze this spending data and identify any anomalies or unusual patterns:

Spending by Category:
{json.dumps(spending_summary, indent=2)}

Return a JSON response with this structure:
{{
    "anomalies": [
        {{
            "category": "category name",
            "severity": "high/medium/low",
            "description": "brief description",
            "potential_impact": 0.00,
            "recommendation": "what to do"
        }}
    ]
}}

Only include actual anomalies. If spending looks normal, return empty anomalies array."""

        response = await llm.chat(
            messages=[{"role": "user", "content": prompt}],
            system_message="You are a financial analyst AI. Analyze spending data and identify anomalies. Return valid JSON only."
        )
        
        # Parse response
        try:
            result = json.loads(response)
        except:
            result = {"anomalies": []}
        
        return result
        
    except Exception as e:
        return {"anomalies": [], "error": str(e)}


@router.post("/forecast-cash-flow")
async def forecast_cash_flow(
    entity_id: str, 
    forecast_months: int = 3,
    current_user: dict = Depends(get_current_user)
):
    """Forecast cash flow using AI"""
    if not await check_ai_enabled(current_user):
        raise HTTPException(status_code=403, detail="AI features are disabled")
    
    db = get_db()
    
    # Get historical data
    transactions = await db.transactions.find(
        {"entity_id": entity_id}
    ).sort("date", -1).limit(200).to_list(200)
    
    recurring = await db.recurring_transactions.find(
        {"entity_id": entity_id, "is_active": True}
    ).to_list(50)
    
    # Calculate monthly totals
    monthly_data = {}
    for t in transactions:
        month = t.get("date", "")[:7]
        if month not in monthly_data:
            monthly_data[month] = {"income": 0, "expenses": 0}
        if t.get("type") == "income":
            monthly_data[month]["income"] += t.get("amount", 0)
        else:
            monthly_data[month]["expenses"] += t.get("amount", 0)
    
    # Recurring summary
    recurring_summary = []
    for r in recurring:
        recurring_summary.append({
            "name": r.get("name"),
            "type": r.get("type"),
            "amount": r.get("amount"),
            "frequency": r.get("frequency")
        })
    
    try:
        llm = await get_configured_llm_service(current_user)
        prompt = f"""Based on this financial history, forecast the next {forecast_months} months:

Monthly History:
{json.dumps(monthly_data, indent=2)}

Recurring Transactions:
{json.dumps(recurring_summary, indent=2)}

Return a JSON response:
{{
    "forecast": [
        {{
            "month": "YYYY-MM",
            "predicted_income": 0.00,
            "predicted_expenses": 0.00,
            "net_cash_flow": 0.00,
            "confidence": "high/medium/low"
        }}
    ],
    "assumptions": ["list of key assumptions"]
}}"""

        response = await llm.chat(
            messages=[{"role": "user", "content": prompt}],
            system_message="You are a financial forecasting AI. Provide accurate cash flow predictions based on historical data. Return valid JSON only."
        )
        
        try:
            result = json.loads(response)
        except:
            result = {"forecast": [], "assumptions": []}
        
        return result
        
    except Exception as e:
        return {"forecast": [], "error": str(e)}


@router.post("/identify-cost-savings")
async def identify_cost_savings(entity_id: str, current_user: dict = Depends(get_current_user)):
    """Identify cost saving opportunities using AI"""
    if not await check_ai_enabled(current_user):
        raise HTTPException(status_code=403, detail="AI features are disabled")
    
    db = get_db()
    
    # Get expense transactions
    transactions = await db.transactions.find(
        {"entity_id": entity_id, "type": "expense"}
    ).sort("date", -1).limit(100).to_list(100)
    
    # Get recurring expenses
    recurring = await db.recurring_transactions.find(
        {"entity_id": entity_id, "type": "expense", "is_active": True}
    ).to_list(50)
    
    # Calculate spending by category
    categories = await db.categories.find().to_list(100)
    cat_names = {str(c["_id"]): c["name"] for c in categories}
    
    category_totals = {}
    for t in transactions:
        cat_id = t.get("category_id", "uncategorized")
        cat_name = cat_names.get(cat_id, "Uncategorized")
        if cat_name not in category_totals:
            category_totals[cat_name] = 0
        category_totals[cat_name] += t.get("amount", 0)
    
    recurring_summary = [{"name": r["name"], "amount": r["amount"], "frequency": r["frequency"]} for r in recurring]
    
    try:
        llm = await get_configured_llm_service(current_user)
        prompt = f"""Analyze this spending and identify cost-saving opportunities:

Spending by Category:
{json.dumps(category_totals, indent=2)}

Recurring Expenses:
{json.dumps(recurring_summary, indent=2)}

Return a JSON response:
{{
    "opportunities": [
        {{
            "category": "category name",
            "description": "specific opportunity",
            "estimated_monthly_savings": 0.00,
            "difficulty": "easy/moderate/hard",
            "action_steps": ["step 1", "step 2"]
        }}
    ],
    "total_potential_savings": 0.00
}}"""

        response = await llm.chat(
            messages=[{"role": "user", "content": prompt}],
            system_message="You are a cost optimization AI. Identify practical ways to reduce expenses. Return valid JSON only."
        )
        
        try:
            result = json.loads(response)
        except:
            result = {"opportunities": [], "total_potential_savings": 0}
        
        return result
        
    except Exception as e:
        return {"opportunities": [], "error": str(e)}


@router.post("/generate-budget")
async def generate_budget(entity_id: str, month: str, current_user: dict = Depends(get_current_user)):
    """Generate AI-powered budget recommendations"""
    if not await check_ai_enabled(current_user):
        raise HTTPException(status_code=403, detail="AI features are disabled")
    
    db = get_db()
    
    # Get historical spending
    transactions = await db.transactions.find(
        {"entity_id": entity_id, "type": "expense"}
    ).sort("date", -1).limit(200).to_list(200)
    
    # Get categories
    categories = await db.categories.find({"type": {"$in": ["expense", "both"]}}).to_list(100)
    cat_names = {str(c["_id"]): c["name"] for c in categories}
    
    # Calculate average spending by category
    category_spending = {}
    for t in transactions:
        cat_id = t.get("category_id")
        if cat_id:
            cat_name = cat_names.get(cat_id, "Other")
            if cat_name not in category_spending:
                category_spending[cat_name] = []
            category_spending[cat_name].append(t.get("amount", 0))
    
    spending_averages = {k: sum(v)/len(v) for k, v in category_spending.items() if v}
    
    try:
        llm = await get_configured_llm_service(current_user)
        prompt = f"""Create a smart budget for {month} based on this historical spending:

Average Monthly Spending by Category:
{json.dumps(spending_averages, indent=2)}

Return a JSON response:
{{
    "budget_suggestions": {{
        "category_budgets": [
            {{
                "category_id": "category_name",
                "planned_amount": 0.00,
                "reasoning": "why this amount",
                "priority": "high/medium/low"
            }}
        ],
        "total_recommended": 0.00,
        "savings_opportunity": 0.00
    }},
    "success": true
}}"""

        response = await llm.chat(
            messages=[{"role": "user", "content": prompt}],
            system_message="You are a budget planning AI. Create practical, achievable budgets. Return valid JSON only."
        )
        
        try:
            result = json.loads(response)
        except:
            result = {"budget_suggestions": {"category_budgets": [], "total_recommended": 0}, "success": False}
        
        return result
        
    except Exception as e:
        return {"success": False, "error": str(e)}


@router.post("/categorize-transaction")
async def categorize_transaction(
    transaction_id: str, 
    entity_id: str,
    current_user: dict = Depends(get_current_user)
):
    """AI-powered transaction categorization"""
    if not await check_ai_enabled(current_user):
        raise HTTPException(status_code=403, detail="AI features are disabled")
    
    db = get_db()
    
    # Get transaction
    transaction = await db.transactions.find_one({"_id": transaction_id})
    if not transaction:
        raise HTTPException(status_code=404, detail="Transaction not found")
    
    # Get available categories
    categories = await db.categories.find().to_list(100)
    category_list = [{"id": str(c["_id"]), "name": c["name"], "type": c["type"]} for c in categories]
    
    try:
        llm = await get_configured_llm_service(current_user)
        prompt = f"""Categorize this transaction:

Description: {transaction.get('description', '')}
Amount: ${transaction.get('amount', 0)}
Type: {transaction.get('type', '')}

Available Categories:
{json.dumps(category_list, indent=2)}

Return a JSON response:
{{
    "suggestion": {{
        "category_id": "id of best matching category",
        "category_name": "name of category",
        "confidence": "high/medium/low",
        "reasoning": "why this category"
    }},
    "success": true
}}"""

        response = await llm.chat(
            messages=[{"role": "user", "content": prompt}],
            system_message="You are a transaction categorization AI. Match transactions to the most appropriate category. Return valid JSON only."
        )
        
        try:
            result = json.loads(response)
        except:
            result = {"suggestion": {"confidence": "low"}, "success": False}
        
        return result
        
    except Exception as e:
        return {"success": False, "error": str(e)}


@router.post("/generate-tags")
async def generate_transaction_tags(transaction_id: str, current_user: dict = Depends(get_current_user)):
    """Generate AI tags for a transaction"""
    if not await check_ai_enabled(current_user):
        raise HTTPException(status_code=403, detail="AI features are disabled")
    
    db = get_db()
    
    transaction = await db.transactions.find_one({"_id": transaction_id})
    if not transaction:
        raise HTTPException(status_code=404, detail="Transaction not found")
    
    try:
        llm = await get_configured_llm_service(current_user)
        prompt = f"""Generate relevant tags for this transaction:

Description: {transaction.get('description', '')}
Amount: ${transaction.get('amount', 0)}
Type: {transaction.get('type', '')}
Date: {transaction.get('date', '')}

Return a JSON response:
{{
    "tags": ["tag1", "tag2", "tag3"],
    "success": true
}}

Generate 2-5 relevant, concise tags (e.g., "subscription", "utilities", "dining", "online-purchase")."""

        response = await llm.chat(
            messages=[{"role": "user", "content": prompt}],
            system_message="You are a tagging AI. Generate relevant, useful tags for transactions. Return valid JSON only."
        )
        
        try:
            result = json.loads(response)
            # Update transaction with tags
            if result.get("tags"):
                await db.transactions.update_one(
                    {"_id": transaction_id},
                    {"$set": {"ai_tags": result["tags"]}}
                )
        except:
            result = {"tags": [], "success": False}
        
        return result
        
    except Exception as e:
        return {"success": False, "error": str(e)}


@router.post("/goal-recommendations")
async def generate_goal_recommendations(goal_id: str, current_user: dict = Depends(get_current_user)):
    """Generate AI recommendations for a financial goal"""
    if not await check_ai_enabled(current_user):
        raise HTTPException(status_code=403, detail="AI features are disabled")
    
    db = get_db()
    
    goal = await db.goals.find_one({"_id": goal_id})
    if not goal:
        raise HTTPException(status_code=404, detail="Goal not found")
    
    # Get entity's financial data
    entity_id = goal.get("entity_id")
    transactions = await db.transactions.find({"entity_id": entity_id}).sort("date", -1).limit(50).to_list(50)
    
    monthly_income = sum(t["amount"] for t in transactions if t.get("type") == "income")
    monthly_expenses = sum(t["amount"] for t in transactions if t.get("type") == "expense")
    
    try:
        llm = await get_configured_llm_service(current_user)
        prompt = f"""Provide recommendations for achieving this financial goal:

Goal: {goal.get('name', '')}
Type: {goal.get('goal_type', '')}
Target Amount: ${goal.get('target_amount', 0)}
Current Amount: ${goal.get('current_amount', 0)}
Monthly Contribution: ${goal.get('monthly_contribution', 0)}
Deadline: {goal.get('deadline', 'Not set')}
Priority: {goal.get('priority', 'medium')}

Recent Financial Summary:
- Monthly Income: ${monthly_income}
- Monthly Expenses: ${monthly_expenses}

Return a JSON response:
{{
    "recommendations": [
        "specific actionable recommendation 1",
        "specific actionable recommendation 2",
        "specific actionable recommendation 3"
    ],
    "projected_completion_date": "YYYY-MM-DD or null",
    "on_track": true/false,
    "suggested_monthly_contribution": 0.00
}}"""

        response = await llm.chat(
            messages=[{"role": "user", "content": prompt}],
            system_message="You are a financial planning AI. Provide practical, actionable recommendations for achieving financial goals. Return valid JSON only."
        )
        
        try:
            result = json.loads(response)
            # Update goal with recommendations
            if result.get("recommendations"):
                await db.goals.update_one(
                    {"_id": goal_id},
                    {"$set": {"ai_recommendations": result["recommendations"]}}
                )
        except:
            result = {"recommendations": []}
        
        return result
        
    except Exception as e:
        return {"recommendations": [], "error": str(e)}


@router.post("/estimate-tax")
async def estimate_tax_liability(
    entity_id: str,
    tax_year: int,
    filing_status: str,
    current_user: dict = Depends(get_current_user)
):
    """Estimate tax liability using AI"""
    if not await check_ai_enabled(current_user):
        raise HTTPException(status_code=403, detail="AI features are disabled")
    
    db = get_db()
    
    # Get income and expenses for the year
    year_start = f"{tax_year}-01-01"
    year_end = f"{tax_year}-12-31"
    
    transactions = await db.transactions.find({
        "entity_id": entity_id,
        "date": {"$gte": year_start, "$lte": year_end}
    }).to_list(500)
    
    total_income = sum(t["amount"] for t in transactions if t.get("type") == "income")
    total_expenses = sum(t["amount"] for t in transactions if t.get("type") == "expense")
    
    # Get categories for deduction identification
    categories = await db.categories.find().to_list(100)
    cat_names = {str(c["_id"]): c["name"] for c in categories}
    
    expense_by_category = {}
    for t in transactions:
        if t.get("type") == "expense":
            cat_name = cat_names.get(t.get("category_id", ""), "Other")
            if cat_name not in expense_by_category:
                expense_by_category[cat_name] = 0
            expense_by_category[cat_name] += t.get("amount", 0)
    
    try:
        llm = await get_configured_llm_service(current_user)
        prompt = f"""Estimate tax liability for {tax_year}:

Filing Status: {filing_status}
Total Income: ${total_income}
Total Expenses: ${total_expenses}

Expenses by Category:
{json.dumps(expense_by_category, indent=2)}

Return a JSON response:
{{
    "total_income": {total_income},
    "total_deductions": 0.00,
    "taxable_income": 0.00,
    "estimated_tax_liability": 0.00,
    "effective_tax_rate": 0.00,
    "potential_deductions": [
        {{"name": "deduction name", "amount": 0.00, "category": "category", "description": "brief description"}}
    ],
    "potential_credits": [
        {{"name": "credit name", "amount": 0.00, "description": "brief description"}}
    ],
    "recommendations": ["tax optimization tip 1", "tax optimization tip 2"]
}}

Use current US tax brackets for {filing_status} status."""

        response = await llm.chat(
            messages=[{"role": "user", "content": prompt}],
            system_message="You are a tax planning AI. Provide accurate tax estimates based on US tax law. Return valid JSON only. Include disclaimer that this is not professional tax advice."
        )
        
        try:
            result = json.loads(response)
        except:
            result = {
                "total_income": total_income,
                "estimated_tax_liability": 0,
                "error": "Failed to generate estimate"
            }
        
        return result
        
    except Exception as e:
        return {"error": str(e)}


@router.post("/forecast-budget")
async def forecast_budget(
    entity_id: str,
    forecast_months: int = 3,
    current_user: dict = Depends(get_current_user)
):
    """AI-powered budget forecasting"""
    if not await check_ai_enabled(current_user):
        raise HTTPException(status_code=403, detail="AI features are disabled")
    
    db = get_db()
    
    # Get historical data
    transactions = await db.transactions.find(
        {"entity_id": entity_id}
    ).sort("date", -1).limit(200).to_list(200)
    
    budgets = await db.budgets.find({"entity_id": entity_id}).sort("month", -1).limit(6).to_list(6)
    recurring = await db.recurring_transactions.find(
        {"entity_id": entity_id, "is_active": True}
    ).to_list(50)
    
    # Calculate monthly totals
    monthly_data = {}
    for t in transactions:
        month = t.get("date", "")[:7]
        if month not in monthly_data:
            monthly_data[month] = {"income": 0, "expenses": 0}
        if t.get("type") == "income":
            monthly_data[month]["income"] += t.get("amount", 0)
        else:
            monthly_data[month]["expenses"] += t.get("amount", 0)
    
    try:
        llm = await get_configured_llm_service(current_user)
        prompt = f"""Forecast budget for the next {forecast_months} months:

Historical Monthly Data:
{json.dumps(monthly_data, indent=2)}

Recurring Transactions: {len(recurring)} active

Return a JSON response:
{{
    "forecast": {{
        "monthly_forecasts": [
            {{
                "month": "YYYY-MM",
                "forecasted_income": 0.00,
                "forecasted_expenses": 0.00,
                "ending_balance": 0.00,
                "confidence": "high/medium/low"
            }}
        ],
        "overall_health_score": 75,
        "insights": {{
            "spending_trend": "increasing/decreasing/stable",
            "income_stability": "stable/variable",
            "risk_level": "low/medium/high",
            "potential_shortfalls": ["month if any"],
            "potential_surpluses": ["month if any"]
        }},
        "recommendations": [
            {{"category": "name", "current_avg": 0.00, "suggested_budget": 0.00, "reason": "why", "priority": "high/medium/low"}}
        ],
        "action_items": ["specific action 1", "specific action 2"]
    }},
    "success": true
}}"""

        response = await llm.chat(
            messages=[{"role": "user", "content": prompt}],
            system_message="You are a budget forecasting AI. Provide accurate predictions and actionable insights. Return valid JSON only."
        )
        
        try:
            result = json.loads(response)
        except:
            result = {"success": False, "error": "Failed to parse forecast"}
        
        return result
        
    except Exception as e:
        return {"success": False, "error": str(e)}


@router.post("/detect-bills")
async def detect_bills(entity_id: str, current_user: dict = Depends(get_current_user)):
    """Auto-detect recurring bills from transaction history"""
    if not await check_ai_enabled(current_user):
        raise HTTPException(status_code=403, detail="AI features are disabled")
    
    db = get_db()
    
    # Get expense transactions
    transactions = await db.transactions.find(
        {"entity_id": entity_id, "type": "expense"}
    ).sort("date", -1).limit(200).to_list(200)
    
    # Group by description to find patterns
    description_groups = {}
    for t in transactions:
        desc = t.get("description", "").lower().strip()
        if desc:
            if desc not in description_groups:
                description_groups[desc] = []
            description_groups[desc].append({
                "amount": t.get("amount"),
                "date": t.get("date")
            })
    
    # Find recurring patterns (same description, multiple occurrences)
    potential_bills = []
    for desc, occurrences in description_groups.items():
        if len(occurrences) >= 2:
            amounts = [o["amount"] for o in occurrences]
            avg_amount = sum(amounts) / len(amounts)
            potential_bills.append({
                "description": desc,
                "occurrences": len(occurrences),
                "average_amount": round(avg_amount, 2),
                "dates": [o["date"] for o in occurrences[:5]]
            })
    
    try:
        llm = await get_configured_llm_service(current_user)
        prompt = f"""Identify recurring bills from these transaction patterns:

Potential Recurring Transactions:
{json.dumps(potential_bills[:20], indent=2)}

Return a JSON response:
{{
    "detected_bills": [
        {{
            "name": "clean name for the bill",
            "typical_amount": 0.00,
            "frequency": "monthly/quarterly/yearly",
            "next_due_date": "YYYY-MM-DD",
            "confidence": "high/medium/low"
        }}
    ],
    "success": true
}}

Only include transactions that are clearly recurring bills (subscriptions, utilities, insurance, etc.)."""

        response = await llm.chat(
            messages=[{"role": "user", "content": prompt}],
            system_message="You are a bill detection AI. Identify recurring bills from transaction patterns. Return valid JSON only."
        )
        
        try:
            result = json.loads(response)
            # Create bill records
            created_count = 0
            for bill in result.get("detected_bills", []):
                if bill.get("confidence") != "low":
                    now = datetime.now(timezone.utc).isoformat()
                    await db.bills.insert_one({
                        "_id": str(ObjectId()),
                        "entity_id": entity_id,
                        "name": bill["name"],
                        "typical_amount": bill["typical_amount"],
                        "frequency": bill["frequency"],
                        "due_date": bill.get("next_due_date", ""),
                        "reminder_days": 7,
                        "status": "pending",
                        "auto_detected": True,
                        "payment_history": [],
                        "created_at": now,
                        "updated_at": now
                    })
                    created_count += 1
            
            return {"success": True, "created_count": created_count, "detected_bills": result.get("detected_bills", [])}
        except:
            return {"success": False, "created_count": 0}
        
    except Exception as e:
        return {"success": False, "error": str(e)}
