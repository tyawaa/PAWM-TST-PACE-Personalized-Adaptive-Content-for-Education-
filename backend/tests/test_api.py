import json
import tempfile
import unittest
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timedelta, timezone
from pathlib import Path

import jwt
from fastapi.testclient import TestClient

from app.config import Settings
from app.database import connect
from app.main import create_app
from app.seed import seed_demo


class PaceAPITest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.tmp = tempfile.TemporaryDirectory()
        cls.settings = Settings(
            Path(cls.tmp.name) / "pace.db",
            "s" * 48,
            {"group-a": "a" * 40, "group-b": "b" * 40},
        )
        cls.client = TestClient(create_app(cls.settings))
        cls.client.__enter__()
        seed_demo(cls.settings.database_path)

    @classmethod
    def tearDownClass(cls):
        cls.client.__exit__(None, None, None)
        cls.tmp.cleanup()

    def account(self, suffix=""):
        username = "siswa_" + self._testMethodName.lower() + suffix
        # Batas username 40 karakter.
        username = username[:35] + suffix
        response = self.client.post(
            "/api/auth/register",
            json={"name": "Siswa Uji", "username": username, "password": "Test-only-123!"},
        )
        self.assertEqual(response.status_code, 201, response.text)
        return response.json(), {"Authorization": "Bearer " + response.json()["access_token"]}

    def assessment(self, headers, concept="daily-vocabulary"):
        response = self.client.post(
            "/api/assessments", json={"concept_id": concept}, headers=headers
        )
        self.assertEqual(response.status_code, 201, response.text)
        return response.json()

    def answers(self, assessment, correct=5):
        with connect(self.settings.database_path) as db:
            snapshot = db.execute(
                "SELECT snapshot_json FROM assessments WHERE id=?", (assessment["id"],)
            ).fetchone()[0]
        return {
            "answers": [
                {
                    "question_id": q["id"],
                    "selected_index": q["correct_index"]
                    if index < correct
                    else (q["correct_index"] + 1) % 4,
                }
                for index, q in enumerate(json.loads(snapshot)["questions"])
            ]
        }

    def submit(self, assessment, headers, correct=5):
        return self.client.post(
            f"/api/assessments/{assessment['id']}/submit",
            json=self.answers(assessment, correct),
            headers=headers,
        )

    def test_auth_and_secret_redaction(self):
        account, headers = self.account()
        self.assertNotIn("password_hash", account["user"])
        response = self.client.post(
            "/api/auth/login",
            json={"username": account["user"]["username"], "password": "Test-only-123!"},
        )
        self.assertEqual(response.status_code, 200)
        self.assertNotIn("password_hash", response.text)
        self.assertEqual(self.client.get("/api/me", headers=headers).status_code, 200)
        self.assertEqual(self.client.get("/api/progress").status_code, 401)
        with connect(self.settings.database_path) as db:
            password_hash = db.execute(
                "SELECT password_hash FROM users WHERE id=?", (account["user"]["id"],)
            ).fetchone()[0]
        self.assertTrue(password_hash.startswith("$argon2"))
        invalid = self.client.post("/api/auth/login", json={"username": "abc", "password": "short"})
        self.assertEqual(invalid.status_code, 422)
        self.assertTrue(all("input" not in item for item in invalid.json()["detail"]))

    def test_wrong_expired_and_forged_tokens(self):
        account, _ = self.account()
        wrong_login = self.client.post(
            "/api/auth/login",
            json={"username": account["user"]["username"], "password": "wrong-password"},
        )
        self.assertEqual(wrong_login.status_code, 401)
        payload = {
            "sub": account["user"]["id"],
            "iss": "pace-core",
            "aud": "pace-mobile",
            "iat": datetime.now(timezone.utc),
            "exp": datetime.now(timezone.utc) - timedelta(minutes=1),
        }
        expired = jwt.encode(payload, self.settings.jwt_secret, algorithm="HS256")
        for token in [expired, "garbage", jwt.encode({**payload, "exp": 9999999999}, "x" * 48)]:
            response = self.client.get(
                "/api/progress", headers={"Authorization": "Bearer " + token}
            )
            self.assertEqual(response.status_code, 401)

    def test_no_answer_keys_or_explanations_before_submission(self):
        _, headers = self.account()
        assessment = self.assessment(headers)
        text = json.dumps(assessment)
        self.assertNotIn("correct_index", text)
        self.assertNotIn("explanation", text)

    def test_threshold_and_recommendation_prerequisite(self):
        _, headers = self.account()
        locked = self.client.post(
            "/api/assessments", json={"concept_id": "daily-reading"}, headers=headers
        )
        self.assertEqual(locked.status_code, 409)
        assessment = self.assessment(headers)
        result = self.submit(assessment, headers, correct=3)
        self.assertEqual(result.json()["score"], 60)
        self.assertEqual(result.json()["status"], "needs_practice")
        recommendation = self.client.get("/api/recommendations", headers=headers).json()
        self.assertEqual(recommendation["items"][0]["action"], "practice")
        next_assessment = self.assessment(headers)
        self.assertEqual(
            self.submit(next_assessment, headers, correct=4).json()["status"], "mastered"
        )
        self.assessment(headers, "daily-reading")

    def test_replay_is_idempotent_and_mutation_rejected(self):
        _, headers = self.account()
        assessment = self.assessment(headers)
        first = self.submit(assessment, headers, 4)
        replay = self.submit(assessment, headers, 4)
        self.assertEqual(first.json(), replay.json())
        self.assertEqual(self.submit(assessment, headers, 3).status_code, 409)
        with connect(self.settings.database_path) as db:
            count = db.execute(
                "SELECT COUNT(*) FROM progress WHERE assessment_id=?", (assessment["id"],)
            ).fetchone()[0]
        self.assertEqual(count, 1)

    def test_concurrent_replay_is_idempotent(self):
        _, headers = self.account()
        assessment = self.assessment(headers)
        payload = self.answers(assessment)

        def send(_):
            return self.client.post(
                f"/api/assessments/{assessment['id']}/submit", json=payload, headers=headers
            )

        with ThreadPoolExecutor(max_workers=2) as executor:
            first, second = executor.map(send, range(2))
        self.assertEqual(first.status_code, 200)
        self.assertEqual(first.json(), second.json())

    def test_foreign_sessions_hidden_and_user_progress_isolated(self):
        _, first = self.account("a")
        _, second = self.account("b")
        assessment = self.assessment(first)
        self.assertEqual(
            self.client.get(f"/api/assessments/{assessment['id']}", headers=second).status_code, 404
        )
        self.assertEqual(self.submit(assessment, second).status_code, 404)
        self.submit(assessment, first)
        progress = self.client.get("/api/progress", headers=second).json()["items"]
        self.assertTrue(all(item["status"] == "not_assessed" for item in progress))

    def test_partial_duplicate_foreign_and_invalid_answers_rejected(self):
        _, headers = self.account()
        assessment = self.assessment(headers)
        answers = self.answers(assessment)["answers"]
        variants = [
            answers[:-1],
            answers + [answers[0]],
            [{"question_id": "unknown", "selected_index": 0}] + answers[1:],
            [{**answers[0], "selected_index": True}] + answers[1:],
            [{**answers[0], "selected_index": 4}] + answers[1:],
        ]
        for variant in variants:
            response = self.client.post(
                f"/api/assessments/{assessment['id']}/submit",
                json={"answers": variant},
                headers=headers,
            )
            self.assertEqual(response.status_code, 422, response.text)
        self.assertEqual(
            self.client.get(f"/api/assessments/{assessment['id']}", headers=headers).json()[
                "status"
            ],
            "in_progress",
        )

    def test_snapshot_survives_question_update(self):
        _, headers = self.account()
        assessment = self.assessment(headers, "greetings")
        payload = self.answers(assessment)
        with connect(self.settings.database_path) as db:
            db.execute(
                "UPDATE questions SET correct_index=(correct_index+1)%4 WHERE concept_id='greetings'"
            )
        try:
            result = self.client.post(
                f"/api/assessments/{assessment['id']}/submit", json=payload, headers=headers
            )
            self.assertEqual(result.json()["score"], 100)
        finally:
            with connect(self.settings.database_path) as db:
                db.execute(
                    "UPDATE questions SET correct_index=(correct_index+3)%4 WHERE concept_id='greetings'"
                )

    def test_delayed_old_session_cannot_overwrite_new_progress(self):
        _, headers = self.account()
        older, newer = self.assessment(headers), self.assessment(headers)
        self.submit(newer, headers, 5)
        self.submit(older, headers, 0)
        progress = self.client.get("/api/progress", headers=headers).json()["items"]
        selected = next(item for item in progress if item["concept_id"] == "daily-vocabulary")
        self.assertEqual(selected["score"], 100)
        self.assertEqual(selected["assessment_id"], newer["id"])

    def test_partner_keys_and_learner_namespaces(self):
        headers_a, headers_b = {"X-API-Key": "a" * 40}, {"X-API-Key": "b" * 40}
        self.assertEqual(self.client.get("/api/partner/concepts").status_code, 401)
        self.assertEqual(
            self.client.get("/api/partner/concepts", headers={"X-API-Key": "invalid"}).status_code,
            401,
        )
        base = "/api/partner/learners/student-001"
        response = self.client.post(
            base + "/assessments", json={"concept_id": "daily-vocabulary"}, headers=headers_a
        )
        self.assertEqual(response.status_code, 201, response.text)
        assessment = response.json()
        path = base + f"/assessments/{assessment['id']}"
        self.assertEqual(self.client.get(path, headers=headers_b).status_code, 404)
        result = self.client.post(
            path + "/submit", json=self.answers(assessment), headers=headers_a
        )
        self.assertEqual(result.json()["status"], "mastered")
        for item in self.client.get(base + "/progress", headers=headers_b).json()["items"]:
            self.assertEqual(item["status"], "not_assessed")

    def test_persistence_after_restart(self):
        _, headers = self.account()
        assessment = self.assessment(headers)
        self.submit(assessment, headers)
        with TestClient(create_app(self.settings)) as restarted:
            progress = restarted.get("/api/progress", headers=headers).json()["items"]
        selected = next(item for item in progress if item["concept_id"] == "daily-vocabulary")
        self.assertEqual(selected["status"], "mastered")

    def test_demo_seed_idempotent_and_empty_unknown_catalog(self):
        seed_demo(self.settings.database_path)
        self.assertEqual(len(self.client.get("/api/concepts").json()["items"]), 3)
        self.assertEqual(
            self.client.get("/api/concepts", params={"topic": "unknown"}).json()["items"], []
        )
        self.assertEqual(self.client.get("/api/concepts/unknown/materials").status_code, 404)
        materials = self.client.get("/api/concepts/greetings/materials").json()["items"]
        self.assertFalse(materials[0]["reviewed"])

    def test_empty_database_is_valid_and_missing_questions_rejected(self):
        with tempfile.TemporaryDirectory() as directory:
            settings = Settings(Path(directory) / "empty.db", "t" * 48)
            with TestClient(create_app(settings)) as client:
                self.assertEqual(client.get("/api/health").status_code, 200)
                self.assertEqual(client.get("/api/concepts").json(), {"items": []})
        _, headers = self.account()
        with connect(self.settings.database_path) as db:
            db.execute(
                "INSERT INTO concepts VALUES ('empty','Empty','demo','vocabulary',4,NULL,99)"
            )
        try:
            response = self.client.post(
                "/api/assessments", json={"concept_id": "empty"}, headers=headers
            )
            self.assertEqual(response.status_code, 409)
        finally:
            with connect(self.settings.database_path) as db:
                db.execute("DELETE FROM concepts WHERE id='empty'")

    def test_invalid_configuration_fails_closed(self):
        for secret in ["", "short", "CHANGE_ME" * 8]:
            with self.assertRaises(ValueError):
                Settings(Path("unused"), secret)
        with self.assertRaises(ValueError):
            Settings(Path("unused"), "s" * 48, {"a": "k" * 40, "b": "k" * 40})


if __name__ == "__main__":
    unittest.main()
