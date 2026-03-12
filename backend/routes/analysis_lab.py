"""
Analysis Lab - AI-powered asset analysis and research tools
Part of BlackieFi AI Co-Pilot Phase 3
"""
import os
import json
import uuid
from datetime import datetime, timezone
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, HTTPException, Depends, Form
from pydantic import BaseModel
from dotenv import load_dotenv

load_dotenv()

from database import get_db
from routes.auth import get_current_user

router = APIRouter(prefix="/api/analysis", tags=["Analysis Lab"])


class AssetAnalysisRequest(BaseModel):
    """Request for comprehensive asset analysis"""
    asset_type: str  # stock, real_estate, crypto, bond, etf, private_equity, tax_lien, precious_metal
    identifier: str  # ticker, property address, coin name, etc.
    analysis_depth: str = "standard"  # quick, standard, deep
    include_sections: List[str] = []  # empty = all sections


class RiskAssessmentRequest(BaseModel):
    """Request for risk assessment"""
    asset_type: str
    identifier: str
    investment_amount: float
    time_horizon: str  # short, medium, long


class DueDiligenceRequest(BaseModel):
    """Request for due diligence checklist"""
    asset_type: str
    identifier: str
    deal_size: Optional[float] = None


def get_user_id(current_user: dict) -> str:
    """Get user ID from current_user dict"""
    return current_user.get("id") or current_user.get("_id") or current_user.get("user_id")


# =============================================================================
# ANALYSIS TEMPLATES BY ASSET TYPE
# =============================================================================

ANALYSIS_TEMPLATES = {
    "stock": {
        "sections": ["fundamentals", "technicals", "valuation", "risks", "catalysts", "recommendation"],
        "key_metrics": ["P/E", "P/B", "EPS Growth", "Revenue Growth", "Debt/Equity", "ROE", "Dividend Yield"]
    },
    "real_estate": {
        "sections": ["location", "financials", "market_analysis", "condition", "risks", "exit_strategy"],
        "key_metrics": ["Cap Rate", "NOI", "Cash-on-Cash", "DSCR", "LTV", "GRM", "Appreciation Potential"]
    },
    "crypto": {
        "sections": ["technology", "tokenomics", "team", "adoption", "risks", "market_position"],
        "key_metrics": ["Market Cap", "Circulating Supply", "Trading Volume", "Network Activity", "Developer Activity"]
    },
    "private_equity": {
        "sections": ["management", "financials", "market", "growth_potential", "risks", "exit_opportunities"],
        "key_metrics": ["Revenue", "EBITDA", "Growth Rate", "Market Size", "Competitive Position"]
    },
    "tax_lien": {
        "sections": ["property_value", "lien_details", "redemption_analysis", "risks", "roi_projection"],
        "key_metrics": ["Interest Rate", "Redemption Period", "Property Value", "Lien Amount", "Expected ROI"]
    },
    "precious_metal": {
        "sections": ["market_overview", "supply_demand", "macro_factors", "storage_costs", "risks"],
        "key_metrics": ["Spot Price", "Premium", "Storage Cost", "Liquidity", "Historical Volatility"]
    }
}


# =============================================================================
# COMPREHENSIVE ANALYSIS
# =============================================================================

