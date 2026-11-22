"use strict";
/* tracker-week.js: the week schedule and the workout names (version 2, 2026-11-04; the dossier's build-log.md,
   "Part 1: session control, schedule editor, names, update feedback").
   - db.schedule (additive): null = the original week (CURRENT_WEEK in tracker-seed.js, never changed), else 7 entries
     in its shape {day, label, type, ref, note, home?}. weekPlan() is the week every screen reads (Today, the week
     strip, todayProgram, the summary's "Next: … on …"). Ticks, week counters and the diary key on the workout day
     (strength-a …), never on the weekday, so moving a day touches none of them.
   - the editor (view "schedule", from Today's "Edit week" and More's "Week schedule"): Mon–Sun; a day's sheet chooses
     Day A, Day B, Home · Wed, Home · Sun, Zone 2, the 4×4 or rest, and on a cardio day (Zone 2 or the 4×4) one home
     workout on top. A workout sits on one day only: moving it leaves its old day as rest; one riding on a cardio day
     just leaves it. Every change has an Undo; "Reset to the original week".
   - db.dayNames (additive): {dayId: "his name"}; empty = the default: "Day A", "Day B", and for a home workout
     "Home · " + the weekday it sits on. dayName() is the one name every screen shows (shortName and dayTitle use it).
     Rename from the Workout header or the editor's names list.
   Version 1 ignores both fields, so a version 2 export still imports there. Loaded after tracker-progress.js, before
   the actions and the core. */

var DAY_CHOICES = ["strength-a", "strength-b", "home-wed", "home-sun", "z2", "norwegian-4x4", "rest"];
var CHOICE_TITLE = { z2: "Zone 2 cardio", "norwegian-4x4": "Norwegian 4×4", rest: "Rest" };
var CHOICE_SUB = { z2: "45–60 min, easy", "norwegian-4x4": "4 × 4 min, hard", rest: "No training" };
var CHOICE_TYPE = { z2: "cardio", "norwegian-4x4": "hiit", rest: "rest" };
/* a home workout riding on a cardio day gets its own card on Today */
var ADDON_TITLE = { "home-wed": "Home core", "home-sun": "Home legs" };
/* Home · Wed has no day of its own in the original week: its entry when it gets one */
var EXTRA_DAY = { "home-wed": { label: "Home · core", type: "home", ref: "home-wed", note: "Core and hips · no knee work" } };
var STRIP_WORD = { cardio: "Zone 2", hiit: "4×4", rest: "Rest" };
var NAME_MAX = 30;

/* ---------- the week ---------- */
/* Part 2 (2026-11-04): the workout days are the ACTIVE program's (his own programs have their own days), plus the home
   days; the built-in programs share db.schedule, and each of his programs keeps its own week (db.userPrograms[id].week,
   null = his days on the built-in week's gym slots in order: its first day where Day A is, its second where Day B is) */
