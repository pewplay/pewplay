// Testi dell'interfaccia del sito (in inglese), categorie standard e testi delle pagine di categoria.

export const T = {
  heroTitle: 'Play free browser games. <span>Instantly.</span>',
  heroText: 'No downloads, no installs and no sign-ups. Pick a game and start playing right in your browser.',
  gamesReady: n => (n ? `${n} ${n === 1 ? 'game' : 'games'} ready to play` : 'New games coming soon'),
  emptyTitle: 'No games yet',
  emptyText: 'New games are on the way. Check back soon!',
  searchPlaceholder: 'Search games, categories…',
  searchLabel: 'Search games',
  exploreGames: 'Explore games',
  seeAll: 'See all',
  countWords: ['game', 'games'],
  gamesCount: n => `${n} ${n === 1 ? 'game' : 'games'}`,
  noResults: 'No games found',
  tryAnother: 'Try another search or category.',
  filterLabel: 'Filter by category',
  categoriesLabel: 'Game categories',
  all: 'All',
  badgeNew: 'New',
  badgeDraft: 'Draft',
  previewBadge: 'Preview',
  previewNotice: 'Preview site — built from the preview branches. Not indexed, no ads.',
  play: name => `Play ${name}`,
  playNow: 'Play now',
  home: 'Home',
  backHome: 'Back to home',
  skipToContent: 'Skip to content',
  loading: 'Loading game…',
  fullscreen: 'Fullscreen',
  exitFullscreen: 'Exit fullscreen',
  toggleTheme: 'Toggle theme',
  share: 'Share',
  linkCopied: 'Link copied',
  help: 'How to play',
  close: 'Close',
  about: name => `About ${name}`,
  howToPlay: 'How to play',
  controls: 'Controls',
  tips: 'Tips',
  faq: 'FAQ',
  screenshots: 'Screenshots',
  screenshotAlt: (name, n, total) => `${name} screenshot ${n} of ${total}`,
  coverAlt: name => `${name} game cover`,
  cardAlt: name => `${name} game`,
  moreGames: 'More games',
  moreInfo: 'Game info & more games',
  backToGame: 'Back to game',
  otherCategories: 'Other categories',
  moreIn: cat => `More ${cat.toLowerCase()} games`,
  allDevices: 'Desktop · Tablet · Mobile',
  allDevicesLong: 'Works on desktop, tablet and mobile — no download needed.',
  pageTitle: (name, category) => (category && category !== 'Other' ? `${name} – Play Free Online ${category} Game` : `${name} – Play Free Online`),
  homeTitle: (siteName, tagline) => `${siteName} – ${tagline}, No Download`,
  categoryTitle: label => `Free ${label} – Play Online, No Download`,
  defaultDescription: name => `Play ${name} for free online — no download needed.`,
  privacy: 'Privacy & Cookies',
  contact: 'Contact',
  footerText: 'Free browser games.<br>No downloads. Just play.',
  rotate: 'Rotate your device for the best experience',
  by: 'By',
  updated: 'Updated',
  players: { SinglePlayer: '1 player', MultiPlayer: 'Multiplayer', Both: '1+ players' },
  notFoundText: "This page doesn't exist — but there are plenty of games to play.",
  notFoundTitle: 'Page Not Found',
  notFoundSearch: 'Search for a game',
  tryThese: 'Try one of these',
  player: name => `${name} game player`,
};

// Categorie standard. Una categoria diversa viene mostrata così com'è (con un avviso nel controllo).
export const CATEGORIES = ['Action', 'Arcade', 'Board', 'Card', 'Casual', 'Educational', 'Puzzle', 'Racing', 'Sports', 'Strategy', 'Other'];

// Testi delle pagine di categoria (/puzzle-games/ …): titolo e introduzione, importanti per Google.
export const CATEGORY_INFO = {
  Action: {
    label: 'Action Games',
    intro: 'Fast reflexes, quick decisions and non-stop movement. Our free action games load instantly in your browser — dodge, shoot, slice and survive without downloading anything.',
  },
  Arcade: {
    label: 'Arcade Games',
    intro: 'Classic arcade fun, ready in one click. Chase high scores in timeless favorites and new twists on retro gameplay — free to play online on desktop, tablet and mobile.',
  },
  Board: {
    label: 'Board Games',
    intro: 'Strategy on a grid: play chess, tic-tac-toe and other board games for free in your browser. No sign-up, no download — just think ahead and make your move.',
  },
  Card: {
    label: 'Card Games',
    intro: 'Relax with free online card games like solitaire. Shuffle, stack and clear the table right in your browser, on any device, without installing anything.',
  },
  Casual: {
    label: 'Casual Games',
    intro: 'Short, simple and satisfying: casual games you can pick up in seconds and play for as long as you like. Free, instant and perfect for a quick break.',
  },
  Educational: {
    label: 'Educational Games',
    intro: 'Learn while you play. Free educational games that train math, geometry, colors and logic — great for kids and adults, right in the browser.',
  },
  Puzzle: {
    label: 'Puzzle Games',
    intro: 'Train your brain with free puzzle games: numbers, logic, memory and more. Every puzzle runs in your browser, saves nothing to your device and is ready in a click.',
  },
  Racing: {
    label: 'Racing Games',
    intro: 'Hit the gas with free online racing games. Steer, drift and beat the clock directly in your browser — no download needed.',
  },
  Sports: {
    label: 'Sports Games',
    intro: 'Play free sports games online: quick matches, simple controls and plenty of competition, alone or with a friend on the same device.',
  },
  Strategy: {
    label: 'Strategy Games',
    intro: 'Plan, adapt and outsmart your opponent. Free strategy games that reward careful thinking, playable instantly in your browser.',
  },
  Other: {
    label: 'More Games',
    intro: 'Unique games that do not fit a single category. Discover something different — free to play online, no download needed.',
  },
};

export function categoryInfo(category) {
  return CATEGORY_INFO[category] || {
    label: `${category} Games`,
    intro: `Play free ${category.toLowerCase()} games online. Every game runs instantly in your browser on desktop, tablet and mobile — no download needed.`,
  };
}

/** "Puzzle" → "puzzle-games" (indirizzo della pagina di categoria). */
export function categorySlug(category) {
  return `${category.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'other'}-games`;
}
