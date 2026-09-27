// Home page: hero, ricerca, filtri per categoria, griglia dei giochi.
import { esc } from '../util.js';
import { T } from '../strings.js';
import { layout, header, footer, previewBar, ICONS } from './layout.js';

export function gameCard(game, { size = 400, lazy = true } = {}) {
  const badges = [
    game.draft ? `<span class="badge badge--draft">${esc(T.badgeDraft)}</span>` : '',
    game.isNew ? `<span class="badge">${esc(T.badgeNew)}</span>` : '',
  ].join('');
  const searchText = [game.title, game.category, ...game.tags].join(' ').toLowerCase();
  return `<a href="/${game.slug}/" class="game-card" data-category="${esc(game.category)}" data-search="${esc(searchText)}" aria-label="${esc(T.play(game.title))}">
      <div class="game-card__media">
        <img src="${game.images.preview}" alt="${esc(game.title)}"${lazy ? ' loading="lazy"' : ''} width="${size}" height="${size}">
        <span class="game-card__shade"></span>
        ${badges ? `<span class="game-card__badges">${badges}</span>` : ''}
        <span class="game-card__play" aria-hidden="true">${ICONS.play}</span>
      </div>
      <div class="game-card__body"><span class="game-card__name">${esc(game.title)}</span><span class="game-card__category">${esc(game.category)}</span></div>
    </a>`;
}

export function renderHome(site, games) {
  const c = site.config;
  const categories = [...new Set(games.map(g => g.category))].sort((a, b) => (a === 'Other') - (b === 'Other') || a.localeCompare(b));
  const chips = [['all', T.all], ...categories.map(cat => [cat, cat])]
    .map(([key, label], i) => `<button class="category-chip" type="button" data-category="${esc(key)}" aria-pressed="${i === 0}">${esc(label)}</button>`)
    .join('');

  const body = `
  ${header(site)}
  <main>
    ${previewBar(site)}
    <section class="hero">
      <div class="hero__inner">
        <div class="eyebrow"><span class="eyebrow-dot"></span>${esc(T.gamesReady(games.length))}</div>
        <h1>${T.heroTitle}</h1>
        <p>${esc(T.heroText)}</p>
        <div class="search-box">
          <svg class="search-icon" aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3"><circle cx="11" cy="11" r="7"/><path d="m21 21-4.35-4.35"/></svg>
          <input type="search" id="search" placeholder="${esc(T.searchPlaceholder)}" aria-label="${esc(T.searchLabel)}" autocomplete="off">
          <span class="search-kbd" aria-hidden="true">/</span>
        </div>
      </div>
    </section>
    <section class="library" aria-labelledby="games-heading">
      <div class="library-head">
        <h2 id="games-heading">${esc(T.exploreGames)}</h2>
        <p id="result-count" aria-live="polite" data-format="${esc(JSON.stringify(T.countWords))}">${esc(T.gamesCount(games.length))}</p>
      </div>
      ${games.length ? `<div class="category-row" role="group" aria-label="${esc(T.filterLabel)}">${chips}</div>` : ''}
      <div class="grid" id="grid">
        ${games.map((g, i) => gameCard(g, { lazy: i > 9 })).join('')}
        ${games.length
    ? `<div class="no-results" id="no-results" hidden><strong>${esc(T.noResults)}</strong>${esc(T.tryAnother)}</div>`
    : `<div class="no-results"><strong>${esc(T.emptyTitle)}</strong>${esc(T.emptyText)}</div>`}
      </div>
    </section>
  </main>
  ${footer(site)}`;

  const homeUrl = `${site.baseUrl}/`;
  return layout(site, {
    path: '/',
    title: `${c.name} — ${c.tagline}`,
    description: c.description,
    ogImage: site.homeOg,
    jsonLd: [
      {
        '@context': 'https://schema.org', '@type': 'WebSite', name: c.name, url: homeUrl, description: c.description, inLanguage: 'en',
        potentialAction: { '@type': 'SearchAction', target: { '@type': 'EntryPoint', urlTemplate: `${homeUrl}?q={search_term_string}` }, 'query-input': 'required name=search_term_string' },
      },
      {
        '@context': 'https://schema.org', '@type': 'ItemList', name: c.tagline, numberOfItems: games.length,
        itemListElement: games.map((g, i) => ({ '@type': 'ListItem', position: i + 1, url: `${site.baseUrl}/${g.slug}/`, name: g.title })),
      },
    ],
    body,
  });
}
