# PewPlay

Generatore del sito [pewplay.com](https://www.pewplay.com): prende i giochi dai repository dell'organizzazione GitHub e crea un sito statico (home, pagina per ogni gioco, SEO) pubblicato su **Cloudflare Pages**. Tutto gratis: GitHub Free + Cloudflare Pages Free.

## La regola dei branch

Vale per **tutti** i repo, sia `pewplay` (il sito) sia i giochi:

| Branch | Dove finisce |
|---|---|
| `main` | **sito pubblico** — `www.pewplay.com` |
| `preview` | **sito di anteprima** — `preview.<progetto>.pages.dev` (non indicizzato, niente pubblicità) |

- Il sito pubblico è costruito col codice di `pewplay@main` e i giochi dal loro `main`.
- L'anteprima è costruita col codice di `pewplay@preview` e **solo** i giochi che hanno un branch `preview`.
- Lavori sempre su `preview`, controlli l'anteprima, poi fai il **merge in `main`** → si aggiorna il sito pubblico.
- **Tutto automatico**: ogni push su `main` o `preview` (del sito o di un gioco) ricostruisce e pubblica il sito corrispondente in 1–2 minuti. Il merge `preview` → `main` è un push su `main`, quindi aggiorna la produzione da solo.
- Ogni notte parte un controllo su entrambi i siti: pubblica **solo se qualcosa è cambiato** (es. un badge "New" scaduto). Se il sito online è già identico, il deploy viene saltato. Dal pulsante manuale invece pubblica sempre.

```
 push su preview  ->  sito di anteprima  ->  (controlli)  ->  merge in main  ->  sito pubblico
```

## Flusso di lavoro

### Nuovo gioco
1. **Use this template** sul repo `pewplay-game-template` → crea il repo nell'organizzazione. Il nome del repo diventa l'URL: `space-invaders` → `pewplay.com/space-invaders/`.
2. Crea il branch `preview` e lavora lì. Ogni push aggiorna l'anteprima; nel riepilogo della GitHub Action del gioco trovi il link diretto.
3. Quando è pronto: togli `"draft": true` da `game.json` e fai il merge di `preview` in `main` → online.

> Il template parte con `"draft": true` perché, quando crei il repo, il codice demo finisce subito su `main`: così non compare sul sito pubblico per sbaglio. Un gioco in bozza si vede solo nell'anteprima.

### Modificare un gioco o il sito
Stessa cosa: push su `preview` → controlli l'anteprima → merge in `main`.

Puoi anche provare tutto in locale prima di pushare (vedi [Comandi](#comandi)).

## Configurazione iniziale (una volta sola)

### 1. Cloudflare
1. **Account ID**: dashboard → *Workers & Pages* → colonna di destra (32 caratteri; non è lo Zone ID del dominio).
2. **API token**: *My Profile → API Tokens → Create Token → Custom token* con permesso **Account → Cloudflare Pages → Edit** e *Account Resources* = il tuo account (o *All accounts*).
3. Il progetto Pages (`cloudflare.pagesProject` in `site.config.js`) viene creato in automatico al primo deploy.
4. Dopo il primo deploy: progetto → *Custom domains* → aggiungi `www.pewplay.com`. Per un indirizzo tuo anche per l'anteprima: record DNS CNAME `preview` → `preview.<progetto>.pages.dev`.
5. Facoltativo: progetto → *Settings → Access policy* per mettere l'anteprima dietro login (Cloudflare Access, gratis fino a 50 utenti).

### 2. Secrets del repo `pewplay`
*Settings → Secrets and variables → Actions → New repository secret*:

| Nome | Valore |
|---|---|
| `CLOUDFLARE_API_TOKEN` | il token del punto 1 |
| `CLOUDFLARE_ACCOUNT_ID` | l'account ID del punto 1 |
| `GH_READ_TOKEN` | *facoltativo*: solo se hai giochi in repo **privati** |

### 3. Secret dell'organizzazione
Serve ai repo dei giochi per dire "ricostruisci il sito".
1. Fine-grained token (*GitHub → Settings → Developer settings → Fine-grained tokens*): Resource owner = l'organizzazione, Repository access = solo `pewplay`, Permissions → **Contents: Read and write**.
2. Organizzazione → *Settings → Secrets and variables → Actions → New organization secret*: nome `PEWPLAY_DISPATCH_TOKEN`, accesso a tutti i repository.

Senza questo secret funziona tutto lo stesso, ma il sito si aggiorna solo con la build notturna o col pulsante manuale.

### 4. Branch `preview` del sito e template
```bash
git push origin main:preview      # nel repo pewplay: crea il branch preview (una volta)
```
Nel repo `pewplay-game-template` → *Settings* → spunta **Template repository**.

## Comandi

```bash
npm install

npm run build                      # sito pubblico da GitHub → dist/
npm run build:preview              # sito di anteprima da GitHub → dist/
npm run dev -- --games ..          # anteprima con i giochi nelle cartelle accanto a pewplay → http://localhost:8080
npm run dev -- --games .. --only mio-gioco   # solo un gioco
npm run check -- ../mio-gioco      # controlla un gioco (game.json, immagini, file)
npm run serve                      # serve dist/ in locale
npm run deploy                     # build + deploy pubblico dal tuo PC (serve .env con i token Cloudflare)
npm run deploy:preview             # build + deploy dell'anteprima dal tuo PC
npm run deploy:check               # controlla solo token Cloudflare, account e progetto
```

Per la build da GitHub in locale conviene un token (`cp .env.example .env` e compila `GH_TOKEN`), altrimenti si finisce presto nel limite di 60 richieste/ora dell'API.

Opzioni di `src/build.js`: `--target production|preview`, `--games <cartella>`, `--only a,b`, `--out <cartella>`, `--base-url <url>`.

## Preparare il branch preview dei giochi esistenti

Per portare in blocco i giochi già presenti nell'organizzazione alla struttura attuale:

```bash
npm run prepare-previews             # prova: prepara tutto in .migration/ e mostra cosa cambierebbe
npm run prepare-previews -- --apply  # commit e push del branch preview di ogni gioco
npm run prepare-previews -- --only angle,dino   # solo alcuni repo
```

Per ogni gioco crea (o aggiorna) il branch `preview` partendo da `main`, aggiunge il workflow PewPlay e aggiorna `game.json` al formato attuale. **Non tocca mai `main`**: il merge lo fai tu, gioco per gioco. Si può rilanciare quante volte vuoi: i repo già a posto vengono saltati.

Serve git con permesso di push sull'organizzazione, incluso il permesso `workflow` (con GitHub CLI: `gh auth refresh -s workflow`).

## Lanciare la build a mano

Repo `pewplay` → **Actions → Deploy → Run workflow** → *entrambi*, *production* o *preview*. Nel riepilogo della run c'è la tabella dei giochi con versione, peso ed eventuali errori/avvisi.

## Come vengono gestiti i problemi

| Situazione | Cosa succede |
|---|---|
| Nessun gioco (o solo bozze) | **Avviso**. Il sito viene pubblicato con la home "No games yet". |
| Repo senza branch `preview` | Normale: il gioco non compare nell'anteprima. |
| Un gioco ha un problema suo (`game.json` non valido, manca `index.html`, file > 25 MB, nome riservato) | **Avviso**: quel gioco viene saltato, tutti gli altri vengono pubblicati. |
| `preview.png` / `og.png` mancante o corrotta | **Avviso**: si usa un segnaposto o un'immagine generata; il gioco viene pubblicato. |
| Un gioco non si riesce a scaricare da GitHub | Anteprima: **avviso**, il gioco manca solo in quella build. Pubblico: **errore**, non si pubblica niente e resta online la versione precedente (così nessun gioco sparisce per un problema temporaneo). |
| GitHub o Cloudflare non raggiungibili, token non validi, `site.config.js` sbagliato, più di 20.000 file | **Errore**: non si pubblica niente, online resta la versione precedente. Il messaggio dice cosa controllare. |
| Upload su Cloudflare fallito | Un secondo tentativo automatico dopo 10 secondi, poi **errore**. |
| Il sito online è già identico alla build | Deploy saltato (non consuma deploy del piano gratuito). |
| Dal gioco non si riesce ad avvisare il sito (secret mancante/scaduto) | **Avviso** nella run del gioco; il sito si aggiorna alla build notturna o a mano. |

Avvisi ed errori compaiono in cima alla pagina della run su GitHub Actions e nel riepilogo, con la tabella di tutti i giochi.

## `game.json`

Tutti i campi sono facoltativi (tranne che serve un `title` sensato). Il riferimento completo, con dove compare ogni campo e come scriverlo, è nel README di `pewplay-game-template`; il template ha un `game.json` compilato in ogni campo.

| Campo | Cosa fa |
|---|---|
| `title`, `description` | titolo e descrizione (pagina, Google, link condivisi) |
| `about` | sezione "About": testo lungo, il più importante per Google |
| `howToPlay`, `controls`, `tips` | sezioni della pagina e finestra **?** nella barra del gioco |
| `faq` | domande e risposte (anche come dati strutturati FAQPage) |
| `category`, `tags` | pagina di categoria, breadcrumb, ricerca |
| `author`, `playMode`, `orientation` | dettagli della scheda |
| `cover`, `screenshots` | copertina 16:9 (schermata "Play now" e immagine dei link condivisi) e galleria (default: `cover.png` e cartella `screenshots/`) |
| `featured`, `added`, `draft`, `exclude` | primo nella lista, badge "New", bozza, file da non pubblicare |

### Immagini
Il sito crea da solo tutte le versioni ottimizzate (AVIF + WebP, più dimensioni):

| File del gioco | Diventa | Se manca |
|---|---|---|
| `preview.png` quadrata | card 256/512 px | segnaposto con il titolo |
| `cover.png` 16:9 | schermata "Play now" e sfondo dell'immagine condivisa, 640/1280 px | generata dalla preview |
| `screenshots/*.png` | galleria con miniature e visualizzatore | sezione nascosta |
| `og.png` 1200×630 | immagine dei link condivisi | **generata**: copertina sfocata + icona + categoria + titolo + logo |

## Pagine e SEO

- **Home**: ricerca, filtri per categoria e griglia di tutti i giochi.
- **Pagine di categoria** `/<categoria>-games/` (es. `/puzzle-games/`): introduzione, tutti i giochi della categoria, link alle altre. I testi introduttivi sono in `src/strings.js` → `CATEGORY_INFO`.
- **Pagina gioco**: il gioco si carica solo al clic su "Play now" (pagina molto più veloce); pulsanti Aiuto, Condividi, Tema, Schermo intero; breadcrumb; sezioni da `game.json`; giochi correlati. Un link che finisce con `#play` avvia subito il gioco.
- **404** con ricerca e giochi suggeriti.
- **Dati strutturati**: WebSite, Organization, ItemList (home), CollectionPage (categorie), VideoGame con screenshot, BreadcrumbList e FAQPage (giochi).
- **Sitemap** con categorie e immagini; **IndexNow**: dopo ogni deploy pubblico Bing, Yandex & co. vengono avvisati delle pagine aggiornate (Google usa la sitemap).
- **Velocità**: font Outfit servito dal sito (pacchetto `@fontsource-variable/outfit`), immagini responsive, nessuna richiesta esterna tranne AdSense/Analytics.
- **Accessibilità**: link "Skip to content", testi alternativi, navigazione da tastiera, focus sul gioco al Play, finestre chiudibili con Esc.

## Il gioco dentro il sito

- I file del gioco vengono pubblicati **così come sono** in `/<repo>/play/`; la pagina `/<repo>/` lo carica in un iframe. Usa sempre **percorsi relativi**.
- Tutti i giochi condividono il dominio: usa chiavi `localStorage` con un prefisso (`nome-repo:record`).

## Struttura del repo

```
pewplay/
├── site.config.js          ← TUTTA la configurazione (nome, URL, AdSense, org GitHub…)
├── src/
│   ├── build.js            ← la build, passo per passo
│   ├── sources.js          ← trova e scarica i giochi (GitHub o cartella locale) + cache
│   ├── game-config.js      ← legge e controlla game.json
│   ├── images.js           ← preview, copertina, screenshot, immagine social
│   ├── strings.js          ← testi dell'interfaccia e delle pagine di categoria
│   ├── static-files.js     ← sitemap, robots, manifest, _headers
│   ├── render/             ← HTML delle pagine (layout, home, categoria, gioco, privacy/404)
│   ├── assets/             ← CSS e JS del sito
│   ├── check-game.js       ← `npm run check` (usato anche dalla Action dei giochi)
│   ├── deploy.js           ← pubblica dist/ su Cloudflare Pages (con controllo credenziali)
│   ├── dev.js / serve.js   ← anteprima locale
│   └── config.js           ← legge config, argomenti e .env
├── public/                 ← favicon, icone, og-image.png: copiati così come sono
├── schema/game.schema.json ← schema per l'autocompletamento di game.json
└── .github/workflows/deploy.yml
```

## Output

```
dist/
├── index.html                         home
├── <gioco>/index.html                 pagina del gioco
├── <gioco>/play/…                     file del gioco
├── <gioco>/img/…                      preview, copertina e screenshot (AVIF/WebP)
├── <gioco>/og.jpg                     immagine per i link condivisi
├── <categoria>-games/index.html       pagine di categoria
├── privacy-policy/, 404.html
├── assets/site.<hash>.css|js          cache lunga
├── sitemap.xml, robots.txt, ads.txt, manifest.json   (sitemap e ads.txt solo sul pubblico)
├── service-worker.js                  solo sul pubblico: disattiva il service worker della vecchia versione del sito
├── _headers                           regole Cloudflare Pages
└── build-info.json                    quale commit di ogni gioco è online
```

## Limiti del piano gratuito

- **Cloudflare Pages**: 500 deploy/mese, max 20.000 file per sito, max 25 MB per file. La build si ferma con un messaggio chiaro se li superi.
- **GitHub Actions**: minuti illimitati sui repo pubblici.

## Privacy

La pagina `/privacy-policy/` si configura in `site.config.js → privacy`. Il banner di consenso è quello di Google (AdSense → *Privacy & messaging*). Sostituisci titolare e indirizzo con quelli reali e verifica il testo per la tua situazione.

## Licenza

MIT
