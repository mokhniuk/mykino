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

console.log('🎉 Static HTML files created successfully!');
console.log('📋 Upload the dist/ folder contents to your Hostinger public_html directory');