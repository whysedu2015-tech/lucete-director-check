/* ───────── 원장 업무 진단 · 앱 ───────── */
const KEY = "lucete-director-check-v1";
/* 결과 화면에서 info 화면으로 돌아왔다가 다시 진단 결과로 가는 흐름: info-next는 진단 처음으로 */
const LV = [
  { k: 2, t: "잘하고 있다", c: "good" },
  { k: 1, t: "가끔 한다", c: "mid" },
  { k: 0, t: "못 하고 있다", c: "bad" },
];
const $app = document.getElementById("app");
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const task = (id) => TASKS.find((t) => t.id === id);
const areaOf = (k) => AREAS.find((a) => a.k === k);

function fresh() { return { v: 1, screen: "intro", info: {}, ans: {}, ai: 0, tab: "sum", filter: "all", missing: false, dirty: true }; }
let S = fresh();
let hasSaved = false;
try { const o = JSON.parse(localStorage.getItem(KEY) || "null"); if (o && o.v === 1) { S = Object.assign(fresh(), o); if (o.dirty === undefined) S.dirty = !o.submittedAt; if (S.tab === "send") S.tab = "sum"; if (S.screen === "result" && (S.dirty || !S.submittedAt)) S.screen = "submit"; hasSaved = S.screen !== "intro"; } } catch (e) {}
function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {} }
function go(screen, extra) { Object.assign(S, extra || {}, { screen }); save(); render(); window.scrollTo({ top: 0 }); }

/* 점수 */
function areaScore(k) {
  const ts = TASKS.filter((t) => t.a === k && S.ans[t.id] !== undefined && S.ans[t.id] !== "na");
  if (!ts.length) return 0;
  return Math.round((ts.reduce((s, t) => s + S.ans[t.id], 0) / (ts.length * 2)) * 100);
}
function totalScore() {
  const ts = TASKS.filter((t) => S.ans[t.id] !== undefined && S.ans[t.id] !== "na");
  return ts.length ? Math.round((ts.reduce((s, t) => s + S.ans[t.id], 0) / (ts.length * 2)) * 100) : 0;
}
const lvOf = (v) => v === undefined || v === "na" ? "na" : v >= 2 ? "good" : v > 0 ? "mid" : "bad";
const level = (id) => lvOf(S.ans[id]);
const counts = () => { const c = { 2: 0, 1: 0, 0: 0, na: 0 }; TASKS.forEach((t) => { const v = S.ans[t.id]; if (v === undefined) return; const l = lvOf(v); c[l === "good" ? 2 : l === "mid" ? 1 : l === "bad" ? 0 : "na"]++; }); return c; };
const ansLabel = (t) => { const v = S.ans[t.id]; if (t.opts) { const o = t.opts.find((x) => x.s === v); return o ? o.t : ""; } return v === 2 ? "잘하고 있다" : v === 1 ? "가끔 한다" : v === 0 ? "못 하고 있다" : "해당 없음"; };
function worst(ids) { const ls = ids.map(level); return ls.includes("bad") ? "bad" : ls.includes("mid") ? "mid" : ls.includes("good") ? "good" : "na"; }
const elemFocus = () => S.info.focus === "중등 중심";

function setTop(label, pct) {
  document.getElementById("stage").textContent = label;
  document.getElementById("bar").style.width = Math.max(0, Math.min(100, pct)) + "%";
}
function toast(msg) { const t = document.createElement("div"); t.className = "toast"; t.textContent = msg; document.body.appendChild(t); setTimeout(() => t.remove(), 2400); }

