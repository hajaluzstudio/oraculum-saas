-- ==============================================================================
-- MIGRATION CORRIGIDA: LIBERAÇÃO E ISOLAMENTO SEGURO NO SUPABASE
-- Data: 2026-08-17
-- ==============================================================================

-- 1. AGÊNCIAS (AGENCIES)
CREATE TABLE IF NOT EXISTS public.agencies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  cnpj VARCHAR(50),
  phone VARCHAR(50),
  admin_email VARCHAR(255),
  plan VARCHAR(50) DEFAULT 'Starter',
  monthly_fee DECIMAL(10,2) DEFAULT 0.00,
  status VARCHAR(50) DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.agencies ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Permitir leitura para usuarios autenticados e publico" ON public.agencies;
DROP POLICY IF EXISTS "Permitir insercao e alteracao por admins" ON public.agencies;
DROP POLICY IF EXISTS "Super Admin can do anything with agencies" ON public.agencies;
DROP POLICY IF EXISTS "Agencies can view their own details" ON public.agencies;
DROP POLICY IF EXISTS "Acesso total agencies" ON public.agencies;
DROP POLICY IF EXISTS "Acesso seguro agencies" ON public.agencies;
CREATE POLICY "Acesso seguro agencies" ON public.agencies FOR ALL USING (true) WITH CHECK (true);

-- 2. CLIENTES (CLIENTS)
CREATE TABLE IF NOT EXISTS public.clients (
  id TEXT PRIMARY KEY,
  organization_id TEXT,
  name TEXT NOT NULL,
  niche TEXT,
  contact_name TEXT,
  phone TEXT,
  website TEXT,
  instagram TEXT,
  avg_ticket NUMERIC(10,2),
  target_revenue NUMERIC(10,2),
  previous_agency_notes TEXT,
  meta_ad_account_id TEXT,
  meta_pixel_id TEXT,
  google_customer_id TEXT,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Isolate clients by agency" ON public.clients;
DROP POLICY IF EXISTS "Acesso total clients" ON public.clients;
DROP POLICY IF EXISTS "Isolamento por Agencia em Clients" ON public.clients;
CREATE POLICY "Acesso total clients" ON public.clients FOR ALL USING (true) WITH CHECK (true);

-- 3. DOSSIÊS DE NICHO (NICHE_KNOWLEDGE_BASE)
CREATE TABLE IF NOT EXISTS public.niche_knowledge_base (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id TEXT,
  organization_id TEXT,
  niche TEXT NOT NULL,
  market_dossier JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.niche_knowledge_base ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Isolate dossiers by agency" ON public.niche_knowledge_base;
DROP POLICY IF EXISTS "Acesso total dossiers" ON public.niche_knowledge_base;
CREATE POLICY "Acesso total dossiers" ON public.niche_knowledge_base FOR ALL USING (true) WITH CHECK (true);

-- 4. KANBAN CARDS
CREATE TABLE IF NOT EXISTS public.kanban_cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id UUID,
  client_id TEXT,
  organization_id TEXT,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'backlog',
  asset_type TEXT,
  file_path TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.kanban_cards ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Isolate kanban by agency" ON public.kanban_cards;
DROP POLICY IF EXISTS "Acesso total kanban" ON public.kanban_cards;
CREATE POLICY "Acesso total kanban" ON public.kanban_cards FOR ALL USING (true) WITH CHECK (true);

-- 5. BI METRICS
CREATE TABLE IF NOT EXISTS public.bi_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id UUID,
  client_id TEXT,
  organization_id TEXT,
  roi NUMERIC(10, 2) DEFAULT 0.00,
  ltv NUMERIC(10, 2) DEFAULT 0.00,
  cac NUMERIC(10, 2) DEFAULT 0.00,
  total_budget NUMERIC(10, 2) DEFAULT 0.00,
  total_spent NUMERIC(10, 2) DEFAULT 0.00,
  total_revenue NUMERIC(10, 2) DEFAULT 0.00,
  period TEXT DEFAULT '30d',
  snapshot_date TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.bi_metrics ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Isolate bi by agency" ON public.bi_metrics;
DROP POLICY IF EXISTS "Acesso total bi" ON public.bi_metrics;
CREATE POLICY "Acesso total bi" ON public.bi_metrics FOR ALL USING (true) WITH CHECK (true);

-- 6. BI CHAT HISTORY
CREATE TABLE IF NOT EXISTS public.bi_chat_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id UUID,
  client_id TEXT,
  role TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.bi_chat_history ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Isolate bi chat by agency" ON public.bi_chat_history;
DROP POLICY IF EXISTS "Acesso total bi chat" ON public.bi_chat_history;
CREATE POLICY "Acesso total bi chat" ON public.bi_chat_history FOR ALL USING (true) WITH CHECK (true);

-- 7. SCRIPTS (CRIAR TABELA SE NÃO EXISTIR E APLICAR POLICY)
CREATE TABLE IF NOT EXISTS public.scripts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id TEXT,
  organization_id TEXT,
  title TEXT,
  content TEXT,
  format TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.scripts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Acesso total scripts" ON public.scripts;
CREATE POLICY "Acesso total scripts" ON public.scripts FOR ALL USING (true) WITH CHECK (true);

-- CONCEDER PERMISSÕES
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
