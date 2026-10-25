-- Each child's school grade (picks their starting question set).
ALTER TABLE kids ADD COLUMN grade INTEGER;
UPDATE kids SET grade = 6; -- everyone before this was on the 6th grade set
