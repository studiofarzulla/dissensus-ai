#!/usr/bin/env node
/**
 * Dissensus — IndexNow ping
 *
 * Tells the IndexNow-participating engines (Bing, Yandex, Naver, Seznam and others;
 * Google is not one) which URLs changed, instead of waiting for a recrawl. Bing's
 * index is one of the feeds behind ChatGPT search, so this is the cheapest
 * deterministic way to get a new paper page in front of it.
 *
 * The key is a public file (https://dissensus.ai/<key>.txt), which is how IndexNow
 * proves the submitter controls the host; committing it is expected.
 *
 * Run AFTER the push has deployed (the engines fetch the URLs immediately):
 *   node indexnow.js                 # every URL in public/sitemap.xml
 *   node indexnow.js /papers/x /news/y   # just these paths
 */

const fs = require('fs');
const https = require('https');

const HOST = 'dissensus.ai';
const KEY = '31dde54ee5c4516b4c1d7949cd7eecc7';

const args = process.argv.slice(2);
const urls = args.length
  ? args.map(p => (/^https?:/.test(p) ? p : `https://${HOST}${p.startsWith('/') ? '' : '/'}${p}`))
  : [...fs.readFileSync('public/sitemap.xml', 'utf8').matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => m[1]);

if (!urls.length) { console.error('no URLs to submit'); process.exit(1); }

const body = JSON.stringify({ host: HOST, key: KEY, keyLocation: `https://${HOST}/${KEY}.txt`, urlList: urls });
const req = https.request({
  hostname: 'api.indexnow.org', path: '/indexnow', method: 'POST',
  headers: { 'Content-Type': 'application/json; charset=utf-8', 'Content-Length': Buffer.byteLength(body) },
}, res => {
  let out = '';
  res.on('data', d => { out += d; });
  res.on('end', () => {
    // 200 = accepted, 202 = accepted (key validation pending); anything else is a defect.
    console.log(`IndexNow: HTTP ${res.statusCode} for ${urls.length} URL(s)${out ? ' — ' + out.trim() : ''}`);
    process.exit(res.statusCode === 200 || res.statusCode === 202 ? 0 : 1);
  });
});
req.on('error', e => { console.error('IndexNow request failed:', e.message); process.exit(1); });
req.write(body);
req.end();
