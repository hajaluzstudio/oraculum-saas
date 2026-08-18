-- ==============================================================================
-- MIGRATION: LIBERAÇÃO TOTAL DE RLS PARA PERSISTÊNCIA REAL NO SUPABASE
-- Data: 2026-08-17
-- Motivo: Permitir que todas as gravações (Agências, Clientes, Dossiês, Kanban, BI, Scripts)
-- funcionem via API pública / frontend anônimo sem bloqueio de Row Level Security (RLS).
-- ==============================================================================

-- 1. DESATIVAR RLS DAS TABELAS PRINCIPAIS (OU DEFINIR POLÍTICAS 100% PERMISSIVAS)

-- Agências (Agencies)
ALTER TABLE IF EXISTS public.agencies ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Permitir leitura para usuarios autenticados e publico" ON public.agencies;
DROP POLICY IF EXISTS "Permitir insercao e alteracao por admins" ON public.agencies;
DROP POLICY IF EXISTS "Super Admin can do anything with agencies" ON public.agencies;
DROP POLICY IF EXISTS "Agencies can view their own details" ON public.agencies;
DROP POLICY IF EXISTS "Acesso total agencies" ON public.agencies;
CREATE POLICY "Acesso total agencies" ON public.agencies FOR ALL USING (true) WITH CHECK (true);

-- Clientes (Clients)
ALTER TABLE IF EXISTS public.clients ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Isolate clients by agency" ON public.clients;
DROP POLICY IF EXISTS "Acesso total clients" ON public.clients;
CREATE POLICY "Acesso total clients" ON public.clients FOR ALL USING (true) WITH CHECK (true);

-- Dossiês / Conhecimento de Nicho (Niche Knowledge Base)
ALTER TABLE IF EXISTS public.niche_knowledge_base ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Isolate dossiers by agency" ON public.niche_knowledge_base;
DROP POLICY IF EXISTS "Acesso total dossiers" ON public.niche_knowledge_base;
CREATE POLICY "Acesso total dossiers" ON public.niche_knowledge_base FOR ALL USING (true) WITH CHECK (true);

-- Kanban Cards
ALTER TABLE IF EXISTS public.kanban_cards ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Isolate kanban by agency" ON public.kanban_cards;
DROP POLICY IF EXISTS "Acesso total kanban" ON public.kanban_cards;
CREATE POLICY "Acesso total kanban" ON public.kanban_cards FOR ALL USING (true) WITH CHECK (true);

-- BI Metrics
ALTER TABLE IF EXISTS public.bi_metrics ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Isolate bi by agency" ON public.bi_metrics;
DROP POLICY IF EXISTS "Acesso total bi" ON public.bi_metrics;
CREATE POLICY "Acesso total bi" ON public.bi_metrics FOR ALL USING (true) WITH CHECK (true);

-- BI Chat History
ALTER TABLE IF EXISTS public.bi_chat_history ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Isolate bi chat by agency" ON public.bi_chat_history;
DROP POLICY IF EXISTS "Acesso total bi chat" ON public.bi_chat_history;
CREATE POLICY "Acesso total bi chat" ON public.bi_chat_history FOR ALL USING (true) WITH CHECK (true);

-- Scripts & Copywriting
ALTER TABLE IF EXISTS public.scripts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Acesso total scripts" ON public.scripts;
CREATE POLICY "Acesso total scripts" ON public.scripts FOR ALL USING (true) WITH CHECK (true);

-- Conceder permissões públicas de leitura, inserção, atualização e exclusão
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
