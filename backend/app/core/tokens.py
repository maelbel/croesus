from datetime import UTC, datetime, timedelta

import jwt

from app.core.config import get_settings


def encode_token(payload: dict, *, typ: str, expires_minutes: int) -> str:
    settings = get_settings()
    expires_at = datetime.now(UTC) + timedelta(minutes=expires_minutes)
    return jwt.encode({**payload, "typ": typ, "exp": expires_at}, settings.jwt_secret, algorithm="HS256")


def decode_token(token: str, *, typ: str) -> dict | None:
    settings = get_settings()
    try:
        payload = jwt.decode(token, settings.jwt_secret, algorithms=["HS256"])
    except jwt.PyJWTError:
        return None
    if payload.get("typ") != typ:
        return None
    return payload
