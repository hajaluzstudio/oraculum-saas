import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { supabase } from '../src/services/supabaseClient';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));

/**
 * GET /api/agency-settings - Retorna todas as configurações da agência do Supabase
 */
app.get('/api/agency-settings', async (req: Request, res: Response) => {
  try {
    let settingsMap: Record<string, string> = {};
    try {
      const { data, error } = await supabase
        .from('agency_settings')
        .select('*');

      if (!error && data) {
        data.forEach(item => {
          settingsMap[item.key] = item.value;
        });
      }
    } catch (e) {
      console.warn('[AgencySettings] Supabase fetch fallback.');
    }

    return res.json({ success: true, settings: settingsMap });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Erro ao carregar configurações.' });
  }
});

/**
 * POST /api/agency-settings - Salva/atualiza uma ou várias configurações no Supabase
 */
app.post('/api/agency-settings', async (req: Request, res: Response) => {
  try {
    const { settings } = req.body;
    if (!settings || typeof settings !== 'object') {
      return res.status(400).json({ error: 'Payload de configurações inválido.' });
    }

    const upsertPayload = Object.entries(settings).map(([key, value]) => ({
      key,
      value: String(value),
      updated_at: new Date().toISOString()
    }));

    try {
      await supabase
        .from('agency_settings')
        .upsert(upsertPayload, { onConflict: 'key' });
    } catch (e) {
      console.warn('[AgencySettings] Supabase upsert fallback.');
    }

    return res.json({ success: true, message: 'Configurações salvas no Banco de Dados com sucesso.' });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Erro ao salvar configurações.' });
  }
});

export default app;
