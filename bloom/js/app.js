"use strict";
/* Bloom — life & habit planner. Everything stays on this device (localStorage). */
const KEY = "bloom.v1";
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
const byId = (a, id) => a.find(x => x.id === id);
const weekStart = ds => addD(ds, -((dow(ds) + 6) % 7));
const MOOD = [null, ["😞", "Rough", "#E8857A"], ["😕", "Low", "#F2A86F"], ["😐", "Okay", "#EDD27A"], ["🙂", "Good", "#9ED0A0"], ["😄", "Great", "#5DB57A"]];
const HC = ["#E07A62", "#5F8A66", "#7D66D6", "#3F7DBA", "#C95C7E", "#D9A23A", "#3BA6A0", "#8C7A6B"];
const THEMES = [["peach", "Peach", "#E07A62", "#FBF6F1"], ["sage", "Sage", "#5F8A66", "#F2F5EF"], ["lavender", "Lavender", "#7D66D6", "#F5F2FB"], ["ocean", "Ocean", "#3F7DBA", "#F0F5FA"], ["blush", "Blush", "#C95C7E", "#FCF3F5"], ["mono", "Classic", "#2E2C2A", "#F4F3F1"], ["dark", "Night", "#FF9A80", "#141218"]];
const COVERS = ["🌸", "🌿", "✨", "🌙", "🦋", "🌻", "🍃", "☀️", "🌷", "⭐", "🫶", "🔥"];
const QUOTES = ["Small steps every day.", "You don't have to see the whole staircase, just take the first step.", "Progress, not perfection.", "Be gentle with yourself — you're doing the best you can.", "What you do every day matters more than what you do once in a while.", "Start where you are. Use what you have. Do what you can.", "One day or day one. You decide.", "Rest is part of the plan.", "Done is better than perfect.", "Little by little, a little becomes a lot.", "You are allowed to bloom slowly.", "Focus on the step in front of you, not the whole staircase."];
const PROMPTS = ["What made you smile today?", "What's one thing you'd like to let go of?", "What did you learn about yourself this week?", "What are you looking forward to?", "What drained your energy today — and what gave it back?", "Describe a small win from today.", "What would make tomorrow great?", "Who are you grateful for, and why?", "What's taking up space in your head right now?", "What does future you need from you today?"];
const AREAS0 = [["health", "Health", "💪", "#5DB57A"], ["mind", "Mind", "🧠", "#7D66D6"], ["work", "Work", "💼", "#3F7DBA"], ["money", "Money", "💰", "#D9A23A"], ["love", "Relationships", "💛", "#C95C7E"], ["home", "Home", "🏡", "#8C7A6B"], ["growth", "Growth", "🌱", "#3BA6A0"], ["fun", "Fun", "🎉", "#E07A62"]];
const STARTER = [["Drink water", "💧", "health"], ["Move 20 minutes", "🏃", "health"], ["Read 10 pages", "📖", "growth"], ["Meditate", "🧘", "mind"], ["No phone in bed", "📵", "mind"], ["Take vitamins", "💊", "health"], ["Journal", "✍️", "mind"], ["Tidy for 10 min", "🧹", "home"], ["Sleep by 11", "😴", "health"], ["Learn something", "🎓", "growth"], ["Track spending", "💸", "money"], ["Call a friend", "📞", "love"]];

/* ---------- state ---------- */
function blank() {
  return { v: 1, name: "", owner: "", title: "Life Planner", theme: "peach", cover: "🌸", sound: true, onboarded: false, created: today(),
    areas: AREAS0.map(([id, n, e, c]) => ({ id, n, e, c })), habits: [], hlog: {}, tasks: [], goals: [], days: {}, journal: {}, reviews: {}, vision: [], water: 8 };
}
let S;
try { S = JSON.parse(localStorage.getItem(KEY)) || blank(); } catch (e) { S = blank(); }
S = Object.assign(blank(), S);
function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { toast("Couldn't save — storage is full"); } }
let view = "today", sel = {};

/* ---------- logic ---------- */
const area = id => byId(S.areas, id) || { n: "General", e: "✨", c: "#999", id: "" };
const day = ds => S.days[ds] || (S.days[ds] = { mood: 0, water: 0, prio: ["", "", ""], prioOk: [false, false, false], grat: ["", "", ""] });
const peekDay = ds => S.days[ds] || {};
function hDue(h, ds) { if (h.archived || ds < h.start) return false; const f = h.freq; if (f.t === "days") return f.days.includes(dow(ds)); return true; }
const hDone = (h, ds) => !!(S.hlog[ds] && S.hlog[ds][h.id]);
function hWeekCount(h, ds) { const ws = weekStart(ds); let n = 0; for (let i = 0; i < 7; i++) if (hDone(h, addD(ws, i))) n++; return n; }
function hStreak(h) { let d = today(), n = 0; if (h.freq.t === "weekly") { let ws = weekStart(d); if (hWeekCount(h, ws) < h.freq.n) ws = addD(ws, -7); while (hWeekCount(h, ws) >= h.freq.n && n < 520) { n++; ws = addD(ws, -7); } return n; }
  if (!hDone(h, d)) d = addD(d, -1); let guard = 0; while (guard++ < 1500) { if (d < h.start) break; if (!hDue(h, d)) { d = addD(d, -1); continue; } if (!hDone(h, d)) break; n++; d = addD(d, -1); } return n; }
function hBest(h) { let best = 0, cur = 0; for (let d = h.start; d <= today(); d = addD(d, 1)) { if (!hDue(h, d) || h.freq.t === "weekly") continue; if (hDone(h, d)) { cur++; best = Math.max(best, cur); } else if (d < today()) cur = 0; } return h.freq.t === "weekly" ? hStreak(h) : best; }
function hRate(h, days = 30) { let due = 0, dn = 0; for (let i = 0; i < days; i++) { const d = addD(today(), -i); if (d < h.start) break; if (h.freq.t === "weekly") { due += h.freq.n / 7; if (hDone(h, d)) dn++; continue; } if (hDue(h, d)) { due++; if (hDone(h, d)) dn++; } } return due ? Math.min(1, dn / due) : 0; }
const freqTxt = f => f.t === "daily" ? "Every day" : f.t === "days" ? f.days.slice().sort((a, b) => ((a + 6) % 7) - ((b + 6) % 7)).map(d => DN[d]).join(" · ") : `${f.n}× a week`;
function dayHabits(ds) { return S.habits.filter(h => hDue(h, ds)); }
function dayPct(ds) { const hs = dayHabits(ds); if (!hs.length) return null; return hs.filter(h => hDone(h, ds)).length / hs.length; }
function anyActivity(ds) { const d = peekDay(ds); return (S.hlog[ds] && Object.keys(S.hlog[ds]).length) || d.mood || S.journal[ds] || S.tasks.some(t => t.doneOn === ds); }
function appStreak() { let d = today(), n = 0; if (!anyActivity(d)) d = addD(d, -1); while (anyActivity(d) && n < 3000) { n++; d = addD(d, -1); } return n; }
function goalPct(g) { return g.steps.length ? g.steps.filter(s => s.ok).length / g.steps.length : (g.done ? 1 : 0); }
function moodAvg(from, to) { let s = 0, n = 0; for (let d = from; d <= to; d = addD(d, 1)) { const m = peekDay(d).mood; if (m) { s += m; n++; } } return n ? s / n : 0; }
function totalChecks() { let n = 0; for (const d in S.hlog) n += Object.keys(S.hlog[d]).length; return n; }
const MS = [
  ["🌱", "First bloom", "Tick off a habit", () => totalChecks() >= 1], ["🌿", "Rooting", "50 habit check-ins", () => totalChecks() >= 50], ["🌳", "Deep roots", "250 habit check-ins", () => totalChecks() >= 250],
  ["🔥", "On a roll", "7-day habit streak", () => S.habits.some(h => hBest(h) >= 7)], ["🌟", "Habit unlocked", "30-day habit streak", () => S.habits.some(h => hBest(h) >= 30)],
  ["✍️", "Dear diary", "Write 7 journal entries", () => Object.values(S.journal).filter(Boolean).length >= 7], ["🌈", "In tune", "Log your mood 30 times", () => Object.values(S.days).filter(d => d.mood).length >= 30],
  ["🎯", "Dream big", "Set a goal", () => S.goals.length >= 1], ["🏆", "Goal getter", "Complete a goal", () => S.goals.some(g => goalPct(g) >= 1)],
  ["✅", "Getting things done", "Finish 25 tasks", () => S.tasks.filter(t => t.done).length >= 25], ["🔁", "Reflect", "Do a weekly review", () => Object.keys(S.reviews).length >= 1],
  ["🙏", "Grateful", "Write 30 gratitudes", () => Object.values(S.days).reduce((a, d) => a + (d.grat || []).filter(Boolean).length, 0) >= 30], ["💯", "Perfect day", "Every habit done in a day", () => Object.keys(S.hlog).some(d => dayPct(d) === 1)]];

