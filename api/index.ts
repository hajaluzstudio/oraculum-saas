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
import { generateAutonomousLandingPage } from '../src/services/landingPageGenerator';
import { supabase } from '../src/services/supabaseClient';
import { analyzeCompetitorOffer } from '../src/services/competitorSpy';
import {
  executeAutonomousScraperRun,
  startAutonomousScraperCron,
  stopAutonomousScraperCron,
  getAutonomousScraperStatus,
  mineNicheTopPlayersAndTrends
} from '../src/services/autonomousScraperAgent';
import { checkAgencyStatus, getMaintenanceModeState, setMaintenanceModeState } from '../src/middlewares/authAgency';

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

// Helper para ler arquivos da pasta public/ em qualquer ambiente Serverless Vercel
const getStaticFilePath = (fileName: string) => {
  const possiblePaths = [
    path.join(process.cwd(), 'public', fileName),
    path.join(__dirname, '../public', fileName),
    path.join(__dirname, 'public', fileName),
    path.join(process.cwd(), fileName),
    path.join(__dirname, fileName)
  ];
  for (const p of possiblePaths) {
    if (fs.existsSync(p)) return p;
  }
  return possiblePaths[0];
};

// Helper para enviar headers no-cache estritos
const setNoCacheHeaders = (res: Response) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
};

// ROTA RAIZ: Servir Frontend Dashboard index.html
app.get('/', (req: Request, res: Response) => {
  try {
    const indexPath = getStaticFilePath('index.html');
    if (fs.existsSync(indexPath)) {
      const html = fs.readFileSync(indexPath, 'utf-8');
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      setNoCacheHeaders(res);
      return res.status(200).send(html);
    }
    return res.status(404).send('index.html não encontrado.');
  } catch (e: any) {
    return res.status(500).send('Erro ao carregar página: ' + e.message);
  }
});

app.get('/index.html', (req: Request, res: Response) => {
  try {
    const indexPath = getStaticFilePath('index.html');
    if (fs.existsSync(indexPath)) {
      const html = fs.readFileSync(indexPath, 'utf-8');
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      setNoCacheHeaders(res);
      return res.status(200).send(html);
    }
    return res.status(404).send('index.html não encontrado.');
  } catch (e: any) {
    return res.status(500).send('Erro ao carregar página: ' + e.message);
  }
});

// SERVIR APP.JS
app.get('/app.js', (req: Request, res: Response) => {
  try {
    const appJsPath = getStaticFilePath('app.js');
    if (fs.existsSync(appJsPath)) {
      const code = fs.readFileSync(appJsPath, 'utf-8');
      res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
      setNoCacheHeaders(res);
      return res.status(200).send(code);
    }
    return res.status(404).send('app.js não encontrado.');
  } catch (e: any) {
    return res.status(500).send('Erro ao carregar app.js: ' + e.message);
  }
});

// SERVIR AGENCY-MANAGEMENT.JS
app.get('/agency-management.js', (req: Request, res: Response) => {
  try {
    const agencyJsPath = getStaticFilePath('agency-management.js');
    if (fs.existsSync(agencyJsPath)) {
      const code = fs.readFileSync(agencyJsPath, 'utf-8');
      res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
      setNoCacheHeaders(res);
      return res.status(200).send(code);
    }
    return res.status(404).send('agency-management.js não encontrado.');
  } catch (e: any) {
    return res.status(500).send('Erro ao carregar agency-management.js: ' + e.message);
  }
});

// SERVIR CLIENT-MANAGEMENT.JS
app.get('/client-management.js', (req: Request, res: Response) => {
  try {
    const clientJsPath = getStaticFilePath('client-management.js');
    if (fs.existsSync(clientJsPath)) {
      const code = fs.readFileSync(clientJsPath, 'utf-8');
      res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
      setNoCacheHeaders(res);
      return res.status(200).send(code);
    }
    return res.status(404).send('client-management.js não encontrado.');
  } catch (e: any) {
    return res.status(500).send('Erro ao carregar client-management.js: ' + e.message);
  }
});

// SERVIR BI-LIVE-ADVISOR.JS
app.get('/bi-live-advisor.js', (req: Request, res: Response) => {
  try {
    const biLiveJsPath = getStaticFilePath('bi-live-advisor.js');
    if (fs.existsSync(biLiveJsPath)) {
      const code = fs.readFileSync(biLiveJsPath, 'utf-8');
      res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
      setNoCacheHeaders(res);
      return res.status(200).send(code);
    }
    return res.status(404).send('bi-live-advisor.js não encontrado.');
  } catch (e: any) {
    return res.status(500).send('Erro ao carregar bi-live-advisor.js: ' + e.message);
  }
});

