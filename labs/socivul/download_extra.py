"""Download profile pictures and post images for the 6 new ghost accounts."""
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
        time.sleep(0.3)
        return True
    except Exception as e:
        print(f'       FAILED: {e}')
        return False

PICSUM = 'https://picsum.photos/id/{}/600/600'
PRAVATAR = 'https://i.pravatar.cc/300?img={}'

print('\n=== New profile pictures ===')
avatars = [
    ('maya.jpg',   PRAVATAR.format(25), 'Maya'),
    ('kevin.jpg',  PRAVATAR.format(68), 'Kevin'),
    ('rina.jpg',   PRAVATAR.format(9),  'Rina'),
    ('zara.jpg',   PRAVATAR.format(5),  'Zara'),
    ('miguel.jpg', PRAVATAR.format(57), 'Miguel'),
    ('ethan.jpg',  PRAVATAR.format(12), 'Ethan'),
]
for fname, url, desc in avatars:
    download(url, fname, desc)

print('\n=== New post images ===')
post_images = [
    # Maya — yoga / wellness / nature
    ('maya_post1.jpg',  PICSUM.format(7),   'Maya: yoga at sunrise'),
    ('maya_post2.jpg',  PICSUM.format(277), 'Maya: healthy bowl'),
    ('maya_post3.jpg',  PICSUM.format(217), 'Maya: mountain summit'),
    ('maya_post4.jpg',  PICSUM.format(306), 'Maya: class announcement'),

    # Kevin — street & portrait photography
    ('kevin_post1.jpg', PICSUM.format(370), 'Kevin: rush hour street'),
    ('kevin_post2.jpg', PICSUM.format(373), 'Kevin: alley golden light'),
    ('kevin_post3.jpg', PICSUM.format(240), 'Kevin: portrait session'),
    ('kevin_post4.jpg', PICSUM.format(329), 'Kevin: rooftop blue hour'),

    # Rina — food / home cook
    ('rina_post1.jpg',  PICSUM.format(488), 'Rina: ramen bowl'),
    ('rina_post2.jpg',  PICSUM.format(534), 'Rina: pasta cacio e pepe'),
    ('rina_post3.jpg',  PICSUM.format(312), 'Rina: farmers market haul'),
    ('rina_post4.jpg',  PICSUM.format(543), 'Rina: miso glazed salmon'),

    # Zara — fashion / minimal lifestyle
    ('zara_post1.jpg',  PICSUM.format(213), 'Zara: thrift outfit'),
    ('zara_post2.jpg',  PICSUM.format(297), 'Zara: capsule wardrobe'),
    ('zara_post3.jpg',  PICSUM.format(174), 'Zara: Paris streets'),
    ('zara_post4.jpg',  PICSUM.format(416), 'Zara: vintage leather bag'),

    # Miguel — music / producer
    ('miguel_post1.jpg', PICSUM.format(145), 'Miguel: late night studio'),
    ('miguel_post2.jpg', PICSUM.format(164), 'Miguel: Rhodes keyboard'),
    ('miguel_post3.jpg', PICSUM.format(374), 'Miguel: live set'),
    ('miguel_post4.jpg', PICSUM.format(278), 'Miguel: collab session'),

    # Ethan — outdoors / hiking / adventure
    ('ethan_post1.jpg', PICSUM.format(227), 'Ethan: mountain traverse'),
    ('ethan_post2.jpg', PICSUM.format(287), 'Ethan: bivouac ridge'),
    ('ethan_post3.jpg', PICSUM.format(255), 'Ethan: river crossing'),
    ('ethan_post4.jpg', PICSUM.format(453), 'Ethan: via ferrata'),
]
for fname, url, desc in post_images:
    download(url, fname, desc)

print('\n=== Done ===')
print(f'Saved to: {UPLOAD_DIR}')
