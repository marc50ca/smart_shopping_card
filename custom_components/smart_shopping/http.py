"""HTTP views to serve the Smart Shopping card JS files."""
from __future__ import annotations

from pathlib import Path

from homeassistant.components.http import HomeAssistantView

# JS files live alongside this file inside custom_components/smart_shopping/
_HERE = Path(__file__).parent

CARD_URL    = "/smart_shopping/smart-shopping-card.js"
SUMMARY_URL = "/smart_shopping/smart-shopping-summary-card.js"

_HEADERS = {
    "Content-Type": "application/javascript; charset=utf-8",
    "Cache-Control": "no-cache",
}


class SmartShoppingCardView(HomeAssistantView):
    """Serve smart-shopping-card.js."""

    url           = CARD_URL
    name          = "smart_shopping:card"
    requires_auth = False

    async def get(self, request):
        from aiohttp.web import Response
        f = _HERE / "smart-shopping-card.js"
        if not f.exists():
            return Response(status=404, text="smart-shopping-card.js not found")
        return Response(body=f.read_bytes(), headers=_HEADERS)


class SmartShoppingSummaryCardView(HomeAssistantView):
    """Serve smart-shopping-summary-card.js."""

    url           = SUMMARY_URL
    name          = "smart_shopping:summary_card"
    requires_auth = False

    async def get(self, request):
        from aiohttp.web import Response
        f = _HERE / "smart-shopping-summary-card.js"
        if not f.exists():
            return Response(status=404, text="smart-shopping-summary-card.js not found")
        return Response(body=f.read_bytes(), headers=_HEADERS)
