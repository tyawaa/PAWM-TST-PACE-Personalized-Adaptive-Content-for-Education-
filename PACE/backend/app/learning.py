import json
import sqlite3
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import cast

from fastapi import HTTPException

from .database import connect
from .schemas import (
    Answer,
    AssessmentResult,
    AssessmentSnapshot,
    AssessmentView,
    ConceptProgress,
    MasteryStatus,
    ProgressRecord,
    QuestionRecord,
    Recommendations,
)

RULE_VERSION: str = "prototype-v1"
MASTERY_THRESHOLD: int = 80
MIN_QUESTIONS: int = 5


def now() -> str:
    return datetime.now(timezone.utc).isoformat()


def progress_map(db: sqlite3.Connection, user_id: str) -> dict[str, ProgressRecord]:
    return {
        row["concept_id"]: cast(ProgressRecord, dict(row))
        for row in db.execute("SELECT * FROM progress WHERE user_id=?", (user_id,))
    }


def prerequisites(
    db: sqlite3.Connection, concept: sqlite3.Row, progress: dict[str, ProgressRecord]
) -> list[str]:
    missing: list[str] = []
    identifier: str | None = concept["prerequisite_id"]
    visited: set[str] = {concept["id"]}
    while identifier:
        if identifier in visited:
            raise HTTPException(503, "Konfigurasi prasyarat membentuk siklus.")
        visited.add(identifier)
        saved: ProgressRecord | None = progress.get(identifier)
        if saved is None or saved["status"] != "mastered":
            missing.append(identifier)
        row: sqlite3.Row | None = db.execute(
            "SELECT * FROM concepts WHERE id=?", (identifier,)
        ).fetchone()
        if row is None:
            raise HTTPException(503, "Konsep prasyarat tidak ditemukan.")
        identifier = row["prerequisite_id"]
    return list(reversed(missing))


def get_progress(path: Path, user_id: str) -> list[ConceptProgress]:
    with connect(path) as db:
        progress: dict[str, ProgressRecord] = progress_map(db, user_id)
        items: list[ConceptProgress] = []
        for concept in db.execute("SELECT * FROM concepts ORDER BY position, id"):
            saved: ProgressRecord | None = progress.get(concept["id"])
            item: ConceptProgress = {
                "concept_id": concept["id"],
                "title": concept["title"],
                "status": saved["status"] if saved is not None else "not_assessed",
                "score": saved["score"] if saved is not None else None,
                "assessment_id": saved["assessment_id"] if saved is not None else None,
                "updated_at": saved["updated_at"] if saved is not None else None,
                "missing_prerequisites": prerequisites(db, concept, progress),
            }
            items.append(item)
        return items


def recommendations(path: Path, user_id: str) -> Recommendations:
    progress: list[ConceptProgress] = get_progress(path, user_id)
    practice: list[ConceptProgress] = [
        concept
        for concept in progress
        if concept["status"] == "needs_practice" and not concept["missing_prerequisites"]
    ]
    unseen: list[ConceptProgress] = [
        concept
        for concept in progress
        if concept["status"] == "not_assessed" and not concept["missing_prerequisites"]
    ]
    selected: list[ConceptProgress] = (practice or unseen)[:1]
    return {
        "rule_version": RULE_VERSION,
        "all_mastered": (
            bool(progress) and all(concept["status"] == "mastered" for concept in progress)
        ),
        "items": [
            {
                "concept_id": row["concept_id"],
                "title": row["title"],
                "action": "practice" if practice else "initial_assessment",
                "reason": "Pelajari ulang materi sebelum evaluasi berikutnya."
                if practice
                else "Kerjakan asesmen awal untuk konsep ini.",
                "materials_path": f"/api/concepts/{row['concept_id']}/materials",
            }
            for row in selected
        ],
    }


def create_assessment(path: Path, user_id: str, concept_id: str) -> AssessmentView:
    with connect(path) as db:
        concept: sqlite3.Row | None = db.execute(
            "SELECT * FROM concepts WHERE id=?", (concept_id,)
        ).fetchone()
        if concept is None:
            raise HTTPException(404, "Konsep tidak ditemukan.")
        missing: list[str] = prerequisites(db, concept, progress_map(db, user_id))
        if missing:
            raise HTTPException(
                409,
                {
                    "message": "Kuasai konsep prasyarat terlebih dahulu.",
                    "missing_prerequisites": missing,
                },
            )
        questions: list[QuestionRecord] = [
            cast(QuestionRecord, dict(question))
            for question in db.execute(
                "SELECT * FROM questions WHERE concept_id=? ORDER BY id", (concept_id,)
            )
        ]
        if len(questions) < MIN_QUESTIONS:
            raise HTTPException(409, "Bukti belum cukup: minimal lima soal per asesmen.")
        identifier: str = str(uuid.uuid4())
        snapshot: AssessmentSnapshot = {
            "questions": questions,
            "rule_version": RULE_VERSION,
            "threshold": MASTERY_THRESHOLD,
            "minimum_questions": MIN_QUESTIONS,
        }
        db.execute(
            "INSERT INTO assessments "
            "(id,user_id,concept_id,snapshot_json,created_at) VALUES (?,?,?,?,?)",
            (identifier, user_id, concept_id, json.dumps(snapshot), now()),
        )
    return get_assessment(path, user_id, identifier)