/* ── 화면 ── */
function vIntro() {
  return `<div class="stack">
    <div class="stack-s"><p class="eyebrow">루체테 원장 업무 진단</p>
    <h1>원장의 일을<br>하나씩 펼쳐 봅니다.</h1></div>
    <div class="sheet stack">
      <p class="lead">원장의 일을 <b>교육 · 관리 · 모집 · 경영 · 행정</b> 다섯 영역, ${TASKS.length}개 업무로 나눴습니다. 업무마다 한 번만 누르면 됩니다.</p>
      <div class="steps">
        <div><b>1</b><span>업무별로 "잘하고 있다 / 가끔 한다 / 못 하고 있다"를 고릅니다 (약 7분)</span></div>
        <div><b>2</b><span>잘하고 있는 업무와 보완할 업무를 이유·바로 할 일과 함께 보여 드립니다</span></div>
        <div><b>3</b><span>1년 월별 업무표에 보완할 업무가 표시됩니다</span></div>
      </div>
      <p class="muted">좋아 보이는 답보다 지금의 사실을 골라 주세요. 중간에 닫아도 이 기기에서는 이어서 할 수 있습니다. 마지막에 결과를 본사로 제출해 주세요.</p>
    </div>
    ${hasSaved ? `<div class="actions"><button class="btn" data-act="restart-ask">처음부터</button><button class="btn primary" data-act="resume">이어서 하기</button></div><div id="confirmBox"></div>`
      : `<button class="btn primary block" data-act="start">시작하기</button>`}
  </div>`;
}

function vInfo() {
  const i = S.info;
  const txt = (id, label, ph = "") => `<div class="field"><label for="${id}">${label}</label><input type="text" id="${id}" data-info="${id}" value="${esc(i[id] || "")}" placeholder="${esc(ph)}"></div>`;
  const seg = (id, label, opts) => `<div class="field"><span class="flabel">${label}</span><div class="seg">${opts.map((o) => `<button class="seg-b ${i[id] === o ? "on" : ""}" data-seg="${id}" data-v="${esc(o)}">${esc(o)}</button>`).join("")}</div></div>`;
  return `<div class="stack">
    <div class="stack-s"><p class="eyebrow">시작 전에</p><h2>캠퍼스 정보</h2></div>
    <div class="sheet stack">
      ${txt("campus", "캠퍼스명", "예: ○○캠퍼스")}
      ${txt("name", "원장명")}
      ${seg("join", "가맹 형태", ["브랜드 전환", "신규 개원"])}
      ${seg("focus", "지금 재원생은", ["초등 중심", "중등 중심", "고르게"])}
      ${seg("region", "지역", ["수도권", "광역시", "지방"])}
    </div>
    <div class="actions"><button class="btn" data-act="to-intro">이전</button><button class="btn primary" data-act="info-next">진단 시작</button></div>
  </div>`;
}

function vDiag() {
  const A = AREAS[S.ai];
  const ts = TASKS.filter((t) => t.a === A.k);
  const answered = TASKS.filter((t) => S.ans[t.id] !== undefined).length;
  let lastG = "";
  const rows = ts.map((t) => {
    const v = S.ans[t.id]; const miss = S.missing && v === undefined;
    const gh = t.g !== lastG && A.k !== "biz" ? `<p class="grp">${esc(t.g)}</p>` : ""; lastG = t.g;
    return `${gh}<div class="task ${miss ? "miss" : ""}" id="t_${t.id}">
      <div class="task-h"><span class="tid">${t.id}</span><span class="freq">${esc(t.f)}</span></div>
      <p class="task-t">${esc(t.t)}</p>
      <div class="ans ${t.opts ? "four" : ""}">${(t.opts ? t.opts.map((o) => ({ k: o.s, t: o.t, c: lvOf(o.s) })) : LV).map((l) => `<button class="ab ${l.c} ${v === l.k ? "on" : ""}" data-ans="${t.id}" data-v="${l.k}" aria-pressed="${v === l.k}">${l.t}</button>`).join("")}
      ${t.na ? `<button class="ab na ${v === "na" ? "on" : ""}" data-ans="${t.id}" data-v="na" aria-pressed="${v === "na"}">해당 없음</button>` : ""}</div>
    </div>`;
  }).join("");
  return `<div class="stack">
    <div class="area-tabs">${AREAS.map((a, n) => { const done = TASKS.filter((t) => t.a === a.k).every((t) => S.ans[t.id] !== undefined); return `<span class="at ${n === S.ai ? "on" : ""} ${done ? "done" : ""}">${esc(a.name)}</span>`; }).join("")}</div>
    <div class="stack-s"><p class="eyebrow">${S.ai + 1} / ${AREAS.length} 영역 · 전체 ${answered}/${TASKS.length}</p><h2>${esc(A.name)}</h2><p class="muted">${esc(A.desc)}</p></div>
    <div class="tasks">${rows}</div>
    ${S.missing ? `<p class="flag bad-f">아직 답하지 않은 업무가 있습니다. 빨간 테두리를 확인해 주세요.</p>` : ""}
    <div class="actions"><button class="btn" data-act="diag-prev">이전</button><button class="btn primary" data-act="diag-next">${S.ai === AREAS.length - 1 ? "다음: 본사 제출" : "다음 영역"}</button></div>
  </div>`;
}

