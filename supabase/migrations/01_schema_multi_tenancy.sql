-- ==============================================================================
-- SCHEMA DE BANCO DE DADOS POSTGRESQL - MULTI-TENANCY & ROW LEVEL SECURITY (RLS)
-- Plataforma SaaS de Marketing Híbrido ROI-First
-- FASE 1: Isolamento de Tenants, Clientes, Base de Conhecimento e Criativos
-- ==============================================================================

-- 1. EXTENSÕES NECESSÁRIAS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ==============================================================================
-- 2. CRIAÇÃO DAS TABELAS CENTRAIS
-- ==============================================================================

-- 2.1 ORGANIZATIONS (TENANTS)
-- Representa a agência ou conta SaaS contratante. Todos os dados são segregados por tenant.
CREATE TABLE IF NOT EXISTS public.organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) NOT NULL UNIQUE,
    plan VARCHAR(50) NOT NULL DEFAULT 'starter' CHECK (plan IN ('starter', 'pro', 'enterprise')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2.2 USERS (EXTENSÃO DO AUTH.USERS DO SUPABASE)
-- Associa usuários a organizações e define papéis no sistema.
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    full_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    role VARCHAR(50) NOT NULL DEFAULT 'strategist' CHECK (role IN ('owner', 'admin', 'strategist', 'designer', 'videomaker', 'traffic_manager')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2.3 CLIENTS (CLIENTES ATENDIDOS PELA AGÊNCIA)
-- Guarda os dados do cliente atendido dentro do tenant específico.
CREATE TABLE IF NOT EXISTS public.clients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    niche VARCHAR(150) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'onboarding' CHECK (status IN ('onboarding', 'active', 'paused', 'offboarded')),
    logo_url TEXT,
    website TEXT,
    -- Histórico da agência anterior (Sanitizado: usado APENAS para branding/tom de voz, nunca para estratégia)
    previous_agency_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2.4 NICHE_KNOWLEDGE_BASE (BASE DE CONHECIMENTO PREDITIVA DA IA)
-- Armazena o Dossiê Estratégico do Nicho gerado via Gemini API (@google/genai).
CREATE TABLE IF NOT EXISTS public.niche_knowledge_base (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
    niche_name VARCHAR(150) NOT NULL,
    dossier_data JSONB NOT NULL, -- Dossiê completo tipado (NicheDossier)
    market_overview JSONB,
    neuromarketing_angles JSONB,
    global_benchmarks JSONB,
    compliance_rules JSONB,
    predictive_plan JSONB,
    version INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT unique_client_niche_version UNIQUE (client_id, version)
);

-- 2.5 CAMPAIGNS (CAMPANHAS E METAS FINANCEIRAS)
CREATE TABLE IF NOT EXISTS public.campaigns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    objective VARCHAR(100) NOT NULL DEFAULT 'direct_sales' CHECK (objective IN ('direct_sales', 'lead_generation', 'ltv_expansion', 'brand_omnipresence')),
    status VARCHAR(50) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'paused', 'completed', 'archived')),
    target_cac NUMERIC(10, 2),
    target_roas NUMERIC(5, 2),
    budget_allocated NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2.6 CREATIVE_ASSETS (MONITORAMENTO E SCORING DE CRIATIVOS POR IA)
-- Registra arquivos visuais, scores da Visão Computacional Gemini e metadados injetados.
CREATE TABLE IF NOT EXISTS public.creative_assets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
    campaign_id UUID REFERENCES public.campaigns(id) ON DELETE SET NULL,
    title VARCHAR(255) NOT NULL,
    asset_type VARCHAR(50) NOT NULL CHECK (asset_type IN ('image', 'video', 'carousel')),
    drive_file_id VARCHAR(255),
    drive_file_url TEXT,
    status VARCHAR(50) NOT NULL DEFAULT 'raw' CHECK (status IN ('raw', 'processing', 'ai_approved', 'ai_rejected', 'published')),
    ai_overall_score NUMERIC(5, 2), -- Score geral 0-100
    ai_hook_score NUMERIC(5, 2),    -- Score de retenção nos primeiros 3 segundos (vídeo)
    ai_feedback JSONB,              -- Diagnóstico detalhado de retenção e neuromarketing
    metadata_injected BOOLEAN NOT NULL DEFAULT false,
    metadata_payload JSONB,         -- Certidão de nascimento do arquivo (EXIF/XMP/Stream tags)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ==============================================================================
