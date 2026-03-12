"""
Notification Service - Handles email and push notifications
"""
import os
import asyncio
import logging
from typing import Optional, List, Dict, Any
from datetime import datetime, timezone
from enum import Enum
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)

class NotificationType(str, Enum):
    EMAIL = "email"
    PUSH = "push"
    BOTH = "both"

class NotificationCategory(str, Enum):
    BILL_REMINDER = "bill_reminder"
    BUDGET_ALERT = "budget_alert"
    GOAL_MILESTONE = "goal_milestone"
    TRANSACTION_ALERT = "transaction_alert"
    PASSWORD_RESET = "password_reset"
    WELCOME = "welcome"
    SYSTEM = "system"

# Email templates with inline CSS
EMAIL_TEMPLATES = {
    NotificationCategory.PASSWORD_RESET: {
        "subject": "Reset Your Password - BlackieFi",
        "html": """
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0A0A0A; padding: 32px; border-radius: 16px;">
            <div style="text-align: center; margin-bottom: 32px;">
                <h1 style="color: #D4AF37; font-size: 24px; margin: 0;">BlackieFi</h1>
                <p style="color: #525252; font-size: 12px; letter-spacing: 0.15em; text-transform: uppercase;">Premium Finance</p>
            </div>
            <div style="background: #0F0F0F; padding: 24px; border-radius: 12px; border: 1px solid rgba(212, 175, 55, 0.1);">
                <h2 style="color: #F5F5F5; font-size: 18px; margin: 0 0 16px;">Password Reset Request</h2>
                <p style="color: #A3A3A3; line-height: 1.6;">You requested to reset your password. Click the button below to set a new password:</p>
                <div style="text-align: center; margin: 24px 0;">
                    <a href="{reset_link}" style="display: inline-block; padding: 12px 32px; background: linear-gradient(135deg, #C4A030 0%, #D4AF37 50%, #C4A030 100%); color: #000; text-decoration: none; border-radius: 8px; font-weight: 600;">Reset Password</a>
                </div>
                <p style="color: #737373; font-size: 14px;">This link will expire in 1 hour. If you didn't request this, you can safely ignore this email.</p>
            </div>
            <p style="color: #525252; font-size: 12px; text-align: center; margin-top: 24px;">© 2025 BlackieFi. All rights reserved.</p>
        </div>
        """
    },
    NotificationCategory.BILL_REMINDER: {
        "subject": "Bill Due Soon - {bill_name}",
        "html": """
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0A0A0A; padding: 32px; border-radius: 16px;">
            <div style="text-align: center; margin-bottom: 32px;">
                <h1 style="color: #D4AF37; font-size: 24px; margin: 0;">BlackieFi</h1>
            </div>
            <div style="background: #0F0F0F; padding: 24px; border-radius: 12px; border: 1px solid rgba(234, 179, 8, 0.2);">
                <h2 style="color: #EAB308; font-size: 18px; margin: 0 0 16px;">⏰ Bill Reminder</h2>
                <p style="color: #A3A3A3; line-height: 1.6;">Your bill <strong style="color: #F5F5F5;">{bill_name}</strong> is due soon.</p>
                <div style="background: rgba(234, 179, 8, 0.1); padding: 16px; border-radius: 8px; margin: 16px 0;">
                    <table style="width: 100%; border-collapse: collapse;">
                        <tr><td style="color: #737373; padding: 4px 0;">Amount:</td><td style="color: #F5F5F5; text-align: right; font-weight: 600;">${amount}</td></tr>
                        <tr><td style="color: #737373; padding: 4px 0;">Due Date:</td><td style="color: #EAB308; text-align: right; font-weight: 600;">{due_date}</td></tr>
                        <tr><td style="color: #737373; padding: 4px 0;">Days Until Due:</td><td style="color: #F5F5F5; text-align: right;">{days_until}</td></tr>
                    </table>
                </div>
                <p style="color: #737373; font-size: 14px;">Don't forget to mark it as paid once complete!</p>
            </div>
        </div>
        """
    },
    NotificationCategory.BUDGET_ALERT: {
        "subject": "Budget Alert - {category_name}",
        "html": """
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0A0A0A; padding: 32px; border-radius: 16px;">
            <div style="text-align: center; margin-bottom: 32px;">
                <h1 style="color: #D4AF37; font-size: 24px; margin: 0;">BlackieFi</h1>
            </div>
            <div style="background: #0F0F0F; padding: 24px; border-radius: 12px; border: 1px solid rgba(220, 38, 38, 0.2);">
                <h2 style="color: #DC2626; font-size: 18px; margin: 0 0 16px;">🚨 Budget Alert</h2>
                <p style="color: #A3A3A3; line-height: 1.6;">You've reached <strong style="color: #DC2626;">{percentage}%</strong> of your <strong style="color: #F5F5F5;">{category_name}</strong> budget.</p>
                <div style="background: rgba(220, 38, 38, 0.1); padding: 16px; border-radius: 8px; margin: 16px 0;">
                    <div style="background: #1A1A1A; border-radius: 4px; height: 8px; overflow: hidden;">
                        <div style="background: linear-gradient(90deg, #DC2626 0%, #EF4444 100%); height: 100%; width: {percentage}%;"></div>
                    </div>
                    <table style="width: 100%; border-collapse: collapse; margin-top: 12px;">
                        <tr><td style="color: #737373; padding: 4px 0;">Spent:</td><td style="color: #DC2626; text-align: right; font-weight: 600;">${spent}</td></tr>
                        <tr><td style="color: #737373; padding: 4px 0;">Budget:</td><td style="color: #F5F5F5; text-align: right;">${budget}</td></tr>
                        <tr><td style="color: #737373; padding: 4px 0;">Remaining:</td><td style="color: {remaining_color}; text-align: right; font-weight: 600;">${remaining}</td></tr>
                    </table>
                </div>
                <p style="color: #737373; font-size: 14px;">Consider reducing spending in this category to stay on track.</p>
            </div>
        </div>
        """
    },
    NotificationCategory.GOAL_MILESTONE: {
        "subject": "Goal Milestone! - {goal_name}",
        "html": """
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0A0A0A; padding: 32px; border-radius: 16px;">
            <div style="text-align: center; margin-bottom: 32px;">
                <h1 style="color: #D4AF37; font-size: 24px; margin: 0;">BlackieFi</h1>
            </div>
            <div style="background: #0F0F0F; padding: 24px; border-radius: 12px; border: 1px solid rgba(5, 150, 105, 0.2);">
                <h2 style="color: #059669; font-size: 18px; margin: 0 0 16px;">🎉 Milestone Reached!</h2>
                <p style="color: #A3A3A3; line-height: 1.6;">Congratulations! You've reached <strong style="color: #059669;">{percentage}%</strong> of your <strong style="color: #F5F5F5;">{goal_name}</strong> goal!</p>
                <div style="background: rgba(5, 150, 105, 0.1); padding: 16px; border-radius: 8px; margin: 16px 0;">
                    <div style="background: #1A1A1A; border-radius: 4px; height: 8px; overflow: hidden;">
                        <div style="background: linear-gradient(90deg, #059669 0%, #10B981 100%); height: 100%; width: {percentage}%;"></div>
                    </div>
                    <table style="width: 100%; border-collapse: collapse; margin-top: 12px;">
                        <tr><td style="color: #737373; padding: 4px 0;">Current:</td><td style="color: #059669; text-align: right; font-weight: 600;">${current}</td></tr>
                        <tr><td style="color: #737373; padding: 4px 0;">Target:</td><td style="color: #F5F5F5; text-align: right;">${target}</td></tr>
                    </table>
                </div>
                <p style="color: #737373; font-size: 14px;">Keep up the great work!</p>
            </div>
        </div>
        """
    },
    NotificationCategory.WELCOME: {
        "subject": "Welcome to BlackieFi!",
        "html": """
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0A0A0A; padding: 32px; border-radius: 16px;">
            <div style="text-align: center; margin-bottom: 32px;">
                <h1 style="color: #D4AF37; font-size: 28px; margin: 0;">Welcome to BlackieFi</h1>
                <p style="color: #525252; font-size: 12px; letter-spacing: 0.15em; text-transform: uppercase;">Premium Finance</p>
            </div>
            <div style="background: #0F0F0F; padding: 24px; border-radius: 12px; border: 1px solid rgba(212, 175, 55, 0.1);">
                <h2 style="color: #F5F5F5; font-size: 18px; margin: 0 0 16px;">Your journey to financial freedom starts now!</h2>
                <p style="color: #A3A3A3; line-height: 1.6;">Thank you for joining BlackieFi, {username}. Here's what you can do:</p>
                <ul style="color: #A3A3A3; line-height: 2;">
                    <li>Track your <span style="color: #D4AF37;">income and expenses</span></li>
                    <li>Set up <span style="color: #D4AF37;">budgets and goals</span></li>
                    <li>Import your <span style="color: #D4AF37;">bank statements</span></li>
                    <li>Get <span style="color: #D4AF37;">AI-powered insights</span></li>
                </ul>
            </div>
        </div>
        """
    },
}


