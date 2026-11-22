"use strict";
/* tracker-starters.js: the starter programs, part 6 of the friends' version (2026-11-22; plan.md "The design" 6; Claude's calls
   in decisions.md 2026-11-22 "The starter programs: how"). Six ready-made gym programs on Programs; "Add to my programs" makes
   one a program of his own (tracker-editor.js: the smart rule, every edit, its own week), so nothing built in changes and the
   copy is free to change. Nothing is stored until a program is added.
   - A day's entries: [exercise id, sets, superset number (0: none), reps from, reps up to]; without a range the core list's
     (tracker-catalog.js coreOf); the rest is automatic (autoRestFor), as for an exercise added in the editor.
   - Weekly sets per muscle group, counted the fractional way (a set counts 1 for the exercise's main muscle, 0.5 for a helper:
     Pelland and others 2026, doi 10.1007/s40279-025-02344-w): 10 to 20 for chest, back, shoulders, front and back thighs,
     glutes, biceps and triceps (10 or more grew the most: Schoenfeld and others 2017, doi 10.1080/02640414.2016.1210197;
     12-20 an optimum for trained men, no clear gain above 20 for thighs and biceps: Baz-Valle and others 2022,
     doi 10.2478/hukin-2022-0017). Each big muscle at least twice a week (Schoenfeld and others 2016,
     doi 10.1007/s40279-016-0543-8), except push, pull, legs on 3 days: once, with all its sets (with the weekly sets equal,
     how often matters little for muscle: Schoenfeld and others 2019, doi 10.1080/02640414.2018.1555906).
   - Ranges: the core list's (moderate loads grow muscle as well as heavy ones); the strength program's main lifts 4-6 and its
     deadlift 3-5 (heavier loads give more strength: Lopez and others 2021, doi 10.1249/MSS.0000000000002585).
   - A superset stays inside one equipment area (free weights, or machines and cables), pairs different main muscles and
     holds at most one big compound.
   - Weekdays: 2 days Mon, Thu; 3 days Mon, Wed, Fri; 4 days Mon, Tue, Thu, Fri; 6 days Mon to Sat; the other days rest.
   Loaded after tracker-catalog.js, before the actions and the core. */

