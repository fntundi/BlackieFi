"""
Strategy Studio - AI-powered investment research frameworks and strategy analysis
Part of BlackieFi AI Co-Pilot Phase 3
"""
import os
import json
import uuid
from datetime import datetime, timezone
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, HTTPException, Depends, Form, Body
from pydantic import BaseModel
from dotenv import load_dotenv

load_dotenv()

from database import get_db
from routes.auth import get_current_user

router = APIRouter(prefix="/api/strategy", tags=["Strategy Studio"])


class StrategyFramework(BaseModel):
    """Investment strategy framework model"""
    id: Optional[str] = None
    name: str
    description: str
    framework_type: str  # value, growth, momentum, dividend, balanced, custom
    risk_tolerance: str  # conservative, moderate, aggressive
    time_horizon: str  # short, medium, long
    parameters: Dict[str, Any] = {}
    is_active: bool = True


class StrategyAnalysisRequest(BaseModel):
    """Request for strategy analysis"""
    framework_id: Optional[str] = None
    asset_type: str  # stock, real_estate, crypto, etf, bond
    ticker_or_name: str
    additional_context: Optional[str] = None


class StrategyComparisonRequest(BaseModel):
    """Request to compare multiple strategies"""
    asset_type: str
    ticker_or_name: str
    framework_ids: List[str]


def get_user_id(current_user: dict) -> str:
    """Get user ID from current_user dict"""
    return current_user.get("id") or current_user.get("_id") or current_user.get("user_id")


# =============================================================================
# INVESTMENT FRAMEWORKS
# =============================================================================

DEFAULT_FRAMEWORKS = [
    {
        "name": "Value Investing (Graham/Buffett)",
        "description": "Focus on undervalued companies with strong fundamentals, margin of safety, and long-term growth potential",
        "framework_type": "value",
        "risk_tolerance": "moderate",
        "time_horizon": "long",
        "parameters": {
            "pe_ratio_max": 15,
            "pb_ratio_max": 1.5,
            "debt_to_equity_max": 0.5,
            "dividend_yield_min": 2.0,
            "current_ratio_min": 1.5,
            "focus_areas": ["intrinsic_value", "margin_of_safety", "competitive_moat"]
        }
    },
    {
        "name": "Growth Investing",
        "description": "Focus on companies with above-average earnings growth, willing to pay premium valuations",
        "framework_type": "growth",
        "risk_tolerance": "aggressive",
        "time_horizon": "medium",
        "parameters": {
            "revenue_growth_min": 15,
            "earnings_growth_min": 20,
            "peg_ratio_max": 2.0,
            "focus_areas": ["revenue_acceleration", "market_expansion", "innovation"]
        }
    },
    {
        "name": "Dividend Income",
        "description": "Focus on stable companies with consistent dividend payments and growth",
        "framework_type": "dividend",
        "risk_tolerance": "conservative",
        "time_horizon": "long",
        "parameters": {
            "dividend_yield_min": 3.0,
            "payout_ratio_max": 75,
            "dividend_growth_years_min": 5,
            "focus_areas": ["dividend_safety", "yield_growth", "income_stability"]
        }
    },
    {
        "name": "Momentum Trading",
        "description": "Follow price trends and market momentum, quick to adapt to market changes",
        "framework_type": "momentum",
        "risk_tolerance": "aggressive",
        "time_horizon": "short",
        "parameters": {
            "rsi_oversold": 30,
            "rsi_overbought": 70,
            "moving_average_periods": [20, 50, 200],
            "focus_areas": ["trend_following", "relative_strength", "breakouts"]
        }
    },
    {
        "name": "Real Estate Analysis",
        "description": "Comprehensive framework for analyzing real estate investments",
        "framework_type": "real_estate",
        "risk_tolerance": "moderate",
        "time_horizon": "long",
        "parameters": {
            "cap_rate_min": 5.0,
            "cash_on_cash_min": 8.0,
            "dscr_min": 1.25,
            "ltv_max": 75,
            "focus_areas": ["cap_rate", "noi", "appreciation_potential", "location_analysis"]
        }
    }
]


@router.get("/frameworks")
async def get_frameworks(
    current_user: dict = Depends(get_current_user),
    db = Depends(get_db),
):
    """Get all available investment frameworks"""
    user_id = get_user_id(current_user)
    
    # Get custom user frameworks
    user_frameworks = await db.strategy_frameworks.find(
        {"user_id": user_id}
    ).to_list(100)
    
    # Combine with default frameworks
    all_frameworks = []
    
    # Add default frameworks
    for i, fw in enumerate(DEFAULT_FRAMEWORKS):
        all_frameworks.append({
            "id": f"default_{i}",
            "name": fw["name"],
            "description": fw["description"],
            "framework_type": fw["framework_type"],
            "risk_tolerance": fw["risk_tolerance"],
            "time_horizon": fw["time_horizon"],
            "parameters": fw["parameters"],
            "is_default": True,
            "is_active": True
        })
    
    # Add user frameworks
    for fw in user_frameworks:
        all_frameworks.append({
            "id": fw["_id"],
            "name": fw["name"],
            "description": fw["description"],
            "framework_type": fw["framework_type"],
            "risk_tolerance": fw["risk_tolerance"],
            "time_horizon": fw["time_horizon"],
            "parameters": fw.get("parameters", {}),
            "is_default": False,
            "is_active": fw.get("is_active", True)
        })
    
    return {"frameworks": all_frameworks}


