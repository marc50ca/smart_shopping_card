/**
 * Smart Shopping Summary Card — v1.0.0
 * A compact at-a-glance dashboard card showing:
 *   • SVG ring progress
 *   • Per-category breakdown
 *   • Top unchecked items
 *   • Per-store item counts
 *   • Quick-add item input
 */

const SUMMARY_VERSION = "1.0.0";

// ─── Shared icon helpers ───────────────────────────────────────────────────

function _isUrl(v) {
  return v && (v.startsWith("http") || v.startsWith("/") || v.startsWith("data:") ||
    /\.(png|jpg|jpeg|gif|svg|webp)(\?|$)/i.test(v));
}
function _isMdi(v) {
  return v && (v.startsWith("mdi:") || v.startsWith("hass:") || v.startsWith("mdi-"));
}
function _icon(icon, size = 20, color = "currentColor") {
  if (!icon) return "<span>📦</span>";
  if (_isUrl(icon)) return `<img src="${icon}" style="width:${size}px;height:${size}px;object-fit:contain;border-radius:3px;flex-shrink:0" alt="">`;
  if (_isMdi(icon)) {
    const ic = icon.startsWith("mdi-") ? "mdi:" + icon.slice(4) : icon;
    return `<ha-icon icon="${ic}" style="--mdc-icon-size:${size}px;color:${color};display:inline-flex;align-items:center;flex-shrink:0"></ha-icon>`;
  }
  return `<span style="font-size:${Math.round(size * 0.85)}px;line-height:1;flex-shrink:0">${icon}</span>`;
}

// ─── Styles ────────────────────────────────────────────────────────────────

