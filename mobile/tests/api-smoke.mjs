import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import * as Api from '../src/services/ApiService.js';

const baseUrl = new URL(Api.getBaseUrl());
assert.ok(
  ['localhost', '127.0.0.1'].includes(baseUrl.hostname),
  'Gunakan API lokal dengan database uji untuk smoke test.',
);
const credentials = { username: 'mobile_' + Date.now(), password: 'Test-' + randomUUID() };
const account = await Api.register({ ...credentials, name: 'Siswa Uji Mobile' });
assert.equal(account.user.username, credentials.username);
const session = await Api.login(credentials);
const token = session.access_token;
const concepts = await Api.getConcepts(token);
assert.equal(concepts.length, 3);
assert.equal(
  (await Api.getProgress(token)).every((item) => item.status === 'not_assessed'),
  true,
);
assert.ok((await Api.getRecommendations(token)).items.length > 0);
assert.ok((await Api.getMaterials('daily-vocabulary', token)).items.length > 0);
await assert.rejects(
  () => Api.createAssessment('daily-reading', token),
  (error) => error instanceof Api.ApiError && error.status === 409,
);
const assessment = await Api.createAssessment('daily-vocabulary', token);
assert.equal(assessment.questions.length, 5);
assert.equal(JSON.stringify(assessment).includes('correct_index'), false);
const choices = [0, 1, 2, 3, 1];
const answers = assessment.questions.map((question, index) => ({
  question_id: question.id,
  selected_index: choices[index],
}));
const [result, replay] = await Promise.all([
  Api.submitAssessment(assessment.id, answers, token),
  Api.submitAssessment(assessment.id, answers, token),
]);
assert.deepEqual(result, replay);
assert.equal(result.score, 80);
assert.equal(result.status, 'mastered');
assert.equal(result.feedback.length, 5);
assert.equal(
  (await Api.getProgress(token)).find((item) => item.concept_id === 'daily-vocabulary').score,
  80,
);
assert.equal((await Api.createAssessment('daily-reading', token)).concept_id, 'daily-reading');
await assert.rejects(
  () => Api.login({ ...credentials, password: 'Password-salah' }),
  (error) => error instanceof Api.ApiError && error.status === 401,
);
console.log(
  'PASS: register, login, katalog, materi, prasyarat, asesmen, submit bersamaan, nilai, progres, dan error autentikasi.',
);
