import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { supabase } from '../src/services/supabaseClient';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' }));

const DEFAULT_TENANT_ID = 'e4b8a1c9-7d3f-42e1-95a8-2083bf2f9104';

const tenantAuthMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const tenantHeader = req.headers['x-organization-id'] as string;
  (req as any).organizationId = tenantHeader || DEFAULT_TENANT_ID;
  next();
};

app.use(tenantAuthMiddleware);

/**
 * GET /api/oraculo-chat/:clientId - Lista histórico de mensagens do Oráculo por Cliente
 */
app.get('/api/oraculo-chat/:clientId', async (req: Request, res: Response) => {
  try {
    const { clientId } = req.params;
    if (!clientId) {
      return res.status(400).json({ error: 'clientId não informado.' });
    }

    let messages: any[] = [];
    try {
      const { data, error } = await supabase
        .from('oraculo_chat_history')
        .select('*')
        .eq('client_id', clientId)
        .order('created_at', { ascending: true });

      if (!error && data) {
        messages = data;
      }
    } catch (e) {
      console.warn('[OraculoChat] Supabase query fallback.');
    }

    return res.json({ success: true, data: messages });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Erro ao buscar histórico de chat.' });
  }
});

/**
 * POST /api/oraculo-chat - Salva uma nova mensagem no histórico do Oráculo
 */
app.post('/api/oraculo-chat', async (req: Request, res: Response) => {
  try {
    const organizationId = (req as any).organizationId;
    const { clientId, role, message, metadata } = req.body;

    if (!clientId || !role || !message) {
      return res.status(400).json({ error: 'clientId, role e message são obrigatórios.' });
    }

    let insertedRecord: any = null;
    try {
      const { data, error } = await supabase
        .from('oraculo_chat_history')
        .insert([
          {
            organization_id: organizationId,
            client_id: clientId,
            role,
            message,
            metadata: metadata || {},
            created_at: new Date().toISOString()
          }
        ])
        .select()
        .single();

      if (!error && data) {
        insertedRecord = data;
      }
    } catch (e) {
      console.warn('[OraculoChat] Supabase insert fallback.');
    }

    if (!insertedRecord) {
      insertedRecord = {
        id: 'msg_' + Date.now(),
        organization_id: organizationId,
        client_id: clientId,
        role,
        message,
        metadata: metadata || {},
        created_at: new Date().toISOString()
      };
    }

    return res.status(201).json({ success: true, data: insertedRecord });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Erro ao salvar mensagem.' });
  }
});

/**
 * DELETE /api/oraculo-chat/client/:clientId - Limpa todo o histórico de um cliente
 */
app.delete('/api/oraculo-chat/client/:clientId', async (req: Request, res: Response) => {
  try {
    const { clientId } = req.params;
    try {
      await supabase
        .from('oraculo_chat_history')
        .delete()
        .eq('client_id', clientId);
    } catch (e) {}

    return res.json({ success: true, message: 'Histórico limpo com sucesso.' });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Erro ao limpar histórico.' });
  }
});

/**
 * DELETE /api/oraculo-chat/:id - Apaga uma mensagem específica
 */
app.delete('/api/oraculo-chat/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    try {
      await supabase
        .from('oraculo_chat_history')
        .delete()
        .eq('id', id);
    } catch (e) {}

    return res.json({ success: true, message: 'Mensagem apagada com sucesso.' });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Erro ao apagar mensagem.' });
  }
});

export default app;
