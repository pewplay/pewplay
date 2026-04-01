# Guida: Come creare un gioco per PewPlay

Questa guida spiega passo per passo come impostare un repository GitHub perché venga automaticamente incluso nel sito PewPlay.

---

## Come funziona

Il builder di PewPlay scansiona tutti i repository della tua organizzazione GitHub che hanno il topic `web-game`, li clona tutti in parallelo, e per ognuno genera una pagina wrapper con header, splash screen, SEO completa e iframe. Il tuo gioco viene caricato dentro l'iframe.

Tu devi solo creare un repo con i file giusti — il resto è automatico.

---

## Struttura del repository

```
nome-del-gioco/
├── index.html        ← Obbligatorio: punto di ingresso del gioco
├── game.json         ← Consigliato: titolo, descrizione, SEO
├── preview.png       ← Consigliato: immagine card 512×512
├── og.png            ← Opzionale: immagine social 1200×630
├── style.css         ← I tuoi stili
├── game.js           ← La logica del gioco
└── assets/           ← Qualsiasi risorsa (immagini, audio, font)
```

Se mancano `preview.png` o `og.png`, il builder scarica automaticamente dei placeholder PNG durante la build. Se manca `game.json`, il titolo viene generato dal nome del repo.

---

## Passo 1 — Crea il repository

Crea un nuovo repo nella tua organizzazione GitHub. Il nome del repo diventa lo slug URL del gioco.

**Esempio:** il repo `space-invaders` → `pewplay.com/space-invaders/`

Se disponibile, puoi partire dal template `pewplay-game-template` cliccando "Use this template" su GitHub.

---

## Passo 2 — Aggiungi il topic `web-game`

Senza questo topic il builder non trova il repo. È il passaggio più importante.

1. Vai su GitHub → il tuo repo
2. Clicca la ⚙️ accanto a "About" (o vai in Settings)
3. Nel campo **Topics** scrivi `web-game` e conferma

---

## Passo 3 — Crea `index.html`

Questo file viene caricato dentro un iframe nel sito PewPlay. Deve funzionare come pagina standalone.

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

Durante la build, il tuo `index.html` viene rinominato in `internal.html`. Al suo posto viene creato un wrapper con l'header PewPlay e l'iframe che punta a `internal.html`. Non devi preoccupartene — basta che il tuo `index.html` funzioni da solo.

---

## Passo 4 — Crea `game.json`

Contiene i metadata del gioco. Il builder li usa per generare il titolo della pagina, la meta description, Open Graph, Twitter Card e JSON-LD (structured data per Google).

```json
{
  "title": "Space Invaders",
  "description": "Difendi la Terra dalle ondate aliene. Gioca gratis nel browser, senza download.",
  "keywords": ["arcade", "shooter", "retro", "space"],
  "category": "Arcade",
  "author": "Il Tuo Nome",
  "playMode": "SinglePlayer"
}
```

### Dettaglio campi

| Campo         | Obbligatorio | Default                                 | Dove appare                            |
|---------------|:------------:|-----------------------------------------|----------------------------------------|
| `title`       | no           | Nome repo formattato (es. "Space Invaders") | `<title>`, OG, card homepage       |
| `description` | no           | "Play [titolo] for free online…"        | Meta description, OG, Twitter Card     |
| `keywords`    | no           | `[]`                                    | `<meta keywords>`, JSON-LD             |
| `category`    | no           | `"Game"`                                | JSON-LD `applicationCategory`          |
| `author`      | no           | —                                       | JSON-LD `author`                       |
| `playMode`    | no           | `"SinglePlayer"`                        | JSON-LD (`SinglePlayer` o `MultiPlayer`) |

Se `game.json` non esiste, il builder genera tutto dal nome e dalla description del repository su GitHub.

> Il vecchio nome `seo.json` è ancora supportato per retrocompatibilità, ma `game.json` è il nome preferito.

### Consigli SEO

Il titolo nel browser apparirà come **"Space Invaders — Play Free | PewPlay"**, quindi tienilo tra 20 e 50 caratteri. La description dovrebbe essere tra 100 e 160 caratteri e descrivere il gameplay. Le keywords dovrebbero essere 3-8 parole pertinenti.

---

## Passo 5 — Aggiungi le immagini

### `preview.png` — Immagine card

Appare nella griglia della homepage.

