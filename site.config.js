// ============================================================
//  PEWPLAY — CONFIGURAZIONE DEL SITO
//  Tutto quello che serve per personalizzare il sito sta qui.
//  I segreti (token GitHub / Cloudflare) NON vanno qui: stanno
//  nei "Secrets" di GitHub Actions o nel tuo .env locale.
// ============================================================

export default {
  // Nome e indirizzi
  name: 'PewPlay',
  url: 'https://pewplaytest.pages.dev',                // sito pubblico (branch main)
  previewUrl: 'https://preview.pewplaytest.pages.dev', // sito di anteprima (branch preview)
  themeColor: '#6C5CE7',
  contactEmail: 'contact@pewplay.com',

  // Testi principali (home, link condivisi, manifest)
  tagline: 'Free Online Games',
  description: 'Play the best free online games directly in your browser. No downloads, no installs — just play.',

  // Da dove prendere i giochi
  github: {
    org: 'pewplay',                 // organizzazione GitHub
    previewBranch: 'preview',       // branch che finisce sul sito di anteprima (sito e giochi)
    skipRepos: ['pewplay', '.github'], // repo da ignorare sempre
  },

  // Cloudflare Pages
  cloudflare: {
    pagesProject: 'pewplaytest',    // nome del progetto Pages
  },

  // Pubblicità e statistiche (attive SOLO sul sito pubblico, mai in preview)
  adsensePublisherId: 'pub-6003231730369215', // '' per disattivare AdSense
  gaMeasurementId: '',                        // es. 'G-XXXXXXXXXX'; '' = Analytics disattivato

  // Privacy policy
  privacy: {
    controllerName: 'PewPlay',      // persona/azienda che gestisce il sito
    controllerAddress: '',          // indirizzo (consigliato)
    updated: '2026-09-26',          // data ultima revisione della policy
  },

  // Opzioni di build
  build: {
    concurrency: 6,     // download di giochi in parallelo
    relatedGames: 6,    // quanti "altri giochi" mostrare sotto ogni gioco
    newGameDays: 30,    // per quanti giorni un gioco ha il badge "New" (campo "added")
  },
};
