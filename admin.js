// GitHub Contents API를 통해 content.json을 직접 읽고 쓰는 관리자 편집기.
// FONT_OPTIONS, getByPath 는 content-loader.js에 정의되어 있다.

const REPO_OWNER = "youngduke";
const REPO_NAME = "chagok-ai-landing";
const BRANCH = "main";
const CONTENT_PATH = "content.json";
const TOKEN_KEY = "chagok_admin_gh_token";

let currentSha = null;

function b64EncodeUnicode(str) {
  return btoa(encodeURIComponent(str).replace(/%([0-9A-F]{2})/g, (_, p1) => String.fromCharCode(parseInt(p1, 16))));
}

function b64DecodeUnicode(str) {
  return decodeURIComponent(
    atob(str.replace(/\n/g, ""))
      .split("")
      .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
      .join("")
  );
}

function getToken() {
  return localStorage.getItem(TOKEN_KEY) || "";
}

function setStatus(el, message, type) {
  el.textContent = message;
  el.className = "admin-status" + (type ? " " + type : "");
}

function setByPath(obj, path, value) {
  const keys = path.split(".");
  let target = obj;
  for (let i = 0; i < keys.length - 1; i++) {
    target[keys[i]] = target[keys[i]] || {};
    target = target[keys[i]];
  }
  target[keys[keys.length - 1]] = value;
}

