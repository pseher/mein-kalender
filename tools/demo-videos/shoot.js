const { chromium } = require("playwright"); const fs=require("fs");
const SC=process.argv[2], ONLY=process.argv[3]; const OUT=__dirname+"/af-"+SC;
(async()=>{ const b=await chromium.launch(); const p=await b.newPage({viewport:{width:1080,height:1920}});
await p.goto("file://"+__dirname+"/anim.html?sc="+SC); await p.evaluate(()=>document.fonts.ready); await p.waitForTimeout(500);
if (ONLY) { for (const t of ONLY.split(",")) { await p.evaluate(t=>render(+t),t); await p.screenshot({path:`${__dirname}/a-${SC}-${t}.jpg`,type:"jpeg",quality:80}); } await b.close(); return; }
fs.rmSync(OUT,{recursive:true,force:true}); fs.mkdirSync(OUT); const END=await p.evaluate(()=>END);
for (let i=0;i<=Math.round(END*30);i++){ await p.evaluate(t=>render(t),i/30); await p.screenshot({path:`${OUT}/f${String(i).padStart(5,"0")}.jpg`,type:"jpeg",quality:90}); }
console.log("frames", Math.round(END*30)); await b.close(); })();
