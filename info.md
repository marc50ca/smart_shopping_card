# Smart Shopping

A feature-rich shopping list for Home Assistant with two custom Lovelace cards.

## Features

- 🧩 Full-width tile grid — tap **✓ Got it** to mark purchased and remove instantly
- 🏪 Custom stores with optional GPS geofencing
- 🏷 Custom categories — colour-coded, emoji, MDI, or image icons
- 🖼 Item images per product
- 📋 Syncs to any HA Todo entity
- 📊 Summary card with ring progress and category bars
- ⚡ Full automation service API

## Installation

1. **Copy** `custom_components/smart_shopping/` into your HA config's `custom_components/` folder
2. **Full HA restart** — Settings → System → Restart → Restart Home Assistant
3. **Add integration** — Settings → Devices & Services → + Add Integration → Smart Shopping → select your Todo entity
4. **Add a card** — paste into a Manual card:

```yaml
type: custom:smart-shopping-card
entity_id: sensor.smart_shopping_shopping_list
```

```yaml
type: custom:smart-shopping-summary-card
entity_id: sensor.smart_shopping_shopping_list
```

### Cards not loading?

If you see *"Custom element doesn't exist"* after a full restart and hard-refresh, add the JS manually:

**Settings → Dashboards → ⋮ → Resources → + Add Resource**

- `/smart_shopping/smart-shopping-card.js` — JavaScript Module
- `/smart_shopping/smart-shopping-summary-card.js` — JavaScript Module

Then hard-refresh your browser (`Ctrl+Shift+R` / `Cmd+Shift+R`).

See [README.md](README.md) for full documentation.
