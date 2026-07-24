# Project SENTINEL — Panduan Lanjutan (Handoff)

Dokumen ini adalah **jembatan konteks** untuk sesi kerja berikutnya (mis. Claude Code
di Ubuntu lokal yang lanjut menyiapkan mesin Ubuntu kedua di VirtualBox). Baca ini
lebih dulu sebelum melanjutkan.

> Nilai rahasia (IP publik, password, secret) **sengaja tidak ditaruh di sini** karena
> repo bisa publik. Placeholder `<...>` diisi oleh owner; nilai asli ada di VPS
> (`/root/sentinel-creds.txt`, mode root) atau ditanyakan ke owner.

---

## Apa ini
Lab SOC berbasis **Wazuh** + **dashboard kustom "Project SENTINEL"** (React) yang
memvisualisasikan serangan (fokus: deteksi SSH brute force) di peta 2D.

## Arsitektur (di VPS)
```
Internet ──> nginx :80 ──> /var/www/sentinel   (build React, Project SENTINEL)
                    └────> /api/* ── proxy ──> 127.0.0.1:3001 (sentinel-backend, Node/systemd)
                                                   │ baca /var/ossec/logs/alerts/alerts.json
                                                   │ GeoIP via ip-api.com + known-locations.json
wazuh-manager ── deteksi ── alerts.json ──────────┘
```
- Repo sumber: `tools/project-sentinel/` (`frontend/` React, `backend/` Node).
- Runtime di VPS: `/opt/sentinel/backend` (backend), `/var/www/sentinel` (frontend build).

## Sudah selesai
- **Deteksi SSH brute force berlapis** (`/var/ossec/etc/rules/local_rules.xml`):
  `100100/100101` (Tier-1, 5 gagal/60s) dan `100110/100111` (Tier-2, ~15 gagal → level 12).
- **Active response** `firewall-drop` pada Tier-2 (timeout 600s, whitelist IP admin).
- **OpenSSH `PerSourcePenalties` dinonaktifkan** untuk lab (`/etc/ssh/sshd_config.d/99-sentinel-lab.conf`).
- **UI overhaul dashboard**: design token, animasi peta satu-rAF (halus), tabel modern
  + panel detail log (klik baris → smooth scroll), header controls konsisten, a11y
  (reduced-motion, focus-visible).
- **Status backend real-time**: endpoint publik `GET /api/health` + polling 10s →
  indikator Online/Offline + banner "koneksi terputus".
- **GeoIP override**: `backend/known-locations.json` (tidak di-commit) untuk IP yang
  GeoIP-nya meleset (mis. Starlink egress selalu terbaca Jakarta). Contoh format:
  `backend/known-locations.example.json`.

## Akses (isi nilai asli sendiri)
- Dashboard: `http://<VPS_PUBLIC_IP>` — login `admin` / `<password lab>` (lihat `/root/sentinel-creds.txt`).
- SSH VPS: `vpsglen@<VPS_PUBLIC_IP>` (key-based).
- Wazuh: **CLI only** (tidak ada Wazuh Dashboard web di VPS ini, lihat kendala).

## Kendala penting (jangan lupa)
1. **RAM VPS 1.9 GB**: Wazuh **Indexer + Dashboard tidak muat** (butuh ~2 GB tambahan;
   minimum resmi all-in-one 4 GB). Karena itu Project SENTINEL yang jadi lapisan visual.
2. **IP Starlink owner berotasi**: `ufw` port 80 dikunci per-IP bisa mengunci akses
   sendiri. Cek `sudo ufw status`; tambah IP baru bila perlu. Solusi durable belum final.
3. **GeoIP perkiraan**: lokasi IP = perkiraan provider; Starlink egress Jakarta. Akurat
   hanya via `known-locations.json` untuk IP yang diketahui.

---

## Langkah lanjut: mesin Ubuntu kedua (VirtualBox)
Tiga arah yang mungkin, **konfirmasikan ke owner** dulu:

1. **Endpoint yang dimonitor (agent)** — install **Wazuh agent** di VM, daftarkan ke
   manager VPS. Prasyarat: buka port `1514/1515` di `ufw` VPS untuk IP publik owner,
   set `<manager_ip>` = IP publik VPS di `/var/ossec/etc/ossec.conf` agent. Lalu
   bangkitkan event nyata (login gagal, perubahan file) → muncul di Project SENTINEL.
2. **Wazuh stack lengkap LOKAL di VM** — jika VM cukup RAM (≥4 GB), pasang Wazuh
   all-in-one (manager+indexer+dashboard) di VM untuk mendapatkan **Wazuh Dashboard**
   yang tak muat di VPS. Independen dari VPS.
3. **Attacker** — jalankan Hydra dari VM untuk uji brute force. Catatan: jika VM di LAN
   yang sama, IP publiknya = IP Starlink owner (sama dengan yang di-whitelist), jadi
   active response akan dilewati. Untuk melihat blokir, serang dari jaringan lain.

## Cara sesi Claude berikutnya melanjutkan
1. Di Ubuntu lokal: `git pull` repo ini, baca dokumen ini.
2. Konfirmasi tujuan (opsi 1/2/3 di atas) dengan owner.
3. Bantu koneksi SSH dari Ubuntu lokal ke VM VirtualBox (cek IP VM: `ip a` di VM;
   pastikan mode jaringan VirtualBox: NAT+port-forward, Bridged, atau Host-only).
4. Jalankan tujuan yang dipilih.
