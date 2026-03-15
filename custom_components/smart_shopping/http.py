"""HTTP views to serve the Smart Shopping card JS files."""
from __future__ import annotations

from pathlib import Path

from homeassistant.components.http import HomeAssistantView

# JS lives alongside this file inside custom_components/smart_shopping/
_HERE = Path(__file__).parent

CARD_URL    = "/smart_shopping/smart-shopping-card.js"
SUMMARY_URL = "/smart_shopping/smart-shopping-summary-card.js"


class SmartShoppingCardView(HomeAssistantView):
    """Serve smart-shopping-card.js."""
    url           = CARD_URL
    name          = "smart_shopping:card"
    requires_auth = False

    async def get(self, request):
        from aiohttp.web import FileResponse, Response
        f = _HERE / "smart-shopping-card.js"
        if f.exists():
            return FileResponse(f, headers={"Content-Type": "application/javascript"})
        return Response(status=404, text="smart-shopping-card.js not found")


class SmartShoppingSummaryCardView(HomeAssistantView):
    """Serve smart-shopping-summary-card.js."""
    url           = SUMMARY_URL
    name          = "smart_shopping:summary_card"
    requires_auth = False

    async def get(self, request):
        from aiohttp.web import FileResponse, Response
        f = _HERE / "smart-shopping-summary-card.js"
        if f.exists():
            return FileResponse(f, headers={"Content-Type": "application/javascript"})
        return Response(status=404, text="smart-shopping-summary-card.js not found")
