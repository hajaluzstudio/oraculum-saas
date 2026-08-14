import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { inspectCreativeAsset } from '../src/services/creativeInspector';
import { generateMetadataAndCopy } from '../src/services/metadataInjector';

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

// POST /api/creatives/inspect - AI Creative Scoring
app.post('/api/creatives/inspect', async (req: Request, res: Response) => {
  try {
    const organizationId = (req as any).organizationId;
    const { assetTitle, assetType, niche, clientName, sampleTextOrDescription } = req.body;

    if (!assetTitle || !clientName) {
      return res.status(400).json({ error: 'assetTitle e clientName são obrigatórios.' });
    }

    const evaluation = await inspectCreativeAsset({
      organizationId,
      assetTitle,
      assetType: assetType || 'image',
      niche: niche || 'Geral',
      clientName,
      sampleTextOrDescription,
    });

    return res.json({ success: true, data: evaluation });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Erro ao inspecionar criativo.' });
  }
});

// POST /api/creatives/inject-metadata - Injeção de Metadados EXIF/GEO
app.post('/api/creatives/inject-metadata', async (req: Request, res: Response) => {
  try {
    const { assetTitle, niche, clientName, customCity } = req.body;
    if (!assetTitle || !clientName) {
      return res.status(400).json({ error: 'assetTitle e clientName são obrigatórios.' });
    }

    const certificate = await generateMetadataAndCopy(assetTitle, niche || 'Geral', clientName, customCity);
    return res.json({ success: true, data: certificate });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Erro ao gerar certidão de metadados.' });
  }
});

export default app;
