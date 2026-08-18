-- Tabela de Cards do Kanban / Workflow
CREATE TABLE IF NOT EXISTS public.kanban_cards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agency_id UUID REFERENCES public.agencies(id) ON DELETE CASCADE,
    client_id TEXT REFERENCES public.clients(id) ON DELETE CASCADE,
    organization_id TEXT,
    title TEXT NOT NULL,
    description TEXT,
    status TEXT NOT NULL DEFAULT 'backlog',
    asset_type TEXT,
    file_path TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de Métricas do BI
CREATE TABLE IF NOT EXISTS public.bi_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agency_id UUID REFERENCES public.agencies(id) ON DELETE CASCADE,
    client_id TEXT REFERENCES public.clients(id) ON DELETE CASCADE,
    organization_id TEXT,
    roi NUMERIC(10, 2) DEFAULT 0.00,
    ltv NUMERIC(10, 2) DEFAULT 0.00,
    cac NUMERIC(10, 2) DEFAULT 0.00,
    total_budget NUMERIC(10, 2) DEFAULT 0.00,
    total_spent NUMERIC(10, 2) DEFAULT 0.00,
    total_revenue NUMERIC(10, 2) DEFAULT 0.00,
    period TEXT DEFAULT '30d',
    snapshot_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de Histórico de Chat do BI (Live Advisor)
CREATE TABLE IF NOT EXISTS public.bi_chat_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agency_id UUID REFERENCES public.agencies(id) ON DELETE CASCADE,
    client_id TEXT REFERENCES public.clients(id) ON DELETE CASCADE,
    role TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Habilitar RLS
ALTER TABLE public.kanban_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bi_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bi_chat_history ENABLE ROW LEVEL SECURITY;

-- Políticas Kanban
DROP POLICY IF EXISTS "Isolate kanban by agency" ON public.kanban_cards;
CREATE POLICY "Isolate kanban by agency" ON public.kanban_cards FOR ALL TO authenticated USING (
    is_super_admin() OR (agency_id = get_user_agency_id())
);

-- Políticas BI Metrics
DROP POLICY IF EXISTS "Isolate bi by agency" ON public.bi_metrics;
CREATE POLICY "Isolate bi by agency" ON public.bi_metrics FOR ALL TO authenticated USING (
    is_super_admin() OR (agency_id = get_user_agency_id())
);

-- Políticas BI Chat
DROP POLICY IF EXISTS "Isolate bi chat by agency" ON public.bi_chat_history;
CREATE POLICY "Isolate bi chat by agency" ON public.bi_chat_history FOR ALL TO authenticated USING (
    is_super_admin() OR (agency_id = get_user_agency_id())
);
