"use strict";
/* tracker-body.js: body measurements (2026-11-11). His words: "we need to add neck ,belly area masurment tracking area and
   weight, tracking" (decisions.md 2026-11-11; the spec: dossiers/2026-11-11-rule-v3/design.md part D).
   Additive data, version 1 ignores it: db.body = [{date: "YYYY-MM-DD", kg, belly, neck}], each number optional but at
   least one, one entry per date (a second save the same day replaces it), oldest first. The Progress screen shows a Body
   card: the latest of each with the change since the first, a chart of the chosen one, and "Log today" (a sheet with the
   three numbers and how to measure). The latest weight also feeds the body-weight lifts' same-effort reps
   (tracker-smart.js bodyKgNow). Loaded after tracker-progress.js, before the actions and the core.
   2026-11-17 (his words of 2026-11-13: "put height, waist, weight, neck registration and algrorythmic formula which
   calculates estimated body fat, and tracking system of these, so user can see progress , so each number have to register
   date when it was registered and give progress devided by days/weeks or something"): the height is a fourth number with
   its date; the estimated body fat is worked out (never stored) for each day belly and neck were measured, with the height
   in effect; each chart says the change per week, over the whole history and the last stretch. */
var BODY_FIELDS = [
  { k: "kg", name: "Weight", unit: "kg", min: 20, max: 400, hint: "Body weight" },
  { k: "belly", name: "Belly", unit: "cm", min: 30, max: 250, hint: "Around the belly button, relaxed" },
  { k: "neck", name: "Neck", unit: "cm", min: 20, max: 80, hint: "Just below the Adam's apple" },
  { k: "height", name: "Height", unit: "cm", min: 120, max: 230, hint: "Standing tall, no shoes (once is enough)" }
];
/* the card's tiles: the four numbers and the worked-out body fat, which sits next to the weight */
var BF_FIELD = { k: "bf", name: "Body fat", unit: "%" };
var BODY_TILES = [BODY_FIELDS[0], BF_FIELD, BODY_FIELDS[1], BODY_FIELDS[2], BODY_FIELDS[3]];
function tileField(k){ for(var i = 0; i < BODY_TILES.length; i++) if(BODY_TILES[i].k === k) return BODY_TILES[i]; return null; }
/* a measurement typed or stored: a number in its sane range (a comma works as the decimal point), one decimal; else null */
function bodyNum(v, f){
  var n = typeof v === "number" ? v : num(String(v == null ? "" : v).trim().replace(",", "."));
  return (n != null && isFinite(n) && n >= f.min && n <= f.max) ? Math.round(n * 10) / 10 : null;
}
function bodyField(k){ for(var i = 0; i < BODY_FIELDS.length; i++) if(BODY_FIELDS[i].k === k) return BODY_FIELDS[i]; return null; }
/* normalize: only valid entries, one per date (the last wins), oldest first */
function cleanBody(){
  var by = {};
  (Array.isArray(db.body) ? db.body : []).forEach(function(e){
    if(!e || typeof e !== "object" || typeof e.date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(e.date)) return;
    var o = { date: e.date }, any = false;
    BODY_FIELDS.forEach(function(f){ var v = bodyNum(e[f.k], f); if(v != null){ o[f.k] = v; any = true; } });
    if(any) by[e.date] = o;
  });
  db.body = Object.keys(by).sort().map(function(d){ return by[d]; });
}
/* the latest value of one measurement (null when never logged) */
function latestBody(k){
  var L = (typeof db !== "undefined" && db && Array.isArray(db.body)) ? db.body : [];
  for(var i = L.length - 1; i >= 0; i--) if(typeof L[i][k] === "number") return L[i][k];
  return null;
}
function rawSeries(k){ return (Array.isArray(db.body) ? db.body : []).filter(function(e){ return typeof e[k] === "number"; }).map(function(e){ return { date: e.date, v: e[k] }; }); }
function bodySeries(k){ return k === "bf" ? bodyFatSeries() : rawSeries(k); }
function fmt1(x){ return String(Math.round(x * 10) / 10); }

/* ---------- the estimated body fat (2026-11-17) ---------- */
/* the US Navy / Defense Department tape method for men (DoDI 1308.3; Hodgdon and Friedl), in inches:
     % fat = 86.010 x log10(belly - neck) - 70.041 x log10(height) + 36.76
   from cm (divided by 2.54), one decimal; null when a number is missing, the belly is not above the neck, or the result
   falls outside 2-60 %. Checked on two published worked examples (verify-v2-body-fat.mjs: 35/16/72 in gives 16.7 %,
   31/17/70 in gives 6.1 %). A friend's version adds the women's formula, which also needs the hips:
     163.205 x log10(waist + hip - neck) - 97.684 x log10(height) - 78.387 */
