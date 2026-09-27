// Struttura comune di tutte le pagine: <head>, header, footer.
import { esc } from '../util.js';
import { T } from '../strings.js';

export const abs = (site, p) => (p.startsWith('http') ? p : site.baseUrl + p);

const ICONS = {
  moon: '<svg class="icon-moon" aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.79A9 9 0 1111.21 3a7 7 0 009.79 9.79z"/></svg>',
  sun: '<svg class="icon-sun" aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"/><path d="M12 1v2m0 18v2M4.22 4.22l1.42 1.42m12.72 12.72l1.42 1.42M1 12h2m18 0h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>',
  back: '<svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg>',
  fsEnter: '<svg class="fs-enter" aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M8 3H3v5M16 3h5v5M8 21H3v-5M16 21h5v-5"/></svg>',
  fsExit: '<svg class="fs-exit" aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 8h5V3M21 8h-5V3M3 16h5v5M21 16h-5v5"/></svg>',
  play: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>',
};
export { ICONS };

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
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800&display=swap">
  <link rel="stylesheet" href="${site.assets.css}">
  <script defer src="${site.assets.js}"></script>
  <link rel="icon" href="/favicon.ico" sizes="any">
  <link rel="icon" type="image/png" sizes="96x96" href="/favicon-96x96.png">
  <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png">
  <link rel="manifest" href="/manifest.json">
  <meta name="theme-color" content="${esc(site.config.themeColor)}">
  <meta name="robots" content="${site.isPreview || p.noindex ? 'noindex,nofollow' : 'index,follow'}">
  <meta name="description" content="${esc(p.description)}">
  ${p.keywords?.length ? `<meta name="keywords" content="${esc(p.keywords.join(', '))}">` : ''}
  ${p.author ? `<meta name="author" content="${esc(p.author)}">` : ''}
  ${p.noCanonical ? '' : `<link rel="canonical" href="${esc(canonical)}">`}
  <meta property="og:locale" content="en_US">
  <meta property="og:type" content="website">
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
${p.body}
</body>
</html>
`;
}

export function header(site, { variant = 'site', gameTitle = '' } = {}) {
  const s = T;
  const left = variant === 'game'
    ? `<a href="/" class="header-btn" aria-label="${esc(s.backHome)}" title="${esc(s.home)}">${ICONS.back}</a>
        <span class="header-game-title">${esc(gameTitle)}</span>`
    : `<a href="/" class="logo" aria-label="${esc(site.config.name)} — ${esc(s.home)}"><img src="/favicon-32x32.png" alt="" width="32" height="32"><span class="logo-text">${esc(site.config.name)}</span></a>`;
  const fs = variant === 'game'
    ? `<button class="header-btn" id="fs-btn" aria-label="${esc(s.fullscreen)}" title="${esc(s.fullscreen)}" data-label-enter="${esc(s.fullscreen)}" data-label-exit="${esc(s.exitFullscreen)}">${ICONS.fsEnter}${ICONS.fsExit}</button>`
    : '';
  return `<header class="site-header">
    <div class="header-inner">
        ${left}
        ${site.isPreview ? `<span class="preview-pill" title="${esc(s.previewNotice)}">${esc(s.previewBadge)}</span>` : ''}
        <span class="spacer"></span>
        <button class="header-btn" id="theme-toggle" aria-label="${esc(s.toggleTheme)}" title="${esc(s.toggleTheme)}">${ICONS.moon}${ICONS.sun}</button>
        ${fs}
    </div>
  </header>`;
}

export function footer(site) {
  const s = T;
  const c = site.config;
  return `<footer class="footer">
    <div class="footer__inner">
      <div class="footer__left">
        <div class="footer__brand"><img src="/favicon-32x32.png" alt="" width="30" height="30"><span>${esc(c.name)}</span></div>
        <div class="footer__copy">${s.footerText}</div>
      </div>
      <nav class="footer__links">
        <a href="/">${esc(s.home)}</a>
        <a href="/privacy-policy/">${esc(s.privacy)}</a>
        <a href="mailto:${esc(c.contactEmail)}">${esc(s.contact)}</a>
        <a href="https://github.com/${esc(c.github.org)}" rel="noopener noreferrer">GitHub</a>
        <span class="footer__copy">© ${new Date().getFullYear()} ${esc(c.name)}</span>
      </nav>
    </div>
  </footer>`;
}

export function previewBar(site) {
  return site.isPreview ? `<div class="preview-bar" role="note">${esc(T.previewNotice)}</div>` : '';
}
