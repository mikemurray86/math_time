-- Multiple children: each has their own rewards, avatar, badges, quizzes and question bank.
CREATE TABLE kids (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  code_hash TEXT,              -- picture code; NULL means tap-to-start
  code_length INTEGER NOT NULL DEFAULT 0,
  avatar_json TEXT NOT NULL DEFAULT '{}',
  stars INTEGER NOT NULL DEFAULT 0,
  streak INTEGER NOT NULL DEFAULT 0,
  best_streak INTEGER NOT NULL DEFAULT 0,
  last_date TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Data from the single-child version becomes the first child's.
INSERT INTO kids (name, avatar_json, stars, streak, best_streak, last_date)
SELECT
  COALESCE(NULLIF((SELECT json_extract(value, '$.kidName') FROM kv WHERE key = 'settings'), ''), 'Shannon'),
  COALESCE((SELECT value FROM kv WHERE key = 'avatar'), '{}'),
  COALESCE((SELECT json_extract(value, '$.stars') FROM kv WHERE key = 'rewards'), 0),
  COALESCE((SELECT json_extract(value, '$.streak') FROM kv WHERE key = 'rewards'), 0),
  COALESCE((SELECT json_extract(value, '$.bestStreak') FROM kv WHERE key = 'rewards'), 0),
  (SELECT json_extract(value, '$.lastDate') FROM kv WHERE key = 'rewards')
WHERE EXISTS (SELECT 1 FROM quizzes) OR EXISTS (SELECT 1 FROM bank_entries);

ALTER TABLE bank_entries ADD COLUMN kid_id INTEGER REFERENCES kids(id) ON DELETE CASCADE;
UPDATE bank_entries SET kid_id = (SELECT MIN(id) FROM kids);
CREATE INDEX bank_entries_kid ON bank_entries(kid_id);

ALTER TABLE quizzes ADD COLUMN kid_id INTEGER REFERENCES kids(id) ON DELETE CASCADE;
UPDATE quizzes SET kid_id = (SELECT MIN(id) FROM kids);
CREATE INDEX quizzes_kid ON quizzes(kid_id, finished_at);

CREATE TABLE kid_badges (
  kid_id INTEGER NOT NULL REFERENCES kids(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  earned_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (kid_id, code)
);
INSERT INTO kid_badges (kid_id, code, earned_at)
SELECT (SELECT MIN(id) FROM kids), code, earned_at FROM badges WHERE EXISTS (SELECT 1 FROM kids);
DROP TABLE badges;

DELETE FROM kv WHERE key IN ('rewards', 'avatar');
UPDATE kv SET value = json_remove(value, '$.kidName') WHERE key = 'settings';
