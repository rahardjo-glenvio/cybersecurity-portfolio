# 🛡️ Wazuh SIEM Attack Detection Lab
### MK2-B PAS - Kelas XI TJKT 2 Kelompok 3

**SMK Telkom Purwokerto** | Teknik Jaringan Komputer dan Telekomunikasi

---

## 📌 Deskripsi

Modul praktikum penetration testing yang dirancang untuk memahami bagaimana serangan umum pada layanan jaringan bekerja, serta bagaimana **Wazuh SIEM** mendeteksi aktivitas mencurigakan tersebut secara real-time.

Setiap serangan dilakukan dalam **environment lab yang terisolasi** dan dimonitor oleh Wazuh Manager untuk keperluan pembelajaran keamanan jaringan, baik dari sisi offensive maupun defensive.

---

## 🧪 Attack Scenarios

| # | Serangan | Tool | Target Service | Port |
|---|----------|------|----------------|------|
| 1 | Apache Directory Bruteforce | `ffuf` | Apache HTTP Server | 80 |
| 2 | SMB Anonymous Access | `smbclient` | Samba / SMB | 445 |
| 3 | FTP Anonymous Login | `ftp` | vsftpd 2.3.4 | 21 |
| 4 | SSH Bruteforce | `hydra` | OpenSSH | 22 |

---

## 🏗️ Environment Lab

| Role | Spesifikasi |
|------|-------------|
| **Target Server** | Ubuntu 24.04 LTS — Apache, Samba, vsftpd, SSH |
| **Wazuh Manager** | Wazuh SIEM v4.x — Dashboard monitoring |
| **Attacker Machine** | Kali Linux via WSL2 |

> ⚠️ Semua pengujian dilakukan dalam environment lab terisolasi (Docker/VM) khusus untuk keperluan edukasi. IP address yang tertera di modul hanya berlaku di jaringan lab internal.

---

## 📂 Struktur Repository

```
wazuh-siem-attack-detection-lab/
├── README.md
└── Modul_Serangan_MK2-B_PAS_KELOMPOK_3.pdf
```

---

## 👥 Anggota Kelompok 3 - XI TJKT 2

| No | Nama | NIS |
|----|------|-----|
| 1  | Glenvio Regalito Rahardjo  | 541241446 |
| 2  | Stevanda Dimas Eza Pratama | 541241480 |
| 3  | Aqila Keysa Putri Adlina   | 541241413 |
| 4  | Tikror Ibnu Musyafi        | 541241482 |

---

## 🎓 Informasi Akademik

| Keterangan | Detail |
|------------|--------|
| **Sekolah** | SMK Telkom Purwokerto |
| **Program Keahlian** | Teknik Jaringan Komputer dan Telekomunikasi (TJKT) |
| **Mata Pelajaran** | Keamanan Jaringan (MK2-B) |
| **Jenis Penilaian** | PAS - Penilaian Akhir Semester |
| **Kelas** | XI TJKT 2 |
| **Tahun Ajaran** | 2025/2026 |

---

## 📚 Tools yang Digunakan

| Tool | Fungsi | Link |
|------|--------|------|
| `ffuf` | Web directory fuzzer | [github.com/ffuf/ffuf](https://github.com/ffuf/ffuf) |
| `smbclient` | SMB/Samba client | [samba.org](https://www.samba.org) |
| `ftp` | FTP client bawaan Linux | Built-in |
| `hydra` | Network login bruteforcer | [github.com/vanhauser-thc/thc-hydra](https://github.com/vanhauser-thc/thc-hydra) |
| `Wazuh` | Open source SIEM & XDR | [wazuh.com](https://wazuh.com) |

---

## 💡 Poin Pembelajaran

- Setiap serangan meninggalkan **jejak log** yang dapat dideteksi oleh SIEM
- Wazuh mendeteksi pola mencurigakan seperti banyak request dalam waktu singkat
- **Defense in depth**: kombinasi strong password, rate limiting, dan monitoring adalah kunci keamanan jaringan
- Tools seperti `ffuf`, `hydra`, dan `smbclient` bersifat *double-edged sword* — digunakan untuk security testing sekaligus bisa disalahgunakan

---

> **Disclaimer:** Semua teknik yang didokumentasikan dalam modul ini hanya untuk keperluan edukasi dalam environment lab yang terisolasi. Penggunaan teknik ini terhadap sistem tanpa izin adalah **ilegal dan melanggar hukum**.
