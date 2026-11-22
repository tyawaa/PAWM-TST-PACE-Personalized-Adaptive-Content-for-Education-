# Kontrak API PACE 0.1.0

Base URL lokal tanpa Docker: `http://localhost:8000/api`. Dengan Docker: `http://127.0.0.1:8080/api`. URL HTTPS publik belum ditetapkan. JSON request memakai `Content-Type: application/json`. Swagger tersedia di `/docs` dan kontrak mesin di `/openapi.json`, keduanya di luar prefix `/api`.

## Akun aplikasi

Register:

```http
POST /api/auth/register
Content-Type: application/json

{"username":"siswa_uji","name":"Siswa Uji","password":"contoh-uji-123"}
```

Login:

```http
POST /api/auth/login
Content-Type: application/json

{"username":"siswa_uji","password":"contoh-uji-123"}
```

Password di atas hanya contoh format request, bukan kredensial akun yang telah dibuat. Username harus 3-40 karakter huruf kecil, angka, atau underscore; password 8-128 karakter. Respons sukses register (201) dan login (200):

```json
{
  "access_token": "<JWT-dari-server>",
  "token_type": "bearer",
  "expires_in": 3600,
  "user": {"id":"<uuid>","username":"siswa_uji","name":"Siswa Uji"}
}
```

Pada Swagger, tekan **Authorize**, lalu masukkan JWT pada skema HTTPBearer. Endpoint berikutnya memakai `Authorization: Bearer <JWT>`. Password dan hash tidak dikembalikan ke klien. Buat akun uji `siswa_demo` melalui endpoint register dengan password yang ditentukan sendiri.

## Katalog

`GET /api/concepts` menghasilkan `{ "items": [...] }`. Setiap konsep memiliki `id`, `title`, `topic`, `skill`, `grade`, `prerequisite_id`, dan `position`. Filter opsional: `?topic=daily-routines`. Topik tidak ditemukan menghasilkan daftar kosong. Tidak ada data kunci jawaban dalam katalog.

`GET /api/concepts/daily-vocabulary/materials` menghasilkan daftar materi dengan `id`, `concept_id`, `title`, `content`, `version`, `source`, `license`, dan `reviewed`. Materi demo ditandai belum ditinjau guru.

## Membuat sesi asesmen

```http
POST /api/assessments
Authorization: Bearer <JWT>
Content-Type: application/json

{"concept_id":"daily-vocabulary"}
```

Contoh bentuk respons 201 (daftar soal disingkat):

```json
{
  "id":"<assessment-uuid>",
  "concept_id":"daily-vocabulary",
  "created_at":"<waktu-UTC-ISO8601>",
  "status":"in_progress",
  "rule_version":"prototype-v1",
  "questions":[
    {"id":"daily-vocabulary-q1","prompt":"Apa arti 'wake up'?",
     "options":["Bangun tidur","Membaca","Berlari","Tidur"],"version":1}
  ],
  "result":null
}
```

Sesi seed demo sebenarnya memuat lima soal. Simpan ID sesi dan daftar soal dari server; jangan membuat ID sesi sendiri di aplikasi. Sesi hanya dapat dibaca oleh pemiliknya melalui `GET /api/assessments/{id}`. Indeks pilihan dimulai dari nol. Kunci jawaban disimpan pada snapshot server dan tidak dikirim sebelum submit.

## Mengirim jawaban

```http
POST /api/assessments/<assessment-uuid>/submit
Authorization: Bearer <JWT>
Content-Type: application/json

{
  "answers":[
    {"question_id":"daily-vocabulary-q1","selected_index":0},
    {"question_id":"daily-vocabulary-q2","selected_index":1},
    {"question_id":"daily-vocabulary-q3","selected_index":2},
    {"question_id":"daily-vocabulary-q4","selected_index":3},
    {"question_id":"daily-vocabulary-q5","selected_index":1}
  ]
}
```

Jawaban contoh menghasilkan 4/5 benar atau skor 80 pada seed v1. Respons 200 berisi `assessment_id`, `concept_id`, `correct`, `total`, `score`, `status`, `rule_version`, `submitted_at`, dan `feedback` per soal. `feedback` memuat penanda benar/salah serta penjelasan.

