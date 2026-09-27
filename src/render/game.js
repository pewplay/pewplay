// Pagina di un gioco: player (iframe) + scheda con descrizione, come si gioca, comandi, giochi correlati.
import { esc } from '../util.js';
import { T } from '../strings.js';
import { layout, header, footer, abs } from './layout.js';
import { gameCard } from './home.js';

export function renderGame(site, game, related) {
  const c = site.config;
  const name = game.title;
  const description = game.description || T.defaultDescription(name);
  const url = `/${game.slug}/`;

  const tags = [
    `<span class="tag">${esc(game.category)}</span>`,
    `<span class="tag tag--muted">${esc(T.players[game.playMode])}</span>`,
    ...game.tags.filter(k => k.toLowerCase() !== game.category.toLowerCase()).slice(0, 8).map(k => `<span class="tag tag--muted">${esc(k)}</span>`),
  ].join('');

  const controls = game.controls.length
    ? `<section class="game-section"><h2>${esc(T.controls)}</h2><div class="controls">${game.controls
      .map(ctrl => `<kbd>${esc(ctrl.input)}</kbd><span>${esc(ctrl.action)}</span>`).join('')}</div></section>`
    : '';

  const byline = [
    game.author ? `${esc(T.by)} ${esc(game.author)}` : '',
    game.updatedAt ? `${esc(T.updated)} <time datetime="${game.updatedAt.slice(0, 10)}">${game.updatedAt.slice(0, 10)}</time>` : '',
  ].filter(Boolean).join(' · ');

  const relatedHtml = related.length
    ? `<section class="related"><h2>${esc(T.moreGames)}</h2><div class="grid">${related.map(g => gameCard(g, { size: 200 })).join('')}</div></section>`
    : '';

  const body = `
  <section class="game-shell" id="game-shell" aria-label="${esc(T.player(name))}">
    ${header(site, { variant: 'game', gameTitle: name })}
    <div class="game-container" data-orientation="${game.orientation}">
      <div class="splash" id="splash"><img class="splash-icon" src="${game.images.preview}" alt="" width="92" height="92" fetchpriority="high"><div class="splash-title">${esc(name)}</div><div class="splash-sub">${esc(T.loading)}</div><div class="spinner"></div></div>
      <iframe id="game-frame" src="/${encodeURI(game.slug)}/play/" allow="fullscreen; gamepad; autoplay; clipboard-write" allowfullscreen title="${esc(name)}"></iframe>
      <div class="rotate-hint">${esc(T.rotate)}</div>
    </div>
  </section>
  <main style="margin-top:0">
    ${site.isPreview ? `<div class="preview-bar" role="note">${esc(T.previewNotice)} · ${esc(game.ref)}@${esc(game.sha.slice(0, 7))}${game.draft ? ` · ${esc(T.badgeDraft)}` : ''}</div>` : ''}
    <div class="game-page">
      <article class="game-info-card">
        <img class="game-info__icon" src="${game.images.preview}" alt="" width="76" height="76">
        <div class="game-info"><h1>${esc(name)}</h1><div class="game-meta">${tags}</div></div>
        <p class="game-desc">${esc(description)}</p>
        ${game.howToPlay ? `<section class="game-section"><h2>${esc(T.howToPlay)}</h2><p>${esc(game.howToPlay)}</p></section>` : ''}
        ${controls}
        ${byline ? `<p class="game-byline">${byline}</p>` : ''}
      </article>
      ${relatedHtml}
    </div>
  </main>
  ${footer(site)}`;

  const videoGame = {
    '@context': 'https://schema.org',
    '@type': 'VideoGame',
    name,
    description,
    url: abs(site, url),
    image: abs(site, game.images.og),
    genre: game.category,
    playMode: game.playMode === 'Both' ? ['SinglePlayer', 'MultiPlayer'] : game.playMode,
    gamePlatform: 'Web Browser',
    operatingSystem: 'Any',
    applicationCategory: 'Game',
    inLanguage: 'en',
    isAccessibleForFree: true,
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD', availability: 'https://schema.org/InStock' },
    publisher: { '@type': 'Organization', name: c.name, url: site.baseUrl },
  };
  if (game.author) videoGame.author = { '@type': 'Person', name: game.author };
  if (game.tags.length) videoGame.keywords = game.tags.join(', ');
  if (game.updatedAt) videoGame.dateModified = game.updatedAt;
  if (game.added) videoGame.datePublished = game.added;

  return layout(site, {
    path: url,
    title: `${T.pageTitle(name)} | ${c.name}`,
    ogTitle: `${name} | ${c.name}`,
    description,
    keywords: game.tags,
    author: game.author,
    ogImage: { url: game.images.og, w: 1200, h: 630, type: 'image/jpeg' },
    jsonLd: [
      videoGame,
      {
        '@context': 'https://schema.org', '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: T.home, item: abs(site, '/') },
          { '@type': 'ListItem', position: 2, name, item: abs(site, url) },
        ],
      },
    ],
    body,
  });
}
