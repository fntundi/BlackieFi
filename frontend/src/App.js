import { useState, useEffect, useCallback } from "react";
import "@/App.css";
import { api } from "@/lib/api";
import DashboardPage from "@/pages/DashboardPage";
import IncomePage from "@/pages/IncomePage";
import ExpensesPage from "@/pages/ExpensesPage";
import DebtsPage from "@/pages/DebtsPage";
import AccountsPage from "@/pages/AccountsPage";
import InvestmentsPage from "@/pages/InvestmentsPage";
import BudgetPage from "@/pages/BudgetPage";
import CalendarPage from "@/pages/CalendarPage";
import SavingsFundsPage from "@/pages/SavingsFundsPage";
import SettingsPage from "@/pages/SettingsPage";
import OnboardingPage from "@/pages/OnboardingPage";
import {
  LayoutDashboard, DollarSign, Receipt, CreditCard, Wallet, TrendingUp,
  PieChart, CalendarDays, Target, Settings, LogOut, Menu, X, ChevronDown
} from "lucide-react";

const NAV_ITEMS = [
  { key: "dashboard", label: "Dashboard", icon: <LayoutDashboard size={18} /> },
  { key: "income", label: "Income", icon: <DollarSign size={18} /> },
  { key: "expenses", label: "Expenses", icon: <Receipt size={18} /> },
  { key: "debts", label: "Debts", icon: <CreditCard size={18} /> },
  { key: "accounts", label: "Accounts", icon: <Wallet size={18} /> },
  { key: "investments", label: "Investments", icon: <TrendingUp size={18} /> },
  { key: "budget", label: "Budget", icon: <PieChart size={18} /> },
  { key: "calendar", label: "Calendar", icon: <CalendarDays size={18} /> },
  { key: "savings", label: "Savings Goals", icon: <Target size={18} /> },
  { key: "settings", label: "Settings", icon: <Settings size={18} /> },
];

const useAuth = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("token");
    const savedUser = localStorage.getItem("user");
    if (token && savedUser) {
      try { setUser(JSON.parse(savedUser)); } catch (e) { localStorage.clear(); }
    }
    setLoading(false);
  }, []);

  const login = async (email, password) => {
    const response = await api.post("/auth/login", { email, password });
    const { access_token, user: u } = response.data;
    localStorage.setItem("token", access_token);
    localStorage.setItem("user", JSON.stringify(u));
    if (u.personal_entity_id) localStorage.setItem("currentEntityId", u.personal_entity_id);
    setUser(u);
    return response.data;
  };

  const register = async (email, password, fullName) => {
    const response = await api.post("/auth/register", { email, password, full_name: fullName });
    const { access_token, user: u } = response.data;
    localStorage.setItem("token", access_token);
    localStorage.setItem("user", JSON.stringify(u));
    if (u.personal_entity_id) localStorage.setItem("currentEntityId", u.personal_entity_id);
    setUser(u);
    return response.data;
  };

  const logout = () => {
    try { api.post("/auth/logout"); } catch (e) {}
    localStorage.clear();
    setUser(null);
  };

  const updateUser = (u) => {
    localStorage.setItem("user", JSON.stringify(u));
    setUser(u);
  };

  return { user, loading, login, register, logout, updateUser };
};

function AuthForm({ onLogin, onRegister }) {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      if (isLogin) await onLogin(email, password);
      else await onRegister(email, password, fullName);
    } catch (err) {
      setError(err.response?.data?.detail || "An error occurred");
    }
    setLoading(false);
  };

  return (
    <div className="auth-container" data-testid="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <div className="auth-brand">
            <img src="/logo.png" alt="BlackieFi Logo" className="auth-logo" />
            <h1>BlackieFi</h1>
          </div>
          <p>Asset Management Platform</p>
        </div>
        <div className="auth-tabs">
          <button className={isLogin ? "active" : ""} onClick={() => setIsLogin(true)} data-testid="login-tab">Login</button>
          <button className={!isLogin ? "active" : ""} onClick={() => setIsLogin(false)} data-testid="register-tab">Register</button>
        </div>
        <form onSubmit={handleSubmit} data-testid="auth-form">
          {!isLogin && (
            <input type="text" placeholder="Full Name" value={fullName} onChange={(e) => setFullName(e.target.value)}
                   required={!isLogin} data-testid="fullname-input" />
          )}
          <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required data-testid="email-input" />
          <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required data-testid="password-input" />
          {error && <div className="error-message" data-testid="error-message">{error}</div>}
          <button type="submit" disabled={loading} data-testid="submit-button">
            {loading ? "Loading..." : isLogin ? "Login" : "Register"}
          </button>
        </form>
      </div>
    </div>
  );
}