function progDays(pid){ var P = (pid && typeof getProgram === "function") ? getProgram(pid) : null; return (P && Array.isArray(P.days) && P.days.length) ? P.days.slice() : STRENGTH_DAYS.slice(); }
/* Part 4 (2026-11-22): the editor's weekday chips place the days of any program, so the week functions take one */
function progWorkoutDays(pid){ return progDays(pid).concat(typeof HOME_DAYS !== "undefined" ? HOME_DAYS : []); }
/* Part 5 (2026-11-22): with several programs on, the days of all of them */
function workoutDays(){ return multiOn() ? onGymDays().concat(typeof HOME_DAYS !== "undefined" ? HOME_DAYS : []) : progWorkoutDays(db && db.activeProgram); }
/* every day a built-in program can put on the shared week (a day added to a built-in's edited copy too) */
function builtinWeekDays(){ var o = []; (typeof BUILTIN_IDS !== "undefined" ? BUILTIN_IDS : PROGRAM_ORDER).forEach(function(id){ progDays(id).forEach(function(d){ if(o.indexOf(d) < 0) o.push(d); }); }); return o.concat(typeof HOME_DAYS !== "undefined" ? HOME_DAYS : []); }
function dayChoices(days){ return (days || workoutDays()).concat(["z2", "norwegian-4x4", "rest"]); }
function isWorkoutDay(id){ return workoutDays().indexOf(id) >= 0; }
function isCardioType(t){ return t === "cardio" || t === "hiit"; }
function hasWorkout(d){ return !!d && (d.type === "strength" || d.type === "home"); }
/* what a day is, as one of the day choices */
function choiceOf(d){ return (!d || d.type === "rest") ? "rest" : d.ref; }
function choiceType(c){ return CHOICE_TYPE[c] || ((typeof HOME_DAYS !== "undefined" && HOME_DAYS.indexOf(c) >= 0) ? "home" : "strength"); }
function isOwnPid(pid){ return !!(db && pid && typeof isOwnProg === "function" && isOwnProg(pid)); }
function ownActive(){ return isOwnPid(db && db.activeProgram); }
/* his program's week before he edits it: the built-in week with its gym days replaced in order */
function defaultOwnWeekFor(pid){
  var base = (db && Array.isArray(db.schedule) && db.schedule.length === 7) ? db.schedule : CURRENT_WEEK, days = progDays(pid);
  return base.map(function(d, j){
    if(d.type !== "strength") return clone(d);
    var k = STRENGTH_DAYS.indexOf(d.ref), nd = k >= 0 ? days[k] : null;
    return nd ? { day: d.day, label: dayName(nd), type: "strength", ref: nd, note: "" } : makeDay(j, "rest");
  });
}
function defaultOwnWeek(){ return defaultOwnWeekFor(db.activeProgram); }
/* a program's week as stored: his own program's own week; for a built-in the shared week, unfiltered (the editor's weekday
   chips change only the days tapped, so a day only another built-in has is never dropped unasked) */
function ownWeek(pid){
  if(isOwnPid(pid)){ var up = db.userPrograms[pid]; return (Array.isArray(up.week) && up.week.length === 7) ? up.week : defaultOwnWeekFor(pid); }
  return (db && Array.isArray(db.schedule) && db.schedule.length === 7) ? db.schedule : CURRENT_WEEK;
}
/* the week the editor's weekday chips of program pid show and change: with several programs on, their one week (Part 5) */
function progWeek(pid){ return (multiOn() && isOn(pid)) ? weekPlan() : ownWeek(pid); }
/* the week when pid is the only program on: his program's own week, else the shared week (a day another program added
   shows as rest) */
function soloWeek(pid){
  if(isOwnPid(pid)) return ownWeek(pid);
  var w = ownWeek(pid), mine = progWorkoutDays(pid);
  if(w.every(function(d){ return !d || !hasWorkout(d) || mine.indexOf(d.ref) >= 0; })) return w;
  return w.map(function(d, j){ return (d && hasWorkout(d) && mine.indexOf(d.ref) < 0) ? makeDay(j, "rest") : d; });
}
/* the week every screen reads: the one program's week, or with several on their one week (Part 5) */
function weekPlan(){ return multiOn() ? mixWeek() : soloWeek(db && db.activeProgram); }
function weekIsCustom(){
  if(multiOn()) return Array.isArray(db.weekMix);
  return ownActive() ? Array.isArray(db.userPrograms[db.activeProgram].week) : Array.isArray(db.schedule);
}
/* the entry a choice makes: label and note from the original week where it has a day there */
function dayTemplate(c){
  var t = null;
  for(var i = 0; i < CURRENT_WEEK.length && !t; i++){ var d = CURRENT_WEEK[i]; if(c === "rest" ? d.type === "rest" : (d.type !== "rest" && d.ref === c)) t = d; }
  t = t || EXTRA_DAY[c] || ((isWorkoutDay(c) || (db && db.programs && db.programs[c])) ? { label: (typeof isOwnDay === "function" && isOwnDay(c)) ? dayName(c) : ((db && db.programs && db.programs[c] && db.programs[c].name) || c), type: choiceType(c), ref: c, note: "" } : null);
  return t ? { label: t.label, type: t.type, ref: t.ref == null ? null : t.ref, note: t.note || "" } : null;
}
function makeDay(j, c, home){
  var t = dayTemplate(c) || dayTemplate("rest"), e = { day: CURRENT_WEEK[j].day, label: t.label, type: t.type, ref: t.ref, note: t.note };
  if(home && isCardioType(t.type)) e.home = home;
  return e;
}
function sameWeek(a, b){
  for(var j = 0; j < 7; j++) if(choiceOf(a[j]) !== choiceOf(b[j]) || ((a[j] && a[j].home) || null) !== ((b[j] && b[j].home) || null)) return false;
  return true;
}
/* a stored week made safe (normalize and every edit): 7 entries rebuilt from what each day is; a workout on one day
   only (the first wins); a home workout on top only of a cardio day; anything unknown is rest. The original week,
   or anything that is not 7 days, gives null */
