// === Theme Toggle ===
(function() {
  var html = document.documentElement;
  var saved = localStorage.getItem('theme') || 'light';
  html.setAttribute('data-theme', saved);
  syncIcon(saved);

  var btn = document.querySelector('#ColorMode .colormode-toggle');
  if (btn) btn.addEventListener('click', function() {
    var next = html.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    html.setAttribute('data-theme', next);
    localStorage.setItem('theme', next);
    syncIcon(next);
    syncGiscus(next);
  });

  function syncIcon(t) {
    var main = document.querySelector('.ColorMode-main');
    var up = document.querySelector('.ColorMode-up');
    if (!main || !up) return;
    if (t === 'dark') { main.style.visibility = 'hidden'; up.style.visibility = 'visible'; }
    else { main.style.visibility = 'visible'; up.style.visibility = 'hidden'; }
  }

  function syncGiscus(t) {
    var iframe = document.querySelector('iframe.giscus-frame');
    if (iframe) iframe.contentWindow.postMessage({ giscus: { setConfig: { theme: t === 'dark' ? 'dark' : 'light' } } }, 'https://giscus.app');
  }
})();

// === FPS ===
(function() {
  var el = document.getElementById('fps');
  if (!el) return;
  var count = 0, last = performance.now();
  (function tick() {
    count++;
    var now = performance.now();
    if (now - last >= 1000) { el.textContent = 'FPS: ' + count; last = now; count = 0; }
    requestAnimationFrame(tick);
  })();
})();

// === Search ===
(function() {
  var data = [], path = window.__searchPath || '/search.xml';
  fetch(path).then(function(r) { return r.text(); }).then(function(xml) {
    var doc = new DOMParser().parseFromString(xml, 'text/xml');
    data = Array.from(doc.querySelectorAll('entry')).map(function(e) {
      return { title: (e.querySelector('title')?.textContent || 'Untitled'), content: (e.querySelector('content')?.textContent || ''), url: (e.querySelector('url')?.textContent || '') };
    });
  });

  var icon = document.querySelector('#top-search .search-icon');
  var popup = document.getElementById('search-popup');
  var input = document.getElementById('local-search-input');
  var results = document.getElementById('local-search-results');
  if (!icon || !popup) return;

  icon.addEventListener('click', function(e) {
    if (e.target.closest('#search-popup')) return;
    e.stopPropagation();
    popup.style.display = popup.style.display === 'none' ? 'block' : 'none';
    if (popup.style.display === 'block' && input) setTimeout(function() { input.focus(); }, 100);
  });
  popup.addEventListener('click', function(e) { e.stopPropagation(); });
  document.addEventListener('click', function() { popup.style.display = 'none'; });

  if (input && results) input.addEventListener('input', function() {
    var q = input.value.trim().toLowerCase();
    if (!q) { results.innerHTML = ''; return; }
    var ks = q.split(/[\s\-]+/);
    results.innerHTML = '<ul class="search-result-list">' + data.filter(function(d) {
      if (!d.content) return false;
      var tl = d.title.toLowerCase(), cl = d.content.replace(/<[^>]+>/g,'').toLowerCase();
      return ks.every(function(k) { return tl.indexOf(k) >= 0 || cl.indexOf(k) >= 0; });
    }).map(function(d) {
      var clean = d.content.replace(/<[^>]+>/g,''), idx = Math.max(0, clean.toLowerCase().indexOf(ks[0]) - 20), s = clean.substring(idx, idx + 100);
      ks.forEach(function(k) { s = s.replace(new RegExp(k, 'gi'), '<em class="search-keyword">' + k + '</em>'); });
      return '<li><a href="' + d.url + '" class="search-result-title">' + d.title + '</a><p class="search-result">' + s + '...</p></li>';
    }).join('') + '</ul>';
  });
})();