var STARTER_PROGRAMS = [
  { id: "st-full-2", name: "Full body · 2 days", weekdays: [0, 3], desc: "Every big muscle twice a week, in two longer sessions.", days: [
    { name: "Full body A", entries: [["fedb:Barbell_Squat", 4], ["fedb:Barbell_Bench_Press_-_Medium_Grip", 4], ["cable-pulldown", 3, 1], ["leg-curl", 3, 1], ["fedb:Barbell_Hip_Thrust", 4],
      ["fedb:Seated_Dumbbell_Press", 3, 2], ["fedb:One-Arm_Dumbbell_Row", 3, 2], ["fedb:Dumbbell_Bicep_Curl", 2, 3], ["fedb:Standing_Dumbbell_Triceps_Extension", 2, 3]] },
    { name: "Full body B", entries: [["fedb:Leg_Press", 4], ["rdl", 3], ["fedb:Seated_Cable_Rows", 3, 1], ["fedb:Leverage_Chest_Press", 3, 1], ["fedb:Close-Grip_Front_Lat_Pulldown", 3, 2],
      ["fedb:Triceps_Pushdown_-_Rope_Attachment", 2, 2], ["fedb:Incline_Dumbbell_Press", 3, 3], ["fedb:Hammer_Curls", 2, 3], ["fedb:Dumbbell_Lunges", 2]] } ] },
  { id: "st-full-3", name: "Full body · 3 days", weekdays: [0, 2, 4], desc: "Every big muscle on each of the three days. A good first program.", days: [
    { name: "Full body A", entries: [["fedb:Barbell_Squat", 3], ["fedb:Barbell_Bench_Press_-_Medium_Grip", 4], ["cable-pulldown", 4, 1], ["leg-curl", 3, 1],
      ["fedb:Dumbbell_Bicep_Curl", 2, 2], ["fedb:Standing_Dumbbell_Triceps_Extension", 2, 2], ["fedb:Cable_Crunch", 2]] },
    { name: "Full body B", entries: [["rdl", 3], ["fedb:Seated_Dumbbell_Press", 3], ["fedb:Seated_Cable_Rows", 3, 1], ["fedb:Leg_Extensions", 3, 1], ["fedb:Dumbbell_Lunges", 3],
      ["fedb:Cable_Crossover", 3, 2], ["fedb:Cable_Rear_Delt_Fly", 2, 2]] },
    { name: "Full body C", entries: [["fedb:Leg_Press", 3], ["fedb:Incline_Dumbbell_Press", 3, 1], ["fedb:One-Arm_Dumbbell_Row", 3, 1], ["fedb:Barbell_Hip_Thrust", 4],
      ["fedb:Triceps_Pushdown_-_Rope_Attachment", 3, 2], ["fedb:Cable_Hammer_Curls_-_Rope_Attachment", 3, 2]] } ] },
  { id: "st-upper-lower-4", name: "Upper and lower · 4 days", weekdays: [0, 1, 3, 4], desc: "Upper body and lower body on their own days, each twice a week.", days: [
    { name: "Upper A", entries: [["fedb:Barbell_Bench_Press_-_Medium_Grip", 4], ["cable-pulldown", 3, 1], ["fedb:Cable_Seated_Lateral_Raise", 2, 1], ["fedb:Seated_Dumbbell_Press", 3, 2],
      ["fedb:One-Arm_Dumbbell_Row", 3, 2], ["fedb:Dumbbell_Bicep_Curl", 2, 3], ["fedb:Standing_Dumbbell_Triceps_Extension", 2, 3]] },
    { name: "Lower A", entries: [["fedb:Barbell_Squat", 4], ["rdl", 3], ["leg-curl", 3, 1], ["fedb:Leg_Extensions", 3, 1], ["calf-raise-standing", 3], ["fedb:Cable_Crunch", 3]] },
    { name: "Upper B", entries: [["fedb:Incline_Dumbbell_Press", 3], ["fedb:Seated_Cable_Rows", 3, 1], ["fedb:Leverage_Chest_Press", 3, 1], ["fedb:Close-Grip_Front_Lat_Pulldown", 3],
      ["fedb:Seated_Side_Lateral_Raise", 3], ["fedb:Triceps_Pushdown_-_Rope_Attachment", 2, 2], ["fedb:Cable_Hammer_Curls_-_Rope_Attachment", 2, 2]] },
    { name: "Lower B", entries: [["fedb:Leg_Press", 4], ["fedb:Barbell_Hip_Thrust", 3], ["fedb:Dumbbell_Lunges", 3], ["leg-curl", 3], ["calf-raise-standing", 3]] } ] },
  { id: "st-ppl-3", name: "Push, pull, legs · 3 days", weekdays: [0, 2, 4], desc: "Pushing, pulling and legs on their own days: each muscle once a week, with all its sets.", days: [
    { name: "Push", entries: [["fedb:Barbell_Bench_Press_-_Medium_Grip", 4], ["fedb:Seated_Dumbbell_Press", 3], ["fedb:Incline_Dumbbell_Press", 3], ["fedb:Cable_Crossover", 3, 1],
      ["fedb:Triceps_Pushdown_-_Rope_Attachment", 3, 1], ["fedb:Cable_Seated_Lateral_Raise", 2], ["triceps-overhead", 2]] },
    { name: "Pull", entries: [["cable-pulldown", 4], ["fedb:Bent_Over_Barbell_Row", 3], ["fedb:Seated_Cable_Rows", 3], ["face-pulls", 3, 1], ["fedb:Cable_Hammer_Curls_-_Rope_Attachment", 3, 1],
      ["fedb:Dumbbell_Bicep_Curl", 3], ["fedb:Cable_Crunch", 2]] },
    { name: "Legs", entries: [["fedb:Barbell_Squat", 4], ["rdl", 3], ["fedb:Leg_Press", 3], ["leg-curl", 3, 1], ["fedb:Leg_Extensions", 3, 1], ["fedb:Barbell_Hip_Thrust", 4], ["fedb:Dumbbell_Lunges", 2]] } ] },
  { id: "st-ppl-6", name: "Push, pull, legs · 6 days", weekdays: [0, 1, 2, 3, 4, 5], desc: "Push, pull and legs twice a week, in short sessions.", days: [
    { name: "Push A", entries: [["fedb:Barbell_Bench_Press_-_Medium_Grip", 4], ["fedb:Seated_Dumbbell_Press", 3], ["fedb:Cable_Crossover", 2, 1], ["fedb:Triceps_Pushdown_-_Rope_Attachment", 3, 1]] },
    { name: "Pull A", entries: [["fedb:Pullups", 4], ["fedb:Seated_Cable_Rows", 3], ["face-pulls", 2, 1], ["fedb:Cable_Hammer_Curls_-_Rope_Attachment", 3, 1], ["fedb:Cable_Crunch", 2]] },
    { name: "Legs A", entries: [["fedb:Barbell_Squat", 4], ["rdl", 3], ["leg-curl", 3, 1], ["fedb:Leg_Extensions", 3, 1], ["calf-raise-standing", 3]] },
    { name: "Push B", entries: [["fedb:Standing_Military_Press", 3], ["fedb:Incline_Dumbbell_Press", 3], ["fedb:Leverage_Chest_Press", 2, 1], ["fedb:Cable_Seated_Lateral_Raise", 3, 1], ["fedb:EZ-Bar_Skullcrusher", 3]] },
    { name: "Pull B", entries: [["fedb:Bent_Over_Barbell_Row", 3], ["cable-pulldown", 3], ["fedb:EZ-Bar_Curl", 3], ["fedb:Hammer_Curls", 2], ["fedb:Cable_Crunch", 2]] },
    { name: "Legs B", entries: [["fedb:Leg_Press", 4], ["fedb:Barbell_Hip_Thrust", 3], ["fedb:Dumbbell_Lunges", 3], ["leg-curl", 3], ["calf-raise-standing", 3]] } ] },
  { id: "st-strength-3", name: "Strength · 3 days", weekdays: [0, 2, 4], desc: "Heavier squat, bench press, deadlift and overhead press for strength, with lighter extra work.", days: [
    { name: "Strength A", entries: [["fedb:Barbell_Squat", 4, 0, 4, 6], ["fedb:Barbell_Bench_Press_-_Medium_Grip", 4, 0, 4, 6], ["fedb:Bent_Over_Barbell_Row", 3],
      ["fedb:Dumbbell_Bicep_Curl", 3, 1], ["fedb:Standing_Dumbbell_Triceps_Extension", 3, 1], ["fedb:Cable_Crunch", 2]] },
    { name: "Strength B", entries: [["fedb:Barbell_Deadlift", 3, 0, 3, 5], ["fedb:Standing_Military_Press", 4, 0, 4, 6], ["fedb:Pullups", 3], ["leg-curl", 3], ["fedb:Barbell_Hip_Thrust", 4]] },
    { name: "Strength C", entries: [["fedb:Barbell_Squat", 3, 0, 4, 6], ["fedb:Barbell_Bench_Press_-_Medium_Grip", 3, 0, 4, 6], ["fedb:One-Arm_Dumbbell_Row", 3, 1], ["fedb:Incline_Dumbbell_Press", 3, 1],
      ["fedb:Split_Squat_with_Dumbbells", 2], ["fedb:Hammer_Curls", 3]] } ] }
];
var STAR_WD = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function starterById(id){ for(var i = 0; i < STARTER_PROGRAMS.length; i++) if(STARTER_PROGRAMS[i].id === id) return STARTER_PROGRAMS[i]; return null; }
/* a template entry as a program entry, the way the editor's picker makes one: the template's range, else the core list's; rest auto */
function starterEntry(t){
  var id = t[0], ex = exById(id) || {}, co = coreOf(id), r = smartRange({}, ex), en = { exerciseId: id, block: "main", sets: t[1] };
  if(r.unit === "reps" && smartKind({}, ex) !== "effort"){ var cr = !!co && co.unit === "reps"; en.repLo = t[3] || (cr ? co.lo : r.lo); en.repHi = t[4] || (cr ? co.hi : r.hi); }
  if(t[2]) en.ss = t[2];
  en.restAuto = true; en.restSec = autoRestFor(en) || 90;
  return en;
}
function starterDays(P){ return P.days.map(function(d){ return { name: d.name, entries: d.entries.map(starterEntry) }; }); }
/* a set's time: 4.5 s a rep at the middle of the entry's range, both sides for a one-sided lift, plus 10 s (a hold: its seconds + 10) */
function entrySetSec(en){
  var ex = exById(en.exerciseId) || {}, r = smartRange(en, ex), c = coreCatalogEntry(en.exerciseId), mid = (r.lo + r.hi) / 2, uni = !!c && c.laterality === "unilateral";
  return round5(r.unit === "s" ? mid + 10 : mid * 4.5 * (uni ? 2 : 1) + 10);
}
/* a day's minutes, rounded to 5: each exercise or superset its sets' time, the rests between its rounds (a superset's longest)
   and 1:30 to move on; no rest after the last round */
