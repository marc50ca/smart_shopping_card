# CLAUDE.md — Smart Shopping Integration

This file gives Claude Code the context it needs to work on this project accurately.

---

## What this is

A custom Home Assistant integration that provides a shopping list and pantry tracker with three custom Lovelace cards. All state is stored centrally in HA's `.storage` system and synced across every device in real time.

---

## Repository layout

```
smart_shopping/
├── CLAUDE.md                                      ← this file
├── README.md                                      ← user-facing install guide
├── info.md                                        ← short HACS description
├── hacs.json                                      ← HACS metadata
├── automations/
│   └── shopping_automations.yaml                  ← example geofence automations
├── custom_components/smart_shopping/              ← THE INTEGRATION (copy here to install)
│   ├── __init__.py                                ← coordinator, services, frontend reg
│   ├── config_flow.py                             ← UI config (picks Todo entity)
│   ├── const.py                                   ← all constants and service names
│   ├── sensor.py                                  ← 3 sensor entities
│   ├── http.py                                    ← HTTP views that serve the JS files
│   ├── frontend.py                                ← legacy stub (kept for compatibility)
│   ├── manifest.json                              ← HA integration manifest (v1.5.2)
│   ├── services.yaml                              ← service schema documentation
│   ├── strings.json                               ← UI strings
│   ├── translations/en.json                       ← English translations
│   ├── smart-shopping-card.js                     ← main shopping list card (v1.4.0)
│   ├── smart-shopping-summary-card.js             ← dashboard summary card (v1.0.0)
│   └── smart-shopping-pantry-card.js              ← pantry tracker card (v4.0.0)
└── www/smart-shopping-card/                       ← duplicate JS copies (for manual installs)
    ├── smart-shopping-card.js
    ├── smart-shopping-summary-card.js
    └── smart-shopping-pantry-card.js
```

> **Important:** The JS files in `custom_components/smart_shopping/` are the **source of truth**. After any JS change, copy them to `www/smart-shopping-card/` to keep both in sync.

---

## Architecture

### Python backend

**`__init__.py`** is the core. It contains:

