# Smart Shopping

A shopping list integration for Home Assistant with two custom Lovelace cards.

## Features

- 🧩 Full-width tile grid — items fill the card at any screen size
- ✓ **Got it** button — marks purchased and removes in one tap
- ✕ Corner button — removes silently without marking purchased
- 🏪 Custom stores with optional GPS geofencing
- 🏷 Custom categories — colour-coded, emoji, MDI, or image icons
- 🖼 Item images per product
- 📋 Syncs to any HA `todo.*` entity
- 📊 Summary card with ring progress, category bars, and store counts
- ⚡ Full automation service API

---

## Installation

### 1 — Copy the folder

Copy `custom_components/smart_shopping/` into `<ha-config>/custom_components/`.
The JS card files are bundled inside — **no separate `www/` folder is needed.**

### 2 — Full restart

**Settings → System → Restart → Restart Home Assistant**

A full restart is required (not a reload). The card JS endpoints register at boot.

### 3 — Add the integration

**Settings → Devices & Services → + Add Integration → Smart Shopping**

Pick your Todo entity when prompted.

### 4 — Add cards

In any dashboard, add a **Manual card**:

```yaml
type: custom:smart-shopping-card
entity_id: sensor.smart_shopping_shopping_list
```

```yaml
type: custom:smart-shopping-summary-card
entity_id: sensor.smart_shopping_shopping_list
```

### Cards not appearing?

If you see *"Custom element doesn't exist"* after a full restart and hard-refresh, add the resources manually:

**Settings → Dashboards → ⋮ → Resources → + Add Resource**

| URL | Type |
|-----|------|
| `/smart_shopping/smart-shopping-card.js` | JavaScript Module |
| `/smart_shopping/smart-shopping-summary-card.js` | JavaScript Module |

Hard-refresh your browser after adding them (`Ctrl+Shift+R` / `Cmd+Shift+R`).

---

See [README.md](README.md) for full card configuration options, services, and troubleshooting.