function MainLayout({ user, onLogout, onUpdateUser }) {
  const [activePage, setActivePage] = useState("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [entities, setEntities] = useState([]);
  const [currentEntityId, setCurrentEntityId] = useState(localStorage.getItem("currentEntityId") || user?.personal_entity_id || "");
  const [entityDropOpen, setEntityDropOpen] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(!user?.onboarding_complete);

  const fetchEntities = useCallback(async () => {
    try {
      const r = await api.get("/entities/");
      setEntities(r.data);
      if (!currentEntityId && r.data.length > 0) {
        const personal = r.data.find(e => e.is_personal);
        const eid = personal?.id || r.data[0].id;
        setCurrentEntityId(eid);
        localStorage.setItem("currentEntityId", eid);
      }
    } catch (e) { console.error(e); }
  }, [currentEntityId]);

  useEffect(() => { fetchEntities(); }, [fetchEntities]);

  const switchEntity = (eid) => {
    setCurrentEntityId(eid);
    localStorage.setItem("currentEntityId", eid);
    setEntityDropOpen(false);
  };

  const currentEntity = entities.find(e => e.id === currentEntityId);

  const handleOnboardingComplete = () => {
    setShowOnboarding(false);
    const updated = { ...user, onboarding_complete: true };
    onUpdateUser(updated);
    fetchEntities();
  };

  if (showOnboarding) {
    return <OnboardingPage onComplete={handleOnboardingComplete} />;
  }

  const renderPage = () => {
    switch (activePage) {
      case "dashboard": return <DashboardPage entityId={currentEntityId} entities={entities} />;
      case "income": return <IncomePage />;
      case "expenses": return <ExpensesPage />;
      case "debts": return <DebtsPage />;
      case "accounts": return <AccountsPage />;
      case "investments": return <InvestmentsPage />;
      case "budget": return <BudgetPage />;
      case "calendar": return <CalendarPage />;
      case "savings": return <SavingsFundsPage />;
      case "settings": return <SettingsPage entities={entities} currentEntityId={currentEntityId} onRefreshEntities={fetchEntities} />;
      default: return <DashboardPage entityId={currentEntityId} entities={entities} />;
    }
  };

  return (
    <div className="app-layout" data-testid="app-layout">
      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`} data-testid="sidebar">
        <div className="sidebar-header">
          <div className="sidebar-brand">
            <img src="/logo.png" alt="BlackieFi" className="sidebar-logo" />
            <span className="sidebar-title">BlackieFi</span>
          </div>
          <button className="sidebar-close" onClick={() => setSidebarOpen(false)} data-testid="sidebar-close"><X size={20} /></button>
        </div>

        <div className="entity-switcher" data-testid="entity-switcher">
          <button className="entity-btn" onClick={() => setEntityDropOpen(!entityDropOpen)} data-testid="entity-dropdown-btn">
            <span className="entity-name">{currentEntity?.name || "Select Entity"}</span>
            <ChevronDown size={16} className={entityDropOpen ? "rotated" : ""} />
          </button>
          {entityDropOpen && (
            <div className="entity-dropdown" data-testid="entity-dropdown">
              {entities.map(e => (
                <button key={e.id} className={`entity-option ${e.id === currentEntityId ? 'active' : ''}`}
                        onClick={() => switchEntity(e.id)} data-testid={`entity-opt-${e.id}`}>
                  <span>{e.name}</span>
                  {e.is_personal && <span className="badge-xs">Personal</span>}
                </button>
              ))}
            </div>
          )}
        </div>

        <nav className="sidebar-nav">
          {NAV_ITEMS.map(item => (
            <button key={item.key} className={`nav-item ${activePage === item.key ? 'active' : ''}`}
                    onClick={() => { setActivePage(item.key); setSidebarOpen(false); }}
                    data-testid={`nav-${item.key}`}>
              {item.icon}
              <span>{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="user-info">
            <span className="user-avatar">{user?.full_name?.[0] || "U"}</span>
            <div className="user-details">
              <span className="user-name-text">{user?.full_name}</span>
              <span className="user-email-text">{user?.email}</span>
            </div>
          </div>
          <button className="logout-btn-sidebar" onClick={onLogout} data-testid="logout-button">
            <LogOut size={18} />
          </button>
        </div>
      </aside>

      {sidebarOpen && <div className="sidebar-backdrop" onClick={() => setSidebarOpen(false)} />}

      <div className="main-area">
        <header className="top-header" data-testid="top-header">
          <button className="hamburger" onClick={() => setSidebarOpen(true)} data-testid="hamburger-btn">
            <Menu size={22} />
          </button>
          <div className="header-title">
            <h1>{NAV_ITEMS.find(i => i.key === activePage)?.label || "Dashboard"}</h1>
          </div>
          <div className="header-right-area">
            <span className="user-name-header" data-testid="user-name">{user?.full_name}</span>
          </div>
        </header>

        <main className="content-area" data-testid="content-area">
          {renderPage()}
        </main>
      </div>
    </div>
  );
}

function App() {
  const { user, loading, login, register, logout, updateUser } = useAuth();

  if (loading) {
    return (
      <div className="App loading-screen" data-testid="loading-screen">
        <div className="loading-spinner">Loading...</div>
      </div>
    );
  }

  return (
    <div className="App">
      {user ? (
        <MainLayout user={user} onLogout={logout} onUpdateUser={updateUser} />
      ) : (
        <AuthForm onLogin={login} onRegister={register} />
      )}
    </div>
  );
}

export default App;
