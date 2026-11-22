# Deployment PACE ke STB

Panduan deployment layanan PACE menggunakan Docker Compose, Nginx, SQLite, dan Cloudflare Tunnel.

## Menjalankan kontainer

Periksa arsitektur STB dengan `uname -m`, memori dengan `free -h`, serta instalasi Docker dengan `docker version` dan `docker compose version`. Dukungan image dan dependensi pada perangkat perlu diuji lewat build.

Siapkan `.env` mengikuti [README](../README.md#menjalankan-lokal). Gunakan secret baru pada mesin deployment. Dari folder utama repository di STB:

```sh
docker compose config --quiet
docker compose up -d --build
docker compose ps
docker compose exec core-service python -m app.seed
curl --fail http://127.0.0.1:8080/api/health
```

Buat akun `siswa_demo` melalui `POST /api/auth/register` di Swagger pada `http://127.0.0.1:8080/docs`, lalu bagikan akun uji secara privat. Database tersimpan pada volume `pace-data`; restart kontainer mempertahankan data. `docker compose down -v` menghapus volume tersebut.

## Akses publik

1. Pesan nama kelompok di API Registry kelas.
2. Buat Cloudflare Tunnel dan hostname milik kelompok sendiri.
3. Gunakan `<nama-kelompok>.stei.fun` untuk K01 atau `<nama-kelompok>.stei.site` untuk K02.
4. Arahkan hostname ke service HTTP `gateway:80` dalam jaringan Compose.
5. Isi `TUNNEL_TOKEN` di `.env`, lalu jalankan:

```sh
docker compose --profile public up -d
docker compose logs --tail=30 tunnel
```

Profile `public` memerlukan token tunnel. Uji `/api/health`, `/docs`, login, dan asesmen melalui URL HTTPS dari jaringan lain. Cantumkan URL yang berhasil diuji di README dan Registry.

## Batas sumber daya

| Kontainer | Memori | CPU |
| --- | --- | --- |
| core-service | 256 MiB | 0.5 |
| gateway | 64 MiB | 0.25 |
| tunnel | 128 MiB | 0.25 |

Semua service memakai `restart: unless-stopped`. Pantau pemakaian nyata dengan `docker stats` dan `free -h`. Nilai di tabel merupakan batas konfigurasi, bukan hasil pengukuran.

Gateway membatasi API hingga 10 request/detik dengan burst 20, serta login/register hingga 5 request/menit dengan burst 5. Di belakang tunnel, klien masih berbagi kuota berdasarkan alamat upstream. Gateway terikat ke `127.0.0.1` secara default; pengujian langsung melalui LAN memerlukan `GATEWAY_BIND=0.0.0.0`.

## Backup dan pemulihan

Backup memakai API SQLite agar konsisten saat mode WAL aktif:

```sh
docker compose cp scripts/backup_db.py core-service:/tmp/backup_db.py
docker compose exec core-service python /tmp/backup_db.py /data/pace.db /data/pace-backup-01.db
mkdir -p backups
docker compose cp core-service:/data/pace-backup-01.db backups/pace-backup-01.db
```

Gunakan nama baru setiap backup. Script menolak menimpa file dan memeriksa integritas hasilnya. Simpan backup serta `.env` secara privat.

Untuk memulihkan, cadangkan kondisi saat ini dan hentikan semua proses yang memakai database. Jalankan dari folder utama repository:

```sh
docker compose stop core-service
docker compose run --rm --no-deps --entrypoint python -v ./backups:/backup:ro core-service -c "import sqlite3; source=sqlite3.connect('file:/backup/pace-backup-01.db?mode=ro', uri=True); target=sqlite3.connect('/data/pace.db'); source.backup(target); target.close(); source.close()"
docker compose up -d core-service
```

Periksa health dan progres akun uji setelah pemulihan. Jangan commit `.env`, token, key, atau database.

## Pemeriksaan sebelum pengumpulan

- API HTTPS dapat diakses dari luar jaringan STB.
- Akun uji, asesmen, progres, dan rekomendasi berjalan.
- Data bertahan setelah restart kontainer; backup dan pemulihan sudah dicoba.
- Batas sumber daya dan rate limit sudah diuji pada perangkat.
- URL API, URL repositori, dokumentasi, dan cara meminta akses tersedia di Registry.
- README berisi status deployment yang benar dan sudah diekspor ke `README.pdf`.

STB menjalankan microservice, database, gateway, dan tunnel. Layanan integrasi Tugas 3 ditempatkan di luar STB.
