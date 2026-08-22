-- ==============================================================================
-- MIGRATION: CRIAÇÃO DA TABELA DE PERFIS DE USUÁRIO (USER PROFILES) E TRIGGERS
-- ==============================================================================

-- 1. Criação da tabela `user_profiles` que estende `auth.users`
CREATE TABLE IF NOT EXISTS public.user_profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'agency_user' CHECK (role IN ('master_admin', 'agency_admin', 'agency_user')),
    agency_id UUID REFERENCES public.agencies(id) ON DELETE CASCADE,
    full_name VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Habilitar RLS na tabela
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- 3. Políticas RLS
-- Master Admin pode tudo
CREATE POLICY "Master Admins podem tudo em user_profiles" ON public.user_profiles
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.user_profiles up WHERE up.id = auth.uid() AND up.role = 'master_admin'
        )
    );

-- Usuários podem ver seu próprio perfil
CREATE POLICY "Usuários podem ver seu próprio perfil" ON public.user_profiles
    FOR SELECT USING (id = auth.uid());

-- Agency Admins podem ver/editar usuários da sua agência
CREATE POLICY "Agency Admins gerenciam usuários da mesma agência" ON public.user_profiles
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.user_profiles up 
            WHERE up.id = auth.uid() 
            AND up.role = 'agency_admin' 
            AND up.agency_id = public.user_profiles.agency_id
        )
    );

-- Garantir que a tabela possa ser lida sem restrições temporariamente caso precise
CREATE POLICY "Acesso total user_profiles temporario" ON public.user_profiles FOR ALL USING (true) WITH CHECK (true);

-- 4. Função e Trigger para criar perfil automaticamente ao registrar no Supabase Auth
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.user_profiles (id, email, role, agency_id, full_name)
    VALUES (
        new.id, 
        new.email, 
        COALESCE((new.raw_user_meta_data->>'role')::VARCHAR, 'agency_user'),
        NULLIF((new.raw_user_meta_data->>'agency_id')::TEXT, '')::UUID,
        new.raw_user_meta_data->>'full_name'
    );
    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Conceder acesso
GRANT ALL ON TABLE public.user_profiles TO anon;
GRANT ALL ON TABLE public.user_profiles TO authenticated;
GRANT ALL ON TABLE public.user_profiles TO service_role;
