// Home page: hero con ricerca, giochi in evidenza, nuovi, una riga per categoria, tutti i giochi.
import { esc } from '../util.js';
import { T } from '../strings.js';
import { layout, header, footer, previewBar, picture, ICONS } from './layout.js';

const CARD_SIZES = '(min-width:1100px) 220px, (min-width:820px) 24vw, (min-width:560px) 31vw, 46vw';

/** Card quadrata di un gioco (home, categorie, correlati, 404). */
export function gameCard(game, { lazy = true, sizes = CARD_SIZES, filterable = false } = {}) {
  const badges = [
    game.draft ? `<span class="badge badge--draft">${esc(T.badgeDraft)}</span>` : '',
    game.isNew ? `<span class="badge">${esc(T.badgeNew)}</span>` : '',
  ].join('');
  const data = filterable
    ? ` data-category="${esc(game.category)}" data-search="${esc([game.title, game.category, ...game.tags].join(' ').toLowerCase())}"`
    : '';
  return `<a href="/${game.slug}/" class="game-card"${data}>
      <div class="game-card__media">
        ${picture(game.images.preview, { alt: T.cardAlt(game.title), sizes, width: 512, height: 512, lazy })}
        <span class="game-card__shade"></span>
        ${badges ? `<span class="game-card__badges">${badges}</span>` : ''}
        <span class="game-card__play" aria-hidden="true">${ICONS.play}</span>
      </div>
      <div class="game-card__body"><span class="game-card__name">${esc(game.title)}</span><span class="game-card__category">${esc(game.category)}</span></div>
    </a>`;
}

/** Card larga con copertina 16:9 (giochi in evidenza). */
function featureCard(game, i) {
  return `<a href="/${game.slug}/" class="feature-card">
      <div class="feature-card__media">
        ${picture(game.images.cover, { alt: T.coverAlt(game.title), sizes: '(min-width:1100px) 400px, (min-width:700px) 45vw, 88vw', width: 1280, height: 720, lazy: i > 1, priority: i === 0 })}
        <span class="feature-card__shade"></span>
      </div>
      <div class="feature-card__body">
        <span class="feature-card__category">${esc(game.category)}</span>
        <span class="feature-card__name">${esc(game.title)}</span>
        ${game.description ? `<span class="feature-card__desc">${esc(game.description)}</span>` : ''}
        <span class="feature-card__cta">${ICONS.play}${esc(T.playNow)}</span>
      </div>
    </a>`;
}

function row({ id, title, href, games, lazyFrom = 0 }) {
  return `<section class="shelf" aria-labelledby="${id}">
      <div class="shelf__head">
        <h2 id="${id}">${href ? `<a href="${href}">${esc(title)}</a>` : esc(title)}</h2>
        ${href ? `<a class="shelf__more" href="${href}">${esc(T.seeAll)} ${ICONS.arrow}</a>` : ''}
      </div>
      <div class="shelf__row">${games.map((g, i) => gameCard(g, { lazy: i >= lazyFrom, sizes: '(min-width:820px) 190px, 40vw' })).join('')}</div>
    </section>`;
}

export function renderHome(site, games) {
  const c = site.config;
  const categories = site.categories || [];
  const featured = games.filter(g => g.featured).slice(0, 6);
  const fresh = games.filter(g => g.isNew && !g.featured).slice(0, 12);
  const chips = [['all', T.all], ...categories.map(cat => [cat.name, cat.name])]
    .map(([key, label], i) => `<button class="category-chip" type="button" data-category="${esc(key)}" aria-pressed="${i === 0}">${esc(label)}</button>`)
    .join('');

  const sections = [];
  if (featured.length) {
    sections.push(`<section class="featured" aria-labelledby="featured-heading">
      <div class="shelf__head"><h2 id="featured-heading">${esc(T.featured)}</h2></div>
      <div class="featured__grid">${featured.map(featureCard).join('')}</div>
    </section>`);
  }
  if (fresh.length) sections.push(row({ id: 'new-heading', title: T.newGames, games: fresh }));
  if (games.length >= 8) {
    for (const cat of categories.filter(x => x.games.length >= 2)) {
      sections.push(row({ id: `cat-${cat.slug}`, title: cat.label, href: `/${cat.slug}/`, games: cat.games.slice(0, 12) }));
    }
  }

  const body = `
  ${header(site)}
  <main id="main">
    ${previewBar(site)}
    <section class="hero">
      <div class="hero__inner">
        <div class="eyebrow"><span class="eyebrow-dot"></span>${esc(T.gamesReady(games.length))}</div>
        <h1>${T.heroTitle}</h1>
        <p>${esc(T.heroText)}</p>
        <form class="search-box" role="search" action="/" method="get" onsubmit="return false">
          ${ICONS.search.replace('<svg', '<svg class="search-icon"')}
          <input type="search" id="search" name="q" placeholder="${esc(T.searchPlaceholder)}" aria-label="${esc(T.searchLabel)}" autocomplete="off">
          <span class="search-kbd" aria-hidden="true">/</span>
        </form>
        ${categories.length ? `<nav class="hero__cats" aria-label="${esc(T.categoriesLabel)}">${categories.map(cat => `<a href="/${cat.slug}/">${esc(cat.label)}</a>`).join('')}</nav>` : ''}
      </div>
    </section>
    <div class="home-sections" id="home-sections">${sections.join('\n')}</div>
    <section class="library" aria-labelledby="games-heading">
      <div class="library-head">
        <h2 id="games-heading">${esc(T.allGames)}</h2>
        <p id="result-count" aria-live="polite" data-format="${esc(JSON.stringify(T.countWords))}">${esc(T.gamesCount(games.length))}</p>
      </div>
      ${games.length ? `<div class="category-row" role="group" aria-label="${esc(T.filterLabel)}">${chips}</div>` : ''}
      <div class="grid" id="grid">
        ${games.map((g, i) => gameCard(g, { lazy: sections.length > 0 || i > 9, filterable: true })).join('')}
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
    title: T.homeTitle(c.name, c.tagline),
    ogTitle: `${c.name} – ${c.tagline}`,
    description: c.description,
    ogImage: site.homeOg,
    jsonLd: [
      {
        '@context': 'https://schema.org', '@type': 'WebSite', name: c.name, url: homeUrl, description: c.description, inLanguage: 'en',
        potentialAction: { '@type': 'SearchAction', target: { '@type': 'EntryPoint', urlTemplate: `${homeUrl}?q={search_term_string}` }, 'query-input': 'required name=search_term_string' },
      },
      {
        '@context': 'https://schema.org', '@type': 'Organization', name: c.name, url: homeUrl,
        logo: `${site.baseUrl}/android-chrome-512x512.png`, email: c.contactEmail,
      },
      {
        '@context': 'https://schema.org', '@type': 'ItemList', name: c.tagline, numberOfItems: games.length,
        itemListElement: games.map((g, i) => ({ '@type': 'ListItem', position: i + 1, url: `${site.baseUrl}/${g.slug}/`, name: g.title })),
      },
    ],
    body,
  });
}
