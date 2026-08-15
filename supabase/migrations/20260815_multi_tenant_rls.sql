-- 1. Tabela de Agências (Tenants)
CREATE TABLE IF NOT EXISTS public.agencies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    cnpj_cpf TEXT,
    email_billing TEXT NOT NULL,
    phone TEXT,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'blocked', 'trial', 'past_due')),
    plan_tier TEXT NOT NULL DEFAULT 'standard', -- 'starter', 'pro', 'enterprise'
    monthly_fee NUMERIC(10, 2) DEFAULT 0.00,
    due_day INT DEFAULT 10,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Tabela de Perfis de Usuários com Vínculo de Agência e Role
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    agency_id UUID REFERENCES public.agencies(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    email TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'agency_member' CHECK (role IN ('super_admin', 'agency_owner', 'agency_member')),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Adicionar a coluna agency_id nas tabelas existentes para isolamento (se ainda não existirem)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='clients' AND column_name='agency_id') THEN
        ALTER TABLE public.clients ADD COLUMN agency_id UUID REFERENCES public.agencies(id) ON DELETE CASCADE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='niche_knowledge_base' AND column_name='agency_id') THEN
        ALTER TABLE public.niche_knowledge_base ADD COLUMN agency_id UUID REFERENCES public.agencies(id) ON DELETE CASCADE;
    END IF;
END $$;

-- 4. Habilitar RLS (Row Level Security) em todas as tabelas
ALTER TABLE public.agencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.niche_knowledge_base ENABLE ROW LEVEL SECURITY;

-- 5. Função Auxiliar para Pegar a Agência do Usuário Logado
CREATE OR REPLACE FUNCTION get_user_agency_id()
RETURNS UUID AS $$
    SELECT agency_id FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- 6. Função Auxiliar para Checar se é Super Admin
CREATE OR REPLACE FUNCTION is_super_admin()
RETURNS BOOLEAN AS $$
    SELECT (role = 'super_admin') FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- 7. Políticas de Segurança de Isolamento (RLS)

-- Agências: Super Admin vê tudo; Usuários veem apenas a sua agência
DROP POLICY IF EXISTS "Super Admin can do anything with agencies" ON public.agencies;
CREATE POLICY "Super Admin can do anything with agencies"
ON public.agencies FOR ALL
TO authenticated
USING (is_super_admin());

DROP POLICY IF EXISTS "Agencies can view their own details" ON public.agencies;
CREATE POLICY "Agencies can view their own details"
ON public.agencies FOR SELECT
TO authenticated
USING (id = get_user_agency_id());

-- Clientes: Usuário só vê clientes da própria agência E se a agência estiver ativa
DROP POLICY IF EXISTS "Isolate clients by agency and check status" ON public.clients;
CREATE POLICY "Isolate clients by agency and check status"
ON public.clients FOR ALL
TO authenticated
USING (
    is_super_admin() OR (
        agency_id = get_user_agency_id() AND 
        EXISTS (SELECT 1 FROM public.agencies WHERE id = get_user_agency_id() AND status = 'active')
    )
);
