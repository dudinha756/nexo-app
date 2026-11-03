-- NEXO background Web Push: additive and idempotent migration.
-- This does not alter or remove any user tasks, events, or accounts.
CREATE TABLE IF NOT EXISTS nexo_push_subscriptions (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 user_id text NOT NULL,
 endpoint text NOT NULL UNIQUE,
 p256dh text NOT NULL,
 auth text NOT NULL,
 timezone varchar(64) NOT NULL DEFAULT 'America/Fortaleza',
 settings jsonb NOT NULL DEFAULT '{"enabled":false,"lead":30,"categories":[],"maxDaily":5}'::jsonb,
 enabled boolean NOT NULL DEFAULT false,
 last_test_at timestamptz,
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_nexo_push_subscriptions_user ON nexo_push_subscriptions(user_id);
CREATE TABLE IF NOT EXISTS nexo_push_deliveries (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 subscription_id uuid NOT NULL REFERENCES nexo_push_subscriptions(id) ON DELETE CASCADE,
 reminder_key text NOT NULL,
 local_day date NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(),
 sent_at timestamptz,
 UNIQUE(subscription_id,reminder_key)
);
CREATE INDEX IF NOT EXISTS idx_nexo_push_deliveries_day ON nexo_push_deliveries(subscription_id,local_day);
