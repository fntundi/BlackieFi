import { useState, useCallback, useEffect } from "react";
import { api } from "@/lib/api";
import { ChevronLeft, ChevronRight, Plus, X } from "lucide-react";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const EVENT_COLORS = { income: "#22c55e", expense: "#ef4444", debt: "#f97316", investment: "#3b82f6", budget: "#8b5cf6", custom: "#64748b" };

export default function CalendarPage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState(null);
  const [showAddEvent, setShowAddEvent] = useState(false);
  const [filters, setFilters] = useState({ income: true, expense: true, debt: true, custom: true });

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    const start = new Date(year, month, 1).toISOString();
    const end = new Date(year, month + 1, 0, 23, 59, 59).toISOString();
    try {
      const res = await api.get(`/calendar/events?start=${start}&end=${end}`);
      setEvents(res.data);
    } catch (e) { console.error(e); }
    setLoading(false);
  }, [year, month]);

  useEffect(() => { fetchEvents(); }, [fetchEvents]);

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));
  const goToday = () => setCurrentDate(new Date());

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = new Date();
  const isToday = (d) => today.getFullYear() === year && today.getMonth() === month && today.getDate() === d;

  const getEventsForDay = (day) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return events.filter(e => {
      const eDate = e.date?.slice(0, 10);
      return eDate === dateStr && filters[e.event_type] !== false;
    });
  };

  const handleAddEvent = async (data) => {
    try {
      await api.post("/calendar/events", data);
      setShowAddEvent(false); fetchEvents();
    } catch (e) { alert(e.response?.data?.detail || "Error"); }
  };

  const handleDeleteEvent = async (id) => {
    if (!window.confirm("Delete this event?")) return;
    try { await api.delete(`/calendar/events/${id}`); fetchEvents(); setSelectedDay(null); }
    catch (e) { alert(e.response?.data?.detail || "Error"); }
  };

  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const selectedEvents = selectedDay ? getEventsForDay(selectedDay) : [];

  return (
    <div className="page-content" data-testid="calendar-page">
      <div className="page-header">
        <h2>Calendar</h2>
        <div className="cal-filters">
          {Object.keys(EVENT_COLORS).filter(k => k !== "budget" && k !== "investment").map(type => (
            <label key={type} className="filter-label">
              <span className="filter-dot" style={{ background: EVENT_COLORS[type] }} />
              <input type="checkbox" checked={filters[type] !== false}
                     onChange={e => setFilters({ ...filters, [type]: e.target.checked })} />
              {type}
            </label>
          ))}
        </div>
      </div>

      <div className="cal-nav">
        <button onClick={prevMonth} data-testid="cal-prev"><ChevronLeft size={20} /></button>
        <div className="cal-title">
          <span className="cal-month">{MONTHS[month]}</span>
          <span className="cal-year">{year}</span>
        </div>
        <button onClick={nextMonth} data-testid="cal-next"><ChevronRight size={20} /></button>
        <button className="btn-sm" onClick={goToday}>Today</button>
        <button className="btn-primary btn-sm" onClick={() => setShowAddEvent(true)} data-testid="cal-add-event">
          <Plus size={14} /> Event
        </button>
      </div>

      <div className="cal-grid" data-testid="cal-grid">
        {DAYS.map(d => <div key={d} className="cal-header-cell">{d}</div>)}
        {cells.map((day, i) => (
          <div key={day ? `day-${day}` : `empty-${i}`} className={`cal-cell ${day ? 'has-day' : 'empty'} ${day && isToday(day) ? 'today' : ''} ${day === selectedDay ? 'selected' : ''}`}
               onClick={() => day && setSelectedDay(day === selectedDay ? null : day)}>
            {day && (
              <>
                <span className="cal-day-num">{day}</span>
                <div className="cal-dots">
                  {getEventsForDay(day).slice(0, 3).map((e) => (
                    <span key={e.id || `${e.title}-${e.event_type}`} className="cal-event-dot" style={{ background: e.color || EVENT_COLORS[e.event_type] || "#64748b" }} />
                  ))}
                  {getEventsForDay(day).length > 3 && <span className="cal-more">+{getEventsForDay(day).length - 3}</span>}
                </div>
              </>
            )}
          </div>
        ))}
      </div>

      {selectedDay && (
        <div className="cal-day-detail" data-testid="cal-day-detail">
          <h3>{MONTHS[month]} {selectedDay}, {year}</h3>
          {selectedEvents.length === 0 ? (
            <p className="text-muted">No events this day.</p>
          ) : (
            <div className="cal-event-list">
              {selectedEvents.map((e) => (
                <div key={e.id || `${e.title}-${e.event_type}`} className="cal-event-item" style={{ borderLeftColor: e.color || EVENT_COLORS[e.event_type] }}>
                  <div>
                    <span className="cal-event-title">{e.title}</span>
                    <span className="cal-event-type">{e.event_type}</span>
                  </div>
                  {e.description && <p className="text-muted">{e.description}</p>}
                  {e.is_manual && (
                    <button className="btn-sm btn-danger" onClick={() => handleDeleteEvent(e.id)}><X size={12} /> Remove</button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {showAddEvent && <AddEventModal date={selectedDay ? `${year}-${String(month+1).padStart(2,'0')}-${String(selectedDay).padStart(2,'0')}` : ""}
                                       onSave={handleAddEvent} onClose={() => setShowAddEvent(false)} />}
    </div>
  );
}

function AddEventModal({ date, onSave, onClose }) {
  const [title, setTitle] = useState("");
  const [eventType, setEventType] = useState("custom");
  const [eventDate, setEventDate] = useState(date || "");
  const [description, setDescription] = useState("");

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Add Event</h2>
          <button className="close-btn" onClick={onClose}><X size={18} /></button>
        </div>
        <form onSubmit={e => { e.preventDefault(); onSave({ title, event_type: eventType, date: new Date(eventDate).toISOString(), description: description || null }); }}
              className="modal-form" data-testid="cal-event-form">
          <input type="text" placeholder="Event Title" value={title} onChange={e => setTitle(e.target.value)} required />
          <select value={eventType} onChange={e => setEventType(e.target.value)}>
            <option value="custom">Custom</option><option value="income">Income</option>
            <option value="expense">Expense</option><option value="debt">Debt</option>
          </select>
          <input type="date" value={eventDate} onChange={e => setEventDate(e.target.value)} required />
          <input type="text" placeholder="Description (optional)" value={description} onChange={e => setDescription(e.target.value)} />
          <div className="form-actions">
            <button type="button" onClick={onClose}>Cancel</button>
            <button type="submit" data-testid="cal-event-submit">Create Event</button>
          </div>
        </form>
      </div>
    </div>
  );
}
