// Pagine informative del sito: About, Contact e Terms of Service.
import { esc } from '../util.js';
import { layout, header, footer } from './layout.js';

function renderSitePage(site, { path, title, kicker, heading, description, html, updated = '' }) {
  const body = `
  ${header(site)}
  <main id="main" class="policy-wrap">
    <div class="policy-hero">
      <div class="policy-kicker">${kicker}</div>
      <h1>${heading}</h1>
      ${updated ? `<p class="policy-meta">Last updated: <time datetime="${esc(updated)}">${esc(updated)}</time></p>` : ''}
    </div>
    <article class="policy-card">${html}</article>
  </main>
  ${footer(site)}`;

  return layout(site, {
    path,
    title: `${title} | ${site.config.name}`,
    description,
    ogImage: site.homeOg,
    body,
  });
}

export function renderAbout(site) {
  const name = esc(site.config.name);
  return renderSitePage(site, {
    path: '/about/',
    title: `About ${site.config.name}`,
    kicker: 'About',
    heading: `About ${name}`,
    description: `Learn about ${site.config.name}, a place to discover and play free browser games.`,
    html: `
      <h2>What is ${name}?</h2>
      <p>${name} is a browser-games website built to make discovering and playing games simple. Browse the available games, explore categories, and start playing in your browser without creating an account or downloading a separate app.</p>
      <h2>Finding and playing games</h2>
      <p>Game pages provide information to help you choose what to play. The available controls, features, and device compatibility can vary from one game to another.</p>
      <h2>Game creators and content</h2>
      <p>Games may be created by independent developers and their content may be subject to the rights and notices of their respective creators or owners. Please contact us if you have a question about content published on this site.</p>
      <h2>Get in touch</h2>
      <p>For questions, feedback, or content-related requests, visit our <a href="/contact/">Contact page</a> or email <a href="mailto:${esc(site.config.contactEmail)}">${esc(site.config.contactEmail)}</a>.</p>`,
  });
}

export function renderContact(site) {
  const name = esc(site.config.name);
  const email = esc(site.config.contactEmail);
  return renderSitePage(site, {
    path: '/contact/',
    title: 'Contact',
    kicker: 'Contact',
    heading: `Contact ${name}`,
    description: `Contact ${site.config.name} with questions, feedback, or requests about the website and its content.`,
    html: `
      <h2>Contact by email</h2>
      <p>For questions about the website, feedback, or content-related requests, email us at <a href="mailto:${email}">${email}</a>.</p>
      <p>To help us understand your message, include the relevant game title or page address and describe your request clearly.</p>
      <h2>Report copyright or legal concerns</h2>
      <p>If you believe a game or other material on PewPlay infringes your rights or is unlawful, email us with the exact page URL, the game or material concerned, a clear explanation of the issue, your name and a working email address, and any information showing that you own the relevant rights or are authorised to act for the rights holder. Please also confirm that the information in your report is accurate and submitted in good faith. We may contact you for clarification and will assess the report under applicable law.</p>`,
  });
}

