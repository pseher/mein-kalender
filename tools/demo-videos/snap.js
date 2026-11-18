// Beispiel-Dokumente als Bild + Lage der wichtigen Stellen (für Bildausschnitte im Video)
const { chromium } = require("playwright"); const fs=require("fs"); const S=2.77, box={};
(async()=>{ const b=await chromium.launch(); const p=await b.newPage({viewport:{width:390,height:800},deviceScaleFactor:S});
for (const n of ["hotel","ticket"]) { await p.goto("file://"+__dirname+"/"+n+".html"); await p.waitForTimeout(400); await p.screenshot({path:__dirname+"/"+n+".jpg",fullPage:true,type:"jpeg",quality:90});
  box[n]=await p.evaluate(S=>Object.fromEntries([...document.querySelectorAll("[data-k]")].map(e=>{ const r=e.getBoundingClientRect(); return [e.dataset.k,[r.x*S,r.y*S,r.width*S,r.height*S].map(Math.round)]; })),S); }
fs.writeFileSync(__dirname+"/boxes.json",JSON.stringify(box)); console.log(JSON.stringify(box)); await b.close(); })();
