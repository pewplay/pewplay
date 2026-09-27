// Pagina di categoria (/puzzle-games/ …): introduzione, tutti i giochi della categoria, altre categorie.
import { esc } from '../util.js';
import { T } from '../strings.js';
import { layout, header, footer, previewBar, breadcrumb, breadcrumbLd, abs, picture, ICONS } from './layout.js';

// Quante altre categorie mostrare in fondo alla pagina di una categoria; le altre sono in /categories/
const OTHER_CATEGORIES_SHOWN = 12;
import { gameCard } from './home.js';

export function renderCategory(site, cat) {
  const c = site.config;
  const url = `/${cat.slug}/`;
  const crumbs = [{ name: T.home, url: '/' }, { name: cat.label, url }];
  const others = (site.categories || []).filter(x => x.slug !== cat.slug);
  const first = cat.games[0];

  const body = `
  ${header(site)}
  <main id="main">
    ${previewBar(site)}
    <div class="page">
      ${breadcrumb(crumbs)}
      <header class="page-head">
        <h1>${esc(cat.label)}</h1>
        <p class="page-intro">${esc(cat.intro)}</p>
        <p class="page-count">${esc(T.gamesCount(cat.games.length))}</p>
      </header>
      <div class="grid">${cat.games.map((g, i) => gameCard(g, { lazy: i > 9 })).join('')}</div>
      ${others.length ? `<nav class="other-cats" aria-label="${esc(T.categoriesLabel)}"><h2>${esc(T.otherCategories)}</h2><div class="pill-row">${others.slice(0, OTHER_CATEGORIES_SHOWN).map(o => `<a class="pill" href="/${o.slug}/">${esc(o.label)} <span>${o.games.length}</span></a>`).join('')}<a class="pill pill--all" href="/categories/">${esc(T.allCategories)} ${ICONS.arrow}</a></div></nav>` : ''}
    </div>
  </main>
  ${footer(site)}`;

  return layout(site, {
    path: url,
    title: `${T.categoryTitle(cat.label)} | ${c.name}`,
    ogTitle: `${cat.label} | ${c.name}`,
    description: cat.intro,
    ogImage: first ? { url: first.images.og, w: 1200, h: 630, type: 'image/jpeg' } : site.homeOg,
    jsonLd: [
      {
        '@context': 'https://schema.org',
        '@type': 'CollectionPage',
        name: cat.label,
        description: cat.intro,
        url: abs(site, url),
        isPartOf: { '@type': 'WebSite', name: c.name, url: `${site.baseUrl}/` },
        mainEntity: {
          '@type': 'ItemList',
          numberOfItems: cat.games.length,
          itemListElement: cat.games.map((g, i) => ({ '@type': 'ListItem', position: i + 1, url: abs(site, `/${g.slug}/`), name: g.title })),
        },
      },
      breadcrumbLd(site, crumbs),
    ],
    body,
  });
}

/** /categories/: tutte le categorie, ognuna con le icone dei suoi primi giochi. */
export function renderAllCategories(site) {
  const c = site.config;
  const url = '/categories/';
  const crumbs = [{ name: T.home, url: '/' }, { name: T.allCategories, url }];
  const cats = site.categories || [];
  const tile = cat => `<a class="cat-tile" href="/${cat.slug}/">
        <span class="cat-tile__icons">${cat.games.slice(0, 3).map(g => picture(g.images.preview, { alt: '', sizes: '56px', width: 512, height: 512 })).join('')}</span>
        <span class="cat-tile__name">${esc(cat.label)}</span>
        <span class="cat-tile__count">${esc(T.gamesCount(cat.games.length))}</span>
      </a>`;

  const body = `
  ${header(site)}
  <main id="main">
    ${previewBar(site)}
    <div class="page">
      ${breadcrumb(crumbs)}
      <header class="page-head">
        <h1>${esc(T.allCategoriesTitle)}</h1>
        <p class="page-intro">${esc(T.allCategoriesIntro)}</p>
      </header>
      <div class="cat-grid">${cats.map(tile).join('')}</div>
    </div>
  </main>
  ${footer(site)}`;

  return layout(site, {
    path: url,
    title: `${T.allCategoriesTitle} | ${c.name}`,
    ogTitle: `${T.allCategoriesTitle} | ${c.name}`,
    description: T.allCategoriesIntro,
    ogImage: site.homeOg,
    jsonLd: [
      {
        '@context': 'https://schema.org',
        '@type': 'CollectionPage',
        name: T.allCategoriesTitle,
        description: T.allCategoriesIntro,
        url: abs(site, url),
        isPartOf: { '@type': 'WebSite', name: c.name, url: `${site.baseUrl}/` },
        mainEntity: {
          '@type': 'ItemList',
          numberOfItems: cats.length,
          itemListElement: cats.map((x, i) => ({ '@type': 'ListItem', position: i + 1, url: abs(site, `/${x.slug}/`), name: x.label })),
        },
      },
      breadcrumbLd(site, crumbs),
    ],
    body,
  });
}
