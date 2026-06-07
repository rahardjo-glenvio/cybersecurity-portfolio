/* ============================================================
   SOCIVUL — app.js
   ============================================================ */

/* ---- Video mute toggle ---- */
function toggleVideoMute(btn) {
  var wrapper = btn.closest('.video-wrapper');
  var video = wrapper.querySelector('video');
  var willUnmute = video.muted;

  if (willUnmute) {
    document.querySelectorAll('.video-wrapper video').forEach(function (v) {
      v.muted = true;
      var b = v.closest('.video-wrapper').querySelector('.mute-toggle');
      if (b) {
        b.querySelector('.icon-muted').style.display = 'block';
        b.querySelector('.icon-sound').style.display = 'none';
      }
    });
  }

  video.muted = !willUnmute;
  btn.querySelector('.icon-muted').style.display = video.muted ? 'block' : 'none';
  btn.querySelector('.icon-sound').style.display = video.muted ? 'none' : 'block';
}

/* ---- Toast system ---- */
(function () {
  var container = null;

  function ensureContainer() {
    if (!container) {
      container = document.createElement('div');
      container.className = 'toast-container';
      document.body.appendChild(container);
    }
  }

  window.showToast = function (msg, duration) {
    duration = duration || 2400;
    ensureContainer();

    var t = document.createElement('div');
    t.className = 'toast';
    t.textContent = msg;
    container.appendChild(t);

    setTimeout(function () {
      t.classList.add('exiting');
      t.addEventListener('animationend', function () { t.remove(); }, { once: true });
    }, duration);
  };
})();

/* ---- Navbar scroll shadow ---- */
(function () {
  var nav = document.querySelector('.navbar');
  if (!nav) return;
  window.addEventListener('scroll', function () {
    nav.classList.toggle('scrolled', window.scrollY > 4);
  }, { passive: true });
})();

/* ---- Image lazy fade-in with IntersectionObserver ---- */
(function () {
  if (!('IntersectionObserver' in window)) return;
  var obs = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (e.isIntersecting) {
        var img = e.target;
        img.classList.add('loading');
        if (img.complete) {
          img.classList.remove('loading');
          img.classList.add('loaded');
        } else {
          img.addEventListener('load', function () {
            img.classList.remove('loading');
            img.classList.add('loaded');
          }, { once: true });
        }
        obs.unobserve(img);
      }
    });
  }, { rootMargin: '120px' });

  document.querySelectorAll('.card-image img').forEach(function (img) {
    obs.observe(img);
  });
})();

/* ---- Double-tap to like on feed images ---- */
(function () {
  document.querySelectorAll('.card-image').forEach(function (wrap) {
    var lastTap = 0;

    function triggerLike() {
      var card = wrap.closest('.card');
      if (!card) return;
      var form = card.querySelector('.like-form');
      if (!form) return;

      // Only fire if not already liked
      var btn = form.querySelector('.like-btn');
      if (btn && !btn.classList.contains('liked')) {
        form.dispatchEvent(new Event('submit'));
      }

      // Show floating heart regardless
      var heart = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      heart.setAttribute('viewBox', '0 0 24 24');
      heart.setAttribute('fill', 'white');
      heart.setAttribute('width', '80');
      heart.setAttribute('height', '80');
      heart.classList.add('double-tap-heart');
      heart.innerHTML = '<path d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z"/>';
      wrap.style.position = 'relative';
      wrap.appendChild(heart);
      heart.addEventListener('animationend', function () { heart.remove(); }, { once: true });
    }

    // Touch: double-tap
    wrap.addEventListener('touchend', function (e) {
      var now = Date.now();
      if (now - lastTap < 320) {
        e.preventDefault();
        triggerLike();
      }
      lastTap = now;
    });

    // Mouse: double-click
    wrap.addEventListener('dblclick', function () {
      triggerLike();
    });
  });
})();

/* ---- Navbar search suggestions ---- */
(function () {
  var searchInput = document.getElementById('nav-search');
  if (!searchInput) return;

  var dropdown = null;
  var debounceTimer;

  function closeDropdown() {
    if (dropdown) { dropdown.remove(); dropdown = null; }
  }

  function openDropdown(users) {
    closeDropdown();
    if (!users || users.length === 0) return;

    dropdown = document.createElement('div');
    dropdown.className = 'search-dropdown';

    users.slice(0, 5).forEach(function (u) {
      var item = document.createElement('a');
      item.href = '/profile/' + encodeURIComponent(u.username);
      item.className = 'search-dropdown-item';
      item.innerHTML =
        '<img src="/static/uploads/' + u.profile_pic + '" class="avatar avatar-sm" onerror="this.src=\'/static/uploads/default.jpg\'">' +
        '<div><div class="username">' + escapeHtml(u.username) + '</div>' +
        '<div class="sub">' + escapeHtml(u.bio ? u.bio.slice(0, 32) : 'Socivul user') + '</div></div>';
      dropdown.appendChild(item);
    });

    searchInput.parentElement.appendChild(dropdown);
  }

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  searchInput.addEventListener('input', function () {
    clearTimeout(debounceTimer);
    var q = searchInput.value.trim();
    if (q.length < 2) { closeDropdown(); return; }

    debounceTimer = setTimeout(function () {
      fetch('/search?q=' + encodeURIComponent(q), {
        headers: { 'X-Requested-With': 'XMLHttpRequest' },
        credentials: 'same-origin'
      })
      .then(function (r) { return r.json(); })
      .then(function (data) { openDropdown(data.users || []); })
      .catch(function () {});
    }, 240);
  });

  searchInput.addEventListener('keydown', function (e) {
    if (e.key === 'Enter') {
      closeDropdown();
      window.location.href = '/search?q=' + encodeURIComponent(searchInput.value);
    }
    if (e.key === 'Escape') { closeDropdown(); searchInput.blur(); }
  });

  document.addEventListener('click', function (e) {
    if (!searchInput.parentElement.contains(e.target)) closeDropdown();
  });
})();

