// Pagina di un gioco:
//   - area di gioco: copertina + "Play now"; il gioco (iframe) si carica solo al clic
//   - scheda: titolo, categoria, descrizione, About, How to play, Controls, Tips, Screenshots, FAQ
//   - giochi correlati, finestra "How to play", visualizzatore screenshot
import { esc } from '../util.js';
import { T } from '../strings.js';
import { layout, header, footer, abs, picture, breadcrumb, breadcrumbLd, ICONS } from './layout.js';
import { gameCard } from './home.js';

const paragraphs = text => text.split(/\n\s*\n/).map(p => p.trim()).filter(Boolean)
  .map(p => `<p>${esc(p).replace(/\n/g, '<br>')}</p>`).join('');

function controlsList(controls) {
  return `<dl class="controls">${controls.map(c => `<dt><kbd>${esc(c.input)}</kbd></dt><dd>${esc(c.action)}</dd>`).join('')}</dl>`;
}

export function renderGame(site, game, related) {
  const c = site.config;
  const name = game.title;
  const description = game.description || T.defaultDescription(name);
  const url = `/${game.slug}/`;
  const playUrl = `/${encodeURI(game.slug)}/play/`;
  const cat = game.categoryPage;
  const crumbs = [{ name: T.home, url: '/' }, ...(cat ? [{ name: cat.label, url: `/${cat.slug}/` }] : []), { name, url }];
  const hasHelp = !!(game.howToPlay || game.controls.length || game.tips.length);
  const shots = game.images.shots;

  const tags = [
    cat ? `<a class="tag" href="/${cat.slug}/">${esc(game.category)}</a>` : `<span class="tag">${esc(game.category)}</span>`,
    `<span class="tag tag--muted">${esc(T.players[game.playMode])}</span>`,
    `<span class="tag tag--muted" title="${esc(T.allDevicesLong)}">${ICONS.devices}${esc(T.allDevices)}</span>`,
    ...game.tags.filter(k => k.toLowerCase() !== game.category.toLowerCase()).slice(0, 6).map(k => `<span class="tag tag--muted">${esc(k)}</span>`),
  ].join('');

  const sections = [];
  if (game.about) sections.push(`<section class="game-section" aria-labelledby="about-h"><h2 id="about-h">${esc(T.about(name))}</h2>${paragraphs(game.about)}</section>`);
  if (game.howToPlay) sections.push(`<section class="game-section" aria-labelledby="how-h"><h2 id="how-h">${esc(T.howToPlay)}</h2>${paragraphs(game.howToPlay)}</section>`);
  if (game.controls.length) sections.push(`<section class="game-section" aria-labelledby="ctrl-h"><h2 id="ctrl-h">${esc(T.controls)}</h2>${controlsList(game.controls)}</section>`);
  if (game.tips.length) sections.push(`<section class="game-section" aria-labelledby="tips-h"><h2 id="tips-h">${esc(T.tips)}</h2><ul class="tips">${game.tips.map(t => `<li>${esc(t)}</li>`).join('')}</ul></section>`);
  if (shots.length) {
    sections.push(`<section class="game-section" aria-labelledby="shots-h"><h2 id="shots-h">${esc(T.screenshots)}</h2>
      <ul class="shots">${shots.map((s, i) => `<li><button type="button" class="shot" data-full="${s.full}" data-index="${i}" aria-label="${esc(T.screenshotAlt(name, i + 1, shots.length))}">
        <img src="${s.thumb}" alt="${esc(T.screenshotAlt(name, i + 1, shots.length))}" width="480" height="270" loading="lazy" decoding="async"></button></li>`).join('')}</ul></section>`);
  }
  if (game.faq.length) {
    sections.push(`<section class="game-section" aria-labelledby="faq-h"><h2 id="faq-h">${esc(T.faq)}</h2>
      <div class="faq">${game.faq.map(f => `<details><summary>${esc(f.question)}</summary>${paragraphs(f.answer)}</details>`).join('')}</div></section>`);
  }

  const byline = [
    game.author ? `${esc(T.by)} ${esc(game.author)}` : '',
    game.updatedAt ? `${esc(T.updated)} <time datetime="${game.updatedAt.slice(0, 10)}">${game.updatedAt.slice(0, 10)}</time>` : '',
  ].filter(Boolean).join(' · ');

  const sameCategory = related.length && related.every(g => g.category === game.category);
  const relatedHtml = related.length
    ? `<section class="related" aria-labelledby="related-h">
        <div class="shelf__head"><h2 id="related-h">${esc(sameCategory ? T.moreIn(game.category) : T.moreGames)}</h2>
        ${cat ? `<a class="shelf__more" href="/${cat.slug}/">${esc(T.seeAll)} ${ICONS.arrow}</a>` : ''}</div>
        <div class="grid grid--related">${related.map(g => gameCard(g, { sizes: '(min-width:900px) 170px, (min-width:560px) 30vw, 45vw' })).join('')}</div></section>`
    : '';

  const helpDialog = hasHelp
    ? `<dialog class="modal" id="help-dialog" aria-labelledby="help-title">
        <div class="modal__head"><h2 id="help-title">${esc(T.help)}</h2><button type="button" class="header-btn" data-close aria-label="${esc(T.close)}">${ICONS.close}</button></div>
        <div class="modal__body">
          ${game.howToPlay ? paragraphs(game.howToPlay) : ''}
          ${game.controls.length ? `<h3>${esc(T.controls)}</h3>${controlsList(game.controls)}` : ''}
          ${game.tips.length ? `<h3>${esc(T.tips)}</h3><ul class="tips">${game.tips.map(t => `<li>${esc(t)}</li>`).join('')}</ul>` : ''}
        </div>
      </dialog>`
    : '';
  const lightbox = shots.length
    ? `<dialog class="lightbox" id="lightbox" aria-label="${esc(T.screenshots)}">
        <button type="button" class="lightbox__close header-btn" data-close aria-label="${esc(T.close)}">${ICONS.close}</button>
        <img alt="" id="lightbox-img">
        ${shots.length > 1 ? `<button type="button" class="lightbox__nav lightbox__prev header-btn" data-step="-1" aria-label="Previous">${ICONS.back}</button>
        <button type="button" class="lightbox__nav lightbox__next header-btn" data-step="1" aria-label="Next">${ICONS.back}</button>` : ''}
      </dialog>`
    : '';

  const body = `
  <section class="game-shell" id="game-shell" aria-label="${esc(T.player(name))}">
    ${header(site, { variant: 'game', gameTitle: name, hasHelp })}
    <div class="game-container" id="game-container" data-orientation="${game.orientation}" data-src="${playUrl}" data-title="${esc(name)}">
      <div class="facade" id="facade">
        ${picture(game.images.cover, { alt: '', sizes: '100vw', width: 1280, height: 720, lazy: false, priority: true, className: 'facade__bg' })}
        <div class="facade__content">
          ${picture(game.images.preview, { alt: '', sizes: '112px', width: 512, height: 512, lazy: false, className: 'facade__icon' })}
          <p class="facade__title">${esc(name)}</p>
          <button type="button" class="play-btn" id="play-btn">${ICONS.play}<span>${esc(T.playNow)}</span></button>
          <noscript><a class="play-btn" href="${playUrl}">${esc(T.playNow)}</a></noscript>
        </div>
        <div class="facade__loading" aria-live="polite"><div class="spinner"></div><span>${esc(T.loading)}</span></div>
      </div>
      <div class="rotate-hint">${esc(T.rotate)}</div>
    </div>
    <div class="game-bar">
      <span class="game-bar__title">${esc(name)}</span><span class="game-bar__cat">${esc(game.category)}</span>
      <a class="game-bar__more" href="#game-info">${esc(T.moreInfo)}${ICONS.down}</a>
    </div>
  </section>
  <main id="main" class="main--flush">
    ${site.isPreview ? `<div class="preview-bar" role="note">${esc(T.previewNotice)} · ${esc(game.ref)}@${esc(game.sha.slice(0, 7))}${game.draft ? ` · ${esc(T.badgeDraft)}` : ''}</div>` : ''}
    <div class="game-page">
      ${breadcrumb(crumbs)}
      <article class="game-info-card" id="game-info">
        <div class="game-info__head">
          ${picture(game.images.preview, { alt: T.cardAlt(name), sizes: '76px', width: 512, height: 512, className: 'game-info__icon' })}
          <div class="game-info"><h1>${esc(name)}</h1><div class="game-meta">${tags}</div></div>
        </div>
        <p class="game-desc">${esc(description)}</p>
        ${sections.join('\n        ')}
        ${byline ? `<p class="game-byline">${byline}</p>` : ''}
      </article>
      ${relatedHtml}
    </div>
  </main>
  ${helpDialog}
  ${lightbox}
  <div class="toast" id="toast" role="status" aria-live="polite"></div>
  ${footer(site)}`;

  const images = [game.images.cover.webp[1280], game.images.preview.webp[512], game.images.og].map(u => abs(site, u));
  const videoGame = {
    '@context': 'https://schema.org',
    '@type': 'VideoGame',
    name,
    description,
    url: abs(site, url),
    image: images,
    genre: game.category,
    playMode: game.playMode === 'Both' ? ['SinglePlayer', 'MultiPlayer'] : game.playMode,
    gamePlatform: ['Web browser', 'Desktop', 'Mobile', 'Tablet'],
    operatingSystem: 'Any',
    applicationCategory: 'Game',
    inLanguage: 'en',
    isAccessibleForFree: true,
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD', availability: 'https://schema.org/InStock' },
    publisher: { '@type': 'Organization', name: c.name, url: `${site.baseUrl}/` },
  };
  if (shots.length) videoGame.screenshot = shots.map(s => ({ '@type': 'ImageObject', url: abs(site, s.full), width: s.width, height: s.height }));
  if (game.author) videoGame.author = { '@type': 'Person', name: game.author };
  if (game.tags.length) videoGame.keywords = game.tags.join(', ');
  if (game.updatedAt) videoGame.dateModified = game.updatedAt;
  if (game.added) videoGame.datePublished = game.added;
  const jsonLd = [videoGame, breadcrumbLd(site, crumbs)];
  if (game.faq.length) {
    jsonLd.push({
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: game.faq.map(f => ({ '@type': 'Question', name: f.question, acceptedAnswer: { '@type': 'Answer', text: f.answer } })),
    });
  }

  const coverSet = game.images.cover.avif;
  return layout(site, {
    path: url,
    title: `${T.pageTitle(name, game.category)} | ${c.name}`,
    ogTitle: `${name} – Play Free Online | ${c.name}`,
    description,
    author: game.author,
    ogImage: { url: game.images.og, w: 1200, h: 630, type: 'image/jpeg' },
    // La copertina è l'immagine principale della pagina: il browser la scarica subito
    preload: [`<link rel="preload" as="image" type="image/avif" imagesrcset="${Object.entries(coverSet).map(([w, u]) => `${u} ${w}w`).join(', ')}" imagesizes="100vw" fetchpriority="high">`],
    jsonLd,
    body,
  });
}
