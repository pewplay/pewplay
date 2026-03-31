const fs = require('fs');
const { execSync } = require('child_process');
const path = require('path');

// ============================================================
//  CONFIGURAZIONE CENTRALIZZATA
//  Cambia SOLO qui per adattare dominio, nome e lingua.
//  Puoi anche sovrascrivere con variabili d'ambiente.
// ============================================================
const ORG_NAME    = process.env.ORG_NAME;
const GH_TOKEN    = process.env.GH_TOKEN;
const TOPIC_TAG   = 'web-game';
const OUTPUT_DIR   = './dist';
const TEMPLATES_DIR = path.join(__dirname, 'templates');

const SITE_URL     = process.env.SITE_URL     || 'https://www.pewplay.com';
const SITE_NAME    = process.env.SITE_NAME    || 'PewPlay';
const SITE_TAGLINE = process.env.SITE_TAGLINE || 'Free Online Games';
const SITE_DESC    = process.env.SITE_DESC    || 'Play the best free online games directly in your browser. No downloads, no installs — just play.';
const SITE_LANG    = process.env.SITE_LANG    || 'en';
const THEME_COLOR  = '#6C5CE7';

// ============================================================
//  UTILITÀ
// ============================================================
function esc(s) {
  return (s || '').replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

function prettifySlug(slug) {
  return slug.replace(/[-_]/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

// ============================================================
//  CSS CONDIVISO — LIGHT/DARK MODE CON CSS VARIABLES
// ============================================================
const COMMON_STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800&display=swap');

  /* ── TEMA ───────────────────────────────────── */
  :root {
    --accent: #7C5CFC;
    --accent-soft: rgba(124,92,252,.12);
    --accent-glow: rgba(124,92,252,.35);
    --radius: 14px;
    --header-h: 52px;
    --font: 'Outfit', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;

    /* Light (default) */
    --bg:       #f4f3f8;
    --bg-card:  #ffffff;
    --bg-header: #ffffff;
    --bg-input: #eeedf3;
    --border:   #e0dfe6;
    --text:     #1a1a2e;
    --text-2:   #6b6b80;
    --text-3:   #9d9db0;
    --shadow-card: 0 2px 12px rgba(0,0,0,.06);
    --shadow-card-hover: 0 12px 32px rgba(124,92,252,.15);
    --header-shadow: 0 1px 0 var(--border);
    --overlay-name: linear-gradient(transparent 40%, rgba(0,0,0,.75));
    color-scheme: light dark;
  }

  /* Dark */
  [data-theme="dark"] {
    --bg:       #0e0e14;
    --bg-card:  #1a1a26;
    --bg-header: #141420;
    --bg-input: #1e1e2e;
    --border:   #2a2a3c;
    --text:     #e8e8f0;
    --text-2:   #8888a0;
    --text-3:   #555568;
    --shadow-card: 0 2px 12px rgba(0,0,0,.25);
    --shadow-card-hover: 0 12px 32px rgba(124,92,252,.2);
    --header-shadow: 0 1px 0 rgba(255,255,255,.06);
    --overlay-name: linear-gradient(transparent 30%, rgba(0,0,0,.88));
  }

  @media (prefers-color-scheme: dark) {
    :root:not([data-theme="light"]) {
      --bg:       #0e0e14;
      --bg-card:  #1a1a26;
      --bg-header: #141420;
      --bg-input: #1e1e2e;
      --border:   #2a2a3c;
      --text:     #e8e8f0;
      --text-2:   #8888a0;
      --text-3:   #555568;
      --shadow-card: 0 2px 12px rgba(0,0,0,.25);
      --shadow-card-hover: 0 12px 32px rgba(124,92,252,.2);
      --header-shadow: 0 1px 0 rgba(255,255,255,.06);
      --overlay-name: linear-gradient(transparent 30%, rgba(0,0,0,.88));
    }
  }

  /* ── RESET ──────────────────────────────────── */
  *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
  body{
    font-family:var(--font);
    background:var(--bg);
    color:var(--text);
    -webkit-font-smoothing:antialiased;
    transition: background .3s, color .3s;
  }

  /* ── HEADER ─────────────────────────────────── */
  header{
    background:var(--bg-header);
    color:var(--text);
    height:var(--header-h);
    display:flex;align-items:center;
    padding:0 20px;position:fixed;
    top:0;left:0;right:0;z-index:1000;
    box-shadow:var(--header-shadow);
    gap:12px;
    transition: background .3s, box-shadow .3s;
  }
  header .logo{
    display:flex;align-items:center;gap:10px;
    text-decoration:none;color:var(--text);
    font-weight:800;font-size:19px;letter-spacing:-.3px;
  }
  header .logo img{width:30px;height:30px;border-radius:8px}
  header .back-btn{
    display:inline-flex;align-items:center;justify-content:center;
    width:34px;height:34px;border-radius:10px;
    background:var(--accent-soft);color:var(--accent);
    text-decoration:none;font-size:18px;
    transition:background .2s,transform .15s;
  }
  header .back-btn:hover{background:var(--accent);color:#fff;transform:scale(1.05)}
  header .game-title{
    font-weight:600;font-size:15px;
    white-space:nowrap;overflow:hidden;text-overflow:ellipsis;
  }
  header .spacer{flex:1}

  /* ── THEME TOGGLE ───────────────────────────── */
  .theme-toggle{
    display:inline-flex;align-items:center;justify-content:center;
    width:34px;height:34px;border-radius:10px;
    background:var(--accent-soft);
    border:none;cursor:pointer;
    color:var(--text-2);
    transition:background .2s,color .2s,transform .15s;
  }
  .theme-toggle:hover{background:var(--accent);color:#fff;transform:scale(1.05)}
  .theme-toggle svg{width:18px;height:18px}
  .theme-toggle .icon-sun{display:none}
  .theme-toggle .icon-moon{display:block}
  [data-theme="dark"] .theme-toggle .icon-sun{display:block}
  [data-theme="dark"] .theme-toggle .icon-moon{display:none}
  @media(prefers-color-scheme:dark){
    :root:not([data-theme="light"]) .theme-toggle .icon-sun{display:block}
    :root:not([data-theme="light"]) .theme-toggle .icon-moon{display:none}
  }

  main{margin-top:var(--header-h)}
`;

// ── THEME TOGGLE BUTTON HTML ──
const THEME_TOGGLE_HTML = `
  <button class="theme-toggle" id="theme-toggle" aria-label="Toggle theme" title="Toggle theme">
    <svg class="icon-moon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
      <path d="M21 12.79A9 9 0 1111.21 3a7 7 0 009.79 9.79z"/>
    </svg>
    <svg class="icon-sun" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
      <circle cx="12" cy="12" r="5"/><path d="M12 1v2m0 18v2M4.22 4.22l1.42 1.42m12.72 12.72l1.42 1.42M1 12h2m18 0h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/>
    </svg>
  </button>
`;

// ── THEME TOGGLE SCRIPT ──
const THEME_TOGGLE_SCRIPT = `
<script>
(function(){
  var root = document.documentElement;
  var btn = document.getElementById('theme-toggle');
  var stored = localStorage.getItem('theme');
  if (stored) root.setAttribute('data-theme', stored);

  btn.addEventListener('click', function(){
    var isDark = root.getAttribute('data-theme') === 'dark' ||
      (!root.getAttribute('data-theme') && window.matchMedia('(prefers-color-scheme:dark)').matches);
    var next = isDark ? 'light' : 'dark';
    root.setAttribute('data-theme', next);
    localStorage.setItem('theme', next);
  });
})();
<\/script>
`;

// ============================================================
//  RICERCA IMMAGINI NEL REPO DEL GIOCO
//  Cerca in ordine di priorità: OG dedicata > preview > screenshot > thumb
// ============================================================
const OG_IMAGE_CANDIDATES = [
  'og.png', 'og.jpg', 'og.webp',
  'preview.png', 'preview.jpg', 'preview.webp',
  'screenshot.png', 'screenshot.jpg', 'screenshot.webp',
  'thumb.png', 'thumb.jpg', 'thumb.webp',
  'cover.png', 'cover.jpg', 'cover.webp',
  'banner.png', 'banner.jpg', 'banner.webp',
];

function findGameImage(gameDir, slug) {
  for (const file of OG_IMAGE_CANDIDATES) {
    if (fs.existsSync(path.join(gameDir, file))) {
      return `/${slug}/${file}`;
    }
  }
  // Fallback: placeholder
  return `https://placehold.co/1200x630/6C5CE7/fff?text=${encodeURIComponent(prettifySlug(slug))}`;
}

// Cerca anche screenshot multipli per JSON-LD
function findScreenshots(gameDir, slug) {
  const shots = [];
  // Cerca screenshot-1.png, screenshot-2.png, ecc.
  for (let i = 1; i <= 5; i++) {
    for (const ext of ['png','jpg','webp']) {
      const f = `screenshot-${i}.${ext}`;
      if (fs.existsSync(path.join(gameDir, f))) {
        shots.push(`/${slug}/${f}`);
      }
    }
  }
  return shots;
}

// ============================================================
//  LETTURA seo.json ARRICCHITO
//  Formato supportato:
//  {
//    "title": "Space Invaders",
//    "description": "Classic arcade shooter...",
//    "keywords": ["arcade", "shooter", "retro"],
//    "category": "Arcade",
//    "author": "Studio Name",
//    "image": "og.png",         ← path relativo nel repo
//    "playMode": "MultiPlayer"  ← default: SinglePlayer
//  }
// ============================================================
function readGameSeo(gameDir, slug, repoDescription) {
  const defaults = {
    title: prettifySlug(slug),
    description: repoDescription || `Play ${prettifySlug(slug)} for free online — no download needed.`,
    keywords: [],
    category: 'Game',
    author: '',
    image: null,
    playMode: 'SinglePlayer',
  };

  const seoFile = path.join(gameDir, 'seo.json');
  if (!fs.existsSync(seoFile)) return defaults;

  try {
    const custom = JSON.parse(fs.readFileSync(seoFile, 'utf8'));
    return {
      title:       custom.title       || defaults.title,
      description: custom.description || defaults.description,
      keywords:    Array.isArray(custom.keywords) ? custom.keywords : defaults.keywords,
      category:    custom.category    || defaults.category,
      author:      custom.author      || defaults.author,
      image:       custom.image       || null,     // path relativo tipo "og.png"
      playMode:    custom.playMode    || defaults.playMode,
    };
  } catch {
    console.warn(`   ⚠️ seo.json non valido in ${slug}`);
    return defaults;
  }
}

// ============================================================
//  GENERATORI HTML <head>
// ============================================================
function headTags(pageTitle, canonicalUrl) {
  return `
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${esc(pageTitle)}</title>
  <link rel="icon" type="image/png" sizes="32x32"  href="/icon-32.png">
  <link rel="icon" type="image/png" sizes="192x192" href="/icon-192.png">
  <link rel="apple-touch-icon" href="/icon-192.png">
  <link rel="manifest" href="/manifest.json">
  <meta name="theme-color" content="${THEME_COLOR}">
  <meta name="robots" content="index,follow">
  ${canonicalUrl ? `<link rel="canonical" href="${canonicalUrl}">` : ''}
  <script>if('serviceWorker' in navigator){window.addEventListener('load',()=>navigator.serviceWorker.register('/service-worker.js'))}</script>
  `;
}

function seoTags(title, description, image, url, type = 'website', keywords = []) {
  const absImg = image.startsWith('http') ? image : SITE_URL + image;
  return `
  <meta name="description" content="${esc(description)}">
  ${keywords.length ? `<meta name="keywords" content="${esc(keywords.join(', '))}">` : ''}
  <meta property="og:type" content="${type}">
  <meta property="og:site_name" content="${esc(SITE_NAME)}">
  <meta property="og:title" content="${esc(title)}">
  <meta property="og:description" content="${esc(description)}">
  <meta property="og:image" content="${absImg}">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  ${url ? `<meta property="og:url" content="${esc(url)}">` : ''}
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${esc(title)}">
  <meta name="twitter:description" content="${esc(description)}">
  <meta name="twitter:image" content="${absImg}">
  `;
}

function gameJsonLd(g) {
  const ld = {
    "@context": "https://schema.org",
    "@type": "VideoGame",
    name: g.name,
    description: g.description,
    url: SITE_URL + g.url,
    image: absUrl(g.img),
    playMode: g.playMode || "SinglePlayer",
    applicationCategory: g.category || "Game",
    gamePlatform: "Web Browser",
    operatingSystem: "Any",
    inLanguage: SITE_LANG,
    offers: { "@type": "Offer", price: "0", priceCurrency: "USD", availability: "https://schema.org/InStock" },
    isAccessibleForFree: true,
  };
  if (g.author)      ld.author = { "@type": "Organization", name: g.author };
  if (g.keywords?.length) ld.keywords = g.keywords.join(', ');
  if (g.screenshots?.length) ld.screenshot = g.screenshots.map(s => absUrl(s));
  return `<script type="application/ld+json">${JSON.stringify(ld)}</script>`;
}

function homeJsonLd(games) {
  return `<script type="application/ld+json">${JSON.stringify({
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE_NAME,
    url: SITE_URL,
    description: SITE_DESC,
    inLanguage: SITE_LANG,
  })}</script>
  <script type="application/ld+json">${JSON.stringify({
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: SITE_TAGLINE,
    numberOfItems: games.length,
    itemListElement: games.map((g, i) => ({
      "@type": "ListItem",
      position: i + 1,
      url: SITE_URL + g.url,
      name: g.name,
    }))
  })}</script>`;
}

function absUrl(p) {
  return p.startsWith('http') ? p : SITE_URL + p;
}

// ============================================================
//  MAIN BUILD
// ============================================================
async function main() {
  console.log(`\n--- BUILD ${SITE_NAME} (${SITE_URL}) ---\n`);

  const gameTemplate  = fs.readFileSync(path.join(TEMPLATES_DIR, 'game.html'), 'utf8');
  const indexTemplate = fs.readFileSync(path.join(TEMPLATES_DIR, 'index.html'), 'utf8');

  if (!GH_TOKEN || !ORG_NAME) {
    console.error('ERRORE: Imposta GH_TOKEN e ORG_NAME come variabili d\'ambiente.');
    process.exit(1);
  }

  // 1. Pulisci
  if (fs.existsSync(OUTPUT_DIR)) fs.rmSync(OUTPUT_DIR, { recursive: true });
  fs.mkdirSync(OUTPUT_DIR);

  // 2. Fetch repo
  const headers = { Authorization: `token ${GH_TOKEN}`, 'User-Agent': 'Build-Script' };
  const res = await fetch(`https://api.github.com/orgs/${ORG_NAME}/repos?per_page=100`, { headers });
  if (!res.ok) { console.error(`GitHub API ${res.status}`); process.exit(1); }

  const repos = await res.json();
  const gameRepos = repos.filter(r => r.topics?.includes(TOPIC_TAG));
  console.log(`Trovati ${gameRepos.length} giochi.\n`);

  const gamesData = [];

  // 3. Processa ogni gioco
  for (const repo of gameRepos) {
    console.log(`📦 ${repo.name}`);
    const gameDir = path.join(OUTPUT_DIR, repo.name);
    const authUrl = `https://${GH_TOKEN}@github.com/${ORG_NAME}/${repo.name}.git`;

    try {
      execSync(`git clone --depth 1 --quiet ${authUrl} ${gameDir}`);
      fs.rmSync(path.join(gameDir, '.git'), { recursive: true, force: true });

      // Leggi SEO dal repo (seo.json + fallback)
      const seo = readGameSeo(gameDir, repo.name, repo.description);

      // Immagine OG: priorità a seo.json > ricerca automatica
      let imgPath;
      if (seo.image && fs.existsSync(path.join(gameDir, seo.image))) {
        imgPath = `/${repo.name}/${seo.image}`;
      } else {
        imgPath = findGameImage(gameDir, repo.name);
      }

      // Screenshot aggiuntivi per JSON-LD
      const screenshots = findScreenshots(gameDir, repo.name);

      const gameUrl = `/${repo.name}/`;
      const canonical = SITE_URL + gameUrl;
      const pageTitle = `${seo.title} — Play Free | ${SITE_NAME}`;
      const game = {
        name: seo.title,
        description: seo.description,
        keywords: seo.keywords,
        category: seo.category,
        author: seo.author,
        playMode: seo.playMode,
        url: gameUrl,
        img: imgPath,
        screenshots,
        slug: repo.name,
      };

      // Rinomina index → internal e crea wrapper
      const origIndex = path.join(gameDir, 'index.html');
      if (fs.existsSync(origIndex)) {
        fs.renameSync(origIndex, path.join(gameDir, 'internal.html'));

        const html = gameTemplate
          .replace('{{LANG}}',      SITE_LANG)
          .replace('{{HEAD_TAGS}}',  headTags(pageTitle, canonical))
          .replace('{{SEO_TAGS}}',   seoTags(seo.title, seo.description, imgPath, canonical, 'game', seo.keywords))
          .replace('{{JSON_LD}}',    gameJsonLd(game))
          .replace('{{STYLES}}',     COMMON_STYLES)
          .replace('{{SITE_NAME}}',  esc(SITE_NAME))
          .replace(/{{TITLE}}/g,     esc(seo.title))
          .replace('{{THEME_TOGGLE}}', THEME_TOGGLE_HTML)
          .replace('{{THEME_SCRIPT}}', THEME_TOGGLE_SCRIPT);

        fs.writeFileSync(origIndex, html);
        console.log(`   ✓ wrapper → ${gameUrl}`);
      } else {
        console.warn(`   ⚠️ nessun index.html`);
      }

      gamesData.push(game);
    } catch (e) {
      console.error(`   ❌ ${e.message}`);
    }
  }

  // 4. Home Page
  console.log('\n🔨 Home Page');
  const cardsHtml = gamesData.map(g => `
    <a href="${g.url}" class="game-card" aria-label="Play ${esc(g.name)}">
      <img src="${g.img}" alt="${esc(g.name)}" loading="lazy" width="400" height="400">
      <span class="game-card__name">${esc(g.name)}</span>
    </a>`).join('');

  const homeTitle = `${SITE_NAME} — ${SITE_TAGLINE}`;
  const indexHtml = indexTemplate
    .replace('{{LANG}}',         SITE_LANG)
    .replace('{{HEAD_TAGS}}',    headTags(homeTitle, SITE_URL + '/'))
    .replace('{{SEO_TAGS}}',     seoTags(homeTitle, SITE_DESC, '/icon-512.png', SITE_URL + '/'))
    .replace('{{JSON_LD}}',      homeJsonLd(gamesData))
    .replace('{{STYLES}}',       COMMON_STYLES)
    .replace('{{SITE_NAME}}',    esc(SITE_NAME))
    .replace('{{SITE_TAGLINE}}', esc(SITE_TAGLINE))
    .replace('{{GAMES_COUNT}}',  String(gamesData.length))
    .replace('{{GAMES_LIST}}',   cardsHtml)
    .replace('{{GAMES_JSON}}',   JSON.stringify(gamesData.map(g => ({ n: g.name, u: g.url, i: g.img }))))
    .replace('{{THEME_TOGGLE}}', THEME_TOGGLE_HTML)
    .replace('{{THEME_SCRIPT}}', THEME_TOGGLE_SCRIPT);

  fs.writeFileSync(path.join(OUTPUT_DIR, 'index.html'), indexHtml);

  // 5. Assets statici
  console.log('✨ Assets');

  // Manifest — completo per installabilità PWA
  fs.writeFileSync(path.join(OUTPUT_DIR, 'manifest.json'), JSON.stringify({
    id: '/',
    name: `${SITE_NAME} — ${SITE_TAGLINE}`,
    short_name: SITE_NAME,
    description: SITE_DESC,
    start_url: '/',
    scope: '/',
    display: 'standalone',
    orientation: 'any',
    background_color: '#0e0e14',
    theme_color: THEME_COLOR,
    categories: ['games', 'entertainment'],
    lang: SITE_LANG,
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icon-maskable-192.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
      { src: '/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
    ],
    screenshots: [
      { src: '/screenshot-wide.png', sizes: '1280x720', type: 'image/png', form_factor: 'wide', label: SITE_TAGLINE },
      { src: '/screenshot-narrow.png', sizes: '390x844', type: 'image/png', form_factor: 'narrow', label: SITE_TAGLINE }
    ]
  }, null, 2));

  // Robots — solo sitemap
  fs.writeFileSync(path.join(OUTPUT_DIR, 'robots.txt'),
    `Sitemap: ${SITE_URL}/sitemap.xml`);

  // 404
  fs.writeFileSync(path.join(OUTPUT_DIR, '404.html'), `<!DOCTYPE html>
<html lang="${SITE_LANG}">
<head>
  ${headTags('Page Not Found | ' + SITE_NAME, '')}
  <style>
    ${COMMON_STYLES}
    .e{display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:calc(100vh - var(--header-h));text-align:center;padding:20px}
    .e h1{font-size:80px;font-weight:800;color:var(--accent);margin-bottom:4px;letter-spacing:-2px}
    .e p{font-size:16px;color:var(--text-2);margin-bottom:28px;font-weight:400}
    .e a{display:inline-block;padding:12px 32px;background:var(--accent);color:#fff;text-decoration:none;border-radius:12px;font-weight:600;font-family:var(--font);font-size:14px;transition:transform .15s,box-shadow .2s}
    .e a:hover{transform:translateY(-2px);box-shadow:0 8px 24px var(--accent-glow)}
  </style>
</head>
<body>
  <header>
    <a href="/" class="logo"><img src="/icon-32.png" alt="">${SITE_NAME}</a>
    <span class="spacer"></span>
    ${THEME_TOGGLE_HTML}
  </header>
  <main class="e"><h1>404</h1><p>This page doesn't exist.</p><a href="/">Back to Home</a></main>
  ${THEME_TOGGLE_SCRIPT}
</body>
</html>`);

  // Icone — copia tutte le varianti disponibili, fallback su favicon.png
  const iconFiles = [
    'favicon.png', 'icon-32.png', 'icon-192.png', 'icon-512.png',
    'icon-maskable-192.png', 'icon-maskable-512.png',
    'screenshot-wide.png', 'screenshot-narrow.png'
  ];
  const fallback = path.join(__dirname, 'favicon.png');
  for (const f of iconFiles) {
    const src = path.join(__dirname, f);
    const dst = path.join(OUTPUT_DIR, f);
    if (fs.existsSync(src)) {
      fs.copyFileSync(src, dst);
    } else if (!f.startsWith('screenshot') && fs.existsSync(fallback)) {
      // Fallback solo per le icone, non per gli screenshot
      fs.copyFileSync(fallback, dst);
    }
  }

  // 6. Sitemap con supporto immagini (Google Image Sitemap)
  console.log('🗺️  Sitemap');
  const today = new Date().toISOString().split('T')[0];

  function sitemapImageTag(g) {
    if (!g.img || g.img.startsWith('http')) return '';
    return `
      <image:image>
        <image:loc>${SITE_URL}${g.img}</image:loc>
        <image:title>${esc(g.name)}</image:title>
      </image:image>`;
  }

  fs.writeFileSync(path.join(OUTPUT_DIR, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
  <url>
    <loc>${SITE_URL}/</loc>
    <lastmod>${today}</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
${gamesData.map(g => `  <url>
    <loc>${SITE_URL}${g.url}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>${sitemapImageTag(g)}
  </url>`).join('\n')}
</urlset>`);

  // 7. Service Worker (stale-while-revalidate + offline navigation fallback)
  console.log('⚙️  Service Worker');
  fs.writeFileSync(path.join(OUTPUT_DIR, 'service-worker.js'), `
var CACHE='${SITE_NAME.toLowerCase().replace(/[^a-z0-9]/g,'-')}-v2';
var PRECACHE=['/','/index.html','/404.html','/icon-32.png','/icon-192.png','/icon-512.png','/manifest.json'];

self.addEventListener('install',function(e){
  e.waitUntil(caches.open(CACHE).then(function(c){return c.addAll(PRECACHE)}));
  self.skipWaiting();
});

self.addEventListener('activate',function(e){
  e.waitUntil(caches.keys().then(function(ks){
    return Promise.all(ks.filter(function(k){return k!==CACHE}).map(function(k){return caches.delete(k)}));
  }));
  self.clients.claim();
});

self.addEventListener('fetch',function(e){
  if(e.request.method!=='GET')return;

  // Navigation requests: network-first, fallback to cache, then 404
  if(e.request.mode==='navigate'){
    e.respondWith(
      fetch(e.request).then(function(r){
        var clone=r.clone();
        caches.open(CACHE).then(function(c){c.put(e.request,clone)});
        return r;
      }).catch(function(){
        return caches.match(e.request).then(function(c){
          return c||caches.match('/404.html');
        });
      })
    );
    return;
  }

  // Assets: stale-while-revalidate
  e.respondWith(caches.match(e.request).then(function(cached){
    var net=fetch(e.request).then(function(r){
      if(r.ok){var c=r.clone();caches.open(CACHE).then(function(ca){ca.put(e.request,c)})}
      return r;
    }).catch(function(){return cached});
    return cached||net;
  }));
});
`);

  console.log(`\n✅ Build completata — ${gamesData.length} giochi → ${OUTPUT_DIR}/`);
  console.log(`   ${SITE_URL}\n`);
}

main();