Semua soal sesi harus dijawab tepat sekali; jumlah soal minimal lima. Jawaban tidak dikenal, pilihan di luar rentang, boolean sebagai indeks, dan soal duplikat ditolak. Submit yang sama boleh diulang setelah timeout; hasil tidak dihitung dua kali. Perubahan jawaban pada sesi yang sudah selesai menghasilkan 409. Sesi baru diperlukan untuk mencoba kembali.

Snapshot versi soal dan aturan penilaian dipakai untuk sesi tersebut walaupun bank soal kemudian berubah. Sinkronisasi sesi lama tidak menimpa progres dari sesi yang dibuat lebih baru. Aplikasi harus menampilkan respons sesi sebagai hasil sesi, lalu mengambil ulang `/progress` untuk status penguasaan terkini.

## Progres dan rekomendasi

`GET /api/progress` menghasilkan item per konsep dengan `concept_id`, `title`, `status`, `score`, `assessment_id`, `updated_at`, dan `missing_prerequisites`.

| Status | Makna |
| --- | --- |
| `not_assessed` | Belum memiliki bukti asesmen |
| `needs_practice` | Skor sesi relevan terbaru kurang dari 80 |
| `mastered` | Skor sesi relevan terbaru minimal 80 |

`GET /api/recommendations` menghasilkan `rule_version`, `all_mastered`, dan `items`. Maksimal satu rekomendasi diberikan pada prototipe ini. Item memuat konsep, judul, `action` (`practice` atau `initial_assessment`), alasan, dan `materials_path`. Jika katalog kosong atau tidak ada konsep yang memenuhi syarat, `items` kosong. `all_mastered` hanya true jika katalog berisi konsep dan semuanya dikuasai.

## Akses kelompok lain

Kelompok penyedia mengisi satu API key unik per mitra pada `PARTNER_API_KEYS` di `.env`, mengikuti [README](../README.md#akses-kelompok-lain). ID mitra berasal dari konfigurasi server, bukan body request. Restart proses/kontainer core setelah perubahan. Key diserahkan melalui kanal privat dan dipakai pada layanan integrasi server-ke-server; jangan disematkan di bundle Expo.

```http
POST /api/partner/learners/student-001/assessments
X-API-Key: <key-khusus-kelompok>
Content-Type: application/json

{"concept_id":"daily-vocabulary"}
```

Respons memiliki format yang sama dengan sesi siswa aplikasi. Submit ke:

`POST /api/partner/learners/student-001/assessments/{id}/submit`

Ambil progres dan rekomendasi pada:

- `GET /api/partner/learners/student-001/progress`
- `GET /api/partner/learners/student-001/recommendations`

`learner_ref` adalah ID samaran, 1-80 karakter huruf, angka, underscore, atau tanda minus. Jangan gunakan nama lengkap atau data pribadi siswa. Referensi sama dari dua kelompok menghasilkan identitas internal berbeda; kelompok tidak dapat mengambil sesi atau progres milik kelompok lain. Referensi baru otomatis dibuat ketika pertama dipakai.

Untuk mencabut key, hapus pasangan ID/key dari `.env` lalu buat ulang proses/kontainer core. Untuk rotasi, ganti nilai key dengan key acak baru pada ID mitra yang sama, lalu restart proses/kontainer core. Progres tetap terhubung ke ID mitra; mengganti ID membuat identitas mitra baru.

## Respons gagal

| Status | Kondisi |
| --- | --- |
| 401 | Login gagal, JWT salah/kedaluwarsa, atau API key tidak valid |
| 404 | Konsep tidak ditemukan atau sesi tidak dimiliki pemanggil |
| 409 | Username duplikat, prasyarat belum terpenuhi, soal belum cukup, atau jawaban sesi selesai diubah |
| 422 | Format request tidak sesuai kontrak |
| 429 | Batas request gateway terlampaui |
| 503 | Penyimpanan sementara tidak tersedia atau prasyarat tidak konsisten |

Error aplikasi umumnya berbentuk `{ "detail": "pesan" }`. Validasi memakai `detail` berupa array berisi `loc`, `msg`, dan `type`. Prasyarat memakai `detail` berupa objek berisi `message` dan `missing_prerequisites`. Error gateway atau tunnel dapat berupa HTML; klien harus memeriksa status dan content-type sebelum parsing JSON.

