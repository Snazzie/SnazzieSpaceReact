// Submits every URL in the sitemap to IndexNow (Bing/Yandex/Naver) after a deploy.
// Key file lives at public/<key>.txt and must already be live at that URL.
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join, dirname } from 'node:path';

const root = dirname(fileURLToPath(import.meta.url));
const publicDir = join(root, '..', 'public');
const distDir = join(root, '..', 'dist');

const keyFile = readdirSync(publicDir).find((f) => /^[a-f0-9]{32}\.txt$/.test(f));
if (!keyFile) {
  console.error('indexnow: no key file found in public/, skipping submission');
  process.exit(0);
}
const key = keyFile.replace('.txt', '');

const sitemap = readFileSync(join(distDir, 'sitemap-0.xml'), 'utf8');
const urlList = [...sitemap.matchAll(/<loc>(.*?)<\/loc>/g)].map((m) => m[1]);

if (urlList.length === 0) {
  console.error('indexnow: no URLs found in sitemap-0.xml, skipping submission');
  process.exit(0);
}

const res = await fetch('https://api.indexnow.org/indexnow', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json; charset=utf-8' },
  body: JSON.stringify({
    host: 'snazzie.space',
    key,
    keyLocation: `https://snazzie.space/${keyFile}`,
    urlList,
  }),
});

console.log(`indexnow: submitted ${urlList.length} URLs, status ${res.status}`);
