import { useState, useEffect, useCallback } from "react";
import "@/App.css";
import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || "http://localhost:8080";
const API = `${BACKEND_URL}/api`;

// API client with auth
const api = axios.create({
  baseURL: API,
  headers: { "Content-Type": "application/json" },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Auth Context
const useAuth = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("token");
    const savedUser = localStorage.getItem("user");
    if (token && savedUser) {
      setUser(JSON.parse(savedUser));
    }
    setLoading(false);
  }, []);

  const login = async (email, password) => {
    const response = await api.post("/auth/login", { email, password });
    localStorage.setItem("token", response.data.access_token);
    localStorage.setItem("user", JSON.stringify(response.data.user));
    setUser(response.data.user);
    return response.data;
  };

  const register = async (email, password, fullName) => {
    const response = await api.post("/auth/register", {
      email,
      password,
      full_name: fullName,
    });
    localStorage.setItem("token", response.data.access_token);
    localStorage.setItem("user", JSON.stringify(response.data.user));
    setUser(response.data.user);
    return response.data;
  };

  const logout = async () => {
    try {
      await api.post("/auth/logout");
    } catch (e) {
      console.error("Logout error:", e);
    }
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setUser(null);
  };

  return { user, loading, login, register, logout };
};

// Components
const AuthForm = ({ onLogin, onRegister }) => {
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
      if (isLogin) {
        await onLogin(email, password);
      } else {
        await onRegister(email, password, fullName);
      }
    } catch (err) {
      setError(err.response?.data?.detail || "An error occurred");
    }
    setLoading(false);
  };

  return (
    <div className="auth-container" data-testid="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <h1>BlackieFi</h1>
          <p>Asset Management Platform</p>
        </div>
        <div className="auth-tabs">
          <button
            className={isLogin ? "active" : ""}
            onClick={() => setIsLogin(true)}
            data-testid="login-tab"
          >
            Login
          </button>
          <button
            className={!isLogin ? "active" : ""}
            onClick={() => setIsLogin(false)}
            data-testid="register-tab"
          >
            Register
          </button>
        </div>
        <form onSubmit={handleSubmit} data-testid="auth-form">
          {!isLogin && (
            <input
              type="text"
              placeholder="Full Name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required={!isLogin}
              data-testid="fullname-input"
            />
          )}
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            data-testid="email-input"
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            data-testid="password-input"
          />
          {error && <div className="error-message" data-testid="error-message">{error}</div>}
          <button type="submit" disabled={loading} data-testid="submit-button">
            {loading ? "Loading..." : isLogin ? "Login" : "Register"}
          </button>
        </form>
      </div>
    </div>
  );
};

