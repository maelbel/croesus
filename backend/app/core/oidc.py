import base64
import hashlib
import secrets
from datetime import UTC, datetime, timedelta
from urllib.parse import urlsplit

import httpx
import jwt

from app.core.config import get_settings

_STATE_EXPIRES_MINUTES = 10

# Discovery documents don't change at runtime — fetch once per issuer per
# process instead of hitting the IdP on every login attempt.
_discovery_cache: dict[str, dict] = {}
_jwks_client_cache: dict[str, jwt.PyJWKClient] = {}


async def get_discovery_document(issuer: str) -> dict:
    if issuer not in _discovery_cache:
        async with httpx.AsyncClient() as client:
            response = await client.get(f"{issuer.rstrip('/')}/.well-known/openid-configuration")
            response.raise_for_status()
            _discovery_cache[issuer] = response.json()
    return _discovery_cache[issuer]


def get_jwks_client(jwks_uri: str) -> jwt.PyJWKClient:
    if jwks_uri not in _jwks_client_cache:
        _jwks_client_cache[jwks_uri] = jwt.PyJWKClient(jwks_uri)
    return _jwks_client_cache[jwks_uri]


def generate_pkce_pair() -> tuple[str, str]:
    code_verifier = secrets.token_urlsafe(64)
    digest = hashlib.sha256(code_verifier.encode()).digest()
    code_challenge = base64.urlsafe_b64encode(digest).rstrip(b"=").decode()
    return code_verifier, code_challenge


def build_state_token(app_redirect_uri: str, code_verifier: str, nonce: str) -> str:
    settings = get_settings()
    expires_at = datetime.now(UTC) + timedelta(minutes=_STATE_EXPIRES_MINUTES)
    payload = {
        "redirect_uri": app_redirect_uri,
        "code_verifier": code_verifier,
        "nonce": nonce,
        "exp": expires_at,
    }
    return jwt.encode(payload, settings.jwt_secret, algorithm="HS256")


def read_state_token(state: str) -> dict | None:
    settings = get_settings()
    try:
        return jwt.decode(state, settings.jwt_secret, algorithms=["HS256"])
    except jwt.PyJWTError:
        return None


def is_loopback(uri: str) -> bool:
    hostname = urlsplit(uri).hostname
    return hostname in ("127.0.0.1", "localhost")


def is_allowed_redirect_uri(uri: str, cors_origins: list[str]) -> bool:
    if is_loopback(uri):
        return True
    parts = urlsplit(uri)
    origin = f"{parts.scheme}://{parts.netloc}"
    return origin in cors_origins
