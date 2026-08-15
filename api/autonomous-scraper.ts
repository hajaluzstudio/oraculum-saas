import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import {
  executeAutonomousScraperRun,
  startAutonomousScraperCron,
  stopAutonomousScraperCron,
  getAutonomousScraperStatus
} from '../src/services/autonomousScraperAgent';

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

app.post('/api/autonomous-scraper/run', async (req: Request, res: Response) => {
  try {
    const { niche, clientId } = req.body;
    const organizationId = (req as any).organizationId || DEFAULT_TENANT_ID;

    if (!niche) {
      return res.status(400).json({ error: 'Parâmetro "niche" é obrigatório.' });
    }

    const result = await executeAutonomousScraperRun(organizationId, niche, clientId);
    return res.json({ success: true, data: result });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

app.post('/api/autonomous-scraper/cron/start', (req: Request, res: Response) => {
  try {
    const { intervalMinutes } = req.body;
    const organizationId = (req as any).organizationId || DEFAULT_TENANT_ID;
    startAutonomousScraperCron(intervalMinutes || 1440, organizationId);
    return res.json({ success: true, message: 'Cron job dos Robôs Autônomos iniciado com sucesso.' });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

app.post('/api/autonomous-scraper/cron/stop', (req: Request, res: Response) => {
  try {
    stopAutonomousScraperCron();
    return res.json({ success: true, message: 'Cron job dos Robôs Autônomos interrompido.' });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

app.get('/api/autonomous-scraper/status', (req: Request, res: Response) => {
  const status = getAutonomousScraperStatus();
  return res.json({ success: true, data: status });
});

export default app;
