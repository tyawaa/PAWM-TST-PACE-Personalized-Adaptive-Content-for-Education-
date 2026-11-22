import sqlite3
import uuid
from contextlib import asynccontextmanager
from typing import Annotated

from anyio import to_thread
from fastapi import APIRouter, Depends, FastAPI, HTTPException, Path, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from . import learning
from .config import Settings
from .database import connect, initialize
from .schemas import AssessmentCreate, Login, Register, Submission, TokenView, UserView
from .security import current_partner, current_user, dummy_hash, make_token, passwords

LearnerRef = Annotated[str, Path(min_length=1, max_length=80, pattern=r"^[a-zA-Z0-9_-]+$")]


def create_app(settings: Settings | None = None):
    settings = settings or Settings.from_env()

    @asynccontextmanager
    async def lifespan(app):
        to_thread.current_default_thread_limiter().total_tokens = 2
        initialize(settings.database_path)
        yield

    app = FastAPI(
        title="PACE Core API",
        version="0.1.0",
        lifespan=lifespan,
        description="Prototipe layanan pembelajaran bahasa Inggris adaptif. "
        "Penilaian memakai aturan prototype-v1; bukan asesmen pendidikan tervalidasi.",
    )
    app.state.settings = settings
    app.add_middleware(
        CORSMiddleware,
        allow_origins=list(settings.allowed_origins),
        allow_methods=["GET", "POST"],
        allow_headers=["Authorization", "Content-Type", "X-API-Key"],
    )

    @app.exception_handler(RequestValidationError)
    async def validation_error(request: Request, error: RequestValidationError):
        # Jangan sertakan password atau token dalam pesan error.
        return JSONResponse(
            status_code=422,
            content={
                "detail": [
                    {"loc": list(item["loc"]), "msg": item["msg"], "type": item["type"]}
                    for item in error.errors()
                ]
            },
        )

    @app.exception_handler(sqlite3.OperationalError)
    async def database_unavailable(request: Request, error: sqlite3.OperationalError):
        return JSONResponse(
            status_code=503,
            content={"detail": "Penyimpanan sementara tidak tersedia. Coba lagi."},
            headers={"Retry-After": "2"},
        )

    api = APIRouter(prefix="/api")

    @api.get("/health", tags=["operasional"])
    def health():
        with connect(settings.database_path) as db:
            db.execute("SELECT COUNT(*) FROM users").fetchone()
        return {"status": "ok", "service": "pace-core", "version": "0.1.0"}

    @api.post("/auth/register", status_code=201, response_model=TokenView, tags=["akun"])
    def register(payload: Register):
        identifier = str(uuid.uuid4())
        hashed = passwords.hash(payload.password)
        try:
            with connect(settings.database_path) as db:
                db.execute(
                    "INSERT INTO users (id,username,name,password_hash) VALUES (?,?,?,?)",
                    (identifier, payload.username, payload.name.strip(), hashed),
                )
        except sqlite3.IntegrityError:
            raise HTTPException(409, "Username sudah digunakan.") from None
        user = {"id": identifier, "username": payload.username, "name": payload.name.strip()}
        return {
            "access_token": make_token(identifier, settings),
            "expires_in": settings.token_minutes * 60,
            "user": user,
        }

    @api.post("/auth/login", response_model=TokenView, tags=["akun"])
    def login(payload: Login):
        with connect(settings.database_path) as db:
            user = db.execute(
                "SELECT * FROM users WHERE username=?", (payload.username,)
            ).fetchone()
        hashed = user["password_hash"] if user else dummy_hash
        valid = passwords.verify(payload.password, hashed)
        if not user or not valid:
            raise HTTPException(
                401, "Username atau password salah.", headers={"WWW-Authenticate": "Bearer"}
            )
        return {
            "access_token": make_token(user["id"], settings),
            "expires_in": settings.token_minutes * 60,
            "user": dict(user),
        }

    @api.get("/me", response_model=UserView, tags=["akun"])
    def me(user=Depends(current_user)):
        return user

    @api.get("/topics", tags=["katalog"])
    def topics():
        with connect(settings.database_path) as db:
            return {
                "items": [
                    dict(row)
                    for row in db.execute(
                        "SELECT topic AS id, COUNT(*) AS concept_count FROM concepts GROUP BY topic ORDER BY topic"
                    )
                ]
            }

    @api.get("/concepts", tags=["katalog"])
    def concepts(topic: str | None = None):
        with connect(settings.database_path) as db:
            rows = db.execute(
                "SELECT * FROM concepts WHERE (? IS NULL OR topic=?) ORDER BY position,id",
                (topic, topic),
            )
            return {"items": [dict(row) for row in rows]}

    @api.get("/concepts/{concept_id}/materials", tags=["katalog"])
    def materials(concept_id: str):
        with connect(settings.database_path) as db:
            if not db.execute("SELECT id FROM concepts WHERE id=?", (concept_id,)).fetchone():
                raise HTTPException(404, "Konsep tidak ditemukan.")
            return {
                "items": [
                    {**dict(row), "reviewed": bool(row["reviewed"])}
                    for row in db.execute(
                        "SELECT * FROM materials WHERE concept_id=? ORDER BY id", (concept_id,)
                    )
                ],
                "notice": "Data seed adalah contoh demo. Periksa reviewed dan source sebelum dipakai belajar.",
            }

    @api.post("/assessments", status_code=201, tags=["pembelajaran"])
    def create_assessment(payload: AssessmentCreate, user=Depends(current_user)):
        return learning.create_assessment(settings.database_path, user["id"], payload.concept_id)

    @api.get("/assessments/{assessment_id}", tags=["pembelajaran"])
    def get_assessment(assessment_id: str, user=Depends(current_user)):
        return learning.get_assessment(settings.database_path, user["id"], assessment_id)

    @api.post("/assessments/{assessment_id}/submit", tags=["pembelajaran"])
    def submit(assessment_id: str, payload: Submission, user=Depends(current_user)):
        return learning.submit_assessment(
            settings.database_path, user["id"], assessment_id, payload.answers
        )

    @api.get("/progress", tags=["pembelajaran"])
    def progress(user=Depends(current_user)):
        return {"items": learning.get_progress(settings.database_path, user["id"])}

    @api.get("/recommendations", tags=["pembelajaran"])
    def recommendations(user=Depends(current_user)):
        return learning.recommendations(settings.database_path, user["id"])

    partner_api = APIRouter(prefix="/partner", tags=["antarkelompok"])

    @partner_api.get("/concepts")
    def partner_concepts(partner=Depends(current_partner)):
        return concepts()

    @partner_api.post("/learners/{learner_ref}/assessments", status_code=201)
    def partner_create(
        learner_ref: LearnerRef, payload: AssessmentCreate, partner=Depends(current_partner)
    ):
        user_id = learning.partner_learner(settings.database_path, partner, learner_ref)
        return learning.create_assessment(settings.database_path, user_id, payload.concept_id)

    @partner_api.get("/learners/{learner_ref}/assessments/{assessment_id}")
    def partner_session(
        learner_ref: LearnerRef, assessment_id: str, partner=Depends(current_partner)
    ):
        user_id = learning.partner_learner(settings.database_path, partner, learner_ref)
        return learning.get_assessment(settings.database_path, user_id, assessment_id)

    @partner_api.post("/learners/{learner_ref}/assessments/{assessment_id}/submit")
    def partner_submit(
        learner_ref: LearnerRef,
        assessment_id: str,
        payload: Submission,
        partner=Depends(current_partner),
    ):
        user_id = learning.partner_learner(settings.database_path, partner, learner_ref)
        return learning.submit_assessment(
            settings.database_path, user_id, assessment_id, payload.answers
        )

    @partner_api.get("/learners/{learner_ref}/progress")
    def partner_progress(learner_ref: LearnerRef, partner=Depends(current_partner)):
        user_id = learning.partner_learner(settings.database_path, partner, learner_ref)
        return {"items": learning.get_progress(settings.database_path, user_id)}

    @partner_api.get("/learners/{learner_ref}/recommendations")
    def partner_recommendations(learner_ref: LearnerRef, partner=Depends(current_partner)):
        user_id = learning.partner_learner(settings.database_path, partner, learner_ref)
        return learning.recommendations(settings.database_path, user_id)

    api.include_router(partner_api)
    app.include_router(api)
    return app
