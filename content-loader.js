// content.json의 데이터를 페이지에 렌더링한다.
// 관리자 페이지(admin.html)에서 content.json을 수정하면 이 스크립트가 반영한다.

const FONT_OPTIONS = {
  system: {
    label: "기본 (시스템 폰트)",
    family: '-apple-system, BlinkMacSystemFont, "Pretendard", "Noto Sans KR", "Malgun Gothic", sans-serif',
    google: null,
  },
  "noto-sans-kr": {
    label: "Noto Sans KR",
    family: '"Noto Sans KR", sans-serif',
    google: "Noto+Sans+KR:wght@400;700;800",
  },
  "nanum-gothic": {
    label: "나눔고딕",
    family: '"Nanum Gothic", sans-serif',
    google: "Nanum+Gothic:wght@400;700;800",
  },
  "gowun-dodum": {
    label: "고운돋움 (둥근 느낌)",
    family: '"Gowun Dodum", sans-serif',
    google: "Gowun+Dodum",
  },
  "ibm-plex-sans-kr": {
    label: "IBM Plex Sans KR",
    family: '"IBM Plex Sans KR", sans-serif',
    google: "IBM+Plex+Sans+KR:wght@400;600;700",
  },
  "song-myung": {
    label: "송명체 (세리프)",
    family: '"Song Myung", serif',
    google: "Song+Myung",
  },
};

function applyFont(fontKey) {
  const font = FONT_OPTIONS[fontKey] || FONT_OPTIONS.system;
  if (font.google) {
    let link = document.getElementById("google-font-link");
    if (!link) {
      link = document.createElement("link");
      link.id = "google-font-link";
      link.rel = "stylesheet";
      document.head.appendChild(link);
    }
    link.href = `https://fonts.googleapis.com/css2?family=${font.google}&display=swap`;
  }
  document.documentElement.style.setProperty("--font-sans", font.family);
}

const COLOR_VARS = {
  primary: "--color-primary",
  primaryDark: "--color-primary-dark",
  accent: "--color-accent",
  bg: "--color-bg",
  bgAlt: "--color-bg-alt",
  text: "--color-text",
  textMuted: "--color-text-muted",
  border: "--color-border",
  buttonText: "--color-button-text",
  cardBg: "--color-card-bg",
};

function applyColors(colors) {
  if (!colors) return;
  Object.entries(COLOR_VARS).forEach(([key, cssVar]) => {
    if (colors[key]) document.documentElement.style.setProperty(cssVar, colors[key]);
  });
}

const SIZE_VARS = {
  eyebrow: "--size-eyebrow",
  heroTitle: "--size-hero-title",
  heroCopy: "--size-hero-copy",
  heroSub: "--size-hero-sub",
  sectionTitle: "--size-section-title",
  sectionHeading: "--size-section-heading",
  body: "--size-body",
  button: "--size-button",
  eventInfo: "--size-event-info",
};

function applySizes(sizes) {
  if (!sizes) return;
  Object.entries(SIZE_VARS).forEach(([key, cssVar]) => {
    if (sizes[key]) document.documentElement.style.setProperty(cssVar, `${sizes[key]}px`);
  });
}

function applyBackgroundImage(url) {
  const hero = document.querySelector(".hero");
  if (!hero) return;
  if (url) {
    hero.style.setProperty("--bg-image", `url('${url}')`);
    hero.classList.add("has-bg-image");
  } else {
    hero.style.removeProperty("--bg-image");
    hero.classList.remove("has-bg-image");
  }
}

function getByPath(obj, path) {
  return path.split(".").reduce((acc, key) => (acc == null ? acc : acc[key]), obj);
}

function bindText(data) {
  document.querySelectorAll("[data-bind]").forEach((el) => {
    const value = getByPath(data, el.getAttribute("data-bind"));
    if (value != null) el.textContent = value;
  });
}

function renderWhoList(items) {
  const ul = document.getElementById("who-list");
  if (!ul || !items) return;
  ul.innerHTML = "";
  items.forEach((text) => {
    const li = document.createElement("li");
    const icon = document.createElement("span");
    icon.className = "check-icon";
    icon.textContent = "✓";
    const span = document.createElement("span");
    span.textContent = text;
    li.appendChild(icon);
    li.appendChild(span);
    ul.appendChild(li);
  });
}

function renderAgendaList(items) {
  const ol = document.getElementById("agenda-list");
  if (!ol || !items) return;
  ol.innerHTML = "";
  items.forEach((item, i) => {
    const li = document.createElement("li");
    li.className = "agenda-item";
    const num = document.createElement("span");
    num.className = "agenda-num";
    num.textContent = String(i + 1).padStart(2, "0");
    const body = document.createElement("div");
    const h3 = document.createElement("h3");
    h3.textContent = item.title;
    const p = document.createElement("p");
    p.textContent = item.desc;
    body.appendChild(h3);
    body.appendChild(p);
    li.appendChild(num);
    li.appendChild(body);
    ol.appendChild(li);
  });
}

function renderFooterPhoneLink(phone) {
  const link = document.getElementById("footer-phone-link");
  if (link && phone) link.href = `tel:${phone}`;
}

async function initContent() {
  try {
    const res = await fetch("content.json", { cache: "no-store" });
    const data = await res.json();
    applyFont(data.fontFamily);
    applyColors(data.colors);
    applySizes(data.sizes);
    applyBackgroundImage(data.site?.backgroundImage);
    bindText(data);
    renderWhoList(data.who?.items);
    renderAgendaList(data.agenda?.items);
    renderFooterPhoneLink(data.footer?.phone);
    if (data.site?.pageTitle) document.title = data.site.pageTitle;
  } catch (err) {
    console.error("content.json 로드 실패, 기본 콘텐츠를 표시합니다.", err);
  }
}

if (document.querySelector("[data-bind]")) {
  initContent();
}
