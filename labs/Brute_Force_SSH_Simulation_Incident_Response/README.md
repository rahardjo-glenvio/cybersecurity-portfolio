# ⚔️ Modul 2 — Brute Force Attack Simulation & Incident Response

> **Defense in Depth Lab Project** | SMK Telkom Purwokerto | TJKT — Cybersecurity  
> **Author:** Glenvio Regalito Rahardjo  
> **Prasyarat:** Modul 1 (Defense in Depth — UFW + SSH Hardening + Fail2ban)

---

## 📋 Deskripsi

Modul ini merupakan kelanjutan dari Modul 1. Tujuannya adalah **membuktikan** bahwa sistem yang telah di-hardening mampu mendeteksi, menahan, dan merespons serangan brute force SSH secara otomatis. Simulasi dilakukan menggunakan **Hydra** dari attacker node, dengan dokumentasi incident response mengikuti framework **NIST SP 800-61**.

---

## 🖥️ Lab Environment

| Host | IP Address | Role | OS |
|------|-----------|------|----|
| Ubuntu Server | 192.168.10.100 | 🛡️ Defender | Ubuntu Server 24.04 LTS |
| Ubuntu Desktop | 192.168.10.101 | ⚔️ Attacker | Ubuntu Desktop 24.04 |

---

## 📐 Framework: NIST SP 800-61

| Phase | Deskripsi | Implementasi |
|-------|-----------|-------------|
| Phase 1 — Preparation | Verifikasi semua komponen lab siap | Cek UFW, Fail2ban, SSH |
| Phase 2 — Detection | Monitoring auth.log + fail2ban.log real-time | `tail -f /var/log/auth.log` |
| Phase 3 — Containment | Fail2ban auto-block + manual verification | `fail2ban-client status sshd` |
| Phase 4 — Eradication | Audit zero successful login | `grep 'Accepted password' auth.log` |
| Phase 5 — Recovery | Unban IP + validasi akses legitimate | `fail2ban-client set sshd unbanip` |
| Phase 6 — Lessons Learned | Dokumentasi dan rekomendasi | Laporan akhir |

---

## 🔍 Phase 1 — Preparation

### Verifikasi Status Layanan (Ubuntu Server)

```bash
# Cek UFW
sudo ufw status verbose

# Cek Fail2ban
sudo systemctl status fail2ban

# Cek Jail SSH — baseline harus 0 banned
sudo fail2ban-client status sshd
```

### Install Hydra (Ubuntu Desktop)

```bash
sudo apt update && sudo apt install hydra -y
hydra -h | head -5

# Verifikasi wordlist tersedia
ls -lh /usr/share/wordlists/rockyou.txt
```

### Buka Monitoring Log (Ubuntu Server — Terminal Terpisah)

```bash
# Terminal B — biarkan terus berjalan selama simulasi
sudo tail -f /var/log/auth.log
```

---

## ⚙️ Phase 2 — Attack Simulation & Detection

### Konfigurasi Fail2ban (Sebelum Serangan)

```bash
sudo nano /etc/fail2ban/jail.local
```

```ini
[DEFAULT]
bantime  = 600
findtime = 300
maxretry = 3

[sshd]
enabled  = true
port     = 22
filter   = sshd
logpath  = /var/log/auth.log
maxretry = 3
bantime  = 600
```

```bash
sudo systemctl restart fail2ban

# Verifikasi
sudo fail2ban-client get sshd maxretry
# Expected output: 3
```

### Simulasi Brute Force dengan Hydra (Ubuntu Desktop)

```bash
hydra -l ubuntu -P /usr/share/wordlists/rockyou.txt \
      192.168.10.100 ssh -t 4 -V -f
```

| Flag | Keterangan |
|------|-----------|
| `-l ubuntu` | Target username |
| `-P rockyou.txt` | Wordlist password |
| `-t 4` | 4 thread paralel |
| `-V` | Verbose — tampilkan setiap percobaan |
| `-f` | Stop setelah berhasil |

### Observasi Detection (Ubuntu Server)

```bash
# Cek fail2ban.log — konfirmasi ban
sudo tail -f /var/log/fail2ban.log

# Konfirmasi status jail SSH setelah serangan
sudo fail2ban-client status sshd
```

