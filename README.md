# PewPlay

Static site generator that turns GitHub repos into a free online games arcade. Zero frameworks, zero databases — just a single Node script that outputs a complete static site.

## How it works

1. Scans a GitHub organization for repos tagged `web-game`
2. Clones them all in parallel
3. Wraps each game in a page with header, SEO, splash screen, and iframe
4. Generates a homepage with game grid, instant search, and light/dark mode
5. Outputs everything to `dist/` — ready to deploy on Cloudflare Pages, Netlify, or any static host

## Quick Start

```bash
git clone https://github.com/your-org/pewplay.git
cd pewplay
cp .env.example .env       # edit with your org name and GitHub token
export $(cat .env | xargs)
npm run build
npx serve dist             # preview locally
```

## Environment Variables

Only `ORG_NAME` and `GH_TOKEN` are required. Everything else has sensible defaults.

| Variable       | Required | Default                      | Description                  |
|----------------|----------|------------------------------|------------------------------|
| `ORG_NAME`     | yes      | —                            | GitHub organization name     |
| `GH_TOKEN`     | yes      | —                            | GitHub personal access token |
| `SITE_URL`     | no       | `https://www.pewplay.com`    | Base URL for sitemap and SEO |
| `SITE_NAME`    | no       | `PewPlay`                    | Brand name in header/footer  |
| `SITE_TAGLINE` | no       | `Free Online Games`          | Subtitle on homepage         |
| `SITE_DESC`    | no       | `Play the best free online…` | Homepage meta description    |
| `SITE_LANG`    | no       | `en`                         | HTML `lang` attribute        |

## Adding a Game

Each game is a separate GitHub repo in your organization. The minimum you need is an `index.html` and the topic `web-game` on the repo. For proper SEO add `game.json` and `preview.png`.

See **[GUIDA.md](GUIDA.md)** for the full step-by-step guide on how to set up a game repo.

### Quick version

```
your-game-repo/
├── index.html       ← your game (loaded in iframe)
├── game.json        ← metadata: title, description, keywords
├── preview.png      ← card image 512×512
├── og.png           ← social share image 1200×630 (optional)
└── …                ← your game files (css, js, assets)
```

`game.json`:
```json
{
  "title": "My Game",
  "description": "A fun free browser game.",
  "keywords": ["arcade", "puzzle"],
  "category": "Arcade",
  "author": "Your Name",
  "playMode": "SinglePlayer"
}
```

All fields are optional. Missing images get auto-generated as placeholder PNGs during the build.

## What Gets Generated

For every game the builder creates a wrapper page with header (back button, game title, theme toggle, fullscreen), a loading splash screen with the preview image, full SEO tags (Open Graph, Twitter Cards, JSON-LD `VideoGame` schema), and a canonical URL entry in the sitemap.

The homepage gets a responsive game grid with instant search, staggered card animations, and light/dark mode that follows the system preference.

### Output structure

```
dist/
├── index.html          # homepage with game grid
├── 404.html            # error page
├── manifest.json       # PWA manifest
├── robots.txt          # sitemap reference
├── sitemap.xml         # with image support
├── service-worker.js   # offline support (stale-while-revalidate)
├── og-image.png        # homepage social image
├── icon-*.png          # favicons and PWA icons
└── <game-slug>/
    ├── index.html      # wrapper with header + iframe
    ├── internal.html   # original game
    ├── preview.png     # card image (or downloaded placeholder)
    ├── og.png          # social image (or downloaded placeholder)
    └── …               # game assets
```

## Icons

Place in the project root. Only `favicon.png` is required — it's used as fallback for all sizes.

| File                    | Size     | Purpose                     |
|-------------------------|----------|-----------------------------|
| `favicon.png`           | any      | Fallback for all icons      |
| `icon-32.png`           | 32×32    | Browser tab favicon         |
| `icon-192.png`          | 192×192  | PWA icon, Apple touch icon  |
| `icon-512.png`          | 512×512  | PWA splash screen           |
| `og-image.png`          | 1200×630 | Homepage social share image |
| `icon-maskable-192.png` | 192×192  | PWA adaptive icon           |
| `icon-maskable-512.png` | 512×512  | PWA adaptive icon           |
| `screenshot-wide.png`   | 1280×720 | PWA install prompt (desktop)|
| `screenshot-narrow.png` | 390×844  | PWA install prompt (mobile) |

Create maskable icons at [maskable.app/editor](https://maskable.app/editor).

## Deployment

The `dist/` folder is a plain static site.

**Cloudflare Pages**: connect the repo, set build command to `npm run build`, output directory to `dist`, and add `ORG_NAME` + `GH_TOKEN` as environment variables.

**Netlify / GitHub Pages / any static host**: same concept — run the build, serve `dist/`.

## Tech Stack

No dependencies. Just Node.js ≥ 18 (for native `fetch`). The builder is a single `build.js` file (~700 lines) that produces pure HTML/CSS/JS output. The UI uses the Outfit font, CSS custom properties for theming, and zero JavaScript frameworks.

## License

MIT
