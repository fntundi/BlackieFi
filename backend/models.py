"""
Pydantic models for request/response validation
"""
from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List
from datetime import datetime

# ============= User Models =============
class UserRegisterInput(BaseModel):
    username: str = Field(..., min_length=3, max_length=100)
    email: EmailStr
    password: str = Field(..., min_length=8)
    full_name: Optional[str] = ""

class UserLoginInput(BaseModel):
    username: str
    password: str

class PasswordResetRequestInput(BaseModel):
    email: EmailStr

class PasswordResetInput(BaseModel):
    token: str
    new_password: str = Field(..., min_length=8)

class UserUpdateInput(BaseModel):
    full_name: Optional[str] = None
    email: Optional[EmailStr] = None
    ai_enabled: Optional[bool] = None
    preferred_llm_provider: Optional[str] = None

class UserResponse(BaseModel):
    id: str
    username: str
    email: str
    full_name: Optional[str] = ""
    role: str = "user"
    ai_enabled: bool = False
    preferred_llm_provider: Optional[str] = None
    created_at: str
    updated_at: str

# ============= Entity Models =============
class EntityInput(BaseModel):
    name: str
    type: str = Field(..., pattern="^(personal|business)$")

class EntityResponse(BaseModel):
    id: str
    owner_id: str
    name: str
    type: str
    created_at: str
    updated_at: str

# ============= Account Models =============
class AccountInput(BaseModel):
    entity_id: str
    name: str
    type: str  # checking, savings, credit_card, cash
    balance: float = 0.0
    currency: str = "USD"

class AccountResponse(BaseModel):
    id: str
    entity_id: str
    name: str
    type: str
    balance: float
    currency: str
    is_active: bool = True
    created_at: str
    updated_at: str

# ============= Category Models =============
class CategoryInput(BaseModel):
    entity_id: Optional[str] = None
    parent_category: Optional[str] = None
    name: str
    type: str = Field(..., pattern="^(income|expense|both)$")
    auto_categorization_rules: List[str] = []
    is_default: bool = False

class CategoryResponse(BaseModel):
    id: str
    entity_id: Optional[str] = None
    parent_category: Optional[str] = None
    name: str
    type: str
    auto_categorization_rules: List[str] = []
    is_default: bool
    created_at: str
    updated_at: str

# ============= Transaction Models =============
class TransactionInput(BaseModel):
    entity_id: str
    account_id: Optional[str] = None
    category_id: Optional[str] = None
    type: str = Field(..., pattern="^(income|expense|transfer)$")
    amount: float
    date: str  # YYYY-MM-DD format
    description: Optional[str] = ""
    linked_asset_id: Optional[str] = None
    linked_inventory_id: Optional[str] = None

class TransactionResponse(BaseModel):
    id: str
    entity_id: str
    account_id: Optional[str] = None
    category_id: Optional[str] = None
    type: str
    amount: float
    date: str
    description: Optional[str] = ""
    linked_asset_id: Optional[str] = None
    linked_inventory_id: Optional[str] = None
    ai_tags: List[str] = []
    created_at: str
    updated_at: str

# ============= Recurring Transaction Models =============
class RecurringTransactionInput(BaseModel):
    entity_id: str
    account_id: Optional[str] = None
    category_id: Optional[str] = None
    name: str
    type: str = Field(..., pattern="^(income|expense)$")
    amount: float
    frequency: str  # weekly, biweekly, monthly, quarterly, yearly
    next_date: str

class RecurringTransactionResponse(BaseModel):
    id: str
    entity_id: str
    account_id: Optional[str] = None
    category_id: Optional[str] = None
    name: str
    type: str
    amount: float
    frequency: str
    next_date: str
    is_active: bool = True
    created_at: str
    updated_at: str

# ============= Budget Models =============
class CategoryBudget(BaseModel):
    category_id: str
    planned_amount: float
    reasoning: Optional[str] = ""
    priority: Optional[str] = "medium"

class BudgetInput(BaseModel):
    entity_id: str
    month: str  # YYYY-MM format
    category_budgets: List[CategoryBudget] = []
    total_planned: float = 0.0

class BudgetResponse(BaseModel):
    id: str
    entity_id: str
    month: str
    category_budgets: List[CategoryBudget] = []
    total_planned: float
    created_at: str
    updated_at: str

# ============= Debt Models =============
class DebtInput(BaseModel):
    entity_id: str
    account_id: Optional[str] = None
    name: str
    type: str  # loan, credit_card, line_of_credit, other
    original_amount: float
    current_balance: float
    interest_rate: Optional[float] = None
    minimum_payment: Optional[float] = None
    payment_frequency: str = "monthly"
    next_payment_date: Optional[str] = None

class DebtResponse(BaseModel):
    id: str
    entity_id: str
    account_id: Optional[str] = None
    name: str
    type: str
    original_amount: float
    current_balance: float
    interest_rate: Optional[float] = None
    minimum_payment: Optional[float] = None
    payment_frequency: str
    next_payment_date: Optional[str] = None
    is_active: bool = True
    created_at: str
    updated_at: str

# ============= Investment Models =============
class InvestmentVehicleInput(BaseModel):
    entity_id: str
    name: str
    type: str  # 401k, ira, roth_ira, brokerage, crypto, other
    provider: Optional[str] = ""

class InvestmentVehicleResponse(BaseModel):
    id: str
    entity_id: str
    name: str
    type: str
    provider: Optional[str] = ""
    is_active: bool = True
    created_at: str
    updated_at: str

