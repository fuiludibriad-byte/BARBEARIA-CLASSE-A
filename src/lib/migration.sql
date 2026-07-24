-- Script de Migração para Barbearia Classe A (Multi-Barbeiro)

-- 1. Adicionar coluna barber_id nas tabelas existentes
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS barber_id TEXT NULL;
ALTER TABLE weekday_slots ADD COLUMN IF NOT EXISTS barber_id TEXT NULL;
ALTER TABLE date_specific_slots ADD COLUMN IF NOT EXISTS barber_id TEXT NULL;

-- 2. Atualizar índices/constraints exclusivas em weekday_slots
-- Remover a constraint antiga se existir
ALTER TABLE weekday_slots DROP CONSTRAINT IF EXISTS weekday_slots_weekday_time_key;
-- Adicionar a nova constraint composta com barber_id
ALTER TABLE weekday_slots ADD CONSTRAINT weekday_slots_barber_weekday_time_key UNIQUE(barber_id, weekday, "time");

-- 3. Atualizar índices/constraints exclusivas em date_specific_slots
-- Remover a constraint antiga se existir
ALTER TABLE date_specific_slots DROP CONSTRAINT IF EXISTS date_specific_slots_selected_date_time_key;
-- Adicionar a nova constraint composta com barber_id
ALTER TABLE date_specific_slots ADD CONSTRAINT date_specific_slots_barber_date_time_key UNIQUE(barber_id, selected_date, "time");