@router.post("/frameworks")
async def create_framework(
    framework: StrategyFramework,
    current_user: dict = Depends(get_current_user),
    db = Depends(get_db),
):
    """Create a custom investment framework"""
    user_id = get_user_id(current_user)
    now = datetime.now(timezone.utc).isoformat()
    
    doc = {
        "_id": str(uuid.uuid4()),
        "user_id": user_id,
        "name": framework.name,
        "description": framework.description,
        "framework_type": framework.framework_type,
        "risk_tolerance": framework.risk_tolerance,
        "time_horizon": framework.time_horizon,
        "parameters": framework.parameters,
        "is_active": framework.is_active,
        "created_at": now,
        "updated_at": now
    }
    
    await db.strategy_frameworks.insert_one(doc)
    
    return {
        "id": doc["_id"],
        "message": "Framework created successfully"
    }


@router.delete("/frameworks/{framework_id}")
async def delete_framework(
    framework_id: str,
    current_user: dict = Depends(get_current_user),
    db = Depends(get_db),
):
    """Delete a custom framework"""
    user_id = get_user_id(current_user)
    
    result = await db.strategy_frameworks.delete_one({
        "_id": framework_id,
        "user_id": user_id
    })
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Framework not found")
    
    return {"message": "Framework deleted"}


# =============================================================================
# STRATEGY ANALYSIS
# =============================================================================

