CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    username TEXT UNIQUE,
    name TEXT NOT NULL,
    password_hash TEXT,
    partner_id TEXT,
    learner_ref TEXT,
    UNIQUE(partner_id, learner_ref)
);
CREATE TABLE IF NOT EXISTS concepts (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    topic TEXT NOT NULL,
    skill TEXT NOT NULL,
    grade INTEGER NOT NULL,
    prerequisite_id TEXT REFERENCES concepts(id),
    position INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS materials (
    id TEXT PRIMARY KEY,
    concept_id TEXT NOT NULL REFERENCES concepts(id),
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    version INTEGER NOT NULL,
    source TEXT NOT NULL,
    license TEXT NOT NULL,
    reviewed INTEGER NOT NULL CHECK(reviewed IN (0,1))
);
CREATE TABLE IF NOT EXISTS questions (
    id TEXT PRIMARY KEY,
    concept_id TEXT NOT NULL REFERENCES concepts(id),
    prompt TEXT NOT NULL,
    options_json TEXT NOT NULL,
    correct_index INTEGER NOT NULL,
    explanation TEXT NOT NULL,
    version INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS assessments (
    sequence INTEGER PRIMARY KEY AUTOINCREMENT,
    id TEXT NOT NULL UNIQUE,
    user_id TEXT NOT NULL REFERENCES users(id),
    concept_id TEXT NOT NULL REFERENCES concepts(id),
    snapshot_json TEXT NOT NULL,
    answers_json TEXT,
    result_json TEXT,
    created_at TEXT NOT NULL,
    submitted_at TEXT
);
CREATE TABLE IF NOT EXISTS progress (
    user_id TEXT NOT NULL REFERENCES users(id),
    concept_id TEXT NOT NULL REFERENCES concepts(id),
    status TEXT NOT NULL CHECK(status IN ('needs_practice','mastered')),
    score REAL NOT NULL,
    assessment_id TEXT NOT NULL REFERENCES assessments(id),
    updated_at TEXT NOT NULL,
    PRIMARY KEY(user_id, concept_id)
);
CREATE INDEX IF NOT EXISTS assessments_user ON assessments(user_id);
PRAGMA user_version = 1;
