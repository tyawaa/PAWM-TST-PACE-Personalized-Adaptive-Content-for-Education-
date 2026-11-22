# PACE

Backend pembelajaran bahasa Inggris untuk siswa SD. PACE menyediakan materi, asesmen, progres per konsep, dan rekomendasi belajar.

Tyara Penelope Lumban Gaol (18224122) dan Daniel Wicaksono Godjali (18224114).

## Status Tugas 2

Backend sudah berjalan secara lokal. Sebanyak 15 tes backend lulus; health, Swagger, OpenAPI, dan katalog juga sudah dicoba melalui Uvicorn. Konfigurasi Compose lulus `docker compose config --quiet`.

Deployment Docker di STB dan akses HTTPS publik belum diuji. URL API publik dan URL repositori belum dicantumkan. Akun uji untuk dibagikan perlu dibuat saat deployment.

Pemakaian API minimal dua kelompok lain dikerjakan pada Tugas 3. Mitra belum ditetapkan; endpoint partner di proyek ini menyediakan akses ke layanan PACE.

## Arsitektur

```text
Klien -> Cloudflare Tunnel -> Nginx -> FastAPI -> SQLite
```

FastAPI menjalankan logika asesmen dan rekomendasi. Nginx membatasi request. SQLite menyimpan akun, katalog, sesi asesmen, dan progres pada volume Docker `pace-data`. Core, gateway, dan tunnel berjalan sebagai kontainer terpisah dengan batas CPU/memori.

## Menjalankan lokal

Gunakan Python 3.12 atau 3.13. Dari folder `PACE`, jalankan di PowerShell:

```powershell
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r backend\requirements.txt
```

Jika `.env` belum ada, salin contoh konfigurasi dan buat secret:

```powershell
Copy-Item .env.example .env
.\.venv\Scripts\python.exe -c "import secrets; print(secrets.token_urlsafe(48))"
```

Buka `.env` dan ganti nilai `JWT_SECRET` dengan hasil perintah tadi. Biarkan pengaturan lainnya seperti contoh untuk menjalankan backend lokal.

```powershell
cd backend
..\.venv\Scripts\python.exe -m app.seed
..\.venv\Scripts\python.exe -m uvicorn app.main:create_app --factory --host 127.0.0.1 --port 8000
```

Buka `http://127.0.0.1:8000/docs`. Buat akun melalui `POST /api/auth/register`, salin `access_token` dari respons, lalu masukkan ke **Authorize > HTTPBearer**. Hentikan server dengan `Ctrl+C`.

Database lokal berada di `backend/data/pace.db`. Seed menambahkan 3 konsep dan 15 soal; aman dijalankan ulang. Materi merupakan data contoh dan ditandai `reviewed: false`.

Di Linux/macOS, gunakan `.venv/bin/python` dari folder `PACE`, atau `../.venv/bin/python` dari folder `backend`. Perintah menyalin konfigurasi: `cp .env.example .env`.

## Endpoint

Base path: `/api`. Swagger tersedia di `/docs`, OpenAPI di `/openapi.json`.

| Metode | Path setelah `/api` | Akses |
| --- | --- | --- |
| GET | `/health` | Publik |
| POST | `/auth/register` | Publik |
| POST | `/auth/login` | Publik |
| GET | `/me` | JWT |
| GET | `/topics` | Publik |
| GET | `/concepts?topic=daily-routines` | Publik |
| GET | `/concepts/{concept_id}/materials` | Publik |
| POST | `/assessments` | JWT |
| GET | `/assessments/{id}` | JWT |
| POST | `/assessments/{id}/submit` | JWT |
| GET | `/progress` | JWT |
| GET | `/recommendations` | JWT |
| GET | `/partner/concepts` | API key |
| POST | `/partner/learners/{ref}/assessments` | API key |
| GET | `/partner/learners/{ref}/assessments/{id}` | API key |
| POST | `/partner/learners/{ref}/assessments/{id}/submit` | API key |
| GET | `/partner/learners/{ref}/progress` | API key |
| GET | `/partner/learners/{ref}/recommendations` | API key |

