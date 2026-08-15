import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { generateAutonomousScript } from '../src/services/scriptGenerator';

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

app.post('/api/scripts/generate', async (req: Request, res: Response) => {
  try {
    const { clientId, scriptType, customGoal } = req.body;
    const script = await generateAutonomousScript({ clientId, scriptType: scriptType || 'vsl_60s', customGoal });
    return res.json({ success: true, data: script });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

export default app;
