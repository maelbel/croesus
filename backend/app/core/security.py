import hashlib
import hmac
import secrets

from app.core.config import get_settings
from app.core.tokens import decode_token, encode_token

_PBKDF2_ITERATIONS = 260_000
_ACCESS_TOKEN_TYPE = "access"


def hash_password(password: str) -> str:
    salt = secrets.token_hex(16)
    digest = hashlib.pbkdf2_hmac("sha256", password.encode(), bytes.fromhex(salt), _PBKDF2_ITERATIONS)
    return f"{salt}${digest.hex()}"


def verify_password(password: str, password_hash: str | None) -> bool:
    if password_hash is None:
        return False
    salt, _, digest_hex = password_hash.partition("$")
    if not salt or not digest_hex:
        return False
    candidate = hashlib.pbkdf2_hmac("sha256", password.encode(), bytes.fromhex(salt), _PBKDF2_ITERATIONS)
    return hmac.compare_digest(candidate.hex(), digest_hex)


def create_access_token(username: str) -> str:
    settings = get_settings()
    return encode_token({"sub": username}, typ=_ACCESS_TOKEN_TYPE, expires_minutes=settings.jwt_expires_minutes)


def decode_access_token(token: str) -> str | None:
    payload = decode_token(token, typ=_ACCESS_TOKEN_TYPE)
    return payload.get("sub") if payload else None
