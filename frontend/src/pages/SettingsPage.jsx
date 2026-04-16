import { useState, useEffect, useCallback } from "react";
import { api } from "@/lib/api";
import { Plus, Trash2, Users, Shield, Tag, Building2, Sparkles, Lock, Globe, Loader2, Check, X, Copy, CheckCircle, XCircle } from "lucide-react";

export default function SettingsPage({ entities, currentEntityId, onRefreshEntities }) {
  const [tab, setTab] = useState("categories");
  const [categories, setCategories] = useState([]);
  const [roles, setRoles] = useState([]);
  const [entityUsers, setEntityUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [catRes, roleRes] = await Promise.all([api.get("/categories/"), api.get("/roles/")]);
      setCategories(catRes.data); setRoles(roleRes.data);
      if (currentEntityId) {
        try {
          const euRes = await api.get(`/entities/${currentEntityId}/users?entity_id=${currentEntityId}`);
          setEntityUsers(euRes.data);
        } catch { setEntityUsers([]); }
      }
    } catch (e) { console.error(e); }
    setLoading(false);
  }, [currentEntityId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const tabs = [
    { key: "categories", label: "Categories", icon: <Tag size={16} /> },
    { key: "roles", label: "Roles", icon: <Shield size={16} /> },
    { key: "users", label: "Entity Users", icon: <Users size={16} /> },
    { key: "entities", label: "Entities", icon: <Building2 size={16} /> },
    { key: "ai", label: "AI Features", icon: <Sparkles size={16} /> },
    { key: "mfa", label: "Security (MFA)", icon: <Lock size={16} /> },
    { key: "currency", label: "Currency", icon: <Globe size={16} /> },
  ];

  return (
    <div className="page-content" data-testid="settings-page">
      <div className="page-header"><h2>Settings</h2></div>
      <div className="settings-tabs">
        {tabs.map(t => (
          <button key={t.key} className={tab === t.key ? "active" : ""} onClick={() => setTab(t.key)} data-testid={`settings-${t.key}-tab`}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>
      {loading && tab !== "ai" && tab !== "mfa" && tab !== "currency" ? <div className="page-loading">Loading...</div> : (
        <>
          {tab === "categories" && <CategoriesTab categories={categories} onRefresh={fetchData} />}
          {tab === "roles" && <RolesTab roles={roles} />}
          {tab === "users" && <EntityUsersTab users={entityUsers} roles={roles} entityId={currentEntityId} onRefresh={fetchData} />}
          {tab === "entities" && <EntitiesTab entities={entities} onRefresh={onRefreshEntities} />}
          {tab === "ai" && <AISettingsTab />}
          {tab === "mfa" && <MFASettingsTab />}
          {tab === "currency" && <CurrencySettingsTab />}
        </>
      )}
    </div>
  );
}

function AISettingsTab() {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get("/ai/settings").then(r => { setSettings(r.data); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  const toggle = async () => {
    setSaving(true);
    try {
      const newVal = !settings.ai_enabled;
      await api.put("/ai/settings", { ai_enabled: newVal, ollama_model: settings.ai_model || "phi" });
      setSettings(prev => ({ ...prev, ai_enabled: newVal }));
    } catch (err) { alert(err.response?.data?.detail || "Error"); }
    finally { setSaving(false); }
  };

  const updateModel = async (model) => {
    setSaving(true);
    try {
      await api.put("/ai/settings", { ai_enabled: settings.ai_enabled, ollama_model: model });
      setSettings(prev => ({ ...prev, ai_model: model }));
    } catch (e) { console.error("AI model update failed:", e.message); } finally { setSaving(false); }
  };

  if (loading) return <div className="page-loading">Loading...</div>;
  return (
    <div data-testid="ai-settings-section">
      <h3>AI Features</h3>
      <div className="settings-card">
        <div className="setting-row">
          <div>
            <strong>Enable AI Assistant</strong>
            <p className="text-muted">Use Ollama-powered AI for financial insights, chat, and auto-categorization.</p>
          </div>
          <button className={`toggle-btn ${settings?.ai_enabled ? "on" : "off"}`} onClick={toggle} disabled={saving} data-testid="ai-toggle">
            {settings?.ai_enabled ? "Enabled" : "Disabled"}
          </button>
        </div>
        <div className="setting-row">
          <div>
            <strong>AI Model</strong>
            <p className="text-muted">Select the Ollama model to use.</p>
          </div>
          <select value={settings?.ai_model || "phi"} onChange={e => updateModel(e.target.value)} disabled={saving} data-testid="ai-model-select">
            <option value="phi">Phi (Fast)</option>
            <option value="llama3">Llama 3</option>
            <option value="mistral">Mistral</option>
            <option value="codellama">Code Llama</option>
          </select>
        </div>
        <div className="setting-row">
          <div>
            <strong>AI Service Status</strong>
            <p className="text-muted">Whether the Ollama AI backend is reachable.</p>
          </div>
          <span className={`status-badge ${settings?.ai_available ? "online" : "offline"}`}>
            {settings?.ai_available ? "Online" : "Offline"}
          </span>
        </div>
      </div>
    </div>
  );
}

function MFASettingsTab() {
  const [mfaStatus, setMfaStatus] = useState(null);
  const [setupData, setSetupData] = useState(null);
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    api.get("/auth/mfa/status").then(r => { setMfaStatus(r.data); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  const startSetup = async () => {
    setError(""); setSuccess("");
    try {
      const r = await api.post("/auth/mfa/setup");
      setSetupData(r.data);
    } catch (err) { setError(err.response?.data?.detail || "Error"); }
  };

  const verifyCode = async () => {
    setError(""); setSuccess("");
    try {
      await api.post("/auth/mfa/verify", { code });
      setSuccess("MFA enabled successfully!");
      setMfaStatus({ mfa_enabled: true });
      setSetupData(null);
      setCode("");
    } catch (err) { setError(err.response?.data?.detail || "Invalid code"); }
  };

  const disableMFA = async () => {
    setError(""); setSuccess("");
    if (!code) { setError("Enter your current MFA code to disable"); return; }
    try {
      await api.post("/auth/mfa/disable", { code });
      setSuccess("MFA disabled");
      setMfaStatus({ mfa_enabled: false });
      setCode("");
    } catch (err) { setError(err.response?.data?.detail || "Invalid code"); }
  };

  if (loading) return <div className="page-loading">Loading...</div>;
  return (
    <div data-testid="mfa-settings-section">
      <h3>Two-Factor Authentication (MFA)</h3>
      <div className="settings-card">
        <div className="setting-row">
          <div>
            <strong>MFA Status</strong>
            <p className="text-muted">Secure your account with TOTP-based two-factor authentication (Google Authenticator compatible).</p>
          </div>
          <span className={`status-badge ${mfaStatus?.mfa_enabled ? "online" : "offline"}`}>
            {mfaStatus?.mfa_enabled ? "Enabled" : "Disabled"}
          </span>
        </div>
        {error && <div className="error-message">{error}</div>}
        {success && <div className="success-message"><Check size={16} /> {success}</div>}
        {!mfaStatus?.mfa_enabled && !setupData && (
          <button className="btn-primary" onClick={startSetup} data-testid="mfa-setup-btn">
            <Lock size={16} /> Set Up MFA
          </button>
        )}
        {setupData && (
          <div className="mfa-setup" data-testid="mfa-setup-form">
            <p>Scan this QR code with Google Authenticator or a TOTP app:</p>
            <div className="mfa-qr"><img src={setupData.qr_code} alt="MFA QR Code" data-testid="mfa-qr-code" /></div>
            <div className="mfa-secret">
              <span>Manual key: <code>{setupData.secret}</code></span>
              <button className="btn-icon-sm" onClick={() => navigator.clipboard.writeText(setupData.secret)}><Copy size={14} /></button>
            </div>
            <div className="form-row">
              <input type="text" placeholder="Enter 6-digit code" value={code} onChange={e => setCode(e.target.value)}
                     maxLength={6} data-testid="mfa-code-input" />
              <button className="btn-primary" onClick={verifyCode} disabled={code.length !== 6} data-testid="mfa-verify-btn">Verify & Enable</button>
            </div>
          </div>
        )}
        {mfaStatus?.mfa_enabled && (
          <div className="mfa-disable" data-testid="mfa-disable-form">
            <p className="text-muted">Enter your current MFA code to disable two-factor authentication:</p>
            <div className="form-row">
              <input type="text" placeholder="Enter 6-digit code" value={code} onChange={e => setCode(e.target.value)}
                     maxLength={6} data-testid="mfa-disable-code" />
              <button className="btn-danger" onClick={disableMFA} disabled={code.length !== 6} data-testid="mfa-disable-btn">Disable MFA</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function CurrencySettingsTab() {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [rates, setRates] = useState({});
  const [convertFrom, setConvertFrom] = useState("USD");
  const [convertTo, setConvertTo] = useState("EUR");
  const [convertAmount, setConvertAmount] = useState("100");
  const [convertResult, setConvertResult] = useState(null);

  useEffect(() => {
    Promise.all([api.get("/currency/settings"), api.get("/currency/rates")])
      .then(([s, r]) => { setSettings(s.data); setRates(r.data.rates); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const updateBase = async (curr) => {
    setSaving(true);
    try {
      await api.put("/currency/settings", { base_currency: curr, display_currencies: settings.display_currencies });
      setSettings(prev => ({ ...prev, base_currency: curr }));
    } catch (e) { console.error("Currency update failed:", e.message); } finally { setSaving(false); }
  };

  const convert = async () => {
    try {
      const r = await api.get(`/currency/convert?amount=${convertAmount}&from_currency=${convertFrom}&to_currency=${convertTo}`);
      setConvertResult(r.data);
    } catch (e) { console.error("Currency conversion failed:", e.message); }
  };

  if (loading) return <div className="page-loading">Loading...</div>;
  return (
    <div data-testid="currency-settings-section">
      <h3>Currency Settings</h3>
      <div className="settings-card">
        <div className="setting-row">
          <div>
            <strong>Base Currency</strong>
            <p className="text-muted">All amounts will be displayed in this currency.</p>
          </div>
          <select value={settings?.base_currency || "USD"} onChange={e => updateBase(e.target.value)} disabled={saving} data-testid="base-currency-select">
            {(settings?.supported || []).map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      </div>
      <div className="settings-card" style={{ marginTop: "16px" }}>
        <h4>Currency Converter</h4>
        <div className="converter-row" data-testid="currency-converter">
          <input type="number" value={convertAmount} onChange={e => setConvertAmount(e.target.value)} data-testid="convert-amount" />
          <select value={convertFrom} onChange={e => setConvertFrom(e.target.value)} data-testid="convert-from">
            {(settings?.supported || []).map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <span className="convert-arrow">&#8594;</span>
          <select value={convertTo} onChange={e => setConvertTo(e.target.value)} data-testid="convert-to">
            {(settings?.supported || []).map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <button className="btn-primary" onClick={convert} data-testid="convert-btn">Convert</button>
        </div>
        {convertResult && (
          <div className="convert-result" data-testid="convert-result">
            <strong>{convertResult.amount} {convertResult.from}</strong> = <strong>{convertResult.result} {convertResult.to}</strong>
            <span className="text-muted"> (Rate: {convertResult.rate})</span>
          </div>
        )}
      </div>
    </div>
  );
}

function CategoriesTab({ categories, onRefresh }) {
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [color, setColor] = useState("#64748b");

  const handleCreate = async (e) => {
    e.preventDefault();
    try { await api.post("/categories/", { name, color }); setShowForm(false); setName(""); onRefresh(); }
    catch (err) { alert(err.response?.data?.detail || "Error"); }
  };
  const handleDelete = async (id) => {
    if (!window.confirm("Delete category?")) return;
    try { await api.delete(`/categories/${id}`); onRefresh(); } catch (err) { alert(err.response?.data?.detail || "Error"); }
  };

  return (
    <div data-testid="categories-section">
      <div className="section-header">
        <h3>Categories</h3>
        <button className="btn-primary btn-sm" onClick={() => setShowForm(!showForm)} data-testid="add-category-btn"><Plus size={14} /> Add</button>
      </div>
      {showForm && (
        <form onSubmit={handleCreate} className="inline-form">
          <input type="text" placeholder="Category name" value={name} onChange={e => setName(e.target.value)} required />
          <input type="color" value={color} onChange={e => setColor(e.target.value)} />
          <button type="submit" className="btn-sm btn-primary">Save</button>
          <button type="button" className="btn-sm" onClick={() => setShowForm(false)}>Cancel</button>
        </form>
      )}
      <div className="settings-list">
        {categories.map(c => (
          <div key={c.id} className="settings-item">
            <span className="cat-dot" style={{ background: c.color }} />
            <span>{c.name}</span>
            {c.is_default && <span className="badge-sm">Default</span>}
            {!c.is_default && <button className="btn-icon btn-danger-icon" onClick={() => handleDelete(c.id)}><Trash2 size={14} /></button>}
          </div>
        ))}
      </div>
    </div>
  );
}

function RolesTab({ roles }) {
  const [editingRole, setEditingRole] = useState(null);
  const [editPerms, setEditPerms] = useState({});
  const [saving, setSaving] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [newRoleName, setNewRoleName] = useState("");
  const [newDisplayName, setNewDisplayName] = useState("");
  const [localRoles, setLocalRoles] = useState(roles);

  useEffect(() => { setLocalRoles(roles); }, [roles]);

  const PERM_GROUPS = {
    "Financial": ["view_transactions", "create_transaction", "edit_transaction", "delete_transaction", "manage_income", "manage_expenses", "manage_debts"],
    "Budgets & Savings": ["view_budgets", "manage_budgets", "manage_savings_funds"],
    "Investments": ["view_investments", "manage_investments", "manage_accounts"],
    "Administration": ["manage_categories", "manage_entities", "manage_users", "manage_roles"],
    "Other": ["view_reports", "manage_calendar"],
  };

  const startEdit = (role) => {
    setEditingRole(role.id);
    setEditPerms({ ...role.permissions });
  };

  const cancelEdit = () => {
    setEditingRole(null);
    setEditPerms({});
  };

  const savePermissions = async (roleId) => {
    setSaving(true);
    try {
      await api.put(`/roles/${roleId}/permissions`, editPerms);
      setLocalRoles(prev => prev.map(r => r.id === roleId ? { ...r, permissions: { ...editPerms } } : r));
      setEditingRole(null);
    } catch (err) {
      alert(err.response?.data?.detail || "Error saving permissions");
    }
    setSaving(false);
  };

  const togglePerm = (key) => {
    setEditPerms(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const toggleAll = (keys, value) => {
    setEditPerms(prev => {
      const updated = { ...prev };
      keys.forEach(k => { updated[k] = value; });
      return updated;
    });
  };

  const handleCreateRole = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const defaultPerms = {};
      Object.values(PERM_GROUPS).flat().forEach(k => { defaultPerms[k] = false; });
      const res = await api.post("/roles/", { name: newRoleName.toLowerCase().replace(/\s+/g, "_"), display_name: newDisplayName || newRoleName, permissions: defaultPerms });
      setLocalRoles(prev => [...prev, res.data]);
      setShowCreate(false);
      setNewRoleName("");
      setNewDisplayName("");
    } catch (err) {
      alert(err.response?.data?.detail || "Error creating role");
    }
    setSaving(false);
  };

  const handleDeleteRole = async (roleId) => {
    if (!window.confirm("Delete this custom role?")) return;
    try {
      await api.delete(`/roles/${roleId}`);
      setLocalRoles(prev => prev.filter(r => r.id !== roleId));
    } catch (err) {
      alert(err.response?.data?.detail || "Error deleting role");
    }
  };

  return (
    <div data-testid="roles-section">
      <div className="section-header">
        <h3>Roles & Permissions</h3>
        <button className="btn-primary btn-sm" onClick={() => setShowCreate(!showCreate)} data-testid="create-role-btn">
          <Plus size={14} /> Create Role
        </button>
      </div>

      {showCreate && (
        <form onSubmit={handleCreateRole} className="inline-form" style={{ marginBottom: "1rem" }}>
          <input type="text" placeholder="Role name (e.g. viewer)" value={newRoleName}
            onChange={e => setNewRoleName(e.target.value)} required data-testid="new-role-name" />
          <input type="text" placeholder="Display name (e.g. Viewer)" value={newDisplayName}
            onChange={e => setNewDisplayName(e.target.value)} data-testid="new-role-display" />
          <button type="submit" className="btn-sm btn-primary" disabled={saving} data-testid="submit-create-role">Create</button>
          <button type="button" className="btn-sm" onClick={() => setShowCreate(false)}>Cancel</button>
        </form>
      )}

      <div className="roles-grid">
        {localRoles.map(role => {
          const isEditing = editingRole === role.id;
          const perms = isEditing ? editPerms : (role.permissions || {});

          return (
            <div key={role.id} className={`role-card ${isEditing ? "editing" : ""}`} data-testid={`role-card-${role.name}`}>
              <div className="role-card-header">
                <h4>{role.display_name || role.name}</h4>
                <div className="role-card-actions">
                  {isEditing ? (
                    <>
                      <button className="btn-icon-xs btn-success-icon" onClick={() => savePermissions(role.id)}
                        disabled={saving} data-testid={`save-perms-${role.name}`} title="Save">
                        {saving ? <Loader2 size={14} className="spin" /> : <Check size={14} />}
                      </button>
                      <button className="btn-icon-xs" onClick={cancelEdit} data-testid={`cancel-perms-${role.name}`} title="Cancel">
                        <X size={14} />
                      </button>
                    </>
                  ) : (
                    <>
                      <button className="btn-icon-xs" onClick={() => startEdit(role)} data-testid={`edit-perms-${role.name}`} title="Edit">
                        <Shield size={14} />
                      </button>
                      {!role.is_default && (
                        <button className="btn-icon-xs btn-danger-icon" onClick={() => handleDeleteRole(role.id)}
                          data-testid={`delete-role-${role.name}`} title="Delete role">
                          <Trash2 size={14} />
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>

              {Object.entries(PERM_GROUPS).map(([group, keys]) => {
                const groupPerms = keys.filter(k => k in perms);
                if (groupPerms.length === 0) return null;
                const allOn = groupPerms.every(k => perms[k]);
                const allOff = groupPerms.every(k => !perms[k]);

                return (
                  <div key={group} className="perm-group">
                    <div className="perm-group-header">
                      <span className="perm-group-label">{group}</span>
                      {isEditing && (
                        <button
                          className={`perm-group-toggle ${allOn ? "all-on" : allOff ? "all-off" : "mixed"}`}
                          onClick={() => toggleAll(groupPerms, !allOn)}
                          data-testid={`toggle-group-${group.replace(/\s+/g, "-").toLowerCase()}-${role.name}`}
                        >
                          {allOn ? "All On" : allOff ? "All Off" : "Mixed"}
                        </button>
                      )}
                    </div>
                    <div className="permissions-list">
                      {groupPerms.map(key => (
                        <div key={key} className="perm-row">
                          <span>{key.replace(/_/g, " ")}</span>
                          {isEditing ? (
                            <button
                              className={`perm-toggle ${perms[key] ? "on" : "off"}`}
                              onClick={() => togglePerm(key)}
                              data-testid={`perm-${key}-${role.name}`}
                            >
                              {perms[key] ? <CheckCircle size={16} /> : <XCircle size={16} />}
                            </button>
                          ) : (
                            <span className={perms[key] ? "perm-on" : "perm-off"}>{perms[key] ? "Yes" : "No"}</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}

              {role.is_default && <span className="role-default-badge">Default</span>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function EntityUsersTab({ users, roles, entityId, onRefresh }) {
  const [showInvite, setShowInvite] = useState(false);
  const [email, setEmail] = useState("");
  const [roleName, setRoleName] = useState("regular_user");
  const handleInvite = async (e) => {
    e.preventDefault();
    try {
      await api.post(`/entities/${entityId}/invite?entity_id=${entityId}`, { email, role_name: roleName });
      setShowInvite(false); setEmail(""); onRefresh(); alert("User invited!");
    } catch (err) { alert(err.response?.data?.detail || "Error"); }
  };
  const handleRoleChange = async (userId, newRole) => {
    try { await api.put(`/entities/${entityId}/users/${userId}/role?entity_id=${entityId}&role_name=${newRole}`); onRefresh(); }
    catch (err) { alert(err.response?.data?.detail || "Error"); }
  };
  return (
    <div data-testid="entity-users-section">
      <div className="section-header">
        <h3>Entity Users</h3>
        <button className="btn-primary btn-sm" onClick={() => setShowInvite(!showInvite)} data-testid="invite-user-btn"><Plus size={14} /> Invite</button>
      </div>
      {showInvite && (
        <form onSubmit={handleInvite} className="inline-form">
          <input type="email" placeholder="Email address" value={email} onChange={e => setEmail(e.target.value)} required data-testid="invite-email-input" />
          <select value={roleName} onChange={e => setRoleName(e.target.value)}>
            {roles.map(r => <option key={r.id} value={r.name}>{r.display_name || r.name}</option>)}
          </select>
          <button type="submit" className="btn-sm btn-primary" data-testid="invite-submit-btn">Invite</button>
        </form>
      )}
      <div className="settings-list">
        {users.map(u => (
          <div key={u.id} className="settings-item">
            <div><span className="user-name-sm">{u.user_name || u.user_email}</span><span className="text-muted"> ({u.user_email})</span></div>
            <select value={u.role_name} onChange={e => handleRoleChange(u.user_id, e.target.value)} className="role-select">
              {roles.map(r => <option key={r.id} value={r.name}>{r.display_name || r.name}</option>)}
            </select>
            <span className={u.is_active ? "badge-green" : "badge-red"}>{u.is_active ? "Active" : "Inactive"}</span>
          </div>
        ))}
        {users.length === 0 && <p className="text-muted">No users assigned to this entity.</p>}
      </div>
    </div>
  );
}

function EntitiesTab({ entities, onRefresh }) {
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [businessType, setBusinessType] = useState("llc");
  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await api.post("/entities/", { name, entity_type: "business", business_type: businessType });
      setShowForm(false); setName(""); if (onRefresh) onRefresh(); alert("Business created!");
    } catch (err) { alert(err.response?.data?.detail || "Error"); }
  };
  const handleDelete = async (id) => {
    if (!window.confirm("Delete this entity?")) return;
    try { await api.delete(`/entities/${id}`); if (onRefresh) onRefresh(); } catch (err) { alert(err.response?.data?.detail || "Error"); }
  };
  return (
    <div data-testid="entities-section">
      <div className="section-header">
        <h3>Entities</h3>
        <button className="btn-primary btn-sm" onClick={() => setShowForm(!showForm)} data-testid="add-entity-btn"><Plus size={14} /> Add Business</button>
      </div>
      {showForm && (
        <form onSubmit={handleCreate} className="inline-form">
          <input type="text" placeholder="Business name" value={name} onChange={e => setName(e.target.value)} required />
          <select value={businessType} onChange={e => setBusinessType(e.target.value)}>
            <option value="llc">LLC</option><option value="corporation">Corporation</option>
            <option value="trust">Trust</option><option value="sole_proprietorship">Sole Proprietorship</option>
          </select>
          <button type="submit" className="btn-sm btn-primary">Create</button>
        </form>
      )}
      <div className="settings-list">
        {entities.map(e => (
          <div key={e.id} className="settings-item">
            <span>{e.name}</span>
            <span className="badge-sm">{e.is_personal ? "Personal" : e.entity_type}</span>
            {!e.is_personal && <button className="btn-icon btn-danger-icon" onClick={() => handleDelete(e.id)}><Trash2 size={14} /></button>}
          </div>
        ))}
      </div>
    </div>
  );
}
