# Guida: Come creare un gioco per PewPlay

Questa guida spiega come impostare un repository GitHub per pubblicare un gioco su PewPlay.

---

## Panoramica

PewPlay funziona così: un builder scansiona tutti i repository della tua organizzazione GitHub che hanno il topic `web-game`, li clona, e genera automaticamente una pagina wrapper con header, SEO, e splash screen per ogni gioco. Il tuo gioco viene caricato dentro un iframe.

Tu devi solo creare un repo con i file giusti — il resto è automatico.

---

## Struttura del repository

```
nome-del-gioco/
├── index.html        ← Obbligatorio: il punto di ingresso del gioco
├── game.json         ← Obbligatorio: metadata del gioco (titolo, descrizione, SEO)
├── preview.png       ← Consigliato: immagine card per la griglia homepage (512×512)
├── og.png            ← Opzionale: immagine per social/link preview (1200×630)
├── style.css         ← I tuoi stili
├── game.js           ← La logica del gioco
└── assets/           ← Qualsiasi altra risorsa (immagini, audio, font...)
```

---

## Passo 1 — Crea il repository

Crea un nuovo repository nella tua organizzazione GitHub. Il nome del repo diventa lo slug URL del gioco.

Esempio: il repo `space-invaders` verrà servito su `pewplay.com/space-invaders/`

Puoi usare il template `pewplay-game-template` se disponibile (clicca "Use this template" su GitHub).

---

## Passo 2 — Aggiungi il topic `web-game`

Questo è il passaggio più importante. Senza il topic, il builder non troverà il tuo repo.

1. Vai su GitHub → il tuo repo → **Settings** (o dalla pagina principale clicca la rotella ⚙️ accanto a "About")
2. Nel campo **Topics** scrivi `web-game` e conferma

---

## Passo 3 — Crea `index.html`

Questo è il file che PewPlay carica dentro l'iframe. Deve funzionare come pagina standalone.

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no">
  <title>Il Mio Gioco</title>
  <link rel="stylesheet" href="style.css">
</head>
<body>
  <canvas id="game"></canvas>
  <script src="game.js"></script>
</body>
</html>
```

Il tuo `index.html` viene rinominato automaticamente in `internal.html` durante il build. Al suo posto viene creato un wrapper con header PewPlay + iframe che punta a `internal.html`. Non devi preoccupartene — basta che il tuo `index.html` funzioni da solo.

---

## Passo 4 — Crea `game.json`

Questo file contiene tutti i metadata del gioco. Il builder lo usa per generare titolo pagina, meta description, Open Graph, Twitter Card e JSON-LD (structured data per Google).

```json
{
  "title": "Space Invaders",
  "description": "Difendi la Terra dalle ondate aliene in questo classico sparatutto arcade. Gioca gratis nel browser.",
  "keywords": ["arcade", "shooter", "retro", "space", "aliens"],
  "category": "Arcade",
  "author": "Il Tuo Nome o Studio",
  "playMode": "SinglePlayer"
}
```

### Dettaglio campi

| Campo         | Obbligatorio | Default                              | Dove viene usato                          |
|---------------|--------------|--------------------------------------|-------------------------------------------|
| `title`       | No           | Nome repo prettificato               | `<title>`, `og:title`, card homepage      |
|               |              | (es. `space-invaders` → "Space Invaders") |                                      |
| `description` | No           | "Play [titolo] for free online…"     | `<meta description>`, `og:description`    |
| `keywords`    | No           | `[]`                                 | `<meta keywords>`, JSON-LD                |
| `category`    | No           | `"Game"`                             | JSON-LD `applicationCategory`             |
| `author`      | No           | —                                    | JSON-LD `author`                          |
| `playMode`    | No           | `"SinglePlayer"`                     | JSON-LD (valori: `SinglePlayer`, `MultiPlayer`) |

Tutti i campi sono opzionali. Se `game.json` non esiste, il builder genera tutto dai dati del repository GitHub (nome repo + description del repo).

Il file `seo.json` è ancora supportato per retrocompatibilità, ma `game.json` è il nome preferito.

### Consigli SEO

- **`title`**: tienilo tra 20 e 50 caratteri. Viene mostrato come "Space Invaders — Play Free | PewPlay" nel browser
- **`description`**: tra 100 e 160 caratteri. Sii specifico, descrivi il gameplay
- **`keywords`**: 3-8 parole chiave pertinenti. Non esagerare

---

## Passo 5 — Aggiungi le immagini

### `preview.png` — Immagine card (consigliato)

Questa è l'immagine che appare nella griglia della homepage di PewPlay.

- **Dimensioni**: 512×512 px (quadrata)
- **Formato**: PNG, JPG, o WebP
- **Contenuto**: mostra il gameplay reale, non solo il logo
- Il builder cerca `preview.png`, `preview.jpg`, o `preview.webp`
- Se manca, viene usato un placeholder colorato con il nome del gioco

### `og.png` — Immagine social (opzionale)

Questa immagine viene usata quando qualcuno condivide il link del gioco su social, WhatsApp, Discord, ecc.

- **Dimensioni**: 1200×630 px (ratio 1.91:1)
- **Formato**: PNG, JPG, o WebP
- Il builder cerca `og.png`, `og.jpg`, o `og.webp`
- Se manca, viene usata `preview.png` come fallback (funziona, ma il ratio non è ottimale per i social)

---

## Passo 6 — Testa il gioco

### Test locale

Apri `index.html` direttamente nel browser. Per la maggior parte dei giochi è sufficiente.

Se hai bisogno di un server locale (per ES modules, fetch, Web Audio, ecc.):

```bash
# Con Python
python3 -m http.server 8000