/* ---------- UI helpers ---------- */
function toast(m) { const t = $("toast"); t.textContent = m; t.classList.add("on"); clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.remove("on"), 2200); }
function confetti() { const c = document.createElement("div"); c.className = "confetti"; for (let i = 0; i < 60; i++) { const s = document.createElement("i"); s.style.left = Math.random() * 100 + "%"; s.style.background = HC[i % HC.length]; s.style.animationDelay = Math.random() * .5 + "s"; c.appendChild(s); } document.body.appendChild(c); setTimeout(() => c.remove(), 2200); }
function sheet(html) { $("sheetIn").innerHTML = html; $("sheet").classList.add("on"); }
function closeSheet() { $("sheet").classList.remove("on"); }
const pname = () => (S.owner ? S.owner + "'s " : "My ") + (S.title || "Life Planner");
function head(t, sub, right = "") { return `<div class="head"><div><div class="kick">${esc(S.cover)} ${esc(pname())}</div><h1>${t}</h1>${sub ? `<div class="sub">${sub}</div>` : ""}</div><div class="row">${right}</div></div>`; }
const areaTag = id => { const a = area(id); return id ? `<span class="area" style="background:${a.c}22;color:${a.c}">${a.e} ${esc(a.n)}</span>` : ""; };
function ringSVG(p, size, stroke, col, bg) { const r = (size - stroke) / 2, c = 2 * Math.PI * r; return `<svg width="${size}" height="${size}"><circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="${bg}" stroke-width="${stroke}"/><circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="${col}" stroke-width="${stroke}" stroke-linecap="round" stroke-dasharray="${c}" stroke-dashoffset="${c * (1 - Math.min(1, p))}"/></svg>`; }
function habitRow(h, ds) {
  const d = hDone(h, ds), st = hStreak(h), ws = weekStart(ds);
  return `<div class="hb"><span class="e" style="background:${h.c}22">${h.e}</span><div class="t"><div class="n">${esc(h.n)}</div><div class="m">${h.freq.t === "weekly" ? `${hWeekCount(h, ds)}/${h.freq.n} this week` : freqTxt(h.freq)}${st ? ` · 🔥 ${st}${h.freq.t === "weekly" ? " wk" : ""}` : ""}</div></div>
   <div class="wk">${[0, 1, 2, 3, 4, 5, 6].map(i => { const x = addD(ws, i); return `<i style="${hDone(h, x) ? `background:${h.c}` : x === ds ? "outline:1.5px solid var(--mut)" : ""}"></i>`; }).join("")}</div>
   <button class="tick ${d ? "on" : ""}" style="${d ? `background:${h.c};border-color:${h.c}` : ""}" data-a="htick" data-id="${h.id}" data-d="${ds}">✓</button></div>`;
}
function taskRow(t) {
  const late = !t.done && t.due && t.due < today();
  return `<div class="task ${t.done ? "done" : ""}"><button class="tick ${t.done ? "on" : ""}" data-a="ttick" data-id="${t.id}">✓</button><div class="t"><div class="n">${t.pri === 3 ? "🔴 " : t.pri === 2 ? "🟡 " : ""}${esc(t.t)}</div>
   <div class="m">${t.due ? `<span style="${late ? "color:var(--red);font-weight:800" : ""}">📅 ${t.due === today() ? "Today" : t.due === addD(today(), 1) ? "Tomorrow" : fmtD(t.due)}</span>` : ""}${areaTag(t.area)}</div></div><button class="btn ghost sm" data-a="editTask" data-id="${t.id}">Edit</button></div>`;
}

/* ---------- nav ---------- */
const NAV = [["Daily", [["today", "☀️", "Today"], ["habits", "🔁", "Habits"], ["tasks", "✅", "To-do"], ["journal", "✍️", "Journal"]]],
  ["Plan", [["goals", "🎯", "Goals"], ["calendar", "📅", "Calendar"], ["review", "🔄", "Weekly review"], ["vision", "🌈", "Vision board"]]],
  ["Reflect", [["mood", "🌤️", "Mood tracker"], ["insights", "📊", "Insights"], ["wins", "🏆", "Milestones"]]],
  ["App", [["settings", "🎨", "Personalize"], ["help", "❓", "Help"]]]];
const BNAV = [["today", "☀️", "Today"], ["habits", "🔁", "Habits"], ["tasks", "✅", "To-do"], ["journal", "✍️", "Journal"], ["more", "☰", "More"]];
function renderNav() {
  $("snav").innerHTML = `<div class="logo" style="flex-direction:column;align-items:flex-start;gap:0">${S.owner ? `<span class="scr" style="font-size:34px;line-height:1">${esc(S.owner)}'s</span>` : ""}<span>${esc(S.cover)} ${S.owner ? "" : "My "}${esc(S.title)}</span></div>` + NAV.map(([g, it]) => `<div class="g">${g}</div>` + it.map(([k, e, n]) => `<button class="${view === k ? "on" : ""}" data-go="${k}"><span>${e}</span>${n}</button>`).join("")).join("");
  const inMore = !BNAV.some(b => b[0] === view);
  $("bnav").innerHTML = BNAV.map(([k, e, n]) => `<button class="${view === k || (k === "more" && inMore) ? "on" : ""}" data-go="${k}"><span class="i">${e}</span>${n}</button>`).join("");
}

