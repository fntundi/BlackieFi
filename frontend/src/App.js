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
import TransactionsPage from "@/pages/TransactionsPage";
import DebtPayoffPage from "@/pages/DebtPayoffPage";
import BudgetVariancePage from "@/pages/BudgetVariancePage";
import AIAssistantPage from "@/pages/AIAssistantPage";
import NotificationsPage from "@/pages/NotificationsPage";
import DataManagementPage from "@/pages/DataManagementPage";
import QAPage from "@/pages/QAPage";
import PortfolioAnalyticsPage from "@/pages/PortfolioAnalyticsPage";
import AuditLogPage from "@/pages/AuditLogPage";
import RecurringPage from "@/pages/RecurringPage";
import CrossEntityPage from "@/pages/CrossEntityPage";
import PDFExportPage from "@/pages/PDFExportPage";
import BillPayPage from "@/pages/BillPayPage";
import {
  LayoutDashboard, DollarSign, Receipt, CreditCard, Wallet, TrendingUp,
  PieChart, CalendarDays, Target, Settings, LogOut, Menu, X, ChevronDown,
  ArrowLeftRight, Calculator, BarChart3, Bot, Bell, Database, FileQuestion,
  LineChart, History, Clock, Building2, FileDown, CalendarClock
} from "lucide-react";

const NAV_ITEMS = [
  { key: "dashboard", label: "Dashboard", icon: <LayoutDashboard size={18} /> },
  { key: "income", label: "Income", icon: <DollarSign size={18} /> },
  { key: "expenses", label: "Expenses", icon: <Receipt size={18} /> },
  { key: "debts", label: "Debts", icon: <CreditCard size={18} /> },
  { key: "transactions", label: "Transactions", icon: <ArrowLeftRight size={18} /> },
  { key: "accounts", label: "Accounts", icon: <Wallet size={18} /> },
  { key: "investments", label: "Investments", icon: <TrendingUp size={18} /> },
  { key: "analytics", label: "Portfolio Analytics", icon: <LineChart size={18} /> },
  { key: "budget", label: "Budget", icon: <PieChart size={18} /> },
  { key: "variance", label: "Budget Variance", icon: <BarChart3 size={18} /> },
  { key: "payoff", label: "Debt Payoff", icon: <Calculator size={18} /> },
  { key: "recurring", label: "Recurring", icon: <Clock size={18} /> },
  { key: "billpay", label: "Bill Pay", icon: <CalendarClock size={18} /> },
  { key: "calendar", label: "Calendar", icon: <CalendarDays size={18} /> },
  { key: "savings", label: "Savings Goals", icon: <Target size={18} /> },
  { key: "entities", label: "Multi-Entity", icon: <Building2 size={18} /> },
  { key: "ai", label: "AI Assistant", icon: <Bot size={18} /> },
  { key: "qa", label: "Document Q&A", icon: <FileQuestion size={18} /> },
  { key: "notifications", label: "Notifications", icon: <Bell size={18} /> },
  { key: "data", label: "Import / Export", icon: <Database size={18} /> },
  { key: "pdf", label: "PDF Reports", icon: <FileDown size={18} /> },
  { key: "audit", label: "Audit Log", icon: <History size={18} /> },
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
    if (response.data.mfa_required) {
      return { mfa_required: true, email: response.data.email };
    }
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

function NotificationBell({ onClick }) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    const fetchCount = async () => {
      try { const r = await api.get("/notifications/unread-count"); setCount(r.data.count); } catch {}
    };
    fetchCount();
    const interval = setInterval(fetchCount, 30000);
    return () => clearInterval(interval);
  }, []);
  return (
    <button className="notification-bell" onClick={onClick} data-testid="notification-bell">
      <Bell size={20} />
      {count > 0 && <span className="bell-badge" data-testid="bell-badge">{count > 9 ? "9+" : count}</span>}
    </button>
  );
}

