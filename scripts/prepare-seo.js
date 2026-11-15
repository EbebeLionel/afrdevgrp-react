/**
 * Runs before every build. Writes public/robots.txt and public/sitemap.xml
 * using the site's real address, so search engines are pointed at the right
 * domain even if it changes later.
 *
 * Address used: REACT_APP_SITE_URL from the environment (Vercel), otherwise
 * the default in .env.
 */
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');

function readEnvFile(name) {
  const file = path.join(root, name);
  if (!fs.existsSync(file)) return undefined;
  const match = fs.readFileSync(file, 'utf8').match(/^REACT_APP_SITE_URL=(.+)$/m);
  return match ? match[1].trim() : undefined;
}

const siteUrl = (
  process.env.REACT_APP_SITE_URL ||
  readEnvFile('.env.production.local') ||
  readEnvFile('.env.local') ||
  readEnvFile('.env') ||
  ''
).replace(/\/+$/, '');

if (!/^https?:\/\//.test(siteUrl)) {
  console.error('prepare-seo: REACT_APP_SITE_URL must be set to the full site address (https://...).');
  process.exit(1);
}

// Public pages worth indexing. /auth is deliberately left out.
const pages = [
  { path: '/', priority: '1.0', changefreq: 'weekly' },
  { path: '/events', priority: '0.9', changefreq: 'weekly' },
  { path: '/reels', priority: '0.7', changefreq: 'weekly' },
];

const today = new Date().toISOString().slice(0, 10);

const sitemap =
  '<?xml version="1.0" encoding="UTF-8"?>\n' +
  '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
  pages
    .map(
      (p) =>
        `  <url>\n    <loc>${siteUrl}${p.path}</loc>\n    <lastmod>${today}</lastmod>\n` +
        `    <changefreq>${p.changefreq}</changefreq>\n    <priority>${p.priority}</priority>\n  </url>\n`
    )
    .join('') +
  '</urlset>\n';

const robots = `User-agent: *\nAllow: /\nDisallow: /auth\n\nSitemap: ${siteUrl}/sitemap.xml\n`;

fs.writeFileSync(path.join(root, 'public', 'sitemap.xml'), sitemap);
fs.writeFileSync(path.join(root, 'public', 'robots.txt'), robots);
console.log(`prepare-seo: wrote robots.txt and sitemap.xml for ${siteUrl}`);
