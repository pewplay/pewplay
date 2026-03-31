# PewPlay

Static site generator that builds a free online games arcade from GitHub repos.

It scans an organization for repositories tagged `web-game`, clones each one, wraps it in a styled page with SEO metadata, and outputs a full static site ready for deployment.

## Features

- **Zero-config game pages** — each repo becomes a playable page with header, fullscreen button, and iframe wrapper
- **Homepage with instant search** — responsive grid with client-side filtering
- **SEO out of the box** — Open Graph, Twitter Cards, JSON-LD structured data (`VideoGame` schema), canonical URLs, sitemap
- **PWA ready** — manifest, service worker (stale-while-revalidate), touch icons
- **Dark theme** — modern UI with Inter font, hover effects, gradient header
- **Domain-independent** — change site name, URL, language, and tagline via environment variables
- **Custom SEO per game** — optional `seo.json` in each game repo

## Quick Start

```bash
# 1. Clone
git clone https://github.com/your-org/pewplay.git
cd pewplay

# 2. Configure
cp .env.example .env
# Edit .env with your GitHub org name and token

# 3. Build
export $(cat .env | xargs)
npm run build

# 4. Preview
npx serve dist
```

The site is generated in `dist/`.

## Configuration

All settings are controlled via environment variables (or edit the top of `build.js`).

| Variable        | Required | Default                        | Description                  |
|-----------------|----------|--------------------------------|------------------------------|
| `ORG_NAME`      | ✅       | —                              | GitHub organization name     |
| `GH_TOKEN`      | ✅       | —                              | GitHub personal access token |
| `SITE_URL`      | —        | `https://www.pewplay.com`      | Base URL for sitemap & SEO   |
| `SITE_NAME`     | —        | `PewPlay`                      | Brand name shown in header   |
| `SITE_TAGLINE`  | —        | `Free Online Games`            | Subtitle on homepage         |
| `SITE_DESC`     | —        | `Play the best free online…`   | Meta description for homepage|
| `SITE_LANG`     | —        | `en`                           | HTML `lang` attribute        |

## Adding a Game

1. Create a repo in your organization with an `index.html` at the root
2. Add the topic **`web-game`** to the repo
3. *(Optional)* Add images — the builder auto-discovers them in this priority order:
   `og.png` → `preview.png` → `screenshot.png` → `thumb.png` → `cover.png` → `banner.png` (also `.jpg` / `.webp`)
4. *(Optional)* Add `screenshot-1.png`, `screenshot-2.png`, etc. for rich JSON-LD results
5. *(Optional)* Add a `seo.json` for full control over SEO:

```json
{
  "title": "Space Invaders",
  "description": "Classic arcade shooter — defend Earth from alien waves.",
  "keywords": ["arcade", "shooter", "retro", "space"],
  "category": "Arcade",
  "author": "Studio Name",
  "image": "og.png",
  "playMode": "SinglePlayer"
}
```

All fields are optional — missing ones get smart defaults from the repo name and description.

| Field         | Default                          | Notes                                  |
|---------------|----------------------------------|----------------------------------------|
| `title`       | Repo name, prettified            | Used in `<title>`, OG, JSON-LD         |
| `description` | Repo description or auto-gen     | Meta description, OG, JSON-LD          |
| `keywords`    | `[]`                             | `<meta name="keywords">` + JSON-LD     |
| `category`    | `"Game"`                         | JSON-LD `applicationCategory`          |
| `author`      | —                                | JSON-LD `author`                       |
| `image`       | Auto-discovered                  | Relative path to OG image in the repo  |
| `playMode`    | `"SinglePlayer"`                 | `"SinglePlayer"` or `"MultiPlayer"`    |

6. Run `npm run build` — the game appears automatically

## Icons

Place icon files in the project root. Only `favicon.png` is required — it's used as fallback for all sizes.

| File           | Size    | Used for                    |
|----------------|---------|-----------------------------|
| `favicon.png`  | any     | Fallback for all icons      |
| `icon-32.png`  | 32×32   | Browser favicon             |
| `icon-192.png` | 192×192 | PWA icon, Apple touch icon  |
| `icon-512.png` | 512×512 | PWA splash, OG image        |

## Output Structure

```
dist/
├── index.html            # Homepage (game grid + search)
├── 404.html              # Error page
├── manifest.json         # PWA manifest
├── robots.txt            # Crawling rules
├── sitemap.xml           # Auto-generated sitemap
├── service-worker.js     # Offline support
├── icon-32.png
├── icon-192.png
├── icon-512.png
├── favicon.png
└── <game-slug>/          # One folder per game
    ├── index.html        # Wrapper (header + iframe)
    ├── internal.html     # Original game
    └── …                 # Game assets
```

## Deployment

The `dist/` folder is a plain static site. Deploy it anywhere:

- **GitHub Pages** — push `dist/` to a `gh-pages` branch or use a GitHub Action
- **Cloudflare Pages** — connect the repo and set build command to `npm run build`, output dir to `dist`
- **Netlify** — same approach, or drag-and-drop the `dist/` folder
- **Any static host** — just upload the contents of `dist/`

## License

MIT
