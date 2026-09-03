-- ============================================================
-- Migration: 20260902_market_intelligence_feed
-- Módulo: Portal de Inteligência & Feed de Mercado
-- Isolamento: EXCLUSIVO para scraper-inteligencia.js
-- Não toca em: clients, agencies, bi_metrics, kanban_cards,
--              bi_chat_history, niche_knowledge_base
-- ============================================================

-- 1. Criar tabela se não existir (idempotente — seguro re-executar)
CREATE TABLE IF NOT EXISTS public.market_intelligence_feed (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id TEXT,
    client_id       TEXT,
    niche           TEXT NOT NULL,
    scraper_data    JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Garantir colunas adicionais caso a tabela já exista com schema antigo
ALTER TABLE public.market_intelligence_feed
    ADD COLUMN IF NOT EXISTS organization_id TEXT;

ALTER TABLE public.market_intelligence_feed
    ADD COLUMN IF NOT EXISTS client_id TEXT;

-- 3. Índices de performance para consultas por nicho e cliente
CREATE INDEX IF NOT EXISTS idx_mif_niche
    ON public.market_intelligence_feed (niche);

CREATE INDEX IF NOT EXISTS idx_mif_client_id
    ON public.market_intelligence_feed (client_id);

CREATE INDEX IF NOT EXISTS idx_mif_created_at
    ON public.market_intelligence_feed (created_at DESC);

-- 4. Row Level Security — política aberta (mesma estratégia das outras tabelas do projeto)
ALTER TABLE public.market_intelligence_feed ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Acesso total market_intelligence_feed" ON public.market_intelligence_feed;
CREATE POLICY "Acesso total market_intelligence_feed"
    ON public.market_intelligence_feed
    FOR ALL
    USING (true)
    WITH CHECK (true);
