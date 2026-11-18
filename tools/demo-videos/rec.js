// Nimmt einen Ablauf in der echten App auf (Beispieldaten, simulierte KI) – Bilder per CDP-Screencast
const { chromium } = require("playwright"); const fs=require("fs"), path=require("path");
const ROOT=path.resolve(__dirname,"../.."), SC=process.argv[2]||"hotel", OUT=__dirname+"/frames-"+SC;
fs.rmSync(OUT,{recursive:true,force:true}); fs.mkdirSync(OUT);
const fake=fs.readFileSync(__dirname+"/fake-supabase.js","utf8");
const AI = {
  assistent: { reply: "Ich habe deine Hotelbuchung erkannt – ich trage die Reise für dich ein.", actions: [{ op: "add", event: { type: "trip", title: "Hotel Seeblick Warnemünde", from: "2026-12-11", to: "2026-12-13", time: "15:00", endTime: "", place: "Seestraße 12, 18119 Rostock-Warnemünde", note: "Check-in ab 15:00 · Check-out bis 11:00 · Frühstück inklusive · Buchung 4817 2290", mode: "", flight: false, kids: false, repeat: "none", calendar: "" } }] },
  dok_hotel: { zusammenfassung: "Hotel Seeblick Warnemünde, Doppelzimmer mit Meerblick, 2 Nächte mit Frühstück, Buchung 4817 2290", zeiten: "Check-in ab 15:00 · Check-out bis 11:00", anreise: "", ort: "",
    packliste: ["Personalausweis (für den Check-in)", "Badesachen (Pool und Sauna)"],
    aufgaben: [{ t: "Kostenlos stornieren nur bis 09.12., 18:00 Uhr", faellig: "2026-12-09" }, { t: "312 € im Hotel bezahlen", faellig: "2026-12-11" }, { t: "Parkplatz am Haus: 12 € pro Nacht", faellig: "" }] },
  dok_zug: { zusammenfassung: "Sparpreis Hin- und Rückfahrt Berlin ⇄ Rostock, 2 Personen, Auftrag 7H4K2P", zeiten: "Hinfahrt 11.12., 09:12 Uhr ab Berlin Hbf (ICE 1707) · Rückfahrt 13.12., 16:44 Uhr ab Rostock Hbf (IC 2239)", anreise: "zug", ort: "",
    packliste: ["Lichtbildausweis (Ticket nur mit Ausweis gültig)"],
    aufgaben: [{ t: "Zugbindung: nur ICE 1707 und IC 2239 nutzen", faellig: "" }, { t: "Ticket aufs Handy laden", faellig: "2026-12-10" }] },
};
(async()=>{ const b=await chromium.launch();
const ctx=await b.newContext({ viewport:{width:390,height:760}, deviceScaleFactor:2, isMobile:true, hasTouch:true, colorScheme:"light", serviceWorkers:"block", locale:"de-DE", timezoneId:"Europe/Berlin" });
await ctx.route(/^https:\/\/app\.test\/(.*)$/, r=>{ let f=new URL(r.request().url()).pathname; if(f.endsWith("/")) f+="index.html"; if (f==="/app/supabase.js") return r.fulfill({contentType:"application/javascript",body:fake}); const fp=path.join(ROOT,f); if(!fs.existsSync(fp)) return r.fulfill({status:404,body:""}); r.fulfill({contentType:f.endsWith(".html")?"text/html":f.endsWith(".js")?"application/javascript":f.endsWith(".woff2")?"font/woff2":"application/octet-stream",body:fs.readFileSync(fp)}); });
await ctx.route(/googleapis\.com\/calendar\/v3\/(.*)/, r=>{ const u=new URL(r.request().url()); const H={"Access-Control-Allow-Origin":"*","Content-Type":"application/json"};
  if (u.pathname.endsWith("/calendarList")) return r.fulfill({headers:H,body:JSON.stringify({items:[{id:"me@gmail.com",summary:"Privat",primary:true,accessRole:"owner"}]})});
  r.fulfill({headers:H,body:JSON.stringify({items:[]})}); });
let dokN = SC === "zug" ? "dok_zug" : "dok_hotel";
await ctx.route(/photon\.komoot\.io|workers\.dev/, async r=>{ const H={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"*","Content-Type":"application/json"};
  if (r.request().method()==="OPTIONS") return r.fulfill({headers:H,body:""});
  const u=new URL(r.request().url());
  if (u.pathname==="/ai") { const body=JSON.parse(r.request().postData()||"{}"); await new Promise(x=>setTimeout(x,1600));
    const v = body.task==="assistent" ? AI.assistent : body.task==="dokumente" ? AI[dokN] : null; return r.fulfill({headers:H,body:JSON.stringify({value:v,text:""})}); }
  r.fulfill({headers:H,body:"{}"}); });
const p=await ctx.newPage(); const errs=[]; p.on("pageerror",e=>errs.push(e.message));
await p.goto("https://app.test/app/");
await p.evaluate(()=>{ sessionStorage.setItem("fake-session", JSON.stringify({ access_token:"tok", provider_token:"at", provider_refresh_token:"rt", user:{ id:"9999", email:"demo@example.com", user_metadata:{ full_name:"Max" } } })); });
await p.reload(); await p.waitForTimeout(300);
await p.evaluate((SC)=>{ const T=new Date(); T.setHours(0,0,0,0); const I=n=>{const x=new Date(T); x.setDate(x.getDate()+n); return `${x.getFullYear()}-${String(x.getMonth()+1).padStart(2,"0")}-${String(x.getDate()).padStart(2,"0")}`;};
  const D=window.__sbdb.docs, E=(id,data)=>D.push({user_id:"9999",coll:"events",id,data});
  D.push({user_id:"9999",coll:"prefs",id:"profile",data:{ setupDone:true, state:"BE", joint:true, gcalAsked:true, name:"Max", family:[{name:"Lena",role:"partner"},{name:"Mia",role:"kind"}] }});
  D.push({user_id:"9999",coll:"prefs",id:"display",data:{ states:["BE"], joint:true }});
  E("a1",{type:"termin",title:"Elternabend",from:I(0),to:I(0),time:"19:30",place:"Grundschule am Park"});
  E("i1",{type:"info",title:"Müll rausstellen",from:I(0),to:I(0),time:"20:00",repeat:"w2"});
  E("a2",{type:"termin",title:"Zahnarzt Mia",from:I(1),to:I(1),time:"08:15"});
  E("b1",{type:"birthday",title:"Oma Hilde",from:"1946-"+I(3).slice(5),to:"1946-"+I(3).slice(5),repeat:"yearly"});
  D.push({user_id:"9999",coll:"tasks",id:"k1",data:{title:"Geschenk für Oma Hilde besorgen",due:I(1)}});
  if (SC==="zug") E("h1",{type:"trip",title:"Hotel Seeblick Warnemünde",from:"2026-12-11",to:"2026-12-13",time:"15:00",place:"Seestraße 12, 18119 Rostock-Warnemünde",note:"Check-in ab 15:00 · Check-out bis 11:00 · Frühstück inklusive"});
}, SC);
await p.waitForTimeout(6000);
await p.evaluate(()=>{ ["ft-ntdev","ft-gdev","ft-appcard","ft-quota"].forEach(k=>store.set(k,String(Date.now()))); store.set("ft-a2hs","done"); renderAll(); renderHints(); });
// Tipp-Markierung
await p.addStyleTag({content:`.tapdot{position:fixed;z-index:99999;width:46px;height:46px;margin:-23px 0 0 -23px;border-radius:50%;background:rgba(15,110,115,.28);border:3px solid rgba(15,110,115,.85);pointer-events:none;animation:tp .7s ease-out forwards}@keyframes tp{0%{transform:scale(.4);opacity:1}100%{transform:scale(1.25);opacity:0}}
 .ntf{position:fixed;left:10px;right:10px;top:-120px;z-index:99998;background:#fff;border-radius:18px;box-shadow:0 10px 30px rgba(0,0,0,.25);padding:12px 14px;display:flex;gap:12px;align-items:center;font:15px/1.35 "IBM Plex Sans",sans-serif;transition:top .5s cubic-bezier(.2,.8,.2,1)}
 .ntf.in{top:12px}.ntf img{width:36px;height:36px;border-radius:9px}.ntf b{display:block}.ntf small{color:#667;float:right;font-size:12px}`});
await p.waitForTimeout(800);
// Screencast starten
const cdp=await ctx.newCDPSession(p); const frames=[]; let n=0;
cdp.on("Page.screencastFrame", async f=>{ const fn=`${OUT}/f${String(n++).padStart(5,"0")}.jpg`; fs.writeFileSync(fn, Buffer.from(f.data,"base64")); frames.push({fn, t:f.metadata.timestamp}); cdp.send("Page.screencastFrameAck",{sessionId:f.sessionId}).catch(()=>{}); });
const marks=[]; const T0=Date.now()/1000; const mark=l=>marks.push({l,t:Date.now()/1000});
await cdp.send("Page.startScreencast",{format:"jpeg",quality:88,maxWidth:780,maxHeight:1520,everyNthFrame:1});
// Bild „wackeln“ lassen, damit auch Stillstand Bilder liefert
await p.evaluate(()=>{ const d=document.createElement("div"); d.style.cssText="position:fixed;right:0;bottom:0;width:1px;height:1px;z-index:99999;background:rgba(0,0,0,.01)"; document.body.appendChild(d); let k=0; setInterval(()=>{ d.style.opacity=(k++%2)?".02":".03"; },40); });
const W=ms=>p.waitForTimeout(ms);
const tap=async(sel,{wait=500}={})=>{ const el=await p.waitForSelector(sel,{state:"visible",timeout:15000}); await el.scrollIntoViewIfNeeded(); const bb=await el.boundingBox(); const x=bb.x+bb.width/2, y=bb.y+bb.height/2;
  await p.evaluate(([x,y])=>{ const d=document.createElement("div"); d.className="tapdot"; d.style.left=x+"px"; d.style.top=y+"px"; document.body.appendChild(d); setTimeout(()=>d.remove(),800); },[x,y]); await W(260); await el.click(); await W(wait); };
const pick=async(sel,file)=>{ const lbl=await p.$(sel); const bb=await (await lbl.evaluateHandle(i=>i.closest("label")||i)).asElement().boundingBox();
  await p.evaluate(([x,y])=>{ const d=document.createElement("div"); d.className="tapdot"; d.style.left=x+"px"; d.style.top=y+"px"; document.body.appendChild(d); setTimeout(()=>d.remove(),800); },[bb.x+bb.width/2,bb.y+bb.height/2]); await W(500);
  await p.setInputFiles(sel, __dirname+"/"+file); };
const scrollSheet=async(px,ms=1400)=>{ await p.evaluate(([px,ms])=>new Promise(res=>{ const s=document.getElementById("sheet"); const a=s.scrollTop, t0=performance.now(); const f=t=>{ const k=Math.min(1,(t-t0)/ms), e=k<.5?2*k*k:1-Math.pow(-2*k+2,2)/2; s.scrollTop=a+px*e; k<1?requestAnimationFrame(f):res(); }; requestAnimationFrame(f); }),[px,ms]); };
const openEv=async()=>{ await p.evaluate(()=>{ const e=EV.find(x=>/Seeblick/.test(x.title)); showEvent(findOcc(e.id, iso(e.a))); }); };
try {
if (SC==="hotel") {
  mark("start"); await W(1800);
  await tap("#add-btn",{wait:900}); mark("assistent");
  await pick("#a-files","hotel.jpg"); mark("liest");
  await p.waitForSelector("#a-apply",{timeout:20000}); await W(300); mark("vorschlag"); await scrollSheet(600,1400); await W(2400);
  await tap("#a-apply",{wait:1500}); mark("gespeichert");
  await openEv(); await W(1500); mark("termin");
  await scrollSheet(420,1200); await W(600);
  await tap('[data-docai], #doc-ai, button:has-text("Auswerten")',{wait:300}); mark("auswerten");
  await p.waitForSelector("#dai-ok",{timeout:20000}); await W(700); mark("ergebnis"); await W(900); await scrollSheet(250,1000); await W(1800);
  await tap("#dai-ok",{wait:1400}); mark("fertig");
  await openEv(); await W(1200); mark("ende"); await scrollSheet(330,1800); await W(1800); await scrollSheet(330,1800); await W(2200);
} else {
  mark("start"); await W(1500);
  await openEv(); await W(1600); mark("termin");
  await scrollSheet(300,1000); await W(500);
  await pick("[data-docadd]","ticket.jpg"); mark("hochladen"); await W(2600);
  await openEv(); await W(600); await scrollSheet(300,800); await W(400);
  await tap('button:has-text("Auswerten")',{wait:300}); mark("auswerten");
  await p.waitForSelector("#dai-ok",{timeout:20000}); await W(700); mark("ergebnis"); await W(1200); await scrollSheet(250,1000); await W(1800);
  await tap("#dai-ok",{wait:1400}); mark("fertig");
  await openEv(); await p.evaluate(()=>{ document.getElementById("sheet").scrollTop=0; }); await W(2600); mark("zuege"); await W(1200);
  await p.evaluate(()=>{ const n=document.createElement("div"); n.className="ntf"; n.innerHTML='<img src="/icon-192.png"><div style="flex:1"><small>jetzt</small><b>ICE 1707 · +12 Min.</b>Abfahrt ca. 09:24 · Gleis 7 statt 5</div>'; document.body.appendChild(n); requestAnimationFrame(()=>requestAnimationFrame(()=>n.classList.add("in"))); });
  mark("push"); await W(3800);
}
} catch(e) { console.log("FEHLER Ablauf:", e.message); await p.screenshot({path:OUT+"/err.png"}); }
await cdp.send("Page.stopScreencast"); await W(300);
fs.writeFileSync(OUT+"/frames.json", JSON.stringify({frames, marks}));
console.log("Bilder:", frames.length, "Dauer:", (frames.at(-1).t-frames[0].t).toFixed(1),"s", "Marken:", marks.map(m=>m.l+"@"+(m.t-frames[0].t).toFixed(1)).join(" "));
console.log("Fehler:", JSON.stringify(errs)); await b.close(); })();
