-- =======================================================
-- MIGRATION: ESTRUTURA MULTI-TENANT & PERSISTÊNCIA DE AGÊNCIAS
-- =======================================================

-- 1. Tabela public.agencies
CREATE TABLE IF NOT EXISTS public.agencies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  cnpj VARCHAR(50),
  phone VARCHAR(50),
  admin_email VARCHAR(255) UNIQUE NOT NULL,
  plan VARCHAR(50) DEFAULT 'Starter',
  monthly_fee DECIMAL(10,2) DEFAULT 0.00,
  status VARCHAR(50) DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Garantir colunas se a tabela já existir
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='agencies' AND column_name='cnpj') THEN
    ALTER TABLE public.agencies ADD COLUMN cnpj VARCHAR(50);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='agencies' AND column_name='phone') THEN
    ALTER TABLE public.agencies ADD COLUMN phone VARCHAR(50);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='agencies' AND column_name='admin_email') THEN
    ALTER TABLE public.agencies ADD COLUMN admin_email VARCHAR(255);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='agencies' AND column_name='plan') THEN
    ALTER TABLE public.agencies ADD COLUMN plan VARCHAR(50) DEFAULT 'Starter';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='agencies' AND column_name='monthly_fee') THEN
    ALTER TABLE public.agencies ADD COLUMN monthly_fee DECIMAL(10,2) DEFAULT 0.00;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='agencies' AND column_name='status') THEN
    ALTER TABLE public.agencies ADD COLUMN status VARCHAR(50) DEFAULT 'active';
  END IF;
END $$;

-- 2. Garantir isolamento por agency_id nas tabelas dependentes
DO $$ 
BEGIN
  -- clients
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='clients') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='clients' AND column_name='agency_id') THEN
      ALTER TABLE public.clients ADD COLUMN agency_id UUID REFERENCES public.agencies(id) ON DELETE CASCADE;
    END IF;
  END IF;

  -- dossiers
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='dossiers') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='dossiers' AND column_name='agency_id') THEN
      ALTER TABLE public.dossiers ADD COLUMN agency_id UUID REFERENCES public.agencies(id) ON DELETE CASCADE;
    END IF;
  END IF;

  -- scripts
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='scripts') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='scripts' AND column_name='agency_id') THEN
      ALTER TABLE public.scripts ADD COLUMN agency_id UUID REFERENCES public.agencies(id) ON DELETE CASCADE;
    END IF;
  END IF;

  -- chat_history
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='chat_history') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='chat_history' AND column_name='agency_id') THEN
      ALTER TABLE public.chat_history ADD COLUMN agency_id UUID REFERENCES public.agencies(id) ON DELETE CASCADE;
    END IF;
  END IF;
END $$;

-- 3. Habilitar RLS em public.agencies
ALTER TABLE public.agencies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Permitir leitura para usuarios autenticados e publico" ON public.agencies
  FOR SELECT USING (true);

CREATE POLICY "Permitir insercao e alteracao por admins" ON public.agencies
  FOR ALL USING (true);
