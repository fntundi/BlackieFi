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
class BusinessEntityDetailsInput(BaseModel):
    legal_name: Optional[str] = None
    dba_name: Optional[str] = None
    ein: Optional[str] = None
    entity_structure: Optional[str] = None
    formation_state: Optional[str] = None
    formation_date: Optional[str] = None
    registered_agent_name: Optional[str] = None
    registered_agent_email: Optional[EmailStr] = None
    registered_agent_phone: Optional[str] = None
    registered_agent_address: Optional[str] = None
    principal_address: Optional[str] = None
    mailing_address: Optional[str] = None
    contact_email: Optional[EmailStr] = None
    contact_phone: Optional[str] = None
    website: Optional[str] = None
    fiscal_year_end: Optional[str] = None
    tax_filing_due_date: Optional[str] = None
    annual_report_due_date: Optional[str] = None
    renewal_date: Optional[str] = None
    accounting_method: Optional[str] = None
    payroll_provider: Optional[str] = None
    tax_elections: List[str] = Field(default_factory=list)
    associated_accounts: List[str] = Field(default_factory=list)
    owners: List[str] = Field(default_factory=list)
    officers: List[str] = Field(default_factory=list)
    licenses: List[str] = Field(default_factory=list)
    notes: Optional[str] = None

class PersonalEntityDetailsInput(BaseModel):
    legal_name: Optional[str] = None
    preferred_name: Optional[str] = None
    date_of_birth: Optional[str] = None
    ssn_last4: Optional[str] = None
    filing_status: Optional[str] = None
    dependents: List[str] = Field(default_factory=list)
    tax_filing_due_date: Optional[str] = None
    primary_address: Optional[str] = None
    residency_state: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[EmailStr] = None
    employment_status: Optional[str] = None
    employer_name: Optional[str] = None
    income_sources: List[str] = Field(default_factory=list)
    assets: List[str] = Field(default_factory=list)
    liabilities: List[str] = Field(default_factory=list)
    risk_tolerance: Optional[str] = None
    retirement_accounts: List[str] = Field(default_factory=list)
    notes: Optional[str] = None

class EntityInput(BaseModel):
    name: str
    type: str = Field(..., pattern="^(personal|business)$")
    business_details: Optional[BusinessEntityDetailsInput] = None
    personal_details: Optional[PersonalEntityDetailsInput] = None

class EntityResponse(BaseModel):
    id: str
    owner_id: str
    name: str
    type: str
    created_at: str
    updated_at: str

class EntityDetailsResponse(BaseModel):
    entity: EntityResponse
    business_details: Optional[BusinessEntityDetailsInput] = None
    personal_details: Optional[PersonalEntityDetailsInput] = None

class EntityDetailsUpdateInput(BaseModel):
    business_details: Optional[BusinessEntityDetailsInput] = None
    personal_details: Optional[PersonalEntityDetailsInput] = None

class EntityDocumentResponse(BaseModel):
    id: str
    entity_id: str
    owner_id: str
    document_type: str
    title: str
    original_filename: str
    content_type: str
    size: int
    storage_path: str
    uploaded_at: str
    notes: Optional[str] = None
    tags: List[str] = Field(default_factory=list)

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

# ============= Bill Models =============
class BillPayment(BaseModel):
    date: str
    amount: float
    transaction_id: Optional[str] = None

class BillInput(BaseModel):
    entity_id: str
    name: str
    payee: Optional[str] = ""
    typical_amount: float
    frequency: str = "monthly"  # monthly, quarterly, yearly
    due_date: str
    reminder_days: int = 7
    category_id: Optional[str] = None
    auto_detected: bool = False

class BillResponse(BaseModel):
    id: str
    entity_id: str
    name: str
    payee: Optional[str] = ""
    typical_amount: float
    frequency: str
    due_date: str
    reminder_days: int
    category_id: Optional[str] = None
    status: str = "pending"  # pending, upcoming, overdue, paid
    auto_detected: bool
    last_paid_date: Optional[str] = None
    last_paid_amount: Optional[float] = None
    payment_history: List[BillPayment] = []
    created_at: str
    updated_at: str

# ============= Import Batch Models =============
class ImportBatchInput(BaseModel):
    entity_id: str
    account_id: str
    file_name: str
    file_url: str
    file_type: str  # csv, pdf

