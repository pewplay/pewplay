# PewPlay

Static site generator that turns GitHub repos into a free online games arcade. Zero frameworks, zero databases — just a single Node script that outputs a complete static site.

## How it works

1. Scans a GitHub organization for repos tagged `web-game`
2. Clones them with bounded concurrency (5 at a time by default)
3. Wraps each game in a page with header, SEO, splash screen, and iframe
4. Generates a homepage with game grid, instant search, and light/dark mode
5. Outputs everything to `dist/` — ready for Cloudflare Workers Static Assets or any static host

## Quick Start

```bash
git clone https://github.com/your-org/pewplay.git
cd pewplay
cp .env.example .env       # edit with your org name and GitHub token
export $(cat .env | xargs)
npm install
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
| `CLONE_CONCURRENCY` | no | `5` | Max simultaneous Git clones |
| `ADSENSE_PUBLISHER_ID` | no | `pub-6003231730369215` | AdSense publisher ID; also used for `ads.txt` |
| `GA_MEASUREMENT_ID` | no | — | GA4 Measurement ID (`G-...`); Analytics is omitted when empty |

## Google AdSense & Analytics

The generated pages include the AdSense tag for publisher `pub-6003231730369215`, and the build writes `/ads.txt` automatically. No custom cookie/consent banner is included: configure Google's CMP from **AdSense → Privacy & messaging**.

GA4 is controlled only by the `GA_MEASUREMENT_ID` environment variable. Example:

```bash
export GA_MEASUREMENT_ID=G-XXXXXXXXXX
npm run build
```

If you use Google's AdSense CMP for European-regulation messages, enable its Consent Mode options for both advertising and analytics so the same CMP can pass the visitor's choices to Google Analytics.

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

For every game the builder creates a wrapper page with header (back button, game title, theme toggle, fullscreen). Fullscreen is applied to the player shell, so the PewPlay top bar remains visible, a loading splash screen with the preview image, full SEO tags (Open Graph, Twitter Cards, JSON-LD `VideoGame` schema), and a canonical URL entry in the sitemap.

The homepage gets a responsive game grid with instant search, staggered card animations, and light/dark mode that follows the system preference.

### Output structure

```
dist/
├── index.html          # homepage with game grid
├── 404.html            # error page
├── manifest.json       # PWA manifest
├── robots.txt          # sitemap reference
├── ads.txt             # AdSense authorized seller declaration
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

The project includes `wrangler.jsonc` and is ready for **Cloudflare Workers Static Assets**. The generated site stays fully static; Wrangler only uploads `dist/`.

For Cloudflare Workers Builds use:

```text
Build command:  npm run build
Deploy command: npm run deploy:only
Root directory: /
```

Add `ORG_NAME` and `GH_TOKEN` to the build environment. `GH_TOKEN` should be stored as a secret. You do **not** need to configure an output directory in the dashboard because Wrangler reads `assets.directory = ./dist` from `wrangler.jsonc`.

For a local one-command deployment:

```bash
npm run deploy
```

`npm run deploy` builds the site and then runs `wrangler deploy`. Other static hosts can still serve the generated `dist/` directory normally.

## Tech Stack

Node.js ≥ 20. Runtime output is pure HTML/CSS/JS; build-time dependencies are `sharp` for image optimization and `wrangler` for Cloudflare deployment. The builder is a single `build.js` file that produces the static site. The UI uses the Outfit font, CSS custom properties for theming, and zero JavaScript frameworks.

## License

MIT


## Privacy & Cookie Policy

The build generates `/privacy-policy/` and links it from the home page and game pages. The default contact address is `contact@pewplay.com`. You can override the controller/contact details with `PRIVACY_CONTACT_EMAIL`, `PRIVACY_CONTROLLER_NAME` and `PRIVACY_CONTROLLER_ADDRESS`.

The page describes Google AdSense, Google Analytics (when `GA_MEASUREMENT_ID` is enabled), cookies/consent and data-subject rights. The Google consent banner itself remains managed from **AdSense → Privacy & messaging**. Because legal identity/address requirements depend on who actually operates the site, replace the controller details with the real legal person/company and review the policy for your jurisdiction before publishing.
