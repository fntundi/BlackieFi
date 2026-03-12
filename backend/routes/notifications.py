"""
Notifications routes - User notifications and alerts management
"""
from fastapi import APIRouter, HTTPException, Depends, BackgroundTasks
from typing import List
from datetime import datetime, timezone
from bson import ObjectId
from pydantic import BaseModel, EmailStr

from database import get_db
from auth import get_current_user
from services.notification_service import get_notification_service
from services.alert_service import AlertService

router = APIRouter()

class TestEmailRequest(BaseModel):
    email: EmailStr
    subject: str = "Test Email from BlackieFi"

class NotificationResponse(BaseModel):
    id: str
    category: str
    data: dict
    read: bool
    created_at: str

class MarkReadRequest(BaseModel):
    notification_ids: List[str]


@router.get("")
async def get_notifications(
    limit: int = 20,
    unread_only: bool = False,
    current_user: dict = Depends(get_current_user)
):
    """Get user notifications"""
    db = get_db()
    user_id = current_user.get("user_id")
    
    query = {"user_id": user_id}
    if unread_only:
        query["read"] = False
    
    notifications = await db.notifications.find(query).sort("created_at", -1).limit(limit).to_list(limit)
    
    return [
        {
            "id": str(n["_id"]),
            "category": n.get("category"),
            "data": n.get("data", {}),
            "read": n.get("read", False),
            "created_at": n.get("created_at")
        }
        for n in notifications
    ]


@router.get("/unread-count")
async def get_unread_count(current_user: dict = Depends(get_current_user)):
    """Get count of unread notifications"""
    db = get_db()
    user_id = current_user.get("user_id")
    
    count = await db.notifications.count_documents({"user_id": user_id, "read": False})
    return {"unread_count": count}


@router.post("/mark-read")
async def mark_notifications_read(
    request: MarkReadRequest,
    current_user: dict = Depends(get_current_user)
):
    """Mark notifications as read"""
    db = get_db()
    user_id = current_user.get("user_id")
    
    # Convert string IDs to work with MongoDB
    result = await db.notifications.update_many(
        {"_id": {"$in": request.notification_ids}, "user_id": user_id},
        {"$set": {"read": True}}
    )
    
    return {"success": True, "updated_count": result.modified_count}


@router.post("/mark-all-read")
async def mark_all_notifications_read(current_user: dict = Depends(get_current_user)):
    """Mark all notifications as read"""
    db = get_db()
    user_id = current_user.get("user_id")
    
    result = await db.notifications.update_many(
        {"user_id": user_id, "read": False},
        {"$set": {"read": True}}
    )
    
    return {"success": True, "updated_count": result.modified_count}


@router.delete("/{notification_id}")
async def delete_notification(notification_id: str, current_user: dict = Depends(get_current_user)):
    """Delete a notification"""
    db = get_db()
    user_id = current_user.get("user_id")
    
    result = await db.notifications.delete_one({"_id": notification_id, "user_id": user_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Notification not found")
    
    return {"success": True}


@router.post("/check-alerts")
async def check_alerts(
    entity_id: str,
    background_tasks: BackgroundTasks,
    current_user: dict = Depends(get_current_user)
):
    """Trigger alert checks for an entity"""
    db = get_db()
    user_id = current_user.get("user_id")
    
    alert_service = AlertService(db)
    results = await alert_service.run_all_checks(entity_id, user_id)
    
    total_alerts = (
        len(results.get("budget_alerts", [])) +
        len(results.get("bill_reminders", [])) +
        len(results.get("goal_milestones", []))
    )
    
    return {
        "success": True,
        "alerts_triggered": total_alerts,
        "details": results
    }


@router.post("/send-test-email")
async def send_test_email(request: TestEmailRequest, current_user: dict = Depends(get_current_user)):
    """Send a test email to verify email configuration"""
    notification_service = get_notification_service()
    
    html = f"""
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0A0A0A; padding: 32px; border-radius: 16px;">
        <div style="text-align: center; margin-bottom: 32px;">
            <h1 style="color: #D4AF37; font-size: 24px; margin: 0;">BlackieFi</h1>
            <p style="color: #525252; font-size: 12px; letter-spacing: 0.15em; text-transform: uppercase;">Premium Finance</p>
        </div>
        <div style="background: #0F0F0F; padding: 24px; border-radius: 12px; border: 1px solid rgba(212, 175, 55, 0.1);">
            <h2 style="color: #059669; font-size: 18px; margin: 0 0 16px;">✓ Email Configuration Working!</h2>
            <p style="color: #A3A3A3; line-height: 1.6;">This is a test email from BlackieFi. If you're receiving this, your email notifications are configured correctly.</p>
            <p style="color: #737373; font-size: 14px; margin-top: 16px;">Sent at: {datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC")}</p>
        </div>
    </div>
    """
    
    result = await notification_service.send_email(request.email, request.subject, html)
    
    if result.get("success"):
        return {"success": True, "message": f"Test email sent to {request.email}"}
    else:
        raise HTTPException(status_code=500, detail=result.get("error", "Failed to send email"))


@router.get("/preferences")
async def get_notification_preferences(current_user: dict = Depends(get_current_user)):
    """Get user notification preferences"""
    db = get_db()
    user_id = current_user.get("user_id")
    
    user = await db.users.find_one({"_id": user_id})
    
    # Default preferences
    defaults = {
        "email_notifications": True,
        "push_notifications": True,
        "budget_alerts": True,
        "budget_alert_threshold": 80,
        "bill_reminders": True,
        "bill_reminder_days": 7,
        "goal_milestones": True,
        "weekly_summary": False,
        "monthly_report": False
    }
    
    preferences = user.get("notification_preferences", {}) if user else {}
    
    return {**defaults, **preferences}


@router.put("/preferences")
async def update_notification_preferences(
    preferences: dict,
    current_user: dict = Depends(get_current_user)
):
    """Update user notification preferences"""
    db = get_db()
    user_id = current_user.get("user_id")
    
    await db.users.update_one(
        {"_id": user_id},
        {"$set": {"notification_preferences": preferences}}
    )
    
    return {"success": True, "message": "Preferences updated"}