function AuthForm({ onLogin, onRegister }) {
  const [isLogin, setIsLogin] = useState(true);
  const [showReset, setShowReset] = useState(false);
  const [showMFA, setShowMFA] = useState(false);
  const [mfaEmail, setMfaEmail] = useState("");
  const [mfaCode, setMfaCode] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetToken, setResetToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [resetStep, setResetStep] = useState(1);
  const [resetMessage, setResetMessage] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const result = isLogin ? await onLogin(email, password) : await onRegister(email, password, fullName);
      if (result?.mfa_required) {
        setMfaEmail(result.email);
        setShowMFA(true);
      }
    } catch (err) {
      setError(err.response?.data?.detail || "An error occurred");
    }
    setLoading(false);
  };

  const handleMFASubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const r = await api.post(`/auth/mfa/validate?email=${encodeURIComponent(mfaEmail)}`, { code: mfaCode });
      localStorage.setItem("token", r.data.access_token);
      localStorage.setItem("user", JSON.stringify(r.data.user));
      if (r.data.user.personal_entity_id) localStorage.setItem("currentEntityId", r.data.user.personal_entity_id);
      window.location.reload();
    } catch (err) {
      setError(err.response?.data?.detail || "Invalid MFA code");
    }
    setLoading(false);
  };

  const handleResetRequest = async (e) => {
    e.preventDefault();
    setError(""); setResetMessage(""); setLoading(true);
    try {
      const r = await api.post("/auth/password-reset/request", { email: resetEmail });
      if (r.data.reset_token) setResetToken(r.data.reset_token);
      setResetMessage(r.data.message);
      setResetStep(2);
    } catch (err) {
      setError(err.response?.data?.detail || "An error occurred");
    }
    setLoading(false);
  };

  const handleResetConfirm = async (e) => {
    e.preventDefault();
    setError(""); setResetMessage(""); setLoading(true);
    try {
      await api.post("/auth/password-reset/confirm", { token: resetToken, new_password: newPassword });
      setResetMessage("Password reset successfully! You can now log in.");
      setResetStep(3);
    } catch (err) {
      setError(err.response?.data?.detail || "An error occurred");
    }
    setLoading(false);
  };

  if (showMFA) {
    return (
      <div className="auth-container" data-testid="mfa-container">
        <div className="auth-card">
          <div className="auth-header">
            <div className="auth-brand">
              <img src="/logo.png" alt="BlackieFi Logo" className="auth-logo" />
              <h1>BlackieFi</h1>
            </div>
            <p>Two-Factor Authentication</p>
          </div>
          <form onSubmit={handleMFASubmit} data-testid="mfa-login-form">
            <p className="reset-info">Enter the 6-digit code from your authenticator app.</p>
            <input type="text" placeholder="000000" value={mfaCode} onChange={e => setMfaCode(e.target.value)}
                   maxLength={6} required data-testid="mfa-login-code" style={{ textAlign: "center", fontSize: "1.5rem", letterSpacing: "0.5rem" }} />
            {error && <div className="error-message" data-testid="mfa-error">{error}</div>}
            <button type="submit" disabled={loading || mfaCode.length !== 6} data-testid="mfa-login-btn">
              {loading ? "Verifying..." : "Verify & Login"}
            </button>
          </form>
          <div className="reset-back">
            <button className="btn-text" onClick={() => { setShowMFA(false); setMfaCode(""); setError(""); }}
                    data-testid="back-from-mfa">Back to Login</button>
          </div>
        </div>
      </div>
    );
  }

  if (showReset) {
    return (
      <div className="auth-container" data-testid="reset-container">
        <div className="auth-card">
          <div className="auth-header">
            <div className="auth-brand">
              <img src="/logo.png" alt="BlackieFi Logo" className="auth-logo" />
              <h1>BlackieFi</h1>
            </div>
            <p>Password Reset</p>
          </div>

          {resetStep === 1 && (
            <form onSubmit={handleResetRequest} data-testid="reset-request-form">
              <p className="reset-info">Enter your email address and we'll send you a reset token.</p>
              <input type="email" placeholder="Email" value={resetEmail} onChange={e => setResetEmail(e.target.value)}
                     required data-testid="reset-email-input" />
              {error && <div className="error-message">{error}</div>}
              <button type="submit" disabled={loading} data-testid="reset-request-btn">
                {loading ? "Sending..." : "Request Reset"}
              </button>
            </form>
          )}

          {resetStep === 2 && (
            <form onSubmit={handleResetConfirm} data-testid="reset-confirm-form">
              {resetMessage && <div className="success-message" data-testid="reset-message">{resetMessage}</div>}
              <p className="reset-info">Enter the reset token and your new password.</p>
              <input type="text" placeholder="Reset Token" value={resetToken} onChange={e => setResetToken(e.target.value)}
                     required data-testid="reset-token-input" />
              <input type="password" placeholder="New Password (min 6 chars)" value={newPassword}
                     onChange={e => setNewPassword(e.target.value)} required minLength={6} data-testid="reset-password-input" />
              {error && <div className="error-message">{error}</div>}
              <button type="submit" disabled={loading} data-testid="reset-confirm-btn">
                {loading ? "Resetting..." : "Reset Password"}
              </button>
            </form>
          )}

          {resetStep === 3 && (
            <div data-testid="reset-success">
              <div className="success-message">{resetMessage}</div>
            </div>
          )}

          <div className="reset-back">
            <button className="btn-text" onClick={() => { setShowReset(false); setResetStep(1); setError(""); setResetMessage(""); }}
                    data-testid="back-to-login">Back to Login</button>
          </div>
        </div>
      </div>
    );
  }

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
        {isLogin && (
          <div className="forgot-password-link">
            <button className="btn-text" onClick={() => setShowReset(true)} data-testid="forgot-password-btn">
              Forgot your password?
            </button>
          </div>
        )}
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
      case "transactions": return <TransactionsPage />;
      case "accounts": return <AccountsPage />;
      case "investments": return <InvestmentsPage />;
      case "analytics": return <PortfolioAnalyticsPage />;
      case "budget": return <BudgetPage />;
      case "variance": return <BudgetVariancePage />;
      case "payoff": return <DebtPayoffPage />;
      case "recurring": return <RecurringPage />;
      case "billpay": return <BillPayPage />;
      case "calendar": return <CalendarPage />;
      case "savings": return <SavingsFundsPage />;
      case "entities": return <CrossEntityPage />;
      case "ai": return <AIAssistantPage />;
      case "qa": return <QAPage />;
      case "notifications": return <NotificationsPage />;
      case "data": return <DataManagementPage />;
      case "pdf": return <PDFExportPage />;
      case "audit": return <AuditLogPage />;
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
            <NotificationBell onClick={() => setActivePage("notifications")} />
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
