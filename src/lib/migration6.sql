-- ==============================================================
-- MIGRAÇÃO 6: Colunas de Acerto de Contas (is_settled)
-- ==============================================================

-- 1. Adicionar coluna is_settled em appointments
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS is_settled BOOLEAN DEFAULT FALSE;

-- 2. Adicionar coluna is_settled em subscriptions
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS is_settled BOOLEAN DEFAULT FALSE;

-- 3. Índices para otimizar buscas financeiras
CREATE INDEX IF NOT EXISTS idx_appointments_settled ON appointments (barber_id, is_settled);
CREATE INDEX IF NOT EXISTS idx_subscriptions_settled ON subscriptions (barber_id, is_settled);
