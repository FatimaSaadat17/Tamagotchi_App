--liquibase formatted sql

--changeset pocketpet:006-adjustable-focus-and-pet-rest dbms:postgresql
ALTER TABLE focus_sessions DROP CONSTRAINT focus_sessions_planned_minutes_check;
ALTER TABLE focus_sessions ADD CONSTRAINT focus_sessions_planned_minutes_check CHECK (planned_minutes BETWEEN 1 AND 60);

ALTER TABLE pets ADD COLUMN nap_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (CURRENT_TIMESTAMP + INTERVAL '4 hours');

--rollback ALTER TABLE pets DROP COLUMN nap_at;
--rollback ALTER TABLE focus_sessions DROP CONSTRAINT focus_sessions_planned_minutes_check;
--rollback ALTER TABLE focus_sessions ADD CONSTRAINT focus_sessions_planned_minutes_check CHECK (planned_minutes BETWEEN 1 AND 25);
