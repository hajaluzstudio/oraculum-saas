import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { analyzeCompetitorOffer } from '../src/services/competitorSpy';

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

// POST /api/spy/analyze - Espionagem de Concorrentes
app.post('/api/spy/analyze', async (req: Request, res: Response) => {
  try {
    const { competitorName, niche, competitorAdUrlOrText } = req.body;
    if (!competitorName || !niche) {
      return res.status(400).json({ error: 'competitorName e niche são obrigatórios.' });
    }

    const report = await analyzeCompetitorOffer({
      competitorName,
      niche,
      competitorAdUrlOrText: competitorAdUrlOrText || 'Anúncio de alta escala com oferta direta e desconto agressivo.'
    });

    return res.json({ success: true, data: report });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Erro ao analisar concorrente.' });
  }
});

export default app;
