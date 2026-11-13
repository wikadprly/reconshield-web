# Serah-Terima Bagian MikroTik

> **Tanggal:** 12 November 2026 (diperbarui: write path A4)
> **Branch kerja:** `gabungan-main-mikrotik` (di repo `reconshield-web`)
> **Status web:** write path tarpit (A4) sudah diimplementasikan end-to-end — guardrail,
> tulis address-list RouterOS, simpan `tarpit_entries` + audit. Masih digerbangi
> `RECONSHIELD_ENABLE_ROUTER_WRITES` dan menunggu uji nyata di hAP lite.

Dokumen ini menjelaskan **apa yang sudah disiapkan di sisi web** dan **apa yang masih harus dikerjakan di sisi MikroTik**.

---

## 1. Penting: jangan pull `dengan-mikrotik` mentah

Branch `origin/dengan-mikrotik` (commit `8c816fb`) **tidak boleh di-merge langsung**. Alasannya:

| Masalah | Detail |
|---|---|
| Masih PostgreSQL | `@prisma/adapter-pg`, `pg`, `?schema=public`; web sekarang MySQL 8.4 |
| Menghapus relasi | `onDelete: SetNull` / `Cascade` pada `TarpitEntry` dan `Approval` hilang |
| Package manager campur | ada `package-lock.json` padahal proyek pakai pnpm |
| File berbahaya | `check_simple.js` berisi kredensial `postgres` / `123` |
| Fitur kita hilang | evidence, approval center, policy DB, audit action/target, status tarpit |

Bagian yang **sudah diambil selektif** ke `gabungan-main-mikrotik`:

- `node-routeros` (API biner, port 8728) → `src/services/mikrotik-binary-service.ts`
- `RouterSample` + migration `20261112123759_router_samples`
- `/api/system`, `/api/system/history`, `router-history-chart.tsx`
- Health check RouterOS (`/system/resource`) di `/api/health`

---

## 2. Yang sudah tersedia di web

| Fungsi | Lokasi | Butuh router? |
|---|---|---|
| Baca address-list (biner) | `mikrotik-binary-service.ts::listTarpitAddressListBinary` | Ya |
| Baca `/system/resource` | `mikrotik-binary-service.ts::getSystemResourceBinary` | Ya |
| Baca address-list (REST) | `mikrotik-service.ts::listTarpitAddressList` | Ya |
| Tambah IP ke tarpit (REST) | `mikrotik-service.ts::addTarpitAddress` | Ya + gerbang |
| Hapus IP dari tarpit (REST) | `mikrotik-service.ts::removeTarpitAddress` | Ya + gerbang |
| Terapkan tarpit untuk insiden (guardrail → router → DB + audit) | `security-service.ts::applyTarpitForDetection`, `POST /api/tarpit` | Ya + gerbang |
| Approve di Pusat Persetujuan (mengeksekusi tarpit) | `PATCH /api/approvals/{id}` | Ya + gerbang |
| Release (hapus address-list + status DB + audit) | `DELETE /api/tarpit/{ip}` | Ya + gerbang |
| Verify DB vs router | `POST /api/tarpit/{ip}` | Ya (baca) |

**Gerbang tulis:** `RECONSHIELD_ENABLE_ROUTER_WRITES=true`. Default `false`. Tanpa itu, fungsi tulis langsung mengembalikan "Write path dinonaktifkan" dan **tidak menyentuh router**; entri tetap dicatat di DB sebagai `Pending` dengan alasan jujur.

**Rate-limit tulis:** `RECONSHIELD_MAX_ROUTER_WRITES_PER_MINUTE` (default 5, maksimum 30) membatasi jumlah tulis address-list per menit; permintaan di atas batas ditolak dengan sisa waktu tunggu.

---

## 3. Langkah kerja untuk bagian MikroTik

### Langkah 0 — Siapkan lingkungan

```powershell
# 1. MySQL harus hidup (Laragon), cek port 3306
Test-NetConnection -ComputerName 127.0.0.1 -Port 3306 -InformationLevel Quiet

# 2. Ambil branch kerja
git fetch origin
git checkout gabungan-main-mikrotik

# 3. Install & siapkan DB
corepack pnpm install
corepack pnpm db:generate
corepack pnpm db:migrate
corepack pnpm db:seed
```

### Langkah 1 — Isi `.env` (jangan di-commit)

```env
MIKROTIK_API_URL="10.10.30.1"
MIKROTIK_USERNAME="admin"
MIKROTIK_PASSWORD="<password router>"

# Biarkan false selama tahap baca/uji
RECONSHIELD_ENABLE_ROUTER_WRITES="false"
```

`MIKROTIK_API_URL` boleh berupa host saja (`10.10.30.1`) atau URL (`http://10.10.30.1`). Untuk API biner, host akan diambil otomatis.

### Langkah 2 — Uji baca (belum menulis apa pun)

```powershell
corepack pnpm dev
```

Lalu buka / panggil:

