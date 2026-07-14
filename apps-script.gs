/**
 * Google Sheets 신청 데이터 수집 + 카카오톡 알림 발송용 Apps Script
 *
 * [설치 방법 - Google Sheets 저장]
 * 1. 새 Google Sheets 문서를 만든다 (또는 기존 문서 사용).
 * 2. 상단 메뉴 "확장 프로그램 > Apps Script" 클릭.
 * 3. 열린 편집기의 기본 코드(Code.gs)를 전부 지우고 이 파일 내용을 붙여넣는다.
 * 4. 저장 후, 우측 상단 "배포 > 새 배포" 클릭.
 * 5. 유형 선택(⚙️)에서 "웹 앱" 선택.
 *    - 실행 계정: 나
 *    - 액세스 권한: 전체 사용자(Anyone)
 * 6. "배포" 클릭 → 권한 승인 → 생성된 "웹 앱 URL"을 복사한다.
 * 7. 복사한 URL을 script.js 상단의 SUBMIT_ENDPOINT 값에 붙여넣는다.
 *
 * [설치 방법 - 카카오톡 "나에게 보내기" 알림]
 * 카카오 개발자 콘솔에서 발급받은 값을 코드에 직접 적지 말고,
 * 아래처럼 프로젝트 설정의 "스크립트 속성"에 저장한다 (이 파일은 공개 저장소에도
 * 올라가므로 비밀 값을 코드에 직접 적으면 안 된다).
 *
 * 1. Apps Script 편집기 왼쪽 톱니바퀴 아이콘 "프로젝트 설정" 클릭
 * 2. "스크립트 속성" 섹션에서 "스크립트 속성 추가" 클릭, 아래 3개를 추가:
 *    - KAKAO_CLIENT_ID     : 카카오 REST API 키
 *    - KAKAO_CLIENT_SECRET : 카카오 클라이언트 시크릿
 *    - KAKAO_REFRESH_TOKEN : 최초 1회 발급받은 리프레시 토큰
 * 3. 저장.
 *
 * 이후 폼이 제출될 때마다 시트에 한 줄씩 저장되고, 카카오톡 "나와의 채팅"으로
 * 알림이 온다. 카카오 알림이 실패해도 시트 저장은 항상 이루어진다.
 */

function doPost(e) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();

  // 첫 실행 시 헤더가 없으면 추가
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(["제출시각", "이름", "연락처", "개인정보동의"]);
  }

  const data = JSON.parse(e.postData.contents);

  sheet.appendRow([
    new Date(),
    data.name || "",
    data.phone || "",
    data.privacy ? "동의" : "미동의"
  ]);

  sendKakaoNotification(data);

  return ContentService
    .createTextOutput(JSON.stringify({ result: "success" }))
    .setMimeType(ContentService.MimeType.JSON);
}

function getKakaoAccessToken() {
  const props = PropertiesService.getScriptProperties();
  const refreshToken = props.getProperty("KAKAO_REFRESH_TOKEN");
  const clientId = props.getProperty("KAKAO_CLIENT_ID");
  const clientSecret = props.getProperty("KAKAO_CLIENT_SECRET");
  if (!refreshToken || !clientId || !clientSecret) return null;

  const res = UrlFetchApp.fetch("https://kauth.kakao.com/oauth/token", {
    method: "post",
    payload: {
      grant_type: "refresh_token",
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
    },
    muteHttpExceptions: true,
  });

  const result = JSON.parse(res.getContentText());
  // 카카오는 리프레시 토큰을 새로 내려줄 때가 있어 갱신되면 다시 저장한다.
  if (result.refresh_token) {
    props.setProperty("KAKAO_REFRESH_TOKEN", result.refresh_token);
  }
  return result.access_token || null;
}

function sendKakaoNotification(data) {
  try {
    const accessToken = getKakaoAccessToken();
    if (!accessToken) return;

    const text = "[YES 클럽 신청]\n이름: " + (data.name || "") + "\n연락처: " + (data.phone || "");
    const templateObject = {
      object_type: "text",
      text: text,
      link: {
        web_url: "https://youngduke.github.io/yes-ai-landing/",
        mobile_web_url: "https://youngduke.github.io/yes-ai-landing/",
      },
    };

    UrlFetchApp.fetch("https://kapi.kakao.com/v2/api/talk/memo/default/send", {
      method: "post",
      headers: { Authorization: "Bearer " + accessToken },
      payload: { template_object: JSON.stringify(templateObject) },
      muteHttpExceptions: true,
    });
  } catch (err) {
    // 카카오 알림이 실패해도 신청 저장 자체에는 영향이 없도록 에러를 무시한다.
  }
}