-- 3. ÍNDICES PARA ALTA PERFORMANCE
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_users_org ON public.users(organization_id);
CREATE INDEX IF NOT EXISTS idx_clients_org ON public.clients(organization_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_org_client ON public.niche_knowledge_base(organization_id, client_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_org_client ON public.campaigns(organization_id, client_id);
CREATE INDEX IF NOT EXISTS idx_creative_assets_org_client ON public.creative_assets(organization_id, client_id);

-- ==============================================================================
-- 4. FUNÇÕES AUXILIARES E TRIGGERS DE TIMESTAMP
-- ==============================================================================

-- 4.1 Trigger para atualização automática de updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_organizations_updated_at BEFORE UPDATE ON public.organizations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_clients_updated_at BEFORE UPDATE ON public.clients FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_niche_kb_updated_at BEFORE UPDATE ON public.niche_knowledge_base FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_campaigns_updated_at BEFORE UPDATE ON public.campaigns FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_creative_assets_updated_at BEFORE UPDATE ON public.creative_assets FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 4.2 Funçao para buscar o organization_id do usuário auteticado no Supabase Auth
CREATE OR REPLACE FUNCTION public.get_user_organization_id()
RETURNS UUID AS $$
DECLARE
    org_id UUID;
BEGIN
    SELECT organization_id INTO org_id
    FROM public.users
    WHERE id = auth.uid();
    
    RETURN org_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- ==============================================================================
-- 5. CONFIGURAÇÃO DE ROW LEVEL SECURITY (RLS) & POLÍTICAS DE SEGURANÇA
-- ==============================================================================

-- 5.1 Ativação do RLS em todas as tabelas
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.niche_knowledge_base ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.creative_assets ENABLE ROW LEVEL SECURITY;

-- 5.2 Políticas para ORGANIZATIONS
CREATE POLICY "Usuários podem visualizar apenas sua própria organização"
    ON public.organizations FOR SELECT
    USING (id = public.get_user_organization_id());

-- 5.3 Políticas para USERS
CREATE POLICY "Usuários podem ver membros da mesma organização"
    ON public.users FOR SELECT
    USING (organization_id = public.get_user_organization_id());

CREATE POLICY "Owners e Admins podem atualizar usuários da mesma organização"
    ON public.users FOR UPDATE
    USING (
        organization_id = public.get_user_organization_id() 
        AND EXISTS (
            SELECT 1 FROM public.users u 
            WHERE u.id = auth.uid() AND u.role IN ('owner', 'admin')
        )
    );

-- 5.4 Políticas para CLIENTS (Multi-Tenancy RLS)
CREATE POLICY "Clientes visíveis apenas para membros da organização"
    ON public.clients FOR SELECT
    USING (organization_id = public.get_user_organization_id());

CREATE POLICY "Membros da organização podem inserir clientes"
    ON public.clients FOR INSERT
    WITH CHECK (organization_id = public.get_user_organization_id());

CREATE POLICY "Membros da organização podem atualizar seus clientes"
    ON public.clients FOR UPDATE
    USING (organization_id = public.get_user_organization_id());

CREATE POLICY "Membros da organização podem remover seus clientes"
    ON public.clients FOR DELETE
    USING (organization_id = public.get_user_organization_id());

-- 5.5 Políticas para NICHE_KNOWLEDGE_BASE (Multi-Tenancy RLS)
CREATE POLICY "Base de conhecimento visível apenas para a organização"
    ON public.niche_knowledge_base FOR SELECT
    USING (organization_id = public.get_user_organization_id());

CREATE POLICY "Inserção na base de conhecimento permitida para membros da organização"
    ON public.niche_knowledge_base FOR INSERT
    WITH CHECK (organization_id = public.get_user_organization_id());

CREATE POLICY "Atualização da base de conhecimento permitida para a organização"
    ON public.niche_knowledge_base FOR UPDATE
    USING (organization_id = public.get_user_organization_id());

-- 5.6 Políticas para CAMPAIGNS (Multi-Tenancy RLS)
CREATE POLICY "Campanhas visíveis apenas para membros da organização"
    ON public.campaigns FOR SELECT
    USING (organization_id = public.get_user_organization_id());

CREATE POLICY "Criar campanhas apenas dentro da própria organização"
    ON public.campaigns FOR INSERT
    WITH CHECK (organization_id = public.get_user_organization_id());

CREATE POLICY "Atualizar campanhas da própria organização"
    ON public.campaigns FOR UPDATE
    USING (organization_id = public.get_user_organization_id());

-- 5.7 Políticas para CREATIVE_ASSETS (Multi-Tenancy RLS)
CREATE POLICY "Criativos visíveis apenas para a organização proprietária"
    ON public.creative_assets FOR SELECT
    USING (organization_id = public.get_user_organization_id());

CREATE POLICY "Criar ativos visuais apenas na própria organização"
    ON public.creative_assets FOR INSERT
    WITH CHECK (organization_id = public.get_user_organization_id());

CREATE POLICY "Atualizar ativos visuais da própria organização"
    ON public.creative_assets FOR UPDATE
    USING (organization_id = public.get_user_organization_id());
