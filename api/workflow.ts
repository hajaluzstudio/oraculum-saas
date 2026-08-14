import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { loadAssetsFromDisk, saveAssetsToDisk } from '../src/services/diskStorage';
import { processDriveAssetWorkflow } from '../src/services/driveWorkflowAutomation';

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

// GET /api/workflow/:clientId - Puxa cards do Kanban
app.get('/api/workflow/:clientId', async (req: Request, res: Response) => {
  try {
    const { clientId } = req.params;
    const assets = loadAssetsFromDisk();
    const clientAssets = assets.filter(a => a.clientId === clientId || a.client_id === clientId);
    return res.json({ success: true, data: clientAssets.length > 0 ? clientAssets : assets.slice(0, 4) });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Erro ao carregar workflow.' });
  }
});

// POST /api/workflow - Adiciona ou atualiza card do Kanban
app.post('/api/workflow', async (req: Request, res: Response) => {
  try {
    const { clientId, card } = req.body;
    const assets = loadAssetsFromDisk();
    assets.unshift(card);
    saveAssetsToDisk(assets);
    return res.json({ success: true, data: card });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Erro ao atualizar Kanban.' });
  }
});

// POST /api/creatives/workflow - Executa Esteira Autônoma do Google Drive
app.post('/api/creatives/workflow', async (req: Request, res: Response) => {
  try {
    const organizationId = (req as any).organizationId;
    const { clientId, clientName, niche, filePath, assetTitle, assetType, productionFolderPath, producedFolderPath } = req.body;

    const result = await processDriveAssetWorkflow({
      organizationId,
      clientId,
      clientName,
      niche,
      filePath,
      assetTitle,
      assetType,
      productionFolderPath,
      producedFolderPath,
    });

    return res.json({ success: true, data: result });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Erro na esteira do Google Drive.' });
  }
});

export default app;