- `GET /api/health` → `routerOs.configured: true`, `reachable: true`, ada `latencyMs`
- `GET /api/system` → `boardName`, `routerOsVersion` (harus `6.48.6`), CPU, RAM, uptime
- `GET /api/system/history` → daftar sampel CPU/memori
- `POST /api/tarpit/10.10.24.118` → verifikasi IP ada/tidak di address-list

Kalau `reachable` masih `false`: cek IP router, service `www`/API di RouterOS, user/password, dan firewall yang memblokir port 8728.

### Langkah 3 — Pastikan rule tarpit ada di router

Di RouterOS, address-list saja tidak cukup. Harus ada rule firewall yang benar-benar menerapkan `action=tarpit` untuk list tersebut, contoh:

```rsc
/ip firewall filter
add chain=forward action=tarpit src-address-list=reconshield-tarpit-active \
    comment="ReconShield dynamic tarpit"
```

Sesuaikan `chain` dengan topologi lab (forward untuk trafik melewati router, input untuk trafik ke router).

Rujukan desain: `../docs/keputusan-a20-tarpit.md` (di root repo TA).

### Langkah 4 — Uji tulis (setelah Langkah 2–3 berhasil)

Ubah `.env`:

```env
RECONSHIELD_ENABLE_ROUTER_WRITES="true"
```

Lalu uji **satu IP** dulu, jangan banyak:

1. Dari web, tekan **Mitigasi** pada satu insiden reconnaissance di Log Ancaman (memanggil
   `POST /api/tarpit`), atau setujui satu item di Pusat Persetujuan.
2. Cek di RouterOS: `/ip firewall address-list print where list=reconshield-tarpit-active`
3. Cek di web: `POST /api/tarpit/{ip}` → harus `present: true`
4. Tekan **Lepas** di halaman Tarpit Aktif (memanggil `DELETE /api/tarpit/{ip}`), lalu verifikasi
   lagi → `present: false`
5. **Kembalikan** `RECONSHIELD_ENABLE_ROUTER_WRITES="false"` setelah uji

### Langkah 5 — Uji black-box (BB-N, bagian laporan)

1. Jalankan Nmap dari Kali: `nmap -sS -p 1-1000 10.10.20.254`
2. Pastikan pipeline menulis `detections` (lihat `INC-xxxx` baru di web)
3. Aktifkan tarpit untuk IP penyerang
4. Ulangi scan → catat apakah koneksi menggantung / laju turun
5. Catat CPU/RAM router dari `/api/system` selama uji (bukti guardrail)

### Langkah 6 — A9: pengukuran efektivitas

Yang perlu dicatat minimal:

| Metrik | Cara ukur |
|---|---|
| Waktu scan sebelum tarpit | `nmap` dengan timing normal, catat durasi |
| Waktu scan sesudah tarpit | ulangi skenario sama |
| Jumlah koneksi menggantung | `nmap` output + conntrack router |
| CPU/RAM router | `/api/system` sebelum, saat, sesudah |
| Jumlah entry aktif | halaman Tarpit Aktif |

---

## 4. Yang TIDAK perlu dikerjakan di bagian MikroTik

- Kebijakan mitigasi, audit, approval center, evidence, laporan PDF — sudah selesai di web.
- Migrasi database — sudah MySQL 8.4.
- Auth — **batasan TA**, lihat bagian 5.

---

## 5. Batasan yang harus ditulis di laporan

- **Autentikasi/otorisasi di luar lingkup.** Sistem diasumsikan berjalan pada jaringan lokal tertutup. API tulis tidak punya kontrol identitas; audit mencatat aktor `admin lokal`.
- **Write path default mati.** `RECONSHIELD_ENABLE_ROUTER_WRITES=false`; harus diaktifkan eksplisit dan hanya untuk uji lab.
- **Selisih testbed (A19).** Proposal menyebut RouterOS v7 + CHR; lab memakai hAP lite + RouterOS 6.48.6.
- **Tarpit bukan pembakar CPU.** Klaim yang aman: menurunkan laju dan efisiensi reconnaissance.
- **Bukti klasifikasi, bukan alasan native.** Snapshot 16 fitur + confidence + versi model/policy; bukan penjelasan internal Random Forest.

---

## 6. Definition of done bagian MikroTik

- [ ] `/api/health` menunjukkan `routerOs.reachable: true`
- [ ] `/api/system` mengembalikan data nyata hAP lite (bukan "Tidak terhubung")
- [ ] Rule `action=tarpit` terpasang dan terbukti menjerat
- [ ] Tambah + hapus IP berhasil, terverifikasi lewat `POST /api/tarpit/{ip}`
- [ ] Gerbang tulis dikembalikan ke `false` setelah uji
- [ ] BB-N (Nmap/Hping3) terdokumentasi dengan hasil
- [ ] Angka A9 (sebelum/sesudah, CPU/RAM) tercatat
- [ ] Catatan A19 ditulis di laporan
