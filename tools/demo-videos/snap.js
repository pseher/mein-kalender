const { chromium } = require("playwright");
(async()=>{ const b=await chromium.launch(); const p=await b.newPage({viewport:{width:390,height:800},deviceScaleFactor:2.77});
for (const n of ["hotel","ticket"]) { await p.goto("file://"+process.cwd()+"/"+n+".html"); await p.waitForTimeout(400); await p.screenshot({path:n+".jpg",fullPage:true,type:"jpeg",quality:88}); }
await b.close(); })();
