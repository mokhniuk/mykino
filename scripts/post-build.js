#!/usr/bin/env bun

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Import all languages
import { en } from '../src/lib/i18n/en';
import { ua } from '../src/lib/i18n/ua';
import { de } from '../src/lib/i18n/de';
import { cs } from '../src/lib/i18n/cs';
import { pl } from '../src/lib/i18n/pl';
import { pt } from '../src/lib/i18n/pt';
import { hr } from '../src/lib/i18n/hr';
import { it } from '../src/lib/i18n/it';
import { es } from '../src/lib/i18n/es';

const translations = { en, ua, de, cs, pl, pt, hr, it, es };
const languages = Object.keys(translations);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const distDir = path.join(__dirname, '..', 'dist');
const indexPath = path.join(distDir, 'index.html');

if (!fs.existsSync(indexPath)) {
  console.error('❌ index.html not found in dist directory');
  process.exit(1);
}

const indexContent = fs.readFileSync(indexPath, 'utf8');

// SPA routes that should just be copies of index.html
const spaRoutes = [
  '/app',
  '/app/search',
  '/app/watchlist',
  '/app/watched',
  '/app/settings',
  '/app/favourites',
  '/app/achievements/top100',
  '/app/achievements/milestones'
];

// Marketing/Legal routes that should be SSG with content
const ssgRoutes = [
  { path: '', template: 'landing' },
  { path: '/pricing', template: 'pricing' },
  { path: '/community', template: 'community' },
  { path: '/privacy', template: 'privacy' },
  { path: '/terms', template: 'terms' },
  { path: '/contact', template: 'contact' }
];

console.log('📄 Creating static HTML files for SPA routes...');
spaRoutes.forEach(route => {
  const routePath = path.join(distDir, route);
  fs.mkdirSync(routePath, { recursive: true });
  fs.writeFileSync(path.join(routePath, 'index.html'), indexContent);
});

console.log('🌍 Generating localized SSG pages...');

function getNoscriptContent(template, t) {
  const styles = '<style>body{font-family:sans-serif;max-width:860px;margin:1rem auto;padding:2rem;line-height:1.6;color:#1a1a1b;background:#fff}h1,h2,h3{font-weight:700;color:#000}a{color:#7c3aed}header{margin-bottom:3rem}section{margin-bottom:2rem}footer{margin-top:4rem;border-top:1px solid #eee;padding-top:2rem}</style>';

  const header = `
    <header>
      <img src="/icon-192.png" alt="My Kino" width="64" height="64" />
      <p>My Kino</p>
      <nav><a href="/app">${t.enterApp || 'Enter the app →'}</a></nav>
    </header>
  `;

  const footer = `
    <footer>
      <p>&copy; 2026 mykino.app &mdash; ${t.authorName || 'Oleg Mokhniuk'}</p>
    </footer>
  `;

  if (template === 'landing') {
    return `
      <noscript>
        ${styles}
        ${header}
        <main>
          <h1>${t.landingHeadline}</h1>
          <p>${t.landingTagline}</p>
          <section>
            <h2>${t.landingSetupTitle}</h2>
            <ul>
              <li><strong>${t.landingFeaturePrivate}</strong>: ${t.landingFeaturePrivate}</li>
              <li><strong>${t.landingFeatureOffline}</strong>: ${t.landingFeatureOffline}</li>
              <li><strong>${t.landingFeatureNoAccount}</strong>: ${t.landingFeatureNoAccount}</li>
            </ul>
          </section>
          <section>
            <h2>${t.landingAiTitle}</h2>
            <p>${t.landingAiDesc}</p>
          </section>
        </main>
        ${footer}
      </noscript>
    `;
  }

  if (template === 'pricing') {
    return `
      <noscript>
        ${styles}
        ${header}
        <main>
          <h1>${t.pricingHero}</h1>
          <p>${t.pricingSubtitle}</p>
          <section>
            <h2>${t.pricingDemoName}</h2>
            <p>${t.pricingDemoDesc}</p>
          </section>
          <section>
            <h2>${t.pricingFreeName}</h2>
            <p>${t.pricingFreeDesc}</p>
          </section>
          <section>
            <h2>Pro</h2>
            <p>${t.pricingProDesc}</p>
          </section>
        </main>
        ${footer}
      </noscript>
    `;
  }

  if (template === 'community') {
    return `
      <noscript>
        ${styles}
        ${header}
        <main>
          <h1>${t.communityHeroLine1} ${t.communityHeroLine2}</h1>
          <p>${t.communitySubtitle}</p>
          <section>
            <h2>Features</h2>
            <ul>
              <li>${t.communityF1Title}: ${t.communityF1Desc}</li>
              <li>${t.communityF2Title}: ${t.communityF2Desc}</li>
              <li>${t.communityF3Title}: ${t.communityF3Desc}</li>
            </ul>
          </section>
        </main>
        ${footer}
      </noscript>
    `;
  }

  if (template === 'privacy') {
    return `
      <noscript>
        ${styles}
        ${header}
        <main>
          <h1>${t.privacyTitle}</h1>
          <p>${t.privacyUpdated}</p>
          <section>
            <h2>${t.privacyShortTitle}</h2>
            <p>${t.privacyShortText}</p>
          </section>
          <section>
            <h2>${t.privacyDataTitle}</h2>
            <h3>${t.privacyLocalTitle}</h3>
            <p>${t.privacyLocalText}</p>
            <h3>${t.privacyAnalyticsTitle}</h3>
            <p>${t.privacyAnalyticsText}</p>
          </section>
        </main>
        ${footer}
      </noscript>
    `;
  }

  if (template === 'terms') {
    return `
      <noscript>
        ${styles}
        ${header}
        <main>
          <h1>${t.termsTitle}</h1>
          <p>${t.termsUpdated}</p>
          <section>
            <h2>${t.termsAcceptTitle}</h2>
            <p>${t.termsAcceptText}</p>
          </section>
          <section>
            <h2>${t.termsWhatTitle}</h2>
            <p>${t.termsWhatText}</p>
          </section>
        </main>
        ${footer}
      </noscript>
    `;
  }

  if (template === 'contact') {
    return `
      <noscript>
        ${styles}
        ${header}
        <main>
          <h1>${t.contactTitle}</h1>
          <p>${t.contactSubtitle}</p>
          <section>
            <h2>${t.contactEmailTitle}</h2>
            <p>hello@mykino.app</p>
          </section>
        </main>
        ${footer}
      </noscript>
    `;
  }

  return '<noscript></noscript>';
}