// === i18n ===
(function() {
  var lang = localStorage.getItem('lang') || 'zh-CN';
  var T = {
    'zh-CN': { nav_home:'首页',nav_archives:'归档',nav_categories:'分类',nav_tags:'标签',nav_logs:'日志',nav_search:'搜索',nav_theme:'主题',search_placeholder:'搜索...',language_name:'简体中文' },
    'en': { nav_home:'Home',nav_archives:'Archives',nav_categories:'Categories',nav_tags:'Tags',nav_logs:'Logs',nav_search:'Search',nav_theme:'Theme',search_placeholder:'Search...',language_name:'English' }
  };
  var flags = { 'zh-CN': { abbr:'CN' }, 'en': { abbr:'EN' } };
  window.t = function(k) { return (T[lang]&&T[lang][k])||k; };

  var dropdown = document.getElementById('i18n-dropdown');
  if (dropdown) {
    dropdown.innerHTML = Object.keys(T).map(function(c) { return '<a class="i18n-option" data-lang="'+c+'" href="javascript:void(0)">'+ (flags[c]?.abbr||c) + '</a>'; }).join('');
    dropdown.style.display = 'none';
    mark(); apply();
    document.getElementById('i18n-current').textContent = flags[lang]?.abbr || lang;

    dropdown.addEventListener('click', function(e) {
      var opt = e.target.closest('.i18n-option'); if (!opt) return; e.preventDefault();
      lang = opt.getAttribute('data-lang'); localStorage.setItem('lang', lang);
      mark(); apply();
      document.getElementById('i18n-current').textContent = flags[lang]?.abbr || lang;
    });
  }

  function mark() { document.querySelectorAll('.i18n-option').forEach(function(e) { e.classList.toggle('active', e.getAttribute('data-lang')===lang); }); }
  function apply() {
    var ks = ['nav_home','nav_archives','nav_categories','nav_tags','nav_logs'];
    document.querySelectorAll('#top-mid-option .label').forEach(function(e,i) { if(ks[i]) e.textContent = T[lang][ks[i]]; });
    var s = document.querySelector('#top-search .search-icon'); if(s) s.setAttribute('title', T[lang].nav_search);
    var l = document.getElementById('i18n-current'); if(l) l.setAttribute('title', T[lang].language_name);
    var c = document.querySelector('#ColorMode .colormode-toggle'); if(c) c.setAttribute('title', T[lang].nav_theme);
    var inp = document.getElementById('local-search-input'); if(inp) inp.setAttribute('placeholder', T[lang].search_placeholder);
  }
})();

// === SPA Navigation (skip posts for reliability) ===
(function() {
  var ctrl = null;
  document.addEventListener('click', function(e) {
    var a = e.target.closest('a'); if (!a) return;
    var href = a.getAttribute('href'); if (!href) return;
    // Skip: external, anchor, JS, blank target, or POST pages (let full nav handle)
    if (href.startsWith('http') || href.startsWith('#') || href.startsWith('javascript:') || a.target === '_blank') return;
    if (href.startsWith('/posts/')) return; // full page load for posts
    e.preventDefault();
    if (ctrl) ctrl.abort(); ctrl = new AbortController();
    var right = document.getElementById('mid-right'); if (right) right.style.opacity = '0.7';
    fetch(href, { signal: ctrl.signal }).then(function(r) { return r.text(); }).then(function(html) {
      var doc = new DOMParser().parseFromString(html, 'text/html');
      document.title = doc.title;
      var nr = doc.getElementById('mid-right'), nm = doc.getElementById('mid-mid');
      if (nr && right) right.innerHTML = nr.innerHTML;
      if (nm) { var mm = document.getElementById('mid-mid'); if (mm) mm.innerHTML = nm.innerHTML; }
      window.history.pushState({}, '', href);
      if (right) right.style.opacity = '1';
      setTimeout(function() { if (typeof window.reinit === 'function') window.reinit(); }, 50);
    }).catch(function(err) { if (err.name !== 'AbortError') window.location.href = href; });
  });
  window.addEventListener('popstate', function() {
    if (ctrl) ctrl.abort(); ctrl = new AbortController();
    var right = document.getElementById('mid-right'); if (right) right.style.opacity = '0.7';
    fetch(window.location.href, { signal: ctrl.signal }).then(function(r) { return r.text(); }).then(function(html) {
      var doc = new DOMParser().parseFromString(html, 'text/html');
      document.title = doc.title;
      var nr = doc.getElementById('mid-right'), nm = doc.getElementById('mid-mid');
      if (nr && right) right.innerHTML = nr.innerHTML;
      if (nm) { var mm = document.getElementById('mid-mid'); if (mm) mm.innerHTML = nm.innerHTML; }
      if (right) right.style.opacity = '1';
      setTimeout(function() { if (typeof window.reinit === 'function') window.reinit(); }, 50);
    }).catch(function() { window.location.reload(); });
  });
})();

