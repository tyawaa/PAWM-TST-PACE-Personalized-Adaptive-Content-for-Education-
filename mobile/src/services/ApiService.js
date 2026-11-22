/** @typedef {import('../types').Session} Session */
/** @typedef {import('../types').Credentials} Credentials */
/** @typedef {import('../types').Registration} Registration */
/** @typedef {import('../types').Concept} Concept */
/** @typedef {import('../types').Progress} Progress */
/** @typedef {import('../types').Recommendations} Recommendations */
/** @typedef {import('../types').MaterialsResponse} MaterialsResponse */
/** @typedef {import('../types').Assessment} Assessment */
/** @typedef {import('../types').AssessmentResult} AssessmentResult */
/** @typedef {import('../types').Answer} Answer */

export class ApiError extends Error {
  /** @param {string} message @param {number} status @param {string} url @param {string} responseBody */
  constructor(message, status, url, responseBody) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.url = url;
    this.responseBody = responseBody;
  }
}

/** @returns {string} */
export function getBaseUrl() {
  const configured = process.env.EXPO_PUBLIC_API_URL;
  if (!configured || !configured.trim()) {
    throw new Error('Isi EXPO_PUBLIC_API_URL pada file .env aplikasi.');
  }
  const url = new URL(configured.trim());
  if (!['http:', 'https:'].includes(url.protocol)) {
    throw new Error('Alamat API harus menggunakan http atau https.');
  }
  return configured.trim().replace(/\/+$/, '');
}

/** @param {unknown} value @returns {value is Record<string, unknown>} */
function isRecord(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** @param {unknown} payload @param {number} status @returns {string} */
function responseMessage(payload, status) {
  if (isRecord(payload) && typeof payload.detail === 'string') return payload.detail;
  if (isRecord(payload) && isRecord(payload.detail) && typeof payload.detail.message === 'string') {
    return payload.detail.message;
  }
  if (isRecord(payload) && Array.isArray(payload.detail)) {
    const messages = payload.detail
      .filter(isRecord)
      .map((entry) => (typeof entry.msg === 'string' ? entry.msg : ''))
      .filter(Boolean);
    if (messages.length) return messages.join('. ');
  }
  return 'Permintaan gagal (HTTP ' + status + '). Coba lagi.';
}

/** @param {string} path @param {RequestInit} options @param {string | null} token @returns {Promise<unknown>} */
async function requestOnce(path, options, token) {
  const url = getBaseUrl() + path;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12000);
  /** @type {Response} */
  let response;
  let raw = '';
  try {
    response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: 'Bearer ' + token } : {}),
      },
      signal: controller.signal,
    });
    raw = await response.text();
  } catch (error) {
    const timedOut = error instanceof Error && error.name === 'AbortError';
    throw new ApiError(
      timedOut
        ? 'Server terlalu lama merespons. Coba lagi.'
        : 'API tidak dapat dihubungi. Periksa server dan koneksi.',
      0,
      url,
      error instanceof Error ? error.message : String(error),
    );
  } finally {
    clearTimeout(timer);
  }
  /** @type {unknown} */
  let payload;
  try {
    payload = JSON.parse(raw);
  } catch {
    throw new ApiError(
      'Server mengirim respons yang bukan JSON (HTTP ' + response.status + ').',
      response.status,
      url,
      raw,
    );
  }
  if (!response.ok)
    throw new ApiError(responseMessage(payload, response.status), response.status, url, raw);
  return payload;
}

/** @param {string} path @param {RequestInit} options @param {string} token @returns {Promise<unknown>} */
async function requestWithRetry(path, options, token) {
  for (let attempt = 1; attempt <= 2; attempt += 1) {
    try {
      return await requestOnce(path, options, token);
    } catch (error) {
      if (
        !(error instanceof ApiError) ||
        ![0, 502, 503, 504].includes(error.status) ||
        attempt === 2
      )
        throw error;
      console.warn('api_retry', { path, status: error.status, attempt });
      await new Promise((resolve) => setTimeout(resolve, 350));
    }
  }
  throw new Error('Permintaan API berakhir tanpa respons.');
}

/** @param {unknown} error @returns {string} */
export function errorMessage(error) {
  if (error instanceof Error) return error.message;
  return 'Terjadi kesalahan yang tidak dikenal.';
}

/** @param {Credentials} values @returns {Promise<Session>} */
export async function login(values) {
  return /** @type {Session} */ (
    await requestOnce('/auth/login', { method: 'POST', body: JSON.stringify(values) }, null)
  );
}

/** @param {Registration} values @returns {Promise<Session>} */
export async function register(values) {
  return /** @type {Session} */ (
    await requestOnce('/auth/register', { method: 'POST', body: JSON.stringify(values) }, null)
  );
}

/** @param {string} token @returns {Promise<Concept[]>} */
export async function getConcepts(token) {
  const data = /** @type {{ items: Concept[] }} */ (
    await requestWithRetry('/concepts', { method: 'GET' }, token)
  );
  return data.items;
}

/** @param {string} token @returns {Promise<Progress[]>} */
export async function getProgress(token) {
  const data = /** @type {{ items: Progress[] }} */ (
    await requestWithRetry('/progress', { method: 'GET' }, token)
  );
  return data.items;
}

/** @param {string} token @returns {Promise<Recommendations>} */
export async function getRecommendations(token) {
  return /** @type {Recommendations} */ (
    await requestWithRetry('/recommendations', { method: 'GET' }, token)
  );
}

/** @param {string} conceptId @param {string} token @returns {Promise<MaterialsResponse>} */
export async function getMaterials(conceptId, token) {
  return /** @type {MaterialsResponse} */ (
    await requestWithRetry(
      '/concepts/' + encodeURIComponent(conceptId) + '/materials',
      { method: 'GET' },
      token,
    )
  );
}

/** @param {string} conceptId @param {string} token @returns {Promise<Assessment>} */
export async function createAssessment(conceptId, token) {
  const body = JSON.stringify({ concept_id: conceptId });
  return /** @type {Assessment} */ (
    await requestOnce('/assessments', { method: 'POST', body }, token)
  );
}

/** @param {string} assessmentId @param {Answer[]} answers @param {string} token @returns {Promise<AssessmentResult>} */
export async function submitAssessment(assessmentId, answers, token) {
  const body = JSON.stringify({ answers });
  return /** @type {AssessmentResult} */ (
    await requestWithRetry(
      '/assessments/' + encodeURIComponent(assessmentId) + '/submit',
      { method: 'POST', body },
      token,
    )
  );
}
