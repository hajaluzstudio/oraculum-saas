-- 1. Tabela de Agências (Tenants)
CREATE TABLE IF NOT EXISTS public.agencies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    cnpj_cpf TEXT,
    email_billing TEXT NOT NULL,
    phone TEXT,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'blocked', 'trial', 'past_due')),
    plan_tier TEXT NOT NULL DEFAULT 'standard',
    monthly_fee NUMERIC(10, 2) DEFAULT 0.00,
    due_day INT DEFAULT 10,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Tabela de Perfis de Usuários
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    agency_id UUID REFERENCES public.agencies(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    email TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'agency_member' CHECK (role IN ('super_admin', 'agency_owner', 'agency_member')),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Tabela de Clientes da Agência
CREATE TABLE IF NOT EXISTS public.clients (
    id TEXT PRIMARY KEY DEFAULT ('client_' || extract(epoch from now())::bigint),
    agency_id UUID REFERENCES public.agencies(id) ON DELETE CASCADE,
    organization_id TEXT,
    name TEXT NOT NULL,
    niche TEXT NOT NULL,
    website TEXT,
    previous_agency_notes TEXT,
    status TEXT DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Tabela de Dossiês por Cliente (Knowledge Base)
CREATE TABLE IF NOT EXISTS public.niche_knowledge_base (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agency_id UUID REFERENCES public.agencies(id) ON DELETE CASCADE,
    client_id TEXT REFERENCES public.clients(id) ON DELETE CASCADE,
    organization_id TEXT,
    niche TEXT NOT NULL,
    dossier_data JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Tabela de Histórico de Conversas do Chat com IA
CREATE TABLE IF NOT EXISTS public.chat_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agency_id UUID REFERENCES public.agencies(id) ON DELETE CASCADE,
    client_id TEXT REFERENCES public.clients(id) ON DELETE CASCADE,
    role TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. Habilitar RLS (Row Level Security)
ALTER TABLE public.agencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.niche_knowledge_base ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_history ENABLE ROW LEVEL SECURITY;

-- 7. Funções Auxiliares
CREATE OR REPLACE FUNCTION get_user_agency_id()
RETURNS UUID AS $$
    SELECT agency_id FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION is_super_admin()
RETURNS BOOLEAN AS $$
    SELECT (role = 'super_admin') FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- 8. Políticas de Segurança (RLS)
DROP POLICY IF EXISTS "Super Admin can do anything with agencies" ON public.agencies;
CREATE POLICY "Super Admin can do anything with agencies" ON public.agencies FOR ALL TO authenticated USING (is_super_admin());

DROP POLICY IF EXISTS "Agencies can view their own details" ON public.agencies;
CREATE POLICY "Agencies can view their own details" ON public.agencies FOR SELECT TO authenticated USING (id = get_user_agency_id());

DROP POLICY IF EXISTS "Isolate clients by agency" ON public.clients;
CREATE POLICY "Isolate clients by agency" ON public.clients FOR ALL TO authenticated USING (
    is_super_admin() OR (agency_id = get_user_agency_id() AND EXISTS (SELECT 1 FROM public.agencies WHERE id = get_user_agency_id() AND status = 'active'))
);

DROP POLICY IF EXISTS "Isolate dossiers by agency" ON public.niche_knowledge_base;
CREATE POLICY "Isolate dossiers by agency" ON public.niche_knowledge_base FOR ALL TO authenticated USING (
    is_super_admin() OR (agency_id = get_user_agency_id())
);

DROP POLICY IF EXISTS "Isolate chat by agency" ON public.chat_history;
CREATE POLICY "Isolate chat by agency" ON public.chat_history FOR ALL TO authenticated USING (
    is_super_admin() OR (agency_id = get_user_agency_id())
);
