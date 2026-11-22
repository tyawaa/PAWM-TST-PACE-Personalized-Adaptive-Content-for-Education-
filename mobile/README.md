# PACE Mobile

Aplikasi belajar bahasa Inggris dengan React Native dan Expo SDK 57. Kode dipisahkan menjadi components, screens, navigation, context, hooks, utils, theme, dan services.

[Dokumentasi PDF aplikasi](../docs/Dokumentasi_PWAM_PACE.pdf) memuat kerangka aplikasi, navigasi, sembilan layar, login, API PACE, dan hasil pengujian lokal.

## Status deliverable

| Bagian | Status |
| --- | --- |
| Source aplikasi | Folder mobile/ |
| Layar dan navigasi | Login, daftar, beranda, katalog, materi, latihan, hasil, progres, profil; stack dan empat tab |
| Login dan form | Username, password, dan nama divalidasi sesuai kontrak backend PACE |
| API PACE | Register, login, katalog, materi, asesmen, submit, progres, rekomendasi |
| API dua kelompok lain | Belum diintegrasikan; mitra dan kontrak belum tersedia |
| Domain API publik | Belum dikonfigurasi |
| APK | Konfigurasi EAS preview tersedia; APK belum dibangun |

Kode aplikasi menggunakan JavaScript dengan JSDoc dan pemeriksaan tipe ketat melalui TypeScript. Definisi data dan route berada di src/types.d.ts.

## Yang perlu disiapkan

- Node.js 22.18 atau lebih baru dan npm.
- Android Studio, SDK Android, dan emulator.
- Expo Go yang cocok dengan SDK 57. Expo CLI dapat memasangnya ke emulator.
- Backend PACE yang berjalan dengan data demo.
- Untuk pengumpulan: repository GitHub, URL API HTTPS aktif, akun Expo untuk EAS Build, dan akses minimal dua kelompok mitra.

Aplikasi dan build APK dijalankan dari laptop atau EAS, bukan dari STB.

## Menjalankan di emulator Android

Terminal pertama, dari folder utama repository:

```powershell
cd backend
..\.venv\Scripts\python.exe -m app.seed
..\.venv\Scripts\python.exe -m uvicorn app.main:create_app --factory --host 127.0.0.1 --port 8000
```

Terminal kedua, dari folder utama repository:

```powershell
cd mobile
npm ci
```

Jika .env belum ada, salin .env.example. Konfigurasi emulator:

```dotenv
EXPO_PUBLIC_API_URL=http://10.0.2.2:8000/api
```

Alamat 10.0.2.2 menunjuk ke localhost laptop dari emulator Android. Jalankan emulator Pixel_6 dari Android Studio Device Manager, lalu:

```powershell
npm run android
```

Gunakan Ctrl+C untuk menghentikan Metro. Setelah mengubah .env, restart dengan `npm run android -- --clear`.

Jika Android SDK tidak ditemukan, set lokasi SDK untuk terminal yang dipakai:

```powershell
$env:ANDROID_HOME = "$env:LOCALAPPDATA\Android\Sdk"
$env:Path = "$env:ANDROID_HOME\platform-tools;$env:Path"
```

Jika npm menampilkan UNABLE_TO_VERIFY_LEAF_SIGNATURE di Windows, gunakan penyimpanan sertifikat sistem:

```powershell
$env:NODE_OPTIONS = "--use-system-ca"
npm ci
```

## Akun demo lokal

Akun pada database demo lokal:

- Username: siswa_demo
- Password: BelajarPace2026!

Ini akun data contoh untuk localhost. Pada STB, buat akun uji melalui tombol Daftar atau POST /api/auth/register, kemudian bagikan kredensial uji sesuai kebutuhan penilaian. Database lokal dan STB terpisah.

Sesi disimpan di Context selama aplikasi terbuka. Setelah aplikasi ditutup atau token kedaluwarsa, pengguna perlu masuk kembali. Progres tetap tersimpan pada server.

## Alur aplikasi