/* ---------- screens ---------- */
function hello() { const h = new Date().getHours(); return h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening"; }
function scrToday() {
  const ds = sel.date || today(), D = day(ds), hs = dayHabits(ds), dn = hs.filter(h => hDone(h, ds)).length, isT = ds === today();
  const tasks = S.tasks.filter(t => !t.done && (t.due && t.due <= ds || t.today)).sort((a, b) => b.pri - a.pri), doneT = S.tasks.filter(t => t.doneOn === ds);
  const q = QUOTES[(pd(ds).getDate() + pd(ds).getMonth()) % QUOTES.length], pr = PROMPTS[pd(ds).getDate() % PROMPTS.length];
  return head(isT ? `${hello()}${S.name ? ", " + esc(S.name) : ""}` : fmtD(ds), isT ? fmtD(ds) + " · " + pd(ds).getFullYear() : "Looking back", `<button class="btn ghost sm" style="font-size:18px" data-a="dshift" data-v="-1">‹</button>${isT ? "" : `<button class="btn ghost sm" data-a="dtoday">Today</button>`}<button class="btn ghost sm" style="font-size:18px" data-a="dshift" data-v="1" ${isT ? "disabled style='opacity:.35'" : ""}>›</button>`) + `
  <div class="g21"><div class="grid">
   <div class="hero"><div class="row" style="gap:18px;flex-wrap:nowrap">
     <div class="ring">${ringSVG(hs.length ? dn / hs.length : 0, 118, 12, "#fff", "rgba(255,255,255,.28)")}<div class="c">${dn}/${hs.length}<small>habits</small></div></div>
     <div style="min-width:0"><div class="l">${isT ? "Today's focus" : "That day"}</div><div class="quote" style="margin:4px 0 12px;font-size:21px">“${esc(q)}”</div>
     <div class="row"><button class="btn" data-a="addTask">+ To-do</button><button class="btn ghost" data-go="journal">✍️ Journal</button></div></div></div></div>
   <div class="card"><h3>🌤️ How are you feeling?</h3><div class="moods">${[1, 2, 3, 4, 5].map(m => `<button class="${D.mood === m ? "on" : ""}" style="${D.mood === m ? `background:${MOOD[m][2]}55` : ""}" data-a="mood" data-v="${m}" title="${MOOD[m][1]}">${MOOD[m][0]}</button>`).join("")}</div>
     ${D.mood ? `<div class="mut sm" style="margin-top:8px">Feeling <b>${MOOD[D.mood][1].toLowerCase()}</b>${D.mood <= 2 ? " — be extra kind to yourself today 💛" : ""}</div>` : ""}</div>
   <div class="card"><h3>⭐ Top 3 priorities</h3>${[0, 1, 2].map(i => `<div class="prio"><button class="tick ${D.prioOk[i] ? "on" : ""}" data-a="prioOk" data-i="${i}">✓</button><input class="i" data-in="prio" data-i="${i}" value="${esc(D.prio[i])}" placeholder="${["The one thing that matters most", "Second priority", "Third priority"][i]}" style="${D.prioOk[i] ? "text-decoration:line-through;color:var(--mut)" : ""}"></div>`).join("")}</div>
   <div class="card"><h3>🔁 Habits<span class="sp"></span><button class="btn ghost sm" data-a="addHabit">+ Habit</button></h3>${hs.length ? hs.map(h => habitRow(h, ds)).join("") : `<div class="empty"><span class="e">🌱</span>No habits yet — add one small thing to do every day.</div>`}</div>
   <div class="card"><h3>✅ To-do<span class="sp"></span><button class="btn ghost sm" data-go="tasks">All</button></h3>${tasks.length || doneT.length ? tasks.map(taskRow).join("") + doneT.map(taskRow).join("") : `<div class="empty">Nothing due. Add a to-do or enjoy the space ✨</div>`}
     <form data-f="quick" class="row" style="flex-wrap:nowrap;margin-top:10px"><input class="i" id="quickIn" placeholder="Quick add a to-do for today…"><button class="btn">Add</button></form></div>
  </div><div class="grid" style="align-content:start">
   <div class="g2" style="grid-template-columns:1fr 1fr"><div class="kpi"><div class="l">Streak</div><div class="v">🔥 ${appStreak()}</div><div class="s">days showing up</div></div>
    <div class="kpi"><div class="l">This week</div><div class="v">${Math.round(weekPct(ds) * 100)}%</div><div class="s">habits done</div></div></div>
   <div class="card"><h3>💧 Water<span class="sp"></span><span class="mut sm">${D.water}/${S.water}</span></h3><div class="water">${[...Array(S.water)].map((_, i) => `<button class="${i < D.water ? "on" : ""}" data-a="water" data-v="${i + 1}">💧</button>`).join("")}</div></div>
   <div class="card"><h3>🙏 Grateful for</h3>${[0, 1, 2].map(i => `<input class="i" style="margin-bottom:7px" data-in="grat" data-i="${i}" value="${esc(D.grat[i])}" placeholder="${["Something small", "Someone", "Something about you"][i]}">`).join("")}</div>
   <div class="card"><h3>✍️ Quick journal</h3><div class="mut sm" style="margin-bottom:6px">${esc(pr)}</div><textarea class="notepad" style="min-height:160px" data-in="journal" data-d="${ds}" placeholder="Write a line or two…">${esc(S.journal[ds] || "")}</textarea></div>
  </div></div>`;
}
function weekPct(ds) { const ws = weekStart(ds); let due = 0, dn = 0; for (let i = 0; i < 7; i++) { const d = addD(ws, i); if (d > today()) break; dayHabits(d).forEach(h => { due++; if (hDone(h, d)) dn++; }); } return due ? dn / due : 0; }

function scrHabits() {
  const ds = today(), m = sel.month || ds.slice(0, 7), [y, mo] = m.split("-").map(Number), nd = new Date(y, mo, 0).getDate();
  const act = S.habits.filter(h => !h.archived), arc = S.habits.filter(h => h.archived);
  return head("Habit tracker", `${act.length} habits · ${Math.round(weekPct(ds) * 100)}% this week`, `<button class="btn" data-a="addHabit">+ Habit</button>`) + `
  <div class="g2">${act.map(h => { const r = hRate(h); return `<div class="card"><div class="hb" style="border:0;padding:0 0 10px"><span class="e" style="background:${h.c}22">${h.e}</span><div class="t"><div class="n">${esc(h.n)}</div><div class="m">${freqTxt(h.freq)} ${areaTag(h.area)}</div></div><button class="btn ghost sm" data-a="editHabit" data-id="${h.id}">Edit</button><button class="tick ${hDone(h, ds) ? "on" : ""}" style="${hDone(h, ds) ? `background:${h.c};border-color:${h.c}` : ""}" data-a="htick" data-id="${h.id}" data-d="${ds}">✓</button></div>
     <div class="row" style="margin-bottom:10px"><span class="chip">🔥 ${hStreak(h)} now</span><span class="chip">🏅 best ${hBest(h)}</span><span class="chip">${Math.round(r * 100)}% · 30 days</span></div>
     <div class="heat" style="grid-template-columns:repeat(${Math.min(nd, 31)},1fr)">${[...Array(nd)].map((_, i) => { const d = `${m}-${pad(i + 1)}`, dn = hDone(h, d), due = hDue(h, d) || h.freq.t === "weekly"; return `<i title="${fmtD(d)}" data-a="htick" data-id="${h.id}" data-d="${d}" style="cursor:pointer;${dn ? `background:${h.c}` : !due ? "opacity:.35" : ""}${d === ds ? ";outline:1.5px solid var(--ink)" : ""}"></i>`; }).join("")}</div>
     <div class="row xs mut" style="margin-top:4px"><span>1</span><span class="sp"></span><span>${MN[mo - 1]}</span><span class="sp"></span><span>${nd}</span></div></div>`; }).join("") || `<div class="card"><div class="empty"><span class="e">🌱</span>Start with one tiny habit. You can add more later.<br><br><button class="btn" data-a="addHabit">+ Add a habit</button></div></div>`}</div>
  <div class="row" style="margin-top:14px"><button class="btn ghost sm" data-a="hmon" data-v="-1">‹ ${MN[(mo + 10) % 12].slice(0, 3)}</button><span class="b">${MN[mo - 1]} ${y}</span><button class="btn ghost sm" data-a="hmon" data-v="1">${MN[mo % 12].slice(0, 3)} ›</button><span class="sp"></span>${arc.length ? `<span class="mut sm">${arc.length} archived — ${arc.map(h => `<button class="chip" data-a="editHabit" data-id="${h.id}">${h.e} ${esc(h.n)}</button>`).join(" ")}</span>` : ""}</div>`;
}

function scrTasks() {
  const f = sel.tf || "open", t0 = today();
  let l = S.tasks.slice();
  if (f === "open") l = l.filter(t => !t.done); if (f === "today") l = l.filter(t => !t.done && (t.today || (t.due && t.due <= t0))); if (f === "upcoming") l = l.filter(t => !t.done && t.due && t.due > t0); if (f === "done") l = l.filter(t => t.done).sort((a, b) => (b.doneOn || "").localeCompare(a.doneOn || ""));
  if (sel.ta) l = l.filter(t => t.area === sel.ta);
  if (f !== "done") l.sort((a, b) => (a.due || "9999").localeCompare(b.due || "9999") || b.pri - a.pri);
  return head("To-do list", `${S.tasks.filter(t => !t.done).length} open · ${S.tasks.filter(t => t.doneOn && t.doneOn >= weekStart(t0)).length} done this week`, `<button class="btn" data-a="addTask">+ To-do</button>`) + `
  <div class="g21"><div class="card"><div class="row" style="margin-bottom:8px"><div class="seg">${[["open", "All open"], ["today", "Today"], ["upcoming", "Upcoming"], ["done", "Done"]].map(([k, n]) => `<button class="${f === k ? "on" : ""}" data-a="tf" data-v="${k}">${n}</button>`).join("")}</div></div>
   <form data-f="quick" class="row" style="flex-wrap:nowrap;margin-bottom:6px"><input class="i" id="quickIn" placeholder="Add a to-do and press Enter…"><button class="btn">Add</button></form>
   ${l.length ? l.map(taskRow).join("") : `<div class="empty"><span class="e">🎉</span>Nothing here.</div>`}</div>
  <div class="card" style="align-self:start"><h3>Life areas</h3><div class="row"><button class="chip ${!sel.ta ? "on" : ""}" data-a="ta" data-v="">All</button>${S.areas.map(a => `<button class="chip ${sel.ta === a.id ? "on" : ""}" data-a="ta" data-v="${a.id}">${a.e} ${esc(a.n)} <span class="mut">${S.tasks.filter(t => !t.done && t.area === a.id).length}</span></button>`).join("")}</div>
   <div class="note" style="margin-top:14px">💡 Too much on your list? Pick just <b>3</b> for today and star them on the Today page.</div></div></div>`;
}

function scrJournal() {
  const ds = sel.jd || today(), ents = Object.entries(S.journal).filter(([, v]) => v && v.trim()).sort((a, b) => b[0].localeCompare(a[0])), q = (sel.jq || "").toLowerCase();
  const shown = q ? ents.filter(([, v]) => v.toLowerCase().includes(q)) : ents;
  return head("Journal", `${ents.length} entries`, `<button class="btn" data-a="jtoday">✍️ Write today</button>`) + `
  <div class="g21 jg"><div class="card"><div class="row" style="margin-bottom:6px"><h3 style="margin:0">${fmtD(ds)} ${pd(ds).getFullYear()}</h3><span class="sp"></span>${peekDay(ds).mood ? `<span style="font-size:24px">${MOOD[peekDay(ds).mood][0]}</span>` : ""}</div>
   <div class="note" style="margin-bottom:8px">💭 ${esc(PROMPTS[pd(ds).getDate() % PROMPTS.length])}</div>
   <textarea class="notepad" data-in="journal" data-d="${ds}" placeholder="Dear diary…">${esc(S.journal[ds] || "")}</textarea></div>
  <div class="card jlist" style="align-self:start"><input class="i" data-in="jq" placeholder="🔎 Search your journal" value="${esc(sel.jq || "")}" style="margin-bottom:8px">
   ${shown.slice(0, 40).map(([d, v]) => `<button class="${d === ds ? "on" : ""}" data-a="jopen" data-v="${d}"><div class="row"><b>${fmtD(d)}</b><span class="sp"></span>${peekDay(d).mood ? MOOD[peekDay(d).mood][0] : ""}</div><div class="mut sm" style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(v.slice(0, 90))}</div></button>`).join("") || `<div class="mut sm">Your entries show up here.</div>`}</div></div>`;
}

function scrGoals() {
  const f = sel.gf || "all", l = S.goals.filter(g => f === "all" || (f === "done" ? goalPct(g) >= 1 : goalPct(g) < 1));
  return head("Goals", "Big dreams, small steps", `<div class="seg">${[["all", "All"], ["active", "Active"], ["done", "Done"]].map(([k, n]) => `<button class="${f === k ? "on" : ""}" data-a="gf" data-v="${k}">${n}</button>`).join("")}</div><button class="btn" data-a="addGoal">+ Goal</button>`) + `
  <div class="g3">${l.map(g => { const p = goalPct(g), a = area(g.area); return `<div class="card goal" style="border-top:5px solid ${a.c}"><div class="row" style="flex-wrap:nowrap"><span style="font-size:30px">${g.e}</span><div style="flex:1;min-width:0"><div class="b" style="font-size:17px">${esc(g.n)}</div><div class="row">${areaTag(g.area)}${g.due ? `<span class="mut xs">by ${fmtD(g.due)} ${pd(g.due).getFullYear()}</span>` : ""}</div></div><button class="btn ghost sm" data-a="editGoal" data-id="${g.id}">Edit</button></div>
    ${g.why ? `<div class="mut sm" style="margin:8px 0;font-style:italic">“${esc(g.why)}”</div>` : ""}
    <div class="row" style="margin:10px 0 6px"><div class="pbar" style="flex:1"><i style="width:${p * 100}%;background:${a.c}"></i></div><b class="sm">${Math.round(p * 100)}%</b></div>
    <div class="steps">${g.steps.map((s, i) => `<div class="list-it ${s.ok ? "done" : ""}"><button class="tick ${s.ok ? "on" : ""}" style="width:24px;height:24px;flex:0 0 24px;font-size:13px" data-a="step" data-id="${g.id}" data-i="${i}">✓</button><div class="tx sm">${esc(s.t)}</div></div>`).join("")}</div>
    <form data-f="step" data-id="${g.id}" class="row" style="flex-wrap:nowrap;margin-top:8px"><input class="i" placeholder="Add a step…" style="padding:8px 10px;font-size:14px"><button class="btn ghost sm">+</button></form>
    ${p >= 1 ? `<div class="chip" style="margin-top:10px;background:var(--mint2);color:var(--mint)">🏆 Goal complete!</div>` : ""}</div>`; }).join("") || `<div class="card"><div class="empty"><span class="e">🎯</span>What would make this year amazing? Add a goal and break it into tiny steps.</div></div>`}</div>`;
}

