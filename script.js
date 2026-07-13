// ============================================
// 신청 폼 제출 처리 — Google Sheets 연동
// apps-script.gs 안내대로 Apps Script를 배포한 뒤,
// 발급된 "웹 앱 URL"을 아래 SUBMIT_ENDPOINT에 붙여넣으세요.
// 비워두면 콘솔에만 데이터가 출력되고 화면에는 완료 메시지만 표시됩니다.
// ============================================
const SUBMIT_ENDPOINT = "https://script.google.com/macros/s/AKfycbz4I--mJh6u4ZtTaqHIOmAZZ6J6xoXcf2ZzuZIZ1rTmT127vzrcjARZnxZXCLdR-V57eQ/exec";

const form = document.getElementById("apply-form");
const successMessage = document.getElementById("success-message");

const validators = {
  name: (v) => v.trim().length > 0,
  phone: (v) => /^[0-9\-+ ]{9,}$/.test(v.trim()),
  "ai-level": (v) => v.trim().length > 0,
  privacy: (v, el) => el.checked,
};

const errorMessages = {
  name: "이름을 입력해주세요.",
  phone: "연락처를 정확히 입력해주세요.",
  "ai-level": "AI 활용 수준을 선택해주세요.",
  privacy: "개인정보 수집·이용에 동의해주세요.",
};

function setError(field, message) {
  const group = document.querySelector(`[name="${field}"]`).closest(".form-group");
  const errorEl = form.querySelector(`[data-error-for="${field}"]`);
  if (message) {
    group.classList.add("invalid");
    if (errorEl) errorEl.textContent = message;
  } else {
    group.classList.remove("invalid");
    if (errorEl) errorEl.textContent = "";
  }
}

function validateForm(formData) {
  let isValid = true;
  for (const field of Object.keys(validators)) {
    const el = form.querySelector(`[name="${field}"]`);
    const value = formData.get(field) || "";
    const valid = validators[field](value, el);
    setError(field, valid ? "" : errorMessages[field]);
    if (!valid) isValid = false;
  }
  return isValid;
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const formData = new FormData(form);

  if (!validateForm(formData)) {
    const firstInvalid = form.querySelector(".invalid input, .invalid select");
    if (firstInvalid) firstInvalid.focus();
    return;
  }

  const payload = Object.fromEntries(formData.entries());
  payload.privacy = form.querySelector("#privacy").checked;

  const submitBtn = form.querySelector('button[type="submit"]');
  const originalBtnText = submitBtn.textContent;
  submitBtn.disabled = true;
  submitBtn.textContent = "제출 중...";

  try {
    if (SUBMIT_ENDPOINT) {
      // Apps Script 웹앱 응답에는 CORS 헤더가 없어 브라우저가 응답을 읽지 못하므로
      // no-cors로 전송한다. 요청 자체는 정상 도달해 시트에 기록되지만,
      // 응답 내용은 확인할 수 없다(opaque response).
      await fetch(SUBMIT_ENDPOINT, {
        method: "POST",
        mode: "no-cors",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify(payload),
      });
    } else {
      console.log("신청 데이터 (SUBMIT_ENDPOINT 미설정):", payload);
    }
    form.hidden = true;
    successMessage.hidden = false;
    successMessage.scrollIntoView({ behavior: "smooth", block: "center" });
  } catch (err) {
    submitBtn.disabled = false;
    submitBtn.textContent = originalBtnText;
    alert("제출 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.");
  }
});