const Dashboard = ({ user, onLogout }) => {
  const [activeTab, setActiveTab] = useState("overview");
  const [entities, setEntities] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [entitiesRes, accountsRes, assetsRes] = await Promise.all([
        api.get("/entities/"),
        api.get("/accounts/"),
        api.get("/assets/"),
      ]);
      setEntities(entitiesRes.data);
      setAccounts(accountsRes.data);
      setAssets(assetsRes.data);
    } catch (err) {
      console.error("Error fetching data:", err);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const totalAccountBalance = accounts.reduce((sum, a) => sum + (a.balance || 0), 0);
  const totalAssetValue = assets.reduce((sum, a) => sum + (a.value || 0), 0);

  const handleCreateEntity = async (data) => {
    try {
      await api.post("/entities/", data);
      fetchData();
      setShowModal(null);
    } catch (err) {
      alert(err.response?.data?.detail || "Error creating entity");
    }
  };

  const handleCreateAccount = async (data) => {
    try {
      await api.post("/accounts/", data);
      fetchData();
      setShowModal(null);
    } catch (err) {
      alert(err.response?.data?.detail || "Error creating account");
    }
  };

  const handleCreateAsset = async (data) => {
    try {
      await api.post("/assets/", data);
      fetchData();
      setShowModal(null);
    } catch (err) {
      alert(err.response?.data?.detail || "Error creating asset");
    }
  };

  const handleDelete = async (type, id) => {
    if (!window.confirm("Are you sure you want to delete this item?")) return;
    try {
      await api.delete(`/${type}/${id}`);
      fetchData();
    } catch (err) {
      alert(err.response?.data?.detail || "Error deleting item");
    }
  };

  return (
    <div className="dashboard" data-testid="dashboard">
      <header className="dashboard-header">
        <div className="header-left">
          <h1>BlackieFi</h1>
          <span className="version">v3.0</span>
        </div>
        <div className="header-right">
          <span className="user-name" data-testid="user-name">{user.full_name}</span>
          <button onClick={onLogout} className="logout-btn" data-testid="logout-button">
            Logout
          </button>
        </div>
      </header>

      <nav className="dashboard-nav">
        {["overview", "entities", "accounts", "assets"].map((tab) => (
          <button
            key={tab}
            className={activeTab === tab ? "active" : ""}
            onClick={() => setActiveTab(tab)}
            data-testid={`nav-${tab}`}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </nav>

      <main className="dashboard-content">
        {loading ? (
          <div className="loading" data-testid="loading">Loading...</div>
        ) : (
          <>
            {activeTab === "overview" && (
              <div className="overview" data-testid="overview-tab">
                <div className="stats-grid">
                  <div className="stat-card">
                    <h3>Total Entities</h3>
                    <p className="stat-value" data-testid="total-entities">{entities.length}</p>
                  </div>
                  <div className="stat-card">
                    <h3>Total Accounts</h3>
                    <p className="stat-value" data-testid="total-accounts">{accounts.length}</p>
                  </div>
                  <div className="stat-card">
                    <h3>Account Balance</h3>
                    <p className="stat-value" data-testid="total-balance">
                      ${totalAccountBalance.toLocaleString()}
                    </p>
                  </div>
                  <div className="stat-card">
                    <h3>Asset Value</h3>
                    <p className="stat-value" data-testid="total-asset-value">
                      ${totalAssetValue.toLocaleString()}
                    </p>
                  </div>
                </div>
                <div className="stat-card total-card">
                  <h3>Total Net Worth</h3>
                  <p className="stat-value large" data-testid="net-worth">
                    ${(totalAccountBalance + totalAssetValue).toLocaleString()}
                  </p>
                </div>
              </div>
            )}

            {activeTab === "entities" && (
              <div className="entities-tab" data-testid="entities-tab">
                <div className="tab-header">
                  <h2>Entities</h2>
                  <button onClick={() => setShowModal("entity")} data-testid="add-entity-btn">
                    + Add Entity
                  </button>
                </div>
                <div className="items-list">
                  {entities.length === 0 ? (
                    <p className="empty-state">No entities yet. Create your first entity!</p>
                  ) : (
                    entities.map((entity) => (
                      <div key={entity.id} className="item-card" data-testid={`entity-${entity.id}`}>
                        <div className="item-info">
                          <h3>{entity.name}</h3>
                          <p>Type: {entity.entity_type}</p>
                          {entity.jurisdiction && <p>Jurisdiction: {entity.jurisdiction}</p>}
                        </div>
                        <button
                          className="delete-btn"
                          onClick={() => handleDelete("entities", entity.id)}
                          data-testid={`delete-entity-${entity.id}`}
                        >
                          Delete
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {activeTab === "accounts" && (
              <div className="accounts-tab" data-testid="accounts-tab">
                <div className="tab-header">
                  <h2>Accounts</h2>
                  <button onClick={() => setShowModal("account")} data-testid="add-account-btn">
                    + Add Account
                  </button>
                </div>
                <div className="items-list">
                  {accounts.length === 0 ? (
                    <p className="empty-state">No accounts yet. Create your first account!</p>
                  ) : (
                    accounts.map((account) => (
                      <div key={account.id} className="item-card" data-testid={`account-${account.id}`}>
                        <div className="item-info">
                          <h3>{account.name}</h3>
                          <p>Type: {account.account_type}</p>
                          <p className="balance">
                            Balance: {account.currency} {account.balance?.toLocaleString()}
                          </p>
                        </div>
                        <button
                          className="delete-btn"
                          onClick={() => handleDelete("accounts", account.id)}
                          data-testid={`delete-account-${account.id}`}
                        >
                          Delete
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {activeTab === "assets" && (
              <div className="assets-tab" data-testid="assets-tab">
                <div className="tab-header">
                  <h2>Assets</h2>
                  <button onClick={() => setShowModal("asset")} data-testid="add-asset-btn">
                    + Add Asset
                  </button>
                </div>
                <div className="items-list">
                  {assets.length === 0 ? (
                    <p className="empty-state">No assets yet. Create your first asset!</p>
                  ) : (
                    assets.map((asset) => (
                      <div key={asset.id} className="item-card" data-testid={`asset-${asset.id}`}>
                        <div className="item-info">
                          <h3>{asset.name}</h3>
                          <p>Type: {asset.asset_type}</p>
                          <p className="balance">Value: ${asset.value?.toLocaleString()}</p>
                          {asset.location && <p>Location: {asset.location}</p>}
                        </div>
                        <button
                          className="delete-btn"
                          onClick={() => handleDelete("assets", asset.id)}
                          data-testid={`delete-asset-${asset.id}`}
                        >
                          Delete
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </main>

      {/* Modals */}
      {showModal === "entity" && (
        <Modal title="Add Entity" onClose={() => setShowModal(null)}>
          <EntityForm onSubmit={handleCreateEntity} onCancel={() => setShowModal(null)} />
        </Modal>
      )}
      {showModal === "account" && (
        <Modal title="Add Account" onClose={() => setShowModal(null)}>
          <AccountForm
            entities={entities}
            onSubmit={handleCreateAccount}
            onCancel={() => setShowModal(null)}
          />
        </Modal>
      )}
      {showModal === "asset" && (
        <Modal title="Add Asset" onClose={() => setShowModal(null)}>
          <AssetForm
            entities={entities}
            onSubmit={handleCreateAsset}
            onCancel={() => setShowModal(null)}
          />
        </Modal>
      )}
    </div>
  );
};

const Modal = ({ title, children, onClose }) => (
  <div className="modal-overlay" onClick={onClose} data-testid="modal-overlay">
    <div className="modal-content" onClick={(e) => e.stopPropagation()} data-testid="modal-content">
      <div className="modal-header">
        <h2>{title}</h2>
        <button className="close-btn" onClick={onClose} data-testid="modal-close">
          ×
        </button>
      </div>
      {children}
    </div>
  </div>
);

const EntityForm = ({ onSubmit, onCancel }) => {
  const [name, setName] = useState("");
  const [entityType, setEntityType] = useState("llc");
  const [jurisdiction, setJurisdiction] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({ name, entity_type: entityType, jurisdiction: jurisdiction || null });
  };

  return (
    <form onSubmit={handleSubmit} className="modal-form" data-testid="entity-form">
      <input
        type="text"
        placeholder="Entity Name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        required
        data-testid="entity-name-input"
      />
      <select
        value={entityType}
        onChange={(e) => setEntityType(e.target.value)}
        data-testid="entity-type-select"
      >
        <option value="llc">LLC</option>
        <option value="trust">Trust</option>
        <option value="corporation">Corporation</option>
      </select>
      <input
        type="text"
        placeholder="Jurisdiction (optional)"
        value={jurisdiction}
        onChange={(e) => setJurisdiction(e.target.value)}
        data-testid="entity-jurisdiction-input"
      />
      <div className="form-actions">
        <button type="button" onClick={onCancel} data-testid="entity-cancel-btn">
          Cancel
        </button>
        <button type="submit" data-testid="entity-submit-btn">
          Create Entity
        </button>
      </div>
    </form>
  );
};

const AccountForm = ({ entities, onSubmit, onCancel }) => {
  const [name, setName] = useState("");
  const [accountType, setAccountType] = useState("checking");
  const [balance, setBalance] = useState("");
  const [entityId, setEntityId] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({
      name,
      account_type: accountType,
      balance: parseFloat(balance) || 0,
      currency: "USD",
      entity_id: entityId || null,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="modal-form" data-testid="account-form">
      <input
        type="text"
        placeholder="Account Name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        required
        data-testid="account-name-input"
      />
      <select
        value={accountType}
        onChange={(e) => setAccountType(e.target.value)}
        data-testid="account-type-select"
      >
        <option value="checking">Checking</option>
        <option value="savings">Savings</option>
        <option value="investment">Investment</option>
        <option value="crypto">Crypto</option>
      </select>
      <input
        type="number"
        placeholder="Balance"
        value={balance}
        onChange={(e) => setBalance(e.target.value)}
        step="0.01"
        data-testid="account-balance-input"
      />
      <select
        value={entityId}
        onChange={(e) => setEntityId(e.target.value)}
        data-testid="account-entity-select"
      >
        <option value="">No Entity</option>
        {entities.map((e) => (
          <option key={e.id} value={e.id}>
            {e.name}
          </option>
        ))}
      </select>
      <div className="form-actions">
        <button type="button" onClick={onCancel} data-testid="account-cancel-btn">
          Cancel
        </button>
        <button type="submit" data-testid="account-submit-btn">
          Create Account
        </button>
      </div>
    </form>
  );
};

const AssetForm = ({ entities, onSubmit, onCancel }) => {
  const [name, setName] = useState("");
  const [assetType, setAssetType] = useState("real_estate");
  const [value, setValue] = useState("");
  const [location, setLocation] = useState("");
  const [entityId, setEntityId] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({
      name,
      asset_type: assetType,
      value: parseFloat(value) || 0,
      location: location || null,
      entity_id: entityId || null,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="modal-form" data-testid="asset-form">
      <input
        type="text"
        placeholder="Asset Name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        required
        data-testid="asset-name-input"
      />
      <select
        value={assetType}
        onChange={(e) => setAssetType(e.target.value)}
        data-testid="asset-type-select"
      >
        <option value="real_estate">Real Estate</option>
        <option value="precious_metals">Precious Metals</option>
        <option value="vehicle">Vehicle</option>
        <option value="collectible">Collectible</option>
        <option value="other">Other</option>
      </select>
      <input
        type="number"
        placeholder="Value"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        step="0.01"
        required
        data-testid="asset-value-input"
      />
      <input
        type="text"
        placeholder="Location (optional)"
        value={location}
        onChange={(e) => setLocation(e.target.value)}
        data-testid="asset-location-input"
      />
      <select
        value={entityId}
        onChange={(e) => setEntityId(e.target.value)}
        data-testid="asset-entity-select"
      >
        <option value="">No Entity</option>
        {entities.map((e) => (
          <option key={e.id} value={e.id}>
            {e.name}
          </option>
        ))}
      </select>
      <div className="form-actions">
        <button type="button" onClick={onCancel} data-testid="asset-cancel-btn">
          Cancel
        </button>
        <button type="submit" data-testid="asset-submit-btn">
          Create Asset
        </button>
      </div>
    </form>
  );
};

function App() {
  const { user, loading, login, register, logout } = useAuth();

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
        <Dashboard user={user} onLogout={logout} />
      ) : (
        <AuthForm onLogin={login} onRegister={register} />
      )}
    </div>
  );
}

export default App;