function dayMinutes(entries){
  var sec = 0, i = 0;
  while(i < entries.length){
    var j = i + 1; if(entries[i].ss) while(j < entries.length && entries[j].ss === entries[i].ss) j++;
    var rounds = 0, rest = 0;
    entries.slice(i, j).forEach(function(e){ sec += e.sets * entrySetSec(e); rounds = Math.max(rounds, e.sets); rest = Math.max(rest, e.restSec || 0); });
    sec += (rounds - 1) * rest + 90; i = j;
  }
  return Math.round(sec / 300) * 5;
}
function starWeekdays(w){ return w.join() === "0,1,2,3,4,5" ? "Mon to Sat" : w.map(function(j){ return STAR_WD[j]; }).join(", "); }
function starNums(en){ return en.repLo ? en.sets + " × " + en.repLo + "–" + en.repHi : en.sets + (en.sets === 1 ? " set" : " sets"); }
/* "3 days a week · Mon, Wed, Fri · about 45–50 min" (without the weekdays for the first start, where they are picked next) */
function starterSubText(P, withDays){
  var mins = starterDays(P).map(function(d){ return dayMinutes(d.entries); }), lo = Math.min.apply(null, mins), hi = Math.max.apply(null, mins);
  return P.days.length + ' days a week · ' + (withDays ? starWeekdays(P.weekdays) + ' · ' : '') + 'about ' + (lo === hi ? lo : lo + '–' + hi) + ' min';
}
function starterCardHtml(P){
  var days = starterDays(P), mins = days.map(function(d){ return dayMinutes(d.entries); });
  return '<div class="card starItem"><div class="starNm">' + esc(P.name) + '</div>' +
    '<div class="starSub">' + starterSubText(P, true) + '</div>' +
    '<div class="progDesc">' + esc(P.desc) + '</div>' +
    '<details class="starDays"><summary>See the exercises' + icon("chevD", "wuChev") + '</summary>' +
    days.map(function(d, k){ var tags = pairTags(d.entries);
      return '<div class="starDay"><div class="starDayNm">' + esc(d.name) + ' · about ' + mins[k] + ' min</div>' +
        d.entries.map(function(en, i){ var ex = exById(en.exerciseId) || { name: en.exerciseId };
          return '<div class="starEx">' + (tags[i] ? '<b class="starTag">' + tags[i] + '</b> ' : '') + esc(ex.name) + ' · <span class="starN">' + starNums(en) + '</span></div>'; }).join("") + '</div>'; }).join("") +
    '</details><button class="btn tonal block" data-act="staradd" data-star="' + esc(P.id) + '">' + icon("plus") + 'Add to my programs</button></div>';
}
function starterSectionHtml(){
  return '<div class="sectH">Starter programs</div><div class="note starNote">Ready-made gym programs. Add one to your programs, then switch to it or turn it on: you can change anything in it.</div>' +
    STARTER_PROGRAMS.map(starterCardHtml).join("");
}
/* a name no program of his has yet: "Full body · 3 days", then "Full body · 3 days (2)" */
function freeProgName(nm){
  var used = Object.keys(db.userPrograms || {}).map(function(k){ return db.userPrograms[k].name; });
  if(used.indexOf(nm) < 0) return nm;
  for(var n = 2; ; n++){ var s = nm + " (" + n + ")"; if(used.indexOf(s) < 0) return s; }
}
/* Add to my programs: a program of his own with the template's days, its days on the template's weekdays (the others rest).
   Part 7, the first start: weekdays picked there (as many as the program has days), and quiet (no toast, no scroll) */
