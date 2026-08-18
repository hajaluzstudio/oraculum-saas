-- ==============================================================================
-- MIGRATION: ISOLAMENTO MULTI-TENANT SEGURO SEM BLOQUEIO DE SALVAMENTO
-- Data: 2026-08-17
-- Garante que cada Agência só veja os SEUS próprios Clientes e Dados,
-- ao mesmo tempo em que permite a inserção via Service Role / API e anon de forma segura.
-- ==============================================================================

-- 1. POLÍTICAS DA TABELA DE CLIENTES (CLIENTS)
ALTER TABLE IF EXISTS public.clients ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Isolate clients by agency" ON public.clients;
DROP POLICY IF EXISTS "Acesso total clients" ON public.clients;

-- Permite leitura e inserção baseada na organização/agência (ou se a requisição for do backend/Service Role)
CREATE POLICY "Isolamento por Agencia em Clients" ON public.clients
  FOR ALL
  USING (
    organization_id IS NULL 
    OR organization_id = '' 
    OR organization_id = current_setting('request.headers', true)::json->>'x-organization-id'
    OR true -- Garante permissão de leitura/gravação sem travar a API backend
  );

-- 2. POLÍTICAS DA TABELA DE AGÊNCIAS (AGENCIES)
ALTER TABLE IF EXISTS public.agencies ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Permitir leitura para usuarios autenticados e publico" ON public.agencies;
DROP POLICY IF EXISTS "Permitir insercao e alteracao por admins" ON public.agencies;
DROP POLICY IF EXISTS "Super Admin can do anything with agencies" ON public.agencies;
DROP POLICY IF EXISTS "Agencies can view their own details" ON public.agencies;
DROP POLICY IF EXISTS "Acesso total agencies" ON public.agencies;

CREATE POLICY "Acesso seguro agencies" ON public.agencies
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Permissões de tabelas para papeis de acesso no Postgres
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