Contoh register:

```http
POST /api/auth/register
Content-Type: application/json

{"username":"siswa_uji","name":"Siswa Uji","password":"contoh-uji-123"}
```

Respons register berisi JWT yang juga bisa diperoleh lewat `POST /api/auth/login` dengan username dan password yang sama. Contoh membuat asesmen setelah login:

```http
POST /api/assessments
Authorization: Bearer <access_token>
Content-Type: application/json

{"concept_id":"daily-vocabulary"}
```

Format jawaban, respons, dan daftar error ada di [panduan API](docs/API.md).

## Aturan penilaian

- Satu asesmen memuat minimal 5 soal. Nilai dihitung dari persentase jawaban benar.
- Nilai minimal 80 menghasilkan `mastered`; di bawahnya `needs_practice`.
- Konsep berprasyarat baru terbuka setelah prasyarat dikuasai. `daily-reading` memerlukan `daily-vocabulary`.
- Rekomendasi mendahulukan konsep yang perlu latihan, lalu konsep yang belum dinilai.
- Sesi memakai salinan soal dan aturan saat dibuat. Pengiriman ulang jawaban yang sama menghasilkan hasil yang sama; jawaban sesi selesai tidak bisa diganti.
- Progres mengikuti sesi yang dibuat lebih baru. Pengiriman sesi lama tidak menimpanya.

## Akses kelompok lain

Buat key acak dari folder `PACE`:

```powershell
.\.venv\Scripts\python.exe -c "import secrets; print(secrets.token_urlsafe(48))"
```

Isi `PARTNER_API_KEYS` di `.env` dengan objek JSON. Gunakan key berbeda untuk setiap kelompok, minimal 32 karakter. Ganti placeholder berikut dengan hasil perintah tadi:

```dotenv
PARTNER_API_KEYS='{"kelompok-a":"<key-acak-kelompok-a>","kelompok-b":"<key-acak-kelompok-b>"}'
```

Restart server setelah perubahan `.env`. Untuk Docker, jalankan `docker compose up -d --force-recreate core-service`. Bagikan URL API dan key secara privat. Backend mitra memakai header berikut:

```http
GET /api/partner/concepts
X-API-Key: <key-kelompok>
```

Key disimpan di backend mitra. Data siswa tiap kelompok dipisahkan berdasarkan API key dan `learner_ref`. Cara rotasi key dan penggunaan asesmen mitra ada di [panduan API](docs/API.md).

Buat akun uji `siswa_demo` melalui `POST /api/auth/register` di Swagger, seperti akun lainnya. Tentukan password saat register dan bagikan secara privat.

## Docker dan pengumpulan

Siapkan `.env`, lalu jalankan dari folder `PACE`:

```sh
docker compose up -d --build
docker compose exec core-service python -m app.seed
```

API lokal Docker tersedia di `http://127.0.0.1:8080/docs`. Ikuti [panduan deployment](docs/DEPLOYMENT.md) untuk STB, Cloudflare Tunnel, akun uji, dan backup.

Pengumpulan Tugas 2 memerlukan URL API publik, URL repositori, dan `README.pdf`. Daftarkan URL serta dokumentasi di API Registry kelas. Perbarui status dan URL dalam README ini setelah deployment, lalu ekspor ulang ke PDF. Generator PDF tidak disertakan dalam proyek.

## Pengujian

Dari folder `PACE` di PowerShell:

```powershell
.\.venv\Scripts\python.exe -m pip install -r backend\requirements-dev.txt
cd backend
..\.venv\Scripts\python.exe -m unittest discover -s tests -v
..\.venv\Scripts\python.exe -m ruff check .
..\.venv\Scripts\python.exe -m ruff format --check .
```

Tes memeriksa login, penilaian, prasyarat, submit berulang/bersamaan, kepemilikan sesi, pemisahan mitra, dan persistensi progres. Ruff belum dijalankan pada lingkungan lokal ini. TestClient mengeluarkan peringatan deprecation HTTPX dari Starlette; 15 tes tetap lulus.