# Con Node
npx serve .
```

### Test in iframe

PewPlay carica il gioco dentro un iframe. Puoi simularlo:

```html
<!DOCTYPE html>
<html>
<body style="margin:0">
  <div style="height:52px;background:#141420"></div>
  <iframe src="index.html" style="width:100%;height:calc(100vh - 52px);border:none"></iframe>
</body>
</html>
```

Salva questo come `test-wrapper.html` nella stessa cartella e aprilo nel browser.

### Checklist pre-pubblicazione

- [ ] Il gioco funziona aprendo `index.html` direttamente
- [ ] Il gioco funziona dentro un iframe
- [ ] Funziona su mobile (touch input)
- [ ] `game.json` ha titolo e descrizione compilati
- [ ] `preview.png` è presente (512×512)
- [ ] Il topic `web-game` è impostato sul repo

---

## Cosa puoi usare

Siccome i giochi girano su Cloudflare Pages come file statici dentro un iframe:

| ✅ Puoi usare | ❌ Non puoi usare |
|---|---|
| HTML, CSS, JS — qualsiasi file statico | Server-side code (Node, PHP, Python) |
| Canvas 2D e WebGL | Build step richiesto (devi committare l'output) |
| Web Audio API | Backend / database |
| Gamepad API | |
| ES Modules (`<script type="module">`) | |
| Immagini, audio, font, video | |
| Librerie da CDN (cdnjs, unpkg, esm.sh) | |
| localStorage (scoped al dominio PewPlay) | |
| WebSocket (verso server esterni) | |

---

## Cosa genera il builder automaticamente

Per ogni gioco, il builder crea:

- **Pagina wrapper** con header PewPlay (logo, titolo gioco, bottone indietro, dark mode, fullscreen)
- **Splash screen** con la `preview.png` del gioco e spinner (visibile mentre l'iframe carica)
- **SEO completa**: `<title>`, meta description, Open Graph, Twitter Card, canonical URL
- **JSON-LD** strutturato (`VideoGame` schema) per Google Rich Results
- **Entry nella sitemap** con immagine associata

Tu non devi gestire nulla di tutto questo — basta il tuo gioco + `game.json` + `preview.png`.

---

## Esempio completo

Repo: `flappy-cat`

```
flappy-cat/
├── index.html
├── game.json
├── preview.png       (512×512)
├── og.png            (1200×630)
├── style.css
├── game.js
└── assets/
    ├── cat.png
    ├── pipe.png
    └── jump.mp3
```

`game.json`:
```json
{
  "title": "Flappy Cat",
  "description": "Guida un gatto volante tra i tubi. Quanto lontano riesci ad arrivare? Gioca gratis online.",
  "keywords": ["flappy", "casual", "gatto", "arcade", "endless"],
  "category": "Casual",
  "author": "PewPlay Studio",
  "playMode": "SinglePlayer"
}
```

Risultato su PewPlay:
- **URL**: `pewplay.com/flappy-cat/`
- **Titolo browser**: "Flappy Cat — Play Free | PewPlay"
- **Card homepage**: immagine da `preview.png`, nome "Flappy Cat"
- **Link condiviso su social**: immagine da `og.png` (1200×630), titolo "Flappy Cat"

---

## FAQ

**Il gioco non appare su PewPlay**
→ Controlla che il topic `web-game` sia impostato sul repo. Poi rilancia il build.

**Il titolo mostra il nome del repo con trattini**
→ Crea un `game.json` con il campo `title` compilato.

**L'immagine di preview è un placeholder viola**
→ Aggiungi un file `preview.png` (o .jpg/.webp) nella root del repo.

**L'immagine sui social è tagliata male**
→ Aggiungi un `og.png` a 1200×630 px. Senza, viene usata `preview.png` (quadrata) che i social tagliano.

**Come aggiorno il gioco?**
→ Pusha le modifiche su GitHub e rilancia il build di PewPlay. Il builder clona sempre l'ultima versione del repo.

**Posso usare un framework JS (React, Phaser, Three.js)?**
→ Sì, ma devi committare i file buildati (la cartella `dist` o l'output finale). Il builder non esegue `npm install` o `npm build` — prende i file così come sono.

**Il mio gioco usa localStorage — funziona?**
→ Sì, ma il `localStorage` è condiviso con il dominio `pewplay.com`. Usa chiavi specifiche per il tuo gioco (es. `flappy-cat-highscore`) per evitare conflitti.