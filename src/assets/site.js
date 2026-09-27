/* PewPlay — script del sito: tema, ricerca/filtri, player (Play al clic), condivisione, aiuto, screenshot. */
(function () {
  var root = document.documentElement;
  var THEME_KEY = 'pewplay-theme';
  var $ = function (id) { return document.getElementById(id); };

  // ── Tema chiaro/scuro ──
  var themeBtn = $('theme-toggle');
  function isDark() {
    var t = root.getAttribute('data-theme');
    return t ? t === 'dark' : window.matchMedia('(prefers-color-scheme: dark)').matches;
  }
  if (themeBtn) {
    themeBtn.setAttribute('aria-pressed', isDark() ? 'true' : 'false');
    themeBtn.addEventListener('click', function () {
      var next = isDark() ? 'light' : 'dark';
      root.setAttribute('data-theme', next);
      try { localStorage.setItem(THEME_KEY, next); } catch (e) {}
      themeBtn.setAttribute('aria-pressed', next === 'dark' ? 'true' : 'false');
    });
  }

  // ── Home: ricerca e categorie ──
  var grid = $('grid');
  var search = $('search');
  if (grid && search) {
    var cards = [].slice.call(grid.querySelectorAll('.game-card'));
    var chips = [].slice.call(document.querySelectorAll('.category-chip[data-category]'));
    var count = $('result-count');
    var empty = $('no-results');
    var active = 'all';
    var fmt = count ? JSON.parse(count.getAttribute('data-format')) : null;

    function render() {
      var q = search.value.trim().toLowerCase();
      var shown = 0;
      cards.forEach(function (card) {
        var okCat = active === 'all' || card.getAttribute('data-category') === active;
        var okText = !q || card.getAttribute('data-search').indexOf(q) !== -1;
        card.hidden = !(okCat && okText);
        if (!card.hidden) shown++;
      });
      if (count && fmt) count.textContent = shown + ' ' + (shown === 1 ? fmt[0] : fmt[1]);
      if (empty) empty.hidden = shown !== 0;
    }
    chips.forEach(function (chip) {
      chip.addEventListener('click', function () {
        active = chip.getAttribute('data-category');
        chips.forEach(function (c) { c.setAttribute('aria-pressed', c === chip ? 'true' : 'false'); });
        render();
      });
    });
    // "+N more": mostra o nasconde le categorie con meno giochi
    var more = $('chips-more');
    if (more) {
      more.addEventListener('click', function () {
        var open = more.getAttribute('aria-expanded') !== 'true';
        more.setAttribute('aria-expanded', open ? 'true' : 'false');
        more.textContent = more.getAttribute(open ? 'data-less' : 'data-more');
        $('category-row').classList.toggle('is-expanded', open);
      });
    }
    search.addEventListener('input', function () {
      render();
      var p = new URLSearchParams(location.search);
      if (search.value) p.set('q', search.value); else p.delete('q');
      history.replaceState(null, '', location.pathname + (p.toString() ? '?' + p : ''));
    });
    document.addEventListener('keydown', function (ev) {
      if (ev.key === '/' && document.activeElement !== search && !/INPUT|TEXTAREA/.test(document.activeElement.tagName)) {
        ev.preventDefault();
        search.focus();
      }
    });
    var initial = new URLSearchParams(location.search).get('q');
    if (initial) { search.value = initial; render(); }
  }

  // ── Pagina gioco: Play al clic ──
  var container = $('game-container');
  var frame = null;
  if (container) {
    var facade = $('facade');
    var playBtn = $('play-btn');
    var start = function () {
      if (frame) return;
      facade.classList.add('is-loading');
      frame = document.createElement('iframe');
      frame.id = 'game-frame';
      frame.title = container.getAttribute('data-title');
      frame.setAttribute('allow', 'fullscreen; gamepad; autoplay; clipboard-write');
      frame.setAttribute('allowfullscreen', '');
      frame.addEventListener('load', function () {
        facade.classList.add('is-hidden');
        embedRules(frame);
        try { frame.focus(); } catch (e) {}
      });
      frame.src = container.getAttribute('data-src');
      container.insertBefore(frame, facade);
      setTimeout(function () { facade.classList.add('is-hidden'); }, 8000);
      if (window.gtag) window.gtag('event', 'game_start', { game: frame.title });
    };
    playBtn.addEventListener('click', start);
    // Link diretto con #play: parte subito
    if (location.hash === '#play') start();
  }

  // Regole comuni a tutti i giochi, applicate solo dentro PewPlay (il repo del gioco resta intatto):
  // swipe e rotella dentro il gioco non fanno mai scorrere la pagina del sito. Se il gioco ha una
  // sua parte scorrevole (un elenco, un testo lungo), quella continua a scorrere normalmente.
  function embedRules(f) {
    var doc, win;
    try { doc = f.contentDocument; win = f.contentWindow; } catch (e) { return; }
    if (!doc || !doc.head || doc.getElementById('pewplay-embed')) return;
    var st = doc.createElement('style');
    st.id = 'pewplay-embed';
    st.textContent = 'html,body{overscroll-behavior:none}canvas{touch-action:none}';
    doc.head.appendChild(st);

    // true se un elemento sotto il puntatore può ancora scorrere nella direzione dy (>0 = giù)
    var canScroll = function (el, dy) {
      for (; el && el.nodeType === 1; el = el.parentElement) {
        var root = el === doc.scrollingElement || el === doc.body;
        if (!root && !/(auto|scroll)/.test(win.getComputedStyle(el).overflowY)) continue;
        if (el.scrollHeight <= el.clientHeight + 1) continue;
        if (dy > 0 ? el.scrollTop + el.clientHeight < el.scrollHeight - 1 : el.scrollTop > 0) return true;
      }
      return false;
    };
    doc.addEventListener('wheel', function (e) {
      if (e.ctrlKey || !e.deltaY) return; // ctrl+rotella = zoom
      if (!canScroll(e.target, e.deltaY)) e.preventDefault();
    }, { passive: false });
    var sx = 0, sy = 0;
    doc.addEventListener('touchstart', function (e) {
      if (e.touches.length === 1) { sx = e.touches[0].clientX; sy = e.touches[0].clientY; }
    }, { passive: true });
    doc.addEventListener('touchmove', function (e) {
      if (e.touches.length !== 1 || !e.cancelable) return; // due dita = zoom
      var dx = sx - e.touches[0].clientX, dy = sy - e.touches[0].clientY;
      if (Math.abs(dy) < Math.abs(dx)) return;
      if (!canScroll(e.target, dy)) e.preventDefault();
    }, { passive: false });
  }

  // ── Barra sotto il gioco: scende alle informazioni e risale al gioco ──
  var barToggle = $('bar-toggle');
  if (barToggle && container) {
    var label = barToggle.querySelector('span');
    var isDown = function () { return window.scrollY > container.offsetHeight / 3; };
    var syncBar = function () {
      var down = isDown();
      barToggle.classList.toggle('is-up', down);
      label.textContent = barToggle.getAttribute(down ? 'data-up' : 'data-down');
    };
    barToggle.addEventListener('click', function (e) {
      e.preventDefault();
      if (isDown()) {
        window.scrollTo({ top: 0, behavior: 'smooth' });
        if (frame) setTimeout(function () { try { frame.focus({ preventScroll: true }); } catch (err) {} }, 350);
      } else {
        $('game-info').scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
    window.addEventListener('scroll', syncBar, { passive: true });
    syncBar();
  }

  // ── Schermo intero ──
  var shell = $('game-shell');
  var fsBtn = $('fs-btn');
  if (shell && fsBtn) {
    var isFull = function () { return document.fullscreenElement === shell || document.webkitFullscreenElement === shell; };
    var syncFs = function () {
      var on = isFull();
      fsBtn.classList.toggle('is-fullscreen', on);
      var label = fsBtn.getAttribute(on ? 'data-label-exit' : 'data-label-enter');
      fsBtn.setAttribute('aria-label', label);
      fsBtn.setAttribute('title', label);
    };
    fsBtn.addEventListener('click', function () {
      if (isFull()) {
        (document.exitFullscreen || document.webkitExitFullscreen).call(document);
      } else {
        var req = shell.requestFullscreen || shell.webkitRequestFullscreen;
        if (req) req.call(shell);
      }
      if (frame) frame.focus();
    });
    document.addEventListener('fullscreenchange', syncFs);
    document.addEventListener('webkitfullscreenchange', syncFs);
  }

  // ── Condividi ──
  var toast = $('toast');
  var showToast = function (text) {
    if (!toast) return;
    toast.textContent = text;
    toast.classList.add('is-visible');
    clearTimeout(showToast.t);
    showToast.t = setTimeout(function () { toast.classList.remove('is-visible'); }, 2200);
  };
  var shareBtn = $('share-btn');
  if (shareBtn) {
    shareBtn.addEventListener('click', function () {
      var data = { title: document.title, url: location.href.split('#')[0] };
      if (navigator.share) {
        navigator.share(data).catch(function () {});
      } else if (navigator.clipboard) {
        navigator.clipboard.writeText(data.url).then(function () { showToast(shareBtn.getAttribute('data-copied')); });
      }
      if (window.gtag) window.gtag('event', 'share', { method: navigator.share ? 'native' : 'copy' });
    });
  }

  // ── Finestre (aiuto, screenshot) ──
  var openDialog = function (dlg) {
    if (!dlg) return;
    if (dlg.showModal) dlg.showModal(); else dlg.setAttribute('open', '');
  };
  [].slice.call(document.querySelectorAll('dialog')).forEach(function (dlg) {
    dlg.addEventListener('click', function (e) {
      if (e.target === dlg || e.target.closest('[data-close]')) dlg.close();
    });
    dlg.addEventListener('close', function () { if (frame) frame.focus(); });
  });
  var helpBtn = $('help-btn');
  if (helpBtn) helpBtn.addEventListener('click', function () { openDialog($('help-dialog')); });

  var lightbox = $('lightbox');
  if (lightbox) {
    var shots = [].slice.call(document.querySelectorAll('.shot'));
    var img = $('lightbox-img');
    var current = 0;
    var show = function (i) {
      current = (i + shots.length) % shots.length;
      img.src = shots[current].getAttribute('data-full');
      img.alt = shots[current].getAttribute('aria-label');
    };
    shots.forEach(function (btn, i) { btn.addEventListener('click', function () { show(i); openDialog(lightbox); }); });
    [].slice.call(lightbox.querySelectorAll('[data-step]')).forEach(function (b) {
      b.addEventListener('click', function () { show(current + Number(b.getAttribute('data-step'))); });
    });
    lightbox.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowRight') show(current + 1);
      if (e.key === 'ArrowLeft') show(current - 1);
    });
  }
})();
