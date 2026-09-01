-- =========================================================================
-- MIGRATION: 20260901_enrich_clients_schema.sql
-- Enriquecimento e Defesa da Ficha Cadastral e Persistência do Cliente
-- =========================================================================

ALTER TABLE public.clients 
ADD COLUMN IF NOT EXISTS cnpj text,
ADD COLUMN IF NOT EXISTS state_registration text,
ADD COLUMN IF NOT EXISTS contact_name text,
ADD COLUMN IF NOT EXISTS phone text,
ADD COLUMN IF NOT EXISTS email_billing text,
ADD COLUMN IF NOT EXISTS website text,
ADD COLUMN IF NOT EXISTS instagram text,
ADD COLUMN IF NOT EXISTS zip_code text,
ADD COLUMN IF NOT EXISTS address_street text,
ADD COLUMN IF NOT EXISTS address_number text,
ADD COLUMN IF NOT EXISTS address_neighborhood text,
ADD COLUMN IF NOT EXISTS address_city text,
ADD COLUMN IF NOT EXISTS address_state text,
ADD COLUMN IF NOT EXISTS avg_ticket numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS target_revenue numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS billing_model text DEFAULT 'unico',
ADD COLUMN IF NOT EXISTS main_service text,
ADD COLUMN IF NOT EXISTS sales_cycle text DEFAULT 'imediato',
ADD COLUMN IF NOT EXISTS meta_ad_account_id text,
ADD COLUMN IF NOT EXISTS meta_pixel_id text,
ADD COLUMN IF NOT EXISTS google_customer_id text,
ADD COLUMN IF NOT EXISTS notes text,
ADD COLUMN IF NOT EXISTS previous_agency_notes text,
ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT NOW();
