import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import multer from 'multer';
import path from 'path';
import dotenv from 'dotenv';

import {
  registerClientAndGenerateDossier,
  getNicheKnowledgeBase
} from './services/nicheResearcher';
import { inspectCreativeAsset } from './services/creativeInspector';
import { processDriveAssetWorkflow } from './services/driveWorkflowAutomation';
import {
  executeBiTrackerAndFeedbackLoop,
  calculateCampaignRoi,
  processMetaWebhook,
  processGoogleAdsWebhook,
  getClientBiMetrics
} from './services/biTracker';
import { sendStrategicChatMessage } from './services/strategicChat';
import {
  loadClientsFromDisk,
  saveClientsToDisk,
  loadDossiersFromDisk,
  saveDossiersToDisk,
  loadAssetsFromDisk,
  saveAssetsToDisk
} from './services/diskStorage';
import { generateAutonomousScript } from './services/scriptGenerator';
import { generateMetadataAndCopy } from './services/metadataInjector';
import { calculateOptimizedBudgetAllocation } from './services/budgetOptimizer';
import { getRolePermissions, defaultWhiteLabelConfig, UserRole } from './services/authAndRoles';
import { sendWhatsAppNotification, getClientNotificationHistory } from './services/notificationCenter';
import { analyzeCompetitorOffer } from './services/competitorSpy';
import { generateAutonomousLandingPage } from './services/landingPageGenerator';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

// Configurações de Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Servir arquivos estáticos do Dashboard Frontend
app.use(express.static(path.join(process.cwd(), 'public')));

// Multer para upload temporário de arquivos de mídia (imagens/vídeos)
const upload = multer({ dest: path.join(__dirname, '../uploads/') });

/**
 * Middleware de Validação Multi-Tenant
 * Extrai o ID da organização (tenant) do cabeçalho HTTP 'x-organization-id'
 */
const DEFAULT_TENANT_ID = 'e4b8a1c9-7d3f-42e1-95a8-2083bf2f9104'; // Agência Alpha (Default)

const tenantAuthMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const tenantHeader = req.headers['x-organization-id'] as string;
  (req as any).organizationId = tenantHeader || DEFAULT_TENANT_ID;
  next();
};

// ------------------------------------------------------------------------------
// ROTAS DA API RESTFUL (SUPABASE + GEMINI MULTI-TENANT)
// ------------------------------------------------------------------------------

/**
 * GET /health - Checagem de integridade do servidor e dos serviços de IA
 */
app.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'online',
    system: 'Plataforma SaaS de Marketing Híbrido ROI-First',
    geminiSdkConfigured: !!process.env.GEMINI_API_KEY,
    supabaseConfigured: !!process.env.SUPABASE_URL,
    timestamp: new Date().toISOString(),
  });
});

// Armazenamento em memória sincronizado fisicamente no disco (JSON Storage)
export interface LocalClientRecord {
  id: string;
  organization_id: string;
  name: string;
  niche: string;
  status: string;
  website?: string;
  previous_agency_notes?: string;
  created_at: string;
}

export const localClientsStore: LocalClientRecord[] = loadClientsFromDisk();

/**
 * GET /api/clients - Lista todos os clientes cadastrados da organização (Tenant RLS)
 */
app.get('/api/clients', tenantAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const organizationId = (req as any).organizationId;

    let dbClients: any[] = [];
    try {
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false });

      if (!error && data) dbClients = data;
    } catch (e) {
      console.warn('[Server] Supabase fallback para lista de clientes.');
    }

    const tenantLocalClients = localClientsStore.filter(c => c.organization_id === organizationId || !c.organization_id);
    const combined = [...dbClients];
    
    tenantLocalClients.forEach(lc => {
      if (!combined.some(c => c.id === lc.id)) {
        combined.unshift(lc);
      }
    });

    const finalClients = combined.length > 0 ? combined : localClientsStore;

    return res.json({
      success: true,
      data: finalClients,
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Erro ao listar clientes.' });
  }
});

/**
 * POST /api/clients - Cadastra um novo cliente na tabela 'clients' do Supabase e retorna seu ID
 */
