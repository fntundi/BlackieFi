"""
Alert Service - Monitors budgets, bills, and goals for real-time alerts
"""
from datetime import datetime, timezone, timedelta
from typing import List, Dict, Any
import logging

from services.notification_service import get_notification_service, NotificationCategory

logger = logging.getLogger(__name__)

class AlertService:
    """Service for monitoring and triggering alerts"""
    
    def __init__(self, db):
        self.db = db
        self.notification_service = get_notification_service()
    
    async def check_budget_alerts(self, entity_id: str, user_id: str) -> List[Dict[str, Any]]:
        """Check if any budgets have exceeded thresholds and send alerts"""
        alerts_sent = []
        
        # Check user preferences
        user = await self.db.users.find_one({"_id": user_id})
        prefs = user.get("notification_preferences", {}) if user else {}
        
        # Skip if budget alerts are disabled
        if prefs.get("budget_alerts") is False:
            return alerts_sent
        
        # Get user's preferred threshold (default 80%)
        default_threshold = prefs.get("budget_alert_threshold", 80)
        
        # Get current month
        current_month = datetime.now(timezone.utc).strftime("%Y-%m")
        
        # Get budgets for current month
        budget = await self.db.budgets.find_one({
            "entity_id": entity_id,
            "month": current_month
        })
        
        if not budget:
            return alerts_sent
        
        # Get categories
        categories = {}
        async for c in self.db.categories.find():
            categories[str(c["_id"])] = c["name"]
        
        # Get transactions for this month
        month_start = f"{current_month}-01"
        transactions = await self.db.transactions.find({
            "entity_id": entity_id,
            "type": "expense",
            "date": {"$gte": month_start}
        }).to_list(500)
        
        # Calculate spending by category
        spending_by_cat = {}
        for t in transactions:
            cat_id = t.get("category_id", "")
            spending_by_cat[cat_id] = spending_by_cat.get(cat_id, 0) + t.get("amount", 0)
        
        # Check each category budget
        for cat_budget in budget.get("category_budgets", []):
            cat_id = cat_budget.get("category_id", "")
            planned = cat_budget.get("planned_amount", 0)
            spent = spending_by_cat.get(cat_id, 0)
            
            if planned > 0:
                percentage = int((spent / planned) * 100)
                # Use category-specific threshold or user default
                alert_threshold = cat_budget.get("alert_threshold", default_threshold)
                
                # Check if threshold exceeded and not already alerted
                if percentage >= alert_threshold:
                    alert_key = f"budget_alert_{entity_id}_{cat_id}_{current_month}_{alert_threshold}"
                    
                    # Check if already alerted
                    existing_alert = await self.db.sent_alerts.find_one({"key": alert_key})
                    
                    if not existing_alert:
                        category_name = categories.get(cat_id, "Unknown")
                        
                        # Send notification
                        result = await self.notification_service.send_budget_alert(
                            user_id=user_id,
                            category_name=category_name,
                            spent=spent,
                            budget=planned,
                            percentage=percentage,
                            db=self.db
                        )
                        
                        # Record alert sent
                        await self.db.sent_alerts.insert_one({
                            "key": alert_key,
                            "type": "budget_alert",
                            "entity_id": entity_id,
                            "category_id": cat_id,
                            "percentage": percentage,
                            "sent_at": datetime.now(timezone.utc).isoformat()
                        })
                        
                        alerts_sent.append({
                            "type": "budget_alert",
                            "category": category_name,
                            "percentage": percentage,
                            "result": result
                        })
        
        return alerts_sent
    
    async def check_bill_reminders(self, entity_id: str, user_id: str) -> List[Dict[str, Any]]:
        """Check for upcoming bills and send reminders"""
        alerts_sent = []
        today = datetime.now(timezone.utc).date()
        
        # Get all active bills
        bills = await self.db.bills.find({
            "entity_id": entity_id,
            "status": {"$ne": "inactive"}
        }).to_list(100)
        
        for bill in bills:
            due_date_str = bill.get("due_date", "")
            if not due_date_str:
                continue
            
            try:
                due_date = datetime.fromisoformat(due_date_str).date()
            except:
                continue
            
            reminder_days = bill.get("reminder_days", 7)
            days_until = (due_date - today).days
            
            # Check if within reminder window
            if 0 <= days_until <= reminder_days:
                alert_key = f"bill_reminder_{bill['_id']}_{due_date_str}"
                
                # Check if already reminded
                existing_alert = await self.db.sent_alerts.find_one({"key": alert_key})
                
                if not existing_alert:
                    result = await self.notification_service.send_bill_reminder(
                        user_id=user_id,
                        bill_name=bill.get("name", "Unknown Bill"),
                        amount=bill.get("typical_amount", 0),
                        due_date=due_date.strftime("%B %d, %Y"),
                        days_until=days_until,
                        db=self.db
                    )
                    
                    # Record alert sent
                    await self.db.sent_alerts.insert_one({
                        "key": alert_key,
                        "type": "bill_reminder",
                        "bill_id": bill["_id"],
                        "due_date": due_date_str,
                        "sent_at": datetime.now(timezone.utc).isoformat()
                    })
                    
                    alerts_sent.append({
                        "type": "bill_reminder",
                        "bill_name": bill.get("name"),
                        "days_until": days_until,
                        "result": result
                    })
        
        return alerts_sent
    
    async def check_goal_milestones(self, entity_id: str, user_id: str) -> List[Dict[str, Any]]:
        """Check for goal milestones (25%, 50%, 75%, 100%)"""
        alerts_sent = []
        milestones = [25, 50, 75, 100]
        
        # Get active goals
        goals = await self.db.goals.find({
            "entity_id": entity_id,
            "status": "in_progress"
        }).to_list(50)
        
        for goal in goals:
            target = goal.get("target_amount", 0)
            current = goal.get("current_amount", 0)
            
            if target <= 0:
                continue
            
            percentage = int((current / target) * 100)
            
            for milestone in milestones:
                if percentage >= milestone:
                    alert_key = f"goal_milestone_{goal['_id']}_{milestone}"
                    
                    # Check if already notified for this milestone
                    existing_alert = await self.db.sent_alerts.find_one({"key": alert_key})
                    
                    if not existing_alert:
                        result = await self.notification_service.send_goal_milestone(
                            user_id=user_id,
                            goal_name=goal.get("name", "Unknown Goal"),
                            current=current,
                            target=target,
                            percentage=milestone,
                            db=self.db
                        )
                        
                        # Record alert sent
                        await self.db.sent_alerts.insert_one({
                            "key": alert_key,
                            "type": "goal_milestone",
                            "goal_id": goal["_id"],
                            "milestone": milestone,
                            "sent_at": datetime.now(timezone.utc).isoformat()
                        })
                        
                        alerts_sent.append({
                            "type": "goal_milestone",
                            "goal_name": goal.get("name"),
                            "milestone": milestone,
                            "result": result
                        })
        
        return alerts_sent
    
    async def run_all_checks(self, entity_id: str, user_id: str) -> Dict[str, List[Dict[str, Any]]]:
        """Run all alert checks for an entity"""
        return {
            "budget_alerts": await self.check_budget_alerts(entity_id, user_id),
            "bill_reminders": await self.check_bill_reminders(entity_id, user_id),
            "goal_milestones": await self.check_goal_milestones(entity_id, user_id)
        }