export function renderTerms(site) {
  const name = esc(site.config.name);
  const email = esc(site.config.contactEmail);
  const updated = site.config.termsUpdated || '2026-10-23';
  return renderSitePage(site, {
    path: '/terms-of-service/',
    title: 'Terms of Service',
    kicker: 'Legal',
    heading: 'Terms of Service',
    updated,
    description: `Terms governing access to ${site.config.name}, its free browser games, and related website features.`,
    html: `
      <p>These Terms of Service (the “Terms”) govern your use of the ${name} website at <a href="${esc(site.config.url)}">${esc(site.config.url)}</a>, including its game catalogue, game pages, categories, search and related features (together, the “Service”). By accessing or using the Service, you agree to these Terms. If you do not agree, do not use the Service.</p>

      <h2>1. What PewPlay provides</h2>
      <p>${name} is a catalogue and arcade of HTML5 games that can be played in a web browser. Game pages may include descriptions, instructions, controls, screenshots, categories and links to information about a game. The game itself is loaded in the browser when you select Play.</p>
      <p>The Service is currently offered without an account, subscription, checkout or payment to ${name}. We may fund the Service through advertising. Internet access, mobile data and any charges imposed by your network or device provider remain your responsibility.</p>

      <h2>2. Access, devices and minors</h2>
      <p>Games may work differently depending on your browser, device, operating system, screen size, input method and connection. Some games may not support every device or browser, and saved progress or high scores may be lost if you clear browser data or use a different device.</p>
      <p>Games vary in theme, difficulty and suitability; ${name} does not assign a single age rating that applies to every game. Parents and guardians should decide whether a particular game is suitable for a child and supervise the child’s use where appropriate. Do not enter personal or sensitive information into a game unless you understand who operates it and how that information may be used.</p>

      <h2>3. Games, descriptions and availability</h2>
      <p>We aim to keep the catalogue useful and functional, but game descriptions, instructions, controls, compatibility and other information may be incomplete or become out of date. We do not guarantee that every game will be continuously available, error-free, secure, compatible with your device or suitable for a particular purpose.</p>
      <p>We may correct, update, restrict, suspend or remove a game or other part of the Service, for example for maintenance, security, technical reasons, rights-holder requests or legal compliance. Where practicable, we will try to avoid unnecessary disruption, but we do not promise to keep a particular game or feature available indefinitely.</p>

      <h2>4. Copyright, software and game licences</h2>
      <p>The public source code in the PewPlay website repository is made available under the MIT License, subject to the copyright notice and conditions in that licence. Where software is covered by an open-source licence, that licence governs the rights it grants and these Terms do not narrow those rights. The PewPlay name and branding, and any text, artwork or other material not covered by that software licence, may have separate rights and must not be reused beyond what applicable law or the relevant rights holder permits.</p>
      <p>Each game is maintained in its own repository in the PewPlay GitHub organisation. Game code, artwork, sounds, names and other assets may have licences or attribution notices specific to that game. Check the licence and notices supplied with the relevant game; a licence for the website code does not automatically apply to every game or asset. Access to a game on this website does not, by itself, give you a right to download, redistribute, modify, sell or republish material that is not licensed to you for that purpose.</p>
      <p>You may access and play available games through the Service for personal enjoyment, subject to the applicable game licence, these Terms and applicable law. Commercial use, redistribution or modification is permitted only where the relevant licence or law allows it.</p>

      <h2>5. Acceptable use</h2>
      <p>You must use the Service lawfully and in a way that does not impair it for other visitors. You must not:</p>
      <ul>
        <li>use the Service to violate another person’s rights or any applicable law;</li>
        <li>attempt to gain unauthorised access to the website, its hosting, deployment systems or other systems, or probe, bypass or defeat security measures;</li>
        <li>introduce malware, malicious code, abusive traffic or anything intended to disrupt, damage or overload the Service;</li>
        <li>scrape, bulk-copy, mirror, download or republish substantial parts of the catalogue by automated means, except for ordinary search-engine indexing, an activity we have authorised, or an activity protected by applicable law;</li>
        <li>interfere with advertising systems, artificially generate ad impressions or clicks, or use the Service to defraud advertisers or other visitors; or</li>
        <li>remove or alter rights notices or use the website’s branding in a way that suggests an unauthorised association with ${name}.</li>
      </ul>
      <p>Nothing in this section prohibits an act that cannot lawfully be restricted, including rights you have under mandatory law.</p>

      <h2>6. Advertising and external services</h2>
      <p>The public version of the Service is supported in part by advertising delivered through Google AdSense. Advertisements may be selected, measured or personalised according to the consent choices and settings that apply to you. Advertisers and advertising providers are responsible for their own products, offers and services. Do not click or interact with advertisements for the purpose of artificially increasing engagement or revenue.</p>
      <p>The website may link to third-party websites, source repositories or services. Those services are controlled by their respective operators and may have separate terms, licences and privacy practices. A link does not mean that ${name} endorses the linked service or guarantees its content, availability or security.</p>

      <h2>7. Privacy, cookies and browser storage</h2>
      <p>The <a href="/privacy-policy/">Privacy &amp; Cookie Policy</a> explains how website-related technical information, analytics, advertising technologies and cookies are handled. Some games may store scores, preferences or progress in your browser, for example through local storage. The behaviour of individual games may differ, and deleting browser storage may erase saved game data.</p>
      <p>These Terms do not replace the Privacy &amp; Cookie Policy or any consent choice you make through the website’s consent controls.</p>

      <h2>8. Reporting a game, rights issue or potentially illegal content</h2>
      <p>If you believe a game or other material on ${name} infringes your rights or is unlawful, email <a href="mailto:${email}">${email}</a>. To help us assess the report, include:</p>
      <ul>
        <li>the exact page URL and, where possible, the name of the game or the specific material concerned;</li>
        <li>a clear explanation of the issue and why you believe the material is unlawful or infringes a right;</li>
        <li>your name and a working email address, plus evidence of your authority to act for a rights holder where relevant; and</li>
        <li>a statement that the information in your report is accurate and that you are acting in good faith.</li>
      </ul>
      <p>We may request further information and will assess reports in light of the information supplied and applicable law. Where appropriate, we may restrict access to or remove material. Sending a report does not guarantee a particular outcome, and intentionally false or misleading reports may delay assessment.</p>

      <h2>9. Service provided free of charge; warranties</h2>
      <p>The Service is provided free of charge and on an “as available” basis. To the maximum extent permitted by applicable law, we do not promise uninterrupted access, that defects will always be corrected, or that every game will meet your expectations. You are responsible for keeping your browser and device appropriately updated and protected.</p>
      <p>This section does not exclude any warranty, conformity requirement or other protection that mandatory consumer law requires to apply to you.</p>

      <h2>10. Liability</h2>
      <p>To the extent permitted by law, ${name} is not responsible for losses caused by events outside its reasonable control, your failure to use a compatible or appropriately maintained device, your misuse of the Service, or the operation of independent third-party websites or services.</p>
      <p>Nothing in these Terms excludes or limits liability where such exclusion or limitation is prohibited by law, including liability for fraud or wilful misconduct and any liability for death or personal injury that cannot lawfully be excluded. If you are a consumer, these Terms do not remove rights or remedies that mandatory consumer-protection law gives you. Any limitation is intended to apply only to the extent it is lawful and enforceable.</p>

      <h2>11. Changes to the Service or these Terms</h2>
      <p>We may change the Service as described above and may update these Terms when the Service or applicable legal requirements change. The “Last updated” date indicates when this page was last revised. Updated Terms apply from their stated effective date. If a material change requires notice under applicable law, we will provide that notice. You may stop using the Service if you do not agree to a revision; continued use will have the legal effect, if any, prescribed by applicable law.</p>

      <h2>12. Applicable law and consumer rights</h2>
      <p>These Terms are subject to the law applicable to the Service operator, without overriding mandatory rules that protect consumers. If you are a consumer resident in the European Union or elsewhere, any choice of law in these Terms does not deprive you of protections from which you cannot lawfully be deprived under the law applicable to you. Any dispute will be handled by the courts having jurisdiction under the applicable mandatory rules, including any mandatory consumer-jurisdiction rules.</p>

      <h2>13. Contact</h2>
      <p>For questions about these Terms or the Service, use the <a href="/contact/">Contact page</a> or email <a href="mailto:${email}">${email}</a>.</p>`,
  });
}