@router.post("/analyze")
async def analyze_with_strategy(
    request: StrategyAnalysisRequest,
    current_user: dict = Depends(get_current_user),
    db = Depends(get_db),
):
    """
    Analyze an investment using a specific strategy framework.
    Uses AI to evaluate the investment based on framework parameters.
    """
    user_id = get_user_id(current_user)
    
    # Check AI status
    system_settings = await db.system_settings.find_one({"_id": "system"}) or {}
    if not system_settings.get("ai_enabled", True):
        raise HTTPException(status_code=400, detail="AI is not enabled")
    
    # Get the framework
    framework = None
    if request.framework_id:
        if request.framework_id.startswith("default_"):
            idx = int(request.framework_id.replace("default_", ""))
            if 0 <= idx < len(DEFAULT_FRAMEWORKS):
                framework = DEFAULT_FRAMEWORKS[idx]
        else:
            custom_fw = await db.strategy_frameworks.find_one({
                "_id": request.framework_id,
                "user_id": user_id
            })
            if custom_fw:
                framework = custom_fw
    
    if not framework:
        # Use default value investing framework
        framework = DEFAULT_FRAMEWORKS[0]
    
    try:
        from emergentintegrations.llm.chat import LlmChat, UserMessage
        
        api_key = os.environ.get("EMERGENT_LLM_KEY")
        if not api_key:
            raise HTTPException(status_code=500, detail="AI not configured")
        
        session_id = f"strategy-{user_id}-{uuid.uuid4().hex[:8]}"
        
        system_message = f"""You are an expert investment analyst for BlackieFi, 
an institutional-grade wealth management platform. 

You are analyzing investments using the "{framework['name']}" framework:
{framework['description']}

Framework Parameters:
{json.dumps(framework.get('parameters', {}), indent=2)}

Risk Tolerance: {framework['risk_tolerance']}
Time Horizon: {framework['time_horizon']}

Provide thorough analysis including:
1. Overall assessment based on framework criteria
2. Key metrics evaluation (actual numbers if known, or what to look for)
3. Strengths and weaknesses
4. Risk factors specific to this framework
5. Actionable recommendation (BUY, HOLD, SELL, or AVOID)
6. Confidence level (High, Medium, Low) with reasoning

Be specific and quantitative where possible. Reference the framework criteria in your analysis."""

        chat = LlmChat(
            api_key=api_key,
            session_id=session_id,
            system_message=system_message
        ).with_model("openai", "gpt-5.2")
        
        analysis_prompt = f"""Analyze the following investment:
        
Asset Type: {request.asset_type}
Ticker/Name: {request.ticker_or_name}
{"Additional Context: " + request.additional_context if request.additional_context else ""}

Please provide a comprehensive analysis using the {framework['name']} framework."""
        
        user_message = UserMessage(text=analysis_prompt)
        response = await chat.send_message(user_message)
        
        # Save analysis to history
        now = datetime.now(timezone.utc).isoformat()
        await db.strategy_analyses.insert_one({
            "_id": str(uuid.uuid4()),
            "user_id": user_id,
            "framework_name": framework["name"],
            "framework_type": framework["framework_type"],
            "asset_type": request.asset_type,
            "ticker_or_name": request.ticker_or_name,
            "analysis": response,
            "created_at": now
        })
        
        return {
            "success": True,
            "framework": framework["name"],
            "asset": request.ticker_or_name,
            "asset_type": request.asset_type,
            "analysis": response,
            "model_used": "gpt-5.2"
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")


@router.post("/compare")
async def compare_strategies(
    request: StrategyComparisonRequest,
    current_user: dict = Depends(get_current_user),
    db = Depends(get_db),
):
    """
    Compare an investment across multiple strategy frameworks.
    Provides a side-by-side analysis from different perspectives.
    """
    user_id = get_user_id(current_user)
    
    # Check AI status
    system_settings = await db.system_settings.find_one({"_id": "system"}) or {}
    if not system_settings.get("ai_enabled", True):
        raise HTTPException(status_code=400, detail="AI is not enabled")
    
    # Get frameworks
    frameworks = []
    for fw_id in request.framework_ids[:4]:  # Max 4 frameworks
        if fw_id.startswith("default_"):
            idx = int(fw_id.replace("default_", ""))
            if 0 <= idx < len(DEFAULT_FRAMEWORKS):
                frameworks.append(DEFAULT_FRAMEWORKS[idx])
        else:
            custom_fw = await db.strategy_frameworks.find_one({
                "_id": fw_id,
                "user_id": user_id
            })
            if custom_fw:
                frameworks.append(custom_fw)
    
    if not frameworks:
        frameworks = DEFAULT_FRAMEWORKS[:3]
    
    try:
        from emergentintegrations.llm.chat import LlmChat, UserMessage
        
        api_key = os.environ.get("EMERGENT_LLM_KEY")
        if not api_key:
            raise HTTPException(status_code=500, detail="AI not configured")
        
        session_id = f"compare-{user_id}-{uuid.uuid4().hex[:8]}"
        
        framework_descriptions = "\n\n".join([
            f"**{fw['name']}** ({fw['framework_type']}):\n{fw['description']}\nRisk: {fw['risk_tolerance']}, Horizon: {fw['time_horizon']}"
            for fw in frameworks
        ])
        
        system_message = f"""You are an expert investment analyst providing comparative analysis 
from multiple investment perspectives for BlackieFi.

You will analyze an investment using these different frameworks:

{framework_descriptions}

Provide:
1. A brief analysis from each framework's perspective
2. Key pros and cons from each viewpoint
3. Recommendation from each framework (BUY/HOLD/SELL/AVOID)
4. Overall synthesis and which framework(s) favor this investment
5. Risk-adjusted recommendation based on all perspectives

Format your response with clear sections for each framework, then a synthesis section."""

        chat = LlmChat(
            api_key=api_key,
            session_id=session_id,
            system_message=system_message
        ).with_model("openai", "gpt-5.2")
        
        analysis_prompt = f"""Compare analysis for:
        
Asset Type: {request.asset_type}
Ticker/Name: {request.ticker_or_name}

Analyze from each framework's perspective and provide a comprehensive comparison."""
        
        user_message = UserMessage(text=analysis_prompt)
        response = await chat.send_message(user_message)
        
        return {
            "success": True,
            "asset": request.ticker_or_name,
            "asset_type": request.asset_type,
            "frameworks_compared": [fw["name"] for fw in frameworks],
            "comparison_analysis": response,
            "model_used": "gpt-5.2"
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Comparison failed: {str(e)}")


@router.get("/history")
async def get_analysis_history(
    limit: int = 20,
    current_user: dict = Depends(get_current_user),
    db = Depends(get_db),
):
    """Get recent strategy analysis history"""
    user_id = get_user_id(current_user)
    
    analyses = await db.strategy_analyses.find(
        {"user_id": user_id}
    ).sort("created_at", -1).limit(limit).to_list(limit)
    
    return {
        "analyses": [
            {
                "id": a["_id"],
                "framework": a["framework_name"],
                "asset": a["ticker_or_name"],
                "asset_type": a["asset_type"],
                "analysis_preview": a["analysis"][:200] + "..." if len(a["analysis"]) > 200 else a["analysis"],
                "created_at": a["created_at"]
            }
            for a in analyses
        ]
    }


@router.get("/history/{analysis_id}")
async def get_analysis_detail(
    analysis_id: str,
    current_user: dict = Depends(get_current_user),
    db = Depends(get_db),
):
    """Get full details of a specific analysis"""
    user_id = get_user_id(current_user)
    
    analysis = await db.strategy_analyses.find_one({
        "_id": analysis_id,
        "user_id": user_id
    })
    
    if not analysis:
        raise HTTPException(status_code=404, detail="Analysis not found")
    
    return {
        "id": analysis["_id"],
        "framework": analysis["framework_name"],
        "framework_type": analysis["framework_type"],
        "asset": analysis["ticker_or_name"],
        "asset_type": analysis["asset_type"],
        "analysis": analysis["analysis"],
        "created_at": analysis["created_at"]
    }
