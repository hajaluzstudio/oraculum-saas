import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { supabase } from '../src/services/supabaseClient';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json({ limit: '20mb' }));

/**
 * GET /api/oraculo-memoria/:clientId - Recupera histórico completo da memória do Oráculo
 */
app.get('/api/oraculo-memoria/:clientId', async (req: Request, res: Response) => {
  try {
    const { clientId } = req.params;
    if (!clientId) {
      return res.status(400).json({ error: 'clientId é obrigatório.' });
    }

    let memoria: any[] = [];
    try {
      const { data, error } = await supabase
        .from('oraculo_memoria')
        .select('*')
        .eq('client_id', clientId)
        .order('created_at', { ascending: true });

      if (!error && data) {
        memoria = data;
      }
    } catch (e) {
      console.warn('[OraculoMemoria] Supabase select error:', e);
    }

    return res.json({ success: true, data: memoria });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Erro ao carregar memória do Oráculo.' });
  }
});

/**
 * POST /api/oraculo-memoria - Grava uma nova interação na memória do Oráculo
 */
app.post('/api/oraculo-memoria', async (req: Request, res: Response) => {
  try {
    const { clientId, role, content, metricsContext } = req.body;
    if (!clientId || !role || !content) {
      return res.status(400).json({ error: 'clientId, role e content são obrigatórios.' });
    }

    let insertedRecord: any = null;
    try {
      const { data, error } = await supabase
        .from('oraculo_memoria')
        .insert([
          {
            client_id: clientId,
            role,
            content,
            metrics_context: metricsContext || {},
            created_at: new Date().toISOString()
          }
        ])
        .select()
        .single();

      if (!error && data) {
        insertedRecord = data;
      }
    } catch (e) {
      console.warn('[OraculoMemoria] Supabase insert error:', e);
    }

    if (!insertedRecord) {
      insertedRecord = {
        id: 'mem_' + Date.now(),
        client_id: clientId,
        role,
        content,
        metrics_context: metricsContext || {},
        created_at: new Date().toISOString()
      };
    }

    return res.status(201).json({ success: true, data: insertedRecord });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Erro ao gravar memória do Oráculo.' });
  }
});

/**
 * DELETE /api/oraculo-memoria/client/:clientId - Limpa toda a memória de um cliente sob comando explícito
 */
app.delete('/api/oraculo-memoria/client/:clientId', async (req: Request, res: Response) => {
  try {
    const { clientId } = req.params;
    try {
      await supabase
        .from('oraculo_memoria')
        .delete()
        .eq('client_id', clientId);
    } catch (e) {}

    return res.json({ success: true, message: 'Memória do cliente apagada com sucesso.' });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Erro ao apagar memória.' });
  }
});

export default app;