/* 결과 */
function improveList() {
  let list = TASKS.filter((t) => ["bad", "mid"].includes(level(t.id)));
  list.sort((a, b) => S.ans[a.id] - S.ans[b.id]);
  if (elemFocus()) { const r = list.find((t) => t.id === "R16"); if (r) list = [r, ...list.filter((t) => t !== r)]; }
  return list;
}
function vSum() {
  const c = counts(); const tot = totalScore();
  const sc = AREAS.map((a) => [a, areaScore(a.k)]);
  const best = [...sc].sort((x, y) => y[1] - x[1])[0], low = [...sc].sort((x, y) => x[1] - y[1])[0];
  const goods = TASKS.filter((t) => level(t.id) === "good");
  return `<div class="stack">
    <div class="score-card">
      <div class="score"><span class="num">${tot}</span><span class="of">/ 100</span></div>
      <div class="score-meta"><p><b>${esc(S.info.campus || "우리 캠퍼스")}</b> 원장 업무 수행도</p>
        <div class="cnt"><span class="c good">잘하고 있다 ${c[2]}</span><span class="c mid">가끔 ${c[1]}</span><span class="c bad">못 하고 있다 ${c[0]}</span></div></div>
    </div>
    <div class="sheet stack"><h3>영역별</h3>
      <div class="hbars">${sc.map(([a, v]) => `<div class="hb"><span>${esc(a.name)}</span><span class="hb-t"><i class="${a === low[0] ? "w" : a === best[0] ? "s" : ""}" style="width:${v}%"></i></span><span class="hb-v">${v}</span></div>`).join("")}</div>
      <p class="lead">가장 강한 영역은 <b>${esc(best[0].name)}</b>, 가장 보완이 필요한 영역은 <b>${esc(low[0].name)}</b>입니다.${elemFocus() && S.ans.R16 !== 2 ? ` 재원생이 중등 중심이라 <b>초등 유입 홍보</b>를 가장 먼저 보완할 업무로 올렸습니다.` : ""}</p>
    </div>
    <div class="sheet stack-s"><h3>잘하고 있는 업무 ${goods.length}개</h3>
      ${AREAS.map((a) => { const g = goods.filter((t) => t.a === a.k); if (!g.length) return ""; return `<details class="ref"><summary><span class="kind">${esc(a.name)}</span>${g.length}개</summary><div class="rb"><ul class="ok">${g.map((t) => `<li>${esc(t.t)}</li>`).join("")}</ul><p class="keep">유지 포인트 · ${esc(a.keep)}</p></div></details>`; }).join("") || `<p class="muted">아직 '잘하고 있다'로 답한 업무가 없습니다.</p>`}
    </div>
    <button class="btn primary block" data-tab="fix">보완할 업무 ${c[0] + c[1]}개 보기</button>
  </div>`;
}
function vFix() {
  const list = improveList().filter((t) => S.filter === "all" || t.a === S.filter);
  const all = improveList();
  return `<div class="stack">
    <div class="stack-s"><h2>보완할 업무</h2><p class="muted">'못 하고 있다'가 먼저 나옵니다. 업무마다 이유와 이번 달 바로 할 일을 확인하세요.</p></div>
    <div class="pick"><button class="pill ${S.filter === "all" ? "on" : ""}" data-filter="all">전체 ${all.length}</button>${AREAS.map((a) => { const n = all.filter((t) => t.a === a.k).length; return n ? `<button class="pill ${S.filter === a.k ? "on" : ""}" data-filter="${a.k}">${esc(a.name)} ${n}</button>` : ""; }).join("")}</div>
    ${list.length ? list.map((t) => { const lv = level(t.id); const pri = t.id === "R16" && elemFocus(); return `<article class="fix ${lv}">
      <div class="fix-h"><span class="lvl ${lv}">${esc(ansLabel(t))}</span><span class="muted">${esc(areaOf(t.a).name)} · ${esc(t.g)} · ${esc(t.f)}</span>${pri ? `<span class="lvl pri">우리 캠퍼스 우선</span>` : ""}</div>
      <h3>${esc(t.t)}</h3>
      <div class="fx"><p class="fx-k">왜 해야 하나요</p><p>${esc(t.why)}</p></div>
      <div class="fx todo"><p class="fx-k">이번 달 바로 할 일</p><p>${esc(t.todo)}</p></div>
      <p class="res"><span>활용할 자료</span>${esc(t.res)}</p>
    </article>`; }).join("") : `<p class="sheet muted">보완할 업무가 없습니다.</p>`}
    <button class="btn primary block" data-tab="cal">월별 업무표 보기</button>
  </div>`;
}
function chip(label, ids) {
  const l = ids ? worst(ids.split(",")) : "none";
  return `<span class="ch ${l}">${esc(label)}</span>`;
}
function vCal() {
  const nowM = new Date().getMonth() + 1;
  return `<div class="stack">
    <div class="stack-s"><h2>우리 캠퍼스 1년 업무표</h2>
    <div class="legend"><span class="ch bad">못 하고 있는 업무</span><span class="ch mid">가끔 하는 업무</span><span class="ch good">잘하고 있는 업무</span></div></div>
    <div class="sheet stack"><h3>반복하는 일</h3>${RECUR.map((r) => `<div class="rec"><p class="rec-k">${esc(r.k)}</p><div class="chips">${r.items.map(([l, id]) => chip(l, id)).join("")}</div></div>`).join("")}</div>
    <div class="months">${CAL_ORDER.map((m) => `<div class="mon ${m === nowM ? "now" : ""}"><div class="mon-h"><b>${m}월</b>${m === nowM ? `<span class="nowtag">이번 달</span>` : ""}</div><div class="chips">${CAL[m].map(([l, id]) => chip(l, id)).join("")}</div></div>`).join("")}</div>
  </div>`;
}
function summaryText() {
  const i = S.info, c = counts();
  const L = [];
  L.push("[루체테 원장 업무 진단 결과]");
  L.push(`캠퍼스: ${i.campus || "-"} / 원장: ${i.name || "-"} / ${i.join || "-"} / 재원생 ${i.focus || "-"} / ${i.region || "-"}`);
  L.push(`종합 ${totalScore()}점 (잘하고 있다 ${c[2]} · 가끔 ${c[1]} · 못 하고 있다 ${c[0]} · 해당 없음 ${c.na})`);
  L.push("영역별: " + AREAS.map((a) => `${a.name} ${areaScore(a.k)}`).join(" · "));
  L.push("");
  L.push("■ 못 하고 있는 업무");
  TASKS.filter((t) => level(t.id) === "bad").forEach((t) => L.push(`- [${areaOf(t.a).name}] ${t.t}${t.opts ? ` → ${ansLabel(t)}` : ""}`));
  L.push("");
  L.push("■ 가끔 하는 업무");
  TASKS.filter((t) => level(t.id) === "mid").forEach((t) => L.push(`- [${areaOf(t.a).name}] ${t.t}${t.opts ? ` → ${ansLabel(t)}` : ""}`));
  L.push("");
  L.push("■ 응답 코드");
  L.push(TASKS.map((t) => `${t.id}:${({ na: "-", good: "○", mid: "△", bad: "×" })[level(t.id)]}`).join(" "));
  return L.join("\n");
}
async function submitToHQ() {
  const C = window.LUCETE_CFG;
  const scores = Object.fromEntries(AREAS.map((x) => [x.k, areaScore(x.k)]));
  const body = {
    campus: (S.info.campus || "").trim().slice(0, 60), director: (S.info.name || "").trim().slice(0, 40),
    join_type: S.info.join || null, focus: S.info.focus || null, region: S.info.region || null,
    total: totalScore(), scores, answers: S.ans, app_version: C.version,
  };
  const r = await fetch(`${C.url}/rest/v1/${C.table}`, {
    method: "POST",
    headers: { apikey: C.key, "Content-Type": "application/json", Prefer: "return=minimal" },
    body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error(String(r.status));
}
function copyBox() {
  return `<details class="ref"><summary>결과를 글로 보기·복사</summary><div class="rb"><pre class="summary" id="summary">${esc(summaryText())}</pre><button class="btn" data-act="copy">결과 복사</button></div></details>`;
}
function vSubmit() {
  const c = counts(); const i = S.info;
  const noCampus = !(i.campus || "").trim();
  const again = !!S.submittedAt;
  return `<div class="stack">
    <div class="stack-s"><p class="eyebrow">마지막 단계</p><h2>${again ? "고친 답을 본사로 다시 제출" : "본사로 제출하고 결과 보기"}</h2>
    <p class="lead">제출하면 바로 진단 결과가 열립니다. 본사는 캠퍼스별 결과를 확인하고, 보완할 업무에 필요한 자료와 지원을 연결해 드립니다. 다른 캠퍼스는 이 결과를 볼 수 없습니다.</p></div>
    <div class="sheet stack-s">
      <p><b>캠퍼스</b> ${esc(i.campus || "-")} · <b>원장</b> ${esc(i.name || "-")}</p>
      ${[i.join, i.focus, i.region].some(Boolean) ? `<p class="muted">${esc([i.join, i.focus && "재원생 " + i.focus, i.region].filter(Boolean).join(" · "))}</p>` : ""}
      <p class="muted">응답 ${TASKS.length}개 업무 · 잘하고 있다 ${c[2]} · 가끔 ${c[1]} · 못 하고 있다 ${c[0]} · 해당 없음 ${c.na}</p>
    </div>
    ${again ? `<div class="flag good-f">${esc(S.submittedAt)}에 제출한 결과가 있습니다. 답을 고쳤기 때문에 다시 제출해야 결과를 볼 수 있습니다. 가장 최근 제출이 본사에 반영됩니다.</div>` : ""}
    ${noCampus ? `<div class="flag bad-f">캠퍼스명이 비어 있습니다. '캠퍼스 정보 고치기'에서 먼저 입력해 주세요.</div>` : ""}
    <button class="btn red block" data-act="submit" ${noCampus ? "disabled" : ""}>본사로 제출하고 결과 보기</button>
    <div id="submitMsg"></div>
    <div class="actions"><button class="btn" data-act="edit">답 고치기</button><button class="btn" data-act="edit-info">캠퍼스 정보 고치기</button></div>
  </div>`;
}
function vFoot() {
  return `<div class="stack" style="margin-top:28px">
    <div class="flag good-f">${esc(S.submittedAt || "")}에 본사로 제출했습니다. 답을 고치면 다시 제출한 뒤 결과를 볼 수 있습니다.</div>
    ${copyBox()}
    <div class="actions"><button class="btn" data-act="edit">답 고치기</button><button class="btn" data-act="restart-ask">새로 시작</button></div>
    <div id="confirmBox"></div>
  </div>`;
}
const TABS = [["sum", "진단 결과"], ["fix", "보완할 업무"], ["cal", "월별 업무표"]];
function vResult() {
  const body = ({ sum: vSum, fix: vFix, cal: vCal }[S.tab] || vSum)();
  return `<nav class="tabs" aria-label="결과 화면">${TABS.map(([k, l]) => `<button class="tab ${S.tab === k ? "on" : ""}" data-tab="${k}">${l}</button>`).join("")}</nav>${body}${vFoot()}`;
}

function render() {
  const map = { intro: vIntro, info: vInfo, diag: vDiag, submit: vSubmit, result: vResult };
  $app.innerHTML = (map[S.screen] || vIntro)();
  const answered = TASKS.filter((t) => S.ans[t.id] !== undefined).length;
  const label = { intro: "원장 업무 진단", info: "캠퍼스 정보", diag: `업무 진단 · ${AREAS[S.ai].name}`, submit: "본사 제출", result: "결과" }[S.screen];
  const pct = S.screen === "intro" ? 0 : S.screen === "info" ? 4 : S.screen === "diag" ? 6 + (answered / TASKS.length) * 90 : S.screen === "submit" ? 97 : 100;
  setTop(label, pct);
}

/* ── 이벤트 ── */
$app.addEventListener("click", (e) => {
  const t = e.target.closest("[data-act],[data-ans],[data-seg],[data-tab],[data-filter]");
  if (!t) return;
  if (t.dataset.ans) {
    const v = t.dataset.v === "na" ? "na" : parseFloat(t.dataset.v);
    S.ans[t.dataset.ans] = v; S.dirty = true; save();
    const card = t.closest(".task");
    card.querySelectorAll(".ab").forEach((b) => { const on = b === t; b.classList.toggle("on", on); b.setAttribute("aria-pressed", on); });
    card.classList.remove("miss");
    const answered = TASKS.filter((x) => S.ans[x.id] !== undefined).length;
    setTop(`업무 진단 · ${AREAS[S.ai].name}`, 6 + (answered / TASKS.length) * 90);
    const eb = $app.querySelector(".eyebrow"); if (eb) eb.textContent = `${S.ai + 1} / ${AREAS.length} 영역 · 전체 ${answered}/${TASKS.length}`;
    return;
  }
  if (t.dataset.seg) { S.info[t.dataset.seg] = t.dataset.v; S.dirty = true; save(); render(); return; }
  if (t.dataset.tab) { S.tab = t.dataset.tab; save(); render(); window.scrollTo({ top: 0 }); return; }
  if (t.dataset.filter) { S.filter = t.dataset.filter; save(); render(); return; }
  const a = t.dataset.act;
  if (a === "start") go("info");
  else if (a === "resume") go(S.screen === "intro" ? "info" : S.screen);
  else if (a === "to-intro") go("intro");
  else if (a === "info-next") { const all = TASKS.every((x) => S.ans[x.id] !== undefined); if (all) go(S.dirty || !S.submittedAt ? "submit" : "result", { missing: false }); else go("diag", { ai: 0, missing: false }); }
  else if (a === "diag-prev") { if (S.ai === 0) go("info", { missing: false }); else go("diag", { ai: S.ai - 1, missing: false }); }
  else if (a === "diag-next") {
    const miss = TASKS.filter((x) => x.a === AREAS[S.ai].k && S.ans[x.id] === undefined);
    if (miss.length) { S.missing = true; render(); const el = document.getElementById("t_" + miss[0].id); if (el) el.scrollIntoView({ block: "center" }); return; }
    if (S.ai < AREAS.length - 1) go("diag", { ai: S.ai + 1, missing: false }); else go(S.dirty || !S.submittedAt ? "submit" : "result", { tab: "sum", filter: "all", missing: false });
  }
  else if (a === "edit") go("diag", { ai: 0, missing: false });
  else if (a === "edit-info") go("info", { missing: false });
  else if (a === "submit") {
    t.disabled = true; t.textContent = "제출하는 중…";
    const msg = document.getElementById("submitMsg");
    submitToHQ().then(() => {
      const d = new Date(); S.submittedAt = `${d.getMonth() + 1}월 ${d.getDate()}일 ${d.getHours()}:${String(d.getMinutes()).padStart(2, "0")}`; S.dirty = false; go("result", { tab: "sum", filter: "all" }); toast("본사로 제출했습니다. 결과를 확인하세요.");
    }).catch(() => {
      t.disabled = false; t.textContent = "다시 시도";
      msg.innerHTML = `<div class="flag bad-f">제출하지 못했습니다. 인터넷 연결을 확인하고 다시 눌러 주세요. 계속 안 되면 본사 담당자에게 연락해 주세요.</div>`;
    });
  }
  else if (a === "restart-ask") {
    document.getElementById("confirmBox").innerHTML = `<div class="confirm"><p>지금까지의 응답이 이 기기에서 모두 지워집니다. 본사로 제출하셨나요?</p><div class="actions"><button class="btn" data-act="restart-no">취소</button><button class="btn red" data-act="restart-yes">지우고 새로 시작</button></div></div>`;
  }
  else if (a === "restart-no") document.getElementById("confirmBox").innerHTML = "";
  else if (a === "restart-yes") { S = fresh(); hasSaved = false; save(); render(); }
  else if (a === "copy") {
    const txt = summaryText();
    const fallback = () => { const pre = document.getElementById("summary"); const rg = document.createRange(); rg.selectNodeContents(pre); const sel = getSelection(); sel.removeAllRanges(); sel.addRange(rg); toast("텍스트를 선택했습니다. 길게 눌러 복사하세요."); };
    try { navigator.clipboard.writeText(txt).then(() => toast("복사했습니다. 본사 담당자에게 붙여 넣어 보내 주세요."), fallback); } catch (err) { fallback(); }
  }
});
$app.addEventListener("input", (e) => { const el = e.target; if (el.dataset.info) { S.info[el.dataset.info] = el.value; S.dirty = true; save(); } });

render();
