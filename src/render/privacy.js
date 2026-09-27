// Privacy & Cookie Policy + pagina 404.
import { esc } from '../util.js';
import { T } from '../strings.js';
import { layout, header, footer, ICONS } from './layout.js';
import { gameCard } from './home.js';

const L = (href, text) => `<a href="${href}" rel="noopener noreferrer">${text}</a>`;

function content(v) {
  const mail = `<a href="mailto:${v.email}">${v.email}</a>`;
  const analytics = v.ga
    ? `<p>We use Google Analytics 4 (GA4) to understand how visitors use ${v.name}, such as pages viewed, approximate location, device/browser information and interaction events. GA4 may use first-party cookies such as <code>_ga</code> when analytics storage is permitted. We do not intentionally send names, email addresses or other directly identifying information to Google Analytics.</p>`
    : `<p>Google Analytics is not currently enabled. If it is enabled later, this policy will apply to that measurement activity and consent will be handled through the configured Google consent solution where required.</p>`;
  return {
    kicker: 'Legal & privacy', h1: 'Privacy &amp; Cookie Policy', updated: 'Last updated',
    html: `
      <h2>1. Who we are</h2>
      <p>This Privacy &amp; Cookie Policy explains how ${v.name} handles information when you visit and use this website.</p>
      <p><strong>Controller / site operator:</strong> ${v.controller}${v.address}<br><strong>Privacy contact:</strong> ${mail}</p>
      <h2>2. Information processed when you use the site</h2>
      <p>The website can process technical information needed to deliver pages and protect the service, such as IP address, browser and device information, requested URLs, timestamps and security/network logs. Hosting, CDN and security providers may process this information on our behalf.</p>
      <p>We do not require an account to play games on ${v.name} and we do not ask for profile information to access the games.</p>
      <h2>3. Google Analytics</h2>
      ${analytics}
      <p>Google explains how Analytics collects and protects data in its ${L('https://support.google.com/analytics/answer/6004245', 'Analytics data safeguards')} page and describes GA4 cookies in its ${L('https://support.google.com/analytics/answer/11397207', 'GA4 cookie documentation')}.</p>
      <h2>4. Google AdSense and advertising</h2>
      <p>${v.name} uses Google AdSense to display advertising. Google and its advertising partners may use cookies, local storage, device information and other identifiers to deliver, measure, secure and, where permitted by your choices, personalize ads.</p>
      <p>Where the Google consent message is shown, its controls provide the current vendor/purpose information and let you make the choices offered there. See ${L('https://policies.google.com/technologies/partner-sites', 'How Google uses information from sites or apps that use our services')} and the ${L('https://policies.google.com/privacy', 'Google Privacy Policy')}.</p>
      <h2>5. Cookies, local storage and consent</h2>
      <p>Cookies and similar technologies can be used for essential site operation, analytics and advertising. For visitors in regions where consent is required, ${v.name} relies on the consent solution configured through Google AdSense Privacy &amp; messaging rather than a separate custom banner.</p>
      <p>Games may store data such as high scores and progress in your browser (localStorage). This data stays on your device and is not sent to us.</p>
      <div class="notice">Browser settings can also let you delete or block cookies, but this may affect some site or advertising functionality. Choices made through the Google message are separate from browser-level controls.</div>
      <h2>6. Purposes and legal bases</h2>
      <ul>
        <li><strong>Site delivery and security:</strong> to provide requested pages, prevent abuse and maintain reliability; based on providing the service and/or legitimate interests.</li>
        <li><strong>Analytics:</strong> to understand usage and improve the service; where required, based on your consent.</li>
        <li><strong>Advertising and ad personalization:</strong> to fund the service, display and measure ads and, when permitted, personalize them; consent is requested where required by law and Google's policies.</li>
        <li><strong>Legal compliance:</strong> where processing is necessary to comply with legal obligations.</li>
      </ul>
      <h2>7. Recipients and international transfers</h2>
      <p>Information may be processed by hosting/CDN/security providers and by Google for AdSense and, when enabled, Google Analytics, including in countries other than your own. Where required, transfers rely on the safeguards offered by the provider and applicable law.</p>
      <h2>8. Data retention</h2>
      <p>Technical logs are kept only as long as needed for security, troubleshooting and operation. Analytics and advertising data are retained according to those products' settings and Google's policies.</p>
      <h2>9. Your privacy rights</h2>
      <p>Depending on where you live, you may have rights over your personal data. Under the GDPR these include access, rectification, erasure, restriction, objection, portability and withdrawal of consent, plus the right to lodge a complaint with your data-protection authority.</p>
      <p>For requests about data controlled directly by ${v.name}, contact ${mail}. For data controlled independently by Google or another provider, you may need to use that provider's privacy controls.</p>
      <h2>10. Changes to this policy</h2>
      <p>We may update this policy when the website, the services we use or legal requirements change. The date at the top shows the latest revision.</p>
      <h2>11. Contact</h2>
      <p>Privacy questions can be sent to ${mail}.</p>`,
  };
}

export function renderPrivacy(site) {
  const c = site.config;
  const v = {
    name: esc(c.name),
    email: esc(c.contactEmail),
    controller: esc(c.privacy.controllerName || c.name),
    address: c.privacy.controllerAddress ? `<br><span>${esc(c.privacy.controllerAddress)}</span>` : '',
    ga: !!c.gaMeasurementId,
  };
  const page = content(v);
  const body = `
  ${header(site)}
  <main id="main" class="policy-wrap">
    <div class="policy-hero">
      <div class="policy-kicker">${page.kicker}</div>
      <h1>${page.h1}</h1>
      <p class="policy-meta">${page.updated}: <time datetime="${esc(c.privacy.updated)}">${esc(c.privacy.updated)}</time></p>
    </div>
    <article class="policy-card">${page.html}</article>
  </main>
  ${footer(site)}`;
  return layout(site, {
    path: '/privacy-policy/',
    title: `${page.h1.replace('&amp;', '&')} | ${c.name}`,
    description: `Privacy and cookie information for ${c.name}.`,
    ogImage: site.homeOg,
    body,
  });
}

export function renderNotFound(site, suggestions = []) {
  const s = T;
  const body = `
  ${header(site)}
  <main id="main" class="e404">
    <p class="e404__code">404</p>
    <h1>${esc(s.notFoundTitle)}</h1>
    <p>${esc(s.notFoundText)}</p>
    <form class="search-box e404__search" role="search" action="/" method="get">
      ${ICONS.search.replace('<svg', '<svg class="search-icon"')}
      <input type="search" name="q" placeholder="${esc(s.searchPlaceholder)}" aria-label="${esc(s.notFoundSearch)}" autocomplete="off">
    </form>
    <a class="btn" href="/">${esc(s.backHome)}</a>
    ${suggestions.length ? `<section class="e404__games" aria-labelledby="try-h"><h2 id="try-h">${esc(s.tryThese)}</h2><div class="grid grid--related">${suggestions.map(g => gameCard(g, { sizes: '(min-width:900px) 150px, 30vw' })).join('')}</div></section>` : ''}
  </main>
  ${footer(site)}`;
  return layout(site, {
    path: '/404.html',
    noCanonical: true,
    noindex: true,
    title: `${s.notFoundTitle} | ${site.config.name}`,
    description: s.notFoundText,
    ogImage: site.homeOg,
    body,
  });
}
