"""HTTP views to serve the Smart Shopping card JS."""
from __future__ import annotations

from pathlib import Path

from homeassistant.components.http import HomeAssistantView

_WWW = Path(__file__).parent.parent.parent / "www" / "smart-shopping-card"

CARD_URL    = "/smart_shopping/smart-shopping-card.js"
SUMMARY_URL = "/smart_shopping/smart-shopping-summary-card.js"


class SmartShoppingCardView(HomeAssistantView):
    """Serve the Smart Shopping Lovelace card JavaScript."""
    url = CARD_URL
    name = "smart_shopping:card"
    requires_auth = False

    async def get(self, request):
        from aiohttp.web import FileResponse, Response
        f = _WWW / "smart-shopping-card.js"
        return FileResponse(f) if f.exists() else Response(status=404, text="Not found")


class SmartShoppingSummaryCardView(HomeAssistantView):
    """Serve the Smart Shopping Summary Lovelace card JavaScript."""
    url = SUMMARY_URL
    name = "smart_shopping:summary_card"
    requires_auth = False

    async def get(self, request):
        from aiohttp.web import FileResponse, Response
        f = _WWW / "smart-shopping-summary-card.js"
        return FileResponse(f) if f.exists() else Response(status=404, text="Not found")