class InvestmentHoldingInput(BaseModel):
    vehicle_id: str
    asset_name: str
    asset_class: str  # stocks, bonds, real_estate, crypto, commodities, cash
    quantity: float
    cost_basis: float
    current_price: Optional[float] = None
    benchmark_symbol: Optional[str] = None

class InvestmentHoldingResponse(BaseModel):
    id: str
    vehicle_id: str
    asset_name: str
    asset_class: str
    quantity: float
    cost_basis: float
    current_price: Optional[float] = None
    benchmark_symbol: Optional[str] = None
    last_updated: Optional[str] = None
    created_at: str
    updated_at: str

# ============= Asset Models =============
class AssetInput(BaseModel):
    entity_id: str
    name: str
    type: str  # property, vehicle, equipment, furniture, technology, intellectual_property, other
    description: Optional[str] = ""
    purchase_date: Optional[str] = None
    purchase_price: Optional[float] = None
    current_value: Optional[float] = None
    depreciation_method: str = "none"  # straight_line, declining_balance, none
    useful_life_years: Optional[int] = None
    salvage_value: Optional[float] = None
    location: Optional[str] = ""
    serial_number: Optional[str] = ""
    vendor: Optional[str] = ""
    warranty_expiration: Optional[str] = None
    maintenance_schedule: Optional[str] = ""

class AssetResponse(BaseModel):
    id: str
    entity_id: str
    name: str
    type: str
    description: Optional[str] = ""
    purchase_date: Optional[str] = None
    purchase_price: Optional[float] = None
    current_value: Optional[float] = None
    depreciation_method: str
    useful_life_years: Optional[int] = None
    salvage_value: Optional[float] = None
    location: Optional[str] = ""
    serial_number: Optional[str] = ""
    vendor: Optional[str] = ""
    warranty_expiration: Optional[str] = None
    maintenance_schedule: Optional[str] = ""
    is_active: bool = True
    created_at: str
    updated_at: str

# ============= Inventory Models =============
class InventoryInput(BaseModel):
    entity_id: str
    name: str
    sku: Optional[str] = ""
    quantity: int = 0
    unit_cost: Optional[float] = None
    selling_price: Optional[float] = None
    reorder_point: int = 0
    category: Optional[str] = ""
    location: Optional[str] = ""

class InventoryResponse(BaseModel):
    id: str
    entity_id: str
    name: str
    sku: Optional[str] = ""
    quantity: int
    unit_cost: Optional[float] = None
    selling_price: Optional[float] = None
    reorder_point: int
    category: Optional[str] = ""
    location: Optional[str] = ""
    is_active: bool = True
    created_at: str
    updated_at: str

# ============= Financial Goal Models =============
class FinancialGoalInput(BaseModel):
    entity_id: str
    name: str
    goal_type: str  # savings, debt_payoff, investment, retirement, emergency_fund, other
    target_amount: float
    current_amount: float = 0.0
    deadline: Optional[str] = None
    monthly_contribution: float = 0.0
    priority: str = "medium"  # low, medium, high
    notes: Optional[str] = ""

class FinancialGoalResponse(BaseModel):
    id: str
    entity_id: str
    name: str
    goal_type: str
    target_amount: float
    current_amount: float
    deadline: Optional[str] = None
    monthly_contribution: float
    priority: str
    status: str = "active"  # active, paused, completed
    notes: Optional[str] = ""
    ai_recommendations: List[str] = []
    created_at: str
    updated_at: str

class GoalStatusUpdate(BaseModel):
    status: str = Field(..., pattern="^(active|paused|completed)$")

# ============= Settings Models =============
class SystemSettingsUpdate(BaseModel):
    ai_enabled: Optional[bool] = None
    default_llm_provider: Optional[str] = None
    default_model: Optional[str] = None

class SystemSettingsResponse(BaseModel):
    ai_enabled: bool
    default_llm_provider: str
    default_model: Optional[str] = None

class AIStatusResponse(BaseModel):
    system_ai_enabled: bool
    user_ai_enabled: bool
    effective_ai_enabled: bool
    llm_provider: str
    llm_model: Optional[str] = None

# ============= LLM Provider Configuration Models =============
class LLMProviderConfig(BaseModel):
    provider: str
    enabled: bool = False
    api_key: Optional[str] = None
    default_model: Optional[str] = None
    base_url: Optional[str] = None  # For Ollama custom URL

class LLMProviderConfigUpdate(BaseModel):
    enabled: Optional[bool] = None
    api_key: Optional[str] = None
    default_model: Optional[str] = None
    base_url: Optional[str] = None

class LLMProviderResponse(BaseModel):
    id: str
    name: str
    enabled: bool
    has_api_key: bool
    default_model: Optional[str] = None
    base_url: Optional[str] = None
    requires_api_key: bool
    is_local: bool

class LLMModelResponse(BaseModel):
    id: str
    name: str
    provider: Optional[str] = None

class LLMProvidersListResponse(BaseModel):
    providers: List[LLMProviderResponse]
    active_provider: str
    system_ai_enabled: bool

class AITestRequest(BaseModel):
    provider: str
    prompt: Optional[str] = "Say 'Hello, AI is working!' and nothing else."

class AITestResponse(BaseModel):
    success: bool
    provider: str
    response: Optional[str] = None
    error: Optional[str] = None
    message: str

class AIChatRequest(BaseModel):
    message: str
    context: Optional[str] = None  # Additional context like transaction data
    feature: str = "general"  # general, insights, categorization, budgeting