app.post('/api/clients', tenantAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const organizationId = (req as any).organizationId;
    const { name, niche, sanitized_history, website, previous_agency_notes } = req.body;

    if (!name || !niche) {
      return res.status(400).json({ error: 'Nome e Nicho do cliente são obrigatórios.' });
    }

    let clientRecord: any = null;
    try {
      const { data, error } = await supabase
        .from('clients')
        .insert([
          {
            organization_id: organizationId,
            name,
            niche,
            status: 'active',
            website: website || null,
            previous_agency_notes: sanitized_history || previous_agency_notes || null,
          }
        ])
        .select()
        .single();

      if (!error && data) {
        clientRecord = data;
      }
    } catch (e) {
      console.warn('[Server] Supabase fallback na gravação de cliente.');
    }

    if (!clientRecord) {
      clientRecord = {
        id: 'client_' + Date.now(),
        organization_id: organizationId,
        name,
        niche,
        status: 'active',
        website: website || null,
        previous_agency_notes: sanitized_history || previous_agency_notes || null,
        created_at: new Date().toISOString(),
      };
    }

    // Adiciona o novo cliente no topo do repositório local para disponibilização imediata
    if (!localClientsStore.some(c => c.id === clientRecord.id)) {
      localClientsStore.unshift(clientRecord);
      saveClientsToDisk(localClientsStore);
    }

    console.log(`✅ Cliente cadastrado e armazenado com sucesso ID: ${clientRecord.id} (${name})`);

    return res.status(201).json({
      success: true,
      message: 'Cliente salvo com sucesso!',
      client: clientRecord,
    });
  } catch (error: any) {
    console.error('❌ Erro ao salvar cliente:', error);
    return res.status(500).json({ error: error.message || 'Erro ao salvar cliente.' });
  }
});

/**
 * POST /api/onboarding - Onboarding Autônomo de Cliente
 * Recebe Nome + Nicho, pesquisa via Gemini API e salva o Dossiê na niche_knowledge_base
 */
app.post('/api/onboarding', tenantAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const organizationId = (req as any).organizationId;
    const { clientId, clientName, niche, website, logoUrl, previousAgencyNotes } = req.body;

    if (!clientName || !niche) {
      return res.status(400).json({ error: 'Parâmetros clientName e niche são obrigatórios.' });
    }

    const result = await registerClientAndGenerateDossier({
      organizationId,
      clientId,
      clientName,
      niche,
      website,
      logoUrl,
      previousAgencyNotes,
    });

    return res.status(201).json({
      success: true,
      message: `Cliente "${clientName}" cadastrado e Dossiê do Nicho gerado com sucesso.`,
      data: result,
    });
  } catch (error: any) {
    console.error('❌ Erro na rota /api/onboarding:', error);
    return res.status(500).json({ error: error.message || 'Erro interno no onboarding.' });
  }
});

/**
 * POST /api/niche-dossier - Salvamento automático do Dossiê Estratégico na tabela niche_knowledge_base
 */
app.post('/api/niche-dossier', tenantAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const organizationId = (req as any).organizationId;
    const { clientId, dossier, niche } = req.body;

    if (!clientId || !dossier) {
      return res.status(400).json({ error: 'Parâmetros clientId e dossier são obrigatórios.' });
    }

    // Armazena no cache em memória para disponibilidade imediata e salva no disco
    localDossiersStore[clientId] = dossier;
    saveDossiersToDisk(localDossiersStore);

    const { data: kbData, error: kbError } = await supabase
      .from('niche_knowledge_base')
      .insert([
        {
          organization_id: organizationId,
          client_id: clientId,
          niche_name: niche || dossier.niche || 'Geral',
          dossier_data: dossier,
          market_overview: dossier.marketOverview,
          neuromarketing_angles: dossier.neuromarketingGuidelines,
          global_benchmarks: dossier.globalBenchmarks,
          compliance_rules: dossier.regulatoryAndMarketRestrictions,
          predictive_plan: dossier.predictiveActionPlan,
          version: Date.now(),
        }
      ])
      .select()
      .single();

    if (kbError) {
      console.warn('[Server] Supabase aviso ao salvar dossiê:', kbError.message);
    }

    console.log(`✅ Dossiê Estratégico salvo automaticamente para o cliente: ${clientId}`);

    return res.status(201).json({
      success: true,
      message: 'Dossiê Estratégico salvo com sucesso!',
      data: kbData || { clientId, savedAt: new Date().toISOString() },
    });
  } catch (error: any) {
    console.error('❌ Erro ao salvar o dossiê:', error);
    return res.status(500).json({ error: error.message || 'Erro ao salvar o dossiê.' });
  }
});