function scrCalendar() {
  const ref = sel.month || today().slice(0, 7), [y, m] = ref.split("-").map(Number), start = weekStart(`${ref}-01`), cells = [];
  for (let i = 0; i < 42; i++) { const d = addD(start, i); if (i >= 35 && d.slice(0, 7) !== ref) break; cells.push(d); }
  const pick = sel.day || today(), P = peekDay(pick), pt = S.tasks.filter(t => t.due === pick || t.doneOn === pick);
  return head("Calendar", "Your month at a glance") + `<div class="g21"><div class="card">
   <div class="row" style="margin-bottom:10px"><button class="btn ghost sm" data-a="mon" data-v="-1">‹</button><div class="sp" style="text-align:center;font-family:Serif;font-size:24px">${MN[m - 1]} ${y}</div><button class="btn ghost sm" data-a="mon" data-v="1">›</button></div>
   <div class="cal">${["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map(d => `<div class="dh">${d}</div>`).join("")}
   ${cells.map(d => { const p = dayPct(d), md = peekDay(d).mood, due = S.tasks.filter(t => t.due === d && !t.done).length; return `<button class="d ${d.slice(0, 7) !== ref ? "o" : ""} ${d === today() ? "t" : ""} ${d === pick ? "sel" : ""}" data-a="day" data-v="${d}" style="${md && d !== pick ? `background:${MOOD[md][2]}33` : ""}"><span class="row" style="gap:3px">${pd(d).getDate()}<span class="sp"></span>${md ? `<span style="font-size:13px">${MOOD[md][0]}</span>` : ""}</span>${due ? `<span class="mut" style="font-size:10px">${due} to-do</span>` : ""}${p != null && d <= today() ? `<span class="bar"><i style="width:${p * 100}%;background:var(--br)"></i></span>` : ""}</button>`; }).join("")}</div>
   <div class="row xs mut" style="margin-top:10px;gap:12px"><span>Colour = mood</span><span>Bar = habits done</span></div></div>
   <div class="card" style="align-self:start"><h3>${fmtD(pick)}<span class="sp"></span>${P.mood ? `<span style="font-size:24px">${MOOD[P.mood][0]}</span>` : ""}</h3>
    ${dayHabits(pick).length ? `<div class="pick mut">HABITS · ${dayHabits(pick).filter(h => hDone(h, pick)).length}/${dayHabits(pick).length}</div>${dayHabits(pick).map(h => `<span class="chip" style="margin:4px 4px 0 0;${hDone(h, pick) ? `background:${h.c}33` : "opacity:.55"}">${h.e} ${esc(h.n)}</span>`).join("")}` : ""}
    ${pt.length ? `<div class="pick mut" style="margin-top:12px">TO-DO</div>${pt.map(taskRow).join("")}` : ""}
    ${(P.prio || []).some(Boolean) ? `<div class="pick mut" style="margin-top:12px">PRIORITIES</div>${P.prio.filter(Boolean).map((x, i) => `<div class="sm">${P.prioOk[i] ? "✅" : "⭐"} ${esc(x)}</div>`).join("")}` : ""}
    ${S.journal[pick] ? `<div class="pick mut" style="margin-top:12px">JOURNAL</div><div class="sm" style="white-space:pre-line">${esc(S.journal[pick].slice(0, 300))}</div>` : ""}
    <div class="row" style="margin-top:12px"><button class="btn ghost sm" data-a="openDay" data-v="${pick}">Open this day</button></div></div></div>`;
}

function scrReview() {
  const ws = sel.ws || weekStart(today()), we = addD(ws, 6), R = S.reviews[ws] || {}, hs = S.habits.filter(h => !h.archived);
  const dn = S.tasks.filter(t => t.doneOn && t.doneOn >= ws && t.doneOn <= we).length, mood = moodAvg(ws, we), js = [0, 1, 2, 3, 4, 5, 6].filter(i => S.journal[addD(ws, i)]).length;
  return head("Weekly review", `${fmtD(ws)} – ${fmtD(we)}`, `<button class="btn ghost sm" data-a="wshift" data-v="-7">‹ Prev</button><button class="btn ghost sm" data-a="wshift" data-v="7">Next ›</button>`) + `
  <div class="g4"><div class="kpi"><div class="l">Habits</div><div class="v">${Math.round(weekPct(ws) * 100)}%</div></div><div class="kpi"><div class="l">To-dos done</div><div class="v">${dn}</div></div><div class="kpi"><div class="l">Avg mood</div><div class="v">${mood ? MOOD[Math.round(mood)][0] + " " + mood.toFixed(1) : "—"}</div></div><div class="kpi"><div class="l">Journal</div><div class="v">${js}/7</div><div class="s">days written</div></div></div>
  <div class="g21" style="margin-top:14px"><div class="card">
   ${[["wins", "🏆 Wins this week", "Big or small — they all count"], ["hard", "🌧️ What was hard?", "No judgement, just notice"], ["learn", "💡 What did I learn?", ""], ["focus", "🎯 Focus for next week", "1–3 things that matter most"]].map(([k, t, p]) => `<label class="f"><span>${t.toUpperCase()}</span><textarea class="i" rows="3" data-in="rev" data-k="${k}" data-ws="${ws}" placeholder="${p}">${esc(R[k] || "")}</textarea></label>`).join("")}
   <div class="pick mut" style="margin-bottom:6px">RATE YOUR WEEK</div><div class="row">${[1, 2, 3, 4, 5].map(n => `<button class="btn ${R.rate >= n ? "sun" : "ghost"} sm" data-a="rrate" data-v="${n}" data-ws="${ws}">★</button>`).join("")}</div></div>
  <div class="card" style="align-self:start"><h3>Habits this week</h3>${hs.map(h => { let n = 0, due = 0; for (let i = 0; i < 7; i++) { const d = addD(ws, i); if (hDone(h, d)) n++; if (hDue(h, d)) due++; } if (h.freq.t === "weekly") due = h.freq.n;
     return `<div style="margin-bottom:9px"><div class="row sm"><b>${h.e} ${esc(h.n)}</b><span class="sp"></span><span class="mut">${n}/${due}</span></div><div class="pbar"><i style="width:${due ? Math.min(1, n / due) * 100 : 0}%;background:${h.c}"></i></div></div>`; }).join("") || `<div class="mut sm">No habits yet.</div>`}</div></div>`;
}

function scrVision() {
  return head("Vision board", "The life you're growing toward", `<button class="btn" data-a="addVision">+ Add</button>`) + `
  <div class="vis">${S.vision.map((v, i) => `<div class="v" style="background:${v.c}2a;border:1px solid ${v.c}55"><button data-a="delVision" data-id="${v.id}">✕</button><div class="e">${v.e}</div><div class="t">${esc(v.t)}</div></div>`).join("") || ""}
  <button class="v" style="border:2px dashed var(--line);background:none;align-items:center;justify-content:center;color:var(--mut);font-weight:800" data-a="addVision">+ Add a dream,<br>word or affirmation</button></div>
  <div class="card" style="margin-top:14px"><h3>Ideas</h3><div class="row">${["I am calm and capable", "Travel to Japan", "Run a 5K", "Debt-free", "Read 24 books", "Morning walks", "A cosy home", "More time with family", "Start my business", "Healthy & strong"].map(t => `<button class="chip" data-a="visIdea" data-v="${esc(t)}">+ ${esc(t)}</button>`).join("")}</div></div>`;
}

function scrMood() {
  const y = sel.year || +today().slice(0, 4), months = [...Array(12)].map((_, i) => i);
  const vals = Object.entries(S.days).filter(([d, v]) => v.mood && d.startsWith(y)).map(([, v]) => v.mood), cnt = [0, 0, 0, 0, 0, 0]; vals.forEach(v => cnt[v]++);
  const t0 = today(), last = [...Array(30)].map((_, i) => addD(t0, i - 29)), mx = 5;
  return head("Mood tracker", `Year in pixels · ${y}`, `<button class="btn ghost sm" data-a="yshift" data-v="-1">‹</button><button class="btn ghost sm" data-a="yshift" data-v="1">›</button>`) + `
  <div class="g21"><div class="card"><div class="pixwrap">${months.map(m => { const nd = new Date(y, m + 1, 0).getDate(); return `<b class="xs mut">${MN[m].slice(0, 3)}</b><div class="pix">${[...Array(31)].map((_, i) => { if (i >= nd) return `<i style="opacity:0"></i>`; const d = `${y}-${pad(m + 1)}-${pad(i + 1)}`, md = peekDay(d).mood; return `<i title="${fmtD(d)}${md ? " · " + MOOD[md][1] : ""}" style="${md ? `background:${MOOD[md][2]}` : ""}${d === t0 ? ";outline:1.5px solid var(--ink)" : ""}"></i>`; }).join("")}</div>`; }).join("")}</div>
   <div class="row" style="margin-top:12px;gap:12px">${[1, 2, 3, 4, 5].map(m => `<span class="row xs" style="gap:4px"><i style="width:12px;height:12px;border-radius:3px;background:${MOOD[m][2]};display:inline-block"></i>${MOOD[m][1]}</span>`).join("")}</div></div>
  <div class="grid" style="align-content:start"><div class="card"><h3>Last 30 days</h3><svg viewBox="0 0 300 120" width="100%"><polyline fill="none" stroke="var(--br)" stroke-width="3" stroke-linejoin="round" stroke-linecap="round" points="${last.map((d, i) => peekDay(d).mood ? `${i * 300 / 29},${110 - (peekDay(d).mood - 1) * 25}` : "").filter(Boolean).join(" ")}"/>${last.map((d, i) => peekDay(d).mood ? `<circle cx="${i * 300 / 29}" cy="${110 - (peekDay(d).mood - 1) * 25}" r="4" fill="${MOOD[peekDay(d).mood][2]}"/>` : "").join("")}</svg>
    <div class="mut sm">Average: <b>${moodAvg(last[0], t0) ? moodAvg(last[0], t0).toFixed(1) + " / 5" : "—"}</b></div></div>
   <div class="card"><h3>${y} in moods</h3>${[5, 4, 3, 2, 1].map(m => `<div class="row sm" style="margin-bottom:6px;flex-wrap:nowrap"><span style="width:26px">${MOOD[m][0]}</span><div class="pbar" style="flex:1"><i style="width:${vals.length ? cnt[m] / vals.length * 100 : 0}%;background:${MOOD[m][2]}"></i></div><span class="mut" style="width:30px;text-align:right">${cnt[m]}</span></div>`).join("")}</div></div></div>`;
}

