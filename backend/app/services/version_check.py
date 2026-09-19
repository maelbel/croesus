"""Checks GitHub for the latest published Croesus release, so Settings ->
About can show an "update available" indicator. Never raises: a self-hosted
instance without internet access (or with the check disabled) should just
see no update info, not an error — same "never raises" convention as
app/services/fx.py's own external calls.

In-memory only, unlike fx.py/pricing.py's DB-backed caches: a single global
value that changes at most every few days doesn't need to survive a restart
or be shared across worker processes — it's fine for each to warm its own.
"""

import logging
from datetime import UTC, datetime, timedelta

import httpx

from app.core.config import get_settings

logger = logging.getLogger(__name__)

GITHUB_LATEST_RELEASE_URL = "https://api.github.com/repos/maelbel/croesus/releases/latest"

_cache: dict[str, str] | None = None
_cached_at: datetime | None = None


def get_latest_release() -> dict[str, str] | None:
    """{"version": "1.3.1", "url": "https://github.com/.../releases/tag/v1.3.1"}, or None if
    checking is disabled, the fetch fails, and there's no still-fresh cached value either."""
    global _cache, _cached_at

    settings = get_settings()
    if not settings.update_check_enabled:
        return None

    now = datetime.now(UTC)
    ttl = timedelta(minutes=settings.update_check_cache_ttl_minutes)
    if _cached_at is not None and now - _cached_at < ttl:
        return _cache

    try:
        response = httpx.get(
            GITHUB_LATEST_RELEASE_URL, headers={"Accept": "application/vnd.github+json"}, timeout=10
        )
        response.raise_for_status()
        data = response.json()
        result = {"version": data["tag_name"].removeprefix("v"), "url": data["html_url"]}
    except Exception:
        logger.warning("GitHub latest-release check failed", exc_info=True)
        return _cache  # stale (possibly None) cache beats erroring the request

    _cache = result
    _cached_at = now
    return result
