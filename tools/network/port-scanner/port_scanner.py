import socket
import time

# BANNER GRABBER
def grab_banner(sock):
    try:
        sock.send(b'\n')
        banner = sock.recv(1024)
        
        banner_text = banner.decode()

        return(banner_text)
    except:
        return "Yahh gagal.."

# PROGRAM UTAMA
grab_banner(None)

sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)

sock.settimeout(1)
print("=======================================")
print("|  Selamat datang di PORT SCANNER V1  |")
print("|             by Glenvio              |")
print("=======================================")

target = input("\nSilahkan masukkan IP yang ingin discan: ")
port = int(input("Silahkan masukkan Port yang ingin discan: "))

print("\n[*] Scanning dimulai..")
time.sleep(1)

result = sock.connect_ex((target, port))

if result == 0:
    print("\n[+] Port Terbuka!")
    hasil = grab_banner(sock)
    print("\nPort yang terbuka adalah:", hasil)
else:
    print("\n[-]Yahh maaf bro, portnya tutup...")
    
sock.close()