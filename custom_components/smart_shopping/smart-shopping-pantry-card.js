/**
 * Smart Shopping — Pantry Card v2.0.0
 * Tracks pantry items centrally via HA state (sensor.smart_shopping_pantry).
 * All data is stored in HA and synced across every device.
 */

const PANTRY_VERSION = "2.0.0";

const LOCATIONS = [
  { id: "cupboard", label: "Cupboard", icon: "🗄️",  color: "#8D6E63" },
  { id: "fridge",   label: "Fridge",   icon: "❄️",   color: "#42A5F5" },
  { id: "freezer",  label: "Freezer",  icon: "🧊",   color: "#26C6DA" },
];

function fmtDate(iso) {
  if (!iso) return "";
  try { return new Date(iso).toLocaleDateString(undefined, { day:"numeric", month:"short", year:"numeric" }); }
  catch { return iso; }
}

function daysUntil(iso) {
  if (!iso) return null;
  const now  = new Date(); now.setHours(0,0,0,0);
  const then = new Date(iso); then.setHours(0,0,0,0);
  return Math.round((then - now) / 86400000);
}

function expiryClass(iso) {
  if (!iso) return "";
  const d = daysUntil(iso);
  if (d === null) return "";
  if (d < 0)  return "expired";
  if (d <= 3) return "expiring-soon";
  if (d <= 7) return "expiring";
  return "";
}

function genId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2,6);
}

