#!/usr/bin/env node
// Build the portfolio: embed app icons, the two playable web games,
// PupWalk screenshots, and (if present) native-app clips — all inlined.
const fs = require('fs');
const { execSync } = require('child_process');
const os = require('os');
const path = require('path');

const DIR = __dirname;
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'build-'));
const D = process.env.HOME + '/Desktop';

/* ---------- 1. App icons -> CSS custom props ---------- */
const ICONS = {
  swing:    D + '/1moreswing_ios/assets/icon-only.png',
  neondrop: D + '/neondrop/unity/Assets/Icon/AppIcon.png',
  ember:    D + '/ember/assets/images/icon-ember.png',
  subtrack: D + '/subtrack/assets/images/icon.png',
  pupwalk:  D + '/pupwalk/PupWalk/Assets.xcassets/AppIcon.appiconset/AppIcon1024.png',
};
function pngDataUrl(src, w) {
  const out = path.join(TMP, path.basename(src) + '.' + w + '.png');
  execSync(`sips --resampleWidth ${w} --out ${JSON.stringify(out)} ${JSON.stringify(src)}`, { stdio: 'ignore' });
  return 'data:image/png;base64,' + fs.readFileSync(out).toString('base64');
}
let iconCss = ':root{\n';
for (const [slug, src] of Object.entries(ICONS)) {
  if (!fs.existsSync(src)) throw new Error('missing icon: ' + src);
  iconCss += `  --i-${slug}:url("${pngDataUrl(src, 384)}");\n`;
}
// Bubble Blocker has no repo icon yet — generate one matching its Neon theme
const bubbleSvg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">' +
  '<rect width="100" height="100" rx="23" fill="#0a0b16"/>' +
  '<circle cx="35" cy="38" r="16" fill="#00f0ff"/><circle cx="66" cy="34" r="12" fill="#ff3ec8"/>' +
  '<circle cx="52" cy="64" r="14" fill="#b6ff3c"/>' +
  '<circle cx="30" cy="33" r="4" fill="#fff" opacity=".8"/><circle cx="62" cy="30" r="3" fill="#fff" opacity=".8"/>' +
  '<circle cx="48" cy="59" r="3.5" fill="#fff" opacity=".8"/></svg>';
iconCss += `  --i-bubble:url("data:image/svg+xml,${encodeURIComponent(bubbleSvg)}");\n`;
iconCss += '}';

/* ---------- 2. Playable web games -> base64(UTF-8 HTML) ---------- */
function preprocessGame(html) {
  // strip any external ad / analytics scripts (defensive; CSP would block them anyway)
  html = html.replace(/<script\b[^>]*\bsrc=["'][^"']*(googlesyndication|googletagmanager|google-analytics|gtag|doubleclick|adsbygoogle|connect\.facebook)[^"']*["'][^>]*>\s*<\/script>/gi, '');
  // offline shim: make network calls fail fast & quietly so the game falls back to local play
  const shim = '<script>(function(){try{var f=window.fetch;window.fetch=function(){return Promise.reject(new Error("offline-preview"))};}catch(e){}' +
               'try{navigator.sendBeacon=function(){return false};}catch(e){}' +
               'try{var X=window.XMLHttpRequest;window.XMLHttpRequest=function(){var x=new X();var o=x.open;x.open=function(m,u){try{if(/^https?:/i.test(u)&&u.indexOf(location.origin)!==0){u="data:text/plain,"}}catch(e){}return o.apply(x,[m,u].concat([].slice.call(arguments,2)))};return x};}catch(e){}' +
               'window.__PREVIEW__=true;})();</script>';
  if (/<head[^>]*>/i.test(html)) html = html.replace(/<head[^>]*>/i, m => m + shim);
  else html = shim + html;
  return html;
}
const GAMES = {
  swing:    D + '/1moreswing_ios/www/index.html',
  neondrop: D + '/neondrop/www/index.html',
  bubble:   path.join(DIR, 'bubble.html'),
};
const games = {};
for (const [slug, src] of Object.entries(GAMES)) {
  if (!fs.existsSync(src)) throw new Error('missing game: ' + src);
  const html = preprocessGame(fs.readFileSync(src, 'utf8'));
  games[slug] = Buffer.from(html, 'utf8').toString('base64');
}

/* ---------- 3. PupWalk real screenshots -> data URLs ---------- */
const PUPWALK_SHOTS = ['happy2.png', 'sleep.png', 'bandana-green.png']
  .map(f => D + '/pupwalk/build/' + f)
  .filter(fs.existsSync);
const shots = { pupwalk: PUPWALK_SHOTS.map(s => pngDataUrl(s, 560)) };

/* ---------- 4. Native-app clips (optional) -> data URLs ---------- */
// Drop compressed mp4s named <app>.mp4 into scratchpad/clips/ and rebuild.
const videos = {};
const CLIPS = path.join(DIR, 'clips');
if (fs.existsSync(CLIPS)) {
  for (const app of ['ember', 'subtrack', 'pupwalk']) {
    const mp4 = path.join(CLIPS, app + '.mp4');
    if (fs.existsSync(mp4)) videos[app] = 'data:video/mp4;base64,' + fs.readFileSync(mp4).toString('base64');
  }
}

/* ---------- 5. Assemble ---------- */
const MEDIA = JSON.stringify({ games, shots, videos });
let html = fs.readFileSync(path.join(DIR, 'resume.template.html'), 'utf8');
if (!html.includes('/*__APP_ICONS__*/')) throw new Error('icon placeholder missing');
if (!html.includes('/*__MEDIA_PLACEHOLDER__*/{}')) throw new Error('media placeholder missing');
html = html.replace('/*__APP_ICONS__*/', iconCss)
           .replace('/*__MEDIA_PLACEHOLDER__*/{}', MEDIA);
const dest = path.join(DIR, 'resume.html');
fs.writeFileSync(dest, html);

console.log('games:   ' + Object.keys(games).map(k => k + ' ' + (games[k].length / 1024).toFixed(0) + 'KB').join(', '));
console.log('shots:   pupwalk x' + shots.pupwalk.length);
console.log('videos:  ' + (Object.keys(videos).join(', ') || '(none yet)'));
console.log('wrote ' + dest + '  (' + (html.length / 1024 / 1024).toFixed(2) + ' MB)');
