"use strict";
/* tracker-catalog.js: the exercise catalogue in the app (version 2, part 2, 2026-11-04; design-part2.md §2).
   exercise-catalog.js (generated in the owner's office, catalog/build-catalog.mjs; never edited by hand) defines
   EXERCISE_CATALOG (898 entries on 2026-11-11: his 35 with his ids, 863 from free-exercise-db as "fedb:<source id>") and
   CATALOG_FIELDS.
   - exById falls back to catalogExercise(id): an entry as a lift the engine and the cards can use, built on demand and
     never saved (the catalogue stays out of the saved data; the saved data only names ids).
     Weight grid by equipment: dumbbell = the dumbbell grid; barbell, E-Z bar = 2.5 kg; cable, machine = the stack; kettlebells
     = 4 kg (the engine's categories). Body only and other gear: body weight + an optional plate. Stretches, cardio, foam
     rolling and body-weight static holds: effort exercises logged in seconds, with no weight.
   - his picture rule: an entry shows only a checked picture of his (EX_GIF); every other entry shows the labelled "Picture
     to come" box naming the file it expects (lesson L-2). The source's images are never shipped.
   - the filters (muscle = main muscle, equipment, pattern, location, level; one value each, all together) and the search work
     the same in the Exercises library ("lib") and the program editor's picker ("pick"): the chips open their values
     inline, because the picker is itself a sheet. Rows come in pages of 40: about 900 rows at once are too many for a phone.
   Loaded after the data, before the views need it at run time. */

var CAT_PAGE = 40;
var CAT_FILTERS = [["muscle", "Muscle"], ["equipment", "Equipment"], ["pattern", "Pattern"], ["location", "Location"], ["level", "Level"]];
var CAT_LABEL = { "e-z curl bar": "E-Z curl bar", "isolation-arms": "Isolation: arms", "isolation-legs": "Isolation: legs", "forearm-neck": "Forearm or neck", "core-anti-movement": "Core anti-movement" };
var CAT_GEAR = { dumbbell: "db", barbell: "bar", "e-z curl bar": "bar", cable: "cable", machine: "cable", kettlebells: "kb" };
var catIndex = null, catLifts = {};
var catF = { lib: catBlank(), pick: catBlank() };
function catBlank(){ return { open: null, muscle: null, equipment: null, pattern: null, location: null, level: null, q: "", limit: CAT_PAGE }; }
function catalogList(){ return typeof EXERCISE_CATALOG !== "undefined" ? EXERCISE_CATALOG : []; }
function catalogEntry(id){
  if(!catIndex){ catIndex = {}; catalogList().forEach(function(e){ catIndex[e.id] = e; }); }
  return catIndex[id] || null;
}
function catLabel(v){ if(CAT_LABEL[v]) return CAT_LABEL[v]; var s = String(v).replace(/-/g, " "); return s.charAt(0).toUpperCase() + s.slice(1); }
/* a source entry as a lift (his own entries live in db.exercises with the seed's fields) */
function catalogExercise(id){
  if(catLifts[id]) return catLifts[id];
  var c = catalogEntry(id); if(!c || c.source === "owner") return null;
  var gear = CAT_GEAR[c.equipment], x = { id: c.id, name: c.name, pattern: c.pattern, catalog: true };
  if(c.type === "stretching" || c.type === "cardio" || c.pattern === "mobility" || c.pattern === "cardio" || c.equipment === "foam roll" || (!gear && c.force === "static")){ x.loadType = "effort"; x.defaultUnit = "s"; }
  else if(gear){ x.loadType = "external"; x.cat = gear; if(gear === "db") x.equip = "db"; x.defaultUnit = c.laterality === "unilateral" ? (c.region === "lower" ? "kg/leg" : "kg/arm") : "kg"; }
  else { x.loadType = "bodyweight"; x.defaultUnit = "kg"; }
  catLifts[id] = x;
  return x;
}
/* the file an entry's picture is expected at, without gifs/ and .gif (his waiting ones keep their own, EX_GIF_PENDING);
   null = it has a checked picture */
