/**
 * @param {string} url
 * @param {object} body
 * @param {string} [method]
 * @returns {Promise<string | null>}
 */
export async function requestMutation(url, body, method = "POST") {
  try {
    const response = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (response.status === 401 || response.status === 403) {
      return "로그인 상태나 접근 권한을 확인한 뒤 다시 시도해 주세요.";
    }
    if (!response.ok) {
      return "변경 사항을 저장하지 못했어요. 입력 내용을 확인하고 다시 시도해 주세요.";
    }
    const result = await response.json().catch(() => null);
    if (result?.ok !== true) {
      return "변경 사항을 저장하지 못했어요. 로그인 상태를 확인하고 다시 시도해 주세요.";
    }
    return null;
  } catch {
    return "서버에 연결하지 못했어요. 연결 상태와 저장 여부를 확인한 뒤 다시 시도해 주세요.";
  }
}
