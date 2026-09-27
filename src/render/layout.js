// Struttura comune di tutte le pagine: <head>, header, footer, immagini responsive.
import { esc } from '../util.js';
import { T } from '../strings.js';

export const abs = (site, p) => (p.startsWith('http') ? p : site.baseUrl + p);

const svg = (body, extra = '') => `<svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"${extra}>${body}</svg>`;
export const ICONS = {
  moon: svg('<path d="M21 12.79A9 9 0 1111.21 3a7 7 0 009.79 9.79z"/>', ' class="icon-moon"'),
  sun: svg('<circle cx="12" cy="12" r="5"/><path d="M12 1v2m0 18v2M4.22 4.22l1.42 1.42m12.72 12.72l1.42 1.42M1 12h2m18 0h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/>', ' class="icon-sun"'),
  back: svg('<path d="m15 18-6-6 6-6"/>', ' stroke-width="2.4"'),
  fsEnter: svg('<path d="M8 3H3v5M16 3h5v5M8 21H3v-5M16 21h5v-5"/>', ' class="fs-enter"'),
  fsExit: svg('<path d="M3 8h5V3M21 8h-5V3M3 16h5v5M21 16h-5v5"/>', ' class="fs-exit"'),
  share: svg('<circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="m8.6 13.5 6.8 4M15.4 6.5l-6.8 4"/>'),
  help: svg('<circle cx="12" cy="12" r="10"/><path d="M9.1 9a3 3 0 0 1 5.8 1c0 2-3 3-3 3M12 17h.01"/>'),
  close: svg('<path d="M18 6 6 18M6 6l12 12"/>'),
  down: svg('<path d="M12 5v14M5 12l7 7 7-7"/>'),
  arrow: svg('<path d="M5 12h14M13 5l7 7-7 7"/>'),
  devices: svg('<rect x="2" y="4" width="14" height="10" rx="1.5"/><path d="M6 18h6M9 14v4"/><rect x="17" y="8" width="5" height="11" rx="1"/>'),
  search: svg('<circle cx="11" cy="11" r="7"/><path d="m21 21-4.35-4.35"/>', ' stroke-width="2.3"'),
  play: '<svg aria-hidden="true" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>',
};

/**
 * <picture> con AVIF + WebP in più dimensioni: il browser scarica solo il formato e la misura giusti.
 * set: { webp: { 256: url, 512: url }, avif: { ... } }
 */
export function picture(set, { alt = '', sizes = '100vw', width, height, lazy = true, className = '', priority = false }) {
  const srcset = obj => Object.entries(obj).map(([w, url]) => `${url} ${w}w`).join(', ');
  const widths = Object.keys(set.webp).map(Number).sort((a, b) => a - b);
  const fallback = set.webp[widths[widths.length - 1]];
  const avif = Object.keys(set.avif || {}).length ? `<source type="image/avif" srcset="${srcset(set.avif)}" sizes="${sizes}">` : '';
  return `<picture>${avif}<img src="${fallback}" srcset="${srcset(set.webp)}" sizes="${sizes}" alt="${esc(alt)}" width="${width}" height="${height}"${className ? ` class="${className}"` : ''}${lazy ? ' loading="lazy" decoding="async"' : ''}${priority ? ' fetchpriority="high"' : ''}></picture>`;
}

function googleTags(site) {
  if (site.isPreview) return '';
  const { adsensePublisherId, gaMeasurementId } = site.config;
  let out = '';
  if (adsensePublisherId) {
    const client = `ca-${adsensePublisherId.replace(/^ca-/, '')}`;
    out += `
  <meta name="google-adsense-account" content="${esc(client)}">
  <script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${esc(client)}" crossorigin="anonymous"></script>`;
  }
  if (gaMeasurementId) {
    out += `
  <script async src="https://www.googletagmanager.com/gtag/js?id=${esc(gaMeasurementId)}"></script>
  <script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}gtag('js',new Date());gtag('config',${JSON.stringify(gaMeasurementId)});</script>`;
  }
  return out;
}

