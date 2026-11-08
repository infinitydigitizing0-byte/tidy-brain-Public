"use strict";
/* TidyBrain — ADHD cleaning planner. All data stays in this browser (localStorage). */
const KEY = "tidybrain.v1";
const $ = id => document.getElementById(id);
const esc = s => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const uid = () => Math.random().toString(36).slice(2, 9);
const pad = n => String(n).padStart(2, "0");
const ymd = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const pd = s => { const [y, m, d] = s.split("-").map(Number); return new Date(y, m - 1, d); };
const today = () => ymd(new Date());
const addD = (s, n) => { const d = pd(s); d.setDate(d.getDate() + n); return ymd(d); };
const diffD = (a, b) => Math.round((pd(b) - pd(a)) / 864e5);
const dow = s => pd(s).getDay();
const DN = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MN = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const fmtD = s => { const d = pd(s); return `${DN[d.getDay()]} ${d.getDate()} ${MN[d.getMonth()].slice(0, 3)}`; };
const ord = n => n + (n % 10 === 1 && n !== 11 ? "st" : n % 10 === 2 && n !== 12 ? "nd" : n % 10 === 3 && n !== 13 ? "rd" : "th");
const byId = (a, id) => a.find(x => x.id === id);
const COLORS = ["#4A7FE8", "#EE6F9A", "#2DBE96", "#F2B630", "#8E73E6", "#F08A4B", "#3BB4D8"];

/* ---------- starter packs ---------- */
const ROOMS = [
  ["kitchen", "Kitchen", "🍳"], ["bath", "Bathroom", "🛁"], ["bed", "Bedroom", "🛏️"], ["living", "Living room", "🛋️"],
  ["laundry", "Laundry", "🧺"], ["entry", "Entryway", "🚪"], ["kids", "Kids' room", "🧸"], ["office", "Home office", "💻"], ["home", "Whole home", "🏠"]];
// [name, minutes, energy 1-3, freq]
const D = n => ({ t: "daily" }), W = (...d) => ({ t: "weekly", days: d }), E = n => ({ t: "every", n }), M = day => ({ t: "monthly", day });
const PACKS = {
  kitchen: [["Wash dishes / load dishwasher", 10, 1, D()], ["Wipe counters", 5, 1, D()], ["Take out the trash", 3, 1, W(1, 4)], ["Clean the sink", 5, 1, E(3)], ["Clean the microwave", 5, 1, W(3)], ["Wipe appliances", 10, 2, W(6)], ["Mop kitchen floor", 15, 2, W(6)], ["Clean out the fridge", 20, 3, M(1)]],
  bath: [["Wipe sink & mirror", 5, 1, E(2)], ["Clean the toilet", 10, 2, W(2, 5)], ["Scrub shower / tub", 20, 3, W(6)], ["Swap towels", 3, 1, W(0)], ["Mop bathroom floor", 10, 2, W(6)], ["Restock toilet paper & soap", 2, 1, W(0)]],
  bed: [["Make the bed", 2, 1, D()], ["Clothes off the floor", 5, 1, D()], ["Change the sheets", 15, 2, W(0)], ["Dust surfaces", 10, 1, W(3)], ["Vacuum bedroom", 10, 2, W(6)], ["Clear the nightstand", 5, 1, W(4)]],
  living: [["5-minute tidy", 5, 1, D()], ["Fold blankets & fluff pillows", 3, 1, E(2)], ["Wipe the coffee table", 3, 1, E(2)], ["Dust TV & shelves", 10, 1, W(4)], ["Vacuum living room", 15, 2, W(3, 6)]],
  laundry: [["Start a load of laundry", 5, 1, E(2)], ["Fold & put away laundry", 15, 2, E(2)], ["Clean the lint trap", 2, 1, W(1)], ["Wash bedding & towels", 10, 2, W(0)]],
  entry: [["Shoes & bags in their place", 3, 1, D()], ["Sort the mail", 5, 1, W(1, 4)], ["Sweep the entry", 5, 1, W(5)]],
  kids: [["Toy pick-up", 10, 1, D()], ["Change kids' sheets", 15, 2, W(0)], ["Sort outgrown clothes", 20, 3, M(15)]],
  office: [["Clear the desk", 5, 1, D()], ["File papers", 10, 2, W(5)], ["Wipe keyboard & screen", 5, 1, W(1)]],
  home: [["Water the plants", 5, 1, E(3)], ["Empty all the bins", 10, 1, W(0)], ["Wipe light switches & handles", 10, 1, M(10)], ["Clean the windows", 30, 3, M(20)]]
};
const TEMPLATES = [
  ["🍳", "Kitchen deep clean", ["Empty & wipe the fridge", "Degrease the stovetop", "Clean oven door & racks", "Wipe cabinet fronts", "Descale the kettle", "Clean the dishwasher filter", "Wipe backsplash", "Scrub the sink & tap", "Mop the floor"]],
  ["🛁", "Bathroom deep clean", ["Spray shower & leave 10 min", "Scrub tiles & grout", "Clean toilet inside & out", "Wipe sink, tap & mirror", "Wash the bath mat", "Clear expired products", "Wipe the door & handle", "Mop the floor"]],
  ["🛏️", "Bedroom reset", ["Open a window", "Clothes: wash, hang or fold", "Clear the nightstand", "Change the sheets", "Dust surfaces", "Put 5 things back where they live", "Vacuum"]],
  ["✨", "Before guests arrive (20 min)", ["Clear the entryway", "Wipe bathroom sink & toilet", "Fresh hand towel", "Clear kitchen counters", "Load the dishwasher", "Fluff cushions", "Take out trash", "Light a candle"]],
  ["🧺", "Laundry day", ["Sort lights / darks", "Load 1", "Load 2", "Dry & fold", "Put everything away (yes, today!)", "Clean the lint trap"]],
  ["📦", "Doom-box sort", ["Grab one box or pile", "Trash first", "Things that belong in another room", "Things to donate", "Things to keep — give them a home", "Celebrate 🎉"]],
  ["🌸", "Spring clean", ["Wash windows", "Clean curtains", "Dust light fittings", "Wipe skirting boards", "Flip the mattress", "Clean behind furniture", "Swap winter clothes"]],
  ["🚚", "Moving out", ["Empty all cupboards", "Clean inside the oven", "Defrost the freezer", "Wipe walls & marks", "Clean windows inside", "Vacuum & mop every room", "Take meter photos"]],
  ["🚗", "Car clean", ["Remove all trash", "Shake out floor mats", "Vacuum seats", "Wipe dashboard", "Clean windows inside", "Restock tissues"]]
];
const DECLUTTER = ["Expired food in the fridge", "Old receipts & papers", "The junk drawer", "Socks without a pair", "Expired medicine & makeup", "Old chargers & cables", "Mugs & water bottles", "Bathroom cabinet", "Spices & pantry", "Clothes you haven't worn in a year", "Shoes", "Bags & purses", "Books you won't re-read", "Broken or outgrown toys", "Under the bed", "Linen closet", "Tubs without lids", "Freezer & fridge door", "Desk & office supplies", "Phone photos & apps", "Unsubscribe from 20 emails", "The car", "Coats & entryway", "Cleaning supplies", "Craft & hobby stuff", "Sentimental box (just 5 items)", "Decor you don't love", "Kitchen gadgets", "Garage or storage", "The doom pile — finale! 🎉"];
const CHEER = ["You've got this — just start the timer.", "Messy is fine. Moving is the win.", "One thing at a time. That's the whole trick.", "Tiny steps still count.", "You don't need motivation — you need 5 minutes.", "Future you says thank you 💛", "Body-doubling with you right now 👋", "Done is better than perfect."];

/* ---------- state ---------- */
function blank() {
  return { v: 1, name: "", theme: "light", sound: true, onboarded: false, created: today(), rooms: [], tasks: [], done: {}, people: [], rewards: [], redeemed: [], lists: [], declutter: { start: "", done: {}, items: 0 }, brain: [], sessions: [] };
}
let S;
try { S = JSON.parse(localStorage.getItem(KEY)) || blank(); } catch (e) { S = blank(); }
S = Object.assign(blank(), S);
function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { toast("Couldn't save — storage is full"); } }

let view = "today", sel = {}, filt = { en: "all", who: "" }, timer = { left: 600, total: 600, run: false, task: null, int: null, cheer: 0 };

/* ---------- scheduling ---------- */
function occurs(t, ds) {
  if (t.paused || ds < t.start) return false;
  const f = t.freq;
  if (f.t === "daily") return true;
  if (f.t === "weekly") return f.days.includes(dow(ds));
  if (f.t === "every") return diffD(t.start, ds) % Math.max(1, f.n) === 0;
  if (f.t === "monthly") { const d = pd(ds), last = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate(); return d.getDate() === Math.min(f.day, last); }
  if (f.t === "once") return ds === f.date;
  return false;
}
function lastOcc(t, ds) { for (let i = 0; i < 35; i++) { const d = addD(ds, -i); if (d < t.start) return null; if (occurs(t, d)) return d; } return null; }
const isDone = (t, ds) => !!(S.done[ds] && t.id in S.done[ds]);
function doneSince(t, from, to) { for (let d = from; d <= to; d = addD(d, 1)) if (isDone(t, d)) return d; return null; }
// tasks for a day: { t, carried: date|null }
function dueOn(ds) {
  const out = [];
  for (const t of S.tasks) {
    if (occurs(t, ds)) { out.push({ t, carried: null }); continue; }
    if (t.carry && t.freq.t !== "daily" && ds === today()) {
      const lo = lastOcc(t, ds);
      if (lo && lo < ds && !doneSince(t, lo, addD(ds, -1))) out.push({ t, carried: lo });
    }
  }
  return out;
}
function dayStats(ds) { const l = dueOn(ds); return { due: l.length, done: l.filter(x => isDone(x.t, ds)).length }; }
function freqTxt(f) {
  if (f.t === "daily") return "Every day";
  if (f.t === "weekly") return f.days.length === 7 ? "Every day" : f.days.slice().sort((a, b) => ((a + 6) % 7) - ((b + 6) % 7)).map(d => DN[d]).join(", ");
  if (f.t === "every") return f.n === 1 ? "Every day" : `Every ${f.n} days`;
  if (f.t === "monthly") return `Monthly · ${ord(f.day)}`;
  if (f.t === "once") return `Once · ${fmtD(f.date)}`;
  return "";
}
const room = id => byId(S.rooms, id) || { n: "Anywhere", e: "📍", id: "" };
const person = id => byId(S.people, id);
function nextDue(t) { for (let i = 1; i < 62; i++) { const d = addD(today(), i); if (occurs(t, d)) return d; } return null; }

