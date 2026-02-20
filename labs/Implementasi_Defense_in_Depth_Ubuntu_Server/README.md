# 🛡️ Modul 1 — Implementasi Defense in Depth pada Ubuntu Server

> **Defense in Depth Lab Project** | SMK Telkom Purwokerto | TJKT — Cybersecurity  
> **Author:** Glenvio Regalito Rahardjo

---

## 📋 Deskripsi

Project ini merupakan implementasi **Defense in Depth** pada Ubuntu Server dalam lingkungan lab internal yang terisolasi. Pendekatan keamanan berlapis diterapkan mulai dari konfigurasi jaringan, firewall, SSH hardening, hingga proteksi brute force otomatis menggunakan Fail2ban.

---

## 🖥️ Lab Environment

| Host | IP Address | Role | OS |
|------|-----------|------|----|
| Ubuntu Server | 192.168.10.100 | Target / Hardened Host | Ubuntu Server 24.04 LTS |
| Ubuntu Desktop | 192.168.10.101 | Client / Testing Node | Ubuntu Desktop 24.04 |

**Network:** Internal Network (LAB-NET) | Subnet: `192.168.10.0/24`

---

## 🏗️ Arsitektur Defense in Depth

```
Layer 1 — Network Firewall (UFW)
    └── Hanya port 22 (SSH) dan 80 (HTTP) yang terbuka

Layer 2 — SSH Hardening
    └── PermitRootLogin no | AllowUsers ubuntu

Layer 3 — Brute Force Protection (Fail2ban)
    └── Auto-block IP setelah 3 kali gagal login
```

---

## 📌 Tahapan Implementasi

### Tahap 1 — Network Configuration

```bash
# Konfigurasi Static IP Ubuntu Server
# Edit file netplan
sudo nano /etc/netplan/50-cloud-init.yaml
```

```yaml
network:
  version: 2
  ethernets:
    enp0s3:
      dhcp4: no
      addresses:
        - 192.168.10.100/24
      nameservers:
        addresses: [8.8.8.8, 8.8.4.4]
```

```bash
sudo netplan apply
```

### Tahap 2 — Baseline Attack Surface Scanning (Before Firewall)

```bash
# Jalankan dari Ubuntu Desktop
nmap -sS -sV 192.168.10.100 -oN baseline_scan.txt
```

### Tahap 3 — Layer 1: Network Firewall (UFW)

```bash
# Izinkan SSH dan HTTP, lalu aktifkan UFW
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw enable
sudo ufw status verbose
```

### Tahap 4 — Re-Scan Setelah Firewall

```bash
# Dari Ubuntu Desktop — bandingkan dengan baseline
nmap -sS -sV 192.168.10.100
```

### Tahap 5 — Layer 2: SSH Hardening

```bash
sudo nano /etc/ssh/sshd_config
```

Ubah/tambahkan konfigurasi berikut:

```
PermitRootLogin no
AllowUsers ubuntu
```

```bash
sudo systemctl restart ssh
```

### Tahap 6 — Layer 3: Brute Force Protection (Fail2ban)

```bash
sudo apt update && sudo apt install fail2ban -y
sudo systemctl enable fail2ban
sudo systemctl start fail2ban

# Verifikasi jail SSH
sudo fail2ban-client status sshd
```

### Tahap 7 — Logging dan Audit

```bash
# Monitor log SSH secara real-time
sudo tail -n 20 /var/log/auth.log
```

### Tahap 8 — Re-Scan Setelah Hardening

```bash
# Target hasil: hanya port 22 dan 80 yang open, sisanya filtered
nmap -sS -sV 192.168.10.100
```

---

## ✅ Hasil Implementasi

| Kontrol | Status | Keterangan |
|--------|--------|-----------|
| UFW Firewall | ✅ Active | Port 22 & 80 terbuka, sisanya filtered |
| SSH Hardening | ✅ Applied | Root login disabled, hanya user `ubuntu` |
| Fail2ban | ✅ Running | Auto-block setelah 3 percobaan gagal |
| Monitoring | ✅ Active | `/var/log/auth.log` aktif |

---

## 🔒 Legal Disclaimer

Seluruh aktivitas dalam project ini dilakukan pada sistem milik pribadi dalam lingkungan virtual yang terisolasi untuk tujuan **edukasi dan pengembangan kompetensi keamanan siber**. Tidak ada aktivitas pengujian yang dilakukan terhadap sistem tanpa izin.

---