/** Pagina HTML completa. */
export function layout(site, p) {
  const canonical = abs(site, p.path);
  const og = p.ogImage;
  const jsonLd = (p.jsonLd || []).map(o => `<script type="application/ld+json">${JSON.stringify(o).replace(/</g, '\\u003c')}</script>`).join('\n  ');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${esc(p.title)}</title>
  <script>try{var t=localStorage.getItem('pewplay-theme');if(t)document.documentElement.setAttribute('data-theme',t)}catch(e){}</script>
  ${site.fontPreload ? `<link rel="preload" href="${site.fontPreload}" as="font" type="font/woff2" crossorigin>` : ''}
  <link rel="stylesheet" href="${site.assets.css}">
  <script defer src="${site.assets.js}"></script>
  ${(p.preload || []).join('\n  ')}
  <link rel="icon" href="/favicon.ico" sizes="any">
  <link rel="icon" type="image/png" sizes="96x96" href="/favicon-96x96.png">
  <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png">
  <link rel="manifest" href="/manifest.json">
  <meta name="theme-color" content="${esc(site.config.themeColor)}">
  <meta name="robots" content="${site.isPreview || p.noindex ? 'noindex,nofollow' : 'index,follow,max-image-preview:large'}">
  <meta name="description" content="${esc(p.description)}">
  ${p.author ? `<meta name="author" content="${esc(p.author)}">` : ''}
  ${p.noCanonical ? '' : `<link rel="canonical" href="${esc(canonical)}">`}
  <meta property="og:locale" content="en_US">
  <meta property="og:type" content="${p.ogType || 'website'}">
  <meta property="og:site_name" content="${esc(site.config.name)}">
  <meta property="og:title" content="${esc(p.ogTitle || p.title)}">
  <meta property="og:description" content="${esc(p.description)}">
  <meta property="og:url" content="${esc(canonical)}">
  <meta property="og:image" content="${esc(abs(site, og.url))}">
  <meta property="og:image:type" content="${og.type}">
  <meta property="og:image:width" content="${og.w}">
  <meta property="og:image:height" content="${og.h}">
  <meta property="og:image:alt" content="${esc(p.ogTitle || p.title)}">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${esc(p.ogTitle || p.title)}">
  <meta name="twitter:description" content="${esc(p.description)}">
  <meta name="twitter:image" content="${esc(abs(site, og.url))}">
  ${jsonLd}${googleTags(site)}
</head>
<body>
<a class="skip-link" href="#main">${esc(T.skipToContent)}</a>
${p.body}
</body>
</html>
`;
}

export function header(site, { variant = 'site', gameTitle = '', hasHelp = false } = {}) {
  const s = T;
  const left = variant === 'game'
    ? `<a href="/" class="header-btn" aria-label="${esc(s.backHome)}" title="${esc(s.home)}">${ICONS.back}</a>
        <span class="header-game-title">${esc(gameTitle)}</span>`
    : `<a href="/" class="logo" aria-label="${esc(site.config.name)} — ${esc(s.home)}"><img src="/favicon-32x32.png" alt="" width="32" height="32"><span class="logo-text">${esc(site.config.name)}</span></a>`;
  const gameButtons = variant === 'game'
    ? `${hasHelp ? `<button class="header-btn" type="button" id="help-btn" aria-haspopup="dialog" aria-controls="help-dialog" aria-label="${esc(s.help)}" title="${esc(s.help)}">${ICONS.help}</button>` : ''}
        <button class="header-btn" type="button" id="share-btn" aria-label="${esc(s.share)}" title="${esc(s.share)}" data-copied="${esc(s.linkCopied)}">${ICONS.share}</button>`
    : '';
  const fs = variant === 'game'
    ? `<button class="header-btn" type="button" id="fs-btn" aria-label="${esc(s.fullscreen)}" title="${esc(s.fullscreen)}" data-label-enter="${esc(s.fullscreen)}" data-label-exit="${esc(s.exitFullscreen)}">${ICONS.fsEnter}${ICONS.fsExit}</button>`
    : '';
  return `<header class="site-header">
    <div class="header-inner">
        ${left}
        ${site.isPreview ? `<span class="preview-pill" title="${esc(s.previewNotice)}">${esc(s.previewBadge)}</span>` : ''}
        <span class="spacer"></span>
        ${gameButtons}
        <button class="header-btn" type="button" id="theme-toggle" aria-label="${esc(s.toggleTheme)}" title="${esc(s.toggleTheme)}">${ICONS.moon}${ICONS.sun}</button>
        ${fs}
    </div>
  </header>`;
}

const FOOTER_CATEGORIES = 8;

export function footer(site) {
  const s = T;
  const c = site.config;
  // Nel footer solo le categorie con più giochi; tutte le altre sono in /categories/
  const all = site.categories || [];
  const cats = all.slice(0, FOOTER_CATEGORIES).map(cat => `<a href="/${cat.slug}/">${esc(cat.label)}</a>`).join('')
    + (all.length > FOOTER_CATEGORIES ? `<a href="/categories/">${esc(s.allCategories)}</a>` : '');
  return `<footer class="footer">
    <div class="footer__inner">
      <div class="footer__left">
        <div class="footer__brand"><img src="/favicon-32x32.png" alt="" width="30" height="30"><span>${esc(c.name)}</span></div>
        <div class="footer__copy">${s.footerText}</div>
      </div>
      <div class="footer__right">
        ${cats ? `<nav class="footer__links footer__cats" aria-label="${esc(s.categoriesLabel)}">${cats}</nav>` : ''}
        <nav class="footer__links" aria-label="Site">
          <a href="/">${esc(s.home)}</a>
          <a href="/privacy-policy/">${esc(s.privacy)}</a>
          <a href="mailto:${esc(c.contactEmail)}">${esc(s.contact)}</a>
          <a href="https://github.com/${esc(c.github.org)}" rel="noopener noreferrer">GitHub</a>
          <span class="footer__copy">© ${new Date().getFullYear()} ${esc(c.name)}</span>
        </nav>
      </div>
    </div>
  </footer>`;
}

export function previewBar(site) {
  return site.isPreview ? `<div class="preview-bar" role="note">${esc(T.previewNotice)}</div>` : '';
}

/** Briciole di pane visibili (Home › Puzzle Games › Sudoku). */
export function breadcrumb(items) {
  return `<nav class="breadcrumb" aria-label="Breadcrumb"><ol>${items.map((it, i) => (i < items.length - 1
    ? `<li><a href="${it.url}">${esc(it.name)}</a></li>`
    : `<li><span aria-current="page">${esc(it.name)}</span></li>`)).join('')}</ol></nav>`;
}

export function breadcrumbLd(site, items) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((it, i) => ({ '@type': 'ListItem', position: i + 1, name: it.name, item: abs(site, it.url) })),
  };
}
