import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';

import { registerClientAndGenerateDossier, getNicheKnowledgeBase } from '../src/services/nicheResearcher';
import { inspectCreativeAsset } from '../src/services/creativeInspector';
import { processDriveAssetWorkflow } from '../src/services/driveWorkflowAutomation';
import { executeBiTrackerAndFeedbackLoop, getClientBiMetrics } from '../src/services/biTracker';
import { sendStrategicChatMessage } from '../src/services/strategicChat';
import { loadClientsFromDisk, saveClientsToDisk, loadDossiersFromDisk, saveDossiersToDisk, loadAssetsFromDisk, saveAssetsToDisk } from '../src/services/diskStorage';
import { generateAutonomousScript } from '../src/services/scriptGenerator';
import { generateMetadataAndCopy } from '../src/services/metadataInjector';
import { calculateOptimizedBudgetAllocation } from '../src/services/budgetOptimizer';
import { getRolePermissions, defaultWhiteLabelConfig, UserRole } from '../src/services/authAndRoles';
import { sendWhatsAppNotification, getClientNotificationHistory } from '../src/services/notificationCenter';
import { analyzeCompetitorOffer } from '../src/services/competitorSpy';
import { generateAutonomousLandingPage } from '../src/services/landingPageGenerator';
import { supabase } from '../src/services/supabaseClient';

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

const DEFAULT_TENANT_ID = 'e4b8a1c9-7d3f-42e1-95a8-2083bf2f9104';

const tenantAuthMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const tenantHeader = req.headers['x-organization-id'] as string;
  (req as any).organizationId = tenantHeader || DEFAULT_TENANT_ID;
  next();
};

app.use(tenantAuthMiddleware);

// Helper para ler arquivos da pasta public/ ou raiz
const getStaticFilePath = (fileName: string) => {
  const publicPath = path.join(process.cwd(), 'public', fileName);
  if (fs.existsSync(publicPath)) return publicPath;
  return path.join(process.cwd(), fileName);
};

// ROTA RAIZ: Servir Frontend Dashboard index.html
app.get('/', (req: Request, res: Response) => {
  try {
    const indexPath = getStaticFilePath('index.html');
    if (fs.existsSync(indexPath)) {
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      return res.sendFile(indexPath);
    }
    return res.status(404).send('index.html não encontrado.');
  } catch (e: any) {
    return res.status(500).send('Erro ao carregar página: ' + e.message);
  }
});

app.get('/index.html', (req: Request, res: Response) => {
  try {
    const indexPath = getStaticFilePath('index.html');
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.sendFile(indexPath);
  } catch (e: any) {
    return res.status(500).send('Erro ao carregar página: ' + e.message);
  }
});

// SERVIR APP.JS
app.get('/app.js', (req: Request, res: Response) => {
  try {
    const appJsPath = getStaticFilePath('app.js');
    res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
    return res.sendFile(appJsPath);
  } catch (e: any) {
    return res.status(500).send('Erro ao carregar app.js');
  }
});

// SERVIR STYLES.CSS
app.get('/styles.css', (req: Request, res: Response) => {
  try {
    const stylesPath = getStaticFilePath('styles.css');
    res.setHeader('Content-Type', 'text/css; charset=utf-8');
    return res.sendFile(stylesPath);
  } catch (e: any) {
    return res.status(500).send('Erro ao carregar styles.css');
  }
});

// SERVIR MANIFEST.JSON
app.get('/manifest.json', (req: Request, res: Response) => {
  try {
    const manifestPath = getStaticFilePath('manifest.json');
    res.setHeader('Content-Type', 'application/json');
    return res.sendFile(manifestPath);
  } catch (e: any) {
    return res.status(500).send('Erro ao carregar manifest.json');
  }
});

// SERVIR SW.JS
app.get('/sw.js', (req: Request, res: Response) => {
  try {
    const swPath = getStaticFilePath('sw.js');
    res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
    return res.sendFile(swPath);
  } catch (e: any) {
    return res.status(500).send('Erro ao carregar sw.js');
  }
});