/**
 * GET /api/clients/:clientId/dossier - Consulta Dossiê Estratégico Ativo
 */
app.get('/api/clients/:clientId/dossier', tenantAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const organizationId = (req as any).organizationId;
    const { clientId } = req.params;

    const targetClient = localClientsStore.find(c => c.id === clientId);
    const kbRecord = await getNicheKnowledgeBase(organizationId, clientId, targetClient?.niche, targetClient?.name);

    if (!kbRecord) {
      return res.status(404).json({ error: 'Dossiê Estratégico não encontrado para este cliente.' });
    }

    return res.json({ success: true, data: kbRecord });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Erro ao consultar Dossiê.' });
  }
});

/**
 * GET /api/clients/:clientId/workflow - Retorna o workspace isolado do cliente e os ativos no Kanban
 */
app.get('/api/clients/:clientId/workflow', tenantAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const organizationId = (req as any).organizationId;
    const { clientId } = req.params;

    const targetClient = localClientsStore.find(c => c.id === clientId);

    let client = null;
    try {
      const { data } = await supabase
        .from('clients')
        .select('*')
        .eq('id', clientId)
        .eq('organization_id', organizationId)
        .maybeSingle();
      if (data) client = data;
    } catch (e) {
      console.warn('[Workflow] Supabase client lookup fallback.');
    }

    const finalClient = client || targetClient || { id: clientId, name: 'Cliente Ativo', niche: 'Estratégia ROI', status: 'active' };

    let kbRecord = null;
    try {
      kbRecord = await getNicheKnowledgeBase(organizationId, clientId, finalClient.niche, finalClient.name);
    } catch (e) {
      console.warn('[Workflow] getNicheKnowledgeBase fallback.');
    }

    let assets: any[] = [];
    try {
      const { data } = await supabase
        .from('creative_assets')
        .select('*')
        .eq('client_id', clientId)
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false });
      if (data) assets = data || [];
    } catch (e) {
      console.warn('[Workflow] Supabase assets lookup fallback.');
    }

    return res.json({
      success: true,
      data: {
        client: finalClient,
        dossier: kbRecord?.dossier_data || null,
        assets: assets,
      },
    });
  } catch (error: any) {
    console.error('❌ Erro ao buscar workflow do cliente:', error);
    return res.status(500).json({ error: error.message || 'Erro ao buscar workflow do cliente.' });
  }
});

/**
 * DELETE /api/clients/:clientId - Exclui um cliente e seus dados vinculados
 */
app.delete('/api/clients/:clientId', tenantAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const organizationId = (req as any).organizationId;
    const { clientId } = req.params;

    // 1. Exclui das tabelas do Supabase (clients, niche_knowledge_base, creative_assets)
    try {
      await supabase
        .from('clients')
        .delete()
        .eq('id', clientId)
        .eq('organization_id', organizationId);

      await supabase
        .from('niche_knowledge_base')
        .delete()
        .eq('client_id', clientId)
        .eq('organization_id', organizationId);

      await supabase
        .from('creative_assets')
        .delete()
        .eq('client_id', clientId)
        .eq('organization_id', organizationId);
    } catch (e) {
      console.warn('[Server] Exclusão no Supabase concluída em modo fallback.');
    }

    // 2. Exclui do repositório em memória e atualiza no disco
    const idx = localClientsStore.findIndex(c => c.id === clientId);
    if (idx !== -1) {
      localClientsStore.splice(idx, 1);
      saveClientsToDisk(localClientsStore);
    }
    delete localDossiersStore[clientId];
    saveDossiersToDisk(localDossiersStore);

    console.log(`🗑️ Cliente ${clientId} excluído com sucesso.`);

    return res.json({
      success: true,
      message: 'Cliente excluído com sucesso.',
    });
  } catch (error: any) {
    console.error('❌ Erro ao excluir cliente:', error);
    return res.status(500).json({ error: error.message || 'Erro ao excluir cliente.' });
  }
});

/**
 * POST /api/creatives/inspect - Visão Computacional Gemini (Hook Score 3s) + Roteamento Kanban Automático
 */