class NotificationService:
    """Service for sending notifications via email and push"""
    
    def __init__(self):
        self.resend_api_key = os.environ.get("RESEND_API_KEY")
        self.sender_email = os.environ.get("SENDER_EMAIL", "onboarding@resend.dev")
        self._resend_initialized = False
        
        if self.resend_api_key:
            try:
                import resend
                resend.api_key = self.resend_api_key
                self._resend_initialized = True
                logger.info("Resend email service initialized")
            except ImportError:
                logger.warning("Resend library not installed")
    
    async def send_email(
        self,
        to_email: str,
        subject: str,
        html_content: str
    ) -> Dict[str, Any]:
        """Send an email via Resend"""
        if not self._resend_initialized:
            logger.warning("Email service not configured")
            return {"success": False, "error": "Email service not configured"}
        
        try:
            import resend
            params = {
                "from": self.sender_email,
                "to": [to_email],
                "subject": subject,
                "html": html_content
            }
            
            # Run sync SDK in thread to keep FastAPI non-blocking
            result = await asyncio.to_thread(resend.Emails.send, params)
            
            logger.info(f"Email sent to {to_email}: {subject}")
            return {
                "success": True,
                "email_id": result.get("id"),
                "message": f"Email sent to {to_email}"
            }
        except Exception as e:
            logger.error(f"Failed to send email: {str(e)}")
            return {"success": False, "error": str(e)}
    
    async def send_notification(
        self,
        user_id: str,
        category: NotificationCategory,
        notification_type: NotificationType = NotificationType.EMAIL,
        data: Dict[str, Any] = None,
        db = None
    ) -> Dict[str, Any]:
        """Send a notification based on category and type"""
        data = data or {}
        results = {"email": None, "push": None}
        
        # Get user info for email
        user = None
        if db:
            user = await db.users.find_one({"_id": user_id})
        
        if notification_type in [NotificationType.EMAIL, NotificationType.BOTH]:
            if user and user.get("email"):
                template = EMAIL_TEMPLATES.get(category)
                if template:
                    subject = template["subject"].format(**data)
                    html = template["html"].format(**data)
                    results["email"] = await self.send_email(user["email"], subject, html)
        
        if notification_type in [NotificationType.PUSH, NotificationType.BOTH]:
            # Store push notification for later delivery
            if db:
                await db.notifications.insert_one({
                    "user_id": user_id,
                    "category": category.value,
                    "data": data,
                    "read": False,
                    "created_at": datetime.now(timezone.utc).isoformat()
                })
                results["push"] = {"success": True, "stored": True}
        
        return results
    
    async def send_password_reset(self, email: str, reset_token: str, base_url: str) -> Dict[str, Any]:
        """Send password reset email"""
        reset_link = f"{base_url}/reset-password?token={reset_token}"
        template = EMAIL_TEMPLATES[NotificationCategory.PASSWORD_RESET]
        html = template["html"].format(reset_link=reset_link)
        return await self.send_email(email, template["subject"], html)
    
    async def send_bill_reminder(
        self,
        user_id: str,
        bill_name: str,
        amount: float,
        due_date: str,
        days_until: int,
        db = None
    ) -> Dict[str, Any]:
        """Send bill reminder notification"""
        return await self.send_notification(
            user_id=user_id,
            category=NotificationCategory.BILL_REMINDER,
            notification_type=NotificationType.BOTH,
            data={
                "bill_name": bill_name,
                "amount": f"{amount:,.2f}",
                "due_date": due_date,
                "days_until": days_until
            },
            db=db
        )
    
    async def send_budget_alert(
        self,
        user_id: str,
        category_name: str,
        spent: float,
        budget: float,
        percentage: int,
        db = None
    ) -> Dict[str, Any]:
        """Send budget alert notification"""
        remaining = budget - spent
        return await self.send_notification(
            user_id=user_id,
            category=NotificationCategory.BUDGET_ALERT,
            notification_type=NotificationType.BOTH,
            data={
                "category_name": category_name,
                "spent": f"{spent:,.2f}",
                "budget": f"{budget:,.2f}",
                "remaining": f"{abs(remaining):,.2f}",
                "remaining_color": "#059669" if remaining > 0 else "#DC2626",
                "percentage": min(percentage, 100)
            },
            db=db
        )
    
    async def send_goal_milestone(
        self,
        user_id: str,
        goal_name: str,
        current: float,
        target: float,
        percentage: int,
        db = None
    ) -> Dict[str, Any]:
        """Send goal milestone notification"""
        return await self.send_notification(
            user_id=user_id,
            category=NotificationCategory.GOAL_MILESTONE,
            notification_type=NotificationType.BOTH,
            data={
                "goal_name": goal_name,
                "current": f"{current:,.2f}",
                "target": f"{target:,.2f}",
                "percentage": percentage
            },
            db=db
        )
    
    async def send_welcome_email(self, email: str, username: str) -> Dict[str, Any]:
        """Send welcome email to new user"""
        template = EMAIL_TEMPLATES[NotificationCategory.WELCOME]
        html = template["html"].format(username=username)
        return await self.send_email(email, template["subject"], html)


# Singleton instance
_notification_service: Optional[NotificationService] = None

def get_notification_service() -> NotificationService:
    """Get or create notification service instance"""
    global _notification_service
    if _notification_service is None:
        _notification_service = NotificationService()
    return _notification_service