/* ---- DOM-based XSS via URL hash (intentional vuln) ---- */
(function () {
  var tagDisplay = document.getElementById('tag-display');
  if (tagDisplay && window.location.hash) {
    var tag = window.location.hash.substring(1);
    tagDisplay.innerHTML = 'Showing: #' + tag;
  }
})();

/* ---- Comment form live button enable ---- */
(function () {
  document.querySelectorAll('.comment-input').forEach(function (input) {
    var btn = input.closest('form').querySelector('button[type=submit]');
    if (!btn) return;
    input.addEventListener('input', function () {
      btn.disabled = input.value.trim() === '';
    });
  });
})();

/* ---- Like button AJAX + optimistic UI ---- */
(function () {
  document.querySelectorAll('.like-form').forEach(function (form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();

      var btn  = form.querySelector('.like-btn');
      var card = form.closest('.card') || form.closest('.post-detail-side');

      if (btn) {
        btn.classList.toggle('liked');
        var svg = btn.querySelector('svg');
        if (svg) { svg.style.fill = ''; svg.style.color = ''; }
        btn.classList.remove('pop');
        void btn.offsetWidth;
        btn.classList.add('pop');
        btn.addEventListener('animationend', function () { btn.classList.remove('pop'); }, { once: true });
        btn.disabled = true;
      }

      fetch(form.action, {
        method: 'POST',
        headers: { 'X-Requested-With': 'XMLHttpRequest' },
        credentials: 'same-origin'
      })
      .then(function (r) { return r.json(); })
      .then(function (data) {
        if (!btn) return;
        btn.disabled = false;

        if (data.liked) btn.classList.add('liked');
        else            btn.classList.remove('liked');

        if (!card) return;
        var countEl = card.querySelector('.card-likes') || card.querySelector('.like-count');
        var text    = data.count + ' ' + (data.count === 1 ? 'like' : 'likes');

        if (data.count > 0) {
          if (countEl) {
            countEl.textContent = text;
          } else {
            var newEl = document.createElement('div');
            newEl.className = 'card-likes';
            newEl.textContent = text;
            var actionsEl = card.querySelector('.card-actions');
            if (actionsEl) actionsEl.after(newEl);
          }
        } else {
          if (countEl) countEl.remove();
        }
      })
      .catch(function () {
        if (btn) { btn.classList.toggle('liked'); btn.disabled = false; }
      });
    });
  });
})();

/* ---- Auto-scroll DM thread ---- */
(function () {
  var dmMessages = document.getElementById('dm-messages');
  if (dmMessages) {
    dmMessages.scrollTop = dmMessages.scrollHeight;
  }
})();

/* ---- Notification badge pulse ---- */
(function () {
  var badge = document.querySelector('.badge');
  if (badge && parseInt(badge.textContent) > 0) {
    setTimeout(function () {
      badge.style.animation = 'pulse 1s ease-in-out 3';
    }, 450);
  }
})();

/* ---- Login form loading state ---- */
(function () {
  var loginForm = document.querySelector('form[action="/login"]');
  if (!loginForm) return;
  loginForm.addEventListener('submit', function () {
    var btn = loginForm.querySelector('button[type=submit]');
    if (btn) {
      btn.textContent = 'Logging in…';
      btn.style.opacity = '0.7';
      btn.style.pointerEvents = 'none';
    }
  });
})();

/* ---- Auto-dismiss error messages after 5s ---- */
(function () {
  document.querySelectorAll('.error-msg').forEach(function (el) {
    setTimeout(function () {
      el.style.transition = 'opacity 0.5s';
      el.style.opacity = '0';
      setTimeout(function () { el.remove(); }, 500);
    }, 5000);
  });
})();

/* ---- Follow button feedback toast ---- */
(function () {
  document.querySelectorAll('form[action^="/follow/"]').forEach(function (form) {
    form.addEventListener('submit', function () {
      var btn = form.querySelector('button');
      if (!btn) return;
      var isFollowing = btn.textContent.trim() === 'Following';
      showToast(isFollowing ? 'Unfollowed' : 'Following');
    });
  });
})();

/* ---- Button ripple effect ---- */
(function () {
  document.querySelectorAll('.btn').forEach(function (btn) {
    btn.addEventListener('click', function (e) {
      var rect = btn.getBoundingClientRect();
      var x = e.clientX - rect.left;
      var y = e.clientY - rect.top;

      var ripple = document.createElement('span');
      ripple.style.cssText = [
        'position:absolute',
        'border-radius:50%',
        'width:8px',
        'height:8px',
        'background:rgba(255,255,255,0.4)',
        'transform:scale(1)',
        'left:' + (x - 4) + 'px',
        'top:' + (y - 4) + 'px',
        'pointer-events:none',
        'animation:ripple 0.5s linear'
      ].join(';');

      btn.appendChild(ripple);
      ripple.addEventListener('animationend', function () { ripple.remove(); }, { once: true });
    });
  });
})();

/* ---- Reset opacity on back/forward navigation (bfcache restore) ---- */
window.addEventListener('pageshow', function () {
  document.body.style.opacity = '1';
  document.body.style.transition = '';
});
