import json
import os
from dataclasses import dataclass, field
from pathlib import Path

from dotenv import load_dotenv


@dataclass(frozen=True)
class Settings:
    database_path: Path
    jwt_secret: str
    partner_keys: dict[str, str] = field(default_factory=dict)
    token_minutes: int = 60
    allowed_origins: tuple[str, ...] = ()

    def __post_init__(self):
        if len(self.jwt_secret) < 32 or self.jwt_secret.startswith("CHANGE_ME"):
            raise ValueError("JWT_SECRET harus berupa rahasia acak, minimal 32 karakter.")
        if self.token_minutes < 1:
            raise ValueError("TOKEN_MINUTES harus lebih besar dari nol.")
        if not isinstance(self.partner_keys, dict):
            raise ValueError("PARTNER_API_KEYS harus berupa objek JSON.")
        keys = list(self.partner_keys.values())
        if any(
            not isinstance(name, str)
            or not name
            or not isinstance(key, str)
            or len(key) < 32
            or key.startswith("CHANGE_ME")
            for name, key in self.partner_keys.items()
        ) or len(set(keys)) != len(keys):
            raise ValueError("Setiap kelompok mitra memerlukan API key unik, minimal 32 karakter.")

    @classmethod
    def from_env(cls):
        load_dotenv(Path(__file__).resolve().parents[2] / ".env")
        return cls(
            database_path=Path(os.getenv("DATABASE_PATH", "data/pace.db")),
            jwt_secret=os.getenv("JWT_SECRET", ""),
            partner_keys=json.loads(os.getenv("PARTNER_API_KEYS", "{}")),
            token_minutes=int(os.getenv("TOKEN_MINUTES", "60")),
            allowed_origins=tuple(
                origin.strip()
                for origin in os.getenv("ALLOWED_ORIGINS", "").split(",")
                if origin.strip()
            ),
        )
