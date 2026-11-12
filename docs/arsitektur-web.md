# Arsitektur & Perkembangan Web ReconShield

> **Terakhir diperbarui:** 12 November 2026
> **Tujuan dokumen:** menjadi patokan tunggal untuk pengerjaan web — apa yang sudah ada, dari mana asalnya di proposal, dan bagaimana web terhubung ke `reconshield-ml` serta MikroTik.

---

## 1. Ringkasan dalam satu paragraf

Web ReconShield adalah **dashboard admin** untuk insiden reconnaissance. Ia **tidak** melakukan inferensi sendiri: klasifikasi datang dari pipeline Python (`reconshield-ml`), hasilnya dibaca web dari database MySQL, lalu admin memutuskan mitigasi (otomatis/manual). Eksekusi ke router **belum** menjadi tanggung jawab web sepenuhnya: web menyiapkan state, guardrail, dan audit; perangkat MikroTik diuji terpisah.

```
MikroTik (NetFlow)  →  reconshield-ml (RF)  →  MySQL  →  reconshield-web  →  Admin
                                                     ↑                         ↓
                                                     └── audit / policy ────────┘
         (masa depan)  web ── gate ──→ RouterOS API ──→ address-list / action=tarpit
```

---

## 2. Peta proposal → web

| Butir proposal (§6.2) | Wujud di web | Status |
|---|---|---|
| 7–8. Generate aturan Dynamic Tarpit + RouterOS REST | `mikrotik-service.ts`, gerbang `RECONSHIELD_ENABLE_ROUTER_WRITES` | Kode siap, uji perangkat belum |
| 9. Catat log insiden ke database | `detections`, `evidence`, `audit_entries` | Selesai |
| 10. Web dashboard monitoring | `/dashboard`, `/threat-logs`, `/active-tarpit`, `/approvals`, `/ml-performance`, `/settings` | Selesai (belum realtime) |
| 11. Visualisasi log intervensi & alert | tabel insiden, audit, notifikasi topbar (dari DB) | Selesai |
| 12. Efektivitas tarpit | belum — butuh instrumen A9 | Belum (bagian MikroTik) |
| 14. Database MySQL | MySQL 8.4 + Prisma 7 (`@prisma/adapter-mariadb`) | Selesai |

---

## 3. Lapisan aplikasi

| Lapisan | Lokasi | Tanggung jawab |
|---|---|---|
| Halaman (App Router) | `src/app/(console)/*` | Server Component tipis, hanya merangkai view |
| View (client) | `src/components/*-view.tsx` | Interaksi admin, state formulir, modal |
| API route | `src/app/api/**/route.ts` | Batas HTTP; validasi input, panggil service |
| Service | `src/services/security-service.ts` | Orkestrasi sumber data + kebijakan fallback |
| Repository | `src/db/repositories/*.repo.ts` | Satu-satunya tempat query Prisma |
| Database | `prisma/schema.prisma` | Kontrak data; migration di `prisma/migrations/` |

**Aturan penting:** view tidak boleh memanggil Prisma. Repository tidak boleh tahu HTTP. Service tidak boleh memformat tampilan.

### Endpoint

| Endpoint | Fungsi |
|---|---|
| `GET /api/overview` | Agregat dashboard + deteksi/tarpit/layanan |
| `GET /api/traffic?range=1h|24h|7d` | Deret waktu deteksi dari DB |
| `GET /api/detections` | Daftar insiden |
| `GET /api/evidence/[detectionId]` | Snapshot bukti klasifikasi |
| `GET/PUT /api/settings` | Kebijakan mitigasi (baca/ubah + audit) |
| `GET/POST /api/approvals` | Daftar/buat permintaan persetujuan |
| `PATCH /api/approvals/[id]` | Setujui/tolak + audit |
| `GET /api/tarpit` | Daftar tarpit |
| `DELETE /api/tarpit/[ip]` | Release (DB + audit) |
| `POST /api/tarpit/[ip]` | Verifikasi terhadap address-list |
| `GET /api/system`, `/api/system/history` | Resource router + riwayat CPU/memori |
| `GET /api/health` | configured + reachable + latency |
| `GET /api/reports/incidents?period=7d` | Laporan PDF (pdfkit) |

---

## 4. Model data

| Model | Isi | Catatan |
|---|---|---|
| `Detection` | insiden hasil klasifikasi | ditulis oleh pipeline ML |
| `Evidence` | 16 fitur + confidence + versi model/policy + arah flow | 1:1 dengan Detection |
| `TarpitEntry` | IP, durasi, `expiresAt`, status | status: Pending/Active/Released/Expired/Verified |
| `Approval` | permintaan persetujuan mode manual | status: pending/approved/rejected/cancelled |
| `AuditEntry` | jejak tindakan admin | `action` + `target` + `reason` |
| `MitigationSetting` | satu baris kebijakan | berbatas, bukan optimasi |
| `RouterSample` | sampel CPU/memori router | retensi 6 jam |
| `ModelEvaluation`, `FeatureImportance` | metrik model | ditulis `sync_metrics_db.py` |
| `ServiceStatus`, `User` | status layanan, akun | `User` belum dipakai (auth ditunda) |

