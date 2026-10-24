-- Star Store purchases: items are bought with stars instead of unlocking at a star level.
CREATE TABLE kid_items (
  kid_id INTEGER NOT NULL REFERENCES kids(id) ON DELETE CASCADE,
  item_id TEXT NOT NULL,
  bought_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (kid_id, item_id)
);

-- Whatever a child is already wearing counts as theirs (old pip* ids mapped to helper ids).
INSERT OR IGNORE INTO kid_items (kid_id, item_id)
SELECT k.id, replace(replace(replace(replace(j.value, 'pipfur-orange', 'hfur-classic'), 'pipfur-', 'hfur-'), 'piphat-', 'hhat-'), 'pipextra-', 'hextra-')
FROM kids k, json_each(k.avatar_json) j;

-- Lifetime stars earned from quizzes, for the star badges; spending doesn't lower it.
ALTER TABLE kids ADD COLUMN stars_earned INTEGER NOT NULL DEFAULT 0;
UPDATE kids SET stars_earned = stars;
