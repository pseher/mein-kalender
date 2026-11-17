// =================== Grundlagen ===================
const WD = ["So","Mo","Di","Mi","Do","Fr","Sa"];
const WDL = ["Sonntag","Montag","Dienstag","Mittwoch","Donnerstag","Freitag","Samstag"];
const MON = ["Januar","Februar","März","April","Mai","Juni","Juli","August","September","Oktober","November","Dezember"];
const YEARS = [2025, 2026, 2027, 2028];
const START = new Date(2025, 0, 1), END = new Date(2028, 11, 31), CALC_END = new Date(2029, 0, 10);
const p2 = n => String(n).padStart(2, "0");
const ymd = (y, m, d) => new Date(y, m - 1, d);
const addDays = (dt, n) => new Date(dt.getFullYear(), dt.getMonth(), dt.getDate() + n);
const dayDiff = (a, b) => Math.round((Date.UTC(b.getFullYear(), b.getMonth(), b.getDate()) - Date.UTC(a.getFullYear(), a.getMonth(), a.getDate())) / 864e5);
const iso = dt => `${dt.getFullYear()}-${p2(dt.getMonth()+1)}-${p2(dt.getDate())}`;
const parseIso = s => { const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s || ""); return m ? new Date(+m[1], +m[2]-1, +m[3]) : null; };
const isWE = dt => dt.getDay() === 0 || dt.getDay() === 6;
const sameDay = (a, b) => a && b && a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
const fmt = dt => `${WD[dt.getDay()]} ${p2(dt.getDate())}.${p2(dt.getMonth()+1)}.`;
const fmtY = dt => `${fmt(dt)}${dt.getFullYear()}`;
const rngTxt = (a, b, long) => sameDay(a, b) ? (long ? fmtY(a) : fmt(a)) : `${fmt(a)} – ${long ? fmtY(b) : fmt(b)}`;
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" }[c]));
const $ = id => document.getElementById(id);
const UI_KEYS = ["ft-show", "ft-pages", "ft-view", "ft-noplace", "ft-up", "ft-up-col", "ft-entry", "ft-umg", "ft-whoc", "ft-catc", "ft-gcat"];   // Anzeige-Einstellungen: auch im Konto speichern
let uiSaveHook = null;
const store = { get(k) { try { return localStorage.getItem(k); } catch { return null; } }, set(k, v) { try { localStorage.setItem(k, v); } catch {} if (UI_KEYS.includes(k)) uiSaveHook?.(); } };
const TODAY = (() => { const n = new Date(); return new Date(n.getFullYear(), n.getMonth(), n.getDate()); })();
function isoWeek(dt) {
  const t = new Date(Date.UTC(dt.getFullYear(), dt.getMonth(), dt.getDate()));
  const day = t.getUTCDay() || 7; t.setUTCDate(t.getUTCDate() + 4 - day);
  const y0 = new Date(Date.UTC(t.getUTCFullYear(), 0, 1));
  return Math.ceil(((t - y0) / 864e5 + 1) / 7);
}
const monday = dt => addDays(dt, -((dt.getDay() + 6) % 7));

// =================== Feiertage (berechnet) ===================
function easter(y) {
  const a = y % 19, b = Math.floor(y / 100), c = y % 100, d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3),
    h = (19 * a + b - d - g + 15) % 30, i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451),
    mo = Math.floor((h + l - 7 * m + 114) / 31), da = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(y, mo - 1, da);
}
const HOL = new Map(); // iso -> {dt, name, be, st}  (be = Hauptland, st = Zweitland; gefüllt in rebuildStates)
// =================== Schulferien ===================
// [Name, Berlin von/bis, Sachsen-Anhalt von/bis, Hinweis]
const FERIEN = [
  ["Weihnachten 24/25", ["2024-12-23","2024-12-31"], ["2024-12-23","2025-01-04"]],
  ["Winterferien", ["2025-02-03","2025-02-08"], ["2025-01-27","2025-01-31"]],
  ["Osterferien", ["2025-04-14","2025-04-25"], ["2025-04-07","2025-04-19"]],
  ["Unterrichtsfreier Tag", ["2025-05-02","2025-05-02"], null],
  ["Unterrichtsfreier Tag", ["2025-05-30","2025-05-30"], ["2025-05-30","2025-05-30"], "nach Himmelfahrt"],
  ["Unterrichtsfreier Tag", ["2025-06-10","2025-06-10"], null, "nach Pfingsten"],
  ["Sommerferien", ["2025-07-24","2025-09-06"], ["2025-06-28","2025-08-08"]],
  ["Herbstferien", ["2025-10-20","2025-11-01"], ["2025-10-13","2025-10-25"]],
  ["Weihnachten 25/26", ["2025-12-22","2026-01-02"], ["2025-12-22","2026-01-05"]],
  ["Winterferien", ["2026-02-02","2026-02-07"], ["2026-01-31","2026-02-06"]],
  ["Osterferien", ["2026-03-30","2026-04-10"], ["2026-03-30","2026-04-04"]],
  ["Unterrichtsfreier Tag", ["2026-05-15","2026-05-15"], null, "nach Himmelfahrt"],
  ["Pfingstferien", ["2026-05-26","2026-05-26"], ["2026-05-26","2026-05-29"]],
  ["Sommerferien", ["2026-07-09","2026-08-22"], ["2026-07-04","2026-08-14"]],
  ["Herbstferien", ["2026-10-19","2026-10-31"], ["2026-10-19","2026-10-30"]],
  ["Weihnachten 26/27", ["2026-12-23","2027-01-02"], ["2026-12-21","2027-01-02"]],
  ["Winterferien", ["2027-02-01","2027-02-06"], ["2027-02-01","2027-02-06"]],
  ["Osterferien", ["2027-03-22","2027-04-02"], ["2027-03-22","2027-03-27"]],
  ["Unterrichtsfreier Tag", ["2027-05-07","2027-05-07"], null, "nach Himmelfahrt"],
  ["Pfingstferien", ["2027-05-18","2027-05-19"], ["2027-05-15","2027-05-22"]],
  ["Sommerferien", ["2027-07-01","2027-08-14"], ["2027-07-10","2027-08-20"]],
  ["Herbstferien", ["2027-10-11","2027-10-23"], ["2027-10-18","2027-10-23"]],
  ["Weihnachten 27/28", ["2027-12-22","2027-12-31"], ["2027-12-20","2027-12-31"]],
  ["Winterferien", ["2028-01-31","2028-02-05"], ["2028-02-07","2028-02-12"]],
  ["Osterferien", ["2028-04-10","2028-04-22"], ["2028-04-10","2028-04-22"]],
  ["Pfingstferien", ["2028-06-01","2028-06-02"], ["2028-06-03","2028-06-10"]],
  ["Sommerferien", ["2028-07-01","2028-08-12"], ["2028-07-22","2028-09-01"]],
  ["Herbstferien", ["2028-10-02","2028-10-14"], ["2028-10-30","2028-11-03"]],
  ["Weihnachten 28/29", ["2028-12-22","2029-01-02"], ["2028-12-21","2029-01-02"]]
].map(([n, be, st, note]) => ({ n, note: note || "", be: be && [parseIso(be[0]), parseIso(be[1])], st: st && [parseIso(st[0]), parseIso(st[1])] }));
let FB = new Map(), FS = new Map();

// Weitere Bundesländer (Quelle: kalenderpedia.de, ohne bewegliche Ferientage)
const STATES = [["BW","Baden-Württemberg"],["BY","Bayern"],["BE","Berlin"],["BB","Brandenburg"],["HB","Bremen"],["HH","Hamburg"],["HE","Hessen"],["MV","Mecklenburg-Vorpommern"],["NI","Niedersachsen"],["NW","Nordrhein-Westfalen"],["RP","Rheinland-Pfalz"],["SL","Saarland"],["SN","Sachsen"],["ST","Sachsen-Anhalt"],["SH","Schleswig-Holstein"],["TH","Thüringen"]];
const XNAME = Object.fromEntries(STATES);
const FERX = {"BW":[["Weihnachten 24/25","2024-12-23","2025-01-04"],["Osterferien","2025-04-14","2025-04-26"],["Pfingstferien","2025-06-10","2025-06-20"],["Sommerferien","2025-07-31","2025-09-13"],["Herbstferien","2025-10-27","2025-10-31"],["Weihnachten 25/26","2025-12-22","2026-01-05"],["Osterferien","2026-03-30","2026-04-11"],["Pfingstferien","2026-05-26","2026-06-05"],["Sommerferien","2026-07-30","2026-09-12"],["Herbstferien","2026-10-26","2026-10-31"],["Weihnachten 26/27","2026-12-23","2027-01-09"],["Osterferien","2027-03-25","2027-04-03"],["Pfingstferien","2027-05-18","2027-05-29"],["Sommerferien","2027-07-29","2027-09-11"],["Herbstferien","2027-11-02","2027-11-06"],["Weihnachten 27/28","2027-12-23","2028-01-08"],["Osterferien","2028-04-13","2028-04-22"],["Pfingstferien","2028-06-06","2028-06-17"],["Sommerferien","2028-07-27","2028-09-09"],["Herbstferien","2028-10-30","2028-11-03"],["Weihnachten 28/29","2028-12-23","2029-01-05"]],"BY":[["Weihnachten 24/25","2024-12-23","2025-01-03"],["Winterferien","2025-03-03","2025-03-07"],["Osterferien","2025-04-14","2025-04-25"],["Pfingstferien","2025-06-10","2025-06-20"],["Sommerferien","2025-08-01","2025-09-15"],["Herbstferien","2025-11-03","2025-11-07"],["Unterrichtsfreier Tag","2025-11-19","2025-11-19"],["Weihnachten 25/26","2025-12-22","2026-01-05"],["Winterferien","2026-02-16","2026-02-20"],["Osterferien","2026-03-30","2026-04-10"],["Pfingstferien","2026-05-26","2026-06-05"],["Sommerferien","2026-08-03","2026-09-14"],["Herbstferien","2026-11-02","2026-11-06"],["Unterrichtsfreier Tag","2026-11-18","2026-11-18"],["Weihnachten 26/27","2026-12-24","2027-01-08"],["Winterferien","2027-02-08","2027-02-12"],["Osterferien","2027-03-22","2027-04-02"],["Pfingstferien","2027-05-18","2027-05-28"],["Sommerferien","2027-08-02","2027-09-13"],["Herbstferien","2027-11-02","2027-11-05"],["Unterrichtsfreier Tag","2027-11-17","2027-11-17"],["Weihnachten 27/28","2027-12-24","2028-01-07"],["Winterferien","2028-02-28","2028-03-03"],["Osterferien","2028-04-10","2028-04-21"],["Pfingstferien","2028-06-06","2028-06-16"],["Sommerferien","2028-07-31","2028-09-11"],["Herbstferien","2028-10-30","2028-11-03"],["Unterrichtsfreier Tag","2028-11-22","2028-11-22"],["Weihnachten 28/29","2028-12-23","2029-01-05"]],"BB":[["Winterferien","2025-02-03","2025-02-08"],["Osterferien","2025-04-14","2025-04-25"],["Unterrichtsfreier Tag","2025-05-02","2025-05-02"],["Unterrichtsfreier Tag","2025-05-30","2025-05-30"],["Unterrichtsfreier Tag","2025-06-10","2025-06-10"],["Sommerferien","2025-07-24","2025-09-06"],["Herbstferien","2025-10-20","2025-11-01"],["Weihnachten 25/26","2025-12-22","2026-01-02"],["Winterferien","2026-02-02","2026-02-07"],["Osterferien","2026-03-30","2026-04-10"],["Unterrichtsfreier Tag","2026-05-15","2026-05-15"],["Unterrichtsfreier Tag","2026-05-26","2026-05-26"],["Sommerferien","2026-07-09","2026-08-22"],["Herbstferien","2026-10-19","2026-10-30"],["Weihnachten 26/27","2026-12-23","2027-01-02"],["Winterferien","2027-02-01","2027-02-06"],["Osterferien","2027-03-22","2027-04-03"],["Unterrichtsfreier Tag","2027-05-07","2027-05-07"],["Unterrichtsfreier Tag","2027-05-18","2027-05-18"],["Sommerferien","2027-07-01","2027-08-14"],["Herbstferien","2027-10-11","2027-10-23"],["Weihnachten 27/28","2027-12-23","2027-12-31"],["Winterferien","2028-01-31","2028-02-05"],["Osterferien","2028-04-10","2028-04-22"],["Unterrichtsfreier Tag","2028-05-26","2028-05-26"],["Sommerferien","2028-06-29","2028-08-12"],["Herbstferien","2028-10-02","2028-10-14"],["Unterrichtsfreier Tag","2028-10-30","2028-10-30"],["Weihnachten 28/29","2028-12-22","2029-01-02"]],"HB":[["Weihnachten 24/25","2024-12-23","2025-01-04"],["Winterferien","2025-02-03","2025-02-04"],["Osterferien","2025-04-07","2025-04-19"],["Pfingstferien","2025-04-30","2025-05-02"],["Unterrichtsfreier Tag","2025-05-30","2025-05-30"],["Unterrichtsfreier Tag","2025-06-10","2025-06-10"],["Sommerferien","2025-07-03","2025-08-13"],["Herbstferien","2025-10-13","2025-10-25"],["Weihnachten 25/26","2025-12-22","2026-01-05"],["Winterferien","2026-02-02","2026-02-03"],["Osterferien","2026-03-23","2026-04-07"],["Unterrichtsfreier Tag","2026-05-15","2026-05-15"],["Unterrichtsfreier Tag","2026-05-26","2026-05-26"],["Sommerferien","2026-07-02","2026-08-12"],["Herbstferien","2026-10-12","2026-10-24"],["Weihnachten 26/27","2026-12-23","2027-01-09"],["Winterferien","2027-02-01","2027-02-02"],["Osterferien","2027-03-22","2027-04-03"],["Unterrichtsfreier Tag","2027-05-07","2027-05-07"],["Unterrichtsfreier Tag","2027-05-18","2027-05-18"],["Sommerferien","2027-07-08","2027-08-18"],["Herbstferien","2027-10-18","2027-10-30"],["Weihnachten 27/28","2027-12-23","2028-01-08"],["Winterferien","2028-01-31","2028-02-01"],["Osterferien","2028-04-10","2028-04-22"],["Unterrichtsfreier Tag","2028-05-26","2028-05-26"],["Unterrichtsfreier Tag","2028-06-06","2028-06-06"],["Sommerferien","2028-07-20","2028-08-30"],["Unterrichtsfreier Tag","2028-10-02","2028-10-02"],["Herbstferien","2028-10-23","2028-11-04"],["Weihnachten 28/29","2028-12-27","2029-01-06"]],"HH":[["Weihnachten 24/25","2024-12-20","2025-01-03"],["Winterferien","2025-01-31","2025-01-31"],["Osterferien","2025-03-10","2025-03-21"],["Unterrichtsfreier Tag","2025-05-02","2025-05-02"],["Pfingstferien","2025-05-26","2025-05-30"],["Sommerferien","2025-07-24","2025-09-03"],["Herbstferien","2025-10-20","2025-10-31"],["Weihnachten 25/26","2025-12-17","2026-01-02"],["Winterferien","2026-01-30","2026-01-30"],["Osterferien","2026-03-02","2026-03-13"],["Pfingstferien","2026-05-11","2026-05-15"],["Sommerferien","2026-07-09","2026-08-19"],["Herbstferien","2026-10-19","2026-10-30"],["Weihnachten 26/27","2026-12-21","2027-01-01"],["Winterferien","2027-01-29","2027-01-29"],["Osterferien","2027-03-01","2027-03-12"],["Pfingstferien","2027-05-07","2027-05-14"],["Sommerferien","2027-07-01","2027-08-11"],["Herbstferien","2027-10-11","2027-10-22"],["Weihnachten 27/28","2027-12-20","2027-12-31"],["Winterferien","2028-01-28","2028-01-28"],["Osterferien","2028-03-06","2028-03-17"],["Pfingstferien","2028-05-22","2028-05-26"],["Sommerferien","2028-07-03","2028-08-11"],["Herbstferien","2028-10-02","2028-10-13"],["Unterrichtsfreier Tag","2028-10-30","2028-10-30"],["Weihnachten 28/29","2028-12-18","2028-12-29"]],"HE":[["Weihnachten 24/25","2024-12-23","2025-01-10"],["Osterferien","2025-04-07","2025-04-21"],["Sommerferien","2025-07-07","2025-08-15"],["Herbstferien","2025-10-06","2025-10-18"],["Weihnachten 25/26","2025-12-22","2026-01-10"],["Osterferien","2026-03-30","2026-04-10"],["Sommerferien","2026-06-29","2026-08-07"],["Herbstferien","2026-10-05","2026-10-17"],["Weihnachten 26/27","2026-12-23","2027-01-12"],["Osterferien","2027-03-22","2027-04-02"],["Sommerferien","2027-06-28","2027-08-06"],["Herbstferien","2027-10-04","2027-10-16"],["Weihnachten 27/28","2027-12-23","2028-01-11"],["Osterferien","2028-04-03","2028-04-14"],["Sommerferien","2028-07-03","2028-08-11"],["Herbstferien","2028-10-09","2028-10-20"],["Weihnachten 28/29","2028-12-27","2029-01-12"]],"MV":[["Weihnachten 24/25","2024-12-23","2025-01-06"],["Winterferien","2025-02-03","2025-02-14"],["Osterferien","2025-04-14","2025-04-23"],["Unterrichtsfreier Tag","2025-05-30","2025-05-30"],["Pfingstferien","2025-06-06","2025-06-10"],["Sommerferien","2025-07-28","2025-09-06"],["Unterrichtsfreier Tag","2025-10-02","2025-10-02"],["Herbstferien","2025-10-20","2025-10-24"],["Unterrichtsfreier Tag","2025-11-03","2025-11-03"],["Weihnachten 25/26","2025-12-20","2026-01-03"],["Winterferien","2026-02-09","2026-02-20"],["Osterferien","2026-03-30","2026-04-08"],["Unterrichtsfreier Tag","2026-05-15","2026-05-15"],["Pfingstferien","2026-05-22","2026-05-26"],["Sommerferien","2026-07-13","2026-08-22"],["Herbstferien","2026-10-15","2026-10-24"],["Weihnachten 26/27","2026-12-21","2027-01-02"],["Winterferien","2027-02-08","2027-02-19"],["Osterferien","2027-03-24","2027-04-02"],["Unterrichtsfreier Tag","2027-05-07","2027-05-07"],["Pfingstferien","2027-05-14","2027-05-18"],["Sommerferien","2027-07-05","2027-08-14"],["Herbstferien","2027-10-14","2027-10-23"],["Weihnachten 27/28","2027-12-22","2028-01-04"],["Winterferien","2028-02-05","2028-02-18"],["Osterferien","2028-04-12","2028-04-21"],["Unterrichtsfreier Tag","2028-05-26","2028-05-26"],["Pfingstferien","2028-06-02","2028-06-06"],["Sommerferien","2028-06-26","2028-08-05"],["Unterrichtsfreier Tag","2028-10-02","2028-10-02"],["Herbstferien","2028-10-23","2028-10-30"],["Weihnachten 28/29","2028-12-22","2029-01-02"]],"NI":[["Weihnachten 24/25","2024-12-23","2025-01-04"],["Winterferien","2025-02-03","2025-02-04"],["Osterferien","2025-04-07","2025-04-19"],["Unterrichtsfreier Tag","2025-04-30","2025-04-30"],["Unterrichtsfreier Tag","2025-05-02","2025-05-02"],["Unterrichtsfreier Tag","2025-05-30","2025-05-30"],["Unterrichtsfreier Tag","2025-06-10","2025-06-10"],["Sommerferien","2025-07-03","2025-08-13"],["Herbstferien","2025-10-13","2025-10-25"],["Weihnachten 25/26","2025-12-22","2026-01-05"],["Winterferien","2026-02-02","2026-02-03"],["Osterferien","2026-03-23","2026-04-07"],["Unterrichtsfreier Tag","2026-05-15","2026-05-15"],["Unterrichtsfreier Tag","2026-05-26","2026-05-26"],["Sommerferien","2026-07-02","2026-08-12"],["Herbstferien","2026-10-12","2026-10-24"],["Weihnachten 26/27","2026-12-23","2027-01-09"],["Winterferien","2027-02-01","2027-02-02"],["Osterferien","2027-03-22","2027-04-03"],["Unterrichtsfreier Tag","2027-05-07","2027-05-07"],["Unterrichtsfreier Tag","2027-05-18","2027-05-18"],["Sommerferien","2027-07-08","2027-08-18"],["Herbstferien","2027-10-16","2027-10-30"],["Weihnachten 27/28","2027-12-23","2028-01-08"],["Winterferien","2028-01-31","2028-02-01"],["Osterferien","2028-04-10","2028-04-22"],["Unterrichtsfreier Tag","2028-05-26","2028-05-26"],["Unterrichtsfreier Tag","2028-06-06","2028-06-06"],["Sommerferien","2028-07-20","2028-08-30"],["Unterrichtsfreier Tag","2028-10-02","2028-10-02"],["Herbstferien","2028-10-23","2028-11-04"],["Weihnachten 28/29","2028-12-27","2029-01-06"]],"NW":[["Weihnachten 24/25","2024-12-23","2025-01-06"],["Osterferien","2025-04-14","2025-04-26"],["Unterrichtsfreier Tag","2025-06-10","2025-06-10"],["Sommerferien","2025-07-14","2025-08-26"],["Herbstferien","2025-10-13","2025-10-25"],["Weihnachten 25/26","2025-12-22","2026-01-06"],["Osterferien","2026-03-30","2026-04-11"],["Unterrichtsfreier Tag","2026-05-26","2026-05-26"],["Sommerferien","2026-07-20","2026-09-01"],["Herbstferien","2026-10-17","2026-10-31"],["Weihnachten 26/27","2026-12-23","2027-01-06"],["Osterferien","2027-03-22","2027-04-03"],["Unterrichtsfreier Tag","2027-05-18","2027-05-18"],["Sommerferien","2027-07-19","2027-08-31"],["Herbstferien","2027-10-23","2027-11-06"],["Weihnachten 27/28","2027-12-24","2028-01-08"],["Osterferien","2028-04-10","2028-04-22"],["Sommerferien","2028-07-10","2028-08-22"],["Herbstferien","2028-10-23","2028-11-04"],["Weihnachten 28/29","2028-12-21","2029-01-05"]],"RP":[["Weihnachten 24/25","2024-12-23","2025-01-08"],["Osterferien","2025-04-14","2025-04-25"],["Sommerferien","2025-07-07","2025-08-15"],["Herbstferien","2025-10-13","2025-10-24"],["Weihnachten 25/26","2025-12-22","2026-01-07"],["Osterferien","2026-03-30","2026-04-10"],["Sommerferien","2026-06-29","2026-08-07"],["Herbstferien","2026-10-05","2026-10-16"],["Weihnachten 26/27","2026-12-23","2027-01-08"],["Osterferien","2027-03-22","2027-04-02"],["Sommerferien","2027-06-28","2027-08-06"],["Herbstferien","2027-10-04","2027-10-15"],["Weihnachten 27/28","2027-12-23","2028-01-07"],["Osterferien","2028-04-10","2028-04-21"],["Sommerferien","2028-07-03","2028-08-11"],["Herbstferien","2028-10-09","2028-10-20"],["Weihnachten 28/29","2028-12-21","2029-01-08"]],"SL":[["Weihnachten 24/25","2024-12-23","2025-01-03"],["Winterferien","2025-02-24","2025-03-04"],["Osterferien","2025-04-14","2025-04-25"],["Sommerferien","2025-07-07","2025-08-14"],["Herbstferien","2025-10-13","2025-10-24"],["Weihnachten 25/26","2025-12-22","2026-01-02"],["Winterferien","2026-02-16","2026-02-20"],["Osterferien","2026-04-07","2026-04-17"],["Sommerferien","2026-06-29","2026-08-07"],["Herbstferien","2026-10-05","2026-10-16"],["Weihnachten 26/27","2026-12-21","2026-12-31"],["Winterferien","2027-02-08","2027-02-12"],["Osterferien","2027-03-30","2027-04-09"],["Sommerferien","2027-06-28","2027-08-06"],["Herbstferien","2027-10-04","2027-10-15"],["Weihnachten 27/28","2027-12-20","2027-12-31"],["Winterferien","2028-02-21","2028-02-29"],["Osterferien","2028-04-12","2028-04-21"],["Sommerferien","2028-07-03","2028-08-11"],["Herbstferien","2028-10-09","2028-10-20"],["Weihnachten 28/29","2028-12-20","2029-01-02"]],"SN":[["Weihnachten 24/25","2024-12-23","2025-01-03"],["Winterferien","2025-02-17","2025-03-01"],["Osterferien","2025-04-18","2025-04-25"],["Unterrichtsfreier Tag","2025-05-30","2025-05-30"],["Sommerferien","2025-06-28","2025-08-08"],["Herbstferien","2025-10-06","2025-10-18"],["Weihnachten 25/26","2025-12-22","2026-01-02"],["Winterferien","2026-02-09","2026-02-21"],["Osterferien","2026-04-03","2026-04-10"],["Unterrichtsfreier Tag","2026-05-15","2026-05-15"],["Sommerferien","2026-07-04","2026-08-14"],["Herbstferien","2026-10-12","2026-10-24"],["Weihnachten 26/27","2026-12-23","2027-01-02"],["Winterferien","2027-02-08","2027-02-19"],["Osterferien","2027-03-26","2027-04-02"],["Unterrichtsfreier Tag","2027-05-07","2027-05-07"],["Pfingstferien","2027-05-15","2027-05-18"],["Sommerferien","2027-07-10","2027-08-20"],["Herbstferien","2027-10-11","2027-10-23"],["Weihnachten 27/28","2027-12-23","2028-01-01"],["Winterferien","2028-02-14","2028-02-26"],["Osterferien","2028-04-14","2028-04-22"],["Unterrichtsfreier Tag","2028-05-26","2028-05-26"],["Sommerferien","2028-07-22","2028-09-01"],["Herbstferien","2028-10-23","2028-11-03"],["Weihnachten 28/29","2028-12-23","2029-01-03"]],"SH":[["Weihnachten 24/25","2024-12-19","2025-01-07"],["Osterferien","2025-04-11","2025-04-25"],["Unterrichtsfreier Tag","2025-05-30","2025-05-30"],["Sommerferien","2025-07-28","2025-09-06"],["Herbstferien","2025-10-20","2025-10-30"],["Weihnachten 25/26","2025-12-19","2026-01-06"],["Osterferien","2026-03-26","2026-04-10"],["Unterrichtsfreier Tag","2026-05-15","2026-05-15"],["Sommerferien","2026-07-04","2026-08-15"],["Herbstferien","2026-10-12","2026-10-24"],["Weihnachten 26/27","2026-12-21","2027-01-06"],["Osterferien","2027-03-30","2027-04-10"],["Unterrichtsfreier Tag","2027-05-07","2027-05-07"],["Sommerferien","2027-07-03","2027-08-14"],["Herbstferien","2027-10-11","2027-10-23"],["Weihnachten 27/28","2027-12-23","2028-01-08"],["Osterferien","2028-04-03","2028-04-15"],["Unterrichtsfreier Tag","2028-05-26","2028-05-26"],["Sommerferien","2028-06-24","2028-08-04"],["Herbstferien","2028-10-16","2028-10-30"],["Weihnachten 28/29","2028-12-21","2029-01-05"]],"TH":[["Weihnachten 24/25","2024-12-23","2025-01-03"],["Winterferien","2025-02-03","2025-02-08"],["Osterferien","2025-04-07","2025-04-19"],["Unterrichtsfreier Tag","2025-05-30","2025-05-30"],["Sommerferien","2025-06-28","2025-08-08"],["Herbstferien","2025-10-06","2025-10-18"],["Weihnachten 25/26","2025-12-22","2026-01-03"],["Winterferien","2026-02-16","2026-02-21"],["Osterferien","2026-04-07","2026-04-17"],["Unterrichtsfreier Tag","2026-05-15","2026-05-15"],["Sommerferien","2026-07-04","2026-08-14"],["Herbstferien","2026-10-12","2026-10-24"],["Weihnachten 26/27","2026-12-23","2027-01-02"],["Winterferien","2027-02-01","2027-02-06"],["Osterferien","2027-03-22","2027-04-03"],["Unterrichtsfreier Tag","2027-05-07","2027-05-07"],["Sommerferien","2027-07-10","2027-08-20"],["Herbstferien","2027-10-09","2027-10-23"],["Weihnachten 27/28","2027-12-23","2027-12-31"],["Winterferien","2028-02-07","2028-02-12"],["Osterferien","2028-04-03","2028-04-15"],["Unterrichtsfreier Tag","2028-05-26","2028-05-26"],["Sommerferien","2028-07-22","2028-09-01"],["Herbstferien","2028-10-23","2028-11-03"],["Weihnachten 28/29","2028-12-23","2029-01-05"]]};
FERX.BE = FERIEN.filter(f => f.be).map(f => [f.n, iso(f.be[0]), iso(f.be[1])]);
FERX.ST = FERIEN.filter(f => f.st).map(f => [f.n, iso(f.st[0]), iso(f.st[1])]);
const FXM = {};
for (const [c, list] of Object.entries(FERX)) { const mp = new Map(); list.forEach(([n, a, b]) => { for (let t = parseIso(a); t <= parseIso(b); t = addDays(t, 1)) mp.set(iso(t), n); }); FXM[c] = mp; }
const XCOL = ["#d97706", "#7c3aed", "#db2777", "#0891b2", "#65a30d", "#dc2626", "#4f46e5", "#0d9488"];
// Hauptland (PA) und optionales Zweitland (PB) kommen aus dem Profil
let PA = store.get("ft-pa") || "BE", PB = store.get("ft-pb") || null;
let XST = (() => { try { const v = JSON.parse(store.get("ft-xst") || "[]"); return Array.isArray(v) ? v.filter(c => FERX[c]) : []; } catch { return []; } })();
const loadArr = k => { try { const v = JSON.parse(store.get(k) || "null"); return Array.isArray(v) ? v.map(String) : null; } catch { return null; } };
let XHIDE = loadArr("ft-xhide") || [];                 // zusätzliche Länder: nur ausgeblendet, zählen ggf. weiter für „gemeinsam frei“
let JOINT = loadArr("ft-joint") || [PA, PB].filter(Boolean);       // Länder, die für „gemeinsam frei“ zählen
const fixJoint = () => { XST = XST.filter(c => c !== PA && c !== PB); JOINT = [...new Set(JOINT.filter(c => c === PA || c === PB || XST.includes(c)))]; XHIDE = XHIDE.filter(c => XST.includes(c)); };
const stName = c => XNAME[c] || c;
const nameA = () => stName(PA), nameB = () => PB ? stName(PB) : "";
const xColor = c => XCOL[Math.max(0, XST.indexOf(c)) % XCOL.length];
const xOn = d => d ? XST.filter(c => !XHIDE.includes(c) && FXM[c].has(d.k)) : [];
// Feiertage aller Länder (für „gemeinsam frei“ mit weiteren Ländern)
const HOLS = new Map(), HNAME = new Map(); // iso -> Set(Länder), iso -> Name
{ const ALL = STATES.map(s => s[0]);
  const add = (dt, name, list) => { const k = iso(dt); const s = HOLS.get(k) || new Set(); list.forEach(c => s.add(c)); HOLS.set(k, s); if (!HNAME.has(k)) HNAME.set(k, name); };
  for (const y of [...YEARS, 2029]) { const E = easter(y);
    [[ymd(y,1,1),"Neujahr"],[addDays(E,-2),"Karfreitag"],[addDays(E,1),"Ostermontag"],[ymd(y,5,1),"Tag der Arbeit"],[addDays(E,39),"Christi Himmelfahrt"],[addDays(E,50),"Pfingstmontag"],[ymd(y,10,3),"Tag der Deutschen Einheit"],[ymd(y,12,25),"1. Weihnachtsfeiertag"],[ymd(y,12,26),"2. Weihnachtsfeiertag"]].forEach(([d, n]) => add(d, n, ALL));
    add(ymd(y,1,6), "Heilige Drei Könige", ["BW","BY","ST"]); add(ymd(y,3,8), "Internationaler Frauentag", ["BE","MV"]); add(addDays(E,60), "Fronleichnam", ["BW","BY","HE","NW","RP","SL"]);
    add(ymd(y,8,15), "Mariä Himmelfahrt", ["SL"]); add(ymd(y,9,20), "Weltkindertag", ["TH"]); add(ymd(y,10,31), "Reformationstag", ["BB","HB","HH","MV","NI","SN","ST","SH","TH"]);
    add(ymd(y,11,1), "Allerheiligen", ["BW","BY","NW","RP","SL"]);
    const n23 = ymd(y,11,23); add(addDays(n23, -(((n23.getDay() - 3) + 7) % 7 || 7)), "Buß- und Bettag", ["SN"]); }
  add(ymd(2025,5,8), "80. Jahrestag Kriegsende", ["BE"]); }
const holWhere = h => !PB ? "" : h.be && h.st ? "" : h.be ? ` · nur ${PA}` : ` · nur ${PB}`;
function xStripe(d) { const on = xOn(d); if (!on.length) return ""; const w = 100 / on.length;
  return `<i class="fx" style="background:linear-gradient(90deg,${on.map((c, i) => `${xColor(c)} ${(i * w).toFixed(1)}% ${((i + 1) * w).toFixed(1)}%`).join(",")})"></i>`; }

// =================== Tagesstatus ===================
const DAYS = []; const DIDX = new Map();
for (let t = START; t <= CALC_END; t = addDays(t, 1)) {
  const k = iso(t);
  DIDX.set(k, DAYS.length);
  DAYS.push({ dt: t, k, h: null, fBE: false, fST: false, both: false });
}
const dayOf = dt => DAYS[DIDX.get(iso(dt))];
const inFerien = (c, d) => !!FXM[c]?.has(d.k);
const isFree = (c, d) => isWE(d.dt) || inFerien(c, d) || !!HOLS.get(d.k)?.has(c);
const jointOn = () => SHOW.both && JOINT.length >= 2;
const jointTxt = () => JOINT.length === 2 && PB && JOINT.includes(PA) && JOINT.includes(PB) ? "beide frei" : "gemeinsam frei";
// gemeinsame Zeiträume (neu berechnet, wenn sich die Auswahl ändert)
let WINS = [];
function recalcJoint() {
  WINS = []; let cur = null;
  DAYS.forEach((d, i) => {
    d.both = JOINT.length >= 2 && JOINT.every(c => isFree(c, d));
    d.allF = JOINT.length >= 2 && JOINT.every(c => inFerien(c, d));
    if (d.both) { if (!cur) cur = { a: i, b: i }; else cur.b = i; }
    if ((!d.both || i === DAYS.length - 1) && cur) {
      const seg = DAYS.slice(cur.a, cur.b + 1);
      if (seg.length >= 3 && seg.some(x => !isWE(x.dt))) WINS.push({ a: DAYS[cur.a].dt, b: DAYS[cur.b].dt });
      cur = null;
    }
  });
}
const winName = w => { const m = addDays(w.a, Math.floor(dayDiff(w.a, w.b) / 2)).getMonth();
  return ["Neujahr","Winterferien","Ostern","Ostern","Pfingsten","Pfingsten","Sommer","Sommer","Sommer","Herbst","Herbst","Weihnachten"][m]; };
const winOf = dt => WINS.find(w => dt >= w.a && dt <= w.b);
// Brückentage
const BRIDGES = new Map();
// Länder anwenden: Feiertage, Ferien, Brückentage und gemeinsame Zeiten neu berechnen
function rebuildStates() {
  if (!FXM[PA]) PA = "BE"; if (PB && (!FXM[PB] || PB === PA)) PB = null;
  HOL.clear(); HNAME.forEach((name, k) => { const set = HOLS.get(k), be = set.has(PA), st = PB ? set.has(PB) : be; if (be || st) HOL.set(k, { dt: parseIso(k), name, be, st }); });
  FB = FXM[PA]; FS = PB ? FXM[PB] : new Map();
  DAYS.forEach(d => { d.h = HOL.get(d.k) || null; d.fBE = FB.has(d.k); d.fST = FS.has(d.k); });
  BRIDGES.clear();
  HOL.forEach(h => { if (!h.be) return;
    const wd = h.dt.getDay(), b = wd === 2 ? addDays(h.dt, -1) : wd === 4 ? addDays(h.dt, 1) : null;
    if (b && !HOL.has(iso(b))) BRIDGES.set(iso(b), { dt: b, name: `Brückentag ${wd === 2 ? "vor" : "nach"} ${h.name}`, note: "1 Urlaubstag → 4 Tage frei" }); });
  [[12,24,"Heiligabend"],[12,31,"Silvester"]].forEach(([m, d, n]) => YEARS.forEach(y => { const dt = ymd(y, m, d);
    if (!isWE(dt)) BRIDGES.set(iso(dt), { dt, name: n, note: "kein Feiertag, oft halber oder ganzer Tag frei" }); }));
  fixJoint(); recalcJoint();
}
rebuildStates();

// =================== Eigene Termine ===================
const TYPES = {
  termin:   { label: "Termin",           color: "--c-termin" },
  trip:     { label: "Reise",            color: "--trip" },
  urlaub:   { label: "Urlaub & Ferien",  color: "--c-urlaub" },
  dienst:   { label: "Dienst & Schicht", color: "--c-dienst" },
  abholen:  { label: "Abholen & Bringen", color: "--c-pick" },
  info:     { label: "Hinweis",          color: "--c-info" },
  birthday: { label: "Geburtstag",       color: "--event" },
  mina:     { label: "Umgang",           color: "--c-mina" },
  anniversary: { label: "Jahrestag",       color: "--c-anniv" },
  deadline: { label: "Frist",            color: "--c-deadline" },
  contact:  { label: "Kontakt halten",   color: "--c-contact" },
  google:   { label: "Google Kalender",  color: "--gcal" }
};
const REPEAT = { none: "einmalig", d1: "täglich", weekly: "wöchentlich", w2: "alle 2 Wochen", w3: "alle 3 Wochen", w4: "alle 4 Wochen", monthly: "monatlich", m2: "alle 2 Monate", m3: "alle 3 Monate (vierteljährlich)", m6: "alle 6 Monate (halbjährlich)", yearly: "jährlich", every2y: "alle 2 Jahre", y3: "alle 3 Jahre", y5: "alle 5 Jahre" };
// Wiederholung als Einheit + Abstand: "w2" = alle 2 Wochen, "y3" = alle 3 Jahre (alte Werte weekly/monthly/yearly/every2y bleiben gültig)
const repSpec = k => ({ weekly: { u: "w", n: 1 }, monthly: { u: "m", n: 1 }, yearly: { u: "y", n: 1 }, every2y: { u: "y", n: 2 } })[k] || (/^([dwmy])(\d{1,3})$/.test(k || "") ? { u: k[0], n: Math.max(1, +k.slice(1)) } : null);
const REP_U = { d: ["Tag", "Tage"], w: ["Woche", "Wochen"], m: ["Monat", "Monate"], y: ["Jahr", "Jahre"] };
const repLabel = k => REPEAT[k] || (repSpec(k) ? `alle ${repSpec(k).n} ${REP_U[repSpec(k).u][1]}` : "einmalig");
const repStep = (a0, sp, i) => { const k = i * sp.n; if (sp.u === "d") return addDays(a0, k); if (sp.u === "w") return addDays(a0, 7 * k);
  const y = a0.getFullYear() + (sp.u === "y" ? k : 0), m = a0.getMonth() + (sp.u === "m" ? k : 0); return new Date(y, m, Math.min(a0.getDate(), new Date(y, m + 1, 0).getDate())); };
const REMIND_DEF = { birthday: 20, anniversary: 7, deadline: 14 };
let EV = [], MERK = [], OCC = [], OIDX = new Map();   // MERK: Merklisten zu Google-Terminen (Google-Termin bleibt sichtbar)
const APP = !!window.MK_APP;   // true = eigene App (Supabase), false = claude.ai-Artefakt
let db = null, canWrite = false, sample = null, downloads = null, dbState = "loading";
// Profil des Nutzers (Einrichtung): Name, Länder, Familie
let PROFILE = {}; // erst nach der Anmeldeprüfung aus dem Zwischenspeicher laden
let GPLACE_C = null;   // gemerkte Orte für Google-Termine (wenn der Kalender nicht beschreibbar ist)
const gPlace = () => (GPLACE_C ??= (() => { try { return JSON.parse(localStorage.getItem("ft-gplace") || "{}"); } catch { return {}; } })());
const KEEP_KEYS = ["ft-a2hs", "ft-view", "ft-theme", "ft-uid"];
function wipeLocal() { try { Object.keys(localStorage).filter(k => k.startsWith("ft-") && !KEEP_KEYS.includes(k)).forEach(k => localStorage.removeItem(k)); } catch {} }
const ME = () => (PROFILE.name || "").trim() || "Ich";
const FAM = () => Array.isArray(PROFILE.family) ? PROFILE.family : [];
const famBy = role => FAM().filter(p => p.role === role).map(p => p.name);
const kidsNames = () => famBy("kind");
let uid = null, BASE = "";
const COLL = n => db.collection(`${BASE}/${n}`);

function normalize(id, v) {
  v = v || {};
  const a = parseIso(v.from), b = parseIso(v.to || v.from) || a;
  return { id, type: TYPES[v.type] ? v.type : "termin", title: String(v.title || ""), from: v.from, to: v.to || v.from,
    time: /^\d{1,2}:\d{2}$/.test(v.time || "") ? v.time : "", endTime: /^\d{1,2}:\d{2}$/.test(v.endTime || "") ? v.endTime : "",
    repeat: repSpec(v.repeat) ? v.repeat : "none", until: parseIso(v.until) ? v.until : "", birthYear: +v.birthYear || 0,
    note: String(v.note || ""), gcal: String(v.gcal || ""), gEventId: String(v.gEventId || ""),
    remindDays: v.remindDays === undefined || v.remindDays === "" || v.remindDays === null ? (REMIND_DEF[v.type] ?? 0) : Math.max(0, +v.remindDays || 0),
    giftDone: Array.isArray(v.giftDone) ? v.giftDone.map(String) : [], done: Array.isArray(v.done) ? v.done.map(String) : [], fam: !!v.fam,
    startYear: +v.startYear || 0, everyWeeks: Math.max(1, +v.everyWeeks || 8), thanks: !!v.thanks,
    place: String(v.place || ""), flight: !!v.flight, kids: !!v.kids, mode: MODES[v.mode] ? v.mode : "", files: Array.isArray(v.files) ? v.files.filter(f => f && f.id && f.n).map(f => ({ id: String(f.id), name: String(f.name || "Dokument"), type: String(f.type || ""), size: +f.size || 0, n: +f.n, at: String(f.at || "") })) : [], gReadOnly: !!v.gReadOnly, mOnly: !!v.mOnly, pick: v.pick && typeof v.pick === "object" ? { dir: v.pick.dir === "dep" ? "dep" : "arr", mode: ["zug", "flug", "bus"].includes(v.pick.mode) ? v.pick.mode : "zug", who: String(v.pick.who || "").slice(0, 40), no: String(v.pick.no || "").slice(0, 20) } : null, skip: Array.isArray(v.skip) ? v.skip.filter(x => /^\d{4}-\d\d-\d\d$/.test(x)).slice(-300) : [], color: ECOLM[v.color] ? String(v.color) : "", who: String(v.who || "").trim().slice(0, 40), country: String(v.country || ""),
    shareTo: Array.isArray(v.shareTo) ? v.shareTo.map(String) : [], shareNo: Array.isArray(v.shareNo) ? v.shareNo.map(String) : [], sid: String(v.sid || ""), shadow: !!v.shadow,
    packlist: Array.isArray(v.packlist) ? v.packlist.filter(x => x && x.t).map(x => ({ t: String(x.t), k: String(x.k || ""), d: !!x.d })) : [],
    a, b: b && a && b < a ? a : b };
}
const evName = e => (isSharedEv(e) ? "👥 " : "") + (e.type === "birthday" ? `Geburtstag ${e.title}` : e.title);
// Kurzer Titel für die kleinen Kacheln
const shortName = e => (isSharedEv(e) ? "👥 " : "") + shortName0(e);
function shortName0(e) {
  let t = (e.title || "").trim(), m;
  if (e.type === "birthday") return "🎂 " + t;
  if ((m = t.match(/^(?:geburtstag|geb\.?)\s*(?:von\s+)?(.+)$/i))) return "🎂 " + m[1];
  if ((m = t.match(/^(.+?)\s*(?:geburtstag|geb\.?)$/i))) return "🎂 " + m[1].replace(/['’]s$/, "");
  return t.replace(/^(?:stay at|aufenthalt (?:in|im|bei)|hotel)\s+/i, "🏨 ").replace(/^(?:flight to|flug nach)\s+/i, "✈️ ");
}
const ageTxt = (o) => o.ev.type === "birthday" && o.ev.birthYear ? `${o.a.getFullYear() - o.ev.birthYear}. Geburtstag`
  : o.ev.type === "anniversary" && o.ev.startYear ? `${o.a.getFullYear() - o.ev.startYear} Jahre` : "";
const isRoundAge = n => n === 18 || (n >= 20 && n % 10 === 0) || (n >= 60 && n % 5 === 0);
const timeTxt = e => e.time ? (e.endTime ? `${e.time}–${e.endTime}` : e.time) : "";
function expand() {
  OCC = []; OIDX = new Map();
  [...EV, ...RECV].forEach(e => {
    if (!e.a || e.shadow) return;
    if (e.type === "contact") return;
    if (e.type === "birthday" ? !SHOW.bday : !SHOW.own) return;
    const dur = dayDiff(e.a, e.b), skip = e.skip?.length ? new Set(e.skip) : null, untilAll = e.repeat !== "none" ? parseIso(e.until) : null, push = a => { if (skip?.has(iso(a)) || (untilAll && a > untilAll)) return; const b = addDays(a, dur); if (b >= START && a <= END) OCC.push({ ev: e, a, b }); };
    if (e.repeat === "yearly") for (let y = START.getFullYear(); y <= END.getFullYear(); y++) { if (y >= e.a.getFullYear() || e.type === "birthday") push(new Date(y, e.a.getMonth(), e.a.getDate())); }
    else if (e.repeat === "weekly") { const until = parseIso(e.until) || END; for (let a = e.a; a <= until && a <= END; a = addDays(a, 7)) push(a); }
    else if (e.repeat === "monthly") { const until = parseIso(e.until) || END; for (let i = 0; ; i++) { const a = new Date(e.a.getFullYear(), e.a.getMonth() + i, Math.min(e.a.getDate(), new Date(e.a.getFullYear(), e.a.getMonth() + i + 1, 0).getDate())); if (a > until || a > END) break; push(a); } }
    else if (repSpec(e.repeat)) { const sp = repSpec(e.repeat), until = sp.u === "y" ? END : (parseIso(e.until) || END), step = sp.u === "d" ? sp.n : sp.u === "w" ? 7 * sp.n : 0;
      for (let i = step ? Math.max(0, Math.floor(dayDiff(e.a, START) / step) - 1) : 0; i < 5000; i++) { const a = repStep(e.a, sp, i); if (a > until || a > END) break; push(a); } }
    else push(e.a);
  });
  if (gOn()) { const seen = new Set(), linked = EV.map(e => e.gEventId).filter(Boolean);
    const isLinked = gid => linked.some(id => gid === id || gid.startsWith(id + "_")); GEV.forEach(list => list.forEach(o => { const k = (o.ev.gid || o.ev.id) + iso(o.a); if (!seen.has(k) && !isLinked(o.ev.gid) && o.b >= START && o.a <= END) { seen.add(k); OCC.push(o); } })); }
  OCC.sort((x, y) => x.a - y.a || (x.ev.time || "99").localeCompare(y.ev.time || "99"));
  OCC.forEach(o => { for (let t = o.a; t <= o.b; t = addDays(t, 1)) { const k = iso(t); if (!OIDX.has(k)) OIDX.set(k, []); OIDX.get(k).push(o); } });
  groupTrips();
}
// ---- Reise bündeln: Hotels, Flüge, Unterkünfte innerhalb einer Reise gehören zur Reise ----
const PART_RE = /🏨|✈|🚆|\b(hotel|stay at|aufenthalt|flug|flight|zug|bahn|ice|ferienwohnung|ferienhaus|apartment|wohnung|airbnb|booking|unterkunft|check-?in|mietwagen|rental car|fähre|ferry|pension|hostel|resort|lodge)\b/i;
const GENERIC_TRIP = /^\s*(urlaub|reise|ferien|auszeit|trip)\b/i;
// Wer wird bei gleich langen Einträgen der Reise-Kopf? Eigene Reise > allgemeiner Titel („Urlaub“) > Google-Reise; bei Gleichstand fest nach id
const headRank = o => (o.ev.type === "trip" ? 4 : 0) + (GENERIC_TRIP.test(o.ev.title) ? 2 : 0) + (isTrip(o) ? 1 : 0);
function groupTrips() {
  OCC.forEach(o => { o.part = null; o.parts = null; });
  if (SHOW.bundle === false) return;
  const trips = OCC.filter(o => isTrip(o) && dayDiff(o.a, o.b) >= 1);
  if (!trips.length) return;
  OCC.forEach(o => {
    const e = o.ev; if (["birthday", "anniversary", "contact", "mina", "info"].includes(e.type) || e.type === "season") return;
    if (!PART_RE.test(`${e.title} ${shortName(e)}`) && !isTrip(o)) return;
    const ol = dayDiff(o.a, o.b); let best = null;
    trips.forEach(t => {
      if (t === o || t.ev === e || o.a < addDays(t.a, -1) || o.b > addDays(t.b, 1)) return;
      const tl = dayDiff(t.a, t.b); if (tl < ol) return;
      if (tl === ol && headRank(t) <= headRank(o)) return;   // gleich lang: nur der „stärkere“ Eintrag wird Reise-Kopf (sonst gegenseitig versteckt)
      if (!best || tl > dayDiff(best.a, best.b)) best = t; });
    o.part = best;
  });
  OCC.forEach(o => { let n = 0; while (o.part && o.part.part && n++ < 5) o.part = o.part.part; if (o.part && (o.part === o || o.part.part)) o.part = null; });   // Kreise auflösen
  OCC.forEach(o => { if (o.part) (o.part.parts = o.part.parts || []).push(o); });
}
const cityOf = e => { for (const t of [e.title, `${e.place || ""} ${e.note || ""}`]) for (const x of Object.values(COUNTRIES)) { const m = String(t).match(x.re);
  if (m && m[0].trim().length > 3) { const w = m[0].trim(); return w[0].toUpperCase() + w.slice(1); } } return ""; };
const tripParts = o => o?.parts || (o ? OCC.filter(x => x.part && x.part.ev === o.ev && sameDay(x.part.a, o.a)) : []);
const tripStops = o => [...new Set(tripParts(o).sort((x, y) => x.a - y.a).map(x => cityOf(x.ev)).filter(Boolean))];
const partsTxt = e => { const o = OCC.find(x => x.ev === e && x.parts?.length); return o ? o.parts.map(x => `${x.ev.title} (${fmt(x.a)}–${fmt(x.b)})${x.ev.place || x.ev.note ? ", " + (x.ev.place || x.ev.note) : ""}`).join("; ") : ""; };
const partsList = o => tripParts(o).sort((x, y) => x.a - y.a).map(x => `${shortName(x.ev)} · ${sameDay(x.a, x.b) ? fmt(x.a) : fmt(x.a) + "–" + fmt(x.b)}`).join("\n");
const occOn = dt => OIDX.get(iso(dt)) || [];
const NOCONF = ["info", "google", "birthday", "anniversary", "contact"];
const conflicts = o => NOCONF.includes(o.ev.type) ? [] : OCC.filter(x => x !== o && x.ev !== o.ev && !NOCONF.includes(x.ev.type) && x.ev.type !== o.ev.type && x.a <= o.b && x.b >= o.a).map(x => evName(x.ev));
const isKidOcc = e => e.type === "mina";

// =================== Zustand ===================
const MONTHS = []; for (let t = new Date(START); t <= END; t = new Date(t.getFullYear(), t.getMonth() + 1, 1)) MONTHS.push({ y: t.getFullYear(), m: t.getMonth() });
const mq = matchMedia("(max-width: 640px)");
const mqL = matchMedia("(orientation: landscape) and (max-height: 520px)");
const compact = () => mq.matches || mqL.matches;
let view = ["month","two","week","list","year"].includes(store.get("ft-view")) ? store.get("ft-view") : "month";
const todayMi = Math.max(0, MONTHS.findIndex(x => x.y === TODAY.getFullYear() && x.m === TODAY.getMonth()));
let curMi = todayMi;
let selYear = MONTHS[curMi].y;
let twoStart = monday(TODAY);
let weekStart = monday(TODAY < START ? START : TODAY > END ? END : TODAY);
let selDay = null, moving = null, sheetMode = null, sheetCtx = null;

// =================== Anzeigen (ein-/ausblenden) ===================
const SHOW_DEF = { be: true, st: true, both: true, hol: true, br: true, own: true, bday: true, season: true, bundle: true, full: false };
let SHOW = (() => { try { return { ...SHOW_DEF, ...JSON.parse(store.get("ft-show") || "{}") }; } catch { return { ...SHOW_DEF }; } })();
function tintOf(d) {
  if (!d) return "";
  if (jointOn() && (winOf(d.dt) || d.allF)) return "tog";
  if (SHOW.be && d.fBE) return "fbe";
  if (SHOW.st && d.fST) return "fst";
  return "";
}
// Farben wie in Google Kalender (colorId 1–11) – eigene Termine, Personen („für Karin“) und Google-Termine mit eigener Farbe
const ECOL = [["7", "Pfau", "#039be5"], ["9", "Heidelbeere", "#3f51b5"], ["1", "Lavendel", "#7986cb"], ["3", "Weintraube", "#8e24aa"], ["4", "Flamingo", "#e67c73"], ["11", "Tomate", "#d50000"], ["6", "Mandarine", "#f4511e"], ["5", "Banane", "#f6bf26"], ["2", "Salbei", "#33b679"], ["10", "Basilikum", "#0b8043"], ["8", "Grafit", "#616161"]];
const ECOLM = Object.fromEntries(ECOL.map(([id, , hex]) => [id, hex]));
const lumInk = hex => { const n = parseInt(String(hex).slice(1), 16), r = n >> 16 & 255, g = n >> 8 & 255, b = n & 255; return (0.299 * r + 0.587 * g + 0.114 * b) > 165 ? "#1d2329" : "#fff"; };
const whoKey = w => String(w || "").trim().toLowerCase();
const whoCols = () => { try { return JSON.parse(store.get("ft-whoc") || "{}"); } catch { return {}; } };
const whoId = w => { if (!w) return ""; const c = whoCols()[whoKey(w)]; if (c && ECOLM[c]) return c; let h = 0; for (const ch of whoKey(w)) h = (h * 31 + ch.charCodeAt(0)) >>> 0; return ECOL[h % 10][0]; };
const ownHex = ev => ev.color && ECOLM[ev.color] ? ECOLM[ev.color] : ev.who ? ECOLM[whoId(ev.who)] : "";
// Farben nach Art (Label) – voreingestellt, unter ☰ → Anzeigen → Farben änderbar; gilt auch für erkannte Google-Termine
const CATS = Object.entries(TYPES).filter(([k]) => k !== "google").map(([k, t]) => [k, t.label, `var(${t.color})`]);   // exakt die Arten aus dem Formular
const CATD = Object.fromEntries(CATS.map(([k, , c]) => [k, c]));
let CATC = null; const catCols = () => (CATC ??= (() => { try { return JSON.parse(store.get("ft-catc") || "{}"); } catch { return {}; } })());
const catColor = k => ECOLM[catCols()[k]] || CATD[k] || "var(--c-termin)";
let catOpen = "";
const gCatOn = () => store.get("ft-gcat") !== "0";
function catOf(ev) {
  const t = String(ev.title || "");
  if (ev.type === "google") { if (isUmg({ ev })) return "mina"; if (/geburtstag|birthday/i.test(t)) return "birthday"; if (URLAUB_RE.test(t)) return "urlaub";
    if (TRIP_RE.test(t) && !/eintragen|beantragen|buchen/i.test(t)) return "trip"; if (NOPLACE_RE.test(t)) return "dienst"; return ""; }
  if (ev.type === "termin" && URLAUB_RE.test(t)) return "urlaub";
  if (ev.type === "termin" && NOPLACE_RE.test(t)) return "dienst";
  return ev.type;
}
const dotSt = e => ` style="background:${colorOf(e)}"`;
const OWN_COLOR = { mina: "var(--c-mina)", birthday: "var(--event)", trip: "var(--trip)", termin: "var(--c-termin)", info: "var(--c-info)", anniversary: "var(--c-anniv)", deadline: "var(--c-deadline)", contact: "var(--c-contact)" };
const colorOf = ev => { if (ev.type === "google") { if (ev.ecol || !gCatOn()) return ev.color; const k = catOf(ev); return k ? catColor(k) : ev.color; }
  return ownHex(ev) || catColor(catOf(ev)) || OWN_COLOR[ev.type] || "var(--c-termin)"; };
const inkOf = ev => { const c = colorOf(ev); return c.startsWith("#") ? lumInk(c) : ev.type === "google" && c === ev.color ? ev.ink : "#fff"; };

// =================== Monat (groß, mit Balken) ===================
const bigEl = $("bigmonth");
function weekLayout(ws, maxL) {
  const we = addDays(ws, 6), items = [];
  OCC.forEach(o => { if (o.b < ws || o.a > we) return;
    items.push({ o, s: Math.max(0, dayDiff(ws, o.a)), e: Math.min(6, dayDiff(ws, o.b)), timed: !!o.ev.time && sameDay(o.a, o.b), len: dayDiff(o.a, o.b) }); });
  if (SHOW.hol) for (let i = 0; i < 7; i++) { const d = dayOf(addDays(ws, i)); if (d && d.h) items.push({ hol: d.h, s: i, e: i, len: 0 }); }
  items.sort((x, y) => (y.len - x.len) || ((x.timed ? 1 : 0) - (y.timed ? 1 : 0)) || (x.s - y.s) || ((x.o?.ev.time || "") .localeCompare(y.o?.ev.time || "")) || (x.hol ? -1 : 1));
  const lanes = [];
  items.forEach(it => { let l = 0; for (;; l++) { const row = lanes[l] || (lanes[l] = []); if (!row.some(r => r.s <= it.e && r.e >= it.s)) { row.push(it); it.lane = l; break; } } });
  const more = Array(7).fill(0);
  items.forEach(it => { if (it.lane >= maxL) for (let c = it.s; c <= it.e; c++) more[c]++; });
  return { items, used: Math.min(lanes.length, maxL), more };
}
// Balken einer Woche: mehrtägige Termine und gleiche Einträge an Folgetagen werden zusammengefasst
function weekBars(wdays, two) {
  const its = [];
  wdays.forEach((dt, c) => {
    if (!dt) return;
    occOn(dt).forEach(o => {
      if (o.part) return;
      const e = o.ev, timed = !!e.time && sameDay(o.a, o.b), stops = o.parts ? tripStops(o) : [];
      const name = shortName(e) + (stops.length ? " · " + stops.join(" → ") : o.parts ? ` · ${o.parts.length} Details` : ""), key = name + "|" + colorOf(e) + "|" + (timed ? e.time : "");
      its.push({ c, key, name, ev: e, timed, past: o.b < TODAY });
    });
    const d = dayOf(dt);
    if (two && d && d.h && SHOW.hol) its.push({ c, key: "hol|" + d.h.name, name: d.h.name, hol: true });
  });
  // gleiche Einträge an aufeinanderfolgenden Tagen zu einem Balken verbinden
  its.sort((x, y) => x.key.localeCompare(y.key) || x.c - y.c);
  const bars = [];
  its.forEach(it => {
    const last = bars[bars.length - 1];
    if (last && last.key === it.key && it.c <= last.e + 1) { last.e = Math.max(last.e, it.c); last.past = last.past && it.past; return; }
    bars.push({ ...it, s: it.c, e: it.c });
  });
  bars.sort((x, y) => (y.e - y.s) - (x.e - x.s) || (y.hol ? 1 : 0) - (x.hol ? 1 : 0) || x.s - y.s || (x.timed ? 1 : 0) - (y.timed ? 1 : 0) || (x.ev?.time || "").localeCompare(y.ev?.time || ""));
  const showTime = two || !compact();
  return bars.map(b => {
    const span = b.e - b.s + 1, cls = `ch${b.past ? " past" : ""}${span > 1 ? " span" : ""}${b.hol ? " hl" : ""}`;
    const st = `grid-column:${b.s + 1} / span ${span};` + (b.hol ? "" : `background:${colorOf(b.ev)};color:${inkOf(b.ev)}`);
    const t = b.timed && showTime ? `<b>${esc(b.ev.time)}</b> ` : "";
    return `<span class="${cls}" data-s="${b.s}" data-e="${b.e}" style="${st}">${t}${esc(b.name)}</span>`;
  }).join("");
}
function renderBigMonth() {
  const two = view === "two", fill = compact() && document.documentElement.classList.contains("fill");
  let days, lead = 0, y, m;
  if (two) days = Array.from({ length: 14 }, (_, i) => addDays(twoStart, i));
  else { ({ y, m } = MONTHS[curMi]); const n = new Date(y, m + 1, 0).getDate(); lead = (new Date(y, m, 1).getDay() + 6) % 7; days = Array.from({ length: n }, (_, i) => new Date(y, m, i + 1)); }
  // Tage aus Vor- und Folgemonat mit anzeigen (blasser)
  const cells = two ? days : [...Array.from({ length: lead }, (_, i) => addDays(days[0], i - lead)), ...days];
  while (cells.length % 7) cells.push(addDays(cells[cells.length - 1], 1));
  const weeks = cells.length / 7, inM = dt => two || dt.getMonth() === m;
  let h = `<div class="mg${two ? " wk2" : ""}" style="--wk:${weeks}">${["Mo","Di","Mi","Do","Fr","Sa","So"].map(w => `<span class="dow">${w}</span>`).join("")}`;
  for (let w = 0; w < weeks; w++) {
    const wd = cells.slice(w * 7, w * 7 + 7), row = w + 2;
    wd.forEach((dt, c) => {
      if (!dt) return;
      const d = dayOf(dt), dd = dt.getDate(), cl = ["mt", tintOf(d)];
      if (isWE(dt)) cl.push("we");
      if (d && SHOW.hol && d.h) cl.push(d.h.be && d.h.st ? "hall" : d.h.be ? "hbe" : "hst");
      if (d && SHOW.br && BRIDGES.has(d.k)) cl.push("br");
      if (sameDay(dt, TODAY)) cl.push("today");
      if (selDay && sameDay(dt, selDay)) cl.push("sel");
      if (!inM(dt)) cl.push("out");
      const oc = occOn(dt), hol = d && d.h && SHOW.hol ? d.h.name : "";
      const title = [hol, ...oc.map(o => evName(o.ev))].filter(Boolean).join(" · ");
      const mo = two && (dd === 1 || (w === 0 && c === 0)) ? `<span class="mo">${MON[dt.getMonth()].slice(0, 3)}</span>` : "";
      h += `<button type="button" class="${cl.join(" ")}" style="grid-area:${row}/${c + 1}" data-day="${iso(dt)}" data-w="${w}" data-c="${c}" aria-label="${dd}. ${MON[dt.getMonth()]}${title ? ": " + esc(title) : ""}"${title ? ` title="${esc(title)}"` : ""}><span class="num">${dd}${mo}</span>${c === 0 ? `<span class="kwi" aria-hidden="true">${isoWeek(dt)}</span>` : ""}${xStripe(d)}</button>`;
    });
    h += `<div class="wb" style="grid-area:${row}/1/${row + 1}/8" data-w="${w}" aria-hidden="true">${weekBars(wd, two)}</div>`;
  }
  bigEl.innerHTML = h + "</div>";
  fitWeeks(fill);
  bigEl.classList.toggle("moving", !!moving);
  if (two) {
    const e = addDays(twoStart, 13), sm = twoStart.getMonth() === e.getMonth();
    $("m-name").textContent = `${twoStart.getDate()}.${sm ? "" : " " + MON[twoStart.getMonth()].slice(0, 3)} – ${e.getDate()}. ${MON[e.getMonth()].slice(0, 3)} ${e.getFullYear()}`;
    $("m-prev").disabled = twoStart <= monday(START); $("m-next").disabled = addDays(twoStart, 13) >= END;
  } else {
    $("m-name").textContent = `${MON[m]} ${y}`;
    $("m-prev").disabled = curMi === 0; $("m-next").disabled = curMi === MONTHS.length - 1;
  }
  fitMonth();
}
// Tablet/Computer: Monat füllt die Bildschirmhöhe (Handy hat dafür eigene Vollbild-Regeln)
function fitMonth() {
  const g = document.querySelector("#v-month .mg"); if (!g) return;
  if (compact() || !["month", "two"].includes(view)) { g.style.removeProperty("--mt-h"); return; }
  const wk = +(getComputedStyle(g).getPropertyValue("--wk") || 6) || 6, dow = g.querySelector(".dow")?.offsetHeight || 20;
  const p1 = $("p1") || document.body, top = g.getBoundingClientRect().top - p1.getBoundingClientRect().top + (parseFloat(getComputedStyle(p1).paddingTop) || 0) * 0;
  const avail = innerHeight - Math.max(0, top) - dow - 24, h = Math.floor((avail - (wk - 1) * 3) / wk);
  if (h > 96) g.style.setProperty("--mt-h", h + "px"); else g.style.removeProperty("--mt-h");
}
addEventListener("orientationchange", () => setTimeout(() => { if (mqL.matches) scrollTo(0, 0); if (view === "month" || view === "two") renderBigMonth(); }, 250));
mqL.addEventListener?.("change", e => { if (e.matches) scrollTo(0, 0); });
// Nur so viele Balken zeigen, wie in die Wochenzeile passen; Rest je Tag als „+n“
if (window.ResizeObserver) { let lastH = 0, rt = null; new ResizeObserver(es => { const h = Math.round(es[0].contentRect.height); if (Math.abs(h - lastH) < 4) return; lastH = h;
  clearTimeout(rt); rt = setTimeout(() => { if ((view === "month" || view === "two") && compact()) renderBigMonth(); }, 80); }).observe(bigEl); }
function fitWeeks(fill) {
  const maxRows = fill ? 99 : view === "two" ? 99 : 4;
  bigEl.querySelectorAll(".wb").forEach(wb => {
    const items = [...wb.children]; if (!items.length) return;
    const tops = [...new Set(items.map(c => c.offsetTop))].sort((a, b) => a - b);
    const H = fill ? wb.clientHeight : Infinity;
    const hideAt = lim => items.filter(c => c.offsetTop + c.offsetHeight > lim || tops.indexOf(c.offsetTop) >= maxRows);
    let hid = hideAt(H - 1);
    if (hid.length && !mqL.matches) hid = hideAt(H - 12);
    if (!hid.length) return;
    const cnt = Array(7).fill(0);
    hid.forEach(c => { c.style.visibility = "hidden"; for (let i = +c.dataset.s; i <= +c.dataset.e; i++) cnt[i]++; });
    if (!fill) hid.forEach(c => c.style.display = "none");
    const w = wb.dataset.w;
    cnt.forEach((n, i) => { if (!n) return; const t = bigEl.querySelector(`.mt[data-w="${w}"][data-c="${i}"]`); if (t) t.insertAdjacentHTML("beforeend", `<span class="chm">+${n}</span>`); });
  });
}
function stepCal(n) { if (view === "two") setTwo(addDays(twoStart, 7 * n)); else setMonth(curMi + n); }
function canStep(n) { if (view === "two") { const t = addDays(twoStart, 7 * n); return t >= monday(START) && t <= END; } return curMi + n >= 0 && curMi + n < MONTHS.length; }
function setTwo(dt) {
  twoStart = monday(dt); if (twoStart < monday(START)) twoStart = monday(START);
  const mi = MONTHS.findIndex(x => x.y === twoStart.getFullYear() && x.m === twoStart.getMonth()); if (mi >= 0) curMi = mi;
  ensureGoogle(); renderBigMonth();
}

// =================== Jahr (kompakt) ===================
const yearEl = $("year");
function renderYearGrid() {
  let out = "";
  MONTHS.forEach(({ y, m }, mi) => {
    if (y !== selYear) return;
    const first = new Date(y, m, 1), n = new Date(y, m + 1, 0).getDate();
    let h = `<div class="month in"><h4><button type="button" class="mlink" data-gomonth="${mi}">${MON[m]}</button></h4><div class="grid"><span></span>` +
      ["Mo","Di","Mi","Do","Fr","Sa","So"].map(w => `<span class="dow">${w}</span>`).join("");
    const lead = (first.getDay() + 6) % 7; let col = 0;
    h += `<span class="kw">${isoWeek(first)}</span>`;
    for (let i = 0; i < lead; i++, col++) h += "<span></span>";
    for (let dd = 1; dd <= n; dd++) {
      const dt = new Date(y, m, dd), d = dayOf(dt), k = d.k;
      if (col === 7) { col = 0; h += `<span class="kw">${isoWeek(dt)}</span>`; }
      const c = [tintOf(d)];
      if (isWE(dt)) c.push("we");
      if (SHOW.hol && d.h) c.push(d.h.be && d.h.st ? "hall" : d.h.be ? "hbe" : "hst");
      if (SHOW.br && BRIDGES.has(k)) c.push("br");
      const oc = occOn(dt);
      if (oc.some(o => o.ev.type === "birthday")) c.push("bd");
      if (oc.some(o => o.ev.type === "trip")) c.push("trip");
      if (oc.some(o => o.ev.type === "mina")) c.push("opt");
      if (oc.some(o => o.ev.type === "termin")) c.push("tm");
      const gdot = oc.some(o => o.ev.type === "google") ? '<i class="gdot"></i>' : "";
      if (sameDay(dt, TODAY)) c.push("today");
      if (selDay && sameDay(dt, selDay)) c.push("sel");
      h += `<button type="button" class="d ${c.join(" ")}" data-day="${k}" aria-label="${dd}. ${MON[m]} ${y}"><span>${dd}</span>${gdot}${xStripe(d)}</button>`;
      col++;
    }
    out += h + "</div></div>";
  });
  yearEl.innerHTML = out;
  yearEl.classList.toggle("moving", !!moving);
  $("ytabs").innerHTML = YEARS.map(y => `<button type="button" data-year="${y}" class="${y === selYear ? "on" : ""}">${y}</button>`).join("");
}
function renderMonths() { if (view === "year") renderYearGrid(); else renderBigMonth(); }
function setMonth(mi) {
  curMi = Math.max(0, Math.min(MONTHS.length - 1, mi)); ensureGoogle(); expand();
  const y = MONTHS[curMi].y;
  if (y !== selYear) { selYear = y; renderOverview(); }
  renderBigMonth();
}
function setYear(y) {
  selYear = y;
  if (MONTHS[curMi].y !== y) curMi = y === TODAY.getFullYear() ? todayMi : MONTHS.findIndex(x => x.y === y);
  ensureGoogle(); expand(); renderMonths(); renderOverview();
}
// =================== Geburtstage aus Kontakten (vCard / Google-CSV) ===================
let CT = [];
function ctParseDate(s) {
  s = String(s || "").trim(); let m;
  if ((m = s.match(/^(\d{4}|--)-?(\d{2})-?(\d{2})/))) return { y: m[1] === "--" ? 0 : +m[1], m: +m[2], d: +m[3] };
  if ((m = s.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})?/))) return { y: m[3] ? +m[3] : 0, m: +m[2], d: +m[1] };
  if ((m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/))) return { y: +m[3], m: +m[1], d: +m[2] };
  return null;
}
function ctCsvRows(t) { const rows = []; let row = [], f = "", q = false;
  for (let i = 0; i < t.length; i++) { const c = t[i];
    if (q) { if (c === '"') { if (t[i + 1] === '"') { f += '"'; i++; } else q = false; } else f += c; }
    else if (c === '"') q = true; else if (c === ",") { row.push(f); f = ""; } else if (c === "\n" || c === "\r") { if (c === "\r" && t[i + 1] === "\n") i++; row.push(f); rows.push(row); row = []; f = ""; } else f += c; }
  if (f || row.length) { row.push(f); rows.push(row); } return rows; }
function ctParse(text) {
  const out = [];
  if (/BEGIN:VCARD/i.test(text)) {
    const un = text.replace(/\r?\n[ \t]/g, "");
    un.split(/BEGIN:VCARD/i).slice(1).forEach(card => {
      const line = k => (card.match(new RegExp("^(?:item\\d+\\.)?" + k + "[;:][^\\n]*", "im")) || [""])[0];
      const val = l => l.slice(l.indexOf(":") + 1).trim().replace(/\\,/g, ",").replace(/\;/g, ";");
      let name = val(line("FN"));
      if (!name) { const n = val(line("N")).split(";"); name = [n[1], n[0]].filter(Boolean).join(" "); }
      const b = ctParseDate(val(line("BDAY")));
      if (name && b) out.push({ name, ...b });
    });
  } else {
    const rows = ctCsvRows(text.replace(/^﻿/, "")); if (rows.length < 2) return out;
    const h = rows[0].map(x => x.trim().toLowerCase()), ix = re => h.findIndex(x => re.test(x));
    const iB = ix(/^(birthday|geburtstag)$/), iN = ix(/^(name|anzeigename|display name)$/), iF = ix(/^(first name|given name|vorname)$/), iL = ix(/^(last name|family name|nachname)$/);
    if (iB < 0) return out;
    rows.slice(1).forEach(r => { const b = ctParseDate(r[iB]); const name = (iN >= 0 && r[iN]) || [r[iF], r[iL]].filter(Boolean).join(" ");
      if (name && name.trim() && b) out.push({ name: name.trim(), ...b }); });
  }
  return out.filter(c => c.m >= 1 && c.m <= 12 && c.d >= 1 && c.d <= 31).map(c => ({ ...c, y: c.y >= 1900 && c.y <= TODAY.getFullYear() ? c.y : 0 }));
}
// Entwurf merken (auch nach Schließen/Neuladen) und vorhandene Geburtstage mit anderem Datum als „ändern“ anbieten
const ctSaveDraft = () => { try { CT.length ? store.set("ft-ct", JSON.stringify(CT)) : localStorage.removeItem("ft-ct"); } catch {} };
const ctBd = name => EV.find(e => e.type === "birthday" && e.title.toLowerCase().trim() === String(name).toLowerCase().trim());
const ctDiff = (c, e) => { const d = parseIso(e.from); return d && (d.getDate() !== c.d || d.getMonth() + 1 !== c.m || (c.y && +e.birthYear !== c.y)); };
function showContacts() {
  if (!CT.length) { try { const d = JSON.parse(store.get("ft-ct") || "[]"); if (Array.isArray(d) && d.length) CT = d; } catch {} }
  const list = CT.length ? `<div class="sg-t">${CT.length} Geburtstage gefunden</div><div class="sg ctl">${CT.map((c, i) => { const ex = ctBd(c.name), upd = ex && ctDiff(c, ex), dup = ex && !upd;
      const exD = ex ? parseIso(ex.from) : null;
      return `<label class="sr2"><input type="checkbox" class="ckb" data-ct="${i}"${c.on && !dup ? " checked" : ""}${dup ? " disabled" : ""}><span>${esc(c.name)}${dup ? " <small>schon da</small>" : upd ? ` <small>ändern – bisher ${p2(exD.getDate())}.${p2(exD.getMonth() + 1)}.${ex.birthYear || ""}</small>` : ""}</span><em>${c.src === "bild" ? "📷 " : ""}${p2(c.d)}.${p2(c.m)}.${c.y || ""}</em></label>`; }).join("")}</div>
    <button type="button" class="btn accent wide" id="ct-go"${CT.some(c => c.on) ? "" : " disabled"}>${CT.filter(c => c.on).length} Geburtstage übernehmen</button>
    <p class="note">Die Liste bleibt gespeichert, bis du sie übernimmst – du kannst also auch später weitermachen.</p>` : "";
  openSheet("Geburtstage übernehmen", ctImgOk ? "Aus einer Kontakte-Datei oder aus Screenshots von Geburtstagslisten." : "Google gibt die Geburtstage deiner Kontakte nicht an andere Apps weiter – mit einer Kontakte-Datei geht es in einer Minute.", `
    ${CT.length ? "" : `<ol class="ct-steps">
      <li>Öffne <a href="https://contacts.google.com" target="_blank" rel="noopener">contacts.google.com</a> – am einfachsten am Computer – und klicke links auf <b>Exportieren</b>.</li>
      <li>Wähle <b>vCard</b> oder <b>Google CSV</b> und speichere die Datei.</li>
      <li>Wähle die Datei hier aus. Ich zeige dir die Geburtstage, du entscheidest, welche übernommen werden.</li></ol>
      ${ctImgOk ? `<p class="note"><b>Oder einfacher:</b> Screenshots von Geburtstagslisten – aus einer App, einer Tabelle oder ein Foto vom Geburtstagskalender an der Wand. Mehrere auf einmal gehen auch.</p>` : ""}
      <p class="note">Geht auch mit einer Kontakte-Datei vom iPhone (iCloud.com → Kontakte → Exportieren). Die Datei bleibt auf deinem Gerät, übernommen werden nur Name und Geburtstag.</p>`}
    <label class="btn ${CT.length ? "ghost" : "accent"} wide ct-pick">${CT.length ? "Kontakte-Datei hinzufügen" : "Kontakte-Datei auswählen"}<input type="file" id="ct-file" accept=".vcf,.csv,text/vcard,text/x-vcard,text/csv" hidden></label>
    ${ctImgOk ? `<label class="btn ghost wide ct-pick">${CT.length ? "Weitere Screenshots hinzufügen" : "Screenshots auswählen"}<input type="file" id="ct-img" accept="image/*" multiple hidden></label>` : ""}
    <p class="err" id="ct-err"></p>${list}`, "contacts");
}
let ctImgOk = false;
async function ctImgCheck() { try { ctImgOk = !!(sample && (await sample.limits?.())?.images); } catch { ctImgOk = false; } }
async function ctShrink(f) {
  try { const bmp = await createImageBitmap(f), k = Math.min(1, 1600 / Math.max(bmp.width, bmp.height));
    if (k >= 1 && f.size < 3e6) return f;
    const c = document.createElement("canvas"); c.width = Math.round(bmp.width * k); c.height = Math.round(bmp.height * k);
    c.getContext("2d").drawImage(bmp, 0, 0, c.width, c.height); return await new Promise(r => c.toBlob(r, "image/jpeg", .85)) || f; } catch { return f; }
}
async function ctShots(files) {
  files = [...(files || [])].slice(0, 12); if (!files.length) return;
  const err = $("ct-err"), have = new Set(EV.filter(e => e.type === "birthday").map(e => e.title.toLowerCase().trim()));
  const known = new Set(CT.map(c => c.name.toLowerCase())); let found = 0, failed = 0;
  for (let i = 0; i < files.length; i++) {
    if (err) { err.style.color = "var(--muted)"; err.textContent = `Lese Bild ${i + 1} von ${files.length} …`; }
    try {
      const img = await ctShrink(files[i]);
      const r = await (window.MK_TASK = "geburtstage-bild", sample.json)(`Auf dem Bild ist eine Liste mit Geburtstagen (z. B. ein Screenshot aus einer Kontakte-, Kalender- oder Geburtstags-App, eine Tabelle oder ein Foto einer handschriftlichen Liste).
Lies alle Personen mit ihrem Geburtstag aus. Antworte NUR mit JSON: {"items":[{"name":"Vorname Nachname","day":1-31,"month":1-12,"year":Geburtsjahr oder 0}]}.
Regeln: nur Einträge mit erkennbarem Tag und Monat. Ein Alter („wird 40“) darf in ein Geburtsjahr umgerechnet werden, bezogen auf das nächste Vorkommen des Datums ab ${iso(TODAY)}. Keine Ankündigungstexte wie „Heute“ oder „in 3 Tagen“ als Namen. Nichts erfinden; wenn nichts erkennbar ist: {"items":[]}.`, { images: [img], modelTier: "default" });
      (Array.isArray(r?.items) ? r.items : []).forEach(x => { const name = String(x?.name || "").trim(), d = +x?.day, m = +x?.month; let y = +x?.year || 0;
        if (!name || !(d >= 1 && d <= 31 && m >= 1 && m <= 12)) return; if (!(y >= 1900 && y <= TODAY.getFullYear())) y = 0;
        const k = name.toLowerCase(); if (known.has(k)) return; known.add(k); const ex = ctBd(name); CT.push({ name, d, m, y, on: !ex || ctDiff({ d, m, y }, ex), src: "bild" }); found++; });
    } catch (e) { failed++; if (e?.code === "not_granted") break; if (e?.code === "rate_limited") { await new Promise(r => setTimeout(r, 4000)); } }
  }
  CT.sort((a, b) => a.m - b.m || a.d - b.d); ctSaveDraft(); showContacts();
  const el = $("ct-err"); if (el) { el.style.color = found ? "var(--muted)" : ""; el.textContent = found ? `${found} Geburtstage aus ${files.length} ${files.length === 1 ? "Bild" : "Bildern"} erkannt${failed ? ` · ${failed} ließen sich nicht lesen` : ""}. Bitte kurz prüfen – Namen und Daten aus Bildern können falsch erkannt sein.` : "Auf den Bildern habe ich keine Geburtstage erkannt."; }
}
async function ctFile(f) {
  if (!f) return;
  let t = ""; try { t = await f.text(); } catch { $("ct-err").textContent = "Die Datei ließ sich nicht lesen."; return; }
  const have = new Set(EV.filter(e => e.type === "birthday").map(e => e.title.toLowerCase().trim()));
  const seen = new Set(CT.map(c => c.name.toLowerCase())); CT = [...CT, ...ctParse(t).filter(c => { const k = c.name.toLowerCase(); if (seen.has(k)) return false; seen.add(k); return true; })
    .map(c => { const ex = ctBd(c.name); return { ...c, on: !ex || ctDiff(c, ex) }; })].sort((a, b) => a.m - b.m || a.d - b.d); ctSaveDraft();
  if (!CT.length) { showContacts(); $("ct-err").textContent = "In dieser Datei habe ich keine Geburtstage gefunden. Sind bei den Kontakten Geburtstage eingetragen?"; return; }
  showContacts();
}
async function ctImport() {
  const pick = CT.filter(c => c.on); if (!pick.length || !db) return;
  const btn = $("ct-go"); if (btn) { btn.disabled = true; btn.textContent = "Wird übernommen …"; }
  let n = 0;
  let u = 0;
  for (const c of pick) { const d = new Date(TODAY.getFullYear(), c.m - 1, c.d), ex = ctBd(c.name);
    try { if (ex) { if (ctDiff(c, ex)) { await COLL("events").doc(ex.id).update({ from: iso(d), to: iso(d), ...(c.y ? { birthYear: c.y } : {}) }); u++; } }
      else { await COLL("events").add(plain({ type: "birthday", title: c.name, from: iso(d), to: iso(d), repeat: "yearly", birthYear: c.y || 0, gcal: "", note: "aus Kontakten" })); n++; } } catch (err) { toast(writeErr(err)); break; } }
  if (u) n = `${n} neu, ${u} geändert –`.replace(/^0 neu, /, "");
  CT = []; ctSaveDraft(); closeSheet(); setTimeout(() => { renderMenuDot(); toast(famUnseen() ? `${n} Geburtstage übernommen – unter ☰ → Anzeigen → Familie gibt es Vorschläge für deine Liebsten` : `${n} Geburtstage übernommen`); }, 600);
}

// =================== Familie & Liebste: Abgleich mit Geburtstagen ===================
const BD_RE = /geburtstag|\bgeb\.?\b|birthday|🎂/i;
const famKey = s => String(s || "").toLowerCase().replace(/\s+/g, " ").trim();
function bdFmt(b) { const p = ctParseDate(b); return p ? `${p2(p.d)}.${p2(p.m)}.${p.y >= 1900 ? p.y : ""}` : ""; }
const bdShow = s => { const p = ctParseDate(s); return p ? `${p2(p.d)}.${p2(p.m)}.${p.y >= 1900 ? p.y : ""}` : ""; };
function bdStore(p) { return p ? (p.y >= 1900 ? `${p.y}-${p2(p.m)}-${p2(p.d)}` : `--${p2(p.m)}-${p2(p.d)}`) : ""; }
// alle Geburtstage, die der Kalender kennt (eigene, importierte und aus Google)
function bdPeople() {
  const map = new Map(), myLast = (meName || "").trim().split(/\s+/).slice(1).pop()?.toLowerCase() || "";
  const put = (name, m, d, y, src) => { const k = famKey(name); if (!k || k.length > 40 || map.has(k)) return;
    let score = 0, role = "", hint = ""; const t = name;
    FAMKW.forEach(([re, r, h]) => { if (!role && re.test(t)) { role = r; hint = h; score += 6; } });
    if (myLast && k.split(" ").includes(myLast)) { score += 4; hint = hint || "gleicher Nachname"; }
    if (/\b(kollege|kollegin|chef|chefin|nachbar|nachbarin|kunde|kundin|trainer|lehrer|lehrerin)\b/i.test(t)) score -= 6;
    if (!role && y && TODAY.getFullYear() - y < 22 && score >= 4) role = "kind";
    map.set(k, { key: k, name, m, d, y: y >= 1900 ? y : 0, role, hint, score, src }); };
  EV.filter(e => e.type === "birthday").forEach(e => { const f = parseIso(e.from); if (f) put(e.title, f.getMonth() + 1, f.getDate(), e.birthYear || 0, { ev: e.id }); });
  OCC.filter(o => o.ev.type === "google" && BD_RE.test(o.ev.title)).forEach(o => { const { name, year } = bdName(o.ev.title);
    if (name && !/^(herzlichen glückwunsch|happy birthday|alles gute)/i.test(o.ev.title.trim())) put(name, o.a.getMonth() + 1, o.a.getDate(), year, { gid: o.ev.recurring ? o.ev.gid.split("_")[0] : o.ev.gid, cal: o.ev.calId }); });
  return [...map.values()];
}
function famSuggest() {
  if (!canWrite) return [];
  const fam = new Set(FAM().flatMap(p => [famKey(p.name), p.key || ""])), no = new Set(PROFILE.famNo || []);
  return bdPeople().filter(c => c.score >= 4 && !fam.has(c.key) && !no.has(c.key)).sort((a, b) => b.score - a.score).slice(0, 8);
}
const famUnseen = () => { const seen = new Set(PROFILE.famSeen || []); return famSuggest().filter(c => !seen.has(c.key)).length; };
function renderMenuDot() { const n = famUnseen(); const d = $("menu-dot"); if (d) d.hidden = !n; const m = $("mi-fam-dot"); if (m) m.hidden = !n; const s = $("mi-set-dot"); if (s) s.hidden = !n; }
let famSaveT = null, FAMED = null, famQ = "";
async function famSave(extra = {}) {
  const prof = { ...PROFILE, family: FAMED.filter(p => p.name.trim()).map(p => ({ name: p.name.trim(), role: p.role, birthday: p.birthday || "", ...(p.key ? { key: p.key } : {}) })), ...extra };
  PROFILE = prof; store.set("ft-profile", JSON.stringify(prof)); renderMenuDot();
  clearTimeout(famSaveT); famSaveT = setTimeout(async () => { try { await COLL("prefs").doc("profile").set(PROFILE); famSyncEvents(); } catch (err) { toast(writeErr(err)); } }, 700);
}
async function famMark(name, on) { // Geburtstags-Termin als „Familie“ markieren → frühere Erinnerung, Geschenkeliste
  const e = EV.find(x => x.type === "birthday" && famKey(x.title) === famKey(name)); if (e) { try { await COLL("events").doc(e.id).update({ fam: on }); } catch {} return true; } return false; }
async function famAdd(c, role, edit, quiet) {
  const name = (edit?.name || c.name).trim(), bd = edit && "birthday" in edit ? edit.birthday : bdStore(c.m ? c : null);
  FAMED.push({ name, role: role || c.role || "andere", birthday: bd, key: c.key });
  const e = EV.find(x => x.type === "birthday" && famKey(x.title) === c.key);
  if (e) { const upd = { fam: true }; if (name !== e.title && !e.gReadOnly) upd.title = name; try { await COLL("events").doc(e.id).update(upd); } catch {} }
  else if (c.src?.gid) { const p = ctParseDate(bd) || c, d = new Date(TODAY.getFullYear(), p.m - 1, p.d);
    try { await COLL("events").add(plain({ type: "birthday", title: name, from: iso(d), to: iso(d), repeat: "yearly", birthYear: p.y >= 1900 ? p.y : 0, gcal: c.src.cal || "", gEventId: c.src.gid, gReadOnly: true, fam: true })); } catch {} }
  if (!quiet) { famSave(); showFamily(); }
}
let famDelArm = "";
async function bdDelete(keys) {
  const ppl = bdPeople(), own = [], goo = [];
  keys.forEach(k => { const c = ppl.find(x => x.key === k); if (!c) return; if (c.src?.ev) own.push(c.src.ev); else if (c.src?.gid) goo.push(c.src); FPICK.delete(k); });
  let undo = null, n = 0;
  if (own.length) { try { undo = await applyChanges(own.map(id => ({ op: "delete", id }))); n += own.length; } catch (err) { toast(writeErr(err)); } }
  if (goo.length && gWritable()) { for (const g of goo) { await gDelete({ gEventId: g.gid, gcal: g.cal }); n++; } setTimeout(() => gSync(), 300); }
  famDelArm = ""; showFamily();
  toast(`${n} ${n === 1 ? "Geburtstag" : "Geburtstage"} gelöscht${goo.length ? " (auch in Google)" : ""}`, goo.length ? null : undo);
}
const famMade = new Set();
let FPICK = new Map(), famAllOpen = false, famSyncing = false, famSyncAgain = false;
// Jede Person mit Geburtstag bekommt einen jährlichen Geburtstag im Kalender (oder der vorhandene wird angepasst)
async function famSyncEvents() {
  if (!canWrite || dbState !== "ready" || !db) return;
  if (famSyncing) { famSyncAgain = true; return; } famSyncing = true;
  try {
    const ppl = bdPeople();
    for (const p of FAM()) {
      const b = ctParseDate(p.birthday); if (!b || !p.name?.trim()) continue;
      const keys = [famKey(p.name), p.key].filter(Boolean);
      const own = EV.find(e => e.type === "birthday" && keys.includes(famKey(e.title)));
      if (!own && famMade.has(keys[0])) continue;
      if (own) { const f = parseIso(own.from), upd = {};
        if (!own.fam) upd.fam = true;
        if (!own.gReadOnly) {
          if (f && (f.getMonth() + 1 !== b.m || f.getDate() !== b.d)) { const d = iso(new Date(f.getFullYear(), b.m - 1, b.d)); upd.from = d; upd.to = d; }
          if (b.y >= 1900 && own.birthYear !== b.y) upd.birthYear = b.y;
          if (famKey(own.title) !== famKey(p.name)) upd.title = p.name.trim(); }
        if (Object.keys(upd).length) { try { await COLL("events").doc(own.id).update(upd); Object.assign(own, upd); } catch {} }
        continue; }
      const g = ppl.find(c => keys.includes(c.key) && c.src?.gid), d = iso(new Date(TODAY.getFullYear(), b.m - 1, b.d));
      try { const ref = await COLL("events").add(plain({ type: "birthday", title: p.name.trim(), from: d, to: d, repeat: "yearly", birthYear: b.y >= 1900 ? b.y : 0, gcal: g?.src.cal || "", gEventId: g?.src.gid || "", gReadOnly: !!g, fam: true }));
        famMade.add(keys[0]); } catch {}
    }
  } finally { famSyncing = false; if (famSyncAgain) { famSyncAgain = false; setTimeout(famSyncEvents, 300); } }
}
function showFamily() {
  if (!FAMED || sheetMode !== "family") FAMED = FAM().map(p => ({ ...p }));
  const sug = famSuggest(), people = bdPeople(), famSet = new Set(FAMED.map(p => famKey(p.name)));
  // als gesehen markieren: der rote Punkt verschwindet, sobald man hier war
  const seen = new Set(PROFILE.famSeen || []); if (sug.some(c => !seen.has(c.key))) { sug.forEach(c => seen.add(c.key)); PROFILE.famSeen = [...seen]; famSave({ famSeen: [...seen] }); }
  const roleSel = (attr, cur) => `<select ${attr}>${ROLES.map(([k, l]) => `<option value="${k}"${(cur || "andere") === k ? " selected" : ""}>${l}</option>`).join("")}</select>`;
  const dt = c => c.m ? `${p2(c.d)}.${p2(c.m)}.${c.y || ""}` : "";
  const q = famKey(famQ), avail = people.filter(c => !famSet.has(c.key) && !FAMED.some(p => p.key === c.key)).sort((a, b) => a.name.localeCompare(b.name, "de")),
    hits = q ? avail.filter(c => c.key.includes(q)) : avail, open = famAllOpen || !!q || FPICK.size > 0;
  const sc = $("sheet") && sheetMode === "family" ? $("sheet").scrollTop : 0;
  openSheet("Familie & Liebste", "Für sie gibt es frühere Erinnerungen und Geschenkelisten zu Weihnachten, Ostern und Geburtstagen.", `<div class="setv">
    <div class="sg-t">Ich</div><div class="sg"><label class="sr2"><span>Vorname</span><input class="fin" id="fam-me" type="text" value="${esc(PROFILE.name || "")}" placeholder="Vorname" autocomplete="given-name"></label>
      <button type="button" class="sr2 nav" id="set-ferien"><span>Bundesland</span><em>${esc([PA, PB].filter(Boolean).map(stName).join(", "))}</em><b aria-hidden="true">›</b></button></div>
    ${sug.length ? `<div class="sg-t">Vorschläge aus deinen Geburtstagen <i class="rdot inl"></i></div><div class="sg">${sug.map(c => `<div class="sr2 fsug"><span><b>${esc(c.name)}</b><small>${dt(c)}${c.hint ? " · " + esc(c.hint) : ""}</small></span>
        ${roleSel(`data-sugrole="${esc(c.key)}" aria-label="Rolle"`, c.role)}<button type="button" class="ic ok" data-sugok="${esc(c.key)}" aria-label="${esc(c.name)} übernehmen">✓</button><button type="button" class="ic no" data-sugno="${esc(c.key)}" aria-label="Nicht vorschlagen">✕</button></div>`).join("")}</div>` : ""}
    <div class="sg-t">Deine Liebsten${FAMED.length ? ` · ${FAMED.length}` : ""}</div>
    <div class="sg">${FAMED.length ? FAMED.map((p, i) => `<div class="sr2 frow"><input class="fin fn" type="text" data-famf="${i}|name" value="${esc(p.name)}" placeholder="Name" aria-label="Name">
        ${roleSel(`data-famf="${i}|role" aria-label="Rolle"`, p.role)}<input class="fin fd" type="text" inputmode="numeric" data-famf="${i}|birthday" value="${esc(bdFmt(p.birthday))}" placeholder="TT.MM.JJJJ" aria-label="Geburtstag"><button type="button" class="ic no" data-famdel="${i}" aria-label="Entfernen">✕</button></div>`).join("")
      : `<p class="sg-n" style="padding:12px 14px;margin:0">Noch niemand eingetragen.</p>`}</div>
    <div class="sg-t">Person hinzufügen</div>
    <div class="fsearch"><input class="fin" id="fam-q" type="search" value="${esc(famQ)}" placeholder="Name suchen" autocomplete="off"></div>
    ${avail.length ? `<details class="fall" id="fam-all"${open ? " open" : ""}><summary>${q ? `${hits.length} Treffer` : `Alle Geburtstage · ${avail.length}`}${FPICK.size ? ` · <b>${FPICK.size} ausgewählt</b>` : ""}</summary>
      <div class="sg fpl">${hits.map(c => { const pk = FPICK.get(c.key), canDel = c.src?.ev || (c.src?.gid && gWritable()), arm = famDelArm === c.key;
        return `<div class="fprow${pk ? " on" : ""}"><label class="sr2 fpick"><input type="checkbox" class="ckb" data-fpick="${esc(c.key)}"${pk ? " checked" : ""}><span>${esc(c.name)}${c.src?.gid && !c.src?.ev ? ` <small class="gtag">Google</small>` : ""}</span><em>${dt(c)}</em></label>${canDel ? `<button type="button" class="ic del${arm ? " arm" : ""}" data-bddel="${esc(c.key)}" aria-label="${esc(c.name)} löschen">${arm ? "Löschen?" : "🗑"}</button>` : ""}</div>
        ${pk ? `<div class="sr2 frow fped"><input class="fin fn" type="text" data-fpe="${esc(c.key)}|name" value="${esc(pk.name)}" aria-label="Name">${roleSel(`data-fpe="${esc(c.key)}|role" aria-label="Rolle"`, pk.role)}<span></span>
          <input class="fin fd" type="text" inputmode="numeric" data-fpe="${esc(c.key)}|birthday" value="${esc(bdFmt(pk.birthday))}" placeholder="TT.MM.JJJJ" aria-label="Geburtstag"></div>` : ""}`; }).join("")}
        ${q && !hits.some(c => c.key === q) ? `<button type="button" class="sr2 nav" id="fam-new"><span>„${esc(famQ.trim())}“ neu hinzufügen</span><b aria-hidden="true">+</b></button>` : ""}</div></details>` :
      q ? `<div class="sg" style="margin-top:6px"><button type="button" class="sr2 nav" id="fam-new"><span>„${esc(famQ.trim())}“ neu hinzufügen</span><b aria-hidden="true">+</b></button></div>` : ""}
    ${FPICK.size ? `<div class="fgo"><button type="button" class="btn accent wide" id="fam-pick-go">${FPICK.size} ${FPICK.size === 1 ? "Person" : "Personen"} übernehmen</button>
      <div class="fgo-r"><button type="button" class="link" id="fam-pick-clear">Auswahl aufheben</button><button type="button" class="link danger" id="fam-pick-del">${famDelArm === "*" ? `Wirklich ${FPICK.size} löschen?` : `${FPICK.size} Geburtstag${FPICK.size === 1 ? "" : "e"} löschen`}</button></div></div>` : ""}
    <p class="sg-n">${people.length ? `${people.length} Geburtstage im Kalender. ` : ""}Fehlen welche? <button type="button" class="link" id="open-contacts">Geburtstage übernehmen</button></p>
  </div>`, "family");
  if (sc) $("sheet").scrollTop = sc;
  if (q && document.activeElement?.id !== "fam-q" && window.__fqFocus) { const el = $("fam-q"); el?.focus({ preventScroll: true }); el?.setSelectionRange(el.value.length, el.value.length); }
}

// =================== Familie teilen (über einen geteilten Google-Kalender) ===================
// Mehrere Gruppen möglich, z. B. „Familie“ und „Freunde“ – jede ist ein geteilter Google-Kalender
const famGroups = () => []; const famGroupsOld = () => { const g = Array.isArray(PROFILE.shareGroups) ? PROFILE.shareGroups.filter(x => x && x.cal) : PROFILE.famCal ? [{ cal: PROFILE.famCal, members: [], std: true }] : [];
  return g.map(x => ({ cal: String(x.cal), members: Array.isArray(x.members) ? x.members.map(String) : [], std: !!x.std })); };
const famCal = () => (famGroups().find(g => g.std) || famGroups()[0])?.cal || "";
const isShareCal = id => !!id && famGroups().some(g => g.cal === id);
const isFamEv = e => isShareCal(e.type === "google" ? e.calId : e.gcal);
const calName = id => id === "primary" ? "Mein Kalender" : (gCals.find(c => c.id === id)?.summary) || "Familie";
const famCalName = () => calName(famCal());
const nameRe = n => new RegExp("(^|[^\\p{L}])" + n.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "($|[^\\p{L}])", "iu");
const GENERIC_FAM = /\b(wir|uns|alle|familie|familien|gemeinsam|zusammen|kinder|kids|elternabend|elterngespräch|kita|schule|hort|einschulung|ferienlager)\b/i;
// Welche Gruppe passt zum Text? Nach genannten Mitgliedern; bei Gleichstand/ohne Namen die Standard-Gruppe
function famPick(t) {
  t = String(t || ""); const G = famGroups(); if (!G.length || !t.trim()) return "";
  const sc = G.map(g => ({ g, n: g.members.map(m => m.replace(/\s*\(.*\)\s*/g, "").trim()).filter(m => m.length > 1).filter(m => nameRe(m).test(t) || nameRe(m.split(/\s+/)[0]).test(t)).length }));
  const best = Math.max(...sc.map(x => x.n));
  if (best > 0) { const top = sc.filter(x => x.n === best); return (top.find(x => x.g.std) || top[0]).g.cal; }
  if (GENERIC_FAM.test(t)) { const std = G.find(g => g.std) || (G.length === 1 ? G[0] : null); return std ? std.cal : ""; }
  return "";
}
const famHint = t => !!famPick(t);
const appUrl = () => "https://claude.ai" + (() => { try { const r = new URL(document.referrer || ""); if (r.hostname === "claude.ai" && /^\/(code\/)?artifact\//.test(r.pathname)) return r.pathname; } catch {} return "/artifact/V4VhQBviYQpo7nLrFvfxC1"; })();
let famShareOpen = "";
function showFamShare() {
  const cals = gCals.filter(c => !c.primary && c.summary !== gPrimarySummary && c.id !== gPrimarySummary), G = famGroups();
  const people = [...new Set(FAM().map(p => p.name.trim()).filter(Boolean))];
  const free = cals.filter(c => !G.some(g => g.cal === c.id));
  const card = (g, i) => { const nm = calName(g.cal), inv = `Hallo! Ich nutze „Mein Kalender“ – da sehen wir unsere gemeinsamen Termine. Ich habe dir in Google den Kalender „${nm}“ freigegeben. Öffne diesen Link, melde dich an und wähle „${nm}“ als gemeinsamen Kalender: ${appUrl()}`;
    return `<div class="sg-t">👪 ${esc(nm)}${g.std ? " · Standard" : ""}</div><div class="sg grp">
      <div class="sr2"><i class="dotc" style="--c:${gColor(g.cal)[0]}"></i><span>Google-Kalender</span><select class="fin" data-grpcal="${i}">${cals.map(c => `<option value="${esc(c.id)}"${c.id === g.cal ? " selected" : ""}${c.id !== g.cal && G.some(x => x.cal === c.id) ? " disabled" : ""}>${esc(c.summary)}</option>`).join("")}</select></div>
      <div class="grp-m"><span class="grp-l">Wer gehört dazu?</span><div class="xchips">${people.length ? people.map(n => { const on = g.members.some(m => famKey(m) === famKey(n)); return `<label class="xchip" style="--c:var(--both)"><input type="checkbox" data-grpm="${i}|${esc(n)}"${on ? " checked" : ""}><i></i>${esc(n)}</label>`; }).join("") : `<span class="sg-n">Erst unter Familie &amp; Liebste Personen eintragen.</span>`}</div></div>
      <div class="grp-a">${G.length > 1 && !g.std ? `<button type="button" class="link" data-grpstd="${i}">Als Standard</button>` : ""}<a class="link" href="https://wa.me/?text=${encodeURIComponent(inv)}" target="_blank" rel="noopener">Per WhatsApp einladen</a><button type="button" class="link danger" data-grpdel="${i}">Entfernen</button></div></div>`; };
  openSheet("Gemeinsame Kalender", "Teilen über geteilte Google-Kalender – Google regelt, wer was sieht. Alles andere bleibt privat.", `<div class="setv">
    ${gState !== "ok" ? `<p class="sg-n">Dafür muss Google verbunden sein (☰ → Google Kalender).</p>` : `
    ${G.map(card).join("")}
    ${free.length ? `<div class="sg-t">${G.length ? "Weitere Gruppe" : "Gemeinsamen Kalender wählen"}</div><div class="sg">${free.map(c => `<button type="button" class="sr2 nav" data-grpadd="${esc(c.id)}"><i class="dotc" style="--c:${gColor(c.id)[0]}"></i><span>${esc(c.summary)}</span><b aria-hidden="true">+</b></button>`).join("")}</div>` : cals.length ? "" : `<p class="sg-n">Lege in Google einen eigenen Kalender an (z. B. „Familie“) und tippe dann unter ☰ → Google Kalender auf „Jetzt abgleichen“.</p>`}
    <p class="sg-n">Wer bei einer Gruppe ausgewählt ist, wird beim Eintragen erkannt: „Mit Ina ins Inselhotel“ landet in der Gruppe, zu der Ina gehört. Ohne Namen, aber mit „wir“, „Kita“ usw. nimmt der Kalender die Standard-Gruppe. Du kannst es beim Eintragen jederzeit ändern.</p>
    ${G.length ? `<details class="setgrp"><summary>So kommen die anderen dazu</summary><ol class="ct-steps">
      <li>In Google Kalender am Computer beim jeweiligen Kalender ⋮ → <b>Einstellungen und Freigabe</b> → <b>Für bestimmte Personen freigeben</b> → E-Mail, Berechtigung „<b>Änderungen an Terminen vornehmen</b>“.</li>
      <li>Den Kalender-Link schicken („Per WhatsApp einladen“). Sie melden sich bei Claude an und wählen den Kalender bei der Einrichtung aus.</li></ol>
      <a class="btn ghost small" href="https://calendar.google.com/calendar/r/settings" target="_blank" rel="noopener">Google-Einstellungen öffnen</a></details>` : ""}
    <p class="sg-n">Packlisten, Geschenkstatus, Aufgaben und Geburtstage bleiben pro Person.</p>`}
  </div>`, "famshare");
}
async function saveGroups(G, msg) {
  if (G.length && !G.some(g => g.std)) G[0].std = true;
  const prof = { ...PROFILE, shareGroups: G, famCal: (G.find(g => g.std) || G[0])?.cal || "" }; PROFILE = prof; store.set("ft-profile", JSON.stringify(prof));
  const s2 = new Set(selectedCals()); let ch = false; G.forEach(g => { if (!s2.has(g.cal)) { s2.add(g.cal); ch = true; } }); if (ch) { gSel = s2; saveGSel(s2); resetGoogleWatches(); }
  try { await COLL("prefs").doc("profile").set(prof); } catch (err) { toast(writeErr(err)); }
  const sc = $("sheet")?.scrollTop || 0; renderAll(); showFamShare(); if ($("sheet")) $("sheet").scrollTop = sc; if (msg) toast(msg);
}
async function setFamCal(id) { saveGroups(id ? [{ cal: id, members: [], std: true }] : []); }

// =================== Aufgaben ===================
let TASKS = [], tkShowDone = false, tkAll = false, tkSelMode = false, TKSEL = new Set(), tkCleaned = false;
const MONS = ["januar", "februar", "märz", "april", "mai", "juni", "juli", "august", "september", "oktober", "november", "dezember"];
const WDS = ["sonntag", "montag", "dienstag", "mittwoch", "donnerstag", "freitag", "samstag"];
function parseTask(txt, base) { // „Reifen wechseln bis Ende Oktober“, „Morgen tanken“, „Sonntag zu Ina fahren“ → Titel + Frist
  const B = base instanceof Date && !isNaN(base) ? new Date(base.getFullYear(), base.getMonth(), base.getDate()) : TODAY;
  let t = String(txt || "").trim().replace(/[.!,;]+$/, ""), due = null, m;
  const MO = "januar|februar|märz|maerz|april|mai|juni|juli|august|september|oktober|november|dezember", WD = "sonntag|montag|dienstag|mittwoch|donnerstag|freitag|samstag";
  const moIdx = n => MONS.indexOf(n.toLowerCase().replace("maerz", "märz"));
  const fut = (mo, d) => { let dt = new Date(B.getFullYear(), mo, d); if (dt < B) dt = new Date(B.getFullYear() + 1, mo, d); return dt; };
  const lastDay = mo => new Date(2001, mo + 1, 0).getDate();
  const PRE = "(?:(?:bis|am|zum|spätestens|ab|im|in|an|diesen|diese|nächsten|nächste|kommenden|kommende)\\s+)*";
  const pats = [
    [`(\\d{1,2})\\.(\\d{1,2})\\.?(\\d{4}|\\d{2}(?!\\d))?`, m => m[3] ? new Date(+(m[3].length === 2 ? "20" + m[3] : m[3]), +m[2] - 1, +m[1]) : fut(+m[2] - 1, +m[1])],
    [`(anfang|mitte|ende)\\s+(?:des\\s+)?(${MO})`, m => { const mo = moIdx(m[2]); return fut(mo, m[1].toLowerCase() === "anfang" ? 5 : m[1].toLowerCase() === "mitte" ? 15 : lastDay(mo)); }],
    [`in\\s+(\\d+|einer|einem|zwei|drei|vier)\\s+(tag|tagen|woche|wochen|monat|monaten)`, m => { const n = ({ einer: 1, einem: 1, zwei: 2, drei: 3, vier: 4 })[m[1].toLowerCase()] || +m[1], u = m[2].toLowerCase();
      return u.startsWith("tag") ? addDays(B, n) : u.startsWith("woche") ? addDays(B, 7 * n) : new Date(B.getFullYear(), B.getMonth() + n, B.getDate()); }],
    [`(${MO})`, m => { const mo = moIdx(m[1]); return fut(mo, lastDay(mo)); }],
    [`(übermorgen)`, () => addDays(B, 2)], [`(morgen)`, () => addDays(B, 1)], [`(heute|heut abend|heute abend)`, () => B],
    [`(ende der woche|diese woche|dieses wochenende|am wochenende|wochenende)`, () => addDays(monday(B), 5)],
    [`(nächste woche|kommende woche)`, () => addDays(monday(B), 11)],
    [`(ende des monats|monatsende|ende monat)`, () => new Date(B.getFullYear(), B.getMonth() + 1, 0)],
    [`(${WD})`, m => { const w = WDS.indexOf(m[1].toLowerCase()); let d = addDays(B, 1); while (d.getDay() !== w) d = addDays(d, 1); return d; }]];
  for (const [src, fn] of pats) { const re = new RegExp(`(^|\\s)${PRE}${src}(?=$|[\\s.,!?])`, "i");
    if ((m = t.match(re))) { const mm = m.slice(1); mm.shift(); const d = fn([m[0], ...mm]); if (d && !isNaN(d)) { due = d; t = (t.slice(0, m.index) + " " + t.slice(m.index + m[0].length)).replace(/\s+/g, " ").trim(); break; } } }
  t = t.replace(/\s+(am|bis|zum|ab|im|in|an)$/i, "").replace(/^(am|bis|zum|ab|im|in|an)\s+/i, "").replace(/[,;:–-]\s*$/, "").trim();
  if (t) t = t[0].toUpperCase() + t.slice(1);
  return { title: t || String(txt).trim(), due: due ? iso(due) : "" };
}
// Vorschläge rund um anstehende Termine – nur Regeln, keine Abfragen
const TK_RULES = [
  [/schul.?fest|sommerfest|kita.?fest|herbstfest|basar|weihnachtsfeier.*(kita|schule)|laternenfest/i, "Kuchen oder Salat mitbringen?", 2],
  [/(kita|schule|hort).*(geschlossen|schließ|zu\b)|schließtag|studientag|pädagogischer tag|brückentag.*(kita|schule)/i, "Betreuung organisieren", 7],
  [/grill|party|feier\b|einweihung|gäste|besuch bei uns|kommen zu uns|brunch bei uns/i, "Einkaufen für", 2],
  [/elternabend|elterngespräch|elternsprechtag/i, "Fragen notieren für", 1],
  [/\btüv\b|\bhu\b|hauptuntersuchung|inspektion/i, "Werkstatttermin vereinbaren für", 21],
  [/reifenwechsel|winterreifen|sommerreifen/i, "Reifen-Termin machen", 14],
  [/einschulung/i, "Schultüte und Ranzen besorgen", 21],
  [/hochzeit/i, "Geschenk und Outfit für", 14],
  [/umzug/i, "Kartons und Helfer organisieren für", 14],
  [/kindergeburtstag|geburtstagsfeier|geburtstagsparty/i, "Einladungen und Mitgebsel für", 14],
];
function taskSuggest() {
  if (!canWrite) return [];
  const have = new Set(TASKS.map(t => t.key).filter(Boolean)), out = [];
  OCC.forEach(o => { const n = dayDiff(TODAY, o.a); if (n < 0 || n > 21 || ["birthday", "info", "anniversary", "contact"].includes(o.ev.type)) return;
    const t = o.ev.title || ""; TK_RULES.forEach(([re, txt, lead], i) => { if (!re.test(t) || n > Math.max(lead, 2) + 7) return;
      const key = `r${i}|${o.ev.gid || o.ev.id}|${iso(o.a)}`; if (have.has(key) || out.some(x => x.key === key)) return;
      const due = addDays(o.a, -lead) < TODAY ? TODAY : addDays(o.a, -lead);
      out.push({ key, title: /für$/.test(txt) ? `${txt} „${shortName(o.ev).replace(/^👪 /, "")}“` : txt, due: iso(due), for: `${shortName(o.ev)} · ${relDay(o)}` }); }); });
  return out.slice(0, 3);
}
function dueLbl(d) { const a = parseIso(d); if (!a) return ""; const n = dayDiff(TODAY, a);
  return n < 0 ? `<em class="due late">überfällig</em>` : n === 0 ? `<em class="due soon">heute</em>` : n === 1 ? `<em class="due soon">morgen</em>` : `<em class="due">${n <= 6 ? WDS[a.getDay()].slice(0, 2).replace(/^./, c => c.toUpperCase()) + " " : ""}${p2(a.getDate())}.${p2(a.getMonth() + 1)}.</em>`; }
function renderTasks() {
  const sec = $("sec-tasks"); if (!sec) return;
  sec.hidden = !canWrite;
  if (!canWrite) return;
  const all = TASKS.filter(t => !t.done && t.state !== "no").sort((a, b) => (a.due || "9999").localeCompare(b.due || "9999")), sug = taskSuggest();
  const later = all.filter(tkLater), open = all.filter(t => !tkLater(t));
  const done = TASKS.filter(t => t.done && t.state !== "no" && t.doneAt && Date.now() - Date.parse(t.doneAt) < TK_KEEP * 864e5).sort((a, b) => String(b.doneAt).localeCompare(String(a.doneAt)));
  if (!tkCleaned && TASKS.length) { tkCleaned = true; setTimeout(tkAutoClean, 3000); }
  $("n-tasks").textContent = open.length || "";
  const MAXT = 5, more = tkAll ? 0 : Math.max(0, open.length - MAXT);
  $("tasks-list").innerHTML = (tkAll ? open : open.slice(0, MAXT)).map(t => `<div class="tk"><input type="checkbox" class="ckb" data-tkdone="${esc(t.id)}" aria-label="${esc(t.title)} erledigt"><button type="button" class="tk-t" data-tkedit="${esc(t.id)}"><span>${esc(t.title)}</span>${dueLbl(t.due)}</button></div>`).join("") +
    (more ? `<button type="button" class="link tk-dl" id="tk-all">+${more} weitere</button>` : tkAll && open.length > MAXT ? `<button type="button" class="link tk-dl" id="tk-all">Weniger anzeigen</button>` : "") +
    (later.length ? `<button type="button" class="link tk-dl" id="tk-later" aria-expanded="${tkLaterOpen}">${tkLaterOpen ? "Spätere ausblenden" : `Später: ${later.length} (ab ${fmt(parseIso(later[0].due))})`}</button>${tkLaterOpen ? later.map(t => `<div class="tk tk-lt"><input type="checkbox" class="ckb" data-tkdone="${esc(t.id)}" aria-label="${esc(t.title)} erledigt"><button type="button" class="tk-t" data-tkedit="${esc(t.id)}"><span>${esc(t.title)}</span>${dueLbl(t.due)}</button></div>`).join("") : ""}` : "") +
    (sug.length ? `<div class="tk-sug">${sug.map((s, i) => `<div class="tk sg2"><span><b>${esc(s.title)}</b><small>${esc(s.for)}</small></span><button type="button" class="ic ok" data-tksug="${i}" aria-label="Übernehmen">✓</button><button type="button" class="ic no" data-tkno="${i}" aria-label="Nicht nötig">✕</button></div>`).join("")}</div>` : "") +
    (done.length ? `<div class="tk-dbar"><button type="button" class="link tk-dl" id="tk-showdone">${tkShowDone ? "Erledigte ausblenden" : `${done.length} erledigt`}</button>${tkShowDone ? (tkSelMode
        ? `<button type="button" class="link tk-dl danger-t" id="tk-delsel"${TKSEL.size ? "" : " aria-disabled=\"true\""}>Ausgewählte löschen${TKSEL.size ? ` (${TKSEL.size})` : ""}</button><button type="button" class="link tk-dl" id="tk-selall">${TKSEL.size === done.length ? "Keine" : "Alle"} auswählen</button><button type="button" class="link tk-dl" id="tk-selx">Fertig</button>`
        : `<button type="button" class="link tk-dl" id="tk-sel">Auswählen</button><button type="button" class="link tk-dl danger-t" id="tk-delall">Alle löschen</button>`) : ""}</div>${tkShowDone ? done.map(t => tkSelMode
        ? `<label class="tk dn sel"><input type="checkbox" class="ckb" data-tksel="${esc(t.id)}"${TKSEL.has(t.id) ? " checked" : ""} aria-label="${esc(t.title)} auswählen"><span>${esc(t.title)}</span></label>`
        : `<div class="tk dn"><input type="checkbox" class="ckb" data-tkundo="${esc(t.id)}" checked aria-label="Wieder offen"><span>${esc(t.title)}</span><button type="button" class="ic no" data-tkdel="${esc(t.id)}" aria-label="Löschen">🗑</button></div>`).join("") + `<p class="note tk-keep">Erledigte Aufgaben werden nach ${TK_KEEP} Tagen automatisch gelöscht.</p>` : ""}` : "");
  window.__tkSug = sug;
}
// Aufgabe eintragen: Text frei, Frist im eigenen Feld. Ein Datum im Text wird nur vorgeschlagen (sichtbar im Feld), der Text bleibt wie getippt.
function tkReset() { const i = $("tk-in"), d = $("tk-due"); if (i) i.value = ""; if (d) { d.value = ""; delete d.dataset.man; } tkUi(); }
function tkUi() { const v = ($("tk-in")?.value || "").trim(), d = $("tk-due"); $("tk-go").disabled = !v; $("tk-go").textContent = v ? "Hinzufügen" : "+"; $("tk-due-row").hidden = !v;
  const q = { 0: iso(TODAY), 1: iso(addDays(TODAY, 1)), w: iso(addDays(monday(TODAY), 6)) }; document.querySelectorAll("[data-tkn]").forEach(b => b.setAttribute("aria-pressed", String(!!d.value && q[b.dataset.tkn] === d.value))); }
// Aufgaben mit Frist in mehr als 14 Tagen warten unter „Später“ (und beim zugehörigen Termin), bis sie näher rücken
const TK_SOON = 14;
const tkLater = t => !!t.due && !!parseIso(t.due) && dayDiff(TODAY, parseIso(t.due)) > TK_SOON;
const tkOfEv = e => TASKS.filter(t => t.state !== "no" && (t.ev === e.id || (!t.ev && e.title && t.title.endsWith(`(„${e.title}“)`))));
let tkLaterOpen = false;
async function addTask(t) { use("aufgabe"); try { await COLL("tasks").add({ title: t.title, due: t.due || "", done: false, key: t.key || "", state: t.state || "", ...(t.ev ? { ev: t.ev } : {}), created: new Date().toISOString(), fixed: true }); } catch (err) { toast(writeErr(err)); } }
function showTaskEdit(id) {
  const t = TASKS.find(x => x.id === id); if (!t) return;
  const d = parseIso(t.due);
  openSheet("Aufgabe", "Ändern, Frist setzen oder löschen", `<div class="form">
    <label for="tk-e-title">Aufgabe</label><textarea class="in" id="tk-e-title" rows="${Math.min(6, Math.max(2, Math.ceil(t.title.length / 34)))}">${esc(t.title)}</textarea>
    <label for="tk-e-due">Frist</label><input id="tk-e-due" type="date" value="${esc(t.due || "")}">
    <div class="shift"><span>Schnell:</span><button type="button" class="btn ghost small" data-tkq="0">Heute</button><button type="button" class="btn ghost small" data-tkq="1">Morgen</button><button type="button" class="btn ghost small" data-tkq="7">+1 Woche</button><button type="button" class="btn ghost small" data-tkq="">Keine</button></div></div>
    <div class="btnrow"><button type="button" class="btn" data-tksave="${esc(id)}">Speichern</button><button type="button" class="btn ghost" data-tkdone2="${esc(id)}">✓ Erledigt</button><button type="button" class="btn danger push" data-tkdel="${esc(id)}">Löschen</button></div>`, "task");
}
// Erledigte nach 30 Tagen wegräumen; Vorschlags-Aufgaben (key) bleiben als „abgelehnt“ stehen, damit sie nicht wieder vorgeschlagen werden
const TK_KEEP = 30;
const tkGone = t => t.key ? COLL("tasks").doc(t.id).update({ state: "no" }) : COLL("tasks").doc(t.id).delete();
async function tkAutoClean() {
  if (!canWrite) return; const old = TASKS.filter(t => t.done && t.state !== "no" && Date.now() - Date.parse(t.doneAt || t.created || 0) > TK_KEEP * 864e5).slice(0, 50);
  for (const t of old) { try { await tkGone(t); } catch {} }
}
async function tkDelMany(ids) {
  const L = TASKS.filter(t => ids.includes(t.id)); if (!L.length) return; use("aufgaben_aufraeumen");
  for (const t of L) { try { await tkGone(t); } catch (err) { toast(writeErr(err)); return; } }
  TKSEL.clear(); tkSelMode = false; renderTasks();
  toast(`${L.length} Aufgabe${L.length > 1 ? "n" : ""} gelöscht`, async () => { for (const t of L) { try { await COLL("tasks").doc(t.id).set({ ...t, id: undefined }); } catch {} } });
}
async function tkDel(id) { const t = TASKS.find(x => x.id === id); try { await COLL("tasks").doc(id).delete(); } catch (err) { toast(writeErr(err)); return; }
  closeSheet(); toast("Aufgabe gelöscht", t ? async () => { try { await COLL("tasks").doc(id).set({ ...t, id: undefined }); } catch {} } : null); }
async function tkSet(id, v) { try { await COLL("tasks").doc(id).update(v); } catch (err) { toast(writeErr(err)); } }

// =================== Teilen mit Personen (innerhalb von „Mein Kalender“, Ende-zu-Ende verschlüsselt) ===================
// Ablage: out/<uid> (öffentlich: nur Verbindungs-IDs), out/<uid>/x/<L> (verschlüsselter Name), out/<uid>/ev/<sid>_<L> (verschlüsselter Termin).
// Nur der Inhaber schreibt in sein „out“; lesen kann nur, wer den Einladungscode kennt.
let shrLoaded = false; const shrDelSeen = new Set();
let SHR = { contacts: [], groups: [], hidden: [], gcal: "", gmir: {} }, RECV = [], MYOUT = new Map(), REMOTE = new Map(), shrWatch = new Map(), OUTALL = [];
const SHR_ON = () => canWrite && !!db && !!uid;
const B32 = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";
const normCode = c => String(c || "").toUpperCase().replace(/[^0-9A-Z]/g, "").split("").filter(ch => B32.includes(ch)).join("");
const pickCode = t => { const m = String(t || "").toUpperCase().match(/[2-9A-Z]{4}-?[2-9A-Z]{4}-?[2-9A-Z]{4}/); return m ? normCode(m[0]) : normCode(t).slice(0, 12); }; // auch aus einer ganzen kopierten Nachricht
const fmtCode = c => normCode(c).replace(/(.{4})(?=.)/g, "$1-");
const newCode = () => [...crypto.getRandomValues(new Uint8Array(12))].map(x => B32[x % 31]).join("");
const b64 = u => btoa(String.fromCharCode(...new Uint8Array(u))), unb64 = s => Uint8Array.from(atob(s), c => c.charCodeAt(0));
const KEYS = new Map();
async function codeKeys(code) {
  const c = normCode(code); if (KEYS.has(c)) return KEYS.get(c);
  const enc = new TextEncoder(), base = await crypto.subtle.importKey("raw", enc.encode(c), "PBKDF2", false, ["deriveBits"]);
  const bits = new Uint8Array(await crypto.subtle.deriveBits({ name: "PBKDF2", salt: enc.encode("mein-kalender/share/v1"), iterations: 120000, hash: "SHA-256" }, base, 384));
  const key = await crypto.subtle.importKey("raw", bits.slice(0, 32), "AES-GCM", false, ["encrypt", "decrypt"]);
  const r = { key, L: [...bits.slice(32, 44)].map(b => b.toString(16).padStart(2, "0")).join("") }; KEYS.set(c, r); return r;
}
async function seal(key, obj) { const iv = crypto.getRandomValues(new Uint8Array(12)); const ct = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, new TextEncoder().encode(JSON.stringify(obj))); return b64(iv) + "." + b64(ct); }
async function unseal(key, s) { try { const [iv, ct] = String(s).split("."); return JSON.parse(new TextDecoder().decode(await crypto.subtle.decrypt({ name: "AES-GCM", iv: unb64(iv) }, key, unb64(ct)))); } catch { return null; } }
async function hashOf(obj) { const d = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(JSON.stringify(obj))); return [...new Uint8Array(d)].slice(0, 10).map(b => b.toString(16).padStart(2, "0")).join(""); }
const shareData = e => ({ color: e.color || "", type: e.type, title: e.title, from: e.from, to: e.to, time: e.time || "", endTime: e.endTime || "", repeat: e.repeat || "none", until: e.until || "", note: e.note || "", place: e.place || "", birthYear: e.birthYear || 0, startYear: e.startYear || 0 });
const myName = () => (PROFILE.name || (meName || "").split(/\s+/)[0] || "Jemand").trim();
const contactBy = L => SHR.contacts.find(c => c.L === L);
const okContacts = () => SHR.contacts.filter(c => c.uid);
const shareNames = Ls => [...new Set(Ls.map(L => contactBy(L)?.name).filter(Boolean))];
// Pro Person: „alles automatisch teilen“ (auto) – einzelne Termine lassen sich trotzdem ausnehmen (shareNo)
const autoLs = () => SHR.contacts.filter(c => c.auto).map(c => c.L);
const effTo = e => { if (!e || e.shared) return []; const no = new Set(e.shareNo || []);
  const auto = e.shadow || e.type === "birthday" ? [] : autoLs().filter(L => !no.has(L));
  return [...new Set([...(e.shareTo || []), ...auto])].filter(L => contactBy(L)); };
const shSplit = sel => { const A = new Set(autoLs()), S = new Set(sel); return { shareTo: [...S].filter(L => !A.has(L)), shareNo: [...A].filter(L => !S.has(L)) }; };
const isSharedEv = e => !!(e.shared || effTo(e).length);
const OUT = (u, sub) => db.collection(sub ? `out/${u}/${sub}` : "out");
async function saveShr() { try { await COLL("prefs").doc("share").set(SHR); } catch (err) { toast(writeErr(err)); } await pubIndex(); }
async function pubIndex() { if (!SHR_ON()) return; try { await OUT().doc(uid).set({ ls: SHR.contacts.map(c => c.L), t: Date.now() }); } catch {} }
function shrStart() {
  if (!SHR_ON() || shrStart.done) return; shrStart.done = true;
  COLL("prefs").doc("share").onSnapshot(d => { const v = d.exists ? JSON.parse(JSON.stringify(d.data() || {})) : {}; // Datenbank-Objekte sind schreibgeschützt → Kopie
    SHR = { contacts: Array.isArray(v.contacts) ? v.contacts : [], groups: Array.isArray(v.groups) ? v.groups : [], hidden: Array.isArray(v.hidden) ? v.hidden : [],
      gcal: String(v.gcal || ""), gmir: v.gmir && typeof v.gmir === "object" ? v.gmir : {} }; shrLoaded = true;
    shrWatchContacts(); shrQueue(); renderAll(); if (sheetMode === "sharemgr" && !$("sheet").hidden) showShareMgr(); }, () => {});
  OUT().onSnapshot(s => { OUTALL = s.docs.map(d => ({ id: d.id, ls: Array.isArray(d.data()?.ls) ? d.data().ls : [] })); shrFindPartners(); }, () => {});
  OUT(uid, "ev").onSnapshot(async s => { const m = new Map();
    for (const d of s.docs) { const v = d.data() || {}, c = contactBy(v.l); if (!c) continue; const { key } = await codeKeys(c.code);
      m.set(`${v.s}|${v.l}`, { id: d.id, l: v.l, s: v.s, t: +v.t || 0, h: v.h || "", del: !!v.del, o: v.o || "", data: v.del ? null : await unseal(key, v.c) }); }
    MYOUT = m; shrMerge(); shrQueue(); }, () => {});
}
async function shrFindPartners() { // wer hat meine Einladung angenommen?
  let ch = false;
  for (const c of SHR.contacts) if (!c.uid) { const p = OUTALL.find(o => o.id !== uid && o.ls.includes(c.L)); if (p) { c.uid = p.id; ch = true;
    try { const { key } = await codeKeys(c.code); const x = await once(OUT(p.id, "x").doc(c.L)); const info = x?.exists ? await unseal(key, x.data()?.c) : null; if (info?.name && !c.nameSet) c.name = c.name || info.name; } catch {} } }
  if (ch) { await saveShr(); shrWatchContacts(); toast("Teilen verbunden ✓"); }
}
const once = ref => new Promise(res => { let u = null, done = false; const tm = setTimeout(() => { if (!done) { done = true; res(null); } }, 8000);
  u = ref.onSnapshot(s => { if (done) return; done = true; clearTimeout(tm); res(s); setTimeout(() => { try { u && u(); } catch {} }, 0); }, () => { if (!done) { done = true; clearTimeout(tm); res(null); } }); });
function shrWatchContacts() {
  okContacts().forEach(c => { const k = c.L + "|" + c.uid; if (shrWatch.has(k)) return;
    shrWatch.set(k, OUT(c.uid, "ev").where("l", "==", c.L).onSnapshot(async s => { const { key } = await codeKeys(c.code), arr = [];
      for (const d of s.docs) { const v = d.data() || {}; arr.push({ l: c.L, s: v.s, t: +v.t || 0, h: v.h || "", del: !!v.del, o: v.o || "", data: v.del ? null : await unseal(key, v.c) }); }
      REMOTE.set(c.L, arr); shrMerge(); }, () => {})); });
}
// Zusammenführen: neuester Stand gewinnt (meine Kopie oder die der anderen Person)
async function shrMerge() {
  const recv = new Map();
  for (const [L, arr] of REMOTE) for (const r of arr) {
    const mine = MYOUT.get(`${r.s}|${L}`), cur = mine && mine.t >= r.t ? mine : r;
    if (r.o === uid || (mine && mine.o === uid)) { // ich habe den Termin angelegt: Änderung der anderen übernehmen
      const e = EV.find(x => x.sid === r.s); if (!e || r.t <= (mine?.t || 0)) continue;
      if (r.del) { if (r.o === uid && !shrDelSeen.has(r.s + r.t)) { shrDelSeen.add(r.s + r.t); const who = contactBy(L)?.name || "Jemand", snap = plain(e);
          try { await applyChanges([{ op: "delete", id: e.id }]); toast(`${who} hat „${e.title}“ gelöscht`, async () => { try { await COLL("events").add({ ...snap, sid: "" }); } catch {} }); } catch {} }
        continue; }
      if (!r.data) continue;
      if (r.h !== await hashOf(shareData(e))) { try { await COLL("events").doc(e.id).update({ ...r.data }); toast(`${contactBy(L)?.name || "Jemand"} hat „${r.data.title}“ geändert`); } catch {} }
      continue; }
    if (cur.del || !cur.data || SHR.hidden.includes(r.s) || contactBy(L)?.show === false) continue;
    const prev = recv.get(r.s); if (prev && prev.t >= cur.t) continue;
    recv.set(r.s, { ...cur, from: contactBy(L)?.name || "", L });
  }
  RECV = [...recv.values()].map(r => ({ ...normalize("s:" + r.s, r.data), shared: { from: r.from, L: r.L, sid: r.s, o: r.o, h: r.h } })).filter(e => e.a);
  renderAll(); shrMirrorQueue();
}
// ---- Geteilte Termine zusätzlich in den eigenen Google Kalender eintragen (feste ID → kein Doppeleintrag, auch von mehreren Geräten) ----
const mirId = (sid, L) => ("mks" + sid + L).toLowerCase().replace(/[^a-v0-9]/g, "").slice(0, 60);
let mirT = null, mirBusy = false; const shrMirrorQueue = () => { clearTimeout(mirT); mirT = setTimeout(shrMirror, 2500); };
async function shrMirror() {
  if (!APP || !SHR_ON() || !gWritable() || mirBusy || !shrLoaded) return; mirBusy = true;
  const M = { ...(SHR.gmir || {}) }, cal = SHR.gcal || "primary", want = new Map(); let ch = false;
  try {
    for (const e of RECV) { const id = mirId(e.shared.sid, e.shared.L); want.set(id, e); }
    for (const [id, e] of want) {
      const h = (e.shared.h || "") + "|" + cal; if (M[id]?.h === h) continue;
      const v = { ...e, title: e.title, gcal: cal }, inp = gInput(v), r = gRecur(v); if (r) inp.recurrenceData = r;
      if (e.place) inp.location = e.place;
      inp.description = [e.note, `Geteilt von ${e.shared.from || "jemandem"} · Mein Kalender`].filter(Boolean).join("\n\n");
      if (M[id] && M[id].cal !== cal) { try { await mcp.callTool(GSERVER, "delete_event", { eventId: id, ...(M[id].cal !== "primary" ? { calendarId: M[id].cal } : {}) }); } catch {} }
      try { await mcp.callTool(GSERVER, "create_event", { ...inp, id }); }
      catch (err) { if (err?.code !== "tool_error") throw err;   // gibt es schon (anderes Gerät/früher gelöscht) → aktualisieren
        await mcp.callTool(GSERVER, "update_event", { ...inp, eventId: id, status: "confirmed" }); }
      M[id] = { h, cal }; ch = true;
    }
    for (const id of Object.keys(M)) if (!want.has(id)) {   // nicht mehr geteilt, ausgeblendet oder Person entfernt
      try { await mcp.callTool(GSERVER, "delete_event", { eventId: id, ...(M[id].cal !== "primary" ? { calendarId: M[id].cal } : {}) }); } catch (err) { if (err?.code !== "tool_error") throw err; }
      delete M[id]; ch = true; }
  } catch { /* Google gerade nicht erreichbar → beim nächsten Mal */ }
  finally { mirBusy = false; }
  if (ch) { SHR.gmir = M; try { await COLL("prefs").doc("share").set(SHR); } catch {} mcp.invalidate(GSERVER, "list_events").catch(() => {}); }
}
let shrT = null; const shrQueue = () => { clearTimeout(shrT); shrT = setTimeout(shrPublish, 900); };
async function shrPublish() {
  if (!SHR_ON() || dbState !== "ready") return;
  for (const e of EV) {
    const to = effTo(e); if (!to.length) continue;
    if (!e.sid) { try { await COLL("events").doc(e.id).update({ sid: crypto.randomUUID().slice(0, 12) }); } catch {} continue; }
    const data = shareData(e), h = await hashOf(data);
    for (const L of to) { const m = MYOUT.get(`${e.sid}|${L}`); if (m && !m.del && m.h === h) continue;
      const { key } = await codeKeys(contactBy(L).code);
      try { await OUT(uid, "ev").doc(`${e.sid}_${L}`).set({ l: L, s: e.sid, t: Date.now(), h, o: uid, c: await seal(key, data) }); } catch (err) { shrWarn(err); return; } }
  }
  for (const m of MYOUT.values()) { if (m.del || m.o !== uid) continue; // nicht mehr geteilt oder gelöscht → für die andere Person entfernen
    const e = EV.find(x => x.sid === m.s); if (e && effTo(e).includes(m.l)) continue;
    try { await OUT(uid, "ev").doc(m.id).set({ l: m.l, s: m.s, t: Date.now(), h: "", o: uid, del: true }); } catch {} }
}
let shrWarned = false; function shrWarn(err) { if (shrWarned) return; shrWarned = true; toast(["permission_denied", "not_granted", "forbidden"].includes(err?.code) ? "Teilen ist auf dieser Seite noch nicht freigegeben" : "Teilen hat gerade nicht geklappt"); }
async function recvSave(e, v) { // eine geteilte Kopie bearbeiten → an die andere Person zurück
  const c = contactBy(e.shared.L); if (!c) return; const { key } = await codeKeys(c.code), data = shareData(v);
  await OUT(uid, "ev").doc(`${e.shared.sid}_${c.L}`).set({ l: c.L, s: e.shared.sid, t: Date.now(), h: await hashOf(data), o: e.shared.o || c.uid, c: await seal(key, data) });
}
// Namen im Text → passende Personen/Gruppen vorschlagen
function shrPick(t) { t = String(t || ""); if (!t.trim()) return [];
  const hit = n => n && n.length > 1 && nameRe(n.split(/\s+/)[0]).test(t);
  const gs = SHR.groups.filter(g => hit(g.name)).flatMap(g => g.members);
  return [...new Set([...gs, ...SHR.contacts.filter(c => hit(c.name)).map(c => c.L)])]; }
// Auswahl-Chips (Personen + Gruppen)
function shrChips(attr, sel) {
  const S = new Set(sel || []);
  return `<div class="xchips shc">${SHR.contacts.map(c => `<label class="xchip" style="--c:var(--both)"><input type="checkbox" ${attr}="${esc(c.L)}"${S.has(c.L) ? " checked" : ""}><i></i>${esc(c.name)}${c.uid ? "" : ` <small class="muted">(wartet)</small>`}</label>`).join("")}
    ${SHR.groups.filter(g => g.members.length).map(g => `<label class="xchip" style="--c:var(--trip)"><input type="checkbox" ${attr}="g:${esc(g.id)}"${g.members.every(L => S.has(L)) ? " checked" : ""}><i></i>👥 ${esc(g.name)}</label>`).join("")}</div>`; }
function chipSel(attr, root = document) { const out = new Set(); root.querySelectorAll(`[${attr}]:checked`).forEach(i => { const v = i.getAttribute(attr); if (v.startsWith("g:")) (SHR.groups.find(g => g.id === v.slice(2))?.members || []).forEach(L => out.add(L)); else out.add(v); }); return [...out]; }
// ---- Verwaltung: Personen & Gruppen ----
const INVITE_URL = APP ? location.origin : "https://mein-kalender.onrender.com"; // Einladungsseite mit eigenem Vorschaubild (eigene App: gleiche Domain)
// Eigene App: Einladungscode aus dem Link merken (überlebt die Google-Anmeldung) und nach der Einrichtung automatisch annehmen
const INVITE_KEY = "mk-invite";
if (APP) { const h = new URLSearchParams(location.hash.slice(1)); const c = (h.get("invite") || "").toUpperCase().replace(/[^0-9A-Z]/g, "");
  if (c.length === 12) { try { localStorage.setItem(INVITE_KEY, c); } catch {} history.replaceState(null, "", location.pathname + location.search); } }
const pendingInvite = () => { try { return localStorage.getItem(INVITE_KEY) || ""; } catch { return ""; } };
const invDone = () => { try { localStorage.removeItem(INVITE_KEY); } catch {} };
async function takeInvite() { const c = pendingInvite(); if (!c || !canWrite) return false;
  if (SHR.contacts.some(x => normCode(x.code) === c)) { invDone(); return false; }
  shrAcc = { code: c.replace(/(.{4})(?=.)/g, "$1-") }; await shrCheck(c, true);
  if (shrAcc?.from) { showInvite(); renderHints(); } else { invDone(); showShareMgr(); }
  return true; }
let shrNew = null, shrAcc = null, shrGrp = null;
// ---- Betreiber-Dashboard (nur für ADMIN_EMAIL im Worker): Nutzung, KI-Tokens, Kosten, Abo-Simulation ----
const AI_PRICE = { "claude-sonnet-5-5": [2, 10], "claude-haiku-4-5-20251001": [1, 5], "claude-haiku-4-5": [1, 5], "claude-haiku-5-5": [0.1, 0.5], "claude-opus-5-5": [5, 25] };   // $ pro 1 Mio. Tokens (Eingabe, Ausgabe)
let ADM = null, ADM_FREE = 30;
async function adminCheck() { if (!APP || !window.mkAdminMe) return; const r = await window.mkAdminMe(); const mi = $("mi-admin"); if (mi) mi.hidden = !r?.admin; }
let ADM_TAB = "ueb";
async function showAdmin(reload) {
  if (!ADM || reload) { openSheet("Betreiber-Dashboard", "lädt …", `<p class="note">Zahlen werden geholt …</p>`, "adm"); ADM = await window.mkAdminStats?.().catch(() => null); }
  const D = ADM; if (!D || D.code) { openSheet("Betreiber-Dashboard", "", `<p>Keine Daten (${esc(D?.code || "Fehler")}).</p>`, "adm"); return; }
  const d30 = iso(addDays(TODAY, -29)), d7 = iso(addDays(TODAY, -6)), m0 = iso(TODAY).slice(0, 8) + "01", today = iso(TODAY), short = id => id ? id.slice(0, 6) : "–";
  const cost = r => { const [task, model0] = String(r.task).split("|"), model = model0 || D.models.default, P = AI_PRICE[model] || [3, 15]; return { task, model, c: (r.tok_in * P[0] + r.tok_out * P[1]) / 1e6 }; };
  const ai = D.ai.map(r => ({ ...r, ...cost(r) })), ai30 = ai.filter(r => r.day >= d30), use30 = D.use.filter(r => r.d >= d30);
  const sum = (a, f) => a.reduce((x, r) => x + f(r), 0), usd = v => v < 0.01 && v > 0 ? "<0,01 $" : v.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " $";
  const num = v => Math.round(v).toLocaleString("de-DE"), pct = (a, b) => b ? Math.round(a / b * 100) + " %" : "–";
  const act = from => new Set([...D.use.filter(r => r.d >= from).map(r => r.u), ...ai.filter(r => r.day >= from).map(r => r.user_id)]).size;
  const neu30 = D.users.filter(u => u.created && u.created.slice(0, 10) >= d30).length;
  const uName = id => `${short(id)}${D.users.find(u => u.id === id)?.me ? " (du)" : ""}`, uLast = id => D.users.find(u => u.id === id)?.last?.slice(0, 10) || "";
  const dShort = s => s ? fmt(parseIso(s.slice(0, 10))) : "–";
  const tbl = (head, rows, empty = "noch keine Daten") => rows.length ? `<table><tr>${head.map(h => `<th${h.startsWith("#") ? ' class="n"' : ""}>${esc(h.replace(/^#/, ""))}</th>`).join("")}</tr>${rows.join("")}</table>` : `<p class="note">${empty}</p>`;
  const tr = cells => `<tr>${cells.map(c => typeof c === "number" || /^#/.test(String(c)) ? `<td class="n">${String(c).replace(/^#/, "")}</td>` : `<td>${c}</td>`).join("")}</tr>`;
  // Funktionszähler aus der App: KI-Fehler, Limits und App-Fehler getrennt von der normalen Nutzung
  const SYSF = /^(ki_fehler|ki_limit|app_fehler)/;
  const byF = new Map(), sysF = new Map();
  use30.forEach(r => Object.entries(r.f).forEach(([k, n]) => { const M = SYSF.test(k) ? sysF : byF, x = M.get(k) || { n: 0, u: new Set() }; x.n += n; x.u.add(r.u); M.set(k, x); }));
  const byT = new Map(); ai30.forEach(r => { const k = r.task, x = byT.get(k) || { n: 0, ti: 0, to: 0, c: 0, u: new Set() }; x.n += r.calls; x.ti += r.tok_in; x.to += r.tok_out; x.c += r.c; x.u.add(r.user_id); byT.set(k, x); });
  const byU = new Map(); ai30.forEach(r => { const x = byU.get(r.user_id) || { n: 0, c: 0 }; x.n += r.calls; x.c += r.c; byU.set(r.user_id, x); });
  const calls30 = sum(ai30, r => r.calls), cost30 = sum(ai30, r => r.c), tok30 = sum(ai30, r => r.tok_in + r.tok_out), perCall = calls30 ? cost30 / calls30 : 0, perTok = tok30 ? cost30 / tok30 : 0;
  const S = D.sys || [], S30 = S.filter(x => x.d >= d30), sS = k => sum(S30, x => x[k] || 0), lastRun = S.map(x => x.last).filter(Boolean).sort().at(-1);
  const runAge = lastRun ? (Date.now() - Date.parse(lastRun)) / 60e3 : Infinity;
  const L = D.limits || null, devs = D.dev || [];
  const newest = devs.map(x => x.b).filter(Boolean).sort().at(-1) || "", curB = window.MK_BUILD || newest;
  const kErr = [...sysF].filter(([k]) => k.startsWith("ki_fehler")).reduce((s, [, x]) => s + x.n, 0), kLim = sysF.get("ki_limit")?.n || 0, aErr = sysF.get("app_fehler")?.n || 0;
  // Ampel
  const lamp = (ok, warn) => ok ? "🟢" : warn ? "🟡" : "🔴";
  const K = D.keys || {}, lamps = [
    [lamp(runAge < 15, runAge < 60), "5-Minuten-Takt", lastRun ? `letzter Lauf ${new Date(lastRun).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })} (vor ${Math.round(runAge)} Min.)` : "noch kein Lauf aufgezeichnet"],
    [lamp(K.anthropic), "KI (Anthropic)", K.anthropic ? `Modelle ${D.models.default} / ${D.models.quick}` : "ANTHROPIC_KEY fehlt"],
    [lamp(K.supabase), "Datenbank (Supabase)", "verbunden"],
    [lamp(K.google), "Google-Anmeldung", K.google ? "Client-Schlüssel gesetzt" : "GOOGLE_CLIENT_SECRET fehlt"],
    [lamp(K.vapid), "Benachrichtigungen", K.vapid ? `${num(sS("sent"))} verschickt · ${num(sS("fail"))} fehlgeschlagen · ${num(sS("gone"))} abgelaufene Geräte entfernt (30 Tage)` : "VAPID_JWK fehlt"],
    [lamp(K.db), "Bahn (DB Timetables)", K.db ? `${num(sS("wt"))} Zug-Prüfungen (30 Tage)` : "DB-Schlüssel fehlen"],
    [lamp(K.airlabs), "Flüge (AirLabs)", K.airlabs ? `${num(sum(S.filter(x => x.d >= m0), x => x.al || 0))} Abfragen diesen Monat` : "AIRLABS_KEY fehlt"],
    [lamp(!aErr, aErr < 20), "App-Fehler bei Nutzern", aErr ? `${aErr} in 30 Tagen` : "keine"],
  ];
  const bad = lamps.filter(l => l[0] !== "🟢").length;
  // ---- Abschnitte ----
  const T = {};
  T.ueb = `<div class="adm-k"><div><b>${D.users.length}</b><span>Nutzer gesamt</span></div><div><b>${act(d7)}</b><span>aktiv (7 Tage)</span></div><div><b>${act(d30)}</b><span>aktiv (30 Tage)</span></div>
      <div><b>${neu30}</b><span>neu (30 Tage)</span></div><div><b>${D.push}</b><span>mit Benachrichtigungen</span></div><div><b>${usd(cost30)}</b><span>KI-Kosten 30 Tage</span></div>
      <div><b>${calls30}</b><span>KI-Aufrufe 30 Tage</span></div><div><b>${num(tok30 / 1e3)} k</b><span>Tokens 30 Tage</span></div><div><b>${bad ? "⚠️ " + bad : "✅"}</b><span>${bad ? "System-Hinweise" : "System in Ordnung"}</span></div></div>
    <h3>System auf einen Blick</h3><ul class="adm-l">${lamps.map(([l, n, t]) => `<li>${l} <b>${esc(n)}</b> <span class="note">${esc(t)}</span></li>`).join("")}</ul>`;
  const days = Array.from({ length: 30 }, (_, i) => iso(addDays(TODAY, i - 29))), perDay = days.map(d => sum(ai.filter(r => r.day === d), r => r.c)), mx = Math.max(...perDay, 1e-9);
  const calls = [...byU.values()].map(x => x.n).sort((a, b) => a - b), over = calls.filter(n => n > ADM_FREE).length, actU = act(d30) || 1;
  const pc = q => calls.length ? calls[Math.min(calls.length - 1, Math.floor(q * calls.length))] : 0, costU = [...byU.values()].map(x => x.c).sort((a, b) => a - b);
  // Monatsstand je Nutzer gegen die Grenzen
  const mU = new Map(); ai.filter(r => r.day >= m0).forEach(r => { const x = mU.get(r.user_id) || { n: 0, t: 0, c: 0, d: 0 }; x.n += r.calls; x.t += r.tok_in + r.tok_out; x.c += r.c; if (r.day === today) x.d += r.calls; mU.set(r.user_id, x); });
  const bar = (v, max) => `<span class="adm-bar"><i style="width:${Math.min(100, Math.round(v / (max || 1) * 100))}%;${v / (max || 1) >= .8 ? "background:var(--holiday)" : ""}"></i></span>`;
  T.ki = `<h3>KI-Kosten pro Tag (30 Tage)</h3><div class="adm-bars" role="img" aria-label="KI-Kosten pro Tag">${perDay.map((v, i) => `<i style="height:${Math.round(v / mx * 100)}%" title="${fmt(parseIso(days[i]))}: ${usd(v)}"></i>`).join("")}</div>
    <p class="note">höchster Tag: ${usd(mx > 1e-9 ? mx : 0)} · Ø je Aufruf ${(perCall * 100).toLocaleString("de-DE", { maximumFractionDigits: 2 })} ct</p>
    <h3>KI nach Funktion (30 Tage)</h3>${tbl(["Funktion", "#Aufrufe", "#Nutzer", "#Tokens", "#Kosten", "#Ø/Aufruf"], [...byT].sort((a, b) => b[1].c - a[1].c).map(([k, x]) => tr([esc(k), x.n, x.u.size, `#${Math.round((x.ti + x.to) / 1e3)} k`, `#${usd(x.c)}`, `#${(x.c / x.n * 100).toLocaleString("de-DE", { maximumFractionDigits: 2 })} ct`])))}
    <h3>Fehlerquote der KI (30 Tage)</h3><p>${kErr} Fehler bei ${calls30} Aufrufen = <b>${pct(kErr, calls30)}</b> · Limit erreicht: <b>${kLim}×</b></p>
    ${tbl(["Funktion", "Art", "#Anzahl"], [...sysF].filter(([k]) => k.startsWith("ki_fehler")).sort((a, b) => b[1].n - a[1].n).map(([k, x]) => { const [, t, c] = k.match(/^ki_fehler_(.*?)(?:__(.*))?$/) || []; return tr([esc(t || k), esc(c || ""), x.n]); }), "keine Fehler gezählt (wird seit diesem Update erfasst)")}
    <h3>Grenzen pro Nutzer</h3>${L ? `<p>KI: <b>${L.day}</b> Anfragen/Tag, davon <b>${L.img}</b> mit Tickets/Bildern · <b>${L.month}</b> Anfragen, <b>${(L.tok / 1e6).toLocaleString("de-DE")} Mio.</b> Tokens oder <b>${usd(L.usd || 0)}</b> pro Monat – was zuerst erreicht ist.<br>
      Dateien: max. 5 MB, max. ${PDF_MAX_PAGES} PDF-Seiten, die KI liest davon die ersten ${PDF_AI_PAGES} · max. 6 Dateien je Auswertung.</p>
      <h3>Grenzen als Kosten (US-Dollar)</h3><p class="note">gerechnet mit euren Durchschnittswerten der letzten 30 Tage (${(perCall * 100).toLocaleString("de-DE", { maximumFractionDigits: 2 })} ct je Aufruf)</p>
      ${tbl(["Grenze", "#entspricht höchstens"], [tr([`${L.day} Anfragen am Tag`, `#${usd(L.day * perCall)} am Tag`]), tr([`${L.day} × 30 Tage`, `#${usd(L.day * 30 * perCall)} im Monat`]), tr([`${L.month} Anfragen im Monat`, `#${usd(L.month * perCall)}`]), tr([`${(L.tok / 1e6).toLocaleString("de-DE")} Mio. Tokens`, `#${usd(L.tok * perTok)}`]), tr([`Kostengrenze`, `#<b>${usd(L.usd || 0)}</b>`])])}
      <p class="note">Ändern in Cloudflare → Worker → Einstellungen → Variablen (DAILY_LIMIT, IMAGE_DAILY_LIMIT, MONTHLY_LIMIT, MONTHLY_TOKENS, MONTHLY_USD).</p>
      <h3>Wer ist nah an der Grenze? (dieser Monat)</h3>${tbl(["Nutzer", "heute", "Monat", "Kosten"], [...mU].sort((a, b) => b[1].c - a[1].c).slice(0, 12).map(([id, x]) => tr([uName(id), `${x.d}/${L.day} ${bar(x.d, L.day)}`, `${x.n}/${L.month} ${bar(x.n, L.month)}`, `${usd(x.c)}/${usd(L.usd || 0)} ${bar(x.c, L.usd)}`])))}` : `<p class="note">Worker noch nicht aktualisiert.</p>`}
    <h3>Nutzer mit den höchsten KI-Kosten (30 Tage)</h3>${tbl(["Nutzer", "#Aufrufe", "#Kosten", "#zuletzt"], [...byU].sort((a, b) => b[1].c - a[1].c).slice(0, 20).map(([id, x]) => tr([uName(id), x.n, `#${usd(x.c)}`, `#${uLast(id) ? fmt(parseIso(uLast(id))) : "–"}`])))}
    <h3>Abo-Simulation</h3><div class="adm-sim"><label for="adm-free">Freie KI-Aktionen pro Monat</label><input id="adm-free" type="number" min="1" max="500" value="${ADM_FREE}"></div>
    <p>${over} von ${actU} aktiven Nutzern (${Math.round(over / actU * 100)} %) hätten in den letzten 30 Tagen mehr gebraucht. Median ${pc(.5)}, 90 % der Nutzer ≤ ${pc(.9)} KI-Aktionen.<br>
      Ein Nutzer, der das Freikontingent voll ausschöpft, kostet ca. <b>${usd(perCall * ADM_FREE)}</b> im Monat. Kosten je aktivem KI-Nutzer: Median ${usd(costU[Math.floor(costU.length / 2)] || 0)}, höchster ${usd(costU.at(-1) || 0)}.</p>
    <p class="note">Stand ${new Date(D.at).toLocaleString("de-DE")} · Preise: ${Object.entries(AI_PRICE).filter(([m]) => m === D.models.quick || m === D.models.default).map(([m, p]) => `${m} ${p[0]}/${p[1]} $ je 1 Mio.`).join(" · ")}.</p>`;
  // Nutzer: Einrichtungsstand, Bleiben, Funktionen, Hilfe-Fragen
  const devOf = id => devs.filter(x => x.u === id), yes = b => b ? "✅" : "–";
  const setupRows = D.users.slice().sort((a, b) => (b.last || "").localeCompare(a.last || "")).map(u => { const ds = devOf(u.id), b = ds.map(x => x.b).filter(Boolean).sort().at(-1) || "";
    return tr([uName(u.id), `#${D.evn?.[u.id] || 0}`, `#${ds.length}`, yes(ds.some(x => x.sa)), yes(ds.some(x => x.g === "ok")), yes((D.pushBy?.[u.id] || 0) > 0), b ? (b === curB ? "✅ aktuell" : "⚠️ alt") : "–", `#${u.last ? dShort(u.last) : "–"}`]); });
  const actDays = new Map(); D.use.forEach(r => (actDays.get(r.u) || actDays.set(r.u, new Set()).get(r.u)).add(r.d)); ai.forEach(r => (actDays.get(r.user_id) || actDays.set(r.user_id, new Set()).get(r.user_id)).add(r.day));
  const ret = n => { const C = D.users.filter(u => u.created && iso(addDays(parseIso(u.created.slice(0, 10)), n)) <= today); const k = C.filter(u => [...(actDays.get(u.id) || [])].some(d => d >= iso(addDays(parseIso(u.created.slice(0, 10)), n)))).length; return `${k} von ${C.length} (${pct(k, C.length)})`; };
  const PL = { free: "Kostenlos", plus: "Plus", family: "Familie" };
  const planRows = D.users.slice().sort((a, b) => (b.last || "").localeCompare(a.last || "")).map(u => { const m = mU.get(u.id) || { n: 0 };
    return tr([uName(u.id), `${PL[u.plan] || "Kostenlos"}${u.trial ? " (Probe)" : ""}${u.planSrc === "sim" ? " · Test" : u.planSrc === "admin" ? " · gesetzt" : ""}${u.planUntil ? ` · bis ${dShort(u.planUntil)}` : ""}`, `#${m.n}`,
      Object.keys(PL).filter(k => k !== (u.plan || "free")).map(k => `<button type="button" class="link" data-admplan="${esc(u.id)}|${k}">${PL[k]}</button>`).join(" · ")]); });
  T.nutzer = `<h3>Tarife</h3><p class="note">Abrechnung: <b>${esc(D.billing === "off" ? "aus (keine Tarif-Grenzen)" : D.billing === "live" ? "live" : "Simulation – Abschluss ohne Zahlung")}</b> · umstellen in Cloudflare über die Variable BILLING_MODE (off / simulate / live).</p>
    ${tbl(["Nutzer", "Tarif", "#KI diesen Monat", "setzen auf"], planRows)}
    <h3>Einrichtungsstand je Nutzer</h3>${tbl(["Nutzer", "#Einträge", "#Geräte", "App", "Google", "Push", "Version", "#zuletzt"], setupRows)}
    <p class="note">App = als App installiert · Google = auf mindestens einem Gerät verbunden · Version = neueste genutzte App-Version. Geräte melden sich seit diesem Update.</p>
    <h3>Bleiben die Nutzer?</h3><p>noch aktiv nach 1 Tag: <b>${ret(1)}</b> · nach 7 Tagen: <b>${ret(7)}</b> · nach 30 Tagen: <b>${ret(30)}</b></p>
    <h3>Häufigste Hilfe-Fragen</h3>${(D.helpq || []).length ? `<ul class="adm-l">${D.helpq.slice(0, 40).map(h => `<li>„${esc(h.q)}“ <span class="note">${dShort(h.at)} · ${short(h.u)}</span></li>`).join("")}</ul>` : `<p class="note">noch keine Fragen gestellt</p>`}
    <h3>Genutzte Funktionen (30 Tage)</h3>${tbl(["Funktion", "#Anzahl", "#Nutzer", "#Anteil Nutzer"], [...byF].sort((a, b) => b[1].u.size - a[1].u.size || b[1].n - a[1].n).map(([k, x]) => tr([esc(k.replace(/_/g, " ")), x.n, x.u.size, `#${Math.round(x.u.size / actU * 100)} %`])))}`;
  T.waechter = `<h3>Zug- &amp; Flug-Wächter (30 Tage)</h3>${tbl(["", "#Anzahl"], [tr(["Zug-Prüfungen", num(sS("wt"))]), tr(["Flug-Prüfungen", num(sS("wf"))]), tr(["davon mit Live-Daten gefunden", `#${num(sS("found"))} (${pct(sS("found"), sS("wt") + sS("wf"))})`]), tr(["Meldungen (Verspätung, Gleis, Gate …)", num(sS("wmsg"))]), tr(["AirLabs-Abfragen diesen Monat", num(sum(S.filter(x => x.d >= m0), x => x.al || 0))])])}
    <p class="note">AirLabs zählt jede Abfrage gegen dein Kontingent (im kostenlosen Tarif begrenzt) – Flüge werden bis 1 Std. vor Abflug nur alle 15 Min. abgefragt.</p>
    <h3>Deine Fahrten jetzt prüfen</h3><p class="note">Prüft deine beobachteten Züge (Bahn) und Flüge (AirLabs) direkt und zeigt jeden Schritt – ohne Benachrichtigung. Beobachtet wird ab ca. 2½ Std. (Zug) bzw. 3 Std. (Flug) vor der Abfahrt.</p>
    <p><button type="button" class="btn ghost small" id="adm-train">Jetzt prüfen</button></p><div id="adm-train-out"></div>`;
  const vers = new Map(); devs.forEach(x => vers.set(x.b || "?", (vers.get(x.b || "?") || 0) + 1));
  const errs = devs.filter(x => x.le).sort((a, b) => String(b.leAt || "").localeCompare(String(a.leAt || ""))).slice(0, 15);
  T.system = `<h3>Dienste</h3><ul class="adm-l">${lamps.map(([l, n, t]) => `<li>${l} <b>${esc(n)}</b> <span class="note">${esc(t)}</span></li>`).join("")}</ul><p class="note">Worker-Version ${esc(D.version || "?")}</p>
    <h3>Benachrichtigungen (30 Tage)</h3>${tbl(["", "#Anzahl"], [tr(["verschickt", num(sS("sent"))]), tr(["fehlgeschlagen", num(sS("fail"))]), tr(["abgelaufene Geräte (entfernt)", num(sS("gone"))]), tr(["Läufe des 5-Minuten-Takts", num(sS("runs"))])])}
    <h3>App-Versionen auf den Geräten</h3>${tbl(["Version", "#Geräte", ""], [...vers].sort((a, b) => b[0].localeCompare(a[0])).map(([b, n]) => tr([esc(b.replace(/^(\d{4})(\d\d)(\d\d)(\d\d)(\d\d).*/, "$3.$2.$1 $4:$5 UTC")), n, b === curB ? "✅ aktuell" : "⚠️ alt"])), "noch keine Geräte gemeldet")}
    <h3>Fehler aus der App</h3><p>${aErr} Fehler in 30 Tagen</p>${errs.length ? `<ul class="adm-l">${errs.map(x => `<li><code>${esc(x.le)}</code> <span class="note">${x.leAt ? dShort(x.leAt) : ""} · ${short(x.u)} · ${esc(x.m || "")}</span></li>`).join("")}</ul>` : ""}`;
  const TABS = [["ueb", "📊 Übersicht"], ["ki", "🤖 KI & Kosten"], ["nutzer", "👥 Nutzer"], ["waechter", "🚆 Wächter"], ["system", `⚙️ System${bad ? " ⚠️" : ""}`]];
  if (!T[ADM_TAB]) ADM_TAB = "ueb";
  const html = `<div class="adm"><div class="adm-tabs" role="tablist">${TABS.map(([k, l]) => `<button type="button" role="tab" data-admtab="${k}" aria-selected="${ADM_TAB === k}">${l}</button>`).join("")}</div>
    ${T[ADM_TAB]}<p style="margin-top:16px"><button type="button" class="btn ghost small" id="adm-reload">Aktualisieren</button></p></div>`;
  openSheet("Betreiber-Dashboard", `${D.users.length} Nutzer · ${act(d30)} aktiv`, html, "adm");
}
function showShareMgr() {
  const C = SHR.contacts, me = myName();
  const inv = c => `Hallo ${c.name.split(/\s+/)[0]},\n\nich möchte Termine mit dir in „Mein Kalender“ teilen – dann sehen wir beide, was ansteht.\n\nTipp einfach auf diesen Link, dort kannst du den Code mit einem Tipp kopieren:\n${INVITE_URL}/einladung.html#c=${normCode(c.code)}&von=${encodeURIComponent(me)}\n\nDein Code: ${fmtCode(c.code)}\n\nLiebe Grüße\n${me}`;
  openSheet("Teilen mit …", "Termine mit anderen teilen, die auch „Mein Kalender“ nutzen. Verschlüsselt – nur ihr beide könnt sie lesen.", `<div class="setv">
    ${shrAcc?.from ? invBox() : ""}
    <div class="sg-t">Personen</div><div class="sg">
      ${C.length ? C.map(c => `<div class="shp"><div class="sr2"><i class="dotc" style="--c:${c.uid ? "var(--both)" : "var(--muted)"}"></i><span>${esc(c.name)}<small>${c.uid ? "verbunden" : "wartet auf Annahme"}</small></span>
        ${c.uid ? "" : `<a class="link" href="https://wa.me/?text=${encodeURIComponent(inv(c))}" target="_blank" rel="noopener">Erneut senden</a>`}<button type="button" class="ic no" data-shrdel="${esc(c.L)}" aria-label="${esc(c.name)} entfernen">✕</button></div>
        <label class="sr2 sub"><span>Meine Termine automatisch mit ${esc(c.name.split(/\s+/)[0])} teilen<small>${c.auto ? "alle neuen und bisherigen Einträge (außer Geburtstage) – einzelne kannst du beim Termin abwählen" : "nur Termine, bei denen du „Teilen mit“ wählst"}</small></span><input type="checkbox" class="swi" data-shrauto="${esc(c.L)}"${c.auto ? " checked" : ""}></label>
        ${c.uid ? `<label class="sr2 sub"><span>Termine von ${esc(c.name.split(/\s+/)[0])} anzeigen</span><input type="checkbox" class="swi" data-shrshow="${esc(c.L)}"${c.show !== false ? " checked" : ""}></label>` : ""}</div>`).join("")
        : `<p class="sg-n" style="padding:12px 14px;margin:0">Noch niemand – lade jemanden ein.</p>`}</div>
    ${shrNew ? `<div class="sg shr-box">${shrNew.code ? `<p><b>Einladung für ${esc(shrNew.name)}</b> ist fertig. Code: <span class="mono">${fmtCode(shrNew.code)}</span></p>
        <div class="btnrow"><a class="btn accent" href="https://wa.me/?text=${encodeURIComponent(inv(shrNew))}" target="_blank" rel="noopener">Per WhatsApp senden</a><button type="button" class="btn ghost" id="shr-new-done">Fertig</button></div>`
      : `<label class="sr2"><span>Name</span><input class="fin" id="shr-name" type="text" placeholder="z. B. Ina" value="${esc(shrNew.name || "")}"></label><label class="sr2 sub"><span>Meine Termine automatisch teilen<small>sonst nur die, bei denen du „Teilen mit“ wählst</small></span><input type="checkbox" class="swi" id="shr-new-auto" checked></label><div class="btnrow" style="padding:0 14px 12px"><button type="button" class="btn accent" id="shr-new-go">Einladung erstellen</button><button type="button" class="btn ghost" id="shr-new-x">Abbrechen</button></div>`}</div>`
      : `<div class="btnrow"><button type="button" class="btn accent" id="shr-new">+ Person einladen</button><button type="button" class="btn ghost" id="shr-acc">Einladung annehmen</button></div>`}
    ${APP && gWritable() && okContacts().length ? `<div class="sg"><label class="sr2"><span>Geteilte Termine auch eintragen in<small>Google-Kalender – damit sie auch in Google und auf anderen Geräten erscheinen</small></span><select class="fin" id="shr-gcal">${gCalOptions(SHR.gcal || "primary")}</select></label></div>` : ""}
    ${shrAcc && !shrAcc.from ? `<div class="sg shr-box">${shrAcc.from ? `<p><b>${esc(shrAcc.from)}</b> möchte Termine mit dir teilen.</p><div class="btnrow"><button type="button" class="btn accent" id="shr-acc-ok">Annehmen</button><button type="button" class="btn ghost" id="shr-acc-x">Ablehnen</button></div>`
      : `<label class="sr2"><span>Code</span><input class="fin mono" id="shr-code" type="text" placeholder="XXXX-XXXX-XXXX" autocomplete="off" value="${esc(shrAcc.code || "")}"></label>
        <div style="padding:0 14px"><button type="button" class="btn ghost small" id="shr-paste">📋 Einfügen</button> <span class="note">kopierten Code einfügen</span></div><p class="err" id="shr-err" style="padding:0 14px">${esc(shrAcc.err || "")}</p>
        <div class="btnrow" style="padding:0 14px 12px"><button type="button" class="btn accent" id="shr-acc-go">Prüfen</button><button type="button" class="btn ghost" id="shr-acc-x">Abbrechen</button></div>`}</div>` : ""}
    ${(() => { const H = hiddenShared(); return H.length ? `<div class="sg-t">Ausgeblendete Termine</div><div class="sg">${H.map(h => `<div class="sr2"><i class="dotc" style="--c:var(--muted)"></i><span>${esc(h.title)}<small>${esc(fmt(parseIso(h.from)))} · von ${esc(h.from_)}</small></span><button type="button" class="link" data-shunhide="${esc(h.sid)}">Einblenden</button></div>`).join("")}</div>` : ""; })()}
    <div class="sg-t">Gruppen</div>
    ${SHR.groups.length ? `<div class="sg">${SHR.groups.map(g => `<div class="sr2"><i class="dotc" style="--c:var(--trip)"></i><span>👥 ${esc(g.name)}<small>${esc(shareNames(g.members).join(", ") || "noch leer")}</small></span><button type="button" class="link" data-grpedit="${esc(g.id)}">Ändern</button><button type="button" class="ic no" data-grprm="${esc(g.id)}" aria-label="Gruppe löschen">✕</button></div>`).join("")}</div>` : ""}
    ${shrGrp ? `<div class="sg shr-box"><label class="sr2"><span>Name</span><input class="fin" id="grp-name" type="text" placeholder="z. B. Ina & Kinder" value="${esc(shrGrp.name || "")}"></label>
      <div style="padding:0 14px 8px">${okContacts().length ? shrChips("data-grpsel", shrGrp.members) : `<p class="sg-n">Erst Personen einladen – Gruppen bestehen aus verbundenen Personen.</p>`}</div>
      <div class="btnrow" style="padding:0 14px 12px"><button type="button" class="btn accent" id="grp-save">Speichern</button><button type="button" class="btn ghost" id="grp-x">Abbrechen</button></div></div>`
      : okContacts().length > 1 ? `<button type="button" class="btn ghost small" id="grp-new">+ Gruppe</button>` : `<p class="sg-n">Gruppen gehen, sobald mindestens zwei Personen verbunden sind.</p>`}
    <p class="sg-n">Teilen: einen Termin antippen → „Mit … teilen“ – oder beim Eintragen bei „Teilen mit“ auswählen.</p>
  </div>`, "sharemgr");
}
// Große Annehmen-Karte (im Teilen-Fenster und als eigenes Fenster nach dem Einladungslink)
const invBox = () => `<div class="inv-big"><div class="inv-ic" aria-hidden="true">👥</div><b>${esc(shrAcc.from)} möchte Termine mit dir teilen</b>
  <span>Was ihr teilt, seht ihr beide – Änderungen kommen beim anderen an. Verschlüsselt, nur ihr zwei könnt es lesen.</span>
  <label class="inv-auto"><input type="checkbox" id="shr-acc-auto" checked> Meine Termine automatisch mit ${esc(shrAcc.from.split(/\s+/)[0])} teilen</label>
  <div class="btnrow"><button type="button" class="btn accent big" id="shr-acc-ok">Annehmen</button><button type="button" class="btn ghost" id="shr-acc-x">Ablehnen</button></div></div>`;
function showInvite() { if (!shrAcc?.from) return; openSheet("Einladung", "", invBox(), "invite"); }
async function shrInvite(name, auto) { const code = newCode(), { L } = await codeKeys(code);
  SHR.contacts.push({ L, code, name, uid: "", nameSet: true, auto: !!auto, show: true }); await saveShr();
  const { key } = await codeKeys(code); try { await OUT(uid, "x").doc(L).set({ c: await seal(key, { name: myName() }) }); } catch (err) { shrWarn(err); }
  shrNew = { name, code }; showShareMgr(); }
async function shrCheck(code, quiet) {
  const c = normCode(code); if (c.length < 12) { shrAcc = { code, err: "Der Code hat 12 Zeichen, z. B. K7PQ-4XZM-2HTR." }; showShareMgr(); return; }
  if (SHR.contacts.some(x => normCode(x.code) === c)) { shrAcc = { code, err: "Diese Einladung ist schon angenommen." }; showShareMgr(); return; }
  const btn = $("shr-acc-go"); if (btn) { btn.disabled = true; btn.textContent = "Prüfe …"; }
  const { key, L } = await codeKeys(c); const all = await once(OUT());
  const p = all?.docs.find(d => d.id !== uid && (d.data()?.ls || []).includes(L));
  if (!p) { shrAcc = { code, err: "Diese Einladung habe ich nicht gefunden. Code richtig abgetippt?" }; if (!quiet) showShareMgr(); return; }
  const x = await once(OUT(p.id, "x").doc(L)), info = x?.exists ? await unseal(key, x.data()?.c) : null;
  shrAcc = { code: c, L, uid: p.id, from: info?.name || "Jemand" }; if (!quiet) showShareMgr(); }
async function shrAccept() { const a = shrAcc; if (!a?.uid) return; const auto = $("shr-acc-auto") ? $("shr-acc-auto").checked : true;
  SHR.contacts.push({ L: a.L, code: a.code, name: a.from, uid: a.uid, auto, show: true }); await saveShr(); invDone();
  const { key } = await codeKeys(a.code); try { await OUT(uid, "x").doc(a.L).set({ c: await seal(key, { name: myName() }) }); } catch (err) { shrWarn(err); }
  shrAcc = null; shrWatchContacts(); shrQueue(); showShareMgr(); renderHints(); toast(`Verbunden mit ${a.from}`); }
async function shrRemove(L) {   // Verbindung lösen: meine geteilten Kopien für diese Person löschen, ihre Termine ausblenden
  const c = contactBy(L); SHR.contacts = SHR.contacts.filter(x => x.L !== L); SHR.groups.forEach(g => g.members = g.members.filter(x => x !== L));
  REMOTE.delete(L); for (const [k, u] of shrWatch) if (k.startsWith(L + "|")) { try { u(); } catch {} shrWatch.delete(k); }
  await saveShr(); showShareMgr(); shrMerge();
  for (const m of [...MYOUT.values()].filter(m => m.l === L)) { try { await OUT(uid, "ev").doc(m.id).delete(); } catch {} }
  try { await OUT(uid, "x").doc(L).delete(); } catch {}
  toast(`${c?.name || "Person"} entfernt – ihr seht eure Termine gegenseitig nicht mehr`); }
// Ausgeblendete geteilte Termine (noch vorhanden, nur bei mir versteckt)
function hiddenShared() { const out = new Map();
  for (const [L, arr] of REMOTE) for (const r of arr) if (SHR.hidden.includes(r.s) && !r.del && r.data && r.o !== uid && !out.has(r.s)) out.set(r.s, { sid: r.s, title: r.data.title || "Termin", from: r.data.from, from_: contactBy(L)?.name || "" });
  return [...out.values()].sort((a, b) => String(a.from).localeCompare(String(b.from))); }
// ---- Geteilten Termin löschen: nur bei mir oder für alle ----
function showSharedDelete(e) {
  const from = e.shared.from || "der anderen Person";
  openSheet(`„${shortName0(e)}“ löschen`, `geteilt von ${from}`, `<div class="acc">
    <button type="button" class="btn danger big" data-shdelall="${esc(e.id)}">Für alle löschen</button>
    <p class="note">Der Termin verschwindet bei dir und bei ${esc(from)}${APP ? " – auch aus den Google-Kalendern" : ""}.</p>
    <button type="button" class="btn ghost big" data-shdelme="${esc(e.id)}">Nur bei mir entfernen</button>
    <p class="note">${esc(from)} behält den Termin. Bei dir taucht er nicht mehr auf.</p>
  </div>`, "shdel");
}
async function shrDeleteAll(e) {   // Löschung an die Person schicken, die den Termin angelegt hat – sie übernimmt sie
  const c = contactBy(e.shared.L); if (!c) return;
  try { await OUT(uid, "ev").doc(`${e.shared.sid}_${c.L}`).set({ l: c.L, s: e.shared.sid, t: Date.now(), h: "", o: e.shared.o || c.uid, del: true }); } catch (err) { toast(writeErr(err)); return; }
  SHR.hidden = [...new Set([...SHR.hidden, e.shared.sid])]; await saveShr(); shrMerge(); closeSheet();
  toast(`Gelöscht – auch bei ${c.name}`); }
// ---- Einen Termin teilen ----
let shrFor = null;
function showShareEv(e, dateIso) {
  use("teilen");
  shrFor = { id: e.id, date: dateIso };
  openSheet(`„${shortName0(e)}“ teilen`, SHR.contacts.length ? "Mit wem? Ändert einer etwas, sieht es der andere." : "", SHR.contacts.length ? `<div class="setv">
    ${shrChips("data-shto", effTo(e))}
    ${e.repeat !== "none" ? `<div class="vis" style="margin-top:12px"><button type="button" data-shscope="all" aria-checked="true">Ganze Serie</button><button type="button" data-shscope="one" aria-checked="false">Nur am ${fmt(parseIso(dateIso))}</button></div>` : ""}
    <div class="btnrow"><button type="button" class="btn accent" id="shto-save">Speichern</button><button type="button" class="btn ghost" id="shto-x">Abbrechen</button></div></div>`
    : `<p class="sg-n">Lade erst jemanden ein (☰ → „Teilen mit …“). Sobald die Person angenommen hat, kannst du hier teilen.</p><div class="btnrow"><button type="button" class="btn accent" id="mi-share">Personen einladen</button></div>`, "shareev");
  shrFor.scope = "all";
}
async function shrSaveEv() {
  const e = EV.find(x => x.id === shrFor.id); if (!e) return; const to = chipSel("data-shto", $("sheet"));
  try {
    if (shrFor.scope === "one" && e.repeat !== "none") { // nur dieser Tag: unsichtbare Einzel-Kopie für die anderen
      const d = shrFor.date, dur = dayDiff(e.a, e.b), v = { ...plain(e), from: d, to: iso(addDays(parseIso(d), dur)), repeat: "none", until: "", gcal: "", gEventId: "", shareTo: to, shadow: true, sid: "" };
      if (to.length) await COLL("events").add(v);
    } else await COLL("events").doc(e.id).update(shSplit(to));
    closeSheet(); toast(to.length ? `Geteilt mit ${shareNames(to).join(", ")}` : "Nicht mehr geteilt"); shrQueue();
  } catch (err) { toast(writeErr(err)); }
}

// =================== Seiten ein-/ausblenden (Heute · Kalender · Überblick) ===================
let PAGES = (() => { try { const v = JSON.parse(store.get("ft-pages") || "null"); if (v && typeof v === "object") return { p0: v.p0 !== false, p1: v.p1 !== false, p2: v.p2 !== false }; } catch {} return { p0: true, p1: true, p2: true }; })();
function applyPages() {
  const p0 = $("p0"), p1 = $("p1"), p2 = $("p2"); if (!p0) return;
  p0.classList.toggle("pg-off", !PAGES.p0); if (p1) p1.hidden = !PAGES.p1; if (p2) p2.hidden = !PAGES.p2;
  const h = (id, on) => { const el = $(id); if (el) el.hidden = !on; };
  h("to-cal", PAGES.p1 || PAGES.p2); if ($("to-cal")) $("to-cal").firstChild.textContent = PAGES.p1 ? "Kalender " : "Überblick ";
  h("to-p2", PAGES.p2); h("to-p1", PAGES.p1 || PAGES.p0);
}
function setPage(k, on) {
  const next = { ...PAGES, [k]: on }; if (!next.p0 && !next.p1 && !next.p2) { toast("Mindestens eine Seite bleibt sichtbar"); showSettings(); return; }
  PAGES = next; store.set("ft-pages", JSON.stringify(PAGES)); applyPages(); showSettings();
}
let setSub = "main";
function showSettings(sub) {
  if (sub) setSub = sub;
  const A = PA, B = PB, ALL = [A, B, ...XST].filter(Boolean);
  const sw = (k, label, c, extra = "") => `<label class="sr2"><i class="dotc" style="--c:${c}"></i><span>${label}</span><input type="checkbox" class="swi" data-show="${k}"${SHOW[k] ? " checked" : ""}${extra}></label>`;
  const nav = (id, label, val, c) => `<button type="button" class="sr2 nav" id="${id}"><i class="dotc" style="--c:${c}"></i><span>${label}</span><em>${esc(val || "")}</em><b aria-hidden="true">›</b></button>`;
  const back = `<button type="button" class="link set-back" id="set-back">‹ Anzeigen</button>`;
  let html = "";
  if (setSub === "ferien") {
    html = `${back}<div class="sg-t">Bundesländer</div><div class="sg">
      ${ALL.map(c => { const col = c === A ? "var(--be-strong)" : c === B ? "var(--st-strong)" : xColor(c), shown = c === A ? SHOW.be : c === B ? SHOW.st : !XHIDE.includes(c);
        return `<div class="sr2 st2"><i class="dotc" style="--c:${col}"></i><span>${stName(c)}${c === A ? ` <small>Hauptland</small>` : ""}</span>
          <label class="mini"><input type="checkbox" data-stjoint="${c}"${JOINT.includes(c) ? " checked" : ""}> gemeinsam</label>
          <input type="checkbox" class="swi" data-stshow="${c}"${shown ? " checked" : ""} aria-label="${stName(c)} anzeigen"></div>`; }).join("")}</div>
      <p class="sg-n">Schalter: Ferien anzeigen. „gemeinsam“: zählt für gemeinsam freie Tage.</p>
      <div class="sg-t">Gemeinsam frei</div><div class="sg">${sw("both", `Hervorheben${JOINT.length >= 2 ? ` <small>${JOINT.join(" + ")}</small>` : ""}`, "var(--both)", JOINT.length < 2 ? " disabled" : "")}</div>
      ${JOINT.length < 2 ? `<p class="sg-n">Dafür bei mindestens 2 Ländern „gemeinsam“ ankreuzen.</p>` : ""}
      <div class="sg-t">Weitere Bundesländer</div><div class="xchips">${STATES.filter(([c]) => c !== A && c !== B).map(([c, n]) => `<label class="xchip" style="--c:${xColor(c)}"><input type="checkbox" data-xst="${c}"${XST.includes(c) ? " checked" : ""}><i></i>${n}</label>`).join("")}</div>
      <p class="sg-n">Weitere Länder erscheinen als farbiger Strich unten im Tag.</p>`;
  } else if (setSub === "farben") {
    const C = catCols();
    html = `${back}<div class="sg-t">Farben nach Art</div><p class="sg-n" style="margin-top:0">Gilt für alle Einträge dieser Art. Einzelne Einträge kannst du im Formular trotzdem anders einfärben. „A“ = Standardfarbe.</p>
      ${CATS.map(([k, n]) => `<div class="catrow"><button type="button" class="catn" data-catopen="${k}" aria-expanded="${catOpen === k}"><i class="catsw" style="background:${catColor(k)}"></i><span>${n}</span><em>${C[k] ? ECOL.find(x => x[0] === C[k])?.[1] || "" : "Standard"}</em><b aria-hidden="true">${catOpen === k ? "▴" : "▾"}</b></button>${catOpen !== k ? "" : `<div class="fcols sm">${[["", "Standard", ""], ...ECOL].map(([id, nm, hex]) => `<button type="button" class="fcol" data-catc="${k}|${id}" title="${nm}" aria-label="${n}: ${nm}" aria-checked="${(C[k] || "") === id}" style="${hex ? `background:${hex}` : `background:${CATD[k]};color:#fff`}">${hex ? "" : "A"}</button>`).join("")}</div>`}</div>`).join("")}
      <div class="sg" style="margin-top:12px"><label class="sr2"><i class="dotc" style="--c:var(--gcal)"></i><span>Google-Termine nach Art einfärben <small>Reisen, Urlaub, Geburtstage, Dienste … werden erkannt; sonst Farbe des Google-Kalenders</small></span><input type="checkbox" class="swi" id="set-gcat"${gCatOn() ? " checked" : ""}></label></div>`;
  } else if (setSub === "test") {
    html = `${back}<div class="sg-t">Einrichtung ausprobieren</div>
      <p class="sg-n" style="margin-top:0">Zeigt die Schritte so, wie neue Nutzer sie sehen. Deine Einträge bleiben erhalten, schon übernommene Geburtstage und Reisen werden nicht doppelt angelegt.</p>
      <div class="sg">${canWrite ? nav("test-setup", "Einrichtung neu durchlaufen", "", "var(--both)") : ""}${nav("test-gate", "Anmelde-Bildschirm ansehen", "", "var(--muted)")}</div>`;
  } else {
    const nG = gState === "ok" ? selectedCals().length : 0;
    const prof = typeof FAM === "function" && canWrite && typeof startSetup === "function" ? [PROFILE.name, FAM().length ? `${FAM().length} ${FAM().length === 1 ? "Person" : "Personen"}` : ""].filter(Boolean).join(" · ") : null;
    const pg = (k, label, c) => `<label class="sr2"><i class="dotc" style="--c:${c}"></i><span>${label}</span><input type="checkbox" class="swi" data-page="${k}"${PAGES[k] ? " checked" : ""}></label>`;
    html = `<div class="sg-t">Seiten</div><div class="sg">${pg("p0", "Heute <small>Countdowns, Woche, Aufgaben, Erinnerungen</small>", "var(--both)")}${pg("p1", "Kalender <small>Monat, Woche, Liste, Jahr</small>", "var(--be-strong)")}${pg("p2", "Überblick <small>Gemeinsam frei, Geburtstage, Statistik</small>", "var(--trip)")}</div>
      <div class="sg-t">Im Kalender</div><div class="sg">
      ${sw("hol", "Feiertage", "var(--holiday)")}${sw("br", "Brückentage", "var(--bridge)")}${sw("bday", "Geburtstage", "var(--event)")}
      ${sw("own", "Eigene Termine", "var(--c-termin)")}${sw("season", "Saison-Hinweise", "var(--c-season)")}${sw("bundle", "Hotels & Flüge in der Reise bündeln", "var(--trip)")}${sw("full", "Heute ausführlich (alle Listen auf einmal)", "var(--muted)")}
      ${mcp && gState === "ok" ? `<label class="sr2"><i class="dotc" style="--c:var(--gcal)"></i><span>Google-Termine</span><input type="checkbox" class="swi" id="g-show"${gShow ? " checked" : ""}></label>` : ""}</div>
      <div class="sg-t">Farben</div><div class="sg">${nav("set-farben", "Farben nach Art", "Termine, Reisen, Urlaub …", "var(--trip)")}</div>
      <div class="sg-t">Ferien</div><div class="sg">${nav("set-ferien", "Bundesländer", ALL.map(stName).join(", "), "var(--be-strong)")}</div>
      <div class="sg-t">Erinnerungen</div><div class="sg"><div class="sr2"><i class="dotc" style="--c:var(--trip)"></i><span>Reisen ankündigen</span>
        <div class="step"><button type="button" id="trip-dec" aria-label="Weniger">−</button><input id="set-trip" type="number" inputmode="numeric" min="0" max="60" value="${tripDays()}" aria-label="Tage vor der Reise"><small>Tage</small><button type="button" id="trip-inc" aria-label="Mehr">+</button></div></div></div>
      ${mcp || prof !== null ? `<div class="sg-t">Konten & Profil</div><div class="sg">
        ${mcp ? nav("open-google", "Google Kalender", gState === "ok" ? `${nG} von ${gCals.filter(c => !c.primary && c.summary !== gPrimarySummary && c.id !== gPrimarySummary).length + 1}` : "nicht verbunden", "var(--gcal)") : ""}
        ${prof !== null ? nav("open-family", "Familie & Liebste", prof, "var(--event)").replace("<em>", famUnseen() ? '<i class="rdot inl"></i><em>' : "<em>") : ""}${canWrite ? nav("open-contacts", "Geburtstage übernehmen", "Datei oder Bild", "var(--event)") : ""}</div>` : ""}
      <div class="set-foot"><button type="button" class="link" id="open-a2hs">Auf den Startbildschirm legen</button>${canWrite ? `<span aria-hidden="true">·</span><button type="button" class="link" id="set-test">Einrichtung ausprobieren</button>` : ""}</div>`;
  }
  openSheet("Anzeigen", setSub === "main" ? "Was im Kalender zu sehen sein soll" : "", `<div class="setv">${html}</div>`, "settings");
}
function tripStep(d) { const el = $("set-trip"); if (!el) return; el.value = Math.max(0, Math.min(60, (+el.value || 0) + d)); el.dispatchEvent(new Event("change", { bubbles: true })); }

function syncLegend() { document.querySelectorAll("[data-leg]").forEach(el => { const k = el.dataset.leg; el.hidden = k === "google" ? !gOn() : k === "st" && !PB ? true : !SHOW[k]; });
  if ($("leg-a")) $("leg-a").textContent = `Ferien ${PA}`; if ($("leg-b")) $("leg-b").textContent = PB ? `Ferien ${PB}` : "";
  if ($("hdr-states")) $("hdr-states").textContent = [nameA(), nameB()].filter(Boolean).join(" & ");
  const lb = document.querySelector('[data-leg="both"]'); if (lb) { lb.hidden = !jointOn(); lb.lastChild.textContent = jointTxt(); }
  const lx = $("leg-x"); if (lx) lx.innerHTML = XST.filter(c => !XHIDE.includes(c)).map(c => `<span><i class="sw" style="background:${xColor(c)};height:4px;margin-top:4px"></i>Ferien ${c}</span>`).join(""); }
async function saveXst() { fixJoint(); recalcJoint(); store.set("ft-xst", JSON.stringify(XST)); store.set("ft-joint", JSON.stringify(JOINT)); store.set("ft-xhide", JSON.stringify(XHIDE));
  try { await (db && COLL("prefs")).doc("display").set({ states: XST, joint: JOINT, hidden: XHIDE }); } catch {} }

// =================== Woche ===================
function dayChips(d) {
  const c = [];
  if (d.h && SHOW.hol) c.push(`<span class="chip hol">${esc(d.h.name)}${holWhere(d.h)}</span>`);
  const w = winOf(d.dt);
  if (jointOn() && w && !isWE(d.dt)) c.push(`<span class="chip both">${jointTxt()}</span>`);
  else { if (d.fBE && SHOW.be) c.push(`<span class="chip be">Ferien ${PA}</span>`); if (d.fST && SHOW.st) c.push(`<span class="chip st">Ferien ${PB}</span>`); }
  xOn(d).forEach(s => c.push(`<span class="chip" style="background:${xColor(s)};color:#fff">Ferien ${s}</span>`));
  const br = SHOW.br && BRIDGES.get(d.k); if (br) c.push(`<span class="chip br">${esc(br.name.startsWith("Brückentag") ? "Brückentag" : br.name)}</span>`);
  return c.join("");
}
const occBtn = (o, showRange) => {
  const e = o.ev, age = ageTxt(o), sub = [showRange && !sameDay(o.a, o.b) ? rngTxt(o.a, o.b) : "", age, e.note].filter(Boolean).join(" · ");
  return `<button type="button" class="evr" data-occ="${esc(e.id)}|${iso(o.a)}"><span class="t">${esc(timeTxt(e)) || ""}</span><span class="ev-dot ${e.type}"${dotSt(e)}></span><span class="n">${esc(evName(e))}${sub ? `<small>${esc(sub)}</small>` : ""}</span></button>`;
};
// Woche: dieselbe feste Zeile wie in „Heute“ – [Uhrzeit] [Punkt] [Titel + eine Zeile Zusatz]
function weekRow(o) {
  const e = o.ev, age = ageTxt(o), multi = !sameDay(o.a, o.b), tt = e.time ? `${esc(e.time)}${e.endTime ? `<small>${esc(e.endTime)}</small>` : ""}` : "";
  const note = String(e.note || "").replace(/https?:\/\/\S+/g, "🔗 Link").split(/\n| · /)[0].trim();
  const sub = [multi ? rngTxt(o.a, o.b) : "", age, e.place && !/^https?:/.test(e.place) ? e.place : "", !age && !e.place ? note : ""].filter(Boolean).join(" · ");
  return `<button type="button" class="fr" data-occ="${esc(e.id)}|${iso(o.a)}"><span class="fr-t">${tt}</span><span class="fr-m"><span class="fr-dot" style="background:${colorOf(e)}"></span></span><span class="fr-x"><span class="fr-n">${esc(evName(e))}${trainBadge(o)}</span>${sub ? `<small class="fr-s">${esc(sub)}</small>` : ""}</span></button>`;
}
function renderWeek() {
  const days = [...Array(7)].map((_, i) => addDays(weekStart, i));
  $("w-name").textContent = `KW ${isoWeek(weekStart)}`;
  $("w-sub").textContent = `${p2(days[0].getDate())}.${p2(days[0].getMonth()+1)}. – ${p2(days[6].getDate())}.${p2(days[6].getMonth()+1)}.${days[6].getFullYear()}`;
  $("w-prev").disabled = weekStart <= START; $("w-next").disabled = addDays(weekStart, 7) > END;
  $("week").innerHTML = days.map(dt => {
    const d = dayOf(dt); if (!d) return "";
    const oc = occOn(dt).sort((a, b) => (a.ev.time || "").localeCompare(b.ev.time || "")), k = iso(dt);
    const tk = canWrite ? TASKS.filter(t => !t.done && t.state !== "no" && t.due === k) : [];
    return `<div class="wd${isWE(dt) ? " we" : ""}${sameDay(dt, TODAY) ? " is-today" : ""}">
      <button type="button" class="wd-h" data-day="${d.k}"><b>${WD[dt.getDay()]} ${p2(dt.getDate())}.${p2(dt.getMonth()+1)}.</b>${sameDay(dt, TODAY) ? `<span class="wd-today">heute</span>` : ""}${dayChips(d)}</button>
      <div class="wd-ev fl">${oc.map(weekRow).join("")}${tk.map(t => `<div class="fr"><span class="fr-t"></span><span class="fr-m"><input type="checkbox" class="ckb fr-ck" data-tkdone="${esc(t.id)}" aria-label="${esc(t.title)} erledigt"></span><button type="button" class="fr-x fr-btn" data-tkedit="${esc(t.id)}">${esc(t.title)}<small> · Aufgabe</small></button></div>`).join("")}</div></div>`;
  }).join("");
}
function setWeek(dt) { weekStart = monday(dt); ensureGoogle(); if (weekStart < monday(START)) weekStart = monday(START); renderWeek(); }

// =================== Liste & Suche ===================
function renderList() {
  const q = $("q").value.trim().toLowerCase(), past = $("l-past").checked, hol = $("l-hol").checked;
  const words = q.split(/\s+/).filter(Boolean);
  const hay = (...parts) => parts.join(" ").toLowerCase();
  const match = s => words.every(w => s.includes(w));
  let rows = OCC.filter(o => (past || q || o.b >= TODAY)).map(o => ({ a: o.a, b: o.b, o,
    s: hay(evName(o.ev), o.ev.note, TYPES[o.ev.type].label, o.ev.cal || "", MON[o.a.getMonth()], fmtY(o.a), ageTxt(o)) }));
  if (hol) {
    HOL.forEach(h => { if (h.dt >= START && h.dt <= END) rows.push({ a: h.dt, b: h.dt, fix: `${h.name}${holWhere(h)}`, s: hay(h.name, "feiertag", MON[h.dt.getMonth()]) }); });
    [PA, PB].filter(Boolean).forEach(c => FERX[c].forEach(([n, a, b]) => { const A = parseIso(a), B = parseIso(b); rows.push({ a: A, b: B, fix: `${n} ${stName(c)}`, s: hay(n, "ferien " + stName(c).toLowerCase(), MON[A.getMonth()]) }); }));
    rows = rows.filter(r => r.o || past || q || r.b >= TODAY);
  }
  if (words.length) rows = rows.filter(r => match(r.s));
  rows.sort((x, y) => x.a - y.a);
  if (!rows.length) { $("list").innerHTML = `<div class="empty">${dbState === "ready" || hol ? (q ? `Nichts gefunden für „${esc(q)}“.` : "Keine anstehenden Termine.") : emptyMsg()}</div>`; return; }
  let out = "", last = "";
  rows.forEach(r => {
    const mk = `${r.a.getFullYear()}-${r.a.getMonth()}`;
    if (mk !== last) { out += `<h4>${MON[r.a.getMonth()]} ${r.a.getFullYear()}</h4>`; last = mk; }
    if (r.o) { const e = r.o.ev, extra = [timeTxt(e), ageTxt(r.o)].filter(Boolean).join(" · ");
      out += `<button type="button" class="lr" data-occ="${esc(e.id)}|${iso(r.o.a)}"><span class="dt">${rngTxt(r.a, r.b)}</span><span class="n"><span class="ev-dot ${e.type}"${dotSt(e)}></span><span>${esc(evName(e))}${extra ? `<small>${esc(extra)}</small>` : ""}</span></span></button>`; }
    else out += `<div class="lr fix"><span class="dt">${rngTxt(r.a, r.b)}</span><span class="n"><span>${esc(r.fix)}</span></span></div>`;
  });
  $("list").innerHTML = out + (q && rows.some(r => r.o) ? `<button type="button" class="btn ghost small" id="l-share" style="margin:10px 4px 2px">Ergebnis teilen</button>` : "");
}
const emptyMsg = () => dbState === "loading" ? "Termine werden geladen …"
  : dbState === "off" ? (APP ? "Eigene Termine siehst du, sobald du dich mit Google anmeldest." : "Eigene Termine siehst du, wenn du die Seite angemeldet bei Claude öffnest.")
  : dbState === "error" ? "Die Termine konnten gerade nicht geladen werden. Lade die Seite später neu."
  : canWrite ? "Noch keine Termine. Tippe auf „+ Eintragen“." : "Noch keine Termine.";

// =================== Als Nächstes ===================
function relDay(o) {
  if (o.a <= TODAY && o.b >= TODAY && !sameDay(o.a, o.b)) return sameDay(o.b, TODAY) ? "endet heute" : `bis ${p2(o.b.getDate())}.${p2(o.b.getMonth() + 1)}.`;
  const n = dayDiff(TODAY, o.a);
  return n === 0 ? "Heute" : n === 1 ? "Morgen" : n < 7 ? WDL[o.a.getDay()].slice(0, 2) + " " + p2(o.a.getDate()) + "." : fmt(o.a);
}
function renderNext() {
  const items = OCC.filter(o => o.b >= TODAY && dayDiff(TODAY, o.a) <= 14).slice(0, 5);
  UPN.next = items.length;
  $("next-list").innerHTML = items.map(o => `<button type="button" class="nx" data-occ="${esc(o.ev.id)}|${iso(o.a)}"><span class="when">${relDay(o)}</span><span class="what"><span class="ev-dot ${o.ev.type}"${dotSt(o.ev)}></span>${esc(evName(o.ev))}${placeHint(o)}${ageTxt(o) ? ` · ${esc(ageTxt(o))}` : ""}</span><span class="tm">${esc(timeTxt(o.ev))}</span></button>`).join("");
}

// =================== Demnächst-Karte ===================
const UPN = { next: 0, soon: 0, others: 0 };
let upTab = store.get("ft-up") || "next", upCollapsed = store.get("ft-up-col") === "1";
let upResizeT = null;
function renderUp() {
  clearTimeout(upResizeT); upResizeT = setTimeout(() => { if ((view === "month" || view === "two") && compact()) renderBigMonth(); }, 60);
  let any = false;
  ["others", "soon", "next"].forEach(k => { const n = UPN[k] || 0; $("sec-" + k).hidden = !n; $("n-" + k).textContent = n || ""; if (n) any = true; });
  $("up-empty").hidden = !(dbState === "off" || (!any && dbState === "ready"));
  $("up-empty").textContent = dbState === "off" ? (APP ? "Melde dich mit Google an (kostenlos), dann kannst du hier deinen eigenen Kalender anlegen. Deine Termine sieht nur du." : "Melde dich bei Claude an (das Konto ist kostenlos), dann kannst du hier deinen eigenen Kalender anlegen. Deine Termine sieht nur du.") : "In den nächsten 14 Tagen steht nichts Besonderes an.";
  $("today-lbl").textContent = `${WDL[TODAY.getDay()]}, ${TODAY.getDate()}. ${MON[TODAY.getMonth()]} ${TODAY.getFullYear()}`;
  renderToday(); renderHints(); renderTasks(); renderFocus(); pushPlanQueue();
  if (canWrite) osmPrefetch();
}
// ---- Kompakte Heute-Seite: eine Liste „Heute & Morgen“, der Rest auf Wunsch ----
const FOCUS_OPEN = { week: false, tasks: false, rem: false };
function renderFocus() {
  const sec = $("sec-focus"); if (!sec) return;
  if (SHOW.full || dbState !== "ready") { sec.hidden = true; return; }
  const end = addDays(TODAY, 1), seen = new Set();
  const ev = OCC.filter(o => !o.part && o.a <= end && o.b >= TODAY && (o.ev.type !== "info" || !!o.ev.time) && !seen.has(o.ev.id + iso(o.a)) && seen.add(o.ev.id + iso(o.a)))
    .map(o => ({ k: "ev", d: o.a < TODAY ? TODAY : o.a, o }));
  const tk = TASKS.filter(t => !t.done && t.state !== "no" && t.due && parseIso(t.due) && parseIso(t.due) <= end).map(t => ({ k: "tk", d: parseIso(t.due) < TODAY ? TODAY : parseIso(t.due), t }));
  let rems = []; try { rems = (REMS = buildReminders()).map((r, i) => ({ r, i })); } catch {}
  const rm = rems.filter(({ r }) => (r.n <= 1 || remImp(r)) && !(r.o && ev.some(x => x.o === r.o))).map(({ r, i }) => ({ k: "rem", d: r.n > 1 ? null : addDays(TODAY, Math.max(0, r.n)), imp: r.n > 1, r, i }));
  const all = [...ev, ...tk, ...rm], byTime = x => x.k === "ev" ? (x.o.ev.time || "00:00") : x.k === "tk" ? "99" : "98";
  // eine feste Zeile für alles: [Uhrzeit] [Markierung] [Titel] – Termine, Aufgaben und Erinnerungen stehen bündig untereinander
  const row = x => x.k === "ev" ? `<button type="button" class="fr" data-occ="${esc(x.o.ev.id)}|${iso(x.o.a)}"><span class="fr-t">${x.o.ev.time ? esc(x.o.ev.time) : ""}</span><span class="fr-m"><span class="fr-dot" style="background:${colorOf(x.o.ev)}"></span></span><span class="fr-x">${esc(evName(x.o.ev))}${trainBadge(x.o)}${placeHint(x.o)}${ageTxt(x.o) ? `<small> · ${esc(ageTxt(x.o))}</small>` : ""}</span></button>`
    : x.k === "tk" ? `<div class="fr"><span class="fr-t"></span><span class="fr-m"><input type="checkbox" class="ckb fr-ck" data-tkdone="${esc(x.t.id)}" aria-label="${esc(x.t.title)} erledigt"></span><button type="button" class="fr-x fr-btn" data-tkedit="${esc(x.t.id)}">${esc(x.t.title)}<small> · Aufgabe</small></button></div>`
    : `<button type="button" class="fr" data-rem="${x.i}"><span class="fr-t">${x.imp && x.r.n > 1 ? `in ${x.r.n} T.` : ""}</span><span class="fr-m" aria-hidden="true">🔔</span><span class="fr-x">${esc(x.r.t)}${x.r.sub ? `<small> · ${esc(x.r.sub)}</small>` : ""}</span></button>`;
  const day = (d, lbl) => { const L = all.filter(x => x.d && sameDay(x.d, d)).sort((a, b) => byTime(a).localeCompare(byTime(b))); return L.length ? `<div class="fx-day">${lbl}</div>${L.map(row).join("")}` : ""; };
  const impL = all.filter(x => x.imp).sort((a, b) => a.r.n - b.r.n);
  const html = day(TODAY, "Heute") + day(end, "Morgen") + (impL.length ? `<div class="fx-day">Wichtig – bald erledigen</div>${impL.map(row).join("")}` : "");
  $("focus-list").innerHTML = html || `<p class="tip" style="margin:6px 8px 2px">Heute und morgen steht nichts an.</p>`;
  $("n-focus").textContent = all.length || "";
  const remShown = new Set(rm.map(x => x.i));
  // Rest auf Wunsch
  const openTasks = TASKS.filter(t => !t.done && t.state !== "no" && !tkLater(t)).length, remN = rems.filter(({ i }) => !remShown.has(i)).length, weekN = UPN.next || 0;
  const link = (k, n, lbl) => `<button type="button" class="fchip${FOCUS_OPEN[k] ? " on" : ""}" data-focus="${k}" aria-expanded="${FOCUS_OPEN[k]}">${lbl}${n ? ` <b>${n}</b>` : ""}<span class="chev" aria-hidden="true">${FOCUS_OPEN[k] ? "▴" : "▾"}</span></button>`;
  $("focus-more").innerHTML = [weekN ? link("week", weekN, "14 Tage") : "", canWrite ? link("tasks", openTasks, openTasks ? "Aufgaben" : "+ Aufgabe") : "", remN ? link("rem", remN, "Erinnerungen") : ""].join("");
  sec.hidden = false;
  if (!(wkSel || !sameDay(wkStart, monday(TODAY)))) $("sec-next").hidden = !FOCUS_OPEN.week || !weekN;
  $("sec-soon").hidden = !FOCUS_OPEN.rem || !remN;
  $("sec-tasks").hidden = !canWrite || !FOCUS_OPEN.tasks;
}

// ---- Heute-Seite: Countdowns, Wochenstreifen, vor einem Jahr ----
let wkStart = monday(TODAY), wkSel = null;
function setWk(ws, sel) { wkStart = monday(ws); wkSel = sel || null; if (ensureGoogle()) renderAll(); else renderToday(); }
function renderAgenda() {
  const custom = wkSel || !sameDay(wkStart, monday(TODAY));
  $("next-ttl").textContent = !custom ? "Nächste 14 Tage" : wkSel ? `${WDL[wkSel.getDay()]}, ${wkSel.getDate()}. ${MON[wkSel.getMonth()]}` : `Woche ${fmt(wkStart)} – ${fmt(addDays(wkStart, 6))}`;
  $("wk-back").hidden = !custom;
  if (!custom) { $("sec-next").hidden = !UPN.next; $("n-next").textContent = UPN.next || ""; return; }
  const a = wkSel || wkStart, b = wkSel || addDays(wkStart, 6);
  const items = OCC.filter(o => o.b >= a && o.a <= b).sort((x, y) => x.a - y.a || (x.ev.time || "").localeCompare(y.ev.time || ""));
  const extra = []; for (let t = a; t <= b; t = addDays(t, 1)) { const d = dayOf(t); if (d && d.h && SHOW.hol) extra.push(`<div class="nx agh"><span class="when">${wkSel ? "" : WDL[t.getDay()].slice(0, 2) + " " + p2(t.getDate()) + "."}</span><span class="what" style="color:var(--holiday);font-weight:600">${esc(d.h.name)}</span><span></span></div>`); }
  const when = o => wkSel ? (sameDay(o.a, o.b) ? "" : `bis ${p2(o.b.getDate())}.${p2(o.b.getMonth() + 1)}.`) : (o.a < a ? `bis ${p2(o.b.getDate())}.` : WDL[o.a.getDay()].slice(0, 2) + " " + p2(o.a.getDate()) + ".");
  $("next-list").innerHTML = extra.join("") + (items.length ? items.map(o => `<button type="button" class="nx" data-occ="${esc(o.ev.id)}|${iso(o.a)}"><span class="when">${when(o)}</span><span class="what"><span class="ev-dot ${o.ev.type}" style="background:${colorOf(o.ev)}"></span>${esc(evName(o.ev))}${ageTxt(o) ? ` · ${esc(ageTxt(o))}` : ""}</span><span class="tm">${esc(timeTxt(o.ev))}</span></button>`).join("")
    : `<p class="tip" style="margin:4px 8px">${wkSel ? "Keine Termine an diesem Tag." : "Keine Termine in dieser Woche."}</p>`) +
    (wkSel && canWrite ? `<button type="button" class="link more-btn" data-add="${iso(wkSel)}">+ Termin an diesem Tag</button>` : "");
  $("sec-next").hidden = false; $("n-next").textContent = items.length || "";
}
// Umgangstermine (z. B. „HbS“, „MbM“ aus Google): keine echten Termine – zählen als Umgang, nicht als belegt
const umgKey = t => String(t || "").trim().toLowerCase();
let UMGC = null; const umgSet = () => (UMGC ??= (() => { try { return new Set(JSON.parse(store.get("ft-umg") || "[]")); } catch { return new Set(); } })());
const isUmg = o => o.ev.type === "mina" || (o.ev.type === "google" && (/\bumgang\b/i.test(o.ev.title) || umgSet().has(umgKey(o.ev.title))));
function umgToggle(title) { const S = new Set(umgSet()), k = umgKey(title); S.has(k) ? S.delete(k) : S.add(k); UMGC = null; store.set("ft-umg", JSON.stringify([...S])); return S.has(k); }
const isBusy = o => !["birthday", "info", "anniversary", "contact"].includes(o.ev.type) && !/geburtstag|\bgeb\b/i.test(o.ev.title) && !isUmg(o);
// ---- Kacheln oben: 3 Tage, Reise, Geburtstag, Urlaub, Feiertag, Ferien – jeweils mit Tages-Countdown ----
const URLAUB_RE = /\b(urlaub|ferien|holiday|vacation|auszeit)\b/i;
const cdWhen = n => n <= 0 ? { pre: "", n: n < 0 ? "" : "Heute", unit: "" } : n === 1 ? { pre: "", n: "Morgen", unit: "" } : { pre: "in", n, unit: "Tagen" };
function next3() {
  const end = addDays(TODAY, 2), seen = new Set();
  const ev = OCC.filter(o => !o.part && o.a <= end && o.b >= TODAY && (o.ev.type !== "info" || !!o.ev.time) && !seen.has(o.ev.id + iso(o.a)) && seen.add(o.ev.id + iso(o.a)))
    .map(o => ({ k: "ev", d: o.a < TODAY ? TODAY : o.a, o, t: evName(o.ev) + (ageTxt(o) ? ` · ${ageTxt(o)}` : ""), c: colorOf(o.ev), run: o.a < TODAY ? `bis ${fmt(o.b)}` : "" }));
  const tk = (typeof TASKS !== "undefined" ? TASKS : []).filter(t => !t.done && t.due && parseIso(t.due) && parseIso(t.due) <= end)
    .map(t => { const d = parseIso(t.due); return { k: "tk", d: d < TODAY ? TODAY : d, t: t.title, id: t.id, late: d < TODAY ? dayDiff(d, TODAY) : 0 }; });
  let rem = []; try { REMS = buildReminders(); rem = REMS.map((r, i) => ({ r, i })).filter(({ r }) => r.n <= 2 && !(r.o && ev.some(x => x.o === r.o))).map(({ r, i }) => ({ k: "rem", d: addDays(TODAY, Math.max(0, r.n)), t: r.t, sub: r.sub, i, c: r.color })); } catch {}
  return { ev, tk, rem, all: [...ev, ...tk, ...rem].sort((a, b) => a.d - b.d) };
}
function countdowns() {
  const C = [], dn = d => dayDiff(TODAY, d), push = (n, x) => C.push({ ...cdWhen(n), k: n, ...x });
  const N = next3(), cnt = N.all.length;
  if (!SHOW.full) {} else if (cnt) { const parts = [N.ev.length ? `${N.ev.length} Termin${N.ev.length > 1 ? "e" : ""}` : "", N.tk.length ? `${N.tk.length} Aufgabe${N.tk.length > 1 ? "n" : ""}` : "", N.rem.length ? `${N.rem.length} Erinnerung${N.rem.length > 1 ? "en" : ""}` : ""].filter(Boolean);
    C.push({ pre: "", n: cnt, unit: "in 3 Tagen", t: N.all.slice(0, 3).map(x => x.t.replace(/ · .*$/, "")).join(" · "), sub: parts.join(", "), c: "var(--both)", n3: true }); }
  else C.push({ pre: "", n: "Frei", unit: "3 Tage", t: "Nichts Dringendes", sub: `bis ${fmt(addDays(TODAY, 2))}`, c: "var(--both)", n3: true });
  if (!SHOW.full) C.length = 0;   // kompakt: keine 3-Tage-Kachel, die Liste „Heute & Morgen“ zeigt das
  const top = OCC.filter(o => isTrip(o) && !o.part), isUrl = o => URLAUB_RE.test(o.ev.title);
  const tripTile = (list, label) => { const now = list.find(o => o.a <= TODAY && o.b >= TODAY), nx = list.filter(o => o.a > TODAY).sort((a, b) => a.a - b.a)[0];
    const stops = x => tripStops(x).length ? " · " + tripStops(x).join(" → ") : "";
    if (now) C.push({ pre: "noch", n: dayDiff(TODAY, now.b), unit: "Tage", t: shortName(now.ev).replace(/^🏨\s*/, "") + stops(now), sub: `${label} bis ${fmt(now.b)}`, c: label === "Urlaub" ? "var(--c-deadline)" : "var(--trip)", day: iso(now.a) });
    else if (nx) push(dn(nx.a), { t: shortName(nx.ev).replace(/^🏨\s*/, "") + stops(nx), sub: `${label} ab ${fmt(nx.a)}${dayDiff(nx.a, nx.b) ? ` · ${dayDiff(nx.a, nx.b) + 1} Tage` : ""}`, c: label === "Urlaub" ? "var(--c-deadline)" : "var(--trip)", day: iso(nx.a) }); };
  tripTile(top.filter(o => !isUrl(o)), "Reise");
  const bd = OCC.filter(o => o.ev.type === "birthday" && o.a >= TODAY).sort((a, b) => a.a - b.a)[0];
  if (bd) push(dn(bd.a), { t: bd.ev.title, sub: `Geburtstag ${fmt(bd.a)}${bd.ev.birthYear ? ` · wird ${bd.a.getFullYear() - bd.ev.birthYear}` : ""}`, c: "var(--event)", day: iso(bd.a) });
  tripTile(top.filter(isUrl), "Urlaub");
  // Festtage: Heiligabend, Silvester, Ostern – der nächste davon
  const y0 = TODAY.getFullYear(), FEST = [y0, y0 + 1].flatMap(y => [[ymd(y, 12, 24), "Weihnachten", "Heiligabend"], [ymd(y, 12, 31), "Silvester", "Silvester"], [easter(y), "Ostern", "Ostersonntag"]])
    .filter(([d]) => d >= TODAY).sort((a, b) => a[0] - b[0]);
  const fest = FEST[0];
  if (fest) push(dn(fest[0]), { t: fest[1], sub: `${fest[2]} · ${fmt(fest[0])}`, c: "var(--st-strong)", day: iso(fest[0]) });
  const near = d => fest && Math.abs(dayDiff(fest[0], d)) <= 2;   // 1. Weihnachtstag/Ostermontag nicht doppelt
  const hol = [...HOL.values()].filter(h => h.be && h.dt >= TODAY && !near(h.dt)).sort((a, b) => a.dt - b.dt)[0];
  if (hol) push(dn(hol.dt), { t: hol.name, sub: `Feiertag · ${fmt(hol.dt)}`, c: "var(--holiday)", day: iso(hol.dt) });
  const FA = FERX[PA].map(([n, a, b]) => ({ n, be: [parseIso(a), parseIso(b)] }));
  const fNow = FA.find(f => f.be[0] <= TODAY && f.be[1] >= TODAY && dayDiff(f.be[0], f.be[1]) > 2);
  const fNext = FA.filter(f => f.be[0] > TODAY && dayDiff(f.be[0], f.be[1]) > 2).sort((a, b) => a.be[0] - b.be[0])[0];
  if (fNow) C.push({ pre: "noch", n: dayDiff(TODAY, fNow.be[1]), unit: "Tage", t: fNow.n.replace(/ \d\d\/\d\d$/, ""), sub: `Ferien ${PA} bis ${fmt(fNow.be[1])}`, c: "var(--be-strong)", day: iso(fNow.be[0]) });
  else if (fNext) push(dn(fNext.be[0]), { t: fNext.n.replace(/ \d\d\/\d\d$/, "").replace("Weihnachten", "Weihnachtsferien"), sub: `Ferien ${PA} ab ${fmt(fNext.be[0])}`, c: "var(--be-strong)", day: iso(fNext.be[0]) });
  const br = [...BRIDGES.values()].filter(b => b.dt > TODAY && b.name.startsWith("Brückentag")).sort((a, b) => a.dt - b.dt)[0];
  if (br && dn(br.dt) <= 60) push(dn(br.dt), { t: "Brückentag", sub: `${fmt(br.dt)} · 1 Tag Urlaub, 4 frei`, c: "var(--bridge)", day: iso(br.dt) });
  // nach Tagen sortieren: laufende („noch …“) zuerst, dann das Nächste
  return C.map((x, i) => ({ x, i, k: x.n3 ? -2 : x.pre === "noch" ? -1 : x.k ?? 999 })).sort((a, b) => a.k - b.k || a.i - b.i).map(o => o.x);
}
function showNext3() {
  const N = next3(), days = [0, 1, 2].map(i => addDays(TODAY, i));
  const row = x => x.k === "ev" ? `<button type="button" class="n3r" data-occ="${esc(x.o.ev.id)}|${iso(x.o.a)}"><span class="what"><span class="ev-dot" style="background:${x.c}"></span>${x.o.ev.time && !x.run ? `<b>${esc(x.o.ev.time)}</b> ` : ""}${esc(x.t)}${x.run ? `<small class="note"> · ${esc(x.run)}</small>` : ""}</span></button>`
    : x.k === "tk" ? `<button type="button" class="n3r" data-tkedit="${esc(x.id)}"><span class="what"><span aria-hidden="true">☐</span> ${esc(x.t)}${x.late ? `<small class="note" style="color:var(--holiday)"> · seit ${x.late} T. fällig</small>` : ""}</span></button>`
    : `<button type="button" class="n3r" data-rem="${x.i}"><span class="what"><span class="ev-dot" style="background:${x.c}"></span>🔔 ${esc(x.t)}<small class="note"> · ${esc(x.sub)}</small></span></button>`;
  openSheet("Die nächsten 3 Tage", `${fmt(TODAY)} – ${fmt(days[2])} · Termine, Aufgaben, Erinnerungen`, days.map((d, i) => { const L = N.all.filter(x => sameDay(x.d, d));
    return `<h3 class="pkh">${["Heute", "Morgen", "Übermorgen"][i]} · ${fmt(d)}</h3>${L.length ? `<div class="n3">${L.map(row).join("")}</div>` : `<p class="note" style="margin:4px 2px 0">Nichts geplant.</p>`}`; }).join(""), "n3");
}
const o2b = o => o.b;
// Beim Tippen (Tastatur verkleinert den Bildschirm) nicht zur nächsten Seite springen
document.addEventListener("focusin", ev => { if (ev.target.matches?.("input:not([type=checkbox]):not([type=radio]), textarea, select")) { clearTimeout(window.__typT); document.documentElement.classList.add("typing"); } });
document.addEventListener("focusout", () => { clearTimeout(window.__typT); window.__typT = setTimeout(() => { if (!document.activeElement?.matches?.("input, textarea, select")) document.documentElement.classList.remove("typing"); }, 400); });
function renderToday() {
  const box = $("today-x"); if (!box) return;
  // Countdowns
  const C = countdowns();
  const cdEl = $("cd"), cdw = $("cdwrap"), cdUpd = () => { cdw.classList.toggle("nos", cdEl.scrollWidth <= cdEl.clientWidth + 2); cdw.classList.toggle("end", cdEl.scrollLeft + cdEl.clientWidth >= cdEl.scrollWidth - 4); };
  if (!cdEl._l) { cdEl._l = true; cdEl.addEventListener("scroll", cdUpd, { passive: true }); window.addEventListener("resize", cdUpd); }
  setTimeout(cdUpd, 0);
  $("cd").innerHTML = C.map(x => `<button type="button" class="cd" ${x.n3 ? "data-n3" : `data-day="${x.day}"`} style="--cc:${x.c}"><span class="cd-n">${x.zero ? "Jetzt" : `<small>${x.pre}</small> ${x.n} <small>${x.unit}</small>`}</span><span class="cd-t">${esc(x.t)}</span><span class="cd-s">${esc(x.sub)}</span></button>`).join("");
  // Wochenstreifen (wischbar) + passende Terminliste darunter
  const ws = wkStart;
  $("wk").innerHTML = Array.from({ length: 7 }, (_, i) => addDays(ws, i)).map(dt => { const d = dayOf(dt), oc = occOn(dt);
    const dots = oc.slice(0, 4).map(o => `<i style="background:${colorOf(o.ev)}"></i>`).join("") + (oc.length > 4 ? `<em>+${oc.length - 4}</em>` : "");
    const cls = ["wd", tintOf(d), sameDay(dt, TODAY) ? "today" : "", dt < TODAY ? "past" : "", d && d.h && SHOW.hol ? "hol" : "", wkSel && sameDay(dt, wkSel) ? "sel" : ""].filter(Boolean).join(" ");
    return `<button type="button" class="${cls}" data-wksel="${iso(dt)}" aria-label="${WDL[dt.getDay()]} ${fmt(dt)}${oc.length ? ": " + esc(oc.map(o => evName(o.ev)).join(", ")) : ""}"><span class="wd-l">${WDL[dt.getDay()].slice(0, 2)}</span><span class="wd-n">${dt.getDate()}</span><span class="wd-d">${dots}</span></button>`; }).join("");
  const thisWeek = sameDay(ws, monday(TODAY));
  $("wk-lbl").innerHTML = `<button type="button" class="wk-nav" data-wkstep="-1" aria-label="Vorige Woche">‹</button><span>KW ${isoWeek(ws)} · ${fmt(ws)} – ${fmt(addDays(ws, 6))}</span>${thisWeek ? "" : `<button type="button" class="link" id="wk-today">Heute</button>`}<button type="button" class="wk-nav" data-wkstep="1" aria-label="Nächste Woche">›</button>`;
  renderAgenda();
  // Vor einem Jahr
  const ly = new Date(TODAY.getFullYear() - 1, TODAY.getMonth(), TODAY.getDate()), memo = [];
  const cand = OCC.filter(o => o.ev.repeat === "none" && !/sp(ä|ae)t|\bhb[ps]\b|\bmbm\b/i.test(o.ev.title) && o.ev.type !== "contact");
  let hit = cand.filter(o => o.a <= ly && o.b >= ly), near = false;
  if (!hit.length) { hit = cand.filter(o => o.b >= addDays(ly, -3) && o.a <= addDays(ly, 3)); near = true; }
  const dd = d => `${p2(d.getDate())}.${p2(d.getMonth() + 1)}.`, sr = (a, b) => sameDay(a, b) ? dd(a) : a.getMonth() === b.getMonth() ? `${p2(a.getDate())}.–${dd(b)}` : `${dd(a)}–${dd(b)}`;
  hit.slice(0, 2).forEach(o => memo.push(`<button type="button" class="lr" data-occ="${esc(o.ev.id)}|${iso(o.a)}"><span class="dt">${sr(o.a, o.b)}</span><span class="n"><span class="ev-dot ${o.ev.type}" style="background:${colorOf(o.ev)}"></span><span>${esc(evName(o.ev))}</span></span></button>`));
  $("ago").hidden = !memo.length || ly < START;
  $("ago-lbl").textContent = near ? "Vor einem Jahr um diese Zeit" : "Heute vor einem Jahr";
  $("ago-list").innerHTML = memo.join("");
}

// =================== Erinnerungen ===================
let REMP = { dismissed: [], vacation: 30, vacOver: {} };
// Urlaub: Kandidaten und ob sie als eigener Urlaub zählen
const vacKey = o => o.ev.type === "google" ? `g:${o.ev.calId}:${o.ev.recurring ? o.ev.gid.split("_")[0] : o.ev.gid}` : o.ev.id;
const isVacCand = o => !/eintragen/i.test(o.ev.title) && (o.ev.type === "trip" || (/urlaub/i.test(o.ev.title) && !["birthday", "info", "anniversary", "contact", "mina"].includes(o.ev.type)));
const vacDefault = o => o.ev.type !== "google" || (o.ev.calId === "primary" && !o.ev.creator);
const isMyVac = o => { if (!isVacCand(o)) return false; const v = REMP.vacOver[vacKey(o)]; return v === undefined ? vacDefault(o) : !!v; };
const nthSunday = (y, m, n) => { const d = new Date(y, m, 1); return addDays(d, (7 - d.getDay()) % 7 + 7 * (n - 1)); };
function seasonal(y) {
  const E = easter(y);
  return [
    ...(famBy("partner").length ? [["valentin", ymd(y, 2, 14), 10, "Valentinstag", `Karte oder Blumen für ${famBy("partner").join(" & ")}?`]] : []),
    ...(famBy("mutter").length ? [["muttertag", nthSunday(y, 4, 2), 21, "Muttertag", `An ${famBy("mutter").join(" & ")} denken`]] : []),
    ...(famBy("vater").length ? [["vatertag", addDays(E, 39), 14, "Vatertag", `An ${famBy("vater").join(" & ")} denken`]] : []),
    ...(kidsNames().length ? [["halloween", ymd(y, 10, 31), 7, "Halloween", `Kostüm oder Süßes für ${kidsNames().join(" & ")}?`],
      ["advent", ymd(y, 12, 1), 21, "Adventskalender", `Adventskalender für ${kidsNames().join(" & ")} besorgen`]] : [])

  ].map(([k, d, lead, t, sub]) => ({ k: `s-${k}-${y}`, d, lead, t, sub }));
}
// ---- Reisen ----
const TRIP_RE = /\b(urlaub|reise|hotel|stay at|flug|flight|ferienwohnung|ferienhaus|camping|kreuzfahrt)\b|✈/i;
const MODES = { auto: "🚗 Auto", zug: "🚆 Zug", bus: "🚌 Bus", rad: "🚲 Rad", flug: "✈️ Flugzeug" };
const FLIGHT_RE = /\b(flug|flight|flughafen|airport|abflug)\b|✈|lufthansa|eurowings|ryanair|easyjet|condor|tuifly|\bber\b/i;
const KIDS_RE = /\b(kinder|kids|familie)\b/i;
const isTrip = o => o.ev.type === "trip" || (o.ev.type === "google" && TRIP_RE.test(o.ev.title) && !/eintragen|beantragen|buchen/i.test(o.ev.title));
const tripText = e => `${e.title} ${e.note || ""} ${e.place || ""} ${e.cal || ""}`;
const isFlight = e => e.mode ? e.mode === "flug" : (!!e.flight || FLIGHT_RE.test(tripText(e)));
const modeOf = e => e.mode || (isFlight(e) ? "flug" : /\b(zug|bahn|ice|db)\b|deutsche bahn|bahnticket/i.test(tripText(e)) ? "zug" : /flixbus|fernbus|\bbus(reise)?\b/i.test(tripText(e)) ? "bus" : /\b(radtour|radreise|fahrradtour|bikepacking)\b/i.test(tripText(e)) ? "rad" : "");
const byCar = e => !["flug", "zug", "bus", "rad"].includes(modeOf(e));
const modeHint = e => ({ flug: `✈ Tickets & Ausweise${withKids(e) ? " (auch Kinder)" : ""} prüfen`, zug: "🚆 Tickets & Reservierung prüfen", bus: "🚌 Ticket & Abfahrt prüfen", rad: "🚲 Rad checken", auto: "🚗 Tanken & Reifendruck" })[modeOf(e)] || "";
const withKids = e => !!e.kids || KIDS_RE.test(tripText(e)) || kidsNames().some(n => n && new RegExp("\\b" + n.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "\\b", "i").test(tripText(e)));
const placeOf = e => (e.place || (e.type === "google" ? e.note : "") || "").trim();
const tripDays = () => REMP.tripDays ?? 14;
function seasonHint(a, b) { const m = addDays(a, Math.floor(dayDiff(a, b) / 2)).getMonth();
  return m <= 2 || m >= 10 ? "Winter: warme Kleidung, Mütze, Handschuhe" : m >= 5 && m <= 7 ? "Sommer: Sonnenschutz, leichte Kleidung, Badesachen" : "Übergangszeit: Regenjacke und Schichten"; }
const bdaysIn = (a, b) => OCC.filter(o => o.ev.type === "birthday" && o.a >= a && o.a <= b);
function tripChecks(e, o) {
  const L = [];
  const cc = tripCountry(e), C = COUNTRIES[cc];
  if (C?.entry) L.push(["Dokumente", `${C.entry} – erledigt?`]);
  if (C?.pass) L.push(["Dokumente", `Reisepass${withKids(e) ? " (auch für die Kinder)" : ""} – für ${C.n} reicht der Personalausweis nicht`]);
  if (C?.toll && byCar(e)) L.push(["Auto", C.toll]);
  if (C?.cur) L.push(["Unterwegs", `Zahlungsmittel: ${C.cur} oder Karte ohne Auslandsgebühr`]);
  if (cc && !["AT","CH","CZ","SK","SI","HU","RO","BG","PL","FR","IT","ES","PT","HR","DK","NO","SE","NL","IE"].includes(cc)) L.push(["Dokumente", "Auslandskrankenversicherung prüfen"]);
  if (isFlight(e)) { L.push(["Dokumente", "Flugtickets / Bordkarten bereit"], ["Dokumente", "Online-Check-in (meist 24–48 h vorher)"], ["Dokumente", `Reisepass/Personalausweis gültig${withKids(e) ? " – auch für die Kinder" : ""}?`], ["Unterwegs", "Handgepäck: Flüssigkeiten max. 100 ml, Powerbank ins Handgepäck"]); }
  else L.push(["Dokumente", `Personalausweis${withKids(e) ? " (auch Kinderausweise)" : ""} dabei`]);
  const md = modeOf(e);
  if (md === "zug") L.push(["Dokumente", "Bahntickets bereit (App oder Ausdruck), ggf. BahnCard"], ["Unterwegs", "Sitzplatz reserviert? Verbindung am Vortag prüfen"]);
  if (md === "bus") L.push(["Dokumente", "Busticket bereit (App oder Ausdruck)"], ["Unterwegs", "Abfahrtsort prüfen, 15 Minuten früher da sein"]);
  if (md === "rad") L.push(["Rad", "Rad checken: Reifendruck, Bremsen, Licht"], ["Rad", "Flickzeug, Pumpe, Schloss"], ["Rad", "Regenkleidung und Packtaschen"]);
  if (md === "auto") L.push(["Auto", "Tanken/Laden, Reifendruck, Warnwesten und Verbandskasten"]);
  if (withKids(e)) L.push(["Kinder", "Beschäftigung für unterwegs, Snacks"]);
  L.push(["Kleidung", seasonHint(o.a, o.b)]);
  if (isFlight(e)) L.push(["Kleidung", "Wetter am Reiseziel prüfen"]);
  bdaysIn(o.a, o.b).forEach(b => L.push(["Geburtstage", `${b.ev.title} (${fmt(b.a)}): kleines Geschenk mitnehmen oder Nachricht/Anruf einplanen`]));
  return L;
}
// ---- Reiseziel: Land, Maut/Vignette, Einreise ----
// toll: mit dem Auto nötig · entry: Einreisegenehmigung (rechtzeitig beantragen) · pass: Reisepass nötig · cur: Währung (wenn nicht Euro)
const COUNTRIES = {
  AT: { n: "Österreich", re: /österreich|austria|\btirol|\bwien\b|salzburg|innsbruck|kärnten|steiermark|vorarlberg|achensee|zillertal|kitzbühel/i, toll: "Vignette Österreich (digital: asfinag.at)" },
  CH: { n: "Schweiz", re: /schweiz|switzerland|suisse|zürich|zurich|\bbern\b|luzern|basel|genf|graubünden|davos|zermatt/i, toll: "Autobahnvignette Schweiz (E-Vignette)", cur: "Franken" },
  CZ: { n: "Tschechien", re: /tschechien|czech|\bprag\b|praha|karlsbad|brünn|riesengebirge/i, toll: "E-Vignette Tschechien (edalnice.cz)", cur: "Kronen" },
  SK: { n: "Slowakei", re: /slowakei|slovakia|bratislava|tatra/i, toll: "E-Vignette Slowakei (eznamka.sk)" },
  SI: { n: "Slowenien", re: /slowenien|slovenia|ljubljana|bled/i, toll: "E-Vinjeta Slowenien" },
  HU: { n: "Ungarn", re: /ungarn|hungary|budapest|balaton/i, toll: "E-Matrica Ungarn", cur: "Forint" },
  RO: { n: "Rumänien", re: /rumänien|romania|bukarest/i, toll: "Rovinieta Rumänien", cur: "Lei" },
  BG: { n: "Bulgarien", re: /bulgarien|bulgaria|sofia|varna|burgas/i, toll: "E-Vignette Bulgarien" },
  PL: { n: "Polen", re: /\bpolen\b|poland|polska|krakau|kraków|danzig|gdańsk|gdansk|breslau|wrocław|posen|poznań|warschau|stettin|szczecin|usedom.*polen|masuren/i, toll: "Maut auf einzelnen Autobahnen (z. B. A2/A4, e-TOLL-App oder Mautstelle)", cur: "Złoty" },
  FR: { n: "Frankreich", re: /frankreich|france|paris|provence|bretagne|normandie|côte d'azur|nizza|elsass/i, toll: "Autobahn-Maut Frankreich (Karte bereithalten)" },
  IT: { n: "Italien", re: /italien|italy|italia|\brom\b|roma|mailand|milano|venedig|toskana|gardasee|südtirol|dolomiten|sizilien|sardinien/i, toll: "Autobahn-Maut Italien (Karte oder Telepass)" },
  ES: { n: "Spanien", re: /spanien|spain|españa|mallorca|ibiza|barcelona|madrid|teneriffa|gran canaria|fuerteventura|lanzarote|andalusien|costa/i, toll: "Autobahn-Maut auf einzelnen Strecken (Spanien)" },
  PT: { n: "Portugal", re: /portugal|lissabon|lisboa|porto|algarve|madeira/i, toll: "Elektronische Maut Portugal (Kennzeichen registrieren)" },
  HR: { n: "Kroatien", re: /kroatien|croatia|hrvatska|istrien|split|dubrovnik|zagreb/i, toll: "Autobahn-Maut Kroatien" },
  DK: { n: "Dänemark", re: /dänemark|denmark|danmark|kopenhagen/i, cur: "Kronen" },
  NO: { n: "Norwegen", re: /norwegen|norway|oslo|bergen/i, toll: "Maut Norwegen (AutoPASS, Kennzeichen registrieren)", cur: "Kronen" },
  SE: { n: "Schweden", re: /schweden|sweden|stockholm|göteborg/i, cur: "Kronen" },
  NL: { n: "Niederlande", re: /niederlande|netherlands|holland|amsterdam|zandvoort/i },
  GB: { n: "Großbritannien", re: /england|großbritannien|grossbritannien|united kingdom|\buk\b|london|schottland|scotland|edinburgh|wales|manchester|liverpool/i, entry: "ETA für Großbritannien beantragen (gov.uk)", pass: true, cur: "Pfund" },
  IE: { n: "Irland", re: /irland|ireland|dublin/i },
  US: { n: "USA", re: /\busa\b|vereinigte staaten|united states|new york|florida|kalifornien|california|las vegas|miami|los angeles|san francisco|hawaii|washington d/i, entry: "ESTA für die USA beantragen (esta.cbp.dhs.gov)", pass: true, cur: "Dollar" },
  CA: { n: "Kanada", re: /kanada|canada|toronto|vancouver|montreal/i, entry: "eTA für Kanada beantragen (bei Einreise per Flug)", pass: true, cur: "Dollar" },
  AU: { n: "Australien", re: /australien|australia|sydney|melbourne/i, entry: "eVisitor für Australien beantragen", pass: true, cur: "Dollar" },
  TR: { n: "Türkei", re: /türkei|turkey|türkiye|antalya|istanbul|side\b|alanya|bodrum/i, cur: "Lira" },
  EG: { n: "Ägypten", re: /ägypten|egypt|hurghada|sharm|marsa alam/i, entry: "Visum für Ägypten (e-Visum oder bei Ankunft)", cur: "Pfund" },
  TH: { n: "Thailand", re: /thailand|bangkok|phuket|koh /i, pass: true, cur: "Baht" }
};
function tripCountry(e) {
  if (e.country && COUNTRIES[e.country]) return e.country;
  const txt = tripText(e) + " " + OCC.filter(x => x.part?.ev === e).map(x => tripText(x.ev)).join(" "), pl = placeOf(e);
  for (const [c, x] of Object.entries(COUNTRIES)) if (new RegExp(`(^|[\\s,])${c}([\\s,]|$)`).test(pl) || x.re.test(txt)) return c;
  return "";
}
function routeLinks(place, cls = "btn ghost small") { if (!place) return ""; const q = encodeURIComponent(place);
  return `<a class="${cls}" href="https://www.google.com/maps/dir/?api=1&destination=${q}" target="_blank" rel="noopener">Route (Google Maps)</a><a class="${cls}" href="https://maps.apple.com/?daddr=${q}" target="_blank" rel="noopener">Apple Karten</a>`; }
const inDays = n => n === 0 ? "Heute" : n === 1 ? "Morgen" : n < 0 ? `vor ${-n} T.` : `in ${n} Tagen`;
// Wichtig = zeitkritisch: Einreise, Vignette/Maut, Online-Check-in, Fristen bald – stehen immer in „Heute & Morgen“ (auch wenn Erinnerungen eingeklappt sind)
const remImp = r => (r.acts || []).some(([, a]) => /^season:(visa|toll|ci-)/.test(String(a))) || (/^Frist/.test(r.t || "") && r.n <= 3);
function buildReminders() {
  const R = [], add = r => R.push(r);
  // Geburtstage & Jahrestage
  OCC.forEach(o => {
    const e = o.ev, n = dayDiff(TODAY, o.a), y = o.a.getFullYear();
    if (e.type === "birthday") {
      const age = e.birthYear ? y - e.birthYear : 0, round = age && isRoundAge(age);
      const kid = !!e.birthYear && age < 18, lead = e.remindDays === 20 ? (round ? 49 : kid ? 28 : 20) : e.remindDays;
      const wish = (round || kid) ? [["Wunsch erfragen", "href:" + waLink(wishText(e.title, "Geburtstag", kid))]] : [];
      if (n === 0 && !e.done.includes("g" + y)) add({ n, o, color: "var(--event)", t: `Heute Geburtstag: ${e.title}`, sub: age ? `wird ${age}` : "Gratulieren nicht vergessen", acts: [["Nachricht", "ideas"], ["Gratuliert", "done:g" + y]] });
      else if (n > 0 && lead > 0 && n <= lead && !e.giftDone.includes(String(y))) add({ n, o, color: "var(--event)", t: `Geburtstag ${e.title}`, sub: `${fmt(o.a)}${age ? ` · wird ${age}${round ? " – rund!" : ""}` : ""} · ${kid ? "Geschenk besorgen" : "Geschenk/Karte"}`, acts: [["Ideen", "ideas"], ...wish, ["Erledigt", "gift:" + y]] });
    }
    if (e.type === "anniversary" && n >= 0) {
      const yrs = e.startYear ? y - e.startYear : 0, round = yrs && yrs % 5 === 0, lead = round && e.remindDays === 7 ? 21 : e.remindDays;
      if (lead > 0 && n <= lead && !e.done.includes("a" + y)) add({ n, o, color: "var(--c-anniv)", t: `${e.title}${yrs ? ` · ${yrs} Jahre${round ? "!" : ""}` : ""}`, sub: fmt(o.a), acts: [["Ideen", "ideas"], ["Erledigt", "done:a" + y]] });
    }
    if (e.type === "deadline" && n >= -3 && n <= e.remindDays && !e.done.includes("d" + iso(o.a))) add({ n, o, color: "var(--c-deadline)", t: `Frist: ${e.title}`, sub: `${n < 0 ? "überfällig seit " : "fällig "}${fmt(o.a)}${e.note ? " · " + e.note : ""}`, acts: [["Erledigt", "done:d" + iso(o.a)]] });
    if (isTrip(o) && n >= 0 && n <= 92) {
      const k = `trip-${vacKey(o)}-${iso(o.a)}`, cc = tripCountry(e), C = COUNTRIES[cc];
      const step = (key, when, t, sub) => { if (!REMP.dismissed.includes(key + k)) add({ n, o, color: "var(--trip)", t, sub, acts: [["Erledigt", "season:" + key + k]] }); };
      if (C?.entry) { if (n <= 92 && n > 30) step("visa1-", n, `Einreise ${C.n}: ${C.entry.split(" (")[0]}`, `Reise ab ${fmt(o.a)} · jetzt beantragen, Bearbeitung kann dauern`);
        else if (n <= 30) step("visa2-", n, `Einreise ${C.n}: Genehmigung da?`, `${C.entry} · Reise ab ${fmt(o.a)}`); }
      if (C?.toll && byCar(e)) { const lbl = /vignette|vinjeta|matrica|rovinieta/i.test(C.toll) ? "Vignette" : "Maut";
        if (n <= 7 && n > 1) step("toll1-", n, `${lbl} ${C.n} besorgen`, `${C.toll} · für „${e.title}“ ab ${fmt(o.a)}`);
        else if (n <= 1) step("toll2-", n, `${lbl} ${C.n}: erledigt?`, `${C.toll} · Abfahrt ${fmt(o.a)}`); }
    }
    if (isTrip(o) && n >= 0 && n <= tripDays()) {
      const k = `trip-${vacKey(o)}-${iso(o.a)}`, fl = isFlight(e), pl = e.packlist || [];
      if (!REMP.dismissed.includes(k)) add({ n, o, color: "var(--trip)", t: `Reise: ${e.title}`, sub: [`ab ${fmt(o.a)}`, pl.length ? `Packliste ${pl.filter(x => x.d).length}/${pl.length}` : "", modeHint(e), e.files?.length ? `📎 ${e.files.length} Dokument${e.files.length > 1 ? "e" : ""}` : "", seasonHint(o.a, o.b).split(":")[0]].filter(Boolean).join(" · "),
        acts: [["Packliste", "pack"], ...(placeOf(e) ? [["Route", "route"]] : []), ["Erledigt", "season:" + k]] });
      // Einreise (ca. 3 Monate und 1 Monat vorher) und Maut/Vignette (1 Woche und 1 Tag vorher) – unabhängig vom Reise-Vorlauf
      if (fl && n <= 2 && !REMP.dismissed.includes("ci-" + k)) add({ n, o, color: "var(--trip)", t: `Online-Check-in: ${e.title}`, sub: `Abflug ${fmt(o.a)}${e.time ? " " + e.time : ""} · Bordkarten aufs Handy`, acts: [["Erledigt", "season:ci-" + k]] });
      bdaysIn(o.a, o.b).forEach(b => { const y = b.a.getFullYear(); if (b.ev.giftDone.includes(String(y))) return;
        add({ n, o: b, color: "var(--event)", t: `Geburtstag unterwegs: ${b.ev.title}`, sub: `${fmt(b.a)} während „${e.title}“ · kleines Geschenk mitnehmen, vorher schicken oder Nachricht/Anruf`, acts: [["Ideen", "ideas"], ["Erledigt", "gift:" + y]] }); });
    }
    if (e.thanks && !["google", "birthday"].includes(e.type)) { const after = dayDiff(o.b, TODAY); if (after >= 1 && after <= 4 && !e.done.includes("t" + iso(o.a))) add({ n: -after, o, color: "var(--c-contact)", t: `Danke sagen: ${e.title}`, sub: `war am ${fmt(o.a)}`, acts: [["Erledigt", "done:t" + iso(o.a)]] }); }
  });
  // Geschenke-Listen: Weihnachten, Nikolaus, Ostern
  if (canWrite) giftOccasions().forEach(G => { const n = dayDiff(TODAY, G.d); if (n < 0 || n > G.lead) return;
    const L = GIFTS[G.k], key = s => s + "-" + G.k;
    if (!L) { if (!REMP.dismissed.includes(key("g0"))) add({ n, color: "var(--event)", t: `${G.t} in ${n} Tagen – wen beschenkst du?`, sub: `${fmt(G.d)} · Liste mit Vorschlägen öffnen`, acts: [["Planen", "giftopen:" + G.k], ["Kein Bedarf", "season:" + key("g0")]] }); return; }
    const open = L.people.filter(p => p.s < 2); if (!open.length) return;
    const reached = G.fol.filter(f => n <= f); const f = reached.length ? Math.min(...reached) : null;
    if (f !== null && !REMP.dismissed.includes(key("gf" + f))) add({ n, color: "var(--event)", t: `${G.t}: noch ${open.length} offen`, sub: open.map(p => p.n).join(", "), acts: [["Öffnen", "giftopen:" + G.k], ["Später", "season:" + key("gf" + f)]] });
    const kids = open.filter(p => isKidName(p.n, G.d));
    if (n <= 7 && kids.length && !REMP.dismissed.includes(key("gk"))) add({ n, color: "var(--event)", t: `Für ${kids.map(p => p.n).join(" und ")} schon alles besorgt?`, sub: `${G.t} · ${fmt(G.d)}`, acts: [["Öffnen", "giftopen:" + G.k], ["Ja, alles da", "giftkids:" + G.k]] });
  });
  // Kontakt halten
  EV.filter(e => e.type === "contact" && e.a).forEach(e => { const due = addDays(e.a, e.everyWeeks * 7), n = dayDiff(TODAY, due);
    if (n <= 0) add({ n: 0, o: { ev: e, a: e.a, b: e.a }, color: "var(--c-contact)", t: `Mal wieder melden: ${e.title}`, sub: `zuletzt ${fmtY(e.a)}${e.note ? " · " + e.note : ""}`, acts: [["Gemeldet", "contacted"], ["Bearbeiten", "edit"]] }); });
  // Saison
  if (SHOW.season) [TODAY.getFullYear(), TODAY.getFullYear() + 1].forEach(y => seasonal(y).forEach(x => { const n = dayDiff(TODAY, x.d);
    if (n >= 0 && n <= x.lead && !REMP.dismissed.includes(x.k)) add({ n, season: x, color: "var(--c-season)", t: x.t, sub: `${fmt(x.d)} · ${x.sub}`, acts: [["Erledigt", "season:" + x.k]] }); }));
  const unterwegs = new Set(R.filter(r => r.t.startsWith("Geburtstag unterwegs")).map(r => r.o.ev.id + iso(r.o.a)));
  return R.filter(r => !(r.o?.ev.type === "birthday" && !r.t.startsWith("Geburtstag unterwegs") && r.n > 0 && unterwegs.has(r.o.ev.id + iso(r.o.a)))).sort((a, b) => a.n - b.n);
}
let REMS = [];
const ACT_ICON = { "Ideen": "💡", "Erledigt": "✓", "Gratuliert": "✓", "Gemeldet": "✓", "Ja, alles da": "✓", "Packliste": "🎒", "Route": "🧭", "Wunsch erfragen": "💬", "Nachricht": "💬", "Planen": "🎁", "Öffnen": "›", "Kein Bedarf": "✕", "Später": "⏰", "Bearbeiten": "✎" };
let soonAll = false;
const inDaysShort = n => n === 0 ? "Heute" : n === 1 ? "Morgen" : n < 0 ? `vor ${-n} T.` : `in ${n} T.`;
function renderSoon() {
  REMS = buildReminders();
  UPN.soon = REMS.length;
  const MAX = 5, list = soonAll ? REMS : REMS.slice(0, MAX);
  const act = (r, i, l, a) => { const ic = `<span aria-hidden="true">${ACT_ICON[l] || "•"}</span>`, at = `class="ic" title="${esc(l)}" aria-label="${esc(l)}"`;
    if (a.startsWith("href:")) return `<a ${at} href="${esc(a.slice(5))}" target="_blank" rel="noopener">${ic}</a>`;
    if (a === "route" && placeOf(r.o.ev)) return `<a ${at} href="https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(placeOf(r.o.ev))}" target="_blank" rel="noopener">${ic}</a>`;
    return `<button type="button" ${at} data-remact="${i}|${esc(a)}">${ic}</button>`; };
  const isDone = a => /^(done:|gift:|season:|giftkids:|contacted)/.test(a);
  $("soon-list").innerHTML = list.map((r, i) => `<div class="sr"><button type="button" class="nx" data-rem="${i}"><span class="when">${inDaysShort(r.n)}</span><span class="what"><span class="ev-dot" style="background:${r.color}"></span>${esc(r.t)}<small class="note"> · ${esc(r.sub)}</small></span><span></span></button>
    <div class="sr-acts">${r.acts.filter(([, a]) => canWrite || a === "ideas" || a === "pack").filter(([, a]) => a !== "ideas" || sample).filter(([, a]) => !isDone(a)).map(([l, a]) => act(r, i, l, a)).join("")}</div></div>`).join("") +
    (REMS.length > MAX ? `<button type="button" class="link more-btn" id="soon-more">${soonAll ? "Weniger anzeigen" : `+ ${REMS.length - MAX} weitere`}</button>` : "");
}
// Erinnerung antippen: alle Aktionen inkl. „Erledigt“ in Ruhe in einem eigenen Fenster
function showRem(i) {
  const r = REMS[i]; if (!r) return;
  const acts = r.acts.filter(([, a]) => canWrite || a === "ideas" || a === "pack").filter(([, a]) => a !== "ideas" || sample);
  const btn = ([l, a]) => a.startsWith("href:") ? `<a class="btn ghost small" href="${esc(a.slice(5))}" target="_blank" rel="noopener">${ACT_ICON[l] || ""} ${esc(l)}</a>`
    : a === "route" && placeOf(r.o.ev) ? `<a class="btn ghost small" href="https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(placeOf(r.o.ev))}" target="_blank" rel="noopener">${ACT_ICON[l]} ${esc(l)}</a>`
    : `<button type="button" class="btn ${/^(done:|gift:|season:|giftkids:|contacted)/.test(a) ? "accent" : "ghost"} small" data-remact="${i}|${esc(a)}" data-close="1">${ACT_ICON[l] || ""} ${esc(l)}</button>`;
  const open = r.o && r.o.ev.type !== "contact" ? `<button type="button" class="btn ghost small" data-occ="${esc(r.o.ev.id)}|${iso(r.o.a)}">Termin ansehen</button>` : r.o ? `<button type="button" class="btn ghost small" data-remact="${i}|edit">✎ Bearbeiten</button>` : "";
  openSheet(r.t, `${inDays(r.n)}${r.sub ? " · " + r.sub : ""}`, `<div class="btnrow" style="margin-top:12px">${acts.map(btn).join("")}${open}</div>`, "rem", { i });
}
async function remAction(i, act) {
  const r = REMS[i]; if (!r) return;
  const e = r.o?.ev;
  const upd = async (patch, msg, undoPatch) => { try { await COLL("events").doc(e.id).update(patch); toast(msg, undoPatch ? async () => { await COLL("events").doc(e.id).update(undoPatch); toast("Rückgängig gemacht"); } : null); } catch (err) { toast(writeErr(err)); } };
  if (act === "ideas") return showIdeas(r.o);
  if (act.startsWith("giftopen:")) return showGifts(act.slice(9));
  if (act.startsWith("giftkids:")) { const k = act.slice(9), G = giftOccasions().find(x => x.k === k), L = GIFTS[k]; if (L && G) { L.people.forEach(p => { if (isKidName(p.n, G.d)) p.s = 2; }); saveGifts(); toast("Prima, alles besorgt"); } return; }
  if (act === "pack") return e.type === "google" ? adoptTrip(r.o, true) : showPack(e);
  if (act === "route") { const p = placeOf(e); if (p) window.open(`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(p)}`, "_blank", "noopener"); return; }
  if (act === "edit") return showForm(e);
  if (act.startsWith("gift:")) { const y = act.slice(5); return upd({ giftDone: [...new Set([...e.giftDone, y])] }, `${e.title}: erledigt`, { giftDone: e.giftDone }); }
  if (act.startsWith("done:")) { const k = act.slice(5); return upd({ done: [...new Set([...e.done, k])] }, "Erledigt", { done: e.done }); }
  if (act === "contacted") return upd({ from: iso(TODAY), to: iso(TODAY) }, `${e.title}: gemeldet`, { from: e.from, to: e.to });
  if (act.startsWith("season:")) { const k = act.slice(7), prev = [...REMP.dismissed]; REMP.dismissed = [...new Set([...prev, k])].slice(-60);
    try { await COLL("prefs").doc("reminders").set(REMP); toast("Erledigt", async () => { REMP.dismissed = prev; await COLL("prefs").doc("reminders").set(REMP); toast("Rückgängig gemacht"); }); } catch (err) { toast(writeErr(err)); } renderSoon(); renderUp(); }
}

// =================== Geschenke-Listen ===================
let GIFTS = {};   // "xmas-2026" -> { people: [{ n, s: 0 offen | 1 Idee | 2 besorgt, idea }] }
const ME_NAME = "";
const waLink = t => `https://wa.me/?text=${encodeURIComponent(t)}`;
const wishText = (name, what, kid) => what === "Geburtstag"
  ? (kid ? `Hallo! ${name} hat ja bald Geburtstag 🎉 Weißt du, was ${name} sich gerade wünscht?` : `Hallo ${name}, dein Geburtstag ist ja bald 🎉 Hast du einen Wunsch? Dann kann ich rechtzeitig schauen.`)
  : (kid ? `Hallo! ${what} ist ja bald – weißt du, was ${name} sich wünscht?` : `Hallo ${name}, ${what} ist ja bald 😊 Hast du einen Wunsch? Dann kann ich rechtzeitig schauen.`);
function giftOccasions() { const out = [];
  [TODAY.getFullYear(), TODAY.getFullYear() + 1].forEach(y => { const E = easter(y);
    out.push({ k: `xmas-${y}`, t: "Weihnachten", d: ymd(y, 12, 24), lead: 42, fol: [21, 7], kidsOnly: false },
             { k: `nikolaus-${y}`, t: "Nikolaus", d: ymd(y, 12, 6), lead: 14, fol: [3], kidsOnly: true },
             { k: `ostern-${y}`, t: "Ostern", d: E, lead: 21, fol: [7], kidsOnly: true }); });
  return out; }
const bdOf = name => EV.find(e => e.type === "birthday" && e.title.toLowerCase() === String(name).toLowerCase());
const isKidName = (name, d) => { const e = bdOf(name); return !!(e && e.birthYear && d.getFullYear() - e.birthYear < 18); };
function familyNames() { const f = FAM().map(p => p.name).filter(Boolean); return f.length ? f : EV.filter(e => e.type === "birthday" && e.fam).map(e => e.title); }
function giftDefaults(G) {
  const prev = GIFTS[G.k.replace(/\d{4}$/, y => String(+y - 1))];
  let names = prev ? prev.people.map(p => p.n) : familyNames();
  if (G.kidsOnly && !prev) names = names.filter(n => isKidName(n, G.d));
  return names.map(n => ({ n, s: 0, idea: "" }));
}
async function saveGifts() { try { await COLL("prefs").doc("gifts").set({ lists: GIFTS }); } catch (err) { toast(writeErr(err)); } renderSoon(); renderUp(); }
function showGifts(k) {
  const G = giftOccasions().find(x => x.k === k); if (!G) return;
  if (!GIFTS[k]) { GIFTS[k] = { people: giftDefaults(G) }; saveGifts(); }
  const L = GIFTS[k], prev = GIFTS[k.replace(/\d{4}$/, y => String(+y - 1))], n = dayDiff(TODAY, G.d);
  const ST = [["offen", "var(--muted)"], ["Idee", "var(--c-deadline)"], ["besorgt", "var(--c-contact)"]];
  const others = familyNames().filter(x => !L.people.some(p => p.n === x));
  openSheet(`Geschenke ${G.t} ${G.d.getFullYear()}`, `${fmt(G.d)} · ${n === 0 ? "heute" : `in ${n} Tagen`} · ${L.people.filter(p => p.s === 2).length}/${L.people.length} besorgt`, `
    <div class="gl">${L.people.map((p, i) => { const last = prev?.people.find(x => x.n === p.n && x.idea); const kid = isKidName(p.n, G.d);
      return `<div class="gp"><div class="gp-h"><b>${esc(p.n)}</b>${kid ? `<small class="note">Kind</small>` : ""}
        <button type="button" class="gst" data-gst="${i}" style="--sc:${ST[p.s][1]}">${ST[p.s][0]}</button><button type="button" class="link del" data-gdelp="${i}" aria-label="${esc(p.n)} entfernen">✕</button></div>
        <input type="text" class="gidea" data-gidea="${i}" value="${esc(p.idea || "")}" placeholder="Idee (optional)">
        <div class="gp-a"><a class="link" href="${esc(waLink(wishText(p.n, G.t, kid)))}" target="_blank" rel="noopener">Wunsch erfragen</a>${sample ? `<button type="button" class="link" data-gai="${i}">Ideen</button>` : ""}${last ? `<span class="note">letztes Jahr: ${esc(last.idea)}</span>` : ""}</div>
        <div class="gai" id="gai-${i}"></div></div>`; }).join("")}</div>
    <div class="lbar" style="margin-top:10px"><input type="text" class="search" id="g-new" placeholder="Person hinzufügen"><button type="button" class="btn ghost small" id="g-add">Hinzufügen</button></div>
    ${others.length ? `<div class="ex" style="margin-top:8px">${others.map(x => `<button type="button" data-gaddn="${esc(x)}">+ ${esc(x)}</button>`).join("")}</div>` : ""}
    <p class="note" style="margin-top:10px">Tippe auf den Status: offen → Idee → besorgt. „Wunsch erfragen“ öffnet WhatsApp mit einem fertigen Text, den Kontakt wählst du dort.</p>`, "gifts", { id: k });
}
let giftT = null;
async function giftIdeas(k, i) {
  const G = giftOccasions().find(x => x.k === k), p = GIFTS[k]?.people[i], box = $("gai-" + i); if (!G || !p || !box) return;
  const e = bdOf(p.n), age = e?.birthYear ? G.d.getFullYear() - e.birthYear : 0;
  box.innerHTML = `<span class="note">Ideen kommen …</span>`;
  try { const r = await (window.MK_TASK = "geschenkideen", sample.json)(`Schlage 5 kurze, konkrete Geschenkideen zu ${G.t} für ${p.n}${age ? ` (${age} Jahre)` : ""} vor. ${e?.note ? "Info: " + e.note + "." : ""} ${GIFTS[k.replace(/\d{4}$/, y => String(+y - 1))]?.people.find(x => x.n === p.n)?.idea ? "Letztes Jahr gab es: " + GIFTS[k.replace(/\d{4}$/, y => String(+y - 1))].people.find(x => x.n === p.n).idea + " – nicht wiederholen." : ""} Antworte NUR mit JSON {"ideen": ["…"]}, je höchstens 6 Wörter, Deutsch.`, { modelTier: "quick", cache: false });
    const ideas = (r?.ideen || []).map(String).slice(0, 5);
    box.innerHTML = ideas.length ? `<div class="ex">${ideas.map(x => `<button type="button" data-gpick="${i}|${esc(x)}">${esc(x)}</button>`).join("")}</div>` : "";
  } catch { box.innerHTML = `<span class="err">Gerade keine Ideen möglich.</span>`; }
}
// Google-Reise als eigene, verknüpfte Reise übernehmen (für Packliste, Flug, Ort)
async function adoptTrip(o, openPack) {
  const g = o.ev; if (!canWrite || !db) { toast("Nur für dich als Besitzer möglich."); return; }
  const doc = { type: "trip", title: g.title.replace(/^stay at\s+/i, "Hotel "), from: iso(o.a), to: iso(o.b), time: g.time || "", endTime: "", repeat: "none", until: "", birthYear: 0, note: "", gcal: g.calId, gEventId: g.recurring ? g.gid.split("_")[0] : g.gid,
    remindDays: 0, giftDone: [], done: [], startYear: 0, everyWeeks: 8, thanks: false, packlist: [], place: g.note || "", flight: FLIGHT_RE.test(g.title), kids: false, gReadOnly: true };
  try { const ref = await COLL("events").add(doc); toast("Als Reise übernommen");
    const ev = { ...doc, id: ref.id, a: o.a, b: o.b }; if (openPack) showPack(ev); else showForm(ev);
  } catch (err) { toast(writeErr(err)); }
}
// Merkliste zu einem Google-Termin: eigene, verknüpfte Notiz (mOnly) – der Google-Termin bleibt unverändert und sichtbar
const merkOf = o => MERK.find(m => m.gEventId === o.ev.gid && m.from === iso(o.a));
const merkable = o => canWrite && !!db && o.ev.type === "google" && !isTrip(o) && !isUmg(o) && !/geburtstag|birthday/i.test(o.ev.title) && !NOPLACE_RE.test(o.ev.title);
const merkBtn = o => { const m = merkOf(o), l = m?.packlist || [], lab = dayDiff(o.a, o.b) < 1 ? "📝 Merkliste" : "🎒 Packliste"; return l.length ? `${lab} ${l.filter(x => x.d).length}/${l.length}` : lab; };
async function openMerk(o) {
  use("merkliste");
  const g = o.ev; let m = merkOf(o);
  if (!m) { if (!canWrite || !db) { toast("Nur für dich als Besitzer möglich."); return; }
    const doc = { type: "termin", title: g.title, from: iso(o.a), to: iso(o.b), time: g.time || "", endTime: g.endTime || "", repeat: "none", until: "", birthYear: 0, note: "", gcal: g.calId, gEventId: g.gid,
      remindDays: 0, giftDone: [], done: [], startYear: 0, everyWeeks: 8, thanks: false, packlist: [], place: g.note || "", flight: false, kids: false, gReadOnly: true, mOnly: true };
    try { const ref = await COLL("events").add(doc); m = normalize(ref.id, doc); MERK = [...MERK, m]; } catch (err) { toast(writeErr(err)); return; } }
  m.title = g.title; m.time = g.time || ""; m.place = m.place || g.note || ""; m.a = o.a; m.b = o.b;
  showPack(m);
}
// =================== Orte suchen (OpenStreetMap über Photon von komoot) ===================
// Vorschläge beim Tippen im Ortsfeld und – wenn das Ortsfeld leer ist – passend zum Titel („Looms Berlin“).
const STATE_LL = { BW: [48.78, 9.18], BY: [48.14, 11.58], BE: [52.52, 13.40], BB: [52.40, 13.06], HB: [53.08, 8.80], HH: [53.55, 9.99], HE: [50.11, 8.68], MV: [53.63, 11.41], NI: [52.37, 9.74], NW: [51.23, 6.78], RP: [50.00, 8.27], SL: [49.24, 6.99], SN: [51.05, 13.74], ST: [52.13, 11.63], SH: [54.32, 10.14], TH: [50.98, 11.03] };
let osmT = null, osmAbort = null, osmLast = "";
const osmLine = f => { const p = f.properties || {}, street = [p.street, p.housenumber].filter(Boolean).join(" "), city = [p.postcode, p.city || p.town || p.village || p.district].filter(Boolean).join(" ");
  const name = p.name && p.name !== p.street ? p.name : ""; return { name, addr: [street, city].filter(Boolean).join(", "), full: [name, street, city].filter(Boolean).join(", ") }; };
const osmWords = t => String(t).toLowerCase().normalize("NFC").replace(/ä/g, "ae").replace(/ö/g, "oe").replace(/ü/g, "ue").replace(/ß/g, "ss").normalize("NFKD").replace(/[^a-z0-9 ]/g, " ").split(/\s+/).filter(w => w.length > 2);   // Umlaute ausschreiben: „Spät“ ≠ „Späti“
// Dienste, Schichten & Co. brauchen keinen Ort
const NOPLACE_W = /^(früh|spät|nacht|mittel|tag|wochenend)(dienst|schicht)?$|(dienst|schicht|bereitschaft)$|^(frei|ausgleich|homeoffice|home|office|ho|mobil|büro|arbeit|arbeiten|krank|urlaub|ferien|gleitzeit|überstunden|fortbildung|bd|rb|nd|fd|sd|hd)$/i;
const NOPLACE_RE = { test: t => String(t).toLowerCase().split(/[\s\-\/+,.:]+/).some(w => w && NOPLACE_W.test(w)) };
const noPlace = () => { try { return new Set(JSON.parse(store.get("ft-noplace") || "[]")); } catch { return new Set(); } };
const titleNoPlace = t => { const w = String(t).trim().split(/\s+/);
  if (w.length <= 3 && NOPLACE_RE.test(t)) return true;                       // „Spät“, „Frühdienst“, „Nacht BD“
  if (/^[A-ZÄÖÜ0-9]{1,4}$/.test(String(t).trim())) return true;              // Kürzel wie „F“, „S2“, „ND“
  const k = osmKey(t); if (noPlace().has(k) || umgSet().has(umgKey(t))) return true;
  return OCC.filter(o => osmKey(o.ev.title) === k).length >= 4 && w.length <= 2; };   // kurzer Titel, der ständig wiederkommt → Dienst/Schicht
// Abkürzungen ausschreiben, damit „Magdeburg Hbf“ den „Magdeburg Hauptbahnhof“ findet
const osmExpand = t => String(t).replace(/\bhbf\.?(?=[\s,;:)]|$)/gi, "Hauptbahnhof").replace(/\b(bhf|bf)\.?(?=[\s,;:)]|$)/gi, "Bahnhof").replace(/\bflugh\.?(?=\s|$)/gi, "Flughafen").replace(/\bstr\.(?=\s|$)/gi, "Straße").replace(/\bpl\.(?=\s|$)/gi, "Platz").replace(/\bkh\b/gi, "Krankenhaus");
const osmOk = () => ["termin", "trip", "urlaub"].includes($("f-type")?.value);
async function osmSearch(q, fromTitle) {
  const box = $("f-place-sug"); if (!box) return;
  if (!osmOk()) { box.hidden = true; return; }
  q = q.trim(); if (q.length < 3 || q === osmLast) return; osmLast = q;
  if (fromTitle && titleNoPlace(q)) { box.hidden = true; return; }
  if (fromTitle) q = osmExpand(q);
  osmAbort?.abort(); osmAbort = new AbortController();
  const [lat, lon] = STATE_LL[PA] || STATE_LL.BE;
  try {
    const r = await fetch(`https://photon.komoot.io/api/?q=${encodeURIComponent(q)}&lang=de&limit=6&lat=${lat}&lon=${lon}`, { signal: osmAbort.signal });
    const j = await r.json(); let hits = (j.features || []).map(osmLine).filter(h => h.addr);
    if (fromTitle && titleNoPlace(q)) { box.hidden = true; return; }
    if (fromTitle) { const tw = new Set(osmWords(q)); hits = hits.filter(h => h.name && osmWords(h.name).length && osmWords(h.name).every(w => tw.has(w))); }   // nur Orte, deren Name ganz im Titel steht („Looms“ in „Looms Berlin“, nicht „Anna Blume“ bei „Essen mit Anna“)
    const seen = new Set(); hits = hits.filter(h => !seen.has(h.full) && seen.add(h.full)).slice(0, fromTitle ? 3 : 5);
    if (!hits.length || ($("f-place")?.value.trim() && fromTitle)) { box.hidden = true; return; }
    box.innerHTML = `<div class="osm-h">${fromTitle ? "Meinst du diesen Ort?" : "Vorschläge"}</div>${hits.map(h => `<button type="button" data-osm="${esc(h.full)}"><b>${esc(h.name || h.addr)}</b>${h.name ? `<span>${esc(h.addr)}</span>` : ""}</button>`).join("")}<div class="osm-c">Kartendaten © OpenStreetMap-Mitwirkende</div>`;
    box.hidden = false;
  } catch (e) { if (e?.name !== "AbortError") box.hidden = true; }
}
const osmQueue = (q, fromTitle, ms = 450) => { clearTimeout(osmT); osmT = setTimeout(() => osmSearch(q, fromTitle), ms); };
// ---- Mitdenken auch für vorhandene Termine (z. B. aus Google): passende Adresse zum Titel vorschlagen ----
let OSMC = null, osmDead = false;
const osmCache = () => (OSMC ??= (() => { try { return JSON.parse(store.get("ft-osmc2") || "{}"); } catch { return {}; } })());
const osmKey = t => osmWords(t).join(" ");
async function osmFind(title) {
  const k = osmKey(title); if (!k) return []; const C = osmCache(), c = C[k];
  if (c && Date.now() - c.t < 30 * 864e5) return c.h;
  if (osmDead) return [];
  const [lat, lon] = STATE_LL[PA] || STATE_LL.BE;
  title = osmExpand(title); let j; try { j = await (await fetch(`https://photon.komoot.io/api/?q=${encodeURIComponent(title)}&lang=de&limit=6&lat=${lat}&lon=${lon}`)).json(); } catch { osmDead = true; return []; }
  const tw = new Set(osmWords(title)), seen = new Set();
  const h = (j.features || []).map(osmLine).filter(x => x.addr && x.name && osmWords(x.name).length && osmWords(x.name).every(w => tw.has(w))).filter(x => !seen.has(x.full) && seen.add(x.full)).slice(0, 3);
  if (h.length >= 2 && new Set(h.map(x => osmKey(x.name))).size === 1 && osmWords(h[0].name).length >= tw.size) h.length = 0;   // „Späti“ an drei Ecken → Gattungsname, kein Ort
  C[k] = { t: Date.now(), h }; const ks = Object.keys(C); if (ks.length > 400) ks.slice(0, ks.length - 400).forEach(x => delete C[x]);
  store.set("ft-osmc2", JSON.stringify(C)); return h;
}
const placeCand = o => { const e = o.ev; if (e.shared || !["google", "termin", "trip", "urlaub"].includes(e.type) || placeOf(e)) return false;
  return !/geburtstag|birthday|urlaub|ferien/i.test(e.title) && osmWords(e.title).length > 0 && !titleNoPlace(e.title); };
const placeHint = o => { if (!placeCand(o)) return ""; const c = osmCache()[osmKey(o.ev.title)]; return c && c.h.length ? ` <span class="pin" title="Ortsvorschlag – antippen zum Übernehmen">📍</span>` : ""; };
async function fillPlaceSug(o) {
  const box = $("place-sug"); if (!box) return; const h = await osmFind(o.ev.title).catch(() => []);
  if (!h.length || !$("place-sug") || sheetCtx?.id !== o.ev.id) return;
  box.innerHTML = `<div class="osm-sug"><div class="osm-h">Meinst du diesen Ort?</div>${h.map(x => `<button type="button" data-placeset="${esc(x.full)}"><b>${esc(x.name)}</b><span>${esc(x.addr)}</span></button>`).join("")}<button type="button" class="osm-no" data-placeno="${esc(osmKey(o.ev.title))}">Kein Ort nötig – nicht mehr fragen</button><div class="osm-c">Kartendaten © OpenStreetMap-Mitwirkende</div></div>`;
  box.hidden = false;
}
async function setPlace(o, addr) {
  const e = o.ev;
  try {
    if (e.type === "google") {
      const cal = gCals.find(c => c.id === e.calId || (e.calId === "primary" && c.primary)), canW = !!mcp && gWritable() && (!cal?.accessRole || ["owner", "writer"].includes(cal.accessRole));
      let ok = false;
      if (canW) { try { const inp = { eventId: e.gid, location: addr }; if (e.calId !== "primary") inp.calendarId = e.calId; await mcp.callTool(GSERVER, "update_event", inp); ok = true; mcp.invalidate(GSERVER, "list_events").catch(() => {}); } catch {} }
      const G = gPlace(); G[e.gid] = addr; try { localStorage.setItem("ft-gplace", JSON.stringify(G)); } catch {}
      e.note = addr; toast(ok ? "Ort in Google eingetragen" : "Ort gemerkt – in Google selbst ist er nicht änderbar");
    } else { await COLL("events").doc(e.id).update({ place: addr }); e.place = addr; toast("Ort eingetragen"); }
    renderAll(); const o2 = findOcc(e.id, iso(o.a)) || o; e.type === "google" ? showGoogleEvent(o2) : showEvent(o2);
  } catch (err) { toast(writeErr(err)); }
}
// Für die nächsten 14 Tage im Hintergrund nachsehen (wenige Abfragen pro Tag, jeder Titel nur einmal)
let osmBgT = null, osmBgRun = false;
function osmPrefetch() { clearTimeout(osmBgT); osmBgT = setTimeout(async () => {
  if (osmBgRun || osmDead || document.hidden) return; osmBgRun = true;
  try {
    let B = {}; try { B = JSON.parse(store.get("ft-osmb") || "{}"); } catch {}
    if (B.d !== iso(TODAY)) B = { d: iso(TODAY), n: 0 };
    const todo = [...new Set(OCC.filter(o => dayDiff(TODAY, o.a) >= 0 && dayDiff(TODAY, o.a) <= 14 && placeCand(o)).map(o => o.ev.title))].filter(t => !osmCache()[osmKey(t)]);
    let found = false;
    for (const t of todo) { if (B.n >= 15 || osmDead) break; B.n++; store.set("ft-osmb", JSON.stringify(B)); if ((await osmFind(t)).length) found = true; await new Promise(r => setTimeout(r, 1200)); }
    if (found) renderUp();
  } finally { osmBgRun = false; }
}, 4000); }

// =================== Dokumente: Tickets, PDFs, Bilder (privat, in Stücken gespeichert) ===================
const FILE_MAX = 5e6, CHUNK = 180000, FILECACHE = new Map(), PDF_MAX_PAGES = 30, PDF_AI_PAGES = 3;
const RL = e => { if (e?.reason === "plan") { setTimeout(() => showLimit(e), 450); return e.message; } return e?.code === "rate_limited" && /limit|aufgebraucht/i.test(e?.message || "") ? e.message : "Gerade zu viele Anfragen. Versuch es gleich noch einmal."; };
async function pdfTooLong(f) {
  if (!(f.type === "application/pdf" || /\.pdf$/i.test(f.name || ""))) return 0;
  try { const lib = await loadPdfJs(), d = await lib.getDocument({ data: new Uint8Array(await f.arrayBuffer()) }).promise, n = d.numPages; d.destroy?.(); return n > PDF_MAX_PAGES ? n : 0; } catch { return 0; }
}
const isPdfF = f => f.type === "application/pdf";
const fSize = n => n > 1e6 ? (n / 1e6).toFixed(1).replace(".", ",") + " MB" : Math.max(1, Math.round(n / 1e3)) + " KB";
function fb64(buf) { let s = ""; const u = new Uint8Array(buf); for (let i = 0; i < u.length; i += 0x8000) s += String.fromCharCode.apply(null, u.subarray(i, i + 0x8000)); return btoa(s); }
function funb64(s) { const bin = atob(s), u = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i); return u; }
async function shrinkImg(file, max = 2000, q = 0.85) {
  const bmp = await createImageBitmap(file), k = Math.min(1, max / Math.max(bmp.width, bmp.height));
  const c = document.createElement("canvas"); c.width = Math.round(bmp.width * k); c.height = Math.round(bmp.height * k);
  const x = c.getContext("2d"); x.fillStyle = "#fff"; x.fillRect(0, 0, c.width, c.height); x.drawImage(bmp, 0, 0, c.width, c.height);
  return await new Promise((res, rej) => c.toBlob(b => b ? res(b) : rej(0), "image/jpeg", q));
}
function docsBox(e) {
  const fs = e.files || []; if (!fs.length && !canWrite) return "";
  return `<div class="docs"><div class="docs-h"><b>Dokumente</b><span class="note">Tickets, Buchungen, PDFs · nur für dich</span></div>
    ${fs.length ? `<div class="docs-l">${fs.map(f => `<button type="button" class="doc" data-doc="${esc(e.id)}|${esc(f.id)}"><span>${isPdfF(f) ? "📄" : "🖼️"}</span><span class="doc-n">${esc(f.name)}</span><small>${fSize(f.size)}</small></button>`).join("")}</div>` : ""}
    <div class="btnrow" style="margin-top:8px">${canWrite ? `<label class="btn ghost small">📎 Datei hinzufügen<input type="file" hidden multiple accept="application/pdf,image/*" data-docadd="${esc(e.id)}"></label>` : ""}
    ${fs.length && sample && canWrite ? `<button type="button" class="btn ghost small" data-docai="${esc(e.id)}">✨ Auswerten</button>` : ""}</div>
    <div class="note" id="doc-msg"></div></div>`;
}
async function docUpload(e, fs) {
  use("dokument");
  const msg = $("doc-msg"), say = t => { const m = $("doc-msg"); if (m) m.textContent = t; };
  let ok = 0;
  for (const file of fs) {
    try {
      const pdf = file.type === "application/pdf" || /\.pdf$/i.test(file.name || "");
      if (!pdf && !/^image\//.test(file.type)) { toast(`„${file.name}“: nur PDFs und Bilder`); continue; }
      say(`Speichere „${file.name}“ …`);
      const blob = pdf ? file : await shrinkImg(file).catch(() => file);
      if (blob.size > FILE_MAX) { toast(`„${file.name}“ ist zu groß (max. 5 MB)`); continue; }
      if (pdf) { const n = await pdfTooLong(file); if (n) { toast(`„${file.name}“ hat ${n} Seiten – bitte nur die wichtigen Seiten hochladen (max. ${PDF_MAX_PAGES})`); continue; } }
      const s = fb64(await blob.arrayBuffer()), n = Math.ceil(s.length / CHUNK), id = "f" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
      for (let i = 0; i < n; i++) { if (n > 2) say(`Speichere „${file.name}“ … ${Math.round(i / n * 100)} %`); await COLL("files").doc(`${id}_${i}`).set({ d: s.slice(i * CHUNK, (i + 1) * CHUNK), ev: e.id }); }
      let name = file.name || (pdf ? "Dokument.pdf" : "Bild.jpg"); if (!pdf && blob !== file) name = name.replace(/\.[^.]+$/, "") + ".jpg";
      const meta = { id, name, type: pdf ? "application/pdf" : (blob.type || "image/jpeg"), size: blob.size, n, at: new Date().toISOString() };
      const cur = EV.find(x => x.id === e.id) || e; cur.files = [...(cur.files || []), meta]; e = cur;
      await COLL("events").doc(e.id).update({ files: cur.files }); FILECACHE.set(id, blob); ok++;
      COLL("docs").doc(id).set({ ...meta, ev: e.id, evTitle: e.title, evDate: e.from || iso(e.a) }).catch(() => {});
    } catch (err) { toast(writeErr(err)); }
  }
  if (!ok) { say(""); return; }
  toast(ok > 1 ? `${ok} Dokumente gespeichert` : "Dokument gespeichert");
  if (sample && canWrite) docAnalyze(e); else { const o = findOcc(e.id, iso(e.a)); if (o && sheetMode === "event") showEvent(o); }
}
async function fileBlob(f) {
  if (FILECACHE.has(f.id)) return FILECACHE.get(f.id);
  const parts = await Promise.all(Array.from({ length: f.n }, (_, i) => COLL("files").doc(`${f.id}_${i}`).get()));
  if (parts.some(d => !d.exists)) throw new Error("missing");
  const b = new Blob([funb64(parts.map(d => d.data().d).join(""))], { type: f.type }); FILECACHE.set(f.id, b); return b;
}
let PDFJS = null;
function loadPdfJs() {
  if (PDFJS) return PDFJS;
  const base = APP ? "/app/vendor/pdfjs/" : "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/", ld = src => new Promise((res, rej) => { const s = document.createElement("script"); s.src = src; s.onload = res; s.onerror = rej; document.head.appendChild(s); });
  PDFJS = ld(base + "pdf.min.js").then(() => ld(base + "pdf.worker.min.js")).then(() => { window.pdfjsLib.GlobalWorkerOptions.workerSrc = base + "pdf.worker.min.js"; return window.pdfjsLib; })
    .catch(err => { PDFJS = null; throw err; });
  return PDFJS;
}
async function pdfPages(blob, max, scale, onPage) {
  const lib = await loadPdfJs(), pdf = await lib.getDocument({ data: new Uint8Array(await blob.arrayBuffer()) }).promise, out = [];
  for (let i = 1; i <= Math.min(pdf.numPages, max); i++) {
    const pg = await pdf.getPage(i), vp = pg.getViewport({ scale }), c = document.createElement("canvas");
    c.width = Math.round(vp.width); c.height = Math.round(vp.height);
    await pg.render({ canvasContext: c.getContext("2d"), viewport: vp }).promise;
    let text = ""; try { text = (await pg.getTextContent()).items.map(x => x.str).join(" ").replace(/\s+/g, " ").trim(); } catch {}
    out.push({ c, text }); onPage?.(c);
  }
  return { pages: out, total: pdf.numPages };
}
async function showDoc(e, fid, fromList) {
  const f = (e?.files || []).find(x => x.id === fid) || DOCS.find(x => x.id === fid); if (!f) return;
  const k = `${esc(e?.id || "")}|${esc(f.id)}`, L = docLbl(f);
  openSheet(f.name, `${isPdfF(f) ? "PDF" : "Bild"} · ${fSize(f.size)} · ${L.gone ? "gelöschter Termin " : ""}„${L.title}“${L.date ? " · " + L.date : ""}`, `<div id="doc-view" class="doc-view"><p class="note">Lädt …</p></div>
    <div class="btnrow" style="margin-top:12px"><button type="button" class="btn ghost small" ${fromList || !e ? "data-docsback" : `data-docback="${esc(e.id)}"`}>‹ Zurück</button>
    ${downloads ? `<button type="button" class="btn small" data-docsave="${k}">Speichern / Öffnen</button>` : ""}
    ${canWrite ? `<button type="button" class="btn danger small push" data-docdel="${k}">Löschen</button>` : ""}</div><div class="note" id="doc-msg"></div>`, "doc", { id: e?.id || "", fid, from: fromList || !e ? "list" : "" });
  try {
    const b = await fileBlob(f), v = $("doc-view"); if (!v || sheetCtx?.fid !== fid) return;
    if (!isPdfF(f)) { v.innerHTML = ""; const img = new Image(); img.src = URL.createObjectURL(b); img.alt = f.name; v.appendChild(img); return; }
    v.innerHTML = "";
    const { total } = await pdfPages(b, 12, 1.6, c => { if (sheetCtx?.fid === fid) v.appendChild(c); });
    if (total > 12) v.insertAdjacentHTML("beforeend", `<p class="note">Seite 1–12 von ${total}. Zum Ansehen aller Seiten bitte speichern.</p>`);
  } catch (err) { const v = $("doc-view"); if (v) v.innerHTML = `<p class="note">${isPdfF(f) ? "Die Vorschau konnte nicht geladen werden." : "Das Bild konnte nicht geladen werden."}${downloads ? " Über „Speichern / Öffnen“ kannst du die Datei trotzdem öffnen." : ""}</p>`; }
}
async function docSave(id, fid) {
  const e = EV.find(x => x.id === id), f = e?.files?.find(x => x.id === fid) || DOCS.find(x => x.id === fid), m = $("doc-msg"); if (!f || !downloads) return;
  try { await downloads.save({ filename: f.name, data: await fileBlob(f) }); if (m) m.textContent = "Gespeichert."; }
  catch (err) { if (m) m.textContent = err?.code === "declined" ? "" : "Speichern hat nicht geklappt."; }
}
async function docsRemove(fids) {
  const S = new Set(fids);
  for (const e of EV.filter(e => !e.shared && (e.files || []).some(f => S.has(f.id)))) { e.files = e.files.filter(f => !S.has(f.id)); await COLL("events").doc(e.id).update({ files: e.files }); }
  for (const fid of fids) { const f = DOCS.find(x => x.id === fid) || EV.flatMap(e => e.files || []).find(x => x.id === fid);
    await COLL("docs").doc(fid).delete().catch(() => {});
    if (f) for (let i = 0; i < f.n; i++) COLL("files").doc(`${f.id}_${i}`).delete().catch(() => {});
    FILECACHE.delete(fid); }
}
async function docDelete(id, fid) {
  const e = EV.find(x => x.id === id);
  try { await docsRemove([fid]); toast("Dokument gelöscht"); const o = e && findOcc(id, iso(e.a)); o && sheetCtx?.from !== "list" ? showEvent(o) : showDocs(); }
  catch (err) { toast(writeErr(err)); }
}
// ---- Alle Dokumente (auch von gelöschten Terminen) ----
let DOCS = [], DOCSEL = new Set(), docQ = "", docDelArm = false; const DOCSYNC = new Set();
function docLbl(d) { const e = EV.find(x => x.id === d.ev && !x.shared) || EV.find(x => (x.files || []).some(f => f.id === d.id));
  const title = e?.title || d.evTitle || "ohne Termin", dt = e ? e.a : parseIso(d.evDate);
  return { e, gone: !e, title, date: dt ? fmtY(dt) : "", sort: dt ? +dt : 0 }; }
function docSync() { // Dokumente aus Terminen ins Archiv übernehmen und Titel/Datum aktuell halten
  if (!canWrite) return;
  EV.filter(e => !e.shared && (e.files || []).length).forEach(e => e.files.forEach(f => {
    const d = DOCS.find(x => x.id === f.id), want = { ev: e.id, evTitle: e.title, evDate: e.from || iso(e.a) };
    if (DOCSYNC.has(f.id) || (d && d.evTitle === want.evTitle && d.evDate === want.evDate && d.ev === want.ev)) return;
    DOCSYNC.add(f.id); COLL("docs").doc(f.id).set({ name: f.name, type: f.type, size: f.size, n: f.n, at: f.at || "", ...want }).catch(() => {}).finally(() => DOCSYNC.delete(f.id)); }));
}
function showDocs() {
  const q = docQ.trim().toLowerCase();
  const all = DOCS.map(d => ({ d, L: docLbl(d) })).sort((a, b) => b.L.sort - a.L.sort || String(b.d.at).localeCompare(String(a.d.at)));
  const list = all.filter(x => !q || `${x.d.name} ${x.L.title} ${x.L.date}`.toLowerCase().includes(q));
  DOCSEL = new Set([...DOCSEL].filter(id => DOCS.some(d => d.id === id)));
  const row = ({ d, L }) => `<div class="doc-row"><label class="doc-ck"><input type="checkbox" data-docsel="${esc(d.id)}"${DOCSEL.has(d.id) ? " checked" : ""} aria-label="Auswählen"></label>
    <button type="button" class="doc" data-doc="|${esc(d.id)}"><span>${isPdfF(d) ? "📄" : "🖼️"}</span><span class="doc-n"><b>${esc(L.title)}</b>${L.date ? ` · ${esc(L.date)}` : ""}<small class="doc-s">${esc(d.name)} · ${fSize(d.size)}</small></span></button></div>`;
  const act = list.filter(x => !x.L.gone), gone = list.filter(x => x.L.gone);
  openSheet("Dokumente", "Tickets, Buchungen und PDFs aus deinen Terminen – auch von gelöschten. Nur für dich.", `
    ${DOCS.length > 4 ? `<input type="search" class="search" id="doc-q" placeholder="Suchen: Termin, Datum oder Dateiname" value="${esc(docQ)}" style="margin-top:8px">` : ""}
    ${!DOCS.length ? `<p class="note" style="margin-top:10px">Noch keine Dokumente. Du hängst sie in einem Termin über „📎 Datei hinzufügen“ an.</p>` : ""}
    ${act.length ? `<h3 class="pkh">Zu Terminen</h3><div class="docs-l">${act.map(row).join("")}</div>` : ""}
    ${gone.length ? `<h3 class="pkh">Von gelöschten Terminen</h3><div class="docs-l">${gone.map(row).join("")}</div>` : ""}
    ${DOCS.length && !list.length ? `<p class="note" style="margin-top:10px">Nichts gefunden.</p>` : ""}
    ${list.length && canWrite ? `<div class="btnrow" style="margin-top:12px"><button type="button" class="btn ghost small" id="docs-all">${list.every(x => DOCSEL.has(x.d.id)) ? "Auswahl aufheben" : "Alle auswählen"}</button>
      ${DOCSEL.size ? `<button type="button" class="btn danger small push" id="docs-del">${docDelArm ? `Wirklich ${DOCSEL.size} löschen?` : `${DOCSEL.size} löschen`}</button>` : ""}</div>` : ""}`, "docs");
}
// ---- Auswerten: Packpunkte, Orga-Aufgaben, Zeiten, Adresse aus den Dokumenten ----
let DAI = null;
// ---- Tickets/Buchungen/Links für die KI aufbereiten (vor dem Anlegen eines Eintrags) ----
const URL_RE = /https?:\/\/[^\s<>"']+/g;
async function filesForAI(files, maxImg) {
  const imgs = [], texts = [], long = [];
  for (const f of files.slice(0, 6)) {
    const pdf = f.type === "application/pdf" || /\.pdf$/i.test(f.name || "");
    if (pdf) { const { pages, total } = await pdfPages(f, PDF_AI_PAGES, 1.4).catch(() => ({ pages: [] })); if (total > PDF_AI_PAGES) long.push(`„${f.name}“: ${PDF_AI_PAGES} von ${total} Seiten gelesen`);
      for (const [i, p] of pages.entries()) { if (p.text.length > 120) texts.push(`--- ${f.name}, Seite ${i + 1} ---\n${p.text.slice(0, 5000)}`);
        if ((p.text.length <= 120 || i === 0) && imgs.length < maxImg) imgs.push(await new Promise(r => p.c.toBlob(r, "image/jpeg", 0.8))); } }
    else if (/^image\//.test(f.type) && imgs.length < maxImg) imgs.push(f.size > 3e6 ? await shrinkImg(f, 1600, 0.8) : f);
  }
  return { imgs, texts, long };
}
async function linksForAI(text, say) {
  const urls = [...new Set(String(text).match(URL_RE) || [])].slice(0, 2), texts = [], fails = [];
  if (!urls.length || !window.mkReadLink) return { texts, fails: urls };
  for (const u of urls) { say?.(`Lese den Link ${u.replace(/^https?:\/\//, "").slice(0, 40)} …`);
    try { const r = await window.mkReadLink(u);
      if (r?.ok && r.pdf) { const b = new Blob([funb64(r.pdf)], { type: "application/pdf" }); const { pages } = await pdfPages(b, 3, 1).catch(() => ({ pages: [] })); const t = pages.map(p => p.text).join("\n"); if (t.length > 80) texts.push(`--- Link ${u} (PDF) ---\n${t.slice(0, 9000)}`); else fails.push(u); }
      else if (r?.ok && (r.text || "").length + (r.ld || "").length > 200) texts.push(`--- Link ${r.url || u} ---\nTitel: ${r.title || ""}\n${r.meta || ""}\n${r.ld ? "Strukturierte Daten: " + r.ld + "\n" : ""}${r.text || ""}`.slice(0, 12000));
      else fails.push(u); } catch { fails.push(u); } }
  return { texts, fails };
}
const TRAIN_RULE = `ZÜGE (wichtig, damit die App den Zug live beobachten kann): Zugnummer immer mit Gattung in den Titel schreiben ("RE 4", "ICE 1101", "IC 1934"), place = der Bahnhof, um den es geht, als "Stadt Hbf" bzw. Bahnhofsname (z. B. "Berlin Hbf", "Magdeburg Hbf"), time = die Zeit an genau diesem Bahnhof.
- Jemanden ABHOLEN (abholen, kommt an, holen): type "abholen", pick = {"dir":"arr","mode":"zug"|"flug"|"bus","who":"<Name>","no":"<Zug/Flug>"}, title "<Name> abholen · <Zug>", from = Ankunftstag, time = ANKUNFTSzeit, place = ANKUNFTSbahnhof, note = "Ankunft <Bahnhof> <Zeit> aus <Herkunft>" (+ Gleis/Wagen falls bekannt).
- Jemanden zum Zug BRINGEN (bringen, abliefern, verabschieden): type "abholen", pick = {"dir":"dep",…}, title "<Name> zum Zug bringen · <Zug>", time = ABFAHRTSzeit, place = ABFAHRTSbahnhof, note = "Abfahrt <Bahnhof> <Zeit> nach <Ziel>".
- Eigene Zugfahrt ohne Übernachtung: type "termin", title "<Zug> <Von> → <Nach>", time = Abfahrt, endTime = Ankunft, place = Abfahrtsbahnhof. Mit Übernachtung: Reise wie unten, note beginnt mit "<Zug> ab <Abfahrtsbahnhof> <Zeit>".
- Mehrere Teilstrecken mit Umstieg: der ERSTE Zug in den Titel, alle Teilstrecken kurz in note.
FLÜGE: note immer im Format "<Airline> <Flugnummer falls sichtbar>: <IATA> HH:MM → <IATA> HH:MM" je Teilstrecke, getrennt mit "; " (z. B. "Lufthansa LH 2043: BER 18:55 → MUC 20:05; LH 2420: MUC 21:40 → ARN 23:55"). time = Abflugzeit der ersten Teilstrecke, flight = true, mode = "flug". Keine Flugnummer erfinden.`;
const ATTACH_HINT = `Angehängt sind Tickets, Buchungsbestätigungen oder Links. Lies sie genau und lege daraus den passenden Eintrag an – meist eine Reise (type "trip"): title = Ziel bzw. Hotel/Unterkunft (kurz, z. B. "Hotel VAYA Achensee" oder "München"), from/to = An- und Abreisetag, time = Abfahrts-/Abflugzeit bzw. Check-in, endTime leer, place = vollständige Adresse der Unterkunft/des Ziels NUR wenn sie im Dokument steht, mode = "zug" | "flug" | "bus" | "auto" | "rad" | "" nur wenn eindeutig, flight = true bei Flug, note = das Wichtigste kurz (z. B. "ICE 503 · Wagen 12, Platz 45 · Buchung ABC123"). Konzert-/Theater-/Veranstaltungstickets: type "termin" mit Datum, Einlass/Beginn als time, Ort als place. Hin- und Rückfahrt gehören zu EINER Reise. Nichts erfinden.
${TRAIN_RULE}`;
async function docAnalyze(e) {
  const fs = e.files || []; if (!fs.length || !sample) return;
  openSheet("Dokumente auswerten", `„${e.title}“ · ${fs.length} Dokument${fs.length > 1 ? "e" : ""}`, `<p class="note" id="dai-msg">Ich lese die Dokumente …</p><div id="dai-body"></div>`, "dai", { id: e.id });
  const say = t => { const m = $("dai-msg"); if (m) m.textContent = t; };
  try {
    const lim = await sample.limits().catch(() => null), maxImg = lim?.images?.maxCount || 0, imgs = [], texts = [];
    for (const f of fs.slice(-6)) {
      const b = await fileBlob(f).catch(() => null); if (!b) continue;
      if (isPdfF(f)) { const { pages } = await pdfPages(b, 3, 1.4).catch(() => ({ pages: [] }));
        for (const [i, p] of pages.entries()) {
          if (p.text.length > 120) texts.push(`--- ${f.name}, Seite ${i + 1} ---\n${p.text.slice(0, 5000)}`);
          if ((p.text.length <= 120 || i === 0) && imgs.length < maxImg) imgs.push(await new Promise(r => p.c.toBlob(r, "image/jpeg", 0.8)));
        } }
      else if (imgs.length < maxImg) imgs.push(b.size > 3e6 ? await shrinkImg(b, 1600, 0.8) : b);
    }
    if (!texts.length && !imgs.length) throw 0;
    say("Ich prüfe, was sich daraus für Packliste und Orga ergibt …");
    const r = await (window.MK_TASK = "dokumente", sample.json)(`Hier sind Dokumente (Tickets, Buchungen, Bestätigungen o. Ä.) zu einem Kalendereintrag. ${imgs.length ? `Die ${imgs.length} Bilder sind Fotos/Seiten dieser Dokumente.` : ""}
Eintrag: "${e.title}" (${TYPES[e.type].label}), ${rngTxt(e.a, e.b, true)}${timeTxt(e) ? ", " + timeTxt(e) + " Uhr" : ""}. ${placeOf(e) ? "Ort: " + placeOf(e) + "." : ""} Heute ist ${fmtY(TODAY)}.
${texts.join("\n\n").slice(0, 14000)}
Lies die Dokumente genau. Antworte NUR mit JSON:
{"zusammenfassung": "1–2 kurze Sätze, was das ist, mit den wichtigsten Daten (z. B. „Bahnticket Berlin Hbf → München Hbf, ICE 503, Wagen 12, Platz 45, Buchung ABC123“)",
"zeiten": "wichtige Zeiten, z. B. „Abfahrt 08:12 Berlin Hbf · Check-in ab 15 Uhr“, sonst leer",
"anreise": "auto, zug, bus, rad, flug oder leer – nur wenn eindeutig",
"ort": "vollständige Adresse von Unterkunft/Veranstaltungsort, nur wenn sie genau so im Dokument steht, sonst leer",
"packliste": ["nur Dinge, die sich konkret aus den Dokumenten ergeben, z. B. „Personalausweis (Ticket nur mit Ausweis gültig)“, „BahnCard“, „Ticket ausgedruckt“, „Badesachen (Hotel hat Pool)“, „Abendgarderobe (Dresscode)“ – max. 6"],
"aufgaben": [{"t": "konkrete Orga-Aufgabe, z. B. „Online-Check-in“, „Sitzplatz reservieren“, „Restbetrag zahlen“, „Stornofrist beachten“", "faellig": "YYYY-MM-DD, wenn sich ein Datum ergibt, sonst leer"}]}
Höchstens 5 Aufgaben. Nichts erfinden, nichts Allgemeines. Deutsch.`, { modelTier: "default", images: imgs.length ? imgs : undefined });
    DAI = { id: e.id, r: r || {} }; renderDai();
  } catch (err) { say(err?.code === "rate_limited" ? RL(err) : "Die Dokumente konnten gerade nicht ausgewertet werden."); }
}
function renderDai() {
  const e = EV.find(x => x.id === DAI?.id), r = DAI?.r, body = $("dai-body"); if (!e || !body) return;
  const seen = new Set((e.packlist || []).map(x => x.t.toLowerCase()));
  const pk = (r.packliste || []).map(String).filter(t => t && !seen.has(t.toLowerCase())).slice(0, 6);
  const tk = (r.aufgaben || []).filter(t => t && t.t).slice(0, 5).map(t => ({ t: String(t.t), due: /^\d{4}-\d{2}-\d{2}$/.test(t.faellig || "") ? t.faellig : "" }));
  const md = MODES[r.anreise] && e.type === "trip" && r.anreise !== e.mode ? r.anreise : "";
  const ort = r.ort && !placeOf(e) ? String(r.ort) : "", info = [r.zusammenfassung, r.zeiten].filter(Boolean).map(String).join(" · ");
  DAI.pk = pk; DAI.tk = tk; DAI.md = md; DAI.ort = ort; DAI.info = info;
  const row = (attr, txt, sub) => `<label class="tog setrow pk dai"><input type="checkbox" ${attr} checked><span>${esc(txt)}${sub ? `<small class="muted"> · ${esc(sub)}</small>` : ""}</span></label>`;
  const sec = (h, rows) => rows.length ? `<h3 class="pkh">${h}</h3><div class="gcals">${rows.join("")}</div>` : "";
  const html = (info ? `<div class="dai-info">${esc(info)}</div>` : "") +
    sec("In den Eintrag übernehmen", [info && !(e.note || "").includes(String(r.zusammenfassung || "").slice(0, 30)) ? row('data-dai="note"', "Zusammenfassung in die Notiz") : "", md ? row('data-dai="mode"', "Anreise: " + MODES[md]) : "", ort ? row('data-dai="ort"', "Ort: " + ort) : ""].filter(Boolean)) +
    sec(`Für die ${packLabel(e)}`, pk.map((t, i) => row(`data-daipk="${i}"`, t))) +
    sec("Aufgaben", tk.map((t, i) => row(`data-daitk="${i}"`, t.t, t.due ? "bis " + fmt(parseIso(t.due)) : "")));
  const any = /type="checkbox"/.test(html);
  body.innerHTML = html + (any ? `<div class="btnrow" style="margin-top:12px"><button type="button" class="btn" id="dai-ok">Übernehmen</button><button type="button" class="btn ghost" data-docback="${esc(e.id)}">Abbrechen</button></div>`
    : `<p class="note" style="margin-top:8px">Daraus ergibt sich nichts Zusätzliches für Packliste oder Orga.</p><div class="btnrow" style="margin-top:12px"><button type="button" class="btn ghost" data-docback="${esc(e.id)}">‹ Zurück</button></div>`);
  const m = $("dai-msg"); if (m) m.textContent = any ? "Das habe ich gefunden. Nimm raus, was du nicht brauchst:" : "";
}
async function docApply() {
  const e = EV.find(x => x.id === DAI?.id); if (!e) return;
  const on = sel => !!document.querySelector(`${sel}:checked`), up = {};
  if (DAI.info && on('[data-dai="note"]')) up.note = (e.note ? e.note + "\n" : "") + "📎 " + DAI.info;
  if (DAI.md && on('[data-dai="mode"]')) { up.mode = DAI.md; up.flight = DAI.md === "flug"; }
  if (DAI.ort && on('[data-dai="ort"]')) up.place = DAI.ort;
  const pk = DAI.pk.filter((_, i) => on(`[data-daipk="${i}"]`)).map(t => ({ t, k: "Aus Dokumenten", d: false }));
  if (pk.length) up.packlist = [...pk, ...(e.packlist || [])];
  const tk = DAI.tk.filter((_, i) => on(`[data-daitk="${i}"]`));
  try {
    if (Object.keys(up).length) { await COLL("events").doc(e.id).update(up); Object.assign(e, up); }
    for (const t of tk) await addTask({ title: `${t.t} („${e.title}“)`, due: t.due, ev: e.id });
    const n = pk.length + tk.length + ["note", "mode", "place"].filter(k => k in up).length;
    toast(n ? `${n} Punkt${n > 1 ? "e" : ""} übernommen` : "Nichts übernommen");
    const o = findOcc(e.id, iso(e.a)); o ? showEvent(o) : closeSheet();
  } catch (err) { toast(writeErr(err)); }
}

// =================== Packliste ===================
let packT = null, packEv = null; const PACK_TRIED = new Set(), PACK_NONE = new Set();
// Kurzer Termin (z. B. Essen gehen): nur das Allerwichtigste. Mehrtägige Termine: kompakt. Reisen: volle Liste.
const packShort = e => e.type !== "trip" && dayDiff(e.a, e.b) < 1;
const packLabel = e => e.mOnly ? (packShort(e) ? "Merkliste" : "Packliste") : packShort(e) ? "Mitnehmen" : "Packliste";
const pkRow = (x, i) => `<label class="tog setrow pk"><input type="checkbox" data-pk="${i}"${x.d ? " checked" : ""}${canWrite ? "" : " disabled"}><span>${esc(x.t)}</span>${canWrite ? `<button type="button" class="link del" data-pkdel="${i}" aria-label="Entfernen">✕</button>` : ""}</label>`;
function showPack(e, busy) {
  if (!busy) use("packliste");
  packEv = EV.find(x => x.id === e.id) || (e.mOnly ? e : null) || MERK.find(x => x.id === e.id) || e;
  const list = packEv.packlist || [], cats = [...new Set(list.map(x => x.k || "Sonstiges"))];
  const done = list.filter(x => x.d).length, auto = !list.some(x => x.k !== "Aus Dokumenten") && sample && canWrite && !busy && !PACK_TRIED.has(packEv.id);
  openSheet(`${packLabel(packEv)}: ${packEv.title}`, `${rngTxt(packEv.a, packEv.b, true)}${list.length ? ` · ${done}/${list.length} ${packEv.mOnly && packShort(packEv) ? "erledigt" : "eingepackt"}` : ""}`, `
    ${list.length && auto ? `<p class="note" id="pk-msg" style="margin-top:10px">Ich ergänze die Packliste …</p>` : ""}${list.length ? `<div id="pk-groups">${cats.map(c => `<h3 class="pkh">${esc(c)}</h3><div class="gcals" data-pkgrp="${esc(c)}">${list.map((x, i) => (x.k || "Sonstiges") !== c ? "" : pkRow(x, i)).join("")}</div>`).join("")}</div>`
      : `<p class="note" id="pk-msg" style="margin-top:10px">${sample && canWrite && auto ? (packShort(packEv) ? "Ich überlege, was du mitnehmen solltest …" : "Ich stelle die Packliste zusammen …") : PACK_NONE.has(packEv.id) ? "Für diesen Termin musst du nichts Besonderes mitnehmen. Eigene Punkte kannst du unten ergänzen." : "Noch keine Liste."}</p>`}
    ${placeOf(packEv) ? `<div class="btnrow" style="margin-top:10px">${routeLinks(placeOf(packEv))}</div>` : ""}
    ${canWrite ? `<div class="lbar" style="margin-top:12px"><input type="text" class="search" id="pk-new" placeholder="Eigenen Punkt hinzufügen"><button type="button" class="btn ghost small" id="pk-add">Hinzufügen</button></div>
    ${packEv.files?.length && sample ? `<p class="note" style="margin-top:10px">📎 ${packEv.files.length} Dokument${packEv.files.length > 1 ? "e" : ""} hinterlegt · <button type="button" class="link" data-docai="${esc(packEv.id)}">auf Packpunkte und Orga prüfen</button></p>` : ""}
    ${list.length ? `<div class="btnrow" style="margin-top:8px"><button type="button" class="btn ghost small" id="pk-reset">Alle Haken entfernen</button>${sample ? `<button type="button" class="btn ghost small" id="pk-gen">Neu zusammenstellen</button>` : ""}</div>` : ""}
    ${list.length ? "" : `<div id="pk-err" class="err"></div>`}` : ""}`, "pack", { id: packEv.id });
  if (auto) { PACK_TRIED.add(packEv.id); genPack(); }
}
function savePack(list, now) {
  packEv.packlist = list;
  clearTimeout(packT);
  const go = () => COLL("events").doc(packEv.id).update({ packlist: list }).catch(err => toast(writeErr(err)));
  if (now) go(); else packT = setTimeout(go, 500);
}
async function genPack(replace) {
  const e = packEv, btn = $("pk-gen");
  if (btn) { btn.disabled = true; btn.textContent = "Stellt zusammen …"; }
  try {
    const nights = dayDiff(e.a, e.b), month = MON[e.a.getMonth()], md = modeOf(e);
    if (e.type !== "trip") {
      const short = packShort(e);
      const r = await (window.MK_TASK = "merk-packliste", sample.json)(`${short ? "Was sollte man zu diesem Termin mitnehmen?" : "Was sollte man zu diesem mehrtägigen Termin einpacken?"}
Termin: "${e.title}", ${short ? fmtY(e.a) : `${fmtY(e.a)} bis ${fmtY(e.b)} (${nights} Nächte)`}${timeTxt(e) ? ", " + timeTxt(e) + " Uhr" : ""}, im ${month}. ${placeOf(e) ? "Ort: " + placeOf(e) + "." : ""} ${e.note ? "Notiz: " + e.note : ""}
${short ? `Nenne NUR die 0–4 allerwichtigsten Dinge, die genau für diesen Termin nötig sind und die man leicht vergisst. Beispiele: Arzttermin → Versichertenkarte, Überweisung; Sport → Sportsachen, Wasserflasche; Behörde → Ausweis, Unterlagen; Konzert, Theater, Festival oder Spiel → Ticket, ggf. Ausweis, Powerbank (und falls typisch: "kleine Tasche – oft nur bis A4 erlaubt"); Restaurant oder Treffen mit Freunden → meist nichts (höchstens "Reservierung" oder "Geschenk", wenn es ein Anlass ist). KEINE Selbstverständlichkeiten wie Handy, Schlüssel, Geldbeutel, Jacke. Wenn nichts Besonderes nötig ist: leere Liste.
Antworte NUR mit JSON: {"punkte": ["…"]}` : `Halte die Liste kompakt: 2–4 Kategorien mit je 2–5 Punkten, allgemein formuliert, passend zum Anlass (z. B. Seminar: Unterlagen, Laptop; Hochzeit: Festkleidung, Geschenk). Keine Selbstverständlichkeiten.
Antworte NUR mit JSON: {"kategorien": [{"name": "…", "punkte": ["…"]}]}`} Deutsch.`, { modelTier: "quick" });
      const ai = short ? (r?.punkte || []).slice(0, 4).map(p => ({ t: String(p), k: "Mitnehmen", d: false }))
        : []; if (!short) (r?.kategorien || []).forEach(k => (k.punkte || []).forEach(p => ai.push({ t: String(p), k: String(k.name || "Sonstiges"), d: false })));
      if (!r || (!short && !ai.length)) throw 0;
      const old = replace ? e.packlist.filter(x => x.k === "Eigene" || x.k === "Aus Dokumenten") : e.packlist, seen = new Set(old.map(x => x.t.toLowerCase()));
      const add = ai.filter(x => !seen.has(x.t.toLowerCase()) && seen.add(x.t.toLowerCase()));
      if (!add.length && !old.length) PACK_NONE.add(e.id);
      savePack([...add, ...old], true);
      if (sheetMode === "pack" && !$("sheet").hidden && sheetCtx?.id === e.id) showPack(e, true);
      return;
    }
    const r = await (window.MK_TASK = "packliste", sample.json)(`Erstelle eine kurze, allgemeine Packliste für eine Reise. Der Nutzer soll nicht viel nachdenken müssen: nur das Wichtigste, allgemein formuliert (z. B. "warme Jacke", "Badesachen"), keine Marken, keine Kleinigkeiten wie einzelne Socken.
Reise: "${e.title}", ${fmtY(e.a)} bis ${fmtY(e.b)} (${nights} Nächte), im ${month}. Abfahrt aus ${PROFILE.city || nameA()}.
${placeOf(e) ? `Ziel/Unterkunft: ${placeOf(e)}.` : ""} ${partsTxt(e) ? `Etappen/Unterkünfte: ${partsTxt(e)}.` : ""} ${{ flug: "Anreise mit dem Flugzeug (Handgepäck-Regeln beachten).", zug: "Anreise mit dem Zug: Gepäck muss man selbst tragen, also eher knapp packen; Verpflegung für die Fahrt.", bus: "Anreise mit dem Fernbus: ein Koffer plus kleines Handgepäck; Verpflegung, Nackenkissen.", rad: "Anreise mit dem Fahrrad: alles muss in Packtaschen passen, so leicht wie möglich; Regenkleidung, Radkleidung, Werkzeug.", auto: "Anreise mit dem Auto: Platz ist da; an Unterhaltung und Snacks für die Fahrt denken." }[md] || "Anreise vermutlich mit Auto oder Bahn."} ${withKids(e) ? "Kinder reisen mit." : ""} ${e.note ? "Notiz: " + e.note : ""}
Leite selbst ab, wie das Wetter dort in diesem Monat typischerweise ist und welche Aktivitäten am Ziel wahrscheinlich sind (z. B. Alpen im Winter: Skifahren/Rodeln, Winterwandern; Meer im Sommer: Baden; Berge im Sommer: Wandern; Stadt: Bummeln, Museen; Wellnesshotel: Sauna). Nimm dafür passende Punkte auf und kennzeichne unsichere mit "falls …", z. B. "Ski oder Snowboard (falls Skifahren)".
Antworte NUR mit JSON: {"land": "ISO-Ländercode des Reiseziels in Großbuchstaben, z. B. AT, oder leer", "kategorien": [{"name": "…", "punkte": ["…"]}]} mit 4–7 Kategorien (z. B. Kleidung, Aktivitäten, Hygiene & Gesundheit, Technik, Kinder, Unterwegs), je 3–8 Punkte. Dokumente, Tickets, Maut/Vignette, Einreise und Geburtstage NICHT aufnehmen, die kommen separat. Deutsch.`, { modelTier: "default", cache: false });
    const land = String(r?.land || "").toUpperCase(); if (COUNTRIES[land] && land !== e.country) { e.country = land; COLL("events").doc(e.id).update({ country: land }).catch(() => {}); }
    const base = tripChecks(e, { a: e.a, b: e.b }).filter(([k]) => k !== "Kleidung").map(([k, t]) => ({ t, k, d: false }));
    const ai = []; (r?.kategorien || []).forEach(k => (k.punkte || []).forEach(p => ai.push({ t: String(p), k: String(k.name || "Sonstiges"), d: false })));
    if (!ai.length) throw 0;
    const old = replace ? e.packlist.filter(x => x.k === "Eigene" || x.k === "Aus Dokumenten") : e.packlist, seen = new Set(old.map(x => x.t.toLowerCase()));
    const add = [...base, ...ai].filter(x => !seen.has(x.t.toLowerCase()) && seen.add(x.t.toLowerCase()));
    savePack([...add, ...old], true);
    if (sheetMode === "pack" && !$("sheet").hidden && sheetCtx?.id === e.id) showPack(e, true);
  } catch (err) { const m = $("pk-msg") || $("pk-err"); if (m) m.textContent = err?.code === "rate_limited" ? RL(err) : "Die Packliste konnte gerade nicht erstellt werden. Öffne sie später noch einmal." + (APP && window.mkKiLast ? ` (${window.mkKiLast})` : "");
    if (btn) { btn.disabled = false; btn.textContent = "Neu zusammenstellen"; } }
}

function showIdeas(o) {
  const age = o.ev.birthYear ? o.a.getFullYear() - o.ev.birthYear : 0;
  openSheet(o.ev.type === "birthday" ? `Geburtstag ${o.ev.title}` : o.ev.title, `${fmtY(o.a)}${age ? ` · wird ${age}` : ""}`, `
    <div class="asst"><label class="lbl" for="id-in">Was mag ${esc(o.ev.title)}? Budget? (optional)</label>
    <textarea class="in" id="id-in" rows="2" placeholder="z. B. kocht gern, wandert, Budget ca. 30 €">${esc(o.ev.note)}</textarea>
    <div class="btnrow"><button type="button" class="btn accent" id="id-go" data-for="${esc(o.ev.id)}|${iso(o.a)}">Ideen &amp; Kartentext</button></div>
    <div id="id-out"></div></div>`, "ideas", { id: o.ev.id, a: iso(o.a) });
}
async function runIdeas(id, a) {
  const o = findOcc(id, a); if (!o) return;
  const out = $("id-out"), go = $("id-go"), info = $("id-in").value.trim(), age = o.ev.birthYear ? o.a.getFullYear() - o.ev.birthYear : 0;
  go.disabled = true; go.textContent = "Denkt nach …"; out.innerHTML = "";
  try {
    const occ = o.ev.type === "anniversary" ? `den Jahrestag "${o.ev.title}"${o.ev.startYear ? ` (${o.a.getFullYear() - o.ev.startYear} Jahre)` : ""} am ${fmtY(o.a)}` : `den Geburtstag von "${o.ev.title}" am ${fmtY(o.a)}${age ? ` (wird ${age})` : ""}`;
    const r = await (window.MK_TASK = "hilfe", sample.json)(`${ME()} (${nameA()}) braucht Hilfe für ${occ}.
Infos zur Person: ${info || "keine"}.
Antworte NUR mit JSON: {"ideen": [{"titel": "kurz", "warum": "1 Satz", "preis": "ca. Preis in €"} (5 Stück, konkret und machbar)], "karte": ["kurzer herzlicher Kartentext", "lockerer Kartentext"], "nachricht": "kurze WhatsApp-Glückwunschnachricht"}. Alles auf Deutsch, du-Form.`, { modelTier: "default", cache: false });
    const ideen = Array.isArray(r?.ideen) ? r.ideen : [], karte = Array.isArray(r?.karte) ? r.karte : [];
    out.innerHTML = (ideen.length ? `<h3>Geschenkideen</h3><ul class="sheet-list">${ideen.map(i => `<li><i style="background:var(--event)"></i><div><b>${esc(i.titel)}</b>${i.preis ? ` <span class="note">· ${esc(i.preis)}</span>` : ""}<div class="note">${esc(i.warum || "")}</div></div></li>`).join("")}</ul>` : "") +
      [...karte.map((t, i) => [`Kartentext ${i + 1}`, t]), ...(r?.nachricht ? [["Nachricht", r.nachricht]] : [])].map(([l, t], i) =>
        `<h3>${esc(l)}</h3><textarea class="share-txt" id="id-t${i}" rows="3" readonly>${esc(t)}</textarea><button type="button" class="btn ghost small" data-copy="id-t${i}">Kopieren</button>`).join("");
  } catch (e) { out.innerHTML = `<p class="err">${e?.code === "rate_limited" ? RL(e) : "Das hat nicht geklappt. Versuch es noch einmal."}</p>`; }
  go.disabled = false; go.textContent = "Neue Ideen";
}
function copyField(id, btn) {
  const ta = $(id); const ok = () => { btn.textContent = "Kopiert"; }, fb = () => { ta.focus(); ta.select(); btn.textContent = "Markiert – jetzt kopieren"; };
  try { navigator.clipboard.writeText(ta.value).then(ok, fb); } catch { fb(); }
}

// =================== Neu von anderen (Google) ===================
let NOTIFY = { cals: null, seenAt: "" }, OTHERS = [], othersT = null;
const notifyCals = () => NOTIFY.cals || [];
async function saveNotify(patch) { NOTIFY = { ...NOTIFY, ...patch }; try { await COLL("prefs").doc("notify").set({ cals: NOTIFY.cals || notifyCals(), seenAt: NOTIFY.seenAt || "" }); } catch {} }
async function scanOthers() {
  if (!mcp || gState !== "ok" || !canWrite) { OTHERS = []; renderOthers(); return; }
  if (!gPrimarySummary) { try { const r = await mcp.callTool(GSERVER, "list_events", { pageSize: 1 }, { cache: { staleTime: 3600e3, gcTime: 24 * 3600e3 } }); gPrimarySummary = String(r?.payload?.summary || ""); } catch {} }
  const since = NOTIFY.seenAt || new Date(Date.now() - 14 * 864e5).toISOString();
  const found = [];
  await Promise.all(notifyCals().map(async cal => {
    let token = "", pages = 0;
    do {
      const inp = { startTime: `${iso(addDays(TODAY, -60))}T00:00:00`, endTime: `${iso(addDays(TODAY, 420))}T00:00:00`, pageSize: 250 };
      if (cal !== "primary") inp.calendarId = cal; if (token) inp.pageToken = token;
      try { const r = await mcp.callTool(GSERVER, "list_events", inp, { cache: { staleTime: 10 * 60e3, gcTime: 3600e3 } }); const p = r?.payload || {};
        (p.events || []).forEach(e => { const o = mapG(e, cal); if (!o || !o.ev.creator) return; const nu = o.ev.created > since, ch = !nu && o.ev.updated > since; if (nu || ch) found.push({ o, kind: nu ? "neu" : "geändert" }); });
        token = p.nextPageToken || ""; } catch { token = ""; }
    } while (token && ++pages < 5);
  }));
  const seen = new Set(); OTHERS = found.filter(x => { const k = x.o.ev.gid.split("_")[0] + x.kind; if (seen.has(k)) return false; seen.add(k); return true; })
    .sort((x, y) => (y.o.ev.updated || "").localeCompare(x.o.ev.updated || "")).slice(0, 30);
  OTHERS.forEach(x => gSeen.set(x.o.ev.id, x.o));
  renderOthers();
}
function renderOthers() {
  const box = $("others"); if (!box) return;
  UPN.others = OTHERS.length;
  $("others-list").innerHTML = OTHERS.map(({ o, kind }) => `<button type="button" class="nx" data-gseen="${esc(o.ev.id)}"><span class="when">${fmt(o.a)}</span><span class="what"><span class="ev-dot google" style="background:${o.ev.color}"></span>${esc(o.ev.title)}<small class="note"> · ${esc(kind)} von ${esc(o.ev.creator)} · ${esc(o.ev.cal)}</small></span><span class="tm">${esc(o.ev.time)}</span></button>`).join("");
  const dot = $("g-badge"); if (dot) { dot.hidden = !OTHERS.length; dot.textContent = OTHERS.length; }
  renderUp();
}

// =================== Jahresüberblick ===================
const yn = (v, cls) => v ? `<span class="yes ${cls}">✓</span>` : `<span class="no">–</span>`;
const rng = r => !r ? `<span class="no">–</span>` : rngTxt(r[0], r[1]);
function renderOverview() {
  const y = selYear, yS = new Date(y, 0, 1), yE = new Date(y, 11, 31);
  $("ov-year").textContent = y;
  $("o-prev").disabled = y === YEARS[0]; $("o-next").disabled = y === YEARS[YEARS.length - 1];
  // Gemeinsam frei
  const ws = WINS.filter(w => w.b >= yS && w.a <= yE && w.a <= END);
  $("c-wins").textContent = JOINT.length < 2 ? "Bundesländer wählen" : ws.length === 1 ? "1 Zeitraum" : `${ws.length} Zeiträume`;
  const ms = MONTHS.filter(x => x.y === y), from = new Date(y, ms[0].m, 1), dlist = [];
  for (let t = from; t <= yE; t = addDays(t, 1)) dlist.push(dayOf(t));
  const cell = bg => `<i style="background:var(${bg})"></i>`;
  const winsHint = JOINT.length < 2 ? `<div class="sg shr-box" style="margin:2px 0 10px"><b>Wann habt ihr gemeinsam frei?</b><p class="tip" style="margin:4px 0 8px">Dafür brauche ich mindestens zwei Bundesländer – z. B. deins und das von Partner/in, Kindern oder Großeltern. ${PB ? `Gewählt sind ${esc(stName(PA))} und ${esc(stName(PB))}, aber nicht als „gemeinsam“ markiert.` : `Bisher ist nur ${esc(stName(PA))} eingestellt.`}</p><button type="button" class="btn accent small" id="wins-setup">Bundesländer einstellen</button></div>` : "";
  $("b-wins").innerHTML = winsHint + (ws.length ? `<div class="wins">${ws.map(w => `<div class="win"><b>${winName(w)}</b><span class="mono">${rngTxt(w.a, w.b, w.b.getFullYear() !== y)}</span><span class="len">${dayDiff(w.a, w.b) + 1} Tage am Stück</span></div>`).join("")}</div>` : `<p class="tip">Keine gemeinsamen Zeiträume.</p>`) +
    `<div class="band"><span></span><div class="months">${ms.map(x => `<span>${MON[x.m].slice(0,3)}</span>`).join("")}</div>` +
    `<span class="lab">Ferien ${PA}</span><div class="row">${dlist.map(d => cell(d.fBE ? "--be-strong" : "--line")).join("")}</div>` +
    (PB ? `<span class="lab">Ferien ${PB}</span><div class="row">${dlist.map(d => cell(d.fST ? "--st-strong" : "--line")).join("")}</div>` : "") +
    XST.filter(c => !XHIDE.includes(c)).map(c => `<span class="lab">Ferien ${XNAME[c].length > 14 ? c : XNAME[c]}</span><div class="row">${dlist.map(d => `<i style="background:${FXM[c].has(d.k) ? xColor(c) : "var(--line)"}"></i>`).join("")}</div>`).join("") +
    (JOINT.length >= 2 ? `<span class="lab" style="color:var(--both);font-weight:600">${jointTxt()[0].toUpperCase() + jointTxt().slice(1)}</span><div class="row">${dlist.map(d => cell(winOf(d.dt) ? "--both" : "--line")).join("")}</div>` : "") + `</div>`;
  // Betreuungsplan
  renderCare(); renderBdays(); renderShareBox(); renderStats();
  // Ferien
  const stList = (c, color) => { const ls = FERX[c].filter(([, a, b]) => parseIso(b) >= yS && parseIso(a) <= yE);
    return `<h3><i class="sw" style="display:inline-block;width:10px;height:10px;border-radius:3px;background:${color};margin-right:6px"></i>${stName(c)}${JOINT.length >= 2 && JOINT.includes(c) ? ` <small class="note">· zählt für gemeinsam frei</small>` : ""}</h3>` + (ls.length ? `<div class="scroll"><table>${ls.map(([n, a, b]) => `<tr><td>${esc(n)}</td><td class="date">${rng([parseIso(a), parseIso(b)])}</td></tr>`).join("")}</table></div>` : `<p class="tip">Keine Daten für ${selYear}.</p>`); };
  $("b-ferien").innerHTML = stList(PA, "var(--be-strong)") + (PB ? stList(PB, "var(--st-strong)") : "") + XST.filter(c => !XHIDE.includes(c) || JOINT.includes(c)).map(c => stList(c, xColor(c))).join("") +
    `<p class="note" style="margin-top:8px">Gemeinsame Zeiträume stehen oben unter „Gemeinsam frei“.</p>`;
  // Feiertage & Brückentage
  const hs = [...HOL.values()].filter(h => h.dt >= yS && h.dt <= yE && h.dt >= START).sort((a, b) => a.dt - b.dt);
  const bs = [...BRIDGES.values()].filter(b => b.dt >= yS && b.dt <= yE && b.dt >= START).sort((a, b) => a.dt - b.dt);
  $("b-feiertage").innerHTML = `<div class="scroll"><table><tr><th>Datum</th><th>Feiertag</th><th class="mid">${PA}</th>${PB ? `<th class="mid">${PB}</th>` : ""}</tr>` +
    hs.map(h => `<tr><td class="date">${fmt(h.dt)}</td><td>${h.name}${isWE(h.dt) ? ' <span class="note">· Wochenende</span>' : ""}</td><td class="mid">${yn(h.be,"be")}</td>${PB ? `<td class="mid">${yn(h.st,"st")}</td>` : ""}</tr>`).join("") +
    `</table></div><h3>Brückentage</h3>` + (bs.length ? `<table>${bs.map(b => `<tr><td class="date">${fmt(b.dt)}</td><td>${esc(b.name)}<div class="note">${esc(b.note)}</div></td></tr>`).join("")}</table>` : `<p class="tip">Keine Brückentage.</p>`);
}
// =================== Geburtstage verwalten ===================
function renderBdays() {
  const box = $("b-bday"); if (!box) return;
  const q = ($("bd-q")?.value || "").trim().toLowerCase();
  const all = EV.filter(e => e.type === "birthday").sort((a, b) => (a.a.getMonth() - b.a.getMonth()) || (a.a.getDate() - b.a.getDate()) || a.title.localeCompare(b.title));
  $("c-bday").textContent = dbState === "ready" ? `${all.length}` : "";
  const list = q ? all.filter(e => e.title.toLowerCase().includes(q)) : all;
  const rows = list.map(e => { const age = e.birthYear ? ` · wird ${selYear - e.birthYear}` : "";
    return `<button type="button" class="lr" data-bday="${esc(e.id)}"><span class="dt">${p2(e.a.getDate())}.${p2(e.a.getMonth() + 1)}.</span><span class="n"><span class="ev-dot birthday"></span><span>${esc(e.title)}<small>${esc(age.slice(3) ? age.slice(3) : "")}</small></span></span></button>`; }).join("");
  if (!$("bd-q")) box.innerHTML = `<div class="lbar" style="margin-top:2px"><input type="search" class="search" id="bd-q" placeholder="Name suchen" aria-label="Geburtstag suchen">${canWrite ? `<button type="button" class="btn accent small" id="bd-add">+ Geburtstag</button>` : ""}</div><div id="bd-list"></div>`;
  $("bd-list").innerHTML = rows || `<p class="tip">${dbState === "ready" ? (q ? "Niemand gefunden." : "Noch keine Geburtstage.") : emptyMsg()}</p>`;
}

// =================== Teilen nach Thema ===================
const TOPICS = {
  trip:  { label: "Urlaube & Reisen", test: o => o.ev.type === "trip" || /urlaub|reise/i.test(o.ev.title) },
  late:  { label: "Spätdienste", test: o => /sp(ä|ae)t/i.test(o.ev.title) },
  bday:  { label: "Geburtstage", test: o => o.ev.type === "birthday" || /geburtstag|\bgeb\b/i.test(o.ev.title) },
  custom:{ label: "Eigene Suche", test: (o, q) => q.toLowerCase().split(/\s+/).filter(Boolean).every(w => (o.ev.title + " " + o.ev.note + " " + (o.ev.cal || "")).toLowerCase().includes(w)) }
};
let shTopic = "trip", shPeriod = "year";
function periodRange(p) {
  if (p === "year") return [new Date(selYear, 0, 1), new Date(selYear, 11, 31), String(selYear)];
  if (p === "next3") { const b = addDays(TODAY, 91); return [TODAY, b, `${p2(TODAY.getDate())}.${p2(TODAY.getMonth()+1)}. – ${p2(b.getDate())}.${p2(b.getMonth()+1)}.${b.getFullYear()}`]; }
  return [TODAY, END, `ab ${p2(TODAY.getDate())}.${p2(TODAY.getMonth()+1)}.${TODAY.getFullYear()}`];
}
function renderShareBox() {
  const box = $("b-share"); if (!box) return;
  box.innerHTML = `<div class="ex" style="margin-top:2px">${Object.entries(TOPICS).map(([k, t]) => `<button type="button" data-topic="${k}" class="${k === shTopic ? "on" : ""}">${t.label}</button>`).join("")}</div>
    <div class="form" ${shTopic === "custom" ? "" : "hidden"}><label for="sh-q">Suchbegriff</label><input id="sh-q" type="text" placeholder="z. B. Training, Zahnarzt, Elternabend" value="${esc($("sh-q")?.value || "")}"></div>
    <div class="form"><label for="sh-p">Zeitraum</label><select id="sh-p">
      <option value="year"${shPeriod === "year" ? " selected" : ""}>Jahr ${selYear}</option>
      <option value="next3"${shPeriod === "next3" ? " selected" : ""}>Nächste 3 Monate</option>
      <option value="future"${shPeriod === "future" ? " selected" : ""}>Alles ab heute</option></select></div>
    <button type="button" class="btn accent wide" id="sh-go">Vorschau &amp; teilen</button>
    <p class="note" style="margin-top:8px">Enthält eigene Termine und angezeigte Google-Termine.</p>`;
}
function shareTopic(topic, q, period) {
  const t = TOPICS[topic], [a, b, plabel] = periodRange(period);
  let list = OCC.filter(o => o.b >= a && o.a <= b && !o.part && t.test(o, q || "")); if (topic === "bday") list = dedupeBdays(list);
  list.sort((x, y) => x.a - y.a);
  const title = topic === "custom" ? (q || "Termine") : t.label;
  const showName = topic !== "mina" && topic !== "late";
  const line = o => { const nm = topic === "bday" ? o.ev.title + (ageTxt(o) ? ` (${o.a.getFullYear() - o.ev.birthYear})` : "") : evName(o.ev);
    return { l: rngTxt(o.a, o.b, o.b.getFullYear() !== o.a.getFullYear()) + (o.ev.time ? ` ${o.ev.time}` : ""), r: "", n: [showName ? nm : "", o.ev.type === "info" ? "" : o.ev.note].filter(Boolean).join(" · ") }; };
  const rows = list.map(line);
  const cnt = `${list.length} ${topic === "late" ? (list.length === 1 ? "Dienst" : "Dienste") : topic === "bday" ? "Geburtstag" + (list.length === 1 ? "" : "e") : list.length === 1 ? "Termin" : "Termine"}`;
  const text = `${title} – ${plabel} (${cnt})\n` + (list.length ? list.map(o => { const r = line(o); return `• ${r.l}${r.n ? " – " + r.n : ""}`; }).join("\n") : "(keine Termine)");
  if (!list.length) { toast(`Keine Termine für „${title}“ im Zeitraum`); return; }
  showShare(`${title} ${plabel}`, { kicker: `${plabel} · ${cnt}`, title, rows, footer: `Stand ${p2(TODAY.getDate())}.${p2(TODAY.getMonth()+1)}.${TODAY.getFullYear()}` }, text,
    `${title}-${plabel}`.toLowerCase().replace(/[^\wäöüß-]+/g, "-"));
}

// =================== Statistik ===================
// Derselbe Geburtstag kann aus Mein Kalender, Familie und Google kommen → nur einmal zählen
const bdKey = o => String(o.ev.title).toLowerCase().replace(/geburtstag(\s+von)?|birthday|\bgeb\.?\b|['’]s|\(.*?\)|[^a-zäöüß ]/g, " ").trim().split(/\s+/).filter(w => w.length > 1).slice(0, 2).join(" ") + "|" + iso(o.a);
function dedupeBdays(list) { const m = new Map(); list.forEach(o => { const k = bdKey(o), cur = m.get(k); if (!cur || (cur.ev.type !== "birthday" && o.ev.type === "birthday")) m.set(k, o); }); return [...m.values()]; }
// Fun Facts & wiederkehrende Termine fürs Jahr – jeweils mit der Liste dahinter (antippbar)
function funFacts(y) {
  const yS = new Date(y, 0, 1), yE = new Date(y, 11, 31), occ = OCC.filter(o => o.a >= yS && o.a <= yE && !o.part && !["birthday", "info", "anniversary", "contact"].includes(o.ev.type) && !/geburtstag/i.test(o.ev.title) && !isUmg(o));
  const F = [], byDay = new Map(), wd = Array.from({ length: 7 }, () => []), titles = new Map(), places = new Map();
  occ.forEach(o => { const k = iso(o.a); (byDay.get(k) || byDay.set(k, []).get(k)).push(o); wd[o.a.getDay()].push(o);
    const t = shortName(o.ev).trim(); if (t) (titles.get(t) || titles.set(t, []).get(t)).push(o);
    const pl = (o.ev.place || o.ev.location || "").split(",")[0].trim(); if (pl) (places.get(pl) || places.set(pl, []).get(pl)).push(o); });
  const top = m => [...m.entries()].sort((a, b) => b[1].length - a[1].length)[0];
  const rep = [...titles.entries()].filter(([, l]) => l.length >= 4).sort((a, b) => b[1].length - a[1].length).slice(0, 4)
    .map(([t, l]) => ({ k: "rep", n: `${l.length}×`, l: t, sub: "im Kalender", list: l, title: `„${t}“ in ${y}` }));
  const busiest = top(byDay); if (busiest && busiest[1].length >= 3) F.push({ k: "busy", n: busiest[1].length, l: "Termine an einem Tag", sub: `vollster Tag · ${fmt(parseIso(busiest[0]))}`, day: busiest[0] });
  if (occ.length >= 10) { const i = wd.findIndex(l => l.length === Math.max(...wd.map(x => x.length))); F.push({ k: "wd", n: `${Math.round(wd[i].length / occ.length * 100)} %`, l: `am ${WDL[i]}`, sub: "dein Termin-Wochentag", list: wd[i], title: `Termine an ${WDL[i]}en ${y}` }); }
  const tp = top(places); if (tp && tp[1].length >= 2) F.push({ k: "place", n: `${tp[1].length}×`, l: tp[0], sub: "Lieblingsort", list: tp[1], title: `${tp[0]} in ${y}` });
  const end = y === TODAY.getFullYear() ? TODAY : yE, first = occ.reduce((m, o) => o.a < m ? o.a : m, end); let run = 0, best = 0, bestEnd = null;
  for (let t = first; t <= end; t = addDays(t, 1)) { if (byDay.has(iso(t))) run = 0; else { run++; if (run > best) { best = run; bestEnd = t; } } }
  if (best >= 5) F.push({ k: "pause", n: best, l: "Tage Pause", sub: `längste ohne Termin · ${fmt(addDays(bestEnd, 1 - best))} – ${fmt(bestEnd)}`, day: iso(addDays(bestEnd, 1 - best)) });
  const bd = dedupeBdays(OCC.filter(o => o.a >= yS && o.a <= yE && (o.ev.type === "birthday" || /geburtstag/i.test(o.ev.title)))), bm = Array.from({ length: 12 }, () => []); bd.forEach(o => bm[o.a.getMonth()].push(o));
  if (bd.length >= 4) { const i = bm.findIndex(l => l.length === Math.max(...bm.map(x => x.length))); F.push({ k: "bdm", n: bm[i].length, l: `Geburtstage im ${MON[i]}`, sub: "Geburtstags-Hochsaison", list: bm[i], title: `Geburtstage im ${MON[i]} ${y}` }); }
  if (y === TODAY.getFullYear()) { const p = Math.round(dayDiff(yS, TODAY) / (dayDiff(yS, yE) + 1) * 100), left = occ.filter(o => o.a > TODAY);
    F.push({ k: "left", n: `${p} %`, l: `von ${y} geschafft`, sub: left.length ? `noch ${left.length} Termine bis Silvester` : "keine Termine mehr bis Silvester", list: left, title: `Noch bis Silvester` }); }
  return { facts: F, rep };
}
let statsOpen = false;
function computeStats(y) {
  const yS = new Date(y, 0, 1), yE = new Date(y, 11, 31), occ = OCC.filter(o => o.b >= yS && o.a <= yE);
  const busy = o => !["birthday", "info", "anniversary", "contact"].includes(o.ev.type) && !/geburtstag|\bgeb\b/i.test(o.ev.title);
  const daysOf = (list) => { const set = new Set(); list.forEach(o => { for (let t = o.a < yS ? yS : o.a; t <= o.b && t <= yE; t = addDays(t, 1)) set.add(iso(t)); }); return set; };
  const late = occ.filter(o => /sp(ä|ae)t/i.test(o.ev.title));
  const mina = occ.filter(isUmg);
  const vac = occ.filter(isMyVac), vacCand = occ.filter(isVacCand);
  const vacDays = daysOf(vac); let vacWork = 0;
  vacDays.forEach(k => { const d = parseIso(k), h = HOL.get(k); if (!isWE(d) && !(h && h.be)) vacWork++; });
  const busySet = daysOf(occ.filter(busy));
  const freeWE = [], allWE = [];
  for (let t = nthSunday(y, 0, 1); t <= yE; t = addDays(t, 7)) { const sa = addDays(t, -1); if (sa < yS || sa < START) continue; allWE.push(sa); if (!busySet.has(iso(sa)) && !busySet.has(iso(t))) freeWE.push(sa); }
  const perMonth = Array(12).fill(0); occ.filter(busy).forEach(o => { if (o.a >= yS) perMonth[o.a.getMonth()]++; });
  const bdays = dedupeBdays(occ.filter(o => o.ev.type === "birthday" || (o.ev.type === "google" && /geburtstag|birthday/i.test(o.ev.title)))), round = bdays.filter(o => o.ev.birthYear && isRoundAge(y - o.ev.birthYear));
  const holL = [...HOL.values()].filter(h => h.dt >= yS && h.dt <= yE && h.dt >= START && h.be && !isWE(h.dt)).sort((a, b) => a.dt - b.dt), hol = holL.length;
  // Urlaub als zusammenhängende Zeiträume
  const runs = []; [...vacDays].sort().forEach(k => { const d = parseIso(k), r = runs[runs.length - 1];
    if (r && sameDay(addDays(r.b, 1), d)) r.b = d; else runs.push({ a: d, b: d }); });
  runs.forEach(r => { r.work = 0; for (let t = r.a; t <= r.b; t = addDays(t, 1)) { const h = HOL.get(iso(t)); if (!isWE(t) && !(h && h.be)) r.work++; }
    r.days = dayDiff(r.a, r.b) + 1; r.names = [...new Set(vac.filter(o => o.b >= r.a && o.a <= r.b).map(o => evName(o.ev)))]; });
  return { y, lists: { total: occ.filter(busy), late, mina, bdays, holL, runs, vacCand }, vacTxt: o => { let n = 0; for (let t = o.a < yS ? yS : o.a; t <= o.b && t <= yE; t = addDays(t, 1)) { const h = HOL.get(iso(t)); if (!isWE(t) && !(h && h.be)) n++; } return n; }, late: daysOf(late).size, mina: mina.length, kidDays: daysOf(mina).size, vacDays: vacDays.size, vacWork, freeWE, allWE: allWE.length, perMonth, bdays: bdays.length, round, hol,
    total: occ.filter(busy).length, nextFree: freeWE.filter(d => d >= TODAY).slice(0, 4) };
}
function renderStats() {
  const box = $("b-stats"); if (!box) return;
  $("c-stats").textContent = String(selYear);
  if (!statsOpen) return;
  const S = computeStats(selYear), max = Math.max(1, ...S.perMonth), rest = REMP.vacation - S.vacWork;
  const tile = (n, l, sub, k) => `<div class="tile${k ? " click" : ""}"${k ? ` data-stat="${k}" role="button" tabindex="0"` : ""}><b>${n}</b><span>${l}</span>${sub ? `<small>${sub}</small>` : ""}</div>`;
  const FF = funFacts(selYear); STATX = new Map(); let xi = 0;
  const xt = f => { const k = "x" + (xi++); STATX.set(k, f); return tile(esc(String(f.n)), esc(f.l), esc(f.sub || ""), k); };
  const runs = S.lists.runs;
  box.innerHTML = `<div class="tiles">
      ${runs.length ? tile(runs.length, runs.length === 1 ? "Reise" : "Reisen", "Urlaube & Reisen", "away") : ""}
      ${S.vacDays ? tile(S.vacDays, "Reisetage", "insgesamt unterwegs", "away") : ""}
      ${S.late ? tile(S.late, "Spätdienste", "Tage", "late") : ""}
      ${FF.rep.filter(r => !/^sp(ä|ae)t/i.test(r.l)).map(xt).join("")}
      ${S.bdays ? tile(S.bdays, "Geburtstage", S.round.length ? `${S.round.length} runde` : "", "bdays") : ""}
      ${tile(S.hol, "Feiertage (Werktag)", nameA(), "hol")}
    </div>
    ${FF.facts.length ? `<h3>Fun Facts ${selYear}</h3><div class="tiles facts">${FF.facts.map(xt).join("")}</div>` : ""}
    <h3>Termine pro Monat</h3>
    <div class="bars">${S.perMonth.map((n, i) => `<div class="bar-c" title="${MON[i]}: ${n}"><div class="bar-v" style="height:${Math.round(n / max * 100)}%"></div><span>${MON[i].slice(0, 1)}</span><em>${n || ""}</em></div>`).join("")}</div>
    ${S.round.length ? `<h3>Runde Geburtstage</h3><p class="tip" style="color:var(--fg)">${S.round.map(o => `${esc(o.ev.title)} (${selYear - o.ev.birthYear}) am ${fmt(o.a)}`).join(" · ")}</p>` : ""}
    ${sample ? `<button type="button" class="btn ghost small" id="st-ai" style="margin-top:10px">Jahresrückblick schreiben</button><div id="st-out"></div>` : ""}
    <p class="note" style="margin-top:8px">Zählt eigene und eingeblendete Google-Termine, auch geplante. Spätdienste = Titel mit „Spät“. Reisen = deine Reisen und Urlaubs-Einträge, aus Google nur dein eigener Kalender. Alle Kacheln lassen sich antippen.</p>`;
}
let STATX = new Map();
function showStat(k) {
  const S = computeStats(selYear), L = S.lists, y = selYear;
  const X = STATX.get(k); if (X) { if (X.day && !X.list) { showDay(parseIso(X.day)); return; }
    const occList0 = list => list.length ? `<div class="evlist">${list.slice().sort((a, b) => a.a - b.a).map(o => occBtn(o, true)).join("")}</div>` : `<p class="tip">Keine Einträge.</p>`;
    openSheet(X.title || X.l, `${X.n} · ${X.sub || ""}`, `<div class="statlist">${occList0(X.list || [])}</div>`, "stat"); return; }
  const occList = list => list.length ? `<div class="evlist">${list.slice().sort((a, b) => a.a - b.a).map(o => occBtn(o, true)).join("")}</div>` : `<p class="tip">Keine Einträge.</p>`;
  const dayRow = (dt, label, sub) => `<button type="button" class="lr" data-day="${iso(dt)}"><span class="dt">${label}</span><span class="n"><span>${esc(sub || "")}</span></span></button>`;
  const runList = (useWork) => S.lists.runs.length ? S.lists.runs.map(r => `<button type="button" class="lr" data-day="${iso(r.a)}"><span class="dt">${rngTxt(r.a, r.b)}</span><span class="n"><span>${esc(r.names.join(", "))}<small>${useWork ? `${r.work} Urlaubstag${r.work === 1 ? "" : "e"} · ${r.days} Tage gesamt` : `${r.days} Tage · davon ${r.work} Werktage`}</small></span></span></button>`).join("") : `<p class="tip">Keine Urlaube oder Reisen.</p>`;
  const vacPick = S => { const c = S.lists.vacCand.slice().sort((a, b) => a.a - b.a); if (!c.length) return "";
    return `<h3 style="margin-top:14px">Was zählt als dein Urlaub?</h3><div class="vacpick">${c.map(o => { const k = vacKey(o), on = isMyVac(o);
      const src = o.ev.type === "google" ? `Google · ${o.ev.cal}${o.ev.creator ? ` · von ${o.ev.creator}` : ""}` : TYPES[o.ev.type]?.label || "";
      return `<label class="vp"><input type="checkbox" data-vac="${esc(k)}"${on ? " checked" : ""}><span><b>${esc(evName(o.ev))}</b><small>${rngTxt(o.a, o.b)} · ${S.vacTxt(o)} Werktage · ${esc(src)}</small></span></label>`; }).join("")}</div>
      <p class="note" style="margin-top:6px">Automatisch gezählt: deine Reisen und Einträge mit „Urlaub“, aus Google nur aus deinem eigenen Kalender und nur, was du selbst eingetragen hast. Häkchen ändern gilt für den ganzen Eintrag.</p>`; };
  const M = {
    total: ["Termine", `${S.total} in ${y}, ohne Geburtstage`, () => occList(L.total)],
    late: ["Spätdienste", `${S.late} Tage in ${y}`, () => occList(L.late)],
    mina: ["Umgang", `${S.mina} Termine · ${S.kidDays} Tage`, () => occList(L.mina)],
    vac: ["Urlaubstage", `${S.vacWork} Tage ohne Wochenenden und Feiertage (${nameA()})`, () => runList(true) + vacPick(S)],
    away: ["Reisen", `${S.lists.runs.length} Reisen · ${S.vacDays} Tage unterwegs`, () => runList(false) + vacPick(S)],
    freewe: ["Freie Wochenenden", `${S.freeWE.length} von ${S.allWE} ohne Termine`, () => S.freeWE.length ? S.freeWE.map(d => dayRow(d, `${WDL[6].slice(0, 2)} ${fmt(d)} – ${WDL[0].slice(0, 2)} ${fmt(addDays(d, 1))}`, d < TODAY ? "vorbei" : "")).join("") : `<p class="tip">Keine freien Wochenenden.</p>`],
    bdays: ["Geburtstage", `${S.bdays} in ${y}`, () => occList(L.bdays)],
    hol: ["Feiertage an Werktagen", `${S.hol} in ${nameA()}`, () => L.holL.length ? L.holL.map(h => dayRow(h.dt, `${WDL[h.dt.getDay()].slice(0, 2)} ${fmt(h.dt)}`, h.name)).join("") : `<p class="tip">Keine.</p>`]
  };
  const m = M[k]; if (!m) return;
  openSheet(`${m[0]} ${y}`, m[1], `<div class="statlist">${m[2]()}</div>`, "stat");
}
let REVIEW = "";
async function runReview() {
  use("jahresrueckblick");
  const S = computeStats(selYear), FF = funFacts(selYear), btn = $("st-ai"), out = $("st-out"), y = selYear, cy = TODAY.getFullYear();
  btn.disabled = true; btn.textContent = "Schreibt …";
  const when = d => y < cy || d < TODAY ? "vorbei" : sameDay(d, TODAY) ? "heute" : "kommt noch";
  const runs = S.lists.runs.map(r => `${r.names.join("/")} (${fmt(r.a)}–${fmt(r.b)}, ${r.days} Tage, ${when(r.a)})`);
  const evs = OCC.filter(o => o.a.getFullYear() === y && !o.part && ["trip", "termin", "urlaub", "google"].includes(o.ev.type) && !/sp(ä|ae)t/i.test(o.ev.title) && !/geburtstag/i.test(o.ev.title));
  const pick = list => list.slice(0, 40).map(o => `${fmt(o.a)} ${shortName(o.ev)}`);
  const past = evs.filter(o => o.a < TODAY), fut = evs.filter(o => o.a >= TODAY);
  const facts = [...FF.facts, ...FF.rep].map(f => `${f.l}: ${f.n}${f.sub ? " (" + f.sub + ")" : ""}`);
  const stand = y < cy ? `Das Jahr ${y} ist vorbei – alles ist Rückblick.` : y > cy ? `Das Jahr ${y} liegt komplett in der Zukunft – alles ist Vorschau.` : `Heute ist ${WDL[TODAY.getDay()]}, der ${fmtY(TODAY).slice(3)}. Was davor liegt, ist passiert (Vergangenheit). Was danach kommt, steht noch an (Zukunft/Vorfreude).`;
  try {
    const r = await (window.MK_TASK = "jahresrueckblick", sample)(`Schreib ${ME()} einen unterhaltsamen, kurzweiligen Jahresrückblick für ${y} auf Deutsch, du-Form, locker und mit Augenzwinkern – wie ein guter Freund, der die Statistik vorliest. Keine Floskeln, nichts Rührseliges, keine Ratschläge.
Form: Überschrift in einer Zeile (witzig, max. 6 Wörter, ohne Anführungszeichen), dann 3–4 kurze Absätze mit je 2–3 Sätzen, getrennt durch eine Leerzeile. Höchstens 3 passende Emojis im ganzen Text. Keine Aufzählungszeichen, kein Markdown, keine Anrede wie „Lieber …“.
Zeit beachten: ${stand} Schreibe Vergangenes in der Vergangenheit, Kommendes als Ausblick („steht noch an“, „wartet noch“). Nie etwas Kommendes als erledigt darstellen.
Baue 3–5 der Fun Facts überraschend ein (Vergleiche, kleine Pointen). Nutze NUR diese Daten, erfinde nichts dazu, keine Gefühle oder Gründe unterstellen:
Zahlen: ${JSON.stringify({ termine: S.total, termineVorbei: past.length, termineKommen: fut.length, spaetdienste: S.late, reisen: S.lists.runs.length, reisetage: S.vacDays, geburtstage: S.bdays, rundeGeburtstage: S.round.map(o => `${o.ev.title} wird ${y - o.ev.birthYear} am ${fmt(o.a)} (${when(o.a)})`), terminreichsterMonat: MON[S.perMonth.indexOf(Math.max(...S.perMonth))] })}
Fun Facts: ${facts.join("; ")}
Reisen: ${runs.join("; ") || "keine"}
Einige vergangene Termine: ${pick(past).join("; ") || "keine"}
Einige kommende Termine: ${pick(fut).join("; ") || "keine"}`, { modelTier: "default", cache: false, onText: ({ text }) => { out.innerHTML = reviewHtml(text, false); } });
    REVIEW = r.text.trim(); out.innerHTML = reviewHtml(REVIEW, true);
    if (r.truncated) out.insertAdjacentHTML("afterbegin", `<p class="note">Der Text wurde zu lang und ist abgeschnitten – tippe auf „Neu schreiben“.</p>`);
  } catch { out.innerHTML = `<p class="err">Das hat nicht geklappt. Versuch es noch einmal.</p>`; }
  btn.disabled = false; btn.textContent = "Neu schreiben";
}
function reviewHtml(t, done) {
  const P = String(t).trim().split(/\n\s*\n|\n/).map(x => x.trim()).filter(Boolean), head = P.length > 1 && P[0].length < 70 ? P.shift() : "";
  return `<div class="reply review">${head ? `<h4>${esc(head)}</h4>` : ""}${P.map(p => `<p>${esc(p)}</p>`).join("")}</div>${done ? `<div class="btnrow" style="margin-top:8px"><button type="button" class="btn accent small" id="st-share">Teilen</button><button type="button" class="btn ghost small" id="st-copy">Kopieren</button></div>` : ""}`;
}
async function shareReview(copyOnly) {
  const text = `${REVIEW}\n\n– Mein Kalender`;
  if (!copyOnly && navigator.share) { try { await navigator.share({ title: `Mein Jahr ${selYear}`, text }); return; } catch (e) { if (e?.name === "AbortError") return; } }
  try { await navigator.clipboard.writeText(text); toast("Text kopiert – jetzt einfügen, z. B. in WhatsApp"); }
  catch { window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank", "noopener"); }
}

function kidOcc(y) { return OCC.filter(o => isKidOcc(o.ev) && (o.a.getFullYear() === y || o.b.getFullYear() === y)); }
function renderCare() {
  if (!$("b-mina")) return;
  const y = selYear, list = kidOcc(y), n = list.filter(o => o.ev.type === "mina").length;
  $("c-mina").textContent = dbState === "ready" ? (n === 1 ? "1 Termin" : `${n} Termine`) : "";
  $("b-mina").innerHTML = !list.length ? `<p class="tip">${dbState === "ready" ? `Für ${y} sind noch keine Termine eingetragen.` : emptyMsg()}</p>` :
    `<div>${list.map(o => `<button type="button" class="lr" data-occ="${esc(o.ev.id)}|${iso(o.a)}"><span class="dt">${rngTxt(o.a, o.b, o.b.getFullYear() !== y)}</span><span class="n"><span class="ev-dot ${o.ev.type}"${dotSt(o.ev)}></span><span>${o.ev.type === "info" ? esc(o.ev.title) : esc(o.ev.note || "Wochenende")}</span></span></button>`).join("")}</div>
     <button type="button" class="btn ghost small" style="margin-top:10px" data-share-mina="${y}">Plan ${y} teilen</button>`;
}

// =================== Zusammenführen ===================
function renderAll() {
  ensureGoogle();
  expand();
  renderMonths(); renderNext(); renderSoon(); renderUp(); renderOverview(); syncLegend();
  if (view === "week") renderWeek();
  if (view === "list") renderList();
  $("add-btn").hidden = (!canWrite && dbState !== "off") || !!moving || !$("sheet").hidden;
  renderMenuDot();
  if (!$("sheet").hidden) {
    if (sheetMode === "day" && selDay) showDay(selDay);
    if (sheetMode === "event" && sheetCtx) { const o = findOcc(sheetCtx.id, sheetCtx.a); o ? showEvent(o) : closeSheet(); }
  }
}
function setView(v) {
  use("ansicht_" + v);
  view = v; store.set("ft-view", v);
  if (v === "two" && !(twoStart <= addDays(new Date(MONTHS[curMi].y, MONTHS[curMi].m + 1, 0), 0) && addDays(twoStart, 13) >= new Date(MONTHS[curMi].y, MONTHS[curMi].m, 1))) twoStart = curMi === todayMi ? monday(TODAY) : monday(new Date(MONTHS[curMi].y, MONTHS[curMi].m, 1));
  const cal = v === "month" || v === "two";
  document.documentElement.classList.toggle("snap", cal || v === "year");
  document.documentElement.classList.toggle("fill", cal); setTimeout(() => { if (ensureGoogle()) renderAll(); });
  document.querySelectorAll(".seg button").forEach(b => b.setAttribute("aria-selected", String(b.dataset.view === v)));
  $("v-month").hidden = !cal; $("v-week").hidden = v !== "week"; $("v-list").hidden = v !== "list"; $("v-year").hidden = v !== "year";
  $("legend").hidden = !cal && v !== "year";
  if (cal || v === "year") renderMonths();
  if (v === "week") renderWeek();
  if (v === "list") renderList();
}
function goToday() {
  if (view === "month") setMonth(todayMi);
  if (view === "two") setTwo(TODAY);
  if (view === "year") setYear(TODAY.getFullYear());
  if (view === "week") setWeek(TODAY);
  if (view === "list") { $("q").value = ""; $("l-past").checked = false; renderList(); }
}
const findOcc = (id, a) => OCC.find(o => o.ev.id === id && iso(o.a) === a) || OCC.find(o => o.ev.id === id) || gSeen.get(id);

// =================== Sheets ===================
const sheet = $("sheet");
// =================== Benachrichtigungen (Web-Push) ===================
const NT_DEF = { eve: true, eveTime: "20:00", ev: true, evLead: 60, bd: true, fest: true, shared: true, train: true };
let NTP = { ...NT_DEF }, ntSub = null, ntLoaded = false;
const ntSupported = () => APP && "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
const ntIOSNeedsInstall = () => /iphone|ipad|ipod/i.test(navigator.userAgent) && !IS_STANDALONE;
const swReady = () => Promise.race([navigator.serviceWorker.ready, new Promise(r => setTimeout(() => r(null), 3000))]);
const unb64u = s => { s = String(s).replace(/-/g, "+").replace(/_/g, "/"); while (s.length % 4) s += "="; return Uint8Array.from(atob(s), c => c.charCodeAt(0)); };
const subId = ep => { let h = 0; for (const c of ep) h = (h * 31 + c.charCodeAt(0)) | 0; return "s" + (h >>> 0).toString(36) + ep.length.toString(36); };
let ntChecked = false;
async function ntRefresh() { if (!ntSupported()) return null; try { const reg = await swReady(); ntSub = reg ? await reg.pushManager.getSubscription() : null; } catch { ntSub = null; } ntChecked = true; try { renderHints(); } catch {}
  const v = $("mi-notify-v"); if (v) v.textContent = ntSub && Notification.permission === "granted" ? "an" : ""; return ntSub; }
function ntStart() {
  if (!APP || !canWrite) return; const mi = $("mi-notify"); if (mi) mi.hidden = false;
  COLL("prefs").doc("pushcfg").onSnapshot(d => { NTP = { ...NT_DEF, ...(d.exists ? d.data() || {} : {}) }; ntLoaded = true; pushPlanQueue(); if (sheetMode === "notify") showNotify(); });
  ntRefresh().then(s => { if (s) COLL("pushsub").doc(subId(s.endpoint)).set({ ...s.toJSON(), ua: navigator.userAgent.slice(0, 120), at: new Date().toISOString() }).catch(() => {}); });
}
async function showNotify(msg) {
  if (sheetMode !== "notify") closeMenu();
  await ntRefresh();
  const on = !!ntSub && Notification.permission === "granted", N = NTP;
  const tg = (k, label, sub, extra = "") => `<label class="sr2"><span>${label}${sub ? `<small>${sub}</small>` : ""}</span>${extra}<input type="checkbox" class="swi" data-nt="${k}"${N[k] ? " checked" : ""}></label>`;
  const times = ["18:00", "19:00", "20:00", "21:00", "22:00"].map(t => `<option${N.eveTime === t ? " selected" : ""}>${t}</option>`).join("");
  const leads = [[15, "15 Min."], [30, "30 Min."], [60, "1 Std."], [120, "2 Std."], [1440, "1 Tag"]].map(([v, l]) => `<option value="${v}"${+N.evLead === v ? " selected" : ""}>${l} vorher</option>`).join("");
  const status = !ntSupported() ? `<p class="note">Dieses Gerät oder dieser Browser kann keine Benachrichtigungen empfangen.</p>`
    : ntIOSNeedsInstall() ? `<p class="note">Auf dem iPhone kommen Benachrichtigungen nur, wenn „Mein Kalender“ auf dem Home-Bildschirm installiert ist: in Safari <b>Teilen → Zum Home-Bildschirm</b>, dann von dort öffnen.</p>`
    : Notification.permission === "denied" ? `<p class="note">Benachrichtigungen sind für diese Seite blockiert. Erlaube sie in den Browser- bzw. App-Einstellungen (Website-Einstellungen → Benachrichtigungen) und öffne dieses Fenster erneut.</p>`
    : on ? `<div class="nt-st on">🔔 Auf diesem Gerät eingeschaltet</div><div class="btnrow"><button type="button" class="btn ghost small" id="nt-test">Test senden</button><button type="button" class="btn ghost small" id="nt-off">Auf diesem Gerät aus</button></div>`
    : `<div class="nt-st">Auf diesem Gerät noch aus</div><button type="button" class="btn accent big" id="nt-on">🔔 Benachrichtigungen einschalten</button>`;
  openSheet("Benachrichtigungen", "Gilt für alle deine Geräte, auf denen sie eingeschaltet sind", `<div class="setv">
    <div class="sg">${status}${msg ? `<p class="note" role="status">${esc(msg)}</p>` : ""}</div>
    <div class="sg-t">Was soll kommen?</div><div class="sg">
      ${tg("eve", "Überblick für morgen", "Termine, Aufgaben, Feiertage – nur wenn etwas ansteht", `<select class="fin nt-sel" data-ntv="eveTime">${times}</select>`)}
      ${tg("ev", "Erinnerung vor Terminen mit Uhrzeit", "mit „Route“-Knopf, wenn ein Ort eingetragen ist", `<select class="fin nt-sel" data-ntv="evLead">${leads}</select>`)}
      ${tg("bd", "Geburtstage, Fristen & Reisen", "am Tag selbst, mit Vorlauf („schon ein Geschenk?“) und vor Reisen („Packliste checken“)")}
      ${tg("fest", "Weihnachten, Mutter- & Vatertag", "rechtzeitig an Geschenke für deine Liebsten denken")}
      ${tg("shared", "Geteilte Termine", "wenn jemand etwas mit dir teilt, ändert oder löscht")}
      ${tg("train", "🚆✈️ Züge &amp; Flüge live", "Verspätung, Gleis/Gate, Gepäckband oder Ausfall – wenn im Termin eine Zug- oder Flugnummer steht (z. B. „RE 4“, „LH 123“)")}
    </div>
    <p class="note">Abfahrtszeit mit echter Fahrzeit („jetzt losfahren“) kann die App noch nicht berechnen – stell die Erinnerung dafür z. B. auf 1 Std. vorher und tippe auf „Route“.</p></div>`, "notify");
}
async function notifyOn(quiet) {
  use("benachrichtigung_an");
  const show = m => { if (quiet) { if (m) toast(m); } else showNotify(m); };
  try {
    if ((await Notification.requestPermission()) !== "granted") return show("Ohne Erlaubnis kann ich keine Benachrichtigungen schicken.");
    const key = await window.mkPushKey(), reg = await swReady(); if (!reg) throw new Error("no sw");
    const s = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: unb64u(key) });
    await COLL("pushsub").doc(subId(s.endpoint)).set({ ...s.toJSON(), ua: navigator.userAgent.slice(0, 120), at: new Date().toISOString() });
    await COLL("prefs").doc("pushcfg").set({ ...NTP });
    pushPlanQueue(0); ntSub = s; show(quiet ? "🔔 Benachrichtigungen sind an" : "Eingeschaltet. Tippe auf „Test senden“, um es auszuprobieren.");
  } catch (e) { show(e?.code === "no_vapid" ? "Benachrichtigungen sind auf dem Server noch nicht eingerichtet (Schlüssel fehlt)." : "Einschalten hat nicht geklappt – bitte unter ☰ → Benachrichtigungen noch einmal versuchen."); }
}
async function notifyOff() { try { const s = ntSub || await ntRefresh(); if (s) { await COLL("pushsub").doc(subId(s.endpoint)).delete().catch(() => {}); await s.unsubscribe(); } } catch {} ntSub = null; showNotify("Auf diesem Gerät ausgeschaltet."); }
async function notifyTest() { const b = $("nt-test"); if (b) { b.disabled = true; b.textContent = "Sende …"; } const r = await window.mkPushTest().catch(() => null);
  showNotify(r?.ok ? "Gesendet – die Benachrichtigung sollte gleich erscheinen." : r?.code === "no_subscription" ? "Für dein Konto ist noch kein Gerät eingeschaltet." : "Senden hat nicht geklappt" + (r?.detail ? ` (${r.detail})` : "") + "."); }
function ntSet(k, v) { NTP = { ...NTP, [k]: v }; COLL("prefs").doc("pushcfg").set({ ...NTP }).catch(() => {}); pushPlanQueue(0); }
// Plan der nächsten 10 Tage – der Server verschickt ihn zur richtigen Zeit (auch Google-Termine, Stand: letztes Öffnen)
let ppT = null, ppLast = "";
function pushPlanQueue(ms = 4000) { if (!APP || !canWrite || !ntLoaded) return; clearTimeout(ppT); ppT = setTimeout(pushPlan, ms); }
function buildPushPlan() {
  const N = NTP, now = new Date(), end = addDays(TODAY, 10), items = [];
  const at = (d, hm) => { const [h, m] = String(hm).split(":").map(Number); const x = new Date(d); x.setHours(h || 0, m || 0, 0, 0); return x; };
  const add = (id, when, t, b, extra = {}) => { if (when > now && when <= addDays(end, 1)) items.push({ id, at: when.toISOString(), t, b, ...extra }); };
  const occs = OCC.filter(o => !o.part && o.b >= TODAY && o.a <= addDays(end, 31) && (o.ev.type !== "info" || !!o.ev.time));   // Hinweise nur mit Uhrzeit
  const bdName = o => o.ev.type === "birthday" ? o.ev.title : String(o.ev.title).replace(/^geburtstag\s*(von\s*)?/i, "").trim();
  const isBd = o => o.ev.type === "birthday" || /geburtstag|birthday/i.test(o.ev.title);
  if (N.eve) for (let i = 0; i <= 9; i++) { const d = addDays(TODAY, i), n = addDays(d, 1);
    const L = occs.filter(o => sameDay(o.a, n) || (o.a < n && sameDay(o.b, n) && dayDiff(o.a, o.b) >= 1 && o.ev.type === "trip")).sort((x, y) => String(x.ev.time || "").localeCompare(String(y.ev.time || "")));
    const tk = TASKS.filter(t => !t.done && t.state !== "no" && t.due === iso(n)), h = HOL.get(iso(n)), hol = h && h.be ? h : null;
    if (!L.length && !tk.length && !hol) continue;
    const parts = [...(hol ? ["🎉 " + hol.name] : []), ...L.map(o => isBd(o) ? `🎂 ${bdName(o)}` : !sameDay(o.a, n) ? `🏠 Rückreise ${evName(o.ev)}` : `${o.ev.time ? o.ev.time + " " : ""}${evName(o.ev)}`), ...tk.map(t => "☐ " + t.title)];
    const cnt = L.length + tk.length;
    add(`eve-${iso(n)}`, at(d, N.eveTime || "20:00"), `Morgen, ${WDL[n.getDay()]}${cnt ? ` · ${cnt} ${cnt === 1 ? "Eintrag" : "Einträge"}` : ""}`, parts.slice(0, 6).join(" · ") + (parts.length > 6 ? " …" : "")); }
  if (N.ev) occs.filter(o => o.ev.time && !isBd(o) && !isUmg(o) && o.a <= end).forEach(o => { const st = at(o.a, o.ev.time), lead = +N.evLead || 60, pl = placeOf(o.ev);
    const lt = lead >= 1440 ? "Morgen" : lead >= 60 ? `In ${lead / 60} Std.` : `In ${lead} Min.`;
    add(`ev-${o.ev.id}-${iso(o.a)}`, new Date(st - lead * 60e3), `${lt}: ${evName(o.ev)}`, `${o.ev.time} Uhr${pl ? " · " + pl : ""}`, pl ? { r: `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(pl)}` } : {}); });
  if (N.bd) occs.forEach(o => {
    if (isBd(o)) { const age = ageTxt(o); add(`bd-${o.ev.id}-${iso(o.a)}`, at(o.a, "08:00"), `🎂 Heute: ${bdName(o)}`, age ? `${age} – vergiss nicht zu gratulieren` : "Vergiss nicht zu gratulieren");
      const rd = Math.min(+o.ev.remindDays || 7, 21); if (rd >= 2) add(`bdv-${o.ev.id}-${iso(o.a)}`, at(addDays(o.a, -rd), "09:00"), `🎁 In ${rd} Tagen: Geburtstag ${bdName(o)}`, "Schon ein Geschenk oder eine Idee?"); }
    else if (o.ev.type === "deadline") { const rd = +o.ev.remindDays || 3; add(`dl-${o.ev.id}-${iso(o.a)}`, at(addDays(o.a, -rd), "09:00"), `⏰ Frist in ${rd} Tagen`, evName(o.ev)); add(`dl1-${o.ev.id}-${iso(o.a)}`, at(addDays(o.a, -1), "09:00"), "⏰ Frist morgen", evName(o.ev)); }
    else if (o.ev.type === "trip" && o.a > TODAY) { const pk = o.ev.packlist || [], open = pk.filter(x => !x.d).length;
      add(`tr-${o.ev.id}-${iso(o.a)}`, at(addDays(o.a, -3), "18:00"), `🧳 In 3 Tagen: ${evName(o.ev)}`, pk.length ? (open ? `Noch ${open} Dinge auf der Packliste offen` : "Packliste ist komplett ✓") : "Zeit für die Packliste"); } });
  if (N.ev) MERK.forEach(m => { const open = (m.packlist || []).filter(x => !x.d); if (!open.length) return;
    const o = OCC.find(x => x.ev.type === "google" && x.ev.gid === m.gEventId && iso(x.a) === m.from); if (!o || o.a <= TODAY) return;
    add(`mk-${m.id}`, at(addDays(o.a, -1), "19:00"), `📝 Morgen: ${o.ev.title}`, `Noch offen: ${open.slice(0, 4).map(x => x.t).join(", ")}${open.length > 4 ? " …" : ""}`); });
  if (N.bd) OCC.filter(o => !o.part && isTrip(o) && o.a > TODAY && o.a <= addDays(TODAY, 105)).forEach(o => { const k = `trip-${vacKey(o)}-${iso(o.a)}`, C = COUNTRIES[tripCountry(o.ev)], ds = REMP.dismissed || [], nm = evName(o.ev), ok = key => !ds.includes(key + k);
      if (C?.entry) { if (ok("visa1-")) add(`visa1-${k}`, at(addDays(o.a, -92), "09:00"), `🛂 Einreise ${C.n}: jetzt beantragen`, `${C.entry} · für „${nm}“ ab ${fmt(o.a)} – Bearbeitung kann dauern`);
        if (ok("visa2-")) add(`visa2-${k}`, at(addDays(o.a, -30), "09:00"), `🛂 Einreise ${C.n}: Genehmigung da?`, `${C.entry} · „${nm}“ ab ${fmt(o.a)}`); }
      if (C?.toll && byCar(o.ev)) { const lbl = /vignette|vinjeta|matrica|rovinieta/i.test(C.toll) ? "Vignette" : "Maut";
        if (ok("toll1-")) add(`toll1-${k}`, at(addDays(o.a, -7), "18:00"), `🚗 ${lbl} ${C.n} besorgen`, `${C.toll} · „${nm}“ ab ${fmt(o.a)}`);
        if (ok("toll2-")) add(`toll2-${k}`, at(addDays(o.a, -1), "18:00"), `🚗 ${lbl} ${C.n}: erledigt?`, `Abfahrt ${fmt(o.a)}`); }
      if (isFlight(o.ev) && !ds.includes("ci-" + k)) add(`ci-${k}`, at(addDays(o.a, -2), "18:00"), `✈️ Online-Check-in: ${nm}`, `Abflug ${fmt(o.a)}${o.ev.time ? " " + o.ev.time : ""} · Bordkarten aufs Handy`); });
  if (N.fest) { const names = FAM().map(p => p.name).filter(Boolean), y = TODAY.getFullYear();
    for (const yy of [y, y + 1]) { const xmas = ymd(yy, 12, 24);
      for (const w of [21, 7]) add(`xm${w}-${yy}`, at(addDays(xmas, -w), "18:00"), `🎄 In ${w === 21 ? "3 Wochen" : "einer Woche"} ist Heiligabend`, names.length ? `Geschenke für ${names.slice(0, 6).join(", ")}${names.length > 6 ? " …" : ""}?` : "Schon an Geschenke gedacht?");
      const may1 = ymd(yy, 5, 1), mday = addDays(may1, ((7 - may1.getDay()) % 7) + 7), fday = addDays(easter(yy), 39);
      if (FAM().some(p => p.role === "mutter")) add(`md-${yy}`, at(addDays(mday, -7), "18:00"), "💐 In einer Woche ist Muttertag", "Schon eine Idee?");
      if (FAM().some(p => p.role === "vater")) add(`vd-${yy}`, at(addDays(fday, -7), "18:00"), "🍺 In einer Woche ist Vatertag", "Schon eine Idee?"); } }
  return items.sort((a, b) => a.at < b.at ? -1 : 1).slice(0, 150);
}
// ---- Zug-Wächter: Zugnummer + Bahnhof im Termin → der Server prüft live und meldet Verspätung/Gleis/Ausfall ----
const TRAIN_RE = /\b(ICE|ECE|IC|EC|RJX|RJ|NJ|EN|FLX|IRE|MEX|RE|RB)\s?-?(\d{1,5})\b/i;
const trainOf = e => { const m = [e.title, e.note, e.place].filter(Boolean).join(" · ").match(TRAIN_RE); return m ? `${m[1].toUpperCase()} ${m[2]}` : ""; };
const STOPW = /^(vom|von|am|an|zum|zur|zu|ab|nach|in|im|bei|aus|abholen|hin|bringen|ina|der|die|das|den)$/i;
function stationOf(e) {
  const nm = String(e.note || "").match(/\b(?:ab|an|ankunft|abfahrt)\s+([\p{L}.\- ]+?\s(?:hbf|hauptbahnhof|bahnhof|bf)\b(?:\s\(tief\))?)/iu);
  const pl0 = String(e.place || "").split(",")[0].trim(), pl = /bahnhof|hbf|bhf|\bbf\b/i.test(pl0) ? pl0 : nm ? nm[1].trim() : pl0 || String(e.note || "").split(",")[0].trim();
  const src = /bahnhof|hbf|bhf|\bbf\b/i.test(pl) ? pl : String(e.title || "");
  const t = osmExpand(src.replace(TRAIN_RE, " ")), m = t.match(/((?:[\p{L}.\-]+\s+)?)(Hauptbahnhof|Bahnhof)((?:\s+[\p{L}.\-]+)?)/u);
  if (!m) return /bahnhof|hbf/i.test(pl) ? pl : "";
  const pre = m[1].trim(), post = m[3].trim(), city = [pre, post].find(w => w && !STOPW.test(w)) || "";
  return m[2] === "Hauptbahnhof" ? (city ? `${city} Hbf` : "") : (src === pl ? pl : `${city ? city + " " : ""}Bahnhof`.trim());
}
let TRST = {}, TRST_T = 0, TRST_AT = 0;
const trainKey = o => `${String(o.ev.id).replace(/[^\w]/g, "").slice(-24)}-${iso(o.a)}`;
async function trainStatusLoad(force) {
  if (!APP || !db || dbState !== "ready") return; if (!force && Date.now() - TRST_AT < 60e3) return; TRST_AT = Date.now();
  try { const d = (await COLL("push").doc("sent").get())?.data?.() || {}; const n = JSON.stringify(d.trains || {}); if (n !== JSON.stringify(TRST)) { TRST = d.trains || {}; renderFocus?.(); } } catch {}
}
function trainStatusLoop() { clearInterval(TRST_T); TRST_T = setInterval(() => { if (document.visibilityState === "visible" && trainWatch().some(w => Math.abs(Date.parse(w.at) - Date.now()) < 3 * 3600e3)) trainStatusLoad(); }, 90e3); }
document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible") trainStatusLoad(true); });
// kurzes Zeichen für die Liste
function trainBadge(o) { const k0 = trainKey(o), s = TRST[k0] || Object.entries(TRST).filter(([k, v]) => k.startsWith(k0 + "-L") && v?.seen).map(([, v]) => v).at(-1); if (!s?.seen) return "";
  const F = s.flight, hi = F ? 15 : 5, lo = F ? 5 : 2;
  const [c, t, cls] = s.c ? ["❌", F ? "gestrichen" : "fällt aus", "bad"] : F && s.status === "landed" ? ["🛬", "gelandet", "ok"] : s.d >= hi ? ["🔴", `+${s.d}`, "bad"] : s.d >= lo ? ["🟡", `+${s.d}`, "warn"] : ["✅", "", "ok"];
  const extra = F ? (s.bag ? ` · Band ${esc(s.bag)}` : s.kind === "dep" && s.pl ? ` · Gate ${esc(s.pl)}` : s.term ? ` · T${esc(s.term)}` : "") : s.pl ? ` · Gl. ${esc(s.pl)}` : "";
  return ` <span class="trb ${cls}" title="${esc(s.c ? "fällt aus" : s.d ? `+${s.d} Min.` : "pünktlich")}">${c}${t ? " " + esc(t) : ""}${extra}</span>`; }
// ausführlich im Termin
function trainDetail(o) {
  const lg = legsDetail(o); if (lg) return lg;
  const rt0 = !flightOf(o.ev) && (o.ev.flight || o.ev.mode === "flug" || o.ev.pick?.mode === "flug") ? flightRoute(o.ev) : null;
  const fl = flightOf(o.ev) || (rt0 ? `${rt0.al ? rt0.al + " " : ""}${rt0.dep}→${rt0.arr}` : ""), tr = (TRST[trainKey(o)]?.code ? TRST[trainKey(o)].code.replace(/^([A-Z0-9]{2})(\d)/, "$1 $2") : "") || fl || trainOf(o.ev); if (!tr || !o.ev.time) return ""; const s = TRST[trainKey(o)], st = fl ? (o.ev.place || "").split(",")[0] : stationOf(o.ev), ic = fl ? "✈️" : "🚆";
  const [h, m] = o.ev.time.split(":").map(Number), at = new Date(o.a); at.setHours(h || 0, m || 0, 0, 0);
  const hm = d => d.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" });
  if (fl && !flightAllowed() && at > new Date()) return `<p class="trd">${ic} ${esc(tr)} · <b>Flug live</b> (Gate, Verspätung, Gepäckband) gibt es mit Plus. <button type="button" class="link" data-plans>Tarife ansehen</button></p>`;
  if (!s?.seen) return at > new Date() ? `<p class="trd">${ic} ${esc(tr)} wird ab ${hm(new Date(at - (fl ? 180 : 150) * 60e3))} Uhr live beobachtet${st ? ` (${esc(st)})` : ""}.</p>` : "";
  if (s.flight) { const plan = new Date(s.pt || at), real = new Date(plan.getTime() + (s.d || 0) * 60e3), what = s.kind === "dep" ? "Abflug" : "Landung";
    const head = s.c ? `❌ ${esc(tr)} gestrichen` : s.status === "landed" ? `🛬 ${esc(tr)} gelandet` : s.d >= 15 ? `🔴 ${esc(tr)}: +${s.d} Min.` : s.d >= 5 ? `🟡 ${esc(tr)}: +${s.d} Min.` : `✅ ${esc(tr)} planmäßig`;
    return `<div class="trd"><b>${head}</b><br>${what} ${esc(s.sn || st)}: ${s.d ? `ca. <b>${hm(real)}</b> statt ${hm(plan)}` : hm(plan)}${s.term ? ` · Terminal <b>${esc(s.term)}</b>` : ""}${s.pl ? ` · Gate <b>${esc(s.pl)}</b>` : ""}${s.bag ? ` · Gepäckband <b>${esc(s.bag)}</b>` : ""}${s.chk ? `<br><span class="note">Stand ${hm(new Date(s.chk))} · wird alle 5–15 Min. aktualisiert</span>` : ""}</div>`; }
  const plan = new Date(s.pt || at), real = new Date(plan.getTime() + (s.d || 0) * 60e3), what = s.kind === "dep" ? "Abfahrt" : "Ankunft";
  const head = s.c ? `❌ ${esc(tr)} fällt aus` : s.d >= 5 ? `🔴 ${esc(tr)}: +${s.d} Min.` : s.d >= 2 ? `🟡 ${esc(tr)}: fast pünktlich (+${s.d} Min.)` : `✅ ${esc(tr)} pünktlich`;
  return `<div class="trd"><b>${head}</b><br>${what} ${esc(s.sn || st)}: ${s.c ? `geplant ${hm(plan)}` : s.d ? `jetzt ca. <b>${hm(real)}</b> statt ${hm(plan)}` : hm(plan)}${s.pl ? ` · Gleis <b>${esc(s.pl)}</b>${s.pp && s.pp !== s.pl ? ` (statt ${esc(s.pp)})` : ""}` : ""}${s.chk ? `<br><span class="note">Stand ${hm(new Date(s.chk))} · wird alle 5 Min. aktualisiert</span>` : ""}</div>`;
}
// Flugnummer (z. B. LH 123, EW 9452, U2 4567) – nur bei Flug-Einträgen, damit „RE 4“ nicht als Flug gilt
const FLNO_RE = /\b([A-Z]{2}|[A-Z]\d|\d[A-Z])\s?(\d{2,4})[A-Z]?\b(?![.:]\d)(?!\s*(?:min|std|h\b|uhr|kg|eur|€))/gi;
function flightOf(e) {
  const isF = e.pick?.mode === "flug" || (e.type === "trip" && (e.flight || e.mode === "flug")) || FLIGHT_RE.test([e.title, e.note].join(" ")) || /landung|flieg/i.test([e.title, e.note].join(" "));
  if (!isF) return ""; const known = new Set(Object.values(AIRLINES));
  const WD = new Set(["MO", "DI", "MI", "DO", "SA", "SO", "AM", "UM", "AB", "AN", "BIS", "NR", "KW", "CA"]);
  for (const t of [e.pick?.no, e.note, e.title]) for (const m of String(t === e.pick?.no ? (t || "").toUpperCase() : t || "").matchAll(FLNO_RE)) {
    if (t !== e.pick?.no && (m[1] !== m[1].toUpperCase() || WD.has(m[1]) && !known.has(m[1]))) continue;   // nur GROSS geschriebene Codes, keine Wochentage („Mo 16.11.“)
    if (TRAIN_RE.test(m[0]) || /^\d/.test(m[1]) && !known.has(m[1]) || /\d/.test(m[1]) && !known.has(m[1]) && t !== e.pick?.no) continue;   // „1H 35“ (Aufenthalt) ist keine Flugnummer
    if (/[A-Z]{3}\s*$/.test(String(t).toUpperCase().slice(0, m.index)) && !known.has(m[1])) continue;
    return `${m[1]} ${m[2]}`; } return ""; }
// Strecke ohne Flugnummer: „BER 18:55 → MUC“ + Airline-Name → der Server sucht die Nummer im Flugplan
const AIRLINES = { lufthansa: "LH", eurowings: "EW", ryanair: "FR", easyjet: "U2", condor: "DE", sas: "SK", klm: "KL", "air france": "AF", austrian: "OS", swiss: "LX", "british airways": "BA", tuifly: "X3", turkish: "TK", wizz: "W6", norwegian: "DY", "iberia": "IB", "ita airways": "AZ", "brussels": "SN", "pegasus": "PC", "sunexpress": "XQ", "finnair": "AY", "lot": "LO", "aegean": "A3", "vueling": "VY", "emirates": "EK", "qatar": "QR", "united": "UA", "delta": "DL", "american airlines": "AA" };
function flightRoute(e) {
  const t = [e.note, e.title].join(" "), m = t.match(/\b([A-Z]{3})\s*(\d{1,2}[:.]\d{2})\s*(?:→|->|–|-|nach)\s*([A-Z]{3})\b/); if (!m) return null;
  const al = Object.entries(AIRLINES).find(([n]) => new RegExp(`\\b${n}\\b`, "i").test(t))?.[1] || "";
  return { dep: m[1], arr: m[3], time: m[2].replace(".", ":").padStart(5, "0"), al };
}
// Teilstrecken aus der Notiz (Hin-/Rückfahrt, Umstiege): „Rückfahrt So 29.11., 13:59 Uhr ab Rostock Hbf (IC 2239)“ oder „LH 2420: MUC 21:40 → ARN 23:55“
function tripLegs(e) {
  const legs = [], y0 = (e.from || iso(TODAY)).slice(0, 4); let last = null;
  for (const seg of String(e.note || "").split(/\s·\s|;|\n/)) {
    const tm = seg.match(/(?<![\d.])(\d{1,2})[:.](\d{2})(?![.\d])\s*(?:uhr)?/i); if (!tm) continue;
    const fm = !TRAIN_RE.test(seg) && seg.match(/\b([A-Z]{2}|[A-Z]\d|\d[A-Z])\s?(\d{2,4})\b[^→]*?\b([A-Z]{3})\s*\d{1,2}[:.]\d{2}\s*(?:→|->|–)\s*([A-Z]{3})\b/);
    const tr = seg.match(TRAIN_RE); if (!tr && !fm) continue;
    const dm = seg.match(/\b(\d{1,2})\.(\d{1,2})\.(\d{4})?/), back = /rück|zurück/i.test(seg);
    let date = dm ? `${dm[3] || y0}-${dm[2].padStart(2, "0")}-${dm[1].padStart(2, "0")}` : back ? (e.to || e.from) : (last?.date || e.from);
    const time = `${tm[1].padStart(2, "0")}:${tm[2]}`;
    if (!dm && last && last.date === date && time < last.time && !back) date = iso(addDays(parseIso(date), 1));   // Umstieg nach Mitternacht
    if (fm) { legs.push(last = { train: `${fm[1]} ${fm[2]}`, st: fm[3], date, time, mode: "flug", prefer: "dep" }); continue; }
    const sm = seg.match(/\b(ab|an|ankunft|abfahrt)\s+([\p{L}.\- ]+?\s(?:hbf|hauptbahnhof|bahnhof|bf)\b(?:\s\(tief\))?)/iu) || seg.match(/([\p{L}.\-]+\s(?:hbf|hauptbahnhof))\b/iu);
    if (!sm) continue; const st = osmExpand((sm[2] || sm[1]).trim()).replace(/Hauptbahnhof/, "Hbf");
    legs.push(last = { train: `${tr[1].toUpperCase()} ${tr[2]}`, st, date, time, prefer: sm[2] && /^an/i.test(sm[1]) ? "arr" : "dep" });
  }
  const u = new Set(); return legs.filter(l => { const k = l.train + l.date + l.time; if (u.has(k)) return false; u.add(k); return parseIso(l.date); }).slice(0, 6);
}
const legKey = (e, l, i) => `${String(e.id).replace(/[^\w]/g, "").slice(-24)}-${l.date}-L${i}`;
function trainWatch() {
  const W = [], seen = new Set();
  const lo = addDays(TODAY, -1), hi = addDays(TODAY, 3);
  for (const e of EV) { if (e.repeat && e.repeat !== "none") continue; const L = tripLegs(e); if (L.length < (e.type === "trip" || e.type === "urlaub" ? 1 : 2)) continue;
    L.forEach((l, i) => { const d = parseIso(l.date); if (d < lo || d > hi) return; const [h, m] = l.time.split(":").map(Number), at = new Date(d); at.setHours(h, m, 0, 0);
      if (at.getTime() < Date.now() - 30 * 60e3) return; const id = legKey(e, l, i); seen.add("ev:" + e.id);
      if (l.mode === "flug" && !flightAllowed()) return;
      W.push({ id, train: l.train, st: l.st, at: at.toISOString(), title: evName(e), prefer: l.prefer, ...(l.mode ? { mode: "flug" } : {}) }); });
    if (L.length) seen.add("ev:" + e.id); }
  OCC.filter(o => !o.part && !seen.has("ev:" + o.ev.id) && o.ev.time && o.a >= addDays(TODAY, -1) && o.a <= addDays(TODAY, 3)).forEach(o => {
    const rt = !flightOf(o.ev) && (o.ev.flight || o.ev.mode === "flug" || o.ev.pick?.mode === "flug" || FLIGHT_RE.test([o.ev.title, o.ev.note].join(" "))) ? flightRoute(o.ev) : null;
    const fl = flightOf(o.ev) || (rt ? `${rt.al ? rt.al + " " : ""}${rt.dep}→${rt.arr}` : ""), train = fl || trainOf(o.ev); if (!train) return; const st = fl ? (rt ? rt.dep : (o.ev.place || "").split(",")[0].trim()) : stationOf(o.ev); if (!st && !fl) return;
    const [h, m] = o.ev.time.split(":").map(Number), at = new Date(o.a); at.setHours(h || 0, m || 0, 0, 0);
    const id = `${String(o.ev.id).replace(/[^\w]/g, "").slice(-24)}-${iso(o.a)}`; if (seen.has(id)) return; seen.add(id);
    if (at.getTime() < Date.now() - 30 * 60e3) return;   // abgefahrene Züge nicht mehr beobachten
    const tx = [o.ev.title, o.ev.note].join(" "), prefer = /abhol|ankunft|ankommen|kommt an|empfang/i.test(tx) ? "arr" : /abfahrt|losfahren|fahre |hinfahrt|abreise|zug nach/i.test(tx) ? "dep" : "";
    if (fl && !flightAllowed()) return;
    W.push({ id, train, st, at: at.toISOString(), title: evName(o.ev), prefer: o.ev.pick?.dir || (fl && o.ev.type === "trip" ? "dep" : prefer), ...(fl ? { mode: "flug" } : {}), ...(rt ? { route: rt } : {}) }); });
  return W.sort((a, b) => a.at < b.at ? -1 : 1).slice(0, 8);
}
// Teilstrecken im Termin anzeigen
function legsDetail(o) {
  const e = o.ev, L = tripLegs(e); if (L.length < (e.type === "trip" || e.type === "urlaub" ? 1 : 2)) return "";
  const hm = d => d.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" });
  return `<div class="trd">${L.map((l, i) => { const s = TRST[legKey(e, l, i)], d = parseIso(l.date), at = new Date(d), F = l.mode === "flug"; const [h, m] = l.time.split(":").map(Number); at.setHours(h, m, 0, 0);
    const ic = F ? "✈️" : "🚆", when = `${fmt(d)} ${l.time}`, kind = l.prefer === "arr" ? "an" : "ab";
    if (F && !flightAllowed() && at > new Date()) return `<div>${ic} <b>${esc(l.train)}</b> ${kind} ${esc(l.st)} · ${when}<br><span class="note">Flug live gibt es mit Plus · <button type="button" class="link" data-plans>Tarife ansehen</button></span></div>`;
    if (!s?.seen) return `<div>${ic} <b>${esc(l.train)}</b> ${kind} ${esc(l.st)} · ${when}<br><span class="note">${at > new Date() ? `wird ab ${fmt(new Date(at - (F ? 180 : 150) * 60e3))} ${hm(new Date(at - (F ? 180 : 150) * 60e3))} Uhr live beobachtet` : "vorbei"}</span></div>`;
    const real = new Date(new Date(s.pt || at).getTime() + (s.d || 0) * 60e3);
    const head = s.c ? `❌ fällt aus` : s.d >= (F ? 15 : 5) ? `🔴 +${s.d} Min. (ca. ${hm(real)})` : s.d >= (F ? 5 : 2) ? `🟡 +${s.d} Min.` : "✅ pünktlich";
    return `<div>${ic} <b>${esc(l.train)}</b> ${kind} ${esc(s.sn || l.st)} · ${when} – <b>${head}</b>${s.pl ? ` · ${F ? "Gate" : "Gleis"} <b>${esc(s.pl)}</b>${s.pp && s.pp !== s.pl ? ` (statt ${esc(s.pp)})` : ""}` : ""}</div>`; }).join("")}</div>`;
}
async function pushPlan() {
  if (!APP || !canWrite || !ntLoaded || dbState !== "ready") return;
  let items = []; try { items = buildPushPlan(); } catch (e) { console.log("plan", e); return; }
  let watch = []; try { watch = NTP.train !== false ? trainWatch() : []; } catch {}
  const data = { items, watch, pref: { shared: NTP.shared !== false, train: NTP.train !== false }, tz: Intl.DateTimeFormat().resolvedOptions().timeZone }, h = JSON.stringify(data);
  if (h === ppLast) return; ppLast = h;
  try { await COLL("push").doc("plan").set({ ...data, at: new Date().toISOString() }); } catch {}
}
// ---- Konto: Abmelden & Löschen (nur eigene App) ----
async function showAccount() {
  closeMenu();
  let me = {}; try { me = await (await claude.use("user"))?.me?.() || {}; } catch {}
  openSheet("Konto", "", `<div class="acc">
    <div class="acc-me"><b>${esc(me.name || meName || "Angemeldet")}</b>${me.email ? `<span>${esc(me.email)}</span>` : ""}<span class="note">${(() => { const a = window.mkAuthInfo?.() || {}; return a.google && a.pw ? "angemeldet mit Google oder E-Mail und Passwort" : a.google ? "angemeldet mit Google" : "angemeldet mit E-Mail"; })()}</span></div>
    <button type="button" class="btn ghost big" id="acc-pw">${(window.mkAuthInfo?.() || {}).pw ? "Passwort ändern" : "Passwort festlegen"}</button>
    <button type="button" class="btn ghost big" id="app-logout">Abmelden</button>
    <p class="note">Deine Daten bleiben gespeichert – nach der nächsten Anmeldung ist alles wieder da.</p>
    <div class="acc-danger"><b>Konto löschen</b><span>Entfernt dein Konto und alle Daten in Mein Kalender endgültig.</span><button type="button" class="btn danger" id="app-delacc">Konto löschen …</button></div>
  </div>`, "account");
}
// ---- Konto löschen (nur eigene App) ----
function showDeleteAccount() {
  closeMenu?.();
  const nEv = EV.filter(e => !e.shared).length, nTk = TASKS.length;
  openSheet("Konto löschen", "Das lässt sich nicht rückgängig machen", `
    <p>Gelöscht werden <b>dein Konto und alles, was du hier gespeichert hast</b>: ${nEv} Einträge, ${nTk} Aufgaben, Dokumente, Familie, Einstellungen und alles, was du mit anderen teilst. Die Freigabe für deinen Google Kalender wird zurückgezogen.</p>
    <p class="note">Deine Termine <b>in Google selbst</b> bleiben erhalten – die gehören zu deinem Google-Konto.</p>
    <div class="form"><label for="delacc-in">Zum Bestätigen <b>LÖSCHEN</b> eintippen</label>
    <input id="delacc-in" type="text" autocomplete="off" autocapitalize="characters" spellcheck="false" placeholder="LÖSCHEN"></div>
    <p class="err" id="delacc-err" role="alert"></p>
    <div class="btnrow"><button type="button" class="btn danger" id="delacc-go" disabled>Endgültig löschen</button><button type="button" class="btn ghost" id="sheet-close2">Abbrechen</button></div>`, "delacc");
  const inp = $("delacc-in"); inp?.addEventListener("input", () => { $("delacc-go").disabled = inp.value.trim().toUpperCase() !== "LÖSCHEN"; });
}
async function doDeleteAccount() {
  const btn = $("delacc-go"); if (!btn || btn.disabled) return;
  btn.disabled = true; btn.textContent = "Wird gelöscht …"; $("delacc-err").textContent = "";
  try { await window.mkDeleteAccount(); }
  catch (e) { btn.disabled = false; btn.textContent = "Endgültig löschen"; $("delacc-err").textContent = "Das hat nicht geklappt – bitte später noch einmal versuchen oder an kontakt@herdzeit.de schreiben." + (e?.message ? ` (${e.message})` : ""); }
}
function openSheet(title, sub, html, mode, ctx) {
  $("sheet-title").textContent = title; $("sheet-sub").textContent = sub;
  $("sheet-body").innerHTML = html; sheetMode = mode; sheetCtx = ctx || null;
  sheet.hidden = false; $("add-btn").hidden = true; document.documentElement.classList.add("sheet-open"); fitSheet();
  sheet.scrollTop = 0;
}
// Bildschirmtastatur: Fenster über der Tastatur halten, Eingabefeld sichtbar scrollen
function fitSheet() {
  const vv = window.visualViewport, r = document.documentElement.style;
  if (!vv) return;
  r.setProperty("--vvh", vv.height + "px");
  r.setProperty("--kb", Math.max(0, window.innerHeight - vv.height - vv.offsetTop) + "px");
}
if (window.visualViewport) { visualViewport.addEventListener("resize", fitSheet); visualViewport.addEventListener("scroll", fitSheet); }
document.addEventListener("focusin", ev => {
  if (ev.target.id === "f-place" && !ev.target.value.trim() && $("f-title")?.value.trim()) { osmLast = ""; osmQueue($("f-title").value, true, 0); }
  const t = ev.target; if (!t.closest || !t.closest("#sheet") || !/^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName)) return;
  setTimeout(() => { fitSheet(); t.scrollIntoView({ block: "center", behavior: "smooth" }); }, 350);
});
function closeSheet() {
  sheet.hidden = true; sheetMode = null; sheetCtx = null; document.documentElement.classList.remove("sheet-open"); setTimeout(renderHints, 0);
  if (selDay) { selDay = null; document.querySelectorAll(".d.sel, .mc.sel").forEach(x => x.classList.remove("sel")); }
  $("add-btn").hidden = (!canWrite && dbState !== "off") || !!moving;
}
function showDay(dt) {
  selDay = dt;
  const d = dayOf(dt), items = [];
  const item = (color, title, sub) => items.push(`<li><i style="background:var(${color})"></i><div><b>${title}</b>${sub ? `<div class="note">${sub}</div>` : ""}</div></li>`);
  if (d.h) item(d.h.be && d.h.st ? "--holiday" : d.h.be ? "--be-strong" : "--st-strong", `Feiertag: ${d.h.name}`, !PB ? nameA() : d.h.be && d.h.st ? `${nameA()} und ${nameB()}` : d.h.be ? `nur ${nameA()}` : `nur ${nameB()}`);
  const br = BRIDGES.get(d.k); if (br) item("--bridge", esc(br.name), esc(br.note));
  const sb = d.fBE ? FB.get(d.k) : isWE(dt) ? "Wochenende" : d.h && d.h.be ? "Feiertag" : "Schultag";
  const ss = d.fST ? FS.get(d.k) : isWE(dt) ? "Wochenende" : d.h && d.h.st ? "Feiertag" : "Schultag";
  item(d.fBE ? "--be-strong" : "--line", `${nameA()}: ${sb}`, ""); if (PB) item(d.fST ? "--st-strong" : "--line", `${nameB()}: ${ss}`, "");
  XST.filter(s => !XHIDE.includes(s)).forEach(s => { const n = FXM[s].get(d.k); items.push(`<li><i style="background:${n ? xColor(s) : "var(--line)"}"></i><div><b>${XNAME[s]}: ${n ? esc(n) : isWE(dt) ? "Wochenende" : "Schultag"}</b></div></li>`); });
  const w = JOINT.length >= 2 && winOf(dt); if (w) item("--both", `${jointTxt()[0].toUpperCase() + jointTxt().slice(1)} (${JOINT.join(", ")})`, `${winName(w)}: ${rngTxt(w.a, w.b, true)}, ${dayDiff(w.a, w.b) + 1} Tage`);
  const oc = occOn(dt);
  const navQ = e => placeOf(e) || (e.type === "trip" || /hotel|stay at|pension|ferienwohnung|camping/i.test(e.title) ? e.title.replace(/^stay at\s+/i, "") : "");
  const evs = oc.length ? `<div class="evlist">${oc.map(o => { const q = navQ(o.ev); return `<div class="evr-w">${occBtn(o, true)}${q ? `<a class="ic navl" href="https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(q)}" target="_blank" rel="noopener" aria-label="Route zu ${esc(q)}" title="Route">🧭</a>` : ""}</div>`; }).join("")}</div>` : "";
  const add = canWrite ? `<button type="button" class="btn ghost wide" data-add="${d.k}">+ Termin an diesem Tag</button>` : "";
  openSheet(`${WDL[dt.getDay()]}, ${dt.getDate()}. ${MON[dt.getMonth()]} ${dt.getFullYear()}`, `KW ${isoWeek(dt)}`, `${evs}<ul class="sheet-list">${items.join("")}</ul>${add}`, "day");
  document.querySelectorAll(".d.sel, .mc.sel").forEach(x => x.classList.remove("sel"));
  document.querySelectorAll(`.d[data-day="${d.k}"], .mc[data-day="${d.k}"]`).forEach(el => el.classList.add("sel"));
}
// Wann erscheint die Erinnerung? (im Kalender unter „Erinnerungen“ – plus Google-Benachrichtigung, falls auch in Google)
function remindInfo(o) {
  const e = o.ev, y = o.a.getFullYear(); let lead = 0, what = "";
  if (e.type === "birthday") { const age = e.birthYear ? y - e.birthYear : 0, round = age && isRoundAge(age), kid = !!e.birthYear && age < 18;
    lead = e.remindDays === 20 ? (round ? 49 : kid ? 28 : 20) : e.remindDays; what = round ? "runder Geburtstag" : kid ? "Kind" : ""; }
  else if (["anniversary", "deadline"].includes(e.type)) lead = e.remindDays;
  else if (e.type === "trip") { lead = tripDays(); what = "Reise-Hinweise"; }
  else if (e.thanks) return "";
  if (!(lead > 0)) return e.gcal && e.gEventId ? "über Google (deine Standard-Benachrichtigung)" : "";
  const from = addDays(o.a, -lead), n = dayDiff(TODAY, from);
  const when = n > 0 ? `ab ${WDL[from.getDay()].slice(0, 2)} ${p2(from.getDate())}.${p2(from.getMonth() + 1)}. (${lead} Tage vorher${what ? ", " + what : ""})` : o.a >= TODAY ? `läuft schon – steht jetzt unter „Erinnerungen“` : "";
  return when ? `${when}${e.gcal && e.gEventId ? " · zusätzlich Google-Benachrichtigung" : ""}` : "";
}
function showEvent(o) {
  if (o.ev.type === "google") return showGoogleEvent(o);
  const e = o.ev, cf = conflicts(o), items = [];
  if (e.shared) { const it = [`<li><i style="background:var(--both)"></i><div><b>Geteilt von ${esc(e.shared.from || "jemandem")}</b><div class="note">Änderungen sieht ihr beide</div></div></li>`];
    if (e.note) it.push(`<li><i style="background:var(--muted)"></i><div><b>Notiz</b><div class="note">${esc(e.note)}</div></div></li>`);
    if (e.place) it.push(`<li><i style="background:var(--muted)"></i><div><b>Ort</b><div class="note">${esc(e.place)}</div></div></li>`);
    openSheet(evName(e), `${rngTxt(o.a, o.b, true)}${timeTxt(e) ? " · " + timeTxt(e) + " Uhr" : ""}`, `<ul class="sheet-list">${it.join("")}</ul><div class="btnrow">${canWrite ? `<button type="button" class="btn small" data-edit="${esc(e.id)}">Bearbeiten</button>` : ""}${routeLinks(e.place)}<button type="button" class="btn danger small push" data-shdel="${esc(e.id)}">Löschen</button></div>`, "event", { id: e.id, a: iso(o.a) });
    return; }
  const item = (title, sub) => items.push(`<li><i style="background:${colorOf(e)}"></i><div><b>${esc(title)}</b>${sub ? `<div class="note">${esc(sub)}</div>` : ""}</div></li>`);
  item(TYPES[e.type].label + (e.repeat !== "none" ? ` · ${repLabel(e.repeat)}` : ""), ageTxt(o));
  if (e.who) item(`👤 für ${e.who}`, "");
  if (e.note) item("Notiz", e.note);
  if (e.place) item("Ort", e.place);
  if (e.type === "trip") { const C = COUNTRIES[tripCountry(e)]; const hs = [C ? `Ziel: ${C.n}${C.entry ? " · " + C.entry : ""}${C.toll && byCar(e) ? " · " + C.toll : ""}` : "", modeOf(e) ? "Anreise: " + MODES[modeOf(e)] + (modeOf(e) === "flug" ? " (Tickets, Check-in, Ausweise)" : "") : "", withKids(e) ? "mit Kindern" : "", ...bdaysIn(o.a, o.b).map(b => `Geburtstag ${b.ev.title} am ${fmt(b.a)}`)].filter(Boolean); if (hs.length) item("Reise", hs.join(" · ")); }
  if (tripParts(o).length) item("Dazu gehört", partsList(o));
  if (o.part) item("Teil der Reise", `${evName(o.part.ev)} · ${fmt(o.part.a)}–${fmt(o.part.b)}`);
  if (cf.length && !tripParts(o).length) item("Überschneidung", cf.join(", "));
  { const ri = remindInfo(o); if (ri) item("Erinnerung", ri); }
  { const T = canWrite ? tkOfEv(e).filter(t => !t.done || (t.doneAt && Date.now() - Date.parse(t.doneAt) < 30 * 864e5)) : []; if (T.length) items.push(`<li><i style="background:${colorOf(e)}"></i><div><b>Aufgaben dazu (${T.filter(t => !t.done).length} offen)</b><div class="ev-tk">${T.map(t => `<div class="tk${t.done ? " dn" : ""}"><input type="checkbox" class="ckb" ${t.done ? `data-tkundo="${esc(t.id)}" checked` : `data-tkdone="${esc(t.id)}"`} aria-label="${esc(t.title)} erledigt"><button type="button" class="tk-t" data-tkedit="${esc(t.id)}"><span>${esc(t.title.replace(/\s*\(„[^“]*“\)$/, ""))}</span>${t.due ? dueLbl(t.due) : ""}</button></div>`).join("")}</div></div></li>`); }
  if (e.thanks) item("Danke-Erinnerung", "am Tag danach");
  let gResend = "";
  if (e.gcal) { if (e.gEventId) item("Auch in Google", calLabel(e.gcal)); else { item("Google", `noch nicht in „${calLabel(e.gcal)}“ eingetragen`); if (canWrite && gWritable()) gResend = `<button type="button" class="btn ghost small" data-gsend="${esc(e.id)}">An Google senden</button>`; } }
  const st = [];
  for (let t = o.a; t <= o.b && st.length < 1; t = addDays(t, 1)) { const d = dayOf(t); if (d && winOf(t)) st.push(`schulfrei in ${JOINT.join(", ")}`); }
  if (st.length) item("Schule", st[0]);
  const id = esc(e.id);
  const acts = (canWrite ? `<button type="button" class="btn small" data-edit="${id}">Bearbeiten</button><button type="button" class="btn ghost small" data-move="${id}">Verschieben</button>` : "") +
    (canWrite ? `<button type="button" class="btn ghost small" data-shev="${id}|${iso(o.a)}">👥 ${effTo(e).length ? "Geteilt: " + esc(shareNames(effTo(e)).join(", ")) : "Mit … teilen"}</button>` : "") +
    `<button type="button" class="btn ghost small" data-share="${id}|${iso(o.a)}">Als Bild/Text</button>` + gResend +
    (["trip", "termin", "urlaub"].includes(e.type) ? `<button type="button" class="btn ghost small" data-pack="${id}">${packLabel(e)}${e.packlist.length ? ` ${e.packlist.filter(x => x.d).length}/${e.packlist.length}` : ""}</button>` : "") +
    (["birthday", "anniversary"].includes(e.type) && sample ? `<button type="button" class="btn ghost small" data-ideas="${id}|${iso(o.a)}">Ideen</button>` : "") +
    routeLinks(placeOf(e) || (e.type === "trip" ? e.title : "")) +
    (canWrite ? `<button type="button" class="btn danger small push" data-del="${id}|${iso(o.a)}">Löschen</button>` : "");
  const qcol = canWrite && !e.gReadOnly ? qcolBox(id, e.color, catColor(catOf(e) || e.type), "Farbe dieses Eintrags", `Farbe für alle „${TYPES[e.type]?.label || "Einträge"}“ ändern`) : "";
  openSheet(evName(e), `${rngTxt(o.a, o.b, true)}${timeTxt(e) ? " · " + timeTxt(e) + " Uhr" : ""}`, `${trainDetail(o)}<ul class="sheet-list">${items.join("")}</ul><div id="place-sug" hidden></div>${docsBox(e)}${qcol}<div class="btnrow">${acts}</div>`, "event", { id: e.id, a: iso(o.a) });
  if (canWrite && placeCand(o)) fillPlaceSug(o);
}

// =================== Formular ===================
let editing = null;
let formVis = "me", formVisManual = false, formShManual = false;
function setVis(v, manual) { formVis = v; if (manual) formVisManual = true; document.querySelectorAll("#f-vis [data-vis]").forEach(b => b.setAttribute("aria-checked", String(b.dataset.vis === v)));
  const g = $("f-gcal-wrap"); if (g) g.hidden = v !== "me" || $("f-type")?.value === "contact"; }
let fTimeOpen = false;   // Uhrzeit-Felder erst auf Wunsch zeigen
let FORM_FILES = [];
async function formPickFiles(fs) {
  const ok = [], bad = [];
  if (fs.length > 6) bad.push(`nur die ersten 6 von ${fs.length} Dateien`);
  for (const f of fs.slice(0, 6)) {
    const pdf = f.type === "application/pdf" || /\.pdf$/i.test(f.name || "");
    if (!pdf && !/^image\//.test(f.type)) { bad.push(`„${f.name}“ ist kein PDF/Bild`); continue; }
    if (pdf && f.size > FILE_MAX) { bad.push(`„${f.name}“ ist größer als 5 MB`); continue; }
    const n = await pdfTooLong(f); if (n) { bad.push(`„${f.name}“ hat ${n} Seiten (max. ${PDF_MAX_PAGES})`); continue; }
    ok.push(f);
  }
  if (bad.length) toast(bad.join(" · "));
  FORM_FILES = ok; if (ok.length) formFromDocs(ok, ""); else if ($("f-att-l")) $("f-att-l").textContent = "";
}
let sayT = 0; const sayWait = async () => { const w = 1200 - (Date.now() - sayT); if (w > 0) await new Promise(r => setTimeout(r, w)); sayT = Date.now(); };
async function formFromDocs(files, link) {
  const l = $("f-att-l"), say = async t => { await sayWait(); if ($("f-att-l")) $("f-att-l").textContent = t; };
  try {
    await say(files.length ? `📄 Ich lese ${files.length === 1 ? "„" + files[0].name + "“" : files.length + " Dokumente"} …` : "🔗 Ich öffne den Link …");
    const lim = await sample.limits().catch(() => null), att = files.length ? await filesForAI(files, lim?.images?.maxCount || 0) : { imgs: [], texts: [], long: [] };
    const lk = link ? await linksForAI(link, say) : { texts: [], fails: [] };
    if (!att.texts.length && !att.imgs.length && !lk.texts.length) { await say(lk.fails.length ? "Der Link ließ sich nicht lesen (evtl. Login nötig) – lade das Ticket als PDF oder Screenshot hoch." : "Daraus konnte ich nichts lesen."); return; }
    await say(`🔎 ${att.texts.length ? att.texts.length + " Seite(n) Text" : ""}${att.texts.length && att.imgs.length ? " und " : ""}${att.imgs.length ? att.imgs.length + " Bild(er)" : ""}${lk.texts.length ? " vom Link" : ""} gelesen – ich suche Datum, Uhrzeit, Ort und Anreise …`); await say("✍️ Ich fülle die Felder aus …");
    const cur = $("f-type")?.value || "termin", ctx = cur === "abholen" ? `\nDer Nutzer füllt gerade das Formular „Abholen & Bringen“ aus: lege type "abholen" mit pick an (wen abholen/bringen, Zug-/Flugnummer, Bahnhof/Flughafen, Ankunfts- bzw. Abfahrtszeit dort). Ist kein Name erkennbar, lass pick.who leer.`
      : cur === "urlaub" ? `\nDer Nutzer füllt gerade das Formular „Urlaub & Ferien“ aus: type "urlaub", title = Ziel bzw. Unterkunft, from/to = Urlaubszeitraum, time = erste Abfahrt/Abflug, Hin- und Rückreise (Zug/Flug, Zeiten) kurz in note.` : "";
    const r = await (window.MK_TASK = "formular-anhang", sample.json)(`${ATTACH_HINT}${ctx}
Heute ist ${fmtY(TODAY)}. Antworte NUR mit JSON: {"type": "trip" | "termin" | "urlaub" | "abholen", "title": "", "from": "YYYY-MM-DD", "to": "YYYY-MM-DD", "time": "HH:MM oder leer", "endTime": "HH:MM oder leer", "place": "", "mode": "", "flight": false, "note": "", "pick": {"dir": "arr" | "dep", "mode": "zug" | "flug" | "bus", "who": "", "no": ""} oder null}
${[...att.texts, ...lk.texts].join("\n\n").slice(0, 20000)}`, { modelTier: "default", images: att.imgs.length ? att.imgs : undefined });
    if (!r || !parseIso(r.from)) { await say("Ich konnte kein Datum finden – bitte selbst ergänzen."); return; }
    const set = (id, v) => { const el = $(id); if (el && v != null && v !== "") el.value = v; };
    const ty = cur === "abholen" || cur === "urlaub" ? cur : r.type === "abholen" ? "abholen" : ["trip", "termin"].includes(r.type) ? r.type : "";
    if (ty && ty !== cur) { $("f-type").value = ty; syncFormFields(); }
    if (ty === "abholen") {
      const pk = r.pick || {}, tap = (a, v) => document.querySelector(`[${a}="${v}"]`)?.click();
      if (["arr", "dep"].includes(pk.dir)) tap("data-pkdir", pk.dir);
      const md = ["zug", "flug", "bus"].includes(pk.mode) ? pk.mode : r.flight || r.mode === "flug" ? "flug" : ""; if (md) tap("data-pkmode", md);
      set("f-pk-who", pk.who); set("f-pk-no", pk.no); set("f-pk-st", r.place); set("f-from", r.from); set("f-time", r.time);
      if (r.note) $("f-note").value = [$("f-note").value.trim(), r.note].filter(Boolean).join("\n");
      pickPreview(); await say(`✓ Ausgefüllt aus ${FORM_FILES.map(f => f.name).join(", ") || "dem Link"}${att.long.length ? " (" + att.long.join("; ") + ")" : ""} – bitte kurz prüfen${files.length ? ". Das Ticket wird beim Speichern angehängt." : ""}`); return;
    }
    set("f-title", r.title); set("f-from", r.from); set("f-to", parseIso(r.to) ? r.to : r.from); set("f-place", r.place);
    if (r.note) $("f-note").value = [$("f-note").value.trim(), r.note].filter(Boolean).join("\n");
    if (r.time) { fTimeOpen = true; $("f-time-wrap").hidden = false; $("f-time-add").hidden = true; set("f-time", r.time); set("f-end", r.endTime); }
    if (MODES[r.mode]) { const m = document.querySelector(`[name=fmode][value="${r.mode}"]`); if (m) m.checked = true; }
    await say(`✓ Ausgefüllt aus ${files.length ? FORM_FILES.map(f => f.name).join(", ") : "dem Link"}${att.long?.length ? " (" + att.long.join("; ") + ")" : ""} – bitte kurz prüfen${files.length ? ". Die Dokumente werden beim Speichern angehängt." : ""}`);
  } catch (err) { await say(err?.code === "rate_limited" ? RL(err) : "Das Auslesen hat nicht geklappt."); }
}
function showForm(e, preset) {
  if (!arguments[0]) FORM_FILES = [];
  editing = e && e.id ? e : null;
  const v = e || { type: "termin", title: "", from: preset || iso(TODAY), to: preset || iso(TODAY), time: "", endTime: "", repeat: "none", until: "", birthYear: "", note: "", gcal: gWritable() ? "primary" : "" };
  fTimeOpen = !!(v.time || v.endTime);
  const rd = v.remindDays === undefined || v.remindDays === "" ? "" : v.remindDays;
  openSheet(editing ? "Bearbeiten" : "Neu eintragen", editing ? TYPES[v.type]?.label || "" : "Felder ausfüllen und speichern", `
    <form id="f" class="form" novalidate>${editing ? "" : entrySw("form")}
      <label>Was möchtest du eintragen?</label>
      <div class="tchips" role="radiogroup" aria-label="Art">${Object.entries(TYPES).filter(([k]) => k !== "google" && (k !== "mina" || v.type === "mina" || EV.some(x => x.type === "mina"))).map(([k, t]) => `<button type="button" role="radio" class="tchip" data-ftype="${k}" aria-checked="${v.type === k}" title="${esc(t.label)}" style="--c:${catColor(k)}"><span class="ti">${TYPE_ICON[k] || ""}</span><span class="tl">${TYPE_SHORT[k] || t.label}</span></button>`).join("")}</div>
      <div class="two"><div hidden><label for="f-type">Art</label>
      <select id="f-type">${Object.entries(TYPES).filter(([k]) => k !== "google" && (k !== "mina" || v.type === "mina" || EV.some(x => x.type === "mina"))).map(([k, t]) => `<option value="${k}"${v.type === k ? " selected" : ""}>${t.label}</option>`).join("")}</select></div>
      <div id="f-rep-wrap"><label for="f-rep">Wiederholung</label>
      <select id="f-rep">${Object.entries(REPEAT).map(([k, t]) => `<option value="${k}"${v.repeat === k ? " selected" : ""}>${t}</option>`).join("")}<option value="custom"${!REPEAT[v.repeat] && repSpec(v.repeat) ? " selected" : ""}>anders …</option></select></div></div>
      <div class="rep-c" id="f-repc-wrap"${!REPEAT[v.repeat] && repSpec(v.repeat) ? "" : " hidden"}><span>alle</span><input id="f-repn" type="number" inputmode="numeric" min="1" max="99" value="${repSpec(v.repeat)?.n || 2}"><select id="f-repu">${Object.entries(REP_U).map(([u, [, pl]]) => `<option value="${u}"${(repSpec(v.repeat)?.u || "w") === u ? " selected" : ""}>${pl}</option>`).join("")}</select></div>
      <div id="f-until-wrap" class="f-until"><label for="f-until">Wiederholung endet am <small>(optional)</small></label><input id="f-until" type="date" value="${esc(v.until)}"></div>
      ${!editing && sample && canWrite ? `<div class="f-att" id="f-att"><label class="btn ghost small"><span id="f-att-t">📎 Ticket / Buchung anhängen</span><input type="file" hidden multiple accept="application/pdf,image/*" id="f-files"></label><button type="button" class="link" id="f-link-btn">🔗 Link einfügen</button><span class="note" id="f-att-l">${FORM_FILES.length ? esc(FORM_FILES.map(f => f.name).join(", ")) : "füllt die Felder automatisch aus"}</span>
        <button type="button" class="link" id="f-mail-btn">📧 Mail-Text einfügen</button>
        <div id="f-link-wrap" hidden class="f-link"><input id="f-link" type="url" placeholder="https://… (Buchungsbestätigung, Ticket-Seite)"><button type="button" class="btn ghost small" id="f-link-go">Auslesen</button></div></div>` : ""}
      <div id="f-pick-wrap"${v.type === "abholen" ? "" : " hidden"}>
        <div class="seg emode" id="f-pk-dir" data-v="${v.pick?.dir || "arr"}"><button type="button" data-pkdir="arr" aria-selected="${(v.pick?.dir || "arr") === "arr"}">🙋 Abholen</button><button type="button" data-pkdir="dep" aria-selected="${v.pick?.dir === "dep"}">👋 Bringen</button></div>
        <div class="seg emode" id="f-pk-mode" data-v="${v.pick?.mode || "zug"}">${Object.entries({ zug: "🚆 Zug", flug: "✈️ Flug", bus: "🚌 Bus" }).map(([k, l]) => `<button type="button" data-pkmode="${k}" aria-selected="${(v.pick?.mode || "zug") === k}">${l}</button>`).join("")}</div>
        <div class="two"><div><label for="f-pk-who">Wen?</label><input id="f-pk-who" type="text" list="f-who-l" value="${esc(v.pick?.who || "")}" placeholder="z. B. Ina" autocomplete="off"></div>
          <div><label for="f-pk-no" id="f-pk-no-l">Zug</label><input id="f-pk-no" type="text" value="${esc(v.pick?.no || "")}" placeholder="z. B. RE 4" autocomplete="off" autocapitalize="characters"></div></div>
        <label for="f-pk-st" id="f-pk-st-l">Bahnhof</label><input id="f-pk-st" type="text" list="f-pk-stl" value="${esc(v.type === "abholen" ? v.place || "" : "")}" placeholder="z. B. Berlin Hbf" autocomplete="off">
        <datalist id="f-pk-stl">${[...new Set(EV.filter(x => x.type === "abholen" && x.place).map(x => x.place))].slice(0, 12).map(n => `<option value="${esc(n)}">`).join("")}</datalist>
        <p class="note" id="f-pk-prev"></p></div>
      <div id="f-title-grp"><label for="f-title" id="f-title-l">Titel</label>
      <input id="f-title" type="text" value="${esc(v.title)}" placeholder="z. B. Zahnarzt, Ostsee, TÜV">
      <div class="tsug" id="f-tsug"></div></div>
      <div class="f-who" id="f-who-wrap"${v.who ? "" : " data-off=\"1\""}><div><label for="f-who">Für wen?</label><input id="f-who" type="text" list="f-who-l" value="${esc(v.who || "")}" placeholder="optional, z. B. Karin" autocomplete="off"><datalist id="f-who-l">${[...new Set([...FAM().map(p => p.name), ...EV.map(x => x.who).filter(Boolean)])].slice(0, 30).map(n => `<option value="${esc(n)}">`).join("")}</datalist></div></div>
      <div id="f-col-wrap"><label id="f-col-l">${v.who ? `Farbe für ${esc(v.who)}` : "Farbe nur für diesen Eintrag"}</label><div class="fcols" role="radiogroup" aria-label="Farbe">${[["", "Wie die Art (☰ → Anzeigen → Farben)", ""], ...ECOL].map(([id, n, hex]) => `<button type="button" role="radio" class="fcol" data-fcol="${id}" title="${n}" aria-label="${n}" aria-checked="${(v.who ? (whoCols()[whoKey(v.who)] || "") : (v.color || "")) === id}" style="${hex ? `background:${hex}` : ""}">${hex ? "" : "A"}</button>`).join("")}</div></div>
      ${SHR_ON() && !(e && e.shared) ? (SHR.contacts.length ? `<div id="f-sh-wrap"><label>Teilen mit</label>${shrChips("data-fsh", e ? effTo(e) : [...new Set([...(v.title ? shrPick(v.title) : []), ...(["birthday"].includes(v.type) ? [] : autoLs())])])}</div>` : `<p class="note" id="f-sh-note" style="margin:6px 0 0">👥 Teilen mit anderen? <button type="button" class="link" id="mi-share">Personen einladen</button></p>`) : ""}
      ${famGroups().length && gWritable() && !v.gReadOnly ? `<div class="vis" id="f-vis" role="radiogroup" aria-label="Wer sieht das?"><button type="button" role="radio" data-vis="me" aria-checked="${!isShareCal(v.gcal)}">🔒 Nur ich</button>${famGroups().map(g => `<button type="button" role="radio" data-vis="${esc(g.cal)}" aria-checked="${v.gcal === g.cal}">👪 ${esc(calName(g.cal))}</button>`).join("")}</div>` : ""}
      <div class="two"><div><label for="f-from" id="f-from-l">Von</label><input id="f-from" type="date" value="${esc(v.from)}"></div>
      <div id="f-to-wrap"><label for="f-to">Bis</label><input id="f-to" type="date" value="${esc(v.to)}"></div></div>
      <div id="f-bd-wrap"><div class="two"><div><label for="f-bd">Geburtstag</label><input id="f-bd" type="text" inputmode="numeric" placeholder="TT.MM." value="${v.type === "birthday" && v.from ? esc(`${v.from.slice(8, 10)}.${v.from.slice(5, 7)}.`) : ""}"></div>
        <div><label for="f-by2">Geburtsjahr</label><input id="f-by2" type="number" inputmode="numeric" min="1900" max="2028" placeholder="falls bekannt" value="${esc(v.birthYear || "")}"></div></div>
        <p class="note" style="margin:2px 0 0">Ohne Jahr wird trotzdem jedes Jahr erinnert – nur das Alter fehlt.</p>
        ${canWrite ? `<label class="tog setrow" style="margin-top:6px"><input type="checkbox" id="f-fam"${v.fam || FAM().some(p => famKey(p.name) === famKey(v.title)) ? " checked" : ""}> Gehört zu meinen Liebsten (frühere Erinnerung, Geschenkeliste)</label>` : ""}</div>
      <div class="shift" id="f-shift"><span>Verschieben</span><button type="button" class="btn ghost small" data-shift="-7">−1 Wo</button><button type="button" class="btn ghost small" data-shift="-1">−1 Tag</button><button type="button" class="btn ghost small" data-shift="1">+1 Tag</button><button type="button" class="btn ghost small" data-shift="7">+1 Wo</button></div>
      <button type="button" class="link f-time-add" id="f-time-add">🕒 Uhrzeit hinzufügen</button>
      <div class="two" id="f-time-wrap"><div><label for="f-time" id="f-time-l">Uhrzeit</label><input id="f-time" type="time" value="${esc(v.time)}"></div>
      <div><label for="f-end">bis</label><input id="f-end" type="time" value="${esc(v.endTime)}"></div></div>
      <div class="two" id="f-extra">
        <div id="f-by-wrap"><label for="f-by">Geburtsjahr</label><input id="f-by" type="number" inputmode="numeric" min="1900" max="2028" placeholder="fürs Alter" value="${esc(v.birthYear || "")}"></div>
        <div id="f-sy-wrap"><label for="f-sy">Seit Jahr</label><input id="f-sy" type="number" inputmode="numeric" min="1900" max="2028" placeholder="z. B. 2015" value="${esc(v.startYear || "")}"></div>
        <div id="f-ew-wrap"><label for="f-ew">Erinnern alle … Wochen</label><input id="f-ew" type="number" inputmode="numeric" min="1" max="104" value="${esc(v.everyWeeks || 8)}"></div>
        <div id="f-rem-wrap"><label for="f-rem">Erinnerung (Tage vorher)</label><input id="f-rem" type="number" inputmode="numeric" min="0" max="120" placeholder="Standard" value="${esc(rd)}"></div>
      </div>
      <label class="tog setrow" id="f-thx-wrap" style="margin-top:6px"><input type="checkbox" id="f-thx"${v.thanks ? " checked" : ""}> Am Tag danach an „Danke sagen“ erinnern</label>
      <div id="f-trip-wrap"><label style="margin-top:8px">Anreise mit</label><div class="xchips" id="f-mode">${Object.entries(MODES).map(([k, l]) => `<label class="xchip" style="--c:var(--trip)"><input type="radio" name="fmode" value="${k}"${(v.mode || (v.flight ? "flug" : "")) === k ? " checked" : ""}><i></i>${l}</label>`).join("")}</div>
        <label class="tog setrow"><input type="checkbox" id="f-kids"${v.kids ? " checked" : ""}> Kinder reisen mit</label></div>
      <div id="f-place-grp"><label for="f-place">Ort / Adresse</label>
      <input id="f-place" type="text" value="${esc(v.place || "")}" placeholder="optional, für die Navigation" autocomplete="off">
      <div id="f-place-sug" class="osm-sug" hidden></div></div>
      <button type="button" class="link f-more" id="f-more" hidden></button>
      <div id="f-note-grp"><label for="f-note">Notiz</label>
      <input id="f-note" type="text" value="${esc(v.note)}" placeholder="optional"></div>
      <div id="f-gcal-wrap">${v.gReadOnly ? `<p class="note">Aus Google übernommen – der Google-Termin bleibt unverändert.</p>` : gWritable() ? `<label for="f-gcal">Auch in Google eintragen</label><select id="f-gcal">${gCalOptions(v.gcal)}</select>` : ""}</div>
      <div class="err" id="f-err"></div>
      <div class="btnrow">
        <button type="submit" class="btn accent" id="f-save">Speichern</button>
        <button type="button" class="btn ghost" id="f-cancel">Abbrechen</button>
        ${editing && !editing.shared ? `<button type="button" class="btn ghost" id="f-dup">Duplizieren</button>` : ""}
        ${editing?.shared ? `<button type="button" class="btn danger push" data-shdel="${esc(editing.id)}">Löschen</button>` : ""}
      </div>
    </form>`, "form");
  formVisManual = !!editing; formShManual = false; formVis = (e && isShareCal(e.gcal)) ? e.gcal : "me";
  fMore = !!(editing && ((v.repeat && v.repeat !== "none" && !["birthday", "anniversary"].includes(v.type)) || v.note || v.color || v.who));
  syncFormFields(); setVis(formVis);
}
const repVal = () => { const r = $("f-rep")?.value || "none"; if (r !== "custom") return r; const n = Math.max(1, Math.min(99, +$("f-repn").value || 1)), u = $("f-repu").value; return n === 1 ? { d: "d1", w: "weekly", m: "monthly", y: "yearly" }[u] : u + n; };
const TYPE_SHORT = { termin: "Termin", trip: "Reise", urlaub: "Urlaub", dienst: "Dienst", abholen: "Abholen", info: "Hinweis", birthday: "Geburtstag", mina: "Umgang", anniversary: "Jahrestag", deadline: "Frist", contact: "Kontakt" };
const TYPE_ICON = { termin: "📅", trip: "🧳", urlaub: "🏖️", dienst: "🕘", abholen: "🚉", info: "💡", birthday: "🎂", mina: "👨‍👧", anniversary: "💞", deadline: "⏰", contact: "📞" };
// Pflicht = sofort sichtbar; alles andere unter „Mehr Optionen“
const F_MAIN = { termin: ["att", "title", "dates", "time", "place"], trip: ["att", "title", "dates", "trip", "place"], urlaub: ["att", "title", "dates"], dienst: ["title", "dates", "time", "rep"],
  abholen: ["att", "pick", "dates", "time"], info: ["att", "title", "dates", "time"], birthday: ["title", "bd"], mina: ["att", "title", "dates"], anniversary: ["title", "dates", "extra"], deadline: ["att", "title", "dates", "extra"], contact: ["title", "dates", "extra"] };
const F_GRP = { att: "f-att", title: "f-title-grp", rep: "f-rep-wrap", col: "f-col-wrap", share: "f-sh-wrap", vis: "f-vis", shift: "f-shift", thx: "f-thx-wrap", trip: "f-trip-wrap", place: "f-place-grp", note: "f-note-grp", gcal: "f-gcal-wrap", pick: "f-pick-wrap" };
let fMore = false;
const DIENST_SUG = ["Früh", "Spät", "Nacht", "Bereitschaft", "Homeoffice"];
const TITLE_BASE = { termin: ["Arzt", "Zahnarzt", "Friseur", "Elternabend", "Werkstatt", "Besprechung"], trip: [], urlaub: ["Urlaub", "Ferien", "Freier Tag", "Brückentag"], dienst: DIENST_SUG,
  info: ["Müll rausstellen", "Anrufen", "Überweisen", "Paket abholen"], mina: [], anniversary: ["Hochzeitstag", "Kennenlerntag", "Jahrestag"],
  deadline: ["Steuererklärung", "TÜV", "Kündigung", "Versicherung", "Rechnung bezahlen"], birthday: [], contact: [] };
const TITLE_PH = { termin: "z. B. Zahnarzt", trip: "z. B. Ostsee, Hotel am See", urlaub: "z. B. Urlaub, Ferien", dienst: "z. B. Spät", info: "z. B. Müll rausstellen", mina: "z. B. Wochenende bei Papa",
  anniversary: "z. B. Hochzeitstag", deadline: "z. B. Steuererklärung", birthday: "Name, z. B. Oma Hilde", contact: "Name, z. B. Tante Ute" };
function titleSug(ty) {
  const cnt = new Map();
  for (const x of EV) if (x.type === ty && x.title && x.title.length <= 30) cnt.set(x.title, (cnt.get(x.title) || 0) + 1);
  const own = [...cnt].sort((a, b) => b[1] - a[1]).map(([t]) => t);
  let L;
  if (ty === "birthday") { const have = new Set(EV.filter(x => x.type === "birthday").map(x => (x.title || "").toLowerCase())); L = FAM().map(p => p.name).filter(n => n && !have.has(n.toLowerCase())); }
  else if (ty === "contact") { const have = new Set(own.map(t => t.toLowerCase())); L = FAM().map(p => p.name).filter(n => n && !have.has(n.toLowerCase())); }
  else if (ty === "trip" || ty === "mina") L = own;
  else L = [...(TITLE_BASE[ty] || []), ...own];
  return [...new Set(L)].slice(0, 8);
}
function formLayout(ty) {
  const main = new Set(F_MAIN[ty] || F_MAIN.termin);
  const fa = $("f-att"), fd = $("f-from")?.closest(".two"); if (fa && fd) { const at = ty === "abholen" ? $("f-pick-wrap") : fd; if (at && fa.nextElementSibling !== at) at.before(fa); }
  for (const [k, id] of Object.entries(F_GRP)) { const el = $(id) || (k === "share" ? $("f-sh-note") : null); if (!el) continue; el.classList.toggle("f-off", !main.has(k) && !fMore); }
  $("f-pick-wrap").hidden = ty !== "abholen"; $("f-title-grp").classList.toggle("f-off", ty === "abholen");
  if (ty === "abholen") { $("f-to-wrap").hidden = true; $("f-time-add").hidden = true; $("f-time-wrap").hidden = false; $("f-end").closest("div").hidden = true; pickPreview(); } else { $("f-end").closest("div").hidden = false; $("f-time-l").textContent = "Uhrzeit"; }
  const sug = $("f-tsug"); if (sug) { const L = titleSug(ty);
    sug.innerHTML = L.map(t => `<button type="button" class="tkq" data-ftitle="${esc(t)}">${esc(t)}</button>`).join(""); sug.hidden = !L.length; }
  const tt = $("f-att-t"); if (tt) tt.textContent = ty === "abholen" ? "📎 Ticket / Screenshot hochladen" : ty === "urlaub" ? "📎 Buchung / Tickets anhängen" : "📎 Ticket / Buchung anhängen";
  if (!$("f-title").value && TITLE_PH[ty]) $("f-title").placeholder = TITLE_PH[ty];
  const hasMore = Object.keys(F_GRP).some(k => !main.has(k) && $(F_GRP[k]) && k !== "pick"), b = $("f-more");
  if (b) { b.hidden = !hasMore; b.textContent = fMore ? "Weniger Optionen ▴" : "Mehr Optionen (Wiederholung, Farbe, Notiz, Google …) ▾"; }
  document.querySelectorAll("[data-ftype]").forEach(x => x.setAttribute("aria-checked", String(x.dataset.ftype === ty)));
}
function syncFormFields() {
  const t = $("f-type"), r = $("f-rep"); if (!t) return;
  const ty = t.value, contact = ty === "contact";
  $("f-by-wrap").hidden = ty !== "birthday";
  $("f-sy-wrap").hidden = ty !== "anniversary";
  $("f-ew-wrap").hidden = !contact;
  $("f-rem-wrap").hidden = !["birthday", "anniversary", "deadline"].includes(ty);
  $("f-rem").placeholder = `Standard ${REMIND_DEF[ty] ?? ""}`;
  $("f-extra").hidden = !["birthday", "anniversary", "deadline", "contact"].includes(ty);
  $("f-rep-wrap").hidden = contact; $("f-to-wrap").hidden = contact; { const noTime = contact || ty === "birthday" || ty === "anniversary"; $("f-time-wrap").hidden = noTime || !fTimeOpen; $("f-time-add").hidden = noTime || fTimeOpen; } $("f-shift").hidden = contact;
  $("f-repc-wrap").hidden = contact || r.value !== "custom";
  $("f-who-wrap").hidden = contact || ty === "birthday" || !!$("f-who-wrap").dataset.off;
  { const a = document.querySelector('[data-fcol=""]'), c = catColor(ty), lbl = `Wie ${TYPES[ty]?.label || "die Art"} (☰ → Anzeigen → Farben)`; if (a) { a.style.background = c; a.style.color = c.startsWith("#") ? lumInk(c) : "#fff"; a.style.borderColor = "transparent"; a.title = lbl; a.setAttribute("aria-label", lbl); } }
  $("f-until-wrap").hidden = contact || !["d", "w", "m"].includes(repSpec(repVal())?.u);
  $("f-thx-wrap").hidden = !["termin", "trip"].includes(ty);
  $("f-trip-wrap").hidden = ty !== "trip";
  $("f-gcal-wrap").hidden = contact || formVis !== "me";
  $("f-title-l").textContent = contact ? "Name" : ty === "birthday" ? "Name" : "Titel";
  const bd = ty === "birthday"; $("f-bd-wrap").hidden = !bd;
  if (bd) { $("f-title").placeholder = "z. B. Oma Inge"; $("f-rep-wrap").hidden = true; $("f-shift").hidden = true; $("f-by-wrap").hidden = true; $("f-place").hidden = true; $("f-place").previousElementSibling.hidden = true;
    $("f-from").closest(".two").hidden = true; $("f-until-wrap").hidden = true;
    if (!$("f-bd").value.trim()) { const a = parseIso($("f-from").value); if (a) $("f-bd").value = `${p2(a.getDate())}.${p2(a.getMonth() + 1)}.`; } }
  else { $("f-from").closest(".two").hidden = false; $("f-place").hidden = false; $("f-place").previousElementSibling.hidden = false; $("f-title").placeholder = "z. B. Zahnarzt, Ostsee, TÜV"; }
  $("f-from-l").textContent = contact ? "Zuletzt gemeldet" : ty === "deadline" ? "Fällig am" : ty === "abholen" ? "Datum" : "Von";
  formLayout(ty);
}
function shiftForm(n) {
  const f = $("f-from"), t = $("f-to"), a = parseIso(f.value); if (!a) { $("f-err").textContent = "Erst ein Von-Datum eingeben."; return; }
  const b = parseIso(t.value) || a; f.value = iso(addDays(a, n)); t.value = iso(addDays(b, n));
}
const PK_ICON = { zug: "🚆", flug: "✈️", bus: "🚌" };
const pickVals = () => ({ dir: $("f-pk-dir")?.dataset.v || "arr", mode: $("f-pk-mode")?.dataset.v || "zug", who: ($("f-pk-who")?.value || "").trim(), no: ($("f-pk-no")?.value || "").trim().replace(/^([a-z]+)\s*(\d)/i, (m, a, b) => a.toUpperCase() + " " + b) });
const pickTitle = k => { const where = k.mode === "flug" ? "Flughafen" : k.mode === "bus" ? "Bus" : "Zug"; const w = k.who || "";
  return `${w ? w + " " : ""}${k.dir === "arr" ? (w ? "abholen" : "Abholen") : (w ? "zum " + where + " bringen" : "Zum " + where + " bringen")}${k.no ? " · " + k.no : ""}`.trim(); };
function pickPreview() { const el = $("f-pk-prev"); if (!el) return; const k = pickVals(); el.textContent = `Wird eingetragen als: ${pickTitle(k)}${$("f-pk-st").value.trim() ? " · " + $("f-pk-st").value.trim() : ""}`;
  $("f-pk-no-l").textContent = k.mode === "flug" ? "Flugnummer" : k.mode === "bus" ? "Linie" : "Zug"; $("f-pk-no").placeholder = k.mode === "flug" ? "z. B. LH 123" : k.mode === "bus" ? "optional" : "z. B. RE 4, ICE 1101";
  $("f-pk-st-l").textContent = k.mode === "flug" ? "Flughafen" : k.mode === "bus" ? "Haltestelle" : "Bahnhof"; $("f-pk-st").placeholder = k.mode === "flug" ? "z. B. Flughafen BER" : "z. B. Berlin Hbf";
  $("f-time-l").textContent = k.dir === "arr" ? "Ankunft" : "Abfahrt"; }
function formVals() { if ($("f-type")?.value === "abholen") { const k = pickVals(); $("f-title").value = pickTitle(k); $("f-place").value = $("f-pk-st").value.trim(); $("f-to").value = $("f-from").value; const v = formVals0(); v.pick = k; return v; } return formVals0(); }
function formVals0() {
  const g = id => $(id).value.trim();
  const type = g("f-type");
  if (type === "birthday" && $("f-bd")) { // vereinfachte Eingabe: Tag.Monat (+ optional Jahr)
    const p = ctParseDate(g("f-bd")), y = +g("f-by2") || (p && p.y >= 1900 ? p.y : 0);
    const base = editing ? parseIso(editing.from) : parseIso(g("f-from")), yy = base ? base.getFullYear() : TODAY.getFullYear();
    if (p) { const d = iso(new Date(yy, p.m - 1, p.d)); $("f-from").value = d; $("f-to").value = d; } else { $("f-from").value = ""; }
    $("f-rep").value = "yearly"; $("f-by").value = y && y >= 1900 ? y : "";
  }
  const contact = type === "contact";
  return { type, title: g("f-title"), from: g("f-from"), to: contact ? g("f-from") : (g("f-to") || g("f-from")), time: contact ? "" : g("f-time"), endTime: contact ? "" : g("f-end"),
    repeat: contact ? "none" : repVal(), until: ["d", "w", "m"].includes(repSpec(repVal())?.u) ? g("f-until") : "", birthYear: type === "birthday" && +g("f-by") ? +g("f-by") : 0, note: g("f-note"),
    remindDays: ["birthday", "anniversary", "deadline"].includes(type) && g("f-rem") !== "" ? Math.max(0, +g("f-rem") || 0) : (REMIND_DEF[type] ?? 0), giftDone: editing ? editing.giftDone : [],
    done: editing ? editing.done : [], startYear: type === "anniversary" ? +g("f-sy") || 0 : 0, everyWeeks: contact ? Math.max(1, +g("f-ew") || 8) : 8,
    thanks: ["termin", "trip"].includes(type) && $("f-thx").checked, packlist: editing ? editing.packlist : [],
    who: contact || type === "birthday" ? "" : g("f-who"), color: (() => { const w = contact || type === "birthday" ? "" : g("f-who"), c = document.querySelector('[data-fcol][aria-checked="true"]')?.dataset.fcol || ""; if (w) { const M = whoCols(); if (c) M[whoKey(w)] = c; else delete M[whoKey(w)]; store.set("ft-whoc", JSON.stringify(M)); return ""; } return c; })(),
    place: g("f-place"), flight: type === "trip" && fMode() === "flug", mode: type === "trip" ? fMode() : "", files: editing ? editing.files || [] : [], kids: type === "trip" && $("f-kids").checked,
    country: editing && (editing.place || "") === g("f-place") && editing.title === g("f-title") ? editing.country || "" : "",
    gcal: formVis !== "me" && isShareCal(formVis) ? formVis : $("f-gcal") ? (isShareCal($("f-gcal").value) && formVis === "me" && $("f-vis") ? "primary" : $("f-gcal").value) : (editing ? editing.gcal : ""), gReadOnly: editing ? !!editing.gReadOnly : false,
    fam: type === "birthday" && $("f-fam") ? $("f-fam").checked : (editing ? !!editing.fam : false),
    ...($("f-sh-wrap") ? shSplit(chipSel("data-fsh", $("f-sh-wrap"))) : { shareTo: editing ? editing.shareTo || [] : [], shareNo: editing ? editing.shareNo || [] : [] }), sid: editing ? editing.sid || "" : "" };
}
const fMode = () => document.querySelector("[name=fmode]:checked")?.value || "";
function validate(v) {
  if (v.type === "abholen" && !v.time) return `Bitte die Uhrzeit der ${v.pick?.dir === "dep" ? "Abfahrt" : "Ankunft"} eingeben.`;
  if (!v.title) return "Bitte einen Titel eingeben.";
  const a = parseIso(v.from), b = parseIso(v.to);
  if (!a) return v.type === "birthday" ? "Bitte den Geburtstag als Tag.Monat eingeben, z. B. 18.05." : "Bitte ein gültiges Von-Datum eingeben.";
  if (!b || b < a) return "Das Bis-Datum liegt vor dem Von-Datum.";
  return "";
}
async function saveForm() {
  const v = formVals(), msg = validate(v); if (msg) { $("f-err").textContent = msg; return; }
  use(editing ? "bearbeiten" : "formular_neu"); if (v.color) use("farbe_eintrag"); if (v.repeat && v.repeat !== "none") use("wiederholung_" + v.repeat);
  if (editing && editing.shared) { try { await recvSave(editing, v); closeSheet(); toast(`Gespeichert – ${editing.shared.from} sieht die Änderung`); } catch (err) { toast("Speichern hat nicht geklappt"); } return; }
  const btn = $("f-save"); btn.disabled = true; btn.textContent = "Speichert …";
  try {
    const was = editing; const undo = await applyChanges([was ? { op: "update", id: was.id, event: v } : { op: "add", event: v }]);
    const files = FORM_FILES; FORM_FILES = []; const added = !was && LAST_ADDED[0];
    closeSheet(); toast(was ? "Gespeichert" : "Eingetragen", undo);
    if (files.length && added) setTimeout(() => docUpload({ ...added.v, id: added.id, files: [], a: parseIso(added.v.from), b: parseIso(added.v.to || added.v.from) }, files), 400);
    if (v.type === "birthday" && canWrite) { const k = famKey(v.title), inFam = FAM().some(p => famKey(p.name) === k || p.key === k); const b = parseIso(v.from);
      if (v.fam && !inFam) { FAMED = FAM().map(p => ({ ...p })); FAMED.push({ name: v.title, role: (FAMKW.find(([re]) => re.test(v.title)) || [])[1] || "andere", birthday: v.birthYear ? `${v.birthYear}-${v.from.slice(5)}` : `--${v.from.slice(5)}`, key: k }); famSave(); }
      else if (!v.fam && inFam && was) { FAMED = FAM().filter(p => !(famKey(p.name) === k || p.key === k)).map(p => ({ ...p })); famSave(); } }
  } catch (e) { $("f-err").textContent = writeErr(e); btn.disabled = false; btn.textContent = "Speichern"; }
}
const writeErr = e => ["permission_denied", "not_granted", "forbidden"].includes(e?.code) ? "Speichern ist nur für dich als Besitzer möglich." : "Speichern hat nicht geklappt. Versuch es noch einmal.";

// =================== Schreiben mit Rückgängig ===================
const plain = e => ({ type: e.type, title: e.title, from: e.from, to: e.to, time: e.time || "", endTime: e.endTime || "", repeat: e.repeat || "none", until: e.until || "", birthYear: e.birthYear || 0, note: e.note || "", gcal: e.gcal || "", gEventId: e.gEventId || "",
  remindDays: e.remindDays === undefined || e.remindDays === "" ? (REMIND_DEF[e.type] ?? 0) : +e.remindDays, giftDone: Array.isArray(e.giftDone) ? e.giftDone : [],
  done: Array.isArray(e.done) ? e.done : [], startYear: e.startYear || 0, everyWeeks: e.everyWeeks || 8, thanks: !!e.thanks, packlist: Array.isArray(e.packlist) ? e.packlist : [],
  place: e.place || "", flight: !!e.flight, kids: !!e.kids, mode: e.mode || "", files: Array.isArray(e.files) ? e.files : [], gReadOnly: !!e.gReadOnly, mOnly: !!e.mOnly, pick: e.pick || null, skip: e.skip || [], color: e.color || "", who: e.who || "", country: e.country || "", fam: !!e.fam,
  shareTo: Array.isArray(e.shareTo) ? e.shareTo : [], shareNo: Array.isArray(e.shareNo) ? e.shareNo : [], sid: e.sid || "", shadow: !!e.shadow });
let gWarn = 0;
let LAST_ADDED = [];
async function applyChanges(changes) {
  const col = COLL("events"), undo = []; LAST_ADDED = [];
  gWarn = 0;
  for (const c of changes) {
    if (c.op === "add") {
      const v = plain(c.event); v.gEventId = ""; if (v.type === "contact") v.gcal = "";
      const ref = await col.add(v); LAST_ADDED.push({ id: ref.id, v });
      if (v.gcal) { const gid = await gCreate(v); if (gid) await col.doc(ref.id).update({ gEventId: gid }); }
      undo.push({ op: "delete", id: ref.id });
    } else if (c.op === "update") {
      const prev = EV.find(x => x.id === c.id), pv = prev ? plain(prev) : null, v = plain(c.event);
      if (c.event.gcal === undefined && pv) v.gcal = pv.gcal;
      v.gEventId = pv ? pv.gEventId : "";
      if (pv && pv.gReadOnly) { v.gcal = pv.gcal; v.gReadOnly = true; }   // aus Google übernommen: Google-Termin bleibt unverändert
      else if (pv && pv.gEventId && (v.gcal !== pv.gcal || v.repeat !== pv.repeat)) { await gDelete(pv); v.gEventId = ""; }
      if (v.gcal && v.gEventId) { if (!(await gUpdate(v))) { /* Google-Kopie fehlt evtl.: neu anlegen */ v.gEventId = (await gCreate(v)) || v.gEventId; } }
      else if (v.gcal && !v.gEventId) v.gEventId = await gCreate(v);
      await col.doc(c.id).set(v);
      undo.push({ op: "update", id: c.id, event: pv });
    } else if (c.op === "delete") {
      const prev = EV.find(x => x.id === c.id), pv = prev ? plain(prev) : null;
      if (pv && pv.gEventId && !pv.gReadOnly) await gDelete(pv);
      await col.doc(c.id).delete();
      if (pv) { pv.gEventId = ""; undo.push({ op: "add", event: pv }); }
    }
  }
  if (mcp) mcp.invalidate(GSERVER, "list_events").catch(() => {});
  const warn = gWarn;
  setTimeout(() => { if (warn) toast(warn === 1 ? "Hier gespeichert, Google hat nicht geantwortet" : `Hier gespeichert, ${warn} Google-Änderungen fehlgeschlagen`); }, 2600);
  return async () => { await applyChanges(undo.reverse().filter(u => u.op !== "update" || u.event)); toast("Rückgängig gemacht"); };
}

// ---- Google-Schreibzugriffe ----
const gTitle = v => v.type === "birthday" ? `Geburtstag ${v.title}` : v.title;
const tpad = t => { const [h, m] = String(t).split(":"); return `${p2(+h)}:${p2(+m)}`; };
const localStamp = d => `${iso(d)}T${p2(d.getHours())}:${p2(d.getMinutes())}:00`;
function gInput(v) {
  const to = v.to || v.from, inp = { summary: gTitle(v), notificationLevel: "NONE" }; { const c = v.color || (v.who ? whoId(v.who) : ""); if (c) inp.colorId = c; else if (v.colorClear) inp.colorId = ""; }
  if (v.time && to > v.from && !v.endTime) {   // mehrtägig mit Abfahrtszeit (Reise, Urlaub): in Google über alle Tage, Uhrzeit in die Beschreibung
    inp.allDay = true; inp.startTime = `${v.from}T00:00:00`; inp.endTime = `${iso(addDays(parseIso(to), 1))}T00:00:00`;
    inp.description = [`Beginn ${tpad(v.time)} Uhr`, v.note].filter(Boolean).join("\n"); if (v.gcal && v.gcal !== "primary") inp.calendarId = v.gcal; return inp;
  }
  if (v.time) {
    inp.startTime = `${v.from}T${tpad(v.time)}:00`;
    if (v.endTime) inp.endTime = `${to}T${tpad(v.endTime)}:00`;
    else { const [h, m] = tpad(v.time).split(":"); const d = parseIso(v.from); d.setHours(+h + 1, +m); inp.endTime = localStamp(d); }
  } else { inp.allDay = true; inp.startTime = `${v.from}T00:00:00`; inp.endTime = `${iso(addDays(parseIso(to), 1))}T00:00:00`; }
  if (v.note) inp.description = v.note;
  if (v.gcal && v.gcal !== "primary") inp.calendarId = v.gcal;
  return inp;
}
function gRecur(v) {
  const sp = repSpec(v.repeat); if (!sp) return null;
  const F = { d: "DAILY", w: "WEEKLY", m: "MONTHLY", y: "YEARLY" }[sp.u], u = v.until ? `;UNTIL=${v.until.replace(/-/g, "")}T235959Z` : "";
  const ex = (v.skip || []).map(d => v.time ? `EXDATE;TZID=${Intl.DateTimeFormat().resolvedOptions().timeZone || "Europe/Berlin"}:${d.replace(/-/g, "")}T${v.time.replace(":", "")}00` : `EXDATE;VALUE=DATE:${d.replace(/-/g, "")}`);
  return [`RRULE:FREQ=${F}${sp.n > 1 ? `;INTERVAL=${sp.n}` : ""}${u}`, ...ex];
}
const gIdOf = p => typeof p === "object" && p ? String(p.id || p.event?.id || p.eventId || "") : "";
async function gCreate(v) {
  if (!mcp || gState !== "ok") { gWarn++; return ""; }
  try { const inp = gInput(v), r = gRecur(v); if (r) inp.recurrenceData = r;
    const res = await mcp.callTool(GSERVER, "create_event", inp); const id = gIdOf(res?.payload); if (!id) gWarn++; return id; }
  catch { gWarn++; return ""; }
}
function qcolBox(key, cur, base, label, typeLink) {
  return `<div class="qcol"><div class="qcol-h"><b>🎨 Farbe</b>${typeLink ? `<button type="button" class="link" id="set-farben">${esc(typeLink)}</button>` : ""}</div>
    <div class="fcols sm" role="radiogroup" aria-label="${esc(label)}">${[["", "Standardfarbe", ""], ...ECOL].map(([cid, n, hex]) => `<button type="button" role="radio" class="fcol" data-qcol="${esc(key)}|${cid}" title="${n}" aria-label="${n}" aria-checked="${(cur || "") === cid}" style="background:${hex || base}">${hex ? "" : "A"}</button>`).join("")}</div></div>`;
}
async function quickGColor(evid, cid) {
  const o = OCC.find(x => x.ev.id === evid), e = o?.ev; if (!e || !mcp || gState !== "ok") return; use("farbe_schnell_google");
  try { const inp = { eventId: e.gid, colorId: cid || "", notificationLevel: "NONE" }; if (e.calId && e.calId !== "primary") inp.calendarId = e.calId; await mcp.callTool(GSERVER, "update_event", inp); }
  catch (err) { toast("Die Farbe ließ sich in Google nicht ändern – evtl. darfst du in diesem Kalender nicht schreiben."); return; }
  const [c0, i0] = gColor(e.calId); e.colorId = cid; e.ecol = !!cid; e.color = cid ? ECOLM[cid] : c0; e.ink = cid ? lumInk(e.color) : i0;
  renderAll(); if (sheetMode === "event" && sheetCtx?.id === evid) showGoogleEvent(o); toast(cid ? "Farbe geändert – auch in Google" : "Wieder in der Kalenderfarbe"); gResync(800);
}
async function quickColor(eid, cid) {
  const e = EV.find(x => x.id === eid); if (!e) return; use("farbe_schnell");
  e.color = cid; try { await COLL("events").doc(eid).update({ color: cid }); } catch (err) { toast(writeErr(err)); return; }
  if (e.gEventId && e.gcal && gWritable()) gUpdate({ ...e, color: cid, colorClear: !cid }).then(() => gResync(400)).catch(() => {});
  renderAll(); const o = sheetCtx?.id === eid ? findOcc(eid, sheetCtx.a) : null; if (o && sheetMode === "event") showEvent(o);
  toast(cid ? "Farbe geändert" : "Wieder in der Farbe der Art");
}
// einmalig: mehrtägige Einträge mit Uhrzeit, die früher nur als 1 Stunde am ersten Tag in Google standen, über alle Tage ziehen
async function gFixSpans() {
  let done = []; try { done = JSON.parse(store.get("ft-gfix") || "[]"); } catch {}
  const L = EV.filter(e => e.gEventId && !e.gReadOnly && !e.shared && e.time && !e.endTime && (e.to || e.from) > e.from && !done.includes(e.id)).slice(0, 20);
  for (const e of L) { if (await gUpdate({ ...e, gcal: e.gcal })) done.push(e.id); }
  if (L.length) { store.set("ft-gfix", JSON.stringify(done.slice(-300))); gResync(500); }
}
async function gUpdate(v) {
  if (!mcp || gState !== "ok") { gWarn++; return true; }
  try { const inp = gInput(v); inp.eventId = v.gEventId; if (!v.time) inp.allDay = true; await mcp.callTool(GSERVER, "update_event", inp); return true; }
  catch (e) { if (e?.code === "tool_error" && /not.?found|404|gone|deleted/i.test(String(e?.message || ""))) return false; gWarn++; return true; }
}
async function gDelete(v) {
  if (!mcp || gState !== "ok") { gWarn++; return; }
  try { const inp = { eventId: v.gEventId, notificationLevel: "NONE" }; if (v.gcal && v.gcal !== "primary") inp.calendarId = v.gcal; await mcp.callTool(GSERVER, "delete_event", inp); }
  catch (e) { if (e?.code !== "tool_error") { gWarn++; return; } }
  // die Google-Kopie sofort auch aus dem lokalen Zwischenspeicher nehmen – sonst taucht sie bis zum nächsten Abgleich als „Google“-Termin wieder auf
  try { const cal = v.gcal || "primary"; gDropLocal(v.gEventId, cal); if (cal === "primary" && gPrimarySummary) gDropLocal(v.gEventId, gPrimarySummary); } catch {}
  gResync(2500);
}
const gWritable = () => mcp && gState === "ok";
function gCalOptions(cur) {
  // nur Kalender, die unter ☰ → Google Kalender zur Anzeige ausgewählt sind (und in die man schreiben darf)
  const sel = new Set(selectedCals()), canW = c => !c.accessRole || ["owner", "writer"].includes(c.accessRole);
  const cals = [{ id: "primary", summary: "Mein Kalender" }, ...gCals.filter(c => !c.primary && c.summary !== gPrimarySummary && c.id !== gPrimarySummary && canW(c))]
    .filter(c => sel.has(c.id) || c.id === cur);
  return `<option value=""${!cur ? " selected" : ""}>Nein, nur hier</option>` + cals.map(c => `<option value="${esc(c.id)}"${cur === c.id ? " selected" : ""}>${esc(c.summary)}</option>`).join("");
}

// =================== Verschieben & Löschen ===================
function startMove(e) {
  moving = e; closeSheet();
  if (e.gocc) { e.a = e.gocc.a; e.title = e.gocc.ev.title; e.type = "google"; }
  $("move-txt").textContent = `Neuen Starttag für „${evName(e)}“ antippen`;
  $("movebar").hidden = false; $("add-btn").hidden = true;
  if (view === "two") setTwo(e.a);
  else { if (view !== "month") setView("month");
    const mi = MONTHS.findIndex(x => x.y === e.a.getFullYear() && x.m === e.a.getMonth()); if (mi >= 0) setMonth(mi); }
  bigEl.classList.add("moving");
}
function stopMove() { moving = null; $("movebar").hidden = true; yearEl.classList.remove("moving"); bigEl.classList.remove("moving"); $("add-btn").hidden = !canWrite; }
async function finishMove(target) {
  if (moving && moving.gocc) { const o = moving.gocc; stopMove(); const delta = dayDiff(o.a, target); if (!delta) return;
    const before = gSnap(o), v = { ...before, from: iso(target), to: iso(addDays(o.b, delta)) };
    try { await gApplyEdit(o, v); toast(`Verschoben auf ${rngTxt(target, addDays(o.b, delta))}`, async () => { await gApplyEdit(o, before); toast("Rückgängig gemacht"); }); } catch (err) { toast(gErr(err)); }
    return; }
  const e = moving; stopMove();
  const delta = dayDiff(e.a, target); if (!delta) return;
  const v = plain(e); v.from = iso(target); v.to = iso(addDays(e.b, delta));
  try { const undo = await applyChanges([{ op: "update", id: e.id, event: v }]); toast(`Verschoben auf ${rngTxt(target, addDays(e.b, delta))}`, undo); }
  catch (err) { toast(writeErr(err)); }
}
// Serie: nur diesen Termin, diesen und alle folgenden, oder die ganze Serie
function delChoice(btn, id, a, google) {
  btn.hidden = true; btn.parentElement.querySelector(".delch")?.remove();
  const d = parseIso(a), b = (m, t, cls = "ghost") => `<button type="button" class="btn ${cls} small" data-delx="${m}|${id}|${a}">${t}</button>`;
  btn.insertAdjacentHTML("afterend", `<div class="delch" role="group" aria-label="Serie löschen"><p>Das ist ein Serientermin. Was soll gelöscht werden?</p>
    ${b("one", `Nur diesen (${fmt(d)})`)}${google ? "" : b("from", "Diesen und alle folgenden")}${b("all", "Ganze Serie", "danger")}<button type="button" class="link" data-delx="no|${id}|${a}">Abbrechen</button></div>`);
}
async function delSeries(btn, m, id, a) {
  use("serie_" + m);
  btn.closest(".delch")?.querySelectorAll("button").forEach(x => x.disabled = true);
  if (id.startsWith("g:")) { const o = findOcc(id, a); if (o) await gDeleteOcc(null, o, m === "all"); return; }
  const e = EV.find(x => x.id === id); if (!e) return;
  try {
    let undo, msg;
    if (m === "all" || (m === "from" && sameDay(parseIso(a), e.a))) { undo = await applyChanges([{ op: "delete", id }]); msg = "Serie gelöscht"; }
    else if (m === "from") { undo = await applyChanges([{ op: "update", id, event: { ...e, until: iso(addDays(parseIso(a), -1)) } }]); msg = `Serie endet jetzt am ${fmt(addDays(parseIso(a), -1))}`; }
    else { undo = await applyChanges([{ op: "update", id, event: { ...e, skip: [...new Set([...(e.skip || []), a])] } }]); msg = `Termin am ${fmt(parseIso(a))} gelöscht – die Serie bleibt`; }
    closeSheet(); toast(msg, undo);
  } catch (err) { toast(writeErr(err)); btn.closest(".delch")?.querySelectorAll("button").forEach(x => x.disabled = false); }
}
async function delEvent(btn, id, a) {
  const e0 = EV.find(x => x.id === id);
  if (e0 && e0.repeat && e0.repeat !== "none" && a) { delChoice(btn, id, a, false); return; }
  if (btn.dataset.confirm !== "1") { btn.dataset.confirm = "1"; btn.textContent = EV.find(x => x.id === id)?.gEventId ? "Auch in Google löschen?" : "Wirklich löschen?"; setTimeout(() => { if (btn.isConnected) { btn.dataset.confirm = ""; btn.textContent = "Löschen"; } }, 4000); return; }
  btn.disabled = true;
  const hadDocs = (EV.find(x => x.id === id)?.files || []).length;
  try { const undo = await applyChanges([{ op: "delete", id }]); closeSheet(); toast(hadDocs ? "Gelöscht – Dokumente bleiben im Menü" : "Gelöscht", undo); }
  catch (err) { toast(writeErr(err)); btn.disabled = false; }
}

// =================== Assistent (wie im Chat) ===================
let asstActions = [];
let ASST_FILES = [];
// Eintragen: Freitext oder Formular – jederzeit umschaltbar, die letzte Wahl wird gemerkt
const entryMode = () => store.get("ft-entry") === "form" || !sample || !canWrite ? "form" : "text";
const entrySw = cur => sample && canWrite ? `<div class="seg emode" role="tablist" aria-label="Eingabe"><button type="button" role="tab" data-emode="text" aria-selected="${cur === "text"}">✍️ Freitext</button><button type="button" role="tab" data-emode="form" aria-selected="${cur === "form"}">📋 Formular</button></div>` : "";
let ASST_DAY = null, ASST_TO = null;
// ---- Nutzungsstatistik (pseudonym, ohne Inhalte): Zähler pro Tag und Funktion in docs/usage/<Tag> ----
let USE_Q = {}, USE_T = 0;
function use(f) { if (!APP || !db || !canWrite) return; USE_Q[f] = (USE_Q[f] || 0) + 1; clearTimeout(USE_T); USE_T = setTimeout(useFlush, 4000); }
async function useFlush() { const q = USE_Q; USE_Q = {}; if (!Object.keys(q).length) return; const day = iso(TODAY);
  try { const ref = COLL("usage").doc(day), cur = (await ref.get().catch(() => null))?.data?.() || {}, f = { ...(cur.f || {}) };
    for (const [k, n] of Object.entries(q)) f[k] = (f[k] || 0) + n; await ref.set({ day, f, v: 1 }); } catch {} }
window.addEventListener("pagehide", () => useFlush());   // im Kalender gewählter Tag – gilt im Freitext, solange dort kein anderes Datum steht
function newEntry(preset) { if (dbState === "off") return showSignin(); if (entryMode() === "form") showForm(null, preset || iso(TODAY)); else { ASST_DAY = preset ? parseIso(preset) : null; ASST_TO = null; showAssistant(); } }
function switchEntry(m) {
  store.set("ft-entry", m);
  if (m === "form") { const t = ($("a-in")?.value || "").trim().replace(/^vom\s+\d{1,2}\.\d{1,2}\.?\s*(bis\s+\d{1,2}\.\d{1,2}\.?)?\s*:?\s*/i, ""), A = ASST_DAY, B = ASST_TO;
    showForm(null, A ? iso(A) : iso(TODAY)); if (A && B && B > A) { const f = $("f-to"); if (f) { f.value = iso(B); f.dispatchEvent(new Event("change", { bubbles: true })); } }
    if (t && t.length <= 60 && !/\n/.test(t)) { const f = $("f-title"); if (f) { f.value = t; f.dispatchEvent(new Event("input", { bubbles: true })); } } }
  else { const t = ($("f-title")?.value || "").trim(), d = parseIso($("f-from")?.value || ""), e = parseIso($("f-to")?.value || ""); const pick = d && (!sameDay(d, TODAY) || (e && e > d));
    ASST_DAY = pick ? d : null; ASST_TO = pick && e && e > d ? e : null; showAssistant(); const i = $("a-in"); if (i && t) i.value = t; }
}
function showAssistant(keepFiles) {
  if (dbState === "off") return showSignin();
  if (!keepFiles) ASST_FILES = [];
  const ex = ["Zahnarzt Donnerstag 16 Uhr", "Ina vom Zug abholen: RE 4, Berlin Hbf, 13:55", "Nächste Woche Freitag Elternabend 19 Uhr", "Urlaub vom 3. bis 10. August", "Verschieb den Termin am Montag auf Dienstag", "Was steht nächste Woche an?"];
  openSheet("Eintragen", "Schreib einfach, was ansteht oder sich ändert", `
    <div class="asst">${entrySw("text")}
      ${ASST_DAY ? `<div class="a-day" id="a-day">📅 für <b>${fmt(ASST_DAY)}${ASST_TO ? ` – ${fmt(ASST_TO)}` : ""}${(ASST_TO || ASST_DAY).getFullYear() !== TODAY.getFullYear() ? " " + (ASST_TO || ASST_DAY).getFullYear() : ""}</b><button type="button" class="link" data-act="a-day-x" aria-label="Datum entfernen">✕</button></div>` : ""}
      <textarea class="in" id="a-in" rows="4" placeholder="Schreib, was ansteht – oder füge eine Mail, WhatsApp-Nachricht oder einen Link zur Buchung ein"></textarea>
      ${sample && canWrite ? `<div class="a-att"><label class="btn ghost small">📎 Ticket, Foto oder PDF<input type="file" hidden multiple accept="application/pdf,image/*" id="a-files"></label><span class="note" id="a-files-l">${ASST_FILES.length ? esc(ASST_FILES.map(f => f.name).join(", ")) : "daraus wird der Eintrag erstellt"}</span></div>` : ""}
      ${sample ? "" : `<p class="note">Die Texteingabe ist in dieser Ansicht nicht verfügbar. Nutze das Formular.</p>`}
      <div class="btnrow"><button type="button" class="btn accent" id="a-go"${sample ? "" : " disabled"}>Umwandeln</button></div>
      <div class="ex">${ex.map(t => `<button type="button" data-ex="${esc(t)}">${esc(t)}</button>`).join("")}</div>
      <div id="a-out"></div>
    </div>`, "asst");
  setTimeout(() => $("a-in")?.focus(), 50);
}
function evCompact(e) { return { id: e.id, type: e.type, title: e.title, from: e.from, to: e.to, time: e.time || undefined, repeat: e.repeat !== "none" ? e.repeat : undefined, birthYear: e.birthYear || undefined, note: e.note || undefined }; }
// Nachschlagen für den Assistenten: eigene + Google-Termine in einem Zeitraum
const gSeen = new Map();
async function lookupEvents(fromS, toS, query, signal) {
  let a = parseIso(fromS) || TODAY, b = parseIso(toS) || a;
  if (b < a) [a, b] = [b, a];
  if (dayDiff(a, b) > 400) b = addDays(a, 400);
  const words = String(query || "").toLowerCase().split(/\s+/).filter(Boolean);
  const hit = (t) => !words.length || words.every(w => t.toLowerCase().includes(w));
  const out = [];
  OCC.filter(o => o.ev.type !== "google" && o.b >= a && o.a <= b && hit(evName(o.ev) + " " + o.ev.note))
    .forEach(o => out.push({ id: o.ev.id, quelle: "eigener Termin", typ: TYPES[o.ev.type].label, titel: evName(o.ev), von: iso(o.a), bis: iso(o.b), zeit: timeTxt(o.ev), notiz: o.ev.note || undefined }));
  if (mcp && gState === "ok" && gShow) {
    const linked = EV.map(e => e.gEventId).filter(Boolean), isLinked = gid => linked.some(id => gid === id || gid.startsWith(id + "_"));
    await Promise.all(selectedCals().map(async cal => {
      const inp = { startTime: `${iso(a)}T00:00:00`, endTime: `${iso(addDays(b, 1))}T00:00:00`, pageSize: 250, orderBy: "startTime" };
      if (cal !== "primary") inp.calendarId = cal;
      try {
        const r = await mcp.callTool(GSERVER, "list_events", inp, { cache: { staleTime: 5 * 60e3, gcTime: 3600e3 }, signal });
        (r?.payload?.events || []).map(e => mapG(e, cal)).filter(Boolean).forEach(o => {
          if (isLinked(o.ev.gid) || !hit(o.ev.title + " " + o.ev.note)) return;
          gSeen.set(o.ev.id, o);
          out.push({ id: o.ev.id, quelle: `Google · ${o.ev.cal}`, titel: o.ev.title, von: iso(o.a), bis: iso(o.b), zeit: timeTxt(o.ev), ort: o.ev.note || undefined, serie: o.ev.recurring || undefined });
        });
      } catch (e) { out.push({ fehler: `Google-Kalender ${calLabel(cal)} nicht erreichbar (${e?.code || "Fehler"})` }); }
    }));
  }
  out.sort((x, y) => String(x.von || "").localeCompare(String(y.von || "")));
  return out.slice(0, 150);
}
async function runAssistant() {
  use("freitext");
  const txt = $("a-in").value.trim(), out = $("a-out"), go = $("a-go");
  if (!txt && !ASST_FILES.length) { out.innerHTML = `<p class="err">Schreib kurz, was eingetragen oder geändert werden soll – oder hänge ein Ticket an.</p>`; return; }
  go.disabled = true; go.textContent = "Denkt nach …"; out.innerHTML = "";
  const say = async t => { await sayWait(); out.innerHTML = `<p class="note">${esc(t)}</p>`; };
  let att = { imgs: [], texts: [] }, links = { texts: [], fails: [] };
  try {
    if (ASST_FILES.length) { await say(`📄 Ich lese ${ASST_FILES.length === 1 ? "„" + ASST_FILES[0].name + "“" : ASST_FILES.length + " Dokumente"} …`); const lim = await sample.limits().catch(() => null); att = await filesForAI(ASST_FILES, lim?.images?.maxCount || 0);
      await say(`🔎 ${att.texts.length ? att.texts.length + " Seite(n) Text" : ""}${att.texts.length && att.imgs.length ? " und " : ""}${att.imgs.length ? att.imgs.length + " Bild(er)" : ""} gelesen – ich suche Datum, Uhrzeit, Ort und Buchungsdaten …`); }
    if (URL_RE.test(txt)) { URL_RE.lastIndex = 0; links = await linksForAI(txt, t => say("🔗 " + t)); if (links.texts.length) await say("🔎 Seite gelesen – ich suche die Termindaten …"); }
  } catch {}
  URL_RE.lastIndex = 0;
  const hasAtt = ASST_FILES.length || links.texts.length;
  if (hasAtt) await say("✍️ Ich erstelle den Eintrag …");
  let canTools = false; try { canTools = !!(await sample.limits?.())?.tools; } catch {}
  let context = "";
  if (!canTools) { // Ohne Werkzeuge: Termine der nächsten 14 Monate direkt mitgeben
    const list = await lookupEvents(iso(addDays(TODAY, -31)), iso(addDays(TODAY, 400)), "");
    context = `Alle Termine (eigene und Google) von ${iso(addDays(TODAY, -31))} bis ${iso(addDays(TODAY, 400))}:\n${JSON.stringify(list)}\n`;
  }
  const prompt = `Du bist der Kalender-Assistent von ${ME()} (${nameA()}). Heute ist ${WDL[TODAY.getDay()]}, ${iso(TODAY)}.
Kalender-Zeitraum: ${iso(START)} bis ${iso(END)}.

Personen aus dem Profil: ${FAM().length ? FAM().map(p => `${p.name} (${({ partner: "Partner/in", kind: "Kind", mutter: "Mutter", vater: "Vater", geschwister: "Geschwister", freund: "Freund/in" })[p.role] || "Familie"})`).join(", ") : "keine angegeben"}. Typ "mina" = Umgangstermine eines Kindes beim anderen Elternteil (nur, wenn ausdrücklich so gemeint).

Es gibt zwei Arten von Terminen:
1. Eigene Termine (id ohne "g:"): vollständig bearbeitbar, mit allen Feldern unten.
2. Google-Termine (id beginnt mit "g:"): aus den Google-Kalendern des Nutzers (${["Mein Kalender", ...gCals.filter(c => selectedCals().includes(c.id)).map(c => c.summary)].join(", ")}). Bei ihnen kannst du nur title, from, to, time, endTime und note (= Ort) ändern oder sie löschen. Bei Serien betrifft das nur den einzelnen Termin.

${canTools ? `WICHTIG: Du siehst unten nur die eigenen Termine. Für jede Frage, ob/was an einem Datum oder in einem Zeitraum ansteht, und bevor du etwas änderst oder neu einträgst, rufe das Werkzeug find_events auf. Es liefert eigene UND Google-Termine. Behaupte nie, ein Tag sei frei, ohne find_events für diesen Tag aufgerufen zu haben.` : `Unten stehen alle Termine des relevanten Zeitraums, eigene und Google.`}

Felder für neue/geänderte eigene Termine:
- type: "termin" (alles andere) | "trip" (Reise mit Ziel/Unterkunft/Anreise) | "urlaub" (Urlaub, Ferien, freie Tage ohne Reise) | "dienst" (Dienst, Schicht, Bereitschaft) | "abholen" (jemanden vom Zug/Flug abholen oder hinbringen) | "info" (reiner Hinweis) | "birthday" | "mina" (Umgang) | "anniversary" | "deadline"
- title: kurz. Bei "birthday" nur der Name der Person.
- from, to: "YYYY-MM-DD" (to = from bei einem Tag)
- time, endTime: "HH:MM" oder ""
- repeat: "none" | "d1" (täglich) | "weekly" | "w2" (alle 2 Wochen, z. B. Müllabfuhr) | "w4" | "monthly" | "m3" | "m6" | "yearly" | "every2y" | "y3" (alle 3 Jahre, z. B. Vorsorge) | allgemein "<d|w|m|y><Zahl>" (Geburtstage immer "yearly")
- birthYear: Zahl oder 0
- note: kurze Zusatzinfo auf Deutsch oder ""
- mode: Anreise bei Reisen: "zug" | "flug" | "bus" | "auto" | "rad" | "" (nur wenn eindeutig)
- place: Ort für die Navigation. Bei einem Hotel, Restaurant oder bekannten Ort die vollständige Adresse (Name, Straße Nr., PLZ Ort), aber NUR wenn du sie sicher kennst – sonst Name und Ort wie genannt (z. B. "Inselhotel, Potsdam"). Nichts erfinden. Ohne Ortsangabe ""
- flight: true bei Reisen mit Flug (Flugnummer, Flughafen, Airline), sonst false
- kids: true, wenn Kinder${kidsNames().length ? ` (${kidsNames().join(", ")})` : ""} mitreisen, sonst false
- calendar: siehe unten
${TRAIN_RULE}

Datumsregeln: Wochentage, "nächste Woche", "übermorgen" usw. relativ zum Bezugsdatum auflösen. Bezugsdatum ist heute – AUSSER die Nachricht ist eine kopierte Mail oder WhatsApp mit Datum/Zeitstempel (z. B. "[12.11.26, 20:15] Anna: …", "12.11.26, 20:15 - Anna: …", "Am Mo., 2. Nov. schrieb …", "Gesendet: …"): dann ist das Datum dieser Nachricht das Bezugsdatum. "Nächste Woche Donnerstag" = Donnerstag der Kalenderwoche nach dem Bezugsdatum. Ohne Jahr: das nächste passende Datum ab Bezugsdatum. "Wochenende" = Freitag bis Sonntag, wenn nichts anderes gesagt ist.

Kopierte Nachrichten:
- Wer "ich" schreibt, ist der Absender. Steht ein Absender dabei (z. B. "Anna:" bei WhatsApp, "Anna Müller" bei Mails) und es ist nicht ${ME()}, ist es ein Termin dieser Person: title mit Namen davor, z. B. "Anna: Elternabend". Ohne erkennbaren Absender ist "ich" ${ME()}.
- Mailverläufe mit Vorschlägen, Rückfragen und Korrekturen: Es gilt die zuletzt vereinbarte Fassung. Verworfene oder ersetzte Vorschläge NICHT eintragen. Was ausdrücklich noch offen ist, mit note "noch offen: …" eintragen oder in reply nachfragen.
- Uhrzeiten, Abholzeiten, Orte und wichtige Bedingungen kurz in time bzw. note übernehmen (z. B. "Abholung 12 Uhr an der Schule").
- Prüfe vorhandene Termine (eigene und Google): Gibt es denselben Termin schon, schlage "update" statt "add" vor oder lass ihn weg.

Google-Kalender für neue Termine (Feld "calendar" in event): "Mein Kalender" für eigene Termine${gCals.filter(c => selectedCals().includes(c.id)).length ? `, sonst einer von: ${gCals.filter(c => selectedCals().includes(c.id)).map(c => `"${c.summary}"`).join(", ")}, wenn er offensichtlich passt` : ""}; "" wenn der Termin nur hier stehen soll (z. B. reine Hinweise).

Eigene Termine (JSON):
${JSON.stringify(EV.map(evCompact))}
${context}
Antworte am Ende NUR mit JSON in genau dieser Form:
{"reply": "1–3 kurze Sätze auf Deutsch: was du verstanden hast, oder die Antwort auf die Frage mit den gefundenen Terminen (Titel, Datum, Uhrzeit, Kalender)", "actions": [
  {"op": "add", "event": {alle Felder}},
  {"op": "update", "id": "vorhandene id", "event": {alle Felder, vollständig}},
  {"op": "delete", "id": "vorhandene id"}
]}
Bei einer reinen Frage: actions = []. Erfinde keine ids. Wenn bei einer ÄNDERUNG oder LÖSCHUNG unklar ist, welcher vorhandene Termin gemeint ist, frag in reply nach und lass actions leer.
Stichworte sind erlaubt: Kurze Eingaben wie "Abholen 20.12", "Friseur Freitag", "Reifen 3.4." sind ein Auftrag zum Eintragen – IMMER sofort als "add" vorschlagen, mit dem, was da ist (title aus dem Stichwort, sinnvoll großgeschrieben; time und place leer lassen). NICHT nach Uhrzeit, Ort oder Details fragen – das kann man später ergänzen. Datum ohne Jahr: das nächste kommende. Nur wenn gar kein Datum erkennbar ist, kurz nachfragen.

${hasAtt ? "\n" + ATTACH_HINT + "\n" + [...att.texts, ...links.texts].join("\n\n").slice(0, 20000) + (att.imgs.length ? `\n(Dazu ${att.imgs.length} Bild(er) der Dokumente.)` : "") + "\n" : ""}${links.fails.length ? `\nHinweis: Der Link ${links.fails.join(", ")} ließ sich nicht lesen (z. B. Login nötig). Sag das kurz in reply und nutze nur, was sonst bekannt ist.\n` : ""}
${ASST_DAY ? (ASST_TO ? `Im Kalender gewählter Zeitraum: ${iso(ASST_DAY)} bis ${iso(ASST_TO)}. Nennt die Nachricht kein eigenes Datum, gilt sie für diesen Zeitraum (from = ${iso(ASST_DAY)}, to = ${iso(ASST_TO)}) – dann NICHT nach dem Datum fragen.` : `Im Kalender gewählter Tag: ${iso(ASST_DAY)} (${WDL[ASST_DAY.getDay()]}). Nennt die Nachricht kein eigenes Datum, gilt sie für diesen Tag (from = to = ${iso(ASST_DAY)}, außer es ist erkennbar ein Zeitraum ab diesem Tag) – dann NICHT nach dem Datum fragen.`) + "\n" : ""}Nachricht: ${txt || "(nur Anhänge)"}`;
  const tools = canTools ? [{ name: "find_events", description: "Sucht eigene und Google-Termine in einem Zeitraum (höchstens 400 Tage). Gibt eine Liste mit id, quelle, titel, von, bis, zeit zurück. Optional nach Wörtern im Titel filtern.",
    inputSchema: { type: "object", properties: { from: { type: "string", description: "YYYY-MM-DD" }, to: { type: "string", description: "YYYY-MM-DD" }, query: { type: "string", description: "optionale Suchwörter, z. B. Zahnarzt oder Urlaub" } }, required: ["from", "to"] },
    execute: async (i, ctx) => ({ termine: await lookupEvents(String(i.from || ""), String(i.to || i.from || ""), String(i.query || ""), ctx?.signal) }) }] : undefined;
  try {
    const r = await (window.MK_TASK = "assistent", sample.json)(prompt, { modelTier: "default", cache: false, tools, images: att.imgs.length ? att.imgs : undefined });
    asstActions = (Array.isArray(r?.actions) ? r.actions : []).map(a => {
      const gid = typeof a.id === "string" && a.id.startsWith("g:");
      if (gid) {
        const o = gSeen.get(a.id) || OCC.find(x => x.ev.id === a.id); if (!o) return null;
        if (a.op === "delete") return { op: "gdelete", id: a.id, occ: o };
        if (a.op !== "update") return null;
        const ev = a.event || {}, v = { title: String(ev.title || o.ev.title), from: ev.from || iso(o.a), to: ev.to || ev.from || iso(o.b), time: ev.time ?? o.ev.time, endTime: ev.endTime ?? o.ev.endTime, loc: ev.note ?? o.ev.note };
        if (!parseIso(v.from) || !parseIso(v.to)) return null;
        return { op: "gupdate", id: a.id, occ: o, gv: v, event: { ...v, note: v.loc, repeat: "none" } };
      }
      if (a.op === "delete") return EV.some(e => e.id === a.id) ? { op: "delete", id: a.id } : null;
      if (a.op !== "add" && a.op !== "update") return null;
      if (a.op === "update" && !EV.some(e => e.id === a.id)) return null;
      const ev = { ...plain(normalize("", a.event)) }; ev.birthYear = +a.event?.birthYear || 0;
      if (a.op === "update") { const old = EV.find(e => e.id === a.id); ev.gcal = old?.gcal || ""; ev.gEventId = old?.gEventId || ""; }
      else { const want = String(a.event?.calendar ?? "Mein Kalender").trim().toLowerCase();
        ev.gcal = !want ? "" : /mein|haupt|primary/.test(want) ? "primary" : (gCals.find(c => c.summary.toLowerCase() === want)?.id || "primary");
        if (famGroups().length && ev.type !== "birthday" && gWritable()) { const pick = famPick(ev.title + " " + (ev.note || "")) || famPick($("a-in")?.value || ""); if (pick) ev.gcal = pick; }
        if (SHR_ON() && ev.type !== "birthday") ev.shareTo = [...new Set([...shrPick(ev.title + " " + ($("a-in")?.value || "")), ...autoLs()])]; }
      if (validate(ev)) return null;
      return { op: a.op, id: a.id, event: ev };
    }).filter(Boolean);
    out.innerHTML = `${r?.reply ? `<div class="reply">${esc(r.reply)}</div>` : ""}` + (asstActions.length ? `<div class="acts-list">${asstActions.map((a, i) => actHtml(a, i)).join("")}</div>
      ${canWrite ? `<button type="button" class="btn accent wide" id="a-apply">Übernehmen</button>` : `<p class="note">Speichern kann nur der Besitzer der Seite.</p>`}` : "");
  } catch (e) {
    out.innerHTML = `<p class="err">${e?.code === "rate_limited" ? RL(e) : e?.code === "not_granted" ? "Die Texteingabe ist nicht freigegeben. Nutze das Formular." : "Das hat nicht geklappt. Formulier es etwas anders oder nutze das Formular."}</p>`;
  }
  go.disabled = false; go.textContent = "Umwandeln";
}
function actHtml(a, i) {
  if (a.op === "gupdate" || a.op === "gdelete") {
    const o = a.occ, tag = a.op === "gupdate" ? `<span class="tag upd">Ändern</span>` : `<span class="tag del">Löschen</span>`;
    const v = a.gv, desc = a.op === "gupdate" ? [rngTxt(parseIso(v.from), parseIso(v.to), true), v.time].filter(Boolean).join(" · ") : rngTxt(o.a, o.b, true);
    return `<label class="act"><input type="checkbox" checked data-act="${i}"><span class="body">${tag}<b>${esc(a.op === "gupdate" ? v.title : o.ev.title)}</b><div class="note">Google · ${esc(o.ev.cal)} · ${esc(desc)}</div>${a.op === "gupdate" ? `<div class="note">vorher: ${esc(rngTxt(o.a, o.b, true))}${o.ev.time ? " · " + esc(o.ev.time) : ""}</div>` : ""}</span></label>`;
  }
  const old = a.id && EV.find(e => e.id === a.id);
  const tag = a.op === "add" ? `<span class="tag add">Neu</span>` : a.op === "update" ? `<span class="tag upd">Ändern</span>` : `<span class="tag del">Löschen</span>`;
  const e = a.op === "delete" ? old : a.event, ea = parseIso(e.from), eb = parseIso(e.to) || ea;
  const desc = [rngTxt(ea, eb, true), timeTxt(e), e.repeat && e.repeat !== "none" ? repLabel(e.repeat) : "", e.note, e.place ? "📍 " + e.place : ""].filter(Boolean).join(" · ");
  const was = a.op === "update" && old ? `<div class="note">vorher: ${esc(rngTxt(old.a, old.b, true))}${old.time ? " · " + esc(old.time) : ""}</div>` : "";
  return `<label class="act"><input type="checkbox" checked data-act="${i}"><span class="body">${tag}<b>${esc(evName(e))}</b><div class="note">${esc(desc)}</div>${was}
    ${a.op === "add" && canWrite && gWritable() ? `<div class="act-cal"><span class="note">${isShareCal(a.event.gcal) ? "👪 Geteilt mit:" : "Google:"}</span><select data-acal="${i}" aria-label="Google-Kalender">${gCalOptions(a.event.gcal)}</select></div>` : ""}
    ${a.op === "add" && SHR_ON() && a.event.type !== "birthday" ? (SHR.contacts.length ? `<div class="act-sh"><span class="note">👥 Teilen mit:</span>${shrChips(`data-ash${i}`, a.event.shareTo || [])}</div>`
      : `<div class="act-sh"><span class="note">👥 Mit jemandem teilen? </span><button type="button" class="link" id="mi-share">Person einladen</button></div>`) : ""}
    ${a.op !== "delete" ? `<button type="button" class="link" data-adjust="${i}">Anpassen</button>` : ""}</span></label>`;
}
async function applyAssistant() {
  const picked = asstActions.map((a, i) => a.op === "add" && document.querySelector(`[data-acal="${i}"]`) ? { ...a, event: { ...a.event, gcal: document.querySelector(`[data-acal="${i}"]`).value } } : a)
    .map((a, i) => a.op === "add" && document.querySelector(`[data-ash${i}]`) ? { ...a, event: { ...a.event, ...shSplit(chipSel(`data-ash${i}`)) } } : a)
    .filter((_, i) => document.querySelector(`[data-act="${i}"]`)?.checked);
  if (!picked.length) { closeSheet(); return; }
  const btn = $("a-apply"); btn.disabled = true; btn.textContent = "Speichert …";
  try {
    const own = picked.filter(a => !a.op.startsWith("g")), gs = picked.filter(a => a.op.startsWith("g")), gUndo = [];
    for (const a of gs) {
      const o = a.occ, snap = gSnap(o);
      if (a.op === "gupdate") { await gApplyEdit(o, a.gv); gUndo.push(() => gApplyEdit(o, snap)); }
      else { const inp = { eventId: o.ev.gid, notificationLevel: "NONE" }; if (o.ev.calId !== "primary") inp.calendarId = o.ev.calId; await mcp.callTool(GSERVER, "delete_event", inp); gDropLocal(o.ev.gid, o.ev.calId);
        gUndo.push(async () => { const c = gInput({ title: snap.title, from: snap.from, to: snap.to, time: snap.time, endTime: snap.endTime, gcal: o.ev.calId }); if (snap.loc) c.location = snap.loc; await mcp.callTool(GSERVER, "create_event", c); }); }
    }
    if (gs.length) { mcp.invalidate(GSERVER, "list_events").catch(() => {}); gResync(); }
    const undoOwn = own.length ? await applyChanges(own) : null;
    const files = ASST_FILES; ASST_FILES = [];
    closeSheet();
    const newId = LAST_ADDED.find(x => ["trip", "termin"].includes(x.v.type)) || LAST_ADDED[0];
    if (files.length && newId) setTimeout(() => docUpload({ ...newId.v, id: newId.id, files: [], a: parseIso(newId.v.from), b: parseIso(newId.v.to || newId.v.from) }, files), 400);
    toast(picked.length === 1 ? "Übernommen" : `${picked.length} Änderungen übernommen`, async () => { for (const u of gUndo.reverse()) await u(); if (undoOwn) await undoOwn(); else toast("Rückgängig gemacht"); mcp?.invalidate(GSERVER, "list_events").catch(() => {}); });
  }
  catch (e) { btn.disabled = false; btn.textContent = "Übernehmen"; $("a-out").insertAdjacentHTML("beforeend", `<p class="err">${e?.code === "tool_error" ? gErr(e) : writeErr(e)}</p>`); }
}

// =================== Teilen ===================
const CARD = { bg: "#ffffff", head: "#0f6e73", headInk: "#ffffff", ink: "#1d2329", muted: "#66707a", line: "#e3e6e9", soft: "#eef6f6" };
async function fontsReady() {
  try { await Promise.all(['600 60px "Fraunces"', '500 34px "IBM Plex Mono"', '400 30px "IBM Plex Sans"', '600 34px "IBM Plex Sans"'].map(f => document.fonts.load(f))); } catch {}
}
function wrapLines(ctx, text, maxW) {
  const words = String(text).split(/\s+/), lines = []; let line = "";
  words.forEach(w => { const t = line ? line + " " + w : w; if (ctx.measureText(t).width > maxW && line) { lines.push(line); line = w; } else line = t; });
  if (line) lines.push(line); return lines;
}
async function drawCard({ kicker, title, rows, footer }) {
  await fontsReady();
  const W = 1080, P = 72, c = document.createElement("canvas"), x = c.getContext("2d");
  x.font = '400 30px "IBM Plex Sans", sans-serif';
  const prepared = rows.map(r => ({ ...r, notes: r.n ? wrapLines(x, r.n, W - 2 * P - 40) : [] }));
  const rowH = r => (r.big ? 86 : 70) + r.notes.length * 40 + 18;
  const headH = 250, H = headH + 40 + prepared.reduce((s, r) => s + rowH(r), 0) + 110;
  c.width = W; c.height = H;
  x.fillStyle = CARD.bg; x.fillRect(0, 0, W, H);
  x.fillStyle = CARD.head; x.fillRect(0, 0, W, headH);
  x.fillStyle = "rgba(255,255,255,.75)"; x.font = '600 28px "IBM Plex Sans", sans-serif'; x.fillText(kicker.toUpperCase(), P, 96);
  x.fillStyle = CARD.headInk; x.font = '600 66px "Fraunces", Georgia, serif';
  const tl = wrapLines(x, title, W - 2 * P); x.fillText(tl[0] + (tl.length > 1 ? " …" : ""), P, 178);
  let y = headH + 40;
  prepared.forEach((r, i) => {
    if (i) { x.fillStyle = CARD.line; x.fillRect(P, y - 4, W - 2 * P, 2); }
    x.fillStyle = CARD.head; x.beginPath(); x.arc(P + 9, y + 42, 9, 0, Math.PI * 2); x.fill();
    x.fillStyle = CARD.ink; x.font = r.big ? '600 44px "IBM Plex Sans", sans-serif' : '500 36px "IBM Plex Mono", monospace';
    x.fillText(r.l, P + 40, y + (r.big ? 58 : 54));
    if (r.r) { x.font = '400 30px "IBM Plex Sans", sans-serif'; x.fillStyle = CARD.muted; const w = x.measureText(r.r).width; x.fillText(r.r, W - P - w, y + 52); }
    x.font = '400 30px "IBM Plex Sans", sans-serif'; x.fillStyle = CARD.muted;
    r.notes.forEach((ln, j) => x.fillText(ln, P + 40, y + (r.big ? 100 : 92) + j * 40));
    y += rowH(r);
  });
  x.fillStyle = CARD.muted; x.font = '400 24px "IBM Plex Sans", sans-serif'; x.fillText(footer, P, H - 48);
  return c;
}
async function shareOcc(id, a) {
  const o = findOcc(id, a); if (!o) return;
  const e = o.ev, rows = [{ l: rngTxt(o.a, o.b, true), big: true, n: [timeTxt(e) ? timeTxt(e) + " Uhr" : "", ageTxt(o)].filter(Boolean).join(" · ") }];
  if (e.note) rows.push({ l: "Notiz", n: e.note });
  const text = [evName(e), rngTxt(o.a, o.b, true) + (timeTxt(e) ? `, ${timeTxt(e)} Uhr` : ""), ageTxt(o), e.note].filter(Boolean).join("\n");
  showShare(evName(e), { kicker: TYPES[e.type].label, title: evName(e), rows, footer: `Mein Kalender · ${[nameA(), nameB()].filter(Boolean).join(" & ")}` }, text, `${evName(e).replace(/[^\wäöüÄÖÜß-]+/g, "-")}-${iso(o.a)}`);
}
function shareCare(y) {
  const list = kidOcc(y);
  const rows = list.map(o => ({ l: rngTxt(o.a, o.b, o.b.getFullYear() !== y), r: o.ev.type === "info" ? o.ev.title.replace(/^Weihnachten:\s*/, "") : "", n: o.ev.type === "info" ? "" : o.ev.note }));
  const text = `Umgangstermine – ${y}\n` + list.map(o => `• ${rngTxt(o.a, o.b, o.b.getFullYear() !== y)}${o.ev.type === "info" ? ` – ${o.ev.title}` : ""}${o.ev.note && o.ev.type !== "info" ? ` (${o.ev.note})` : ""}`).join("\n");
  showShare(`Umgangstermine ${y}`, { kicker: `Umgangstermine ${y}`, title: "Umgangstermine", rows, footer: `Stand ${p2(TODAY.getDate())}.${p2(TODAY.getMonth()+1)}.${TODAY.getFullYear()}` }, text, `umgangstermine-${y}`);
}
let shareCanvas = null, shareName = "";
async function showShare(title, card, text, fname) {
  openSheet("Teilen", title, `<p class="note">Bild wird erstellt …</p>`, "share");
  shareCanvas = await drawCard(card); shareName = fname;
  if (sheetMode !== "share") return;
  $("sheet-body").innerHTML = `<img class="share-img" alt="Vorschau: ${esc(title)}" src="${shareCanvas.toDataURL("image/png")}">
    <textarea class="share-txt" id="share-txt" rows="${Math.min(10, text.split("\n").length + 1)}" readonly>${esc(text)}</textarea>
    <div class="btnrow"><button type="button" class="btn accent" id="share-copy">Text kopieren</button>
    ${downloads ? `<button type="button" class="btn ghost" id="share-save">Bild speichern</button>` : ""}</div>
    <p class="note" id="share-msg">Text in WhatsApp oder eine Mail einfügen, oder das Bild speichern und verschicken.</p>`;
}
function copyShare() {
  const ta = $("share-txt"), msg = $("share-msg");
  const fallback = () => { ta.focus(); ta.select(); msg.textContent = "Text ist markiert. Jetzt kopieren und einfügen."; };
  try { navigator.clipboard.writeText(ta.value).then(() => { msg.textContent = "Text kopiert."; }, fallback); } catch { fallback(); }
}
function saveShare() {
  const msg = $("share-msg");
  shareCanvas.toBlob(async blob => {
    try { await downloads.save({ filename: `${shareName}.png`, data: blob }); msg.textContent = "Bild gespeichert."; }
    catch (e) { msg.textContent = e?.code === "declined" ? "Speichern abgebrochen." : "Bild speichern ist hier nicht möglich. Mach alternativ einen Screenshot der Vorschau."; }
  }, "image/png");
}

// =================== Google Kalender ===================
const GSERVER = "Google Calendar";
let mcp = null, gState = "off", gCals = [], gPrimarySummary = "", GEV = new Map(), GWATCH = new Map();
// Kalenderauswahl & „schon gefragt“ auch im Konto merken – dann fragt ein neues Gerät nicht wieder alles ab
let gProfT = null;
function saveGSel(set) { store.set("ft-gcal-sel", JSON.stringify([...set])); gProfSave({ gcalSel: [...set], gcalAsked: true }); }
function gProfSave(patch) { if (!canWrite || !profileLoaded) return; Object.assign(PROFILE, patch); clearTimeout(gProfT);
  gProfT = setTimeout(async () => { try { await COLL("prefs").doc("profile").update(patch); } catch {} }, 800); }
let gSel = (() => { try { const v = JSON.parse(store.get("ft-gcal-sel") || "null"); return Array.isArray(v) ? new Set(v) : null; } catch { return null; } })();
let gShow = store.get("ft-gcal-show") !== "0";
const gOn = () => gShow && gState === "ok";
// Viertel-Jahres-Abschnitte, damit nur geladen wird, was gerade gebraucht wird
const GCHUNKS = []; for (let t = new Date(START); t <= END; t = new Date(t.getFullYear(), t.getMonth() + 3, 1)) GCHUNKS.push([t, addDays(new Date(t.getFullYear(), t.getMonth() + 3, 1), -1)]);
const chunkOf = dt => GCHUNKS.findIndex(([a, b]) => dt >= a && dt <= b);
function neededChunks() {
  const need = new Set(), addRange = (a, b) => GCHUNKS.forEach(([x, y], i) => { if (x <= b && y >= a) need.add(i); });
  addRange(TODAY, addDays(TODAY, 14));
  addRange(wkStart, addDays(wkStart, 6));                     // Heute-Seite: gewählte Woche
  if (view === "month") { const { y, m } = MONTHS[curMi]; addRange(addDays(new Date(y, m, 1), -7), addDays(new Date(y, m + 1, 0), 7)); }
  if (view === "year") addRange(new Date(selYear, 0, 1), new Date(selYear, 11, 31));
  if (view === "week") addRange(weekStart, addDays(weekStart, 6));
  if (view === "two") addRange(twoStart, addDays(twoStart, 13));
  if (view === "list") addRange($("l-past").checked || $("q").value.trim() ? START : TODAY, END);
  if (selDay) addRange(selDay, selDay);
  if (statsOpen) addRange(new Date(selYear, 0, 1), new Date(selYear, 11, 31));
  return need;
}
const GPAL = [["#039be5", "#fff"], ["#8e24aa", "#fff"], ["#33b679", "#fff"], ["#e67c73", "#fff"], ["#616161", "#fff"]];
function gColor(id) {
  const name = calLabel(id).toLowerCase();
  if (id === "primary") return ["#f4b400", "#2b2100"];
  if (name === "familie") return ["#a1887f", "#fff"];
  if (name === "ina") return ["#3f51b5", "#fff"];
  const i = Math.max(0, gCals.findIndex(c => c.id === id)); return GPAL[i % GPAL.length];
}
function calLabel(id) { if (id === "primary") return "Mein Kalender"; const c = gCals.find(x => x.id === id); return c ? c.summary : "Google"; }
// Kalender-Auswahl als große Karten (Einrichtung und nach dem Verbinden)
function gPickList() {
  const cals = [{ id: "primary", summary: "Mein Kalender", sub: gPrimarySummary || "dein Hauptkalender" }, ...gCals.filter(c => !c.primary && c.summary !== gPrimarySummary && c.id !== gPrimarySummary)], sel = new Set(selectedCals());
  return `<div class="wz-picks" style="--accent:var(--both)">${cals.map(c => `<button type="button" class="wz-pick${sel.has(c.id) ? " on" : ""}" data-wzcal="${esc(c.id)}" aria-pressed="${sel.has(c.id)}"><i style="background:${gColor(c.id)[0]}"></i><span>${esc(c.summary)}${c.sub ? `<small style="display:block;font-size:13px;color:var(--muted);font-weight:400">${esc(c.sub)}</small>` : ""}</span><em>${sel.has(c.id) ? "✓" : ""}</em></button>`).join("")}</div>
    <p class="note" style="margin-top:10px">${sel.size} von ${cals.length} ausgewählt · Ändern kannst du das später jederzeit unter <b>☰ → Google Kalender</b>.</p>`;
}
function showGCalPick() {
  openSheet("Welche Kalender möchtest du sehen?", "Google ist verbunden – tippe an, was hier erscheinen soll", `${gPickList()}
    <button type="button" class="btn accent wide" id="gpick-done" style="margin-top:12px">Fertig</button>`, "gpick");
}
function selectedCals() {
  if (!gSel) { gSel = new Set(["primary"]); }
  return [...gSel];
}
// Eigene Google-Adresse (aus dem Hauptkalender ermittelt, nicht im Quelltext)
const myMail = () => (gPrimarySummary || "").toLowerCase();
const isMe = c => !c || c.self === true || (!!myMail() && String(c.email || "").toLowerCase().replace("googlemail.com", "gmail.com") === myMail().replace("googlemail.com", "gmail.com"));
const hhmm = d => `${p2(d.getHours())}:${p2(d.getMinutes())}`;
function mapG(e, calId) {
  if (!e || e.status === "cancelled") return null;
  if (APP && /^mks[a-v0-9]+/.test(String(e.id || "")) && /Mein Kalender/.test(String(e.description || ""))) return null;   // Spiegel eines geteilten Termins – erscheint schon als „geteilt“
  const s = e.start || {}, en = e.end || {};
  let a, b, time = "", endTime = "";
  if (s.date) { a = parseIso(s.date); b = addDays(parseIso(en.date) || addDays(a, 1), -1); }
  else if (s.dateTime) {
    const ds = new Date(s.dateTime), de = new Date(en.dateTime || s.dateTime);
    a = new Date(ds.getFullYear(), ds.getMonth(), ds.getDate()); time = hhmm(ds);
    b = new Date(de.getFullYear(), de.getMonth(), de.getDate());
    if (de.getHours() === 0 && de.getMinutes() === 0 && b > a) b = addDays(b, -1);
    if (sameDay(a, b) && de > ds) endTime = hhmm(de);
  } else return null;
  if (!a) return null; if (!b || b < a) b = a;
  let [color, ink] = gColor(calId); const ecol = !!(e.colorId && ECOLM[e.colorId]); if (ecol) { color = ECOLM[e.colorId]; ink = lumInk(color); }
  const ev = { id: `g:${calId}:${e.id}`, gid: String(e.id), calId, recurring: !!e.recurringEventId, rid: String(e.recurringEventId || ""), type: "google", color, ink, ecol, colorId: ecol ? String(e.colorId) : "", title: String(e.summary || "(ohne Titel)"), time, endTime, note: String(e.location || gPlace()[String(e.id)] || ""),
    repeat: "none", a, b, cal: calLabel(calId), creator: isMe(e.creator) ? "" : String(e.creator?.displayName || (e.creator?.email || "").split("@")[0] || ""),
    created: String(e.created || ""), updated: String(e.updated || ""), link: /^https:\/\/(www\.)?google\.com\/calendar\//.test(e.htmlLink || "") ? e.htmlLink : "" };
  return { ev, a, b };
}
let gRenderT = null;
const gRender = () => { clearTimeout(gRenderT); gRenderT = setTimeout(renderAll, 60); };
function gFail(code) {
  if (["needs_reauth", "server_not_connected", "not_in_manifest", "blocked_by_policy", "approval_required", "selection_required", "not_granted", "capability_disabled", "capability_removed"].includes(code)) {
    gState = code; GWATCH.forEach(u => u()); GWATCH.clear(); GEV.clear(); gRender();
  }
}
// Gibt true zurück, wenn neue Abschnitte angefordert wurden
function ensureGoogle() {
  if (!mcp || gState !== "ok" || !gShow) return false;
  let added = false;
  const cals = selectedCals(), need = neededChunks();
  cals.forEach(cal => need.forEach(i => {
    const key = `${cal}|${i}`; if (GWATCH.has(key)) return;
    const [a, b] = GCHUNKS[i];
    const input = { startTime: `${iso(a)}T00:00:00`, endTime: `${iso(addDays(b, 1))}T00:00:00`, pageSize: 250, orderBy: "startTime" };
    if (cal !== "primary") input.calendarId = cal;
    added = true;
    if (!GEV.has(key)) { const c = gCacheGet(key); if (c) GEV.set(key, c.e.map(e => mapG(e, cal)).filter(Boolean)); }
    GWATCH.set(key, mcp.watchTool(GSERVER, "list_events", input, evt => {
      if (evt.type === "data") {
        const p = evt.result?.payload || {}; gLiveAt = Date.now();
        if (Array.isArray(p.events)) { const [ca] = GCHUNKS[i]; if (Math.abs(dayDiff(TODAY, ca)) < 400) gCachePut(key, p.events); }
        if (cal === "primary" && p.summary && !gPrimarySummary) gPrimarySummary = String(p.summary);
        GEV.set(key, (Array.isArray(p.events) ? p.events : []).map(e => mapG(e, cal)).filter(Boolean));
        gRender();
      } else gFail(evt.error?.code);
    }, { cache: { staleTime: 15 * 60e3, gcTime: 24 * 3600e3 }, refetchInterval: 30 * 60e3 }));
  }));
  ensureExtra(cals, need);
  return added;
}
// Countdowns (nächste 4 Monate) und „vor einem Jahr“: höchstens einmal am Tag laden, sonst aus dem Speicher
const EXTRA_DONE = new Set();
function ensureExtra(cals, need) {
  const ex = new Set(), add = (a, b) => GCHUNKS.forEach(([x, y], i) => { if (x <= b && y >= a && !need.has(i)) ex.add(i); });
  add(TODAY, addDays(TODAY, 120)); add(addDays(TODAY, -372), addDays(TODAY, -358));
  cals.forEach(cal => ex.forEach(i => { const key = `${cal}|${i}`; if (EXTRA_DONE.has(key) || GWATCH.has(key)) return; EXTRA_DONE.add(key);
    const c = gCacheGet(key); if (c && !GEV.has(key)) GEV.set(key, c.e.map(e => mapG(e, cal)).filter(Boolean));
    if (c && Date.now() - c.t < 24 * 3600e3) return;
    const [a, b] = GCHUNKS[i], input = { startTime: `${iso(a)}T00:00:00`, endTime: `${iso(addDays(b, 1))}T00:00:00`, pageSize: 250, orderBy: "startTime" };
    if (cal !== "primary") input.calendarId = cal;
    setTimeout(() => withTimeout(mcp.callTool(GSERVER, "list_events", input, { cache: { staleTime: 24 * 3600e3, gcTime: 48 * 3600e3 } }), 20000)
      .then(r => { const ev = Array.isArray(r?.payload?.events) ? r.payload.events : null; if (!ev || GWATCH.has(key)) return; GEV.set(key, ev.map(e => mapG(e, cal)).filter(Boolean)); gCachePut(key, ev); gRender(); })
      .catch(() => EXTRA_DONE.delete(key)), 3000 + Math.random() * 4000);
  }));
}
function resetGoogleWatches() { GWATCH.forEach(u => u()); GWATCH.clear(); GEV.clear(); EXTRA_DONE.clear(); renderAll(); }
// Mit Google abgleichen: Zwischenspeicher verwerfen und alles neu laden
let gSyncAt = Date.now();
async function gSync(quiet) {
  if (!mcp || gState !== "ok") { if (!quiet) toast("Google ist gerade nicht verbunden."); return; }
  gSyncAt = Date.now();
  try { await mcp.invalidate(GSERVER, "list_events"); } catch {}
  resetGoogleWatches(); if (!quiet) toast("Mit Google abgeglichen");
}
document.addEventListener("visibilitychange", () => { if (document.visibilityState !== "visible" || !mcp) return;
  if (gState !== "ok" && !FATAL.includes(gState)) { gTry = 0; initGoogle(); } else if (Date.now() - gSyncAt > 2 * 60e3) gSync(true); });
setInterval(() => { if (document.visibilityState === "visible" && mcp && gState === "ok" && Date.now() - gSyncAt > 5 * 60e3 && $("sheet")?.hidden) gSync(true); }, 60e3);
// Google robuster: zuletzt bekannte Kalender und Termine sofort zeigen, im Hintergrund neu laden, bei Hängern erneut versuchen
const withTimeout = (p, ms) => Promise.race([p, new Promise((_, rej) => setTimeout(() => rej({ code: "timeout" }), ms))]);
const FATAL = ["api_disabled", "needs_reauth", "server_not_connected", "not_in_manifest", "blocked_by_policy", "approval_required", "selection_required", "not_granted", "capability_disabled", "capability_removed"];
let gTry = 0, gRetryT = null, gLiveAt = 0;
function gCacheGet(k) { try { const v = JSON.parse(store.get("ft-gc-" + k) || "null"); return v && Array.isArray(v.e) ? v : null; } catch { return null; } }
function gCachePut(k, events) { try {
  const slim = events.map(e => ({ id: e.id, status: e.status, summary: e.summary, location: e.location, start: e.start, end: e.end, recurringEventId: e.recurringEventId, htmlLink: e.htmlLink, created: e.created, updated: e.updated, creator: e.creator, colorId: e.colorId }));
  store.set("ft-gc-" + k, JSON.stringify({ t: Date.now(), e: slim })); } catch {} }
async function initGoogle() {
  clearTimeout(gRetryT);
  let cached = null; try { cached = JSON.parse(store.get("ft-gcals") || "null"); } catch {}
  if (Array.isArray(cached) && cached.length && gState !== "ok") { gCals = cached; gState = "ok"; renderGPill(); renderAll(); }
  else if (gState !== "ok") { gState = "loading"; renderGPill(); }
  try {
    const r = await withTimeout(mcp.callTool(GSERVER, "list_calendars", {}, { cache: { staleTime: 10 * 60e3, gcTime: 24 * 3600e3 } }), 15000);
    const list = Array.isArray(r?.payload?.calendars) ? r.payload.calendars : [];
    gCals = list.filter(c => c && c.id && !/#(holiday|weeknum|contacts)@/.test(c.id)).map(c => ({ id: String(c.id), summary: String(c.summary || c.id), ...(c.primary ? { primary: true } : {}), ...(c.accessRole ? { accessRole: String(c.accessRole) } : {}) }));
    store.set("ft-gcals", JSON.stringify(gCals));
    gState = "ok"; gTry = 0; gLiveAt = Date.now(); shrMirrorQueue(); setTimeout(() => gFixSpans().catch(() => {}), 4000);
    { let back = false; try { back = sessionStorage.getItem("mk-wz-g") === "1"; } catch {}
      const wzOff = () => !$("wz") || $("wz").hidden;
      if (back && PROFILE.gcalAsked) { try { sessionStorage.removeItem("mk-wz-g"); } catch {} back = false; }   // nur neu verbunden – Einrichtung gab es schon
      if (wzOff() && PROFILE.setupDone && canWrite && !PROFILE.gcalAsked && !store.get("ft-gcal-asked") && !store.get("ft-gcal-sel")) { try { sessionStorage.removeItem("mk-wz-g"); } catch {} store.set("ft-gcal-asked", "1"); gProfSave({ gcalAsked: true }); setTimeout(() => { if (wzOff() && ($("sheet").hidden || sheetMode === "google")) { closeSheet(); startGoogleSetup(); } }, 500); } }
    setTimeout(scanOthers, 800); clearInterval(othersT); othersT = setInterval(() => { if (!document.hidden) scanOthers(); }, 60 * 60e3);
  } catch (e) {
    const code = e?.code || "upstream_error";
    if (FATAL.includes(code)) { gState = code; GWATCH.forEach(u => u()); GWATCH.clear(); GEV.clear(); }
    else { // Netz/Google hängt: zwischengespeicherten Stand behalten und automatisch erneut versuchen
      if (gState !== "ok") gState = code;
      gTry++; gRetryT = setTimeout(initGoogle, Math.min(60e3, 3000 * 2 ** Math.min(gTry, 5)));
    }
  }
  renderGPill(); renderAll(); if (sheetMode === "google" && !$("sheet").hidden) showGoogleSheet();
  if (WZ && WZ.step === "google" && !WZ.gBusy) renderWz();
}
function renderGPill() {
  syncLegend();
  const el = $("g-btn"); if (!el) return;
  el.hidden = !mcp;
  const ok = gState === "ok" && gShow;
  $("g-dot").style.background = gState === "ok" ? "#2e9e4f" : gState === "loading" ? "var(--muted)" : "var(--holiday)";
  $("g-lbl").textContent = "G";
  const st = ok ? "Google verbunden" : gState === "ok" ? "Google verbunden, Termine ausgeblendet" : gState === "loading" ? "Google wird verbunden …" : "Google nicht verbunden";
  el.title = st; el.setAttribute("aria-label", st); el.classList.toggle("on", ok);
}
function gStatusText() {
  return {
    ok: gLiveAt ? "" : "Zeigt den zuletzt geladenen Stand – Google antwortet gerade nicht, ich versuche es automatisch weiter.", loading: "Verbindung wird hergestellt …", timeout: "Google antwortet gerade nicht. Ich versuche es automatisch weiter.", upstream_error: "Google antwortet gerade nicht. Ich versuche es automatisch weiter.",
    api_disabled: "Die Google-Kalender-Schnittstelle ist im Google-Projekt noch nicht eingeschaltet. In der Google Cloud Console unter „APIs & Dienste → Bibliothek → Google Calendar API“ auf „Aktivieren“ tippen und ein paar Minuten warten.",
    needs_reauth: APP ? "Google Kalender ist noch nicht verbunden oder die Freigabe ist abgelaufen. Tippe auf „Mit Google verbinden“ und erlaube den Zugriff auf deinen Kalender." : "Die Verbindung zu Google ist abgelaufen. Verbinde Google Kalender in claude.ai unter Einstellungen → Konnektoren neu.",
    server_not_connected: "Google Kalender ist nicht verbunden. Füge ihn in claude.ai unter Einstellungen → Konnektoren hinzu.",
    selection_required: "Es gibt mehrere Google-Kalender-Verbindungen. Wähl in claude.ai aus, welche diese Seite nutzen soll.",
    not_in_manifest: "Der Zugriff auf Google wurde für diese Seite abgelehnt. Du kannst ihn über das Berechtigungen-Menü der Seite wieder erlauben.",
    approval_required: "Google braucht deine Freigabe.",
    blocked_by_policy: "Google Kalender ist für dein Konto gesperrt."
  }[gState] ?? "Google ist gerade nicht erreichbar. Versuch es später noch einmal.";
}
// Ausgewählte oben, nicht ausgewählte eingeklappt darunter
const gOpen = {};
document.addEventListener("toggle", e => { const k = e.target?.dataset?.gmore; if (k) gOpen[k] = e.target.open; if (e.target?.id === "fam-all") famAllOpen = e.target.open; }, true);
function gGroup(cals, isOn, row, key) {
  const on = cals.filter(isOn), off = cals.filter(c => !isOn(c));
  return `<div class="gcals">${on.length ? on.map(row).join("") : `<p class="note">Noch keiner ausgewählt.</p>`}</div>` +
    (off.length ? `<details class="gmore" data-gmore="${key}"${gOpen[key] ? " open" : ""}><summary>${off.length} weitere${off.length === 1 ? "r" : ""}</summary><div class="gcals">${off.map(row).join("")}</div></details>` : "");
}
function showGoogleSheet() {
  const st = gStatusText();
  const cals = gState === "ok" ? [{ id: "primary", summary: `Mein Kalender${gPrimarySummary ? "" : ""}` }, ...gCals.filter(c => c.summary !== gPrimarySummary && c.id !== gPrimarySummary)] : [];
  const sel = gState === "ok" ? new Set(selectedCals()) : new Set();
  openSheet("Google Kalender", "Welche Google-Kalender hier erscheinen", `
    ${st ? `<p class="note" style="margin-top:10px">${esc(st)}</p>` : ""}
    ${APP && gState !== "ok" && window.mkGLast ? `<p class="note" style="margin-top:6px;font-size:12px">Technisch: ${esc(window.mkGLast)}</p>` : ""}
    ${gState !== "ok" ? `<button type="button" class="btn accent wide" id="g-retry">${APP && FATAL.includes(gState) && gState !== "api_disabled" ? "Mit Google verbinden" : "Erneut verbinden"}</button>` : ""}
    ${gState === "ok" ? `<button type="button" class="btn accent wide" id="g-sync" style="margin-top:12px">↻ Jetzt mit Google abgleichen</button>
      <label class="tog" style="margin-top:12px;color:var(--fg);font-weight:600"><input type="checkbox" id="g-show"${gShow ? " checked" : ""}> Google-Termine anzeigen</label>
      <div class="lbl" style="margin-top:12px">Kalender</div>
      ${gGroup(cals, c => sel.has(c.id), c => `<label class="tog setrow"><input type="checkbox" data-gcal="${esc(c.id)}"${sel.has(c.id) ? " checked" : ""}${gShow ? "" : " disabled"}><i class="sw" style="background:${gColor(c.id)[0]};border-radius:50%"></i>${esc(c.summary)}</label>`, "cal")}
      ${canWrite ? `<div class="lbl" style="margin-top:16px">Hinweis, wenn andere hier etwas eintragen</div>
      ${gGroup(cals, c => notifyCals().includes(c.id), c => `<label class="tog setrow"><input type="checkbox" data-notify="${esc(c.id)}"${notifyCals().includes(c.id) ? " checked" : ""}><i class="sw" style="background:${gColor(c.id)[0]};border-radius:50%"></i>${esc(c.summary)}</label>`, "not")}` : ""}
      <p class="note" style="margin-top:10px">Google-Termine erscheinen in der Farbe ihres Kalenders. Bearbeiten kannst du sie weiter in der Google-App.</p>` : ""}`, "google");
}
function showGoogleEvent(o) {
  const e = o.ev, items = [];
  items.push(`<li><i style="background:${e.color}"></i><div><b>Google · ${esc(e.cal)}</b>${e.creator ? `<div class="note">eingetragen von ${esc(e.creator)}</div>` : ""}${e.recurring ? `<div class="note">Teil einer Serie</div>` : ""}</div></li>`);
  if (e.note) items.push(`<li><i style="background:${e.color}"></i><div><b>Ort</b><div class="note">${esc(e.note)}</div></div></li>`);
  if (tripParts(o).length) items.push(`<li><i style="background:var(--trip)"></i><div><b>Dazu gehört</b><div class="note" style="white-space:pre-line">${esc(partsList(o))}</div></div></li>`);
  if (o.part) items.push(`<li><i style="background:var(--trip)"></i><div><b>Teil der Reise</b><div class="note">${esc(evName(o.part.ev))} · ${fmt(o.part.a)}–${fmt(o.part.b)}</div></div></li>`);
  const id = esc(e.id), w = canWrite && gWritable();
  const gcal = gCals.find(c => c.id === e.calId || (e.calId === "primary" && c.primary)), gw = w && !!mcp && gState === "ok" && (!gcal?.accessRole || ["owner", "writer"].includes(gcal.accessRole));
  const qcol = gw ? qcolBox(e.id, e.ecol ? e.colorId : "", gColor(e.calId)[0], "Farbe dieses Google-Termins", "") : "";
  const acts = (w ? `<button type="button" class="btn small" data-gedit="${id}|${iso(o.a)}">Bearbeiten</button><button type="button" class="btn ghost small" data-gmove="${id}|${iso(o.a)}">Verschieben</button>` : "") +
    `<button type="button" class="btn ghost small" data-share="${id}|${iso(o.a)}">Teilen</button>` +
    (e.link ? `<a class="btn ghost small" href="${esc(e.link)}" target="_blank" rel="noopener">In Google öffnen</a>` : "") +
    routeLinks(placeOf(e)) +
    (canWrite && isTrip(o) ? `<button type="button" class="btn ghost small" data-adopt="${id}|${iso(o.a)}">Als Reise übernehmen</button>` : "") +
    (merkable(o) ? `<button type="button" class="btn ghost small" data-gmerk="${id}|${iso(o.a)}">${merkBtn(o)}</button>` : "") +
    (!isTrip(o) && !/geburtstag|birthday/i.test(o.ev.title) && !/\bumgang\b/i.test(o.ev.title) ? `<button type="button" class="btn ghost small" data-umg="${id}|${iso(o.a)}">${isUmg(o) ? "👨‍👧 Umgang ✓" : "👨‍👧 Ist Umgang"}</button>` : "") +
    (w ? `<button type="button" class="btn danger small push" data-gdel="${id}|${iso(o.a)}">Löschen</button>` : "");
  openSheet(e.title, `${rngTxt(o.a, o.b, true)}${timeTxt(e) ? " · " + timeTxt(e) + " Uhr" : ""}`, `${trainDetail(o)}<ul class="sheet-list">${items.join("")}</ul><div id="place-sug" hidden></div>${qcol}<div class="btnrow">${acts}</div>`, "event", { id: e.id, a: iso(o.a) });
  if (canWrite && placeCand(o)) fillPlaceSug(o);
}
// ---- Google-Termine direkt ändern ----
let gEditing = null;
function showGForm(o) {
  gEditing = o; const e = o.ev;
  openSheet("Google-Termin bearbeiten", `${e.cal}${e.recurring ? " · ändert nur diesen Termin der Serie" : ""}`, `
    <form id="gf" class="form" novalidate>
      <label for="gf-title">Titel</label><input id="gf-title" type="text" value="${esc(e.title)}">
      <div class="two"><div><label for="gf-from">Von</label><input id="gf-from" type="date" value="${iso(o.a)}"></div>
      <div><label for="gf-to">Bis</label><input id="gf-to" type="date" value="${iso(o.b)}"></div></div>
      <div class="shift"><span>Verschieben</span><button type="button" class="btn ghost small" data-gshift="-7">−1 Wo</button><button type="button" class="btn ghost small" data-gshift="-1">−1 Tag</button><button type="button" class="btn ghost small" data-gshift="1">+1 Tag</button><button type="button" class="btn ghost small" data-gshift="7">+1 Wo</button></div>
      <div class="two"><div><label for="gf-time">Uhrzeit</label><input id="gf-time" type="time" value="${esc(e.time)}"></div>
      <div><label for="gf-end">bis</label><input id="gf-end" type="time" value="${esc(e.endTime)}"></div></div>
      <label for="gf-loc">Ort</label><input id="gf-loc" type="text" value="${esc(e.note)}" placeholder="optional">
      <div class="err" id="gf-err"></div>
      <div class="btnrow"><button type="submit" class="btn accent" id="gf-save">In Google speichern</button><button type="button" class="btn ghost" id="gf-cancel">Abbrechen</button></div>
    </form>`, "gform");
}
function gShiftForm(n) { const f = $("gf-from"), t = $("gf-to"), a = parseIso(f.value), b = parseIso(t.value) || a; if (!a) return; f.value = iso(addDays(a, n)); t.value = iso(addDays(b, n)); }
const gSnap = o => ({ title: o.ev.title, from: iso(o.a), to: iso(o.b), time: o.ev.time, endTime: o.ev.endTime, loc: o.ev.note });
async function gApplyEdit(o, v) {
  const inp = gInput({ title: v.title, from: v.from, to: v.to, time: v.time, endTime: v.endTime, gcal: o.ev.calId });
  delete inp.description; inp.eventId = o.ev.gid; inp.allDay = !v.time;
  if (v.loc !== undefined) inp.location = v.loc;
  await mcp.callTool(GSERVER, "update_event", inp);
  mcp.invalidate(GSERVER, "list_events").catch(() => {}); gResync();
}
const gErr = e => e?.code === "tool_error" ? "Google hat die Änderung abgelehnt – vielleicht wurde der Termin dort schon geändert oder gelöscht." : e?.code === "needs_reauth" ? (APP ? "Google-Verbindung abgelaufen. Bitte oben auf „G“ tippen und neu verbinden." : "Google-Verbindung abgelaufen. Bitte in claude.ai neu verbinden.") : e?.code === "api_disabled" ? "Google-Kalender-Zugriff ist im Google-Projekt nicht freigeschaltet." : "Google war gerade nicht erreichbar – meist kurz nach dem Aufwachen des Handys. Bitte noch einmal tippen." + (APP && window.mkGLast ? ` (${window.mkGLast})` : "");
async function saveGForm() {
  const o = gEditing, g = id => $(id).value.trim();
  const v = { title: g("gf-title"), from: g("gf-from"), to: g("gf-to") || g("gf-from"), time: g("gf-time"), endTime: g("gf-end"), loc: g("gf-loc") };
  const msg = validate({ ...v, title: v.title || "x" }) || (!v.title ? "Bitte einen Titel eingeben." : ""); if (msg) { $("gf-err").textContent = msg; return; }
  const btn = $("gf-save"); btn.disabled = true; btn.textContent = "Speichert …";
  const before = gSnap(o);
  try { await gApplyEdit(o, v); closeSheet(); toast("In Google gespeichert", async () => { await gApplyEdit(o, before); toast("Rückgängig gemacht"); }); }
  catch (e) { $("gf-err").textContent = gErr(e); btn.disabled = false; btn.textContent = "In Google speichern"; gSync(true); }
}
// Nach dem Löschen sofort aus der Ansicht nehmen (nicht erst beim nächsten Abgleich) und kurz danach neu laden
function gDropLocal(gid, calId) {
  const hit = e => e && (String(e.id) === gid || String(e.id).startsWith(gid + "_") || String(e.recurringEventId || "") === gid && false);
  for (const [k, list] of GEV) if (k.startsWith(calId + "|")) GEV.set(k, list.filter(o => !(o.ev.gid === gid || o.ev.gid.startsWith(gid + "_"))));
  try { for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (!k || !k.startsWith("ft-gc-" + calId + "|")) continue; const v = JSON.parse(localStorage.getItem(k) || "null"); if (v?.e) { const n = v.e.filter(e => !hit(e)); if (n.length !== v.e.length) localStorage.setItem(k, JSON.stringify({ ...v, e: n })); } } } catch {}
  renderAll();
}
let gResyncT = null; const gResync = (ms = 1500) => { clearTimeout(gResyncT); gResyncT = setTimeout(() => gSync(true), ms); };
async function gDeleteOcc(btn, o, series) {
  if (btn && o.ev.recurring && o.ev.rid) { delChoice(btn, o.ev.id, iso(o.a), true); return; }
  if (series) { const inp = { eventId: o.ev.rid, notificationLevel: "NONE" }; if (o.ev.calId !== "primary") inp.calendarId = o.ev.calId;
    try { await mcp.callTool(GSERVER, "delete_event", inp); mcp.invalidate(GSERVER, "list_events").catch(() => {}); closeSheet(); gDropLocal(o.ev.rid, o.ev.calId); gResync(); toast("Ganze Serie in Google gelöscht"); }
    catch (e) { toast(gErr(e)); gSync(true); } return; }
  if (!btn) btn = { dataset: { confirm: "1" }, isConnected: false };
  if (btn.dataset.confirm !== "1") { btn.dataset.confirm = "1"; btn.textContent = o.ev.recurring ? "Nur diesen Termin löschen?" : "In Google löschen?"; setTimeout(() => { if (btn.isConnected) { btn.dataset.confirm = ""; btn.textContent = "Löschen"; } }, 4000); return; }
  btn.disabled = true;
  const snap = gSnap(o), cal = o.ev.calId;
  try {
    const inp = { eventId: o.ev.gid, notificationLevel: "NONE" }; if (cal !== "primary") inp.calendarId = cal;
    await mcp.callTool(GSERVER, "delete_event", inp); mcp.invalidate(GSERVER, "list_events").catch(() => {});
    closeSheet(); gDropLocal(o.ev.gid, cal); gResync();
    toast("In Google gelöscht", async () => { const c = gInput({ title: snap.title, from: snap.from, to: snap.to, time: snap.time, endTime: snap.endTime, gcal: cal }); if (snap.loc) c.location = snap.loc;
      await mcp.callTool(GSERVER, "create_event", c); mcp.invalidate(GSERVER, "list_events").catch(() => {}); gResync(300); toast("Wiederhergestellt"); });
  } catch (e) {
    if (e?.code === "tool_error" && /not.?found|404|410|deleted|gone|gelöscht/i.test(String(e?.message || ""))) { closeSheet(); toast("Der Termin war in Google schon gelöscht – Ansicht aktualisiert."); }
    else { toast(gErr(e) + " Ich gleiche die Ansicht mit Google ab."); btn.disabled = false; btn.textContent = "Löschen"; }
    gSync(true);
  }
}

// =================== Anmelden & Startbildschirm ===================
// ---------- Anmeldung mit E-Mail (eigene App) ----------
let AU = { mode: "login", step: "form", email: "", type: "", msg: "", busy: false, show: false };
const AU_ERR = { invalid_credentials: "E-Mail oder Passwort stimmt nicht.", email_not_confirmed: "Deine E-Mail-Adresse ist noch nicht bestätigt. Wir haben dir eben eine neue Mail mit Code geschickt.",
  over_email_send_rate_limit: "Es wurden gerade zu viele Mails verschickt. Bitte versuch es in ein paar Minuten nochmal.", over_request_rate_limit: "Zu viele Versuche. Bitte warte ein paar Minuten.",
  weak_password: "Das Passwort ist zu schwach. Bitte mindestens 8 Zeichen, gern mit Zahlen oder Zeichen.", otp_expired: "Der Code ist falsch oder abgelaufen. Lass dir einfach einen neuen schicken.",
  email_address_invalid: "Diese E-Mail-Adresse ist ungültig.", validation_failed: "Bitte prüfe die E-Mail-Adresse.", signup_disabled: "Neue Konten sind gerade nicht möglich.",
  same_password: "Das ist dein bisheriges Passwort – bitte wähle ein neues.", user_already_exists: "Zu dieser E-Mail gibt es schon ein Konto. Bitte melde dich an.", net: "Keine Verbindung. Bitte prüfe dein Internet." };
const auErr = r => AU_ERR[r?.code] || (r?.msg ? "Das hat nicht geklappt: " + r.msg : "Das hat nicht geklappt. Bitte versuch es nochmal.");
function auHtml() {
  const em = esc(AU.email), msg = AU.msg ? `<p class="${AU.ok ? "au-ok" : "err"}" role="alert">${esc(AU.msg)}</p>` : "";
  if (AU.step === "code") return `<form id="au-code" class="au" novalidate>
    <p class="au-sent">Wir haben dir eine Mail an <b>${em}</b> geschickt. Gib den <b>Code</b> aus der Mail hier ein – oder tippe in der Mail auf den Link.</p>
    <input type="email" name="email" autocomplete="username" value="${em}" hidden>
    <label class="au-f"><span>Code aus der Mail</span><input id="au-otp" name="code" inputmode="numeric" autocomplete="one-time-code" pattern="[0-9 ]*" maxlength="12" placeholder="123456" required></label>
    ${msg}<button type="submit" class="wz-big accent" ${AU.busy ? "disabled" : ""}>${AU.busy ? "Einen Moment …" : "Bestätigen"}</button>
    <div class="au-links"><button type="button" class="link" data-auop="again">Neue Mail schicken</button><button type="button" class="link" data-auop="back">Zurück</button></div>
    <p class="note">Keine Mail da? Schau auch im Spam-Ordner nach.</p></form>`;
  const up = AU.mode === "signup";
  return `<form id="au-form" class="au" method="post" action="/app/" novalidate>
    <div class="au-tabs" role="group" aria-label="Anmelden oder registrieren"><button type="button" data-aumode="login" aria-pressed="${!up}">Anmelden</button><button type="button" data-aumode="signup" aria-pressed="${up}">Neu registrieren</button></div>
    <label class="au-f"><span>E-Mail</span><input type="email" id="au-email" name="email" autocomplete="username" inputmode="email" autocapitalize="none" spellcheck="false" value="${em}" required></label>
    <label class="au-f"><span>Passwort${up ? " <i>(mind. 8 Zeichen)</i>" : ""}</span><span class="au-pw"><input type="${AU.show ? "text" : "password"}" id="au-pw" name="password" autocomplete="${up ? "new-password" : "current-password"}" minlength="8" required><button type="button" class="au-eye" data-auop="eye" aria-label="Passwort ${AU.show ? "verbergen" : "anzeigen"}">${AU.show ? "Verbergen" : "Anzeigen"}</button></span></label>
    ${msg}<button type="submit" class="wz-big accent" ${AU.busy ? "disabled" : ""}>${AU.busy ? "Einen Moment …" : up ? "Konto anlegen" : "Anmelden"}</button>
    <div class="au-links"><button type="button" class="link" data-auop="otp">Ohne Passwort: Code per Mail</button>${up ? "" : `<button type="button" class="link" data-auop="reset">Passwort vergessen?</button>`}</div>
    ${up ? `<p class="note">Tipp: Dein Passwortmanager (z. B. Bitwarden, iCloud-Schlüsselbund, Google) schlägt dir ein sicheres Passwort vor und merkt es sich.</p>` : ""}</form>`;
}
function auRender() { const b = $("au-box"); if (b) b.innerHTML = auHtml(); }
function auBox() { return `<button type="button" class="wz-big accent" id="app-login"><svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" style="vertical-align:-4px;margin-right:8px"><path fill="#fff" d="M21.6 12.2c0-.7-.1-1.4-.2-2H12v3.8h5.4a4.6 4.6 0 0 1-2 3v2.5h3.2c1.9-1.7 3-4.3 3-7.3z"/><path fill="#fff" opacity=".85" d="M12 22c2.7 0 5-.9 6.6-2.4l-3.2-2.5c-.9.6-2 1-3.4 1-2.6 0-4.8-1.8-5.6-4.1H3.1v2.6A10 10 0 0 0 12 22z"/><path fill="#fff" opacity=".7" d="M6.4 14c-.2-.6-.3-1.3-.3-2s.1-1.4.3-2V7.4H3.1a10 10 0 0 0 0 9.2L6.4 14z"/><path fill="#fff" opacity=".55" d="M12 6c1.5 0 2.8.5 3.8 1.5l2.9-2.9A10 10 0 0 0 3.1 7.4L6.4 10C7.2 7.7 9.4 6 12 6z"/></svg>Mit Google anmelden</button>
    <div class="au-or"><span>oder mit E-Mail</span></div><div id="au-box">${auHtml()}</div>`; }
const auEmail = () => { const v = ($("au-email")?.value || AU.email || "").trim(); AU.email = v; return v; };
const auValid = e => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e);
async function auRun(fn) { AU.busy = true; AU.msg = ""; auRender(); try { await fn(); } finally { AU.busy = false; auRender(); } }
async function auSubmit(id) {
  if (!window.mkAuth || AU.busy) return;
  if (id === "au-form") {
    const email = auEmail(), pw = $("au-pw")?.value || "";
    if (!auValid(email)) { AU.msg = "Bitte gib eine gültige E-Mail-Adresse ein."; AU.ok = false; return auRender(); }
    if (pw.length < (AU.mode === "signup" ? 8 : 1)) { AU.msg = AU.mode === "signup" ? "Bitte wähle ein Passwort mit mindestens 8 Zeichen." : "Bitte gib dein Passwort ein."; AU.ok = false; return auRender(); }
    return auRun(async () => {
      if (AU.mode === "login") { const r = await window.mkAuth("login", { email, pw }); AU.ok = false;
        if (r.ok) { AU.ok = true; AU.msg = "Angemeldet – einen Moment …"; return; }
        if (r.code === "email_not_confirmed") { await window.mkAuth("resend", { email }); AU.step = "code"; AU.type = "signup"; AU.ok = true; }
        AU.msg = auErr(r); return; }
      const r = await window.mkAuth("signup", { email, pw }); AU.ok = false;
      if (!r.ok) { AU.msg = auErr(r); if (r.code === "user_already_exists") AU.mode = "login"; return; }
      if (r.exists) { AU.mode = "login"; AU.msg = "Zu dieser E-Mail gibt es schon ein Konto. Bitte melde dich an – oder nutze „Passwort vergessen?“."; return; }
      if (r.session) { AU.ok = true; AU.msg = "Konto angelegt – einen Moment …"; return; }
      AU.step = "code"; AU.type = "signup"; AU.ok = true; AU.msg = "";
    });
  }
  if (id === "au-code") {
    const code = ($("au-otp")?.value || "").replace(/\D/g, "");
    if (code.length < 6) { AU.msg = "Bitte gib den Code aus der Mail ein."; AU.ok = false; return auRender(); }
    return auRun(async () => { const r = await window.mkAuth("verify", { email: AU.email, code, type: AU.type || "email" });
      AU.ok = r.ok; AU.msg = r.ok ? "Bestätigt – einen Moment …" : auErr(r); });
  }
}
async function auOp(op) {
  if (op === "eye") { const v = $("au-pw")?.value || ""; auEmail(); AU.show = !AU.show; auRender(); const p = $("au-pw"); if (p) { p.value = v; p.focus(); } return; }
  if (op === "back") { AU.step = "form"; AU.msg = ""; return auRender(); }
  if (op === "otp" || op === "reset") {
    const email = auEmail(); if (!auValid(email)) { AU.msg = "Bitte gib zuerst oben deine E-Mail-Adresse ein."; AU.ok = false; auRender(); $("au-email")?.focus(); return; }
    return auRun(async () => { const r = await window.mkAuth(op, { email });
      if (!r.ok) { AU.msg = auErr(r); AU.ok = false; return; }
      AU.step = "code"; AU.type = op === "reset" ? "recovery" : "email"; AU.msg = op === "reset" ? "Mit dem Code meldest du dich an und legst danach ein neues Passwort fest." : ""; AU.ok = true; });
  }
  if (op === "again") return auRun(async () => { const t = AU.type, r = await window.mkAuth(t === "signup" ? "resend" : t === "recovery" ? "reset" : "otp", { email: AU.email });
    AU.ok = r.ok; AU.msg = r.ok ? "Neue Mail ist unterwegs." : auErr(r); });
}
// Nach „Passwort vergessen“: neues Passwort festlegen
function showNewPw() {
  const me = window.mkAuthInfo?.() || {};
  openSheet("Neues Passwort festlegen", "Damit du dich künftig mit E-Mail und Passwort anmelden kannst", `<form id="au-np" class="au" novalidate>
    <input type="email" name="email" autocomplete="username" value="${esc(me.email || "")}" hidden>
    <label class="au-f"><span>Neues Passwort <i>(mind. 8 Zeichen)</i></span><input type="password" id="au-np1" name="new-password" autocomplete="new-password" minlength="8" required></label>
    <label class="au-f"><span>Noch einmal</span><input type="password" id="au-np2" autocomplete="new-password" minlength="8" required></label>
    <p class="err" id="au-npmsg" role="alert" hidden></p>
    <div class="btnrow"><button type="submit" class="btn accent">Speichern</button><button type="button" class="btn ghost" id="sheet-close2">Später</button></div></form>`, "newpw");
}
async function saveNewPw() {
  const a = $("au-np1")?.value || "", b = $("au-np2")?.value || "", m = $("au-npmsg"), say = t => { if (m) { m.textContent = t; m.hidden = !t; } };
  if (a.length < 8) return say("Bitte mindestens 8 Zeichen.");
  if (a !== b) return say("Die beiden Passwörter stimmen nicht überein.");
  const r = await window.mkAuth("newpw", { pw: a });
  if (!r.ok) return say(auErr(r));
  try { sessionStorage.removeItem("mk-newpw"); } catch {}
  closeSheet(); toast("Neues Passwort gespeichert.");
}
document.addEventListener("submit", ev => { const id = ev.target.id; if (id === "au-form" || id === "au-code") { ev.preventDefault(); auSubmit(id); } if (id === "au-np") { ev.preventDefault(); saveNewPw(); } });
document.addEventListener("click", ev => { const m = ev.target.closest?.("[data-aumode]"); if (m) { auEmail(); AU.mode = m.dataset.aumode; AU.msg = ""; auRender(); return; }
  const o = ev.target.closest?.("[data-auop]"); if (o) { ev.preventDefault(); auOp(o.dataset.auop); } });
// Google-Kalender verbinden – bei E-Mail-Konten wird Google an dasselbe Konto gehängt
async function gConnect() {
  const r = await window.mkConnectGoogle?.();
  if (r?.error) { const c = r.error.code || "";
    toast(c === "identity_already_exists" ? "Dieses Google-Konto gehört schon zu einem anderen Mein-Kalender-Konto." : c === "manual_linking_disabled" ? "Google verbinden ist für E-Mail-Konten noch nicht freigeschaltet." : "Google-Verbindung hat nicht geklappt: " + (r.error.message || c)); }
}

const UA = navigator.userAgent || "", IS_IOS = /iPhone|iPad|iPod/i.test(UA) || (/Macintosh/.test(UA) && navigator.maxTouchPoints > 1), IS_ANDROID = /Android/i.test(UA);
const IS_MOBILE = IS_IOS || IS_ANDROID;
const IS_STANDALONE = (() => { try { return matchMedia("(display-mode: standalone)").matches || navigator.standalone === true; } catch { return false; } })();
// Eigene App: Installations-Angebot des Browsers (Android/Chrome) merken und selbst anbieten
let installEvt = null;
if (APP) { addEventListener("beforeinstallprompt", e => { e.preventDefault(); installEvt = e; try { renderHints(); } catch {} });
  addEventListener("appinstalled", () => { installEvt = null; store.set("ft-a2hs", "done"); try { renderHints(); } catch {} }); }
async function doInstall() {
  if (!installEvt) { showA2hs(); return; }
  installEvt.prompt(); const r = await installEvt.userChoice.catch(() => null); installEvt = null;
  if (r?.outcome === "accepted") { store.set("ft-a2hs", "done"); toast("Installiert – du findest Mein Kalender jetzt bei deinen Apps."); }
  closeSheet(); renderHints();
}
function showSignin() {
  if (APP) return openSheet("Kostenlos anmelden", "Damit dein Kalender nur dir gehört", `
    <p class="tip" style="color:var(--fg)">Melde dich mit deinem <b>Google-Konto</b> oder deiner <b>E-Mail-Adresse</b> an – kostenlos. Deine Einträge sind privat, nur du siehst sie.</p>
    <div class="au-wrap">${auBox()}</div>
    <div class="btnrow" style="margin-top:10px"><button type="button" class="btn ghost" id="sheet-close2">Erst mal umschauen</button></div>
    <p class="note" style="margin-top:10px">Ohne Anmeldung kannst du dich trotzdem umsehen: Ferien, Feiertage, Brückentage und gemeinsame freie Zeiten funktionieren auch so.</p>`, "signin");
  openSheet("Kostenlos anmelden", "Damit dein Kalender nur dir gehört", `
    <p class="tip" style="color:var(--fg)">Für eigene Termine, Erinnerungen und Geschenkelisten brauchst du ein <b>kostenloses Claude-Konto</b>. Deine Einträge sind privat – nur du siehst sie.</p>
    <ol class="wz-tips"><li>Auf <b>„Anmelden oder registrieren“</b> tippen – mit E-Mail oder Google-Konto, dauert eine Minute.</li><li>Danach <b>diesen Link erneut öffnen</b>. Die Einrichtung startet dann von selbst.</li></ol>
    <div class="btnrow" style="margin-top:14px"><a class="btn accent" href="https://claude.ai/login" target="_blank" rel="noopener">Anmelden oder registrieren</a><button type="button" class="btn ghost" id="sheet-close2">Erst mal umschauen</button></div>
    <p class="note" style="margin-top:10px">Ohne Konto kannst du dich trotzdem umsehen: Ferien, Feiertage, Brückentage und gemeinsame freie Zeiten funktionieren auch so.</p>`, "signin");
}
function a2hsSteps() {
  return IS_IOS ? `<ol class="wz-tips"><li>Unten in Safari auf <b>Teilen</b> tippen (Quadrat mit Pfeil nach oben).</li><li><b>„Zum Home-Bildschirm“</b> wählen – ggf. etwas nach unten scrollen.</li><li>Oben rechts <b>„Hinzufügen“</b>. Fertig: Der Kalender liegt jetzt wie eine App auf dem Startbildschirm.</li></ol>`
    : IS_ANDROID ? `<ol class="wz-tips"><li>Oben rechts in Chrome auf <b>⋮</b> tippen.</li><li><b>„Zum Startbildschirm hinzufügen“</b> wählen.</li><li>Mit <b>„Hinzufügen“</b> bestätigen. Fertig: Der Kalender liegt jetzt wie eine App auf dem Startbildschirm.</li></ol>`
    : `<p class="tip" style="color:var(--fg)">Am Handy geht das über das Browser-Menü („Zum Startbildschirm hinzufügen“). Am Computer kannst du die Seite einfach als Lesezeichen speichern.</p>`;
}
function showA2hs() {
  if (APP) return openSheet("Als App installieren", "Eigenes Symbol, ohne Browserleiste, startet auch offline", `
    ${IS_STANDALONE ? `<p class="tip" style="color:var(--fg)">Läuft schon als App. 👍</p>` : installEvt ? `<p class="tip" style="color:var(--fg)">Ein Tipp – dann liegt Mein Kalender bei deinen Apps und auf dem Startbildschirm.</p>
      <div class="btnrow" style="margin-top:12px"><button type="button" class="btn accent" id="app-install">Jetzt installieren</button><button type="button" class="btn ghost" id="a2hs-later">Später</button></div>`
    : `${a2hsSteps()}<p class="note" style="margin-top:10px">${IS_IOS ? "Nur in Safari möglich – in anderen Browsern auf dem iPhone fehlt diese Funktion." : "Kein Menüpunkt zu sehen? Dann die Seite einmal in Chrome öffnen."}</p>
      <div class="btnrow" style="margin-top:12px"><button type="button" class="btn accent" id="a2hs-done">Erledigt</button><button type="button" class="btn ghost" id="a2hs-later">Später</button></div>`}`, "a2hs");
  openSheet("Auf den Startbildschirm", "Dann öffnest du den Kalender mit einem Tipp", `${a2hsSteps()}
    <p class="note" style="margin-top:10px">Geöffnet in der Claude-App? Dann den Link zuerst im Browser öffnen (Safari bzw. Chrome) – nur dort gibt es diese Funktion.</p>
    <div class="btnrow" style="margin-top:12px"><button type="button" class="btn accent" id="a2hs-done">Erledigt</button><button type="button" class="btn ghost" id="a2hs-later">Später</button></div>`, "a2hs");
}
function renderFirst() { const f = $("first-card"); if (!f) return;
  const n0 = store.get("ft-first"); f.hidden = !n0 || dbState !== "ready" || !canWrite || EV.length > +n0; }
function renderHints() { renderHints0(); let one = false; document.querySelectorAll(".hint-card").forEach(c => { if (!c.hidden) { if (one) c.hidden = true; one = true; } }); }
let relInstalled = false;
if (APP && !IS_STANDALONE && navigator.getInstalledRelatedApps) navigator.getInstalledRelatedApps().then(a => { relInstalled = !!a?.length; try { renderHints(); } catch {} }).catch(() => {});
const laterK = (k, days) => { const v = +(store.get(k) || 0); return v && Date.now() - v < days * 864e5; };
// Gerät meldet sich (fürs Dashboard: Version, App installiert, Google, Benachrichtigungen) – nur Zustände, keine Inhalte
let DEV_ERR = 0, DEV_LE = "", DEV_LEAT = "", devLast = "", devT = 0;
const devId = () => { let v = store.get("mk-dev"); if (!v) { v = "d" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); store.set("mk-dev", v); } return v; };
function devReport() {
  if (!APP || !db || dbState !== "ready" || !canWrite) return;
  const d = { b: window.MK_BUILD || "", sa: IS_STANDALONE, m: IS_IOS ? "iOS" : IS_ANDROID ? "Android" : "Computer", g: gState, p: !!(ntSub && Notification?.permission === "granted"), err: DEV_ERR, le: DEV_LE, leAt: DEV_LEAT };
  const h = JSON.stringify(d); if (h === devLast) return; clearTimeout(devT); devT = setTimeout(() => { devLast = h; COLL("dev").doc(devId()).set({ ...d, at: new Date().toISOString() }).catch(() => {}); }, 3000);
}
addEventListener("error", e => { const m = String(e?.message || ""); if (!m || /ResizeObserver|Script error/i.test(m)) return; DEV_ERR++; DEV_LE = m.slice(0, 140); DEV_LEAT = new Date().toISOString(); try { use("app_fehler"); devReport(); } catch {} });
addEventListener("unhandledrejection", e => { const m = String(e?.reason?.message || e?.reason || ""); if (!m || /abort|Failed to fetch|NetworkError|Load failed/i.test(m)) return; DEV_ERR++; DEV_LE = m.slice(0, 140); DEV_LEAT = new Date().toISOString(); try { use("app_fehler"); devReport(); } catch {} });
addEventListener("mk-ki-err", e => { const { task, code } = e.detail || {}; if (code === "rate_limited") use("ki_limit"); else use(`ki_fehler_${String(task || "allgemein").replace(/[^\w-]/g, "").slice(0, 30)}__${String(code || "").replace(/[^\w-]/g, "").slice(0, 20)}`); });
function renderDevCards() {
  try { devReport(); } catch {}
  if (APP && dbState === "ready" && !BILL && Date.now() - billT > 60e3) billLoad();
  { const c = $("quota-card"); if (c) c.hidden = c.dataset.on !== "1"; }
  const ok = APP && dbState === "ready" && canWrite && PROFILE.setupDone, set = (id, on) => { const c = $(id); if (c) c.hidden = !on; };
  set("app-card", ok && IS_MOBILE && !IS_STANDALONE && (relInstalled || store.get("ft-a2hs") === "done") && !laterK("ft-appcard", 3));
  const usedG = !!(PROFILE.gcalAsked || PROFILE.gcalSel?.length);
  set("gdev-card", ok && !!mcp && usedG && ["needs_reauth", "server_not_connected"].includes(gState) && !laterK("ft-gdev", 3));
  set("ntdev-card", ok && ntSupported() && !ntIOSNeedsInstall() && ntChecked && !(ntSub && Notification.permission === "granted") && !laterK("ft-ntdev", 5));
}
function renderHints0() {
  renderDevCards();
  const ic = $("inv-card"); if (ic) { ic.hidden = !shrAcc?.from || dbState !== "ready"; if (!ic.hidden) $("inv-card-t").textContent = `${shrAcc.from} möchte Termine mit dir teilen`; }
  renderFirst();
  const si = $("signin-card"), a2 = $("a2hs-card"); if (!si || !a2) return;
  si.hidden = dbState !== "off";
  const st = store.get("ft-a2hs") || "";   // "", "later:<ts>", "no", "done"
  const later = st.startsWith("later:") && Date.now() - +st.slice(6) < 7 * 864e5;
  if (APP) { a2.querySelector("b").textContent = "Als App installieren?"; a2.querySelector("span").textContent = "Eigenes Symbol, ohne Browserleiste – und der Kalender startet auch ohne Netz."; $("a2hs-yes").textContent = installEvt ? "Jetzt installieren" : "Ja, zeig mir wie"; }
  a2.hidden = IS_STANDALONE || !(IS_MOBILE || (APP && installEvt)) || dbState !== "ready" || !$("first-card")?.hidden || st === "no" || st === "done" || later || (dbState === "ready" && !PROFILE.setupDone) || !$("sheet").hidden && sheetMode === "setup";
}

// =================== Profil & Einrichtung (Vollbild) ===================
let profileLoaded = false, setupShown = false, meName = "";
function applyProfile(v) {
  PROFILE = JSON.parse(JSON.stringify(v || {})); store.set("ft-profile", JSON.stringify(PROFILE));
  if (Array.isArray(PROFILE.gcalSel) && PROFILE.gcalSel.length && !store.get("ft-gcal-sel")) { gSel = new Set(PROFILE.gcalSel.map(String)); store.set("ft-gcal-sel", JSON.stringify(PROFILE.gcalSel)); store.set("ft-gcal-asked", "1"); try { resetGoogleWatches(); } catch {} }
  if (PROFILE.gcalAsked) store.set("ft-gcal-asked", "1");
  const pa = FXM[PROFILE.state] ? PROFILE.state : PA, pb = PROFILE.state2 && FXM[PROFILE.state2] ? PROFILE.state2 : (PROFILE.setupDone ? null : PB);
  if (pa !== PA || pb !== PB) { PA = pa; PB = pb; store.set("ft-pa", PA); store.set("ft-pb", PB || ""); if (!JOINT.length) JOINT = [PA, PB].filter(Boolean); rebuildStates(); }
  renderAll();
}
function maybeSetup() { if (PROFILE.setupDone && !PROFILE.gcalAsked && (store.get("ft-gcal-asked") || store.get("ft-gcal-sel"))) gProfSave({ gcalAsked: true, ...(store.get("ft-gcal-sel") ? { gcalSel: [...selectedCals()] } : {}) }); if (!PROFILE.setupDone && !setupShown && canWrite && dbState !== "error") { setupShown = true; startSetup(); }
  else if (APP && PROFILE.setupDone && canWrite && pendingInvite() && !setupShown) { setupShown = true; setTimeout(takeInvite, 600); }
  else if (APP && PROFILE.setupDone && canWrite) { let sh = "", fm = ""; try { sh = sessionStorage.getItem("mk-share") || ""; fm = sessionStorage.getItem("mk-fam") || ""; } catch {} if (sh) setTimeout(takeShare, 700); else if (fm) setTimeout(takeFam, 900); } }
const stOpts = (cur, none) => (none ? `<option value=""${!cur ? " selected" : ""}>${none}</option>` : "") + STATES.map(([c, n]) => `<option value="${c}"${cur === c ? " selected" : ""}>${n}</option>`).join("");
const ROLES = [["partner", "Partner/in"], ["kind", "Kind"], ["mutter", "Mutter"], ["vater", "Vater"], ["geschwister", "Geschwister"], ["andere", "Familie"], ["freund", "Freund/in"]];
let WZ = null;
const wzEl = () => $("wz-in");
function wzOpen() { $("wz").hidden = false; document.documentElement.classList.add("sheet-open"); $("add-btn").hidden = true; }
function wzClose() { $("wz").hidden = true; document.documentElement.classList.remove("sheet-open"); renderAll(); }
// Vollbild: nicht angemeldet
// Nach der Anmeldung zurück zu diesem Kalender (claude.ai unterstützt ?returnTo=)
function loginUrl() {
  let path = "/artifact/V4VhQBviYQpo7nLrFvfxC1";
  try { const r = new URL(document.referrer || ""); if (r.hostname === "claude.ai" && /^\/(code\/)?artifact\//.test(r.pathname)) path = r.pathname; } catch {}
  return "https://claude.ai/login?returnTo=" + encodeURIComponent(path);
}
function showGate() {
  WZ = { step: "gate" }; wzOpen();
  if (APP) { wzEl().innerHTML = `<div class="wz-card wz-center">
    <div class="wz-logo" aria-hidden="true"><svg viewBox="0 0 48 48" width="56" height="56"><rect x="6" y="9" width="36" height="33" rx="8" fill="none" stroke="currentColor" stroke-width="3"/><path d="M6 19h36M16 5v8M32 5v8" stroke="currentColor" stroke-width="3" stroke-linecap="round"/><circle cx="24" cy="31" r="3.5" fill="currentColor"/></svg></div>
    <h1>Mein Kalender</h1>
    <p class="wz-lead">Der Kalender, der an das denkt, was du vergisst.</p>
    <div class="wz-box"><b>Kostenlos anmelden – mit Google oder E-Mail.</b><span>Deine Termine sind privat gespeichert – nur du siehst sie. Danach geht die Einrichtung direkt weiter.</span></div>
    <div class="au-wrap">${auBox()}</div>${window.mkAuthErr ? `<p class="err" role="alert">Die Anmeldung hat nicht geklappt: ${esc(window.mkAuthErr)}</p>` : ""}
    <button type="button" class="link" id="wz-look">Erst mal ohne Anmeldung umsehen</button>
    <a class="link" href="/?info" style="margin-top:4px">Was kann der Kalender? Zur Vorstellung</a></div>`; return; }
  wzEl().innerHTML = `<div class="wz-card wz-center">
    <div class="wz-logo" aria-hidden="true"><svg viewBox="0 0 48 48" width="56" height="56"><rect x="6" y="9" width="36" height="33" rx="8" fill="none" stroke="currentColor" stroke-width="3"/><path d="M6 19h36M16 5v8M32 5v8" stroke="currentColor" stroke-width="3" stroke-linecap="round"/><circle cx="24" cy="30" r="4" fill="currentColor"/></svg></div>
    <h1>Mein Kalender</h1>
    <p class="wz-lead">Der Kalender, der an das denkt, was du vergisst.</p>
    <div class="wz-box"><b>Du brauchst ein kostenloses Claude-Konto.</b><span>Damit sind deine Termine privat gespeichert – nur du siehst sie. Die Anmeldung dauert eine Minute, mit E-Mail oder Google.</span></div>
    <a class="wz-big accent" href="${loginUrl()}" target="_blank" rel="noopener">Anmelden oder kostenlos registrieren</a>
    <p class="note">Nach der Anmeldung öffnet sich der Kalender wieder und die Einrichtung geht direkt weiter.</p>
    <button type="button" class="link" id="wz-look">Erst mal ohne Konto umsehen</button>
    <p class="note" style="margin-top:14px">Schon angemeldet und wieder hier? Dann ist dieser Kalender für dein Konto nur zum Ansehen freigegeben. Bitte die Person, die dir den Link geschickt hat, dich per E-Mail einzuladen.</p></div>`;
}
function startSetup(fresh) {
  WZ = { step: "google", name: PROFILE.name || (meName || "").split(/\s+/)[0] || "", state: PROFILE.state || PA, state2: PROFILE.state2 || "", joint: PROFILE.joint ?? true,
    cands: [], picked: {}, roles: {}, showAll: false, manual: FAM().map(p => ({ ...p })), trips: [], editing: !!PROFILE.setupDone, gMsg: "" };
  if (fresh) WZ.editing = false;
  if (APP) { let back = false; try { back = sessionStorage.getItem("mk-wz-g") === "1"; sessionStorage.removeItem("mk-wz-g"); } catch {} if (back && !WZ.editing) setTimeout(() => { if (WZ?.step === "google") wzConnectGoogle(); }, 600); }
  if (WZ.editing) WZ.step = "state";
  wzOpen(); renderWz();
}
// Google später verbunden: restliche Einrichtung anbieten (Kalender → Liebste → Bundesland → Seiten → Übernahme), jeder Schritt überspringbar
function startGoogleSetup() {
  startSetup(true); Object.assign(WZ, { step: "cals", useG: true, later: true }); renderWz();
}
const wzDots = keys => { const i = keys.indexOf(WZ.step); return `<div class="wz-dots">${keys.map((k, j) => `<i class="${j === i ? "on" : j < i ? "done" : ""}"></i>`).join("")}</div>`; };
const wzNt = () => APP && ntSupported() && !(ntSub && Notification.permission === "granted");
const STEPS = () => { const n = wzNt() ? ["notify"] : []; return WZ.later ? ["cals", "family", "state", "pages", ...n, "import", "done"] : WZ.editing ? ["state", "manual", "done"] : gState === "ok" && WZ.useG ? ["google", "cals", "family", "state", "pages", ...n, "import", "done"] : ["google", "manual", "state", "pages", ...n, "import", "done"]; };
function renderWz() {
  const W = WZ, el = wzEl(); if (!el) return;
  const top = `<div class="wz-top">${wzDots(STEPS())}</div>`;
  if (W.step === "google") {
    const busy = !!W.gBusy;
    el.innerHTML = `${top}<div class="wz-card"><h1>Google Kalender verbinden?</h1>
      <p class="wz-lead">Dann siehst du hier deine Google-Termine, neue Einträge landen automatisch dort – und ich übernehme Geburtstage und Reisen für dich.</p>
      ${!mcp && APP ? `<div class="wz-box"><b>Die Verbindung zu Google Kalender kommt in Kürze.</b><span>Starte erst mal ohne – alles, was du einträgst, bleibt erhalten.</span></div>` : ""}${!mcp && !APP ? `<div class="wz-box"><b>Google Kalender ist in Claude noch nicht verbunden.</b><span>Kein Problem – starte erst mal ohne. Verbinden kannst du später jederzeit:<br>1. In Claude auf <b>Einstellungen → Konnektoren</b><br>2. <b>„Google Calendar“</b> hinzufügen und erlauben<br>3. Hier im Kalender <b>☰ → Google Kalender</b></span></div>` : ""}
      ${W.gMsg ? `<div class="wz-box warn"><span>${esc(W.gMsg)}</span></div>` : ""}
      ${mcp ? `<button type="button" class="wz-big accent" id="wz-g-yes"${busy ? " disabled" : ""}>${busy ? "Verbinde mit Google …" : "Ja, Google verbinden"}</button>` : ""}
      <button type="button" class="wz-big ${mcp ? "ghost" : "accent"}" id="wz-g-no">${mcp ? "Ohne Google weiter" : "Ohne Google starten"}</button>
      ${mcp ? `<p class="note">${APP ? "Google fragt dich einmal, ob der Kalender deine Termine sehen und eintragen darf. Bitte beide Häkchen setzen." : "Beim Verbinden fragt Claude einmal um Erlaubnis. Klappt es nicht: in Claude unter Einstellungen → Konnektoren „Google Calendar“ hinzufügen."}</p>` : ""}</div>`;
  }
  if (W.step === "cals") {
    const cals = [{ id: "primary" }, ...gCals.filter(c => !c.primary && c.summary !== gPrimarySummary && c.id !== gPrimarySummary)]; store.set("ft-gcal-asked", "1");
    el.innerHTML = `${top}<div class="wz-card"><h1>Welche Kalender möchtest du sehen?</h1><p class="wz-lead">Tippe an, was hier erscheinen soll – zum Beispiel deinen eigenen und einen gemeinsamen Familienkalender.</p>
      ${gPickList()}
      ${false ? `<div class="form" style="text-align:left"><label for="wz-famcal">Gemeinsamer Familienkalender (optional)</label><select id="wz-famcal"><option value="">Keiner</option>${cals.filter(c => c.id !== "primary").map(c => `<option value="${esc(c.id)}"${PROFILE.famCal === c.id || (!PROFILE.famCal && /famil/i.test(c.summary)) ? " selected" : ""}>${esc(c.summary)}</option>`).join("")}</select>
        <p class="note" style="text-align:left">Ein in Google geteilter Kalender, z. B. „Familie“. Was du dort einträgst, sehen alle, mit denen er geteilt ist – alles andere bleibt privat.</p></div>` : ""}
      <button type="button" class="wz-big accent" id="wz-cals-next">Weiter</button><button type="button" class="link" id="wz-cals-skip">Überspringen</button></div>`;
  }
  if (W.step === "scan") {
    el.innerHTML = `${top}<div class="wz-card wz-center"><h1>Ich schaue mir deinen Kalender an …</h1><div class="wz-bar"><i style="width:${W.prog || 5}%"></i></div><p class="wz-lead">${esc(W.progTxt || "Termine werden geladen")}</p></div>`;
  }
  if (W.step === "family") {
    const C = W.cands, shown = W.showAll ? C : C.slice(0, 8);
    el.innerHTML = `${top}<div class="wz-card"><h1>Wer gehört zu deinen Liebsten?</h1>
      <p class="wz-lead">${C.length ? `Ich habe ${C.length} Geburtstage gefunden. Diese Menschen sind dir vermutlich besonders nah – passt das?` : "Ich habe keine Geburtstage gefunden. Du kannst Menschen auch selbst hinzufügen."}</p>
      <p class="note">Für sie gibt es früher Erinnerungen und eine Geschenkeliste zu Weihnachten. Alle anderen Geburtstage übernehme ich trotzdem.</p>
      <div class="wz-people">${shown.map((c, i) => { const on = !!W.picked[c.key]; return `<div class="wz-person${on ? " on" : ""}"><button type="button" class="wz-pt" data-wzpick="${esc(c.key)}" aria-pressed="${on}"><em>${on ? "✓" : "+"}</em><span><b>${esc(c.name)}</b><small>${c.dt ? `${p2(c.dt.getDate())}.${p2(c.dt.getMonth() + 1)}.${c.year ? c.year : ""}` : ""}${c.hint ? " · " + esc(c.hint) : ""}</small></span></button>
        ${on ? `<select data-wzrole="${esc(c.key)}" aria-label="Rolle von ${esc(c.name)}">${ROLES.map(([k, l]) => `<option value="${k}"${(W.roles[c.key] || c.role || "andere") === k ? " selected" : ""}>${l}</option>`).join("")}</select>` : ""}</div>`; }).join("")}</div>
      ${C.length > 8 && !W.showAll ? `<button type="button" class="link" id="wz-more">Alle ${C.length} anzeigen</button>` : ""}
      <p class="note">Geburtstage aus deinen Google-Kontakten fehlen hier – die gibt Google nicht weiter. Die kannst du danach per Kontakte-Datei oder Screenshot übernehmen.</p>
      <details class="wz-add"><summary>Jemand fehlt?</summary><div class="wz-row"><input type="text" id="wz-an" placeholder="Name"><input type="date" id="wz-ad" aria-label="Geburtstag"><button type="button" class="btn ghost small" id="wz-addp">Hinzufügen</button></div></details>
      <button type="button" class="wz-big accent" id="wz-fam-next">Weiter</button><button type="button" class="link" id="wz-fam-skip">Überspringen</button></div>`;
  }
  if (W.step === "manual") {
    if (!W.manual.length) W.manual = [{ name: "", role: "partner", birthday: "" }];
    el.innerHTML = `${top}<div class="wz-card"><h1>Familie & wichtige Menschen</h1><p class="wz-lead">Mit Geburtstag bekommst du rechtzeitig Erinnerungen – bei Kindern 4, bei runden Geburtstagen 7 Wochen vorher.</p>
      <div class="wz-fam">${W.manual.map((p, i) => `<div class="wz-row"><input type="text" data-wzf="${i}|name" value="${esc(p.name)}" placeholder="Name" aria-label="Name">
        <select data-wzf="${i}|role" aria-label="Rolle">${ROLES.map(([k, l]) => `<option value="${k}"${p.role === k ? " selected" : ""}>${l}</option>`).join("")}</select>
        <input type="text" data-wzf="${i}|bd" value="${esc(p.bd ?? bdShow(p.birthday))}" placeholder="Geburtstag TT.MM." aria-label="Geburtstag (TT.MM., Jahr optional)" autocomplete="off"><button type="button" class="link del" data-wzdel="${i}" aria-label="Entfernen">✕</button></div>`).join("")}</div>
      <button type="button" class="btn ghost small" id="wz-add" style="margin-top:8px">+ Person</button>
      <button type="button" class="wz-big accent" id="wz-man-next">Weiter</button><button type="button" class="link" id="wz-man-skip">Überspringen</button></div>`;
  }
  if (W.step === "pages") {
    const pg = W.pages || PAGES;
    const card = (k, name, txt, prev) => `<label class="pv-card${pg[k] ? " on" : ""}"><input type="checkbox" data-wzpage="${k}"${pg[k] ? " checked" : ""}>
      <div class="pv-shot" aria-hidden="true">${prev}</div><div class="pv-txt"><b>${name}</b><span>${txt}</span></div><i class="pv-ck" aria-hidden="true"></i></label>`;
    const tile = (c, n, l) => `<div class="pv-tile" style="--c:${c}"><em>${n}</em><i></i><i class="s"></i></div>`;
    const heute = `<div class="pv-row">${tile("var(--both)", "3")}${tile("var(--trip)", "14")}${tile("var(--event)", "2")}</div>
      <div class="pv-week">${[0, 1, 2, 3, 4, 5, 6].map(i => `<span${i === 5 ? ' class="t"' : ""}>${i === 1 || i === 5 ? "<b></b>" : ""}</span>`).join("")}</div>
      <div class="pv-line"><b style="--c:var(--event)"></b><i></i></div><div class="pv-line"><b style="--c:var(--both)"></b><i class="s"></i></div><div class="pv-line"><u></u><i></i></div>`;
    const bars = { 3: ["var(--trip)", 3], 9: ["var(--event)", 1], 16: ["var(--holiday)", 1], 22: ["var(--both)", 2], 29: ["var(--be-strong)", 4] };
    const kal = `<div class="pv-cal">${Array.from({ length: 35 }, (_, i) => `<span>${bars[i] ? `<b style="--c:${bars[i][0]};width:calc(${bars[i][1] * 100}% + ${(bars[i][1] - 1) * 3}px)"></b>` : ""}</span>`).join("")}</div>`;
    const ueb = `<div class="pv-list">${[["var(--event)", 0.7], ["var(--be-strong)", 0.9], ["var(--holiday)", 0.55], ["var(--bridge, var(--both))", 0.8]].map(([c, w]) => `<div><em></em><b style="--c:${c}"></b><i style="width:${w * 100}%"></i></div>`).join("")}</div>
      <div class="pv-chart">${[5, 8, 4, 9, 6, 3, 7, 10, 6, 4, 8, 5].map(h => `<i style="height:${h * 10}%"></i>`).join("")}</div>`;
    el.innerHTML = `${top}<div class="wz-card"><h1>Was möchtest du sehen?</h1>
      <p class="wz-lead">Der Kalender hat drei Seiten. Behalte, was dir hilft – ändern kannst du das jederzeit unter ☰ → Anzeigen → Seiten.</p>
      <div class="pv-grid">
        ${card("p0", "Heute", "Countdowns, die nächsten 3 Tage, deine Woche und Aufgaben", heute)}
        ${card("p1", "Kalender", "Monat, Woche, Liste oder Jahr – alle Termine im Raster", kal)}
        ${card("p2", "Überblick", "Geburtstage, Ferien, Feiertage, Brückentage und Statistik", ueb)}
      </div>
      <button type="button" class="wz-big accent" id="wz-pages-next">Weiter</button><button type="button" class="link" id="wz-pages-skip">Überspringen</button></div>`;
    return;
  }
  if (W.step === "state") {
    el.innerHTML = `${top}<div class="wz-card"><h1>Wo wohnst du?</h1><p class="wz-lead">Für Schulferien, Feiertage und Brückentage.</p>
      <div class="form"><label for="wz-name">Dein Vorname</label><input id="wz-name" type="text" value="${esc(W.name)}" placeholder="Vorname" autocomplete="given-name"></div>
      <div class="form"><label for="wz-state">Bundesland</label><select id="wz-state">${stOpts(W.state)}</select></div>
      <details class="wz-add"${W.state2 ? " open" : ""}><summary>Zweites Bundesland (z. B. Partner/in, Großeltern)</summary>
        <div class="form"><select id="wz-state2" aria-label="Zweites Bundesland">${stOpts(W.state2, "Keins")}</select></div>
        <label class="tog setrow"><input type="checkbox" id="wz-joint"${W.joint ? " checked" : ""}> Gemeinsam freie Zeiten hervorheben</label></details>
      <button type="button" class="wz-big accent" id="wz-state-next">${W.editing ? "Weiter" : "Weiter"}</button><button type="button" class="link" id="wz-state-skip">Überspringen</button></div>`;
  }
  if (W.step === "notify") {
    const ios = ntIOSNeedsInstall();
    el.innerHTML = `${top}<div class="wz-card"><h1>Soll ich dich erinnern?</h1>
      <p class="wz-lead">Kurze Hinweise aufs Handy – auch wenn die App zu ist. Einzeln abschaltbar unter ☰ → Benachrichtigungen.</p>
      <ul class="wz-nt"><li>🌙 <b>Abends um 20 Uhr:</b> was morgen ansteht</li><li>⏰ <b>Vor Terminen:</b> 1 Std. vorher, mit Route</li><li>🎂 <b>Geburtstage & Fristen:</b> am Tag und rechtzeitig vorher („schon ein Geschenk?“)</li><li>🎄 <b>Weihnachten & Co.:</b> rechtzeitig an Geschenke denken</li><li>👥 <b>Geteilte Termine:</b> wenn jemand etwas einträgt oder ändert</li></ul>
      ${ios ? `<p class="note">Auf dem iPhone geht das erst, wenn die App auf dem Home-Bildschirm liegt (Safari → Teilen → Zum Home-Bildschirm). Du kannst es danach unter ☰ → Benachrichtigungen einschalten.</p>` : ""}
      <button type="button" class="wz-big accent" id="wz-nt-on"${ios ? " disabled" : ""}>🔔 Ja, erinnere mich</button><button type="button" class="link" id="wz-nt-skip">Später</button></div>`;
  }
  if (W.step === "import") {
    el.innerHTML = `${top}<div class="wz-card wz-center"><h1>Ich richte alles ein …</h1><div class="wz-bar"><i style="width:${W.prog || 5}%"></i></div>
      <ul class="wz-check">${(W.tasks || []).map(t => `<li class="${t.done ? "ok" : t.on ? "run" : ""}"><em>${t.done ? "✓" : t.on ? "…" : ""}</em>${esc(t.t)}${t.res ? `<small>${esc(t.res)}</small>` : ""}</li>`).join("")}</ul></div>`;
  }
  if (W.step === "done") {
    const F = [["var(--both)", "Morgens ein Blick", "Was in den nächsten 3 Tagen ansteht, Countdowns bis Reise, Geburtstag und Ferien – und deine Woche zum Wischen."],
      ["var(--gcal)", "Text rein, Termin raus", "„+ Eintragen“ versteht normale Sätze – oder kopier eine WhatsApp oder Mail hinein."],
      ["var(--event)", "Geburtstage mit Vorlauf", "3 Wochen vorher, Kinder 4, runde 7 – mit „Was wünschst du dir?“ per WhatsApp."],
      ["var(--c-anniv)", "Geschenke im Griff", "Weihnachten, Ostern, Nikolaus: wer bekommt was – offen, Idee, besorgt."],
      ["var(--trip)", "Reisen ohne Checklisten-Stress", "Tickets anhängen – er liest Zeiten und Sitzplatz heraus. Dazu Vignette, Visum, Check-in und eine Packliste, die mitdenkt."],
      ["var(--be-strong)", "Wann habt ihr gemeinsam frei?", "Ferien, Feiertage und Brückentage für jedes Bundesland, Urlaubstage richtig gezählt."]];
    el.innerHTML = `${top}<div class="wz-card wz-center"><div class="wz-logo ok" aria-hidden="true">✓</div><h1>${W.editing ? "Gespeichert" : "Dein Kalender ist eingerichtet!"}</h1>
      ${W.summary ? `<p class="wz-lead">${esc(W.summary)}</p>` : ""}
      ${W.editing || W.later ? "" : `<button type="button" class="link" id="wz-invite" style="margin:0 0 6px">Jemand hat dich eingeladen? Code eingeben</button>`}
      ${W.editing ? "" : `<div class="wz-feat">${F.map(([c, t, d]) => `<div class="wf"><i class="dotc" style="--c:${c}"></i><div><b>${t}</b><span>${d}</span></div></div>`).join("")}</div>
      <p class="note wz-hint">Alles Weitere – Familie, Ferien, Google, Geburtstage aus Kontakten oder Screenshots – findest du oben unter <b>☰</b>.</p>`}
      <button type="button" class="wz-big accent" id="wz-finish">Zum Kalender</button></div>`;
  }
}
const wzGo = s => { WZ.step = s; renderWz(); wzEl()?.parentElement?.scrollTo?.(0, 0); };
function wzReadState() { if ($("wz-name")) WZ.name = $("wz-name").value.trim(); if ($("wz-state")) WZ.state = $("wz-state").value; if ($("wz-state2")) WZ.state2 = $("wz-state2").value; if ($("wz-joint")) WZ.joint = $("wz-joint").checked; }
async function wzConnectGoogle() {
  WZ.gBusy = true; WZ.gMsg = ""; renderWz(); gTry = 0;
  await initGoogle(); WZ.gBusy = false;
  if (APP && FATAL.includes(gState) && gState !== "api_disabled") { gConnect(); return; }   // eigene App: Google-Freigabe holen, danach geht es hier weiter
  if (gState === "ok" && !gPrimarySummary) { try { const r = await withTimeout(mcp.callTool(GSERVER, "list_events", { pageSize: 1 }), 12000); gPrimarySummary = String(r?.payload?.summary || ""); } catch {} }
  if (gState === "ok") { WZ.useG = true; gShow = true; store.set("ft-gshow", "1"); wzGo("cals"); }
  else { WZ.gMsg = gStatusText() || "Google antwortet gerade nicht. Versuch es noch einmal oder mach ohne Google weiter."; renderWz(); }
}
// Google lesen (für die Einrichtung): alle Seiten eines Zeitraums
async function gFetchAll(cal, a, b, extra = {}) {
  const out = []; let token = "";
  for (let i = 0; i < 8; i++) {
    const inp = { startTime: `${iso(a)}T00:00:00`, endTime: `${iso(b)}T00:00:00`, pageSize: 250, orderBy: "startTime", ...extra }; if (cal !== "primary") inp.calendarId = cal; if (token) inp.pageToken = token;
    const r = await withTimeout(mcp.callTool(GSERVER, "list_events", inp), 25000); const p = r?.payload || {};
    if (Array.isArray(p.events)) out.push(...p.events); token = p.nextPageToken || ""; if (!token) break;
  }
  return out;
}
const FAMKW = [[/\b(mama|mami|mutti|mutter|mum)\b/i, "mutter", "Mama"], [/\b(papa|papi|vati|vater|dad)\b/i, "vater", "Papa"], [/\b(oma|omi|opa|opi|großmutter|großvater)\b/i, "andere", "Großeltern"], [/\b(bruder|schwester|bro|sis)\b/i, "geschwister", "Geschwister"], [/\b(sohn|tochter)\b/i, "kind", "Kind"], [/\b(schatz|liebling|frau|mann|ehefrau|ehemann)\b/i, "partner", "Partner/in"], [/\b(tante|onkel|cousin|cousine|nichte|neffe|schwager|schwägerin|schwiegermutter|schwiegervater)\b/i, "andere", "Familie"]];
function bdName(title) {
  let t = String(title || "").replace(/🎂|🎉|🎁/g, " ").replace(/\s+/g, " ").trim(), year = 0, m;
  if ((m = t.match(/\((\d{4})\)|\*\s?(\d{4})|geb\.?\s?(\d{4})|\b(19\d\d|20[0-2]\d)\b/))) year = +(m[1] || m[2] || m[3] || m[4]);
  t = t.replace(/\((\d{4}|\d{1,3}\.?)\)|\*\s?\d{4}|\b(19\d\d|20[0-2]\d)\b/g, " ");
  t = t.replace(/^(geburtstag|geb\.?|birthday|bday|happy birthday)\s*(von|:|-)?\s*/i, "").replace(/\s*(-|:)?\s*(geburtstag|geb\.?|birthday|bday)\s*$/i, "").replace(/['’]s$/i, "").replace(/\s+/g, " ").trim();
  return { name: t, year };
}
async function wzScan() {
  wzGo("scan"); const W = WZ, cals = selectedCals(), a = addDays(TODAY, -7), b = addDays(TODAY, 372), all = [];
  const myLast = (meName || W.name || "").trim().split(/\s+/).slice(1).pop()?.toLowerCase() || "";
  let n = 0;
  for (const cal of cals) {
    W.progTxt = `Termine aus „${cal === "primary" ? "Mein Kalender" : (gCals.find(c => c.id === cal)?.summary || cal)}“ werden geladen …`; W.prog = 10 + 60 * n / cals.length; renderWz();
    try { (await gFetchAll(cal, a, b)).forEach(e => all.push({ e, cal })); } catch {}
    if (cal === "primary") { try { (await gFetchAll(cal, a, b, { eventType: ["BIRTHDAY"] })).forEach(e => all.push({ e, cal, bd: true })); } catch {} }
    n++;
  }
  W.prog = 80; W.progTxt = "Geburtstage und Reisen werden erkannt …"; renderWz();
  W.raw = all;
  // Geburtstage
  const map = new Map();
  all.forEach(({ e, cal, bd }) => {
    const t = String(e.summary || ""); const isBd = bd || e.eventType === "birthday" || /geburtstag|\bgeb\.?\b|birthday|🎂/i.test(t); if (!isBd || !e.start) return;
    if (/^(herzlichen glückwunsch|happy birthday|alles gute)/i.test(t.trim())) return; // der eigene Geburtstag
    const { name, year } = bdName(t); if (!name || name.length > 40) return;
    const dt = parseIso(String(e.start.date || e.start.dateTime || "").slice(0, 10)); if (!dt) return;
    const key = name.toLowerCase(); if (map.has(key)) return;
    let score = 0, role = "", hint = "";
    FAMKW.forEach(([re, r, h]) => { if (!role && re.test(t + " " + name)) { role = r; hint = h; score += 6; } });
    if (myLast && name.toLowerCase().split(/\s+/).includes(myLast)) { score += 4; hint = hint || "gleicher Nachname"; }
    if (/\b(kollege|kollegin|chef|chefin|nachbar|nachbarin|kunde|kundin|trainer|lehrer|lehrerin)\b/i.test(t)) score -= 6;
    if (!role && year && TODAY.getFullYear() - year < 22 && score >= 4) role = "kind";
    if (!bd && e.creator?.self) score += 1;
    map.set(key, { key, name, year, dt, role, hint, score, gid: String(e.recurringEventId || e.id || ""), cal });
  });
  W.cands = [...map.values()].sort((x, y) => y.score - x.score || x.dt.getMonth() - y.dt.getMonth() || x.dt.getDate() - y.dt.getDate());
  let top = W.cands.filter(c => c.score >= 4).slice(0, 6);
  if (top.length < 2) top = W.cands.filter(c => c.score >= 0).slice(0, 2);
  top.forEach(c => { W.picked[c.key] = true; if (c.role) W.roles[c.key] = c.role; });
  // Reisen und Urlaube (nur eigene Termine)
  const seen = new Set(EV.map(x => x.gEventId).filter(Boolean));
  W.trips = all.filter(({ e, cal, bd }) => { if (bd || !e.start?.date || !e.end?.date) return false; const t = String(e.summary || "");
      if (/geburtstag|birthday/i.test(t)) return false; const s = parseIso(e.start.date), en = addDays(parseIso(e.end.date), -1); if (!s || !en || s < TODAY) return false;
      const days = dayDiff(s, en) + 1; const mine = cal === "primary" || e.creator?.self;
      return mine && (TRIP_RE.test(t) || (days >= 2 && e.location)) && !/eintragen|beantragen|buchen/i.test(t); })
    .filter(({ e }) => { const id = String(e.recurringEventId || e.id); if (seen.has(id)) return false; seen.add(id); return true; })
    .slice(0, 20);
  W.prog = 100; renderWz();
  wzGo(W.cands.length ? "family" : "manual");
}
async function wzImport() {
  const W = WZ; wzGo("import");
  const T = W.tasks = [{ t: "Ferien und Feiertage berechnen" }, ...(W.useG ? [{ t: "Geburtstage übernehmen" }, { t: "Reisen und Urlaube erkennen" }] : []), { t: "Familie und Erinnerungen einrichten" }, { t: "Profil speichern" }];
  const step = async (i, fn) => { const t0 = Date.now(); T[i].on = true; W.prog = Math.round(100 * i / T.length) + 4; renderWz(); try { T[i].res = (await fn()) || ""; } catch { T[i].res = "teilweise"; } await new Promise(r => setTimeout(r, Math.max(0, 1300 - (Date.now() - t0)))); T[i].done = true; T[i].on = false; renderWz(); await new Promise(r => setTimeout(r, 900)); };
  let k = 0, nB = 0, nT = 0;
  const fam = [];
  await step(k++, async () => { PA = W.state; PB = W.state2 && W.state2 !== W.state ? W.state2 : null; JOINT = W.joint ? [PA, PB].filter(Boolean) : []; rebuildStates(); saveXst(); return [stName(PA), PB && stName(PB)].filter(Boolean).join(" & "); });
  if (W.useG) {
    await step(k++, async () => {
      const have = new Set(EV.filter(e => e.type === "birthday").map(e => e.title.toLowerCase()));
      const writes = W.cands.filter(c => !have.has(c.key)).map(c => { const d = new Date(TODAY.getFullYear(), c.dt.getMonth(), c.dt.getDate()); const isFam = !!W.picked[c.key];
        if (isFam) fam.push({ name: c.name, role: W.roles[c.key] || c.role || "andere", birthday: c.year ? iso(new Date(c.year, c.dt.getMonth(), c.dt.getDate())) : "" });
        return plain({ type: "birthday", title: c.name, from: iso(d), to: iso(d), repeat: "yearly", birthYear: c.year || 0, gcal: c.cal, gEventId: c.gid, gReadOnly: true, fam: isFam }); });
      for (const w of writes) { await COLL("events").add(w); nB++; }
      return `${nB} Geburtstage`;
    });
    await step(k++, async () => {
      for (const { e, cal } of W.trips) { const s = parseIso(e.start.date), en = addDays(parseIso(e.end.date), -1);
        await COLL("events").add(plain({ type: "trip", title: String(e.summary || "Reise").replace(/^stay at\s+/i, "Hotel "), from: iso(s), to: iso(en), repeat: "none", gcal: cal, gEventId: String(e.recurringEventId || e.id), gReadOnly: true, place: String(e.location || ""), flight: FLIGHT_RE.test(String(e.summary || "")) })); nT++; }
      return nT ? `${nT} ${nT === 1 ? "Reise" : "Reisen"} gefunden` : "keine geplanten Reisen";
    });
  }
  await step(k++, async () => {
    W.manual.filter(p => p.name.trim()).forEach(p => fam.push({ name: p.name.trim(), role: p.role, birthday: p.birthday || "" }));
    const have = new Set(EV.filter(e => e.type === "birthday").map(e => e.title.toLowerCase()));
    for (const p of W.manual.filter(p => p.name.trim() && p.birthday && !have.has(p.name.trim().toLowerCase()))) { const pb = ctParseDate(p.birthday); if (!pb || !pb.m || !pb.d) continue;
      const d = new Date(TODAY.getFullYear(), pb.m - 1, pb.d); await COLL("events").add(plain({ type: "birthday", title: p.name.trim(), from: iso(d), to: iso(d), repeat: "yearly", birthYear: pb.y >= 1900 && pb.y < TODAY.getFullYear() ? pb.y : 0, gcal: "", fam: true })); nB++; }
    return fam.length ? `${fam.length} Personen` : "";
  });
  await step(k++, async () => { const prof = { ...PROFILE, name: W.name, state: PA, state2: PB || "", joint: !!W.joint, family: W.later ? [...FAM(), ...fam.filter(f => !FAM().some(x => x.name.toLowerCase() === f.name.toLowerCase()))] : W.editing && !fam.length ? FAM() : fam, setupDone: true, ...(W.famCal !== undefined ? { famCal: W.famCal, shareGroups: W.famCal ? (famGroups().some(g => g.cal === W.famCal) ? famGroups() : [...famGroups(), { cal: W.famCal, members: [], std: !famGroups().length }]) : famGroups() } : {}) };
    await COLL("prefs").doc("profile").set(prof); applyProfile(prof); });
  W.prog = 100; W.summary = [nB ? `${nB} ${nB === 1 ? "Geburtstag" : "Geburtstage"} übernommen` : "", nT ? `${nT} ${nT === 1 ? "Reise" : "Reisen"}` : "", `Ferien für ${[stName(PA), PB && stName(PB)].filter(Boolean).join(" & ")}`].filter(Boolean).join(" · ");
  wzGo("done");
}
// Profil bearbeiten (aus „Anzeigen“): Land und Familie, ohne Import
async function wzSaveEdit() {
  const W = WZ; const fam = W.manual.filter(p => p.name.trim()).map(p => ({ name: p.name.trim(), role: p.role, birthday: p.birthday || "" }));
  PA = W.state; PB = W.state2 && W.state2 !== W.state ? W.state2 : null; JOINT = W.joint ? [PA, PB].filter(Boolean) : JOINT; rebuildStates(); saveXst();
  const prof = { ...PROFILE, name: W.name, state: PA, state2: PB || "", joint: !!W.joint, family: fam, setupDone: true };
  try { await COLL("prefs").doc("profile").set(prof); } catch (err) { toast(writeErr(err)); return; }
  applyProfile(prof); W.summary = ""; wzGo("done");
}
function wzClick(id, el) {
  const W = WZ; if (!W) return false;
  switch (id) {
    case "wz-look": wzClose(); return true;
    case "app-login": window.mkSignIn?.(); return true;
    case "wz-g-yes": wzConnectGoogle(); return true;
    case "wz-g-no": W.useG = false; wzGo("manual"); return true;
    case "wz-cals-skip": wzScan(); return true;
    case "wz-cals-next": { const f = $("wz-famcal")?.value || ""; W.famCal = f; PROFILE.famCal = f; if (f) { const s2 = new Set(selectedCals()); s2.add(f); gSel = s2; saveGSel(s2); } wzScan(); return true; }
    case "wz-more": W.showAll = true; renderWz(); return true;
    case "wz-addp": { const n = $("wz-an").value.trim(), d = parseIso($("wz-ad").value); if (!n) return true; const key = n.toLowerCase();
      if (!W.cands.some(c => c.key === key)) W.cands.unshift({ key, name: n, year: d ? d.getFullYear() : 0, dt: d, role: "", hint: "", score: 9, gid: "", cal: "" });
      W.picked[key] = true; renderWz(); return true; }
    case "wz-fam-next": wzGo("state"); return true;
    case "wz-fam-skip": W.picked = {}; wzGo("state"); return true;
    case "wz-pages-skip": if (wzNt()) wzGo("notify"); else wzImport(); return true;
    case "wz-nt-skip": wzImport(); return true;
    case "wz-nt-on": (async () => { const b = $("wz-nt-on"); if (b) { b.disabled = true; b.textContent = "Einen Moment …"; } await notifyOn(true); wzImport(); })(); return true;
    case "wz-add": W.manual.push({ name: "", role: "kind", birthday: "" }); renderWz(); return true;
    case "wz-man-next": if (W.editing) wzSaveEdit(); else wzGo("state"); return true;
    case "wz-man-skip": if (W.editing) { wzSaveEdit(); } else wzGo("state"); return true;
    case "wz-state-next": case "wz-state-skip": wzReadState(); if (id === "wz-state-skip" && !W.editing) { W.state = PA; W.state2 = ""; }
      if (W.editing) wzGo("manual"); else { W.pages ??= { ...PAGES }; wzGo("pages"); } return true;
    case "wz-pages-next": { const pg = W.pages || PAGES; if (!pg.p0 && !pg.p1 && !pg.p2) { toast("Wähl mindestens eine Seite"); return true; }
      PAGES = { ...pg }; store.set("ft-pages", JSON.stringify(PAGES)); applyPages(); if (wzNt()) wzGo("notify"); else wzImport(); return true; }
    case "wz-finish": wzClose(); store.set("ft-first", String(EV.length)); renderHints(); if (pendingInvite()) { takeInvite(); return true; } setTimeout(() => { goPage("p0"); $("p0")?.scrollTo?.({ top: 0 }); scrollTo({ top: 0, behavior: "smooth" }); }, 50); return true;
    case "wz-invite": wzClose(); store.set("ft-first", String(EV.length)); renderHints(); shrAcc = { code: "" }; showShareMgr(); setTimeout(() => $("shr-code")?.focus(), 80); return true;
  }
  return false;
}

// =================== Darstellung ===================
const THEMES = [["auto", "◐", "Auto"], ["light", "☀", "Hell"], ["dark", "☾", "Dunkel"]];
let themeIdx = Math.max(0, THEMES.findIndex(x => x[0] === store.get("ft27-theme")));
function toggleMenu() { const m = $("menu"); if (!m) return; const open = m.hidden; m.hidden = !open; $("menu-btn").setAttribute("aria-expanded", String(open));
  if (open) { $("mi-google").hidden = true; $("mi-fam").hidden = true; $("mi-docs").hidden = !canWrite; $("mi-docs-n").textContent = DOCS.length || ""; renderMenuDot(); } }
function closeMenu() { const m = $("menu"); if (m && !m.hidden) { m.hidden = true; $("menu-btn")?.setAttribute("aria-expanded", "false"); } }
function applyTheme() {
  const [k, ico, lbl] = THEMES[themeIdx], root = document.documentElement;
  if (k === "auto") root.removeAttribute("data-theme"); else root.setAttribute("data-theme", k);
  $("theme-ico").textContent = ico; $("theme-lbl").textContent = lbl;
  $("theme-btn").setAttribute("aria-label", `Darstellung: ${lbl}, tippen zum Wechseln`);
}

// =================== Ereignisse ===================
let toastT;
function toast(t, undo) {
  const el = $("toast"); el.innerHTML = `<span>${esc(t)}</span>${undo ? `<button type="button" id="toast-undo">Rückgängig</button>` : ""}`; el.hidden = false;
  if (undo) $("toast-undo").onclick = async () => { el.hidden = true; try { await undo(); } catch { toast("Rückgängig hat nicht geklappt"); } };
  clearTimeout(toastT); toastT = setTimeout(() => el.hidden = true, undo ? 6000 : 2400);
}
document.addEventListener("click", ev => {
  if (Date.now() - swipedAt < 400 && ev.target.closest("#bigmonth, #week, #year")) { ev.preventDefault(); ev.stopPropagation(); return; }
  if (Date.now() - rgSuppress < 350 || ((RG?.waitEnd || rgActive) && ev.target.closest("#bigmonth, #year"))) { ev.preventDefault(); ev.stopPropagation(); return; }
  const t = ev.target, q = s => t.closest(s);
  let el;
  if ((el = q("[data-stat]")) && ev.target.id !== "st-vac") { showStat(el.dataset.stat); return; }
  if ((el = q("[data-n3]"))) { showNext3(); return; }
  if ((el = q("[data-day]"))) { const dt = parseIso(el.dataset.day); if (moving) finishMove(dt); else showDay(dt); return; }
  if ((el = q("[data-occ]"))) { const [id, a] = el.dataset.occ.split("|"); const o = findOcc(id, a); if (o) showEvent(o); return; }
  if ((el = q("[data-edit]"))) { const e = EV.find(x => x.id === el.dataset.edit) || RECV.find(x => x.id === el.dataset.edit); if (e) showForm(e); return; }
  if ((el = q("[data-shev]"))) { const [id, d] = el.dataset.shev.split("|"), e = EV.find(x => x.id === id); if (e) showShareEv(e, d); return; }
  if ((el = q("[data-shunhide]"))) { SHR.hidden = SHR.hidden.filter(s => s !== el.dataset.shunhide); saveShr(); shrMerge(); showShareMgr(); toast("Wieder eingeblendet"); return; }
  if ((el = q("[data-shdel]"))) { const e = RECV.find(x => x.id === el.dataset.shdel); if (e) showSharedDelete(e); return; }
  if ((el = q("[data-shdelall]"))) { const e = RECV.find(x => x.id === el.dataset.shdelall); if (e) shrDeleteAll(e); return; }
  if ((el = q("[data-shdelme]"))) { const e = RECV.find(x => x.id === el.dataset.shdelme); if (e) { SHR.hidden = [...new Set([...SHR.hidden, e.shared.sid])]; saveShr(); closeSheet(); shrMerge(); toast("Bei dir entfernt", async () => { SHR.hidden = SHR.hidden.filter(s => s !== e.shared.sid); await saveShr(); shrMerge(); }); } return; }
  if ((el = q("[data-shhide]"))) { SHR.hidden = [...new Set([...SHR.hidden, el.dataset.shhide])]; saveShr(); closeSheet(); shrMerge(); toast("Ausgeblendet"); return; }
  if ((el = q("[data-shscope]"))) { shrFor.scope = el.dataset.shscope; document.querySelectorAll("[data-shscope]").forEach(b => b.setAttribute("aria-checked", String(b === el))); return; }
  if ((el = q("[data-shrdel]"))) { const L = el.dataset.shrdel; if (el.dataset.arm !== "1") { el.dataset.arm = "1"; el.textContent = "Entfernen?"; el.classList.add("arm"); return; }
    shrRemove(L); return; }
  if ((el = q("[data-grpedit]"))) { const g = SHR.groups.find(x => x.id === el.dataset.grpedit); if (g) { shrGrp = { ...g }; showShareMgr(); } return; }
  if ((el = q("[data-grprm]"))) { SHR.groups = SHR.groups.filter(x => x.id !== el.dataset.grprm); saveShr(); showShareMgr(); return; }
  if ((el = q("[data-move]"))) { const e = EV.find(x => x.id === el.dataset.move); if (e) startMove(e); return; }
  if ((el = q("[data-del]"))) { const [id, a] = el.dataset.del.split("|"); delEvent(el, id, a); return; }
  if ((el = q("[data-delx]"))) { const [m, id, a] = el.dataset.delx.split("|"); if (m === "no") { el.closest(".delch")?.remove(); document.querySelectorAll("[data-del],[data-gdel]").forEach(b => b.hidden = false); } else delSeries(el, m, id, a); return; }
  if ((el = q("[data-share]"))) { const [id, a] = el.dataset.share.split("|"); shareOcc(id, a); return; }
  if ((el = q("[data-up]"))) { upTab = el.dataset.up; store.set("ft-up", upTab); if (upCollapsed) { upCollapsed = false; store.set("ft-up-col", "0"); } renderUp(); return; }
  if ((el = q("[data-remact]"))) { const [i, ...rest] = el.dataset.remact.split("|"); const a = rest.join("|"); if (el.dataset.close && sheetMode === "rem" && !/^(ideas|pack|giftopen:|edit)/.test(a)) closeSheet(); remAction(+i, a); return; }
  if ((el = q("[data-rem]"))) { showRem(+el.dataset.rem); return; }
  if (sheetMode === "gifts" && sheetCtx) { const k = sheetCtx.id, L = GIFTS[k];
    if ((el = q("[data-gst]"))) { const p = L.people[+el.dataset.gst]; p.s = (p.s + 1) % 3; saveGifts(); showGifts(k); return; }
    if ((el = q("[data-gdelp]"))) { L.people.splice(+el.dataset.gdelp, 1); saveGifts(); showGifts(k); return; }
    if ((el = q("[data-gaddn]"))) { L.people.push({ n: el.dataset.gaddn, s: 0, idea: "" }); saveGifts(); showGifts(k); return; }
    if ((el = q("[data-gai]"))) { giftIdeas(k, +el.dataset.gai); return; }
    if ((el = q("[data-gpick]"))) { const [i, ...t] = el.dataset.gpick.split("|"); const p = L.people[+i]; p.idea = t.join("|"); if (p.s === 0) p.s = 1; saveGifts(); showGifts(k); return; }
    if (ev.target.id === "g-add") { const v = $("g-new").value.trim(); if (v) { L.people.push({ n: v, s: 0, idea: "" }); saveGifts(); showGifts(k); } return; }
  }
  if ((el = q("[data-sugok]"))) { const c = bdPeople().find(x => x.key === el.dataset.sugok); const r = document.querySelector(`[data-sugrole="${CSS.escape(el.dataset.sugok)}"]`)?.value; if (c) { famAdd(c, r); toast(`${c.name} gehört jetzt zu deinen Liebsten`); } return; }
  if ((el = q("[data-sugno]"))) { const no = new Set(PROFILE.famNo || []); no.add(el.dataset.sugno); famSave({ famNo: [...no] }); showFamily(); return; }
  if ((el = q("[data-famhit]"))) { const c = bdPeople().find(x => x.key === el.dataset.famhit); if (c) { famQ = ""; famAdd(c); } return; }
  if ((el = q("[data-grpadd]"))) { const G = famGroups(); G.push({ cal: el.dataset.grpadd, members: [], std: !G.length }); saveGroups(G, `„${calName(el.dataset.grpadd)}“ hinzugefügt – wähle jetzt, wer dazugehört`); return; }
  if ((el = q("[data-grpdel]"))) { const G = famGroups(); G.splice(+el.dataset.grpdel, 1); saveGroups(G, "Gruppe entfernt"); return; }
  if ((el = q("[data-grpstd]"))) { const G = famGroups().map((g, i) => ({ ...g, std: i === +el.dataset.grpstd })); saveGroups(G); return; }
  if ((el = q("[data-vis]"))) { setVis(el.dataset.vis, true); return; }
  if ((el = q("[data-tkedit]"))) { showTaskEdit(el.dataset.tkedit); return; }
  if ((el = q("[data-tkq]"))) { const v = el.dataset.tkq; $("tk-e-due").value = v === "" ? "" : iso(addDays(TODAY, +v)); return; }
  if ((el = q("[data-tksave]"))) { const title = $("tk-e-title").value.trim(); if (!title) { $("tk-e-title").focus(); return; } tkSet(el.dataset.tksave, { title, due: $("tk-e-due").value || "" }); closeSheet(); toast("Gespeichert"); return; }
  if ((el = q("[data-tkdone2]"))) { const id = el.dataset.tkdone2; tkSet(id, { done: true, doneAt: new Date().toISOString() }); closeSheet(); toast("Erledigt", async () => tkSet(id, { done: false, doneAt: "" })); return; }
  if ((el = q("[data-tkdel]"))) { tkDel(el.dataset.tkdel); return; }
  if ((el = q("[data-tksug]"))) { const s = window.__tkSug?.[+el.dataset.tksug]; if (s) { addTask(s); toast("Aufgabe übernommen"); } return; }
  if ((el = q("[data-tkno]"))) { const s = window.__tkSug?.[+el.dataset.tkno]; if (s) addTask({ ...s, state: "no", done: true }); return; }
  if ((el = q("[data-bddel]"))) { const k = el.dataset.bddel; if (famDelArm === k) bdDelete([k]); else { famDelArm = k; showFamily(); } return; }
  if ((el = q("[data-famdel]"))) { const p = FAMED.splice(+el.dataset.famdel, 1)[0]; if (p) famMark(p.name, false); famSave(); showFamily(); return; }
  if ((el = q("#menu [data-mi]"))) { closeMenu(); }
  if (!q("#menu") && !q("#menu-btn")) closeMenu();
  if ((el = q("[data-wzdel]"))) { WZ.manual.splice(+el.dataset.wzdel, 1); renderWz(); return; }
  if ((el = q("[data-wzcal]"))) { const s2 = new Set(selectedCals()), c = el.dataset.wzcal; s2.has(c) ? s2.delete(c) : s2.add(c); if (!s2.size) s2.add("primary"); gSel = s2; saveGSel(s2); resetGoogleWatches(); if (sheetMode === "gpick" && !$("sheet").hidden) { showGCalPick(); return; } renderWz(); return; }
  if ((el = q("[data-wzpick]"))) { const k = el.dataset.wzpick; WZ.picked[k] = !WZ.picked[k]; renderWz(); return; }
  if (WZ && ev.target.closest?.("#wz [id]") && wzClick(ev.target.closest("#wz [id]").id)) return;
  if ((el = q("[data-wkstep]"))) { setWk(addDays(wkStart, 7 * +el.dataset.wkstep), null); return; }
  if ((el = q("[data-wksel]"))) { if (Date.now() - swipedAt < 400) return; const d = parseIso(el.dataset.wksel); setWk(wkStart, wkSel && sameDay(wkSel, d) ? null : d); return; }
  if ((el = q("[data-catopen]"))) { catOpen = catOpen === el.dataset.catopen ? "" : el.dataset.catopen; showSettings("farben"); return; }
  if ((el = q("[data-catc]"))) { const [k, id] = el.dataset.catc.split("|"), C = { ...catCols() }; if (id) C[k] = id; else delete C[k]; CATC = null; store.set("ft-catc", JSON.stringify(C)); catOpen = ""; renderAll(); showSettings("farben"); return; }
  if ((el = q("[data-ftype]"))) { const t = $("f-type"); t.value = el.dataset.ftype; t.dispatchEvent(new Event("change", { bubbles: true })); return; }
  if ((el = q("[data-pkdir]")) || (el = q("[data-pkmode]"))) { const g = el.parentElement; g.dataset.v = el.dataset.pkdir || el.dataset.pkmode; g.querySelectorAll("button").forEach(b => b.setAttribute("aria-selected", String(b === el))); pickPreview(); return; }
  if ((el = q("[data-plans]"))) { showPlans(); return; }
  if ((el = q("[data-faminv]"))) { famInvite(); return; }
  if ((el = q("[data-addon]"))) { showAddon(); return; }
  if ((el = q("[data-addonbuy]"))) { if (BILL?.mode !== "simulate") { toast("Bezahlung ist noch nicht eingerichtet."); return; } window.mkBilling("simulate", { addon: true }).then(async r => { if (r?.ok) { use("tarif_zusatz_gebucht"); toast("Zusatzpaket ist aktiv (Test)"); await billLoad(true); showPlans(); } else { await billLoad(true); showAddon(); } }); return; }
  if ((el = q("[data-famshare]"))) { const t = el.dataset.famshare; if (navigator.share) navigator.share({ text: t }).catch(() => {}); else navigator.clipboard?.writeText(t).then(() => toast("Link kopiert")); return; }
  if ((el = q("[data-famjoin]"))) { window.mkBilling("family/join", { code: el.dataset.famjoin }).then(async r => { if (r?.ok) { use("familie_beigetreten"); toast(`Willkommen in der Familie von ${r.ownerName}!`); await billLoad(true); pushPlanQueue(500); showPlans(); } else toast("Beitreten ging gerade nicht."); }); return; }
  if ((el = q("[data-famrm]"))) { const id = el.dataset.famrm; window.mkBilling("family/remove", { user: id }).then(async r => { toast(r?.ok ? "Aus der Familie entfernt" : "Ging nicht"); await billLoad(true); showPlans(); }); return; }
  if ((el = q("[data-famleave]"))) { openSheet("Familie verlassen?", "", `<p>Du verlässt die Familie – deine Termine und Einstellungen bleiben alle erhalten.</p><p class="btnrow"><button type="button" class="btn danger" data-famleaveok>Verlassen</button><button type="button" class="btn ghost" data-plans>Abbrechen</button></p>`, "plan"); return; }
  if ((el = q("[data-famleaveok]"))) { window.mkBilling("family/leave").then(async r => { toast(r?.ok ? "Du hast die Familie verlassen" : "Ging nicht"); await billLoad(true); showPlans(); }); return; }
  if ((el = q("[data-checkout]"))) { showCheckout(el.dataset.checkout); return; }
  if ((el = q("[data-buy]"))) { const id = el.dataset.buy, up = ({ free: 0, plus: 1, family: 2 })[id] > ({ free: 0, plus: 1, family: 2 })[BILL?.plan?.id || "free"]; billDo(id, up ? `${BILL?.plans?.[id]?.label || "Tarif"} ist aktiv (Test)` : `Wechsel zu ${BILL?.plans?.[id]?.label || ""} vorgemerkt (Test)`); return; }
  if ((el = q("[data-cancel]"))) { openSheet("Abo kündigen?", "", `<p>Dein ${esc(BILL?.plan?.label || "")}-Tarif läuft bis ${BILL?.plan?.periodEnd ? fmt(new Date(BILL.plan.periodEnd)) : "zum Ende des bezahlten Monats"} weiter. Danach gelten wieder die Grenzen von „Kostenlos“ – alle Termine und Einstellungen bleiben erhalten.</p><p class="btnrow"><button type="button" class="btn danger" data-cancelok>Jetzt kündigen</button><button type="button" class="btn ghost" data-plans>Behalten</button></p>`, "plan"); return; }
  if ((el = q("[data-cancelok]"))) { billDo("cancel", "Gekündigt (Test) – läuft bis Monatsende weiter"); return; }
  if ((el = q("[data-resume]"))) { billDo("resume", "Zurückgenommen – alles bleibt wie es war (Test)"); return; }
  if ((el = q("[data-admplan]"))) { const [u, pl] = el.dataset.admplan.split("|"); window.mkAdminPlan?.(u, pl).then(r => { toast(r?.ok ? "Tarif gesetzt" : "Ging nicht"); showAdmin(true); }); return; }
  if ((el = q("[data-admtab]"))) { ADM_TAB = el.dataset.admtab; showAdmin(); return; }
  if ((el = q("[data-qcol]"))) { const v = el.dataset.qcol, cid = v.slice(v.lastIndexOf("|") + 1), eid = v.slice(0, v.lastIndexOf("|")); if (eid.startsWith("g:")) quickGColor(eid, cid); else quickColor(eid, cid); return; }
  if ((el = q("[data-ftitle]"))) { const t = $("f-title"); t.value = el.dataset.ftitle; t.dispatchEvent(new Event("input", { bubbles: true })); return; }
  if ((el = q("#f-more"))) { fMore = !fMore; syncFormFields(); return; }
  if ((el = q("[data-fcol]"))) { document.querySelectorAll("[data-fcol]").forEach(b => b.setAttribute("aria-checked", String(b === el))); return; }
  if ((el = q("[data-tkn]"))) { const d = $("tk-due"), k = el.dataset.tkn, v = k === "w" ? iso(addDays(monday(TODAY), 6)) : iso(addDays(TODAY, +k)); d.value = d.value === v ? "" : v; d.dataset.man = "1"; tkUi(); $("tk-in").focus(); return; }
  if ((el = q("[data-umg]"))) { const [id, a] = el.dataset.umg.split("|"); const o = findOcc(id, a); if (!o) return; const on = umgToggle(o.ev.title);
    toast(on ? `Alle „${o.ev.title}“-Einträge zählen jetzt als Umgang` : `„${o.ev.title}“ ist wieder ein normaler Termin`); renderAll(); const o2 = findOcc(id, a) || o; showGoogleEvent(o2); return; }
  if ((el = q("[data-gmerk]"))) { const [id, a] = el.dataset.gmerk.split("|"); const o = findOcc(id, a); if (o) openMerk(o); return; }
  if ((el = q("[data-adopt]"))) { const [id, a] = el.dataset.adopt.split("|"); const o = findOcc(id, a); if (o) adoptTrip(o, false); return; }
  if ((el = q("#f-time-add"))) { fTimeOpen = true; $("f-time-wrap").hidden = false; el.hidden = true; $("f-time")?.focus(); return; }
  if ((el = q("[data-focus]"))) { const k = el.dataset.focus; FOCUS_OPEN[k] = !FOCUS_OPEN[k]; renderFocus(); if (FOCUS_OPEN[k]) $(k === "week" ? "sec-next" : k === "tasks" ? "sec-tasks" : "sec-soon")?.scrollIntoView({ behavior: "smooth", block: "nearest" }); if (k === "tasks" && FOCUS_OPEN.tasks && !TASKS.some(t => !t.done)) $("tk-in")?.focus(); return; }
  if ((el = q("[data-placeno]"))) { const S = noPlace(); S.add(el.dataset.placeno); store.set("ft-noplace", JSON.stringify([...S].slice(-300))); const b = $("place-sug"); if (b) b.hidden = true; toast("Gemerkt – bei diesem Titel frage ich nicht mehr nach einem Ort"); renderAll(); return; }
  if ((el = q("[data-placeset]"))) { const o = sheetCtx && findOcc(sheetCtx.id, sheetCtx.a); if (o) setPlace(o, el.dataset.placeset); return; }
  if ((el = q("[data-osm]"))) { const f = $("f-place"); if (f) { f.value = el.dataset.osm; osmLast = f.value; } const b = $("f-place-sug"); if (b) b.hidden = true; return; }
  if ((el = q("[data-doc]"))) { const [id, fid] = el.dataset.doc.split("|"); const e = id ? EV.find(x => x.id === id) : null; showDoc(e, fid, !id); return; }
  if ((el = q("[data-docsback]"))) { showDocs(); return; }
  if ((el = q("#docs-all"))) { const q2 = docQ.trim().toLowerCase(), ids = DOCS.filter(d => { const L = docLbl(d); return !q2 || `${d.name} ${L.title} ${L.date}`.toLowerCase().includes(q2); }).map(d => d.id);
    if (ids.every(id => DOCSEL.has(id))) ids.forEach(id => DOCSEL.delete(id)); else ids.forEach(id => DOCSEL.add(id)); docDelArm = false; showDocs(); return; }
  if ((el = q("#docs-del"))) { if (!docDelArm) { docDelArm = true; showDocs(); return; } const ids = [...DOCSEL]; docDelArm = false; el.disabled = true;
    docsRemove(ids).then(() => { DOCSEL.clear(); toast(ids.length > 1 ? `${ids.length} Dokumente gelöscht` : "Dokument gelöscht"); }).catch(err => toast(writeErr(err))).finally(() => showDocs()); return; }
  if ((el = q("[data-docsave]"))) { const [id, fid] = el.dataset.docsave.split("|"); docSave(id, fid); return; }
  if ((el = q("[data-docdel]"))) { const [id, fid] = el.dataset.docdel.split("|"); if (el.dataset.sure) docDelete(id, fid); else { el.dataset.sure = 1; el.textContent = "Wirklich löschen?"; } return; }
  if ((el = q("[data-docback]"))) { const e = EV.find(x => x.id === el.dataset.docback), o = e && findOcc(e.id, iso(e.a)); if (o) showEvent(o); else closeSheet(); return; }
  if ((el = q("[data-docai]"))) { const e = EV.find(x => x.id === el.dataset.docai); if (e) docAnalyze(e); return; }
  if ((el = q("#dai-ok"))) { docApply(); return; }
  if ((el = q("[data-pack]"))) { const e = EV.find(x => x.id === el.dataset.pack); if (e) showPack(e); return; }
  if ((el = q("[data-pkdel]"))) { ev.preventDefault(); const i = +el.dataset.pkdel; savePack(packEv.packlist.filter((_, j) => j !== i), true); showPack(packEv, true); return; }
  if ((el = q("[data-ideas]"))) { const [id, a] = el.dataset.ideas.split("|"); const o = findOcc(id, a); if (o) showIdeas(o); return; }
  if ((el = q("[data-copy]"))) { copyField(el.dataset.copy, el); return; }
  if ((el = q("[data-gseen]"))) { const o = gSeen.get(el.dataset.gseen) || OCC.find(x => x.ev.id === el.dataset.gseen); if (o) showGoogleEvent(o); return; }
  if ((el = q("[data-gedit]"))) { const [id, a] = el.dataset.gedit.split("|"); const o = findOcc(id, a); if (o) showGForm(o); return; }
  if ((el = q("[data-gmove]"))) { const [id, a] = el.dataset.gmove.split("|"); const o = findOcc(id, a); if (o) startMove({ gocc: o }); return; }
  if ((el = q("[data-gdel]"))) { const [id, a] = el.dataset.gdel.split("|"); const o = findOcc(id, a); if (o) gDeleteOcc(el, o); return; }
  if ((el = q("[data-gshift]"))) { gShiftForm(+el.dataset.gshift); return; }
  if ((el = q("[data-gsend]"))) { const e = EV.find(x => x.id === el.dataset.gsend); if (e) { el.disabled = true; applyChanges([{ op: "update", id: e.id, event: plain(e) }]).then(() => toast("An Google gesendet"), err => toast(writeErr(err))); } return; }
  if ((el = q("[data-topic]"))) { shTopic = el.dataset.topic; renderShareBox(); return; }
  if ((el = q("[data-bday]"))) { const o = OCC.find(x => x.ev.id === el.dataset.bday && x.a.getFullYear() === selYear) || OCC.find(x => x.ev.id === el.dataset.bday); if (o) showEvent(o); else { const e = EV.find(x => x.id === el.dataset.bday); if (e) showForm(e); } return; }
  if ((el = q("[data-emode]"))) { if (el.getAttribute("aria-selected") !== "true") switchEntry(el.dataset.emode); return; }
  if ((el = q("[data-add]"))) { newEntry(el.dataset.add); return; }
  if ((el = q("[data-shift]"))) { shiftForm(+el.dataset.shift); return; }
  if ((el = q("[data-view]"))) { setView(el.dataset.view); return; }
  if ((el = q("[data-year]"))) { setYear(+el.dataset.year); return; }
  if ((el = q("[data-gomonth]"))) { curMi = +el.dataset.gomonth; setView("month"); setMonth(curMi); return; }
  if ((el = q("[data-ex]"))) { $("a-in").value = el.dataset.ex; $("a-in").focus(); return; }
  if ((el = q("[data-adjust]"))) { const a = asstActions[+el.dataset.adjust]; if (a) showForm(a.op === "update" ? { ...EV.find(e => e.id === a.id), ...a.event, id: a.id } : { ...a.event, gcal: document.querySelector(`[data-acal="${el.dataset.adjust}"]`)?.value ?? a.event.gcal }); return; }
  switch (t.id) {
    case "gf-cancel": gEditing ? showEvent(gEditing) : closeSheet(); break;
    case "f-cancel": sheetCtx = null; selDay ? showDay(selDay) : closeSheet(); break;
    case "f-dup": { const v = formVals(); v.gEventId = ""; showForm(v); toast("Kopie: Daten anpassen und speichern"); break; }
    case "a-go": runAssistant(); break;
    case "f-mail-btn": switchEntry("text"); setTimeout(() => { const i = $("a-in"); if (i) { i.placeholder = "Hier den Text der Buchungsbestätigung einfügen (lange tippen → Einfügen) – ich trage dann alles ein."; i.focus(); } }, 50); break;
    case "mi-help": showHelp(); break;
    case "mi-plan": showPlans(); break;
    case "card-quota-go": $("quota-card").hidden = true; $("quota-card").dataset.on = ""; if (["plus", "family"].includes(BILL?.plan?.id) && !BILL.plan.member) showAddon(); else showPlans(); break;
    case "card-quota-x": $("quota-card").hidden = true; $("quota-card").dataset.on = ""; renderHints(); break;
    case "help-go": helpAsk(); break;
    case "card-app-x": store.set("ft-appcard", String(Date.now())); renderHints(); break;
    case "card-gdev-go": gConnect(); break;
    case "card-gdev-x": store.set("ft-gdev", String(Date.now())); renderHints(); break;
    case "card-nt-go": notifyOn().then(() => renderHints()).catch(() => showNotify()); break;
    case "card-nt-x": store.set("ft-ntdev", String(Date.now())); renderHints(); break;
    case "a-form": showForm(null, iso(TODAY)); break;
    case "a-day-x": ASST_DAY = ASST_TO = null; $("a-day")?.remove(); break;
    case "a-apply": applyAssistant(); break;
    case "share-copy": copyShare(); break;
    case "share-save": saveShare(); break;
    case "id-go": { const [id, a] = t.dataset.for.split("|"); runIdeas(id, a); break; }
    case "pk-gen": genPack(true); break;
    case "pk-check": { const have = new Set(packEv.packlist.map(x => x.t)); const add = tripChecks(packEv, { a: packEv.a, b: packEv.b }).filter(([, t]) => !have.has(t)).map(([k, t]) => ({ t, k, d: false }));
      if (!add.length) { toast("Reise-Check ist schon drin"); break; } savePack([...add, ...packEv.packlist], true); showPack(packEv); break; }
    case "pk-add": { const inp = $("pk-new"), v = inp.value.trim(); if (!v) break;
      const item = { t: v, k: "Eigene", d: false }, i = packEv.packlist.length; savePack([...packEv.packlist, item], true); inp.value = ""; inp.focus();
      const groups = $("pk-groups"); if (!groups) { showPack(packEv, true); break; }
      let grp = groups.querySelector('[data-pkgrp="Eigene"]');
      if (!grp) { groups.insertAdjacentHTML("beforeend", `<h3 class="pkh">Eigene</h3><div class="gcals" data-pkgrp="Eigene"></div>`); grp = groups.querySelector('[data-pkgrp="Eigene"]'); }
      grp.insertAdjacentHTML("beforeend", pkRow(item, i));
      const sub = $("sheet-sub"); if (sub) sub.textContent = `${rngTxt(packEv.a, packEv.b, true)} · ${packEv.packlist.filter(x => x.d).length}/${packEv.packlist.length} ${packEv.mOnly && packShort(packEv) ? "erledigt" : "eingepackt"}`; break; }
    case "pk-reset": savePack(packEv.packlist.map(x => ({ ...x, d: false })), true); showPack(packEv, true); break;
    case "st-ai": runReview(); break;
    case "wk-today": case "wk-back": setWk(TODAY, null); break;
    case "open-setup": case "open-family": FAMED = null; famQ = ""; FPICK = new Map(); famAllOpen = false; showFamily(); break;
    case "fam-pick-go": (async () => { const ppl = bdPeople(); let n = 0; for (const [k, pk] of FPICK) { const c = ppl.find(x => x.key === k); if (c && pk.name.trim()) { await famAdd(c, pk.role, pk, true); n++; } }
      FPICK = new Map(); famQ = ""; famSave(); showFamily(); toast(`${n} ${n === 1 ? "Person" : "Personen"} übernommen`); })(); break;
    case "tk-later": tkLaterOpen = !tkLaterOpen; renderTasks(); break;
    case "tk-go": { const i = $("tk-in"), v = i.value.trim(); if (v) { addTask({ title: v[0].toUpperCase() + v.slice(1), due: $("tk-due").value || "" }); tkReset(); i.focus(); toast("Aufgabe eingetragen"); } break; }
    case "tk-all": tkAll = !tkAll; renderTasks(); break;
    case "tk-showdone": tkShowDone = !tkShowDone; tkSelMode = false; TKSEL.clear(); renderTasks(); break;
    case "tk-sel": tkSelMode = true; TKSEL.clear(); renderTasks(); break;
    case "tk-selx": tkSelMode = false; TKSEL.clear(); renderTasks(); break;
    case "tk-selall": { const D = TASKS.filter(t => t.done && t.state !== "no" && t.doneAt && Date.now() - Date.parse(t.doneAt) < TK_KEEP * 864e5).map(t => t.id); if (TKSEL.size === D.length) TKSEL.clear(); else D.forEach(i => TKSEL.add(i)); renderTasks(); break; }
    case "tk-delsel": if (TKSEL.size) tkDelMany([...TKSEL]); break;
    case "tk-delall": tkDelMany(TASKS.filter(t => t.done && t.state !== "no").map(t => t.id)); break;
    case "mi-share": shrNew = null; shrAcc = null; shrGrp = null; showShareMgr(); break;
    case "shr-new": shrNew = { name: "" }; showShareMgr(); setTimeout(() => $("shr-name")?.focus(), 50); break;
    case "shr-new-x": case "shr-new-done": shrNew = null; showShareMgr(); break;
    case "shr-new-go": { const n = $("shr-name").value.trim(); if (n) shrInvite(n, $("shr-new-auto")?.checked); else $("shr-name").focus(); break; }
    case "shr-acc": shrAcc = { code: "" }; showShareMgr(); setTimeout(() => $("shr-code")?.focus(), 50); break;
    case "shr-acc-x": { const big = sheetMode === "invite"; shrAcc = null; invDone(); renderHints(); if (big) { closeSheet(); toast("Einladung abgelehnt"); } else showShareMgr(); break; }
    case "inv-card-go": showInvite(); break;
    case "shr-acc-go": shrCheck(pickCode($("shr-code").value)); break;
    case "shr-paste": (async () => { let t = ""; try { t = await navigator.clipboard.readText(); } catch {}
      const c = pickCode(t); if (c) { $("shr-code").value = fmtCode(c); shrCheck(c); } else { $("shr-code").focus(); toast("Bitte lange in das Feld drücken und „Einfügen“ wählen"); } })(); break;
    case "shr-acc-ok": shrAccept(); break;
    case "grp-new": shrGrp = { id: "", name: "", members: [] }; showShareMgr(); break;
    case "grp-x": shrGrp = null; showShareMgr(); break;
    case "grp-save": { const n = $("grp-name").value.trim(), m = chipSel("data-grpsel", $("sheet")); if (!n) { $("grp-name").focus(); break; }
      if (shrGrp.id) Object.assign(SHR.groups.find(g => g.id === shrGrp.id) || {}, { name: n, members: m }); else SHR.groups.push({ id: crypto.randomUUID().slice(0, 8), name: n, members: m });
      shrGrp = null; saveShr(); showShareMgr(); break; }
    case "shto-save": shrSaveEv(); break;
    case "rg-trip": showForm({ ...window.__rg.base, type: "trip" }); break;
    case "rg-term": showForm({ ...window.__rg.base, type: "termin" }); break;
    case "rg-text": { const r = window.__rg, A = parseIso(r.a), B = parseIso(r.b); ASST_DAY = A; ASST_TO = B > A ? B : null; showAssistant(); break; }
    case "shto-x": closeSheet(); break;
    case "fam-pick-clear": FPICK = new Map(); famDelArm = ""; showFamily(); break;
    case "fam-pick-del": if (famDelArm === "*") bdDelete([...FPICK.keys()]); else { famDelArm = "*"; showFamily(); } break;
    case "fam-new": { const n = famQ.trim(); if (n) { FAMED.push({ name: n, role: "andere", birthday: "" }); famQ = ""; famSave(); showFamily(); } break; }
    case "menu-btn": toggleMenu(); break;
    case "mi-google": showGoogleSheet(); break;
    case "g-btn": showGoogleSheet(); break;
    case "mi-docs": DOCSEL = new Set(); docQ = ""; docDelArm = false; showDocs(); break;
    case "mi-fam": FAMED = null; famQ = ""; FPICK = new Map(); famAllOpen = false; showFamily(); break;
    case "mi-share2": showFamShare(); break;
    case "mi-contacts": CT = []; ctImgCheck().then(showContacts); break;
    case "test-setup": closeSheet(); startSetup(true); break;
    case "test-gate": closeSheet(); showGate(); break;
    case "signin-open": showSignin(); break;
    case "first-add": store.set("ft-first", ""); renderHints(); newEntry(); break;
    case "first-no": store.set("ft-first", ""); renderHints(); break;
    case "sheet-close2": closeSheet(); break;
    case "app-login": window.mkSignIn?.(); break;
    case "app-logout": window.mkSignOut?.(); break;
    case "app-delacc": showDeleteAccount(); break;
    case "mi-account": showAccount(); break;
    case "acc-pw": showNewPw(); break;
    case "mi-admin": showAdmin(true); break;
    case "adm-reload": showAdmin(true); break;
    case "adm-train": { const o = $("adm-train-out"); o.innerHTML = `<p class="note">frage bei der Bahn …</p>`; window.mkAdminTrain?.().then(r => {
      if (!r || r.code) { o.innerHTML = `<p>Fehler: ${esc(r?.code || "keine Antwort")}</p>`; return; }
      o.innerHTML = `<p class="note">Plan hochgeladen: ${r.planAt ? new Date(r.planAt).toLocaleString("de-DE") : "nie"} · letzter Server-Lauf: ${r.lastRun ? new Date(r.lastRun).toLocaleString("de-DE") : "–"} · Züge live: ${r.pref?.train === false ? "aus" : "an"}</p>` +
        (r.watch.length ? r.watch.map(x => { const key = x.dbg.filter(d => /^(gefunden|Echtzeit:|kein passender|keine DB|Abflug|Landung|Flugplan|AirLabs|kein AIRLABS)/.test(d)), ok = x.dbg.some(d => d.startsWith("gefunden"));
          return `<div class="sg" style="padding:10px 12px;margin:8px 0"><b>${ok ? "✅" : "⚠️"} ${esc(x.w.train)} · ${esc(x.w.st)} · ${new Date(x.w.at).toLocaleString("de-DE", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}</b>
          <ul style="margin:6px 0 0;padding-left:18px">${key.map(d => `<li>${esc(d)}</li>`).join("")}</ul>${x.msgs?.length ? `<p class="note">würde jetzt melden: ${x.msgs.map(m => esc(m.title + " – " + m.body)).join(" | ")}</p>` : ""}
          <details><summary class="note">Alle Schritte (${x.dbg.length})</summary><ul style="margin:4px 0 0;padding-left:18px">${x.dbg.map(d => `<li class="note">${esc(d)}</li>`).join("")}</ul></details></div>`; }).join("") : `<p>Keine Züge im hochgeladenen Plan. Steht im Termin Uhrzeit, Zugnummer und Bahnhof, und sind Benachrichtigungen auf diesem Gerät an?</p>`);
    }).catch(e => { o.innerHTML = `<p>Fehler: ${esc(String(e))}</p>`; }); break; }
    case "mi-notify": showNotify(); break;
    case "nt-on": notifyOn(); break;
    case "nt-off": notifyOff(); break;
    case "nt-test": notifyTest(); break;
    case "delacc-go": doDeleteAccount(); break;
    case "a2hs-yes": if (APP && installEvt) doInstall(); else showA2hs(); break;
    case "app-install": doInstall(); break;
    case "a2hs-no": store.set("ft-a2hs", "no"); renderHints(); toast("Alles klar – du findest die Anleitung unter „Anzeigen“."); break;
    case "a2hs-done": store.set("ft-a2hs", "done"); closeSheet(); renderHints(); toast("Prima!"); break;
    case "a2hs-later": store.set("ft-a2hs", "later:" + Date.now()); closeSheet(); renderHints(); break;
    case "open-a2hs": showA2hs(); break;
    case "soon-more": soonAll = !soonAll; renderSoon(); break;
    case "to-cal": goPage("p1"); break;
    case "wins-setup": showSettings(); break;
    case "f-link-btn": { const w = $("f-link-wrap"); w.hidden = !w.hidden; if (!w.hidden) $("f-link").focus(); break; }
    case "f-link-go": { const u = $("f-link").value.trim(); if (!/^https?:\/\//.test(u)) { $("f-att-l").textContent = "Bitte einen vollständigen Link (https://…) einfügen"; break; } formFromDocs([], u); break; }
    case "st-share": shareReview(false); break;
    case "st-copy": shareReview(true); break;
    case "to-p2": goPage("p2"); break;
    case "to-p1": goPage("p1"); break;
    case "up-col": upCollapsed = !upCollapsed; store.set("ft-up-col", upCollapsed ? "1" : "0"); renderUp(); break;
    case "others-ok": OTHERS = []; renderOthers(); saveNotify({ seenAt: new Date().toISOString() }); toast("Als gesehen markiert"); break;
    case "sh-go": shPeriod = $("sh-p").value; shareTopic(shTopic, $("sh-q")?.value.trim() || "", shPeriod); break;
    case "bd-add": showForm({ type: "birthday", title: "", from: iso(TODAY), to: iso(TODAY), time: "", endTime: "", repeat: "yearly", until: "", birthYear: "", note: "", gcal: gWritable() ? "primary" : "" }); break;
    case "l-share": shareTopic("custom", $("q").value.trim(), $("l-past").checked ? "year" : "future"); break;
    case "open-google": showGoogleSheet(); break;
    case "g-sync": closeSheet(); gSync(); break;
    case "show-btn": showSettings("main"); break;
    case "set-back": showSettings("main"); break;
    case "open-contacts": CT = []; ctImgCheck().then(showContacts); break;
    case "ct-go": ctImport(); break;
    case "set-ferien": showSettings("ferien"); break;
    case "set-farben": showSettings("farben"); break;
    case "set-test": showSettings("test"); break;
    case "trip-dec": tripStep(-1); break;
    case "trip-inc": tripStep(1); break;
    case "gpick-done": closeSheet(); toast(`${selectedCals().length} Google-Kalender werden angezeigt`); break;
    case "g-retry": if (APP && FATAL.includes(gState) && gState !== "api_disabled") { gConnect(); break; } gTry = 0; initGoogle().then(() => { if (sheetMode === "google") showGoogleSheet(); }); break;
  }
});
document.addEventListener("toggle", ev => { if (ev.target.id === "s-stats") { statsOpen = ev.target.open; if (statsOpen) { if (ensureGoogle()) renderAll(); else renderStats(); } } }, true);
document.addEventListener("change", ev => {
  if (ev.target.dataset?.wzpage && WZ) { WZ.pages = { ...(WZ.pages || PAGES), [ev.target.dataset.wzpage]: ev.target.checked }; ev.target.closest(".pv-card")?.classList.toggle("on", ev.target.checked); return; }
  if (ev.target.dataset?.docsel) { const id = ev.target.dataset.docsel; ev.target.checked ? DOCSEL.add(id) : DOCSEL.delete(id); docDelArm = false; showDocs(); return; }
  if (ev.target.dataset?.docadd) { const e = EV.find(x => x.id === ev.target.dataset.docadd), fs = [...(ev.target.files || [])]; ev.target.value = ""; if (e && fs.length) docUpload(e, fs); return; }
  if (ev.target.dataset?.page) { setPage(ev.target.dataset.page, ev.target.checked); return; }
  if (ev.target.dataset?.fsh !== undefined) { formShManual = true; return; }
  if (ev.target.dataset?.tksel) { const id = ev.target.dataset.tksel; if (ev.target.checked) TKSEL.add(id); else TKSEL.delete(id); renderTasks(); return; }
  if (ev.target.dataset?.tkdone) { const id = ev.target.dataset.tkdone; ev.target.closest(".tk")?.classList.add("gone"); setTimeout(() => tkSet(id, { done: true, doneAt: new Date().toISOString() }), 250);
    toast("Erledigt", async () => tkSet(id, { done: false, doneAt: "" })); return; }
  if (ev.target.dataset?.tkundo) { tkSet(ev.target.dataset.tkundo, { done: false, doneAt: "" }); return; }
  if (ev.target.dataset?.grpcal) { const G = famGroups(); G[+ev.target.dataset.grpcal].cal = ev.target.value; saveGroups(G); return; }
  if (ev.target.dataset?.grpm) { const [i, n] = ev.target.dataset.grpm.split("|"), G = famGroups(), g = G[+i]; if (!g) return;
    g.members = ev.target.checked ? [...g.members.filter(m => famKey(m) !== famKey(n)), n] : g.members.filter(m => famKey(m) !== famKey(n)); saveGroups(G); return; }
  if (ev.target.dataset?.fpick) { const k = ev.target.dataset.fpick, c = bdPeople().find(x => x.key === k);
    if (ev.target.checked && c) FPICK.set(k, { name: c.name, role: c.role || "andere", birthday: bdStore(c.m ? c : null) }); else FPICK.delete(k); showFamily(); return; }
  if (ev.target.dataset?.fpe) { const [k, f] = ev.target.dataset.fpe.split("|"), pk = FPICK.get(k); if (!pk) return;
    if (f === "role") pk.role = ev.target.value; if (f === "birthday") { pk.birthday = bdStore(ctParseDate(ev.target.value.trim())); ev.target.value = bdFmt(pk.birthday); } return; }
  if (ev.target.dataset?.famf && FAMED) { const [i, k] = ev.target.dataset.famf.split("|"), p = FAMED[+i]; if (!p) return;
    if (k === "role") p.role = ev.target.value;
    if (k === "birthday") { const d = ctParseDate(ev.target.value.trim()); p.birthday = bdStore(d); ev.target.value = bdFmt(p.birthday); }
    famSave(); return; }
  if (ev.target.id === "ct-file") { ctFile(ev.target.files?.[0]); return; }
  if (ev.target.id === "ct-img") { const fs = ev.target.files; document.querySelectorAll(".ct-pick").forEach(b => b.style.pointerEvents = "none"); ctShots(fs); return; }
  if (ev.target.dataset?.ct) { const c = CT[+ev.target.dataset.ct]; if (c) c.on = ev.target.checked; ctSaveDraft(); const b = $("ct-go"); if (b) { const n = CT.filter(x => x.on).length; b.disabled = !n; b.textContent = `${n} Geburtstage übernehmen`; } return; }
  if (ev.target.dataset?.pk !== undefined) { const i = +ev.target.dataset.pk; savePack(packEv.packlist.map((x, j) => j === i ? { ...x, d: ev.target.checked } : x)); return; }
  if (ev.target.dataset?.vac) { REMP.vacOver = { ...REMP.vacOver, [ev.target.dataset.vac]: ev.target.checked }; (db && COLL("prefs")).doc("reminders").set(REMP).catch(() => {}); renderStats(); showStat("vac"); return; }
  if (ev.target.id === "set-trip") { REMP.tripDays = Math.max(0, Math.min(60, +ev.target.value || 0)); (db && COLL("prefs")).doc("reminders").set(REMP).catch(() => {}); renderSoon(); renderUp(); return; }
  if (ev.target.id === "st-vac") { REMP.vacation = Math.max(0, +ev.target.value || 0); (db && COLL("prefs")).doc("reminders").set(REMP).catch(() => {}); renderStats(); return; }
  if (ev.target.dataset?.notify) { const set = new Set(notifyCals()); ev.target.checked ? set.add(ev.target.dataset.notify) : set.delete(ev.target.dataset.notify); saveNotify({ cals: [...set] }).then(scanOthers); return; }
  if (ev.target.id === "a-files") { ASST_FILES = [...ev.target.files].slice(0, 6); const l = $("a-files-l"); if (l) l.textContent = ASST_FILES.map(f => "📎 " + f.name).join(", ") || "daraus wird der Eintrag erstellt"; if (ASST_FILES.length && !$("a-in").value.trim()) runAssistant(); return; }
  if (ev.target.id === "f-files") { formPickFiles([...ev.target.files]); return; }
  if (ev.target.id === "f-type" && ["birthday", "anniversary"].includes(ev.target.value) && $("f-rep")) $("f-rep").value = "yearly";
  if (ev.target.dataset?.stshow) { const c = ev.target.dataset.stshow, on = ev.target.checked;
    if (c === PA || c === PB) { SHOW[c === PA ? "be" : "st"] = on; store.set("ft-show", JSON.stringify(SHOW)); } else XHIDE = on ? XHIDE.filter(x => x !== c) : [...XHIDE.filter(x => x !== c), c];
    saveXst(); renderAll(); return; }
  if (ev.target.dataset?.stjoint) { const c = ev.target.dataset.stjoint; JOINT = ev.target.checked ? [...JOINT.filter(x => x !== c), c] : JOINT.filter(x => x !== c);
    saveXst(); renderAll(); showSettings(); return; }
  if (ev.target.dataset?.xst) { const c = ev.target.dataset.xst; XST = ev.target.checked ? [...XST.filter(x => x !== c), c] : XST.filter(x => x !== c); saveXst(); renderAll(); if (sheetMode === "settings") { showSettings(); const g = document.querySelector("details.setgrp.sub"); if (g) g.open = true; } return; }
  if (ev.target.dataset?.nt) { ntSet(ev.target.dataset.nt, ev.target.checked); return; }
  if (ev.target.dataset?.ntv) { ntSet(ev.target.dataset.ntv, ev.target.dataset.ntv === "evLead" ? +ev.target.value : ev.target.value); return; }
  if (ev.target.dataset?.shrauto) { const c = contactBy(ev.target.dataset.shrauto); if (c) { c.auto = ev.target.checked; saveShr(); shrQueue(); showShareMgr(); toast(c.auto ? `Deine Termine werden automatisch mit ${c.name} geteilt` : `Nur noch ausgewählte Termine an ${c.name}`); } return; }
  if (ev.target.dataset?.shrshow) { const c = contactBy(ev.target.dataset.shrshow); if (c) { c.show = ev.target.checked; saveShr(); shrMerge(); } return; }
  if (ev.target.id === "shr-gcal") { SHR.gcal = ev.target.value; saveShr(); shrMirrorQueue(); toast("Geteilte Termine kommen jetzt in diesen Kalender"); return; }
  if (ev.target.dataset?.show) { SHOW[ev.target.dataset.show] = ev.target.checked; store.set("ft-show", JSON.stringify(SHOW)); renderAll(); return; }
  if (ev.target.id === "set-gcat") { store.set("ft-gcat", ev.target.checked ? "1" : "0"); renderAll(); return; }
  if (ev.target.id === "g-show") { gShow = ev.target.checked; store.set("ft-gcal-show", gShow ? "1" : "0"); renderGPill(); if (!gShow) resetGoogleWatches(); else renderAll(); if (sheetMode === "settings") showSettings(); else showGoogleSheet(); return; }
  if (ev.target.dataset?.gcal) { const s = new Set(selectedCals()); ev.target.checked ? s.add(ev.target.dataset.gcal) : s.delete(ev.target.dataset.gcal); gSel = s; saveGSel(s); resetGoogleWatches(); return; }
  if (["f-type", "f-rep", "f-repu"].includes(ev.target.id)) syncFormFields(); if (ev.target.id === "l-past" || ev.target.id === "l-hol") { if (ensureGoogle()) renderAll(); else renderList(); } });
document.addEventListener("input", ev => {
  if (["f-pk-who", "f-pk-no", "f-pk-st"].includes(ev.target.id)) pickPreview();
  if (ev.target.id === "adm-free") { ADM_FREE = Math.max(1, +ev.target.value || 30); clearTimeout(window.__admT); window.__admT = setTimeout(() => { showAdmin(); $("adm-free")?.focus(); }, 600); return; }
  if (ev.target.id === "tk-in") { const d = $("tk-due"); if (!d.dataset.man) { const p = parseTask(ev.target.value); d.value = p.due || ""; } tkUi(); }
  if (ev.target.id === "tk-due") { ev.target.dataset.man = "1"; tkUi(); }
  if (ev.target.id === "f-who") { const w = ev.target.value.trim(), l = $("f-col-l"); if (l) l.textContent = w ? `Farbe für ${w}` : "Farbe nur für diesen Eintrag";
    const c = w ? (whoCols()[whoKey(w)] || "") : ""; document.querySelectorAll("[data-fcol]").forEach(b => b.setAttribute("aria-checked", String(b.dataset.fcol === c))); }
  if (ev.target.id === "f-place") { const v = ev.target.value; if (v.trim().length >= 3) osmQueue(v, false); else { const b = $("f-place-sug"); if (b) b.hidden = true; } }
  if (ev.target.id === "f-title" && !$("f-place")?.value.trim() && !$("f-place")?.hidden) osmQueue(ev.target.value, true, 900);
  if (ev.target.id === "doc-q") { docQ = ev.target.value; const pos = ev.target.selectionStart; showDocs(); const i = $("doc-q"); if (i) { i.focus(); try { i.setSelectionRange(pos, pos); } catch {} } return; }
  if (ev.target.id === "shr-code") { const c = pickCode(ev.target.value); if (c.length === 12 && /[-\s]|^.{12}$/.test(ev.target.value.trim()) && ev.target.value.length >= 12 && !shrAcc?.checking) { shrAcc = { ...(shrAcc || {}), checking: true }; ev.target.value = fmtCode(c); shrCheck(c); } return; }
  if (ev.target.id === "f-title" && $("f-sh-wrap") && !formShManual && !editing) { const pick = new Set([...shrPick(ev.target.value), ...($("f-type")?.value === "birthday" ? [] : autoLs())]); $("f-sh-wrap").querySelectorAll("[data-fsh]").forEach(i => { const v = i.dataset.fsh; i.checked = v.startsWith("g:") ? (SHR.groups.find(g => g.id === v.slice(2))?.members || []).every(L => pick.has(L)) && pick.size > 0 : pick.has(v); }); }
  if (ev.target.id === "fam-q") { famQ = ev.target.value; clearTimeout(window.__fqT); window.__fqT = setTimeout(() => { window.__fqFocus = true; showFamily(); window.__fqFocus = false; }, 220); return; }
  if (ev.target.dataset?.fpe) { const [k, f] = ev.target.dataset.fpe.split("|"), pk = FPICK.get(k); if (pk && f === "name") pk.name = ev.target.value; return; }
  if (ev.target.id === "fam-me") { famSave({ name: ev.target.value.trim() }); return; }
  if (ev.target.dataset?.famf && FAMED) { const [i, k] = ev.target.dataset.famf.split("|"); if (k === "name") { FAMED[+i].name = ev.target.value; famSave(); } return; }
  if (ev.target.dataset?.gidea !== undefined && sheetMode === "gifts") { const L = GIFTS[sheetCtx.id], p = L?.people[+ev.target.dataset.gidea]; if (p) { p.idea = ev.target.value; if (p.idea && p.s === 0) p.s = 1; clearTimeout(giftT); giftT = setTimeout(saveGifts, 700); } return; }
  if (ev.target.dataset?.wzf && WZ) { const [i, k] = ev.target.dataset.wzf.split("|"); if (k === "bd") { WZ.manual[+i].bd = ev.target.value; WZ.manual[+i].birthday = bdStore(ctParseDate(ev.target.value)); } else WZ.manual[+i][k] = ev.target.value; return; }
  if (ev.target.dataset?.wzrole && WZ) { WZ.roles[ev.target.dataset.wzrole] = ev.target.value; return; }
  if (ev.target.id === "a-in") { const t = ev.target; t.style.height = "auto"; t.style.height = Math.min(t.scrollHeight + 2, window.innerHeight * 0.45) + "px"; } if (ev.target.id === "bd-q") { renderBdays(); return; } if (ev.target.id === "q") { if (ensureGoogle()) renderAll(); else renderList(); } });
document.addEventListener("submit", ev => { if (ev.target.id === "f") { ev.preventDefault(); saveForm(); } if (ev.target.id === "gf") { ev.preventDefault(); saveGForm(); } });
document.addEventListener("keydown", ev => {
  if (ev.key === "Enter" && ev.target.id === "pk-new") { ev.preventDefault(); $("pk-add").click(); }
  if (ev.key === "Enter" && ev.target.id === "a-in" && (ev.metaKey || ev.ctrlKey)) { ev.preventDefault(); runAssistant(); }
  if (ev.key === "Escape") { if (moving) stopMove(); else if (!sheet.hidden) closeSheet(); }
});
// in „Heute“ ausgewählter Tag (Wochenleiste) wird beim Eintragen übernommen, solange diese Seite zu sehen ist
const onP0 = () => { const r = $("p0")?.getBoundingClientRect(); return !!r && r.width > 0 && r.right > innerWidth * 0.4 && r.left < innerWidth * 0.6; };
$("add-btn").addEventListener("click", () => newEntry(wkSel && onP0() ? iso(wkSel) : undefined));
$("sheet-close").addEventListener("click", closeSheet);
$("move-cancel").addEventListener("click", stopMove);
$("m-prev").addEventListener("click", () => stepCal(-1));
$("m-next").addEventListener("click", () => stepCal(1));
$("w-prev").addEventListener("click", () => setWeek(addDays(weekStart, -7)));
$("w-next").addEventListener("click", () => setWeek(addDays(weekStart, 7)));
$("o-prev").addEventListener("click", () => setYear(selYear - 1));
$("o-next").addEventListener("click", () => setYear(selYear + 1));
$("today-btn").addEventListener("click", goToday);
$("theme-btn").addEventListener("click", ev => { ev.stopPropagation(); themeIdx = (themeIdx + 1) % THEMES.length; applyTheme(); store.set("ft27-theme", THEMES[themeIdx][0]); });

// =================== Zeitraum markieren (ziehen am Computer, lange drücken + ziehen am Handy) ===================
let RG = null, rgActive = false, rgSuppress = 0;
const rgDayAt = (x, y) => document.elementFromPoint(x, y)?.closest?.("#bigmonth [data-day], #year [data-day]");
function rgPaint() { document.querySelectorAll(".rsel").forEach(el => el.classList.remove("rsel"));
  if (!RG) return; const [a, b] = [RG.a, RG.b || RG.a].sort(); document.querySelectorAll("#bigmonth [data-day], #year [data-day]").forEach(el => { const d = el.dataset.day; if (d >= a && d <= b) el.classList.add("rsel"); }); }
function rgDone() {
  const [a, b] = [RG.a, RG.b || RG.a].sort(); RG = null; rgActive = false; rgSuppress = Date.now(); document.documentElement.classList.remove("rg-on");
  setTimeout(rgPaint, 400); if (a === b) return false;
  if (!canWrite) { rgPaint(); return true; }
  const A = parseIso(a), B = parseIso(b), n = dayDiff(A, B) + 1, base = { title: "", from: a, to: b, time: "", endTime: "", repeat: "none", until: "", birthYear: "", note: "", gcal: gWritable() ? "primary" : "" };
  window.__rg = { a, b, base };
  openSheet(`${rngTxt(A, B, true)}`, `${n} Tage markiert – was möchtest du eintragen?`, `<div class="rg-acts">
    <button type="button" class="wz-big accent" id="rg-trip">✈️ Reise / Urlaub</button><button type="button" class="wz-big ghost" id="rg-term">Termin über ${n} Tage</button>
    <button type="button" class="wz-big ghost" id="rg-text">Mit eigenen Worten …</button></div>`, "range");
  return true;
}
function attachRange(root) {
  // Maus: drücken und über die Tage ziehen
  root.addEventListener("pointerdown", e => { if (e.pointerType !== "mouse" || e.button !== 0) return; const t = e.target.closest("[data-day]"); if (!t || moving) return; RG = { a: t.dataset.day, b: null, mouse: true }; });
  document.addEventListener("pointermove", e => { if (!RG?.mouse) return; const t = rgDayAt(e.clientX, e.clientY); if (!t) return; if (t.dataset.day !== (RG.b || RG.a)) { RG.b = t.dataset.day; rgActive = true; rgPaint(); } });
  document.addEventListener("pointerup", () => { if (!RG?.mouse) return; if (rgActive) rgDone(); else RG = null; });
  // Finger: lange drücken, dann ziehen (oder loslassen und den letzten Tag antippen)
  let lp = null, sx = 0, sy = 0;
  root.addEventListener("touchstart", e => { if (e.touches.length !== 1 || moving) return; const t = e.target.closest("[data-day]"); if (!t) return;
    if (RG?.waitEnd) { RG.b = t.dataset.day; rgPaint(); rgSuppress = Date.now(); RG.waitEnd = false; rgDone(); return; }
    sx = e.touches[0].clientX; sy = e.touches[0].clientY; clearTimeout(lp);
    lp = setTimeout(() => { RG = { a: t.dataset.day, b: null }; rgActive = true; document.documentElement.classList.add("rg-on"); rgPaint(); try { navigator.vibrate?.(15); } catch {} }, 420); }, { passive: true });
  root.addEventListener("touchmove", e => { const p = e.touches[0];
    if (!rgActive) { if (Math.abs(p.clientX - sx) > 8 || Math.abs(p.clientY - sy) > 8) clearTimeout(lp); return; }
    if (e.cancelable) e.preventDefault(); const t = rgDayAt(p.clientX, p.clientY); if (t && t.dataset.day !== (RG.b || RG.a)) { RG.b = t.dataset.day; rgPaint(); } }, { passive: false });
  root.addEventListener("touchend", () => { clearTimeout(lp); if (!rgActive || !RG) return; rgSuppress = Date.now();
    if (!RG.b || RG.b === RG.a) { RG.waitEnd = true; toast("Jetzt den letzten Tag antippen"); return; } rgDone(); }, { passive: true });
  root.addEventListener("contextmenu", e => { if (rgActive || e.target.closest("[data-day]")) e.preventDefault(); });
}
// Wischen: Monat oder Woche
// Wischen: Inhalt folgt dem Finger, danach wird geblättert
// ---- Handy-Seiten: seitlich wischen ----
const PAGER = matchMedia("(max-width: 640px)");
const wrapEl = document.querySelector(".wrap");
function goPage(id, smooth = true) { const p = $(id); if (!p || p.hidden) return;
  if (PAGER.matches) wrapEl.scrollTo({ left: p.offsetLeft, behavior: smooth ? "smooth" : "auto" }); else p.scrollIntoView({ behavior: smooth ? "smooth" : "auto", block: "start" }); }
function pagerDots() { const P = [...wrapEl.querySelectorAll(":scope > .page")].filter(p => !p.hidden && !p.classList.contains("pg-off")), d = $("pgdots"); if (!d) return;
  if (!PAGER.matches || P.length < 2) { d.innerHTML = ""; return; }
  const cur = Math.round(wrapEl.scrollLeft / Math.max(1, wrapEl.clientWidth));
  d.innerHTML = P.map((p, i) => `<i class="${i === cur ? "on" : ""}"></i>`).join("");
  document.querySelectorAll(".nh-a").forEach(a => a.textContent = a.closest("#to-p1") ? "◀" : "▶"); }
wrapEl.addEventListener("scroll", () => { clearTimeout(wrapEl.__t); wrapEl.__t = setTimeout(pagerDots, 60); }, { passive: true });
PAGER.addEventListener?.("change", () => { pagerDots(); document.querySelectorAll(".nh-a").forEach(a => a.textContent = PAGER.matches ? (a.closest("#to-p1") ? "◀" : "▶") : (a.closest("#to-p1") ? "▼" : "▲")); });
setTimeout(pagerDots, 300);
let swipedAt = 0;
function attachSwipe(el, go, can, axisFn) {
  let x0 = null, y0 = 0, dx = 0, horiz = null, ax = "x";
  const reset = () => { el.style.transition = "transform .18s ease-out, opacity .18s"; el.style.transform = ""; el.style.opacity = ""; };
  el.addEventListener("touchstart", e => { if (e.touches.length !== 1) { x0 = null; return; } x0 = e.touches[0].clientX; y0 = e.touches[0].clientY; dx = 0; horiz = null; ax = axisFn ? axisFn() : "x"; el.style.transition = "none"; }, { passive: true });
  el.addEventListener("touchmove", e => {
    if (x0 == null || rgActive) return;
    const mx = e.touches[0].clientX - x0, my = e.touches[0].clientY - y0;
    if (horiz === null && (Math.abs(mx) > 8 || Math.abs(my) > 8)) horiz = ax === "y" ? Math.abs(my) > Math.abs(mx) * 1.2 : Math.abs(mx) > Math.abs(my) * 1.2;
    if (!horiz) return;
    if (e.cancelable) e.preventDefault();
    dx = ax === "y" ? my : mx; const blocked = !can(dx < 0 ? 1 : -1);
    el.style.transform = `translate${ax === "y" ? "Y" : "X"}(${blocked ? dx * 0.15 : dx * 0.6}px)`; el.style.opacity = String(1 - Math.min(Math.abs(dx) / 900, .35));
  }, { passive: false });
  const end = () => {
    if (x0 == null) return; x0 = null;
    if (!horiz) { reset(); return; }
    swipedAt = Date.now();
    const n = dx < 0 ? 1 : -1;
    if (Math.abs(dx) > 45 && can(n)) {
      el.style.transition = "none"; go(n);
      el.style.transform = `translate${ax === "y" ? "Y" : "X"}(${n * 40}px)`; el.style.opacity = ".4";
      requestAnimationFrame(() => requestAnimationFrame(reset));
    } else reset();
  };
  el.addEventListener("touchend", end, { passive: true });
  el.addEventListener("touchcancel", end, { passive: true });
}
attachSwipe(bigEl, stepCal, canStep, () => PAGER.matches ? "y" : "x");   // Handy: Monat hoch/runter wischen, seitlich = Seiten
attachRange(bigEl); attachRange(document.getElementById("year"));
attachSwipe($("wk"), n => setWk(addDays(wkStart, 7 * n), null), n => { const t = addDays(wkStart, 7 * n); return t >= monday(START) && t <= END; });
attachSwipe($("week"), n => setWeek(addDays(weekStart, 7 * n)), n => { const t = addDays(weekStart, 7 * n); return t >= monday(START) && t <= END; }, () => PAGER.matches ? "none" : "x");
attachSwipe(yearEl, n => setYear(selYear + n), n => YEARS.includes(selYear + n));

window.addEventListener("resize", () => { clearTimeout(upResizeT); upResizeT = setTimeout(() => { if (view === "month" || view === "two") renderBigMonth(); }, 150); });

// =================== Start ===================
applyTheme();
setView(view);
renderAll();
(async () => {
  const c = window.claude;
  if (!c?.use) { dbState = "off"; renderAll(); showGate(); return; }
  const [d, u, s, dl, m] = await Promise.all([c.use("db"), c.use("user"), c.use("sample"), c.use("downloads"), c.use("mcp")]);
  sample = s; downloads = dl; mcp = m;
  if (!d) { mcp = null; wipeLocal(); store.set("ft-uid", ""); dbState = "off"; renderGPill(); renderAll(); showGate(); return; }
  db = d;
  try { uid = await u?.id?.(); } catch {}
  if (!uid) { db = null; mcp = null; wipeLocal(); store.set("ft-uid", ""); dbState = "off"; renderGPill(); renderAll(); showGate(); return; }
  // Gerät wird von jemand anderem genutzt: Zwischenspeicher des vorherigen Nutzers verwerfen
  const prevUid = store.get("ft-uid");
  if (prevUid !== uid) {
    wipeLocal(); store.set("ft-uid", uid);
    if (prevUid) { let n = 0; try { n = +sessionStorage.getItem("ft-wiped") || 0; sessionStorage.setItem("ft-wiped", n + 1); } catch {} if (n < 1) { location.reload(); return; } }
  } else { try { PROFILE = JSON.parse(store.get("ft-profile") || "null") || {}; } catch {} }
  if (mcp) initGoogle(); else renderGPill();
  try { const me = await u.me?.(); meName = String(me?.name || "").trim(); } catch {}
  if (APP) { let np = false; try { np = sessionStorage.getItem("mk-newpw") === "1"; } catch {} if (np) setTimeout(showNewPw, 900); }
  if (APP) { const m = $("open-a2hs"); if (m) { m.textContent = "Als App installieren"; m.hidden = IS_STANDALONE; } }
  if (!APP) document.body.insertAdjacentHTML("afterbegin", `<div class="moved" role="note"><div><b>Mein Kalender ist umgezogen</b><span>Die neue App läuft ohne Claude-Konto – mit Google-Anmeldung, als App installierbar. Hier wird nichts mehr weiterentwickelt.</span></div><a href="https://mein-kalender-czb.pages.dev/app/" target="_blank" rel="noopener">Zur neuen App →</a></div>`);
  if (APP) { const L = document.querySelector(".mi-legal"); if (L) { L.querySelectorAll("a").forEach(a => a.href = a.href.replace("https://mein-kalender.onrender.com", location.origin).replace("?info&back=1", "?info"));
      L.insertAdjacentHTML("beforebegin", `<button type="button" class="mi" data-mi id="mi-account"><i class="dotc" style="--c:var(--muted)"></i>Konto<em class="mi-v">${esc((meName || "").split(/\s+/)[0])}</em></button>`); } }
  BASE = `data/users/${uid}/k`;      // privater Bereich: nur dieser Nutzer kann ihn lesen und schreiben
  canWrite = true;
  COLL("prefs").doc("profile").onSnapshot(d => { const v = d.exists ? JSON.parse(JSON.stringify(d.data() || {})) : {}; applyProfile(v); profileLoaded = true; maybeSetup(); }, () => { profileLoaded = true; });
  const timer = setTimeout(() => { if (dbState === "loading") { dbState = "error"; renderAll(); } }, 10000);
  COLL("prefs").doc("reminders").onSnapshot(d => { const v = d.exists ? JSON.parse(JSON.stringify(d.data() || {})) : {}; REMP = { dismissed: Array.isArray(v.dismissed) ? v.dismissed.map(String) : [], vacation: v.vacation === undefined ? 30 : +v.vacation || 0, vacOver: v.vacOver && typeof v.vacOver === "object" ? v.vacOver : {}, tripDays: v.tripDays === undefined ? 14 : Math.max(0, +v.tripDays || 0) }; renderSoon(); renderUp(); renderStats(); }, () => {});
  COLL("prefs").doc("gifts").onSnapshot(d => { const v = d.exists ? JSON.parse(JSON.stringify(d.data() || {})) : {}; const next = v.lists && typeof v.lists === "object" ? v.lists : {};
    if (JSON.stringify(next) !== JSON.stringify(GIFTS)) { GIFTS = next; renderSoon(); renderUp(); } }, () => {});
  // Anzeige-Einstellungen geräteübergreifend (nach Neuinstallation wieder da)
  let uiT = null, uiApplying = false, uiLoaded = false;
  uiSaveHook = () => { if (uiApplying || !uiLoaded || !canWrite) return; clearTimeout(uiT); uiT = setTimeout(async () => {
    const v = { t: Date.now() }; UI_KEYS.forEach(k => { const x = store.get(k); if (x != null) v[k.replace(/^ft-/, "").replace(/-/g, "_")] = x; });
    try { store.set("ft-ui-t", String(v.t)); await COLL("prefs").doc("ui").set(v); } catch {} }, 1200); };
  COLL("prefs").doc("ui").onSnapshot(d => { const v = d.exists ? d.data() || {} : null; const first = !uiLoaded; uiLoaded = true;
    if (!v) { if (first) uiSaveHook(); return; }                                         // noch nichts im Konto → von diesem Gerät übernehmen
    if (+v.t <= +(store.get("ft-ui-t") || 0)) return;                                    // eigene/ältere Änderung
    uiApplying = true;
    try { UI_KEYS.forEach(k => { const x = v[k.replace(/^ft-/, "").replace(/-/g, "_")]; if (typeof x === "string") store.set(k, x); }); UMGC = null; CATC = null; store.set("ft-ui-t", String(v.t));
      try { SHOW = { ...SHOW_DEF, ...JSON.parse(store.get("ft-show") || "{}") }; } catch {}
      try { const p = JSON.parse(store.get("ft-pages") || "null"); if (p) { PAGES = { p0: p.p0 !== false, p1: p.p1 !== false, p2: p.p2 !== false }; applyPages(); } } catch {}
      const vw = store.get("ft-view"); if (first && ["month","two","week","list","year"].includes(vw) && vw !== view) setView(vw);
      renderAll(); } finally { uiApplying = false; } });
  COLL("prefs").doc("display").onSnapshot(d => { const v = d.exists ? d.data() || {} : null; if (!v || !Array.isArray(v.states)) return; const nx = v.states.map(String).filter(c => FERX[c]);
    const nj = Array.isArray(v.joint) ? v.joint.map(String) : JOINT, nh = Array.isArray(v.hidden) ? v.hidden.map(String) : XHIDE;
    if (nx.join() !== XST.join() || nj.join() !== JOINT.join() || nh.join() !== XHIDE.join()) { XST = nx; JOINT = nj; XHIDE = nh; fixJoint(); recalcJoint();
      store.set("ft-xst", JSON.stringify(XST)); store.set("ft-joint", JSON.stringify(JOINT)); store.set("ft-xhide", JSON.stringify(XHIDE)); renderAll(); if (sheetMode === "settings" && !$("sheet").hidden) showSettings(); } }, () => {});
  COLL("prefs").doc("notify").onSnapshot(d => { const v = d.exists ? JSON.parse(JSON.stringify(d.data() || {})) : {}; NOTIFY = { cals: Array.isArray(v.cals) ? v.cals.map(String) : null, seenAt: String(v.seenAt || "") }; if (gState === "ok") scanOthers(); }, () => {});
  COLL("tasks").onSnapshot(snap => { TASKS = snap.docs.map(d => ({ id: d.id, ...JSON.parse(JSON.stringify(d.data() || {})) })).map(t => ({ ...t, title: String(t.title || ""), due: String(t.due || "") })); renderTasks(); renderFocus();

    TASKS.filter(t => t.done && t.doneAt && Date.now() - Date.parse(t.doneAt) > 30 * 864e5).forEach(t => COLL("tasks").doc(t.id).delete().catch(() => {})); // Erledigtes nach 30 Tagen aufräumen
  }, () => {});
  COLL("docs").onSnapshot(snap => { DOCS = snap.docs.map(d => ({ ...JSON.parse(JSON.stringify(d.data() || {})), id: d.id })).filter(d => d.n > 0).map(d => ({ ...d, name: String(d.name || "Dokument"), size: +d.size || 0, n: +d.n }));
    docSync(); if (sheetMode === "docs" && !$("sheet").hidden) showDocs(); }, () => {});
  COLL("events").onSnapshot(snap => {
    clearTimeout(timer); const first = dbState !== "ready"; dbState = "ready"; if (first) { setTimeout(famSyncEvents, 1500); shrStart(); ntStart(); } shrQueue();
    if (!window.__us) { window.__us = 1; use("app_start"); adminCheck().catch(() => {}); setTimeout(() => { trainStatusLoad(true); trainStatusLoop(); }, 1500); }
    const all = snap.docs.map(doc => normalize(doc.id, doc.data())).filter(e => e.a && e.b); MERK = all.filter(e => e.mOnly); EV = all.filter(e => !e.mOnly); docSync();
    if (sheetMode === "event" && !$("sheet").hidden && sheetCtx?.id?.startsWith?.("g:")) { const b = document.querySelector("[data-gmerk]"); if (b) { const o = findOcc(sheetCtx.id, sheetCtx.a); if (o) b.textContent = merkBtn(o); } }
    if (moving && !moving.gocc && !EV.some(e => e.id === moving.id)) stopMove();
    renderAll();
  }, () => { clearTimeout(timer); dbState = "error"; renderAll(); });
})();

// =================== Neuer Tag → Ansicht neu laden ===================
// „Heute“, Countdowns, Erinnerungen und Fristen hängen am Datum. Wechselt der Tag (z. B. App über Nacht offen),
// lädt der Kalender sich einmal neu – aber nie mitten in einer Eingabe.
(function dayWatch() {
  const dayKey = () => { const n = new Date(); return `${n.getFullYear()}-${n.getMonth()}-${n.getDate()}`; };
  const start = dayKey();
  const busy = () => !$("sheet")?.hidden || ($("wz") && !$("wz").hidden) || !!moving || rgActive ||
    ["INPUT", "TEXTAREA", "SELECT"].includes(document.activeElement?.tagName);
  const check = () => {
    if (dayKey() === start) return;
    if (busy()) return; // später erneut prüfen
    try { sessionStorage.setItem("ft-daychange", "1"); } catch {}
    location.reload();
  };
  setInterval(check, 60 * 1000);
  document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible") check(); });
  window.addEventListener("focus", check);
  window.addEventListener("pageshow", check);
})();

// Neue Version: beim Zurückkehren in die App still neu laden (nie mitten in einer Eingabe), sonst ein Hinweis zum Antippen
(function verWatch() {
  if (!APP || !window.MK_BUILD) return;
  let pending = false;
  const busy = () => !$("sheet")?.hidden || ($("wz") && !$("wz").hidden) || !!moving || rgActive || ["INPUT", "TEXTAREA", "SELECT"].includes(document.activeElement?.tagName);
  const reload = () => { try { sessionStorage.setItem("ft-updated", "1"); } catch {} location.reload(); };
  const bar = () => { if ($("upd-bar")) return; const b = document.createElement("button"); b.type = "button"; b.id = "upd-bar"; b.className = "upd-bar"; b.textContent = "✨ Neue Version – tippen zum Aktualisieren"; b.onclick = reload; document.body.appendChild(b); };
  const check = async auto => {
    if (!pending) { try { const r = await fetch("/app/version.json?t=" + Date.now(), { cache: "no-store" }); const j = await r.json(); if (j?.b && j.b !== window.MK_BUILD) pending = true; } catch {} }
    if (!pending) return; if (auto && !busy()) reload(); else bar();
  };
  document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible") check(true); });
  setInterval(() => { if (document.visibilityState === "visible") check(false); }, 15 * 60e3);
  setTimeout(() => check(false), 30e3);
  try { if (sessionStorage.getItem("ft-updated")) { sessionStorage.removeItem("ft-updated"); setTimeout(() => toast("✨ Mein Kalender ist auf dem neuesten Stand"), 1200); } } catch {}
})();
// Installierte App auf Android: ältere Installationen sind noch auf Hochformat festgelegt – Drehen wieder freigeben
if (APP && IS_STANDALONE) try { screen.orientation?.lock?.("any")?.catch(() => {}); } catch {}
// Geteilter Text (Android: „Teilen → Kalender“ aus Mail oder WhatsApp) – nach dem Start im Freitext auswerten
(function shareIn() {
  if (!APP) return; const q = new URLSearchParams(location.search), t = [q.get("title"), q.get("text"), q.get("url")].filter(Boolean).join("\n").trim();
  if (!t) return; try { sessionStorage.setItem("mk-share", t.slice(0, 20000)); } catch {}
  ["title", "text", "url"].forEach(k => q.delete(k)); history.replaceState(null, "", location.pathname + (q.toString() ? "?" + q : "") + location.hash);
})();
document.addEventListener("paste", ev => {
  if (ev.target?.id !== "f-title" || !sample || !canWrite || editing) return;
  const t = (ev.clipboardData?.getData("text") || "").trim(); if (t.length < 90 && !/\n.*\n/.test(t)) return;
  ev.preventDefault(); use("formular_zu_freitext"); switchEntry("text");
  setTimeout(() => { const i = $("a-in"); if (!i) return; i.value = t; toast("Sieht nach einer Mail oder Buchung aus – ich lese sie für dich aus …"); $("a-go")?.click(); }, 80);
});
const HELP = [
  ["Wie trage ich eine Buchung oder Mail ein?", "Unten auf „+ Eintragen“ tippen, oben „✍️ Freitext“ wählen und den Text der Mail einfügen (lange ins Feld tippen → Einfügen). Dann „Umwandeln“. Ein PDF oder Foto vom Ticket lädst du mit „📎 Ticket, Foto oder PDF“ hoch. Auf Android geht es noch schneller: in der Mail auf „Teilen“ und „Kalender“ wählen."],
  ["Wie ändere ich die Farbe?", "Einen Eintrag antippen – unter „🎨 Farbe“ eine Farbe wählen. Für alle Einträge einer Art (z. B. alle Reisen): Menü ☰ → Anzeigen → Farben nach Art."],
  ["Wie gleiche ich mit Google ab?", "Das passiert von selbst: beim Öffnen der App und alle paar Minuten. Was du hier einträgst, landet auch in deinem Google Kalender – und damit in allen Kalender-Apps, die Google anzeigen (z. B. Business Kalender). Der Punkt am „G“ oben zeigt: grün = verbunden. Auf jedem Gerät musst du Google einmal verbinden."],
  ["Warum bekomme ich keine Benachrichtigungen?", "Benachrichtigungen gelten pro Gerät. Menü ☰ → Benachrichtigungen → „Einschalten“ – auf jedem Handy, Tablet oder PC, auf dem du erinnert werden möchtest."],
  ["Wie bekomme ich die neueste Version?", "Die App aktualisiert sich selbst, sobald du sie wieder öffnest. Erscheint unten „Neue Version“, einfach antippen."],
  ["Wie lösche ich einen Eintrag?", "Eintrag antippen → unten rechts „Löschen“. Bei einer Serie fragt die App, ob nur dieser Termin, alle folgenden oder die ganze Serie gelöscht werden soll."],
  ["Wie trage ich einen Termin alle 2 Wochen / alle 3 Jahre ein?", "Im Formular unter „Mehr Optionen“ bei „Wiederholung“ eine Auswahl treffen oder „anders …“ wählen – dann z. B. „alle 3 Jahre“. Darunter kannst du ein Ende festlegen."],
  ["Geht das Tablet auch quer?", "Ja – einfach drehen. Im Querformat siehst du den ganzen Monat breiter."],
];
const HELP_GUIDE = `Du bist die Hilfe der App „Mein Kalender“ (deutschsprachige Kalender-App, als App auf Handy/Tablet/PC). Antworte kurz (2–5 Sätze), freundlich, in einfachen Worten für ältere Menschen, mit konkreten Tipp-Schritten. Erfinde keine Funktionen.
Bedienung: Unten rechts „+ Eintragen“ öffnet die Eingabe mit zwei Reitern: „✍️ Freitext“ (einfach schreiben oder Mail/WhatsApp/Buchung einfügen, auch PDF/Foto anhängen; die KI trägt ein) und „📋 Formular“ (Art wählen: Termin, Reise, Urlaub, Dienst, Abholen, Hinweis, Geburtstag, Umgang, Jahrestag, Frist, Kontakt; Felder ausfüllen; „Mehr Optionen“ für Wiederholung, Farbe, Notiz, Google-Kalender, Teilen).
Einen Eintrag antippen zeigt Details mit Knöpfen: Bearbeiten, Verschieben, Mit … teilen, Als Bild/Text, Packliste (Reisen), Route, Löschen; darüber „🎨 Farbe“ für diesen Eintrag.
Menü ☰ oben rechts: Anzeigen (Ansichten, Farben nach Art), Google Kalender (Kalender auswählen, abgleichen), Familie & Liebste (Geburtstage, Geschenkideen), Dokumente, Teilen mit …, Benachrichtigungen (pro Gerät einschalten), Hilfe.
Ansichten oben: Monat, 2 Wochen, Woche, Liste, Jahr. Tage antippen oder mehrere Tage wischen, um für diesen Zeitraum einzutragen.
Google: Abgleich automatisch beim Öffnen und alle paar Minuten; Einträge erscheinen auch im Google Kalender und darüber in anderen Kalender-Apps (z. B. Business Kalender). Google muss pro Gerät einmal verbunden werden (Punkt am „G“ oben: grün = verbunden).
Züge und Flüge: steht eine Zugnummer (z. B. IC 2238) mit Bahnhof und Uhrzeit oder eine Flugnummer im Eintrag, beobachtet die App sie live und meldet Verspätung, Gleis- oder Gate-Wechsel.
Updates kommen automatisch beim Öffnen. Wiederholungen: täglich bis „alle 3 Jahre“, über „anders …“ frei wählbar. Serien löschen: nur dieser, alle folgenden oder ganze Serie.`;
function showHelp(open) {
  closeMenu?.(); use("hilfe");
  openSheet("Hilfe", "Wie geht …?", `<div class="help">
    ${sample ? `<div class="help-ask"><textarea class="in" id="help-in" rows="2" placeholder="Deine Frage, z. B. „Wie trage ich meine Bahnfahrt ein?“"></textarea><button type="button" class="btn accent" id="help-go">Fragen</button><span class="note">Fragen werden gespeichert, damit wir die Hilfe verbessern können – bitte keine persönlichen Angaben.</span></div><div id="help-out" role="status"></div>` : ""}
    <div class="sg-t">Häufige Fragen</div>
    ${HELP.map(([q, a], i) => `<details class="help-q"${open === i ? " open" : ""}><summary>${esc(q)}</summary><p>${esc(a)}</p></details>`).join("")}
  </div>`, "help");
}
async function helpAsk() {
  const q = ($("help-in")?.value || "").trim(), out = $("help-out"); if (!q || !out || !sample) return;
  const hit = HELP.find(([h]) => h.toLowerCase().replace(/[?„“]/g, "") === q.toLowerCase().replace(/[?„“]/g, ""));
  if (hit) { out.innerHTML = `<p class="help-a">${esc(hit[1])}</p>`; return; }
  out.innerHTML = `<p class="note">Einen Moment …</p>`; use("hilfe_ki");
  if (APP && db && canWrite) COLL("helpq").add({ q: q.slice(0, 300), at: new Date().toISOString() }).catch(() => {});
  try { window.MK_TASK = "hilfe"; const r = await sample(`${HELP_GUIDE}\n\nHäufige Fragen und Antworten:\n${HELP.map(([a, b]) => `- ${a} ${b}`).join("\n")}\n\nFrage des Nutzers: ${q.slice(0, 600)}\nAntworte nur mit der Antwort (Klartext, keine Überschriften).`, { modelTier: "quick" });
    out.innerHTML = `<p class="help-a">${esc((r.text || "").trim()).replace(/\n/g, "<br>")}</p>`; }
  catch (err) { out.innerHTML = `<p class="err">${err?.code === "rate_limited" ? esc(RL(err)) : "Das hat gerade nicht geklappt – schau bei den häufigen Fragen unten."}</p>`; }
}
// =================== Tarife (Testphase: Abschluss wird nur simuliert) ===================
let BILL = null, billT = 0;
const flightAllowed = () => !BILL || BILL.mode === "off" || !!BILL.plan?.flight;
const PLAN_ROWS = [
  ["Kalender, Formular, Serien, Farben", () => true],
  ["Erinnerungen & Benachrichtigungen", () => true],
  ["Geburtstage, Geschenke, Ferien, gemeinsam frei", () => true],
  ["Teilen mit beliebig vielen Personen, Google Kalender", () => true],
  ["Hinweise zu Visum, ESTA, Maut, Vignette", () => true],
  ["Zug live (Deutsche Bahn)", () => true],
  ["KI-Aktionen pro Monat (Freitext, Packliste, Hilfe …)", p => p.shared ? `${p.ai} gemeinsam` : String(p.ai)],
  ["Tickets & PDFs auslesen pro Monat", p => p.shared ? `${p.img} gemeinsam` : String(p.img)],
  ["Flug live (Gate, Verspätung, Gepäckband)", p => !!p.flight],
  ["Ein Abo für mehrere Konten", p => p.family ? `bis ${p.seats || 4}` : false],
];
async function billLoad(force) {
  if (!APP || !window.mkBilling || (!force && Date.now() - billT < 60e3)) return BILL; billT = Date.now();
  const r = await window.mkBilling("status"); if (r && r.plan) { BILL = r; renderPlanMenu(); try { renderHints(); } catch {}
    const lf = r.plan.leftFamily, k = "ft-leftfam-" + String(lf); if (lf && !store.get(k) && r.plan.id === "free") { store.set(k, "1"); const c = $("quota-card"); if (c) { c.querySelector("b").textContent = "Du bist nicht mehr in der Familie"; c.querySelector("span").textContent = "Deine Termine und Einstellungen sind alle noch da."; $("card-quota-go").hidden = true; c.hidden = false; c.dataset.on = "1"; renderHints(); } }
    const pl = r.plan, k2 = `ft-qhint-${monthKey()}`; if (pl.shared && !pl.member && pl.ai && r.use.ai >= Math.ceil(pl.ai * .8) && !store.get(k2)) { store.set(k2, "1"); showQuotaCard(Math.max(0, pl.ai - r.use.ai), pl.ai); } }
  return BILL;
}
const monthKey = () => iso(TODAY).slice(0, 7);
function renderPlanMenu() {
  const b = $("mi-plan"); if (!b) return; b.hidden = !BILL || BILL.mode === "off";
  if (BILL && BILL.mode !== "off") b.lastChild.textContent = ` Tarif: ${BILL.plan.label}${BILL.plan.trial ? " (Probezeit)" : ""} · KI ${Math.min(BILL.use.ai, BILL.plan.ai)}/${BILL.plan.ai}${BILL.plan.shared ? " gemeinsam" : ""}`;
}
addEventListener("mk-quota", e => {
  const q = e.detail || {}; if (!BILL) { billLoad(true); return; }
  BILL.use.ai = q.ai; BILL.use.img = q.img; renderPlanMenu();
  const k = `ft-qhint-${monthKey()}`, left = q.aiLimit - q.ai;
  if (!BILL.plan.member && q.aiLimit && q.ai >= Math.ceil(q.aiLimit * 0.8) && left > 0 && !store.get(k)) { store.set(k, "1"); showQuotaCard(left, q.aiLimit); }
});
function showQuotaCard(left, lim) {
  const c = $("quota-card"); if (!c) return; use("tarif_hinweis_80");
  const sh = BILL?.plan?.shared, add = ["plus", "family"].includes(BILL?.plan?.id);
  c.querySelector("b").textContent = sh ? "Familien-Kontingent fast aufgebraucht" : "KI-Kontingent fast aufgebraucht";
  c.querySelector("span").textContent = `Noch ${left} von ${lim} KI-Aktionen diesen Monat${sh ? " für eure Familie" : ""}. ${add ? "Bei Bedarf kannst du ein Zusatzpaket bis Monatsende dazubuchen." : "Danach kannst du weiter alles über das Formular eintragen – ab dem 1. geht es wieder los."}`;
  $("card-quota-go").textContent = add ? "Zusatzpaket ansehen" : "Tarife ansehen"; $("card-quota-go").hidden = false;
  c.hidden = false; c.dataset.on = "1"; try { renderHints(); } catch {}
}
function showLimit(e) {
  use("tarif_limit_" + (e.kind || "ai")); if (e.member) { showFamLimit(e); return; }
  const P = BILL?.plans || {}, nx = e.plan === "free" ? "plus" : null, addon = ["plus", "family"].includes(e.plan) && BILL?.addon, res = e.reset ? fmt(parseIso(e.reset)) : "1. des Monats";
  openSheet(e.kind === "img" ? "Ticket-Auswertungen aufgebraucht" : "KI-Aktionen aufgebraucht", `Tarif ${BILL?.plan?.label || "Kostenlos"} · bis ${res}`, `<div class="plan-lim">
    <p>Du hast diesen Monat <b>${e.used} von ${e.limit}</b> ${e.kind === "img" ? "Ticket- und PDF-Auswertungen" : "KI-Aktionen"} genutzt. Ab <b>${res}</b> geht es wieder los.</p>
    <p><b>Das klappt weiterhin:</b> Eintragen über das Formular, Erinnerungen, Geburtstage, Ferien, Teilen, Google Kalender und Zug live.</p>
    ${addon ? `<div class="plan-up"><b>Zusatzpaket bis Monatsende</b><span>+${addon.ai} KI-Aktionen und +${addon.img} Ticket-Auswertungen${e.plan === "family" ? " für die ganze Familie" : ""}${addon.price != null ? ` · ${addon.price.toLocaleString("de-DE", { minimumFractionDigits: 2 })} €` : ""}.</span><button type="button" class="btn accent" data-addon>Zusatzpaket ansehen</button></div>` : ""}
    ${nx && P[nx] ? `<div class="plan-up"><b>Mehr mit ${esc(P[nx].label)}</b><span>${P[nx].ai} KI-Aktionen und ${P[nx].img} Ticket-Auswertungen pro Monat, dazu Flug live.</span><button type="button" class="btn accent" data-checkout="${nx}">${esc(P[nx].label)} ansehen</button></div>` : ""}
    <p class="btnrow"><button type="button" class="btn ghost" id="sheet-close2">Später</button><button type="button" class="link" data-plans>Alle Tarife vergleichen</button></p></div>`, "plan");
}
// Familienmitglied (z. B. ein Kind): nur Information, nie ein Kaufangebot
function showFamLimit(e) {
  const res = e.reset ? fmt(parseIso(e.reset)) : "1. des Monats", who = esc(e.owner || BILL?.plan?.ownerName || "Die Person, die das Abo hat");
  openSheet("Familien-Kontingent aufgebraucht", `bis ${res}`, `<div class="plan-lim"><p>Eure Familie hat die gemeinsamen ${e.kind === "img" ? "Ticket-Auswertungen" : "KI-Aktionen"} für diesen Monat aufgebraucht. <b>${who}</b> bekommt Bescheid und kann mehr dazubuchen. Spätestens ab <b>${res}</b> geht es wieder.</p>
    <p><b>Das klappt weiterhin:</b> Eintragen über das Formular, Erinnerungen, Geburtstage, Ferien, Teilen und Zug live.</p><p class="btnrow"><button type="button" class="btn ghost" id="sheet-close2">OK</button></p></div>`, "plan");
}
function showAddon() {
  const A = BILL?.addon; if (!A) return; use("tarif_zusatz_ansehen"); const fam = BILL.plan.id === "family", sim = BILL.mode === "simulate";
  const pl = BILL.plan, u = BILL.use, res = fmt(parseIso(u.reset)), left = Math.max(0, pl.ai - u.ai), leftI = Math.max(0, pl.img - u.img);
  openSheet("Zusatzpaket", sim ? "Testphase – es wird nichts berechnet" : "", `<div class="plans"><div class="plan-up"><b>+${A.ai} KI-Aktionen und +${A.img} Ticket-Auswertungen</b><span>Gilt sofort bis Monatsende${fam ? " – für die ganze Familie" : ""}. Einmalig${A.price != null ? `, ${A.price.toLocaleString("de-DE", { minimumFractionDigits: 2 })} €` : ", Preis folgt"}, kein Abo.</span></div>
    <div class="pq"><div><span>KI-Aktionen noch übrig${fam ? " (Familie)" : ""}</span><b>${left}</b></div><div><span>mit Zusatzpaket bis ${res}</span><b>${left + A.ai}</b></div>
      <div><span>Ticket-Auswertungen noch übrig</span><b>${leftI}</b></div><div><span>mit Zusatzpaket bis ${res}</span><b>${leftI + A.img}</b></div></div>
    <p class="note"><b>Was zählt als KI-Aktion?</b> Jedes Mal, wenn die KI etwas für dich erledigt: einen Freitext oder eine Nachricht eintragen, eine Packliste oder Geschenkideen erstellen, eine Hilfe-Frage beantworten. Ein Ticket, Foto oder PDF auslesen zählt zusätzlich als Ticket-Auswertung. Alles über das Formular, Erinnerungen und Zug live zählen nicht.</p>
    ${A.ok ? "" : `<p class="addon-no">${A.why === "enough" ? `Du hast noch genug übrig. Ein Zusatzpaket kannst du buchen, sobald weniger als ${A.minLeft} % deines Kontingents übrig sind – so verfällt nichts ungenutzt.` : A.why === "day" ? "Heute wurde schon ein Zusatzpaket gebucht. Ab morgen geht wieder eins." : A.why === "month" ? `Diesen Monat wurden schon ${A.maxMonth} Zusatzpakete gebucht – mehr geht nicht. Ab dem ${res} gibt es wieder das volle Kontingent.` : "Zusatzpakete gibt es in Plus und Familie."}</p>`}
    <p class="note">Diesen Monat gebucht: ${A.month || 0} von ${A.maxMonth} Zusatzpaketen · höchstens ${A.maxDay} pro Tag.</p>
    <p class="btnrow">${A.ok ? `<button type="button" class="btn accent" data-addonbuy>${sim ? "Zusatzpaket buchen (Test)" : "Weiter zu Google Play"}</button>` : ""}<button type="button" class="btn ghost" data-plans>Zurück</button></p></div>`, "plan");
}
async function showPlans() {
  use("tarife"); openSheet("Tarife", "lädt …", `<p class="note">Einen Moment …</p>`, "plan");
  const B = await billLoad(true); if (!B) { openSheet("Tarife", "", `<p>Die Tarife konnten gerade nicht geladen werden.</p>`, "plan"); return; }
  const P = B.plans, cur = B.plan, ids = ["free", "plus", "family"], res = fmt(parseIso(B.use.reset));
  const cell = v => v === true ? "✓" : v === false ? "–" : esc(v);
  const meter = (u, l, t) => `<div class="pm"><div class="pm-h"><span>${t}</span><b>${Math.min(u, l)} / ${l}</b></div><div class="pm-b"><i style="width:${Math.min(100, Math.round(u / (l || 1) * 100))}%${u / (l || 1) >= .8 ? ";background:var(--holiday)" : ""}"></i></div></div>`;
  const sim = B.mode === "simulate";
  const eur = v => v == null ? "Preis folgt" : v.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " €";
  const ends = cur.until ? `gekündigt – läuft bis ${fmt(new Date(cur.until))}` : cur.next ? `ab ${fmt(new Date(cur.nextAt))}: ${esc(cur.nextLabel || "")}` : cur.trial ? `Probezeit bis ${fmt(new Date(cur.trialUntil))}` : cur.id === "free" ? "kostenlos, ohne Laufzeit" : cur.periodEnd ? `verlängert sich am ${fmt(new Date(cur.periodEnd))}` : "monatlich kündbar";
  const act = i => { if (cur.member) return i === cur.id ? `<em>aktiv</em>` : "";
    if (i === cur.id) return `<em>aktiv</em>${cur.id !== "free" && !cur.trial ? (cur.until || cur.next ? `<button type="button" class="link" data-resume>Zurücknehmen</button>` : `<button type="button" class="link danger-t" data-cancel>Kündigen</button>`) : ""}`;
    if (cur.next === i) return `<small>ab ${fmt(new Date(cur.nextAt))}</small>`;
    if (i === "free") return cur.until ? "" : `<button type="button" class="btn small ghost" data-cancel>Wechseln</button>`;
    return `<button type="button" class="btn small${i === "plus" ? " accent" : ""}" data-checkout="${i}">${cur.id === "free" ? "Wählen" : "Wechseln"}</button>`; };
  openSheet("Tarife", sim ? "Testphase – Abschluss wird nur simuliert, es wird nichts berechnet" : "", `<div class="plans">
    <div class="plan-cur"><div class="pc-h"><b>Dein Tarif: ${esc(cur.label)}</b><span>${ends}</span></div>
      ${meter(B.use.ai, cur.ai, "KI-Aktionen diesen Monat")}${meter(B.use.img, cur.img, "Tickets & PDFs diesen Monat")}
      ${["plus", "family"].includes(cur.id) && !cur.member && !cur.trial ? `<div class="addon">${cur.addon ? `<span>✓ Zusatzpaket gebucht: +${cur.addon.ai} KI-Aktionen, +${cur.addon.img} Tickets bis Monatsende</span>` : ""}<button type="button" class="btn small" data-addon>+ Zusatzpaket: ${B.addon.ai} KI-Aktionen und ${B.addon.img} Tickets bis Monatsende${B.addon.price != null ? ` · ${eur(B.addon.price)}` : ""}</button></div>` : ""}
      <p class="note">Neue Kontingente ab ${res} ${cur.flight ? "✈️ Flug live ist enthalten." : "✈️ Flug live gibt es ab Plus."}</p></div>
    ${famBox(B)}
    <div class="ptab" role="table">
      <div class="pt-r pt-h" role="row"><span role="columnheader"></span>${ids.map(i => `<span role="columnheader"${i === cur.id ? ' class="on"' : ""}>${esc(P[i].label)}<small>${i === "free" ? "0 €" : eur(B.prices[i]) + (B.prices[i] != null ? " / Monat" : "")}</small></span>`).join("")}</div>
      ${PLAN_ROWS.map(([t, f]) => `<div class="pt-r" role="row"><span role="rowheader">${esc(t)}</span>${ids.map(i => `<span role="cell"${i === cur.id ? ' class="on"' : ""}>${cell(f(P[i]))}</span>`).join("")}</div>`).join("")}
      <div class="pt-r pt-a" role="row"><span></span>${ids.map(i => `<span${i === cur.id ? ' class="on"' : ""}>${act(i)}</span>`).join("")}</div>
    </div>
    <p class="note"><b>Wechseln:</b> In einen höheren Tarif sofort – die ungenutzten Tage des alten Tarifs werden anteilig gutgeschrieben, die neue Laufzeit beginnt am selben Tag für einen Monat. In einen niedrigeren Tarif zum Ende der laufenden Periode.</p>
    <p class="note">Alles, was keine laufenden Kosten verursacht, bleibt für alle kostenlos. Nach einer Kündigung bleiben alle Termine, Dokumente und Einstellungen erhalten – es gelten nur wieder die Grenzen von „Kostenlos“.</p>
    ${cur.member ? "" : cur.id !== "free" && !cur.until && !cur.trial ? `<p><button type="button" class="btn ghost small danger-t" data-cancel>Verträge hier kündigen</button></p>` : ""}
  </div>`, "plan");
}
function famBox(B) {
  const cur = B.plan, F = B.family, P = B.plans;
  if (cur.member) return `<div class="fam"><b>👨‍👩‍👧 Du bist in der Familie von ${esc(cur.ownerName || "")}</b>
    <span>Ihr teilt euch ${cur.ai} KI-Aktionen und ${cur.img} Ticket-Auswertungen im Monat. Wird es knapp, kann ${esc(cur.ownerName || "die Person, die das Abo hat")} mehr dazubuchen.</span>
    <button type="button" class="link" data-famleave>Familie verlassen</button></div>`;
  if (cur.id !== "family" || !F) return "";
  const n = F.members.length, free = F.seats - n;
  return `<div class="fam"><b>👨‍👩‍👧 Deine Familie · ${n} von ${F.seats}</b>
    ${F.members.map(m => `<div class="fam-m"><span>${esc(m.name)}${m.owner ? " (du)" : ""}</span><small>${m.used} KI diesen Monat</small>${m.owner ? "" : `<button type="button" class="link danger-t" data-famrm="${esc(m.id)}">Entfernen</button>`}</div>`).join("")}
    ${free > 0 ? `<button type="button" class="btn small" data-faminv>+ Person einladen (${free} frei)</button>` : `<span class="note">Alle Plätze sind belegt.</span>`}
    <span class="note">Jede Person nutzt ihr eigenes Konto mit eigenen Terminen – nur das KI-Kontingent wird geteilt.</span></div>`;
}
async function famInvite() {
  const r = await window.mkBilling("family/invite"); if (!r?.ok) { toast(r?.code === "full" ? "Alle Plätze sind belegt." : "Einladung ging gerade nicht."); return; }
  use("familie_einladen"); const link = `${location.origin}/app/?fam=${r.code}`, txt = `Komm in meine Familie bei Mein Kalender – damit hast du alle Plus-Funktionen: ${link}`;
  openSheet("Person einladen", `gültig bis ${fmt(new Date(r.exp))}`, `<div class="plans"><p>Schick diesen Link an die Person, die du in deine Familie holen möchtest. Sie meldet sich mit ihrem eigenen Konto an und ist dann dabei.</p>
    <div class="fam-code"><code>${esc(link)}</code></div><p class="btnrow"><button type="button" class="btn accent" data-famshare="${esc(txt)}">Link teilen</button><button type="button" class="btn ghost" data-plans>Zurück</button></p></div>`, "plan");
}
// Einladungslink ?fam=CODE: nach der Anmeldung fragen, ob man beitreten möchte
(function plansIn() { if (!APP) return; const q = new URLSearchParams(location.search); if (!q.get("plans")) return; q.delete("plans"); history.replaceState(null, "", location.pathname + (q.toString() ? "?" + q : "") + location.hash); setTimeout(() => { try { showPlans(); } catch {} }, 6000); })();
(function famIn() { if (!APP) return; const q = new URLSearchParams(location.search), c = q.get("fam"); if (!c) return; try { sessionStorage.setItem("mk-fam", c); } catch {} q.delete("fam"); history.replaceState(null, "", location.pathname + (q.toString() ? "?" + q : "") + location.hash); })();
async function takeFam() {
  let c = ""; try { c = sessionStorage.getItem("mk-fam") || ""; sessionStorage.removeItem("mk-fam"); } catch {} if (!c || !window.mkBilling) return;
  const r = await window.mkBilling("family/peek", { code: c });
  if (!r?.ok) { const why = { invalid: "Diese Einladung ist abgelaufen oder ungültig. Bitte um einen neuen Link.", full: `Die Familie von ${r?.ownerName || ""} ist schon voll.`, own: "Das ist deine eigene Einladung.", has_plan: `Du hast schon ein eigenes ${r?.plan || "Abo"}. Kündige es zuerst, wenn du lieber in die Familie von ${r?.ownerName || ""} möchtest.` }[r?.code] || "Die Einladung ging gerade nicht.";
    openSheet("Familie beitreten", "", `<p>${esc(why)}</p>`, "plan"); return; }
  if (r.already) { toast(`Du bist schon in der Familie von ${r.ownerName}.`); return; }
  openSheet("Familie beitreten?", "", `<div class="plans"><p><b>${esc(r.ownerName)}</b> lädt dich in die Familie bei Mein Kalender ein. Damit hast du alle Plus-Funktionen – Flug live, Tickets auslesen und mehr KI-Aktionen, die ihr euch teilt.</p>
    <p class="note">Deine Termine bleiben in deinem eigenen Konto und privat.</p><p class="btnrow"><button type="button" class="btn accent" data-famjoin="${esc(c)}">Beitreten</button><button type="button" class="btn ghost" id="sheet-close2">Nein danke</button></p></div>`, "plan");
}
async function showCheckout(id) {
  const P = BILL?.plans || {}, p = P[id]; if (!p) return; use("tarif_checkout_" + id);
  const sim = BILL.mode === "simulate", cur = BILL.plan, eur = v => v == null ? "–" : v.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " €";
  openSheet(`Zu ${p.label} wechseln`, "lädt …", `<p class="note">Einen Moment …</p>`, "plan");
  const r = await window.mkBilling("simulate", { plan: id, quote: true }), q = r?.quote || { kind: "up" };
  const price = BILL.prices?.[id], what = `${p.ai} KI-Aktionen und ${p.img} Ticket-Auswertungen pro Monat${p.flight ? ", Flug live" : ""}${p.family ? `, für bis zu ${p.seats || 5} Konten` : ""}. Monatlich kündbar.`;
  const sum = q.kind === "down"
    ? `<p>Der Wechsel gilt ab <b>${fmt(new Date(q.at))}</b>, wenn deine laufende ${esc(cur.label)}-Periode endet. Bis dahin bleibt alles wie jetzt.</p>`
    : `<div class="pq">${price != null ? `<div><span>${esc(p.label)} · 1 Monat</span><b>${eur(price)}</b></div>` : ""}${q.credit ? `<div><span>Gutschrift ${esc(cur.label)} (${q.days} ungenutzte Tage)</span><b>− ${eur(q.credit)}</b></div>` : ""}
        <div class="pq-t"><span>Heute zu zahlen</span><b>${q.pay != null ? eur(q.pay) : "anteilig – Preis folgt"}</b></div></div>
       <p class="note">Sofort aktiv. Neue Laufzeit bis ${fmt(new Date(q.until))}, danach verlängert sich ${esc(p.label)} monatlich.</p>`;
  openSheet(`Zu ${p.label} wechseln`, sim ? "Testphase – es wird nichts berechnet" : "", `<div class="plans">
    <div class="plan-up"><b>${esc(p.label)}${price != null ? ` · ${eur(price)} / Monat` : ""}</b><span>${what}</span></div>${sum}
    ${sim ? `<p class="note">So würde der Abschluss später aussehen: Bezahlt wird dann über Google Play. Jetzt in der Testphase wird nichts berechnet – du kannst jederzeit wieder wechseln oder kündigen.</p>` : ""}
    <p class="btnrow"><button type="button" class="btn accent" data-buy="${id}">${sim ? (q.kind === "down" ? "Wechsel vormerken (Test)" : cur.id === "free" ? "Abo abschließen (Test)" : "Jetzt wechseln (Test)") : "Weiter zu Google Play"}</button><button type="button" class="btn ghost" data-plans>Zurück</button></p></div>`, "plan");
}
async function billDo(op, label) {
  if (BILL?.mode !== "simulate") { toast("Bezahlung ist noch nicht eingerichtet."); return; }
  const r = await window.mkBilling("simulate", { plan: op }); if (!r?.ok) { toast("Das hat gerade nicht geklappt."); return; }
  use("tarif_sim_" + op); BILL.plan = r.plan; { const c = $("quota-card"); if (c) { c.hidden = true; c.dataset.on = ""; } } renderPlanMenu(); await billLoad(true); pushPlanQueue(500); toast(label); showPlans();
}
function takeShare() {
  let t = ""; try { t = sessionStorage.getItem("mk-share") || ""; sessionStorage.removeItem("mk-share"); } catch {}
  if (!t || !sample || !canWrite) return false;
  use("teilen_empfangen"); ASST_DAY = null; ASST_TO = null; showAssistant(); const i = $("a-in"); if (i) i.value = t;
  setTimeout(() => $("a-go")?.click(), 300); return true;
}
applyPages();
