from typing import Literal, TypedDict

from pydantic import BaseModel, ConfigDict, Field

MasteryStatus = Literal["needs_practice", "mastered"]


class UserIdentity(TypedDict):
    id: str
    username: str
    name: str


class ProgressRecord(TypedDict):
    user_id: str
    concept_id: str
    status: MasteryStatus
    score: float
    assessment_id: str
    updated_at: str


class ConceptProgress(TypedDict):
    concept_id: str
    title: str
    status: Literal["not_assessed", "needs_practice", "mastered"]
    score: float | None
    assessment_id: str | None
    updated_at: str | None
    missing_prerequisites: list[str]


class RecommendationItem(TypedDict):
    concept_id: str
    title: str
    action: Literal["practice", "initial_assessment"]
    reason: str
    materials_path: str


class Recommendations(TypedDict):
    rule_version: str
    all_mastered: bool
    items: list[RecommendationItem]


class QuestionRecord(TypedDict):
    id: str
    concept_id: str
    prompt: str
    options_json: str
    correct_index: int
    explanation: str
    version: int


class AssessmentSnapshot(TypedDict):
    questions: list[QuestionRecord]
    rule_version: str
    threshold: int
    minimum_questions: int


class QuestionView(TypedDict):
    id: str
    prompt: str
    options: list[str]
    version: int


class AnswerFeedback(TypedDict):
    question_id: str
    correct: bool
    explanation: str


class AssessmentResult(TypedDict):
    assessment_id: str
    concept_id: str
    correct: int
    total: int
    score: float
    status: MasteryStatus
    rule_version: str
    submitted_at: str
    feedback: list[AnswerFeedback]


class AssessmentView(TypedDict):
    id: str
    concept_id: str
    created_at: str
    status: Literal["submitted", "in_progress"]
    rule_version: str
    questions: list[QuestionView]
    result: AssessmentResult | None


class Payload(BaseModel):
    model_config = ConfigDict(extra="forbid")


class Login(Payload):
    username: str = Field(min_length=3, max_length=40, pattern=r"^[a-z0-9_]+$")
    password: str = Field(min_length=8, max_length=128)


class Register(Login):
    name: str = Field(min_length=1, max_length=80, pattern=r"\S")


class AssessmentCreate(Payload):
    concept_id: str = Field(min_length=1, max_length=80)


class Answer(Payload):
    question_id: str = Field(min_length=1, max_length=80)
    selected_index: int = Field(ge=0, le=3, strict=True)


class Submission(Payload):
    answers: list[Answer] = Field(min_length=1, max_length=30)


class UserView(BaseModel):
    id: str
    username: str
    name: str


class TokenView(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int
    user: UserView
