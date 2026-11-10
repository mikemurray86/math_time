-- Time Attack: answer as many questions as you can before the clock runs out.
ALTER TABLE quizzes ADD COLUMN mode TEXT NOT NULL DEFAULT 'quiz'; -- 'quiz' or 'time'
ALTER TABLE quizzes ADD COLUMN time_limit_s INTEGER;             -- Time Attack length
ALTER TABLE quizzes ADD COLUMN ends_at INTEGER;                  -- Time Attack deadline, epoch ms (server clock)
CREATE INDEX quizzes_time_attack ON quizzes(kid_id, mode, time_limit_s, score);