const SUMMARY_STYLES = `
  :host {
    --ss-bg:      var(--card-background-color, #1a1a2e);
    --ss-surface: var(--secondary-background-color, #16213e);
    --ss-primary: #00d4aa;
    --ss-accent:  #ff6b6b;
    --ss-text:    var(--primary-text-color, #e0e0e0);
    --ss-muted:   var(--secondary-text-color, #9e9e9e);
    --ss-border:  rgba(255,255,255,0.08);
    --ss-r:       16px;
    font-family: 'Segoe UI', system-ui, sans-serif;
  }
  * { box-sizing: border-box; margin: 0; padding: 0; }

  .card {
    background: var(--ss-bg);
    border-radius: var(--ss-r);
    color: var(--ss-text);
    overflow: hidden;
  }

  /* ── TOP BAND ── */
  .top-band {
    background: linear-gradient(135deg, #0f3460 0%, #16213e 60%, #0f3460 100%);
    padding: 16px 18px;
    display: flex;
    align-items: center;
    gap: 16px;
    border-bottom: 1px solid var(--ss-border);
    position: relative;
    overflow: hidden;
  }
  .top-band::before {
    content:''; position:absolute; top:-40%; right:-10%;
    width:180px; height:180px; border-radius:50%;
    background: radial-gradient(circle, rgba(0,212,170,.12), transparent 70%);
    pointer-events:none;
  }

  /* SVG ring */
  .ring-wrap { position:relative; flex-shrink:0; width:72px; height:72px; }
  .ring-wrap svg { transform: rotate(-90deg); }
  .ring-bg   { fill:none; stroke:rgba(255,255,255,.08); stroke-width:6; }
  .ring-fill { fill:none; stroke:var(--ss-primary); stroke-width:6; stroke-linecap:round;
               transition: stroke-dashoffset .6s ease; }
  .ring-done { fill:none; stroke: #00d4aa55; stroke-width:6; }
  .ring-pct  {
    position:absolute; inset:0; display:flex; flex-direction:column;
    align-items:center; justify-content:center;
    font-size:18px; font-weight:800; color:var(--ss-primary); line-height:1;
  }
  .ring-label { font-size:9px; color:var(--ss-muted); margin-top:2px; font-weight:600; letter-spacing:.5px; }

  /* Header text */
  .band-text { flex: 1; min-width:0; }
  .band-title { font-size:16px; font-weight:700; color:#fff; display:flex; align-items:center; gap:8px; }
  .band-sub   { font-size:12px; color:var(--ss-primary); margin-top:3px; font-weight:500; }
  .band-meta  { font-size:11px; color:var(--ss-muted); margin-top:4px; }

  /* Done badge */
  .done-badge {
    background: rgba(0,212,170,.15); border:1px solid rgba(0,212,170,.3);
    border-radius: 20px; padding: 4px 12px; font-size:12px; font-weight:700;
    color:var(--ss-primary); flex-shrink:0; white-space:nowrap;
  }
  .remaining-badge {
    background: rgba(255,107,107,.15); border:1px solid rgba(255,107,107,.3);
    border-radius: 20px; padding: 4px 12px; font-size:12px; font-weight:700;
    color:var(--ss-accent); flex-shrink:0; white-space:nowrap;
  }

  /* ── SECTIONS ── */
  .section { padding:12px 18px; border-bottom:1px solid var(--ss-border); }
  .section:last-child { border-bottom:none; }
  .sec-title {
    font-size:10px; font-weight:700; letter-spacing:1px; text-transform:uppercase;
    color:var(--ss-muted); margin-bottom:10px; display:flex; align-items:center; gap:6px;
  }
  .sec-title::after { content:''; flex:1; height:1px; background:var(--ss-border); }

  /* ── CATEGORY BARS ── */
  .cat-bars { display:flex; flex-direction:column; gap:7px; }
  .cat-row  { display:flex; align-items:center; gap:8px; font-size:12px; }
  .cat-name { display:flex; align-items:center; gap:6px; min-width:110px; color:var(--ss-text); font-weight:500; }
  .cat-bar-track { flex:1; height:5px; background:rgba(255,255,255,.06); border-radius:3px; overflow:hidden; }
  .cat-bar-fill  { height:100%; border-radius:3px; transition:width .5s ease; }
  .cat-count { font-size:11px; font-weight:700; min-width:22px; text-align:right; color:var(--ss-muted); }

  /* ── STORE CHIPS ── */
  .store-chips { display:flex; flex-wrap:wrap; gap:7px; }
  .store-chip  {
    display:flex; align-items:center; gap:6px;
    background:rgba(255,255,255,.04); border:1px solid var(--ss-border);
    border-radius:20px; padding:5px 11px; font-size:12px; font-weight:500;
    cursor:pointer; transition:all .2s; color:var(--ss-text);
  }
  .store-chip:hover { background:rgba(0,212,170,.1); border-color:var(--ss-primary); color:var(--ss-primary); }
  .store-chip .chip-count {
    background:var(--ss-accent); color:#fff; border-radius:10px;
    padding:1px 6px; font-size:10px; font-weight:800;
  }
  .store-chip .chip-count.done { background:rgba(0,212,170,.3); color:var(--ss-primary); }

  /* ── NEXT ITEMS ── */
  .next-items { display:flex; flex-direction:column; gap:6px; overflow-y:auto; -webkit-overflow-scrolling:touch; touch-action:pan-y; }
  .next-item  {
    display:flex; align-items:center; gap:10px;
    background:rgba(255,255,255,.03); border:1px solid var(--ss-border);
    border-radius:9px; padding:8px 11px; cursor:pointer; transition:all .15s;
  }
  .next-item:hover { background:rgba(255,255,255,.06); }
  .next-item-name { flex:1; font-size:13px; font-weight:500; color:var(--ss-text); }
  .next-item-meta { font-size:11px; color:var(--ss-muted); }
  .next-item-qty  {
    background:rgba(0,212,170,.12); color:var(--ss-primary);
    border-radius:5px; padding:2px 7px; font-size:11px; font-weight:700;
  }
  .check-mini {
    width:18px; height:18px; border-radius:50%; border:2px solid var(--ss-border);
    background:transparent; cursor:pointer; display:flex; align-items:center; justify-content:center;
    font-size:10px; color:transparent; transition:all .2s; flex-shrink:0;
  }
  .check-mini:hover { border-color:var(--ss-primary); color:var(--ss-primary); }

  /* ── QUICK ADD ── */
  .quick-add-row {
    display:flex; gap:8px; padding:12px 18px;
    background:var(--ss-surface); border-top:1px solid var(--ss-border);
  }
  .qa-input {
    flex:1; background:rgba(255,255,255,.05); border:1px solid var(--ss-border);
    border-radius:9px; padding:8px 12px; font-size:13px; color:var(--ss-text);
    outline:none; transition:border-color .2s; font-family:inherit;
  }
  .qa-input::placeholder { color:var(--ss-muted); }
  .qa-input:focus { border-color:var(--ss-primary); }
  .qa-btn {
    background:linear-gradient(135deg, var(--ss-primary), #00a884);
    border:none; border-radius:9px; width:36px; height:36px;
    cursor:pointer; display:flex; align-items:center; justify-content:center;
    font-size:20px; font-weight:700; color:#000; transition:all .2s; flex-shrink:0;
  }
  .qa-btn:hover { transform:translateY(-1px); box-shadow:0 4px 14px rgba(0,212,170,.3); }

  /* ── EMPTY STATE ── */
  .empty { text-align:center; padding:28px 20px; color:var(--ss-muted); }
  .empty-icon { font-size:36px; margin-bottom:8px; }

  /* ── ALL DONE ── */
  .all-done {
    text-align:center; padding:20px;
    background:rgba(0,212,170,.06); border-top:1px solid rgba(0,212,170,.15);
  }
  .all-done-icon { font-size:28px; margin-bottom:6px; }
  .all-done-text { font-size:14px; font-weight:700; color:var(--ss-primary); }
  .all-done-sub  { font-size:12px; color:var(--ss-muted); margin-top:3px; }

  /* ── WIDTH CONTROL ── */
  .width-control {
    display:flex; align-items:center; gap:10px;
    padding:8px 18px; border-top:1px solid var(--ss-border);
    background:rgba(255,255,255,.02);
  }
  .wc-label  { font-size:11px; color:var(--ss-muted); white-space:nowrap; }
  .wc-slider { flex:1; accent-color:var(--ss-primary); cursor:pointer; height:4px; }
  .wc-value  { font-size:11px; font-weight:700; color:var(--ss-primary); min-width:36px; text-align:right; }
`;

