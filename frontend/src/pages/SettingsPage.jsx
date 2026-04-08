import { useState, useEffect, useCallback } from "react";
import { api } from "@/lib/api";
import { Plus, Trash2, Edit2, X, Users, Shield, Tag, Building2 } from "lucide-react";

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
        } catch (e) { setEntityUsers([]); }
      }
    } catch (e) { console.error(e); }
    setLoading(false);
  }, [currentEntityId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  return (
    <div className="page-content" data-testid="settings-page">
      <div className="page-header"><h2>Settings</h2></div>

      <div className="settings-tabs">
        <button className={tab === "categories" ? "active" : ""} onClick={() => setTab("categories")} data-testid="settings-categories-tab">
          <Tag size={16} /> Categories
        </button>
        <button className={tab === "roles" ? "active" : ""} onClick={() => setTab("roles")} data-testid="settings-roles-tab">
          <Shield size={16} /> Roles
        </button>
        <button className={tab === "users" ? "active" : ""} onClick={() => setTab("users")} data-testid="settings-users-tab">
          <Users size={16} /> Entity Users
        </button>
        <button className={tab === "entities" ? "active" : ""} onClick={() => setTab("entities")} data-testid="settings-entities-tab">
          <Building2 size={16} /> Entities
        </button>
      </div>

      {loading ? <div className="page-loading">Loading...</div> : (
        <>
          {tab === "categories" && <CategoriesTab categories={categories} onRefresh={fetchData} />}
          {tab === "roles" && <RolesTab roles={roles} onRefresh={fetchData} />}
          {tab === "users" && <EntityUsersTab users={entityUsers} roles={roles} entityId={currentEntityId} onRefresh={fetchData} />}
          {tab === "entities" && <EntitiesTab entities={entities} onRefresh={onRefreshEntities} />}
        </>
      )}
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
    try { await api.delete(`/categories/${id}`); onRefresh(); }
    catch (err) { alert(err.response?.data?.detail || "Error"); }
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
            {!c.is_default && (
              <button className="btn-icon btn-danger-icon" onClick={() => handleDelete(c.id)}><Trash2 size={14} /></button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function RolesTab({ roles }) {
  return (
    <div data-testid="roles-section">
      <h3>Roles & Permissions</h3>
      <div className="roles-grid">
        {roles.map(role => (
          <div key={role.id} className="role-card">
            <h4>{role.display_name || role.name}</h4>
            <div className="permissions-list">
              {Object.entries(role.permissions || {}).map(([key, val]) => (
                <div key={key} className="perm-row">
                  <span>{key.replace(/_/g, " ")}</span>
                  <span className={val ? "perm-on" : "perm-off"}>{val ? "Yes" : "No"}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
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
    try {
      await api.put(`/entities/${entityId}/users/${userId}/role?entity_id=${entityId}&role_name=${newRole}`);
      onRefresh();
    } catch (err) { alert(err.response?.data?.detail || "Error"); }
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
            <div>
              <span className="user-name-sm">{u.user_name || u.user_email}</span>
              <span className="text-muted"> ({u.user_email})</span>
            </div>
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
    try { await api.delete(`/entities/${id}`); if (onRefresh) onRefresh(); }
    catch (err) { alert(err.response?.data?.detail || "Error"); }
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
            {!e.is_personal && (
              <button className="btn-icon btn-danger-icon" onClick={() => handleDelete(e.id)}><Trash2 size={14} /></button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