function cleanSchedule(raw, days, original){
  days = days || builtinWeekDays();   /* the shared week holds every built-in's days (Part 2: his own programs keep their own) */
  var out = cleanWeek(raw, days);
  if(!out) return null;
  return sameWeek(out, original || CURRENT_WEEK) ? null : out;
}
/* the 7 entries of a stored week made safe against the workouts `days` (cleanSchedule without the "is it the original" step) */
function cleanWeek(raw, days){
  if(!Array.isArray(raw) || raw.length !== 7) return null;
  var used = {}, choices = dayChoices(days), isW = function(c){ return days.indexOf(c) >= 0; };
  return raw.map(function(e, j){
    var ok = !!e && typeof e === "object", c = ok ? (e.type === "rest" ? "rest" : e.ref) : "rest";
    if(choices.indexOf(c) < 0 || (isW(c) && used[c])) c = "rest";
    if(isW(c)) used[c] = true;
    var hm = (ok && typeof HOME_DAYS !== "undefined" && HOME_DAYS.indexOf(e.home) >= 0 && !used[e.home]) ? e.home : null;
    var d = makeDay(j, c, hm);
    if(d.home) used[d.home] = true;
    return d;
  });
}
/* his programs' own weeks made safe at load, after the day tracks hold his days (2026-11-22: cleanUserPrograms had dropped
   them, so a program of his own went back to the default week at every restart); a stored null (the default) stays null */
function cleanOwnWeeks(){
  Object.keys((db && db.userPrograms) || {}).forEach(function(pid){
    var up = db.userPrograms[pid]; if(!up || !up.own || up.week === undefined) return;
    up.week = Array.isArray(up.week) ? cleanWeek(up.week, progWorkoutDays(pid)) : null;
  });
}
/* where a workout sits: {j, as: "main" | "home"} or null (not on the week) */
function slotOf(id, plan){
  plan = plan || weekPlan();
  for(var j = 0; j < plan.length; j++){ var d = plan[j]; if(!d || typeof d !== "object") continue;
    if(hasWorkout(d) && d.ref === id) return { j: j, as: "main" };
    if(d.home === id) return { j: j, as: "home" }; }
  return null;
}
/* "On Tuesday" / "With Wednesday's Zone 2" / "Not on the week" */
function whereText(id, plan){
  plan = plan || weekPlan(); var s = slotOf(id, plan);
  if(!s) return "Not on the week";
  return s.as === "main" ? "On " + WEEKDAY_LONG[s.j] : "With " + WEEKDAY_LONG[s.j] + "'s " + (plan[s.j].type === "hiit" ? "4×4" : "Zone 2");
}

/* ---------- Part 5 (2026-11-22): several programs on at once (plan.md "The design" 5) ----------
   db.programsOn (additive, stored only while two or more are on): the programs on, the first leading (the home days stay
   with it). Programs sharing a workout day (the built-ins share Day A and Day B) are never on together: Switch to is for
   those. db.weekMix (additive, only while two or more are on): their one week, in the schedule's shape; null = the first
   program's week with the others' days on the weekdays their own weeks give them where those are rest. The program a day
   belongs to becomes db.activeProgram while that day is on screen (followDay), so its weeks, ticks and diary stay its own.
   With one program on nothing is stored and every screen is as before. A stored list without the active program is stale
   (a version without Part 5 switched programs): then the active program is the one on. */
