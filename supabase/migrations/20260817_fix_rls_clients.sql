-- Desativar RLS estrito para permitir que o backend no Vercel (sem agency_id atrelado) salve clientes livremente

DROP POLICY IF EXISTS "Isolate clients by agency" ON public.clients;
DROP POLICY IF EXISTS "Acesso total clients" ON public.clients;
CREATE POLICY "Acesso total clients" ON public.clients FOR ALL USING (true);

DROP POLICY IF EXISTS "Isolate dossiers by agency" ON public.niche_knowledge_base;
DROP POLICY IF EXISTS "Acesso total dossiers" ON public.niche_knowledge_base;
CREATE POLICY "Acesso total dossiers" ON public.niche_knowledge_base FOR ALL USING (true);

DROP POLICY IF EXISTS "Isolate kanban by agency" ON public.kanban_cards;
DROP POLICY IF EXISTS "Acesso total kanban" ON public.kanban_cards;
CREATE POLICY "Acesso total kanban" ON public.kanban_cards FOR ALL USING (true);

DROP POLICY IF EXISTS "Isolate bi by agency" ON public.bi_metrics;
DROP POLICY IF EXISTS "Acesso total bi" ON public.bi_metrics;
CREATE POLICY "Acesso total bi" ON public.bi_metrics FOR ALL USING (true);

DROP POLICY IF EXISTS "Isolate bi chat by agency" ON public.bi_chat_history;
DROP POLICY IF EXISTS "Acesso total bi chat" ON public.bi_chat_history;
CREATE POLICY "Acesso total bi chat" ON public.bi_chat_history FOR ALL USING (true);