// ─── Card element ──────────────────────────────────────────────────────────

class SmartShoppingSummaryCard extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this._hass      = null;
    this._config    = {};
    this._entityId  = null;
    this._state     = { items:[], stores:[], categories:[], unchecked_count:0, total_count:0, todo_entity:"" };
    this._rendered  = false;
    this._cardWidth = 100;   // 30–100 %
  }

  setConfig(config) {
    if (!config.entity_id) throw new Error("smart-shopping-summary-card: entity_id is required");
    this._config   = config;
    this._entityId = config.entity_id;
    if (config.card_width && !isNaN(config.card_width))
      this._cardWidth = Math.min(100, Math.max(30, parseInt(config.card_width)));
    this._render();
  }

  set hass(hass) {
    this._hass = hass;
    const stateObj = hass.states[this._entityId];
    if (!stateObj) return;
    const a = stateObj.attributes;
    if (a.items !== undefined) {
      this._state = {
        items:           a.items           || [],
        stores:          a.stores          || [],
        categories:      a.categories      || [],
        unchecked_count: a.unchecked_count || 0,
        total_count:     a.total_count     || 0,
        todo_entity:     a.todo_entity     || "",
      };
    }
    this._render();
  }

  // ── render ────────────────────────────────────────────────────────────────

  _applyWidth() {
    this.style.display  = "block";
    this.style.maxWidth = this._cardWidth < 100 ? this._cardWidth + "%" : "";
    this.style.margin   = this._cardWidth < 100 ? "0 auto" : "";
  }

  _render() {
    if (!this._hass || !this._entityId) return;

    const root = this.shadowRoot;
    if (!this._rendered) {
      root.innerHTML = "";
      const style = document.createElement("style");
      style.textContent = SUMMARY_STYLES;
      root.appendChild(style);
      this._card = document.createElement("div");
      this._card.className = "card";
      // Persistent footer div — never wiped by _render
      this._footerDiv = document.createElement("div");
      root.appendChild(this._card);
      root.appendChild(this._footerDiv);
      this._rendered = true;
      this._initFooter();
    }

    this._applyWidth();
    this._card.innerHTML = this._buildHTML();
    this._bindEvents();
  }

  _initFooter() {
    if (!this._footerDiv) return;
    const showAdd = this._config.show_quick_add !== false;
    if (!showAdd) return;
    this._footerDiv.innerHTML = `
      <div class="quick-add-row">
        <input class="qa-input" id="ss-qa" type="text" placeholder="Quick add item…" autocomplete="off">
        <button class="qa-btn" id="ss-qa-btn">＋</button>
      </div>`;
    const input = this._footerDiv.querySelector('#ss-qa');
    const btn   = this._footerDiv.querySelector('#ss-qa-btn');
    const doAdd = () => {
      const name = (input?.value || "").trim();
      if (!name || !this._hass) return;
      const item = { name, category:"Other", quantity:1, unit:"", image_url:"", store:"", notes:"" };
      this._state.items.unshift({ ...item, checked:false });
      this._state.total_count++;
      this._state.unchecked_count++;
      if (input) input.value = "";
      this._render();
      this._hass.callService("smart_shopping", "add_item", item);
    };
    btn?.addEventListener("click", doAdd);
    input?.addEventListener("keydown", e => { if (e.key === "Enter") { e.preventDefault(); doAdd(); } });
  }

  // ── HTML builders ─────────────────────────────────────────────────────────

  _buildHTML() {
    const { items, unchecked_count: rem, total_count: total } = this._state;
    const cfg        = this._config;
    const maxItems   = parseInt(cfg.max_items)    || 5;
    const maxCats    = parseInt(cfg.max_cats)      || 5;
    const showStores = cfg.show_stores     !== false;
    const showItems  = cfg.show_next       !== false;
    const showCats   = cfg.show_categories !== false;
    const showWidth = cfg.show_width_control !== false;
    const pct       = total ? Math.round(((total - rem) / total) * 100) : 0;
    const allDone    = total > 0 && rem === 0;

    return `
      ${this._buildTopBand(pct, rem, total)}
      ${showCats   ? this._buildCategorySection(maxCats)   : ""}
      ${showStores ? this._buildStoreSection()              : ""}
      ${showItems  ? this._buildNextItemsSection(maxItems)  : ""}
      ${allDone    ? this._buildAllDone()                   : ""}
      ${showWidth  ? this._buildWidthControl()              : ""}
    `;
  }

  _buildWidthControl() {
    return `
      <div class="width-control">
        <span class="wc-label">↔ Width</span>
        <input class="wc-slider" id="wc-slider" type="range" min="30" max="100" step="5" value="${this._cardWidth}">
        <span class="wc-value" id="wc-value">${this._cardWidth}%</span>
      </div>`;
  }

  _buildTopBand(pct, rem, total) {
    const R  = 30;
    const C  = 2 * Math.PI * R;
    const fill = C - (pct / 100) * C;
    const todoLabel = (this._state.todo_entity || "no list").replace("todo.","").replace(/_/g," ");
    const badge = rem > 0
      ? `<div class="remaining-badge">${rem} left</div>`
      : total > 0
        ? `<div class="done-badge">✓ All done!</div>`
        : "";

    return `
      <div class="top-band">
        <div class="ring-wrap">
          <svg width="72" height="72" viewBox="0 0 72 72">
            <circle class="ring-bg"   cx="36" cy="36" r="${R}"/>
            <circle class="ring-fill" cx="36" cy="36" r="${R}"
              stroke-dasharray="${C}" stroke-dashoffset="${fill}"/>
          </svg>
          <div class="ring-pct">
            ${pct}<span style="font-size:10px">%</span>
            <div class="ring-label">DONE</div>
          </div>
        </div>
        <div class="band-text">
          <div class="band-title">
            <ha-icon icon="mdi:cart" style="--mdc-icon-size:18px;color:var(--ss-primary)"></ha-icon>
            Smart Shopping
          </div>
          <div class="band-sub">${total - rem} of ${total} items collected</div>
          <div class="band-meta">📋 ${todoLabel}</div>
        </div>
        ${badge}
      </div>`;
  }

  _buildCategorySection(maxCats) {
    const items = this._state.items.filter(i => !i.checked);
    if (!items.length) return "";

    // Count unchecked per category
    const counts = {};
    for (const item of items) {
      const cat = item.category || "Other";
      counts[cat] = (counts[cat] || 0) + 1;
    }
    const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, maxCats);
    const max    = sorted[0]?.[1] || 1;

    const rows = sorted.map(([cat, count]) => {
      const catInfo = this._state.categories.find(c => c.name === cat) || { icon:"📦", color:"#9E9E9E" };
      const pct     = Math.round((count / max) * 100);
      return `
        <div class="cat-row">
          <div class="cat-name">
            ${_icon(catInfo.icon, 16, catInfo.color)}
            <span style="color:${catInfo.color};overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${cat}</span>
          </div>
          <div class="cat-bar-track">
            <div class="cat-bar-fill" style="width:${pct}%;background:${catInfo.color}55;border-right:2px solid ${catInfo.color}"></div>
          </div>
          <div class="cat-count">${count}</div>
        </div>`;
    }).join("");

    return `
      <div class="section">
        <div class="sec-title">By category</div>
        <div class="cat-bars">${rows}</div>
      </div>`;
  }

  _buildStoreSection() {
    const { stores, items } = this._state;
    if (!stores.length) return "";

    // Per-store unchecked counts
    const chips = stores.map(store => {
      const storeItems = items.filter(i => !i.store || i.store === store.name);
      const rem  = storeItems.filter(i => !i.checked).length;
      const done = rem === 0 && storeItems.length > 0;
      return `
        <div class="store-chip" data-store="${store.name}">
          ${_icon(store.icon || "🛒", 16)}
          ${store.name}
          <span class="chip-count ${done?"done":""}">${rem}</span>
        </div>`;
    }).join("");

    return `
      <div class="section">
        <div class="sec-title">By store</div>
        <div class="store-chips">${chips}</div>
      </div>`;
  }

  _buildNextItemsSection(maxItems) {
    const unchecked = this._state.items.filter(i => !i.checked).slice(0, maxItems);
    if (!unchecked.length) return "";

    const rows = unchecked.map(item => {
      const catInfo = this._state.categories.find(c => c.name === item.category) || { icon:"📦", color:"#9E9E9E" };
      const qty     = item.quantity || 1;
      const unit    = item.unit || "";
      const qtyLbl  = unit ? (qty + unit) : qty > 1 ? ("×" + qty) : "";
      return `
        <div class="next-item">
          <button class="check-mini" data-check="${item.name}"></button>
          ${_icon(catInfo.icon, 18, catInfo.color)}
          <span class="next-item-name">${item.name}</span>
          ${item.store ? `<span class="next-item-meta">📍 ${item.store}</span>` : ""}
          ${qtyLbl ? `<span class="next-item-qty">${qtyLbl}</span>` : ""}
        </div>`;
    }).join("");

    const remaining = this._state.unchecked_count - unchecked.length;
    const moreHtml  = remaining > 0
      ? `<div style="font-size:11px;color:var(--ss-muted);text-align:center;margin-top:4px">+${remaining} more items</div>`
      : "";

    return `
      <div class="section">
        <div class="sec-title">Next to get</div>
        <div class="next-items">${rows}</div>
        ${moreHtml}
      </div>`;
  }

  _buildAllDone() {
    return `
      <div class="all-done">
        <div class="all-done-icon">🎉</div>
        <div class="all-done-text">Shopping complete!</div>
        <div class="all-done-sub">${this._state.total_count} item${this._state.total_count !== 1 ? "s" : ""} collected</div>
      </div>`;
  }



  // ── Events ────────────────────────────────────────────────────────────────

  _bindEvents() {
    const sr = this.shadowRoot;

    // Width slider — live update, no full re-render
    const wcSlider = sr.getElementById("wc-slider");
    const wcValue  = sr.getElementById("wc-value");
    wcSlider?.addEventListener("input", e => {
      this._cardWidth = parseInt(e.target.value);
      if (wcValue) wcValue.textContent = this._cardWidth + "%";
      this._applyWidth();
    });

    // Check mini buttons
    sr.querySelectorAll("[data-check]").forEach(el => {
      el.addEventListener("click", e => {
        e.stopPropagation();
        const name = el.dataset.check;
        const item = this._state.items.find(i => i.name === name);
        if (!item || !this._hass) return;
        item.checked = true;
        this._state.unchecked_count = Math.max(0, this._state.unchecked_count - 1);
        this._render();
        this._hass.callService("smart_shopping", "check_item", { name });
      });
    });

    // Store chip click — fires a custom event so the main card can filter
    sr.querySelectorAll("[data-store]").forEach(el => {
      el.addEventListener("click", () => {
        this.dispatchEvent(new CustomEvent("smart-shopping-store-filter", {
          bubbles: true, composed: true, detail: { store: el.dataset.store }
        }));
      });
    });

    // Quick add lives in persistent _footerDiv — bound in _initFooter()
  }

  // ── HA card API ───────────────────────────────────────────────────────────

  static getStubConfig() {
    return {
      entity_id:          "sensor.smart_shopping_shopping_list",
      max_items:          5,
      show_categories:    true,
      show_stores:        true,
      show_next:          true,
      show_quick_add:     true,
      card_width:         100,
      show_width_control: true,
    };
  }

  getCardSize() { return 4; }
}

customElements.define("smart-shopping-summary-card", SmartShoppingSummaryCard);

window.customCards = window.customCards || [];
window.customCards.push({
  type:        "smart-shopping-summary-card",
  name:        "Smart Shopping Summary",
  description: "Compact at-a-glance summary: ring progress, category bars, store counts & quick-add.",
  preview:     true,
});

console.info(
  `%c SMART SHOPPING SUMMARY %c v${SUMMARY_VERSION} `,
  "color:#00d4aa;font-weight:bold;background:#16213e;padding:2px 6px;border-radius:4px 0 0 4px;",
  "color:#fff;background:#0f3460;padding:2px 6px;border-radius:0 4px 4px 0;"
);