// SERVIR STYLES.CSS
app.get('/styles.css', (req: Request, res: Response) => {
  try {
    const stylesPath = getStaticFilePath('styles.css');
    if (fs.existsSync(stylesPath)) {
      const css = fs.readFileSync(stylesPath, 'utf-8');
      res.setHeader('Content-Type', 'text/css; charset=utf-8');
      setNoCacheHeaders(res);
      return res.status(200).send(css);
    }
    return res.status(404).send('styles.css não encontrado.');
  } catch (e: any) {
    return res.status(500).send('Erro ao carregar styles.css: ' + e.message);
  }
});

// SERVIR MANIFEST.JSON
app.get('/manifest.json', (req: Request, res: Response) => {
  try {
    const manifestPath = getStaticFilePath('manifest.json');
    if (fs.existsSync(manifestPath)) {
      const json = fs.readFileSync(manifestPath, 'utf-8');
      res.setHeader('Content-Type', 'application/json');
      return res.status(200).send(json);
    }
    return res.status(404).send('manifest.json não encontrado.');
  } catch (e: any) {
    return res.status(500).send('Erro ao carregar manifest.json');
  }
});

// SERVIR SW.JS
app.get('/sw.js', (req: Request, res: Response) => {
  try {
    const swPath = getStaticFilePath('sw.js');
    if (fs.existsSync(swPath)) {
      const code = fs.readFileSync(swPath, 'utf-8');
      res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
      return res.status(200).send(code);
    }
    return res.status(404).send('sw.js não encontrado.');
  } catch (e: any) {
    return res.status(500).send('Erro ao carregar sw.js');
  }
});

// HEALTH CHECK
// SERVIR ARQUIVOS SVG
app.get('/*.svg', (req: Request, res: Response) => {
  try {
    const filename = path.basename(req.path);
    const svgPath = getStaticFilePath(filename);
    if (fs.existsSync(svgPath)) {
      const code = fs.readFileSync(svgPath);
      res.setHeader('Content-Type', 'image/svg+xml');
      setNoCacheHeaders(res);
      return res.status(200).send(code);
    }
    return res.status(404).send('SVG não encontrado.');
  } catch (e: any) {
    return res.status(500).send('Erro ao carregar SVG: ' + e.message);
  }
});

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

    // Prioridade 1: busca do Supabase (nuvem - dados reais)
    if (process.env.SUPABASE_URL && !process.env.SUPABASE_URL.includes('placeholder')) {
      try {
        const { data, error } = await supabase.from('clients').select('*').eq('organization_id', organizationId).order('created_at', { ascending: false });
        if (!error && data) {
          return res.json({ success: true, data });
        }
      } catch (e) {}
    }

    // Fallback: disco local (sem clientes demo)
    const localClients = loadClientsFromDisk();
    return res.json({ success: true, data: localClients });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