async function githubRequest(method, body) {
  const res = await fetch(`https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${CONTENT_PATH}?ref=${BRANCH}`, {
    method,
    headers: {
      Authorization: `token ${getToken()}`,
      Accept: "application/vnd.github+json",
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `GitHub API 오류 (${res.status})`);
  }
  return res.json();
}

function initFontSelect() {
  const select = document.getElementById("font-select");
  Object.entries(FONT_OPTIONS).forEach(([key, opt]) => {
    const option = document.createElement("option");
    option.value = key;
    option.textContent = opt.label;
    select.appendChild(option);
  });
  select.addEventListener("change", () => applyFont(select.value));
}

function refreshColorOutputs() {
  document.querySelectorAll('.color-input-wrap input[type="color"]').forEach((el) => {
    el.nextElementSibling.textContent = el.value;
  });
}

function initColorInputs() {
  document.querySelectorAll('.color-input-wrap input[type="color"]').forEach((el) => {
    el.addEventListener("input", () => {
      el.nextElementSibling.textContent = el.value;
      applyColors(collectFormData().colors);
    });
  });
}

function addWhoRow(value = "") {
  const container = document.getElementById("who-editor");
  const row = document.createElement("div");
  row.className = "list-row";
  row.innerHTML = `
    <div class="list-row-fields">
      <input type="text" class="who-item" placeholder="체크리스트 항목">
    </div>
    <button type="button" class="list-row-remove">삭제</button>
  `;
  row.querySelector(".who-item").value = value;
  row.querySelector(".list-row-remove").addEventListener("click", () => row.remove());
  container.appendChild(row);
}

function addAgendaRow(title = "", desc = "") {
  const container = document.getElementById("agenda-editor");
  const row = document.createElement("div");
  row.className = "list-row";
  row.innerHTML = `
    <div class="list-row-fields">
      <input type="text" class="agenda-title" placeholder="제목">
      <input type="text" class="agenda-desc" placeholder="설명">
    </div>
    <button type="button" class="list-row-remove">삭제</button>
  `;
  row.querySelector(".agenda-title").value = title;
  row.querySelector(".agenda-desc").value = desc;
  row.querySelector(".list-row-remove").addEventListener("click", () => row.remove());
  container.appendChild(row);
}

function populateForm(data) {
  document.querySelectorAll("[data-path]").forEach((el) => {
    const value = getByPath(data, el.getAttribute("data-path"));
    if (value != null) el.value = value;
  });
  document.getElementById("font-select").value = data.fontFamily || "system";
  applyFont(data.fontFamily);
  applyColors(data.colors);
  refreshColorOutputs();

  document.getElementById("who-editor").innerHTML = "";
  (data.who?.items || []).forEach((item) => addWhoRow(item));

  document.getElementById("agenda-editor").innerHTML = "";
  (data.agenda?.items || []).forEach((item) => addAgendaRow(item.title, item.desc));
}

function collectFormData() {
  const data = {};
  document.querySelectorAll("[data-path]").forEach((el) => {
    setByPath(data, el.getAttribute("data-path"), el.value);
  });
  data.fontFamily = document.getElementById("font-select").value;
  data.who = data.who || {};
  data.who.items = Array.from(document.querySelectorAll("#who-editor .who-item"))
    .map((el) => el.value.trim())
    .filter(Boolean);
  data.agenda = data.agenda || {};
  data.agenda.items = Array.from(document.querySelectorAll("#agenda-editor .list-row")).map((row) => ({
    title: row.querySelector(".agenda-title").value.trim(),
    desc: row.querySelector(".agenda-desc").value.trim(),
  }));
  return data;
}

async function loadFromGitHub() {
  const authStatus = document.getElementById("auth-status");
  try {
    const file = await githubRequest("GET");
    currentSha = file.sha;
    const data = JSON.parse(b64DecodeUnicode(file.content));
    populateForm(data);
    document.getElementById("editor-section").hidden = false;
    setStatus(authStatus, `연결됨 — 최신 내용을 불러왔습니다.`, "ok");
  } catch (err) {
    setStatus(authStatus, `불러오기 실패: ${err.message}`, "error");
  }
}

async function saveToGitHub() {
  const saveStatus = document.getElementById("save-status");
  const btn = document.getElementById("btn-save");
  btn.disabled = true;
  btn.textContent = "저장 중...";
  try {
    const data = collectFormData();
    const content = b64EncodeUnicode(JSON.stringify(data, null, 2));
    const result = await githubRequest("PUT", {
      message: "Update content via admin panel",
      content,
      sha: currentSha,
      branch: BRANCH,
    });
    currentSha = result.content.sha;
    setStatus(saveStatus, "저장 완료! 1~2분 뒤 실제 사이트에 반영됩니다.", "ok");
  } catch (err) {
    setStatus(saveStatus, `저장 실패: ${err.message}`, "error");
  } finally {
    btn.disabled = false;
    btn.textContent = "GitHub에 저장하기";
  }
}

function updateConnectedUI(connected) {
  document.getElementById("btn-connect").hidden = connected;
  document.getElementById("btn-disconnect").hidden = !connected;
  document.getElementById("gh-token").disabled = connected;
}

document.addEventListener("DOMContentLoaded", () => {
  initFontSelect();
  initColorInputs();

  document.querySelector('[data-add="who"]').addEventListener("click", () => addWhoRow());
  document.querySelector('[data-add="agenda"]').addEventListener("click", () => addAgendaRow());

  document.getElementById("btn-connect").addEventListener("click", async () => {
    const tokenInput = document.getElementById("gh-token");
    const token = tokenInput.value.trim();
    if (!token) return;
    localStorage.setItem(TOKEN_KEY, token);
    updateConnectedUI(true);
    await loadFromGitHub();
  });

  document.getElementById("btn-disconnect").addEventListener("click", () => {
    localStorage.removeItem(TOKEN_KEY);
    document.getElementById("gh-token").value = "";
    updateConnectedUI(false);
    document.getElementById("editor-section").hidden = true;
    setStatus(document.getElementById("auth-status"), "로그아웃되었습니다.", "");
  });

  document.getElementById("btn-reload").addEventListener("click", loadFromGitHub);
  document.getElementById("btn-save").addEventListener("click", saveToGitHub);

  const savedToken = getToken();
  if (savedToken) {
    document.getElementById("gh-token").value = savedToken;
    updateConnectedUI(true);
    loadFromGitHub();
  }
});
