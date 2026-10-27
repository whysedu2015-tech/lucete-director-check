/* ───────── 본사 결과 화면 ───────── */
const C = window.LUCETE_CFG;
const $app = document.getElementById("app");
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const lvOf = (v) => v === undefined || v === null || v === "na" ? "na" : v >= 2 ? "good" : v > 0 ? "mid" : "bad";
const fmt = (iso) => { const d = new Date(iso); return `${d.getMonth() + 1}/${d.getDate()} ${d.getHours()}:${String(d.getMinutes()).padStart(2, "0")}`; };
let token = null, rows = [], sortKey = "created_at", sortDir = -1, latestOnly = true;
try { const s = JSON.parse(sessionStorage.getItem("lucete-hq") || "null"); if (s && s.exp > Date.now()) token = s.token; } catch (e) {}

async function login(pw) {
  const r = await fetch(`${C.url}/auth/v1/token?grant_type=password`, {
    method: "POST", headers: { apikey: C.key, "Content-Type": "application/json" },
    body: JSON.stringify({ email: C.hqEmail, password: pw }),
  });
  if (!r.ok) {
    let why = ""; try { const j = await r.json(); why = j.error_description || j.msg || j.message || j.error_code || ""; } catch (e) {}
    const map = { "Invalid login credentials": "이메일과 비밀번호가 맞지 않습니다 (Invalid login credentials)", "Email not confirmed": "계정이 아직 확인되지 않았습니다 (Email not confirmed)" };
    throw new Error(map[why] || `로그인 실패: ${r.status} ${why}`);
  }
  const j = await r.json();
  token = j.access_token;
  try { sessionStorage.setItem("lucete-hq", JSON.stringify({ token, exp: Date.now() + (j.expires_in - 60) * 1000 })); } catch (e) {}
}
async function load() {
  const r = await fetch(`${C.url}/rest/v1/${C.table}?select=*&order=created_at.desc&limit=2000`, {
    headers: { apikey: C.key, Authorization: `Bearer ${token}` },
  });
  if (r.status === 401) { token = null; try { sessionStorage.removeItem("lucete-hq"); } catch (e) {} throw new Error("auth"); }
  if (!r.ok) throw new Error(String(r.status));
  rows = await r.json();
}
function data() {
  if (!latestOnly) return rows;
  const seen = new Set(); const out = [];
  rows.slice().sort((a, b) => b.created_at.localeCompare(a.created_at)).forEach((r) => { const k = (r.campus || "").trim(); if (!seen.has(k)) { seen.add(k); out.push(r); } });
  return out;
}
const avg = (xs) => xs.length ? Math.round(xs.reduce((a, b) => a + b, 0) / xs.length) : 0;

