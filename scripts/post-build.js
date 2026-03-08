#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const distDir = path.join(__dirname, '..', 'dist');
const indexPath = path.join(distDir, 'index.html');

// Routes that should be prerendered as static files
const staticRoutes = [
  '/app',
  '/app/search',
  '/app/watchlist',
  '/app/watched',
  '/app/settings',
  '/app/favourites',
  '/app/achievements/top100',
  '/app/achievements/milestones'
];

console.log('📄 Creating static HTML files for SPA routes...');

if (!fs.existsSync(indexPath)) {
  console.error('❌ index.html not found in dist directory');
  process.exit(1);
}

const indexContent = fs.readFileSync(indexPath, 'utf8');

// Create directories and HTML files for each static route
staticRoutes.forEach(route => {
  const routePath = path.join(distDir, route);
  const htmlPath = path.join(routePath, 'index.html');

  // Create directory if it doesn't exist
  fs.mkdirSync(routePath, { recursive: true });

  // Copy index.html to route directory
  fs.writeFileSync(htmlPath, indexContent);

  console.log(`✅ Created ${route}/index.html`);
});

// ── Generate pre-rendered landing page for web crawlers ────────────────────────
// Nginx serves this file for exact GET / requests; all other routes still get
// the SPA index.html. React's createRoot() replaces the noscript content for
// real users; bots/scrapers that skip JS see the full landing text.
console.log('🔍 Generating pre-rendered landing page...');

const landingStaticContent = `
<noscript>
  <style>body{font-family:sans-serif;max-width:860px;margin:0 auto;padding:2rem;line-height:1.6}h1,h2,h3{font-weight:700}a{color:#7c3aed}</style>
  <header>
    <img src="/icon-192.png" alt="My Kino" width="64" height="64" />
    <p>My Kino</p>
    <h1>Track films. No account, no cloud.</h1>
    <p>Log what you've watched, discover what's next, and get AI picks — all stored privately on your device, no sign-up needed.</p>
    <a href="/app">Enter the app →</a>
    <p>
      <strong>Data stays on your device</strong> &nbsp;·&nbsp;
      <strong>No internet required</strong> &nbsp;·&nbsp;
      <strong>No sign-up needed</strong>
    </p>
  </header>
  <main>
    <section>
      <h2>01 &mdash; Choose your language</h2>
      <p>My Kino speaks your language. Supports English, Ukrainian, German, Czech, Polish, Portuguese (BR), Croatian, Italian, and Spanish — movie data and UI both localised.</p>
    </section>
    <section>
      <h2>02 &mdash; Light or dark, your call</h2>
      <p>Pick light mode, dark mode, or follow your system preference. No account needed to save your choice.</p>
    </section>
    <section>
      <h2>03 &mdash; Tell us your taste</h2>
      <p>Mark genres you love and ones you want to skip. My Kino uses your preferences to shape every recommendation.</p>
    </section>
    <section>
      <h2>04 &mdash; Log what you've already seen</h2>
      <p>Search any film or pick from the top 100 to seed your history. My Kino immediately starts recommending based on what you've watched.</p>
    </section>
    <section>
      <h2>AI-powered recommendations</h2>
      <p>Connect your own AI model — OpenAI, Anthropic Claude, Google Gemini, Mistral, or a local Ollama instance — and get personalised picks based on your entire watch history. Your API key, your data.</p>
    </section>
    <section>
      <h2>Private by design</h2>
      <p>Everything lives in your browser's local storage. No server, no account, no data sold. My Kino analytics are public and viewable on Umami.</p>
    </section>
    <section>
      <h2>Install to home screen</h2>
      <p>Add My Kino to your home screen as a PWA. Works offline, feels native, and requires no App Store download.</p>
      <h3>iOS</h3>
      <ol>
        <li>Open mykino.app in Safari</li>
        <li>Tap the Share icon</li>
        <li>Tap "Add to Home Screen"</li>
      </ol>
      <h3>Android</h3>
      <ol>
        <li>Open mykino.app in Chrome</li>
        <li>Tap the menu (⋮)</li>
        <li>Tap "Add to Home Screen"</li>
      </ol>
    </section>
    <section>
      <h2>Your film universe awaits</h2>
      <a href="/app">Enter the app →</a>
    </section>
  </main>
  <footer>
    <p>&copy; 2026 mykino.app &mdash; Made by Oleg Mokhniuk</p>
  </footer>
</noscript>
`.trim();

const landingHtml = indexContent
  // Update page title
  .replace(
    '<title>My Kino — Movie Recommendations</title>',
    '<title>My Kino — Track films. No account, no cloud.</title>'
  )
  // Update meta description
  .replace(
    'content="Discover, track, and organize your favourite movies with My Kino."',
    'content="Track films. No account, no cloud. My Kino stores your watch history, favourites, and AI recommendations privately on your device — no sign-up needed."'
  )
  // Update OG title
  .replace(
    'content="My Kino — Movie Recommendations"',
    'content="My Kino — Track films. No account, no cloud."'
  )
  // Update OG description
  .replace(
    'content="Discover, track, and organize your favourite movies."',
    'content="Log what you\'ve watched, discover what\'s next, and get AI picks — all stored privately on your device, no sign-up needed."'
  )
  // Inject static content into #root (noscript: React replaces it for real users, crawlers see it)
  .replace('<div id="root"></div>', `<div id="root">${landingStaticContent}</div>`);

fs.writeFileSync(path.join(distDir, 'landing.html'), landingHtml);
console.log('✅ Created landing.html');

console.log('🎉 Static HTML files created successfully!');
console.log('📋 Upload the dist/ folder contents to your Hostinger public_html directory');