import { useState, useEffect, useCallback } from "react";
import { api } from "@/lib/api";
import { Plus, Trash2, Edit2, X, TrendingUp } from "lucide-react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";

const COLORS = ["#f59e0b", "#3b82f6", "#22c55e", "#ef4444", "#8b5cf6", "#06b6d4", "#ec4899"];

export default function InvestmentsPage() {
  const [vehicles, setVehicles] = useState([]);
  const [holdings, setHoldings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showVehicleForm, setShowVehicleForm] = useState(false);
  const [showHoldingForm, setShowHoldingForm] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState(null);
  const [editingHolding, setEditingHolding] = useState(null);
  const [selectedVehicle, setSelectedVehicle] = useState(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [vRes, hRes] = await Promise.all([api.get("/investments/vehicles/"), api.get("/investments/holdings/")]);
      setVehicles(vRes.data); setHoldings(hRes.data);
    } catch (e) { console.error(e); }
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleDeleteVehicle = async (id) => {
    if (!window.confirm("Delete vehicle and all holdings?")) return;
    await api.delete(`/investments/vehicles/${id}`); fetchData();
  };

  const handleDeleteHolding = async (id) => {
    if (!window.confirm("Delete this holding?")) return;
    await api.delete(`/investments/holdings/${id}`); fetchData();
  };

  const handleSaveVehicle = async (data) => {
    try {
      if (editingVehicle) await api.put(`/investments/vehicles/${editingVehicle.id}`, data);
      else await api.post("/investments/vehicles/", data);
      setShowVehicleForm(false); setEditingVehicle(null); fetchData();
    } catch (e) { alert(e.response?.data?.detail || "Error"); }
  };

  const handleSaveHolding = async (data) => {
    try {
      if (editingHolding) await api.put(`/investments/holdings/${editingHolding.id}`, data);
      else await api.post("/investments/holdings/", data);
      setShowHoldingForm(false); setEditingHolding(null); fetchData();
    } catch (e) { alert(e.response?.data?.detail || "Error"); }
  };

  const totalValue = holdings.reduce((s, h) => s + ((h.current_price || h.cost_basis) * h.quantity), 0);
  const totalCost = holdings.reduce((s, h) => s + (h.cost_basis * h.quantity), 0);
  const gain = totalValue - totalCost;

  const pieData = vehicles.map(v => {
    const vHoldings = holdings.filter(h => h.vehicle_id === v.id);
    return { name: v.name, value: vHoldings.reduce((s, h) => s + ((h.current_price || h.cost_basis) * h.quantity), 0) };
  }).filter(d => d.value > 0);

  const filtered = selectedVehicle ? holdings.filter(h => h.vehicle_id === selectedVehicle) : holdings;

  return (
    <div className="page-content" data-testid="investments-page">
      <div className="page-header">
        <h2>Investments</h2>
        <div className="header-stats">
          <span className="badge-green">Value: ${totalValue.toLocaleString()}</span>
          <span className={gain >= 0 ? "badge-green" : "badge-red"}>{gain >= 0 ? "+" : ""}${gain.toLocaleString()}</span>
        </div>
      </div>

      <div className="investment-layout">
        <div className="vehicles-section">
          <div className="section-header">
            <h3>Vehicles</h3>
            <button className="btn-primary btn-sm" onClick={() => { setEditingVehicle(null); setShowVehicleForm(true); }} data-testid="add-vehicle-btn">
              <Plus size={14} /> Add
            </button>
          </div>
          <div className="vehicle-list">
            <button className={`vehicle-tab ${!selectedVehicle ? 'active' : ''}`} onClick={() => setSelectedVehicle(null)}>All</button>
            {vehicles.map(v => (
              <div key={v.id} className={`vehicle-tab-row ${selectedVehicle === v.id ? 'active' : ''}`}>
                <button className="vehicle-tab" onClick={() => setSelectedVehicle(v.id)}>{v.name} ({v.vehicle_type})</button>
                <button className="btn-icon btn-danger-icon" onClick={() => handleDeleteVehicle(v.id)}><Trash2 size={12} /></button>
              </div>
            ))}
          </div>
          {pieData.length > 0 && (
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={40} outerRadius={70} paddingAngle={3}>
                  {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={{background: '#1e293b', border: '1px solid #334155', borderRadius: 8, color: '#f8fafc'}} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="holdings-section">
          <div className="section-header">
            <h3>Holdings</h3>
            <button className="btn-primary btn-sm" onClick={() => { setEditingHolding(null); setShowHoldingForm(true); }} data-testid="add-holding-btn">
              <Plus size={14} /> Add
            </button>
          </div>
          {filtered.length === 0 ? (
            <div className="empty-state">No holdings found.</div>
          ) : (
            <div className="holdings-grid">
              {filtered.map(h => {
                const value = (h.current_price || h.cost_basis) * h.quantity;
                const cost = h.cost_basis * h.quantity;
                const hGain = value - cost;
                return (
                  <div key={h.id} className="holding-card" data-testid={`holding-${h.id}`}>
                    <div className="holding-header">
                      <span className="holding-symbol">{h.asset_name}</span>
                      <span className={hGain >= 0 ? "text-green" : "text-red"}>{hGain >= 0 ? "+" : ""}{((hGain / Math.max(cost, 1)) * 100).toFixed(1)}%</span>
                    </div>
                    <p>Qty: {h.quantity} | Basis: ${h.cost_basis}</p>
                    <p className="balance">${value.toLocaleString()}</p>
                    <div className="item-actions">
                      <button className="btn-sm" onClick={() => { setEditingHolding(h); setShowHoldingForm(true); }}><Edit2 size={12} /></button>
                      <button className="btn-sm btn-danger" onClick={() => handleDeleteHolding(h.id)}><Trash2 size={12} /></button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {showVehicleForm && (
        <div className="modal-overlay" onClick={() => setShowVehicleForm(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header"><h2>{editingVehicle ? "Edit" : "Add"} Vehicle</h2><button className="close-btn" onClick={() => setShowVehicleForm(false)}><X size={18} /></button></div>
            <VehicleForm initial={editingVehicle} onSave={handleSaveVehicle} onClose={() => setShowVehicleForm(false)} />
          </div>
        </div>
      )}
      {showHoldingForm && (
        <div className="modal-overlay" onClick={() => setShowHoldingForm(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header"><h2>{editingHolding ? "Edit" : "Add"} Holding</h2><button className="close-btn" onClick={() => setShowHoldingForm(false)}><X size={18} /></button></div>
            <HoldingForm initial={editingHolding} vehicles={vehicles} selectedVehicle={selectedVehicle} onSave={handleSaveHolding} onClose={() => setShowHoldingForm(false)} />
          </div>
        </div>
      )}
    </div>
  );
}

function VehicleForm({ initial, onSave, onClose }) {
  const [name, setName] = useState(initial?.name || "");
  const [vehicleType, setVehicleType] = useState(initial?.vehicle_type || "brokerage");
  const [provider, setProvider] = useState(initial?.provider || "");

  return (
    <form onSubmit={e => { e.preventDefault(); onSave({ name, vehicle_type: vehicleType, provider: provider || null }); }} className="modal-form">
      <input type="text" placeholder="Vehicle Name" value={name} onChange={e => setName(e.target.value)} required />
      <select value={vehicleType} onChange={e => setVehicleType(e.target.value)}>
        <option value="401k">401(k)</option><option value="ira">IRA</option><option value="brokerage">Brokerage</option>
        <option value="crypto">Crypto</option><option value="other">Other</option>
      </select>
      <input type="text" placeholder="Provider (optional)" value={provider} onChange={e => setProvider(e.target.value)} />
      <div className="form-actions"><button type="button" onClick={onClose}>Cancel</button><button type="submit">Save</button></div>
    </form>
  );
}

function HoldingForm({ initial, vehicles, selectedVehicle, onSave, onClose }) {
  const [vehicleId, setVehicleId] = useState(initial?.vehicle_id || selectedVehicle || "");
  const [assetName, setAssetName] = useState(initial?.asset_name || "");
  const [quantity, setQuantity] = useState(initial?.quantity || "");
  const [costBasis, setCostBasis] = useState(initial?.cost_basis || "");
  const [currentPrice, setCurrentPrice] = useState(initial?.current_price || "");

  return (
    <form onSubmit={e => { e.preventDefault(); onSave({ vehicle_id: vehicleId, asset_name: assetName, quantity: parseFloat(quantity) || 0,
      cost_basis: parseFloat(costBasis) || 0, current_price: parseFloat(currentPrice) || null }); }} className="modal-form">
      <select value={vehicleId} onChange={e => setVehicleId(e.target.value)} required>
        <option value="">Select Vehicle</option>
        {vehicles.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
      </select>
      <input type="text" placeholder="Asset Name/Symbol" value={assetName} onChange={e => setAssetName(e.target.value)} required />
      <input type="number" placeholder="Quantity" value={quantity} onChange={e => setQuantity(e.target.value)} step="0.001" required />
      <input type="number" placeholder="Cost Basis (per unit)" value={costBasis} onChange={e => setCostBasis(e.target.value)} step="0.01" required />
      <input type="number" placeholder="Current Price (optional)" value={currentPrice} onChange={e => setCurrentPrice(e.target.value)} step="0.01" />
      <div className="form-actions"><button type="button" onClick={onClose}>Cancel</button><button type="submit">Save</button></div>
    </form>
  );
}