// === Reading Progress + Word Count ===
(function() {
  function countWords() {
    var art = document.getElementById('post-content'); if (!art) return 0;
    var c = art.cloneNode(true);
    ['pre','code','script','style','.highlight','.giscus-frame'].forEach(function(s) { c.querySelectorAll(s).forEach(function(e) { e.remove(); }); });
    var t = c.textContent || '';
    return (t.match(/[\u4e00-\u9fa5]/g) || []).length + (t.match(/\b[a-zA-Z]+\b/g) || []).length;
  }
  function calcTime() { return Math.ceil(countWords() / 300); }

  window.initWordCountOnly = function() {
    var el = document.querySelector('#post-count-body a'); if (el) el.textContent = countWords();
    var te = document.querySelector('#post-time-body a'); if (te) te.textContent = calcTime();
  };
  window.initReadingTimeOnly = window.initWordCountOnly;

  if (document.getElementById('post')) setTimeout(function() { window.initWordCountOnly(); }, 100);

  // Post content reading progress
  (function() {
    var c = document.querySelector('#post-content'), el = document.querySelector('.reading-progress-text');
    if (!c || !el) return;
    function u() { var m = c.scrollHeight - c.clientHeight; el.textContent = Math.round(m > 0 ? Math.min((c.scrollTop/m)*100, 100) : 0) + '%'; }
    c.addEventListener('scroll', u); window.addEventListener('resize', u); u();
  })();

  // Article list reading progress
  (function() {
    var c = document.querySelector('#recent-posts'), el = document.querySelector('.reading-title-text');
    if (!c || !el) return;
    function u() { var m = c.scrollHeight - c.clientHeight; el.textContent = Math.round(m > 0 ? Math.min((c.scrollTop/m)*100, 100) : 0) + '%'; }
    c.addEventListener('scroll', u); window.addEventListener('resize', u); u();
  })();
})();

// === Browsing Progress (back to top) ===
(function() {
  var btn = document.getElementById('Browsing-Progress'), pct = document.getElementById('progress-pct');
  if (!btn || !pct) return;
  btn.addEventListener('click', function() {
    var areas = document.querySelectorAll('#mid-right, #post-content, #recent-posts, #mid-mid');
    areas.forEach(function(el) { el.scrollTop = 0; }); window.scrollTo({ top: 0, behavior: 'smooth' });
  });
  function update() {
    var el = document.querySelector('#post-content') || document.querySelector('#mid-right') || document.querySelector('#mid-mid');
    if (!el) { pct.textContent = '0%'; return; }
    var m = el.scrollHeight - el.clientHeight;
    pct.textContent = Math.round(m > 0 ? Math.min((el.scrollTop/m)*100, 100) : 0) + '%';
  }
  var t = document.querySelector('#post-content') || document.querySelector('#mid-right') || document.querySelector('#mid-mid');
  if (t) t.addEventListener('scroll', update);
  update();
})();

// === Post Highlight ===
(function() {
  var c = document.getElementById('recent-posts'); if (!c) return;
  var saved = sessionStorage.getItem('clickedPostHref');
  if (saved) c.querySelectorAll('.recent-post-item').forEach(function(el) { if (el.getAttribute('href')===saved) el.classList.add('post-clicked'); });
  c.addEventListener('click', function(e) {
    var el = e.target.closest('.recent-post-item'); if (!el) return;
    c.querySelectorAll('.recent-post-item').forEach(function(x) { x.classList.remove('post-clicked'); });
    el.classList.add('post-clicked'); sessionStorage.setItem('clickedPostHref', el.getAttribute('href'));
  });
})();

// === Shift Menu ===
(function() {
  var win = document.getElementById('shiftWindow'); if (!win) return;
  var pressed = false;
  document.addEventListener('keydown', function(e) { if (e.key==='Shift' && !pressed) { pressed=true; win.style.display='block'; } });
  document.addEventListener('keyup', function(e) { if (e.key==='Shift') { pressed=false; win.style.display='none'; } });
  document.addEventListener('keydown', function(e) {
    if (!e.shiftKey) return;
    var m = { KeyH:'/', Digit1:'/archives', Digit2:'/categories', Digit3:'/tags', Digit4:'/about', Digit5:'/logs' };
    if (m[e.code]) { e.preventDefault(); window.location.href = m[e.code]; }
    else if (e.code==='KeyR') { e.preventDefault(); window.location.reload(); }
  });
})();

