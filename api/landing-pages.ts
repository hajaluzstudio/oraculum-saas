import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { generateAutonomousLandingPage } from '../src/services/landingPageGenerator';

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

// POST /api/landing-pages/generate - Gerador de Landing Pages de Alta Conversão
app.post('/api/landing-pages/generate', async (req: Request, res: Response) => {
  try {
    const { clientId, clientName, niche, offerGoal, primaryColor } = req.body;
    if (!clientName || !niche) {
      return res.status(400).json({ error: 'clientName e niche são obrigatórios.' });
    }

    const result = await generateAutonomousLandingPage({
      clientId: clientId || 'client_demo',
      clientName,
      niche,
      offerGoal: offerGoal || 'Captação de Agendamentos VIP',
      primaryColor: primaryColor || '#00F2FE'
    });

    return res.json({ success: true, data: result });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Erro ao gerar Landing Page.' });
  }
});

export default app;