function bodyFatPct(belly, neck, height){
  if(typeof belly !== "number" || typeof neck !== "number" || typeof height !== "number" || !(belly > neck) || !(height > 0)) return null;
  var p = 86.010 * Math.log10((belly - neck) / 2.54) - 70.041 * Math.log10(height / 2.54) + 36.76;
  return (isFinite(p) && p >= 2 && p <= 60) ? Math.round(p * 10) / 10 : null;
}
/* the height for a date: the latest logged on or before it, else the first ever logged (an adult's height does not change,
   so a height logged later also counts for the earlier tape days) */
function heightOn(date){
  var hs = rawSeries("height"), h = hs.length ? hs[0].v : null;
  for(var i = 0; i < hs.length && hs[i].date <= date; i++) h = hs[i].v;
  return h;
}
/* the weight for a date: that day's, else the latest before it ({date, v}; null when none) */
function weightOn(date){ var w = null; rawSeries("kg").forEach(function(x){ if(x.date <= date) w = x; }); return w; }
/* one point for each day belly and neck were both measured and the estimate exists */
function bodyFatSeries(){
  return (Array.isArray(db.body) ? db.body : []).map(function(e){
    var v = (typeof e.belly === "number" && typeof e.neck === "number") ? bodyFatPct(e.belly, e.neck, heightOn(e.date)) : null;
    return v == null ? null : { date: e.date, v: v };
  }).filter(Boolean);
}
/* what the estimate still needs, in words ("height"; "belly, neck and height"; "belly and neck on one day"; and when they
   were measured the same day but no estimate comes out, "a belly well above the neck") */
function bodyFatNeeds(){
  var miss = ["belly", "neck", "height"].filter(function(k){ return !rawSeries(k).length; });
  if(!miss.length) return (Array.isArray(db.body) ? db.body : []).some(function(e){ return typeof e.belly === "number" && typeof e.neck === "number"; })
    ? "a belly well above the neck" : "belly and neck on one day";
  return miss.length === 1 ? miss[0] : miss.slice(0, -1).join(", ") + " and " + miss[miss.length - 1];
}

/* ---------- the change per week between uneven entries (2026-11-17) ---------- */
/* the change from a to b divided by the days between them, times 7, one decimal; null under a day apart */
function bodyRate(a, b){
  var days = Math.round((Date.parse(b.date + "T00:00:00Z") - Date.parse(a.date + "T00:00:00Z")) / 86400000);
  return days >= 1 ? { perWeek: Math.round((b.v - a.v) / days * 7 * 10) / 10, days: days } : null;
}
function spanText(days){ return days < 14 ? days + (days === 1 ? " day" : " days") : Math.round(days / 7) + " weeks"; }
function signed1(x){ return (x > 0 ? "+" : x < 0 ? "−" : "±") + fmt1(Math.abs(x)); }
/* "Since 1 Oct: −0.6 kg a week (over 5 weeks)" and, with three or more entries, "Last 4 weeks: −0.6 kg a week" */
function bodyRateHtml(s, unit){
  var all = s.length > 1 ? bodyRate(s[0], s[s.length - 1]) : null;
  if(!all) return "";
  var last = s.length > 2 ? bodyRate(s[s.length - 2], s[s.length - 1]) : null;
  return '<div class="bodyRate"><span class="brAll">Since ' + esc(shortDate(s[0].date)) + ': ' + signed1(all.perWeek) + ' ' + unit + ' a week (over ' + spanText(all.days) + ')</span>' +
    (last ? '<span class="brLast">Last ' + spanText(last.days) + ': ' + signed1(last.perWeek) + ' ' + unit + ' a week</span>' : '') + '</div>';
}

