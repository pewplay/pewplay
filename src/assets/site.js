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
    var chips = [].slice.call(document.querySelectorAll('.category-chip'));
    var count = $('result-count');
    var empty = $('no-results');
    var sections = $('home-sections');
    var active = 'all';
    var fmt = count ? JSON.parse(count.getAttribute('data-format')) : null;

    function render() {
      var q = search.value.trim().toLowerCase();
      var filtering = !!q || active !== 'all';
      var shown = 0;
      cards.forEach(function (card) {
        var okCat = active === 'all' || card.getAttribute('data-category') === active;
        var okText = !q || card.getAttribute('data-search').indexOf(q) !== -1;
        card.hidden = !(okCat && okText);
        if (!card.hidden) shown++;
      });
      // Mentre si cerca o filtra, le sezioni (in evidenza, categorie…) si nascondono: i risultati salgono in alto
      if (sections) sections.hidden = filtering;
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