const PANTRY_STYLES = `
  :host { display:block; width:100%;
    --p-bg:      var(--card-background-color, #1a1a2e);
    --p-surface: var(--secondary-background-color, #16213e);
    --p-primary: #00d4aa;
    --p-accent:  #ff6b6b;
    --p-text:    var(--primary-text-color, #e0e0e0);
    --p-muted:   var(--secondary-text-color, #9e9e9e);
    --p-border:  rgba(255,255,255,0.08);
    font-family: 'Segoe UI', system-ui, sans-serif;
  }
  * { box-sizing:border-box; margin:0; padding:0; }
  .card { display:block; width:100%; background:var(--p-bg); border-radius:16px; overflow:hidden; color:var(--p-text); }

  .p-header { background:linear-gradient(135deg,#1a3a2e,#16213e 55%,#1a3a2e); padding:18px 20px; display:flex; align-items:center; gap:14px; border-bottom:1px solid var(--p-border); }
  .p-header-icon { font-size:26px; width:46px; height:46px; background:linear-gradient(135deg,var(--p-primary),#00a884); border-radius:13px; display:flex; align-items:center; justify-content:center; flex-shrink:0; }
  .p-header-text { flex:1; min-width:0; }
  .p-title    { font-size:17px; font-weight:700; color:#fff; }
  .p-subtitle { font-size:12px; color:var(--p-primary); margin-top:2px; }
  .p-add-btn  { background:linear-gradient(135deg,var(--p-primary),#00a884); border:none; border-radius:10px; padding:8px 14px; font-size:13px; font-weight:700; color:#000; cursor:pointer; white-space:nowrap; transition:filter .2s; flex-shrink:0; }
  .p-add-btn:hover { filter:brightness(1.1); }

  .loc-tabs { display:flex; border-bottom:1px solid var(--p-border); overflow-x:auto; scrollbar-width:none; }
  .loc-tabs::-webkit-scrollbar { display:none; }
  .loc-tab { flex:1; min-width:80px; padding:10px 4px; font-size:12px; font-weight:600; cursor:pointer; border:none; background:transparent; color:var(--p-muted); border-bottom:2px solid transparent; transition:all .2s; display:flex; align-items:center; justify-content:center; gap:4px; white-space:nowrap; }
  .loc-tab.active { color:var(--p-primary); border-bottom-color:var(--p-primary); }
  .tab-count { background:rgba(0,212,170,.15); color:var(--p-primary); border-radius:10px; padding:1px 6px; font-size:10px; font-weight:800; }

  .p-toolbar { padding:10px 14px; background:var(--p-surface); border-bottom:1px solid var(--p-border); display:flex; gap:8px; }
  .p-search { flex:1; background:rgba(255,255,255,.05); border:1px solid var(--p-border); border-radius:9px; padding:7px 12px; font-size:13px; color:var(--p-text); outline:none; font-family:inherit; }
  .p-search:focus { border-color:var(--p-primary); }
  .p-search::placeholder { color:var(--p-muted); }
  .p-sort { background:rgba(255,255,255,.05); border:1px solid var(--p-border); border-radius:9px; padding:7px 10px; font-size:12px; color:var(--p-text); cursor:pointer; outline:none; font-family:inherit; }

  .p-items { overflow-y:auto; max-height:460px; -webkit-overflow-scrolling:touch; touch-action:pan-y; overscroll-behavior:contain; }
  .p-item { display:flex; align-items:flex-start; gap:10px; padding:12px 16px; border-bottom:1px solid var(--p-border); transition:background .15s; }
  .p-item:last-child { border-bottom:none; }
  .p-item:hover { background:rgba(255,255,255,.03); }
  .p-item-loc { font-size:20px; width:32px; height:32px; display:flex; align-items:center; justify-content:center; flex-shrink:0; margin-top:2px; }
  .p-item-main { flex:1; min-width:0; }
  .p-item-name { font-size:14px; font-weight:600; color:var(--p-text); }
  .p-item-meta { display:flex; flex-wrap:wrap; gap:5px; margin-top:5px; }
  .p-badge { font-size:10px; font-weight:600; padding:2px 7px; border-radius:10px; white-space:nowrap; }
  .badge-qty    { background:rgba(0,212,170,.12); color:var(--p-primary); }
  .badge-loc    { border-radius:10px; padding:2px 7px; font-size:10px; font-weight:600; }
  .badge-bought { background:rgba(255,255,255,.06); color:var(--p-muted); }
  .badge-bestby { background:rgba(255,255,255,.06); color:var(--p-muted); }
  .badge-bestby.expiring-soon { background:rgba(255,107,107,.18); color:#ff8a80; font-weight:700; }
  .badge-bestby.expiring      { background:rgba(255,167,38,.15);  color:#ffb74d; }
  .badge-bestby.expired       { background:rgba(255,82,82,.18);   color:var(--p-accent); font-weight:700; }

  .p-item-actions { display:flex; gap:5px; flex-shrink:0; margin-top:2px; }
  .p-btn { border:none; border-radius:8px; width:30px; height:30px; cursor:pointer; display:flex; align-items:center; justify-content:center; font-size:13px; transition:all .15s; }
  .p-btn-edit   { background:rgba(255,255,255,.06); color:var(--p-muted); }
  .p-btn-edit:hover   { background:rgba(0,212,170,.15); color:var(--p-primary); }
  .p-btn-delete { background:rgba(255,255,255,.06); color:var(--p-muted); }
  .p-btn-delete:hover { background:rgba(255,107,107,.2); color:var(--p-accent); }

  .p-empty { text-align:center; padding:40px 20px; color:var(--p-muted); }
  .p-empty-icon { font-size:40px; margin-bottom:10px; }

  .p-modal-overlay { position:fixed; inset:0; background:rgba(0,0,0,.75); backdrop-filter:blur(4px); z-index:9999; display:flex; align-items:center; justify-content:center; padding:16px; }
  .p-modal { background:#1a1a2e; border:1px solid rgba(255,255,255,.12); border-radius:20px; width:100%; max-width:460px; max-height:90vh; overflow-y:auto; box-shadow:0 24px 80px rgba(0,0,0,.5); }
  .p-modal-header { padding:18px 20px 0; display:flex; align-items:center; justify-content:space-between; }
  .p-modal-title  { font-size:16px; font-weight:700; color:#fff; }
  .p-modal-close  { background:rgba(255,255,255,.08); border:none; border-radius:50%; width:30px; height:30px; cursor:pointer; color:var(--p-muted); font-size:14px; display:flex; align-items:center; justify-content:center; }
  .p-modal-close:hover { background:rgba(255,107,107,.2); color:var(--p-accent); }
  .p-modal-body   { padding:16px 20px 20px; display:flex; flex-direction:column; gap:14px; }
  .p-form-group { display:flex; flex-direction:column; gap:5px; }
  .p-form-row   { display:grid; grid-template-columns:1fr 1fr; gap:10px; }
  .p-label { font-size:11px; font-weight:700; color:var(--p-muted); letter-spacing:.5px; text-transform:uppercase; }
  .p-input, .p-select { background:rgba(255,255,255,.06); border:1px solid var(--p-border); border-radius:10px; padding:10px 13px; font-size:14px; color:var(--p-text); outline:none; width:100%; font-family:inherit; transition:border-color .2s; appearance:none; -webkit-appearance:none; }
  .p-input:focus, .p-select:focus { border-color:var(--p-primary); }
  .p-input::placeholder { color:var(--p-muted); }
  .loc-picker { display:grid; grid-template-columns:repeat(3,1fr); gap:8px; }
  .loc-opt { padding:10px 6px; border-radius:12px; border:1.5px solid var(--p-border); cursor:pointer; text-align:center; transition:all .18s; background:rgba(255,255,255,.03); }
  .loc-opt .loc-icon { font-size:22px; }
  .loc-opt .loc-lbl  { font-size:11px; font-weight:600; color:var(--p-muted); margin-top:4px; }
  .loc-opt.selected  { border-color:var(--p-primary); background:rgba(0,212,170,.1); }
  .loc-opt.selected .loc-lbl { color:var(--p-primary); }
  .p-btn-primary { background:linear-gradient(135deg,var(--p-primary),#00a884); border:none; border-radius:10px; padding:12px; font-size:15px; font-weight:700; color:#000; cursor:pointer; width:100%; transition:filter .2s; }
  .p-btn-primary:hover { filter:brightness(1.1); }
  .p-saving { opacity:.6; pointer-events:none; }
`;