// === Right Menu ===
(function() {
  var menu = document.getElementById('right-menu'); if (!menu || /Mobi|Android/i.test(navigator.userAgent)) return;
  window.oncontextmenu = function(e) {
    if (e.ctrlKey) return true;
    var mt = document.getElementById('menu-text'); if (mt) mt.style.display = document.getSelection().toString() ? '' : 'none';
    var x = e.clientX + 10, y = e.clientY;
    if (x + menu.offsetWidth > window.innerWidth) x -= menu.offsetWidth + 10;
    if (y + menu.offsetHeight > window.innerHeight) y -= y + menu.offsetHeight - window.innerHeight;
    menu.style.top = y + 'px'; menu.style.left = x + 'px'; menu.style.display = 'block';
    return false;
  };
  document.addEventListener('click', function() { menu.style.display = 'none'; });
  window.randomPage = function() { var ps = document.querySelectorAll('a[href*="/posts/"], .recent-post-item'); if (ps.length) window.location.href = ps[Math.floor(Math.random()*ps.length)].href; };
  window.rmf = { copySelect: function() { document.execCommand('Copy'); } };
})();

// === TOC Toggle ===
(function() {
  var toggle = document.querySelector('.toc-toggle'); if (!toggle) return;
  toggle.addEventListener('click', function(e) {
    e.preventDefault();
    var ol = document.querySelector('.toc-article ol, .toc ol');
    if (toggle.textContent.trim() === '[-]') { toggle.textContent = '[+]'; toggle.title = '展开'; if (ol) ol.style.display = 'none'; }
    else { toggle.textContent = '[-]'; toggle.title = '收起'; if (ol) ol.style.display = ''; }
  });
})();

// === Code highlight data-class-name ===
(function() {
  document.querySelectorAll('.highlight').forEach(function(el) {
    var names = Array.from(el.classList).filter(function(c) { return c !== 'highlight'; }).join(' ');
    if (names) el.setAttribute('data-class-name', names);
  });
  document.querySelectorAll('#post-content table:not(figure table)').forEach(function(t) { t.classList.add('content-table'); });
})();

// === Giscus (lazy load) ===
(function() {
  var container = document.getElementById('post-comment-main');
  if (!container) return;
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function(entries) {
      entries.forEach(function(entry) {
        if (entry.isIntersecting) { this.disconnect(); loadGiscus(container); }
      });
    }, { rootMargin: '200px' }).observe(container);
  } else { loadGiscus(container); }

  function loadGiscus(c) {
    var s = document.createElement('script');
    s.src = 'https://giscus.app/client.js';
    s.setAttribute('data-repo','Wooxin/wooxin.github.io');
    s.setAttribute('data-repo-id','R_kgDOMA_DTQ');
    s.setAttribute('data-category','Announcements');
    s.setAttribute('data-category-id','DIC_kwDOMA_DTc4CveeY');
    s.setAttribute('data-mapping','pathname');
    s.setAttribute('data-strict','0');
    s.setAttribute('data-reactions-enabled','1');
    s.setAttribute('data-input-position','top');
    s.setAttribute('data-theme', document.documentElement.getAttribute('data-theme')==='dark'?'dark':'light');
    s.setAttribute('data-lang','zh-CN');
    s.crossOrigin='anonymous'; s.async=true;
    c.appendChild(s);
  }
})();

// === Giscus theme sync ===
window.reinit = function() {
  var right = document.getElementById('mid-right');
  if (right) { right.classList.add('page-enter'); setTimeout(function() { right.classList.remove('page-enter'); }, 300); }
  if (document.getElementById('post')) { setTimeout(function() { if (window.initWordCountOnly) window.initWordCountOnly(); }, 100); }
  var oldFrame = document.querySelector('iframe.giscus-frame'); if (oldFrame) oldFrame.remove();
  var cm = document.getElementById('post-comment-main'); if (cm) { cm.innerHTML = ''; loadGiscusAgain(cm); }
  if (typeof loadGiscusAgain === 'undefined') {
    window.loadGiscusAgain = function(c) {
      var s = document.createElement('script');
      s.src = 'https://giscus.app/client.js';
      s.setAttribute('data-repo','Wooxin/wooxin.github.io');
      s.setAttribute('data-repo-id','R_kgDOMA_DTQ');
      s.setAttribute('data-category','Announcements');
      s.setAttribute('data-category-id','DIC_kwDOMA_DTc4CveeY');
      s.setAttribute('data-mapping','pathname');
      s.setAttribute('data-strict','0');
      s.setAttribute('data-reactions-enabled','1');
      s.setAttribute('data-input-position','top');
      s.setAttribute('data-theme', document.documentElement.getAttribute('data-theme')==='dark'?'dark':'light');
      s.setAttribute('data-lang','zh-CN');
      s.crossOrigin='anonymous'; s.async=true;
      c.appendChild(s);
    };
  }
};