class ImportBatchResponse(BaseModel):
    id: str
    entity_id: str
    account_id: str
    file_name: str
    file_url: str
    file_type: str
    status: str = "processing"  # processing, completed, failed
    transactions_imported: int = 0
    error_message: Optional[str] = None
    created_date: str
    updated_at: str

# ============= Report Models =============
class ReportFilterPresetInput(BaseModel):
    name: str
    report_type: str
    filters: dict

class ReportFilterPresetResponse(BaseModel):
    id: str
    user_id: str
    name: str
    report_type: str
    filters: dict
    created_at: str

class GenerateReportInput(BaseModel):
    report_type: str  # profit_loss, balance_sheet, cash_flow, budget_vs_actual
    entity_id: str
    start_date: str
    end_date: str
    category_id: Optional[str] = None

# ============= Tax Models =============
class TaxScenarioInput(BaseModel):
    entity_id: str
    name: str
    tax_year: int
    filing_status: str  # single, married_filing_jointly, married_filing_separately, head_of_household
    total_income: float
    total_deductions: float
    estimated_tax_liability: float
    effective_tax_rate: float
    potential_deductions: List[dict] = []
    potential_credits: List[dict] = []
    recommendations: List[str] = []
    scenario_adjustments: Optional[dict] = None
    is_baseline: bool = False

class TaxScenarioResponse(BaseModel):
    id: str
    entity_id: str
    name: str
    tax_year: int
    filing_status: str
    total_income: float
    total_deductions: float
    estimated_tax_liability: float
    effective_tax_rate: float
    potential_deductions: List[dict] = []
    potential_credits: List[dict] = []
    recommendations: List[str] = []
    scenario_adjustments: Optional[dict] = None
    is_baseline: bool
    created_at: str
    updated_at: str

# ============= Group Models =============
class GroupInput(BaseModel):
    name: str
    description: Optional[str] = ""

class GroupResponse(BaseModel):
    id: str
    name: str
    description: Optional[str] = ""
    is_active: bool = True
    created_at: str
    updated_at: str

class GroupMemberInput(BaseModel):
    group_id: str
    user_email: str
    role: str = "member"  # member, admin

class GroupMemberResponse(BaseModel):
    id: str
    group_id: str
    user_email: str
    role: str
    created_at: str

class GroupEntityAccessInput(BaseModel):
    group_id: str
    entity_id: str
    access_level: str = "read"  # read, write

class GroupEntityAccessResponse(BaseModel):
    id: str
    group_id: str
    entity_id: str
    access_level: str
    created_at: str

# ============= Financial Profile Models =============
class FinancialGoalProfile(BaseModel):
    goal: str
    target_amount: Optional[float] = None
    timeline_years: Optional[int] = None

class FinancialProfileInput(BaseModel):
    entity_id: str
    risk_tolerance: str = "moderate"  # conservative, moderate, aggressive
    investment_experience: str = "beginner"  # beginner, intermediate, advanced
    age: Optional[int] = None
    annual_income: Optional[float] = None
    time_horizon: int = 10
    liquidity_needs: str = "medium"  # low, medium, high
    financial_goals: List[FinancialGoalProfile] = []

class FinancialProfileResponse(BaseModel):
    id: str
    entity_id: str
    risk_tolerance: str
    investment_experience: str
    age: Optional[int] = None
    annual_income: Optional[float] = None
    time_horizon: int
    liquidity_needs: str
    financial_goals: List[FinancialGoalProfile] = []
    created_at: str
    updated_at: str

# ============= AI Feature Models =============
class DetectAnomaliesInput(BaseModel):
    entity_id: str

class ForecastCashFlowInput(BaseModel):
    entity_id: str
    forecast_months: int = 3

class IdentifyCostSavingsInput(BaseModel):
    entity_id: str

class GenerateBudgetInput(BaseModel):
    entity_id: str
    month: str

class CategorizeTransactionInput(BaseModel):
    transaction_id: str
    entity_id: str

class GenerateTagsInput(BaseModel):
    transaction_id: str

class GenerateGoalRecommendationsInput(BaseModel):
    goal_id: str

class EstimateTaxInput(BaseModel):
    entity_id: str
    tax_year: int
    filing_status: str

class AnalyzeTaxScenarioInput(BaseModel):
    baseline_scenario_id: str
    adjustments: dict