app.post('/api/clients', async (req: Request, res: Response) => {
  try {
    const organizationId = (req as any).organizationId;
    const { name, niche, sanitized_history, website, previous_agency_notes } = req.body;
    if (!name || !niche) return res.status(400).json({ error: 'Nome e Nicho são obrigatórios.' });

    const clientRecord: any = {
      id: 'client_' + Date.now(),
      organization_id: organizationId,
      name,
      niche,
      status: 'active',
      website: website || null,
      previous_agency_notes: sanitized_history || previous_agency_notes || null,
      created_at: new Date().toISOString(),
    };

    // Salva no Supabase (persistência permanente na nuvem)
    if (process.env.SUPABASE_URL && !process.env.SUPABASE_URL.includes('placeholder')) {
      try {
        const { error: sbError } = await supabase.from('clients').insert([clientRecord]);
        if (sbError) console.warn('[Supabase] Aviso ao salvar cliente:', sbError.message);
        else console.log('[Supabase] ✅ Cliente salvo na nuvem:', clientRecord.id);
      } catch (e: any) { console.warn('[Supabase] Erro ao inserir cliente:', e.message); }
    }

    // Salva também em disco (fallback local)
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

    // Remove do Supabase
    if (process.env.SUPABASE_URL && !process.env.SUPABASE_URL.includes('placeholder')) {
      try {
        const { error: sbError } = await supabase.from('clients').delete().eq('id', id);
        if (sbError) console.warn('[Supabase] Aviso ao deletar cliente:', sbError.message);
        else console.log('[Supabase] ✅ Cliente removido da nuvem:', id);
      } catch (e: any) { console.warn('[Supabase] Erro ao deletar cliente:', e.message); }
    }

    // Remove também do disco local
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

    // Salva cliente no Supabase
    if (process.env.SUPABASE_URL && !process.env.SUPABASE_URL.includes('placeholder')) {
      try {
        await supabase.from('clients').upsert([{
          id: result.client.id,
          organization_id: organizationId,
          name: clientName,
          niche,
          website: website || null,
          previous_agency_notes: sanitized_history || previous_agency_notes || null,
          status: 'active',
        }], { onConflict: 'id' });

        // Salva dossiê no Supabase
        await supabase.from('niche_knowledge_base').upsert([{
          client_id: result.client.id,
          organization_id: organizationId,
          niche,
          dossier_data: result.dossier,
          updated_at: new Date().toISOString(),
        }], { onConflict: 'client_id' });
        console.log('[Supabase] ✅ Onboarding + Dossiê salvos na nuvem para:', clientName);
      } catch (e: any) { console.warn('[Supabase] Aviso ao salvar onboarding:', e.message); }
    }

    // Salva em disco (fallback)
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
    
    if (process.env.SUPABASE_URL && !process.env.SUPABASE_URL.includes('placeholder')) {
      const { data, error } = await supabase
        .from('niche_knowledge_base')
        .select('dossier_data')
        .eq('client_id', clientId)
        .eq('organization_id', organizationId)
        .single();
        
      if (!error && data) {
        return res.json({ success: true, data: data.dossier_data });
      }
    }

    // Fallback disk se não tiver no supabase
    const dossiers = loadDossiersFromDisk();
    const dossierData = dossiers[clientId] || null;
    return res.json({ success: true, data: dossierData });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

app.post('/api/niche-dossier', async (req: Request, res: Response) => {
  try {
    const organizationId = (req as any).organizationId;
    const { clientId, dossier, niche } = req.body;
    
    if (process.env.SUPABASE_URL && !process.env.SUPABASE_URL.includes('placeholder')) {
      // Upsert no banco
      const { error } = await supabase
        .from('niche_knowledge_base')
        .upsert({
          organization_id: organizationId,
          client_id: clientId,
          niche: niche || 'Geral',
          dossier_data: dossier,
          updated_at: new Date().toISOString()
        }, { onConflict: 'client_id' }); // Supondo que client_id é unique ou usamos isso pra garantir update
        
      if (error) console.warn('[Supabase] Erro ao salvar dossiê:', error);
    }

    // Mantém fallback no disco local temporário
    const dossiers = loadDossiersFromDisk();
    dossiers[clientId] = dossier;
    saveDossiersToDisk(dossiers);
    return res.json({ success: true, message: 'Dossiê salvo!' });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// NOVO ENDPOINT: Puxar Histórico de Chat
app.get('/api/chat-history/:clientId', async (req: Request, res: Response) => {
  try {
    const { clientId } = req.params;
    
    if (process.env.SUPABASE_URL && !process.env.SUPABASE_URL.includes('placeholder')) {
      const { data, error } = await supabase
        .from('chat_history')
        .select('role, content, created_at')
        .eq('client_id', clientId)
        .order('created_at', { ascending: true });
        
      if (!error && data) {
        return res.json({ success: true, data });
      }
    }
    return res.json({ success: true, data: [] });
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

    // Salva histórico do chat no Supabase
    if (process.env.SUPABASE_URL && !process.env.SUPABASE_URL.includes('placeholder')) {
      try {
        await supabase.from('chat_history').insert([
          { client_id: clientId, role: 'user', content: message },
          { client_id: clientId, role: 'assistant', content: typeof response === 'string' ? response : JSON.stringify(response) }
        ]);
        console.log('[Supabase] ✅ Histórico de chat salvo para client:', clientId);
      } catch (e: any) { console.warn('[Supabase] Aviso ao salvar chat:', e.message); }
    }

    return res.json({ success: true, data: response });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// WORKFLOW & KANBAN
app.get(['/api/workflow/:clientId', '/api/kanban/:clientId', '/api/kanban'], async (req: Request, res: Response) => {
  const { clientId } = req.params;
  const assets = loadAssetsFromDisk();
  const clientAssets = clientId ? assets.filter(a => a.clientId === clientId || a.client_id === clientId) : assets;
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

// AGENTES AUTÔNOMOS DE PESQUISA (SCRAPER & BENCHMARK DE LÍDERES)
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

// GESTÃO MASTER DE AGÊNCIAS & BLOQUEIO FINANCEIRO (SUPER ADMIN)
app.get(['/api/admin/agencies', '/api/portal/agencies'], async (req: Request, res: Response) => {
  try {
    const { data, error } = await supabase.from('agencies').select('*').order('created_at', { ascending: false });
    if (error) throw error;
    return res.json({ success: true, data });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// CRIAR AGÊNCIA COMPLETA
app.post(['/api/admin/agencies', '/api/portal/agencies'], async (req: Request, res: Response) => {
  try {
    const {
      name,
      slug,
      email_billing,
      cnpj,
      responsible_name,
      phone,
      zip_code,
      address_street,
      address_number,
      address_neighborhood,
      address_city,
      address_state,
      monthly_fee,
      due_day,
      client_limit,
      status,
      plan_tier
    } = req.body;

    const agencySlug = slug || (name ? name.toLowerCase().replace(/[^a-z0-9]/g, '-') + '-' + Date.now().toString(36) : 'agencia-' + Date.now());

    const payload = {
      name: name || 'Nova Agência Enterprise',
      slug: agencySlug,
      email_billing: email_billing || 'financeiro@agencia.com',
      cnpj: cnpj || null,
      responsible_name: responsible_name || null,
      phone: phone || null,
      zip_code: zip_code || null,
      address_street: address_street || null,
      address_number: address_number || null,
      address_neighborhood: address_neighborhood || null,
      address_city: address_city || null,
      address_state: address_state || null,
      monthly_fee: monthly_fee ? parseFloat(monthly_fee) : 0,
      due_day: due_day ? parseInt(due_day) : 10,
      client_limit: client_limit ? parseInt(client_limit) : 10,
      status: status || 'active',
      plan_tier: plan_tier || 'enterprise',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const { data, error } = await supabase.from('agencies').insert([payload]).select().single();
    if (error) throw error;
    return res.json({ success: true, data });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// ATUALIZAR AGÊNCIA COMPLETA (PUT/PATCH)
const updateAgencyHandler = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const body = req.body;

    const updatePayload: Record<string, any> = {
      updated_at: new Date().toISOString()
    };

    const allowedFields = [
      'name', 'slug', 'email_billing', 'cnpj', 'responsible_name', 'phone',
      'zip_code', 'address_street', 'address_number', 'address_neighborhood',
      'address_city', 'address_state', 'monthly_fee', 'due_day', 'client_limit',
      'status', 'plan_tier'
    ];

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        if (field === 'monthly_fee') updatePayload[field] = parseFloat(body[field]);
        else if (field === 'due_day' || field === 'client_limit') updatePayload[field] = parseInt(body[field]);
        else updatePayload[field] = body[field];
      }
    }

    const { data, error } = await supabase
      .from('agencies')
      .update(updatePayload)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return res.json({ success: true, data });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
};

app.put('/api/portal/agencies/:id', updateAgencyHandler);
app.put('/api/admin/agencies/:id', updateAgencyHandler);
app.patch('/api/portal/agencies/:id', updateAgencyHandler);
app.patch('/api/admin/agencies/:id', updateAgencyHandler);

// EXCLUIR AGÊNCIA (DELETE)
const deleteAgencyHandler = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Delete associated clients first if necessary
    try {
      await supabase.from('clients').delete().eq('agency_id', id);
    } catch (e) {}

    const { error } = await supabase.from('agencies').delete().eq('id', id);
    if (error) throw error;

    return res.json({ success: true, message: 'Agência excluída permanentemente com sucesso.' });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
};

app.delete('/api/portal/agencies/:id', deleteAgencyHandler);
app.delete('/api/admin/agencies/:id', deleteAgencyHandler);

app.post('/api/admin/agencies/toggle-status', async (req: Request, res: Response) => {
  try {
    const { agencyId, newStatus } = req.body;
    const { data, error } = await supabase
      .from('agencies')
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq('id', agencyId)
      .select()
      .single();

    if (error) throw error;
    return res.json({ success: true, data });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

app.get('/api/admin/maintenance', (req: Request, res: Response) => {
  return res.json({ success: true, active: getMaintenanceModeState() });
});

app.post('/api/admin/maintenance', (req: Request, res: Response) => {
  const { active } = req.body;
  setMaintenanceModeState(Boolean(active));
  return res.json({ success: true, active: getMaintenanceModeState(), message: `Modo manutenção alterado para ${active ? 'ATIVADO' : 'DESATIVADO'}` });
});

export default app;