function vLogin(err) {
  return `<div class="login sheet stack"><div class="stack-s"><p class="eyebrow">본사 전용</p><h2>원장 업무 진단 결과</h2></div>
    <form id="lf" class="stack"><div class="field"><label for="pw">비밀번호</label><input type="password" id="pw" autocomplete="current-password" style="width:100%;border:1px solid var(--line);border-radius:8px;padding:10px 12px;background:var(--paper)"></div>
    ${err ? `<p class="flag bad-f">${esc(err)}</p>` : ""}
    <button class="btn primary block" type="submit">들어가기</button></form></div>`;
}
function vDash() {
  const D = data();
  const sorted = D.slice().sort((a, b) => {
    const g = (r) => sortKey in AREA_IDX ? (r.scores || {})[sortKey] ?? -1 : r[sortKey] ?? "";
    const x = g(a), y = g(b); return (x > y ? 1 : x < y ? -1 : 0) * sortDir;
  });
  const rank = TASKS.map((t) => {
    let bad = 0, mid = 0; D.forEach((r) => { const l = lvOf((r.answers || {})[t.id]); if (l === "bad") bad++; else if (l === "mid") mid++; });
    return { t, bad, mid };
  }).sort((a, b) => b.bad * 2 + b.mid - (a.bad * 2 + a.mid)).slice(0, 10);
  const maxR = Math.max(1, ...rank.map((x) => x.bad + x.mid));
  const th = (k, l, num) => `<th class="${num ? "num" : ""}" data-sort="${k}">${l}${sortKey === k ? (sortDir > 0 ? " ▲" : " ▼") : ""}</th>`;
  return `<div class="stack">
    <div class="toolbar"><h2>원장 업무 진단 결과</h2><div class="row" style="display:flex;gap:8px;flex-wrap:wrap">
      <button class="pill ${latestOnly ? "on" : ""}" data-act="latest">캠퍼스별 최신만</button>
      <button class="btn" data-act="reload">새로고침</button><button class="btn" data-act="csv">CSV 저장</button><button class="btn" data-act="logout">나가기</button></div></div>
    <div class="kpis">
      <div class="kpi"><div class="k">제출 캠퍼스</div><div class="v">${new Set(rows.map((r) => (r.campus || "").trim())).size}</div></div>
      <div class="kpi"><div class="k">평균 종합 점수</div><div class="v">${avg(D.map((r) => r.total || 0))}</div></div>
      ${AREAS.map((a) => `<div class="kpi"><div class="k">${esc(a.name)} 평균</div><div class="v">${avg(D.map((r) => (r.scores || {})[a.k] || 0))}</div></div>`).join("")}
    </div>
    <div class="sheet stack"><h3>전체 캠퍼스에서 가장 많이 보완이 필요한 업무 TOP 10</h3>
      <div class="rank">${rank.map((x, i) => `<div class="rk"><span class="id">${x.t.id}</span><span>${esc(x.t.t)}</span><span class="n">${x.bad}×  ${x.mid}△</span><span></span><span class="bar2"><i style="width:${((x.bad + x.mid) / maxR) * 100}%"></i></span></div>`).join("") || `<p class="muted">아직 제출이 없습니다.</p>`}</div>
      <p class="muted">× 못 하고 있다 · △ 가끔 한다 (캠퍼스 수)</p></div>
    <div class="tbl-wrap"><table><thead><tr>
      ${th("campus", "캠퍼스")}${th("director", "원장")}${th("join_type", "가맹")}${th("focus", "재원생")}${th("region", "지역")}${th("total", "종합", 1)}${AREAS.map((a) => th(a.k, a.name, 1)).join("")}${th("created_at", "제출")}
    </tr></thead><tbody>${sorted.map((r) => `<tr data-id="${esc(r.id)}"><td><b>${esc(r.campus)}</b></td><td>${esc(r.director)}</td><td>${esc(r.join_type)}</td><td>${esc(r.focus)}</td><td>${esc(r.region)}</td>
      <td class="num sc ${r.total < 50 ? "lo" : r.total >= 75 ? "hi" : ""}">${r.total ?? ""}</td>${AREAS.map((a) => { const v = (r.scores || {})[a.k]; return `<td class="num ${v < 50 ? "lo" : v >= 75 ? "hi" : ""}">${v ?? ""}</td>`; }).join("")}<td>${fmt(r.created_at)}</td></tr>`).join("") || `<tr><td colspan="12" class="muted">아직 제출이 없습니다.</td></tr>`}</tbody></table></div>
    <p class="muted">행을 누르면 캠퍼스별 상세가 열립니다. 점수 50 미만은 빨강, 75 이상은 초록입니다.</p>
  </div>`;
}
const AREA_IDX = Object.fromEntries(AREAS.map((a) => [a.k, 1]));
function detail(r) {
  const ans = r.answers || {};
  const sect = (lv, title) => { const ts = TASKS.filter((t) => lvOf(ans[t.id]) === lv); return ts.length ? `<div class="sheet stack-s"><h3>${title} ${ts.length}개</h3>${AREAS.map((a) => { const g = ts.filter((t) => t.a === a.k); return g.length ? `<p class="grp">${esc(a.name)}</p><ul class="ok">${g.map((t) => `<li><b>${t.id}</b> ${esc(t.t)}</li>`).join("")}</ul>` : ""; }).join("")}</div>` : ""; };
  const box = document.createElement("div"); box.className = "detail";
  box.innerHTML = `<div class="detail-in" role="dialog" aria-label="캠퍼스 상세"><div class="toolbar"><div class="stack-s"><p class="eyebrow">${esc(r.join_type || "")} · ${esc(r.focus || "")} · ${esc(r.region || "")} · ${fmt(r.created_at)}</p><h2>${esc(r.campus)} ${esc(r.director || "")}</h2></div><button class="btn" data-close>닫기</button></div>
    <div class="score-card"><div class="score"><span class="num">${r.total}</span><span class="of">/ 100</span></div><div class="score-meta"><div class="cnt">${AREAS.map((a) => `<span class="c">${esc(a.name)} ${(r.scores || {})[a.k]}</span>`).join("")}</div></div></div>
    ${sect("bad", "못 하고 있는 업무")}${sect("mid", "가끔 하는 업무")}</div>`;
  box.addEventListener("click", (e) => { if (e.target === box || e.target.closest("[data-close]")) box.remove(); });
  document.body.appendChild(box);
}
function csv() {
  const head = ["캠퍼스", "원장", "가맹", "재원생", "지역", "종합", ...AREAS.map((a) => a.name), "제출", ...TASKS.map((t) => t.id)];
  const lines = [head, ...data().map((r) => [r.campus, r.director, r.join_type, r.focus, r.region, r.total, ...AREAS.map((a) => (r.scores || {})[a.k]), r.created_at, ...TASKS.map((t) => { const v = (r.answers || {})[t.id]; return v === "na" ? "-" : v; })])];
  const text = "﻿" + lines.map((l) => l.map((x) => `"${String(x ?? "").replace(/"/g, '""')}"`).join(",")).join("\n");
  const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([text], { type: "text/csv" })); a.download = `원장업무진단_${new Date().toISOString().slice(0, 10)}.csv`; a.click();
}
async function boot(err) {
  if (!token) { $app.innerHTML = vLogin(err); return; }
  $app.innerHTML = `<p class="muted">불러오는 중…</p>`;
  try { await load(); $app.innerHTML = vDash(); }
  catch (e) { if (e.message === "auth") boot("다시 로그인해 주세요."); else $app.innerHTML = `<div class="sheet stack"><p class="flag bad-f">결과를 불러오지 못했습니다 (${esc(e.message)}). Supabase 프로젝트가 일시 정지되었다면 대시보드에서 Restore를 눌러 주세요.</p><button class="btn" data-act="reload">다시 시도</button></div>`; }
}
$app.addEventListener("submit", async (e) => {
  e.preventDefault(); const pw = document.getElementById("pw").value; if (!pw) return;
  try { await login(pw); boot(); } catch (er) { boot(er.message || "로그인하지 못했습니다."); }
});
$app.addEventListener("click", (e) => {
  const s = e.target.closest("[data-sort]"); if (s) { const k = s.dataset.sort; sortDir = sortKey === k ? -sortDir : (k === "campus" ? 1 : -1); sortKey = k; $app.innerHTML = vDash(); return; }
  const tr = e.target.closest("tr[data-id]"); if (tr) { const r = rows.find((x) => x.id === tr.dataset.id); if (r) detail(r); return; }
  const a = e.target.closest("[data-act]")?.dataset.act;
  if (a === "latest") { latestOnly = !latestOnly; $app.innerHTML = vDash(); }
  else if (a === "reload") boot();
  else if (a === "csv") csv();
  else if (a === "logout") { token = null; try { sessionStorage.removeItem("lucete-hq"); } catch (er) {} boot(); }
});
boot();
