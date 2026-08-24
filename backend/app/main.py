from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware

from app.api.routes import (
    accounts,
    assets,
    auth,
    dashboard,
    envelopes,
    liabilities,
    valuations,
)
from app.core.config import get_settings
from app.core.database import SessionLocal
from app.core.security import decode_access_token, hash_password
from app.models.user import User

settings = get_settings()

PUBLIC_PATHS = {"/health", "/auth/status", "/auth/login", "/docs", "/openapi.json", "/redoc"}


def _seed_admin_user() -> None:
    """Create/update the single admin account from env vars on every startup.

    Lets a self-hosted deployer rotate the password by changing
    ADMIN_PASSWORD and restarting, with no separate admin CLI/flow.
    """
    if not settings.auth_enabled:
        return

    db = SessionLocal()
    try:
        user = db.query(User).filter(User.username == settings.admin_username).first()
        password_hash = hash_password(settings.admin_password)
        if user is None:
            db.add(User(username=settings.admin_username, password_hash=password_hash))
        else:
            user.password_hash = password_hash
        db.commit()
    finally:
        db.close()


@asynccontextmanager
async def lifespan(app: FastAPI):
    _seed_admin_user()
    yield


app = FastAPI(title="Croesus API", version="0.1.0", lifespan=lifespan)


async def require_auth(request: Request, call_next):
    if (
        not settings.auth_enabled
        or request.method == "OPTIONS"
        or request.url.path in PUBLIC_PATHS
    ):
        return await call_next(request)

    authorization = request.headers.get("Authorization", "")
    scheme, _, token = authorization.partition(" ")
    username = decode_access_token(token) if scheme.lower() == "bearer" else None
    if username is None:
        return JSONResponse(status_code=401, content={"detail": "Not authenticated"})

    return await call_next(request)


# Added before CORSMiddleware so CORS ends up as the outermost middleware —
# otherwise a 401 short-circuit here would skip CORS headers entirely and
# browsers would surface a CORS error instead of the actual 401.
app.add_middleware(BaseHTTPMiddleware, dispatch=require_auth)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(accounts.router)
app.include_router(valuations.router)
app.include_router(assets.router)
app.include_router(liabilities.router)
app.include_router(envelopes.router)
app.include_router(dashboard.router)


@app.get("/health")
def health():
    return {"status": "ok"}
