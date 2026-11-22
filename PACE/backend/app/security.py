import hmac
import sqlite3
from datetime import datetime, timedelta, timezone
from typing import Annotated, TypedDict, cast

import jwt
from fastapi import Depends, HTTPException, Request
from fastapi.security import APIKeyHeader, HTTPAuthorizationCredentials, HTTPBearer
from pwdlib import PasswordHash

from .config import Settings
from .database import connect
from .schemas import UserIdentity

passwords: PasswordHash = PasswordHash.recommended()
dummy_hash: str = passwords.hash("timing-only-password-not-an-account")
bearer: HTTPBearer = HTTPBearer(auto_error=False)
api_key_header: APIKeyHeader = APIKeyHeader(name="X-API-Key", auto_error=False)


class TokenClaims(TypedDict):
    sub: str


def make_token(user_id: str, settings: Settings) -> str:
    now: datetime = datetime.now(timezone.utc)
    return jwt.encode(
        {
            "sub": user_id,
            "iat": now,
            "exp": now + timedelta(minutes=settings.token_minutes),
            "iss": "pace-core",
            "aud": "pace-mobile",
        },
        settings.jwt_secret,
        algorithm="HS256",
    )


def current_user(
    request: Request,
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(bearer)],
) -> UserIdentity:
    settings: Settings = request.app.state.settings
    try:
        if credentials is None:
            raise ValueError("missing token")
        claims: TokenClaims = cast(
            TokenClaims,
            jwt.decode(
                credentials.credentials,
                settings.jwt_secret,
                algorithms=["HS256"],
                audience="pace-mobile",
                issuer="pace-core",
                options={"require": ["sub", "iat", "exp"]},
            ),
        )
        with connect(settings.database_path) as db:
            user: sqlite3.Row | None = db.execute(
                "SELECT id, username, name FROM users WHERE id=? AND partner_id IS NULL",
                (claims["sub"],),
            ).fetchone()
        if user is None:
            raise ValueError("unknown account")
        return cast(UserIdentity, dict(user))
    except (jwt.InvalidTokenError, ValueError):
        raise HTTPException(
            401, "Silakan masuk kembali.", headers={"WWW-Authenticate": "Bearer"}
        ) from None


def current_partner(
    request: Request, key: Annotated[str | None, Depends(api_key_header)]
) -> str:
    settings: Settings = request.app.state.settings
    for partner, configured in settings.partner_keys.items():
        if key and hmac.compare_digest(key.encode(), configured.encode()):
            return partner
    raise HTTPException(401, "API key tidak valid.")
