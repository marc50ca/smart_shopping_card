/**
 * Smart Shopping — Pantry Card v4.0.0
 * Central HA-backed storage. Horizontal tile grid.
 * Each entry has a container quantity and an optional contents list
 * (e.g. "1 box containing 3 granola bars, 2 cereal pouches").
 * Modal is isolated from hass() updates — form inputs are never wiped.
 */

const PANTRY_VERSION = "4.0.0";

const LOCATIONS = [
  { id:"cupboard", label:"Cupboard", icon:"🗄️", color:"#8D6E63" },
  { id:"fridge",   label:"Fridge",   icon:"❄️",  color:"#42A5F5" },
  { id:"freezer",  label:"Freezer",  icon:"🧊",  color:"#26C6DA" },
];

function fmtDate(iso) {
  if (!iso) return "";
  try { return new Date(iso).toLocaleDateString(undefined, {day:"numeric",month:"short",year:"numeric"}); }
  catch { return iso; }
}
function daysUntil(iso) {
  if (!iso) return null;
  const now=new Date(); now.setHours(0,0,0,0);
  const d=new Date(iso); d.setHours(0,0,0,0);
  return Math.round((d-now)/86400000);
}
function expiryClass(iso) {
  const d=daysUntil(iso);
  if (d===null) return "";
  if (d<0) return "expired";
  if (d<=3) return "expiring-soon";
  if (d<=7) return "expiring";
  return "";
}
function genId() { return Date.now().toString(36)+Math.random().toString(36).slice(2,6); }

