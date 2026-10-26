import React, { useState, useEffect } from "react";
import { createRoot } from "react-dom/client";
import {
  LayoutDashboard, Package, ShoppingCart, Truck, Bot,
  Menu, Search, TrendingUp, AlertTriangle,
  ArrowUpRight, ArrowDownRight, ChevronRight, Boxes, FileSpreadsheet,
  Plus, Download, Mail, RefreshCw, Eye, Check,
  Lock, User, LogOut, ShieldCheck, EyeOff
} from "lucide-react";
import "./styles.css";

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:5000/api";

function money(amount) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2
  }).format(amount || 0);
}

// Display stock in packets
function displayStockPacks(product, value = product?.stock) {
  if (value == null) return "—";
  const num = Number(value) || 0;
  const packSize = Number(product?.packSize) || (product?.unit === "kg" ? 1000 : 80);
  const packUnit = product?.packSizeUnit || "GM";
  return `${num} packs (${packSize} ${packUnit})`;
}

// Format sale quantity in grams only
function formatQuantityInGrams(quantity, product) {
  if (quantity == null) return "—";
  const packs = Number(quantity) || 0;
  const packSize = Number(product?.packSize) || (product?.unit === "kg" ? 1000 : 80);
  const totalGrams = packs * packSize;
  return `${totalGrams.toLocaleString("en-IN")} GM (${packs} packs)`;
}

function PageTitle({ title, subtitle, action }) {
  return (
    <div className="page-title">
      <div>
        <h1>{title}</h1>
        <p>{subtitle}</p>
      </div>
      {action && <div>{action}</div>}
    </div>
  );
}

function Kpi({ title, value, change, up, warn, icon: Icon }) {
  return (
    <div className="kpi">
      <div className={`kpi-icon ${warn ? "warning" : ""}`}>
        <Icon size={20} />
      </div>
      <div className="kpi-title">{title}</div>
      <div className="kpi-value">{value}</div>
      <div className={`kpi-change ${warn ? "danger" : up ? "up" : ""}`}>
        {up ? <ArrowUpRight size={15} /> : warn ? <AlertTriangle size={14} /> : <ArrowDownRight size={15} />} {change}
      </div>
    </div>
  );
}