- **Dimensioni:** 512×512 px (quadrata)
- **Formato:** PNG, JPG o WebP
- **Contenuto:** mostra il gameplay, non solo il logo
- Se manca → il builder scarica un placeholder PNG con il nome del gioco su sfondo viola

### `og.png` — Immagine social

Appare quando qualcuno condivide il link su WhatsApp, Discord, Twitter, Facebook, ecc.

- **Dimensioni:** 1200×630 px (ratio 1.91:1)
- **Formato:** PNG, JPG o WebP
- Se manca → il builder scarica un placeholder PNG con il titolo su sfondo scuro

I placeholder vengono scaricati da placehold.co **durante la build** e salvati come file PNG locali nella cartella `dist/` del gioco. A runtime il sito non fa richieste esterne.

---

## Passo 6 — Testa il gioco

### Test locale

Apri `index.html` nel browser. Per la maggior parte dei giochi basta. Se ti serve un server locale:

```bash
python3 -m http.server 8000    # Python
npx serve .                    # Node
```

### Test in iframe

PewPlay carica il gioco in un iframe con un header di 52px. Simula così:

```html
<!DOCTYPE html>
<html>
<body style="margin:0">
  <div style="height:52px;background:#141420"></div>
  <iframe src="index.html" style="width:100%;height:calc(100vh - 52px);border:none"></iframe>
</body>
</html>
```

### Checklist

- [ ] Il gioco funziona aprendo `index.html` direttamente
- [ ] Funziona anche dentro un iframe
- [ ] Funziona su mobile (touch)
- [ ] `game.json` ha titolo e descrizione
- [ ] `preview.png` è presente (512×512)
- [ ] Il topic `web-game` è impostato sul repo

---

## Cosa puoi e non puoi usare

I giochi girano su Cloudflare Pages come file statici dentro un iframe.

**Puoi usare:** HTML, CSS, JS, Canvas 2D, WebGL, Web Audio, Gamepad API, ES Modules, immagini, audio, font, video, librerie da CDN (cdnjs, unpkg, esm.sh), localStorage (scoped al dominio PewPlay), WebSocket verso server esterni.

**Non puoi usare:** codice server-side (Node, PHP, Python), build step richiesti al deploy (devi committare i file finali), backend o database.

---

## Cosa genera il builder

Per ogni gioco:
- Pagina wrapper con header (back, titolo, dark mode, fullscreen)
- Splash screen con `preview.png` e spinner durante il caricamento
- `<title>`, meta description, Open Graph, Twitter Card, canonical URL
- JSON-LD strutturato (schema `VideoGame`)
- Entry nella sitemap con immagine associata
- Placeholder PNG se mancano `preview.png` o `og.png`

---

## Esempio completo

**Repo:** `flappy-cat`

```
flappy-cat/
├── index.html
├── game.json
├── preview.png       ← 512×512
├── og.png            ← 1200×630
├── style.css
├── game.js
└── assets/
    ├── cat.png
    ├── pipe.png
    └── jump.mp3
```

**game.json:**
```json
{
  "title": "Flappy Cat",
  "description": "Guida un gatto volante tra i tubi. Quanto lontano arrivi? Gioca gratis online.",
  "keywords": ["flappy", "casual", "gatto", "arcade"],
  "category": "Casual",
  "author": "PewPlay Studio",
  "playMode": "SinglePlayer"
}
```

**Risultato su PewPlay:**
- URL: `pewplay.com/flappy-cat/`
- Titolo tab: "Flappy Cat — Play Free | PewPlay"
- Card homepage: `preview.png` con nome "Flappy Cat"
- Link condiviso: `og.png` a 1200×630

---

## FAQ

**Il gioco non appare su PewPlay** → Controlla che il topic `web-game` sia sul repo, poi rilancia la build.

**Il titolo mostra il nome del repo con trattini** → Aggiungi un `game.json` con il campo `title`.

**L'immagine card è un placeholder viola** → Aggiungi `preview.png` (512×512) nella root del repo.

**Le preview social sono tagliate male** → Aggiungi `og.png` a 1200×630 px.

**Come aggiorno il gioco?** → Pusha su GitHub e rilancia la build di PewPlay. Clona sempre l'ultima versione.

**Posso usare React, Phaser, Three.js?** → Sì, ma committa i file buildati. Il builder non esegue `npm install` né `npm build`.

**localStorage funziona?** → Sì, ma è condiviso col dominio PewPlay. Usa chiavi specifiche (es. `flappy-cat-highscore`).
