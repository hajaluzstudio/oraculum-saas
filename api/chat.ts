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
    const organizationId = (req as any).organizationId;
    const { clientId, message, history } = req.body;

    if (!clientId || !message) {
      return res.status(400).json({ error: 'Parâmetros clientId e message são obrigatórios.' });
    }

    const response = await sendStrategicChatMessage(organizationId, clientId, message, history || []);

    return res.json({ success: true, data: response });
  } catch (error: any) {
    console.error('❌ Erro no Chat Estratégico:', error);
    return res.status(500).json({ error: error.message || 'Erro no Chat Estratégico.' });
  }
});

export default app;
