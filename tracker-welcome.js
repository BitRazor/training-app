"use strict";
/* tracker-welcome.js: a friend's first start, part 7 of the friends' version (2026-11-22; plan.md "The design" 7; Claude's
   calls in decisions.md 2026-11-22 "A friend's first start: how"). Only an empty phone (no stored data when the app
   starts: load() sets db.welcomeOpen) opens on it instead of Today; a phone with data never does.
   1 Welcome and an optional name; 2 pick one of the starter programs (tracker-starters.js) or build your own; 3 the training
   days, the program's weekdays to begin with, exactly as many as it has days. Start adds the program with its days on
   those weekdays and makes it the one trained. Finishing or skipping ends the start for good and marks the phone as
   started fresh (db.startedFresh): none of the original program's home workouts (HOME_DAYS emptied at load, tracker.js
   normalize) and the general warm-up below (warmupFor, tracker-plan.js).
   Loaded after tracker-starters.js, before the actions and the core. */

var WARMUP_GENERAL = [
  { gif: "wu_easycardio", name: "Easy cardio", detail: "5 min on a bike, rower or treadmill: enough to feel warm.", nopic: true },
  { gif: "wu_lightsets", name: "Lighter sets first", detail: "Before the first exercise, 1 or 2 sets with about half the weight.", nopic: true }
];
var WEL_NAME_MAX = 30;

function welState(){ if(!ui.wel) ui.wel = { step: 1, name: "", pick: null, days: [] }; return ui.wel; }
function renderWelcome(){
  var s = welState(), h = '<div class="welWrap">';
  if(s.step === 1){
    h += '<div class="welKick">Training</div><h1 class="welH">Welcome</h1>' +
      '<p class="welP">This app plans your gym week. After each session it suggests your next weight and reps.</p>' +
      '<label class="welLbl" for="welName">What should the app call you?</label>' +
      '<input id="welName" class="welIn" type="text" maxlength="' + WEL_NAME_MAX + '" autocomplete="given-name" placeholder="Your name (optional)" value="' + esc(s.name) + '">' +
      '<button class="btn primary block" data-act="welnext">Next</button>' +
      '<button class="btn block welSkip" data-act="welskip">Skip, I\'ll look around</button>';
  } else if(s.step === 2){
    h += '<h1 class="welH">Pick a program</h1><p class="welP">Ready-made gym programs. You can change anything in them later.</p>' +
      STARTER_PROGRAMS.map(function(P){ return welPickHtml(P.id, P.name, starterSubText(P, false), P.desc); }).join("") +
      welPickHtml("own", "I'll build my own", "", "Start from an empty program in the editor.") +
      '<div class="welBtns"><button class="btn" data-act="welback">Back</button><button class="btn primary" data-act="welnext"' + (s.pick ? '' : ' disabled') + '>Next</button></div>';
  } else {
    var P = starterById(s.pick), n = P.days.length, got = s.days.length;
    h += '<h1 class="welH">Your training days</h1><p class="welP">' + esc(P.name) + ' trains ' + n + ' days a week. Pick ' + n + ' days' + (n < 6 ? ': a rest day between them helps.' : '.') + '</p>' +
      '<div class="welDays">' + STAR_WD.map(function(w, j){ var on = s.days.indexOf(j) >= 0; return '<button class="welDay' + (on ? ' sel' : '') + '" data-act="welday" data-wd="' + j + '" aria-pressed="' + on + '">' + w + '</button>'; }).join("") + '</div>' +
      '<div class="welCount">' + got + ' of ' + n + ' picked</div>' +
      '<div class="welBtns"><button class="btn" data-act="welback">Back</button><button class="btn primary" data-act="welstart"' + (got === n ? '' : ' disabled') + '>Start</button></div>';
  }
  $("#view-welcome").innerHTML = h + '</div>';
}
function welPickHtml(id, name, sub, desc){
  var on = welState().pick === id;
  return '<button class="welPick' + (on ? ' sel' : '') + '" data-act="welpick" data-star="' + esc(id) + '" aria-pressed="' + on + '"><span class="welPickNm">' + esc(name) + '</span>' +
    (sub ? '<span class="welPickSub">' + esc(sub) + '</span>' : '') + '<span class="welPickDesc">' + esc(desc) + '</span></button>';
}
/* the end of the start (Start, Skip or build your own): the phone counts as started fresh from here on */
function finishWelcome(pick){
  var s = welState(), nm = String(s.name || "").replace(/\s+/g, " ").trim().slice(0, WEL_NAME_MAX);
  if(nm) db.profile.name = nm;
  db.startedFresh = true; delete db.welcomeOpen;
  if(typeof HOME_DAYS !== "undefined") HOME_DAYS.length = 0;   /* none of the original program's home workouts */
  db.schedule = cleanSchedule(db.schedule || CURRENT_WEEK);      /* the built-in week without them */
  ui.wel = null;
  if(pick === "own"){ save(); newProgram(); return; }
  var first = null;
  if(pick && starterById(pick)){
    var wd = s.days.slice().sort(), pid = addStarter(pick, wd, true);
    if(pid){ startTraining(pid); first = { day: dayName(db.userPrograms[pid].days[0]), wd: wd[0] }; }
  }
  save(); showView("today");
  if(first) toast("You're set. Your first workout: " + first.day + " on " + WEEKDAY_LONG[first.wd] + ".");
}
function welcomeClick(act, t){
  var s = welState();
  switch(act){
    case "welnext":
      if(s.step === 1){ var inp = document.getElementById("welName"); s.name = inp ? inp.value : ""; s.step = 2; }
      else if(s.step === 2 && s.pick){ if(s.pick === "own"){ finishWelcome("own"); return true; } var P = starterById(s.pick); if(!P) return true; if(s.days.length !== P.days.length || s.daysFor !== P.id){ s.days = P.weekdays.slice(); s.daysFor = P.id; } s.step = 3; }
      renderWelcome(); window.scrollTo(0, 0); return true;
    case "welback": if(s.step === 2){ s.step = 1; } else if(s.step === 3){ s.step = 2; } renderWelcome(); return true;
    case "welskip": finishWelcome(null); return true;
    case "welpick": s.pick = t.getAttribute("data-star"); renderWelcome(); return true;
    case "welday": var j = +t.getAttribute("data-wd"), k = s.days.indexOf(j); if(k >= 0) s.days.splice(k, 1); else s.days.push(j); s.days.sort(); renderWelcome(); return true;
    case "welstart": var Q = starterById(s.pick); if(Q && s.days.length === Q.days.length) finishWelcome(s.pick); return true;
  }
  return false;
}
