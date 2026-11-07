# MedNexus Agent AI

Aplikasi web kesehatan klinis berbasis multi-agen otonom untuk analisis rekam medis (EHR), diagnostik kecerdasan buatan (Gemini AI), alur bisnis klinik, dan pembayaran langganan melalui PayPal.

Proyek ini telah dikonfigurasi secara lengkap untuk deployment langsung di [Netlify](https://www.netlify.com/) menggunakan arsitektur serverless functions.

---

## 📁 Struktur Direktori & File

```
MedNexus-Agent-AI/
├── Frontend/
│   ├── index.html                  # Halaman utama aplikasi (UI, Dashboard, History, Pricing)
│   ├── app.js                      # Orkestrasi navigasi tab dan event DOM
│   ├── api.js                      # Client API terpusat untuk komunikasi dengan Netlify Functions
│   ├── auth.js                     # Manajemen autentikasi (login, register, token, session)
│   ├── dashboard.js                # Logika analisis klinis, biomarker, dan history
│   ├── paypal.js                   # Integrasi pembayaran dan checkout PayPal
│   └── styles.css                  # Desain visual modern healthcare, glassmorphism, responsive
│
├── Backend Netlify/
│   └── netlify/functions/
│       ├── register.js             # Pendaftaran pengguna baru & pembuatan JWT
│       ├── login.js                # Verifikasi login & penerbitan token
│       ├── me.js                   # Pengambilan data profil & status kredit user
│       ├── analyze.js              # Endpoint analisis klinis EHR & penentuan tingkat keparahan
│       ├── history.js              # Riwayat audit dan pencarian rekam medis pasien
│       ├── data.js                 # Dataset referensi klinis, sampel kasus, dan paket harga
│       ├── gemini.js               # Integrasi model AI Gemini dengan fallback klinis
│       ├── paypal-create-order.js  # Pembuatan pesanan pembayaran PayPal REST API
│       ├── paypal-capture-order.js # Konfirmasi pembayaran & penambahan kredit AI
│       ├── paypal-order-status.js  # Pengecekan status transaksi pembayaran
│       ├── paypal-webhook.js       # Penerima notifikasi webhook asinkron dari PayPal
│       └── business-tools.js       # Kalkulator ROI klinik dan analisis efisiensi waktu dokter
│
└── Konfigurasi/
    ├── netlify.toml                # Konfigurasi build, routing redirect, dan headers Netlify
    ├── package.json                # Definisi dependensi Node.js backend
    ├── .gitignore                  # Berkas yang diabaikan dalam version control
    └── README.md                   # Dokumentasi teknis proyek
```

---

## ⚙️ Variabel Lingkungan (Environment Variables)

Untuk mengaktifkan fitur live API di Netlify, tambahkan variabel berikut di **Netlify Site Settings > Environment Variables**:

| Variable | Keterangan | Wajib / Opsional |
| :--- | :--- | :--- |
| `GEMINI_API_KEY` | API Key dari Google AI Studio untuk penalaran klinis Gemini | Opsional (Ada fallback otomatis) |
| `PAYPAL_CLIENT_ID` | Client ID dari PayPal Developer Dashboard | Opsional (Tersedia mode simulasi sandbox) |
| `PAYPAL_CLIENT_SECRET`| Client Secret dari PayPal Developer Dashboard | Opsional |
| `PAYPAL_ENV` | `sandbox` atau `production` | Default: `sandbox` |
| `JWT_SECRET` | Kunci rahasia untuk menandatangani token JWT | Opsional (Memiliki default key) |

---

## 🚀 Cara Menjalankan Secara Lokal

### 1. Menggunakan Netlify CLI (Direkomendasikan)
Menjalankan frontend sekaligus seluruh serverless functions di port 8888:
```bash
cd C:\Users\desma\.gemini\antigravity\scratch\mednexus-ai
npx netlify-cli dev
```
Akses di browser pada: `http://localhost:8888`

### 2. Membuka Frontend Langsung
Buka file `index.html` langsung di browser Anda atau gunakan local server:
```bash
npx serve .
```

---

## 🌐 Cara Deploy ke Netlify

1. Upload atau push folder ini ke repository GitHub/GitLab Anda.
2. Buka dashboard [Netlify](https://app.netlify.com/) dan pilih **Add new site > Import an existing project**.
3. Pilih repository Anda. Netlify akan secara otomatis membaca berkas `netlify.toml`:
   - **Publish directory**: `.`
   - **Functions directory**: `netlify/functions`
4. Masukkan Environment Variables jika diperlukan, lalu klik **Deploy Site**.

