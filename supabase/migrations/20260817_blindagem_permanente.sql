-- Migration para Blindagem Permanente no Supabase

-- 1. TABELA DE CLIENTES (COM IDS DE TRÁFEGO PAGO)
CREATE TABLE IF NOT EXISTS public.clients (
  id TEXT PRIMARY KEY DEFAULT ('client_' || extract(epoch from now())::bigint),
  name TEXT NOT NULL,
  niche TEXT,
  target_roi NUMERIC,
  monthly_budget NUMERIC,
  meta_ad_account_id TEXT,
  meta_pixel_id TEXT,
  google_customer_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Alterações de segurança para garantir colunas existentes
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS meta_ad_account_id TEXT;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS meta_pixel_id TEXT;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS google_customer_id TEXT;

-- 2. TABELA DE MEMÓRIA E HISTÓRICO DO ORÁCULO (INTELIGÊNCIA CONTÍNUA)
CREATE TABLE IF NOT EXISTS public.oraculo_memoria (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  metrics_context JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para oraculo_memoria
CREATE INDEX IF NOT EXISTS idx_oraculo_memoria_client_id ON public.oraculo_memoria(client_id);
CREATE INDEX IF NOT EXISTS idx_oraculo_memoria_created_at ON public.oraculo_memoria(created_at);

-- 3. TABELA DE CONFIGURAÇÕES GLOBAIS DA AGÊNCIA (CONFIGS MASTER)
CREATE TABLE IF NOT EXISTS public.agency_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Habilitar RLS
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.oraculo_memoria ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agency_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Acesso total clients" ON public.clients;
CREATE POLICY "Acesso total clients" ON public.clients FOR ALL USING (true);

DROP POLICY IF EXISTS "Acesso total oraculo_memoria" ON public.oraculo_memoria;
CREATE POLICY "Acesso total oraculo_memoria" ON public.oraculo_memoria FOR ALL USING (true);

DROP POLICY IF EXISTS "Acesso total agency_settings" ON public.agency_settings;
CREATE POLICY "Acesso total agency_settings" ON public.agency_settings FOR ALL USING (true);
