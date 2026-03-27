"""Smart Shopping Integration for Home Assistant."""
from __future__ import annotations

import logging
from datetime import datetime
from typing import Any

import voluptuous as vol
from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant, ServiceCall, callback
from homeassistant.helpers.storage import Store
import homeassistant.helpers.config_validation as cv

from .const import (
    DOMAIN,
    PLATFORMS,
    CONF_TODO_ENTITY,
    CONF_STORES,
    CONF_CATEGORIES,
    SERVICE_ADD_ITEM,
    SERVICE_REMOVE_ITEM,
    SERVICE_CHECK_ITEM,
    SERVICE_UNCHECK_ITEM,
    SERVICE_CLEAR_CHECKED,
    SERVICE_ADD_STORE,
    SERVICE_ADD_CATEGORY,
    SERVICE_SYNC_TODO,
    SERVICE_UPDATE_STORES,
    SERVICE_UPDATE_CATEGORIES,
    SERVICE_UPDATE_ITEMS,
    SERVICE_PANTRY_ADD,
    SERVICE_PANTRY_UPDATE,
    SERVICE_PANTRY_REMOVE,
    EVENT_LIST_UPDATED,
    ITEM_NAME,
    ITEM_CATEGORY,
    ITEM_QUANTITY,
    ITEM_UNIT,
    ITEM_IMAGE_URL,
    ITEM_CHECKED,
    ITEM_STORE,
    ITEM_NOTES,
    DEFAULT_CATEGORIES,
    DEFAULT_STORES,
)

_LOGGER = logging.getLogger(__name__)

STORAGE_VERSION = 1
STORAGE_KEY = f"{DOMAIN}.data"


async def async_setup(hass: HomeAssistant, config: dict) -> bool:
    """Called when domain appears in configuration.yaml (rarely used)."""
    # Registration is handled in async_setup_entry for config-flow integrations.
    return True


def _register_frontend(hass: HomeAssistant) -> None:
    """Register JS HTTP views and Lovelace resources (idempotent)."""
    from pathlib import Path
    from .http import SmartShoppingCardView, SmartShoppingSummaryCardView, SmartShoppingPantryCardView, CARD_URL, SUMMARY_URL, PANTRY_URL

    # Only register HTTP views once per HA session
    if not hass.data.get(f"{DOMAIN}_frontend_registered"):
        hass.http.register_view(SmartShoppingCardView())
        hass.http.register_view(SmartShoppingSummaryCardView())
        hass.http.register_view(SmartShoppingPantryCardView())
        hass.data[f"{DOMAIN}_frontend_registered"] = True
        _LOGGER.info("Smart Shopping: JS views registered at %s, %s and %s", CARD_URL, SUMMARY_URL, PANTRY_URL)

    # Verify JS files exist
    here = Path(__file__).parent
    for fname in ("smart-shopping-card.js", "smart-shopping-summary-card.js", "smart-shopping-pantry-card.js"):
        if not (here / fname).exists():
            _LOGGER.error("Smart Shopping: %s not found in %s — card will not load!", fname, here)

    # Register with Lovelace (idempotent — HA deduplicates these internally)
    try:
        from homeassistant.components.frontend import add_extra_js_url
        add_extra_js_url(hass, CARD_URL)
        add_extra_js_url(hass, SUMMARY_URL)
        add_extra_js_url(hass, PANTRY_URL)
        _LOGGER.info("Smart Shopping: Lovelace resources registered")
    except Exception as err:
        _LOGGER.warning(
            "Smart Shopping: Could not auto-register Lovelace resources (%s). "
            "Add manually in Settings → Dashboards → ⋮ → Resources: %s, %s and %s",
            err, CARD_URL, SUMMARY_URL, PANTRY_URL,
        )


async def async_setup_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    """Set up Smart Shopping from a config entry."""
    hass.data.setdefault(DOMAIN, {})

    # Register JS frontend — must happen during entry setup for config-flow integrations
    _register_frontend(hass)

    store = Store(hass, STORAGE_VERSION, STORAGE_KEY)
    try:
        stored_data = await store.async_load() or {}
    except Exception as err:
        _LOGGER.warning("Could not load stored data, starting fresh: %s", err)
        stored_data = {}

    coordinator = SmartShoppingCoordinator(hass, entry, store, stored_data)
    hass.data[DOMAIN][entry.entry_id] = coordinator

    # Register services FIRST — before platform setup so they are always available
    _register_services(hass, coordinator)

    await hass.config_entries.async_forward_entry_setups(entry, PLATFORMS)
    entry.async_on_unload(entry.add_update_listener(async_reload_entry))

    _LOGGER.info("Smart Shopping loaded. Services registered, todo_entity=%s", coordinator.todo_entity)
    return True


