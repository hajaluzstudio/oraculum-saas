import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { getClientBiMetrics, executeBiTrackerAndFeedbackLoop } from '../src/services/biTracker';
import { calculateOptimizedBudgetAllocation } from '../src/services/budgetOptimizer';

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

// GET /api/bi/metrics/:clientId - Puxa Métricas Consolidadas de BI
app.get('/api/bi/metrics/:clientId', async (req: Request, res: Response) => {
  try {
    const organizationId = (req as any).organizationId;
    const { clientId } = req.params;
    const period = (req.query.period as string) || '30d';

    const metrics = await getClientBiMetrics(organizationId, clientId, period);
    return res.json({ success: true, data: metrics });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Erro ao obter métricas de BI.' });
  }
});

// POST /api/bi/sync/:clientId - Disparo de Sincronização Manual
app.post('/api/bi/sync/:clientId', async (req: Request, res: Response) => {
  try {
    const organizationId = (req as any).organizationId;
    const { clientId } = req.params;

    const result = await executeBiTrackerAndFeedbackLoop(organizationId, `camp_${clientId}`);
    return res.json({ success: true, data: result });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Erro ao sincronizar métricas de BI.' });
  }
});

// POST /api/bi/optimize-budget - Otimizador Preditivo de Orçamento
app.post('/api/bi/optimize-budget', async (req: Request, res: Response) => {
  try {
    const { clientId, totalBudget } = req.body;
    if (!clientId) return res.status(400).json({ error: 'clientId é obrigatório.' });

    const optimization = await calculateOptimizedBudgetAllocation(clientId, totalBudget);
    return res.json({ success: true, data: optimization });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Erro ao otimizar orçamento.' });
  }
});

// POST /api/bi/roi-loop - Executa BI Tracker & Feedback Loop
app.post('/api/bi/roi-loop', async (req: Request, res: Response) => {
  try {
    const organizationId = (req as any).organizationId;
    const { campaignId } = req.body;
    if (!campaignId) return res.status(400).json({ error: 'campaignId é obrigatório.' });

    const result = await executeBiTrackerAndFeedbackLoop(organizationId, campaignId);
    return res.json({ success: true, data: result });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Erro no BI Tracker.' });
  }
});

export default app;