function progKnown(id){ return !!(id && typeof SEED_PROGRAM_LIB !== "undefined" && SEED_PROGRAM_LIB[id]); }
function sharesGymDay(p, q){ var b = progDays(q); return progDays(p).some(function(d){ return b.indexOf(d) >= 0; }); }
function programsOn(){
  var act = db && db.activeProgram, a = (db && Array.isArray(db.programsOn)) ? db.programsOn : null, out = [];
  if(!a || a.indexOf(act) < 0) return act ? [act] : [];
  a.forEach(function(id){
    if(!progKnown(id) || out.indexOf(id) >= 0 || (id !== act && sharesGymDay(id, act))) return;
    if(out.some(function(o){ return sharesGymDay(o, id); })) return;
    out.push(id);
  });
  return out;
}
function multiOn(){ return programsOn().length > 1; }
function isOn(pid){ return programsOn().indexOf(pid) >= 0; }
function leadProgram(){ return programsOn()[0] || (db && db.activeProgram); }
function onGymDays(){ var o = []; programsOn().forEach(function(p){ progDays(p).forEach(function(d){ if(o.indexOf(d) < 0) o.push(d); }); }); return o; }
/* the program on that day `day` belongs to (a home day: the first one on), else null */
function ownerOf(day){
  if(typeof HOME_DAYS !== "undefined" && HOME_DAYS.indexOf(day) >= 0) return leadProgram();
  var on = programsOn(); for(var i = 0; i < on.length; i++) if(progDays(on[i]).indexOf(day) >= 0) return on[i];
  return null;
}
/* the program a day on screen belongs to becomes the current one (several on, not while just looking); true when it changed */
function followDay(day){
  if(!day || !multiOn() || (typeof previewing === "function" && previewing())) return false;
  var o = ownerOf(day); if(!o || o === db.activeProgram) return false;
  db.activeProgram = o;
  if(typeof applyDays === "function") applyDays();   /* an edited built-in's days come with it */
  save(); return true;
}
/* why program pid cannot go on: the program on that shares a workout day with it, else null */
function onBlocker(pid){ var on = programsOn(); for(var i = 0; i < on.length; i++) if(on[i] !== pid && sharesGymDay(on[i], pid)) return on[i]; return null; }
/* program pid's days onto week w, each on the weekday its own week gives it, where w has rest there */
function placeOnRest(w, pid){
  var own = soloWeek(pid);
  progDays(pid).forEach(function(d){ var s = slotOf(d, own); if(s && s.as === "main" && w[s.j] && w[s.j].type === "rest" && !slotOf(d, w)) w[s.j] = makeDay(s.j, d); });
  return w;
}
function mixBase(){ var on = programsOn(), w = clone(soloWeek(on[0])); on.slice(1).forEach(function(p){ placeOnRest(w, p); }); return w; }
function mixWeek(){ var c = (db && Array.isArray(db.weekMix)) ? cleanWeek(db.weekMix, workoutDays()) : null; return c || mixBase(); }
/* the mixed week to store: cleaned; null when it is the one worked out anyway */
function keepMix(w){ var c = cleanWeek(w, workoutDays()); return (!c || sameWeek(c, mixBase())) ? null : c; }
/* back to one program on: the week as he left it becomes that program's own */
function storeSoloWeek(pid, w){
  if(isOwnPid(pid)) db.userPrograms[pid].week = cleanSchedule(w, progWorkoutDays(pid), defaultOwnWeekFor(pid));
  else db.schedule = cleanSchedule(w);
}
function joinAnd(a){ return a.length < 2 ? (a[0] || "") : a.slice(0, -1).join(", ") + " and " + a[a.length - 1]; }
function redrawAfterOn(){
  if(ui.view === "library") renderLibrary(); else if(ui.view === "today") renderToday(); else if(ui.view === "schedule") renderSchedule();
  else if(ui.view === "programs") renderPlan(); else if(ui.view === "progedit" && typeof renderProgEdit === "function") renderProgEdit();
}
/* On: a program starts beside the ones on. Nothing stored changes but its own state (a first start date, empty week counts
   for its days) and, for a smart program joining a 12-week one, targets for lifts that have none yet. A program run
   before carries on where it stopped. Its days go where its own week puts them if those weekdays are rest. */
