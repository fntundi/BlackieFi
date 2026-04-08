import { useState, useEffect, useCallback } from "react";
import { api } from "@/lib/api";
import { Bell, Check, CheckCheck, Trash2, Clock, AlertTriangle, Info, X } from "lucide-react";

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState([]);
  const [upcoming, setUpcoming] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("all");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [notif, up] = await Promise.all([
        api.get("/notifications/"),
        api.get("/notifications/upcoming?days=7"),
      ]);
      setNotifications(notif.data);
      setUpcoming(up.data);
    } catch {} finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const markRead = async (id) => {
    await api.put(`/notifications/${id}/read`);
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  };

  const markAllRead = async () => {
    await api.put("/notifications/read-all");
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const deleteNotif = async (id) => {
    await api.delete(`/notifications/${id}`);
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const unreadCount = notifications.filter(n => !n.read).length;
  const typeIcon = (type) => {
    switch (type) {
      case "warning": return <AlertTriangle size={16} className="text-warning" />;
      case "success": return <Check size={16} className="text-success" />;
      default: return <Info size={16} className="text-info" />;
    }
  };

  return (
    <div className="page-container" data-testid="notifications-page">
      <div className="page-header-row">
        <h2><Bell size={22} /> Notifications {unreadCount > 0 && <span className="badge-count">{unreadCount}</span>}</h2>
        {unreadCount > 0 && (
          <button className="btn-secondary" onClick={markAllRead} data-testid="mark-all-read-btn">
            <CheckCheck size={16} /> Mark All Read
          </button>
        )}
      </div>

      <div className="ai-tabs">
        <button className={`ai-tab ${tab === "all" ? "active" : ""}`} onClick={() => setTab("all")} data-testid="notif-tab-all">
          All ({notifications.length})
        </button>
        <button className={`ai-tab ${tab === "unread" ? "active" : ""}`} onClick={() => setTab("unread")} data-testid="notif-tab-unread">
          Unread ({unreadCount})
        </button>
        <button className={`ai-tab ${tab === "upcoming" ? "active" : ""}`} onClick={() => setTab("upcoming")} data-testid="notif-tab-upcoming">
          <Clock size={14} /> Upcoming Bills ({upcoming.length})
        </button>
      </div>

      {loading ? <div className="loading-spinner">Loading...</div> : (
        <>
          {(tab === "all" || tab === "unread") && (
            <div className="notifications-list" data-testid="notifications-list">
              {(tab === "unread" ? notifications.filter(n => !n.read) : notifications).length === 0 ? (
                <div className="empty-state-card"><Bell size={40} className="empty-icon" /><p>No notifications</p></div>
              ) : (
                (tab === "unread" ? notifications.filter(n => !n.read) : notifications).map(n => (
                  <div key={n.id} className={`notification-item ${n.read ? "read" : "unread"}`} data-testid={`notif-${n.id}`}>
                    <div className="notif-icon">{typeIcon(n.notification_type)}</div>
                    <div className="notif-body">
                      <div className="notif-title">{n.title}</div>
                      <div className="notif-message">{n.message}</div>
                      <div className="notif-time">{new Date(n.created_at).toLocaleString()}</div>
                    </div>
                    <div className="notif-actions">
                      {!n.read && <button onClick={() => markRead(n.id)} title="Mark read" data-testid={`mark-read-${n.id}`}><Check size={14} /></button>}
                      <button onClick={() => deleteNotif(n.id)} title="Delete" data-testid={`delete-notif-${n.id}`}><Trash2 size={14} /></button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {tab === "upcoming" && (
            <div className="notifications-list" data-testid="upcoming-list">
              {upcoming.length === 0 ? (
                <div className="empty-state-card"><Clock size={40} className="empty-icon" /><p>No upcoming bills</p></div>
              ) : (
                upcoming.map((item, i) => (
                  <div key={i} className="notification-item unread" data-testid={`upcoming-${i}`}>
                    <div className="notif-icon"><AlertTriangle size={16} className="text-warning" /></div>
                    <div className="notif-body">
                      <div className="notif-title">{item.name}</div>
                      <div className="notif-message">
                        {item.type === "debt_payment" ? "Debt payment" : "Recurring expense"}: ${item.amount?.toFixed(2)}
                        {item.date && ` - Due: ${new Date(item.date).toLocaleDateString()}`}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