function pendingPic(exId){
  var p = (typeof EX_GIF_PENDING !== "undefined") ? EX_GIF_PENDING[exId] : null; if(p) return p;
  if(EX_GIF[exId]) return null;
  var c = catalogEntry(exId); if(!c) return null;
  if(c.picture && c.picture.expectedFile) return String(c.picture.expectedFile).replace(/^gifs\//, "").replace(/\.\w+$/, "");
  return String(c.id).replace(/^fedb:/, "").toLowerCase().replace(/[^a-z0-9]+/g, "-");
}

/* ---------- filters and search ---------- */
function catValues(f){ var F = (typeof CATALOG_FIELDS !== "undefined") ? CATALOG_FIELDS : {}; return (f === "muscle" ? F.primaryMuscles : F[f]) || []; }
function catPass(e, s){ return (!s.muscle || e.primaryMuscles.indexOf(s.muscle) >= 0) && (!s.equipment || e.equipment === s.equipment) && (!s.pattern || e.pattern === s.pattern) && (!s.location || e.location === s.location) && (!s.level || e.level === s.level); }
function catAny(s){ return !!(s.muscle || s.equipment || s.pattern || s.location || s.level); }
/* every entry the filters and the search leave */
function catalogMatches(ctx){ var s = catF[ctx], q = String(s.q || "").trim().toLowerCase(); return catalogList().filter(function(e){ return catPass(e, s) && (!q || e.name.toLowerCase().indexOf(q) >= 0); }); }
/* one exercise under the filters (a warm-up move, not in the catalogue, only passes with no filter on) */
function catalogMatch(id, ctx){ var e = catalogEntry(id), s = catF[ctx]; return e ? catPass(e, s) : !catAny(s); }
function catFilterSet(ctx, f, v){ var s = catF[ctx]; s[f] = v || null; s.limit = CAT_PAGE; catRefresh(ctx); }
function catalogFilterHtml(ctx){
  var s = catF[ctx];
  var h = '<div class="chips scroll catCats">' + CAT_FILTERS.map(function(f){ var v = s[f[0]];
    return '<button class="chip catCat' + (v ? " sel" : "") + (s.open === f[0] ? " open" : "") + '" data-act="catopen" data-ctx="' + ctx + '" data-f="' + f[0] + '" aria-expanded="' + (s.open === f[0]) + '">' + esc(v ? catLabel(v) : f[1]) + icon("chevD", "sm") + '</button>'; }).join("") +
    (catAny(s) ? '<button class="chip catClear" data-act="catclear" data-ctx="' + ctx + '">' + icon("close", "sm") + 'Clear</button>' : '') + '</div>';
  if(s.open) h += '<div class="chips catVals">' + catValues(s.open).map(function(v){
    return '<button class="chip catVal' + (s[s.open] === v ? " sel" : "") + '" data-act="catval" data-ctx="' + ctx + '" data-f="' + s.open + '" data-v="' + esc(v) + '">' + esc(catLabel(v)) + '</button>'; }).join("") + '</div>';
  return h;
}
function catSub(e){ return catLabel(e.primaryMuscles[0]) + " · " + catLabel(e.equipment) + " · " + catLabel(e.level); }
/* the rows below his program in the library, the picker's list, the count, Show more */
function catRefresh(ctx){
  var s = catF[ctx], fb = $(ctx === "lib" ? "#libFilters" : "#pickFilters"); if(!fb) return;
  fb.innerHTML = catalogFilterHtml(ctx);
  var all = catalogMatches(ctx), rows, html;
  if(ctx === "lib"){
    var mine = {};
    libraryGroups().forEach(function(g){ g.items.forEach(function(it){ if(it.kind === "lift") mine[it.id] = true; }); });
    var any = filterLibrary(s.q);
    rows = all.filter(function(e){ return !mine[e.id]; });
    html = rows.slice(0, s.limit).map(function(e){
      return '<button class="li catRow" data-act="exsheet" data-ex="' + esc(e.id) + '"><span class="libThumb">' + thumbHtml(e.id) + '</span><span class="liB"><span class="liT">' + esc(e.name) + '</span><span class="liS">' + esc(catSub(e)) + '</span></span>' + icon("chevR", "chev") + '</button>'; }).join("");
    var empty = $("#view-exercises .libEmpty"); if(empty) empty.hidden = any || rows.length > 0;
    var sec = $("#view-exercises .libAll"); if(sec) sec.hidden = !rows.length;
  } else {
    var inProg = pickerProgramIds();
    rows = all.filter(function(e){ return inProg[e.id]; }).concat(all.filter(function(e){ return !inProg[e.id]; }));
    html = rows.slice(0, s.limit).map(function(e){
      return '<button class="li pickRow" data-act="edpick" data-ex="' + esc(e.id) + '"><span class="libThumb">' + thumbHtml(e.id) + '</span><span class="liB"><span class="liT pickName">' + esc(e.name) + '</span><span class="liS">' + esc((inProg[e.id] ? "In this program · " : "") + catSub(e)) + '</span></span>' + icon("plus", "chev") + '</button>'; }).join("");
    var pe = $("#modal .pickEmpty"); if(pe) pe.hidden = rows.length > 0;
  }
  var root = ctx === "lib" ? "#view-exercises" : "#modal", list = $(root + " .catList"), ct = $(root + " .libCount"), more = $(root + ' [data-act="catmore"]');
  if(list) list.innerHTML = html;
  if(ct) ct.textContent = all.length + (all.length === 1 ? " exercise" : " exercises");
  if(more){ more.hidden = rows.length <= s.limit; more.textContent = "Show more (" + Math.max(0, rows.length - s.limit) + " left)"; }
}
function catalogClick(act, t){
  var ctx = t.getAttribute("data-ctx"), s = catF[ctx]; if(!s) return false;
  if(act === "catopen"){ var f = t.getAttribute("data-f"); s.open = s.open === f ? null : f; catRefresh(ctx); return true; }
  if(act === "catval"){ var g = t.getAttribute("data-f"), v = t.getAttribute("data-v"); s[g] = s[g] === v ? null : v; s.open = null; s.limit = CAT_PAGE; catRefresh(ctx); return true; }
  if(act === "catclear"){ catF[ctx] = catBlank(); catF[ctx].q = s.q; catRefresh(ctx); return true; }
  if(act === "catmore"){ s.limit += CAT_PAGE; catRefresh(ctx); return true; }
  return false;
}
/* the exercise sheet: a catalogue exercise's instructions, and every exercise's categories */
function catalogDetailsHtml(exId){
  var c = catalogEntry(exId); if(!c) return "";
  var list = function(a){ return (a || []).map(catLabel).join(", "); };
  var row = function(k, v){ return v ? '<div class="factRow"><span>' + k + '</span> <b>' + esc(v) + '</b></div>' : ''; };
  var how = (!EX_DESC[exId] && c.instructions && c.instructions.length) ? '<div class="sheetSec"><div class="sectH">How to</div><ol class="instrList">' + c.instructions.map(function(l){ return '<li>' + esc(String(l).trim()) + '</li>'; }).join("") + '</ol></div>' : '';
  return how + '<div class="sheetSec"><div class="sectH">Details</div><div class="factList">' + row("Muscles", list(c.primaryMuscles)) + row("Helpers", list(c.secondaryMuscles)) + row("Pattern", catLabel(c.pattern)) + row("Equipment", catLabel(c.equipment)) +
    row("Level", catLabel(c.level)) + row("Type", catLabel(c.type)) + row("Mechanic", catLabel(c.mechanic)) + row("Force", catLabel(c.force)) + row("Sides", catLabel(c.laterality)) + row("Where", catLabel(c.location)) + '</div></div>';
}

/* ---------- Parts 2 and 3 of the friends' version (2026-11-22): the core exercise list and automatic rest ----------
   (plan.md "The design" 2 and 3; Claude's calls in decisions.md 2026-11-22 "The core exercise list and automatic rest: how")
   CORE_EXERCISES: the about 150 common gym exercises the app knows best (the ones on the program days, the usual gym lifts
   and swaps), each with its class: big (big compound), other (other compound), isolation, core, hold, carry; "isolation:12-20"
   gives a small lift its own range. coreOf(id) adds the range (the program days' own exercises keep theirs), the time a set
   takes and the equipment. The rest of the catalogue stays searchable as before.
   autoRestSec: big 2:30, other 2:00, isolation 1:30, core, holds and carries 1:00; a range around 6 reps or fewer +30 s,
   around 15 or more -15 s; never under 0:45; in 15 s steps. Research (PubMed): longer rests (over 2 min) give the most
   strength in trained lifters (Grgic 2018, doi 10.1007/s40279-017-0788-x); a many-joint lift needs longer than a one-joint
   lift (Senna 2016, doi 10.1519/JSC.0000000000001142); for muscle size over 60 s helps a little and over 90 s adds
   nothing clear (Singer 2024, doi 10.3389/fspor.2024.1429789). */
var CORE_EXERCISES = {
  "atg-split-squat": "other", "rdl": "big", "leg-curl": "isolation",
  "tibialis-raise": "isolation", "hip-flexion": "isolation", "copenhagen-plank": "hold",
  "suitcase-carry": "carry", "reverse-wrist-curl": "isolation", "cable-pulldown": "other",
  "cable-row": "other", "triceps-overhead": "isolation", "face-pulls": "isolation",
  "lu-raise": "isolation", "calf-raise-standing": "isolation", "db-overhead-press": "other",
  "side-lying-er": "isolation", "back-extension-45": "other", "bear-crawl": "core",
  "bear-step-through": "core", "hollow-hold": "hold", "lateral-step-down": "other",
  "sissy-squat": "other", "reverse-nordic": "other", "glute-bridge-hold": "hold",
  "rkc-plank": "hold", "towel-stretch": "hold", "chin-tuck": "hold",
  "neck-curl": "isolation", "neck-extension": "isolation", "db-fly": "isolation",
  "fedb:Barbell_Squat": "big", "fedb:Front_Barbell_Squat": "big", "fedb:Leg_Press": "big",
  "fedb:Hack_Squat": "big", "fedb:Smith_Machine_Squat": "big", "fedb:Goblet_Squat": "other",
  "fedb:Barbell_Deadlift": "big", "fedb:Sumo_Deadlift": "big", "fedb:Trap_Bar_Deadlift": "big",
  "fedb:Stiff-Legged_Barbell_Deadlift": "big", "fedb:Stiff-Legged_Dumbbell_Deadlift": "other", "fedb:Barbell_Hip_Thrust": "big",
  "fedb:Barbell_Glute_Bridge": "other", "fedb:Good_Morning": "other", "fedb:Dumbbell_Lunges": "other",
  "fedb:Barbell_Lunge": "other", "fedb:Dumbbell_Rear_Lunge": "other", "fedb:Split_Squat_with_Dumbbells": "other",
  "fedb:Barbell_Walking_Lunge": "other", "fedb:Bodyweight_Walking_Lunge": "other", "fedb:Dumbbell_Step_Ups": "other",
  "fedb:Barbell_Step_Ups": "other", "fedb:Single_Leg_Glute_Bridge": "other", "fedb:Leg_Extensions": "isolation",
  "fedb:Lying_Leg_Curls": "isolation", "fedb:Seated_Leg_Curl": "isolation", "fedb:Thigh_Abductor": "isolation",
  "fedb:Thigh_Adductor": "isolation", "fedb:Glute_Kickback": "isolation", "fedb:Calf_Press_On_The_Leg_Press_Machine": "isolation:12-20",
  "fedb:Standing_Dumbbell_Calf_Raise": "isolation:12-20", "fedb:Smith_Machine_Calf_Raise": "isolation:12-20", "fedb:Barbell_Bench_Press_-_Medium_Grip": "big",
  "fedb:Barbell_Incline_Bench_Press_-_Medium_Grip": "big", "fedb:Decline_Barbell_Bench_Press": "big", "fedb:Incline_Dumbbell_Press": "other",
  "fedb:Decline_Dumbbell_Bench_Press": "other", "fedb:Leverage_Chest_Press": "other", "fedb:Pushups": "other",
  "fedb:Dips_-_Chest_Version": "other", "fedb:Incline_Dumbbell_Flyes": "isolation", "fedb:Cable_Crossover": "isolation",
  "fedb:Butterfly": "isolation", "fedb:Close-Grip_Barbell_Bench_Press": "other", "fedb:Standing_Military_Press": "big",
  "fedb:Seated_Barbell_Military_Press": "big", "fedb:Dumbbell_Shoulder_Press": "other", "fedb:Seated_Dumbbell_Press": "other",
  "fedb:Arnold_Dumbbell_Press": "other", "fedb:Machine_Shoulder_Military_Press": "other", "fedb:Front_Dumbbell_Raise": "isolation",
  "fedb:Reverse_Flyes": "isolation:12-20", "fedb:Reverse_Machine_Flyes": "isolation:12-20", "fedb:Upright_Barbell_Row": "other",
  "fedb:Barbell_Shrug": "isolation:12-20", "fedb:Dumbbell_Shrug": "isolation:12-20", "fedb:Pullups": "big",
  "fedb:Chin-Up": "big", "fedb:Wide-Grip_Lat_Pulldown": "other", "fedb:Close-Grip_Front_Lat_Pulldown": "other",
  "fedb:Underhand_Cable_Pulldowns": "other", "fedb:V-Bar_Pulldown": "other", "fedb:Seated_Cable_Rows": "other",
  "fedb:Bent_Over_Barbell_Row": "big", "fedb:Bent_Over_Two-Dumbbell_Row": "other", "fedb:One-Arm_Dumbbell_Row": "other",
  "fedb:T-Bar_Row_with_Handle": "other", "fedb:Inverted_Row": "other", "fedb:Straight-Arm_Dumbbell_Pullover": "isolation",
  "fedb:Straight-Arm_Pulldown": "isolation", "fedb:Rack_Pulls": "big", "fedb:Barbell_Curl": "isolation",
  "fedb:Dumbbell_Bicep_Curl": "isolation", "fedb:Hammer_Curls": "isolation", "fedb:Preacher_Curl": "isolation",
  "fedb:EZ-Bar_Curl": "isolation", "fedb:Cable_Hammer_Curls_-_Rope_Attachment": "isolation", "fedb:Concentration_Curls": "isolation",
  "fedb:Incline_Dumbbell_Curl": "isolation", "fedb:Triceps_Pushdown": "isolation", "fedb:Triceps_Pushdown_-_Rope_Attachment": "isolation",
  "fedb:Lying_Triceps_Press": "isolation", "fedb:EZ-Bar_Skullcrusher": "isolation", "fedb:Standing_Dumbbell_Triceps_Extension": "isolation",
  "fedb:Dips_-_Triceps_Version": "other", "fedb:Bench_Dips": "other", "fedb:Tricep_Dumbbell_Kickback": "isolation",
  "fedb:Palms-Down_Wrist_Curl_Over_A_Bench": "isolation:12-20", "fedb:Palms-Up_Barbell_Wrist_Curl_Over_A_Bench": "isolation:12-20", "fedb:Reverse_Barbell_Curl": "isolation",
  "fedb:Plank": "hold", "fedb:Crunches": "core", "fedb:Cable_Crunch": "core",
  "fedb:Hanging_Leg_Raise": "core", "fedb:Ab_Roller": "core", "fedb:Russian_Twist": "core",
  "fedb:Pallof_Press": "hold", "fedb:Dead_Bug": "core", "fedb:Decline_Crunch": "core",
  "fedb:Knee_Hip_Raise_On_Parallel_Bars": "core", "fedb:Standing_Cable_Wood_Chop": "core", "fedb:Air_Bike": "core",
  "fedb:Farmers_Walk": "carry", "fedb:Flat_Bench_Lying_Leg_Raise": "core", "fedb:Side_Bridge": "hold",
  "fedb:Cable_Reverse_Crunch": "core", "fedb:Kettlebell_One-Legged_Deadlift": "other", "fedb:Dumbbell_Squat": "other",
  "fedb:Bodyweight_Squat": "other", "fedb:Cable_Rear_Delt_Fly": "isolation:12-20",
  "fedb:Dumbbell_Lying_Rear_Lateral_Raise": "isolation:12-20", "fedb:Machine_Preacher_Curls": "isolation", "fedb:Cable_Preacher_Curl": "isolation",
  "fedb:Spider_Curl": "isolation", "fedb:Overhead_Cable_Curl": "isolation", "fedb:Push_Press": "other",
  "fedb:Lateral_Raise_-_With_Bands": "isolation:12-20", "fedb:Smith_Machine_Bench_Press": "other", "fedb:Smith_Machine_Incline_Bench_Press": "other",
  "fedb:Leverage_Incline_Chest_Press": "other", "fedb:Leverage_Shoulder_Press": "other", "fedb:Leverage_High_Row": "other",
  "fedb:Leverage_Iso_Row": "other", "fedb:Leverage_Shrug": "isolation:12-20", "fedb:Cable_Seated_Lateral_Raise": "isolation:12-20",
  "fedb:Weighted_Pull_Ups": "big", "fedb:Kneeling_Cable_Crunch_With_Alternating_Oblique_Twists": "core", "fedb:Barbell_Seated_Calf_Raise": "isolation:12-20",
  "fedb:One-Arm_Kettlebell_Swings": "other", "fedb:Seated_Side_Lateral_Raise": "isolation:12-20"
};
var CORE_CLASS_RANGE = { big: [6, 10, "reps"], other: [8, 12, "reps"], isolation: [10, 15, "reps"], core: [10, 15, "reps"], hold: [20, 45, "s"], carry: [24, 36, "s"] };
var CORE_CLASS_REST = { big: 150, other: 120, isolation: 90, core: 60, hold: 60, carry: 60 };
var CORE_CLASS_LABEL = { big: "Big compound", other: "Other compound", isolation: "Isolation", core: "Core", hold: "Hold", carry: "Carry" };
function coreCatalogEntry(id){ if(typeof EXERCISE_CATALOG === "undefined") return null; for(var i = 0; i < EXERCISE_CATALOG.length; i++) if(EXERCISE_CATALOG[i].id === id) return EXERCISE_CATALOG[i]; return null; }
function round5(x){ return Math.round(x / 5) * 5; }
/* a core exercise's data, else null: {cls, label, lo, hi, unit, setSec, equipment} */
function coreOf(id){
  var v = (typeof CORE_EXERCISES !== "undefined" && CORE_EXERCISES[id]) || null; if(!v) return null;
  var m = /^([a-z]+)(?::(\d+)-(\d+))?$/.exec(v), cls = m ? m[1] : v, c = coreCatalogEntry(id), base = CORE_CLASS_RANGE[cls]; if(!base) return null;
  var lo = m && m[2] ? +m[2] : base[0], hi = m && m[3] ? +m[3] : base[1], unit = base[2];
  if(c && c.source === "owner" && unit === "reps" && typeof smartRange === "function" && typeof exById === "function"){ var r = smartRange({}, exById(id)); lo = r.lo; hi = r.hi; }   /* his exercises keep their own range */
  var mid = (lo + hi) / 2, uni = !!c && c.laterality === "unilateral";
  var setSec = round5(unit === "s" ? mid + 10 : mid * 4.5 * (uni ? 2 : 1) + 10);
  return { cls: cls, label: CORE_CLASS_LABEL[cls], lo: lo, hi: hi, unit: unit, setSec: setSec, equipment: (c && c.equipment) || "" };
}
/* the class of any exercise: the core list's, else worked out from the catalogue (pattern, mechanic, force, equipment) */
function restClassOf(id){
  var co = coreOf(id); if(co) return co.cls;
  var c = coreCatalogEntry(id); if(!c) return "other";
  if(c.pattern === "carry") return "carry";
  if(c.force === "static") return "hold";
  if(c.pattern === "core-anti-movement" || c.pattern === "rotation") return "core";
  if(c.mechanic === "isolation") return "isolation";
  if(c.equipment === "barbell" && /^(squat|hinge|horizontal-push|vertical-push|horizontal-pull)$/.test(c.pattern)) return "big";
  return "other";
}
/* the worked-out rest in seconds for a class and a range */
function autoRestSec(cls, lo, hi, unit){
  var s = CORE_CLASS_REST[cls] || 120, mid = (lo + hi) / 2;
  if(unit !== "s" && cls !== "hold" && cls !== "carry"){ if(mid <= 6) s += 30; else if(mid >= 15) s -= 15; }
  return Math.max(45, Math.round(s / 15) * 15);
}
/* the worked-out rest of a program entry: its exercise's class and its range (a hold or carry by its class) */
function autoRestFor(en){
  if(!en || !en.exerciseId) return null;
  var ex = (typeof exById === "function" && exById(en.exerciseId)) || {}, cls = restClassOf(en.exerciseId), r = smartRange(en, ex);
  return autoRestSec(cls, r.lo, r.hi, r.unit);
}