function turnOn(pid){
  if(!progKnown(pid) || isOn(pid) || onBlocker(pid)) return false;
  var undo = undoPoint(), on = programsOn(), mix = multiOn() ? clone(mixWeek()) : null, ps = progStateFor(pid);
  if(!ps.startedAt) ps.startedAt = nowISO();
  progDays(pid).forEach(function(d){ if(!ps.progress[d]) ps.progress[d] = { weeksDone: [] }; else if(!ps.progress[d].weeksDone) ps.progress[d].weeksDone = []; });
  if(typeof isSmartProg === "function" && isSmartProg(pid) && !isSmartProg(db.activeProgram) && typeof carryTargetsFrom === "function"){
    var c = carryTargetsFrom(db.activeProgram, {}) || {};
    if(!db.targets || typeof db.targets !== "object") db.targets = {};
    for(var id in c){ if(!db.targets[id]) db.targets[id] = c[id]; }
  }
  db.programsOn = on.concat([pid]);
  db.weekMix = mix ? keepMix(placeOnRest(mix, pid)) : null;
  save(); redrawAfterOn();
  toast(getProgram(pid).name + " is on: put its days on your week", { undo: undo });
  return true;
}
/* Off (two or more on): its weekdays become rest; its weeks and diary stay. Back to one program, the week as he left it
   becomes that program's week. Returns the weekdays (0-6) that became rest, or null when refused (the last one on) */
function offCore(pid){
  if(!isOn(pid) || !multiOn()) return null;
  var w = clone(weekPlan()), rest = [];
  progDays(pid).forEach(function(d){ var s = slotOf(d, w); if(s && s.as === "main"){ w[s.j] = makeDay(s.j, "rest"); rest.push(s.j); } });
  var on = programsOn().filter(function(id){ return id !== pid; });
  if(db.activeProgram === pid){
    db.activeProgram = on[0];
    if(typeof clearPreview === "function") clearPreview();
    ui.planProg = null; ui.planWeek = null; ui.planLastProg = null;
    if(typeof applyDays === "function") applyDays();
  }
  if(on.length > 1){ db.programsOn = on; db.weekMix = keepMix(w); }
  else { delete db.programsOn; delete db.weekMix; storeSoloWeek(on[0], w); }
  return rest.sort(function(a, b){ return a - b; });
}
function turnOff(pid){
  if(!isOn(pid) || !multiOn()) return false;
  var undo = undoPoint(), nm = getProgram(pid).name, r = offCore(pid);
  if(!r) return false;
  save(); redrawAfterOn();
  var days = r.map(function(j){ return WEEKDAY_LONG[j]; });
  toast(nm + " is off" + (days.length ? ": " + joinAnd(days) + (days.length === 1 ? " is" : " are") + " now rest." : ".") + " Its weeks and diary stay.", { undo: undo });
  return true;
}

/* ---------- names ---------- */
function customName(id){
  if(typeof isOwnDay === "function" && isOwnDay(id)) return db.userDays[id].name || null;   /* his own day: the name he gave it (Part 2) */
  var n = db && db.dayNames && db.dayNames[id]; return (typeof n === "string" && n.trim()) ? n.trim() : null; }