/* ---------- the Progress card ---------- */
/* one measurement over time, dates to scale (the lift chart's look: tracker-progress.js bigChartHtml) */
function bodyChartHtml(s, unit){
  var W = 340, H = 150, pl = 34, pr = 12, pt = 12, pb = 24;
  var vs = s.map(function(x){ return x.v; }), min = Math.min.apply(null, vs), max = Math.max.apply(null, vs);
  var pad = Math.max((max - min) * 0.2, 1), lo = Math.floor(min - pad), hi = Math.ceil(max + pad);
  var t = s.map(function(x){ return new Date(x.date + "T00:00:00").getTime(); }), t0 = Math.min.apply(null, t), t1 = Math.max.apply(null, t);
  var X = function(i){ return t1 > t0 ? pl + (t[i] - t0) / (t1 - t0) * (W - pl - pr) : (pl + W - pr) / 2; };
  var Y = function(v){ return pt + (hi - v) / (hi - lo) * (H - pt - pb); };
  var grid = [lo, (lo + hi) / 2, hi].map(function(v){ return '<line x1="' + pl + '" x2="' + (W - pr) + '" y1="' + Y(v).toFixed(1) + '" y2="' + Y(v).toFixed(1) + '" class="gLine"></line><text x="' + (pl - 6) + '" y="' + (Y(v) + 4).toFixed(1) + '" class="gLbl" text-anchor="end">' + fmt1(v) + '</text>'; }).join("");
  var pts = s.map(function(x, i){ return X(i).toFixed(1) + "," + Y(x.v).toFixed(1); }).join(" ");
  var area = '<polygon points="' + X(0).toFixed(1) + ',' + (H - pb) + ' ' + pts + ' ' + X(s.length - 1).toFixed(1) + ',' + (H - pb) + '" class="gArea"></polygon>';
  var dots = s.map(function(x, i){ return '<circle class="pt" cx="' + X(i).toFixed(1) + '" cy="' + Y(x.v).toFixed(1) + '" r="4"></circle>'; }).join("");
  return '<svg class="bodyChart" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="' + esc(unit) + ' over time">' + grid + area + '<polyline points="' + pts + '" class="gLine2"></polyline>' + dots +
    '<text x="' + pl + '" y="' + (H - 6) + '" class="gLbl">' + esc(shortDate(s[0].date)) + '</text><text x="' + (W - pr) + '" y="' + (H - 6) + '" class="gLbl" text-anchor="end">' + esc(shortDate(s[s.length - 1].date)) + '</text></svg>';
}
/* the latest of each with the change since the first; the chosen one's chart; Log today */
function bodyCardHtml(){
  var L = Array.isArray(db.body) ? db.body : [], h = '<div class="sectH">Body</div>';
  if(!L.length) return h + '<div class="card bodyCard bodyEmpty"><div class="note">Track your weight, belly, neck and height now and then: each one shows here as a line over time, with your estimated body fat once belly, neck and height are in.</div>' +
    '<button class="btn tonal block" data-act="bodylog">' + icon("plus") + 'Log today</button></div>';
  if(!tileField(ui.bodyMetric) || !bodySeries(ui.bodyMetric).length) ui.bodyMetric = (BODY_FIELDS.filter(function(f){ return bodySeries(f.k).length; })[0] || BODY_FIELDS[0]).k;
  var tiles = BODY_TILES.map(function(f){
    var s = bodySeries(f.k), sel = f.k === ui.bodyMetric, v = "—", d = f.k === "bf" ? "needs " + bodyFatNeeds() : "not logged yet";
    if(s.length){ var last = s[s.length - 1], diff = Math.round((last.v - s[0].v) * 10) / 10;
      v = fmt1(last.v) + " " + f.unit;
      d = s.length > 1 ? (diff > 0 ? "+" : diff < 0 ? "−" : "±") + fmt1(Math.abs(diff)) + " since " + shortDate(s[0].date) : "first entry, " + shortDate(last.date); }
    return '<button class="bodyTile' + (sel ? " sel" : "") + '" data-act="bodymetric" data-m="' + f.k + '"' + (s.length ? '' : ' disabled') + ' aria-pressed="' + sel + '">' +
      '<span class="btK">' + f.name + '</span><b class="btV">' + esc(v) + '</b><span class="btD">' + esc(d) + '</span></button>';
  }).join("");
  var f = tileField(ui.bodyMetric), s = bodySeries(f.k), today = todayISO(), hasToday = L.some(function(e){ return e.date === today; });
  var chart = s.length > 1 ? bodyChartHtml(s, f.unit) + bodyRateHtml(s, f.unit) : '<div class="note bodyOne">One ' + f.name.toLowerCase() + ' entry so far. Log again in a week or two to see the line.</div>';
  if(f.k === "bf"){
    var p = s[s.length - 1], w = weightOn(p.date);
    if(w){ var fat = w.v * p.v / 100;
      chart += '<div class="note bodyFatKg">About ' + fmt1(fat) + ' kg fat and ' + fmt1(w.v - fat) + ' kg lean at ' + fmt1(w.v) + ' kg (' + esc(shortDate(w.date)) + ')</div>'; }
    chart += '<div class="note bodyFatNote">An estimate from belly, neck and height (the US Navy tape method), give or take about 3.5 %.</div>';
  }
  return h + '<div class="card bodyCard"><div class="bodyTiles">' + tiles + '</div><div class="bodyPlot" data-m="' + f.k + '">' + chart + '</div>' +
    '<button class="btn tonal block" data-act="bodylog">' + icon(hasToday ? "edit" : "plus") + (hasToday ? "Change today's numbers" : "Log today") + '</button></div>';
}

