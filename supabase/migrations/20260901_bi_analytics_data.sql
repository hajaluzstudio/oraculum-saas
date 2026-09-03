-- Criar ou atualizar a tabela bi_analytics_data para persistência total do BI
CREATE TABLE IF NOT EXISTS public.bi_analytics_data (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id TEXT NOT NULL,
    organization_id TEXT,
    agency_id UUID,
    reference_date DATE DEFAULT CURRENT_DATE,
    faturamento_total NUMERIC(15, 2) DEFAULT 0.00,
    revenue NUMERIC(15, 2) DEFAULT 0.00,
    faturamento NUMERIC(15, 2) DEFAULT 0.00,
    gasto_trafego NUMERIC(15, 2) DEFAULT 0.00,
    ad_spend NUMERIC(15, 2) DEFAULT 0.00,
    gasto NUMERIC(15, 2) DEFAULT 0.00,
    lucro_liquido NUMERIC(15, 2) DEFAULT 0.00,
    profit NUMERIC(15, 2) DEFAULT 0.00,
    vendas_fechadas INTEGER DEFAULT 0,
    sales INTEGER DEFAULT 0,
    vendas INTEGER DEFAULT 0,
    leads_gerados INTEGER DEFAULT 0,
    leads INTEGER DEFAULT 0,
    cliques INTEGER DEFAULT 0,
    clicks INTEGER DEFAULT 0,
    funil JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Garantir que todas as colunas existam caso a tabela já tenha sido criada previamente com menos colunas
ALTER TABLE public.bi_analytics_data ADD COLUMN IF NOT EXISTS faturamento_total NUMERIC(15, 2) DEFAULT 0.00;
ALTER TABLE public.bi_analytics_data ADD COLUMN IF NOT EXISTS revenue NUMERIC(15, 2) DEFAULT 0.00;
ALTER TABLE public.bi_analytics_data ADD COLUMN IF NOT EXISTS faturamento NUMERIC(15, 2) DEFAULT 0.00;
ALTER TABLE public.bi_analytics_data ADD COLUMN IF NOT EXISTS gasto_trafego NUMERIC(15, 2) DEFAULT 0.00;
ALTER TABLE public.bi_analytics_data ADD COLUMN IF NOT EXISTS ad_spend NUMERIC(15, 2) DEFAULT 0.00;
ALTER TABLE public.bi_analytics_data ADD COLUMN IF NOT EXISTS gasto NUMERIC(15, 2) DEFAULT 0.00;
ALTER TABLE public.bi_analytics_data ADD COLUMN IF NOT EXISTS lucro_liquido NUMERIC(15, 2) DEFAULT 0.00;
ALTER TABLE public.bi_analytics_data ADD COLUMN IF NOT EXISTS profit NUMERIC(15, 2) DEFAULT 0.00;
ALTER TABLE public.bi_analytics_data ADD COLUMN IF NOT EXISTS vendas_fechadas INTEGER DEFAULT 0;
ALTER TABLE public.bi_analytics_data ADD COLUMN IF NOT EXISTS sales INTEGER DEFAULT 0;
ALTER TABLE public.bi_analytics_data ADD COLUMN IF NOT EXISTS vendas INTEGER DEFAULT 0;
ALTER TABLE public.bi_analytics_data ADD COLUMN IF NOT EXISTS leads_gerados INTEGER DEFAULT 0;
ALTER TABLE public.bi_analytics_data ADD COLUMN IF NOT EXISTS leads INTEGER DEFAULT 0;
ALTER TABLE public.bi_analytics_data ADD COLUMN IF NOT EXISTS cliques INTEGER DEFAULT 0;
ALTER TABLE public.bi_analytics_data ADD COLUMN IF NOT EXISTS clicks INTEGER DEFAULT 0;
ALTER TABLE public.bi_analytics_data ADD COLUMN IF NOT EXISTS funil JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.bi_analytics_data ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Habilitar RLS e criar política de acesso irrestrito
ALTER TABLE public.bi_analytics_data ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Acesso total bi_analytics_data" ON public.bi_analytics_data;
CREATE POLICY "Acesso total bi_analytics_data" ON public.bi_analytics_data FOR ALL USING (true) WITH CHECK (true);