function defaultDayName(id){
  if(id === "strength-a") return "Day A";
  if(id === "strength-b") return "Day B";
  var s = (typeof isHomeDay === "function" && isHomeDay(id)) ? slotOf(id) : null;
  if(s) return "Home · " + weekPlan()[s.j].day;   /* a home workout is named after the day it sits on */
  return (db && db.programs && db.programs[id] && db.programs[id].name) || id;
}
function dayName(id){ return customName(id) || defaultDayName(id); }
function namesNow(){ var o = {}; workoutDays().forEach(function(id){ o[id] = dayName(id); }); return o; }
/* stored names made safe: known workout days only, text, spaces squeezed, at most 30 characters, empty dropped */
function cleanNames(raw){
  var out = {};
  if(!raw || typeof raw !== "object" || Array.isArray(raw)) return out;
  Object.keys(SEED_DAYS).forEach(function(id){ var v = raw[id]; if(typeof v !== "string") return; v = v.replace(/\s+/g, " ").trim().slice(0, NAME_MAX).trim(); if(v) out[id] = v; });   /* the built-in days (his own days keep their names in their definitions) */
  return out;
}
/* the Workout's home tab: his name, else the weekday it sits on ("Wed") */
function homeTabLabel(id){ var cn = customName(id); if(cn) return cn; var s = slotOf(id); return s ? weekPlan()[s.j].day : String(dayName(id)).replace(/^Home · /, ""); }
/* the week strip's word under a day's icon, so Day A and Day B are told apart */
function stripWord(d){ return hasWorkout(d) ? (customName(d.ref) || (d.type === "home" ? "Home" : defaultDayName(d.ref))) : (STRIP_WORD[d.type] || ""); }
/* a home workout riding on a cardio day, in running text: "home core", or his name */
function addonWord(hid){ return customName(hid) || (ADDON_TITLE[hid] || dayName(hid)).toLowerCase(); }
/* what a day is, for the editor: the workout's name, or "Zone 2 cardio" / "Norwegian 4×4" / "Rest" */
function dayWhat(d){ return hasWorkout(d) ? dayName(d.ref) : (CHOICE_TITLE[choiceOf(d)] || d.label || ""); }
/* everything a day holds, a home workout on top included: "Zone 2 cardio + Home · Wed" (the program editor's chips) */
function weekWhat(d){ return dayWhat(d) + (d && d.home ? " + " + dayName(d.home) : ""); }

