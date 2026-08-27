import base64
import hashlib
import secrets
from urllib.parse import urlencode, urlsplit

import httpx
import jwt

from app.core.tokens import decode_token, encode_token

_STATE_EXPIRES_MINUTES = 10
_STATE_TOKEN_TYPE = "oidc_state"

# Discovery documents don't change at runtime — fetch once per issuer per
# process instead of hitting the IdP on every login attempt.
_discovery_cache: dict[str, dict] = {}
_jwks_client_cache: dict[str, jwt.PyJWKClient] = {}

# Shared across every OIDC request (discovery fetch + token exchange) so
# connections to the IdP can be kept alive instead of paying a fresh
# TCP+TLS handshake per call. Closed via aclose_http_client() at shutdown.
_http_client: httpx.AsyncClient | None = None


def get_http_client() -> httpx.AsyncClient:
    global _http_client
    if _http_client is None:
        _http_client = httpx.AsyncClient()
    return _http_client


async def aclose_http_client() -> None:
    global _http_client
    if _http_client is not None:
        await _http_client.aclose()
        _http_client = None


async def get_discovery_document(issuer: str) -> dict:
    if issuer not in _discovery_cache:
        response = await get_http_client().get(f"{issuer.rstrip('/')}/.well-known/openid-configuration")
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
    payload = {
        "redirect_uri": app_redirect_uri,
        "code_verifier": code_verifier,
        "nonce": nonce,
    }
    return encode_token(payload, typ=_STATE_TOKEN_TYPE, expires_minutes=_STATE_EXPIRES_MINUTES)


def read_state_token(state: str) -> dict | None:
    return decode_token(state, typ=_STATE_TOKEN_TYPE)


def is_loopback(uri: str) -> bool:
    hostname = urlsplit(uri).hostname
    return hostname in ("127.0.0.1", "localhost")


def is_allowed_redirect_uri(uri: str, cors_origins: list[str]) -> bool:
    if is_loopback(uri):
        return True
    parts = urlsplit(uri)
    origin = f"{parts.scheme}://{parts.netloc}"
    return origin in cors_origins


def build_client_redirect(app_redirect_uri: str, **params: str) -> str:
    """Append params (a token on success, an error code on failure) to the
    app's own redirect_uri using its callback convention: a query string for
    the desktop loopback listener (it only ever reads raw query params off
    the request line, never a fragment), a URL fragment for the browser SPA
    (kept out of any request its own server sees).
    """
    query = urlencode(params)
    if is_loopback(app_redirect_uri):
        separator = "&" if "?" in app_redirect_uri else "?"
    else:
        separator = "#"
    return f"{app_redirect_uri}{separator}{query}"
