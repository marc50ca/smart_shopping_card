# 🛒 Smart Shopping — Home Assistant Integration

[![hacs_badge](https://img.shields.io/badge/HACS-Custom-orange.svg)](https://github.com/hacs/integration)

A feature-rich shopping list integration with two custom Lovelace cards.

---

## ✨ Features

- 🧩 **Horizontal tile grid** — items fill full card width, tap **✓ Got it** to mark purchased and remove instantly
- 🏪 **Custom stores** — emoji, MDI, or image icons with optional GPS geofencing
- 🏷 **Custom categories** — colour-coded, emoji, MDI, or image icons
- 🔢 **Quantities & units** — e.g. 2 kg, 1 L, 3 pcs
- 🖼 **Item pictures** — image URL or `/local/` PNG per item
- 📋 **Todo backend** — syncs to any HA Todo entity
- 📍 **Store geofence popup** — browser GPS triggers a popup when near a store
- 📊 **Summary card** — ring progress, category bars, per-store counts, tile quick-purchase
- ⚡ **Full service API** — add/check/remove items from automations

---

## 📦 Installation

> **Only one folder to copy — the JS card files live inside `custom_components/smart_shopping/`.  
> No separate `www/` folder is needed.**

### Step 1 — Copy the integration folder

Copy `custom_components/smart_shopping/` from the zip into your HA config directory:

```
your-ha-config/
└── custom_components/
    └── smart_shopping/          ← copy this entire folder here
        ├── __init__.py
        ├── manifest.json
        ├── sensor.py
        ├── smart-shopping-card.js
        ├── smart-shopping-summary-card.js
        └── ... (all other files)
```

### Step 2 — Full Home Assistant restart

> ⚠️ A **full restart** is required — not just a reload or quick restart.  
> The HTTP endpoints that serve the JS files register at boot time.

**Settings → System → Restart → Restart Home Assistant**

### Step 3 — Add the integration

**Settings → Devices & Services → + Add Integration → search "Smart Shopping"**

Pick your Todo entity when prompted (e.g. `todo.shopping_list`).

### Step 4 — Add a card to your dashboard

Edit a dashboard → **+ Add Card → Manual card**, then paste:

```yaml
type: custom:smart-shopping-card
entity_id: sensor.smart_shopping_shopping_list
```

Or the summary / overview card:

```yaml
type: custom:smart-shopping-summary-card
entity_id: sensor.smart_shopping_shopping_list
```

---

### 🔴 If cards show "Custom element doesn't exist"

Auto-registration works on most installs. If yours shows this error after a full restart and hard-refresh, add the resources manually:

**Settings → Dashboards → ⋮ (top-right) → Resources → + Add Resource**

| URL | Resource type |
|-----|---------------|
| `/smart_shopping/smart-shopping-card.js` | JavaScript Module |
| `/smart_shopping/smart-shopping-summary-card.js` | JavaScript Module |

Then **hard-refresh** your browser: `Ctrl+Shift+R` (Windows/Linux) or `Cmd+Shift+R` (Mac).

---

## 📦 HACS Installation

1. **HACS → ⋮ → Custom repositories** → paste your repo URL → category **Integration**
2. Click **Download**
3. **Full HA restart**
4. **Settings → Devices & Services → + Add Integration → Smart Shopping**
5. Select your Todo entity

---

## 🎨 Card Reference

### Main shopping card — `smart-shopping-card`

Items display as a full-width horizontal tile grid. Each tile has an image or icon, name, metadata, and a **✓ Got it** button that marks the item purchased and removes it in one tap. A small **✕** in the top corner silently deletes without marking purchased.

```yaml
type: custom:smart-shopping-card
entity_id: sensor.smart_shopping_shopping_list

# Optional display options (all default to true):
show_store_bar: true      # store filter chips across the top
show_categories: true     # category filter chips
show_progress: true       # progress bar
show_search: true         # search input
show_images: true         # item images in tiles
show_size_control: true   # height slider in the header bar

# Optional sizing:
max_height: 420           # max scroll height of the item list (px, 150–900)
```

### Summary / overview card — `smart-shopping-summary-card`

Compact card ideal for a dashboard overview. Shows animated ring progress, a per-category bar chart, per-store item counts, and a tile grid of the next items to collect — each with its own **✓ Got it** button.

```yaml
type: custom:smart-shopping-summary-card
entity_id: sensor.smart_shopping_shopping_list

# Optional:
max_items: 5              # tiles shown in "Next to get" section
max_cats: 5               # categories shown in the bar chart
show_categories: true
show_stores: true
show_next: true
show_quick_add: true
```

---

## 🗺️ Store Geofencing

**In-card (browser GPS):** Open the card → Settings (⚙) → Stores → Add Store → enter lat/lng/radius. The card shows a popup when your browser detects you're within range.

**Server-side (HA zones):** Create a zone at the store location, then use the automation templates in `automations/shopping_automations.yaml`. Edit the placeholders: `person.YOUR_PERSON`, `zone.grocery_store`, `notify.mobile_app_YOUR_PHONE`.

---

## 🔧 Services

All services are under the `smart_shopping` domain.

| Service | Key parameters | Description |
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

Any `icon` field in stores or categories accepts:

| Format | Example |
|--------|---------|
| Emoji | `🥦` |
| MDI icon | `mdi:bread-slice` — browse at [pictogrammers.com](https://pictogrammers.com/library/mdi/) |
| External image URL | `https://example.com/logo.png` |
| Local file | `/local/icons/walmart.png` → place file at `config/www/icons/walmart.png` |

---

## 🐛 Troubleshooting

| Problem | Fix |
|---------|-----|
| "Custom element doesn't exist" | Add resources manually (see Step 4 above), then hard-refresh |
| Card loads but shows no items | Confirm `entity_id` is `sensor.smart_shopping_shopping_list`, not the count sensor |
| Integration not found after restart | Check HA logs for `Smart Shopping:` lines; confirm you copied the full folder |
| Quick add has no effect | Pull the latest version — older builds had a bug where HA state updates wiped the footer input |
| Items don't disappear after "Got it" | Ensure the integration is set up (Step 3) so the `smart_shopping` services exist |

---

## 📄 License

MIT
