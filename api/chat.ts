import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { sendStrategicChatMessage } from '../src/services/strategicChat';

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

    console.log('[API /api/chat] Body recebido:', { organizationId, clientId, messageLength: message?.length, historyCount: history?.length });

    // Validação da Variável de Ambiente
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.error('❌ [API /api/chat] GEMINI_API_KEY não está configurada nas variáveis de ambiente!');
      return res.status(500).json({
        success: false,
        error: 'Chave de API do Gemini não configurada no servidor.',
        detail: 'Configure a variável GEMINI_API_KEY nas variáveis de ambiente do projeto ou na Vercel.'
      });
    }

    if (!clientId || !message) {
      console.warn('⚠️ [API /api/chat] Parâmetros obrigatórios ausentes:', { clientId: !!clientId, message: !!message });
      return res.status(400).json({ success: false, error: 'Parâmetros clientId e message são obrigatórios.' });
    }

    console.log('[API /api/chat] Chamando sendStrategicChatMessage...');
    const response = await sendStrategicChatMessage(organizationId, clientId, message, history || []);
    console.log('[API /api/chat] Resposta gerada com sucesso');

    return res.json({ success: true, data: response });
  } catch (error: any) {
    console.error('❌ [API /api/chat] Erro ao processar mensagem do chat:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Erro interno no Chat Estratégico.',
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

export default app;