class SmartShoppingPantryCard extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode:"open" });
    this._config    = {};
    this._hass      = null;
    this._entityId  = null;
    this._rendered  = false;
    this._items     = [];
    this._activeTab = "all";
    this._search    = "";
    this._sort      = "name";
    this._modal     = null;
    this._saving    = false;
  }

  setConfig(config) {
    this._config   = config;
    this._entityId = config.entity_id || "sensor.smart_shopping_pantry";
    this._render();
  }

  set hass(hass) {
    this._hass = hass;
    const stateObj = hass.states[this._entityId];
    if (stateObj?.attributes?.pantry !== undefined) {
      this._items = stateObj.attributes.pantry || [];
    }
    this._render();
  }

  _callService(service, data) {
    if (!this._hass) return;
    this._hass.callService("smart_shopping", service, data);
  }

  _render() {
    if (!this._hass) return;
    const root = this.shadowRoot;
    if (!this._rendered) {
      root.innerHTML = "";
      const style = document.createElement("style");
      style.textContent = PANTRY_STYLES;
      root.appendChild(style);
      this._cardEl  = document.createElement("div");
      this._cardEl.className = "card";
      this._modalEl = document.createElement("div");
      root.appendChild(this._cardEl);
      root.appendChild(this._modalEl);
      this._rendered = true;
    }
    this._cardEl.innerHTML  = this._buildCard();
    this._modalEl.innerHTML = this._modal ? this._buildModal() : "";
    this._bind();
  }

  _buildCard() {
    const items = this._filteredItems();
    const total = this._items.length;
    const tabCounts = { all: total };
    LOCATIONS.forEach(l => { tabCounts[l.id] = this._items.filter(i => i.location === l.id).length; });

    const tabs = [{ id:"all", label:"All", icon:"📦" }, ...LOCATIONS].map(t => `
      <button class="loc-tab${this._activeTab===t.id?" active":""}" data-tab="${t.id}">
        ${t.icon} ${t.label} <span class="tab-count">${tabCounts[t.id]||0}</span>
      </button>`).join("");

    const rows = items.length
      ? items.map(item => this._buildRow(item)).join("")
      : `<div class="p-empty"><div class="p-empty-icon">🗄️</div><div>No items here yet — tap + Add item</div></div>`;

    return `
      <div class="p-header">
        <div class="p-header-icon">🗄️</div>
        <div class="p-header-text">
          <div class="p-title">Pantry</div>
          <div class="p-subtitle">${total} item${total!==1?"s":""} stored</div>
        </div>
        <button class="p-add-btn" id="p-add">＋ Add item</button>
      </div>
      <div class="loc-tabs">${tabs}</div>
      <div class="p-toolbar">
        <input class="p-search" id="p-search" type="text" placeholder="🔍 Search…" value="${this._search}">
        <select class="p-sort" id="p-sort">
          <option value="name"   ${this._sort==="name"   ?"selected":""}>A–Z</option>
          <option value="expiry" ${this._sort==="expiry" ?"selected":""}>Expiry</option>
          <option value="bought" ${this._sort==="bought" ?"selected":""}>Date bought</option>
        </select>
      </div>
      <div class="p-items">${rows}</div>`;
  }

  _buildRow(item) {
    const loc    = LOCATIONS.find(l => l.id === item.location) || { icon:"📦", label:"?", color:"#9E9E9E" };
    const expCls = expiryClass(item.best_by);
    const days   = daysUntil(item.best_by);
    const expLbl = days===null?"" : days<0?"Expired" : days===0?"Expires today!" : `${days}d left`;
    return `
      <div class="p-item">
        <div class="p-item-loc">${loc.icon}</div>
        <div class="p-item-main">
          <div class="p-item-name">${item.name}</div>
          <div class="p-item-meta">
            ${item.quantity?`<span class="p-badge badge-qty">${item.quantity}${item.unit||""}</span>`:""}
            <span class="p-badge badge-loc" style="background:${loc.color}22;color:${loc.color}">${loc.label}</span>
            ${item.purchased_at?`<span class="p-badge badge-bought">Bought ${fmtDate(item.purchased_at)}</span>`:""}
            ${item.best_by?`<span class="p-badge badge-bestby ${expCls}">Best by ${fmtDate(item.best_by)}${expLbl?" · "+expLbl:""}</span>`:""}
          </div>
        </div>
        <div class="p-item-actions">
          <button class="p-btn p-btn-edit"   data-edit="${item.id}"   title="Edit">✏️</button>
          <button class="p-btn p-btn-delete" data-delete="${item.id}" title="Remove">✕</button>
        </div>
      </div>`;
  }

  _filteredItems() {
    let items = [...this._items];
    if (this._activeTab !== "all") items = items.filter(i => i.location === this._activeTab);
    if (this._search) {
      const q = this._search.toLowerCase();
      items = items.filter(i => (i.name||"").toLowerCase().includes(q));
    }
    if (this._sort === "expiry") {
      items.sort((a,b) => {
        if (!a.best_by&&!b.best_by) return 0;
        if (!a.best_by) return 1;
        if (!b.best_by) return -1;
        return new Date(a.best_by)-new Date(b.best_by);
      });
    } else if (this._sort === "bought") {
      items.sort((a,b) => new Date(b.purchased_at||0)-new Date(a.purchased_at||0));
    } else {
      items.sort((a,b) => (a.name||"").localeCompare(b.name||""));
    }
    return items;
  }

  _buildModal() {
    const m    = this._modal;
    const item = m.item || {};
    const isEdit = m.mode === "edit";
    const today  = new Date().toISOString().slice(0,10);
    const locPicker = LOCATIONS.map(l => `
      <div class="loc-opt${(item.location||"cupboard")===l.id?" selected":""}" data-loc="${l.id}">
        <div class="loc-icon">${l.icon}</div>
        <div class="loc-lbl">${l.label}</div>
      </div>`).join("");
    return `
      <div class="p-modal-overlay" id="p-overlay">
        <div class="p-modal">
          <div class="p-modal-header">
            <div class="p-modal-title">${isEdit?"✏️ Edit Item":"＋ Add to Pantry"}</div>
            <button class="p-modal-close" id="p-modal-close">✕</button>
          </div>
          <div class="p-modal-body${this._saving?" p-saving":""}">
            <div class="p-form-group">
              <label class="p-label">Item name</label>
              <input class="p-input" id="pf-name" type="text" placeholder="e.g. Canned tomatoes" value="${item.name||""}">
            </div>
            <div class="p-form-row">
              <div class="p-form-group">
                <label class="p-label">Quantity</label>
                <input class="p-input" id="pf-qty" type="number" min="0" step="0.1" placeholder="1" value="${item.quantity||""}">
              </div>
              <div class="p-form-group">
                <label class="p-label">Unit</label>
                <input class="p-input" id="pf-unit" type="text" placeholder="kg, L, cans…" value="${item.unit||""}">
              </div>
            </div>
            <div class="p-form-group">
              <label class="p-label">Storage location</label>
              <div class="loc-picker" id="pf-loc-picker">${locPicker}</div>
              <input type="hidden" id="pf-loc" value="${item.location||"cupboard"}">
            </div>
            <div class="p-form-row">
              <div class="p-form-group">
                <label class="p-label">Date purchased</label>
                <input class="p-input" id="pf-bought" type="date" value="${item.purchased_at?item.purchased_at.slice(0,10):today}">
              </div>
              <div class="p-form-group">
                <label class="p-label">Best by / Use by</label>
                <input class="p-input" id="pf-bestby" type="date" value="${item.best_by||""}">
              </div>
            </div>
            <button class="p-btn-primary" id="pf-submit">${isEdit?"Save changes":"Add to pantry"}</button>
          </div>
        </div>
      </div>`;
  }

  _bind() {
    const sr = this.shadowRoot;
    const $  = id => sr.getElementById(id);

    $("p-add")?.addEventListener("click", () => {
      this._modal = { mode:"add", item:{ location:"cupboard", purchased_at:new Date().toISOString().slice(0,10) } };
      this._render();
    });

    sr.querySelectorAll("[data-tab]").forEach(el =>
      el.addEventListener("click", () => { this._activeTab = el.dataset.tab; this._render(); }));

    $("p-search")?.addEventListener("input", e => {
      this._search = e.target.value;
      this._cardEl.innerHTML = this._buildCard();
      this._bind();
    });

    $("p-sort")?.addEventListener("change", e => {
      this._sort = e.target.value;
      this._cardEl.innerHTML = this._buildCard();
      this._bind();
    });

    sr.querySelectorAll("[data-edit]").forEach(el =>
      el.addEventListener("click", () => {
        const item = this._items.find(i => i.id === el.dataset.edit);
        if (item) { this._modal = { mode:"edit", item:{ ...item } }; this._render(); }
      })
    );

    sr.querySelectorAll("[data-delete]").forEach(el =>
      el.addEventListener("click", () => {
        const id = el.dataset.delete;
        // Optimistic removal from local state
        this._items = this._items.filter(i => i.id !== id);
        this._callService("pantry_remove", { id });
        this._render();
      })
    );

    if (this._modal) {
      $("p-modal-close")?.addEventListener("click", () => { this._modal=null; this._render(); });
      $("p-overlay")?.addEventListener("click", e => { if (e.target.id==="p-overlay") { this._modal=null; this._render(); } });

      sr.querySelectorAll("[data-loc]").forEach(el =>
        el.addEventListener("click", () => {
          sr.querySelectorAll("[data-loc]").forEach(o => o.classList.remove("selected"));
          el.classList.add("selected");
          $("pf-loc").value = el.dataset.loc;
          if (this._modal.item) this._modal.item.location = el.dataset.loc;
        })
      );

      $("pf-submit")?.addEventListener("click", () => {
        const name = ($("pf-name")?.value||"").trim();
        if (!name) { $("pf-name")?.focus(); return; }
        const entry = {
          id:           this._modal.item?.id || genId(),
          name,
          quantity:     $("pf-qty")?.value   || "",
          unit:         $("pf-unit")?.value  || "",
          location:     $("pf-loc")?.value   || "cupboard",
          purchased_at: $("pf-bought")?.value || "",
          best_by:      $("pf-bestby")?.value || "",
        };
        // Optimistic update local state
        const idx = this._items.findIndex(i => i.id === entry.id);
        if (idx !== -1) { this._items[idx] = entry; }
        else            { this._items.unshift(entry); }
        // Call HA service — HA will broadcast state update back to all devices
        const svc = this._modal.mode === "edit" ? "pantry_update" : "pantry_add";
        this._callService(svc, entry);
        this._modal = null;
        this._render();
      });
    }
  }

  static getStubConfig() {
    return { entity_id: "sensor.smart_shopping_pantry" };
  }

  getCardSize() { return 5; }
}

try {
  if (!customElements.get("smart-shopping-pantry-card")) {
    customElements.define("smart-shopping-pantry-card", SmartShoppingPantryCard);
  }
} catch(e) {
  console.error("Smart Shopping Pantry card failed to register:", e);
}

window.customCards = window.customCards || [];
if (!window.customCards.find(c => c.type === "smart-shopping-pantry-card")) {
  window.customCards.push({
    type:        "smart-shopping-pantry-card",
    name:        "Smart Shopping — Pantry",
    description: "Track pantry items centrally across all devices: qty, purchase date, best-by, and storage location.",
    preview:     true,
  });
}

console.info(
  `%c SMART SHOPPING PANTRY %c v${PANTRY_VERSION} `,
  "color:#00d4aa;font-weight:bold;background:#1a3a2e;padding:2px 6px;border-radius:4px 0 0 4px;",
  "color:#fff;background:#0f3460;padding:2px 6px;border-radius:0 4px 4px 0;"
);
