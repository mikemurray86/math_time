CREATE TABLE bank_entries (
  id INTEGER PRIMARY KEY,
  generator TEXT NOT NULL,
  params_json TEXT NOT NULL,
  label TEXT NOT NULL,
  note TEXT NOT NULL DEFAULT '',
  weight INTEGER NOT NULL DEFAULT 2,
  enabled INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE quizzes (
  id INTEGER PRIMARY KEY,
  started_at TEXT NOT NULL DEFAULT (datetime('now')),
  finished_at TEXT,
  local_date TEXT,
  score INTEGER,
  total INTEGER NOT NULL,
  stars_earned INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE quiz_questions (
  id INTEGER PRIMARY KEY,
  quiz_id INTEGER NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
  position INTEGER NOT NULL,
  bank_entry_id INTEGER REFERENCES bank_entries(id) ON DELETE SET NULL,
  generator TEXT NOT NULL,
  params_json TEXT NOT NULL,
  seed INTEGER NOT NULL,
  answer_json TEXT NOT NULL,
  first_answer_json TEXT,
  retry_answer_json TEXT,
  correct_first INTEGER,
  correct_final INTEGER,
  time_ms INTEGER,
  answered_at TEXT
);
CREATE INDEX quiz_questions_quiz ON quiz_questions(quiz_id);
CREATE INDEX quiz_questions_entry ON quiz_questions(bank_entry_id, answered_at);

CREATE TABLE badges (
  code TEXT PRIMARY KEY,
  earned_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- key/value: settings and reward state (stars, streak, avatar, ...)
CREATE TABLE kv (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
