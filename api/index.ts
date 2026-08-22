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

// ✅ SERVIR ARQUIVOS ESTÁTICOS - Express native (mais confiável que rotas manuais)
// O express.static DEVE vir ANTES do tenantAuthMiddleware para não interceptar imagens
const staticOpts = { maxAge: 0, etag: false };
app.use(express.static(path.join(process.cwd(), 'public'), staticOpts));
app.use(express.static(path.join(__dirname, '../public'), staticOpts));
app.use(express.static(path.join(__dirname, 'public'), staticOpts));

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

// SERVIR IMAGENS (fundo.jpg, logo.png, terminal.png e qualquer .png/.jpg/.jpeg/.gif/.webp/.ico)
// Rotas explícitas nomeadas primeiro para garantir match
app.get('/logo.png', (req: Request, res: Response) => {
  try {
    const imgPath = getStaticFilePath('logo.png');
    if (fs.existsSync(imgPath)) {
      const data = fs.readFileSync(imgPath);
      res.setHeader('Content-Type', 'image/png');
      setNoCacheHeaders(res);
      return res.status(200).send(data);
    }
    return res.status(404).send('logo.png não encontrado.');
  } catch (e: any) {
    return res.status(500).send('Erro ao carregar logo.png: ' + e.message);
  }
});

app.get('/terminal.png', (req: Request, res: Response) => {
  try {
    const imgPath = getStaticFilePath('terminal.png');
    if (fs.existsSync(imgPath)) {
      const data = fs.readFileSync(imgPath);
      res.setHeader('Content-Type', 'image/png');
      setNoCacheHeaders(res);
      return res.status(200).send(data);
    }
    return res.status(404).send('terminal.png não encontrado.');
  } catch (e: any) {
    return res.status(500).send('Erro ao carregar terminal.png: ' + e.message);
  }
});

app.get('/fundo.jpg', (req: Request, res: Response) => {
  try {
    const imgPath = getStaticFilePath('fundo.jpg');
    if (fs.existsSync(imgPath)) {
      const data = fs.readFileSync(imgPath);
      res.setHeader('Content-Type', 'image/jpeg');
      setNoCacheHeaders(res);
      return res.status(200).send(data);
    }
    return res.status(404).send('fundo.jpg não encontrado.');
  } catch (e: any) {
    return res.status(500).send('Erro ao carregar fundo.jpg: ' + e.message);
  }
});

// Rotas genéricas por extensão (fallback)
app.get('/*.jpg', (req: Request, res: Response) => {
  try {
    const filename = path.basename(req.path);
    const imgPath = getStaticFilePath(filename);
    if (fs.existsSync(imgPath)) {
      const data = fs.readFileSync(imgPath);
      res.setHeader('Content-Type', 'image/jpeg');
      setNoCacheHeaders(res);
      return res.status(200).send(data);
    }
    return res.status(404).send(`Imagem não encontrada: ${filename}`);
  } catch (e: any) {
    return res.status(500).send('Erro ao carregar imagem: ' + e.message);
  }
});

app.get('/*.jpeg', (req: Request, res: Response) => {
  try {
    const filename = path.basename(req.path);
    const imgPath = getStaticFilePath(filename);
    if (fs.existsSync(imgPath)) {
      const data = fs.readFileSync(imgPath);
      res.setHeader('Content-Type', 'image/jpeg');
      setNoCacheHeaders(res);
      return res.status(200).send(data);
    }
    return res.status(404).send(`Imagem não encontrada: ${filename}`);
  } catch (e: any) {
    return res.status(500).send('Erro ao carregar imagem: ' + e.message);
  }
});

app.get('/*.png', (req: Request, res: Response) => {
  try {
    const filename = path.basename(req.path);
    const imgPath = getStaticFilePath(filename);
    if (fs.existsSync(imgPath)) {
      const data = fs.readFileSync(imgPath);
      res.setHeader('Content-Type', 'image/png');
      setNoCacheHeaders(res);
      return res.status(200).send(data);
    }
    return res.status(404).send(`Imagem não encontrada: ${filename}`);
  } catch (e: any) {
    return res.status(500).send('Erro ao carregar imagem: ' + e.message);
  }
});