/* ---------- stats ---------- */
function totalDone() { let n = 0; for (const d in S.done) n += Object.keys(S.done[d]).length; return n; }
function activeDay(d) { return S.done[d] && Object.keys(S.done[d]).length > 0; }
function streak() { let d = today(); if (!activeDay(d)) d = addD(d, -1); let n = 0; while (activeDay(d)) { n++; d = addD(d, -1); } return n; }
function bestStreak() { const ds = Object.keys(S.done).filter(activeDay).sort(); let b = 0, c = 0, p = null; for (const d of ds) { c = p && diffD(p, d) === 1 ? c + 1 : 1; b = Math.max(b, c); p = d; } return b; }
function minutesDone(from, to) { let m = 0; for (const d in S.done) if ((!from || d >= from) && (!to || d <= to)) for (const id in S.done[d]) { const t = byId(S.tasks, id); if (t) m += t.min; } return m + S.sessions.filter(s => (!from || s.d >= from) && (!to || s.d <= to) && !s.task).reduce((a, s) => a + 0, 0); }
function doneCount(from, to) { let n = 0; for (const d in S.done) if (d >= from && d <= to) n += Object.keys(S.done[d]).length; return n; }
function points(pid) {
  let p = 0;
  for (const d in S.done) for (const id in S.done[d]) if (S.done[d][id] === pid) { const t = byId(S.tasks, id); p += t ? t.pts : 5; }
  return p - S.redeemed.filter(r => r.pid === pid).reduce((a, r) => a + r.cost, 0);
}
function earnedIn(pid, from, to) { let p = 0, n = 0; for (const d in S.done) if (d >= from && d <= to) for (const id in S.done[d]) if (S.done[d][id] === pid) { const t = byId(S.tasks, id); p += t ? t.pts : 5; n++; } return { p, n }; }
function perfectDays() { let n = 0; for (const d in S.done) { const s = dayStats(d); if (s.due && s.done >= s.due) n++; } return n; }
function declDay() { return S.declutter.start ? Math.min(30, diffD(S.declutter.start, today()) + 1) : 0; }
function declDone() { return Object.keys(S.declutter.done).length; }
const MS = [
  ["🌱", "First sparkle", "Tick off your first task", () => totalDone() >= 1],
  ["🧽", "Getting going", "10 tasks done", () => totalDone() >= 10],
  ["🫧", "Bubble builder", "50 tasks done", () => totalDone() >= 50],
  ["💯", "Century", "100 tasks done", () => totalDone() >= 100],
  ["🏅", "Clean machine", "500 tasks done", () => totalDone() >= 500],
  ["🔥", "Warming up", "3-day streak", () => bestStreak() >= 3],
  ["⚡", "Whole week", "7-day streak", () => bestStreak() >= 7],
  ["🌟", "Habit unlocked", "30-day streak", () => bestStreak() >= 30],
  ["✅", "Perfect day", "Every task done in a day", () => perfectDays() >= 1],
  ["⏱️", "Focus friend", "Finish a focus session", () => S.sessions.length >= 1],
  ["🎧", "In the zone", "10 focus sessions", () => S.sessions.length >= 10],
  ["📦", "Let it go", "7 declutter days", () => declDone() >= 7],
  ["🏆", "Declutter champion", "Finish the 30-day challenge", () => declDone() >= 30],
  ["🎁", "Treat yourself", "Redeem a reward", () => S.redeemed.length >= 1],
  ["🧠", "Clear head", "Use the brain dump", () => S.brain.some(b => b.ok)]
];

/* ---------- UI helpers ---------- */
function toast(m) { const t = $("toast"); t.textContent = m; t.classList.add("on"); clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.remove("on"), 2200); }
function confetti() { const c = document.createElement("div"); c.className = "confetti"; for (let i = 0; i < 60; i++) { const s = document.createElement("i"); s.style.left = Math.random() * 100 + "%"; s.style.background = COLORS[i % COLORS.length]; s.style.animationDelay = Math.random() * .5 + "s"; s.style.transform = `rotate(${Math.random() * 360}deg)`; c.appendChild(s); } document.body.appendChild(c); setTimeout(() => c.remove(), 2200); }
function beep() { if (!S.sound) return; try { const a = new (window.AudioContext || window.webkitAudioContext)(); [0, .18, .36].forEach((w, i) => { const o = a.createOscillator(), g = a.createGain(); o.frequency.value = [660, 880, 990][i]; o.connect(g); g.connect(a.destination); g.gain.setValueAtTime(.18, a.currentTime + w); g.gain.exponentialRampToValueAtTime(.001, a.currentTime + w + .3); o.start(a.currentTime + w); o.stop(a.currentTime + w + .32); }); } catch (e) { } }
function sheet(html) { $("sheetIn").innerHTML = html; $("sheet").classList.add("on"); }
function closeSheet() { $("sheet").classList.remove("on"); }
const en = n => `<span class="en en${n}">${["", "Low", "Medium", "High"][n]} energy</span>`;
const av = p => p ? `<span class="av" style="background:${p.c}22" title="${esc(p.n)}">${p.e}</span>` : "";
function ringSVG(p, size, stroke, col, bg) { const r = (size - stroke) / 2, c = 2 * Math.PI * r; return `<svg width="${size}" height="${size}"><circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="${bg}" stroke-width="${stroke}"/><circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="${col}" stroke-width="${stroke}" stroke-linecap="round" stroke-dasharray="${c}" stroke-dashoffset="${c * (1 - Math.min(1, p))}"/></svg>`; }
function head(t, sub, right = "") { return `<div class="head"><div><h1>${t}</h1>${sub ? `<div class="sub">${sub}</div>` : ""}</div><div class="row">${right}</div></div>`; }
function taskRow(x, ds, opt = {}) {
  const t = x.t, d = isDone(t, ds), p = person(t.who), r = room(t.room);
  return `<div class="task ${d ? "done" : ""}"><button class="tick ${d ? "on" : ""}" data-a="tick" data-id="${t.id}" data-d="${ds}" aria-label="Done">✓</button>
  <div class="t"><div class="n">${esc(t.n)}</div><div class="m">${opt.noRoom ? "" : `<span>${r.e} ${esc(r.n)}</span>`}<span>⏱ ${t.min} min</span>${x.carried ? `<span style="color:var(--pink)">↩ from ${DN[dow(x.carried)]}</span>` : ""}${opt.freq ? `<span>🔁 ${freqTxt(t.freq)}</span>` : ""}</div></div>
  ${p ? av(p) : ""}${opt.edit ? `<button class="btn ghost sm" data-a="editTask" data-id="${t.id}">Edit</button>` : ""}</div>`;
}

/* ---------- navigation ---------- */
const NAV = [
  ["Daily", [["today", "☀️", "Today"], ["focus", "⏱️", "Focus timer"], ["brain", "🧠", "Brain dump"]]],
  ["Plan", [["schedule", "🗓️", "Cleaning schedule"], ["rooms", "🏠", "Rooms"], ["lists", "📋", "Checklists"], ["calendar", "📅", "Calendar"]]],
  ["Family", [["family", "👨‍👩‍👧", "Chore chart"], ["rewards", "🎁", "Rewards"]]],
  ["Grow", [["declutter", "📦", "30-day declutter"], ["stats", "🏆", "Wins & stats"]]],
  ["App", [["settings", "⚙️", "Settings"], ["help", "❓", "Help"]]]];
const BNAV = [["today", "☀️", "Today"], ["focus", "⏱️", "Focus"], ["schedule", "🗓️", "Plan"], ["family", "👨‍👩‍👧", "Family"], ["more", "☰", "More"]];
function renderNav() {
  $("snav").innerHTML = `<div class="logo"><img src="icons/icon-192.png" alt="">TidyBrain</div>` + NAV.map(([g, it]) => `<div class="g">${g}</div>` + it.map(([k, e, n]) => `<button class="${view === k ? "on" : ""}" data-go="${k}"><span>${e}</span>${n}</button>`).join("")).join("");
  const inMore = !BNAV.some(b => b[0] === view);
  $("bnav").innerHTML = BNAV.map(([k, e, n]) => `<button class="${view === k || (k === "more" && inMore) ? "on" : ""}" data-go="${k}"><span class="i">${e}</span>${n}</button>`).join("");
}

