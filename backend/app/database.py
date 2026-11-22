import sqlite3
from collections.abc import Iterator
from contextlib import contextmanager
from pathlib import Path

SCHEMA: str = Path(__file__).with_name("schema.sql").read_text(encoding="utf-8")


@contextmanager
def connect(path: Path) -> Iterator[sqlite3.Connection]:
    connection: sqlite3.Connection = sqlite3.connect(path, timeout=10)
    connection.row_factory = sqlite3.Row
    connection.execute("PRAGMA foreign_keys = ON")
    try:
        with connection:
            yield connection
    finally:
        connection.close()


def initialize(path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with connect(path) as db:
        version: int = db.execute("PRAGMA user_version").fetchone()[0]
        if version not in (0, 1):
            raise RuntimeError("Versi database tidak didukung; pulihkan cadangan yang sesuai.")
        db.execute("PRAGMA journal_mode = WAL")
        db.executescript(SCHEMA)
