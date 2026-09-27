// File "di servizio" del sito: sitemap, robots, ads.txt, manifest PWA,
// e il file speciale di Cloudflare Pages _headers.
import { esc, shortHash } from './util.js';

export function sitemapXml(site, games) {
  const today = new Date().toISOString().slice(0, 10);
  const entry = (urlPath, lastmod, images = []) => `  <url>
    <loc>${esc(site.baseUrl + urlPath)}</loc>
    <lastmod>${lastmod}</lastmod>${images.map(img => `
    <image:image><image:loc>${esc(site.baseUrl + img)}</image:loc></image:image>`).join('')}
  </url>`;
  const day = g => (g.updatedAt || today).slice(0, 10);
  const newest = list => list.map(day).sort().pop() || today;
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
${entry('/', newest(games))}
${(site.categories || []).map(c => entry(`/${c.slug}/`, newest(c.games))).join('\n')}
${games.map(g => entry(`/${g.slug}/`, day(g), [g.images.cover.webp[1280], g.images.preview.webp[512], ...g.images.shots.map(s => s.full)])).join('\n')}
${entry('/privacy-policy/', site.config.privacy.updated)}
</urlset>
`;
}

/** Tutti gli URL pubblici del sito (per IndexNow). */
export function siteUrls(site, games) {
  return ['/', ...(site.categories || []).map(c => `/${c.slug}/`), ...games.map(g => `/${g.slug}/`), '/privacy-policy/']
    .map(p => site.baseUrl + p);
}

/** Chiave IndexNow: fissa per ogni sito (derivata dall'indirizzo), pubblicata in /<chiave>.txt. */
export function indexNowKey(site) {
  return shortHash(`indexnow:${site.config.url}`, 32);
}

export function robotsTxt(site) {
  if (site.isPreview) return 'User-agent: *\nDisallow: /\n';
  return `User-agent: *\nAllow: /\n\nSitemap: ${site.baseUrl}/sitemap.xml\n`;
}

export function adsTxt(site) {
  const id = site.config.adsensePublisherId?.replace(/^ca-/, '');
  return id ? `google.com, ${id}, DIRECT, f08c47fec0942fa0\n` : '';
}

export function manifestJson(site) {
  const c = site.config;
  return JSON.stringify({
    id: '/',
    name: `${c.name} — ${c.tagline}`,
    short_name: c.name,
    description: c.description,
    start_url: '/',
    scope: '/',
    display: 'standalone',
    orientation: 'any',
    background_color: '#0e0e14',
    theme_color: c.themeColor,
    categories: ['games', 'entertainment'],
    lang: 'en',
    icons: [
      { src: '/android-chrome-192x192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/android-chrome-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icon-maskable-192.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
      { src: '/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  }, null, 2);
}

/**
 * Il sito non usa un service worker. Questo file serve solo a chi ha visitato la
 * vecchia versione di pewplay.com (che ne registrava uno): lo disattiva e ne svuota la cache.
 */
export function serviceWorkerRemovalJs() {
  return `self.addEventListener('install', function () { self.skipWaiting(); });
self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys()
    .then(function (keys) { return Promise.all(keys.map(function (k) { return caches.delete(k); })); })
    .then(function () { return self.registration.unregister(); }));
});
`;
}

export function headersFile(site) {
  const lines = [
    '/*',
    '  X-Content-Type-Options: nosniff',
    '  Referrer-Policy: strict-origin-when-cross-origin',
    ...(site.isPreview ? ['  X-Robots-Tag: noindex, nofollow'] : []),
    '',
    '/assets/*',
    '  Cache-Control: public, max-age=31536000, immutable',
    '',
    '/service-worker.js',
    '  Cache-Control: no-cache',
    '',
    '/build-info.json',
    '  Cache-Control: no-cache',
    '',
  ];
  return lines.join('\n');
}