// ── Styles ───────────────────────────────────────────────────────────────────
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

  /* HEADER */
  .p-header { background:linear-gradient(135deg,#1a3a2e,#16213e 55%,#1a3a2e); padding:16px 18px; display:flex; align-items:center; gap:12px; border-bottom:1px solid var(--p-border); }
  .p-header-icon { font-size:24px; width:44px; height:44px; background:linear-gradient(135deg,var(--p-primary),#00a884); border-radius:12px; display:flex; align-items:center; justify-content:center; flex-shrink:0; }
  .p-header-text { flex:1; min-width:0; }
  .p-title    { font-size:16px; font-weight:700; color:#fff; }
  .p-subtitle { font-size:11px; color:var(--p-primary); margin-top:2px; }
  .p-add-btn  { background:linear-gradient(135deg,var(--p-primary),#00a884); border:none; border-radius:10px; padding:8px 13px; font-size:12px; font-weight:700; color:#000; cursor:pointer; white-space:nowrap; flex-shrink:0; }
  .p-add-btn:hover { filter:brightness(1.1); }

  /* LOCATION TABS */
  .loc-tabs { display:flex; border-bottom:1px solid var(--p-border); overflow-x:auto; scrollbar-width:none; }
  .loc-tabs::-webkit-scrollbar { display:none; }
  .loc-tab { flex:1; min-width:72px; padding:9px 4px; font-size:11px; font-weight:600; cursor:pointer; border:none; background:transparent; color:var(--p-muted); border-bottom:2px solid transparent; transition:all .2s; display:flex; align-items:center; justify-content:center; gap:4px; white-space:nowrap; }
  .loc-tab.active { color:var(--p-primary); border-bottom-color:var(--p-primary); }
  .tab-count { background:rgba(0,212,170,.15); color:var(--p-primary); border-radius:10px; padding:1px 5px; font-size:9px; font-weight:800; }

  /* TOOLBAR */
  .p-toolbar { padding:8px 12px; background:var(--p-surface); border-bottom:1px solid var(--p-border); display:flex; gap:8px; }
  .p-search { flex:1; background:rgba(255,255,255,.05); border:1px solid var(--p-border); border-radius:8px; padding:6px 11px; font-size:12px; color:var(--p-text); outline:none; font-family:inherit; }
  .p-search:focus { border-color:var(--p-primary); }
  .p-search::placeholder { color:var(--p-muted); }
  .p-sort { background:rgba(255,255,255,.05); border:1px solid var(--p-border); border-radius:8px; padding:6px 9px; font-size:11px; color:var(--p-text); cursor:pointer; outline:none; font-family:inherit; appearance:none; -webkit-appearance:none; }

  /* TILE GRID */
  .p-grid { display:grid; grid-template-columns:repeat(auto-fill, minmax(140px,1fr)); gap:10px; padding:12px 14px; overflow-y:auto; max-height:500px; -webkit-overflow-scrolling:touch; touch-action:pan-y; overscroll-behavior:contain; }

  /* TILE */
  .p-tile { background:rgba(255,255,255,.05); border:1px solid var(--p-border); border-radius:14px; display:flex; flex-direction:column; overflow:hidden; transition:border-color .2s; min-width:0; }
  .p-tile:hover { border-color:rgba(0,212,170,.35); }

  .p-tile-top { padding:12px 10px 8px; display:flex; flex-direction:column; align-items:center; gap:5px; }
  .p-tile-loc-icon { font-size:26px; }
  .p-tile-name { font-size:12px; font-weight:700; color:var(--p-text); text-align:center; word-break:break-word; line-height:1.3; }
  .p-tile-qty  { font-size:11px; font-weight:600; color:var(--p-primary); }

  /* contents list inside tile */
  .p-tile-contents { padding:0 8px 6px; display:flex; flex-direction:column; gap:2px; }
  .p-tile-content-row { display:flex; align-items:center; gap:4px; font-size:10px; color:var(--p-muted); }
  .p-tile-content-row::before { content:"·"; flex-shrink:0; }
  .p-tile-content-name { flex:1; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
  .p-tile-content-qty  { color:var(--p-primary); font-weight:700; flex-shrink:0; }

  /* badges */
  .p-tile-badges { padding:0 8px 6px; display:flex; flex-wrap:wrap; gap:3px; }
  .p-badge { font-size:9px; font-weight:700; padding:2px 5px; border-radius:8px; white-space:nowrap; }
  .badge-loc    { }
  .badge-bought { background:rgba(255,255,255,.07); color:var(--p-muted); }
  .badge-bestby { background:rgba(255,255,255,.07); color:var(--p-muted); }
  .badge-bestby.expiring-soon { background:rgba(255,107,107,.2); color:#ff8a80; }
  .badge-bestby.expiring      { background:rgba(255,167,38,.15);  color:#ffb74d; }
  .badge-bestby.expired       { background:rgba(255,82,82,.2);    color:var(--p-accent); }

  /* actions */
  .p-tile-actions { display:flex; border-top:1px solid var(--p-border); margin-top:auto; }
  .p-tile-btn { flex:1; border:none; background:transparent; color:var(--p-muted); font-size:13px; padding:7px 0; cursor:pointer; transition:all .15s; }
  .p-tile-btn:first-child { border-right:1px solid var(--p-border); }
  .p-tile-btn.edt:hover { background:rgba(0,212,170,.1); color:var(--p-primary); }
  .p-tile-btn.del:hover { background:rgba(255,107,107,.15); color:var(--p-accent); }

  /* EMPTY */
  .p-empty { text-align:center; padding:40px 20px; color:var(--p-muted); grid-column:1/-1; }
  .p-empty-icon { font-size:38px; margin-bottom:10px; }

  /* MODAL */
  .p-overlay { position:fixed; inset:0; background:rgba(0,0,0,.75); backdrop-filter:blur(4px); z-index:9999; display:flex; align-items:center; justify-content:center; padding:16px; }
  .p-modal { background:#1a1a2e; border:1px solid rgba(255,255,255,.12); border-radius:20px; width:100%; max-width:500px; max-height:92vh; overflow-y:auto; box-shadow:0 24px 80px rgba(0,0,0,.5); }
  .p-modal-hdr  { padding:18px 20px 0; display:flex; align-items:center; justify-content:space-between; }
  .p-modal-title{ font-size:16px; font-weight:700; color:#fff; }
  .p-modal-x    { background:rgba(255,255,255,.08); border:none; border-radius:50%; width:30px; height:30px; cursor:pointer; color:var(--p-muted); font-size:14px; display:flex; align-items:center; justify-content:center; }
  .p-modal-x:hover { background:rgba(255,107,107,.2); color:var(--p-accent); }
  .p-modal-body { padding:16px 20px 20px; display:flex; flex-direction:column; gap:12px; }
  .p-fg { display:flex; flex-direction:column; gap:5px; }
  .p-fr { display:grid; grid-template-columns:1fr 1fr; gap:10px; }
  .p-lbl { font-size:10px; font-weight:700; color:var(--p-muted); letter-spacing:.6px; text-transform:uppercase; }
  .p-input, .p-sel { background:rgba(255,255,255,.06); border:1px solid var(--p-border); border-radius:10px; padding:10px 12px; font-size:14px; color:var(--p-text); outline:none; width:100%; font-family:inherit; transition:border-color .2s; appearance:none; -webkit-appearance:none; }
  .p-input:focus, .p-sel:focus { border-color:var(--p-primary); }
  .p-input::placeholder { color:var(--p-muted); }

  /* location picker */
  .loc-picker { display:grid; grid-template-columns:repeat(3,1fr); gap:8px; }
  .loc-opt { padding:10px 4px; border-radius:12px; border:1.5px solid var(--p-border); cursor:pointer; text-align:center; transition:all .18s; background:rgba(255,255,255,.03); }
  .loc-opt-icon { font-size:22px; }
  .loc-opt-lbl  { font-size:10px; font-weight:600; color:var(--p-muted); margin-top:3px; }
  .loc-opt.selected { border-color:var(--p-primary); background:rgba(0,212,170,.1); }
  .loc-opt.selected .loc-opt-lbl { color:var(--p-primary); }

  /* contents editor */
  .contents-section { background:rgba(255,255,255,.03); border:1px solid var(--p-border); border-radius:12px; padding:12px; }
  .contents-header  { display:flex; align-items:center; justify-content:space-between; margin-bottom:10px; }
  .contents-title   { font-size:11px; font-weight:700; color:var(--p-muted); letter-spacing:.6px; text-transform:uppercase; }
  .contents-add-btn { background:rgba(0,212,170,.15); border:1px solid rgba(0,212,170,.3); border-radius:8px; padding:4px 10px; font-size:11px; font-weight:700; color:var(--p-primary); cursor:pointer; }
  .contents-add-btn:hover { background:rgba(0,212,170,.25); }
  .contents-list    { display:flex; flex-direction:column; gap:6px; }
  .content-row      { display:grid; grid-template-columns:1fr 60px 52px 28px; gap:5px; align-items:center; }
  .content-row .p-input { padding:7px 9px; font-size:12px; }
  .content-row-del  { background:rgba(255,107,107,.1); border:1px solid rgba(255,107,107,.2); border-radius:8px; width:28px; height:32px; cursor:pointer; color:var(--p-accent); font-size:13px; display:flex; align-items:center; justify-content:center; }
  .content-row-del:hover { background:rgba(255,107,107,.25); }
  .contents-hint    { font-size:10px; color:var(--p-muted); margin-top:6px; font-style:italic; }

  .p-submit { background:linear-gradient(135deg,var(--p-primary),#00a884); border:none; border-radius:10px; padding:12px; font-size:14px; font-weight:700; color:#000; cursor:pointer; width:100%; margin-top:4px; }
  .p-submit:hover { filter:brightness(1.1); }
  .p-divider { height:1px; background:var(--p-border); margin:2px 0; }
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
    this._modal     = null;   // { mode, item } — never wiped by hass updates
  }

  setConfig(config) {
    this._config   = config;
    this._entityId = config.entity_id || "sensor.smart_shopping_pantry";
  }

  set hass(hass) {
    this._hass = hass;
    const stateObj = hass.states[this._entityId];
    if (stateObj?.attributes?.pantry !== undefined) {
      this._items = stateObj.attributes.pantry || [];
    }
    if (!this._rendered) {
      this._initDOM();
    } else {
      this._updateCard();   // only rebuilds _cardEl, never _modalEl
    }
  }

  _callService(svc, data) {
    if (!this._hass) return;
    this._hass.callService("smart_shopping", svc, data);
  }

  // ── DOM lifecycle ────────────────────────────────────────────────────────
  _initDOM() {
    if (this._rendered) return;
    this._rendered = true;
    const root = this.shadowRoot;
    root.innerHTML = "";
    const style = document.createElement("style");
    style.textContent = PANTRY_STYLES;
    root.appendChild(style);
    const wrap = document.createElement("div");
    wrap.className = "card";
    root.appendChild(wrap);
    this._cardEl  = document.createElement("div");
    this._modalEl = document.createElement("div");
    wrap.appendChild(this._cardEl);
    wrap.appendChild(this._modalEl);
    this._updateCard();
  }

  // ── Card body (safe to rebuild — modal is untouched) ─────────────────────
  _updateCard() {
    if (!this._cardEl) return;
    this._cardEl.innerHTML = this._buildCard();
    this._bindCard();
  }

  _buildCard() {
    const items  = this._filteredItems();
    const total  = this._items.length;
    const counts = { all: total };
    LOCATIONS.forEach(l => { counts[l.id] = this._items.filter(i => i.location === l.id).length; });

    const tabs = [{ id:"all", label:"All", icon:"📦" }, ...LOCATIONS].map(t =>
      `<button class="loc-tab${this._activeTab===t.id?" active":""}" data-tab="${t.id}">
        ${t.icon} ${t.label} <span class="tab-count">${counts[t.id]||0}</span>
      </button>`
    ).join("");

    const tiles = items.length
      ? items.map(i => this._buildTile(i)).join("")
      : `<div class="p-empty"><div class="p-empty-icon">🗄️</div><div>No items yet — tap ＋ Add item</div></div>`;

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
      <div class="p-grid">${tiles}</div>`;
  }

  _buildTile(item) {
    const loc    = LOCATIONS.find(l => l.id === item.location) || LOCATIONS[0];
    const expCls = expiryClass(item.best_by);
    const days   = daysUntil(item.best_by);
    const expLbl = days===null?"" : days<0?"Expired!" : days===0?"Today!" : `${days}d`;
    const qtyStr = item.quantity ? `${item.quantity}${item.unit?" "+item.unit:""}` : "";

    const contents = (item.contents || []);
    const contentsHtml = contents.length
      ? `<div class="p-tile-contents">
          ${contents.map(c => `
            <div class="p-tile-content-row">
              <span class="p-tile-content-name">${c.name}</span>
              ${c.quantity ? `<span class="p-tile-content-qty">${c.quantity}${c.unit||""}</span>` : ""}
            </div>`).join("")}
         </div>`
      : "";

    return `
      <div class="p-tile">
        <div class="p-tile-top" style="background:${loc.color}18;border-bottom:2px solid ${loc.color}44">
          <div class="p-tile-loc-icon">${loc.icon}</div>
          <div class="p-tile-name">${item.name}</div>
          ${qtyStr ? `<div class="p-tile-qty">${qtyStr}</div>` : ""}
        </div>
        ${contentsHtml}
        <div class="p-tile-badges">
          <span class="p-badge badge-loc" style="background:${loc.color}22;color:${loc.color}">${loc.label}</span>
          ${item.purchased_at ? `<span class="p-badge badge-bought">🛒 ${fmtDate(item.purchased_at)}</span>` : ""}
          ${item.best_by ? `<span class="p-badge badge-bestby ${expCls}">📅 ${fmtDate(item.best_by)}${expLbl?" · "+expLbl:""}</span>` : ""}
        </div>
        <div class="p-tile-actions">
          <button class="p-tile-btn edt" data-edit="${item.id}" title="Edit">✏️</button>
          <button class="p-tile-btn del" data-delete="${item.id}" title="Remove">✕</button>
        </div>
      </div>`;
  }

  _filteredItems() {
    let items = [...this._items];
    if (this._activeTab !== "all") items = items.filter(i => i.location === this._activeTab);
    if (this._search) {
      const q = this._search.toLowerCase();
      items = items.filter(i =>
        (i.name||"").toLowerCase().includes(q) ||
        (i.contents||[]).some(c => (c.name||"").toLowerCase().includes(q))
      );
    }
    if (this._sort==="expiry") {
      items.sort((a,b)=>{
        if (!a.best_by&&!b.best_by) return 0;
        if (!a.best_by) return 1; if (!b.best_by) return -1;
        return new Date(a.best_by)-new Date(b.best_by);
      });
    } else if (this._sort==="bought") {
      items.sort((a,b)=>new Date(b.purchased_at||0)-new Date(a.purchased_at||0));
    } else {
      items.sort((a,b)=>(a.name||"").localeCompare(b.name||""));
    }
    return items;
  }

  // ── Card event bindings ──────────────────────────────────────────────────
  _bindCard() {
    const sr = this.shadowRoot;
    const $  = id => sr.getElementById(id);

    $("p-add")?.addEventListener("click", () =>
      this._openModal("add", { location:"cupboard", purchased_at:new Date().toISOString().slice(0,10), contents:[] })
    );
    sr.querySelectorAll("[data-tab]").forEach(el =>
      el.addEventListener("click", () => { this._activeTab = el.dataset.tab; this._updateCard(); })
    );
    $("p-search")?.addEventListener("input", e => { this._search = e.target.value; this._updateCard(); });
    $("p-sort")?.addEventListener("change",  e => { this._sort   = e.target.value; this._updateCard(); });

    sr.querySelectorAll("[data-edit]").forEach(el =>
      el.addEventListener("click", e => {
        e.stopPropagation();
        const item = this._items.find(i => i.id === el.dataset.edit);
        if (item) this._openModal("edit", { ...item, contents: (item.contents||[]).map(c=>({...c})) });
      })
    );
    sr.querySelectorAll("[data-delete]").forEach(el =>
      el.addEventListener("click", e => {
        e.stopPropagation();
        const id = el.dataset.delete;
        this._items = this._items.filter(i => i.id !== id);
        this._callService("pantry_remove", { id });
        this._updateCard();
      })
    );
  }

  // ── Modal (isolated — never touched by hass updates) ─────────────────────
  _openModal(mode, item) {
    this._modal = { mode, item };
    this._renderModal();
  }

  _closeModal() {
    this._modal = null;
    this._modalEl.innerHTML = "";
  }

  _renderModal() {
    if (!this._modal) { this._modalEl.innerHTML = ""; return; }
    const { mode, item } = this._modal;
    const isEdit = mode === "edit";
    const curLoc = item.location || "cupboard";
    const today  = new Date().toISOString().slice(0,10);

    const locPicker = LOCATIONS.map(l =>
      `<div class="loc-opt${curLoc===l.id?" selected":""}" data-loc="${l.id}">
        <div class="loc-opt-icon">${l.icon}</div>
        <div class="loc-opt-lbl">${l.label}</div>
      </div>`
    ).join("");

    this._modalEl.innerHTML = `
      <div class="p-overlay" id="pm-overlay">
        <div class="p-modal">
          <div class="p-modal-hdr">
            <div class="p-modal-title">${isEdit?"✏️ Edit pantry item":"＋ Add to Pantry"}</div>
            <button class="p-modal-x" id="pm-close">✕</button>
          </div>
          <div class="p-modal-body">
            <div class="p-fg">
              <label class="p-lbl">Item / container name</label>
              <input class="p-input" id="pm-name" type="text" placeholder="e.g. Snack Box, Tin of Soup" value="${item.name||""}">
            </div>
            <div class="p-fr">
              <div class="p-fg">
                <label class="p-lbl">Container qty</label>
                <input class="p-input" id="pm-qty" type="number" min="0" step="1" placeholder="1" value="${item.quantity||""}">
              </div>
              <div class="p-fg">
                <label class="p-lbl">Container unit</label>
                <input class="p-input" id="pm-unit" type="text" placeholder="box, tin, bag…" value="${item.unit||""}">
              </div>
            </div>
            <div class="p-fg">
              <label class="p-lbl">Storage location</label>
              <div class="loc-picker">${locPicker}</div>
              <input type="hidden" id="pm-loc" value="${curLoc}">
            </div>
            <div class="p-fr">
              <div class="p-fg">
                <label class="p-lbl">Date purchased</label>
                <input class="p-input" id="pm-bought" type="date" value="${item.purchased_at?item.purchased_at.slice(0,10):today}">
              </div>
              <div class="p-fg">
                <label class="p-lbl">Best by / use by</label>
                <input class="p-input" id="pm-bestby" type="date" value="${item.best_by||""}">
              </div>
            </div>
            <div class="p-divider"></div>
            <div class="contents-section">
              <div class="contents-header">
                <span class="contents-title">Contents</span>
                <button class="contents-add-btn" id="pm-add-content">＋ Add item</button>
              </div>
              <div class="contents-list" id="pm-contents-list">
                ${this._buildContentRows(item.contents||[])}
              </div>
              <div class="contents-hint">Optional — list what's inside, e.g. 3 Granola Bars, 2 Trail Mix pouches</div>
            </div>
            <button class="p-submit" id="pm-submit">${isEdit?"Save changes":"Add to pantry"}</button>
          </div>
        </div>
      </div>`;

    this._bindModal();
  }

  _buildContentRows(contents) {
    if (!contents.length) return `<div style="font-size:11px;color:var(--p-muted);text-align:center;padding:6px 0">No contents added yet</div>`;
    return contents.map((c, i) => `
      <div class="content-row" data-ci="${i}">
        <input class="p-input" type="text"   placeholder="Item name" value="${c.name||""}"     data-field="name"     data-ci="${i}">
        <input class="p-input" type="number" placeholder="Qty"       value="${c.quantity||""}" data-field="quantity" data-ci="${i}" min="0" step="1">
        <input class="p-input" type="text"   placeholder="Unit"      value="${c.unit||""}"     data-field="unit"     data-ci="${i}">
        <button class="content-row-del" data-del-ci="${i}" title="Remove">✕</button>
      </div>`
    ).join("");
  }

  _bindModal() {
    const sr = this.shadowRoot;
    const $  = id => sr.getElementById(id);
    const { item } = this._modal;
    if (!item.contents) item.contents = [];

    // Close
    $("pm-close")?.addEventListener("click", () => this._closeModal());
    $("pm-overlay")?.addEventListener("click", e => { if (e.target.id==="pm-overlay") this._closeModal(); });

    // Location picker
    sr.querySelectorAll(".loc-opt").forEach(el =>
      el.addEventListener("click", () => {
        sr.querySelectorAll(".loc-opt").forEach(o => o.classList.remove("selected"));
        el.classList.add("selected");
        $("pm-loc").value = el.dataset.loc;
      })
    );

    // Contents: add row
    $("pm-add-content")?.addEventListener("click", () => {
      item.contents.push({ name:"", quantity:"", unit:"" });
      $("pm-contents-list").innerHTML = this._buildContentRows(item.contents);
      this._bindContentRows();
    });

    this._bindContentRows();

    // Submit
    $("pm-submit")?.addEventListener("click", () => {
      const name = ($("pm-name")?.value || "").trim();
      if (!name) { $("pm-name")?.focus(); return; }

      // Harvest top-level fields
      const entry = {
        id:           item.id || genId(),
        name,
        quantity:     $("pm-qty")?.value    || "",
        unit:         $("pm-unit")?.value   || "",
        location:     $("pm-loc")?.value    || "cupboard",
        purchased_at: $("pm-bought")?.value || "",
        best_by:      $("pm-bestby")?.value || "",
        contents:     item.contents.filter(c => c.name.trim()),
      };

      // Optimistic update
      const idx = this._items.findIndex(i => i.id === entry.id);
      if (idx !== -1) { this._items[idx] = entry; }
      else             { this._items.unshift(entry); }

      this._callService(this._modal.mode==="edit" ? "pantry_update" : "pantry_add", entry);
      this._closeModal();
      this._updateCard();
    });
  }

  _bindContentRows() {
    const sr = this.shadowRoot;
    const { item } = this._modal;

    // Field inputs — update item.contents directly (no re-render)
    sr.querySelectorAll("[data-field]").forEach(el => {
      el.addEventListener("input", () => {
        const ci    = parseInt(el.dataset.ci);
        const field = el.dataset.field;
        if (item.contents[ci]) item.contents[ci][field] = el.value;
      });
    });

    // Delete row buttons — splice and re-render only the list
    sr.querySelectorAll("[data-del-ci]").forEach(el =>
      el.addEventListener("click", () => {
        const ci = parseInt(el.dataset.delCi);
        item.contents.splice(ci, 1);
        const list = sr.getElementById("pm-contents-list");
        if (list) { list.innerHTML = this._buildContentRows(item.contents); this._bindContentRows(); }
      })
    );
  }

  static getStubConfig() { return { entity_id:"sensor.smart_shopping_pantry" }; }
  getCardSize() { return 5; }
}

try {
  if (!customElements.get("smart-shopping-pantry-card")) {
    customElements.define("smart-shopping-pantry-card", SmartShoppingPantryCard);
  }
} catch(e) { console.error("Smart Shopping Pantry card failed to register:", e); }

window.customCards = window.customCards || [];
if (!window.customCards.find(c => c.type === "smart-shopping-pantry-card")) {
  window.customCards.push({
    type:        "smart-shopping-pantry-card",
    name:        "Smart Shopping — Pantry",
    description: "HA-backed pantry tracker with contents, dates, and horizontal tile grid.",
    preview:     true,
  });
}
console.info(`%c PANTRY CARD %c v${PANTRY_VERSION} `,
  "color:#00d4aa;font-weight:bold;background:#1a3a2e;padding:2px 6px;border-radius:4px 0 0 4px;",
  "color:#fff;background:#0f3460;padding:2px 6px;border-radius:0 4px 4px 0;");
