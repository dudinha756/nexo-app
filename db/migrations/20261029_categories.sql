-- NEXO 2026-10-29: migração exclusivamente ADITIVA, sem alterar dados existentes.
-- Aplicar no banco Neon existente antes de publicar a nova API.
CREATE TABLE IF NOT EXISTS nexo_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  name varchar(60) NOT NULL,
  color varchar(7) NOT NULL DEFAULT '#8E939D' CHECK (color ~ '^#[0-9a-fA-F]{6}$'),
  icon varchar(32) NOT NULL DEFAULT 'tag',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_nexo_categories_user_name ON nexo_categories(user_id, lower(name));
CREATE INDEX IF NOT EXISTS idx_nexo_categories_user ON nexo_categories(user_id);
-- `category` legado mantém o CHECK e os valores antigos; a categoria visível é COALESCE(category_key,category).
ALTER TABLE nexo_events ADD COLUMN IF NOT EXISTS category_key varchar(15) CHECK (
  category_key IS NULL OR category_key IN ('work','class','training','personal','study','birthday','dining','friends','family','health','leisure','other')
);
ALTER TABLE nexo_events ADD COLUMN IF NOT EXISTS custom_category_id uuid REFERENCES nexo_categories(id) ON DELETE SET NULL;
ALTER TABLE nexo_tasks ADD COLUMN IF NOT EXISTS category varchar(15) CHECK (
  category IS NULL OR category IN ('work','class','training','personal','study','birthday','dining','friends','family','health','leisure','other')
);
ALTER TABLE nexo_tasks ADD COLUMN IF NOT EXISTS custom_category_id uuid REFERENCES nexo_categories(id) ON DELETE SET NULL;
