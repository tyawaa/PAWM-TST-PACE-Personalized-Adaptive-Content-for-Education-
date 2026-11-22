# Backup database SQLite saat mode WAL aktif.

import argparse
import sqlite3
from contextlib import closing
from pathlib import Path

parser = argparse.ArgumentParser()
parser.add_argument("source")
parser.add_argument("destination")
args = parser.parse_args()
source = Path(args.source).resolve()
destination = Path(args.destination).resolve()
if not source.is_file():
    raise SystemExit("Database sumber tidak ditemukan.")
if destination.exists():
    raise SystemExit("Tujuan sudah ada. Pilih nama cadangan baru.")
destination.parent.mkdir(parents=True, exist_ok=True)
with (
    closing(sqlite3.connect(source.as_uri() + "?mode=ro", uri=True)) as original,
    closing(sqlite3.connect(destination)) as backup,
):
    original.backup(backup)
    if backup.execute("PRAGMA integrity_check").fetchone()[0] != "ok":
        raise SystemExit("Pemeriksaan integritas cadangan gagal.")
destination.chmod(0o600)
print("Cadangan selesai dan pemeriksaan integritas berhasil.")