/* ---------- the sheet: today's three numbers, how to measure, the recent entries ---------- */
function bodyRowText(e){ return BODY_FIELDS.filter(function(f){ return typeof e[f.k] === "number"; }).map(function(f){ return fmt1(e[f.k]) + " " + f.unit; }).join(" · "); }
function openBodySheet(){
  var today = todayISO(), cur = (db.body || []).filter(function(e){ return e.date === today; })[0] || {};
  var recent = (db.body || []).slice(-6).reverse();
  var h = '<div class="bodyForm">' + BODY_FIELDS.map(function(f){
      return '<label class="bodyF"><span class="bfName"><span class="bfN">' + f.name + '</span> <span class="bfHint">' + esc(f.hint) + '</span></span>' +
        '<span class="bfIn"><input id="body-' + f.k + '" class="mInput bodyIn" type="text" inputmode="decimal" autocomplete="off" value="' + (typeof cur[f.k] === "number" ? fmt1(cur[f.k]) : "") + '" placeholder="' + f.unit + '" aria-label="' + f.name + ' in ' + f.unit + '"><span class="bfUnit">' + f.unit + '</span></span></label>';
    }).join("") +
    '<div class="note bodyTip">Measure in the morning before breakfast, relaxed, with the tape snug but not tight, at the same spot each time. Leave a box empty to skip it.</div>' +
    '<button class="btn primary big block" data-act="bodysave">' + icon("check") + 'Save</button>' +
    (recent.length ? '<div class="sectH bodyRecentH">Recent</div><div class="bodyList">' + recent.map(function(e){
      return '<div class="bodyRow" data-date="' + e.date + '"><span class="brDate">' + esc(shortDate(e.date)) + '</span><span class="brVals">' + esc(bodyRowText(e)) + '</span>' +
        '<button class="btn sm bodyDel" data-act="bodydel" data-date="' + e.date + '" aria-label="Remove ' + esc(shortDate(e.date)) + '">Remove</button></div>'; }).join("") + '</div>' : '') +
    '</div>';
  openSheet("Body · " + shortDate(today), h, { cls: "bodySheet" });
}
/* Save: today's entry is replaced by what the boxes hold (all empty = today's entry removed); a number out of range stops it */
function saveBody(){
  var today = todayISO(), o = { date: today }, any = false, bad = null;
  BODY_FIELDS.forEach(function(f){
    var el = document.getElementById("body-" + f.k), raw = el ? String(el.value).trim() : "";
    if(!raw) return;
    var v = bodyNum(raw, f); if(v == null){ if(!bad) bad = f; return; }
    o[f.k] = v; any = true;
  });
  if(bad){ toast(bad.name + ": a number from " + bad.min + " to " + bad.max + " " + bad.unit); return; }
  var undo = undoPoint();
  db.body = (Array.isArray(db.body) ? db.body : []).filter(function(e){ return e.date !== today; });
  if(any) db.body.push(o);
  cleanBody(); save(); closeModal();
  if(ui.view === "progress") renderProgress();
  toast(any ? "Body · today: " + bodyRowText(o) : "Body · today's entry removed", { undo: undo });
}
function deleteBody(date){
  var undo = undoPoint();
  db.body = (Array.isArray(db.body) ? db.body : []).filter(function(e){ return e.date !== date; });
  save(); closeModal();
  if(ui.view === "progress") renderProgress();
  toast("Body · " + shortDate(date) + " removed", { undo: undo });
}
/* clicks (routed here by the core) */
function bodyClick(act, t){
  if(act === "bodylog"){ openBodySheet(); return true; }
  if(act === "bodysave"){ saveBody(); return true; }
  if(act === "bodydel"){ deleteBody(t.getAttribute("data-date")); return true; }
  if(act === "bodymetric"){ ui.bodyMetric = t.getAttribute("data-m"); renderProgress(); return true; }
  return false;
}