async def async_unload_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    """Unload a config entry."""
    unload_ok = await hass.config_entries.async_unload_platforms(entry, PLATFORMS)
    if unload_ok:
        hass.data[DOMAIN].pop(entry.entry_id, None)
    return unload_ok


async def async_reload_entry(hass: HomeAssistant, entry: ConfigEntry) -> None:
    """Reload config entry."""
    await async_unload_entry(hass, entry)
    await async_setup_entry(hass, entry)


def _register_services(hass: HomeAssistant, coordinator: "SmartShoppingCoordinator") -> None:
    """Register all integration services. Safe to call multiple times."""

    if hass.services.has_service(DOMAIN, SERVICE_ADD_ITEM):
        _LOGGER.debug("Smart Shopping services already registered")
        return

    add_item_schema = vol.Schema({
        vol.Required(ITEM_NAME): cv.string,
        vol.Optional(ITEM_CATEGORY, default="Other"): cv.string,
        vol.Optional(ITEM_QUANTITY, default=1): vol.Coerce(int),
        vol.Optional(ITEM_UNIT, default=""): cv.string,
        vol.Optional(ITEM_IMAGE_URL, default=""): cv.string,
        vol.Optional(ITEM_STORE, default=""): cv.string,
        vol.Optional(ITEM_NOTES, default=""): cv.string,
    })

    name_schema = vol.Schema({vol.Required(ITEM_NAME): cv.string})

    check_item_schema = vol.Schema({
        vol.Required(ITEM_NAME): cv.string,
        vol.Optional("purchased_at", default=""): cv.string,
    })

    async def handle_add_item(call: ServiceCall) -> None:
        await coordinator.async_add_item(dict(call.data))

    async def handle_remove_item(call: ServiceCall) -> None:
        await coordinator.async_remove_item(call.data[ITEM_NAME])

    async def handle_check_item(call: ServiceCall) -> None:
        await coordinator.async_check_item(
            call.data[ITEM_NAME], True,
            purchased_at=call.data.get("purchased_at", "")
        )

    async def handle_uncheck_item(call: ServiceCall) -> None:
        await coordinator.async_check_item(call.data[ITEM_NAME], False)

    async def handle_clear_checked(call: ServiceCall) -> None:
        await coordinator.async_clear_checked()

    async def handle_add_store(call: ServiceCall) -> None:
        await coordinator.async_add_store(dict(call.data))

    async def handle_add_category(call: ServiceCall) -> None:
        await coordinator.async_add_category(dict(call.data))

    async def handle_sync_todo(call: ServiceCall) -> None:
        await coordinator.async_sync_to_todo()

    async def handle_update_stores(call: ServiceCall) -> None:
        await coordinator.async_update_stores(list(call.data.get("stores", [])))

    async def handle_update_categories(call: ServiceCall) -> None:
        await coordinator.async_update_categories(list(call.data.get("categories", [])))

    async def handle_update_items(call: ServiceCall) -> None:
        await coordinator.async_update_items(list(call.data.get("items", [])))

    hass.services.async_register(DOMAIN, SERVICE_ADD_ITEM,          handle_add_item,          schema=add_item_schema)
    hass.services.async_register(DOMAIN, SERVICE_REMOVE_ITEM,       handle_remove_item,       schema=name_schema)
    hass.services.async_register(DOMAIN, SERVICE_CHECK_ITEM,        handle_check_item,        schema=check_item_schema)
    hass.services.async_register(DOMAIN, SERVICE_UNCHECK_ITEM,      handle_uncheck_item,      schema=name_schema)
    hass.services.async_register(DOMAIN, SERVICE_CLEAR_CHECKED,     handle_clear_checked)
    hass.services.async_register(DOMAIN, SERVICE_ADD_STORE,         handle_add_store)
    hass.services.async_register(DOMAIN, SERVICE_ADD_CATEGORY,      handle_add_category)
    hass.services.async_register(DOMAIN, SERVICE_SYNC_TODO,         handle_sync_todo)
    hass.services.async_register(DOMAIN, SERVICE_UPDATE_STORES,     handle_update_stores)
    hass.services.async_register(DOMAIN, SERVICE_UPDATE_CATEGORIES, handle_update_categories)
    hass.services.async_register(DOMAIN, SERVICE_UPDATE_ITEMS,      handle_update_items)

    async def handle_pantry_add(call: ServiceCall) -> None:
        await coordinator.async_pantry_add(dict(call.data))

    async def handle_pantry_update(call: ServiceCall) -> None:
        await coordinator.async_pantry_update(dict(call.data))

    async def handle_pantry_remove(call: ServiceCall) -> None:
        await coordinator.async_pantry_remove(str(call.data.get("id", "")))

    hass.services.async_register(DOMAIN, SERVICE_PANTRY_ADD,    handle_pantry_add)
    hass.services.async_register(DOMAIN, SERVICE_PANTRY_UPDATE, handle_pantry_update)
    hass.services.async_register(DOMAIN, SERVICE_PANTRY_REMOVE, handle_pantry_remove)


    _LOGGER.debug("Smart Shopping: all 11 services registered")


