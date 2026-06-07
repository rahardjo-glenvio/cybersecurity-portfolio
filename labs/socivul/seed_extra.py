"""
Adds 6 ghost accounts (maya, kevin, rina, zara, miguel, ethan) to the template DB.
Ghost accounts have a LOCKED password — they cannot be logged into via the login form
because hash_password() always returns a 32-char hex MD5, never the string 'LOCKED'.
"""
import sqlite3
import os

DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'socivul_template.db')

LOCKED = 'LOCKED'  # Not a valid MD5 hash — login is impossible for these accounts

def seed_extra():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    c = conn.cursor()

    # ── New ghost users ──────────────────────────────────────────────────────
    extra_users = [
        ('maya',   'maya@socivul.com',   LOCKED,
         'Yoga teacher & wellness coach. Early mornings, matcha, and mountains. 🌿',
         'https://maya.fit', 'maya.jpg', 'user'),

        ('kevin',  'kevin@socivul.com',  LOCKED,
         'Street & portrait photographer. Canon R5. Open for bookings.',
         '', 'kevin.jpg', 'user'),

        ('rina',   'rina@socivul.com',   LOCKED,
         'Home cook obsessed with Japanese & Italian food. Recipe testing every weekend. 🍜',
         'https://rina.eats', 'rina.jpg', 'user'),

        ('zara',   'zara@socivul.com',   LOCKED,
         'Minimal wardrobe, maximum impact. Thrift & vintage only. Based in Paris. 👗',
         'https://zara.style', 'zara.jpg', 'user'),

        ('miguel', 'miguel@socivul.com', LOCKED,
         'Producer & beatmaker. Instruments, synths, late nights. SoundCloud in bio.',
         'https://soundcloud.com/miguel', 'miguel.jpg', 'user'),

        ('ethan',  'ethan@socivul.com',  LOCKED,
         'Chasing peaks and wild places. 3000m+ above sea level most weekends. 🏔️',
         '', 'ethan.jpg', 'user'),
    ]

    for u in extra_users:
        try:
            c.execute(
                'INSERT INTO users (username, email, password, bio, website, profile_pic, role) '
                'VALUES (?,?,?,?,?,?,?)', u
            )
            print(f'  [+] User: {u[0]}')
        except sqlite3.IntegrityError:
            print(f'  [skip] User already exists: {u[0]}')

    conn.commit()

    def uid(username):
        row = c.execute('SELECT id FROM users WHERE username = ?', [username]).fetchone()
        return row[0] if row else None

    maya_id   = uid('maya')
    kevin_id  = uid('kevin')
    rina_id   = uid('rina')
    zara_id   = uid('zara')
    miguel_id = uid('miguel')
    ethan_id  = uid('ethan')
    alice_id  = uid('alice')
    bob_id    = uid('bob')
    charlie_id= uid('charlie')
    diana_id  = uid('diana')
    admin_id  = uid('admin')

    ghost_ids = [i for i in [maya_id, kevin_id, rina_id, zara_id, miguel_id, ethan_id] if i]
    old_ids   = [i for i in [alice_id, bob_id, charlie_id, diana_id] if i]

    # ── Posts ────────────────────────────────────────────────────────────────
    extra_posts = [
        # ── Maya (yoga / wellness) ──
        (maya_id, 'maya_post1.jpg',
         'Morning flow complete. 6am on the mat before the world wakes up. This is where I find my reset. #yoga #morningroutine #wellness #mindfulness'),

        (maya_id, 'maya_post2.jpg',
         'Post-hike protein bowl. Roasted sweet potato, chickpeas, avocado, tahini drizzle. Recovery never tasted this good. #healthyfood #mealprep #cleaneating'),

        (maya_id, 'maya_post3.jpg',
         'Summit at 6:30am. Earned every step of this. The mountains do not care about your excuses. #hiking #mountains #sunrise #adventure'),

        (maya_id, 'maya_post4.jpg',
         'New class schedule is up! DM me for the link. Online sessions Tue & Thu, in-person Friday mornings. #yoga #yogateacher #wellness'),

        (maya_id, 'vid_flower.mp4',
         'Slow down. Breathe. This is your reminder to take a moment today. 🌿 #mindfulness #breathe #wellness'),

        # ── Kevin (street photographer) ──
        (kevin_id, 'kevin_post1.jpg',
         'Rush hour, central station. The chaos has its own rhythm if you slow down enough to see it. #streetphotography #urban #documentary #photography'),

        (kevin_id, 'kevin_post2.jpg',
         'Golden light through the alley. Sometimes the best shots are the ones you almost walk past. #photography #light #urban #35mm'),

        (kevin_id, 'kevin_post3.jpg',
         'Portrait session from yesterday. She gave me 10 minutes and this is what we got. Natural light only. #portrait #photography #naturallight'),

        (kevin_id, 'kevin_post4.jpg',
         'Rooftop session at dusk. Blue hour in the city hits differently when you are 20 floors up. #photography #cityscape #bluehour #urban'),

        (kevin_id, 'vid_sintel.mp4',
         'Short film I shot last month finally edited. Very different from my usual work. What do you think? #film #cinematography #shortfilm #director'),

        # ── Rina (foodie / home cook) ──
        (rina_id, 'rina_post1.jpg',
         'Tonkotsu from scratch. 12 hours on the stove, worth every minute. The broth was cloudy and rich and I could cry. #ramen #japanese #homecook #foodie'),

        (rina_id, 'rina_post2.jpg',
         'Cacio e pepe, third attempt this month. Finally nailed the emulsification. No cream, no shortcuts. Just pasta, pecorino, and pepper. #pasta #italian #cooking'),

        (rina_id, 'rina_post3.jpg',
         'Farmers market haul this morning. I have no plan and zero regrets. Something good is happening this afternoon. #cooking #fresh #farmersmarket #foodie'),

        (rina_id, 'rina_post4.jpg',
         'Miso glazed salmon, 15 minutes. This is weeknight cooking done right. Recipe in the comments. 🍣 #cooking #japanese #healthyfood #easyrecipe'),

        (rina_id, 'vid_short.mp4',
         'Sunday morning kitchen routine. Dashi from scratch, miso soup, rice. Simple and grounding. #cooking #japanese #foodvideo #sunday'),

        # ── Zara (fashion / minimal lifestyle) ──
        (zara_id, 'zara_post1.jpg',
         'Thrifted this whole look for 12 euros. Blazer from 1994, trousers from a flea market in Lyon, shoes I have had for 8 years. Buy less, choose well. #thrift #fashion #sustainable #ootd'),

        (zara_id, 'zara_post2.jpg',
         'My wardrobe in 2024: 31 pieces total. Everything fits in one suitcase. This is freedom. #capsulewardrobe #minimalist #fashion #slowfashion'),

        (zara_id, 'zara_post3.jpg',
         'Paris in November. Grey skies, long coats, good coffee. I would not trade this city for anything. #paris #lifestyle #streetstyle #fashion'),

        (zara_id, 'zara_post4.jpg',
         'The bag that started the obsession. Vintage 1990s leather satchel from a market in Montmartre. Perfect condition. This is why I thrift. #vintage #fashion #leather #thrift'),

        (zara_id, 'vid_bbb_short.mp4',
         'Getting dressed does not have to be complicated. My 5 minute morning routine with 6 pieces. #fashion #ootd #morningroutine #minimalist'),

        # ── Miguel (musician / producer) ──
        (miguel_id, 'miguel_post1.jpg',
         'New beat cooking since 3am. When the session hits right you do not stop. Almost there. #producer #beatmaker #music #studio'),

        (miguel_id, 'miguel_post2.jpg',
         'Picked up this Rhodes from a guy moving abroad. Needs tuning and a clean but it sounds like honey. #music #rhodes #vintage #keys'),

        (miguel_id, 'miguel_post3.jpg',
         'Played a small set last night. About 40 people, perfect size. The energy in the room was something else. #livemusic #concert #producer #dj'),

        (miguel_id, 'miguel_post4.jpg',
         'Studio session with the homies. Four producers, one afternoon, six ideas started. This is how creativity works. #music #collaboration #studio #producer'),

        (miguel_id, 'vid_sintel.mp4',
         'Cut a visual for the new single. Very different energy from usual. Let me know what you feel. 🎵 #music #musicvideo #producer #newmusic'),

        # ── Ethan (outdoors / hiking / adventure) ──
        (ethan_id, 'ethan_post1.jpg',
         'Day 7 of the traverse. 3400m, -8 overnight, and the most incredible skies I have ever seen. Worth every blister. #hiking #mountains #adventure #alpinism'),

        (ethan_id, 'ethan_post2.jpg',
         'Bivouac at the ridge. One tent, one view, zero distractions. Sometimes this is all you need. #camping #mountains #outdoor #backcountry'),

        (ethan_id, 'ethan_post3.jpg',
         'River crossing on day 4. Knee deep and freezing but the other side was worth it. #hiking #adventure #nature #river'),

        (ethan_id, 'ethan_post4.jpg',
         'Via ferrata section from last weekend. Exposure is wild on this route. Not for the faint-hearted. #climbing #viaferrata #adventure #mountains'),

        (ethan_id, 'vid_bbb_trail.mp4',
         'Eight days in the Dolomites. This is what a week without screens does to you. Full video in the link in bio. #hiking #dolomites #adventure #travel'),
    ]

    for p in extra_posts:
        if p[0] is not None:
            c.execute('INSERT INTO posts (user_id, image_path, caption) VALUES (?,?,?)', p)

    conn.commit()
    print(f'  [+] {len(extra_posts)} posts inserted')

    # Helper: get post IDs for a user
    def user_posts(user_id):
        rows = c.execute('SELECT id FROM posts WHERE user_id = ? ORDER BY id', [user_id]).fetchall()
        return [r[0] for r in rows]

    posts_maya   = user_posts(maya_id)
    posts_kevin  = user_posts(kevin_id)
    posts_rina   = user_posts(rina_id)
    posts_zara   = user_posts(zara_id)
    posts_miguel = user_posts(miguel_id)
    posts_ethan  = user_posts(ethan_id)

    def ep(lst, i):
        return lst[i] if lst and i < len(lst) else None

    # ── Comments ─────────────────────────────────────────────────────────────
    comments_extra = [
        # On Maya's posts
        (ep(posts_maya,0), alice_id,   'Morning yoga before sunrise is so powerful. Keep inspiring us! 🙌'),
        (ep(posts_maya,0), diana_id,   'This light is incredible. Do you shoot these yourself?'),
        (ep(posts_maya,0), ethan_id,   'That view from your mat beats any gym window.'),
        (ep(posts_maya,1), bob_id,     'That bowl looks incredible. DM me the recipe?'),
        (ep(posts_maya,1), rina_id,    'That tahini drizzle is everything. What brand do you use?'),
        (ep(posts_maya,2), bob_id,     'Which summit is this? I am adding it to my list.'),
        (ep(posts_maya,2), ethan_id,   'What time did you start the approach? Totally worth the early alarm.'),
        (ep(posts_maya,3), charlie_id, 'Just signed up for the online class. Cannot wait!'),

        # On Kevin's posts
        (ep(posts_kevin,0), alice_id,  'The motion blur on this is perfect. ISO cranked up?'),
        (ep(posts_kevin,0), charlie_id,'How do you get people to not notice you shooting? Great technique.'),
        (ep(posts_kevin,1), alice_id,  'That light direction is everything. Such a gorgeous shot.'),
        (ep(posts_kevin,1), diana_id,  'The geometry of this alley is so satisfying to look at.'),
        (ep(posts_kevin,2), alice_id,  'Her expression is so natural. Rare to get this in 10 minutes.'),
        (ep(posts_kevin,2), zara_id,   'The light on those cheekbones. Stunning work Kevin.'),
        (ep(posts_kevin,3), bob_id,    'Blue hour in the city never gets old. Beautiful.'),
        (ep(posts_kevin,3), miguel_id, 'The mood in this one is cinematic. Love it.'),

        # On Rina's posts
        (ep(posts_rina,0), bob_id,     'I can almost smell this through the screen. 12 hours!! Legend.'),
        (ep(posts_rina,0), alice_id,   'The color on that broth is insane. You are absolutely a legend.'),
        (ep(posts_rina,0), maya_id,    'Okay this is not helping my clean eating goals at all 😂'),
        (ep(posts_rina,1), charlie_id, 'Third attempt is real dedication. Cacio e pepe is genuinely hard.'),
        (ep(posts_rina,1), diana_id,   'No cream no shortcuts! The only correct way. Bravo Rina.'),
        (ep(posts_rina,2), maya_id,    'Farmers market hauls are the best content on this app.'),
        (ep(posts_rina,3), alice_id,   'Recipe in the comments please!! This looks incredible.'),
        (ep(posts_rina,3), miguel_id,  'My dinner plans just changed. Making this tonight.'),

        # On Zara's posts
        (ep(posts_zara,0), diana_id,   '12 euros for that whole look?! You have a genuine gift.'),
        (ep(posts_zara,0), alice_id,   'The proportions on this whole outfit are chef kiss. 👌'),
        (ep(posts_zara,1), charlie_id, '31 pieces total. That is impressively disciplined. Goals.'),
        (ep(posts_zara,1), maya_id,    'This is the goal. Intentional, minimal, free. 🙌'),
        (ep(posts_zara,2), bob_id,     'Paris in November is peak aesthetic honestly.'),
        (ep(posts_zara,2), kevin_id,   'That coat deserves its own portrait session. Stunning.'),
        (ep(posts_zara,3), diana_id,   'Vintage leather from Montmartre. An absolute dream find.'),
        (ep(posts_zara,3), rina_id,    'The condition is immaculate. You have such a good eye.'),

        # On Miguel's posts
        (ep(posts_miguel,0), charlie_id,'3am sessions are when the magic happens. What DAW are you on?'),
        (ep(posts_miguel,0), ethan_id,  'Send a snippet when you are ready. Would love to hear it.'),
        (ep(posts_miguel,1), diana_id,  'The Rhodes has the most beautiful warm sound. Great find.'),
        (ep(posts_miguel,1), charlie_id,'Needs tuning? Happy to help debug the electronics if needed.'),
        (ep(posts_miguel,2), bob_id,    'Intimate shows always hit the hardest. Congrats!'),
        (ep(posts_miguel,2), zara_id,   'I was there! The set was incredible. Come back soon.'),
        (ep(posts_miguel,3), alice_id,  'Four producers in one room sounds chaotic and absolutely perfect.'),
        (ep(posts_miguel,3), kevin_id,  'Love the collaborative energy. This is how the best stuff gets made.'),

        # On Ethan's posts
        (ep(posts_ethan,0), bob_id,    'Day 7!! Absolute beast. Which range is this? Looks epic.'),
        (ep(posts_ethan,0), maya_id,   '-8 overnight and still going. You are made of something else.'),
        (ep(posts_ethan,1), bob_id,    'That bivouac view is everything. Worth every kg in the pack.'),
        (ep(posts_ethan,1), alice_id,  'Zero distractions and a view like that. Pure and perfect.'),
        (ep(posts_ethan,2), bob_id,    'River crossings are the best and worst part of any long hike.'),
        (ep(posts_ethan,3), charlie_id,'Via ferrata is on my list. This one looks seriously intense!'),
        (ep(posts_ethan,4), alice_id,  'Eight days in the Dolomites. I cannot imagine anything better.'),
        (ep(posts_ethan,4), bob_id,    'The Dolomites are on another level. Did you go solo?'),
    ]

    inserted_comments = 0
    for cm in comments_extra:
        if cm[0] is not None:
            try:
                c.execute('INSERT INTO comments (post_id, user_id, content) VALUES (?,?,?)', cm)
                inserted_comments += 1
            except Exception:
                pass

    conn.commit()
    print(f'  [+] {inserted_comments} comments inserted')

    # ── Follows ──────────────────────────────────────────────────────────────
    follows = []

    # All ghost users follow all existing users
    for g in ghost_ids:
        for o in [alice_id, bob_id, charlie_id, diana_id, admin_id]:
            if g and o:
                follows.append((g, o))

    # All existing users follow all ghost users
    for o in old_ids:
        for g in ghost_ids:
            if o and g:
                follows.append((o, g))

    # Ghost users follow each other (selective, realistic)
    ghost_cross = [
        (maya_id, ethan_id), (ethan_id, maya_id),
        (maya_id, rina_id),  (rina_id,  maya_id),
        (kevin_id, zara_id), (zara_id,  kevin_id),
        (miguel_id, zara_id),(zara_id,  miguel_id),
        (kevin_id, ethan_id),(ethan_id, kevin_id),
        (rina_id,  zara_id), (zara_id,  rina_id),
        (miguel_id, kevin_id),(kevin_id, miguel_id),
        (maya_id, kevin_id), (ethan_id, bob_id),
    ]
    follows.extend(ghost_cross)

    inserted_follows = 0
    for f in follows:
        if f[0] and f[1]:
            try:
                c.execute('INSERT INTO follows (follower_id, following_id) VALUES (?,?)', f)
                inserted_follows += 1
            except Exception:
                pass

    conn.commit()
    print(f'  [+] {inserted_follows} follows inserted')

    # ── Likes ────────────────────────────────────────────────────────────────
    # Ghost users like old posts
    old_posts = c.execute(
        'SELECT id, user_id FROM posts WHERE user_id IN (?,?,?,?,?)',
        [alice_id, bob_id, charlie_id, diana_id, admin_id]
    ).fetchall()

    # Old users like new posts
    new_posts = c.execute(
        'SELECT id, user_id FROM posts WHERE user_id IN (?,?,?,?,?,?)',
        [maya_id, kevin_id, rina_id, zara_id, miguel_id, ethan_id]
    ).fetchall()

    all_likes = []
    for post_id, post_owner in old_posts:
        for g in ghost_ids:
            if g != post_owner:
                all_likes.append((post_id, g))

    for post_id, post_owner in new_posts:
        for o in old_ids:
            if o != post_owner:
                all_likes.append((post_id, o))
        for g in ghost_ids:
            if g != post_owner:
                all_likes.append((post_id, g))

    inserted_likes = 0
    for lk in all_likes:
        try:
            c.execute('INSERT INTO likes (post_id, user_id) VALUES (?,?)', lk)
            inserted_likes += 1
        except Exception:
            pass

    conn.commit()
    print(f'  [+] {inserted_likes} likes inserted')

    conn.close()
    print('\n[+] Ghost accounts seeded successfully.')
    print('    maya, kevin, rina, zara, miguel, ethan — password=LOCKED (cannot log in)')

if __name__ == '__main__':
    seed_extra()
