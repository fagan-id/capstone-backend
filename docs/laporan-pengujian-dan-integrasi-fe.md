# Laporan Pengujian API & Panduan Integrasi Frontend (FE)
**Sistem Skrining ABK (Capstone Project)**  
*Tanggal Pengujian: 9 November 2026*  
*Hasil Pengujian: **76 / 76 Tests PASSED (100% Success)** | Durasi: ~2.3 detik*

---

## 1. Ringkasan Eksekutif

Seluruh modul backend telah diuji melalui automated integration dan unit test (`npm test`). Semua 76 skenario uji berhasil lulus tanpa kendala. 

Fitur **Autentikasi Multi-Role** (Super Admin & Sekolah) telah siap secara penuh untuk diintegrasikan dengan aplikasi Frontend (Web/Mobile) dengan dukungan ganda:
1. **Bearer Token (JWT)** di header `Authorization`.
2. **HTTP-only Cookie (`token`)** otomatis untuk perlindungan keamanan terhadap serangan XSS.

---

## 2. Panduan Integrasi Fitur Autentikasi (Frontend)

Prefix URL dasar:  
`http://localhost:5000/api/auth` *(sesuaikan dengan `VITE_API_URL` atau konfigurasi environment FE Anda)*

### A. Endpoint Login Pengguna (`POST /api/auth/login`)

Endpoint ini menangani autentikasi untuk **dua jenis role sekaligus**:
- **Super Admin**: Dapat login menggunakan Email atau Nama/Username.
- **Sekolah**: Dapat login menggunakan Email atau Username (NPSN/kode akun sekolah).

#### Request Header:
```http
Content-Type: application/json
```

#### Request Body:
```json
{
  "identifier": "admin@skriningabk.id",
  "password": "Password123!"
}
```
> [!NOTE]  
> Input field bernama `identifier` (bukan `email` atau `username`), agar form input di Frontend cukup satu kolom yang fleksibel menerima email maupun username.

#### Response Berhasil — Role Super Admin (`200 OK`):
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Login berhasil.",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "role": "SUPER_ADMIN",
    "redirectTo": "/admin/dashboard",
    "user": {
      "id": 1,
      "nama": "Super Admin Demo",
      "username": "superadmin",
      "email": "admin@skriningabk.id"
    }
  }
}
```

#### Response Berhasil — Role Sekolah (`200 OK`):
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Login berhasil.",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "role": "SEKOLAH",
    "redirectTo": "/sekolah/dashboard",
    "user": {
      "id": 5,
      "schoolName": "SD Demo",
      "nama": "SD Demo",
      "email": "sekolah@demo.test",
      "alamat": "Jl. Contoh No. 1",
      "kontakTelepon": "0274-000001",
      "kontak_telepon": "0274-000001"
    }
  }
}
```

#### Skenario Penanganan Error di Frontend:
| Status Code | Error Message | Penyebab & Tindakan FE |
| :--- | :--- | :--- |
| `400 Bad Request` | `Identifier dan password wajib diisi.` | Validasi form kosong di FE sebelum submit. |
| `401 Unauthorized` | `Kredensial tidak valid.` | Email/Username tidak ditemukan atau password salah. Tampilkan alert merah ke pengguna. |
| `403 Forbidden` | `Akun sekolah dinonaktifkan. Silakan hubungi Super Admin.` | Akun sekolah dinonaktifkan (`aktif: false`). Tampilkan pesan hubungi Super Admin. |

---

### B. Endpoint Cek Sesi Pengguna Aktif (`GET /api/auth/me`)

Digunakan pada saat aplikasi FE pertama kali dimuat (*app mount / layout check*) untuk menjaga sesi pengguna agar tidak *logout* saat halaman di-refresh.

#### Request Header:
```http
Authorization: Bearer <token_dari_localStorage_atau_state>
```
*(Atau jika menggunakan cookie, pastikan fetch/axios mengirim `credentials: "include"` / `withCredentials: true`)*.

#### Response Berhasil (`200 OK`):
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Data profil berhasil diambil.",
  "data": {
    "role": "SUPER_ADMIN",
    "user": {
      "id": 1,
      "nama": "Super Admin Demo",
      "username": "superadmin",
      "email": "admin@skriningabk.id",
      "createdAt": "2026-11-09T10:00:00.000Z",
      "updatedAt": "2026-11-09T10:00:00.000Z"
    }
  }
}
```

#### Skenario Error (`401 Unauthorized`):
Jika token telah kedaluwarsa atau tidak valid:
```json
{
  "success": false,
  "statusCode": 401,
  "message": "Sesi telah kedaluwarsa. Silakan login kembali."
}
```
*Tindakan FE*: Hapus data state auth dan redirect pengguna ke halaman `/login`.

---

### C. Endpoint Logout (`POST /api/auth/logout`)

Menghapus cookie sesi `token` di browser dan membersihkan sesi.

#### Response Berhasil (`200 OK`):
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Logout berhasil. Sesi telah diakhiri."
}
```
*Tindakan FE*: Hapus token di `localStorage` / state manager (Redux/Zustand), lalu redirect ke `/login`.