class SmartShoppingCoordinator:
    """Manages shopping list state and synchronisation."""

    def __init__(
        self,
        hass: HomeAssistant,
        entry: ConfigEntry,
        store: Store,
        stored_data: dict,
    ) -> None:
        self.hass = hass
        self.entry = entry
        self._store = store
        self._items: list[dict] = list(stored_data.get("items", []))
        self._stores: list[dict] = list(
            stored_data.get("stores", entry.data.get(CONF_STORES, DEFAULT_STORES))
        )
        self._categories: list[dict] = list(
            stored_data.get("categories", entry.data.get(CONF_CATEGORIES, DEFAULT_CATEGORIES))
        )
        self._pantry: list[dict] = list(stored_data.get("pantry", []))
        self._listeners: list = []

    # --- Properties ---

    @property
    def todo_entity(self) -> str:
        return self.entry.options.get(
            CONF_TODO_ENTITY,
            self.entry.data.get(CONF_TODO_ENTITY, ""),
        )

    @property
    def items(self) -> list[dict]:
        return self._items

    @property
    def stores(self) -> list[dict]:
        return self._stores

    @property
    def categories(self) -> list[dict]:
        return self._categories

    @property
    def pantry(self) -> list[dict]:
        return self._pantry

    @property
    def unchecked_count(self) -> int:
        return sum(1 for i in self._items if not i.get(ITEM_CHECKED, False))

    @property
    def total_count(self) -> int:
        return len(self._items)

    # --- Listeners ---

    def add_listener(self, listener) -> None:
        self._listeners.append(listener)

    @callback
    def _notify_listeners(self) -> None:
        for listener in self._listeners:
            try:
                listener()
            except Exception as err:
                _LOGGER.warning("Listener error: %s", err)
        self.hass.bus.async_fire(EVENT_LIST_UPDATED, {
            "unchecked_count": self.unchecked_count,
            "total_count": self.total_count,
        })

    # --- Persistence ---

    async def _async_save(self) -> None:
        try:
            await self._store.async_save({
                "items":      self._items,
                "stores":     self._stores,
                "categories": self._categories,
                "pantry":     self._pantry,
            })
        except Exception as err:
            _LOGGER.error("Failed to save shopping data: %s", err)

    # --- Item operations ---

    async def async_add_item(self, item_data: dict) -> None:
        name = str(item_data.get(ITEM_NAME, "")).strip()
        if not name:
            return
        existing = next(
            (i for i in self._items if i[ITEM_NAME].lower() == name.lower()), None
        )
        if existing:
            existing[ITEM_QUANTITY] = existing.get(ITEM_QUANTITY, 1) + int(item_data.get(ITEM_QUANTITY, 1))
            existing[ITEM_CHECKED] = False
        else:
            self._items.append({
                ITEM_NAME:      name,
                ITEM_CATEGORY:  str(item_data.get(ITEM_CATEGORY, "Other")),
                ITEM_QUANTITY:  int(item_data.get(ITEM_QUANTITY, 1)),
                ITEM_UNIT:      str(item_data.get(ITEM_UNIT, "")),
                ITEM_IMAGE_URL: str(item_data.get(ITEM_IMAGE_URL, "")),
                ITEM_STORE:     str(item_data.get(ITEM_STORE, "")),
                ITEM_NOTES:     str(item_data.get(ITEM_NOTES, "")),
                ITEM_CHECKED:   False,
                "added":        datetime.now().isoformat(),
            })
        await self._async_save()
        self._notify_listeners()
        await self.async_sync_to_todo()

    async def async_remove_item(self, item_name: str) -> None:
        self._items = [i for i in self._items if i[ITEM_NAME].lower() != item_name.lower()]
        await self._async_save()
        self._notify_listeners()

    async def async_check_item(self, item_name: str, checked: bool, purchased_at: str = "") -> None:
        """Check (True) or uncheck (False) an item by name. Optionally record purchase timestamp."""
        for item in self._items:
            if item[ITEM_NAME].lower() == item_name.lower():
                item[ITEM_CHECKED] = checked
                if checked and purchased_at:
                    item["purchased_at"] = purchased_at
                elif not checked:
                    item.pop("purchased_at", None)
                _LOGGER.debug("Item '%s' checked=%s", item_name, checked)
                break
        await self._async_save()
        self._notify_listeners()

    async def async_clear_checked(self) -> None:
        self._items = [i for i in self._items if not i.get(ITEM_CHECKED, False)]
        await self._async_save()
        self._notify_listeners()

    # --- Store / Category operations ---

    async def async_add_store(self, store_data: dict) -> None:
        self._stores.append({k: v for k, v in store_data.items()})
        await self._async_save()
        self._notify_listeners()

    async def async_add_category(self, category_data: dict) -> None:
        self._categories.append({k: v for k, v in category_data.items()})
        await self._async_save()
        self._notify_listeners()

    async def async_update_stores(self, stores: list) -> None:
        self._stores = [{k: v for k, v in s.items()} for s in stores]
        await self._async_save()
        self._notify_listeners()

    async def async_update_categories(self, categories: list) -> None:
        self._categories = [{k: v for k, v in c.items()} for c in categories]
        await self._async_save()
        self._notify_listeners()

    async def async_update_items(self, items: list) -> None:
        self._items = [{k: v for k, v in i.items()} for i in items]
        await self._async_save()
        self._notify_listeners()

    # --- Todo sync ---

    async def async_sync_to_todo(self) -> None:
        todo_entity = self.todo_entity
        if not todo_entity:
            return
        try:
            for item in self._items:
                if item.get(ITEM_CHECKED, False):
                    continue
                qty  = item.get(ITEM_QUANTITY, 1)
                unit = item.get(ITEM_UNIT, "")
                name = item[ITEM_NAME]
                summary = f"{qty}{unit} {name}" if unit else (f"{qty}x {name}" if qty > 1 else name)
                await self.hass.services.async_call(
                    "todo", "add_item",
                    {"entity_id": todo_entity, "item": summary},
                    blocking=False,
                )
        except Exception as err:
            _LOGGER.error("Todo sync failed for '%s': %s", todo_entity, err)

    # --- State snapshot ---

    def get_state_data(self) -> dict:
        return {
            "items":           self._items,
            "stores":          self._stores,
            "categories":      self._categories,
            "todo_entity":     self.todo_entity,
            "unchecked_count": self.unchecked_count,
            "total_count":     self.total_count,
            "pantry":          self._pantry,
        }

    async def async_pantry_add(self, entry: dict) -> None:
        import uuid
        if not entry.get("id"):
            entry["id"] = str(uuid.uuid4())[:8]
        idx = next((i for i, p in enumerate(self._pantry) if p.get("id") == entry["id"]), None)
        if idx is not None:
            self._pantry[idx] = entry
        else:
            self._pantry.insert(0, entry)
        await self._async_save()
        self._notify_listeners()

    async def async_pantry_update(self, entry: dict) -> None:
        idx = next((i for i, p in enumerate(self._pantry) if p.get("id") == entry.get("id")), None)
        if idx is not None:
            self._pantry[idx] = entry
            await self._async_save()
            self._notify_listeners()

    async def async_pantry_remove(self, item_id: str) -> None:
        self._pantry = [p for p in self._pantry if p.get("id") != item_id]
        await self._async_save()
        self._notify_listeners()