function scrInsights() {
  const t0 = today(), from = addD(t0, -29), days = [...Array(14)].map((_, i) => addD(t0, i - 13)), hs = S.habits.filter(h => !h.archived);
  const corr = hs.map(h => { let a = 0, an = 0, b = 0, bn = 0; for (let d = addD(t0, -59); d <= t0; d = addD(d, 1)) { const m = peekDay(d).mood; if (!m || !hDue(h, d)) continue; if (hDone(h, d)) { a += m; an++; } else { b += m; bn++; } } return { h, diff: an >= 3 && bn >= 3 ? a / an - b / bn : null, with: an ? a / an : 0 }; }).filter(x => x.diff != null).sort((x, y) => y.diff - x.diff);
  return head("Insights", "What your data is telling you") + `<div class="g4"><div class="kpi"><div class="l">Showing up</div><div class="v">🔥 ${appStreak()}</div><div class="s">day streak</div></div><div class="kpi"><div class="l">Habits · 30d</div><div class="v">${hs.length ? Math.round(hs.reduce((a, h) => a + hRate(h), 0) / hs.length * 100) : 0}%</div></div>
  <div class="kpi"><div class="l">Mood · 30d</div><div class="v">${moodAvg(from, t0) ? MOOD[Math.round(moodAvg(from, t0))][0] + " " + moodAvg(from, t0).toFixed(1) : "—"}</div></div><div class="kpi"><div class="l">To-dos · 30d</div><div class="v">✅ ${S.tasks.filter(t => t.doneOn >= from).length}</div></div></div>
  <div class="g2" style="margin-top:14px"><div class="card"><h3>Habits done · 14 days</h3><div class="bars">${days.map(d => { const p = dayPct(d) || 0; return `<div class="bc"><b>${dayHabits(d).length ? Math.round(p * 100) : ""}</b><i style="height:${p * 110}px;${d === t0 ? "background:var(--mint)" : ""}"></i><span>${DN[dow(d)][0]}</span></div>`; }).join("")}</div></div>
  <div class="card"><h3>💡 Habits & your mood</h3>${corr.length ? corr.slice(0, 5).map(x => `<div class="hb"><span class="e" style="background:${x.h.c}22">${x.h.e}</span><div class="t"><div class="n">${esc(x.h.n)}</div><div class="m">${x.diff > .05 ? `Mood is <b style="color:var(--mint)">${x.diff.toFixed(1)} higher</b> on days you do it` : x.diff < -.05 ? `Mood is ${Math.abs(x.diff).toFixed(1)} lower on these days` : "No clear link yet"}</div></div></div>`).join("") : `<div class="mut sm">Log your mood and habits for a couple of weeks — we'll show which habits lift your mood.</div>`}</div></div>
  <div class="card" style="margin-top:14px"><h3>Habit scoreboard · 30 days</h3>${hs.map(h => `<div style="margin-bottom:9px"><div class="row sm"><b>${h.e} ${esc(h.n)}</b><span class="sp"></span><span class="mut">🔥 ${hStreak(h)} · best ${hBest(h)} · ${Math.round(hRate(h) * 100)}%</span></div><div class="pbar"><i style="width:${hRate(h) * 100}%;background:${h.c}"></i></div></div>`).join("") || `<div class="mut sm">Add habits to see them here.</div>`}</div>`;
}
function scrWins() { const un = MS.filter(m => m[3]()).length;
  return head("Milestones", `${un} of ${MS.length} unlocked`) + `<div class="card"><div class="g3">${MS.map(m => `<div class="ms ${m[3]() ? "" : "lock"}"><span class="e">${m[0]}</span><div><div class="b">${m[1]}</div><div class="mut xs">${m[2]}</div></div></div>`).join("")}</div></div>`; }

function scrSettings() {
  return head("Personalize", "Make it yours") + `<div class="g2"><div class="grid" style="align-content:start"><div class="card"><h3>🎨 Your planner</h3>
   <div class="cover" style="margin-bottom:10px"><div class="em">${esc(S.cover)}</div><div>${S.owner ? `<div class="o">${esc(S.owner)}'s</div>` : ""}<div class="ti">${S.owner ? "" : "My "}${esc(S.title)}</div></div></div>
   <div class="g2" style="grid-template-columns:1fr 1fr;gap:10px"><label class="f"><span>NAME ON THE COVER</span><input class="i" data-set="owner" value="${esc(S.owner)}" placeholder="e.g. Sarah"></label>
   <label class="f"><span>PLANNER TITLE</span><input class="i" data-set="title" value="${esc(S.title)}" list="tl"><datalist id="tl">${["Life Planner", "Habit Tracker", "Daily Planner", "Wellness Journal", "Self-Care Planner", "Goal Planner"].map(t => `<option value="${t}">`).join("")}</datalist></label></div>
   <div class="pick mut" style="margin-bottom:6px">COLOUR THEME</div><div class="sw" style="margin-bottom:14px">${THEMES.map(([k, n, c, b]) => `<button class="${S.theme === k ? "on" : ""}" data-a="theme" data-v="${k}"><i style="background:linear-gradient(135deg,${b} 50%,${c} 50%)"></i>${n}</button>`).join("")}</div>
   <div class="pick mut" style="margin-bottom:6px">COVER ICON</div><div class="row">${COVERS.map(c => `<button class="chip ${S.cover === c ? "on" : ""}" data-a="cover" data-v="${c}" style="font-size:19px">${c}</button>`).join("")}</div></div>
   <div class="card"><h3>🙂 You</h3><label class="f"><span>WHAT SHOULD WE CALL YOU?</span><input class="i" data-set="name" value="${esc(S.name)}"></label><label class="f"><span>DAILY WATER GOAL (GLASSES)</span><input class="i" type="number" min="1" max="16" data-set="water" value="${S.water}"></label></div>
   <div class="card"><h3>🏷️ Life areas</h3><div class="row">${S.areas.map(a => `<button class="chip" data-a="editArea" data-id="${a.id}" style="background:${a.c}22">${a.e} ${esc(a.n)}</button>`).join("")}<button class="chip on" data-a="addArea">+ Area</button></div></div></div>
  <div class="grid" style="align-content:start"><div class="card"><h3>💾 Your data</h3><div class="mut sm" style="margin-bottom:12px">Everything is saved on this device only. Download a backup now and then — and to move to a new phone.</div>
   <div class="row"><button class="btn" data-a="backup">⬇ Download backup</button><button class="btn ghost" data-a="restore">⬆ Restore</button></div><input type="file" id="restoreFile" accept=".json,application/json" style="display:none">
   <div class="row" style="margin-top:16px"><button class="btn ghost" data-a="demo">✨ Load example data</button><button class="btn ghost" data-a="erase" style="color:var(--red)">Erase everything</button></div></div>
   <div class="card"><h3>📲 Install on your phone</h3><div class="sm"><b>iPhone/iPad:</b> Safari → Share → Add to Home Screen.<br><b>Android:</b> Chrome → ⋮ → Add to Home screen.<br><b>Computer:</b> Chrome or Edge → install icon in the address bar.</div></div></div></div>`;
}
function scrHelp() {
  const q = [["Where do I start?", "Add 2–3 small habits, set your top 3 priorities each morning, and tap how you feel. That's it. Everything else is a bonus."],
    ["Habits", "Daily, on certain days (e.g. Mon/Wed/Fri), or a number of times per week. Tick them on Today or tap any square on the Habits page to fill in a past day."],
    ["Missed a day?", "That's okay. Streaks are there to encourage you, not to judge. Just tick today."],
    ["Mood & insights", "Tap a face on Today. After a couple of weeks Insights shows which habits go with your better days."],
    ["Weekly review", "Once a week (Sunday works well) look back at your wins, what was hard, and pick a focus for next week."],
    ["Where is my data?", "Only on this device, in this browser. Nothing is uploaded. Use Personalize → Download backup to keep a copy or move to a new device."],
    ["Keyboard shortcuts", "T Today · H Habits · D To-do · J Journal · G Goals · N new to-do."]];
  return head("Help", "Quick answers") + `<div class="g2">${q.map(([a, b]) => `<div class="card"><h3>${a}</h3><div class="sm mut">${b}</div></div>`).join("")}</div>`;
}
function scrMore() { return head("More", "Everything in your planner") + NAV.map(([g, it]) => `<div class="pick mut" style="margin:14px 2px 8px">${g.toUpperCase()}</div><div class="tiles">${it.map(([k, e, n]) => `<button class="tile" data-go="${k}"><div class="e">${e}</div><div class="n">${n}</div></button>`).join("")}</div>`).join(""); }

/* ---------- onboarding ---------- */
let onb = { step: 0, habits: ["Drink water", "Move 20 minutes", "Read 10 pages"] };
function scrOnboard() {
  const dots = `<div class="dots">${[0, 1].map(i => `<i class="${onb.step === i ? "on" : ""}"></i>`).join("")}</div>`; let c;
  if (onb.step === 0) c = `<div class="cover" style="margin-bottom:14px"><div class="em">${esc(S.cover)}</div><div>${S.owner ? `<div class="o">${esc(S.owner)}'s</div>` : ""}<div class="ti">${S.owner ? "" : "My "}${esc(S.title)}</div></div></div>
    <h1 style="font-family:Serif;font-weight:400;font-size:30px;margin-bottom:4px">${S.owner ? "Welcome, " + esc(S.owner.split(" ")[0]) + "!" : "Welcome to Bloom"}</h1><div class="mut" style="margin-bottom:14px">Your gentle planner for habits, goals, moods and the little things. Small steps, no pressure.</div>
    <label class="f"><span>WHAT SHOULD WE CALL YOU?</span><input class="i" id="onbName" value="${esc(S.name || S.owner)}" placeholder="Your name"></label>
    <div class="pick mut" style="margin-bottom:6px">PICK YOUR COLOURS</div><div class="sw" style="margin-bottom:16px">${THEMES.map(([k, n, cc, b]) => `<button class="${S.theme === k ? "on" : ""}" data-a="obTheme" data-v="${k}"><i style="background:linear-gradient(135deg,${b} 50%,${cc} 50%)"></i>${n}</button>`).join("")}</div>
    <div class="row"><button class="btn ghost" data-a="demo">✨ Try with example data</button><span class="sp"></span><button class="btn" data-a="onbNext">Next</button></div>`;
  else c = `<h1 style="font-family:Serif;font-weight:400;font-size:26px;margin-bottom:4px">Pick a few tiny habits</h1><div class="mut sm" style="margin-bottom:14px">Start small — 2 or 3 is perfect. You can change these any time.</div>
    <div class="g2" style="grid-template-columns:1fr 1fr;gap:8px">${STARTER.map(([n, e]) => `<button class="opt ${onb.habits.includes(n) ? "on" : ""}" data-a="obHabit" data-v="${esc(n)}"><span style="font-size:20px">${e}</span>${esc(n)}</button>`).join("")}</div>
    <div class="row" style="margin-top:14px"><button class="btn ghost" data-a="onbBack">Back</button><span class="sp"></span><button class="btn" data-a="onbDone">Start blooming 🌸</button></div>`;
  return `<div class="onb"><div class="card">${c}${dots}</div></div>`;
}

/* ---------- forms ---------- */
function habitForm(h) {
  const n = !h; h = h || { n: "", e: "⭐", area: "", c: HC[S.habits.length % HC.length], freq: { t: "daily" } }; sel.fdays = h.freq.t === "days" ? h.freq.days.slice() : [1, 3, 5];
  sheet(`<h2>${n ? "New habit" : "Edit habit"}</h2><form data-f="habit" data-id="${h.id || ""}"><div class="g2" style="grid-template-columns:80px 1fr;gap:10px"><label class="f"><span>EMOJI</span><input class="i" id="hE" value="${esc(h.e)}" maxlength="4"></label><label class="f"><span>HABIT</span><input class="i" id="hN" value="${esc(h.n)}" placeholder="e.g. Drink water" required></label></div>
   <label class="f"><span>HOW OFTEN</span><select class="i" id="hF"><option value="daily" ${h.freq.t === "daily" ? "selected" : ""}>Every day</option><option value="days" ${h.freq.t === "days" ? "selected" : ""}>On certain days</option><option value="weekly" ${h.freq.t === "weekly" ? "selected" : ""}>A number of times per week</option></select></label><div id="fx"></div>
   <label class="f"><span>LIFE AREA</span><select class="i" id="hA"><option value="">None</option>${S.areas.map(a => `<option value="${a.id}" ${a.id === h.area ? "selected" : ""}>${a.e} ${esc(a.n)}</option>`).join("")}</select></label>
   <div class="pick mut" style="margin-bottom:6px">COLOUR</div><div class="row" style="margin-bottom:14px">${HC.map(c => `<button type="button" class="av hcol" data-c="${c}" style="background:${c};width:30px;height:30px;outline:${c === h.c ? "3px solid var(--ink)" : "none"}"></button>`).join("")}<input type="hidden" id="hC" value="${h.c}"></div>
   <div class="row"><button class="btn">${n ? "Add habit" : "Save"}</button><button class="btn ghost" type="button" data-a="close">Cancel</button><span class="sp"></span>${!n ? `<button class="btn ghost" type="button" data-a="archHabit" data-id="${h.id}">${h.archived ? "Restore" : "Archive"}</button><button class="btn ghost" type="button" data-a="delHabit" data-id="${h.id}" style="color:var(--red)">Delete</button>` : ""}</div></form>`);
  const fx = () => { const v = $("hF").value; $("fx").innerHTML = v === "days" ? `<div class="days" style="margin-bottom:12px">${[1, 2, 3, 4, 5, 6, 0].map(d => `<button type="button" class="${sel.fdays.includes(d) ? "on" : ""}" data-a="fday" data-v="${d}">${DN[d].slice(0, 2)}</button>`).join("")}</div>` : v === "weekly" ? `<label class="f"><span>TIMES PER WEEK</span><input class="i" id="hW" type="number" min="1" max="7" value="${h.freq.n || 3}"></label>` : ""; };
  fx(); $("hF").onchange = fx; sheet.fx = fx;
}
function taskForm(t) {
  const n = !t; t = t || { t: "", due: today(), pri: 1, area: "", today: false };
  sheet(`<h2>${n ? "New to-do" : "Edit to-do"}</h2><form data-f="task" data-id="${t.id || ""}"><label class="f"><span>TO-DO</span><input class="i" id="tT" value="${esc(t.t)}" required placeholder="What needs doing?"></label>
   <div class="g2" style="grid-template-columns:1fr 1fr;gap:10px"><label class="f"><span>DUE</span><input class="i" type="date" id="tD" value="${t.due || ""}"></label><label class="f"><span>PRIORITY</span><select class="i" id="tP">${[[1, "Normal"], [2, "🟡 Important"], [3, "🔴 Urgent"]].map(([v, l]) => `<option value="${v}" ${t.pri === v ? "selected" : ""}>${l}</option>`).join("")}</select></label></div>
   <label class="f"><span>LIFE AREA</span><select class="i" id="tA"><option value="">None</option>${S.areas.map(a => `<option value="${a.id}" ${a.id === t.area ? "selected" : ""}>${a.e} ${esc(a.n)}</option>`).join("")}</select></label>
   <div class="row"><button class="btn">${n ? "Add" : "Save"}</button><button class="btn ghost" type="button" data-a="close">Cancel</button><span class="sp"></span>${!n ? `<button class="btn ghost" type="button" data-a="delTask" data-id="${t.id}" style="color:var(--red)">Delete</button>` : ""}</div></form>`);
}
function goalForm(g) {
  const n = !g; g = g || { n: "", e: "🎯", area: "", due: "", why: "", steps: [] };
  sheet(`<h2>${n ? "New goal" : "Edit goal"}</h2><form data-f="goal" data-id="${g.id || ""}"><div class="g2" style="grid-template-columns:80px 1fr;gap:10px"><label class="f"><span>EMOJI</span><input class="i" id="gE" value="${esc(g.e)}" maxlength="4"></label><label class="f"><span>GOAL</span><input class="i" id="gN" value="${esc(g.n)}" required placeholder="e.g. Run a 5K"></label></div>
   <div class="g2" style="grid-template-columns:1fr 1fr;gap:10px"><label class="f"><span>LIFE AREA</span><select class="i" id="gA"><option value="">None</option>${S.areas.map(a => `<option value="${a.id}" ${a.id === g.area ? "selected" : ""}>${a.e} ${esc(a.n)}</option>`).join("")}</select></label><label class="f"><span>BY WHEN (OPTIONAL)</span><input class="i" type="date" id="gD" value="${g.due || ""}"></label></div>
   <label class="f"><span>WHY IT MATTERS</span><input class="i" id="gW" value="${esc(g.why)}" placeholder="Your reason keeps you going"></label>
   ${n ? `<label class="f"><span>FIRST STEPS (ONE PER LINE)</span><textarea class="i" id="gS" rows="4" placeholder="Buy running shoes&#10;Run 1K three times"></textarea></label>` : ""}
   <div class="row"><button class="btn">${n ? "Add goal" : "Save"}</button><button class="btn ghost" type="button" data-a="close">Cancel</button><span class="sp"></span>${!n ? `<button class="btn ghost" type="button" data-a="delGoal" data-id="${g.id}" style="color:var(--red)">Delete</button>` : ""}</div></form>`);
}

/* ---------- actions ---------- */
function celebrate(ds) { const hs = dayHabits(ds); if (hs.length && hs.every(h => hDone(h, ds))) { confetti(); toast("All habits done! You're blooming 🌸"); return true; } return false; }
const ACT = {
  close: closeSheet,
  htick(e) { const h = byId(S.habits, e.dataset.id), ds = e.dataset.d; if (ds > today()) return toast("That day hasn't happened yet"); S.hlog[ds] = S.hlog[ds] || {}; const on = !S.hlog[ds][h.id]; if (on) S.hlog[ds][h.id] = 1; else delete S.hlog[ds][h.id]; if (!Object.keys(S.hlog[ds]).length) delete S.hlog[ds]; save();
    if (on && !celebrate(ds)) toast(`${h.e} Nice!${hStreak(h) > 1 ? ` ${hStreak(h)} in a row 🔥` : ""}`); render(); },
  mood(e) { const D = day(sel.date || today()), v = +e.dataset.v; D.mood = D.mood === v ? 0 : v; save(); render(); },
  water(e) { const D = day(sel.date || today()), v = +e.dataset.v; D.water = D.water === v ? v - 1 : v; save(); render(); if (D.water === S.water) toast("Water goal reached 💧"); },
  prioOk(e) { const D = day(sel.date || today()), i = +e.dataset.i; D.prioOk[i] = !D.prioOk[i]; save(); if (D.prioOk.every(Boolean) && D.prio.every(Boolean)) { confetti(); toast("Top 3 done! ⭐"); } render(); },
  dshift(e) { const d = addD(sel.date || today(), +e.dataset.v); if (d > today()) return; sel.date = d === today() ? null : d; render(); }, dtoday() { sel.date = null; render(); },
  openDay(e) { view = "today"; sel = { date: e.dataset.v === today() ? null : e.dataset.v }; render(); scrollTo(0, 0); },
  ttick(e) { const t = byId(S.tasks, e.dataset.id); t.done = !t.done; t.doneOn = t.done ? today() : null; save(); if (t.done) toast(["Done ✓", "One less thing 💛", "Look at you go 🙌", "Nice! ✨"][Math.floor(Math.random() * 4)]); render(); },
  addTask() { taskForm(); }, editTask(e) { taskForm(byId(S.tasks, e.dataset.id)); },
  delTask(e) { S.tasks = S.tasks.filter(t => t.id !== e.dataset.id); save(); closeSheet(); render(); },
  tf(e) { sel.tf = e.dataset.v; render(); }, ta(e) { sel.ta = e.dataset.v; render(); },
  addHabit() { habitForm(); }, editHabit(e) { habitForm(byId(S.habits, e.dataset.id)); },
  delHabit(e) { if (!confirm("Delete this habit and its history?")) return; const id = e.dataset.id; S.habits = S.habits.filter(h => h.id !== id); for (const d in S.hlog) delete S.hlog[d][id]; save(); closeSheet(); render(); },
  archHabit(e) { const h = byId(S.habits, e.dataset.id); h.archived = !h.archived; save(); closeSheet(); render(); toast(h.archived ? "Archived — history kept" : "Restored"); },
  fday(e) { const d = +e.dataset.v; sel.fdays = sel.fdays.includes(d) ? sel.fdays.filter(x => x !== d) : sel.fdays.concat(d); sheet.fx(); },
  hmon(e) { const [y, m] = (sel.month || today().slice(0, 7)).split("-").map(Number), d = new Date(y, m - 1 + +e.dataset.v, 1); sel.month = `${d.getFullYear()}-${pad(d.getMonth() + 1)}`; render(); },
  addGoal() { goalForm(); }, editGoal(e) { goalForm(byId(S.goals, e.dataset.id)); },
  delGoal(e) { if (!confirm("Delete this goal?")) return; S.goals = S.goals.filter(g => g.id !== e.dataset.id); save(); closeSheet(); render(); },
  step(e) { const g = byId(S.goals, e.dataset.id), s = g.steps[+e.dataset.i]; s.ok = !s.ok; save(); if (goalPct(g) >= 1 && s.ok) { confetti(); toast("Goal complete! 🏆"); } render(); },
  gf(e) { sel.gf = e.dataset.v; render(); },
  jtoday() { sel.jd = today(); render(); }, jopen(e) { sel.jd = e.dataset.v; render(); scrollTo(0, 0); },
  mon(e) { const [y, m] = (sel.month || today().slice(0, 7)).split("-").map(Number), d = new Date(y, m - 1 + +e.dataset.v, 1); sel.month = `${d.getFullYear()}-${pad(d.getMonth() + 1)}`; render(); },
  day(e) { sel.day = e.dataset.v; render(); },
  wshift(e) { sel.ws = addD(sel.ws || weekStart(today()), +e.dataset.v); render(); },
  rrate(e) { const ws = e.dataset.ws; S.reviews[ws] = S.reviews[ws] || {}; S.reviews[ws].rate = +e.dataset.v; save(); render(); },
  yshift(e) { sel.year = (sel.year || +today().slice(0, 4)) + +e.dataset.v; render(); },
  addVision() { sheet(`<h2>Add to your vision board</h2><form data-f="vision"><div class="g2" style="grid-template-columns:80px 1fr;gap:10px"><label class="f"><span>EMOJI</span><input class="i" id="vE" value="✨" maxlength="4"></label><label class="f"><span>DREAM, WORD OR AFFIRMATION</span><input class="i" id="vT" required placeholder="e.g. I am calm and capable"></label></div><div class="row"><button class="btn">Add</button><button class="btn ghost" type="button" data-a="close">Cancel</button></div></form>`); },
  visIdea(e) { S.vision.push({ id: uid(), t: e.dataset.v, e: ["✨", "🌸", "🌿", "☀️", "🦋", "💫"][S.vision.length % 6], c: HC[S.vision.length % HC.length] }); save(); render(); },
  delVision(e) { S.vision = S.vision.filter(v => v.id !== e.dataset.id); save(); render(); },
  theme(e) { S.theme = e.dataset.v; applyTheme(); save(); render(); }, cover(e) { S.cover = e.dataset.v; save(); render(); },
  editArea(e) { const a = byId(S.areas, e.dataset.id); const n = prompt("Rename this life area (leave empty to remove):", a.n); if (n === null) return; if (!n) { if (confirm("Remove “" + a.n + "”?")) S.areas = S.areas.filter(x => x !== a); } else { a.n = n; const em = prompt("Emoji:", a.e); if (em) a.e = em; } save(); render(); },
  addArea() { const n = prompt("Name of the new life area:"); if (!n) return; S.areas.push({ id: uid(), n, e: prompt("Emoji:", "✨") || "✨", c: HC[S.areas.length % HC.length] }); save(); render(); },
  backup() { const b = new Blob([JSON.stringify(S, null, 1)], { type: "application/json" }), a = document.createElement("a"); a.href = URL.createObjectURL(b); a.download = `bloom-backup-${today()}.json`; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 2000); toast("Backup downloaded ⬇"); },
  restore() { $("restoreFile").click(); },
  demo() { if (S.onboarded && S.habits.length && !confirm("Replace everything with example data?")) return; const keep = { owner: S.owner, title: S.title, theme: S.theme, cover: S.cover, applied: S.applied }; S = demoData(); if (keep.owner || keep.applied) Object.assign(S, keep); save(); applyTheme(); view = "today"; sel = {}; render(); toast("Example data loaded — have a look around 🌸"); },
  erase() { if (!confirm("Erase everything on this device? There's no undo.")) return; localStorage.removeItem(KEY); S = blank(); onb.step = 0; sel = {}; view = "today"; applyTheme(); render(); },
  obTheme(e) { const n = $("onbName"); if (n) S.name = n.value; S.theme = e.dataset.v; applyTheme(); render(); },
  onbNext() { S.name = ($("onbName").value || "").trim(); if (!S.owner) S.owner = S.name; onb.step = 1; render(); }, onbBack() { onb.step = 0; render(); },
  obHabit(e) { const v = e.dataset.v; onb.habits = onb.habits.includes(v) ? onb.habits.filter(x => x !== v) : onb.habits.concat(v); render(); },
  onbDone() { STARTER.filter(s => onb.habits.includes(s[0])).forEach(([n, e, a], i) => S.habits.push({ id: uid(), n, e, area: a, c: HC[i % HC.length], freq: { t: "daily" }, start: today() }));
    S.onboarded = true; S.created = today(); save(); view = "today"; render(); confetti(); toast("Your planner is ready " + S.cover); }
};
const FORMS = {
  habit(f) { const id = f.dataset.id, ft = $("hF").value, freq = { t: ft }; if (ft === "days") { if (!sel.fdays.length) return toast("Pick at least one day"); freq.days = sel.fdays.slice(); } if (ft === "weekly") freq.n = Math.min(7, Math.max(1, +$("hW").value || 3));
    const d = { n: $("hN").value.trim(), e: $("hE").value.trim() || "⭐", area: $("hA").value, c: $("hC").value, freq }; if (!d.n) return;
    if (id) Object.assign(byId(S.habits, id), d); else S.habits.push(Object.assign({ id: uid(), start: today() }, d)); save(); closeSheet(); render(); toast(id ? "Saved ✓" : "Habit added 🌱"); },
  task(f) { const id = f.dataset.id, d = { t: $("tT").value.trim(), due: $("tD").value, pri: +$("tP").value, area: $("tA").value }; if (!d.t) return;
    if (id) Object.assign(byId(S.tasks, id), d); else S.tasks.push(Object.assign({ id: uid(), done: false, created: today() }, d)); save(); closeSheet(); render(); },
  quick() { const v = $("quickIn").value.trim(); if (!v) return; S.tasks.push({ id: uid(), t: v, due: today(), pri: 1, area: "", done: false, created: today() }); save(); render(); setTimeout(() => $("quickIn") && $("quickIn").focus(), 0); },
  goal(f) { const id = f.dataset.id, d = { n: $("gN").value.trim(), e: $("gE").value.trim() || "🎯", area: $("gA").value, due: $("gD").value, why: $("gW").value.trim() }; if (!d.n) return;
    if (id) Object.assign(byId(S.goals, id), d); else S.goals.push(Object.assign({ id: uid(), created: today(), steps: ($("gS").value || "").split("\n").map(s => s.trim()).filter(Boolean).map(t => ({ t, ok: false })) }, d)); save(); closeSheet(); render(); },
  step(f) { const inp = f.querySelector("input"), v = inp.value.trim(); if (!v) return; byId(S.goals, f.dataset.id).steps.push({ t: v, ok: false }); save(); render(); },
  vision() { const t = $("vT").value.trim(); if (!t) return; S.vision.push({ id: uid(), t, e: $("vE").value.trim() || "✨", c: HC[S.vision.length % HC.length] }); save(); closeSheet(); render(); }
};

/* ---------- events ---------- */
document.addEventListener("click", ev => {
  if (ev.target.id === "sheet") return closeSheet();
  const hc = ev.target.closest(".hcol"); if (hc) { document.querySelectorAll(".hcol").forEach(x => x.style.outline = "none"); hc.style.outline = "3px solid var(--ink)"; $("hC").value = hc.dataset.c; return; }
  const g = ev.target.closest("[data-go]"); if (g) { view = g.dataset.go; sel = {}; closeSheet(); render(); scrollTo(0, 0); return; }
  const a = ev.target.closest("[data-a]"); if (a && ACT[a.dataset.a]) { ev.preventDefault(); ACT[a.dataset.a](a, ev); }
});
document.addEventListener("submit", ev => { const f = ev.target.closest("[data-f]"); if (f && FORMS[f.dataset.f]) { ev.preventDefault(); FORMS[f.dataset.f](f); } });
let tmr;
document.addEventListener("input", ev => {
  const el = ev.target, k = el.dataset.in; if (!k) return;
  const D = () => day(sel.date || today());
  if (k === "prio") D().prio[+el.dataset.i] = el.value;
  if (k === "grat") D().grat[+el.dataset.i] = el.value;
  if (k === "journal") { if (el.value) S.journal[el.dataset.d] = el.value; else delete S.journal[el.dataset.d]; }
  if (k === "rev") { const ws = el.dataset.ws; S.reviews[ws] = S.reviews[ws] || {}; S.reviews[ws][el.dataset.k] = el.value; }
  if (k === "jq") { sel.jq = el.value; render(); const i = document.querySelector('[data-in="jq"]'); i.focus(); i.setSelectionRange(i.value.length, i.value.length); return; }
  clearTimeout(tmr); tmr = setTimeout(save, 350);
});
document.addEventListener("change", ev => {
  const s = ev.target.closest("[data-set]"); if (s) { const k = s.dataset.set; S[k] = k === "water" ? Math.min(16, Math.max(1, +s.value || 8)) : s.value.trim(); save(); render(); return; }
  if (ev.target.id === "restoreFile") { const file = ev.target.files[0]; if (!file) return; const r = new FileReader(); r.onload = () => { try { const d = JSON.parse(r.result); if (!d || !Array.isArray(d.habits)) throw 0; S = Object.assign(blank(), d); save(); applyTheme(); render(); toast("Backup restored ✓"); } catch (e) { toast("That file isn't a Bloom backup"); } }; r.readAsText(file); }
});
document.addEventListener("keydown", ev => {
  if (ev.key === "Escape") return closeSheet();
  if (/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName) || ev.metaKey || ev.ctrlKey || !S.onboarded) return;
  const m = { t: "today", h: "habits", d: "tasks", j: "journal", g: "goals" }, k = ev.key.toLowerCase();
  if (k === "n") { ev.preventDefault(); taskForm(); } else if (m[k]) { view = m[k]; sel = {}; render(); }
});
function applyTheme() { document.documentElement.dataset.theme = S.theme === "peach" ? "" : S.theme; const t = THEMES.find(x => x[0] === S.theme) || THEMES[0]; document.querySelector('meta[name="theme-color"]').content = t[3]; }
const SCR = { today: scrToday, habits: scrHabits, tasks: scrTasks, journal: scrJournal, goals: scrGoals, calendar: scrCalendar, review: scrReview, vision: scrVision, mood: scrMood, insights: scrInsights, wins: scrWins, settings: scrSettings, help: scrHelp, more: scrMore };
function render() {
  if (!S.onboarded) { $("snav").style.display = "none"; $("bnav").style.display = "none"; $("main").innerHTML = scrOnboard(); return; }
  $("snav").style.display = ""; $("bnav").style.display = ""; if (!SCR[view]) view = "today"; renderNav(); $("main").innerHTML = SCR[view]();
}

/* ---------- example data ---------- */
function demoData() {
  const s = blank(), t0 = today(), start = addD(t0, -120); let seed = 11; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  Object.assign(s, { name: "Sarah", owner: "Sarah", onboarded: true, created: start });
  const H = [["Drink water", "💧", "health", { t: "daily" }, .85], ["Move 20 minutes", "🏃", "health", { t: "weekly", n: 4 }, .6], ["Read 10 pages", "📖", "growth", { t: "daily" }, .7], ["Meditate", "🧘", "mind", { t: "daily" }, .55], ["No phone in bed", "📵", "mind", { t: "days", days: [0, 1, 2, 3, 4] }, .5], ["Take vitamins", "💊", "health", { t: "daily" }, .8], ["Journal", "✍️", "mind", { t: "days", days: [1, 3, 5, 0] }, .65]];
  s.habits = H.map(([n, e, a, f], i) => ({ id: "h" + i, n, e, area: a, c: HC[i % HC.length], freq: f, start }));
  const J = ["Slow morning, good coffee. Felt calm.", "Busy day at work but I still got my walk in.", "Tired. Went to bed early and that was the right call.", "Lunch with Mia — so needed that!", "Finished my book 📚 Starting a new one tomorrow.", "Felt a bit overwhelmed, did a brain dump and it helped.", "Great run this morning. Proud of myself.", "Cosy evening, cooked something new.", "Productive! Cleared my inbox.", "Rainy day, stayed in and read."];
  for (let d = start; d <= t0; d = addD(d, 1)) { const age = diffD(start, d) / 120; let good = 0;
    s.habits.forEach((h, i) => { if (d === t0) { if (i < 4) { s.hlog[d] = s.hlog[d] || {}; s.hlog[d][h.id] = 1; } return; } const p = H[i][4] * (.75 + .35 * age); if ((hDue(h, d) || h.freq.t === "weekly") && rnd() < (h.freq.t === "weekly" ? p * .6 : p)) { s.hlog[d] = s.hlog[d] || {}; s.hlog[d][h.id] = 1; good++; } });
    if (rnd() < .88) { const base = 2.4 + good * .35 + rnd() * 1.4 - .5; s.days[d] = { mood: Math.max(1, Math.min(5, Math.round(base))), water: Math.floor(3 + rnd() * 6), prio: ["", "", ""], prioOk: [false, false, false], grat: ["", "", ""] }; }
    if (rnd() < .45) s.journal[d] = J[Math.floor(rnd() * J.length)]; }
  s.days[t0] = { mood: 4, water: 5, prio: ["Finish the project proposal", "30-minute walk", "Call Mum"], prioOk: [true, false, false], grat: ["Sunshine this morning", "Mia's voice note", "I kept my streak going"] };
  s.journal[t0] = "Woke up early and actually did my morning routine. Proposal is almost done — one more push after lunch.";
  const T = [["Book dentist appointment", 0, 2, "health"], ["Pay credit card", 1, 3, "money"], ["Plan Mia's birthday gift", 4, 2, "love"], ["Clean out the fridge", 0, 1, "home"], ["Reply to Jess", -1, 1, "love"], ["Update CV", 6, 2, "work"], ["Order new running shoes", 2, 1, "health"], ["Renew library books", 3, 1, "growth"], ["Grocery shop", 0, 1, "home"]];
  s.tasks = T.map(([t, d, p, a], i) => ({ id: "t" + i, t, due: addD(t0, d), pri: p, area: a, done: false, created: addD(t0, -3) }));
  ["Send invoice", "Morning yoga class", "Buy birthday card", "Fix bike tyre", "Sort photos", "Water plants", "Laundry", "Email landlord", "Meal prep", "Back up phone", "Read chapter 4", "Call the bank"].forEach((t, i) => s.tasks.push({ id: "d" + i, t, due: addD(t0, -i - 1), pri: 1, area: ["work", "health", "love", "home", "fun", "home", "home", "home", "health", "growth", "growth", "money"][i], done: true, doneOn: addD(t0, -Math.floor(i / 2)), created: addD(t0, -10) }));
  s.goals = [{ id: "g1", n: "Run a 5K", e: "🏃", area: "health", due: addD(t0, 75), why: "To feel strong and proud of myself", steps: [["Buy proper running shoes", 1], ["Run 1K without stopping", 1], ["Run 3K", 1], ["Run 4K", 0], ["Sign up for a park run", 0]].map(([t, ok]) => ({ t, ok: !!ok })) },
    { id: "g2", n: "Read 24 books this year", e: "📚", area: "growth", due: t0.slice(0, 4) + "-12-31", why: "Less scrolling, more stories", steps: [["Join the library", 1], ["Read every night before bed", 1], ["Finish 12 books", 1], ["Finish 18 books", 0], ["Finish 24 books", 0]].map(([t, ok]) => ({ t, ok: !!ok })) },
    { id: "g3", n: "Build an emergency fund", e: "🛟", area: "money", due: addD(t0, 200), why: "Peace of mind", steps: [["Open a savings account", 1], ["Save $500", 1], ["Save $1,000", 0], ["Save $2,000", 0]].map(([t, ok]) => ({ t, ok: !!ok })) },
    { id: "g4", n: "Weekend trip to the coast", e: "🏖️", area: "fun", due: addD(t0, 40), why: "", steps: [["Pick a date", 1], ["Book a cottage", 1], ["Plan the route", 1]].map(([t, ok]) => ({ t, ok: !!ok })) }];
  const ws = weekStart(addD(t0, -7)); s.reviews[ws] = { wins: "Kept my water streak all week\nFinished my book", hard: "Monday was rough — too many meetings", learn: "A short walk fixes most bad moods", focus: "Finish the proposal, 4 runs, call Mum", rate: 4 };
  s.vision = [["I am calm and capable", "🌿"], ["Travel to Japan", "🗾"], ["Run a 5K", "🏃"], ["A cosy, tidy home", "🏡"], ["Debt-free by 30", "💫"], ["More time with family", "💛"], ["Read 24 books", "📚"], ["Morning walks", "☀️"]].map(([t, e], i) => ({ id: "v" + i, t, e, c: HC[i % HC.length] }));
  return s;
}

/* ---------- boot ---------- */
(function () { try { const q = new URLSearchParams(location.search), sig = ["name", "theme", "title", "cover"].map(k => q.get(k) || "").join("|");
  if (sig.replace(/\|/g, "") && S.applied !== sig) { if (q.get("name")) { S.owner = q.get("name").slice(0, 40); if (!S.name) S.name = S.owner.split(/[ &]/)[0]; } if (THEMES.some(t => t[0] === q.get("theme"))) S.theme = q.get("theme"); if (q.get("title")) S.title = q.get("title").slice(0, 40); if (q.get("cover")) S.cover = q.get("cover").slice(0, 4); S.applied = sig; save(); } } catch (e) { } })();
applyTheme(); render();
if ("serviceWorker" in navigator && location.protocol.startsWith("http")) navigator.serviceWorker.register("sw.js").catch(() => { });