@router.post("/comprehensive")
async def comprehensive_analysis(
    request: AssetAnalysisRequest,
    current_user: dict = Depends(get_current_user),
    db = Depends(get_db),
):
    """
    Perform comprehensive AI-powered analysis on any asset type.
    Tailored analysis based on asset type with relevant metrics and insights.
    """
    user_id = get_user_id(current_user)
    
    # Check AI status
    system_settings = await db.system_settings.find_one({"_id": "system"}) or {}
    if not system_settings.get("ai_enabled", True):
        raise HTTPException(status_code=400, detail="AI is not enabled")
    
    # Get template for asset type
    template = ANALYSIS_TEMPLATES.get(request.asset_type, ANALYSIS_TEMPLATES["stock"])
    sections = request.include_sections if request.include_sections else template["sections"]
    
    try:
        from emergentintegrations.llm.chat import LlmChat, UserMessage
        
        api_key = os.environ.get("EMERGENT_LLM_KEY")
        if not api_key:
            raise HTTPException(status_code=500, detail="AI not configured")
        
        session_id = f"analysis-{user_id}-{uuid.uuid4().hex[:8]}"
        
        depth_instruction = {
            "quick": "Provide a brief, high-level analysis focusing on the most critical factors.",
            "standard": "Provide a thorough analysis covering all major aspects.",
            "deep": "Provide an exhaustive, institutional-grade analysis with detailed quantitative assessments."
        }.get(request.analysis_depth, "Provide a thorough analysis.")
        
        system_message = f"""You are a senior investment analyst at BlackieFi, 
an institutional-grade wealth management platform. You specialize in {request.asset_type} analysis.

{depth_instruction}

Key Metrics to Evaluate: {', '.join(template['key_metrics'])}

For each section, provide:
- Current assessment with specific data points
- Historical context where relevant
- Forward-looking projections
- Confidence level in your analysis

Be specific with numbers, percentages, and timeframes. Avoid vague statements."""

        chat = LlmChat(
            api_key=api_key,
            session_id=session_id,
            system_message=system_message
        ).with_model("openai", "gpt-5.2")
        
        analysis_prompt = f"""Perform a comprehensive {request.analysis_depth} analysis of:

Asset Type: {request.asset_type.replace('_', ' ').title()}
Identifier: {request.identifier}

Please analyze the following sections:
{', '.join([s.replace('_', ' ').title() for s in sections])}

Provide your analysis in a structured format with clear sections and actionable insights."""
        
        user_message = UserMessage(text=analysis_prompt)
        response = await chat.send_message(user_message)
        
        # Save to history
        now = datetime.now(timezone.utc).isoformat()
        analysis_record = {
            "_id": str(uuid.uuid4()),
            "user_id": user_id,
            "analysis_type": "comprehensive",
            "asset_type": request.asset_type,
            "identifier": request.identifier,
            "depth": request.analysis_depth,
            "sections": sections,
            "analysis": response,
            "created_at": now
        }
        await db.analysis_lab_history.insert_one(analysis_record)
        
        return {
            "success": True,
            "analysis_id": analysis_record["_id"],
            "asset_type": request.asset_type,
            "identifier": request.identifier,
            "depth": request.analysis_depth,
            "sections_analyzed": sections,
            "analysis": response,
            "key_metrics": template["key_metrics"],
            "model_used": "gpt-5.2"
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")


# =============================================================================
# RISK ASSESSMENT
# =============================================================================

@router.post("/risk-assessment")
async def risk_assessment(
    request: RiskAssessmentRequest,
    current_user: dict = Depends(get_current_user),
    db = Depends(get_db),
):
    """
    Perform AI-powered risk assessment for an investment.
    Evaluates various risk factors and provides a risk score.
    """
    user_id = get_user_id(current_user)
    
    # Check AI status
    system_settings = await db.system_settings.find_one({"_id": "system"}) or {}
    if not system_settings.get("ai_enabled", True):
        raise HTTPException(status_code=400, detail="AI is not enabled")
    
    try:
        from emergentintegrations.llm.chat import LlmChat, UserMessage
        
        api_key = os.environ.get("EMERGENT_LLM_KEY")
        if not api_key:
            raise HTTPException(status_code=500, detail="AI not configured")
        
        session_id = f"risk-{user_id}-{uuid.uuid4().hex[:8]}"
        
        system_message = """You are a risk management expert at BlackieFi. 
Your role is to provide comprehensive risk assessments for investments.

Evaluate risks across these categories:
1. Market Risk - Volatility, correlation, beta
2. Liquidity Risk - Ability to exit position
3. Credit/Default Risk - Counterparty or company solvency
4. Operational Risk - Business execution risks
5. Regulatory Risk - Legal and compliance factors
6. Concentration Risk - Portfolio impact

Provide:
- Risk Score (1-10, where 10 is highest risk)
- Risk breakdown by category
- Worst-case scenario analysis
- Risk mitigation recommendations
- Position sizing suggestion based on risk

Be quantitative and specific. Use percentages for probability estimates."""

        chat = LlmChat(
            api_key=api_key,
            session_id=session_id,
            system_message=system_message
        ).with_model("openai", "gpt-5.2")
        
        analysis_prompt = f"""Perform a comprehensive risk assessment:

Asset Type: {request.asset_type.replace('_', ' ').title()}
Identifier: {request.identifier}
Investment Amount: ${request.investment_amount:,.2f}
Time Horizon: {request.time_horizon}

Provide a detailed risk assessment with scores and recommendations."""
        
        user_message = UserMessage(text=analysis_prompt)
        response = await chat.send_message(user_message)
        
        # Save to history
        now = datetime.now(timezone.utc).isoformat()
        await db.analysis_lab_history.insert_one({
            "_id": str(uuid.uuid4()),
            "user_id": user_id,
            "analysis_type": "risk_assessment",
            "asset_type": request.asset_type,
            "identifier": request.identifier,
            "investment_amount": request.investment_amount,
            "time_horizon": request.time_horizon,
            "analysis": response,
            "created_at": now
        })
        
        return {
            "success": True,
            "asset_type": request.asset_type,
            "identifier": request.identifier,
            "investment_amount": request.investment_amount,
            "time_horizon": request.time_horizon,
            "risk_assessment": response,
            "model_used": "gpt-5.2"
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Risk assessment failed: {str(e)}")


# =============================================================================
# DUE DILIGENCE
# =============================================================================

@router.post("/due-diligence")
async def generate_due_diligence(
    request: DueDiligenceRequest,
    current_user: dict = Depends(get_current_user),
    db = Depends(get_db),
):
    """
    Generate a comprehensive due diligence checklist and analysis.
    Tailored to asset type with specific items to verify.
    """
    user_id = get_user_id(current_user)
    
    # Check AI status
    system_settings = await db.system_settings.find_one({"_id": "system"}) or {}
    if not system_settings.get("ai_enabled", True):
        raise HTTPException(status_code=400, detail="AI is not enabled")
    
    try:
        from emergentintegrations.llm.chat import LlmChat, UserMessage
        
        api_key = os.environ.get("EMERGENT_LLM_KEY")
        if not api_key:
            raise HTTPException(status_code=500, detail="AI not configured")
        
        session_id = f"dd-{user_id}-{uuid.uuid4().hex[:8]}"
        
        system_message = f"""You are a due diligence specialist at BlackieFi, 
an institutional-grade wealth management platform.

Generate a comprehensive due diligence checklist for {request.asset_type} investments.

Include these categories:
1. Legal & Documentation Review
2. Financial Analysis Items  
3. Operational Verification
4. Market & Competitive Analysis
5. Risk Assessment Items
6. Regulatory Compliance Checks
7. Exit Strategy Evaluation

For each item provide:
- Specific action/document to verify
- Why it matters
- Red flags to watch for
- Resources or methods to verify

Be specific and actionable. This should be a practical checklist an investor can follow."""

        chat = LlmChat(
            api_key=api_key,
            session_id=session_id,
            system_message=system_message
        ).with_model("openai", "gpt-5.2")
        
        deal_context = f"\nDeal Size: ${request.deal_size:,.2f}" if request.deal_size else ""
        
        analysis_prompt = f"""Generate a due diligence checklist for:

Asset Type: {request.asset_type.replace('_', ' ').title()}
Identifier: {request.identifier}{deal_context}

Provide a comprehensive, actionable due diligence checklist organized by category."""
        
        user_message = UserMessage(text=analysis_prompt)
        response = await chat.send_message(user_message)
        
        return {
            "success": True,
            "asset_type": request.asset_type,
            "identifier": request.identifier,
            "deal_size": request.deal_size,
            "due_diligence_checklist": response,
            "model_used": "gpt-5.2"
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Due diligence generation failed: {str(e)}")


# =============================================================================
# MARKET RESEARCH
# =============================================================================

@router.post("/market-research")
async def market_research(
    sector: str = Form(...),
    focus_area: Optional[str] = Form(None),
    current_user: dict = Depends(get_current_user),
    db = Depends(get_db),
):
    """
    Generate AI-powered market research summary for a sector.
    """
    user_id = get_user_id(current_user)
    
    # Check AI status
    system_settings = await db.system_settings.find_one({"_id": "system"}) or {}
    if not system_settings.get("ai_enabled", True):
        raise HTTPException(status_code=400, detail="AI is not enabled")
    
    try:
        from emergentintegrations.llm.chat import LlmChat, UserMessage
        
        api_key = os.environ.get("EMERGENT_LLM_KEY")
        if not api_key:
            raise HTTPException(status_code=500, detail="AI not configured")
        
        session_id = f"research-{user_id}-{uuid.uuid4().hex[:8]}"
        
        system_message = """You are a market research analyst at BlackieFi.
Provide comprehensive market research including:

1. Market Overview - Size, growth rate, key trends
2. Competitive Landscape - Major players, market share
3. Growth Drivers - What's fueling the sector
4. Risks & Challenges - Headwinds and concerns
5. Investment Opportunities - Specific areas to consider
6. Outlook - 1-year and 3-year projections

Use data and statistics where possible. Cite trends and provide actionable insights."""

        chat = LlmChat(
            api_key=api_key,
            session_id=session_id,
            system_message=system_message
        ).with_model("openai", "gpt-5.2")
        
        focus = f"\nFocus Area: {focus_area}" if focus_area else ""
        
        analysis_prompt = f"""Provide market research for:

Sector: {sector}{focus}

Include current trends, key players, growth opportunities, and risks."""
        
        user_message = UserMessage(text=analysis_prompt)
        response = await chat.send_message(user_message)
        
        return {
            "success": True,
            "sector": sector,
            "focus_area": focus_area,
            "research": response,
            "model_used": "gpt-5.2"
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Market research failed: {str(e)}")


# =============================================================================
# PORTFOLIO ANALYSIS
# =============================================================================

@router.post("/portfolio-analysis")
async def analyze_portfolio(
    entity_id: str = Form(...),
    current_user: dict = Depends(get_current_user),
    db = Depends(get_db),
):
    """
    Analyze the user's portfolio using AI.
    Provides diversification analysis, risk assessment, and recommendations.
    """
    user_id = get_user_id(current_user)
    
    # Check AI status
    system_settings = await db.system_settings.find_one({"_id": "system"}) or {}
    if not system_settings.get("ai_enabled", True):
        raise HTTPException(status_code=400, detail="AI is not enabled")
    
    # Gather portfolio data
    accounts = await db.accounts.find({"entity_id": entity_id}).to_list(50)
    holdings = await db.investment_holdings.find({"entity_id": entity_id}).to_list(100)
    assets = await db.assets.find({"entity_id": entity_id}).to_list(50)
    
    # Build portfolio summary
    portfolio_summary = {
        "accounts": [{"name": a.get("name"), "type": a.get("account_type"), "balance": a.get("balance", 0)} for a in accounts],
        "holdings": [{"symbol": h.get("symbol"), "shares": h.get("quantity"), "value": h.get("current_value", 0)} for h in holdings],
        "assets": [{"name": a.get("name"), "type": a.get("asset_type"), "value": a.get("current_value", 0)} for a in assets]
    }
    
    total_value = sum(a.get("balance", 0) for a in accounts) + sum(h.get("current_value", 0) for h in holdings) + sum(a.get("current_value", 0) for a in assets)
    
    try:
        from emergentintegrations.llm.chat import LlmChat, UserMessage
        
        api_key = os.environ.get("EMERGENT_LLM_KEY")
        if not api_key:
            raise HTTPException(status_code=500, detail="AI not configured")
        
        session_id = f"portfolio-{user_id}-{uuid.uuid4().hex[:8]}"
        
        system_message = """You are a portfolio manager at BlackieFi. 
Analyze the portfolio and provide:

1. Asset Allocation Analysis - Current breakdown by asset class
2. Diversification Score - How well diversified (1-10)
3. Risk Assessment - Overall portfolio risk level
4. Concentration Risks - Any over-concentrated positions
5. Rebalancing Recommendations - Specific changes to improve
6. Growth Opportunities - Areas to consider adding
7. Action Items - Top 3 priorities

Be specific with percentages and dollar amounts."""

        chat = LlmChat(
            api_key=api_key,
            session_id=session_id,
            system_message=system_message
        ).with_model("openai", "gpt-5.2")
        
        analysis_prompt = f"""Analyze this portfolio:

Total Portfolio Value: ${total_value:,.2f}

Portfolio Holdings:
{json.dumps(portfolio_summary, indent=2)}

Provide comprehensive portfolio analysis with specific recommendations."""
        
        user_message = UserMessage(text=analysis_prompt)
        response = await chat.send_message(user_message)
        
        return {
            "success": True,
            "total_value": total_value,
            "holdings_count": len(holdings) + len(assets),
            "accounts_count": len(accounts),
            "analysis": response,
            "model_used": "gpt-5.2"
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Portfolio analysis failed: {str(e)}")


# =============================================================================
# HISTORY
# =============================================================================

@router.get("/history")
async def get_analysis_history(
    analysis_type: Optional[str] = None,
    limit: int = 20,
    current_user: dict = Depends(get_current_user),
    db = Depends(get_db),
):
    """Get analysis history from the Analysis Lab"""
    user_id = get_user_id(current_user)
    
    query = {"user_id": user_id}
    if analysis_type:
        query["analysis_type"] = analysis_type
    
    analyses = await db.analysis_lab_history.find(query).sort("created_at", -1).limit(limit).to_list(limit)
    
    return {
        "analyses": [
            {
                "id": a["_id"],
                "type": a.get("analysis_type", "comprehensive"),
                "asset_type": a.get("asset_type"),
                "identifier": a.get("identifier"),
                "preview": a.get("analysis", "")[:200] + "..." if len(a.get("analysis", "")) > 200 else a.get("analysis", ""),
                "created_at": a["created_at"]
            }
            for a in analyses
        ]
    }
