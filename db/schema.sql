-- NEXO: banco independente. Execução idempotente.
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS nexo_subjects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  name varchar(100) NOT NULL,
  color varchar(7) NOT NULL DEFAULT '#665FEB',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_nexo_subjects_user ON nexo_subjects (user_id);

CREATE TABLE IF NOT EXISTS nexo_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  subject_id uuid REFERENCES nexo_subjects(id) ON DELETE SET NULL,
  title varchar(180) NOT NULL,
  notes varchar(1000) NOT NULL DEFAULT '',
  due_date date NOT NULL,
  duration_minutes integer NOT NULL DEFAULT 60 CHECK (duration_minutes BETWEEN 15 AND 600),
  priority varchar(10) NOT NULL DEFAULT 'medium' CHECK (priority IN ('low','medium','high')),
  status varchar(10) NOT NULL DEFAULT 'todo' CHECK (status IN ('todo','done')),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_nexo_tasks_user_due ON nexo_tasks (user_id, due_date);

CREATE TABLE IF NOT EXISTS nexo_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  title varchar(180) NOT NULL,
  day date NOT NULL,
  start_time time NOT NULL,
  end_time time NOT NULL,
  category varchar(15) NOT NULL DEFAULT 'personal' CHECK (category IN ('work','class','training','personal','study')),
  repeat_weekly boolean NOT NULL DEFAULT false,
  task_id uuid REFERENCES nexo_tasks(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT nexo_event_order CHECK (start_time < end_time)
);
CREATE INDEX IF NOT EXISTS idx_nexo_events_user_day ON nexo_events (user_id, day);
CREATE INDEX IF NOT EXISTS idx_nexo_events_user_repeat ON nexo_events (user_id, repeat_weekly);

-- Atualizações compatíveis com a versão já publicada no Neon.
ALTER TABLE nexo_events ADD COLUMN IF NOT EXISTS repeat_yearly boolean NOT NULL DEFAULT false;
ALTER TABLE nexo_events ADD COLUMN IF NOT EXISTS all_day boolean NOT NULL DEFAULT false;
CREATE TABLE IF NOT EXISTS nexo_briefing_preferences (
  user_id text PRIMARY KEY,
  briefing_time varchar(5) NOT NULL DEFAULT '07:00' CHECK (briefing_time ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'),
  timezone varchar(64) NOT NULL DEFAULT 'America/Fortaleza',
  enabled boolean NOT NULL DEFAULT false,
  browser_alerts boolean NOT NULL DEFAULT false,
  last_acknowledged_date date,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Execute a migração idempotente abaixo para adicionar categorias a bases existentes.
-- A tabela de categorias personalizadas e as colunas opcionais são criadas pelo mesmo script.
-- Ver db/migrations/20261029_categories.sql (aplicar após a estrutura inicial).
