-- Script de Criação de Tabelas no Supabase para Barbearia Classe A

CREATE TABLE IF NOT EXISTS appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_nome TEXT NULL,
  cliente_telefone TEXT NULL,
  servico_nome TEXT NULL,
  duracao_minutos INTEGER NOT NULL,
  data_hora_inicio TIMESTAMPTZ NOT NULL,
  data_hora_fim TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'accepted', -- 'accepted', 'completed', 'blocked', 'cancelled'
  google_event_id TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  barber_id TEXT NULL,
  price DECIMAL(10,2) DEFAULT 0.00,
  is_plan_usage BOOLEAN DEFAULT FALSE,
  is_settled BOOLEAN DEFAULT FALSE
);

-- Índices para buscas rápidas por faixa de horário e por ID do evento do Google Calendar
CREATE INDEX IF NOT EXISTS idx_appointments_time ON appointments (data_hora_inicio, data_hora_fim);
CREATE INDEX IF NOT EXISTS idx_appointments_google_event_id ON appointments (google_event_id);

-- Configurações de Provisionamento do Google Calendar por Estúdio
CREATE TABLE IF NOT EXISTS studio_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome_do_estudio TEXT NOT NULL,
  email_pessoal TEXT NOT NULL UNIQUE,
  google_calendar_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Horários Permitidos Whitelist por Dia da Semana (Barbearia Classe A)
CREATE TABLE IF NOT EXISTS weekday_slots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  weekday INTEGER NOT NULL, -- 0 = Domingo, 1 = Segunda, ..., 6 = Sábado
  time TEXT NOT NULL,       -- Formato "HH:mm"
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(weekday, time)
);

-- Horários Permitidos Whitelist por Data Específica (Barbearia Classe A)
CREATE TABLE IF NOT EXISTS date_specific_slots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  selected_date DATE NOT NULL, -- Formato "YYYY-MM-DD"
  time TEXT NOT NULL,          -- Formato "HH:mm"
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(selected_date, time)
);

-- Assinaturas (Planos Mensais)
CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_name TEXT NOT NULL,
  client_phone TEXT NOT NULL,
  plan_type TEXT NOT NULL,
  total_cuts INTEGER NOT NULL,
  used_cuts INTEGER NOT NULL DEFAULT 0,
  barber_id TEXT NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_settled BOOLEAN DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_phone ON subscriptions (client_phone);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions (status);
