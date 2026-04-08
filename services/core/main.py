"""
BlackieFi Core Service - Port 8002
Handles: health, dashboard, categories, roles, calendar, onboarding, AI, RAG, notifications, currency, data
"""
import sys, os
sys.path.insert(0, '/app/services')

from fastapi import FastAPI, APIRouter, HTTPException, Depends, Query, UploadFile, File, WebSocket, WebSocketDisconnect
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.responses import StreamingResponse
from shared.database import get_mongo_db
from shared.config import settings
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import datetime, timezone, timedelta
import uuid, jwt, logging, json, csv, io, base64, httpx, asyncio

app = FastAPI(title="BlackieFi Core Service", version="3.0.0")
router = APIRouter()
security = HTTPBearer()
logger = logging.getLogger(__name__)

OLLAMA_HOST = os.environ.get("OLLAMA_HOST", "ollama")
OLLAMA_PORT = os.environ.get("OLLAMA_PORT", "11434")
OLLAMA_MODEL = os.environ.get("OLLAMA_MODEL", "phi")
OLLAMA_URL = f"http://{OLLAMA_HOST}:{OLLAMA_PORT}"

EXCHANGE_RATES = {
    "USD": 1.0, "EUR": 0.92, "GBP": 0.79, "JPY": 149.50, "CAD": 1.36,
    "AUD": 1.53, "CHF": 0.88, "CNY": 7.24, "INR": 83.12, "MXN": 17.15,
    "BRL": 4.97, "KRW": 1320.0, "SGD": 1.34, "HKD": 7.82, "NOK": 10.55,
    "SEK": 10.42, "DKK": 6.87, "NZD": 1.64, "ZAR": 18.63, "TRY": 30.25,
    "RUB": 89.50, "PLN": 4.02, "THB": 35.20, "IDR": 15450.0, "PHP": 55.80,
    "CZK": 22.85, "ILS": 3.65, "CLP": 880.0, "AED": 3.67, "SAR": 3.75,
    "NGN": 780.0, "EGP": 30.90, "BTC": 0.000016, "ETH": 0.00032,
}

# ---- Models ----
class HealthCheck(BaseModel):
    status: str = "healthy"; service: str = "core"; version: str = "3.0.0"

class AIChatRequest(BaseModel):
    message: str; context: Optional[str] = None

class AISettingsUpdate(BaseModel):
    ai_enabled: bool = False; ollama_model: str = "phi"

class CurrencySettingsUpdate(BaseModel):
    base_currency: str = "USD"; display_currencies: List[str] = ["USD","EUR","GBP"]

class RAGQueryRequest(BaseModel):
    question: str

class CategoryCreate(BaseModel):
    name: str; color: str = "#64748b"

class CalendarEventCreate(BaseModel):
    title: str; date: str; event_type: str = "custom"; color: Optional[str] = "#3b82f6"
    amount: Optional[float] = None; description: Optional[str] = None

class NotificationCreate(BaseModel):
    title: str; message: str; notification_type: str = "info"; link: Optional[str] = None

# ---- Helpers ----
def now_str():
    return datetime.now(timezone.utc).isoformat()

def new_id():
    return str(uuid.uuid4())

def decode_token(token: str):
    return jwt.decode(token, settings.jwt_secret, algorithms=[settings.jwt_algorithm])