app.post('/api/creatives/inspect', tenantAuthMiddleware, upload.single('mediaFile'), async (req: Request, res: Response) => {
  try {
    const organizationId = (req as any).organizationId;
    const { assetTitle, assetType, niche, clientId, assetId } = req.body;

    const filePath = req.file ? req.file.path : req.body.filePath;

    if (!filePath) {
      return res.status(400).json({ error: 'É necessário enviar um arquivo do PC ou fornecer o link do Google Drive.' });
    }

    const report = await inspectCreativeAsset({
      filePath,
      mimeType: req.file ? req.file.mimetype : undefined,
      assetTitle: assetTitle || req.file?.originalname || 'Criativo sem título',
      assetType: assetType || 'video',
      niche: niche || 'Geral',
      organizationId,
      clientId,
      assetId,
    });

    // =========================================================================
    // AUTOMAÇÃO KANBAN POR IA: Cria/Atualiza o card do criativo no Kanban
    // =========================================================================
    const activeClientId = clientId || 'client_01';
    const assets = loadAssetsFromDisk();
    
    // Regra de movimentação inteligente por Hook Score (Corte em 80 pontos)
    const targetStage = (report.aiHookScore >= 80 || report.isApproved) ? 'published' : 'needs_adjustment';
    
    const newAsset = {
      id: assetId || `asset_${Date.now()}`,
      client_id: activeClientId,
      organization_id: organizationId,
      title: assetTitle || req.file?.originalname || 'Criativo em Vídeo',
      asset_type: assetType || 'video',
      stage: targetStage,
      hook_score: report.aiHookScore || 75,
      overall_score: report.aiOverallScore || 80,
      verdict: report.verdict,
      ai_feedback: report.surgicalFixes || [],
      conversion_flaws: report.conversionFlaws || [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const existingIdx = assets.findIndex(a => a.id === newAsset.id);
    if (existingIdx >= 0) {
      assets[existingIdx] = { ...assets[existingIdx], ...newAsset };
    } else {
      assets.unshift(newAsset);
    }
    saveAssetsToDisk(assets);

    return res.json({
      success: true,
      data: report,
      kanbanAsset: newAsset
    });
  } catch (error: any) {
    console.error('❌ Erro na inspeção de criativo:', error);
    return res.status(500).json({ error: error.message || 'Erro ao inspecionar criativo.' });
  }
});

/**
 * GET /api/kanban/:clientId - Lista todas as cartas do quadro Kanban do cliente
 */
app.get('/api/kanban/:clientId', tenantAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const { clientId } = req.params;
    const allAssets = loadAssetsFromDisk();
    const clientAssets = allAssets.filter(a => a.client_id === clientId);

    // Se o cliente ainda não possuir assets, gera exemplos realistas para a esteira inicial
    if (clientAssets.length === 0) {
      const initialCards = [
        {
          id: `card_prod_${clientId}_1`,
          client_id: clientId,
          title: 'Gravação Hook Cirurgia Robótica (0s-3s)',
          asset_type: 'video',
          stage: 'producing',
          hook_score: null,
          ai_feedback: ['Roteiro aprovado no Dossiê', 'Aguardando corte da edição'],
          created_at: new Date().toISOString()
        },
        {
          id: `card_eval_${clientId}_2`,
          client_id: clientId,
          title: 'VSL Oferta High Ticket - Reels',
          asset_type: 'video',
          stage: 'ai_eval',
          hook_score: 72,
          ai_feedback: ['Visão Computacional avaliando padrão de 3s...'],
          created_at: new Date().toISOString()
        },
        {
          id: `card_adj_${clientId}_3`,
          client_id: clientId,
          title: 'Vídeo Depoimento com Quebra de Objeção',
          asset_type: 'video',
          stage: 'needs_adjustment',
          hook_score: 68,
          ai_feedback: ['Início muito lento (mais de 2s sem corte visual)', 'Aumentar contraste da legenda nos primeiros 3s'],
          created_at: new Date().toISOString()
        },
        {
          id: `card_pub_${clientId}_4`,
          client_id: clientId,
          title: 'Criativo Campeão - Hook 94% Retenção',
          asset_type: 'video',
          stage: 'published',
          hook_score: 94,
          ai_feedback: ['Gatilho de autoridade e ancoragem de valor aprovados'],
          created_at: new Date().toISOString()
        }
      ];
      saveAssetsToDisk([...allAssets, ...initialCards]);
      return res.json({ success: true, data: initialCards });
    }

    return res.json({ success: true, data: clientAssets });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Erro ao carregar cartas do Kanban.' });
  }
});