- `async_setup()` — no-op (config-flow integrations don't use `configuration.yaml`)
- `_register_frontend(hass)` — registers HTTP views + Lovelace `add_extra_js_url()`. Called from `async_setup_entry()`. Guarded by `hass.data["{DOMAIN}_frontend_registered"]` so it only runs once per HA session even if multiple entries exist.
- `async_setup_entry(hass, entry)` — calls `_register_frontend`, loads persisted state, creates coordinator, registers all 14 services.
- `SmartShoppingCoordinator` — holds all mutable state (`_items`, `_stores`, `_categories`, `_pantry`). Saves to HA `.storage` via `Store(hass, STORAGE_VERSION, STORAGE_KEY)`. Notifies sensor listeners on every change.

**Storage key:** `smart_shopping.data` (version 1)  
**Stored shape:**
```json
{
  "items":      [...],
  "stores":     [...],
  "categories": [...],
  "pantry":     [...]
}
```

**`sensor.py`** — three entities, all on the same device:

| Entity | Unique ID suffix | Value | Key attributes |
|--------|-----------------|-------|----------------|
| `sensor.smart_shopping_items_remaining` | `_count` | unchecked item count | `total_items`, `unchecked_items`, `todo_entity` |
| `sensor.smart_shopping_shopping_list`   | `_list`  | `"N/M items"` string | full `items`, `stores`, `categories`, `pantry` |
| `sensor.smart_shopping_pantry`          | `_pantry`| pantry item count | `pantry` list, `count` |

The shopping card and summary card read from `sensor.smart_shopping_shopping_list`. The pantry card reads from `sensor.smart_shopping_pantry`.

**`http.py`** — three `HomeAssistantView` subclasses, one per JS file. Each reads the file from `Path(__file__).parent` and returns `Response(body=bytes, headers={"Content-Type": "application/javascript; charset=utf-8", "Cache-Control": "no-cache"})`. **Do not use `FileResponse` — it ignores the `headers=` kwarg in aiohttp 3.x.**

### JavaScript cards

All three cards are vanilla custom elements (no build step, no external dependencies). They use HA's shadow DOM pattern.

#### Critical DOM architecture — applies to all cards

Every card uses **two or three separate DOM layers** appended to the shadow root. HA calls `set hass()` on every state update (every ~30 seconds or on any state change). If `set hass()` rebuilds the entire card innerHTML, any open modal/form is destroyed and the user loses their input.

**Pattern used:**
```
shadowRoot
  ├── <style>                  (created once)
  ├── _cardEl / _cardDiv       (rebuilt by set hass / _updateCard)
  ├── _footerDiv               (shopping card only — persistent quick-add)
  └── _modalDiv / _modalEl     (only rebuilt by _openModal / _closeModal)
```

`set hass()` must **only** call `_updateCard()` — never touch `_modalEl` or `_footerDiv`.

#### Event delegation

**Never** add `addEventListener` to individual child elements inside `_updateCard()` / `_render()` — they accumulate with each HA state push and cause duplicate fires.

Instead:
- For **item tile clicks** (shopping card): one `click` listener on `_cardDiv`, set up once in `_initDelegation()` which is called from `_initDOM()`. Uses `e.target.closest("[data-buy]")` / `e.target.closest("[data-remove]")` / `e.target.closest("[data-edit]")`.
- For **card chrome events** (tabs, search, add buttons): re-bind in `_bindCard()` / `_bindCardEvents()` after each `_updateCard()` — these are safe because they target stable element IDs, not dynamically generated ones.
- For **modal events**: bind in `_bindModal()` / `_bindModalEvents()` / `_bindEditItemEvents()` immediately after rendering the modal. These are only called once per modal open.

---

## Services (14 total)

All under domain `smart_shopping`.

### Shopping list services

| Service | Schema | Description |
|---------|--------|-------------|
| `add_item` | `name`(req), `category`, `quantity`, `unit`, `image_url`, `store`, `notes` | Add or increment item |
| `remove_item` | `name`(req) | Delete item |
| `check_item` | `name`(req), `purchased_at`(opt string) | Mark purchased; stamps `purchased_at` on item |
| `uncheck_item` | `name`(req) | Unmark item |
| `clear_checked` | — | Remove all checked items |
| `add_store` | `name`, `icon`, `latitude`, `longitude`, `radius` | Append a store |
| `add_category` | `name`, `icon`, `color` | Append a category |
| `sync_todo` | — | Push unchecked items to the Todo entity |
| `update_stores` | `stores` list | Replace full store list |
| `update_categories` | `categories` list | Replace full category list |
| `update_items` | `items` list | Replace full item list |

### Pantry services

| Service | Schema | Description |
|---------|--------|-------------|
| `pantry_add` | entry dict with `id`, `name`, `quantity`, `unit`, `location`, `purchased_at`, `best_by`, `contents` | Add or replace pantry entry by `id` |
| `pantry_update` | same as above, `id` required | Update existing entry by `id` |
| `pantry_remove` | `id`(req) | Delete pantry entry by `id` |

> **Schema pitfall:** `vol.Schema({...})` rejects unknown fields by default. Any time you add a new field to a JS service call, you must also add it as `vol.Optional(...)` to the schema in `_register_services()` or HA will throw a validation error.

---

## Data shapes

### Shopping item
```json
{
  "name": "Whole Milk",
  "category": "Dairy",
  "quantity": 2,
  "unit": "L",
  "image_url": "",
  "store": "Grocery Store",
  "notes": "Full fat",
  "checked": false,
  "added": "2025-03-01T10:00:00",
  "purchased_at": "2025-03-05T14:22:00"
}
```

### Store
```json
{ "name": "Grocery Store", "icon": "mdi:store", "latitude": 43.7, "longitude": -79.4, "radius": 100 }
```

### Category
```json
{ "name": "Dairy", "icon": "mdi:cow", "color": "#2196F3" }
```

### Pantry entry
```json
{
  "id": "abc12345",
  "name": "Snack Box",
  "quantity": "1",
  "unit": "box",
  "location": "cupboard",
  "purchased_at": "2025-03-01",
  "best_by": "2025-06-01",
  "contents": [
    { "name": "Granola Bar", "quantity": "3", "unit": "" },
    { "name": "Trail Mix",   "quantity": "2", "unit": "pouches" }
  ]
}
```

**Pantry `location`** must be one of: `"cupboard"`, `"fridge"`, `"freezer"`.

---

## Card YAML configs

### `smart-shopping-card`
```yaml
type: custom:smart-shopping-card
entity_id: sensor.smart_shopping_shopping_list
# Optional:
show_store_bar: true
show_categories: true
show_progress: true
show_search: true
show_images: true
show_size_control: true
max_height: 420          # 150–900px
```

### `smart-shopping-summary-card`
```yaml
type: custom:smart-shopping-summary-card
entity_id: sensor.smart_shopping_shopping_list
# Optional:
max_items: 5
max_cats: 5
show_categories: true
show_stores: true
show_next: true
show_quick_add: true
```

### `smart-shopping-pantry-card`
```yaml
type: custom:smart-shopping-pantry-card
entity_id: sensor.smart_shopping_pantry
```

---

## JS served at these URLs

| URL | File |
|-----|------|
| `/smart_shopping/smart-shopping-card.js` | `custom_components/smart_shopping/smart-shopping-card.js` |
| `/smart_shopping/smart-shopping-summary-card.js` | `custom_components/smart_shopping/smart-shopping-summary-card.js` |
| `/smart_shopping/smart-shopping-pantry-card.js` | `custom_components/smart_shopping/smart-shopping-pantry-card.js` |

---

## Common gotchas

1. **`FileResponse` ignores `headers=`** in aiohttp 3.x — always use `Response(body=f.read_bytes(), headers=_HEADERS)`.

2. **`customElements.define()` throws if called twice** (hot reload / Lovelace navigation). Always guard: `if (!customElements.get("element-name")) { customElements.define(...); }`.

3. **`async_setup()` is not called** for config-flow integrations unless the domain appears in `configuration.yaml`. All setup must happen in `async_setup_entry()`.

4. **`add_extra_js_url()` must be called** inside `async_setup_entry()`, not `async_setup()`, for config-flow integrations.

5. **Voluptuous schema rejects extra fields** by default. If a JS service call includes a field not in the schema, HA throws a validation error and the call silently fails in the UI.

6. **`set hass()` fires on every state update** — approximately every 30 seconds and on any HA state change. Any DOM rebuild in `set hass()` destroys open modals. Always keep `_cardEl` and `_modalEl` as separate DOM nodes; `set hass()` only calls `_updateCard()`.

7. **Event listener accumulation** — `addEventListener` inside methods called by `set hass()` accumulates listeners across state updates. Use delegation on stable parent elements, set up once in `_initDOM()`.

8. **JS sync rule** — `custom_components/smart_shopping/*.js` are the source of truth. After any edit, sync to `www/smart-shopping-card/` and bump `CARD_VERSION` / `SUMMARY_VERSION` / `PANTRY_VERSION` in the JS file and `version` in `manifest.json`.

---

## Installation (for reference)

1. Copy `custom_components/smart_shopping/` → `<ha-config>/custom_components/`
2. Full HA restart (required — HTTP views register at boot)
3. Settings → Devices & Services → + Add Integration → Smart Shopping → select Todo entity
4. If cards show "Custom element doesn't exist": Settings → Dashboards → ⋮ → Resources → add the three JS URLs as JavaScript Module type, then hard-refresh

---

## Version history summary

| Integration | Card (shopping) | Card (summary) | Card (pantry) | Notable changes |
|-------------|----------------|----------------|---------------|-----------------|
| 1.0.0 | 1.2.0 | 1.0.0 | — | Initial release |
| 1.1.0 | 1.4.0 | 1.0.0 | — | MDI icons, width control, double-define guard |
| 1.2.0 | 1.4.0 | 1.0.0 | 2.0.0 | Pantry card with HA-backed storage, pantry sensor |
| 1.3.0 | 1.4.0 | 1.0.0 | 3.0.0 | Horizontal tile layout, modal isolation fix |
| 1.4.0 | 1.4.0 | 1.0.0 | 4.0.0 | Edit shopping items, purchase date, pantry contents |
| 1.5.0 | 1.4.0 | 1.0.0 | 4.0.0 | `check_item` schema fix, delegation de-duplication |
| 1.5.2 | 1.4.0 | 1.0.0 | 4.0.0 | Pantry full-width horizontal rows |