---

## 5. Hubungan dengan `reconshield-ml`

**Arah data: ML → database → web.** Web tidak memanggil model.

| Hal | Detail |
|---|---|
| Transport | MySQL langsung; Python memakai PyMySQL (`config.connect_database`) |
| Lokasi kode | `reconshield-ml/pipeline/detect.py` menulis `detections` |
| ID insiden | `INC-####` dialokasikan dengan `GET_LOCK` (aman multi-writer) |
| Metrik | `training/sync_metrics_db.py` menulis `model_evaluations` + `feature_importances` |
| Opsional | `PYTHON_ML_API_URL` dipakai web hanya untuk membaca `/model/metrics` bila DB kosong |
| Bukti klasifikasi | Python **belum** menulis `evidence`; saat ini evidence diisi dari seed. Ini titik integrasi berikutnya |

**Yang perlu disepakati dengan bagian ML:** siapa yang menulis `evidence` (pipeline atau web), dan dari mana `policyVersion` diambil.

---

## 6. Hubungan dengan MikroTik

**Web adalah satu-satunya pemegang kredensial router.** Kredensial tidak pernah ke browser.

| Fungsi | Transport | Status |
|---|---|---|
| Baca address-list | API biner 8728 (`node-routeros`) | Ada, belum diuji perangkat |
| Baca `/system/resource` | API biner 8728 | Ada, dipakai health check |
| Tambah/hapus address-list | REST | Ada, **digerbangi** `RECONSHIELD_ENABLE_ROUTER_WRITES` |

**Pemisahan tanggung jawab:**

- **Web**: kebijakan, audit, bukti, approval, status DB, laporan.
- **Bagian MikroTik**: rule `action=tarpit`, uji nyata tambah/hapus, BB-N, A9.

**Sumber kebenaran:** status mitigasi di **database**; router adalah objek verifikasi. Jangan menampilkan isi router sebagai kebenaran tunggal, karena kegagalan baca router bukan berarti tidak ada mitigasi.

Panduan langkah demi langkah: `docs/handoff-mikrotik.md`.

---

## 7. Batasan yang disepakati

1. **Auth di luar lingkup.** Jaringan lokal tertutup; aktor audit `admin lokal`; `administratorId` nullable. Opsi token admin disiapkan bila pembimbing meminta.
2. **Write path default mati.** Harus diaktifkan eksplisit dan hanya untuk uji lab.
3. **Bukan optimasi otomatis.** Kebijakan berbatas: ambang 60–99, durasi 15/60/240/360 menit, maksimum ≤720 menit, entry 10–100.
4. **Bukti, bukan alasan native.** Evidence = snapshot fitur + confidence + versi; bukan penjelasan internal Random Forest.
5. **Tarpit bukan pembakar CPU.** Klaim aman: menurunkan laju dan efisiensi reconnaissance.
6. **Selisih testbed (A19).** Proposal: CHR + RouterOS v7; lab: hAP lite + 6.48.6.
7. **Belum realtime.** Data dibaca saat render/refetch; belum polling/SSE.

---

## 8. Alur kerja yang disarankan

1. Admin membuka dashboard → angka dari agregat DB (`scoped:false` bila dari DB).
2. Insiden masuk dari pipeline ML → tampil di Log Ancaman.
3. Admin membuka detail → melihat **bukti klasifikasi** 16 fitur.
4. Mode Manual → insiden masuk **Pusat Persetujuan** → admin setujui/tolak (audit).
5. Mitigasi aktif → tampil di Tarpit Aktif beserta `expiresAt`.
6. Admin dapat **Verifikasi** (cocokkan dengan router) dan **Lepas** (status DB + audit).
7. Laporan PDF diunduh untuk lampiran/bimbingan.

---

## 9. Pengembangan berikutnya (urut)

| Prioritas | Item | Pemilik |
|---|---|---|
| 1 | Uji `action=tarpit` + gerbang write | bagian MikroTik |
| 2 | BB-N (Nmap/Hping3) + A9 (angka efektivitas) | bagian MikroTik |
| 3 | Pipeline ML menulis `evidence` | ML/web bersama |
| 4 | Test web (Vitest) untuk policy/validasi | web |
| 5 | Realtime (polling/SSE) + alert | web |
| 6 | Auth/token admin (opsional, setelah bimbingan) | web |

---

## 10. Perintah harian

```powershell
# MySQL harus hidup (Laragon)
corepack pnpm dev
corepack pnpm lint      # tsc --noEmit
corepack pnpm test      # vitest run (25 test: policy, validasi, label, format)
corepack pnpm build
corepack pnpm db:generate
corepack pnpm db:migrate
corepack pnpm db:seed
```
