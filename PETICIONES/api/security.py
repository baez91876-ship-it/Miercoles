from datetime import datetime, timedelta, timezone

import jwt
from pwdlib import PasswordHash

from .database import Document
from .settings import ACCESS_TOKEN_MINUTES, JWT_ALGORITHM, JWT_SECRET

PASSWORD_HASHER = PasswordHash.recommended()


def create_access_token(user: Document) -> str:
    now = datetime.now(timezone.utc)
    payload = {"sub": str(user["_id"]), "iat": now, "exp": now + timedelta(minutes=ACCESS_TOKEN_MINUTES)}
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def read_token_subject(token: str) -> str:
    return jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])["sub"]
