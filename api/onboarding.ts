import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { registerClientAndGenerateDossier, getNicheKnowledgeBase } from '../src/services/nicheResearcher';
import { loadDossiersFromDisk, saveDossiersToDisk } from '../src/services/diskStorage';

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

// POST /api/onboarding - Geração autônoma do Dossiê Estratégico via Gemini API
app.post('/api/onboarding', async (req: Request, res: Response) => {
  try {
    const organizationId = (req as any).organizationId;
    const { clientName, niche, sanitized_history, website, previous_agency_notes } = req.body;

    if (!clientName || !niche) {
      return res.status(400).json({ error: 'Nome do cliente e Nicho são obrigatórios.' });
    }

    const result = await registerClientAndGenerateDossier({
      organizationId,
      clientName: clientName,
      niche,
      website,
      previousAgencyNotes: sanitized_history || previous_agency_notes,
    });

    const dossiers = loadDossiersFromDisk();
    dossiers[result.client.id] = result.dossier;
    saveDossiersToDisk(dossiers);

    return res.status(201).json({ success: true, data: result });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Erro no processo de Onboarding.' });
  }
});

// GET /api/niche-dossier/:clientId - Busca o dossiê estratégico do cliente
app.get('/api/niche-dossier/:clientId', async (req: Request, res: Response) => {
  try {
    const organizationId = (req as any).organizationId;
    const { clientId } = req.params;

    const dossiers = loadDossiersFromDisk();
    let dossierData = dossiers[clientId];

    if (!dossierData) {
      const kbData = await getNicheKnowledgeBase(organizationId, clientId);
      dossierData = kbData?.dossier_data || null;
    }

    return res.json({ success: true, data: dossierData });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Erro ao buscar dossiê.' });
  }
});

// POST /api/niche-dossier - Salva ou atualiza dossiê
app.post('/api/niche-dossier', async (req: Request, res: Response) => {
  try {
    const { clientId, dossier, niche } = req.body;
    if (!clientId || !dossier) {
      return res.status(400).json({ error: 'clientId e dossier são obrigatórios.' });
    }

    const dossiers = loadDossiersFromDisk();
    dossiers[clientId] = dossier;
    saveDossiersToDisk(dossiers);

    return res.json({ success: true, message: 'Dossiê salvo no disco físico!' });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Erro ao salvar dossiê.' });
  }
});

export default app;