---

## 3. Contoh Implementasi di Frontend (Axios / Fetch)

### Menggunakan Axios dengan Interceptor
```typescript
import axios from "axios";

export const api = axios.create({
  baseURL: "http://localhost:5000/api",
  withCredentials: true // Wajib agar HTTP-only cookie terbawa
});

// Otomatis pasang Bearer token jika disimpan di localStorage
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handler saat token kedaluwarsa (401)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("token");
      if (window.location.pathname !== "/login") {
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  }
);
```

### Handler Form Login di Frontend
```typescript
async function handleLogin(identifier: string, password: string) {
  try {
    const res = await api.post("/auth/login", { identifier, password });
    const { token, role, redirectTo, user } = res.data.data;

    // Simpan token & role
    localStorage.setItem("token", token);
    localStorage.setItem("role", role);

    // Redirect otomatis sesuai respon backend
    window.location.href = redirectTo; // misal: "/admin/dashboard" atau "/sekolah/dashboard"
  } catch (err: any) {
    const errorMsg = err.response?.data?.message || "Terjadi kesalahan saat login.";
    alert(errorMsg);
  }
}
```

---

## 4. Rekapitulasi Hasil Pengujian Backend (76 Tests)

| Kategori Pengujian | File Test | Jumlah Kasus | Status | Keterangan |
| :--- | :--- | :---: | :---: | :--- |
| **Autentikasi Unit** | `tests/auth.test.js` | 13 | ✅ Pass | Validasi form, login Super Admin & Sekolah, penolakan password salah, proteksi akun nonaktif (403), logout, middleware JWT & role guard. |
| **Autentikasi Integrasi** | `tests/authIntegration.test.js` | 2 | ✅ Pass | Full flow: Login -> Simpan Token -> Akses `/me` -> Logout, serta penolakan akun sekolah nonaktif. |
| **Server & Health Check** | `tests/app.test.js` | 4 | ✅ Pass | Status 200 saat DB sehat, 503 saat DB putus, penanganan 404 URL acak, dan proteksi malformed JSON body (400). |
| **Validasi Konfigurasi** | `tests/config.test.js` | 5 | ✅ Pass | Validasi DB host, port, encoding karakter password khusus, dan CORS origin. |
| **Centralized Error** | `tests/errorHandler.test.js` & `tests/appError.test.js` | 7 | ✅ Pass | Standardisasi respon error operasional (400, 401, 403, 404, 500) dan masking stack trace di mode production. |
| **Algoritma Skrining DSM-5** | `tests/penilaianSkrining.test.js` | 7 | ✅ Pass | Perhitungan ambang batas domain level 1 & level 2, skor skala Likert & opsi Ya/Tidak/Tidak Tahu. |
| **Validasi Input Publik** | `tests/skriningPublikValidator.test.js` | 12 | ✅ Pass | Validasi kode sesi, token UUID, nomor HP responden, hubungan wali, dan validasi tipe ID angka. |
| **Alur Skrining Publik** | `tests/skriningPublikRoutes.test.js` | 13 | ✅ Pass | Validasi sesi, pencarian siswa, autosave pengerjaan kuesioner, submit level 1, hingga instrumen lanjutan level 2. |
| **Integritas Seed Data** | `tests/seedData.test.js` | 13 | ✅ Pass | Keamanan password seed (bcrypt), penolakan environment production, integritas relasi kategori & pertanyaan. |
| **TOTAL** | **10 File Uji** | **76** | **100% Pass** | **Semua fitur siap diintegrasikan.** |

---

## 5. Akun Uji Coba Default untuk Tim Frontend (Demo Seed)

Untuk menguji langsung di antarmuka frontend, data seed demo dapat digunakan dengan akun berikut:

- **Super Admin**:
  - `identifier`: `superadmin@demo.test` atau `superadmin`
  - `password`: *(sesuai nilai `SEED_PASSWORD` yang Anda pasang di `.env`)*
  - Role: `SUPER_ADMIN`
- **Sekolah**:
  - `identifier`: `sekolah@demo.test` atau `sd_demo`
  - `password`: *(sesuai nilai `SEED_PASSWORD` yang Anda pasang di `.env`)*
  - Role: `SEKOLAH`
