import hashlib
import sqlite3
import os

DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'socivul_template.db')

def hash_password(password):
    return hashlib.md5(password.encode()).hexdigest()

def seed():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    c = conn.cursor()

    c.executescript("""
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT NOT NULL UNIQUE,
            email TEXT NOT NULL UNIQUE,
            password TEXT NOT NULL,
            bio TEXT DEFAULT '',
            website TEXT DEFAULT '',
            profile_pic TEXT DEFAULT 'default.jpg',
            role TEXT DEFAULT 'user',
            is_private INTEGER DEFAULT 0,
            reset_token TEXT DEFAULT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
        CREATE TABLE IF NOT EXISTS posts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            image_path TEXT NOT NULL,
            caption TEXT DEFAULT '',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
        CREATE TABLE IF NOT EXISTS comments (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            post_id INTEGER NOT NULL,
            user_id INTEGER NOT NULL,
            content TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
        CREATE TABLE IF NOT EXISTS likes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            post_id INTEGER NOT NULL,
            user_id INTEGER NOT NULL
        );
        CREATE TABLE IF NOT EXISTS follows (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            follower_id INTEGER NOT NULL,
            following_id INTEGER NOT NULL
        );
        CREATE TABLE IF NOT EXISTS messages (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            sender_id INTEGER NOT NULL,
            receiver_id INTEGER NOT NULL,
            content TEXT NOT NULL,
            is_read INTEGER DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
        CREATE TABLE IF NOT EXISTS notifications (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            content TEXT NOT NULL,
            is_read INTEGER DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
    """)

    users = [
        ('alice',   'alice@socivul.com',   hash_password('alice123'),
         'Photography enthusiast. Golden hours only. Based in the mountains.',
         'https://alice.dev', 'alice.jpg', 'user'),

        ('bob',     'bob@socivul.com',     hash_password('bob123'),
         'Traveler. Street food addict. Always moving. 23 countries so far.',
         'https://bob.travel', 'bob.jpg', 'user'),

        ('charlie', 'charlie@socivul.com', hash_password('charlie123'),
         'Developer by day. Building things that probably should not exist. Flask + coffee.',
         '', 'charlie.jpg', 'user'),

        ('diana',   'diana@socivul.com',   hash_password('diana123'),
         'Watercolor and typography. Art prints available. DM for commissions.',
         'https://diana.art', 'diana.jpg', 'user'),

        ('admin',   'admin@socivul.com',   hash_password('admin123'),
         'Platform administrator.',
         '', 'admin.jpg', 'admin'),
    ]

    for u in users:
        try:
            c.execute(
                'INSERT INTO users (username, email, password, bio, website, profile_pic, role) VALUES (?,?,?,?,?,?,?)',
                u
            )
        except sqlite3.IntegrityError:
            pass

    conn.commit()

    def uid(username):
        return c.execute('SELECT id FROM users WHERE username = ?', [username]).fetchone()[0]

    alice_id   = uid('alice')
    bob_id     = uid('bob')
    charlie_id = uid('charlie')
    diana_id   = uid('diana')
    admin_id   = uid('admin')

    posts_data = [
        # Alice (photography)
        (alice_id, 'alice_post1.jpg',
         'Golden hour never gets old. Caught this last evening at the ridge. #sunset #photography #goldenhour'),

        (alice_id, 'alice_post2.jpg',
         'Morning ritual. Dark roast, quiet house, soft light. This is everything. #morningvibes #coffee'),

        (alice_id, 'alice_post3.jpg',
         'Street portraits from last Saturday. There is something about midday light that just hits different. #portrait #street #photography'),

        (alice_id, 'alice_post4.jpg',
         'Chasing fog in the valley. Woke up at 5am for this. Zero regrets. #nature #landscape #fog'),

        (alice_id, 'alice_post5.jpg',
         'This wall has been on my list for months. Finally got the shot. #urban #architecture #texture'),

        (alice_id, 'vid_flower.mp4',
         'Morning garden, fresh light. This is what April looks like where I live. Shot on a macro lens. #nature #photography #macro'),

        (alice_id, 'vid_bbb_short.mp4',
         'Weekend in 30 seconds. Quick reel from the past two days. Simple and good. #weekend #life #reel'),

        # Bob (travel / food)
        (bob_id, 'bob_post1.jpg',
         'Pad Thai at 11pm on a Bangkok side street. Life is good. #travel #streetfood #bangkok #foodie'),

        (bob_id, 'bob_post2.jpg',
         'Day 3 of the northern trail. Lungs burning, mind at peace. #hiking #nature #adventure'),

        (bob_id, 'bob_post3.jpg',
         'Rooftop at magic hour. Sometimes you climb 14 floors just for a view like this. #citylife #sunset #travel'),

        (bob_id, 'bob_post4.jpg',
         'Night market haul. Everything cost less than $5. The best kind of dinner. #foodie #travel #asia #nightmarket'),

        (bob_id, 'bob_post5.jpg',
         'First snow of the season hit different this year. #mountains #winter #travel #snow'),

        (bob_id, 'vid_sintel.mp4',
         'Editing the Thailand footage. Here is a quick cut from day 4. Still so much to process. #travel #reel #thailand #filmmaking'),

        (bob_id, 'vid_bbb_trail.mp4',
         'Camping trip highlights. Three days, no signal, zero regrets. This is the reset everyone needs. #camping #adventure #travel #offgrid'),

        (bob_id, 'vid_short.mp4',
         'Last night pasta arrabbiata. 20 minutes from start to finish. Simple weeknight meal. #cooking #food #homecook #pasta'),

        # Charlie (developer)
        (charlie_id, 'charlie_post1.jpg',
         'Finally shipped it. Side project that started as a weekend hack is now live. Built with Flask, SQLite, and way too much coffee. Link in bio.'),

        (charlie_id, 'charlie_post2.jpg',
         'Clean desk, clear mind. Switched to a single monitor and never looking back. #workspace #productivity #minimal #setup'),

        (charlie_id, 'charlie_post3.jpg',
         'Local cafe has become my second office. Matcha latte, headphones in, let\'s go. #remote #coffeeshop #developer #wfh'),

        (charlie_id, 'charlie_post4.jpg',
         'Reading list for the month. Anything I missed? Drop it in the comments. #books #learning #dev #reading'),

        (charlie_id, 'vid_sintel.mp4',
         'Launch day reel. Three months of evenings finally shipped. Still can not believe it is live. #buildinpublic #dev #launch #developer'),

        (charlie_id, 'vid_bbb_short.mp4',
         'Late night compile session. This is what 2am looks like on a good day. #coding #developer #nightowl #latenight'),

        # Diana (art / design)
        (diana_id, 'diana_post1.jpg',
         'New watercolor series: City After Rain. This one took 3 sessions to get right. Prints available, DM me! #watercolor #art #painting'),

        (diana_id, 'diana_post2.jpg',
         'Hand lettering practice from this morning. Been obsessed with this rough serif style lately. #typography #handlettering #design'),

        (diana_id, 'diana_post3.jpg',
         'Color study for the new collection. No plan, just pigment and instinct. #art #colortheory #abstract #painting'),

        (diana_id, 'diana_post4.jpg',
         'Texture closeup from the studio. I could photograph surfaces all day long. #texture #art #design #detail'),

        (diana_id, 'vid_flower.mp4',
         'New macro series. Nature is the best reference for color theory. Shot in the studio garden this morning. #art #macro #nature #inspiration'),

        (diana_id, 'vid_bbb_trail.mp4',
         'Process reel from the new collection. Slow and satisfying. This is what a good studio day feels like. #artprocess #watercolor #timelapse #studio'),

        # Admin
        (admin_id, 'admin_post1.jpg',
         'Welcome to Socivul! A place to share moments, connect with people, and build something together. So glad you are here.'),

        (admin_id, 'admin_post2.jpg',
         'The community has grown so much this month. Thank you all for being here and sharing your stories.'),

        (admin_id, 'admin_post3.jpg',
         'New features rolling out this week. Share what you want to see next in the comments.'),
    ]

    for p in posts_data:
        try:
            c.execute('INSERT INTO posts (user_id, image_path, caption) VALUES (?,?,?)', p)
        except Exception:
            pass

    conn.commit()

    def pid(n):
        return c.execute('SELECT id FROM posts ORDER BY id LIMIT 1 OFFSET ?', [n]).fetchone()[0]

    # Comments
    comments_data = [
        (pid(0),  bob_id,     'Absolutely stunning! The colors are incredible.'),
        (pid(0),  charlie_id, 'What camera and lens did you use for this?'),
        (pid(0),  diana_id,   'Love the warm tones. This belongs on a wall.'),
        (pid(1),  bob_id,     'Same. Mornings are everything. Nothing beats that quiet hour.'),
        (pid(1),  diana_id,   'That mug is so aesthetic. Where is it from?'),
        (pid(2),  charlie_id, 'The light on the left side is perfection.'),
        (pid(2),  diana_id,   'Great composition. You have a real eye for street work.'),
        (pid(3),  bob_id,     'Worth every early alarm. Gorgeous shot.'),
        (pid(3),  charlie_id, 'That fog depth is insane. Software could not fake this.'),
        (pid(4),  diana_id,   'Urban textures are so underrated. Love this series.'),
        (pid(4),  bob_id,     'Was wondering when you would post this one. Worth the wait.'),
        (pid(5),  charlie_id, 'This is so calming to watch. What lens?'),
        (pid(5),  bob_id,     'Feels like a meditation. Love it.'),
        (pid(6),  diana_id,   'This whole weekend vibe in one reel. Perfect.'),
        (pid(7),  alice_id,   'I need to go to Bangkok immediately. The food looks unreal.'),
        (pid(7),  diana_id,   'The vendor setup is so photogenic too.'),
        (pid(7),  charlie_id, 'Pad Thai at 11pm hits different. Trust.'),
        (pid(8),  alice_id,   'Which trail is this? Adding it to my list right now.'),
        (pid(8),  diana_id,   'The scale of this landscape is incredible.'),
        (pid(9),  alice_id,   'That view is everything. How did you find this spot?'),
        (pid(9),  charlie_id, '14 floors is definitely worth it. Respect.'),
        (pid(10), alice_id,   'The night market aesthetic is so good. Looks delicious.'),
        (pid(10), charlie_id, '$5 for all of that? Incredible.'),
        (pid(11), alice_id,   'The snow on the peaks is gorgeous. Which range is this?'),
        (pid(12), alice_id,   'The cinematography here is beautiful. What did you shoot on?'),
        (pid(12), charlie_id, 'This edit is clean. What software?'),
        (pid(13), alice_id,   'Three days no signal sounds like the dream right now.'),
        (pid(13), diana_id,   'The campfire scene got me. Adding this to the list.'),
        (pid(14), alice_id,   'That looks so good. Recipe?'),
        (pid(14), diana_id,   'Simple but perfect. Arrabbiata is criminally underrated.'),
        (pid(15), alice_id,   'Congrats on the launch! Huge milestone.'),
        (pid(15), diana_id,   'Flask is so underrated for small projects. Good choice.'),
        (pid(15), bob_id,     'Shipped is better than perfect. Congrats!'),
        (pid(16), alice_id,   'Minimal and clean. Goals for my own setup.'),
        (pid(16), bob_id,     'Single monitor club. Best productivity decision I ever made.'),
        (pid(17), alice_id,   'Which cafe is this? Looks like an amazing vibe.'),
        (pid(17), diana_id,   'The light in there is perfect. Great spot.'),
        (pid(18), alice_id,   'The Pragmatic Programmer is on there. Excellent choice.'),
        (pid(18), bob_id,     'Add SICP to the list if you have not already.'),
        (pid(19), alice_id,   'The pacing of this reel is really good. Congrats again!'),
        (pid(19), bob_id,     'Three months well spent. This looks clean.'),
        (pid(20), alice_id,   'The 2am dev grind is so real. Solidarity.'),
        (pid(20), bob_id,     'At least you shipped. That is more than most.'),
        (pid(21), alice_id,   'This is gorgeous Diana. The detail in the rain reflection is insane.'),
        (pid(21), bob_id,     'Watercolor has no right to look this good.'),
        (pid(21), charlie_id, 'Seriously talented. How long have you been painting?'),
        (pid(22), alice_id,   'This serif feels alive. The texture is incredible.'),
        (pid(22), charlie_id, 'How long does a piece like this take you?'),
        (pid(23), alice_id,   'That indigo and coral combo is fire.'),
        (pid(23), charlie_id, 'Feels like it belongs in a gallery.'),
        (pid(24), alice_id,   'The texture in this is unreal. What paper is this?'),
        (pid(24), bob_id,     'Close-up photography of surfaces is so underrated.'),
        (pid(25), alice_id,   'The color accuracy in this macro is stunning.'),
        (pid(25), charlie_id, 'Nature really is the best mood board.'),
        (pid(26), alice_id,   'The way you captured the layering is amazing.'),
        (pid(26), bob_id,     'Love seeing the process. Makes me appreciate the final piece more.'),
        (pid(27), alice_id,   'So glad to be here!'),
        (pid(27), bob_id,     'Great community vibes from day one.'),
        (pid(27), charlie_id, 'Excited to see where this goes.'),
        (pid(27), diana_id,   'Love this platform. Thank you for building it.'),
        (pid(28), alice_id,   'The growth has been amazing to watch.'),
        (pid(28), charlie_id, 'Great community. Keep up the great work.'),
        (pid(29), alice_id,   'Pagination next please!'),
        (pid(29), charlie_id, 'Dark mode would be great too.'),
        (pid(29), bob_id,     'Story highlights! That is my vote.'),
    ]

    for cm in comments_data:
        try:
            c.execute('INSERT INTO comments (post_id, user_id, content) VALUES (?,?,?)', cm)
        except Exception:
            pass

    # Follow graph
    follows_data = [
        (alice_id,   bob_id),
        (alice_id,   charlie_id),
        (alice_id,   diana_id),
        (alice_id,   admin_id),
        (bob_id,     alice_id),
        (bob_id,     diana_id),
        (bob_id,     charlie_id),
        (charlie_id, alice_id),
        (charlie_id, bob_id),
        (charlie_id, diana_id),
        (diana_id,   alice_id),
        (diana_id,   charlie_id),
        (diana_id,   bob_id),
        (admin_id,   alice_id),
        (admin_id,   bob_id),
        (admin_id,   charlie_id),
        (admin_id,   diana_id),
    ]
    for f in follows_data:
        try:
            c.execute('INSERT INTO follows (follower_id, following_id) VALUES (?,?)', f)
        except Exception:
            pass

    # Likes
    likes_data = []
    post_count = c.execute('SELECT COUNT(*) FROM posts').fetchone()[0]
    user_ids = [alice_id, bob_id, charlie_id, diana_id, admin_id]
    for post_idx in range(post_count):
        try:
            post_id = pid(post_idx)
            post_owner = c.execute('SELECT user_id FROM posts WHERE id = ?', [post_id]).fetchone()[0]
            for uid_val in user_ids:
                if uid_val != post_owner:
                    likes_data.append((post_id, uid_val))
        except Exception:
            pass

    for lk in likes_data:
        try:
            c.execute('INSERT INTO likes (post_id, user_id) VALUES (?,?)', lk)
        except Exception:
            pass

    # DMs
    messages_data = [
        (alice_id,   bob_id,     'Hey Bob! Love your travel photos. Where are you heading next?'),
        (bob_id,     alice_id,   'Thanks Alice! Vietnam in a few weeks. You should come!'),
        (alice_id,   bob_id,     'I would love that. Send me the itinerary when you have it.'),
        (bob_id,     alice_id,   'Will do. Your fog shot from this morning was insane by the way.'),
        (alice_id,   bob_id,     'Ha thank you. Woke up at 4:30 for that one.'),
        (charlie_id, alice_id,   'Hey, your street portrait series is looking great!'),
        (alice_id,   charlie_id, 'Thanks Charlie! Still learning. Your launch post inspired me to keep going.'),
        (charlie_id, alice_id,   'That means a lot. Shipped is better than perfect.'),
        (diana_id,   charlie_id, 'Charlie can you help me with something on my site?'),
        (charlie_id, diana_id,   'Sure, what is going on?'),
        (diana_id,   charlie_id, 'The portfolio page is not loading images on mobile. Any ideas?'),
        (charlie_id, diana_id,   'Probably a path issue. Share the repo and I will take a look.'),
        (bob_id,     diana_id,   'Diana your art is incredible. Do you sell prints?'),
        (diana_id,   bob_id,     'Yes! DM me which piece and I will send you sizes and pricing.'),
        (bob_id,     diana_id,   'The City After Rain one. That piece is stunning.'),
        (diana_id,   bob_id,     'That one is 40x50cm in archival print. I will get you the link.'),
        (alice_id,   diana_id,   'Your macro video this morning was breathtaking.'),
        (diana_id,   alice_id,   'Thank you! We should do a collab shoot sometime.'),
        (alice_id,   diana_id,   'Yes absolutely. I have a spot in the mountains that would be perfect.'),
    ]
    for m in messages_data:
        try:
            c.execute('INSERT INTO messages (sender_id, receiver_id, content) VALUES (?,?,?)', m)
        except Exception:
            pass

    # Notifications
    notifs_data = [
        (alice_id, '<a href="/profile/bob">@bob</a> started following you.'),
        (alice_id, '<a href="/profile/charlie">@charlie</a> liked your post.'),
        (alice_id, '<a href="/profile/diana">@diana</a> commented: "Love the warm tones. This belongs on a wall."'),
        (alice_id, '<a href="/profile/admin">@admin</a> started following you.'),
        (bob_id,   '<a href="/profile/alice">@alice</a> started following you.'),
        (bob_id,   '<a href="/profile/charlie">@charlie</a> liked your post.'),
        (bob_id,   '<a href="/profile/diana">@diana</a> commented: "The vendor setup is so photogenic too."'),
        (diana_id, '<a href="/profile/alice">@alice</a> commented: "This is gorgeous Diana. Insane detail."'),
        (diana_id, '<a href="/profile/bob">@bob</a> liked your post.'),
        (diana_id, '<a href="/profile/charlie">@charlie</a> commented: "Seriously talented."'),
        (charlie_id, '<a href="/profile/alice">@alice</a> commented: "Congrats on the launch! Huge milestone."'),
        (charlie_id, '<a href="/profile/bob">@bob</a> liked your coding post.'),
        (charlie_id, '<a href="/profile/diana">@diana</a> started following you.'),
        (admin_id, '<a href="/profile/alice">@alice</a> joined the platform.'),
    ]
    for n in notifs_data:
        try:
            c.execute('INSERT INTO notifications (user_id, content) VALUES (?,?)', n)
        except Exception:
            pass

    conn.commit()
    conn.close()
    print('[+] Database seeded successfully.')
    print('    30 posts (21 images + 9 videos), 60 comments, 17 follows, 19 messages')
    print('    Users: alice/alice123, bob/bob123, charlie/charlie123, diana/diana123, admin/admin123')

if __name__ == '__main__':
    seed()