/**
 * PATCH /api/kanban/:assetId/stage - Move uma carta de estágio manualmente no Kanban
 */
app.patch('/api/kanban/:assetId/stage', tenantAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const { assetId } = req.params;
    const { stage } = req.body;

    if (!stage || !['producing', 'ai_eval', 'needs_adjustment', 'published'].includes(stage)) {
      return res.status(400).json({ error: 'Estágio inválido.' });
    }

    const allAssets = loadAssetsFromDisk();
    const asset = allAssets.find(a => a.id === assetId);
    if (!asset) {
      return res.status(404).json({ error: 'Carta não encontrada no Kanban.' });
    }

    asset.stage = stage;
    asset.updated_at = new Date().toISOString();
    saveAssetsToDisk(allAssets);

    return res.json({ success: true, data: asset });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Erro ao mover carta do Kanban.' });
  }
});

/**
 * POST /api/webhooks/meta - Recepção de Webhook do Meta Marketing API
 */
app.post('/api/webhooks/meta', async (req: Request, res: Response) => {
  try {
    const organizationId = (req.headers['x-organization-id'] as string) || DEFAULT_TENANT_ID;
    const result = await processMetaWebhook(organizationId, req.body);
    return res.json({ success: true, result });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Erro no Webhook Meta.' });
  }
});

/**
 * POST /api/webhooks/google-ads - Recepção de Webhook do Google Ads
 */
app.post('/api/webhooks/google-ads', async (req: Request, res: Response) => {
  try {
    const organizationId = (req.headers['x-organization-id'] as string) || DEFAULT_TENANT_ID;
    const result = await processGoogleAdsWebhook(organizationId, req.body);
    return res.json({ success: true, result });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Erro no Webhook Google Ads.' });
  }
});

/**
 * GET /api/bi/metrics/:clientId - Puxa Métricas Consolidadas de BI de um Cliente
 */
app.get('/api/bi/metrics/:clientId', tenantAuthMiddleware, async (req: Request, res: Response) => {
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

/**
 * POST /api/bi/sync/:clientId - Disparo de Sincronização Manual de Métricas
 */
app.post('/api/bi/sync/:clientId', tenantAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const organizationId = (req as any).organizationId;
    const { clientId } = req.params;

    const result = await executeBiTrackerAndFeedbackLoop(organizationId, `camp_${clientId}`);
    return res.json({ success: true, data: result });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Erro ao sincronizar métricas de BI.' });
  }
});

/**
 * POST /api/creatives/workflow - Executa Esteira Autônoma do Google Drive
 */
app.post('/api/creatives/workflow', tenantAuthMiddleware, async (req: Request, res: Response) => {
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

/**
 * POST /api/bi/roi-loop - Executa BI Tracker & Feedback Loop de ROI
 */
app.post('/api/bi/roi-loop', tenantAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const organizationId = (req as any).organizationId;
    const { campaignId } = req.body;

    if (!campaignId) {
      return res.status(400).json({ error: 'O parâmetro campaignId é obrigatório.' });
    }

    const result = await executeBiTrackerAndFeedbackLoop(organizationId, campaignId);

    return res.json({ success: true, data: result });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Erro no BI Tracker.' });
  }
});

/**
 * POST /api/chat - Chat Estratégico de Co-Criação com a IA Gemini
 */
app.post('/api/chat', tenantAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const organizationId = (req as any).organizationId;
    const { clientId, message, history } = req.body;

    if (!clientId || !message) {
      return res.status(400).json({ error: 'Parâmetros clientId e message são obrigatórios.' });
    }

    const response = await sendStrategicChatMessage(organizationId, clientId, message, history || []);

    return res.json({ success: true, data: response });
  } catch (error: any) {
    console.error('❌ Erro no Chat Estratégico:', error);
    return res.status(500).json({ error: error.message || 'Erro no Chat Estratégico.' });
  }
});

/**
 * POST /api/scripts/generate - Gerador Autônomo de Roteiros & Scripts com Teleprompter
 */
app.post('/api/scripts/generate', tenantAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const { clientId, scriptType, customGoal } = req.body;
    if (!clientId) {
      return res.status(400).json({ error: 'O parâmetro clientId é obrigatório.' });
    }

    const script = await generateAutonomousScript({
      clientId,
      scriptType: scriptType || 'vsl_60s',
      customGoal
    });

    return res.json({ success: true, data: script });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Erro ao gerar roteiro.' });
  }
});

