// Pagine informative del sito: About, Contact e Terms of Service.
import { esc } from '../util.js';
import { layout, header, footer } from './layout.js';

function renderSitePage(site, { path, title, kicker, heading, description, html }) {
  const body = `
  ${header(site)}
  <main id="main" class="policy-wrap">
    <div class="policy-hero">
      <div class="policy-kicker">${kicker}</div>
      <h1>${heading}</h1>
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
      <h2>Content and rights-related requests</h2>
      <p>If your message concerns a specific game or piece of content, please include its page URL and explain the issue. We will review the information provided.</p>`,
  });
}

export function renderTerms(site) {
  const name = esc(site.config.name);
  const email = esc(site.config.contactEmail);
  return renderSitePage(site, {
    path: '/terms-of-service/',
    title: 'Terms of Service',
    kicker: 'Legal',
    heading: 'Terms of Service',
    description: `Terms and conditions for using ${site.config.name}.`,
    html: `
      <p>These Terms of Service apply to your access to and use of ${name}. By using the website, you agree to these terms. Do not use the website if you do not agree to them.</p>
      <h2>1. Using the website</h2>
      <p>${name} provides a website for discovering and playing browser games. You agree to use the site lawfully and not to interfere with its operation, attempt to bypass security measures, or use it in a way that damages the service or prevents others from using it.</p>
      <h2>2. Games and third-party content</h2>
      <p>Game availability, features, controls, and compatibility may change. Some games or related content may be created by independent developers or depend on third-party services. Separate terms, notices, or privacy practices may apply to those games or services.</p>
      <h2>3. Intellectual property</h2>
      <p>The ${name} website, its branding, and its original site materials may be protected by intellectual-property laws. Game names, artwork, software, and other game materials may belong to their respective creators or rights holders. These terms do not transfer ownership of those materials to you.</p>
      <h2>4. Advertising and external links</h2>
      <p>The website may display advertising or link to third-party websites and services. Third parties operate their own services and policies; please review their terms and privacy information before using them.</p>
      <h2>5. Availability and disclaimers</h2>
      <p>We may update, suspend, remove, or change parts of the website or its games. To the extent permitted by applicable law, the website is provided on an “as is” and “as available” basis, without warranties that it will always be available, error-free, or suitable for a particular purpose.</p>
      <h2>6. Limitation of liability</h2>
      <p>To the extent permitted by applicable law, ${name} will not be liable for indirect or consequential loss arising from use of, or inability to use, the website. Nothing in these terms excludes or limits liability where doing so would be unlawful.</p>
      <h2>7. Changes to these terms</h2>
      <p>We may revise these terms when the website or applicable requirements change. The revised version will be published on this page. Continued use of the website after a revision means you accept the revised terms, to the extent permitted by law.</p>
      <h2>8. Contact</h2>
      <p>Questions about these terms can be sent to <a href="mailto:${email}">${email}</a> or submitted through our <a href="/contact/">Contact page</a>.</p>`,
  });
}