languages.forEach(lang => {
  const t = translations[lang];

  ssgRoutes.forEach(route => {
    const isRoot = route.path === '';
    const routeDir = lang === 'en'
      ? (isRoot ? distDir : path.join(distDir, route.path))
      : path.join(distDir, lang, route.path);

    fs.mkdirSync(routeDir, { recursive: true });

    let content = indexContent;

    // Update html lang attribute
    content = content.replace('<html lang="en">', `<html lang="${lang}">`);

    // Update head metadata
    const title = lang === 'en' && isRoot
      ? 'My Kino — Track films. No account, no cloud.'
      : `${t.home || 'My Kino'} — ${t[route.template + 'Title'] || t.landingHeadline}`;

    const description = t.landingTagline || 'Track films. No account, no cloud.';

    content = content
      .replace(/<title>.*?<\/title>/, `<title>${title}</title>`)
      .replace(/content="Discover, track, and organize your favourite movies with My Kino."/, `content="${description}"`)
      .replace(/content="My Kino — Movie Recommendations"/, `content="${title}"`)
      .replace(/content="Discover, track, and organize your favourite movies."/, `content="${description}"`);

    // Inject noscript content for SEO
    const noscript = getNoscriptContent(route.template, t);
    content = content.replace('<div id="root"></div>', `<div id="root">${noscript}</div>`);

    const fileName = (lang === 'en' && isRoot) ? 'landing.html' : 'index.html';
    fs.writeFileSync(path.join(routeDir, fileName), content);

    console.log(`✅ Created ${lang}${route.path}/${fileName}`);
  });
});

// Create a copy of landing.html as index.html in dist for non-SPA root
if (fs.existsSync(path.join(distDir, 'landing.html'))) {
  fs.copyFileSync(path.join(distDir, 'landing.html'), path.join(distDir, 'index.html'));
  console.log('✅ Updated dist/index.html with pre-rendered landing page');
}

console.log('🎉 SSG generation complete!');
