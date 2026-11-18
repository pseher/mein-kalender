// Rendert Untertitel, Rahmen, Hintergrund, Start- und Endkarte als PNG (1080×1920)
const { chromium } = require("playwright"); const fs=require("fs");
const S=JSON.parse(fs.readFileSync(__dirname+"/story.json","utf8")); const SC=process.argv[2];
const css=`@font-face{font-family:R;font-weight:400;src:url(file://${__dirname}/roboto-latin-400-normal.woff2)}@font-face{font-family:R;font-weight:500;src:url(file://${__dirname}/roboto-latin-500-normal.woff2)}@font-face{font-family:R;font-weight:700;src:url(file://${__dirname}/roboto-latin-700-normal.woff2)}
html,body{margin:0;width:1080px;height:1920px;font-family:R,sans-serif;background:transparent}`;
const BG="#e8f3ee", ACC="#0b7a5f", INK="#111";
const X=155, Y=330, WW=770, HH=1500, RAD=44;
(async()=>{ const b=await chromium.launch(); const p=await b.newPage({viewport:{width:1080,height:1920}});
const shot=async(html,file,transp=true)=>{ fs.writeFileSync(__dirname+'/_c.html',`<!doctype html><meta charset=utf-8><style>${css}</style>${html}`); await p.goto('file://'+__dirname+'/_c.html'); await p.evaluate(()=>document.fonts.ready); await p.waitForTimeout(100); await p.screenshot({path:file,omitBackground:transp}); };
// Hintergrund mit Schatten unter dem Bildschirm
await shot(`<div style="position:absolute;inset:0;background:${BG}"></div><div style="position:absolute;left:${X}px;top:${Y}px;width:${WW}px;height:${HH}px;border-radius:${RAD}px;background:#fff;box-shadow:0 30px 70px rgba(20,60,50,.28)"></div>
  <div style="position:absolute;left:0;right:0;bottom:34px;text-align:center;font:500 30px R;color:${ACC}">Mein Kalender</div>`,`bg.png`,false);
// Ecken-Maske: Hintergrundfarbe außerhalb der runden Ecken + feiner Rand
await shot(`<svg width="1080" height="1920" style="position:absolute;inset:0"><defs><mask id="m"><rect width="1080" height="1920" fill="white"/><rect x="${X}" y="${Y}" width="${WW}" height="${HH}" rx="${RAD}" fill="black"/></mask></defs>
  <rect x="${X}" y="${Y}" width="${WW}" height="${HH}" fill="${BG}" mask="url(#m)"/><rect x="${X}" y="${Y}" width="${WW}" height="${HH}" rx="${RAD}" fill="none" stroke="rgba(0,0,0,.10)" stroke-width="2"/></svg>`,`mask.png`);
S[SC].caps.forEach(async()=>{});
for (const [i,[t,h,s]] of S[SC].caps.entries())
  await shot(`<div style="position:absolute;left:60px;right:60px;top:70px;height:230px;display:flex;flex-direction:column;justify-content:center;text-align:center">
    <div style="font:700 62px/1.12 R;color:${INK}">${h}</div><div style="font:400 38px/1.3 R;color:#2a2f2d;margin-top:14px">${s}</div></div>`,`cap-${SC}-${i}.png`);
const card=(a,c,big)=>`<div style="position:absolute;inset:0;background:${BG};display:flex;flex-direction:column;justify-content:center;align-items:center;text-align:center;padding:0 90px">
  <img src="file://${__dirname}/icon.png" style="width:150px;height:150px;border-radius:34px;margin-bottom:60px;box-shadow:0 12px 30px rgba(0,0,0,.15)">
  <div style="font:700 ${big?96:84}px/1.08 R;color:${INK}">${a}</div><div style="font:500 50px/1.3 R;color:${ACC};margin-top:34px">${c}</div></div>`;
await shot(card(...S[SC].intro,true),`intro-${SC}.png`,false);
await shot(card(...S[SC].outro,false),`outro-${SC}.png`,false);
await b.close(); })();