def get_assessment(path: Path, user_id: str, identifier: str) -> AssessmentView:
    with connect(path) as db:
        row: sqlite3.Row | None = db.execute(
            "SELECT * FROM assessments WHERE id=? AND user_id=?", (identifier, user_id)
        ).fetchone()
        if row is None:
            raise HTTPException(404, "Asesmen tidak ditemukan.")
        snapshot: AssessmentSnapshot = cast(
            AssessmentSnapshot, json.loads(row["snapshot_json"])
        )
        return {
            "id": row["id"],
            "concept_id": row["concept_id"],
            "created_at": row["created_at"],
            "status": "submitted" if row["submitted_at"] else "in_progress",
            "rule_version": snapshot["rule_version"],
            "questions": [
                {
                    "id": question["id"],
                    "prompt": question["prompt"],
                    "options": cast(list[str], json.loads(question["options_json"])),
                    "version": question["version"],
                }
                for question in snapshot["questions"]
            ],
            "result": cast(AssessmentResult, json.loads(row["result_json"]))
            if row["result_json"]
            else None,
        }


def _validate_answers(questions: list[QuestionRecord], submitted: dict[str, int]) -> None:
    if set(submitted) != {question["id"] for question in questions}:
        raise HTTPException(422, "Kirim tepat satu jawaban untuk setiap soal pada sesi ini.")
    for question in questions:
        options: list[str] = cast(list[str], json.loads(question["options_json"]))
        if submitted[question["id"]] >= len(options):
            raise HTTPException(422, "Pilihan jawaban tidak tersedia.")


def _grade_assessment(
    identifier: str,
    concept_id: str,
    snapshot: AssessmentSnapshot,
    submitted: dict[str, int],
    timestamp: str,
) -> AssessmentResult:
    questions: list[QuestionRecord] = snapshot["questions"]
    correct: int = sum(
        submitted[question["id"]] == question["correct_index"] for question in questions
    )
    score: float = round(correct / len(questions) * 100, 2)
    status: MasteryStatus = "mastered" if score >= snapshot["threshold"] else "needs_practice"
    return {
        "assessment_id": identifier,
        "concept_id": concept_id,
        "correct": correct,
        "total": len(questions),
        "score": score,
        "status": status,
        "rule_version": snapshot["rule_version"],
        "submitted_at": timestamp,
        "feedback": [
            {
                "question_id": question["id"],
                "correct": submitted[question["id"]] == question["correct_index"],
                "explanation": question["explanation"],
            }
            for question in questions
        ],
    }


def _save_progress(
    db: sqlite3.Connection, assessment: sqlite3.Row, result: AssessmentResult
) -> None:
    # Progres tetap pakai hasil sesi terbaru, meski sesi lama baru dikirim.
    latest: sqlite3.Row | None = db.execute(
        "SELECT a.sequence FROM progress p JOIN assessments a ON a.id=p.assessment_id "
        "WHERE p.user_id=? AND p.concept_id=?",
        (assessment["user_id"], assessment["concept_id"]),
    ).fetchone()
    if latest is not None and assessment["sequence"] <= latest["sequence"]:
        return
    db.execute(
        "INSERT INTO progress VALUES (?,?,?,?,?,?) "
        "ON CONFLICT(user_id,concept_id) DO UPDATE SET "
        "status=excluded.status,score=excluded.score,"
        "assessment_id=excluded.assessment_id,updated_at=excluded.updated_at",
        (
            assessment["user_id"],
            assessment["concept_id"],
            result["status"],
            result["score"],
            result["assessment_id"],
            result["submitted_at"],
        ),
    )


def submit_assessment(
    path: Path, user_id: str, identifier: str, answers: list[Answer]
) -> AssessmentResult:
    submitted: dict[str, int] = {
        answer.question_id: answer.selected_index for answer in answers
    }
    if len(submitted) != len(answers):
        raise HTTPException(422, "Jawaban untuk soal yang sama tidak boleh berulang.")
    canonical: str = json.dumps(submitted, sort_keys=True)
    with connect(path) as db:
        db.execute("BEGIN IMMEDIATE")
        row: sqlite3.Row | None = db.execute(
            "SELECT * FROM assessments WHERE id=? AND user_id=?", (identifier, user_id)
        ).fetchone()
        if row is None:
            raise HTTPException(404, "Asesmen tidak ditemukan.")
        if row["submitted_at"]:
            if row["answers_json"] != canonical:
                raise HTTPException(409, "Asesmen telah dikirim; buat sesi baru untuk mengulang.")
            return cast(AssessmentResult, json.loads(row["result_json"]))
        snapshot: AssessmentSnapshot = cast(
            AssessmentSnapshot, json.loads(row["snapshot_json"])
        )
        _validate_answers(snapshot["questions"], submitted)
        result: AssessmentResult = _grade_assessment(
            identifier, row["concept_id"], snapshot, submitted, now()
        )
        db.execute(
            "UPDATE assessments SET answers_json=?,result_json=?,submitted_at=? WHERE id=?",
            (canonical, json.dumps(result), result["submitted_at"], identifier),
        )
        _save_progress(db, row, result)
    return result


def partner_learner(path: Path, partner_id: str, learner_ref: str) -> str:
    with connect(path) as db:
        db.execute(
            "INSERT OR IGNORE INTO users (id,name,partner_id,learner_ref) VALUES (?,?,?,?)",
            (str(uuid.uuid4()), "Partner learner", partner_id, learner_ref),
        )
        learner: sqlite3.Row = db.execute(
            "SELECT id FROM users WHERE partner_id=? AND learner_ref=?",
            (partner_id, learner_ref),
        ).fetchone()
        return cast(str, learner["id"])
