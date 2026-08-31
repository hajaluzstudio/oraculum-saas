-- ==============================================================================
-- MIGRATION: CRIAÇÃO E LIBERAÇÃO DO STORAGE DE AVATARS E TABELA PROFILES
-- ==============================================================================

-- 1. Criação do Bucket 'avatars' no storage caso não exista
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'avatars', 
    'avatars', 
    true, 
    5242880, -- 5MB limit
    ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO UPDATE SET 
    public = true,
    file_size_limit = 5242880,
    allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

-- 2. Políticas de RLS para o Storage 'avatars' (Permitir Upload, Leitura e Atualização)
DROP POLICY IF EXISTS "Public Access to Avatars" ON storage.objects;
DROP POLICY IF EXISTS "Allow Public Upload to Avatars" ON storage.objects;
DROP POLICY IF EXISTS "Allow Public Update to Avatars" ON storage.objects;
DROP POLICY IF EXISTS "Allow Public Delete to Avatars" ON storage.objects;

CREATE POLICY "Public Access to Avatars" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'avatars');

CREATE POLICY "Allow Public Upload to Avatars" 
ON storage.objects FOR INSERT 
WITH CHECK (bucket_id = 'avatars');

CREATE POLICY "Allow Public Update to Avatars" 
ON storage.objects FOR UPDATE 
USING (bucket_id = 'avatars');

CREATE POLICY "Allow Public Delete to Avatars" 
ON storage.objects FOR DELETE 
USING (bucket_id = 'avatars');

-- 3. Garantir que as colunas existam na tabela profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS foto_url TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS agency_name TEXT;

-- 4. Garantir liberação de RLS na tabela profiles para salvar sem erros
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Acesso total profiles" ON public.profiles;
CREATE POLICY "Acesso total profiles" ON public.profiles FOR ALL USING (true) WITH CHECK (true);

-- 5. Conceder permissões para anon, authenticated e service_role
GRANT ALL ON TABLE public.profiles TO anon, authenticated, service_role;
GRANT ALL ON SCHEMA storage TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA storage TO anon, authenticated, service_role;
