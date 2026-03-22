# 🛒 Smart Shopping — Home Assistant Integration

[![hacs_badge](https://img.shields.io/badge/HACS-Custom-orange.svg)](https://github.com/hacs/integration)

A shopping list integration for Home Assistant with two custom Lovelace cards.

---

## ✨ Features

- 🧩 **Full-width tile grid** — items auto-fill the card width at any screen size
- ✓ **"Got it" button** — one tap marks an item purchased and removes it instantly
- ✕ **Silent delete** — small corner button removes without marking purchased
- 🏪 **Custom stores** — emoji, MDI (`mdi:cart`), or image icons, with optional GPS geofencing
- 🏷 **Custom categories** — colour-coded, emoji, MDI, or image icons
- 🔢 **Quantities & units** — e.g. 2 kg, 1 L, 3 pcs
- 🖼 **Item images** — image URL or `/local/` path per item
- 📋 **Todo backend** — syncs to any HA `todo.*` entity
- 📍 **Geofence popup** — browser GPS triggers a popup when near a store
- 📊 **Summary card** — animated ring progress, category bars, per-store counts
- ⚡ **Service API** — full automation support for all actions

---

## 📦 Installation

> **Only one folder to copy. The JS card files are bundled inside
> `custom_components/smart_shopping/` — no separate `www/` folder needed.**

### Step 1 — Copy the folder

Extract the zip and copy `custom_components/smart_shopping/` into your HA config:

```
<ha-config>/
└── custom_components/
    └── smart_shopping/           ← copy this whole folder
        ├── __init__.py
        ├── manifest.json
        ├── sensor.py
        ├── smart-shopping-card.js
        ├── smart-shopping-summary-card.js
        └── (all other files)
```

### Step 2 — Full restart

> ⚠️ A **full restart** is required — not a reload or quick restart.
> The HTTP endpoints that serve the card JS files are registered at boot.

**Settings → System → Restart → Restart Home Assistant**

### Step 3 — Add the integration

**Settings → Devices & Services → + Add Integration → Smart Shopping**

Select your Todo entity when prompted (e.g. `todo.shopping_list`).

### Step 4 — Add cards to your dashboard

Edit your dashboard → **+ Add Card → Manual card** and paste one of these:

**Main shopping list:**
```yaml
type: custom:smart-shopping-card
entity_id: sensor.smart_shopping_shopping_list
```

**Summary / overview:**
```yaml
type: custom:smart-shopping-summary-card
entity_id: sensor.smart_shopping_shopping_list
```

---

### 🔴 Cards still showing "Custom element doesn't exist"?

Auto-registration via `add_extra_js_url` covers most setups. If it fails, add the resources manually after a full restart:

**Settings → Dashboards → ⋮ (top-right) → Resources → + Add Resource**

| URL | Resource type |
|-----|---------------|
| `/smart_shopping/smart-shopping-card.js` | JavaScript Module |
| `/smart_shopping/smart-shopping-summary-card.js` | JavaScript Module |

Then **hard-refresh** your browser (`Ctrl+Shift+R` on Windows/Linux, `Cmd+Shift+R` on Mac).

---

## 📦 HACS Installation

1. **HACS → ⋮ → Custom repositories** → add your repo URL → category **Integration**
2. **Download**
3. **Full HA restart**
4. **Settings → Devices & Services → + Add Integration → Smart Shopping**
5. Select your Todo entity

---

## 🎨 Card Configuration

### `smart-shopping-card` — main shopping list

Items display as a responsive tile grid that fills the full card width.
Each tile shows the item image or category icon, name, store/notes, and a green **✓ Got it** button.
The small **✕** in the tile corner removes the item silently (without marking it purchased).

```yaml
type: custom:smart-shopping-card
entity_id: sensor.smart_shopping_shopping_list

# All options below are optional — defaults shown
show_store_bar: true      # store filter chips at the top
show_categories: true     # category filter chips
show_progress: true       # collected / total progress bar
show_search: true         # search box
show_images: true         # item images inside tiles
show_size_control: true   # height-adjust slider in the header bar
max_height: 420           # max scroll height for the item list (px, 150–900)
```

### `smart-shopping-summary-card` — overview

Compact overview card for a main dashboard. Shows an animated progress ring,
per-category bar chart, per-store item counts, and a tile grid of the next items
to collect — each with a **✓ Got it** button.

```yaml
type: custom:smart-shopping-summary-card
entity_id: sensor.smart_shopping_shopping_list

# All options below are optional — defaults shown
max_items: 5              # number of tiles shown in "Next to get"
max_cats: 5               # number of bars shown in the category chart
show_categories: true
show_stores: true
show_next: true
show_quick_add: true
```

---

## 🗺️ Store Geofencing

**In-card (browser GPS):**
Open the card → ⚙ Settings → Stores → Add Store → enter latitude, longitude and radius (metres).
A popup appears in the browser when you arrive within range.

**Server-side (HA zones):**
Create an HA zone at the store location, then use the templates in
`automations/shopping_automations.yaml`.
Edit the placeholders: `person.YOUR_PERSON`, `zone.grocery_store`, `notify.mobile_app_YOUR_PHONE`.

---

## 🔧 Services

All services are in the `smart_shopping` domain.

| Service | Parameters | Description |
|---|---|---|
| `add_item` | `name`, `category`, `quantity`, `unit`, `image_url`, `store`, `notes` | Add an item |
| `remove_item` | `name` | Remove an item |
| `check_item` | `name` | Mark as purchased |
| `uncheck_item` | `name` | Unmark an item |
| `clear_checked` | — | Remove all checked items |
| `add_store` | `name`, `icon`, `latitude`, `longitude`, `radius` | Add a store |
| `add_category` | `name`, `icon`, `color` | Add a category |
| `sync_todo` | — | Force sync to the Todo entity |
| `update_stores` | `stores` | Replace the full store list |
| `update_categories` | `categories` | Replace the full category list |
| `update_items` | `items` | Replace the full item list |

---

## 🖼 Icons

Any `icon` field accepts:

| Format | Example |
|--------|---------|
| Emoji | `🥦` |
| MDI icon | `mdi:bread-slice` — browse at [pictogrammers.com](https://pictogrammers.com/library/mdi/) |
| External URL | `https://example.com/logo.png` |
| Local file | `/local/icons/store.png` — place at `<ha-config>/www/icons/store.png` |

---

## 🐛 Troubleshooting

| Symptom | Fix |
|---------|-----|
| "Custom element doesn't exist" | Add the two JS resources manually (see Step 4), then hard-refresh |
| Cards show but no items appear | Check `entity_id` — it must be `sensor.smart_shopping_shopping_list`, not the count sensor |
| Integration not found in search | Confirm the full `custom_components/smart_shopping/` folder was copied, then do a full restart |
| "Got it" taps do nothing | The integration must be configured (Step 3) for the `smart_shopping` services to exist |
| Quick add input loses focus | Ensure you are on v16+ — earlier builds had a bug where HA state updates wiped the footer |

---

## 📄 License

MIT