function LoginPage({ onLogin }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const u = username.trim().toLowerCase();
      const p = password.trim();

      if (!u || !p) {
        throw new Error("Please enter both username and password.");
      }

      const res = await fetch(`${API_BASE}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: u, password: p })
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data.message || "Invalid username or password.");
      }

      onLogin(data.user, rememberMe);
    } catch (err) {
      setError(err.message || "Authentication failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: "radial-gradient(circle at 50% 20%, #1e3a34 0%, #0d1f1b 60%, #081210 100%)",
      padding: "20px",
      fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif"
    }}>
      <div style={{
        position: "relative",
        background: "#ffffff",
        borderRadius: "16px",
        padding: "40px 34px",
        maxWidth: "420px",
        width: "100%",
        boxShadow: "0 25px 60px -15px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.1)",
        zIndex: 1
      }}>
        {/* Brand Icon & Heading */}
        <div style={{ textAlign: "center", marginBottom: "26px" }}>
          <div style={{
            width: "56px",
            height: "56px",
            margin: "0 auto 14px",
            borderRadius: "14px",
            background: "linear-gradient(135deg, #1f6f5b 0%, #114b3d 100%)",
            color: "white",
            display: "grid",
            placeItems: "center",
            boxShadow: "0 10px 20px -5px rgba(31, 111, 91, 0.4)"
          }}>
            <Package size={28} />
          </div>
          <h2 style={{ margin: "0 0 6px", fontSize: "22px", fontWeight: 800, color: "#0f172a", letterSpacing: "-0.02em" }}>
            Cashew Business Portal
          </h2>
          <p style={{ margin: 0, fontSize: "13px", color: "#64748b", fontWeight: 500 }}>
            Mumbai Operations &bull; Authorized Management Access
          </p>
        </div>

        {error && (
          <div style={{
            background: "#fef2f2",
            border: "1px solid #fecaca",
            color: "#991b1b",
            padding: "10px 14px",
            borderRadius: "8px",
            fontSize: "13px",
            marginBottom: "18px",
            display: "flex",
            alignItems: "center",
            gap: "8px"
          }}>
            <AlertTriangle size={16} style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: "16px" }}>
            <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "#334155", marginBottom: "6px" }}>
              Username or ID
            </label>
            <div style={{ position: "relative" }}>
              <User size={16} style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "#94a3b8" }} />
              <input
                required
                type="text"
                autoFocus
                placeholder="e.g. admin"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                style={{
                  width: "100%",
                  padding: "11px 12px 11px 38px",
                  border: "1px solid #cbd5e1",
                  borderRadius: "8px",
                  fontSize: "14px",
                  color: "#0f172a",
                  outline: "none",
                  boxSizing: "border-box"
                }}
              />
            </div>
          </div>

          <div style={{ marginBottom: "18px" }}>
            <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "#334155", marginBottom: "6px" }}>
              Password
            </label>
            <div style={{ position: "relative" }}>
              <Lock size={16} style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "#94a3b8" }} />
              <input
                required
                type={showPassword ? "text" : "password"}
                placeholder="Enter password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{
                  width: "100%",
                  padding: "11px 38px 11px 38px",
                  border: "1px solid #cbd5e1",
                  borderRadius: "8px",
                  fontSize: "14px",
                  color: "#0f172a",
                  outline: "none",
                  boxSizing: "border-box"
                }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: "absolute",
                  right: "12px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  background: "none",
                  border: "none",
                  padding: 0,
                  cursor: "pointer",
                  color: "#94a3b8"
                }}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "22px", fontSize: "13px" }}>
            <label style={{ display: "flex", alignItems: "center", gap: "8px", color: "#475569", cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                style={{ accentColor: "#1f6f5b", cursor: "pointer" }}
              />
              Remember this device
            </label>
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              width: "100%",
              padding: "12px",
              background: "#1f6f5b",
              color: "#ffffff",
              border: "none",
              borderRadius: "8px",
              fontSize: "14px",
              fontWeight: 700,
              cursor: loading ? "not-allowed" : "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
              boxShadow: "0 4px 12px rgba(31, 111, 91, 0.25)",
              transition: "background 0.2s"
            }}
          >
            <ShieldCheck size={18} />
            {loading ? "Authenticating..." : "Sign In to Management Portal"}
          </button>
        </form>

        <div style={{
          marginTop: "24px",
          paddingTop: "16px",
          borderTop: "1px solid #f1f5f9",
          textAlign: "center",
          fontSize: "11.5px",
          color: "#94a3b8"
        }}>
          &bull; Encrypted Portal Session &bull; Mumbai Branch &bull;
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const [page, setPage] = useState("Dashboard");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [session, setSession] = useState(() => {
    try {
      const saved = localStorage.getItem("dcc_auth_session");
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const handleLogin = (user, remember) => {
    setSession(user);
    if (remember) {
      try {
        localStorage.setItem("dcc_auth_session", JSON.stringify(user));
      } catch {}
    }
  };

  const handleLogout = () => {
    try {
      localStorage.removeItem("dcc_auth_session");
    } catch {}
    setSession(null);
  };

  if (!session) {
    return <LoginPage onLogin={handleLogin} />;
  }

  const navigation = [
    ["Dashboard", LayoutDashboard],
    ["Products", Package],
    ["Inventory", Boxes],
    ["Sales", ShoppingCart],
    ["Purchase Orders", Truck],
    ["Stock Statement", FileSpreadsheet],
    ["Chatbot", Bot]
  ];

  return (
    <div className="app">
      <aside className={`sidebar ${mobileOpen ? "open" : ""}`}>
        <div className="brand">
          <div className="brand-icon">
            <Package size={22} />
          </div>
          <div>
            <strong>Cashew Business Management</strong>
            <span>Mumbai Branch Portal</span>
          </div>
        </div>

        <div className="nav-label">MUMBAI OPERATIONS</div>
        {navigation.map(([item, Icon]) => (
          <button
            key={item}
            className={`nav-item ${page === item ? "active" : ""}`}
            onClick={() => {
              setPage(item);
              setMobileOpen(false);
            }}
          >
            <Icon size={19} />
            <span>{item}</span>
          </button>
        ))}

        <div className="sidebar-bottom">
          <div className="user-card" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <div className="avatar">MUM</div>
              <div>
                <strong>{session.displayName || "Mumbai Branch"}</strong>
                <span>{session.role || "Active Session"}</span>
              </div>
            </div>
            <button
              onClick={handleLogout}
              title="Sign Out"
              style={{
                background: "none",
                border: "none",
                color: "#94a3b8",
                cursor: "pointer",
                padding: "6px",
                borderRadius: "6px",
                display: "grid",
                placeItems: "center"
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "#ef4444")}
              onMouseLeave={(e) => (e.currentTarget.style.color = "#94a3b8")}
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>

      <main className="main">
        <header className="topbar">
          <button className="mobile-menu" onClick={() => setMobileOpen(!mobileOpen)}>
            <Menu />
          </button>
          <div className="top-actions">
            <div className="info-banner" style={{ margin: 0, padding: "6px 14px", borderRadius: "8px" }}>
              <strong style={{ fontSize: "12px", color: "#1f6f5b" }}>📍 Cashew Business Management — Mumbai Branch</strong>
            </div>
          </div>
        </header>

        {page === "Dashboard" && <MumbaiDashboard setPage={setPage} />}
        {page === "Products" && <ProductsCatalog />}
        {page === "Inventory" && <MumbaiInventory />}
        {page === "Sales" && <SalesHistory />}
        {page === "Purchase Orders" && <PurchaseOrdersModule />}
        {page === "Stock Statement" && <StockStatementModule />}
        {page === "Chatbot" && <ChatbotModule />}
      </main>
    </div>
  );
}

// =============================================================
// PRODUCTS CATALOG: BATCH DETAILS COLUMN, ALL PACKETS
// =============================================================
function ProductsCatalog() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [filterTab, setFilterTab] = useState("all");
  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [notice, setNotice] = useState("");

  const [form, setForm] = useState({
    name: "",
    category: "Dry Fruits",
    stock: "",
    unit: "pack",
    packSize: "80",
    packSizeUnit: "GM",
    mnemonicCode: "",
    minimumStock: "50",
    batchNumber: "",
    branchName: "Mumbai Branch"
  });

  const loadProducts = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/products`);
      if (!res.ok) throw new Error("Failed to load products");
      setProducts(await res.json());
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProducts();
  }, []);

  const handleAddProduct = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    setNotice("");

    try {
      const res = await fetch(`${API_BASE}/products`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          category: form.category,
          stock: Number(form.stock),
          unit: "pack",
          packSize: Number(form.packSize),
          packSizeUnit: form.packSizeUnit,
          mnemonicCode: form.mnemonicCode ? form.mnemonicCode.trim().toUpperCase() : undefined,
          minimumStock: Number(form.minimumStock),
          batchNumber: form.batchNumber ? form.batchNumber.trim().toUpperCase() : undefined,
          branchName: form.branchName ? form.branchName.trim() : "Mumbai Branch"
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to add product");

      setNotice(`Product "${data.name}" added successfully to Mumbai Branch!`);
      setModalOpen(false);
      setForm({
        name: "",
        category: "Dry Fruits",
        stock: "",
        unit: "pack",
        packSize: "80",
        packSizeUnit: "GM",
        mnemonicCode: "",
        minimumStock: "50",
        batchNumber: "",
        branchName: "Mumbai Branch"
      });
      await loadProducts();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const filtered = products.filter((p) => {
    const q = search.toLowerCase();
    const matchesSearch = (
      p.name.toLowerCase().includes(q) ||
      (p.mnemonicCode && p.mnemonicCode.toLowerCase().includes(q)) ||
      (p.category && p.category.toLowerCase().includes(q))
    );
    if (!matchesSearch) return false;

    if (filterTab === "low") {
      return (Number(p.stock) || 0) <= (Number(p.minimumStock) || 50);
    }
    return true;
  });

  const totalPacks = products.reduce((sum, p) => sum + (Number(p.stock) || 0), 0);
  const lowStockCount = products.filter((p) => (Number(p.stock) || 0) <= (Number(p.minimumStock) || 50)).length;

  return (
    <section className="content">
      <PageTitle
        title="Products Catalog"
        subtitle="Mumbai Branch packaged cashew catalog with active batch numbers and packet quantities."
        action={
          <div style={{ display: "flex", gap: "10px" }}>
            <button className="secondary" onClick={loadProducts}>
              <RefreshCw size={15} /> Refresh
            </button>
            <button className="primary" onClick={() => setModalOpen(true)}>
              <Plus size={16} /> Add Product
            </button>
          </div>
        }
      />

      {notice && (
        <div style={{ background: "#ecfdf5", border: "1px solid #a7f3d0", padding: "12px 16px", borderRadius: "8px", color: "#065f46", marginBottom: "16px", fontWeight: 600 }}>
          {notice}
        </div>
      )}

      {/* Summary Chips */}
      <div className="stats-banner">
        <div className="stats-chip">
          <div className="stats-chip-icon"><Package size={20} /></div>
          <div className="stats-chip-content">
            <strong>{products.length} Varieties</strong>
            <span>Active Packaged Products</span>
          </div>
        </div>
        <div className="stats-chip">
          <div className="stats-chip-icon" style={{ background: "#ecfeff", color: "#0891b2" }}><Boxes size={20} /></div>
          <div className="stats-chip-content">
            <strong>{totalPacks.toLocaleString("en-IN")} Packs</strong>
            <span>Total Mumbai Stock</span>
          </div>
        </div>
        <div className="stats-chip">
          <div className="stats-chip-icon" style={{ background: "#fffbeb", color: "#b45309" }}><AlertTriangle size={20} /></div>
          <div className="stats-chip-content">
            <strong>{lowStockCount} Low Stock</strong>
            <span>Stock &le; 50 packs</span>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-head">
          <div className="filter-tabs" style={{ margin: 0 }}>
            <button
              className={`filter-tab ${filterTab === "all" ? "active" : ""}`}
              onClick={() => setFilterTab("all")}
            >
              All Products ({products.length})
            </button>
            <button
              className={`filter-tab ${filterTab === "low" ? "active" : ""}`}
              onClick={() => setFilterTab("low")}
            >
              Low Stock Alert ({lowStockCount})
            </button>
          </div>

          <div className="filter-search">
            <Search size={16} />
            <input
              placeholder="Search by name or mnemonic (e.g. C, CP80)..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        {loading ? (
          <p>Loading products...</p>
        ) : error ? (
          <p className="danger">{error}</p>
        ) : filtered.length === 0 ? (
          <p>No products match your search or filter.</p>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>PRODUCT NAME</th>
                  <th>MNEMONIC</th>
                  <th>CATEGORY</th>
                  <th>PACK SIZE</th>
                  <th>BATCH DETAILS & PACKETS</th>
                  <th>CURRENT STOCK</th>
                  <th>MINIMUM STOCK</th>
                  <th>STATUS</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((p) => {
                  const stockNum = Number(p.stock) || 0;
                  const minNum = Number(p.minimumStock) || 50;
                  const isLow = stockNum <= minNum;

                  return (
                    <tr key={p._id}>
                      <td>
                        <strong>{p.name}</strong>
                      </td>
                      <td>
                        <span className="mnemonic-pill">{p.mnemonicCode || "—"}</span>
                      </td>
                      <td>{p.category || "Dry Fruits"}</td>
                      <td>
                        <span className="data-val-bold">
                          {p.packSize || 80} {p.packSizeUnit || "GM"}
                        </span>
                      </td>
                      <td>
                        {p.batches && p.batches.length > 0 ? (
                          <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                            {p.batches.map((b) => (
                              <span key={b.id || b.batchNumber} className="code" style={{ fontSize: "12px", fontWeight: 700, padding: "3px 8px" }}>
                                {b.batchNumber}: {b.physicalQty} packs
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span style={{ color: "#94a3b8", fontSize: "12px" }}>No active batch</span>
                        )}
                      </td>
                      <td>
                        <span className="data-val-bold">{stockNum} packs</span>
                      </td>
                      <td>
                        <span className="data-val-bold">{minNum} packs</span>
                      </td>
                      <td>
                        <span className={`status ${isLow ? "low" : "good"}`}>
                          {isLow ? "Low Stock" : "Healthy"}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Product Modal */}
      {modalOpen && (
        <div style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,0.5)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 100,
          padding: "20px"
        }}>
          <div style={{
            background: "white",
            borderRadius: "12px",
            padding: "24px",
            maxWidth: "520px",
            width: "100%",
            boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1)"
          }}>
            <h3 style={{ margin: "0 0 16px", fontSize: "18px" }}>Add New Packaged Product</h3>
            <form onSubmit={handleAddProduct}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "12px" }}>
                <div style={{ gridColumn: "1 / -1" }}>
                  <label style={{ fontSize: "12px", fontWeight: 700, color: "#334155" }}>Product Name *</label>
                  <input
                    required
                    placeholder="e.g. Cashew - Peri Peri"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    style={{ width: "100%", padding: "9px 12px", marginTop: "4px", border: "1px solid #cbd5e1", borderRadius: "6px" }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: "12px", fontWeight: 700, color: "#334155" }}>Mnemonic Code *</label>
                  <input
                    required
                    placeholder="e.g. CPP80"
                    value={form.mnemonicCode}
                    onChange={(e) => setForm({ ...form, mnemonicCode: e.target.value })}
                    style={{ width: "100%", padding: "9px 12px", marginTop: "4px", border: "1px solid #cbd5e1", borderRadius: "6px" }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: "12px", fontWeight: 700, color: "#334155" }}>Pack Size (GM) *</label>
                  <select
                    value={form.packSize}
                    onChange={(e) => setForm({ ...form, packSize: e.target.value })}
                    style={{ width: "100%", padding: "9px 12px", marginTop: "4px", border: "1px solid #cbd5e1", borderRadius: "6px" }}
                  >
                    <option value="1000">1000 GM</option>
                    <option value="200">200 GM</option>
                    <option value="100">100 GM</option>
                    <option value="80">80 GM</option>
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: "12px", fontWeight: 700, color: "#334155" }}>Initial Stock (Packs) *</label>
                  <input
                    type="number"
                    min="0"
                    required
                    placeholder="e.g. 50"
                    value={form.stock}
                    onChange={(e) => setForm({ ...form, stock: e.target.value })}
                    style={{ width: "100%", padding: "9px 12px", marginTop: "4px", border: "1px solid #cbd5e1", borderRadius: "6px" }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: "12px", fontWeight: 700, color: "#334155" }}>Minimum Stock Level *</label>
                  <input
                    type="number"
                    min="1"
                    required
                    placeholder="e.g. 50"
                    value={form.minimumStock}
                    onChange={(e) => setForm({ ...form, minimumStock: e.target.value })}
                    style={{ width: "100%", padding: "9px 12px", marginTop: "4px", border: "1px solid #cbd5e1", borderRadius: "6px" }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: "12px", fontWeight: 700, color: "#334155" }}>
                    Batch Number (Optional)
                  </label>
                  <input
                    placeholder={form.mnemonicCode ? `e.g. MUM-${form.mnemonicCode.trim().toUpperCase()}-01` : "e.g. MUM-2026-01"}
                    value={form.batchNumber}
                    onChange={(e) => setForm({ ...form, batchNumber: e.target.value.toUpperCase() })}
                    style={{ width: "100%", padding: "9px 12px", marginTop: "4px", border: "1px solid #cbd5e1", borderRadius: "6px" }}
                  />
                  <span style={{ fontSize: "11px", color: "#64748b", marginTop: "3px", display: "block" }}>
                    Auto-generated if left blank
                  </span>
                </div>

                <div>
                  <label style={{ fontSize: "12px", fontWeight: 700, color: "#334155" }}>
                    Branch *
                  </label>
                  <input
                    value={form.branchName}
                    onChange={(e) => setForm({ ...form, branchName: e.target.value })}
                    style={{ width: "100%", padding: "9px 12px", marginTop: "4px", border: "1px solid #cbd5e1", borderRadius: "6px" }}
                  />
                  <span style={{ fontSize: "11px", color: "#64748b", marginTop: "3px", display: "block" }}>
                    Default inventory branch
                  </span>
                </div>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "18px" }}>
                <button type="button" className="secondary" onClick={() => setModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="primary" disabled={submitting}>
                  {submitting ? "Saving..." : "Add Product"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}

// =============================================================
// DASHBOARD: TRACKING NUMBER OF SALES RECORDED & PACKS SOLD
// =============================================================
function MumbaiDashboard({ setPage }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/dashboard?branchName=Mumbai%20Branch`);
      if (!res.ok) throw new Error("Failed to load dashboard data");
      setData(await res.json());
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  if (loading) return <section className="content"><p>Loading dashboard...</p></section>;
  if (error || !data) return <section className="content"><p className="danger">{error || "Data unavailable"}</p></section>;

  const maxSalesCount = Math.max(1, ...(data.salesOverview || []).map((i) => i.salesCount || 0));

  return (
    <section className="content">
      <PageTitle
        title="Cashew Business Management Dashboard"
        subtitle="Daily business operations, recorded sales velocity, and inventory health."
        action={
          <div style={{ display: "flex", gap: "10px" }}>
            <button className="secondary" onClick={loadData}>
              <RefreshCw size={15} /> Refresh
            </button>
            <button className="primary" onClick={() => setPage("Purchase Orders")}>
              <Truck size={16} /> PO Generator
            </button>
          </div>
        }
      />

      {/* KPIs */}
      <div className="kpis">
        <Kpi
          title="Today's Sales Recorded"
          value={`${data.todaySalesCount || 0} Sales`}
          change={`${data.todayPacksSold || 0} packs sold today`}
          up={(data.todaySalesCount || 0) > 0}
          icon={TrendingUp}
        />
        <Kpi
          title="Total Products"
          value={String(data.totalProducts)}
          change="Packaged Varieties"
          icon={Package}
        />
        <Kpi
          title="Low Stock Alert"
          value={String(data.lowStockItems)}
          change="At or below minimum stock"
          warn={data.lowStockItems > 0}
          icon={AlertTriangle}
        />
        <Kpi
          title="Pending POs"
          value={String(data.pendingPOCount)}
          change="Pending goods receipt"
          warn={data.pendingPOCount > 0}
          icon={Truck}
        />
      </div>

      <div className="grid-2">
        {/* Sales Activity Graph */}
        <div className="card">
          <div className="card-head">
            <div>
              <h3>7-Day Sales Activity</h3>
              <span>Number of sales recorded per day (Telegram Bot & Web)</span>
            </div>
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "flex-end",
              justifyContent: "space-around",
              gap: 14,
              height: 220,
              padding: "24px 10px 0"
            }}
          >
            {(data.salesOverview || []).map((item) => {
              const count = item.salesCount || 0;
              const packs = item.packsSold || 0;
              const barHeight = count > 0 ? Math.max(18, (count / maxSalesCount) * 140) : 6;

              return (
                <div
                  key={item.date}
                  title={`${item.day} (${item.date}): ${count} sale(s) recorded, ${packs} packs sold`}
                  style={{
                    flex: 1,
                    height: "100%",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "flex-end",
                    alignItems: "center",
                    gap: 8
                  }}
                >
                  <span style={{ fontSize: 12, fontWeight: 700, color: count > 0 ? "#1f6f5b" : "#94a3b8" }}>
                    {count > 0 ? `${count} sales` : "0"}
                  </span>

                  <div
                    style={{
                      width: "60%",
                      maxWidth: 46,
                      minWidth: 12,
                      height: `${barHeight}px`,
                      background: count > 0 ? "#1f6f5b" : "#e2e8f0",
                      borderRadius: "6px 6px 0 0",
                      transition: "height 0.3s ease"
                    }}
                  />

                  <span style={{ fontSize: 12, fontWeight: 700, color: "#475569" }}>
                    {item.day}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Low Stock Items */}
        <div className="card">
          <div className="card-head">
            <div>
              <h3>Stock Alerts</h3>
              <span>Products requiring reordering (&le; minimum stock)</span>
            </div>
            <button className="text-btn" onClick={() => setPage("Inventory")}>
              View all <ChevronRight size={15} />
            </button>
          </div>

          {data.lowStockProducts.length === 0 ? (
            <p style={{ color: "#15803d", fontWeight: 600 }}>All products have healthy inventory.</p>
          ) : (
            <div className="stock-list">
              {data.lowStockProducts.map((p) => (
                <div className="stock-row" key={p._id} style={{ borderBottom: "1px solid #f1f5f9", paddingBottom: "10px" }}>
                  <div className="product-mini" style={{ background: "#fee2e2", color: "#b91c1c" }}>!</div>
                  <div className="stock-name">
                    <strong>{p.name}</strong>
                    <span style={{ color: "#b91c1c", fontWeight: 600, fontSize: "12px" }}>
                      Current: {p.stock} packs (Min: {p.minimumStock} packs)
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Recent Recorded Transactions */}
      <div className="card">
        <div className="card-head">
          <div>
            <h3>Recent Recorded Sales</h3>
            <span>Live transactions updated via Telegram Bot and Web</span>
          </div>
          <button className="text-btn" onClick={() => setPage("Sales")}>
            Full sales history <ChevronRight size={15} />
          </button>
        </div>

        {data.recentTransactions.length === 0 ? (
          <p>No transactions recorded yet.</p>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>INVOICE NO.</th>
                  <th>PRODUCT</th>
                  <th>QUANTITY</th>
                  <th>CHANNEL</th>
                  <th>DATE & TIME</th>
                </tr>
              </thead>
              <tbody>
                {data.recentTransactions.map((tx) => (
                  <tr key={tx.id}>
                    <td><span className="data-val-bold">{tx.invoiceNumber || "—"}</span></td>
                    <td><strong>{tx.product}</strong></td>
                    <td>
                      <span className="data-val-bold">
                        {tx.quantity} packs ({Number(tx.quantity) * (Number(tx.packSize) || 80)} GM)
                      </span>
                    </td>
                    <td><span className="code">{tx.source || "telegram"}</span></td>
                    <td>{new Date(tx.time).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}

// =============================================================
// INVENTORY: PACKETS ONLY, MINIMUM STOCK, STATUS BAR
// =============================================================
function MumbaiInventory() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filterLowStockOnly, setFilterLowStockOnly] = useState(false);

  const fetchInventory = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/products`);
      if (!res.ok) throw new Error("Failed to load inventory");
      setProducts(await res.json());
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInventory();
  }, []);

  const exportInventoryCSV = () => {
    if (products.length === 0) return;
    const headers = [
      "Product Name",
      "Mnemonic Code",
      "Category",
      "Pack Size (GM)",
      "Current Stock (Packs)",
      "Minimum Stock (Packs)",
      "Stock Status"
    ];

    const rows = products.map((p) => [
      `"${p.name}"`,
      `"${p.mnemonicCode || ""}"`,
      `"${p.category || ""}"`,
      p.packSize || 80,
      p.stock,
      p.minimumStock || 50,
      p.stock <= (p.minimumStock || 50) ? "Low stock" : "Healthy"
    ]);

    const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\r\n");
    const blob = new Blob(["\ufeff" + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `Mumbai_Branch_Inventory_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const filtered = filterLowStockOnly
    ? products.filter((p) => (Number(p.stock) || 0) <= (Number(p.minimumStock) || 50))
    : products;

  return (
    <section className="content">
      <PageTitle
        title="Mumbai Branch Inventory"
        subtitle="Current stock in packets, minimum reorder stock level, and real-time inventory health status."
        action={
          <div style={{ display: "flex", gap: "10px" }}>
            <button
              className={filterLowStockOnly ? "primary" : "secondary"}
              onClick={() => setFilterLowStockOnly(!filterLowStockOnly)}
              style={filterLowStockOnly ? { background: "#b91c1c" } : {}}
            >
              <AlertTriangle size={15} />
              {filterLowStockOnly ? "Showing Low Stock Only" : "Filter Low Stock"}
            </button>
            <button className="secondary" onClick={exportInventoryCSV}>
              <Download size={15} /> Export CSV
            </button>
          </div>
        }
      />

      <div className="card">
        <div className="card-head">
          <div>
            <h3>Current Stock Overview</h3>
            <span>{filterLowStockOnly ? "Showing products requiring replenishment" : "All Mumbai Branch packaged cashews"}</span>
          </div>
        </div>

        {loading ? (
          <p>Loading inventory...</p>
        ) : error ? (
          <p className="danger">{error}</p>
        ) : filtered.length === 0 ? (
          <p>No products match the selected filter.</p>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>PRODUCT</th>
                  <th>MNEMONIC</th>
                  <th>CURRENT STOCK</th>
                  <th>MINIMUM STOCK</th>
                  <th>STOCK STATUS & HEALTH BAR</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((p) => {
                  const stock = Number(p.stock) || 0;
                  const minStock = Number(p.minimumStock) || 50;
                  const isLow = stock <= minStock;
                  const percentage = Math.min(100, Math.round((stock / (minStock * 2)) * 100));

                  return (
                    <tr key={p._id}>
                      <td>
                        <strong>{p.name}</strong>
                        <span style={{ display: "block", fontSize: "12px", color: "#64748b", marginTop: "2px" }}>
                          {p.packSize || 80} {p.packSizeUnit || "GM"} Packets
                        </span>
                      </td>
                      <td>
                        <span className="mnemonic-pill">{p.mnemonicCode || "—"}</span>
                      </td>
                      <td>
                        <span className="data-val-bold">{stock} packs</span>
                      </td>
                      <td>
                        <span className="data-val-bold">{minStock} packs</span>
                      </td>
                      <td>
                        <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
                          <div className="stock-bar-wrap">
                            <div
                              className={`stock-bar-fill ${isLow ? "danger" : stock < minStock * 1.5 ? "warn" : "good"}`}
                              style={{ width: `${Math.max(8, percentage)}%` }}
                            />
                          </div>
                          <span className={`status ${isLow ? "low" : "good"}`}>
                            {isLow ? "Reorder Needed" : "Healthy"}
                          </span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}

// =============================================================
// SALES HISTORY: INVOICE NUMBER, QUANTITY IN GRAMS ONLY
// =============================================================
function SalesHistory() {
  const [sales, setSales] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadSales = async () => {
    setLoading(true);
    try {
      const [salesRes, prodRes] = await Promise.all([
        fetch(`${API_BASE}/sales`),
        fetch(`${API_BASE}/products`)
      ]);
      if (!salesRes.ok || !prodRes.ok) throw new Error("Failed to load sales data");
      setSales(await salesRes.json());
      setProducts(await prodRes.json());
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSales();
  }, []);

  return (
    <section className="content">
      <PageTitle
        title="Sales History"
        subtitle="Recorded sales transactions with Invoice Number, Grams, Customer/Retailer, and Channel."
        action={
          <button className="secondary" onClick={loadSales}>
            <RefreshCw size={15} /> Refresh
          </button>
        }
      />

      <div className="card">
        <div className="card-head">
          <div>
            <h3>Recorded Sales</h3>
            <span>Transactions logged directly into central database</span>
          </div>
        </div>

        {loading ? (
          <p>Loading sales...</p>
        ) : error ? (
          <p className="danger">{error}</p>
        ) : sales.length === 0 ? (
          <p>No sales recorded yet.</p>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>INVOICE NO.</th>
                  <th>PRODUCT</th>
                  <th>QUANTITY (IN GRAMS)</th>
                  <th>CUSTOMER / RETAILER</th>
                  <th>CHANNEL</th>
                  <th>DATE & TIME</th>
                </tr>
              </thead>
              <tbody>
                {sales.map((sale) => {
                  const prod = products.find((p) => p._id === (sale.product?._id || sale.product)) || sale.product;
                  const packs = Number(sale.quantity) || 0;
                  const packSize = Number(prod?.packSize) || (prod?.unit === "kg" ? 1000 : 80);
                  const totalGrams = packs * packSize;

                  return (
                    <tr key={sale._id}>
                      <td>
                        <span className="data-val-bold">{sale.invoiceNumber || "—"}</span>
                      </td>
                      <td>
                        <strong>{sale.product?.name || prod?.name || "Product"}</strong>
                        <span style={{ display: "block", fontSize: "12px", color: "#64748b" }}>
                          {packSize} GM Packets
                        </span>
                      </td>
                      <td>
                        <span className="data-val-bold">
                          {totalGrams.toLocaleString("en-IN")} GM
                        </span>
                        <span style={{ display: "block", fontSize: "12px", color: "#64748b" }}>
                          ({packs} packs)
                        </span>
                      </td>
                      <td>
                        <strong>{sale.vendorName || "Retail Walk-in"}</strong>
                      </td>
                      <td>
                        <span className="code">{sale.source || "telegram"}</span>
                      </td>
                      <td>{new Date(sale.createdAt).toLocaleString()}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}

// =============================================================
// PURCHASE ORDERS: BATCH CONFIRMATION MODAL & COMPANY EXCEL
// =============================================================
function PurchaseOrdersModule() {
  const branchName = "Mumbai Branch";
  const [purchases, setPurchases] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [poLoading, setPoLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [receivingId, setReceivingId] = useState("");

  const [productId, setProductId] = useState("");
  const [quantity, setQuantity] = useState("");
  const [manualPreview, setManualPreview] = useState([]);
  const [manualVisible, setManualVisible] = useState(false);

  const [poPreview, setPoPreview] = useState(null);
  const [emailModal, setEmailModal] = useState({ open: false, title: "", loading: false });
  const [recipientEmail, setRecipientEmail] = useState("abin.c@somaiya.edu");

  // Receive Modal state (asks for batch number)
  const [receiveModal, setReceiveModal] = useState({
    open: false,
    purchase: null,
    batchChoice: "existing",
    existingBatch: "",
    newBatch: ""
  });

  const loadData = async () => {
    setLoading(true);
    setError("");
    try {
      const [purchRes, prodRes] = await Promise.all([
        fetch(`${API_BASE}/purchases`),
        fetch(`${API_BASE}/products`)
      ]);
      if (!purchRes.ok || !prodRes.ok) throw new Error("Could not load purchase records.");
      setPurchases(await purchRes.json());
      setProducts(await prodRes.json());
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => setMessage(""), 6000);
      return () => clearTimeout(timer);
    }
  }, [message]);

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(""), 8000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  const loadManualPreview = async () => {
    try {
      const res = await fetch(`${API_BASE}/purchases/manual/preview?branchName=${encodeURIComponent(branchName)}`);
      if (res.ok) {
        const data = await res.json();
        setManualPreview(data.rows || []);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleCreateManualPurchase = async (e) => {
    e.preventDefault();
    setError("");
    setMessage("");

    const qty = Number(quantity);
    if (!productId || qty <= 0) {
      setError("Please select a product and valid quantity in packs.");
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/purchases`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId,
          quantity: qty,
          branchName,
          source: "website"
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to create manual PO");

      setMessage("Manual purchase order created and added to preview. Stock has NOT changed.");
      setQuantity("");
      setManualVisible(true);
      await Promise.all([loadData(), loadManualPreview()]);
    } catch (err) {
      setError(err.message);
    }
  };

  const handlePreviewPO = async () => {
    setPoLoading(true);
    setError("");
    try {
      const res = await fetch(`${API_BASE}/purchases/replenishment/preview?branchName=${encodeURIComponent(branchName)}`);
      if (!res.ok) throw new Error("Failed to load PO preview");
      setPoPreview(await res.json());
    } catch (err) {
      setError(err.message);
    } finally {
      setPoLoading(false);
    }
  };

  const handleGeneratePO = async () => {
    setPoLoading(true);
    setError("");
    setMessage("");
    try {
      const res = await fetch(`${API_BASE}/purchases/replenishment/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ branchName })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to generate POs");

      setMessage(data.message || "Purchase requests generated successfully. Stock has NOT changed.");
      await Promise.all([handlePreviewPO(), loadData()]);
    } catch (err) {
      setError(err.message);
    } finally {
      setPoLoading(false);
    }
  };

  const handleDownloadPOExcel = async () => {
    try {
      const res = await fetch(`${API_BASE}/purchases/replenishment/excel?branchName=${encodeURIComponent(branchName)}`);
      if (!res.ok) throw new Error("Could not download PO Excel");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `Mumbai_PO_Generator_${new Date().toISOString().slice(0, 10)}.xlsx`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDownloadManualPOExcel = async () => {
    try {
      const res = await fetch(`${API_BASE}/purchases/manual/excel?branchName=${encodeURIComponent(branchName)}`);
      if (!res.ok) throw new Error("Could not download Manual PO Excel");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `Mumbai_Manual_PO_${new Date().toISOString().slice(0, 10)}.xlsx`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err.message);
    }
  };

  // Open modal to confirm or enter batch number
  const openReceiveModal = (p) => {
    const prod = products.find((item) => item._id === (p.product?._id || p.product));
    const activeBatches = prod?.batches || [];
    const defaultBatch = activeBatches[0]?.batchNumber || `MUM-${prod?.mnemonicCode || "B"}-01`;

    setReceiveModal({
      open: true,
      purchase: p,
      productName: p.product?.name || prod?.name || "Product",
      activeBatches,
      batchChoice: activeBatches.length > 0 ? "existing" : "new",
      existingBatch: defaultBatch,
      newBatch: ""
    });
  };

  const submitReceivePurchase = async (e) => {
    e.preventDefault();
    const { purchase, batchChoice, existingBatch, newBatch } = receiveModal;
    if (!purchase) return;

    const chosenBatch = batchChoice === "existing" ? existingBatch : newBatch.trim();
    if (!chosenBatch) {
      setError("Please specify a batch number.");
      return;
    }

    setReceivingId(purchase._id);
    setError("");
    setMessage("");

    try {
      const res = await fetch(`${API_BASE}/purchases/${purchase._id}/receive`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ batchNumber: chosenBatch })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to receive purchase order");

      setMessage(`Order received! ${data.product}: Batch ${data.batchNumber} updated. Total stock is now ${data.updatedStock} packs.`);
      setReceiveModal({ open: false, purchase: null, batchChoice: "existing", existingBatch: "", newBatch: "" });
      if (manualVisible) await loadManualPreview();
      await loadData();
    } catch (err) {
      setError(err.message);
    } finally {
      setReceivingId("");
    }
  };

  const handleSendEmail = async () => {
    setEmailModal({ ...emailModal, loading: true });
    setError("");
    setMessage("");

    try {
      const res = await fetch(`${API_BASE}/purchases/replenishment/send-email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          branchName,
          recipientEmail: recipientEmail.trim()
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Could not email purchase order.");

      setMessage(data.message || `Purchase order emailed to ${recipientEmail}`);
      setEmailModal({ open: false, title: "", loading: false });
    } catch (err) {
      setError(err.message);
      setEmailModal({ ...emailModal, loading: false });
    }
  };

  return (
    <section className="content">
      <PageTitle
        title="Mumbai Branch Purchase Orders"
        subtitle="Automatic replenishment formulas, manual purchase orders, and company-format Excel exports."
      />

      {message && (
        <div style={{
          background: "#ecfdf5",
          border: "1px solid #a7f3d0",
          padding: "10px 16px",
          borderRadius: "8px",
          color: "#065f46",
          marginBottom: "16px",
          fontWeight: 600,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center"
        }}>
          <span>{message}</span>
          <button
            onClick={() => setMessage("")}
            style={{ background: "none", border: "none", cursor: "pointer", color: "#065f46", fontWeight: "bold", fontSize: "18px", lineHeight: 1 }}
          >
            ×
          </button>
        </div>
      )}

      {error && (
        <div style={{
          background: "#fef2f2",
          border: "1px solid #fecaca",
          padding: "10px 16px",
          borderRadius: "8px",
          color: "#991b1b",
          marginBottom: "16px",
          fontWeight: 600,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center"
        }}>
          <span>{error}</span>
          <button
            onClick={() => setError("")}
            style={{ background: "none", border: "none", cursor: "pointer", color: "#991b1b", fontWeight: "bold", fontSize: "18px", lineHeight: 1 }}
          >
            ×
          </button>
        </div>
      )}

      {/* SECTION 1: Automatic Purchase Order */}
      <div className="card" style={{ marginBottom: "22px" }}>
        <div className="card-head">
          <div>
            <h3>Mumbai Branch P. O Generator (Automatic)</h3>
            <span>Calculates purchase quantities: Stock Level + Temp. Stock + Pending Orders - Total Stock (rounded to 10s)</span>
          </div>
        </div>

        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", marginBottom: "18px" }}>
          <button className="primary" onClick={handlePreviewPO} disabled={poLoading}>
            <Eye size={16} /> {poLoading ? "Loading..." : "Preview Automatic PO"}
          </button>
          <button className="secondary" onClick={handleGeneratePO} disabled={poLoading}>
            <Plus size={16} /> Generate POs
          </button>
          <button className="secondary" onClick={handleDownloadPOExcel}>
            <Download size={16} /> Download Excel
          </button>
          <button
            className="secondary"
            onClick={() => setEmailModal({ open: true, title: "Automatic Purchase Order", loading: false })}
          >
            <Mail size={16} /> One-Click Email PO
          </button>
        </div>

        {poPreview && (
          <div style={{ marginTop: "16px" }}>
            <h4 style={{ margin: "0 0 12px", fontSize: "15px", fontWeight: 750, color: "#0f172a" }}>
              Calculation Preview ({poPreview.rows?.length || 0} Products)
            </h4>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>SL NO</th>
                    <th>ITEM</th>
                    <th>PACK SIZE</th>
                    <th>STOCK LEVEL</th>
                    <th>TEMP</th>
                    <th>PENDING</th>
                    <th>TRANSIT</th>
                    <th>BRANCH STOCK</th>
                    <th>TOTAL STOCK</th>
                    <th>PURCHASE</th>
                    <th>FINAL ROUNDED</th>
                  </tr>
                </thead>
                <tbody>
                  {poPreview.rows.map((row, idx) => (
                    <tr key={row.productId}>
                      <td><span className="data-val-bold">{idx + 1}</span></td>
                      <td><strong>{row.name}</strong></td>
                      <td><span className="data-val-bold">{row.packSize ? `${row.packSize} ${row.packSizeUnit}` : "—"}</span></td>
                      <td><span className="data-val-bold">{row.stockLevel}</span></td>
                      <td><span className="data-val-bold">{row.tempStock}</span></td>
                      <td><span className="data-val-bold">{row.pendingOrder1 + row.pendingOrder2 + row.pendingOrder3}</span></td>
                      <td><span className="data-val-bold">{row.transitStock1 + row.transitStock2}</span></td>
                      <td><span className="data-val-bold">{row.branchStock}</span></td>
                      <td><span className="data-val-bold">{row.totalStock}</span></td>
                      <td><span className="data-val-bold">{row.purchase}</span></td>
                      <td>
                        <span className="data-val-bold" style={{ color: row.finalPurchase > 0 ? "#15803d" : "#475569", fontSize: "16px" }}>
                          {row.finalPurchase}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* SECTION 2: Manual Purchase Order */}
      <div className="card" style={{ marginBottom: "22px" }}>
        <div className="card-head">
          <div>
            <h3>Manual Purchase Order</h3>
            <span>Create independent purchase orders. Excel follows company purchase order template.</span>
          </div>
        </div>

        <form onSubmit={handleCreateManualPurchase}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "14px", marginBottom: "16px" }}>
            <div>
              <label style={{ fontSize: "12px", fontWeight: 700, color: "#334155" }}>
                Select Product *
              </label>
              <select
                required
                value={productId}
                onChange={(e) => setProductId(e.target.value)}
                style={{ width: "100%", padding: "9px 12px", marginTop: "4px", border: "1px solid #cbd5e1", borderRadius: "8px", fontSize: "13px" }}
              >
                <option value="">-- Choose Product --</option>
                {products.map((p) => (
                  <option key={p._id} value={p._id}>
                    {p.name} ({p.packSize || 80} GM) — Stock: {p.stock} packs
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ fontSize: "12px", fontWeight: 700, color: "#334155" }}>
                Quantity (Packs) *
              </label>
              <input
                type="number"
                step="1"
                min="1"
                required
                placeholder="Enter number of packs"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                style={{ width: "100%", padding: "9px 12px", marginTop: "4px", border: "1px solid #cbd5e1", borderRadius: "8px", fontSize: "13px" }}
              />
            </div>
          </div>

          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
            <button type="submit" className="primary">
              <Plus size={16} /> Add to Manual PO
            </button>
            <button
              type="button"
              className="secondary"
              onClick={() => { setManualVisible(true); loadManualPreview(); }}
            >
              <Eye size={16} /> View Manual PO Preview
            </button>
            <button
              type="button"
              className="secondary"
              onClick={handleDownloadManualPOExcel}
            >
              <Download size={16} /> Download Manual PO Excel (Company Template)
            </button>
          </div>
        </form>

        {manualVisible && (
          <div style={{ marginTop: "20px" }}>
            <h4 style={{ margin: "0 0 12px", fontSize: "15px", fontWeight: 750, color: "#0f172a" }}>
              Pending Manual Purchase Requests ({manualPreview.length})
            </h4>
            {manualPreview.length === 0 ? (
              <p style={{ color: "#64748b" }}>No pending manual purchase requests found.</p>
            ) : (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>REQUEST DATE</th>
                      <th>PRODUCT</th>
                      <th>PACK SIZE</th>
                      <th>QUANTITY (PACKS)</th>
                      <th>STATUS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {manualPreview.map((row) => (
                      <tr key={row.purchaseId}>
                        <td><span className="data-val-bold">{row.createdAt ? new Date(row.createdAt).toLocaleDateString() : "—"}</span></td>
                        <td><strong>{row.productName}</strong></td>
                        <td><span className="data-val-bold">{row.packSize ? `${row.packSize} ${row.packSizeUnit}` : "—"}</span></td>
                        <td><span className="data-val-bold" style={{ fontSize: "15px" }}>{row.quantity} packs</span></td>
                        <td><span className="status low">{row.status}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {/* SECTION 3: Purchase History & Goods Receipt */}
      <div className="card">
        <div className="card-head">
          <div>
            <h3>Purchase History & Goods Receipt</h3>
            <span>Confirm receipt of delivered purchase requests to increment stock & update batch</span>
          </div>
          <button className="secondary" onClick={loadData}>
            <RefreshCw size={15} /> Refresh
          </button>
        </div>

        {purchases.length === 0 ? (
          <p>No purchase records found.</p>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>PRODUCT</th>
                  <th>ORDER TYPE</th>
                  <th>QUANTITY</th>
                  <th>SOURCE</th>
                  <th>STATUS</th>
                  <th>ACTION</th>
                </tr>
              </thead>
              <tbody>
                {purchases.map((p) => (
                  <tr key={p._id}>
                    <td><strong>{p.product?.name || "Product"}</strong></td>
                    <td><span className="code">{p.orderType || "Manual"}</span></td>
                    <td><span className="data-val-bold">{p.quantity} packs</span></td>
                    <td><span className="code">{p.source || "website"}</span></td>
                    <td>
                      <span className={`status ${p.status === "Received" ? "good" : "low"}`}>
                        {p.status}
                      </span>
                    </td>
                    <td>
                      {p.status === "Pending" ? (
                        <button
                          className="primary"
                          style={{ padding: "6px 12px", fontSize: "12px" }}
                          disabled={receivingId === p._id}
                          onClick={() => openReceiveModal(p)}
                        >
                          {receivingId === p._id ? "Receiving..." : "Mark Received"}
                        </button>
                      ) : (
                        <span style={{ fontSize: "12px", color: "#64748b", fontWeight: 600 }}>
                          Received on {p.receivedAt ? new Date(p.receivedAt).toLocaleDateString() : "—"}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Receive Purchase Order Batch Modal */}
      {receiveModal.open && (
        <div style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,0.5)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 100,
          padding: "20px"
        }}>
          <div style={{
            background: "white",
            borderRadius: "12px",
            padding: "24px",
            maxWidth: "480px",
            width: "100%",
            boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1)"
          }}>
            <h3 style={{ margin: "0 0 8px", fontSize: "18px", color: "#0f172a" }}>Confirm Goods Receipt</h3>
            <p style={{ fontSize: "13px", color: "#475569", margin: "0 0 16px" }}>
              Receiving <strong>{receiveModal.purchase?.quantity} packs</strong> of <strong>{receiveModal.productName}</strong>.
            </p>

            <form onSubmit={submitReceivePurchase}>
              <div style={{ marginBottom: "16px" }}>
                <label style={{ fontSize: "13px", fontWeight: 700, color: "#334155", display: "block", marginBottom: "8px" }}>
                  Is the batch number same or new?
                </label>

                {receiveModal.activeBatches?.length > 0 && (
                  <div style={{ marginBottom: "10px" }}>
                    <label style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "13px", cursor: "pointer", fontWeight: 600 }}>
                      <input
                        type="radio"
                        name="batchChoice"
                        value="existing"
                        checked={receiveModal.batchChoice === "existing"}
                        onChange={() => setReceiveModal({ ...receiveModal, batchChoice: "existing" })}
                      />
                      Add to existing batch
                    </label>

                    {receiveModal.batchChoice === "existing" && (
                      <select
                        style={{ width: "100%", padding: "8px 12px", marginTop: "6px", border: "1px solid #cbd5e1", borderRadius: "6px", fontSize: "13px" }}
                        value={receiveModal.existingBatch}
                        onChange={(e) => setReceiveModal({ ...receiveModal, existingBatch: e.target.value })}
                      >
                        {receiveModal.activeBatches.map((b) => (
                          <option key={b.id || b.batchNumber} value={b.batchNumber}>
                            {b.batchNumber} ({b.physicalQty} packs current)
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                )}

                <div>
                  <label style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "13px", cursor: "pointer", fontWeight: 600 }}>
                    <input
                      type="radio"
                      name="batchChoice"
                      value="new"
                      checked={receiveModal.batchChoice === "new"}
                      onChange={() => setReceiveModal({ ...receiveModal, batchChoice: "new" })}
                    />
                    Add as new batch number
                  </label>

                  {receiveModal.batchChoice === "new" && (
                    <input
                      required
                      placeholder="e.g. MUM-2026-02"
                      style={{ width: "100%", padding: "8px 12px", marginTop: "6px", border: "1px solid #cbd5e1", borderRadius: "6px", fontSize: "13px" }}
                      value={receiveModal.newBatch}
                      onChange={(e) => setReceiveModal({ ...receiveModal, newBatch: e.target.value.toUpperCase() })}
                    />
                  )}
                </div>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "20px" }}>
                <button
                  type="button"
                  className="secondary"
                  onClick={() => setReceiveModal({ open: false, purchase: null, batchChoice: "existing", existingBatch: "", newBatch: "" })}
                >
                  Cancel
                </button>
                <button type="submit" className="primary" disabled={Boolean(receivingId)}>
                  {receivingId ? "Updating..." : "Confirm & Update Stock"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Email Modal */}
      {emailModal.open && (
        <div style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,0.5)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 100,
          padding: "20px"
        }}>
          <div style={{
            background: "white",
            borderRadius: "12px",
            padding: "24px",
            maxWidth: "460px",
            width: "100%",
            boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1)"
          }}>
            <h3 style={{ margin: "0 0 8px", fontSize: "17px" }}>Email Purchase Order</h3>
            <p style={{ fontSize: "13px", color: "#64748b", margin: "0 0 16px" }}>
              Send the company-format Excel workbook for <strong>{branchName}</strong>.
            </p>

            <label style={{ fontSize: "12px", fontWeight: 700, color: "#334155" }}>
              Recipient Email Address *
            </label>
            <input
              type="email"
              required
              style={{ width: "100%", padding: "9px 12px", marginTop: "4px", border: "1px solid #cbd5e1", borderRadius: "8px", marginBottom: "18px" }}
              value={recipientEmail}
              onChange={(e) => setRecipientEmail(e.target.value)}
            />

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
              <button className="secondary" onClick={() => setEmailModal({ open: false, title: "", loading: false })}>
                Cancel
              </button>
              <button className="primary" disabled={emailModal.loading || !recipientEmail} onClick={handleSendEmail}>
                <Mail size={15} /> {emailModal.loading ? "Sending..." : "Send Purchase Order"}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

// =============================================================
// STOCK STATEMENT: HIGH VISIBILITY, LARGE BOLD FONTS & CONTRAST
// =============================================================
function StockStatementModule() {
  const branchName = "Mumbai Branch";
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [statement, setStatement] = useState(null);
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const [emailModal, setEmailModal] = useState(false);
  const [recipientEmail, setRecipientEmail] = useState("abin.c@somaiya.edu");
  const [sendingEmail, setSendingEmail] = useState(false);

  useEffect(() => {
    if (notice) {
      const timer = setTimeout(() => setNotice(""), 6000);
      return () => clearTimeout(timer);
    }
  }, [notice]);

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(""), 8000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  useEffect(() => {
    generateStatement();
  }, [date]);

  const generateStatement = async () => {
    setLoading(true);
    setError("");
    setNotice("");
    try {
      const params = new URLSearchParams({ branchName, date });
      const res = await fetch(`${API_BASE}/stock-statements/preview?${params}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to generate stock statement");
      setStatement(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const downloadExcel = async () => {
    setDownloading(true);
    setError("");
    try {
      const params = new URLSearchParams({ branchName, date });
      const res = await fetch(`${API_BASE}/stock-statements/excel?${params}`);
      if (!res.ok) throw new Error("Could not download Excel statement");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `Physical-Stock-Statement-${date}.xlsx`;
      link.click();
      URL.revokeObjectURL(url);
      setNotice("Company-format Physical Stock Statement downloaded successfully.");
    } catch (err) {
      setError(err.message);
    } finally {
      setDownloading(false);
    }
  };

  const sendEmail = async () => {
    setSendingEmail(true);
    setError("");
    setNotice("");
    try {
      const res = await fetch(`${API_BASE}/stock-statements/send-email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          branchName,
          date,
          recipientEmail: recipientEmail.trim()
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to email stock statement");

      setNotice(data.message || `Physical Stock Statement emailed to ${recipientEmail}`);
      setEmailModal(false);
    } catch (err) {
      setError(err.message);
    } finally {
      setSendingEmail(false);
    }
  };

  return (
    <section className="content">
      <PageTitle
        title="Physical Stock Statement"
        subtitle="Mumbai Branch batch inventory statement with company letterhead, FSSAI headers, and one-click email."
      />

      <div className="card" style={{ marginBottom: "22px" }}>
        <form onSubmit={(e) => { e.preventDefault(); generateStatement(); }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "14px" }}>
            <div>
              <label style={{ fontSize: "12px", fontWeight: 700, color: "#334155" }}>Branch</label>
              <input
                disabled
                value="Mumbai Branch"
                style={{ width: "100%", padding: "9px 12px", marginTop: "4px", border: "1px solid #cbd5e1", borderRadius: "8px", background: "#f8fafc", fontWeight: 700 }}
              />
            </div>

            <div>
              <label style={{ fontSize: "12px", fontWeight: 700, color: "#334155" }}>Statement Date</label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                style={{ width: "100%", padding: "9px 12px", marginTop: "4px", border: "1px solid #cbd5e1", borderRadius: "8px", fontWeight: 600 }}
              />
            </div>
          </div>

          <div style={{ marginTop: "16px", display: "flex", gap: "10px" }}>
            <button type="submit" className="primary" disabled={loading}>
              <Eye size={16} /> {loading ? "Generating..." : "Generate Statement"}
            </button>
          </div>
        </form>
      </div>

      {notice && (
        <div style={{
          background: "#ecfdf5",
          border: "1px solid #a7f3d0",
          padding: "10px 16px",
          borderRadius: "8px",
          color: "#065f46",
          marginBottom: "16px",
          fontWeight: 600,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center"
        }}>
          <span>{notice}</span>
          <button
            onClick={() => setNotice("")}
            style={{ background: "none", border: "none", cursor: "pointer", color: "#065f46", fontWeight: "bold", fontSize: "18px", lineHeight: 1 }}
          >
            ×
          </button>
        </div>
      )}

      {error && (
        <div style={{
          background: "#fef2f2",
          border: "1px solid #fecaca",
          padding: "10px 16px",
          borderRadius: "8px",
          color: "#991b1b",
          marginBottom: "16px",
          fontWeight: 600,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center"
        }}>
          <span>{error}</span>
          <button
            onClick={() => setError("")}
            style={{ background: "none", border: "none", cursor: "pointer", color: "#991b1b", fontWeight: "bold", fontSize: "18px", lineHeight: 1 }}
          >
            ×
          </button>
        </div>
      )}

      {statement && (
        <div className="card">
          <div className="card-head">
            <div>
              <h3>Cashew Business Management — Physical Stock Statement</h3>
              <span style={{ fontSize: "13px", fontWeight: 600, color: "#475569" }}>
                Statement Date: {statement.statementDate} · {statement.rows.length} Variety Record(s)
              </span>
            </div>

            <div style={{ display: "flex", gap: "10px" }}>
              <button className="secondary" onClick={generateStatement} disabled={loading}>
                <RefreshCw size={16} /> {loading ? "Refreshing..." : "Refresh"}
              </button>
              <button className="primary" onClick={downloadExcel} disabled={downloading}>
                <Download size={16} /> {downloading ? "Downloading..." : "Download Excel"}
              </button>
              <button className="secondary" onClick={() => setEmailModal(true)}>
                <Mail size={16} /> Send via Email
              </button>
            </div>
          </div>

          {statement.rows.length === 0 ? (
            <p>No batch records found for Mumbai branch.</p>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr style={{ background: "#fef3c7" }}>
                    <th style={{ color: "#78350f" }}>SR.NO.</th>
                    <th style={{ color: "#78350f" }}>WEIGHT / PACK SIZE</th>
                    <th style={{ color: "#78350f" }}>VARIETY</th>
                    <th style={{ color: "#78350f" }}>BATCH NO.</th>
                    <th style={{ color: "#78350f" }}>PHYSICAL QTY (PACKS)</th>
                  </tr>
                </thead>
                <tbody>
                  {statement.rows.map((row, idx) => (
                    <tr key={`${row.batchNumber}-${idx}`}>
                      <td><span className="data-val-bold">{idx + 1}</span></td>
                      <td>
                        <span className="data-val-bold">
                          {row.packSize || (row.item.includes(",") ? row.item.split(",").pop().trim() : (row.unit || "80 GM"))}
                        </span>
                      </td>
                      <td>
                        <strong style={{ fontSize: "15px" }}>{row.productName || row.item}</strong>
                        {row.hasMultipleBatches && (
                          <span
                            style={{
                              marginLeft: "8px",
                              fontSize: "11px",
                              fontWeight: 700,
                              background: "#ecfdf5",
                              color: "#065f46",
                              padding: "2px 7px",
                              borderRadius: "10px",
                              border: "1px solid #a7f3d0",
                              verticalAlign: "middle"
                            }}
                          >
                            {row.batches?.length || 2} Batches
                          </span>
                        )}
                      </td>
                      <td>
                        {row.hasMultipleBatches && Array.isArray(row.batches) ? (
                          <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                            {row.batches.map((b) => (
                              <span
                                key={b.batchNumber}
                                className="code"
                                style={{
                                  fontSize: "13px",
                                  fontWeight: 700,
                                  background: "#eff6ff",
                                  color: "#1e40af",
                                  border: "1px solid #bfdbfe",
                                  padding: "3px 8px",
                                  borderRadius: "6px",
                                  display: "inline-flex",
                                  alignItems: "center"
                                }}
                              >
                                {b.batchNumber}&nbsp;<strong style={{ color: "#2563eb" }}>({b.physicalQty})</strong>
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="code" style={{ fontSize: "13px", fontWeight: 700 }}>
                            {row.batchNumber}
                          </span>
                        )}
                      </td>
                      <td>
                        <span className="data-val-bold" style={{ fontSize: "16px", color: "#0f172a" }}>
                          {Number(row.branchStock) || 0}
                        </span>
                      </td>
                    </tr>
                  ))}
                  <tr style={{ background: "#f8fafc", fontWeight: 800 }}>
                    <td colSpan={4} style={{ textAlign: "right", fontSize: "15px" }}>TOTAL PHYSICAL QUANTITY:</td>
                    <td>
                      <span className="data-val-bold" style={{ fontSize: "17px", color: "#15803d" }}>
                        {statement.rows.reduce((sum, r) => sum + (Number(r.branchStock) || 0), 0)} packs
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Email Modal */}
      {emailModal && (
        <div style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,0.5)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 100,
          padding: "20px"
        }}>
          <div style={{
            background: "white",
            borderRadius: "12px",
            padding: "24px",
            maxWidth: "460px",
            width: "100%",
            boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1)"
          }}>
            <h3 style={{ margin: "0 0 8px", fontSize: "17px" }}>Email Stock Statement</h3>
            <p style={{ fontSize: "13px", color: "#64748b", margin: "0 0 16px" }}>
              Send the company-format Physical Stock Statement Excel workbook for <strong>{branchName}</strong>.
            </p>

            <label style={{ fontSize: "12px", fontWeight: 700, color: "#334155" }}>
              Recipient Email Address *
            </label>
            <input
              type="email"
              required
              style={{ width: "100%", padding: "9px 12px", marginTop: "4px", border: "1px solid #cbd5e1", borderRadius: "8px", marginBottom: "18px" }}
              value={recipientEmail}
              onChange={(e) => setRecipientEmail(e.target.value)}
            />

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
              <button className="secondary" onClick={() => setEmailModal(false)}>
                Cancel
              </button>
              <button className="primary" disabled={sendingEmail || !recipientEmail} onClick={sendEmail}>
                <Mail size={15} /> {sendingEmail ? "Sending..." : "Send Statement"}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

// =============================================================
// CHATBOT MODULE: MNEMONIC LOOKUP REFERENCE
// =============================================================
function ChatbotModule() {
  const mnemonics = [
    { code: "C", name: "Cashew (Plain)", unit: "126 packs (1000 GM)", compact: "IC126" },
    { code: "CR", name: "Cashew - Roasted", unit: "50 packs (200 GM)", compact: "ICR50" },
    { code: "CP80", name: "Cashew - Pepper", unit: "50 packs (80 GM)", compact: "ICP80-50" },
    { code: "CC80", name: "Cashew - Cheese", unit: "3 packs (80 GM)", compact: "ICC80-3" },
    { code: "CS80", name: "Cashew - Spanish Chilly", unit: "24 packs (80 GM)", compact: "ICS80-24" },
    { code: "CO80", name: "Cashew - Cream & Onion", unit: "105 packs (80 GM)", compact: "ICO80-105" },
    { code: "CB80", name: "Cashew - BBQ", unit: "0 packs (80 GM)", compact: "ICB80-0" }
  ];

  return (
    <section className="content">
      <PageTitle
        title="Telegram Chatbot Integration"
        subtitle="The RetailBot operates independently via Telegram with Invoice Number tracking, uncluttered flows, and mnemonic fast lookup."
      />

      <div className="grid-2">
        <div className="card">
          <div className="card-head">
            <div>
              <h3>How Retailers & Staff Use the Bot</h3>
              <span>Connected directly to central MongoDB database</span>
            </div>
          </div>

          <div style={{ fontSize: "14px", lineHeight: "1.8", color: "#334155" }}>
            <p>
              The Telegram bot connects directly to the same database as this dashboard.
            </p>
            <ol style={{ paddingLeft: "20px" }}>
              <li>
                <strong>Record Sale:</strong> Staff enter customer name and invoice number, choose product and batch, input quantity, and can seamlessly add multiple products to the same invoice.
              </li>
              <li>
                <strong>Check Inventory:</strong> Retailers query stock via guided buttons or send mnemonic codes to receive a clean, uncluttered inventory report with batch details.
              </li>
              <li>
                <strong>Mnemonic Fast-Lookup:</strong> Sending mnemonic codes (e.g. <code>CP80</code> or <code>C</code>) immediately returns current stock and active batches.
              </li>
              <li>
                <strong>Update Stock:</strong> Adjust inventory by selecting product and either adding to an existing batch or assigning a new batch number.
              </li>
              <li>
                <strong>Purchase Orders:</strong> Automatic PO generation, company-format Excel downloads, and goods receipts with batch assignment are managed through this web portal.
              </li>
            </ol>
          </div>
        </div>

        <div className="card">
          <div className="card-head">
            <div>
              <h3>Mnemonic Codes Reference</h3>
              <span>Active product lookup codes for Mumbai Branch</span>
            </div>
          </div>

          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>CODE</th>
                  <th>PRODUCT</th>
                  <th>CURRENT STOCK</th>
                  <th>COMPACT CODE</th>
                </tr>
              </thead>
              <tbody>
                {mnemonics.map((m) => (
                  <tr key={m.code}>
                    <td><span className="mnemonic-pill">{m.code}</span></td>
                    <td><strong>{m.name}</strong></td>
                    <td><span className="data-val-bold">{m.unit}</span></td>
                    <td><code>{m.compact}</code></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </section>
  );
}

createRoot(document.getElementById("root")).render(<App />);