// HEALTH CHECK
app.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'online',
    system: 'Plataforma SaaS de Marketing Híbrido ROI-First (Vercel Serverless)',
    geminiSdkConfigured: !!process.env.GEMINI_API_KEY,
    supabaseConfigured: !!process.env.SUPABASE_URL,
    timestamp: new Date().toISOString(),
  });
});

// CLIENTS
app.get('/api/clients', async (req: Request, res: Response) => {
  try {
    const organizationId = (req as any).organizationId;
    let dbClients: any[] = [];
    try {
      const { data, error } = await supabase.from('clients').select('*').eq('organization_id', organizationId).order('created_at', { ascending: false });
      if (!error && data) dbClients = data;
    } catch (e) {}

    const localClients = loadClientsFromDisk();
    const combined = [...dbClients];
    localClients.forEach(lc => {
      if (!combined.some(c => c.id === lc.id)) combined.unshift(lc);
    });
    return res.json({ success: true, data: combined.length > 0 ? combined : localClients });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

app.post('/api/clients', async (req: Request, res: Response) => {
  try {
    const organizationId = (req as any).organizationId;
    const { name, niche, sanitized_history, website, previous_agency_notes } = req.body;
    if (!name || !niche) return res.status(400).json({ error: 'Nome e Nicho são obrigatórios.' });

    const clientRecord = {
      id: 'client_' + Date.now(),
      organization_id: organizationId,
      name,
      niche,
      status: 'active',
      website: website || null,
      previous_agency_notes: sanitized_history || previous_agency_notes || null,
      created_at: new Date().toISOString(),
    };

    const localClients = loadClientsFromDisk();
    localClients.unshift(clientRecord);
    saveClientsToDisk(localClients);

    return res.status(201).json({ success: true, message: 'Cliente salvo!', client: clientRecord });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

app.delete('/api/clients/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    let localClients = loadClientsFromDisk();
    localClients = localClients.filter(c => c.id !== id);
    saveClientsToDisk(localClients);
    return res.json({ success: true, message: 'Cliente excluído.' });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// ONBOARDING
app.post('/api/onboarding', async (req: Request, res: Response) => {
  try {
    const organizationId = (req as any).organizationId;
    const { clientName, niche, sanitized_history, website, previous_agency_notes } = req.body;
    if (!clientName || !niche) return res.status(400).json({ error: 'clientName e niche são obrigatórios.' });

    const result = await registerClientAndGenerateDossier({
      organizationId,
      clientName,
      niche,
      website,
      previousAgencyNotes: sanitized_history || previous_agency_notes,
    });

    const dossiers = loadDossiersFromDisk();
    dossiers[result.client.id] = result.dossier;
    saveDossiersToDisk(dossiers);

    return res.status(201).json({ success: true, data: result });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

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
    return res.status(500).json({ error: error.message });
  }
});

app.post('/api/niche-dossier', async (req: Request, res: Response) => {
  try {
    const { clientId, dossier } = req.body;
    const dossiers = loadDossiersFromDisk();
    dossiers[clientId] = dossier;
    saveDossiersToDisk(dossiers);
    return res.json({ success: true, message: 'Dossiê salvo!' });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// CHAT
app.post('/api/chat', async (req: Request, res: Response) => {
  try {
    const organizationId = (req as any).organizationId;
    const { clientId, message, history } = req.body;
    if (!clientId || !message) return res.status(400).json({ error: 'clientId e message são obrigatórios.' });

    const response = await sendStrategicChatMessage(organizationId, clientId, message, history || []);
    return res.json({ success: true, data: response });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// WORKFLOW & KANBAN
app.get('/api/workflow/:clientId', async (req: Request, res: Response) => {
  const { clientId } = req.params;
  const assets = loadAssetsFromDisk();
  const clientAssets = assets.filter(a => a.clientId === clientId || a.client_id === clientId);
  return res.json({ success: true, data: clientAssets.length > 0 ? clientAssets : assets.slice(0, 4) });
});

app.post('/api/workflow', async (req: Request, res: Response) => {
  const { card } = req.body;
  const assets = loadAssetsFromDisk();
  assets.unshift(card);
  saveAssetsToDisk(assets);
  return res.json({ success: true, data: card });
});

app.post('/api/creatives/workflow', async (req: Request, res: Response) => {
  try {
    const organizationId = (req as any).organizationId;
    const { clientId, clientName, niche, filePath, assetTitle, assetType } = req.body;
    const result = await processDriveAssetWorkflow({ organizationId, clientId, clientName, niche, filePath, assetTitle, assetType });
    return res.json({ success: true, data: result });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// BI & DASHBOARD
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

// CREATIVES SCORING & METADATA
app.post('/api/creatives/inspect', async (req: Request, res: Response) => {
  try {
    const organizationId = (req as any).organizationId;
    const { assetTitle, assetType, niche, clientName, sampleTextOrDescription } = req.body;
    const evaluation = await inspectCreativeAsset({ organizationId, assetTitle, assetType: assetType || 'image', niche: niche || 'Geral', clientName, sampleTextOrDescription });
    return res.json({ success: true, data: evaluation });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

app.post('/api/creatives/inject-metadata', async (req: Request, res: Response) => {
  try {
    const { assetTitle, niche, clientName, customCity } = req.body;
    const certificate = await generateMetadataAndCopy(assetTitle, niche || 'Geral', clientName, customCity);
    return res.json({ success: true, data: certificate });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// SCRIPTS & TELEPROMPTER
app.post('/api/scripts/generate', async (req: Request, res: Response) => {
  try {
    const { clientId, scriptType, customGoal } = req.body;
    const script = await generateAutonomousScript({ clientId, scriptType: scriptType || 'vsl_60s', customGoal });
    return res.json({ success: true, data: script });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// LANDING PAGES
app.post('/api/landing-pages/generate', async (req: Request, res: Response) => {
  try {
    const { clientId, clientName, niche, offerGoal, primaryColor } = req.body;
    const result = await generateAutonomousLandingPage({ clientId: clientId || 'client_demo', clientName, niche, offerGoal: offerGoal || 'Captação VIP', primaryColor: primaryColor || '#00F2FE' });
    return res.json({ success: true, data: result });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// NOTIFICATIONS & WHATSAPP
app.post('/api/notifications/send-whatsapp', async (req: Request, res: Response) => {
  try {
    const { clientId, type, customPhone, customDetails } = req.body;
    const notification = await sendWhatsAppNotification({ clientId, type: type || 'SCRIPT_READY', customPhone, customDetails });
    return res.json({ success: true, data: notification });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

app.get('/api/notifications/history/:clientId', async (req: Request, res: Response) => {
  const { clientId } = req.params;
  const history = getClientNotificationHistory(clientId);
  return res.json({ success: true, data: history });
});

// SPY RADAR
app.post('/api/spy/analyze', async (req: Request, res: Response) => {
  try {
    const { competitorName, niche, competitorAdUrlOrText } = req.body;
    const report = await analyzeCompetitorOffer({ competitorName, niche, competitorAdUrlOrText: competitorAdUrlOrText || 'Anúncio com oferta direta.' });
    return res.json({ success: true, data: report });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// PORTAL WHITE-LABEL
app.get('/api/portal/config', (req: Request, res: Response) => {
  return res.json({ success: true, data: defaultWhiteLabelConfig });
});

app.get('/api/portal/permissions/:role', (req: Request, res: Response) => {
  const { role } = req.params;
  const permissions = getRolePermissions(role as UserRole);
  return res.json({ success: true, role, permissions });
});

export default app;
