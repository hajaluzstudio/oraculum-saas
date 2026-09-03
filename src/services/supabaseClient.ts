import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

// Se SUPABASE_URL não for informada, utiliza URL placeholder segura para permitir inicialização e dev local
const supabaseUrl = process.env.SUPABASE_URL || 'https://placeholder-project.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || 'placeholder-anon-key';

if (!process.env.SUPABASE_URL) {
  console.warn('⚠️ AVISO: SUPABASE_URL não foi informada nas variáveis de ambiente. O servidor iniciou em modo local/demo.');
}

/**
 * Cliente oficial do Supabase pré-configurado com suporte a multi-tenancy e RLS
 */
export const supabase = createClient(supabaseUrl, supabaseKey);
export const supabaseAdmin = supabase;