app.get('/*.webp', (req: Request, res: Response) => {
  try {
    const filename = path.basename(req.path);
    const imgPath = getStaticFilePath(filename);
    if (fs.existsSync(imgPath)) {
      const data = fs.readFileSync(imgPath);
      res.setHeader('Content-Type', 'image/webp');
      setNoCacheHeaders(res);
      return res.status(200).send(data);
    }
    return res.status(404).send(`Imagem não encontrada: ${filename}`);
  } catch (e: any) {
    return res.status(500).send('Erro ao carregar imagem: ' + e.message);
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

// DIAGNÓSTICO: verifica onde as imagens estão no ambiente Vercel
app.get('/debug-images', (req: Request, res: Response) => {
  const images = ['logo.png', 'terminal.png', 'fundo.jpg'];
  const result: any = { cwd: process.cwd(), dirname: __dirname, files: {} };
  for (const img of images) {
    const paths = [
      path.join(process.cwd(), 'public', img),
      path.join(__dirname, '../public', img),
      path.join(__dirname, 'public', img),
      path.join(process.cwd(), img),
      path.join(__dirname, img),
    ];
    result.files[img] = paths.map(p => ({ path: p, exists: fs.existsSync(p) }));
  }
  return res.json(result);
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

// SCHEMA REAL clients: id, agency_id, organization_id, name, niche, website, previous_agency_notes, status, created_at, user_id, monthly_budget
app.post('/api/clients', async (req: Request, res: Response) => {
  try {
    const organizationId = (req as any).organizationId || 'e4b8a1c9-7d3f-42e1-95a8-2083bf2f9104';
    const { name, niche, sanitized_history, website, previous_agency_notes } = req.body;
    if (!name || !niche) return res.status(400).json({ error: 'Nome e Nicho são obrigatórios.' });

    // Payload alinhado 100% com o schema real do Supabase
    const clientPayload: Record<string, any> = {
      organization_id: organizationId,
      name,
      niche,
      status: 'active',
      website: website || null,
      previous_agency_notes: sanitized_history || previous_agency_notes || null,
    };

    console.log('[API] Criando cliente com payload:', JSON.stringify(clientPayload));

    // Salva no Supabase (persistência permanente na nuvem)
    const { data: insertedData, error: sbError } = await supabase.from('clients').insert([clientPayload]).select().single();
    if (sbError) {
      console.error('[Supabase] Erro ao salvar cliente:', sbError.message, sbError.details);
      return res.status(500).json({ error: `Erro no Supabase: ${sbError.message}`, details: sbError.details });
    }
    console.log('[Supabase] ✅ Cliente salvo com sucesso na nuvem:', insertedData?.id);

    // Salva também em disco (fallback local)
    const localClients = loadClientsFromDisk();
    localClients.unshift(insertedData);
    saveClientsToDisk(localClients);

    return res.status(201).json({ success: true, message: 'Cliente salvo!', client: insertedData });
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

// ONBOARDING — Gera o Dossiê Estratégico para um cliente já cadastrado
app.post('/api/onboarding', async (req: Request, res: Response) => {
  try {
    console.log('[API /api/onboarding] Requisição de onboarding recebida');
    const organizationId = (req as any).organizationId;
    const { clientId, clientName, niche, sanitized_history, website, previous_agency_notes, previousAgencyNotes } = req.body || {};

    console.log('[API /api/onboarding] Body recebido:', { organizationId, clientId, clientName, niche, website });

    // Validação defensiva da chave do Gemini
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.error('❌ [API /api/onboarding] GEMINI_API_KEY não está configurada no servidor!');
      return res.status(500).json({
        success: false,
        error: 'Chave de API do Gemini não configurada no servidor (GEMINI_API_KEY ausente).',
        detail: 'Configure a variável GEMINI_API_KEY no painel da Vercel ou arquivo .env.'
      });
    }

    if (!clientName || !niche) {
      console.warn('⚠️ [API /api/onboarding] clientName e niche são obrigatórios');
      return res.status(400).json({ success: false, error: 'clientName e niche são obrigatórios.' });
    }

    console.log('[API /api/onboarding] Executando registerClientAndGenerateDossier...');
    const result = await registerClientAndGenerateDossier({
      organizationId,
      clientName,
      niche,
      website,
      previousAgencyNotes: sanitized_history || previous_agency_notes || previousAgencyNotes,
    });

    // Usa o clientId que veio do frontend (já salvo no Supabase) ou o gerado pelo service
    const effectiveClientId = clientId || result.client.id;
    console.log('[API /api/onboarding] Dossiê gerado com sucesso. Salvando dossiê para clientId:', effectiveClientId);

    // Salva dossiê na niche_knowledge_base usando o INSERT/UPDATE correto
    try {
      const { data: existing } = await supabase
        .from('niche_knowledge_base')
        .select('id')
        .eq('client_id', effectiveClientId)
        .maybeSingle();

      if (existing?.id) {
        await supabase.from('niche_knowledge_base')
          .update({ niche, dossier_data: result.dossier, updated_at: new Date().toISOString() })
          .eq('id', existing.id);
      } else {
        await supabase.from('niche_knowledge_base').insert([{
          client_id: effectiveClientId,
          organization_id: organizationId || null,
          niche,
          dossier_data: result.dossier,
          updated_at: new Date().toISOString(),
        }]);
      }
      console.log('[Supabase] ✅ Dossiê salvo na nuvem para clientId:', effectiveClientId);
    } catch (e: any) {
      console.warn('[Supabase] Aviso ao salvar dossiê no onboarding:', e.message);
    }

    // Salva em disco (fallback)
    const dossiers = loadDossiersFromDisk();
    dossiers[effectiveClientId] = result.dossier;
    saveDossiersToDisk(dossiers);

    // Retorna com o clientId correto
    return res.status(201).json({ success: true, data: { ...result, client: { ...result.client, id: effectiveClientId } } });
  } catch (error: any) {
    console.error('❌ [API /api/onboarding] Erro ao processar onboarding:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Erro interno no Onboarding.',
      detail: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// GET dossiê do cliente — schema real: id, agency_id, client_id, organization_id, niche, dossier_data
app.get('/api/niche-dossier/:clientId', async (req: Request, res: Response) => {
  try {
    const { clientId } = req.params;
    
    // Busca apenas por client_id (não filtra por organization_id pois pode ser null)
    const { data, error } = await supabase
      .from('niche_knowledge_base')
      .select('dossier_data, niche, updated_at')
      .eq('client_id', clientId)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();
      
    if (!error && data) {
      console.log('[API] Dossiê carregado do Supabase para cliente:', clientId);
      return res.json({ success: true, data: data.dossier_data });
    }

    // Fallback disco local
    const dossiers = loadDossiersFromDisk();
    const dossierData = dossiers[clientId] || null;
    return res.json({ success: true, data: dossierData });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// POST salvar dossiê — upsert por client_id
app.post('/api/niche-dossier', async (req: Request, res: Response) => {
  try {
    const organizationId = (req as any).organizationId;
    const { clientId, dossier, niche } = req.body;
    if (!clientId) return res.status(400).json({ error: 'clientId é obrigatório.' });
    
    // Verifica se já existe para decidir entre insert e update
    const { data: existing } = await supabase
      .from('niche_knowledge_base')
      .select('id')
      .eq('client_id', clientId)
      .maybeSingle();

    let result;
    if (existing?.id) {
      // UPDATE
      result = await supabase
        .from('niche_knowledge_base')
        .update({
          niche: niche || 'Geral',
          dossier_data: dossier,
          updated_at: new Date().toISOString()
        })
        .eq('id', existing.id)
        .select();
    } else {
      // INSERT
      result = await supabase
        .from('niche_knowledge_base')
        .insert([{
          organization_id: organizationId || null,
          client_id: clientId,
          niche: niche || 'Geral',
          dossier_data: dossier,
          updated_at: new Date().toISOString()
        }])
        .select();
    }

    if (result.error) {
      console.error('[Supabase] Erro ao salvar dossiê:', result.error.message);
    } else {
      console.log('[Supabase] ✅ Dossiê salvo para client_id:', clientId);
    }

    // Fallback disco
    const dossiers = loadDossiersFromDisk();
    dossiers[clientId] = dossier;
    saveDossiersToDisk(dossiers);
    return res.json({ success: true, message: 'Dossiê salvo!' });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// GET histórico de chat por cliente — suporte a bi_chat_history e chat_history
app.get('/api/chat-history/:clientId', async (req: Request, res: Response) => {
  try {
    const { clientId } = req.params;
    
    const { data: biData, error: biErr } = await supabase
      .from('bi_chat_history')
      .select('*')
      .eq('client_id', clientId)
      .order('created_at', { ascending: true });

    if (biErr) {
      console.error('❌ [Supabase GET chat-history bi_chat_history error]:', biErr);
    }

    if (!biErr && biData && biData.length > 0) {
      const formatted = biData.map(item => ({
        role: item.role || (item.json_response ? 'assistant' : 'user'),
        content: item.content || (typeof item.json_response === 'string' ? item.json_response : (item.json_response?.replyText || item.prompt_input || '')),
        json_response: item.json_response,
        created_at: item.created_at
      }));
      return res.json({ success: true, data: formatted });
    }
      
    const { data, error } = await supabase
      .from('chat_history')
      .select('role, content, created_at')
      .eq('client_id', clientId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('❌ [Supabase GET chat-history error]:', error);
    }
      
    if (!error && data) {
      return res.json({ success: true, data });
    }
    return res.json({ success: true, data: [] });
  } catch (error: any) {
    console.error('❌ [API /api/chat-history exception]:', error);
    return res.status(500).json({ error: error.message });
  }
});

// POST /api/chat - Chat Estratégico & Live Advisor com persistência no bi_chat_history
app.post('/api/chat', async (req: Request, res: Response) => {
  try {
    const organizationId = (req as any).organizationId;
    const { clientId, message, history } = req.body || {};
    
    if (!clientId || !message) {
      return res.status(400).json({ status: 'error', error: 'clientId e message são obrigatórios.' });
    }

    const apiKey = process.env.GEMINI_API_KEY?.trim();
    if (!apiKey) {
      return res.status(500).json({ status: 'error', error: 'GEMINI_API_KEY não configurada no servidor.' });
    }

    // 1. Gravação síncrona da mensagem do usuário no bi_chat_history
    const { error: userErr } = await supabase.from('bi_chat_history').insert({
      client_id: clientId,
      role: 'user',
      content: message,
      created_at: new Date().toISOString()
    });
    if (userErr) {
      console.error('❌ [Supabase Insert User Error]:', userErr);
    }

    // 2. Chamada da IA Gemini
    const response = await sendStrategicChatMessage(organizationId, clientId, message, history || []);

    const replyText = typeof response === 'string' ? response :
      (response as any)?.replyText || (response as any)?.response || JSON.stringify(response);

    // 3. Gravação síncrona da resposta da IA no bi_chat_history
    const { error: aiErr } = await supabase.from('bi_chat_history').insert({
      client_id: clientId,
      role: 'assistant',
      content: replyText,
      json_response: typeof response === 'object' ? response : null,
      created_at: new Date().toISOString()
    });
    if (aiErr) {
      console.error('❌ [Supabase Insert AI Error]:', aiErr);
    }

    return res.json({ success: true, data: response });
  } catch (error: any) {
    console.error('❌ [API /api/chat Error]:', error);
    return res.status(500).json({ status: 'error', error: error.message || 'Erro interno no Chat.' });
  }
});

// GET /api/test-db - Diagnóstico de Conexão e Leitura/Escrita no Supabase
app.get('/api/test-db', async (req: Request, res: Response) => {
  try {
    const testClientId = 'test_diag_' + Date.now();
    const testContent = 'Ping de teste Supabase - ' + new Date().toISOString();

    const { data: insertData, error: insertErr } = await supabase
      .from('bi_chat_history')
      .insert([{
        client_id: testClientId,
        role: 'user',
        content: testContent,
        created_at: new Date().toISOString()
      }])
      .select();

    if (insertErr) {
      console.error('❌ Erro no insert bi_chat_history:', insertErr);
      return res.status(500).json({ status: 'error', step: 'bi_chat_history_insert', error: insertErr });
    }

    const { data: readData, error: readErr } = await supabase
      .from('bi_chat_history')
      .select('*')
      .eq('client_id', testClientId);

    if (readErr) {
      return res.status(500).json({ status: 'error', step: 'bi_chat_history_read', error: readErr });
    }

    return res.status(200).json({
      status: 'ok',
      message: 'Conexão e gravação no Supabase validadas com sucesso!',
      inserted: insertData,
      readResult: readData
    });
  } catch (err: any) {
    return res.status(500).json({ status: 'error', message: err.message || String(err) });
  }
});

// GET /api/test-gemini - Diagnóstico de Modelo Gemini com Candidate Fallbacks (Prioridade gemini-3.6-flash)
app.get('/api/test-gemini', async (req: Request, res: Response) => {
  const apiKey = (process.env.GEMINI_API_KEY || '').trim();

  if (!apiKey) {
    return res.status(500).json({
      status: 'error',
      message: 'GEMINI_API_KEY ausente ou não configurada no servidor.'
    });
  }

  try {
    let availableModels: string[] = [];
    try {
      const listRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
      const listData = await listRes.json();
      if (listData.models) {
        availableModels = listData.models
          .filter((m: any) => m.supportedGenerationMethods?.includes('generateContent'))
          .map((m: any) => m.name.replace('models/', ''));
      }
    } catch (e) {
      console.warn('Aviso ao consultar modelos:', e);
    }

    const candidates = ['gemini-3.6-flash', 'gemini-3.7-flash', 'gemini-3.5-flash', 'gemini-flash-latest', 'gemini-pro-latest'];
    const modelToUse = availableModels.find(m => candidates.includes(m)) || availableModels[0] || 'gemini-3.6-flash';

    const testRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${modelToUse}:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: 'Responda com apenas uma palavra: OK' }] }]
      })
    });

    const testData = await testRes.json();

    if (testRes.ok) {
      return res.status(200).json({
        status: 'ok',
        message: 'Conexão com Gemini validada com sucesso!',
        modelUsed: modelToUse,
        availableModelsInAccount: availableModels,
        reply: testData.candidates?.[0]?.content?.parts?.[0]?.text || 'OK'
      });
    } else {
      return res.status(testRes.status || 500).json({
        status: 'error',
        message: `Erro ao gerar conteúdo com o modelo ${modelToUse}`,
        detail: testData,
        availableModelsInAccount: availableModels
      });
    }
  } catch (err: any) {
    return res.status(500).json({ status: 'error', message: err.message });
  }
});

// WORKFLOW & KANBAN
app.get(['/api/workflow/:clientId', '/api/kanban/:clientId', '/api/kanban'], async (req: Request, res: Response) => {
  try {
    const organizationId = (req as any).organizationId;
    const { clientId } = req.params;
    
    if (process.env.SUPABASE_URL && !process.env.SUPABASE_URL.includes('placeholder')) {
      let query = supabase.from('kanban_cards').select('*').order('created_at', { ascending: false });
      if (organizationId) query = query.eq('organization_id', organizationId);
      if (clientId) query = query.eq('client_id', clientId);
      
      const { data, error } = await query;
      if (!error && data) {
        // Mapeia para o formato que o frontend espera (se necessário)
        const mappedData = data.map(d => ({
          id: d.id,
          clientId: d.client_id,
          title: d.title,
          description: d.description,
          status: d.status,
          assetType: d.asset_type,
          filePath: d.file_path,
          timestamp: d.created_at
        }));
        return res.json({ success: true, data: mappedData });
      }
    }

    const assets = loadAssetsFromDisk();
    const clientAssets = clientId ? assets.filter(a => a.clientId === clientId || a.client_id === clientId) : assets;
    return res.json({ success: true, data: clientAssets.length > 0 ? clientAssets : assets.slice(0, 4) });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

app.post('/api/workflow', async (req: Request, res: Response) => {
  try {
    const organizationId = (req as any).organizationId;
    const { card } = req.body;
    
    if (process.env.SUPABASE_URL && !process.env.SUPABASE_URL.includes('placeholder')) {
      const payload = {
        organization_id: organizationId,
        client_id: card.clientId || card.client_id,
        title: card.title || 'Sem título',
        description: card.description || '',
        status: card.status || 'backlog',
        asset_type: card.assetType || card.asset_type || '',
        file_path: card.filePath || card.file_path || ''
      };
      
      if (card.id && String(card.id).includes('-')) {
        // Update
        await supabase.from('kanban_cards').update(payload).eq('id', card.id);
      } else {
        // Insert
        await supabase.from('kanban_cards').insert([payload]);
      }
    }

    const assets = loadAssetsFromDisk();
    assets.unshift(card);
    saveAssetsToDisk(assets);
    return res.json({ success: true, data: card });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
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
// SCHEMA REAL agencies: id, name, slug, cnpj_cpf, email_billing, phone, status, plan_tier, monthly_fee, due_day, created_at, updated_at
app.post(['/api/admin/agencies', '/api/portal/agencies'], async (req: Request, res: Response) => {
  try {
    const {
      name,
      slug,
      email_billing,
      cnpj, cnpj_cpf,       // aceita ambos os nomes do frontend
      phone,
      monthly_fee,
      due_day,
      status,
      plan_tier
    } = req.body;

    const agencySlug = slug || (name ? name.toLowerCase().replace(/[^a-z0-9]/g, '-') + '-' + Date.now().toString(36) : 'agencia-' + Date.now());

    // Payload alinhado 100% com o schema real do Supabase
    const payload: Record<string, any> = {
      name: name || 'Nova Agência Enterprise',
      slug: agencySlug,
      email_billing: email_billing || 'financeiro@agencia.com',
      cnpj_cpf: cnpj_cpf || cnpj || null,
      phone: phone || null,
      monthly_fee: monthly_fee ? parseFloat(String(monthly_fee)) : 0,
      due_day: due_day ? parseInt(String(due_day)) : 10,
      status: status || 'active',
      plan_tier: plan_tier || 'standard',
    };

    console.log('[API] Criando agência com payload:', JSON.stringify(payload));
    const { data, error } = await supabase.from('agencies').insert([payload]).select().single();
    if (error) {
      console.error('[Supabase] Erro ao criar agência:', error);
      throw error;
    }
    console.log('[Supabase] ✅ Agência criada com sucesso:', data?.id);

    // Tenta criar o usuário agency_admin via Supabase Auth
    let userCreated = false;
    let defaultPassword = 'ChangeMe123!';
    const adminEmailToCreate = req.body.admin_email || email_billing;
    if (adminEmailToCreate) {
      const { data: userData, error: userError } = await supabase.auth.admin.createUser({
        email: adminEmailToCreate,
        password: defaultPassword,
        email_confirm: true,
        user_metadata: {
           role: 'agency_owner',
           agency_id: data.id,
           full_name: req.body.responsible_name || 'Admin Agência'
        }
      });
      if (userError) {
         console.error('[Supabase] Erro ao criar usuário admin da agência:', userError);
      } else {
         console.log('[Supabase] ✅ Usuário admin da agência criado:', userData.user.id);
         userCreated = true;
      }
    }

    return res.json({ success: true, data, userCreated, defaultPassword: userCreated ? defaultPassword : null });
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

    // Somente campos que existem de fato na tabela agencies do Supabase
    const allowedFields = [
      'name', 'slug', 'email_billing', 'cnpj_cpf', 'phone',
      'monthly_fee', 'due_day', 'status', 'plan_tier'
    ];
    // Mapeamento de nomes legados do frontend → coluna real
    if (body['cnpj'] !== undefined && body['cnpj_cpf'] === undefined) body['cnpj_cpf'] = body['cnpj'];

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