/* ---------- the editor page ---------- */
function renderSchedule(){
  var plan = weekPlan(), from = ui.schedFrom === "today" ? "today" : "more", today = weekdayIdx();
  var h = '<div class="pageTop"><button class="backBtn" data-view="' + from + '" aria-label="Back to ' + (from === "today" ? "Today" : "More") + '">' + icon("chevL") + '</button></div>' +
    '<div class="viewH">Week schedule</div><div class="viewSub">Tap a day to choose what it is. A workout sits on one day: moving it leaves its old day as rest.</div>';
  h += '<div class="list schedList">' + plan.map(function(d, j){
    return '<button class="li schedRow' + (j === today ? " today" : "") + '" data-act="schedday" data-day="' + j + '">' +
      '<span class="sdWd">' + esc(d.day) + '</span><span class="dot ' + esc(d.type) + '">' + icon(DAY_ICON[d.type] || "calendar") + '</span>' +
      '<span class="liB"><span class="liT"><span class="sdWhat">' + esc(dayWhat(d)) + '</span>' + (d.home ? '<span class="sdAdd">+ ' + esc(dayName(d.home)) + '</span>' : '') + '</span>' +
      '<span class="liS sdSub">' + esc(d.note || "") + '</span></span>' + icon("chevR", "chev") + '</button>';
  }).join("") + '</div>';
  var off = workoutDays().filter(function(id){ return !slotOf(id, plan); });
  if(off.length) h += '<div class="note schedOff">Not on the week: ' + off.map(function(id){ return esc(dayName(id)); }).join(", ") + '</div>';
  if(weekIsCustom()) h += '<button class="btn block schedReset" data-act="schedreset">' + icon("undo") + 'Reset to the original week</button>';
  h += '<div class="sectH">Workout names</div><div class="list nameList">' + workoutDays().map(function(id){
    var home = isHomeDay(id);
    return '<button class="li nameRow" data-act="rename" data-prog="' + id + '"><span class="dot ' + (home ? "home" : "strength") + '">' + icon(home ? "house" : "dumbbell") + '</span>' +
      '<span class="liB"><span class="liT">' + esc(dayName(id)) + '</span><span class="liS">' + esc(whereText(id, plan)) + '</span></span>' + icon("edit", "chev") + '</button>';
  }).join("") + '</div><div class="note setNote">Tap a workout to rename it. An empty name brings the default back.</div>';
  $("#view-schedule").innerHTML = h;
}
/* a day's sheet: what the day is (the workouts, then cardio or rest), and on a cardio day one home workout on top */
function openDaySheet(j){
  var plan = weekPlan(), d = plan[j]; if(!d) return;
  var cur = choiceOf(d);
  var row = function(c){
    var sel = c === cur, w = isWorkoutDay(c), ic = w ? (isHomeDay(c) ? "house" : "dumbbell") : DAY_ICON[CHOICE_TYPE[c]];
    return '<button class="li choice' + (sel ? " sel" : "") + '" data-act="schedset" data-day="' + j + '" data-choice="' + c + '" aria-pressed="' + sel + '">' +
      '<span class="dot ' + choiceType(c) + '">' + icon(ic) + '</span><span class="liB"><span class="liT">' + esc(w ? dayName(c) : CHOICE_TITLE[c]) + '</span>' +
      '<span class="liS">' + esc(w ? whereText(c, plan) : CHOICE_SUB[c]) + '</span></span>' + (sel ? '<span class="chk">' + icon("check") + '</span>' : '') + '</button>';
  };
  var h = '<div class="daySheet"><div class="sectH">Workout</div><div class="list choiceList">' + workoutDays().map(row).join("") + '</div>' +
    '<div class="sectH">Cardio or rest</div><div class="list choiceList">' + ["z2", "norwegian-4x4", "rest"].map(row).join("") + '</div>';
  if(isCardioType(d.type)) h += '<div class="sectH">Plus a home workout</div><div class="chips homeAdd">' + [""].concat(HOME_DAYS).map(function(hid){
    var sel = (d.home || "") === hid;
    return '<button class="chip' + (sel ? " sel" : "") + '" data-act="schedhome" data-day="' + j + '" data-home="' + hid + '" aria-pressed="' + sel + '">' + esc(hid ? dayName(hid) : "None") + '</button>';
  }).join("") + '</div>';
  openSheet(WEEKDAY_LONG[j], h + '</div>', { cls: "dayCard", closeLabel: "Done" });
}
/* store an edited week of program pid (null when it is the original again) and redraw */
function commitWeekFor(pid, wk){
  if(multiOn() && isOn(pid)) db.weekMix = keepMix(wk);   /* Part 5: several programs on, their one week */
  else if(isOwnPid(pid)) db.userPrograms[pid].week = cleanSchedule(wk, progWorkoutDays(pid), defaultOwnWeekFor(pid));   /* his program's own week */
  else db.schedule = cleanSchedule(wk);
  save();
  if(ui.view === "schedule") renderSchedule(); else if(ui.view === "today") renderToday(); else if(ui.view === "progedit" && typeof renderProgEdit === "function") renderProgEdit();
}
function commitWeek(wk){ commitWeekFor(db.activeProgram, wk); }
/* the week `plan` with day j made choice c, and the toast's words (nothing is stored here). A workout moved here leaves its
   old day as rest (or just leaves the cardio day it rode on); what this day held is off the week, except a home workout on
   top when the day stays cardio. ids = the workouts that week can hold. Names are read before anything moves (a home
   workout is named after the day it sits on) */