function addStarter(sid, weekdays, quiet){
  var P = starterById(sid); if(!P || !db) return null;
  var wd = (Array.isArray(weekdays) && weekdays.length === P.days.length) ? weekdays.slice().sort() : P.weekdays;
  var undo = undoPoint(), pid = newId(OWN_PREFIX), days = [];
  P.days.forEach(function(d){ var id = newId(OWN_DAY_PREFIX); db.userDays[id] = { id: id, name: d.name, entries: d.entries.map(starterEntry) }; days.push(id); });
  var nm = freeProgName(P.name).slice(0, PROG_NAME_MAX);
  db.userPrograms[pid] = { id: pid, name: nm, days: days, own: true };
  syncPrograms(); applyDays();   /* its days in the day tracks, so its week can hold them */
  db.userPrograms[pid].week = cleanWeek([0, 1, 2, 3, 4, 5, 6].map(function(j){ var k = wd.indexOf(j); return makeDay(j, k >= 0 ? days[k] : "rest"); }), progWorkoutDays(pid));
  afterEdit();
  if(quiet) return pid;
  /* its new card sits above the starter cards: bring it into view */
  var b = document.querySelector('#view-library [data-act="progedit"][data-prog="' + pid + '"]'), card = b && b.closest(".progItem");
  if(card && card.scrollIntoView) card.scrollIntoView({ block: "center", behavior: "smooth" });
  toast(nm + " added to your programs", { undo: undo });
  return pid;
}