async def get_current_user_id(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        return decode_token(credentials.credentials)["sub"]
    except Exception:
        raise HTTPException(401, "Invalid token")

async def _ollama_available():
    try:
        async with httpx.AsyncClient(timeout=3) as c:
            r = await c.get(f"{OLLAMA_URL}/api/tags")
            return r.status_code == 200
    except Exception:
        return False

async def _ollama_generate(prompt, model=None):
    model = model or OLLAMA_MODEL
    try:
        async with httpx.AsyncClient(timeout=60) as c:
            r = await c.post(f"{OLLAMA_URL}/api/generate", json={"model": model, "prompt": prompt, "stream": False})
            if r.status_code == 200:
                return r.json().get("response", "")
    except Exception as e:
        logger.warning(f"Ollama error: {e}")
    return None

# ---- WebSocket Manager ----
class ConnectionManager:
    def __init__(self):
        self.active: Dict[str, list] = {}

    async def connect(self, websocket: WebSocket, user_id: str):
        await websocket.accept()
        self.active.setdefault(user_id, []).append(websocket)

    def disconnect(self, websocket: WebSocket, user_id: str):
        if user_id in self.active:
            self.active[user_id] = [ws for ws in self.active[user_id] if ws != websocket]

    async def send_to_user(self, user_id: str, message: dict):
        for ws in self.active.get(user_id, []):
            try:
                await ws.send_json(message)
            except Exception:
                pass

ws_manager = ConnectionManager()

async def _create_notification(db, user_id, title, message, ntype="info", link=None):
    nid = new_id()
    doc = {"id": nid, "user_id": user_id, "title": title, "message": message,
           "notification_type": ntype, "link": link, "read": False, "created_at": now_str()}
    await db.notifications.insert_one(doc)
    await ws_manager.send_to_user(user_id, {"type": "notification", "data": {k: v for k, v in doc.items() if k != "_id"}})
    return nid

# ---- Health / Root ----
@router.get("/health", response_model=HealthCheck)
async def health():
    return HealthCheck()

@router.get("/")
async def root():
    return {"service": "BlackieFi Core", "version": "3.0.0", "status": "healthy"}

# ---- AI Routes ----
ai_router = APIRouter(prefix="/ai", tags=["ai"])

@ai_router.get("/settings")
async def get_ai_settings(user_id: str = Depends(get_current_user_id)):
    db = await get_mongo_db()
    s = await db.user_settings.find_one({"user_id": user_id}, {"_id": 0})
    return {
        "ai_enabled": s.get("ai_enabled", False) if s else False,
        "ai_model": s.get("ai_model", OLLAMA_MODEL) if s else OLLAMA_MODEL,
        "ai_available": await _ollama_available()
    }

@ai_router.put("/settings")
async def update_ai_settings(data: AISettingsUpdate, user_id: str = Depends(get_current_user_id)):
    db = await get_mongo_db()
    await db.user_settings.update_one(
        {"user_id": user_id},
        {"$set": {"ai_enabled": data.ai_enabled, "ai_model": data.ollama_model, "updated_at": now_str()}},
        upsert=True
    )
    return {"status": "ok"}

@ai_router.post("/chat")
async def ai_chat(req: AIChatRequest, user_id: str = Depends(get_current_user_id)):
    db = await get_mongo_db()
    s = await db.user_settings.find_one({"user_id": user_id}, {"_id": 0})
    if not s or not s.get("ai_enabled"):
        raise HTTPException(400, "AI features are disabled. Enable in Settings.")
    if not await _ollama_available():
        raise HTTPException(503, "AI service unavailable")
    prompt = f"You are BlackieFi AI, a helpful financial assistant. Be concise.\nUser: {req.message}\nRespond:"
    response = await _ollama_generate(prompt, s.get("ai_model"))
    if not response:
        raise HTTPException(503, "AI generation failed")
    mid = new_id()
    await db.ai_messages.insert_one({"id": mid, "user_id": user_id, "role": "user", "content": req.message, "created_at": now_str()})
    await db.ai_messages.insert_one({"id": new_id(), "user_id": user_id, "role": "assistant", "content": response, "created_at": now_str()})
    return {"response": response, "message_id": mid}

@ai_router.get("/history")
async def ai_history(limit: int = 50, user_id: str = Depends(get_current_user_id)):
    db = await get_mongo_db()
    msgs = await db.ai_messages.find({"user_id": user_id}, {"_id": 0}).sort("created_at", -1).to_list(limit)
    return list(reversed(msgs))

@ai_router.post("/insights")
async def ai_insights(user_id: str = Depends(get_current_user_id)):
    db = await get_mongo_db()
    s = await db.user_settings.find_one({"user_id": user_id}, {"_id": 0})
    if not s or not s.get("ai_enabled"):
        raise HTTPException(400, "AI features are disabled")
    if not await _ollama_available():
        raise HTTPException(503, "AI service unavailable")
    prompt = "Analyze financial data and provide 3-5 actionable insights."
    response = await _ollama_generate(prompt)
    return {"insights": response or "No insights available", "generated_at": now_str()}

@ai_router.post("/categorize")
async def ai_categorize(description: str = Query(...), amount: float = Query(0), user_id: str = Depends(get_current_user_id)):
    if not await _ollama_available():
        return {"category": "Other", "confidence": 0, "ai_available": False}
    prompt = f'Categorize: "{description}" ${amount}. Respond with ONLY the category name.'
    response = await _ollama_generate(prompt)
    return {"category": (response or "Other").strip().split("\\n")[0], "confidence": 0.8 if response else 0, "ai_available": True}

# ---- Notification Routes ----
notif_router = APIRouter(prefix="/notifications", tags=["notifications"])

@notif_router.get("/")
async def list_notifications(unread_only: bool = False, limit: int = 50, user_id: str = Depends(get_current_user_id)):
    db = await get_mongo_db()
    q = {"user_id": user_id}
    if unread_only:
        q["read"] = False
    return await db.notifications.find(q, {"_id": 0}).sort("created_at", -1).to_list(limit)

@notif_router.get("/unread-count")
async def unread_count(user_id: str = Depends(get_current_user_id)):
    db = await get_mongo_db()
    return {"count": await db.notifications.count_documents({"user_id": user_id, "read": False})}

@notif_router.put("/{nid}/read")
async def mark_read(nid: str, user_id: str = Depends(get_current_user_id)):
    db = await get_mongo_db()
    await db.notifications.update_one({"id": nid, "user_id": user_id}, {"$set": {"read": True}})
    return {"status": "ok"}

@notif_router.put("/read-all")
async def mark_all_read(user_id: str = Depends(get_current_user_id)):
    db = await get_mongo_db()
    await db.notifications.update_many({"user_id": user_id, "read": False}, {"$set": {"read": True}})
    return {"status": "ok"}

@notif_router.delete("/{nid}")
async def delete_notification(nid: str, user_id: str = Depends(get_current_user_id)):
    db = await get_mongo_db()
    await db.notifications.delete_one({"id": nid, "user_id": user_id})
    return {"status": "ok"}

@notif_router.get("/upcoming")
async def upcoming_reminders(days: int = 7, user_id: str = Depends(get_current_user_id)):
    db = await get_mongo_db()
    eus = await db.entity_users.find({"user_id": user_id, "is_active": True}, {"_id": 0}).to_list(100)
    upcoming = []
    for eu in eus:
        debts = await db.debts.find({"entity_id": eu["entity_id"]}, {"_id": 0}).to_list(100)
        for d in debts:
            upcoming.append({"type": "debt_payment", "name": d["name"], "amount": d.get("min_payment", 0), "entity_id": eu["entity_id"]})
    return upcoming

# ---- Currency Routes ----
curr_router = APIRouter(prefix="/currency", tags=["currency"])

@curr_router.get("/rates")
async def get_rates():
    return {"base": "USD", "rates": EXCHANGE_RATES, "currencies": list(EXCHANGE_RATES.keys())}

@curr_router.get("/convert")
async def convert(amount: float = Query(...), from_currency: str = Query("USD"), to_currency: str = Query("EUR")):
    fr, to = EXCHANGE_RATES.get(from_currency.upper()), EXCHANGE_RATES.get(to_currency.upper())
    if not fr or not to:
        raise HTTPException(400, "Unsupported currency")
    return {"amount": amount, "from": from_currency.upper(), "to": to_currency.upper(),
            "result": round(amount / fr * to, 4), "rate": round(to / fr, 6)}

@curr_router.get("/settings")
async def get_currency_settings(user_id: str = Depends(get_current_user_id)):
    db = await get_mongo_db()
    s = await db.user_settings.find_one({"user_id": user_id}, {"_id": 0})
    return {
        "base_currency": s.get("base_currency", "USD") if s else "USD",
        "display_currencies": s.get("display_currencies", ["USD","EUR","GBP"]) if s else ["USD","EUR","GBP"],
        "supported": list(EXCHANGE_RATES.keys()),
    }

@curr_router.put("/settings")
async def update_currency_settings(data: CurrencySettingsUpdate, user_id: str = Depends(get_current_user_id)):
    db = await get_mongo_db()
    await db.user_settings.update_one(
        {"user_id": user_id},
        {"$set": {"base_currency": data.base_currency, "display_currencies": data.display_currencies, "updated_at": now_str()}},
        upsert=True
    )
    return {"status": "ok"}

# ---- Data Import/Export Routes ----
data_router = APIRouter(prefix="/data", tags=["data"])

@data_router.get("/export/{data_type}")
async def export_data(data_type: str, fmt: str = Query("csv"), user_id: str = Depends(get_current_user_id)):
    db = await get_mongo_db()
    eus = await db.entity_users.find({"user_id": user_id, "is_active": True}, {"_id": 0}).to_list(1)
    if not eus:
        raise HTTPException(400, "No active entity")
    entity_id = eus[0]["entity_id"]
    coll_map = {"transactions": "transactions", "expenses": "expenses", "income": "income_sources",
                "debts": "debts", "accounts": "accounts"}
    if data_type not in coll_map:
        raise HTTPException(400, f"Invalid data type")
    docs = await db[coll_map[data_type]].find({"entity_id": entity_id}, {"_id": 0}).to_list(10000)
    if not docs:
        raise HTTPException(404, "No data found")
    if fmt == "json":
        return StreamingResponse(io.BytesIO(json.dumps(docs, indent=2, default=str).encode()),
                                 media_type="application/json",
                                 headers={"Content-Disposition": f"attachment; filename={data_type}.json"})
    output = io.StringIO()
    writer = csv.DictWriter(output, fieldnames=list(docs[0].keys()))
    writer.writeheader()
    for doc in docs:
        writer.writerow({k: str(v) if not isinstance(v, (str, int, float, bool)) else v for k, v in doc.items()})
    return StreamingResponse(io.BytesIO(output.getvalue().encode()), media_type="text/csv",
                             headers={"Content-Disposition": f"attachment; filename={data_type}.csv"})

@data_router.post("/import/csv")
async def import_csv(file: UploadFile = File(...), data_type: str = Query("transactions"), user_id: str = Depends(get_current_user_id)):
    db = await get_mongo_db()
    eus = await db.entity_users.find({"user_id": user_id, "is_active": True}, {"_id": 0}).to_list(1)
    if not eus:
        raise HTTPException(400, "No active entity")
    entity_id = eus[0]["entity_id"]
    content = await file.read()
    try:
        text = content.decode("utf-8")
    except UnicodeDecodeError:
        text = content.decode("latin-1")
    reader = csv.DictReader(io.StringIO(text))
    rows = list(reader)
    imported, errors = 0, []
    for i, row in enumerate(rows):
        try:
            doc = {"id": new_id(), "entity_id": entity_id, "created_at": now_str(),
                   "amount": float(row.get("amount", row.get("Amount", 0)))}
            if data_type == "transactions":
                doc.update({"type": row.get("type", "expense"), "category": row.get("category", "Other"),
                           "description": row.get("description", ""), "date": row.get("date", now_str())})
                await db.transactions.insert_one(doc)
            elif data_type == "expenses":
                doc.update({"name": row.get("name", "Imported"), "category": row.get("category", "Other"),
                           "frequency": row.get("frequency", "monthly"), "is_recurring": True, "next_date": now_str()})
                await db.expenses.insert_one(doc)
            elif data_type == "income":
                doc.update({"name": row.get("name", "Imported"), "type": row.get("type", "salary"),
                           "frequency": row.get("frequency", "monthly"), "is_active": True, "next_date": now_str()})
                await db.income_sources.insert_one(doc)
            imported += 1
        except Exception as e:
            errors.append(f"Row {i+1}: {e}")
    return {"imported": imported, "errors": errors, "total_rows": len(rows)}

@data_router.get("/export-all")
async def export_all(fmt: str = Query("json"), user_id: str = Depends(get_current_user_id)):
    db = await get_mongo_db()
    eus = await db.entity_users.find({"user_id": user_id, "is_active": True}, {"_id": 0}).to_list(1)
    if not eus:
        raise HTTPException(400, "No active entity")
    eid = eus[0]["entity_id"]
    data = {}
    for k, c in {"transactions": "transactions", "expenses": "expenses", "income": "income_sources", "debts": "debts", "accounts": "accounts"}.items():
        data[k] = await db[c].find({"entity_id": eid}, {"_id": 0}).to_list(10000)
    return StreamingResponse(io.BytesIO(json.dumps(data, indent=2, default=str).encode()),
                             media_type="application/json",
                             headers={"Content-Disposition": "attachment; filename=blackiefi_full_export.json"})

# ---- RAG Routes ----
rag_router = APIRouter(prefix="/rag", tags=["rag"])

@rag_router.get("/status")
async def rag_status(user_id: str = Depends(get_current_user_id)):
    db = await get_mongo_db()
    docs = await db.rag_documents.count_documents({"user_id": user_id})
    return {"available": False, "documents_count": docs}

@rag_router.post("/upload")
async def rag_upload(file: UploadFile = File(...), user_id: str = Depends(get_current_user_id)):
    db = await get_mongo_db()
    content = await file.read()
    try:
        text = content.decode("utf-8")
    except UnicodeDecodeError:
        text = content.decode("latin-1")
    doc_id = new_id()
    chunks = [text[i:i+1000] for i in range(0, len(text), 800)]
    await db.rag_documents.insert_one({
        "id": doc_id, "user_id": user_id, "filename": file.filename,
        "chunk_count": len(chunks), "content_preview": text[:500],
        "status": "indexed_local", "created_at": now_str()
    })
    for i, chunk in enumerate(chunks):
        await db.rag_chunks.insert_one({
            "id": new_id(), "document_id": doc_id, "user_id": user_id,
            "chunk_index": i, "content": chunk, "created_at": now_str()
        })
    return {"id": doc_id, "filename": file.filename, "chunks": len(chunks), "status": "indexed"}

@rag_router.get("/documents")
async def rag_list_documents(user_id: str = Depends(get_current_user_id)):
    db = await get_mongo_db()
    return await db.rag_documents.find({"user_id": user_id}, {"_id": 0}).sort("created_at", -1).to_list(100)

@rag_router.delete("/documents/{doc_id}")
async def rag_delete_document(doc_id: str, user_id: str = Depends(get_current_user_id)):
    db = await get_mongo_db()
    await db.rag_documents.delete_one({"id": doc_id, "user_id": user_id})
    await db.rag_chunks.delete_many({"document_id": doc_id, "user_id": user_id})
    return {"status": "ok"}

@rag_router.post("/query")
async def rag_query(req: RAGQueryRequest, user_id: str = Depends(get_current_user_id)):
    db = await get_mongo_db()
    s = await db.user_settings.find_one({"user_id": user_id}, {"_id": 0})
    if not s or not s.get("ai_enabled"):
        raise HTTPException(400, "AI features are disabled")
    chunks = await db.rag_chunks.find({"user_id": user_id}, {"_id": 0, "content": 1}).to_list(20)
    if not chunks:
        return {"answer": "No documents uploaded yet.", "sources": []}
    context = "\n---\n".join([c["content"] for c in chunks[:5]])
    response = await _ollama_generate(f"Based on docs:\n{context}\nQ: {req.question}\nAnswer:")
    return {"answer": response or "AI service unavailable", "sources": [c["content"][:200] for c in chunks[:3]]}

# ---- Categories Routes ----
cat_router = APIRouter(prefix="/categories", tags=["categories"])

@cat_router.get("/")
async def list_categories(entity_id: Optional[str] = Query(None), user_id: str = Depends(get_current_user_id)):
    db = await get_mongo_db()
    q = {"$or": [{"entity_id": entity_id}, {"is_default": True}]} if entity_id else {"is_default": True}
    return await db.categories.find(q, {"_id": 0}).to_list(200)

@cat_router.post("/", status_code=201)
async def create_category(data: CategoryCreate, entity_id: Optional[str] = Query(None), user_id: str = Depends(get_current_user_id)):
    db = await get_mongo_db()
    cid = new_id()
    await db.categories.insert_one({"id": cid, "name": data.name, "color": data.color, "entity_id": entity_id, "is_default": False, "created_at": now_str()})
    return {"id": cid, "name": data.name, "color": data.color, "is_default": False}

@cat_router.delete("/{cid}")
async def delete_category(cid: str, user_id: str = Depends(get_current_user_id)):
    db = await get_mongo_db()
    cat = await db.categories.find_one({"id": cid}, {"_id": 0})
    if cat and cat.get("is_default"):
        raise HTTPException(400, "Cannot delete default category")
    await db.categories.delete_one({"id": cid})
    return {"status": "ok"}

# ---- Roles Routes ----
roles_router = APIRouter(prefix="/roles", tags=["roles"])

@roles_router.get("/")
async def list_roles(user_id: str = Depends(get_current_user_id)):
    db = await get_mongo_db()
    return await db.roles.find({}, {"_id": 0}).to_list(50)

# ---- Calendar Routes ----
cal_router = APIRouter(prefix="/calendar", tags=["calendar"])

@cal_router.get("/events")
async def get_events(year: int = Query(None), month: int = Query(None), entity_id: Optional[str] = Query(None), user_id: str = Depends(get_current_user_id)):
    db = await get_mongo_db()
    events = []
    if entity_id:
        custom = await db.calendar_events.find({"entity_id": entity_id}, {"_id": 0}).to_list(500)
        events.extend(custom)
        expenses = await db.expenses.find({"entity_id": entity_id, "is_recurring": True}, {"_id": 0}).to_list(100)
        for exp in expenses:
            events.append({"id": f"exp_{exp['id']}", "title": exp["name"], "date": exp.get("next_date", ""),
                          "event_type": "expense", "color": "#ef4444", "amount": exp["amount"]})
        incomes = await db.income_sources.find({"entity_id": entity_id, "is_active": True}, {"_id": 0}).to_list(100)
        for inc in incomes:
            events.append({"id": f"inc_{inc['id']}", "title": inc["name"], "date": inc.get("next_date", ""),
                          "event_type": "income", "color": "#22c55e", "amount": inc["amount"]})
    return events

@cal_router.post("/events", status_code=201)
async def create_event(data: CalendarEventCreate, entity_id: Optional[str] = Query(None), user_id: str = Depends(get_current_user_id)):
    db = await get_mongo_db()
    eid = new_id()
    await db.calendar_events.insert_one({
        "id": eid, "entity_id": entity_id, "title": data.title, "date": data.date,
        "event_type": data.event_type, "color": data.color, "amount": data.amount,
        "description": data.description, "created_at": now_str()
    })
    return {"id": eid, "title": data.title}

@cal_router.delete("/events/{event_id}")
async def delete_event(event_id: str, user_id: str = Depends(get_current_user_id)):
    db = await get_mongo_db()
    await db.calendar_events.delete_one({"id": event_id})
    return {"status": "ok"}

# ---- Onboarding ----
onboarding_router = APIRouter(prefix="/onboarding", tags=["onboarding"])

@onboarding_router.post("/complete")
async def complete_onboarding(user_id: str = Depends(get_current_user_id)):
    db = await get_mongo_db()
    await db.users.update_one({"id": user_id}, {"$set": {"onboarding_complete": True}})
    return {"status": "ok"}

# ---- Dashboard ----
dash_router = APIRouter(prefix="/dashboard", tags=["dashboard"])

@dash_router.get("/unified")
async def unified_dashboard(user_id: str = Depends(get_current_user_id)):
    db = await get_mongo_db()
    eus = await db.entity_users.find({"user_id": user_id, "is_active": True}, {"_id": 0}).to_list(100)
    total_balance = total_debt = total_investments = 0
    for eu in eus:
        eid = eu["entity_id"]
        accounts = await db.accounts.find({"entity_id": eid}, {"_id": 0}).to_list(100)
        total_balance += sum(a.get("balance", 0) for a in accounts)
        debts = await db.debts.find({"entity_id": eid}, {"_id": 0}).to_list(100)
        total_debt += sum(d.get("current_balance", 0) for d in debts)
        vehicles = await db.investment_vehicles.find({"entity_id": eid}, {"_id": 0}).to_list(100)
        total_investments += sum(v.get("current_value", 0) for v in vehicles)
    return {"total_balance": total_balance, "total_debt": total_debt, "total_investments": total_investments,
            "net_worth": total_balance - total_debt + total_investments}

# ---- WebSocket ----
@app.websocket("/ws/notifications")
async def ws_notifications(websocket: WebSocket, token: str = Query(None)):
    if not token:
        await websocket.close(code=4001)
        return
    try:
        payload = decode_token(token)
        user_id = payload["sub"]
    except Exception:
        await websocket.close(code=4001)
        return
    await ws_manager.connect(websocket, user_id)
    try:
        while True:
            data = await websocket.receive_text()
            if data == "ping":
                await websocket.send_text("pong")
    except WebSocketDisconnect:
        ws_manager.disconnect(websocket, user_id)


# ---- App Setup ----
app.include_router(router, prefix="/api", tags=["core"])
app.include_router(ai_router, prefix="/api", tags=["ai"])
app.include_router(notif_router, prefix="/api", tags=["notifications"])
app.include_router(curr_router, prefix="/api", tags=["currency"])
app.include_router(data_router, prefix="/api", tags=["data"])
app.include_router(rag_router, prefix="/api", tags=["rag"])
app.include_router(cat_router, prefix="/api", tags=["categories"])
app.include_router(roles_router, prefix="/api", tags=["roles"])
app.include_router(cal_router, prefix="/api", tags=["calendar"])
app.include_router(onboarding_router, prefix="/api", tags=["onboarding"])
app.include_router(dash_router, prefix="/api", tags=["dashboard"])

from starlette.middleware.cors import CORSMiddleware
app.add_middleware(CORSMiddleware, allow_credentials=True, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8002)
