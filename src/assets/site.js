/* PewPlay — script del sito: tema, ricerca/filtri in home, player del gioco. */
(function () {
  var root = document.documentElement;
  var THEME_KEY = 'pewplay-theme';

  // ── Tema chiaro/scuro ──
  var themeBtn = document.getElementById('theme-toggle');
  function isDark() {
    var t = root.getAttribute('data-theme');
    return t ? t === 'dark' : window.matchMedia('(prefers-color-scheme: dark)').matches;
  }
  function syncTheme() {
    if (!themeBtn) return;
    themeBtn.setAttribute('aria-pressed', isDark() ? 'true' : 'false');
  }
  if (themeBtn) {
    syncTheme();
    themeBtn.addEventListener('click', function () {
      var next = isDark() ? 'light' : 'dark';
      root.setAttribute('data-theme', next);
      try { localStorage.setItem(THEME_KEY, next); } catch (e) {}
      syncTheme();
    });
  }

  // ── Home: ricerca e categorie (filtra le card già presenti nella pagina) ──
  var grid = document.getElementById('grid');
  var search = document.getElementById('search');
  if (grid && search) {
    var cards = [].slice.call(grid.querySelectorAll('.game-card'));
    var chips = [].slice.call(document.querySelectorAll('.category-chip'));
    var count = document.getElementById('result-count');
    var empty = document.getElementById('no-results');
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

  // ── Pagina gioco: splash + schermo intero ──
  var frame = document.getElementById('game-frame');
  if (frame) {
    var splash = document.getElementById('splash');
    var shell = document.getElementById('game-shell');
    var fsBtn = document.getElementById('fs-btn');
    var hide = function () { splash.classList.add('loaded'); };
    frame.addEventListener('load', hide);
    setTimeout(hide, 6000);

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
      frame.focus();
    });
    document.addEventListener('fullscreenchange', syncFs);
    document.addEventListener('webkitfullscreenchange', syncFs);
  }
})();
