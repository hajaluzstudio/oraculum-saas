import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { executeBiTrackerAndFeedbackLoop, getClientBiMetrics } from '../src/services/biTracker';
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

app.get('/api/bi/metrics/:clientId', async (req: Request, res: Response) => {
  try {
    const organizationId = (req as any).organizationId;
    const { clientId } = req.params;
    const period = (req.query.period as string) || '30d';
    const metrics = await getClientBiMetrics(organizationId, clientId, period);
    return res.json({ success: true, data: metrics });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

app.post('/api/bi/sync/:clientId', async (req: Request, res: Response) => {
  try {
    const organizationId = (req as any).organizationId;
    const { clientId } = req.params;
    const result = await executeBiTrackerAndFeedbackLoop(organizationId, `camp_${clientId}`);
    return res.json({ success: true, data: result });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

app.post('/api/bi/optimize-budget', async (req: Request, res: Response) => {
  try {
    const { clientId, totalBudget } = req.body;
    const optimization = await calculateOptimizedBudgetAllocation(clientId, totalBudget);
    return res.json({ success: true, data: optimization });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

app.post('/api/bi/roi-loop', async (req: Request, res: Response) => {
  try {
    const organizationId = (req as any).organizationId;
    const { campaignId } = req.body;
    const result = await executeBiTrackerAndFeedbackLoop(organizationId, campaignId);
    return res.json({ success: true, data: result });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

export default app;
