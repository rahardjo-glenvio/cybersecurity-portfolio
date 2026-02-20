# 📡 Modul 3 — Implementasi Wazuh SIEM untuk Deteksi Brute Force SSH

> **Defense in Depth Lab Project** | SMK Telkom Purwokerto | TJKT — Cybersecurity  
> **Author:** Glenvio Regalito Rahardjo  
> **Prasyarat:** Modul 1 (Defense in Depth) + Modul 2 (Brute Force IR)

---

## 📋 Deskripsi

Modul ini merupakan **layer keempat** dari Defense in Depth Lab Project. Wazuh SIEM diintegrasikan sebagai platform monitoring terpusat yang mengumpulkan, menganalisis, dan menampilkan semua security event dari Ubuntu Server secara real-time melalui dashboard berbasis web.

---

## 🖥️ Lab Environment

| Host | IP Address | Role | OS |
|------|-----------|------|----|
| Ubuntu Server | 192.168.10.100 | Defender + Wazuh SIEM | Ubuntu Server 24.04 LTS |
| Ubuntu Desktop | 192.168.10.101 | Attacker (Hydra) | Ubuntu Desktop 24.04 |

---

## 🏗️ Arsitektur Defense in Depth — 4 Layer

| Layer | Komponen | Fungsi |
|-------|----------|--------|
| 1 | UFW Firewall | Membatasi port — hanya 22 dan 80 (Modul 1) |
| 2 | SSH Hardening | `PermitRootLogin no`, `AllowUsers ubuntu` (Modul 1) |
| 3 | Fail2ban | Auto-block IP setelah maxretry gagal login (Modul 1 & 2) |
| **4 (BARU)** | **Wazuh SIEM** | **Centralized logging, real-time alert, SOC dashboard** |

---

## ⚙️ Komponen Wazuh

| Komponen | Fungsi |
|----------|--------|
| **Wazuh Manager** | Menerima dan memproses log dari agent, menjalankan rules/deteksi |
| **Wazuh Indexer** | Database berbasis OpenSearch untuk menyimpan security events |
| **Wazuh Dashboard** | Interface web untuk visualisasi alert dan SOC monitoring |

---

## 📌 Tahapan Implementasi

### Phase 1 — Persiapan Sistem

```bash
# Update sistem (perlu koneksi internet via adapter NAT)
sudo apt update && sudo apt upgrade -y

# Verifikasi koneksi internet
ping google.com -c 3

# Verifikasi semua layanan dari modul sebelumnya
sudo systemctl status ssh
sudo systemctl status fail2ban
sudo ufw status verbose
sudo fail2ban-client status sshd
```

> ⚠️ **Pastikan** VirtualBox Adapter 2 di Ubuntu Server dikonfigurasi sebagai **NAT** untuk akses internet. Adapter 1 tetap Internal Network (LAB-NET).

---

### Phase 2 — Instalasi Wazuh SIEM (All-in-One)

```bash
# Download Wazuh installer
curl -sO https://packages.wazuh.com/4.7/wazuh-install.sh

# Verifikasi file berhasil didownload
ls -lh wazuh-install.sh

# Instalasi all-in-one (estimasi 10-30 menit)
sudo bash wazuh-install.sh -a --ignore-check
```

> 💡 **Catat** username dan password yang muncul di akhir instalasi. Password bisa dilihat kembali dengan:
> ```bash
> sudo tar -O -xvf wazuh-install-files.tar wazuh-passwords.txt
> ```

---

### Phase 3 — Verifikasi Service dan Dashboard

```bash
# Cek status 3 service utama Wazuh
sudo systemctl status wazuh-manager
sudo systemctl status wazuh-dashboard
sudo systemctl status wazuh-indexer

# Enable auto-start saat reboot
sudo systemctl enable wazuh-manager wazuh-dashboard wazuh-indexer

# Buka port 443 untuk dashboard
sudo ufw allow 443/tcp
sudo ufw reload

# Verifikasi port listening
sudo ss -tlnp | grep 443
```

**Akses Dashboard dari Ubuntu Desktop:**
```
https://192.168.10.100
Username: admin
Password: <dari output instalasi>
```

---

### Phase 4 — Konfigurasi Monitoring Log SSH

```bash
# Edit konfigurasi Wazuh Manager
sudo nano /var/ossec/etc/ossec.conf
```

Pastikan blok berikut ada di dalam `<ossec_config>`:

```xml
<localfile>
  <log_format>syslog</log_format>
  <location>/var/log/auth.log</location>
</localfile>
```

```bash
# Restart Wazuh Manager setelah perubahan
sudo systemctl restart wazuh-manager

# Verifikasi Wazuh membaca auth.log
sudo tail -f /var/ossec/logs/ossec.log
sudo grep 'auth.log' /var/ossec/logs/ossec.log | head -10
```

---

### Phase 5 — Simulasi Brute Force SSH

