import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { sendWhatsAppNotification, getClientNotificationHistory } from '../src/services/notificationCenter';

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

// POST /api/notifications/send-whatsapp - Disparo WhatsApp
app.post('/api/notifications/send-whatsapp', async (req: Request, res: Response) => {
  try {
    const { clientId, type, customPhone, customDetails } = req.body;
    if (!clientId) return res.status(400).json({ error: 'clientId é obrigatório.' });

    const notification = await sendWhatsAppNotification({
      clientId,
      type: type || 'SCRIPT_READY',
      customPhone,
      customDetails
    });

    return res.json({ success: true, data: notification });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Erro ao enviar notificação.' });
  }
});

// GET /api/notifications/history/:clientId - Histórico de Notificações
app.get('/api/notifications/history/:clientId', async (req: Request, res: Response) => {
  const { clientId } = req.params;
  const history = getClientNotificationHistory(clientId);
  return res.json({ success: true, data: history });
});

export default app;