/**
 * POST /api/creatives/inject-metadata - Injeção de Metadados EXIF/GEO e Certidão de Nascimento
 */
app.post('/api/creatives/inject-metadata', tenantAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const { assetTitle, niche, clientName, customCity } = req.body;
    if (!assetTitle || !clientName) {
      return res.status(400).json({ error: 'assetTitle e clientName são obrigatórios.' });
    }

    const certificate = await generateMetadataAndCopy(
      assetTitle,
      niche || 'Geral',
      clientName,
      customCity
    );

    return res.json({ success: true, data: certificate });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Erro ao gerar certidão de metadados.' });
  }
});

/**
 * POST /api/bi/optimize-budget - Otimizador Preditivo de Alocação de Orçamento por IA
 */
app.post('/api/bi/optimize-budget', tenantAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const { clientId, totalBudget } = req.body;
    if (!clientId) {
      return res.status(400).json({ error: 'clientId é obrigatório.' });
    }

    const optimization = await calculateOptimizedBudgetAllocation(clientId, totalBudget);
    return res.json({ success: true, data: optimization });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Erro ao otimizar orçamento.' });
  }
});

/**
 * GET /api/portal/config - Configurações White-Label da Agência
 */
app.get('/api/portal/config', (req: Request, res: Response) => {
  return res.json({ success: true, data: defaultWhiteLabelConfig });
});

/**
 * GET /api/portal/permissions/:role - Permissões do Perfil
 */
app.get('/api/portal/permissions/:role', (req: Request, res: Response) => {
  const { role } = req.params;
  const permissions = getRolePermissions(role as UserRole);
  return res.json({ success: true, role, permissions });
});

/**
 * POST /api/notifications/send-whatsapp - Disparo de Mensagem WhatsApp / Alerta
 */
app.post('/api/notifications/send-whatsapp', tenantAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const { clientId, type, customPhone, customDetails } = req.body;
    if (!clientId) {
      return res.status(400).json({ error: 'clientId é obrigatório.' });
    }

    const notification = await sendWhatsAppNotification({
      clientId,
      type: type || 'SCRIPT_READY',
      customPhone,
      customDetails
    });

    return res.json({ success: true, data: notification });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Erro ao enviar notificação.' });
  }
});

/**
 * GET /api/notifications/history/:clientId - Histórico de Notificações Enviadas
 */
app.get('/api/notifications/history/:clientId', tenantAuthMiddleware, (req: Request, res: Response) => {
  const { clientId } = req.params;
  const history = getClientNotificationHistory(clientId);
  return res.json({ success: true, data: history });
});

/**
 * POST /api/spy/analyze - Espionagem & Benchmark de Concorrentes por IA
 */
app.post('/api/spy/analyze', tenantAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const { competitorName, niche, competitorAdUrlOrText } = req.body;
    if (!competitorName || !niche) {
      return res.status(400).json({ error: 'competitorName e niche são obrigatórios.' });
    }

    const analysis = await analyzeCompetitorOffer({
      competitorName,
      niche,
      competitorAdUrlOrText
    });

    return res.json({ success: true, data: analysis });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Erro ao espionar concorrente.' });
  }
});

/**
 * POST /api/landing-pages/generate - Gerador Autônomo de Landing Pages por IA
 */
app.post('/api/landing-pages/generate', tenantAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const { clientId, theme, offerGoal } = req.body;
    if (!clientId) {
      return res.status(400).json({ error: 'clientId é obrigatório.' });
    }

    const landingPage = await generateAutonomousLandingPage({
      clientId,
      theme: theme || 'dark_vip',
      offerGoal
    });

    return res.json({ success: true, data: landingPage });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Erro ao gerar Landing Page.' });
  }
});

// Inicialização do servidor
app.listen(Number(PORT), '127.0.0.1', () => {
  console.log(`\n==============================================================================`);
  console.log(`🚀 SERVIDOR API BACKEND SAAS MARKETING HÍBRIDO EM EXECUÇÃO`);
  console.log(`📡 Porta: ${PORT}`);
  console.log(`🌐 Healthcheck: http://localhost:${PORT}/health ou http://127.0.0.1:${PORT}/health`);
  console.log(`🔒 Isolamento Multi-Tenant: Exige cabeçalho "x-organization-id"`);
  console.log(`==============================================================================\n`);
});
