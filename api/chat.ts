import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { sendStrategicChatMessage } from '../src/services/strategicChat';
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

// POST /api/chat - Chat Estratégico de Co-Criação com a IA Gemini
app.post('/api/chat', async (req: Request, res: Response) => {
  try {
    console.log('[API /api/chat] Requisição recebida');
    const organizationId = (req as any).organizationId;
    const { clientId, message, history } = req.body || {};

    const apiKey = process.env.GEMINI_API_KEY?.trim();
    if (!apiKey) {
      console.error('❌ [API /api/chat] GEMINI_API_KEY não está configurada nas variáveis de ambiente!');
      return res.status(500).json({
        status: 'error',
        message: 'Chave de API do Gemini não configurada no servidor (GEMINI_API_KEY ausente).'
      });
    }

    if (!clientId || !message) {
      return res.status(400).json({ status: 'error', message: 'Parâmetros clientId e message são obrigatórios.' });
    }

    // 1. Grava a mensagem do usuário no Supabase
    const { error: userInsertErr } = await supabase.from('bi_chat_history').insert({
      client_id: clientId,
      role: 'user',
      content: message,
      created_at: new Date().toISOString()
    });

    if (userInsertErr) {
      console.error('❌ [Supabase Insert User Error]:', userInsertErr);
    } else {
      console.log('✅ Mensagem do usuário gravada no bi_chat_history');
    }

    // 2. Executa a IA para gerar a resposta estratégica
    const response = await sendStrategicChatMessage(organizationId, clientId, message, history || []);

    const replyText = typeof response === 'string' ? response : (response.replyText || JSON.stringify(response));

    // 3. Grava a resposta da IA no Supabase
    const { error: aiInsertErr } = await supabase.from('bi_chat_history').insert({
      client_id: clientId,
      role: 'assistant',
      content: replyText,
      json_response: typeof response === 'object' ? response : null,
      created_at: new Date().toISOString()
    });

    if (aiInsertErr) {
      console.error('❌ [Supabase Insert AI Error]:', aiInsertErr);
    } else {
      console.log('✅ Resposta da IA gravada no bi_chat_history');
    }

    return res.json({ success: true, data: response });
  } catch (error: any) {
    console.error('❌ [API /api/chat] Erro ao processar mensagem do chat:', error);
    return res.status(500).json({
      status: 'error',
      message: error.message || 'Erro interno no Chat Estratégico.',
      detail: error
    });
  }
});

export default app;