function weekChange(plan, j, c, ids){
  var d = plan[j], wk = clone(plan), parts = [], wd = WEEKDAY_LONG[j], gone = [], nm = {}, isW = ids.indexOf(c) >= 0;
  plan.forEach(function(x){ if(x && hasWorkout(x)) nm[x.ref] = dayName(x.ref); if(x && x.home) nm[x.home] = dayName(x.home); });
  if(isW && !(c in nm)) nm[c] = dayName(c);
  var type = choiceType(c), keep = (isCardioType(type) && d.home && d.home !== c) ? d.home : null;
  if(hasWorkout(d)) gone.push(d.ref);
  if(d.home && !keep && d.home !== c) gone.push(d.home);
  if(isW){
    var at = slotOf(c, wk);
    if(at && at.j !== j){
      parts.push(nm[c] + " moved to " + wd);
      if(at.as === "main"){ wk[at.j] = makeDay(at.j, "rest"); parts.push(WEEKDAY_LONG[at.j] + " is now rest"); }
      else delete wk[at.j].home;
    } else parts.push(wd + " is now " + nm[c]);
  } else parts.push(wd + " is now " + (c === "rest" ? "rest" : CHOICE_TITLE[c]));
  wk[j] = makeDay(j, c, keep);
  gone.forEach(function(id){ parts.push(nm[id] + " is off the week"); });
  return { wk: wk, text: parts.join(" · ") };
}
/* day j of the week schedule becomes choice c (weekChange), with an Undo */
function setDayChoice(j, c){
  var plan = weekPlan(), d = plan[j]; if(!d || dayChoices().indexOf(c) < 0) return;
  if(choiceOf(d) === c){ closeModal(); return; }
  var undo = undoPoint(), r = weekChange(plan, j, c, workoutDays());
  commitWeek(r.wk);
  if(isCardioType(choiceType(c))) openDaySheet(j); else closeModal();   /* a cardio day stays open for a home workout on top */
  toast(r.text, { undo: undo });
}
/* the home workout on top of cardio day j (null = none) */
function setDayHome(j, hid){
  var plan = weekPlan(), d = plan[j]; hid = hid || null;
  if(!d || !isCardioType(d.type) || (hid && (typeof HOME_DAYS === "undefined" || HOME_DAYS.indexOf(hid) < 0))) return;
  if((d.home || null) === hid){ closeModal(); return; }
  var nm = namesNow(), undo = undoPoint(), wk = clone(plan), parts = [], wd = WEEKDAY_LONG[j];
  if(hid){
    var at = slotOf(hid, wk);
    if(at){ parts.push(nm[hid] + " moved to " + wd); if(at.as === "main"){ wk[at.j] = makeDay(at.j, "rest"); parts.push(WEEKDAY_LONG[at.j] + " is now rest"); } else delete wk[at.j].home; }
    else parts.push(nm[hid] + " added to " + wd);
    wk[j].home = hid;
  } else delete wk[j].home;
  if(d.home) parts.push(nm[d.home] + " is off the week");
  commitWeek(wk); closeModal();
  toast(parts.join(" · "), { undo: undo });
}
function resetWeek(){
  if(!weekIsCustom()) return;
  var undo = undoPoint(); if(multiOn()) db.weekMix = null; else if(ownActive()) db.userPrograms[db.activeProgram].week = null; else db.schedule = null; save(); renderSchedule();
  toast("Back to the original week", { undo: undo });
}

/* ---------- renaming ---------- */
function openRename(id){
  if(typeof isOwnDay === "function" && isOwnDay(id)){ renameOwnDay(id); return; }   /* his own day: its name in its definition (tracker-editor.js) */
  if(!isWorkoutDay(id)) return;
  var cn = customName(id), def = defaultDayName(id);
  openModal({ title: "Rename workout", mode: "line", value: cn || def, placeholder: def, maxLength: NAME_MAX, cls: "renameSheet",
    html: '<div class="renameHint">Leave it empty for the default name, ' + esc(def) + '.</div>' +
      (cn ? '<button class="btn ghost block renameReset" data-act="renamereset" data-prog="' + id + '">' + icon("undo") + 'Reset name</button>' : ''),
    onSubmit: function(v){ saveDayName(id, v); } });
}
/* store a name: trimmed, at most 30 characters; empty or the default = no name of his own */
function saveDayName(id, v){
  if(!isWorkoutDay(id)) return;
  var before = dayName(id), t = String(v == null ? "" : v).replace(/\s+/g, " ").trim().slice(0, NAME_MAX).trim();
  if(t === defaultDayName(id)) t = "";
  if((t || null) === customName(id)) return;   /* nothing changes */
  var undo = undoPoint();
  if(!db.dayNames || typeof db.dayNames !== "object" || Array.isArray(db.dayNames)) db.dayNames = {};
  if(t) db.dayNames[id] = t; else delete db.dayNames[id];
  save();
  if(ui.view === "programs") renderPlan(); else if(ui.view === "schedule") renderSchedule(); else showView(ui.view);
  toast(t ? before + " is now called " + t : "Name back to " + dayName(id), { undo: undo });
}

/* the Android back button: from the editor back to where it was opened (Today or More); after the sheet closer */
if(window.Native && Array.isArray(Native.backHandlers)) Native.backHandlers.splice(1, 0, function(){
  if(typeof ui !== "undefined" && ui && ui.view === "schedule" && typeof showView === "function"){ showView(ui.schedFrom === "today" ? "today" : "more"); return true; }
  return false;
});
