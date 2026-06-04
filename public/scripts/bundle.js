(function () {
  const translations = {
    'zh-CN': {
      nav: ['首页', '归档', '分类', '标签', '日志'],
      search: '搜索...',
      theme: '主题',
      language: '简体中文',
    },
    en: {
      nav: ['Home', 'Archives', 'Categories', 'Tags', 'Logs'],
      search: 'Search...',
      theme: 'Theme',
      language: 'English',
    },
    ja: {
      nav: ['ホーム', 'アーカイブ', 'カテゴリ', 'タグ', 'ログ'],
      search: '検索...',
      theme: 'テーマ',
      language: '日本語',
    },
    ko: {
      nav: ['홈', '아카이브', '카테고리', '태그', '로그'],
      search: '검색...',
      theme: '테마',
      language: '한국어',
    },
  };

  const languageLabels = {
    'zh-CN': { flag: '\uD83C\uDDE8\uD83C\uDDF3', label: 'CN' },
    en: { flag: '\uD83C\uDDFA\uD83C\uDDF8', label: 'EN' },
    ja: { flag: '\uD83C\uDDEF\uD83C\uDDF5', label: 'JP' },
    ko: { flag: '\uD83C\uDDF0\uD83C\uDDF7', label: 'KR' },
  };

  let searchIndex = [];
  let abortController = null;

  function safeStorageGet(key, fallback) {
    try {
      return localStorage.getItem(key) || fallback;
    } catch (_) {
      return fallback;
    }
  }

  function safeStorageSet(key, value) {
    try {
      localStorage.setItem(key, value);
    } catch (_) {}
  }

  function getScrollRoot() {
    return (
      document.querySelector('#post .scrollable-container') ||
      document.querySelector('#post-content') ||
      document.getElementById('mid-right') ||
      document.scrollingElement
    );
  }

  function setTheme(theme) {
    const nextTheme = theme === 'dark' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', nextTheme);
    document.documentElement.style.colorScheme = nextTheme;
    safeStorageSet('theme', nextTheme);
    updateThemeIcon(nextTheme);
    var frame = document.querySelector('.giscus-frame');
    if (frame && frame.contentWindow) {
      frame.contentWindow.postMessage({ giscus: { setConfig: { theme: nextTheme } } }, 'https://giscus.app');
    }
  }

  function updateThemeIcon(theme) {
    // CSS handles .light-icon / .dark-icon visibility
  }

  function initTheme() {
    var storedTheme = safeStorageGet('theme', 'dark');
    setTheme(storedTheme === 'dark' ? 'dark' : 'light');
    var toggle = document.getElementById('ColorMode');
    if (!toggle || toggle.dataset.bound) return;
    toggle.dataset.bound = 'true';
    toggle.addEventListener('click', function () {
      var current = document.documentElement.getAttribute('data-theme');
      setTheme(current === 'dark' ? 'light' : 'dark');
    });
  }

  async function initSearch() {
    const trigger = document.getElementById('top-search');
    const overlay = document.getElementById('search-overlay');
    const closeBtn = document.getElementById('search-close-btn');
    const input = document.getElementById('local-search-input');
    const results = document.getElementById('local-search-results');
    if (!trigger || !overlay || !input || !results || trigger.dataset.bound) return;

    trigger.dataset.bound = 'true';

    try {
      const response = await fetch(window.__searchPath || '/search.xml');
      const text = await response.text();
      const doc = new DOMParser().parseFromString(text, 'text/xml');
      searchIndex = Array.from(doc.querySelectorAll('entry')).map((entry) => ({
        title: entry.querySelector('title')?.textContent || 'Untitled',
        content: entry.querySelector('content')?.textContent || '',
        url: entry.querySelector('url')?.textContent || '#',
      }));
    } catch (error) {
      console.warn('Search index load failed:', error);
    }

    function openSearch() {
      overlay.style.display = 'flex';
      input.value = '';
      results.innerHTML = '';
      setTimeout(function () { input.focus(); }, 100);
    }

    function closeSearch() {
      overlay.style.display = 'none';
    }

    trigger.addEventListener('click', function (event) {
      event.stopPropagation();
      if (overlay.style.display === 'flex') closeSearch();
      else openSearch();
    });

    if (closeBtn) closeBtn.addEventListener('click', closeSearch);

    overlay.addEventListener('click', function (event) {
      if (event.target === overlay) closeSearch();
    });

    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape' && overlay.style.display === 'flex') closeSearch();
    });

    input.addEventListener('input', function () {
      const query = input.value.trim().toLowerCase();
      if (!query) {
        results.innerHTML = '';
        return;
      }

      const terms = query.split(/[\s-]+/).filter(Boolean);
      const matches = searchIndex
        .filter(function (item) {
          const title = item.title.toLowerCase();
          const content = item.content.replace(/<[^>]+>/g, '').toLowerCase();
          return terms.every(function (term) { return title.includes(term) || content.includes(term); });
        })
        .slice(0, 12);

      results.innerHTML =
        '<ul class="search-result-list">' +
        matches
          .map(function (item) {
            const plain = item.content.replace(/<[^>]+>/g, '');
            const start = Math.max(0, plain.toLowerCase().indexOf(terms[0]) - 24);
            const excerpt = plain.slice(start, start + 120);
            return '<li><a class="search-result-title" href="' + item.url + '">' + item.title + '</a><p class="search-result">' + excerpt + '...</p></li>';
          })
          .join('') +
        '</ul>';
    });
  }

  function applyLanguage(lang) {
    const currentLang = translations[lang] ? lang : 'zh-CN';
    const dict = translations[currentLang];
    document.querySelectorAll('#top-mid-option .nav-link .label').forEach((label, index) => {
      if (dict.nav[index]) label.textContent = dict.nav[index];
    });
    const input = document.getElementById('local-search-input');
    if (input) input.placeholder = dict.search;
    var label = document.querySelector('#language-i18n .i18n-label');
    if (label) label.textContent = languageLabels[currentLang].flag + ' ' + languageLabels[currentLang].label;
    document.querySelectorAll('.i18n-option').forEach((item) => {
      item.classList.toggle('active', item.dataset.lang === currentLang);
    });
    safeStorageSet('lang', currentLang);
  }

  function initI18n() {
    const container = document.getElementById('language-i18n');
    const dropdown = document.getElementById('i18n-dropdown');
    if (!container || !dropdown) return;

    dropdown.innerHTML = Object.keys(translations)
      .map((lang) => `<a class="i18n-option" data-lang="${lang}" href="javascript:void(0)"><span class="i18n-flag">${languageLabels[lang].flag}</span><span class="i18n-abbr">${languageLabels[lang].label}</span></a>`)
      .join('');

    var hideTimer;

    function positionDropdown() {
      var rect = container.getBoundingClientRect();
      dropdown.style.top = (rect.bottom + 4) + 'px';
      dropdown.style.right = (window.innerWidth - rect.right) + 'px';
    }

    function showDropdown() {
      clearTimeout(hideTimer);
      positionDropdown();
      dropdown.style.display = 'block';
    }

    function hideDropdown() {
      hideTimer = setTimeout(function () {
        dropdown.style.display = 'none';
      }, 200);
    }

    if (!container.dataset.bound) {
      container.dataset.bound = 'true';

      container.addEventListener('mouseenter', showDropdown);
      container.addEventListener('mouseleave', hideDropdown);
      dropdown.addEventListener('mouseenter', function () { clearTimeout(hideTimer); });
      dropdown.addEventListener('mouseleave', hideDropdown);

      container.addEventListener('click', function (event) {
        event.stopPropagation();
        if (dropdown.style.display === 'block') {
          dropdown.style.display = 'none';
        } else {
          showDropdown();
        }
      });

      dropdown.addEventListener('click', function (event) {
        var option = event.target.closest('.i18n-option');
        if (!option) return;
        applyLanguage(option.dataset.lang);
        dropdown.style.display = 'none';
      });
    }

    applyLanguage(safeStorageGet('lang', 'zh-CN'));
  }

  function getWordCount() {
    const content = document.getElementById('post-content');
    if (!content) return 0;
    const clone = content.cloneNode(true);
    clone.querySelectorAll('pre, code, script, style, .highlight, .giscus-frame').forEach((node) => node.remove());
    const text = clone.textContent || '';
    return (text.match(/[\u4e00-\u9fa5]/g) || []).length + (text.match(/\b[a-zA-Z]+\b/g) || []).length;
  }

  function initWordCount() {
    const words = getWordCount();
    const count = document.querySelector('#post-count-body a');
    const time = document.querySelector('#post-time-body a');
    if (count) count.textContent = words;
    if (time) time.textContent = Math.max(1, Math.ceil(words / 300));
  }

  function bindReadingProgress() {
    const root = getScrollRoot();
    const postProgress = document.querySelector('.reading-progress-text');
    const listProgress = document.querySelector('.reading-title-text');
    const progressPct = document.getElementById('progress-pct');
    if (!root) return;

    const update = function () {
      const max = root.scrollHeight - root.clientHeight;
      const value = max > 0 ? Math.min((root.scrollTop / max) * 100, 100) : 0;
      const text = `${Math.round(value)}%`;
      if (postProgress) postProgress.textContent = text;
      if (progressPct) progressPct.textContent = text;
    };

    if (!root.dataset.progressBound) {
      root.dataset.progressBound = 'true';
      root.addEventListener('scroll', update);
      window.addEventListener('resize', update);
    }
    update();

    const listRoot = document.getElementById('recent-posts');
    if (!listRoot || !listProgress || listRoot.dataset.progressBound) return;
    listRoot.dataset.progressBound = 'true';
    const updateList = function () {
      const max = listRoot.scrollHeight - listRoot.clientHeight;
      const value = max > 0 ? Math.min((listRoot.scrollTop / max) * 100, 100) : 0;
      listProgress.textContent = `${Math.round(value)}%`;
    };
    listRoot.addEventListener('scroll', updateList);
    updateList();
  }

  function initTopButton() {
    const button = document.getElementById('Browsing-Progress');
    if (!button || button.dataset.bound) return;
    button.dataset.bound = 'true';
    button.addEventListener('click', function () {
      [getScrollRoot(), document.getElementById('recent-posts'), document.scrollingElement].forEach((node) => {
        if (node) node.scrollTo({ top: 0, behavior: 'smooth' });
      });
    });
  }

  function initShiftMenu() {
    const panel = document.getElementById('shiftWindow');
    if (!panel || panel.dataset.bound) return;
    panel.dataset.bound = 'true';
    let pressed = false;
    document.addEventListener('keydown', function (event) {
      if (event.key === 'Shift' && !pressed) {
        pressed = true;
        panel.style.display = 'block';
      }
      if (!event.shiftKey) return;
      const routes = {
        KeyH: '/',
        Digit1: '/archives/',
        Digit2: '/categories/',
        Digit3: '/tags/',
        Digit5: '/logs/',
      };
      if (routes[event.code]) {
        event.preventDefault();
        navigate(routes[event.code]);
      }
      if (event.code === 'KeyR') {
        event.preventDefault();
        window.location.reload();
      }
    });
    document.addEventListener('keyup', function (event) {
      if (event.key === 'Shift') {
        pressed = false;
        panel.style.display = 'none';
      }
    });
  }

  function initRecentPosts() {
    var list = document.getElementById('recent-posts');
    if (!list) return;

    // Highlight current post based on URL
    var currentPath = window.location.pathname.replace(/\/$/, '');
    var target = null;
    list.querySelectorAll('.recent-post-item').forEach(function (item) {
      item.classList.remove('post-clicked');
      var href = item.getAttribute('href');
      if (href) {
        var itemPath = href.replace(/\/$/, '');
        if (itemPath === currentPath) {
          item.classList.add('post-clicked');
          target = item;
        }
      }
    });

    // Smooth scroll to highlighted item
    if (target) {
      setTimeout(function () {
        target.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }, 300);
    }

    if (!list.dataset.bound) {
      list.dataset.bound = 'true';
      list.addEventListener('click', function (event) {
        var item = event.target.closest('.recent-post-item');
        if (!item) return;
        list.querySelectorAll('.recent-post-item').forEach(function (link) { link.classList.remove('post-clicked'); });
        item.classList.add('post-clicked');
        safeStorageSet('clickedPostHref', item.getAttribute('href'));
      });
    }
  }

  function decorateCodeBlocks() {
    document.querySelectorAll('#post-content pre.astro-code').forEach(function (pre) {
      if (pre.closest('.code-block-wrapper')) return;

      var lang = pre.getAttribute('data-language') || '';
      if (!lang) {
        var classes = pre.className.split(' ').filter(function (c) {
          return c !== 'astro-code' && c.indexOf('github') === -1;
        });
        lang = classes[0] || '';
      }
      var langName = lang || 'code';

      var lines = pre.querySelectorAll('.line').length;
      if (!lines) lines = (pre.textContent.match(/\n/g) || []).length + 1;
      var shouldCollapse = lines > 7;

      var wrapper = document.createElement('div');
      wrapper.className = 'code-block-wrapper';

      var header = document.createElement('div');
      header.className = 'code-block-header';
      header.innerHTML =
        '<div class="code-block-dots">' +
        '<span class="code-block-dot red"></span>' +
        '<span class="code-block-dot yellow"></span>' +
        '<span class="code-block-dot green"></span>' +
        '</div>' +
        '<span class="code-block-lang">' + langName + '</span>' +
        (shouldCollapse ? '<button class="code-block-collapse">展开</button>' : '');

      var body = document.createElement('div');
      body.className = 'code-block-body' + (shouldCollapse ? ' collapsed' : '');
      body.appendChild(pre.cloneNode(true));

      wrapper.appendChild(header);
      wrapper.appendChild(body);

      if (shouldCollapse) {
        var toggleBar = document.createElement('div');
        toggleBar.className = 'code-block-toggle-bar';
        toggleBar.innerHTML = '<span class="code-block-toggle-icon">\u25BC</span><span class="code-block-toggle-text">展开</span>';
        wrapper.appendChild(toggleBar);

        var btn = header.querySelector('.code-block-collapse');
        function toggleBody() {
          var collapsed = body.classList.toggle('collapsed');
          btn.textContent = collapsed ? '展开' : '折叠';
          toggleBar.querySelector('.code-block-toggle-icon').innerHTML = collapsed ? '\u25BC' : '\u25B2';
          toggleBar.querySelector('.code-block-toggle-text').textContent = collapsed ? '展开' : '折叠';
        }
        btn.addEventListener('click', toggleBody);
        toggleBar.addEventListener('click', toggleBody);
      }

      pre.replaceWith(wrapper);
    });

    document.querySelectorAll('#post-content table:not(.code-block-wrapper table)').forEach(function (table) {
      table.classList.add('content-table');
    });
  }

  function initToc() {
    var toggle = document.querySelector('.toc-toggle');
    var list = document.querySelector('.toc-list');
    if (toggle && !toggle.dataset.bound) {
      toggle.dataset.bound = 'true';
      toggle.addEventListener('click', function (e) {
        e.preventDefault();
        var hidden = list.style.display === 'none';
        if (hidden) {
          list.style.display = '';
          toggle.textContent = '[-]';
          toggle.title = '折叠';
        } else {
          list.style.display = 'none';
          toggle.textContent = '[+]';
          toggle.title = '展开';
        }
      });
    }

    // Smooth scroll for TOC links
    if (list && !list.dataset.bound) {
      list.dataset.bound = 'true';
      list.addEventListener('click', function (e) {
        var link = e.target.closest('a');
        if (!link) return;
        var href = link.getAttribute('href');
        if (!href || !href.startsWith('#')) return;
        e.preventDefault();
        e.stopPropagation();
        var target = document.getElementById(href.slice(1));
        if (!target) return;
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    }
  }

  function fixMidMid() {
    var midMid = document.getElementById('mid-mid');
    if (!midMid || window.matchMedia('(max-width: 720px)').matches) return;
    var midRight = document.getElementById('mid-right');
    midMid.style.setProperty('display', 'flex', 'important');
    midMid.style.setProperty('height', 'auto', 'important');
    midMid.style.setProperty('visibility', 'visible', 'important');
    midMid.style.setProperty('opacity', '1', 'important');
    if (midRight) {
      var h = midRight.offsetHeight;
      if (h > 0) midMid.style.minHeight = h + 'px';
    }
  }
  window.addEventListener('load', function () {
    var midMid = document.getElementById('mid-mid');
    var midRight = document.getElementById('mid-right');
    if (midMid && midRight && !window.matchMedia('(max-width: 720px)').matches) {
      var h = midRight.offsetHeight;
      if (h > 0) midMid.style.minHeight = h + 'px';
    }
  });

  function initGiscus() {
    var container = document.getElementById('post-comment-main');
    if (!container) return;
    var theme = document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
    var existing = container.querySelector('script');
    if (existing && existing.src.includes('giscus')) return;
    container.innerHTML = '';
    var script = document.createElement('script');
    script.src = 'https://giscus.app/client.js';
    script.setAttribute('data-repo', 'wooxin/wooxin.github.io');
    script.setAttribute('data-repo-id', 'R_kgDONT8vug');
    script.setAttribute('data-category', 'Announcements');
    script.setAttribute('data-category-id', 'DIC_kwDONT8vus4Cm1Xa');
    script.setAttribute('data-mapping', 'pathname');
    script.setAttribute('data-strict', '0');
    script.setAttribute('data-reactions-enabled', '1');
    script.setAttribute('data-emit-metadata', '0');
    script.setAttribute('data-input-position', 'bottom');
    script.setAttribute('data-theme', theme);
    script.setAttribute('data-lang', 'zh-CN');
    script.setAttribute('crossorigin', 'anonymous');
    script.async = true;
    container.appendChild(script);
  }

  function initPage() {
    fixMidMid();
    initWordCount();
    bindReadingProgress();
    initTopButton();
    initRecentPosts();
    decorateCodeBlocks();
    initToc();
    initGiscus();
  }

  var KNOWN_PREFIXES = ['/posts/', '/archives/', '/categories/', '/tags/', '/logs/', '/search.xml', '/rss.xml'];

  function shouldHandleLink(link) {
    var href = link.getAttribute('href');
    if (!href) return false;
    if (href.startsWith('#') || href.startsWith('javascript:') || link.target === '_blank') return false;
    var url = new URL(href, window.location.href);
    if (url.origin !== window.location.origin) return false;
    var pathname = url.pathname;
    if (pathname === '/') return true;
    if (pathname.charAt(pathname.length - 1) !== '/') pathname += '/';
    for (var i = 0; i < KNOWN_PREFIXES.length; i++) {
      if (pathname.startsWith(KNOWN_PREFIXES[i])) return true;
    }
    return false;
  }

  function swapPage(html, href) {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    const nextRight = doc.getElementById('mid-right');
    const nextMid = doc.getElementById('mid-mid');
    const currentRight = document.getElementById('mid-right');
    const currentMid = document.getElementById('mid-mid');
    if (!nextRight || !currentRight) {
      window.location.href = href;
      return;
    }

    document.title = doc.title;
    currentRight.innerHTML = nextRight.innerHTML;
    currentRight.scrollTop = 0;

    const nextHasList = nextMid && nextMid.querySelector('#recent-posts');
    const currentHasList = currentMid && currentMid.querySelector('#recent-posts');
    if (nextHasList && currentMid) {
      currentMid.innerHTML = nextMid.innerHTML;
    } else if (!currentHasList && nextMid && nextMid.textContent.trim()) {
      currentMid.innerHTML = nextMid.innerHTML;
    }

    history.pushState({}, '', href);
    initPage();
  }

  function navigate(href) {
    if (abortController) abortController.abort();
    abortController = new AbortController();
    fetch(href, { signal: abortController.signal })
      .then((response) => response.text())
      .then((html) => swapPage(html, href))
      .catch((error) => {
        if (error.name !== 'AbortError') window.location.href = href;
      });
  }

  function initNavigation() {
    if (document.documentElement.dataset.navBound) return;
    document.documentElement.dataset.navBound = 'true';
    document.addEventListener('click', function (event) {
      const link = event.target.closest('a');
      if (!link || !shouldHandleLink(link)) return;
      event.preventDefault();
      navigate(link.href);
    });
    window.addEventListener('popstate', function () {
      navigate(window.location.href);
    });
  }

  function initFps() {
    const node = document.getElementById('fps');
    if (!node || node.dataset.bound) return;
    node.dataset.bound = 'true';
    let frames = 0;
    let last = performance.now();
    function tick() {
      frames += 1;
      const now = performance.now();
      if (now - last >= 1000) {
        node.textContent = `FPS: ${frames}`;
        frames = 0;
        last = now;
      }
      requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }

  window.initWordCountOnly = initWordCount;
  window.initReadingTimeOnly = initWordCount;
  window.randomPage = function () {
    const links = Array.from(document.querySelectorAll('#recent-posts .recent-post-item, a[href*="/posts/"]'));
    if (links.length) window.location.href = links[Math.floor(Math.random() * links.length)].href;
  };
  window.rmf = {
    copySelect: function () {
      document.execCommand('Copy');
    },
  };
  window.reinit = initPage;

  function initMobileListToggle() {
    var btn = document.getElementById('mobile-list-toggle');
    var midMid = document.getElementById('mid-mid');
    if (!btn || !midMid || btn.dataset.bound) return;
    btn.dataset.bound = 'true';

    function openPanel() {
      midMid.style.display = 'flex';
      midMid.style.position = 'fixed';
      midMid.style.top = '3.2rem';
      midMid.style.left = '0.5rem';
      midMid.style.right = '0.5rem';
      midMid.style.bottom = '1rem';
      midMid.style.zIndex = '350';
      midMid.style.maxHeight = 'none';
      btn.classList.add('open');
      btn.querySelector('span').innerHTML = '&#x2715;';
    }

    function closePanel() {
      midMid.style.display = '';
      midMid.style.position = '';
      midMid.style.top = '';
      midMid.style.left = '';
      midMid.style.right = '';
      midMid.style.bottom = '';
      midMid.style.zIndex = '';
      midMid.style.maxHeight = '';
      btn.classList.remove('open');
      btn.querySelector('span').innerHTML = '&#x2630;';
    }

    btn.addEventListener('click', function () {
      if (midMid.style.display === 'flex') closePanel();
      else openPanel();
    });

    midMid.addEventListener('click', function (e) {
      if (e.target.closest('a') && midMid.style.display === 'flex') {
        setTimeout(closePanel, 200);
      }
    });
  }

  document.addEventListener('DOMContentLoaded', function () {
    initTheme();
    initSearch();
    initI18n();
    initShiftMenu();
    initNavigation();
    initFps();
    initMobileListToggle();
    initPage();
  });
})();