**Expected output:**
```
Status for the jail: sshd
|- Filter
|  |- Currently failed: 1
|  `- Total failed:     8
`- Actions
   |- Currently banned: 1
   `- Banned IP list:   192.168.10.101
```

---

## 🔒 Phase 3 — Containment

```bash
# Dari Ubuntu Desktop — verifikasi koneksi ditolak
ssh ubuntu@192.168.10.100
# Expected: Connection refused

# Ping tetap jalan (hanya SSH yang diblokir)
ping 192.168.10.100 -c 3
```

---

## 🔎 Phase 4 — Eradication

```bash
# Audit zero successful login selama window serangan
sudo grep -a 'Accepted password' /var/log/auth.log
sudo grep -a 'Accepted publickey' /var/log/auth.log

# Riwayat login lengkap
sudo last | head -20

# Verifikasi tidak ada user baru yang dibuat attacker
sudo cat /etc/passwd | tail -5
sudo getent group sudo

# Cek proses mencurigakan
ps aux | grep -v '^[a-z]' | head -20
```

---

## 🔄 Phase 5 — Recovery

```bash
# Manual unban IP attacker (Ubuntu Server)
sudo fail2ban-client set sshd unbanip 192.168.10.101

# Verifikasi unban berhasil
sudo fail2ban-client status sshd
# Expected: Currently banned: 0

# Final system check
sudo systemctl status ssh
sudo systemctl status fail2ban
sudo ufw status verbose
sudo grep '192.168.10.101' /var/log/fail2ban.log
```

```bash
# Dari Ubuntu Desktop — verifikasi akses legitimate kembali normal
ssh ubuntu@192.168.10.100
whoami && hostname
```

---

## 📄 Incident Report Card

| Field | Detail |
|-------|--------|
| **Incident ID** | IR-2026-001 |
| **Tanggal** | 17/02/2026 |
| **Severity** | Medium |
| **Jenis Serangan** | SSH Brute Force Attack |
| **Attacker IP** | 192.168.10.101 (Ubuntu Desktop) |
| **Target IP** | 192.168.10.100 (Ubuntu Server) |
| **Tool** | Hydra (wordlist: rockyou.txt) |
| **Status Akhir** | Contained — Tidak ada akses berhasil |
| **Ditangani Oleh** | Glenvio Regalito Rahardjo |

---

## 📊 Indicator of Compromise (IoC)

| IoC Type | Indicator | Source Log |
|----------|-----------|-----------|
| Network IoC | IP 192.168.10.101 — Multiple failed SSH | `/var/log/auth.log` |
| Behavioral IoC | ≥3 Failed password dalam 300 detik | `/var/log/auth.log` |
| Tool Signature | Rapid SSH connection attempts (Hydra) | `/var/log/auth.log` |
| Response | Auto-ban triggered by Fail2ban | `/var/log/fail2ban.log` |

---

## 📌 Lessons Learned & Rekomendasi

**Yang Berhasil:**
- Fail2ban mendeteksi dan memblokir serangan dalam hitungan detik
- `auth.log` memberikan visibility real-time terhadap percobaan login gagal
- UFW membatasi attack surface — hanya port 22 dan 80 terbuka
- Zero successful login selama serangan berlangsung

**Rekomendasi Short-term:**
- Gunakan SSH Key Authentication — eliminasi 100% brute force risk
- Ganti port SSH dari 22 ke port custom (misal 2222)
- Set `bantime = 86400` (24 jam) atau `-1` (permanent)

**Rekomendasi Long-term:**
- Integrasi SIEM (Wazuh/Splunk) untuk centralized log monitoring
- Implementasi IDS/IPS (Snort/Suricata)
- Konfigurasi alerting otomatis saat ada IP yang diblokir

---

## 🔒 Legal Disclaimer

Seluruh aktivitas dalam modul ini dilakukan pada sistem milik sendiri dalam lab terisolasi. **Brute force attack terhadap sistem tanpa izin adalah tindakan ilegal.** Gunakan pengetahuan ini hanya untuk defensive security dan ethical hacking yang terotorisasi.

---