1. Masuk atau daftar akun.
2. Beranda membaca rekomendasi dan ringkasan penguasaan dari API.
3. Tab Belajar menampilkan katalog dan pencarian judul lokal.
4. Materi menampilkan bacaan dari server. Latihan berprasyarat dikunci sampai prasyarat dikuasai.
5. Latihan menampilkan seluruh soal sesi, satu per satu. Pengguna dapat memeriksa jawaban sebelum submit.
6. Hasil menampilkan nilai dan penjelasan yang baru diterima setelah submit.
7. Tab Progres mengambil status terbaru dari server; tab Profil menyediakan logout.

Katalog, materi, dan soal dimuat dari API. Kunci jawaban disimpan di server. Materi seed ditandai belum ditinjau pengelola.

## ApiService.js

Semua URL dan request HTTP berada di src/services/ApiService.js. Screen tidak menyimpan URL API atau API key mitra. Fungsi yang tersedia: login, register, getConcepts, getMaterials, createAssessment, submitAssessment, getProgress, dan getRecommendations.

Respons error PACE dibaca dari detail. Request memiliki timeout 12 detik. GET dan submit yang idempotent dapat diulang sekali setelah gangguan jaringan atau HTTP 502/503/504; peringatan retry memakai field terstruktur. Register, login, dan pembuatan sesi tidak diulang otomatis.

## Memakai URL Cloudflare

Atur EXPO_PUBLIC_API_URL di .env ke URL HTTPS server dengan path /api. Pastikan endpoint /api/health dapat diakses, lalu restart Metro.

## API dua kelompok mitra

Integrasi dua kelompok mitra belum tersedia. Integrasi memerlukan base URL, kontrak endpoint, autentikasi, dan kuota dari masing-masing mitra.

Simpan key rahasia pada layanan integrasi di luar aplikasi mobile. Aplikasi mengakses API mitra melalui layanan tersebut.

## Pemeriksaan

```powershell
npm run typecheck
npm test
npm run export:android
```

Tes Jest memeriksa validasi form dan perilaku tombol. Ekspor Android memeriksa bundling; hasil ini bukan APK.

Pengujian emulator mencakup login, katalog, materi, latihan, hasil, progres, prasyarat, pencarian, dan logout menggunakan backend lokal. Pengujian domain publik dan APK belum tersedia.

Smoke test ApiService.js memakai HTTP nyata. Jalankan backend uji dengan database terpisah, dari folder backend:

```powershell
$env:DATABASE_PATH = "data/mobile-test.db"
..\.venv\Scripts\python.exe -m app.seed
..\.venv\Scripts\python.exe -m uvicorn app.main:create_app --factory --host 127.0.0.1 --port 8011
```

Terminal lain, dari mobile:

```powershell
$env:EXPO_PUBLIC_API_URL = "http://127.0.0.1:8011/api"
npm run test:api
Remove-Item Env:EXPO_PUBLIC_API_URL
```

Smoke test menolak host nonlokal dan membuat akun uji baru. Cakupannya meliputi login, katalog, materi, prasyarat, asesmen, submit bersamaan, nilai, progres, dan respons 401.

## Build APK

Atur EXPO_PUBLIC_API_URL untuk profil preview di EAS ke URL HTTPS server. Dari folder mobile:

```powershell
npx eas-cli@latest login
npx eas-cli@latest build:configure
npx eas-cli@latest build -p android --profile preview
```

Package aplikasi: id.ac.itb.s18224122.pace. Ikon, splash, version, dan versionCode dikonfigurasi di app.json. Verifikasi ikon dan splash pada APK; Expo Go memakai tampilan client-nya sendiri.

Arsip source mengecualikan node_modules, .expo, .env lokal, dan hasil build sementara.

## Rujukan

Mobile Development.pdf halaman 15–17, 71–73, 82–83, 87–92, 112–117, dan 121–127. Pola KatalogKu disesuaikan dengan kontrak PACE; backend tetap FastAPI.

Dokumentasi resmi: [template Expo](https://docs.expo.dev/more/create-expo/) dan [React Navigation](https://reactnavigation.org/docs/getting-started/).
