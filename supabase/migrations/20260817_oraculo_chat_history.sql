-- Migration para Histórico de Conversas do Oráculo Live Advisor e Chat de BI
CREATE TABLE IF NOT EXISTS public.oraculo_chat_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agency_id UUID REFERENCES public.agencies(id) ON DELETE CASCADE,
    organization_id TEXT,
    client_id TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
    message TEXT NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para buscas ultrarrápidas por cliente
CREATE INDEX IF NOT EXISTS idx_oraculo_chat_history_client_id ON public.oraculo_chat_history(client_id);
CREATE INDEX IF NOT EXISTS idx_oraculo_chat_history_created_at ON public.oraculo_chat_history(created_at);

-- Permissões de RLS
ALTER TABLE public.oraculo_chat_history ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Acesso total oraculo_chat_history" ON public.oraculo_chat_history;
CREATE POLICY "Acesso total oraculo_chat_history" ON public.oraculo_chat_history FOR ALL USING (true);