**Persiapan sebelum simulasi:**
- Wazuh Dashboard terbuka di browser Ubuntu Desktop
- Terminal Ubuntu Server memonitor alerts secara real-time
- Fail2ban dalam kondisi aktif dan 0 banned IPs

```bash
# Ubuntu Server — Terminal B (monitoring alert real-time)
sudo tail -f /var/ossec/logs/alerts/alerts.log

# Ubuntu Server — Terminal A (reset Fail2ban)
sudo fail2ban-client set sshd unbanip 192.168.10.101
sudo systemctl restart fail2ban
sudo fail2ban-client status sshd
```

```bash
# Ubuntu Desktop — jalankan serangan
hydra -l ubuntu -P /usr/share/wordlists/rockyou.txt \
      192.168.10.100 ssh -t 4 -V -f
```

---

### Phase 6 — Observasi Deteksi di Wazuh Dashboard

Navigasi di dashboard: **Security Events** → filter berdasarkan IP source `192.168.10.101`

**Wazuh Rule IDs yang relevan:**

| Rule ID | Nama Rule | Deskripsi |
|---------|-----------|-----------|
| 5710 | sshd: Attempt to login using a non-existent user | Login dengan username tidak ada |
| 5712 | sshd: POSSIBLE BREAK-IN ATTEMPT! | Pola mencurigakan terdeteksi |
| 5720 | Multiple SSH authentication failures | Banyak kegagalan autentikasi berturut-turut |
| 5763 | sshd: brute force trying to get access | Deteksi pola brute force otomatis |
| 30101 | fail2ban: banning host | Fail2ban memblokir IP |

---

### Phase 7 — Korelasi Fail2ban dengan Wazuh

```bash
# Konfirmasi Fail2ban berhasil ban IP
sudo fail2ban-client status sshd

# Cek fail2ban.log
sudo grep '192.168.10.101' /var/log/fail2ban.log

# Dari Ubuntu Desktop — verifikasi koneksi ditolak
ssh ubuntu@192.168.10.100
# Expected: Connection refused

# Ping tetap jalan (ICMP tidak diblokir)
ping 192.168.10.100 -c 3
```

---

### Phase 8 — Recovery

```bash
# Unban IP (Ubuntu Server)
sudo fail2ban-client set sshd unbanip 192.168.10.101

# Verifikasi unban
sudo fail2ban-client status sshd
# Expected: Currently banned: 0
```

```bash
# Dari Ubuntu Desktop — verifikasi akses kembali normal
ssh ubuntu@192.168.10.100
whoami && hostname
```

---

### Phase 9 — Final System Check

```bash
# Pastikan semua service aktif
sudo systemctl status ssh
sudo systemctl status fail2ban
sudo systemctl status wazuh-manager
sudo systemctl status wazuh-dashboard
sudo systemctl status wazuh-indexer
sudo ufw status verbose
```

**Expected status semua service:**

```
✓ ssh             : active (running)
✓ fail2ban         : active (running)
✓ wazuh-manager    : active (running)
✓ wazuh-dashboard  : active (running)
✓ wazuh-indexer    : active (running)
✓ UFW              : Status: active
```

---

## 📄 Incident Report Card

| Field | Detail |
|-------|--------|
| **Incident ID** | IR-2026-002 |
| **Tanggal** | 19/02/2026 |
| **Severity** | Medium |
| **Jenis Serangan** | SSH Brute Force Attack |
| **Attacker IP** | 192.168.10.101 (Ubuntu Desktop) |
| **Target IP** | 192.168.10.100 (Ubuntu Server) |
| **Tool** | Hydra (wordlist: rockyou.txt) |
| **Terdeteksi Oleh** | Wazuh SIEM + auth.log + fail2ban.log |
| **Response Otomatis** | Fail2ban auto-ban setelah 3 failed attempts |
| **Status Akhir** | Contained — Tidak ada akses berhasil |
| **Ditangani Oleh** | Glenvio Regalito Rahardjo |

---

## 🔑 Key Takeaway — Trilogy Defense in Depth

| Modul | Fokus | Hasil |
|-------|-------|-------|
| Modul 1 | Fondasi keamanan berlapis | UFW + SSH Hardening + Fail2ban aktif |
| Modul 2 | Simulasi dan incident response | Sistem terbukti tahan brute force, NIST SP 800-61 |
| Modul 3 | Visibilitas terpusat (SIEM) | Dashboard SOC real-time dengan Wazuh |

---

## 🔒 Legal Disclaimer

Seluruh aktivitas dalam modul ini dilakukan pada sistem milik sendiri dalam lab terisolasi. **Brute force attack, port scanning, dan eksploitasi terhadap sistem tanpa izin adalah tindakan ilegal.** Gunakan pengetahuan ini hanya untuk defensive security dan ethical hacking yang terotorisasi.

---
