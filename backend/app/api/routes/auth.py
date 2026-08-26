import logging
import secrets
from urllib.parse import urlencode

import httpx
import jwt
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session

from app.core import oidc
from app.core.config import get_settings
from app.core.database import get_db
from app.core.security import create_access_token, verify_password
from app.models.user import User
from app.schemas.auth import AuthStatus, LoginRequest, TokenResponse

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/auth", tags=["auth"])

# Deployments with no ADMIN_USERNAME configured still need a single account
# row for OIDC-only logins to mint tokens against.
_SSO_ONLY_USERNAME = "sso"


@router.get("/status", response_model=AuthStatus)
def auth_status():
    settings = get_settings()
    return AuthStatus(
        auth_enabled=settings.auth_enabled,
        password_enabled=settings.password_enabled,
        oidc_enabled=settings.oidc_enabled,
        oidc_display_name=settings.oidc_display_name if settings.oidc_enabled else None,
    )


@router.post("/login", response_model=TokenResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)):
    if not get_settings().password_enabled:
        raise HTTPException(status_code=404, detail="Password login is not enabled on this instance")

    user = db.query(User).filter(User.username == payload.username).first()
    if user is None or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid username or password")

    return TokenResponse(access_token=create_access_token(user.username))


@router.get("/oidc/login")
async def oidc_login(redirect_uri: str = Query(...)):
    settings = get_settings()
    if not settings.oidc_enabled:
        raise HTTPException(status_code=404, detail="OIDC login is not enabled on this instance")
    if not oidc.is_allowed_redirect_uri(redirect_uri, settings.cors_origins):
        raise HTTPException(status_code=400, detail="redirect_uri is not allowed")

    discovery = await oidc.get_discovery_document(settings.oidc_issuer)
    code_verifier, code_challenge = oidc.generate_pkce_pair()
    nonce = secrets.token_urlsafe(32)
    state = oidc.build_state_token(redirect_uri, code_verifier, nonce)

    params = {
        "response_type": "code",
        "client_id": settings.oidc_client_id,
        "redirect_uri": settings.oidc_redirect_uri,
        "scope": settings.oidc_scopes,
        "state": state,
        "nonce": nonce,
        "code_challenge": code_challenge,
        "code_challenge_method": "S256",
    }
    return RedirectResponse(f"{discovery['authorization_endpoint']}?{urlencode(params)}")


@router.get("/oidc/callback")
async def oidc_callback(
    code: str = Query(...),
    state: str = Query(...),
    db: Session = Depends(get_db),
):
    settings = get_settings()
    if not settings.oidc_enabled:
        raise HTTPException(status_code=404, detail="OIDC login is not enabled on this instance")

    claims = oidc.read_state_token(state)
    if claims is None:
        raise HTTPException(status_code=400, detail="Invalid or expired login attempt")

    discovery = await oidc.get_discovery_document(settings.oidc_issuer)

    async with httpx.AsyncClient() as client:
        token_response = await client.post(
            discovery["token_endpoint"],
            data={
                "grant_type": "authorization_code",
                "code": code,
                "redirect_uri": settings.oidc_redirect_uri,
                "client_id": settings.oidc_client_id,
                "client_secret": settings.oidc_client_secret,
                "code_verifier": claims["code_verifier"],
            },
        )
    if token_response.status_code != 200:
        raise HTTPException(status_code=401, detail="OIDC token exchange failed")

    id_token = token_response.json().get("id_token")
    if not id_token:
        raise HTTPException(status_code=401, detail="OIDC provider did not return an id_token")

    jwks_client = oidc.get_jwks_client(discovery["jwks_uri"])
    try:
        signing_key = jwks_client.get_signing_key_from_jwt(id_token)
        id_claims = jwt.decode(
            id_token,
            signing_key.key,
            algorithms=["RS256", "ES256"],
            audience=settings.oidc_client_id,
            issuer=settings.oidc_issuer,
        )
    except jwt.PyJWTError as exc:
        logger.warning("OIDC id_token verification failed: %s", exc)
        raise HTTPException(status_code=401, detail="Invalid OIDC id_token") from exc

    if id_claims.get("nonce") != claims["nonce"]:
        raise HTTPException(status_code=401, detail="OIDC nonce mismatch")

    username = settings.admin_username or _SSO_ONLY_USERNAME
    user = db.query(User).filter(User.username == username).first()
    if user is None:
        user = User(username=username, password_hash=None)
        db.add(user)
        db.commit()

    access_token = create_access_token(user.username)
    app_redirect_uri = claims["redirect_uri"]
    separator = "?" if oidc.is_loopback(app_redirect_uri) else "#"
    return RedirectResponse(f"{app_redirect_uri}{separator}token={access_token}")
