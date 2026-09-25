-- Skema SQLite LAB. Progression milik tim (team_room_progress),
-- posisi milik player (player_positions), semua event penting di events.

CREATE TABLE IF NOT EXISTS maps (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  version     INTEGER NOT NULL DEFAULT 1,
  config_json TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS rooms (
  map_id       TEXT NOT NULL REFERENCES maps(id) ON DELETE CASCADE,
  id           TEXT NOT NULL,
  name         TEXT NOT NULL,
  category     TEXT,
  stage        INTEGER,
  points       INTEGER NOT NULL DEFAULT 0,
  room_type    TEXT NOT NULL DEFAULT 'room',
  requires     TEXT NOT NULL DEFAULT 'all',
  challenge_id TEXT,
  pos_x REAL, pos_y REAL, pos_z REAL,
  PRIMARY KEY (map_id, id)
);

CREATE TABLE IF NOT EXISTS room_dependencies (
  map_id           TEXT NOT NULL,
  room_id          TEXT NOT NULL,
  requires_room_id TEXT NOT NULL,
  PRIMARY KEY (map_id, room_id, requires_room_id),
  FOREIGN KEY (map_id, room_id) REFERENCES rooms(map_id, id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS matches (
  id          TEXT PRIMARY KEY,
  map_id      TEXT NOT NULL REFERENCES maps(id),
  name        TEXT,
  phase       TEXT NOT NULL,
  started_at  INTEGER NOT NULL,
  duration_ms INTEGER NOT NULL,
  ended_at    INTEGER
);

CREATE TABLE IF NOT EXISTS teams (
  id    TEXT PRIMARY KEY,
  name  TEXT NOT NULL,
  color TEXT,
  score INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS players (
  id      TEXT PRIMARY KEY,
  team_id TEXT NOT NULL REFERENCES teams(id),
  name    TEXT NOT NULL,
  color   TEXT
);

CREATE TABLE IF NOT EXISTS team_room_progress (
  match_id    TEXT NOT NULL REFERENCES matches(id),
  team_id     TEXT NOT NULL REFERENCES teams(id),
  room_id     TEXT NOT NULL,
  status      TEXT NOT NULL CHECK (status IN ('LOCKED', 'AVAILABLE', 'SOLVED')),
  unlocked_at INTEGER,
  solved_at   INTEGER,
  solved_by   TEXT,
  PRIMARY KEY (match_id, team_id, room_id)
);

CREATE TABLE IF NOT EXISTS player_positions (
  match_id       TEXT NOT NULL REFERENCES matches(id),
  player_id      TEXT NOT NULL REFERENCES players(id),
  room_id        TEXT,
  activity_state TEXT NOT NULL,
  last_activity  INTEGER,
  PRIMARY KEY (match_id, player_id)
);

CREATE TABLE IF NOT EXISTS events (
  event_id     TEXT PRIMARY KEY,
  match_id     TEXT,
  type         TEXT NOT NULL,
  team_id      TEXT,
  player_id    TEXT,
  room_id      TEXT,
  source       TEXT NOT NULL,
  lab          INTEGER NOT NULL DEFAULT 0,
  payload_json TEXT,
  summary      TEXT,
  timestamp    INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_events_match_time ON events (match_id, timestamp);
CREATE INDEX IF NOT EXISTS idx_events_team_time ON events (team_id, timestamp);
