import urllib.request
import os
import time

UPLOAD_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'app', 'static', 'uploads')
os.makedirs(UPLOAD_DIR, exist_ok=True)

def download(url, filename, desc=''):
    dest = os.path.join(UPLOAD_DIR, filename)
    if os.path.exists(dest) and os.path.getsize(dest) > 5000:
        print(f'  [skip] {filename}')
        return True
    try:
        print(f'  [+] {desc} -> {filename}')
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req, timeout=30) as r:
            data = r.read()
        with open(dest, 'wb') as f:
            f.write(data)
        print(f'       OK ({len(data)//1024} KB)')
        time.sleep(0.2)
        return True
    except Exception as e:
        print(f'       FAILED: {e}')
        return False

print('\n=== Profile pictures ===')
avatars = [
    ('alice.jpg',   'https://i.pravatar.cc/300?img=47', 'Alice'),
    ('bob.jpg',     'https://i.pravatar.cc/300?img=11', 'Bob'),
    ('charlie.jpg', 'https://i.pravatar.cc/300?img=52', 'Charlie'),
    ('diana.jpg',   'https://i.pravatar.cc/300?img=23', 'Diana'),
    ('admin.jpg',   'https://i.pravatar.cc/300?img=33', 'Admin'),
]
for fname, url, desc in avatars:
    download(url, fname, desc)

print('\n=== Post images ===')
PICSUM = 'https://picsum.photos/id/{}/600/600'
post_images = [
    ('alice_post1.jpg',   PICSUM.format(15),   'Alice: golden hour landscape'),
    ('alice_post2.jpg',   PICSUM.format(431),  'Alice: morning coffee'),
    ('alice_post3.jpg',   PICSUM.format(338),  'Alice: street portrait'),
    ('alice_post4.jpg',   PICSUM.format(39),   'Alice: foggy valley'),
    ('alice_post5.jpg',   PICSUM.format(350),  'Alice: urban wall'),
    ('bob_post1.jpg',     PICSUM.format(292),  'Bob: street food'),
    ('bob_post2.jpg',     PICSUM.format(167),  'Bob: hiking trail'),
    ('bob_post3.jpg',     PICSUM.format(244),  'Bob: rooftop city'),
    ('bob_post4.jpg',     PICSUM.format(493),  'Bob: night market food'),
    ('bob_post5.jpg',     PICSUM.format(119),  'Bob: mountain snow'),
    ('charlie_post1.jpg', PICSUM.format(0),    'Charlie: laptop'),
    ('charlie_post2.jpg', PICSUM.format(180),  'Charlie: minimal desk'),
    ('charlie_post3.jpg', PICSUM.format(366),  'Charlie: cafe work'),
    ('charlie_post4.jpg', PICSUM.format(159),  'Charlie: book stack'),
    ('diana_post1.jpg',   PICSUM.format(249),  'Diana: watercolor art'),
    ('diana_post2.jpg',   PICSUM.format(127),  'Diana: typography texture'),
    ('diana_post3.jpg',   PICSUM.format(326),  'Diana: colorful abstract'),
    ('diana_post4.jpg',   PICSUM.format(177),  'Diana: art texture'),
    ('admin_post1.jpg',   PICSUM.format(1041), 'Admin: community welcome'),
    ('admin_post2.jpg',   PICSUM.format(1036), 'Admin: community post'),
    ('admin_post3.jpg',   PICSUM.format(29),   'Admin: platform update'),
]
for fname, url, desc in post_images:
    download(url, fname, desc)

print('\n=== Videos (CC licensed, public domain) ===')
videos = [
    # mdn flower: 1.1MB, beautiful macro close-up of a flower blooming
    ('vid_flower.mp4',
     'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4',
     'Flower macro (CC0, 1.1MB)'),

    # Sintel trailer: 4.3MB, cinematic fantasy/adventure short film
    ('vid_sintel.mp4',
     'https://media.w3.org/2010/05/sintel/trailer.mp4',
     'Sintel trailer (CC, 4.3MB)'),

    # Big Buck Bunny excerpt: 770KB, short animated fun clip
    ('vid_bbb_short.mp4',
     'https://www.w3schools.com/html/mov_bbb.mp4',
     'BBB excerpt (CC, 770KB)'),

    # Big Buck Bunny full trailer: 10.5MB, higher quality animation
    ('vid_bbb_trail.mp4',
     'https://media.w3.org/2010/05/bunny/trailer.mp4',
     'BBB trailer (CC, 10.5MB)'),

    # W3Schools tiny clip: 311KB, very short demo
    ('vid_short.mp4',
     'https://www.w3schools.com/html/movie.mp4',
     'Short clip (311KB)'),
]
for fname, url, desc in videos:
    download(url, fname, desc)

print('\n=== Done ===')
print(f'Saved to: {UPLOAD_DIR}')
