"""Brute-force throttle for /auth/login and /auth/oidc/callback (see app/api/routes/auth.py) — a
single-admin self-hosted instance with password auth enabled otherwise has no limit on login
attempts. Deliberately in-process/in-memory (slowapi's default), not Redis-backed — this project
targets a single backend instance (Docker container or desktop sidecar), not a multi-instance
deployment, so distributed rate-limit state isn't needed (see Technical Considerations on the
issue this closes).

Keyed by request.client.host (slowapi's default get_remote_address), i.e. the apparent TCP peer.
Deliberately does NOT trust X-Forwarded-For: this backend doesn't know whether it's sitting
directly on the internet (the docker-compose.yml default) or behind a reverse proxy
(docs/REVERSE_PROXY.md) that actually strips/sets that header, and trusting it unconditionally
would let a direct, un-proxied attacker spoof a different IP on every request to bypass the
limit entirely. Practical effect: behind a reverse proxy, every client shares one bucket (the
proxy's IP) — acceptable given the single-admin threat model this is protecting (there's normally
only one legitimate user attempting to log in at all), and a deployer who wants precise
per-real-client throttling in front of a trusted proxy can enforce it at the proxy instead.
"""

from slowapi import Limiter
from slowapi.util import get_remote_address

from app.core.config import get_settings

limiter = Limiter(key_func=get_remote_address)


def auth_rate_limit() -> str:
    """A callable (rather than a fixed string) so it re-reads settings.rate_limit_auth_per_minute
    on every check instead of freezing whatever it was at import time — matters for tests that
    override the setting."""
    return f"{get_settings().rate_limit_auth_per_minute}/minute"