/* ---------- screens ---------- */
function hello() { const h = new Date().getHours(); return h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening"; }
function scrToday() {
  const ds = today(); let list = dueOn(ds);
  const all = list.length, dn = list.filter(x => isDone(x.t, ds)).length, left = list.filter(x => !isDone(x.t, ds)).reduce((a, x) => a + x.t.min, 0);
  if (filt.en === "low") list = list.filter(x => x.t.energy === 1);
  if (filt.en === "quick") list = list.filter(x => x.t.min <= 5);
  if (filt.who) list = list.filter(x => x.t.who === filt.who || (filt.who === "_" && !x.t.who));
  const groups = {}; list.forEach(x => (groups[x.t.room] = groups[x.t.room] || []).push(x));
  const order = S.rooms.map(r => r.id).concat([""]);
  const st = streak(), dd = declDay(), dtoday = dd && !S.declutter.done[dd] && dd <= 30;
  const msg = !all ? "Nothing scheduled today — enjoy it 🌿" : dn >= all ? "All done today. You're amazing ✨" : left <= 15 ? `Just ~${left} min left — you're nearly there!` : `${all - dn} tasks · about ${left} min`;
  return head(`${hello()}${S.name ? ", " + esc(S.name) : ""} 👋`, fmtD(ds), `<button class="btn" data-a="addTask">+ Task</button>`) + `
  <div class="g21">
   <div class="grid">
    <div class="hero"><div class="row" style="gap:18px;flex-wrap:nowrap">
      <div class="ring">${ringSVG(all ? dn / all : 0, 118, 12, "#fff", "rgba(255,255,255,.25)")}<div class="c">${dn}/${all}<small>done</small></div></div>
      <div style="min-width:0"><div class="l">Today</div><div style="font-size:21px;font-weight:900;margin:3px 0 12px;line-height:1.2">${msg}</div>
      <div class="row"><button class="btn" data-go="focus">▶ Focus mode</button><button class="btn ghost" data-a="pick">🎲 Pick for me</button></div></div></div></div>
    <div class="card">
      <div class="row" style="margin-bottom:6px"><div class="seg">${[["all", "All"], ["low", "🔋 Low energy"], ["quick", "⚡ ≤5 min"]].map(([k, n]) => `<button class="${filt.en === k ? "on" : ""}" data-a="fen" data-v="${k}">${n}</button>`).join("")}</div>
      ${S.people.length ? `<div class="sp"></div><div class="row">${[["", "Everyone"]].concat(S.people.map(p => [p.id, p.e + " " + p.n])).map(([k, n]) => `<button class="chip ${filt.who === k ? "on" : ""}" data-a="fwho" data-v="${k}">${esc(n)}</button>`).join("")}</div>` : ""}</div>
      ${list.length ? order.filter(r => groups[r]).map(r => `<div class="pick mut" style="margin-top:12px">${room(r).e} ${esc(room(r).n).toUpperCase()}</div>` + groups[r].map(x => taskRow(x, ds, { noRoom: true })).join("")).join("") :
      `<div class="empty"><span class="e">${all ? "🎉" : "🌿"}</span>${all ? "Nothing here with this filter." : "No tasks today. Add one, or set up a schedule."}</div>`}
    </div>
   </div>
   <div class="grid" style="align-content:start">
    <div class="g2" style="grid-template-columns:1fr 1fr"><div class="kpi"><div class="l">Streak</div><div class="v">🔥 ${st}</div><div class="s">day${st === 1 ? "" : "s"} in a row</div></div>
    <div class="kpi"><div class="l">This week</div><div class="v">✅ ${doneCount(weekStart(ds), ds)}</div><div class="s">tasks done</div></div></div>
    ${dd ? `<div class="card"><h3>📦 Declutter · day ${dd}<span class="sp"></span><span class="chip">${declDone()}/30</span></h3>
      <div class="b" style="font-size:17px">${esc(DECLUTTER[dd - 1])}</div><div class="mut sm" style="margin:4px 0 10px">Set a timer for 10 minutes. Toss, donate or rehome.</div>
      ${dtoday ? `<button class="btn mint sm" data-a="declDay" data-v="${dd}">✓ Mark day ${dd} done</button>` : `<span class="chip" style="background:var(--mint2);color:var(--mint)">✓ Done today</span>`}</div>`
      : `<div class="card"><h3>📦 30-day declutter</h3><div class="mut sm" style="margin-bottom:10px">One small area a day. Less stuff = less to clean.</div><button class="btn sm" data-a="declStart">Start the challenge</button></div>`}
    <div class="card"><h3>🧠 Brain dump</h3><div class="mut sm" style="margin-bottom:8px">Noticed something? Park it here so you don't have to remember.</div>
      <form data-f="brain" class="row" style="flex-wrap:nowrap"><input class="i" id="brainIn" placeholder="e.g. hallway bulb is out"><button class="btn">Add</button></form>
      ${S.brain.filter(b => !b.ok).slice(0, 4).map(b => `<div class="list-it"><button class="tick" data-a="brainOk" data-id="${b.id}">✓</button><div class="tx">${esc(b.t)}</div></div>`).join("")}</div>
    <div class="note">💛 <b>No pile-up:</b> missed tasks don't stack up. Tomorrow is a fresh list.</div>
   </div>
  </div>`;
}
function weekStart(ds) { return addD(ds, -((dow(ds) + 6) % 7)); }

function scrFocus() {
  const ds = today(), due = dueOn(ds).filter(x => !isDone(x.t, ds));
  const t = timer.task && byId(S.tasks, timer.task), p = timer.total ? timer.left / timer.total : 0;
  const mm = Math.floor(timer.left / 60), ss = timer.left % 60;
  return head("Focus timer", "Pick one task, start the clock, go. That's it.") + `
  <div class="g21"><div class="card"><div class="timer">
    <div class="seg">${[5, 10, 15, 25].map(m => `<button class="${timer.total === m * 60 ? "on" : ""}" data-a="tset" data-v="${m}">${m} min</button>`).join("")}</div>
    <div class="focusTask">${t ? `${room(t.room).e} ${esc(t.n)}` : "Any task you like"}</div>
    <div class="tring">${ringSVG(p, 260, 18, "var(--br)", "var(--soft)")}<div class="c"><div class="tm" id="tm">${pad(mm)}:${pad(ss)}</div><div class="mut sm b" id="tcheer">${timer.run ? CHEER[timer.cheer % CHEER.length] : "Ready when you are"}</div></div></div>
    <div class="row" style="justify-content:center">${timer.run ? `<button class="btn big ghost" data-a="tpause">⏸ Pause</button>` : `<button class="btn big" data-a="tstart">▶ ${timer.left < timer.total ? "Resume" : "Start"}</button>`}
      <button class="btn big ghost" data-a="treset">↺</button>${t ? `<button class="btn big mint" data-a="tdone">✓ Done</button>` : ""}</div>
    <div class="mut sm">Sessions finished: <b>${S.sessions.length}</b> · ${S.sessions.reduce((a, s) => a + s.min, 0)} min focused</div>
  </div></div>
  <div class="card"><h3>Up next today<span class="sp"></span><button class="btn ghost sm" data-a="pick">🎲 Pick for me</button></h3>
    ${due.length ? due.map(x => `<button class="task" style="width:100%;text-align:left" data-a="tpick" data-id="${x.t.id}"><span style="font-size:22px">${room(x.t.room).e}</span><div class="t"><div class="n">${esc(x.t.n)}</div><div class="m"><span>⏱ ${x.t.min} min</span>${en(x.t.energy)}</div></div>${timer.task === x.t.id ? `<span class="chip on">Now</span>` : ""}</button>`).join("") : `<div class="empty"><span class="e">🎉</span>All of today's tasks are done.</div>`}
  </div></div>`;
}

function scrBrain() {
  const open = S.brain.filter(b => !b.ok), dn = S.brain.filter(b => b.ok);
  return head("Brain dump", "Empty your head. Sort it out later.") + `<div class="g2"><div class="card">
   <form data-f="brain" class="row" style="flex-wrap:nowrap;margin-bottom:8px"><input class="i" id="brainIn" placeholder="Type anything you noticed…"><button class="btn">Add</button></form>
   ${open.length ? open.map(b => `<div class="list-it"><button class="tick" data-a="brainOk" data-id="${b.id}">✓</button><div class="tx">${esc(b.t)}</div><button class="btn ghost sm" data-a="brainTask" data-id="${b.id}">→ Task</button><button class="btn ghost sm" data-a="brainDel" data-id="${b.id}">✕</button></div>`).join("") : `<div class="empty"><span class="e">🧠</span>Your head is clear.</div>`}
  </div><div class="card"><h3>Done</h3>${dn.length ? dn.slice(-12).reverse().map(b => `<div class="list-it done"><button class="tick on" data-a="brainOk" data-id="${b.id}">✓</button><div class="tx">${esc(b.t)}</div><button class="btn ghost sm" data-a="brainDel" data-id="${b.id}">✕</button></div>`).join("") : `<div class="mut sm">Ticked items show here.</div>`}
  <div class="note" style="margin-top:12px">Tip: tap <b>→ Task</b> to turn a note into a scheduled cleaning task.</div></div></div>`;
}

function scrSchedule() {
  const mode = sel.mode || "room";
  const right = `<div class="seg"><button class="${mode === "room" ? "on" : ""}" data-a="smode" data-v="room">By room</button><button class="${mode === "week" ? "on" : ""}" data-a="smode" data-v="week">This week</button></div><button class="btn" data-a="addTask">+ Task</button>`;
  let body;
  if (mode === "week") {
    const ws = weekStart(today());
    body = `<div class="grid" style="grid-template-columns:repeat(auto-fill,minmax(210px,1fr))">` + [0, 1, 2, 3, 4, 5, 6].map(i => { const d = addD(ws, i), l = dueOn(d), s = l.filter(x => isDone(x.t, d)).length, m = l.reduce((a, x) => a + x.t.min, 0);
      return `<div class="card" ${d === today() ? 'style="outline:2.5px solid var(--br)"' : ""}><h3>${fmtD(d)}<span class="sp"></span><span class="chip">${m} min</span></h3><div class="pbar" style="margin-bottom:8px"><i style="width:${l.length ? s / l.length * 100 : 0}%"></i></div>
      ${l.length ? l.map(x => `<div class="sm" style="padding:3px 0;${isDone(x.t, d) ? "text-decoration:line-through;color:var(--mut)" : ""}">${room(x.t.room).e} ${esc(x.t.n)}</div>`).join("") : `<div class="mut sm">Rest day 🌿</div>`}</div>`; }).join("") + `</div>`;
  } else {
    body = S.rooms.concat(S.tasks.some(t => !room(t.room).id) ? [{ id: "", n: "Anywhere", e: "📍" }] : []).map(r => { const ts = S.tasks.filter(t => (t.room || "") === r.id || (!r.id && !byId(S.rooms, t.room)));
      if (!ts.length && !r.id) return "";
      return `<div class="card"><h3>${r.e} ${esc(r.n)}<span class="sp"></span><span class="chip">${ts.length} tasks</span><button class="btn ghost sm" data-a="addTask" data-room="${r.id}">+ Add</button></h3>
      ${ts.length ? ts.map(t => `<div class="task"><div class="t"><div class="n">${esc(t.n)}${t.paused ? ' <span class="chip">Paused</span>' : ""}</div><div class="m"><span>🔁 ${freqTxt(t.freq)}</span><span>⏱ ${t.min} min</span>${en(t.energy)}${t.carry ? "<span>↩ stays until done</span>" : ""}</div></div>${av(person(t.who))}<button class="btn ghost sm" data-a="editTask" data-id="${t.id}">Edit</button></div>`).join("") : `<div class="mut sm">No tasks yet.</div>`}</div>`; }).join("");
    body = `<div class="g2">${body}</div>`;
  }
  return head("Cleaning schedule", `${S.tasks.length} tasks · about ${Math.round(weekMinutes() / 7)} min a day`, right) + body;
}
function weekMinutes() { const ws = weekStart(today()); let m = 0; for (let i = 0; i < 7; i++) m += dueOn(addD(ws, i)).reduce((a, x) => a + x.t.min, 0); return m; }

function scrRooms() {
  const ds = today();
  if (sel.room !== undefined && (byId(S.rooms, sel.room))) {
    const r = byId(S.rooms, sel.room), ts = S.tasks.filter(t => t.room === r.id), due = dueOn(ds).filter(x => x.t.room === r.id);
    return head(`${r.e} ${esc(r.n)}`, `${ts.length} tasks`, `<button class="btn ghost" data-a="roomBack">← Rooms</button><button class="btn ghost" data-a="editRoom" data-id="${r.id}">Edit room</button><button class="btn" data-a="addTask" data-room="${r.id}">+ Task</button>`) + `
    <div class="g2"><div class="card"><h3>Today</h3>${due.length ? due.map(x => taskRow(x, ds, { noRoom: true })).join("") : `<div class="empty"><span class="e">🌿</span>Nothing due here today.</div>`}</div>
    <div class="card"><h3>All tasks</h3>${ts.map(t => { const nd = nextDue(t); return `<div class="task"><div class="t"><div class="n">${esc(t.n)}</div><div class="m"><span>🔁 ${freqTxt(t.freq)}</span>${nd ? `<span>Next: ${fmtD(nd)}</span>` : ""}</div></div><button class="btn ghost sm" data-a="editTask" data-id="${t.id}">Edit</button></div>`; }).join("") || `<div class="mut sm">No tasks yet.</div>`}</div></div>`;
  }
  return head("Rooms", "Tap a room to see its tasks", `<button class="btn" data-a="addRoom">+ Room</button>`) + `<div class="tiles">` + S.rooms.map(r => {
    const d = dueOn(ds).filter(x => x.t.room === r.id), dn = d.filter(x => isDone(x.t, ds)).length, n = S.tasks.filter(t => t.room === r.id).length;
    return `<button class="tile" data-a="room" data-id="${r.id}"><div class="e">${r.e}</div><div class="n">${esc(r.n)}</div><div class="mut xs">${n} tasks · ${d.length ? `${dn}/${d.length} today` : "free today"}</div><div class="pbar"><i style="width:${d.length ? dn / d.length * 100 : 100}%"></i></div></button>`; }).join("") + `</div>`;
}

function scrLists() {
  const l = byId(S.lists, sel.list);
  if (l) {
    const dn = l.items.filter(i => i.ok).length;
    return head(`${l.e} ${esc(l.n)}`, `${dn} of ${l.items.length} done`, `<button class="btn ghost" data-a="listBack">← Checklists</button><button class="btn ghost" data-a="listReset" data-id="${l.id}">↺ Reset</button><button class="btn ghost noprint" onclick="print()">🖨 Print</button>`) + `
    <div class="g21"><div class="card"><div class="pbar" style="margin-bottom:10px"><i style="width:${l.items.length ? dn / l.items.length * 100 : 0}%"></i></div>
    ${l.items.map((it, i) => `<div class="list-it ${it.ok ? "done" : ""}"><button class="tick ${it.ok ? "on" : ""}" data-a="itOk" data-i="${i}">✓</button><div class="tx">${esc(it.t)}</div><button class="btn ghost sm noprint" data-a="itDel" data-i="${i}">✕</button></div>`).join("")}
    <form data-f="item" class="row noprint" style="flex-wrap:nowrap;margin-top:10px"><input class="i" id="itemIn" placeholder="Add a step…"><button class="btn">Add</button></form></div>
    <div class="card noprint" style="align-self:start"><h3>Tips</h3><div class="sm mut">Work top to bottom, one step at a time. Put on a playlist — 3 songs ≈ 10 minutes. Reset the list when you're done so it's ready next time.</div><button class="btn ghost sm" style="margin-top:12px" data-a="listDel" data-id="${l.id}">Delete checklist</button></div></div>`;
  }
  return head("Checklists", "Deep cleans, resets and one-off jobs", `<button class="btn" data-a="newList">+ Checklist</button>`) + `<div class="tiles">` + S.lists.map(l => { const dn = l.items.filter(i => i.ok).length;
    return `<button class="tile" data-a="list" data-id="${l.id}"><div class="e">${l.e}</div><div class="n">${esc(l.n)}</div><div class="mut xs">${dn}/${l.items.length} steps</div><div class="pbar"><i style="width:${l.items.length ? dn / l.items.length * 100 : 0}%"></i></div></button>`; }).join("") + `</div>
    <div class="card" style="margin-top:14px"><h3>Add from templates</h3><div class="row">${TEMPLATES.filter(t => !S.lists.some(l => l.n === t[1])).map((t, i) => `<button class="chip" data-a="addTpl" data-v="${TEMPLATES.indexOf(t)}">${t[0]} ${esc(t[1])}</button>`).join("") || `<span class="mut sm">All templates added.</span>`}</div></div>`;
}

function scrCalendar() {
  const ref = sel.month || today().slice(0, 7), [y, m] = ref.split("-").map(Number), first = `${ref}-01`;
  const start = weekStart(first), cells = [];
  for (let i = 0; i < 42; i++) { const d = addD(start, i); if (i >= 35 && d.slice(0, 7) !== ref) break; cells.push(d); }
  const pick = sel.day || today(), pl = dueOn(pick);
  return head("Calendar", "See what's coming and what got done") + `<div class="g21"><div class="card">
   <div class="row" style="margin-bottom:10px"><button class="btn ghost sm" data-a="mon" data-v="-1">‹</button><div class="sp" style="text-align:center;font-weight:900;font-size:18px">${MN[m - 1]} ${y}</div><button class="btn ghost sm" data-a="mon" data-v="1">›</button></div>
   <div class="cal">${["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map(d => `<div class="dh">${d}</div>`).join("")}
   ${cells.map(d => { const s = dayStats(d), fut = d > today(); return `<button class="d ${d.slice(0, 7) !== ref ? "o" : ""} ${d === today() ? "t" : ""} ${d === pick ? "sel" : ""}" data-a="day" data-v="${d}">${pd(d).getDate()}<span class="mut" style="font-size:10px;font-weight:700">${s.due ? (fut ? `${s.due} tasks` : `${s.done}/${s.due}`) : ""}</span>${s.due && !fut ? `<span class="bar"><i style="width:${s.done / s.due * 100}%"></i></span>` : ""}</button>`; }).join("")}</div></div>
   <div class="card" style="align-self:start"><h3>${fmtD(pick)}</h3>${pl.length ? pl.map(x => taskRow(x, pick)).join("") : `<div class="empty"><span class="e">🌿</span>Nothing scheduled.</div>`}</div></div>`;
}

function scrFamily() {
  const ds = today(), ws = weekStart(ds);
  if (!S.people.length) return head("Family chore chart", "Share the load — everyone earns points") + `<div class="card"><div class="empty"><span class="e">👨‍👩‍👧</span>Add the people in your home to share chores and earn points.<br><br><button class="btn" data-a="addPerson">+ Add person</button></div></div>`;
  const days = [0, 1, 2, 3, 4, 5, 6].map(i => addD(ws, i));
  const cnt = (pid, d) => S.done[d] ? Object.values(S.done[d]).filter(v => v === pid).length : 0;
  return head("Family chore chart", `Week of ${fmtD(ws)}`, `<button class="btn ghost" data-go="rewards">🎁 Rewards</button><button class="btn" data-a="addPerson">+ Person</button>`) + `
  <div class="tiles" style="grid-template-columns:repeat(auto-fill,minmax(190px,1fr))">${S.people.map(p => { const w = earnedIn(p.id, ws, ds), td = dueOn(ds).filter(x => x.t.who === p.id), tdn = td.filter(x => isDone(x.t, ds)).length;
    return `<button class="tile" data-a="editPerson" data-id="${p.id}" style="border-top:5px solid ${p.c}"><div class="row"><span style="font-size:34px">${p.e}</span><div><div class="n">${esc(p.n)}</div><div class="mut xs">${td.length ? `${tdn}/${td.length} today` : "No chores today"}</div></div></div>
    <div class="row" style="margin-top:4px"><span class="chip" style="background:${p.c}22">⭐ ${points(p.id)} pts</span><span class="chip">+${w.p} this week</span></div></button>`; }).join("")}</div>
  <div class="g21" style="margin-top:14px"><div class="card"><h3>This week</h3><div class="scroll"><table class="tbl"><tr><th>Who</th>${days.map(d => `<th class="${d === ds ? "today" : ""}">${DN[dow(d)]}<br>${pd(d).getDate()}</th>`).join("")}<th>Total</th></tr>
   ${S.people.map(p => `<tr><td><span class="row" style="flex-wrap:nowrap">${av(p)}<b>${esc(p.n)}</b></span></td>${days.map(d => { const c = cnt(p.id, d); return `<td><span class="cnt ${c ? "h" : ""}">${d > ds ? "·" : c}</span></td>`; }).join("")}<td><b>${earnedIn(p.id, ws, ds).n}</b></td></tr>`).join("")}</table></div></div>
  <div class="card"><h3>Today's chores</h3>${S.people.map(p => { const l = dueOn(ds).filter(x => x.t.who === p.id); return l.length ? `<div class="pick mut" style="margin-top:8px">${p.e} ${esc(p.n).toUpperCase()}</div>` + l.map(x => taskRow(x, ds)).join("") : ""; }).join("") || `<div class="mut sm">Assign tasks to people when you add or edit a task.</div>`}
   ${dueOn(ds).some(x => !x.t.who) ? `<div class="mut xs" style="margin-top:10px">Tasks without a person count for ${esc((S.people[0] || {}).n || "you")}.</div>` : ""}</div></div>`;
}

function scrRewards() {
  return head("Rewards", "Spend points on treats you agree on together", `<button class="btn ghost" data-go="family">← Chore chart</button><button class="btn" data-a="addReward">+ Reward</button>`) + `
  <div class="g21"><div class="card"><h3>Reward menu</h3>${S.rewards.length ? S.rewards.map(r => `<div class="task"><span style="font-size:26px">${r.e || "🎁"}</span><div class="t"><div class="n">${esc(r.n)}</div><div class="m"><span>⭐ ${r.cost} points</span></div></div>
    <button class="btn sun sm" data-a="redeem" data-id="${r.id}">Redeem</button><button class="btn ghost sm" data-a="delReward" data-id="${r.id}">✕</button></div>`).join("") : `<div class="empty"><span class="e">🎁</span>Add a few rewards — movie night, ice cream, extra screen time…</div>`}</div>
  <div class="grid" style="align-content:start"><div class="card"><h3>Points</h3>${S.people.map(p => `<div class="task"><span style="font-size:24px">${p.e}</span><div class="t"><div class="n">${esc(p.n)}</div></div><span class="chip" style="background:${p.c}22">⭐ ${points(p.id)}</span></div>`).join("") || `<div class="mut sm">Add people on the chore chart first.</div>`}</div>
  <div class="card"><h3>Recently redeemed</h3>${S.redeemed.slice(-6).reverse().map(r => { const p = person(r.pid); return `<div class="sm" style="padding:4px 0">${p ? p.e : "🙂"} ${esc(r.n)} · <span class="mut">${fmtD(r.d)} · −${r.cost}</span></div>`; }).join("") || `<div class="mut sm">Nothing yet.</div>`}</div></div></div>`;
}

function scrDeclutter() {
  if (!S.declutter.start) return head("30-day declutter", "One small area a day for 30 days") + `<div class="g2"><div class="card"><div class="empty"><span class="e">📦</span><b style="font-size:18px;color:var(--ink)">Less stuff, less to clean.</b><br>Each day gets one small, specific area. Set a 10-minute timer, grab a bag, done.<br><br><button class="btn big" data-a="declStart">Start day 1 today</button></div></div>
  <div class="card"><h3>The 30 days</h3>${DECLUTTER.slice(0, 10).map((d, i) => `<div class="sm" style="padding:3px 0"><b>${i + 1}.</b> ${esc(d)}</div>`).join("")}<div class="mut sm">…and 20 more.</div></div></div>`;
  const cur = declDay(), dn = declDone();
  return head("30-day declutter", `Started ${fmtD(S.declutter.start)} · day ${cur}`, `<button class="btn ghost" data-a="declRestart">↺ Restart</button>`) + `
  <div class="g4"><div class="kpi"><div class="l">Days done</div><div class="v">${dn}/30</div></div><div class="kpi"><div class="l">Items gone</div><div class="v">🗑 ${S.declutter.items}</div></div><div class="kpi"><div class="l">Today</div><div class="v">Day ${cur}</div></div><div class="kpi"><div class="l">Left</div><div class="v">${30 - dn}</div><div class="s">days to go</div></div></div>
  <div class="g21" style="margin-top:14px"><div class="card"><h3>Your 30 days</h3><div class="dgrid">${DECLUTTER.map((d, i) => `<button class="dday ${S.declutter.done[i + 1] ? "on" : ""} ${i + 1 === cur ? "cur" : ""}" data-a="declSel" data-v="${i + 1}" title="${esc(d)}">${i + 1}<small>${S.declutter.done[i + 1] ? "✓" : i + 1 <= cur ? "open" : ""}</small></button>`).join("")}</div>
   <div class="mut xs" style="margin-top:10px">Missed a day? No problem — tap it and catch up whenever.</div></div>
  ${(() => { const d = sel.dday || Math.min(cur, 30), ok = S.declutter.done[d]; return `<div class="card" style="align-self:start"><div class="kpi" style="box-shadow:none;padding:0"><div class="l">Day ${d}</div></div><div class="b" style="font-size:22px;margin:4px 0 8px">${esc(DECLUTTER[d - 1])}</div>
   <div class="mut sm" style="margin-bottom:12px">Grab a bag. 10 minutes. Trash, donate, or put it where it lives.</div>
   <div class="pick mut">ITEMS REMOVED</div><div class="row" style="margin:6px 0 14px">${[1, 5, 10].map(n => `<button class="btn ghost sm" data-a="declItems" data-v="${n}">+${n}</button>`).join("")}<button class="btn ghost sm" data-go="focus">⏱ 10-min timer</button></div>
   ${d > cur ? `<div class="mut sm">This day unlocks on ${fmtD(addD(S.declutter.start, d - 1))}.</div>` : `<button class="btn ${ok ? "ghost" : "mint"}" data-a="declDay" data-v="${d}">${ok ? "Undo" : "✓ Mark day " + d + " done"}</button>`}</div>`; })()}</div>`;
}

function scrStats() {
  const ds = today(), days = [...Array(14)].map((_, i) => addD(ds, i - 13)), vals = days.map(d => S.done[d] ? Object.keys(S.done[d]).length : 0), mx = Math.max(4, ...vals);
  const byRoom = {}; for (const d in S.done) if (d >= addD(ds, -29)) for (const id in S.done[d]) { const t = byId(S.tasks, id); if (t) byRoom[t.room] = (byRoom[t.room] || 0) + 1; }
  const rr = Object.entries(byRoom).sort((a, b) => b[1] - a[1]), rmx = Math.max(1, ...rr.map(r => r[1]));
  const un = MS.filter(m => m[3]()).length;
  return head("Wins & stats", "Look how far you've come") + `<div class="g4"><div class="kpi"><div class="l">Streak</div><div class="v">🔥 ${streak()}</div><div class="s">best ${bestStreak()} days</div></div>
  <div class="kpi"><div class="l">This week</div><div class="v">${doneCount(weekStart(ds), ds)}</div><div class="s">tasks done</div></div>
  <div class="kpi"><div class="l">All time</div><div class="v">${totalDone()}</div><div class="s">tasks done</div></div>
  <div class="kpi"><div class="l">Time cleaning</div><div class="v">${Math.round(minutesDone(addD(ds, -29), ds) / 60 * 10) / 10}h</div><div class="s">last 30 days</div></div></div>
  <div class="g2" style="margin-top:14px"><div class="card"><h3>Last 14 days</h3><div class="bars">${days.map((d, i) => `<div class="bc"><b>${vals[i] || ""}</b><i style="height:${vals[i] / mx * 110}px;${d === ds ? "background:var(--mint)" : ""}"></i><span>${DN[dow(d)][0]}</span></div>`).join("")}</div></div>
  <div class="card"><h3>By room · 30 days</h3>${rr.length ? rr.map(([r, n]) => `<div style="margin-bottom:9px"><div class="row sm" style="margin-bottom:3px"><b>${room(r).e} ${esc(room(r).n)}</b><span class="sp"></span><span class="mut">${n}</span></div><div class="pbar"><i style="width:${n / rmx * 100}%;background:var(--br)"></i></div></div>`).join("") : `<div class="mut sm">Tick off tasks to see this fill up.</div>`}</div></div>
  <div class="card" style="margin-top:14px"><h3>Milestones<span class="sp"></span><span class="chip">${un}/${MS.length}</span></h3><div class="g3">${MS.map(m => `<div class="ms ${m[3]() ? "" : "lock"}"><span class="e">${m[0]}</span><div><div class="b">${m[1]}</div><div class="mut xs">${m[2]}</div></div></div>`).join("")}</div></div>`;
}

function scrSettings() {
  return head("Settings", "Your app, your way") + `<div class="g2"><div class="card"><h3>You</h3>
   <label class="f"><span>YOUR NAME</span><input class="i" id="setName" value="${esc(S.name)}" placeholder="Name"></label>
   <div class="pick mut" style="margin-bottom:6px">THEME</div><div class="seg" style="margin-bottom:14px">${[["light", "☀️ Light"], ["dark", "🌙 Dark"], ["auto", "Auto"]].map(([k, n]) => `<button class="${S.theme === k ? "on" : ""}" data-a="theme" data-v="${k}">${n}</button>`).join("")}</div>
   <label class="row" style="margin-bottom:6px"><input type="checkbox" id="setSound" ${S.sound ? "checked" : ""}> <span>Timer sound</span></label>
   <div style="margin-top:12px"><button class="btn" data-a="saveSet">Save</button></div></div>
  <div class="card"><h3>Your data</h3><div class="mut sm" style="margin-bottom:12px">Everything is saved on this device only. Download a backup now and then — and to move to a new phone.</div>
   <div class="row"><button class="btn" data-a="backup">⬇ Download backup</button><button class="btn ghost" data-a="restore">⬆ Restore from file</button></div>
   <input type="file" id="restoreFile" accept=".json,application/json" style="display:none">
   <div class="row" style="margin-top:16px"><button class="btn ghost" data-a="demo">✨ Load example data</button><button class="btn ghost" data-a="erase" style="color:var(--red)">Erase everything</button></div></div>
  <div class="card"><h3>Rooms & people</h3><div class="row">${S.rooms.map(r => `<button class="chip" data-a="editRoom" data-id="${r.id}">${r.e} ${esc(r.n)}</button>`).join("")}<button class="chip on" data-a="addRoom">+ Room</button></div>
   <div class="row" style="margin-top:10px">${S.people.map(p => `<button class="chip" data-a="editPerson" data-id="${p.id}">${p.e} ${esc(p.n)}</button>`).join("")}<button class="chip on" data-a="addPerson">+ Person</button></div>
   <div class="row" style="margin-top:12px"><button class="btn ghost sm" data-a="addPack">+ Add a starter pack of tasks</button></div></div>
  <div class="card"><h3>Install on your phone</h3><div class="sm"><b>iPhone/iPad:</b> Safari → Share → Add to Home Screen.<br><b>Android:</b> Chrome → ⋮ → Add to Home screen.<br><b>Computer:</b> Chrome or Edge → install icon in the address bar.</div></div></div>`;
}
function scrHelp() {
  const q = [["How does “today” work?", "Each task repeats on its own schedule (every day, chosen weekdays, every few days, or monthly). Today shows only what's due today. Tap the circle to tick it off."],
    ["What if I miss a day?", "Nothing piles up — missed tasks just disappear and come back next time they're due. If you want a task to wait for you instead, switch on “Keep on my list until done” when you edit it."],
    ["Low energy days?", "Tap 🔋 Low energy on Today to only see easy tasks, or ⚡ ≤5 min for quick wins. 🎲 Pick for me chooses one so you don't have to decide."],
    ["How do family points work?", "Give a task to a person when you add or edit it. When it's ticked, they get its points (5 / 10 / 15 by energy). Spend points in Rewards."],
    ["Where is my data?", "Only on this device, in this browser. Nothing is uploaded. Use Settings → Download backup to keep a copy or move to another device."],
    ["Can my partner use it on their phone?", "Each device keeps its own data. For a shared chart, keep it on one family device (a tablet on the fridge works great), or move data with backup / restore."],
    ["Keyboard shortcuts (computer)", "T = Today, F = Focus timer, S = Schedule, C = Calendar, N = new task."]];
  return head("Help", "Quick answers") + `<div class="g2">${q.map(([a, b]) => `<div class="card"><h3>${a}</h3><div class="sm mut">${b}</div></div>`).join("")}</div>
  <div class="card" style="margin-top:14px"><div class="sm">Need a hand? Message us on Etsy — happy to help. TidyBrain is a planning tool; go at your own pace 💛</div></div>`;
}
function scrMore() {
  return head("More", "Everything in TidyBrain") + NAV.map(([g, it]) => `<div class="pick mut" style="margin:14px 2px 8px">${g.toUpperCase()}</div><div class="tiles">${it.map(([k, e, n]) => `<button class="tile" data-go="${k}"><div class="e">${e}</div><div class="n">${n}</div></button>`).join("")}</div>`).join("");
}

/* ---------- onboarding ---------- */
let onb = { step: 0, name: "", rooms: ["kitchen", "bath", "bed", "living", "laundry", "home"], people: [] };
function scrOnboard() {
  const dots = `<div class="dots">${[0, 1, 2].map(i => `<i class="${onb.step === i ? "on" : ""}"></i>`).join("")}</div>`;
  let c;
  if (onb.step === 0) c = `<div style="font-size:44px">🧽</div><h1 style="font-size:28px;margin:6px 0">Welcome to TidyBrain</h1><div class="mut" style="margin-bottom:18px">The cleaning planner for busy, wandering brains. Small steps, no guilt, no pile-ups.</div>
    <label class="f"><span>WHAT SHOULD WE CALL YOU?</span><input class="i" id="onbName" value="${esc(onb.name)}" placeholder="Your name"></label>
    <div class="row"><button class="btn ghost" data-a="demo">✨ Try with example data</button><span class="sp"></span><button class="btn" data-a="onbNext">Next</button></div>`;
  if (onb.step === 1) c = `<h1 style="font-size:24px;margin-bottom:4px">Which rooms do you have?</h1><div class="mut sm" style="margin-bottom:14px">We'll add a gentle starter schedule for each. You can change everything later.</div>
    <div class="g2" style="grid-template-columns:1fr 1fr;gap:8px">${ROOMS.map(([k, n, e]) => `<button class="opt ${onb.rooms.includes(k) ? "on" : ""}" data-a="onbRoom" data-v="${k}"><span style="font-size:22px">${e}</span>${n}</button>`).join("")}</div>
    <div class="row" style="margin-top:14px"><button class="btn ghost" data-a="onbBack">Back</button><span class="sp"></span><button class="btn" data-a="onbNext">Next</button></div>`;
  if (onb.step === 2) c = `<h1 style="font-size:24px;margin-bottom:4px">Who lives with you?</h1><div class="mut sm" style="margin-bottom:14px">Add family or housemates to share chores and earn points. Or skip — it's fine to fly solo.</div>
    <form data-f="onbPerson" class="row" style="flex-wrap:nowrap;margin-bottom:10px"><input class="i" id="onbP" placeholder="Name, e.g. Mia"><button class="btn ghost">Add</button></form>
    <div class="row" style="margin-bottom:6px">${onb.people.map((p, i) => `<span class="chip">${p.e} ${esc(p.n)} <button data-a="onbPDel" data-i="${i}">✕</button></span>`).join("")}</div>
    <div class="row" style="margin-top:14px"><button class="btn ghost" data-a="onbBack">Back</button><span class="sp"></span><button class="btn" data-a="onbDone">Start cleaning ✨</button></div>`;
  return `<div class="onb"><div class="card">${c}${dots}</div></div>`;
}

/* ---------- forms ---------- */
function taskForm(t, roomId) {
  const n = !t; t = t || { n: "", room: roomId || (S.rooms[0] || {}).id || "", min: 10, energy: 1, freq: { t: "weekly", days: [dow(today())] }, who: "", carry: false };
  const f = t.freq; sel.fdays = f.t === "weekly" ? f.days.slice() : [dow(today())];
  sheet(`<h2>${n ? "New task" : "Edit task"}</h2><form data-f="task" data-id="${t.id || ""}">
   <label class="f"><span>TASK</span><input class="i" id="tN" value="${esc(t.n)}" placeholder="e.g. Wipe the counters" required></label>
   <div class="g2" style="grid-template-columns:1fr 1fr;gap:10px"><label class="f"><span>ROOM</span><select class="i" id="tR">${S.rooms.map(r => `<option value="${r.id}" ${r.id === t.room ? "selected" : ""}>${r.e} ${esc(r.n)}</option>`).join("")}<option value="" ${!t.room ? "selected" : ""}>📍 Anywhere</option></select></label>
   <label class="f"><span>MINUTES</span><input class="i" id="tM" type="number" min="1" max="240" value="${t.min}"></label></div>
   <label class="f"><span>REPEATS</span><select class="i" id="tF">${[["daily", "Every day"], ["weekly", "On certain days"], ["every", "Every few days"], ["monthly", "Once a month"], ["once", "Just once"]].map(([k, v]) => `<option value="${k}" ${f.t === k ? "selected" : ""}>${v}</option>`).join("")}</select></label>
   <div id="fx"></div>
   <div class="g2" style="grid-template-columns:1fr 1fr;gap:10px"><label class="f"><span>ENERGY NEEDED</span><select class="i" id="tE">${[1, 2, 3].map(e => `<option value="${e}" ${t.energy === e ? "selected" : ""}>${["", "🔋 Low", "🔋🔋 Medium", "🔋🔋🔋 High"][e]}</option>`).join("")}</select></label>
   <label class="f"><span>WHO</span><select class="i" id="tW"><option value="">Anyone</option>${S.people.map(p => `<option value="${p.id}" ${p.id === t.who ? "selected" : ""}>${p.e} ${esc(p.n)}</option>`).join("")}</select></label></div>
   <label class="row" style="margin-bottom:14px;flex-wrap:nowrap"><input type="checkbox" id="tC" ${t.carry ? "checked" : ""}><span class="sm">Keep on my list until done (otherwise it just skips — no pile-up)</span></label>
   ${!n ? `<label class="row" style="margin-bottom:14px"><input type="checkbox" id="tP" ${t.paused ? "checked" : ""}><span class="sm">Pause this task</span></label>` : ""}
   <div class="row"><button class="btn" type="submit">${n ? "Add task" : "Save"}</button><button class="btn ghost" type="button" data-a="close">Cancel</button><span class="sp"></span>${!n ? `<button class="btn ghost" type="button" data-a="delTask" data-id="${t.id}" style="color:var(--red)">Delete</button>` : ""}</div></form>`);
  const fx = () => { const v = $("tF").value;
    $("fx").innerHTML = v === "weekly" ? `<div class="days" style="margin-bottom:12px">${[1, 2, 3, 4, 5, 6, 0].map(d => `<button type="button" class="${sel.fdays.includes(d) ? "on" : ""}" data-a="fday" data-v="${d}">${DN[d].slice(0, 2)}</button>`).join("")}</div>`
      : v === "every" ? `<label class="f"><span>EVERY HOW MANY DAYS?</span><input class="i" id="tFn" type="number" min="2" max="90" value="${f.t === "every" ? f.n : 3}"></label>`
      : v === "monthly" ? `<label class="f"><span>DAY OF THE MONTH</span><input class="i" id="tFd" type="number" min="1" max="31" value="${f.t === "monthly" ? f.day : pd(today()).getDate()}"></label>`
      : v === "once" ? `<label class="f"><span>DATE</span><input class="i" id="tFo" type="date" value="${f.t === "once" ? f.date : today()}"></label>` : ""; };
  fx(); $("tF").onchange = fx; sheet.fx = fx;
  setTimeout(() => { if (n) $("tN").focus(); }, 50);
}
function roomForm(r) { const n = !r; r = r || { n: "", e: "🧹" };
  sheet(`<h2>${n ? "New room" : "Edit room"}</h2><form data-f="room" data-id="${r.id || ""}"><div class="g2" style="grid-template-columns:90px 1fr;gap:10px"><label class="f"><span>EMOJI</span><input class="i" id="rE" value="${esc(r.e)}" maxlength="4"></label><label class="f"><span>NAME</span><input class="i" id="rN" value="${esc(r.n)}" required></label></div>
  <div class="row"><button class="btn">${n ? "Add room" : "Save"}</button><button class="btn ghost" type="button" data-a="close">Cancel</button><span class="sp"></span>${!n ? `<button class="btn ghost" type="button" data-a="delRoom" data-id="${r.id}" style="color:var(--red)">Delete</button>` : ""}</div></form>`); }
function personForm(p) { const n = !p; p = p || { n: "", e: ["🙂", "🧑", "👧", "👦", "👩", "🧔"][S.people.length % 6], c: COLORS[S.people.length % COLORS.length] };
  sheet(`<h2>${n ? "Add person" : "Edit " + esc(p.n)}</h2><form data-f="person" data-id="${p.id || ""}"><div class="g2" style="grid-template-columns:90px 1fr;gap:10px"><label class="f"><span>EMOJI</span><input class="i" id="pE" value="${esc(p.e)}" maxlength="4"></label><label class="f"><span>NAME</span><input class="i" id="pN" value="${esc(p.n)}" required></label></div>
  <div class="pick mut" style="margin-bottom:6px">COLOUR</div><div class="row" style="margin-bottom:14px">${COLORS.map(c => `<label><input type="radio" name="pc" value="${c}" ${c === p.c ? "checked" : ""} style="display:none"><span class="av pcol" style="background:${c};outline:${c === p.c ? "3px solid var(--ink)" : "none"}" data-c="${c}"></span></label>`).join("")}</div>
  <div class="row"><button class="btn">${n ? "Add" : "Save"}</button><button class="btn ghost" type="button" data-a="close">Cancel</button><span class="sp"></span>${!n ? `<button class="btn ghost" type="button" data-a="delPerson" data-id="${p.id}" style="color:var(--red)">Remove</button>` : ""}</div></form>`); }

/* ---------- actions ---------- */
function setDone(t, ds, on, who) {
  S.done[ds] = S.done[ds] || {};
  if (on) S.done[ds][t.id] = who !== undefined ? who : (t.who || (S.people[0] || {}).id || ""); else delete S.done[ds][t.id];
  if (!Object.keys(S.done[ds]).length) delete S.done[ds];
}
function pickTask() { const ds = today(), l = dueOn(ds).filter(x => !isDone(x.t, ds)); if (!l.length) return toast("Everything's done today 🎉"); const x = l[Math.floor(Math.random() * l.length)]; timer.task = x.t.id; timer.total = timer.left = Math.max(5, Math.min(25, Math.ceil(x.t.min / 5) * 5)) * 60; view = "focus"; render(); toast(`🎲 ${x.t.n}`); }
function tick() { if (!timer.run) return; timer.left--; if (timer.left % 20 === 0) timer.cheer++; if (timer.left <= 0) { timer.left = 0; stopTimer(); S.sessions.push({ d: today(), min: Math.round(timer.total / 60), task: timer.task }); save(); beep(); confetti(); toast("Time! Great focus 🎉"); render(); return; }
  const tm = $("tm"); if (tm && view === "focus") { tm.textContent = `${pad(Math.floor(timer.left / 60))}:${pad(timer.left % 60)}`; const c = $("tcheer"); if (c) c.textContent = CHEER[timer.cheer % CHEER.length]; const sv = document.querySelector(".tring svg circle:last-child"); if (sv) { const r = 121, cc = 2 * Math.PI * r; sv.setAttribute("stroke-dashoffset", cc * (1 - timer.left / timer.total)); } }
  document.title = `${pad(Math.floor(timer.left / 60))}:${pad(timer.left % 60)} · TidyBrain`; }
function stopTimer() { timer.run = false; clearInterval(timer.int); document.title = "TidyBrain — ADHD Cleaning Planner"; }

const ACT = {
  close: closeSheet,
  tick(e) { const t = byId(S.tasks, e.dataset.id), ds = e.dataset.d, on = !isDone(t, ds); const before = dayStats(ds); setDone(t, ds, on); save();
    const after = dayStats(ds); if (on && after.due && after.done >= after.due && before.done < before.due) { confetti(); toast("Everything done! You're a star ⭐"); } else if (on) toast(["Nice! ✨", "Done ✓", "Look at you go 🙌", "One less thing 💛", "Sparkly ✨"][Math.floor(Math.random() * 5)]);
    render(); },
  fen(e) { filt.en = e.dataset.v; render(); }, fwho(e) { filt.who = e.dataset.v; render(); },
  pick: pickTask,
  addTask(e) { taskForm(null, e.dataset.room); }, editTask(e) { taskForm(byId(S.tasks, e.dataset.id)); },
  delTask(e) { if (!confirm("Delete this task?")) return; S.tasks = S.tasks.filter(t => t.id !== e.dataset.id); save(); closeSheet(); render(); },
  fday(e) { const d = +e.dataset.v; sel.fdays = sel.fdays.includes(d) ? sel.fdays.filter(x => x !== d) : sel.fdays.concat(d); sheet.fx(); },
  smode(e) { sel.mode = e.dataset.v; render(); },
  room(e) { sel.room = e.dataset.id; render(); window.scrollTo(0, 0); }, roomBack() { sel = {}; render(); },
  addRoom() { roomForm(); }, editRoom(e) { roomForm(byId(S.rooms, e.dataset.id)); },
  delRoom(e) { const id = e.dataset.id, n = S.tasks.filter(t => t.room === id).length; if (!confirm(n ? `Delete this room and its ${n} tasks?` : "Delete this room?")) return; S.rooms = S.rooms.filter(r => r.id !== id); S.tasks = S.tasks.filter(t => t.room !== id); sel = {}; save(); closeSheet(); render(); },
  addPerson() { personForm(); }, editPerson(e) { personForm(byId(S.people, e.dataset.id)); },
  delPerson(e) { if (!confirm("Remove this person? Their tasks become “Anyone”.")) return; const id = e.dataset.id; S.people = S.people.filter(p => p.id !== id); S.tasks.forEach(t => { if (t.who === id) t.who = ""; }); save(); closeSheet(); render(); },
  addReward() { sheet(`<h2>New reward</h2><form data-f="reward"><div class="g2" style="grid-template-columns:90px 1fr;gap:10px"><label class="f"><span>EMOJI</span><input class="i" id="wE" value="🎁" maxlength="4"></label><label class="f"><span>REWARD</span><input class="i" id="wN" placeholder="e.g. Movie night pick" required></label></div><label class="f"><span>POINTS</span><input class="i" id="wC" type="number" min="1" value="50"></label><div class="row"><button class="btn">Add</button><button class="btn ghost" type="button" data-a="close">Cancel</button></div></form>`); },
  delReward(e) { S.rewards = S.rewards.filter(r => r.id !== e.dataset.id); save(); render(); },
  redeem(e) { const r = byId(S.rewards, e.dataset.id); if (!S.people.length) return toast("Add people on the chore chart first");
    sheet(`<h2>${r.e || "🎁"} ${esc(r.n)}</h2><div class="mut" style="margin-bottom:12px">Who's redeeming? (${r.cost} points)</div>${S.people.map(p => { const pts = points(p.id); return `<button class="opt" ${pts < r.cost ? "disabled style='opacity:.45'" : ""} data-a="redeemFor" data-id="${r.id}" data-p="${p.id}"><span style="font-size:24px">${p.e}</span>${esc(p.n)}<span class="sp"></span>⭐ ${pts}</button>`; }).join("")}<button class="btn ghost" data-a="close" style="margin-top:8px">Cancel</button>`); },
  redeemFor(e) { const r = byId(S.rewards, e.dataset.id), p = person(e.dataset.p); if (points(p.id) < r.cost) return toast("Not enough points yet"); S.redeemed.push({ pid: p.id, rid: r.id, n: r.n, cost: r.cost, d: today() }); save(); closeSheet(); confetti(); toast(`${p.e} ${p.n} redeemed ${r.n}!`); render(); },
  list(e) { sel.list = e.dataset.id; render(); window.scrollTo(0, 0); }, listBack() { sel = {}; render(); },
  itOk(e) { const l = byId(S.lists, sel.list), it = l.items[+e.dataset.i]; it.ok = !it.ok; save(); if (l.items.every(i => i.ok)) { confetti(); toast("Checklist complete! 🎉"); } render(); },
  itDel(e) { const l = byId(S.lists, sel.list); l.items.splice(+e.dataset.i, 1); save(); render(); },
  listReset(e) { byId(S.lists, e.dataset.id).items.forEach(i => i.ok = false); save(); render(); },
  listDel(e) { if (!confirm("Delete this checklist?")) return; S.lists = S.lists.filter(l => l.id !== e.dataset.id); sel = {}; save(); render(); },
  addTpl(e) { const t = TEMPLATES[+e.dataset.v]; S.lists.push({ id: uid(), e: t[0], n: t[1], items: t[2].map(x => ({ t: x, ok: false })) }); save(); render(); toast("Checklist added"); },
  newList() { sheet(`<h2>New checklist</h2><form data-f="list"><div class="g2" style="grid-template-columns:90px 1fr;gap:10px"><label class="f"><span>EMOJI</span><input class="i" id="lE" value="📋" maxlength="4"></label><label class="f"><span>NAME</span><input class="i" id="lN" placeholder="e.g. Sunday reset" required></label></div><label class="f"><span>STEPS (ONE PER LINE)</span><textarea class="i" id="lI" rows="6" placeholder="Strip the bed&#10;Run the dishwasher"></textarea></label><div class="row"><button class="btn">Create</button><button class="btn ghost" type="button" data-a="close">Cancel</button></div></form>`); },
  mon(e) { const [y, m] = (sel.month || today().slice(0, 7)).split("-").map(Number), d = new Date(y, m - 1 + +e.dataset.v, 1); sel.month = `${d.getFullYear()}-${pad(d.getMonth() + 1)}`; render(); },
  day(e) { sel.day = e.dataset.v; render(); },
  declStart() { S.declutter = { start: today(), done: {}, items: 0 }; save(); view = "declutter"; sel = {}; render(); toast("Day 1 — let's go! 📦"); },
  declRestart() { if (!confirm("Restart the 30-day challenge from today?")) return; ACT.declStart(); },
  declSel(e) { sel.dday = +e.dataset.v; render(); },
  declDay(e) { const d = +e.dataset.v; if (S.declutter.done[d]) delete S.declutter.done[d]; else { S.declutter.done[d] = today(); if (declDone() === 30) { confetti(); toast("30 days done! Champion 🏆"); } else toast(`Day ${d} done ✓`); } save(); render(); },
  declItems(e) { S.declutter.items += +e.dataset.v; save(); render(); },
  brainOk(e) { const b = byId(S.brain, e.dataset.id); b.ok = !b.ok; save(); render(); },
  brainDel(e) { S.brain = S.brain.filter(b => b.id !== e.dataset.id); save(); render(); },
  brainTask(e) { const b = byId(S.brain, e.dataset.id); taskForm(null); $("tN").value = b.t; const f = $("tF"); f.value = "once"; sheet.fx(); sel.fromBrain = b.id; },
  tset(e) { stopTimer(); timer.total = timer.left = +e.dataset.v * 60; render(); },
  tstart() { if (timer.left <= 0) timer.left = timer.total; timer.run = true; clearInterval(timer.int); timer.int = setInterval(tick, 1000); render(); },
  tpause() { stopTimer(); render(); }, treset() { stopTimer(); timer.left = timer.total; render(); },
  tpick(e) { timer.task = e.dataset.id; const t = byId(S.tasks, timer.task); if (!timer.run) timer.total = timer.left = Math.max(5, Math.min(25, Math.ceil(t.min / 5) * 5)) * 60; render(); window.scrollTo(0, 0); },
  tdone() { const t = byId(S.tasks, timer.task); if (t) { setDone(t, today(), true); const used = Math.max(1, Math.round((timer.total - timer.left) / 60)); if (used >= 1) S.sessions.push({ d: today(), min: used, task: t.id }); } stopTimer(); save(); confetti(); toast("Done! On to the next ✨"); timer.task = null; timer.left = timer.total; render(); },
  theme(e) { S.theme = e.dataset.v; applyTheme(); save(); render(); },
  saveSet() { S.name = $("setName").value.trim(); S.sound = $("setSound").checked; save(); toast("Saved ✓"); render(); },
  addPack() { const have = new Set(S.rooms.map(r => r.id)); sheet(`<h2>Add a starter pack</h2><div class="mut sm" style="margin-bottom:12px">Adds a room with a ready-made schedule.</div>${ROOMS.filter(r => !have.has(r[0])).map(([k, n, e]) => `<button class="opt" data-a="packAdd" data-v="${k}"><span style="font-size:22px">${e}</span>${n}<span class="sp"></span><span class="mut xs">${PACKS[k].length} tasks</span></button>`).join("") || `<div class="mut">You already have every pack.</div>`}<button class="btn ghost" data-a="close" style="margin-top:8px">Close</button>`); },
  packAdd(e) { addRoomPack(e.dataset.v); save(); closeSheet(); render(); toast("Pack added ✓"); },
  backup() { const b = new Blob([JSON.stringify(S, null, 1)], { type: "application/json" }), a = document.createElement("a"); a.href = URL.createObjectURL(b); a.download = `tidybrain-backup-${today()}.json`; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 2000); toast("Backup downloaded ⬇"); },
  restore() { $("restoreFile").click(); },
  demo() { if (S.onboarded && S.tasks.length && !confirm("Replace everything with example data?")) return; S = demoData(); save(); applyTheme(); view = "today"; sel = {}; render(); toast("Example data loaded — have a look around ✨"); },
  erase() { if (!confirm("Erase everything on this device? There's no undo.")) return; localStorage.removeItem(KEY); S = blank(); onb.step = 0; sel = {}; view = "today"; render(); },
  onbNext() { if (onb.step === 0) onb.name = ($("onbName").value || "").trim(); if (onb.step === 1 && !onb.rooms.length) return toast("Pick at least one room"); onb.step++; render(); },
  onbBack() { onb.step--; render(); },
  onbRoom(e) { const k = e.dataset.v; onb.rooms = onb.rooms.includes(k) ? onb.rooms.filter(x => x !== k) : onb.rooms.concat(k); render(); },
  onbPDel(e) { onb.people.splice(+e.dataset.i, 1); render(); },
  onbDone() { S.name = onb.name; ROOMS.filter(r => onb.rooms.includes(r[0])).forEach(r => addRoomPack(r[0]));
    if (onb.people.length) { S.people = [{ id: uid(), n: onb.name || "Me", e: "🙋", c: COLORS[0] }].concat(onb.people.map((p, i) => ({ id: uid(), n: p.n, e: p.e, c: COLORS[(i + 1) % COLORS.length] }))); S.rewards = defaultRewards(); }
    S.lists = TEMPLATES.slice(0, 4).map(t => ({ id: uid(), e: t[0], n: t[1], items: t[2].map(x => ({ t: x, ok: false })) }));
    S.onboarded = true; S.created = today(); save(); view = "today"; render(); confetti(); toast("You're all set 🧽"); }
};
function addRoomPack(k, start) { const r = ROOMS.find(x => x[0] === k); let id = k; if (byId(S.rooms, id)) id = k + uid(); S.rooms.push({ id, n: r[1], e: r[2] });
  PACKS[k].forEach(([n, min, energy, freq]) => S.tasks.push({ id: uid(), n, room: id, min, energy, freq: JSON.parse(JSON.stringify(freq)), who: "", pts: energy * 5, carry: false, start: start || today() })); return id; }
function defaultRewards() { return [["🍿", "Pick the movie", 40], ["📱", "30 min extra screen time", 50], ["🍦", "Ice cream trip", 80], ["🌙", "Stay up 30 min later", 60], ["🙅", "Skip one chore", 100]].map(([e, n, c]) => ({ id: uid(), e, n, cost: c })); }

/* forms submit */
const FORMS = {
  task(f) { const id = f.dataset.id, ft = $("tF").value; let freq = { t: ft };
    if (ft === "weekly") { if (!sel.fdays.length) return toast("Pick at least one day"); freq.days = sel.fdays.slice(); }
    if (ft === "every") freq.n = Math.max(2, +$("tFn").value || 3);
    if (ft === "monthly") freq.day = Math.min(31, Math.max(1, +$("tFd").value || 1));
    if (ft === "once") freq.date = $("tFo").value || today();
    const en_ = +$("tE").value; const data = { n: $("tN").value.trim(), room: $("tR").value, min: Math.max(1, +$("tM").value || 5), energy: en_, pts: en_ * 5, freq, who: $("tW").value, carry: $("tC").checked };
    if (!data.n) return;
    if (id) { const t = byId(S.tasks, id); const oldF = JSON.stringify(t.freq); Object.assign(t, data); t.paused = $("tP") ? $("tP").checked : false; if (oldF !== JSON.stringify(freq) && freq.t === "every") t.start = today(); }
    else { S.tasks.push(Object.assign({ id: uid(), start: freq.t === "once" ? freq.date : today() }, data)); if (sel.fromBrain) { const b = byId(S.brain, sel.fromBrain); if (b) b.ok = true; sel.fromBrain = null; } }
    if (freq.t === "once" && id) byId(S.tasks, id).start = freq.date;
    save(); closeSheet(); render(); toast(id ? "Saved ✓" : "Task added ✓"); },
  room(f) { const id = f.dataset.id, d = { n: $("rN").value.trim(), e: $("rE").value.trim() || "🧹" }; if (!d.n) return; if (id) Object.assign(byId(S.rooms, id), d); else S.rooms.push(Object.assign({ id: uid() }, d)); save(); closeSheet(); render(); },
  person(f) { const id = f.dataset.id, c = (document.querySelector('input[name=pc]:checked') || {}).value || COLORS[0], d = { n: $("pN").value.trim(), e: $("pE").value.trim() || "🙂", c }; if (!d.n) return;
    if (id) Object.assign(byId(S.people, id), d); else { S.people.push(Object.assign({ id: uid() }, d)); if (!S.rewards.length) S.rewards = defaultRewards(); } save(); closeSheet(); render(); },
  reward() { const n = $("wN").value.trim(); if (!n) return; S.rewards.push({ id: uid(), e: $("wE").value.trim() || "🎁", n, cost: Math.max(1, +$("wC").value || 50) }); save(); closeSheet(); render(); },
  list() { const n = $("lN").value.trim(); if (!n) return; const l = { id: uid(), e: $("lE").value.trim() || "📋", n, items: $("lI").value.split("\n").map(s => s.trim()).filter(Boolean).map(t => ({ t, ok: false })) }; S.lists.push(l); sel.list = l.id; save(); closeSheet(); render(); },
  item() { const v = $("itemIn").value.trim(); if (!v) return; byId(S.lists, sel.list).items.push({ t: v, ok: false }); save(); render(); setTimeout(() => $("itemIn") && $("itemIn").focus(), 0); },
  brain() { const v = $("brainIn").value.trim(); if (!v) return; S.brain.push({ id: uid(), t: v, ok: false, d: today() }); save(); render(); toast("Parked 🧠"); setTimeout(() => $("brainIn") && $("brainIn").focus(), 0); },
  onbPerson() { const v = $("onbP").value.trim(); if (!v) return; onb.people.push({ n: v, e: ["👩", "🧔", "👧", "👦", "🧑", "👵"][onb.people.length % 6] }); render(); setTimeout(() => $("onbP") && $("onbP").focus(), 0); }
};

/* ---------- events ---------- */
document.addEventListener("click", ev => {
  if (ev.target.id === "sheet") return closeSheet();
  const pc = ev.target.closest(".pcol"); if (pc) { document.querySelectorAll(".pcol").forEach(x => x.style.outline = "none"); pc.style.outline = "3px solid var(--ink)"; pc.previousElementSibling.checked = true; return; }
  const g = ev.target.closest("[data-go]"); if (g) { view = g.dataset.go; sel = {}; closeSheet(); render(); window.scrollTo(0, 0); return; }
  const a = ev.target.closest("[data-a]"); if (a && ACT[a.dataset.a]) { ev.preventDefault(); ACT[a.dataset.a](a, ev); }
});
document.addEventListener("submit", ev => { const f = ev.target.closest("[data-f]"); if (f && FORMS[f.dataset.f]) { ev.preventDefault(); FORMS[f.dataset.f](f); } });
document.addEventListener("change", ev => {
  if (ev.target.id === "restoreFile") { const file = ev.target.files[0]; if (!file) return; const r = new FileReader(); r.onload = () => { try { const d = JSON.parse(r.result); if (!d || !Array.isArray(d.tasks)) throw 0; S = Object.assign(blank(), d); save(); applyTheme(); render(); toast("Backup restored ✓"); } catch (e) { toast("That file isn't a TidyBrain backup"); } }; r.readAsText(file); }
});
document.addEventListener("keydown", ev => {
  if (ev.key === "Escape") return closeSheet();
  if (/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName) || ev.metaKey || ev.ctrlKey || !S.onboarded) return;
  const m = { t: "today", f: "focus", s: "schedule", c: "calendar" }; const k = ev.key.toLowerCase();
  if (k === "n") { ev.preventDefault(); taskForm(null); } else if (m[k]) { view = m[k]; sel = {}; render(); }
});
function applyTheme() { const t = S.theme === "auto" ? (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light") : S.theme; document.documentElement.dataset.theme = t; document.querySelector('meta[name="theme-color"]').content = t === "dark" ? "#0F1424" : "#F5F7FC"; }
const SCR = { today: scrToday, focus: scrFocus, brain: scrBrain, schedule: scrSchedule, rooms: scrRooms, lists: scrLists, calendar: scrCalendar, family: scrFamily, rewards: scrRewards, declutter: scrDeclutter, stats: scrStats, settings: scrSettings, help: scrHelp, more: scrMore };
function render() {
  if (!S.onboarded) { $("snav").style.display = "none"; $("bnav").style.display = "none"; $("main").innerHTML = scrOnboard(); return; }
  $("snav").style.display = ""; $("bnav").style.display = "";
  if (!SCR[view]) view = "today";
  renderNav(); $("main").innerHTML = SCR[view]();
}

/* ---------- example data ---------- */
function demoData() {
  const s = blank(), t0 = today(), start = addD(t0, -60);
  let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  s.name = "Sarah"; s.onboarded = true; s.created = start;
  const S0 = S; S = s;
  ["kitchen", "bath", "bed", "living", "laundry", "entry", "kids", "home"].forEach(k => addRoomPack(k, start));
  s.people = [{ id: "p1", n: "Sarah", e: "🙋‍♀️", c: COLORS[0] }, { id: "p2", n: "Tom", e: "🧔", c: COLORS[2] }, { id: "p3", n: "Mia", e: "👧", c: COLORS[1] }, { id: "p4", n: "Leo", e: "👦", c: COLORS[3] }];
  const give = { "Take out the trash": "p2", "Empty all the bins": "p2", "Mop kitchen floor": "p2", "Scrub shower / tub": "p2", "Vacuum living room": "p2", "Wipe appliances": "p2", "Toy pick-up": "p4", "Shoes & bags in their place": "p4", "Make the bed": "p3", "Clothes off the floor": "p3", "Fold blankets & fluff pillows": "p3", "Water the plants": "p3", "Change kids' sheets": "p1", "Wash dishes / load dishwasher": "p1", "Wipe counters": "p1", "Start a load of laundry": "p1", "Fold & put away laundry": "p3", "Sort the mail": "p2", "Clean the toilet": "p1", "Swap towels": "p4" };
  s.tasks.forEach(t => { t.who = give[t.n] || ["p1", "p2", "p1", ""][Math.floor(rnd() * 4)]; if (t.freq.t !== "daily" && rnd() < .3) t.carry = true; });
  for (let d = start; d < t0; d = addD(d, 1)) { const age = diffD(start, d), p = .55 + .3 * age / 60; dueOn(d).forEach(x => { if (rnd() < p - (x.t.energy - 1) * .08) { s.done[d] = s.done[d] || {}; s.done[d][x.t.id] = x.t.who || "p1"; } }); }
  const td = dueOn(t0); td.forEach((x, i) => { if (i % 5 < 2) { s.done[t0] = s.done[t0] || {}; s.done[t0][x.t.id] = x.t.who || "p1"; } });
  for (let i = 1; i <= 12; i++) { const d = addD(t0, -i); s.done[d] = s.done[d] || {}; if (!Object.keys(s.done[d]).length) { const x = dueOn(d)[0]; if (x) s.done[d][x.t.id] = "p1"; } }
  s.rewards = defaultRewards(); s.redeemed = [{ pid: "p3", rid: s.rewards[0].id, n: s.rewards[0].n, cost: 40, d: addD(t0, -6) }, { pid: "p4", rid: s.rewards[2].id, n: s.rewards[2].n, cost: 80, d: addD(t0, -2) }, { pid: "p2", rid: s.rewards[1].id, n: s.rewards[1].n, cost: 50, d: addD(t0, -9) }];
  s.lists = TEMPLATES.slice(0, 6).map((t, i) => ({ id: uid(), e: t[0], n: t[1], items: t[2].map((x, j) => ({ t: x, ok: i === 0 ? j < 5 : i === 3 ? j < 2 : false })) }));
  s.declutter = { start: addD(t0, -11), done: {}, items: 74 }; [1, 2, 3, 4, 5, 7, 8, 9, 10, 11].forEach(d => s.declutter.done[d] = addD(s.declutter.start, d - 1));
  s.brain = [{ id: uid(), t: "Hallway light bulb is out", ok: false, d: t0 }, { id: uid(), t: "Return library books", ok: false, d: t0 }, { id: uid(), t: "Buy more dish soap", ok: false, d: t0 }, { id: uid(), t: "Wobbly chair leg", ok: true, d: addD(t0, -3) }];
  for (let i = 1; i < 40; i++) if (rnd() < .45) s.sessions.push({ d: addD(t0, -i), min: [5, 10, 15, 25][Math.floor(rnd() * 4)] });
  S = S0; return s;
}

/* ---------- boot ---------- */
applyTheme(); render();
if (matchMedia("(prefers-color-scheme: dark)").addEventListener) matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => { if (S.theme === "auto") applyTheme(); });
if ("serviceWorker" in navigator && location.protocol.startsWith("http")) navigator.serviceWorker.register("sw.js").catch(() => { });
