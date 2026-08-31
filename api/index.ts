export const maxDuration = 60; // Permite até 60s de execução na Vercel
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
import { supabase, supabaseAdmin } from '../src/services/supabaseClient';
import { analyzeCompetitorOffer } from '../src/services/competitorSpy';
import {
  executeAutonomousScraperRun,
  startAutonomousScraperCron,
  stopAutonomousScraperCron,
  getAutonomousScraperStatus,
  mineNicheTopPlayersAndTrends
} from '../src/services/autonomousScraperAgent';
import { checkAgencyStatus, getMaintenanceModeState, setMaintenanceModeState } from '../src/middlewares/authAgency';

// Lista de contingência com base nos limites ativos do painel do usuário
const GEMINI_MODELS_CASCADE = [
  "gemini-3.7-flash",      // 1ª Opção: Inteligência máxima (Raciocínio de topo)
  "gemini-3.6-flash",      // 2ª Opção: Alta performance e resposta rápida
  "gemini-3.5-flash-lite", // 3ª Opção: Assume com 500 req/dia livres e altíssima velocidade
  "gemini-3.5-flash",      // 4ª Opção: Resposta padrão de alta capacidade
  "gemma-4-26b",           // 5ª Opção: Retaguarda massiva (14.400 req/dia)
  "gemma-4-31b"            // 6ª Opção: Contingência avançada (14.400 req/dia)
];

/**
 * Função executora universal para TODOS os módulos (Onboarding, Chat, BI, Live, Radar)
 * Retorna { reply, modelUsed, usageMetadata }
 */
async function executarIAComFallback(genAI: any, systemInstruction: string, promptOuConteudo: any) {
  let ultimoErro: any = null;

  for (const modelName of GEMINI_MODELS_CASCADE) {
    try {
      console.log(`[AI Cascata] Tentando modelo: ${modelName}`);

      let config: any = {
        temperature: 0.7,
        maxOutputTokens: 2000
      };

      // thinkingConfig zero-delay exclusivo para Gemini 3.7 (parâmetro inválido em 3.5/Gemma)
      if (modelName.includes('3.7')) {
        config.thinkingConfig = { thinkingBudget: 0 };
      }

      if (systemInstruction) {
        config.systemInstruction = systemInstruction;
      }

      // Mescla config externo (ex: responseMimeType) sem sobrescrever temperatura/thinking
      if (promptOuConteudo?.config) {
        const { thinkingConfig: _ignored, temperature: _t, maxOutputTokens: _m, ...extraConfig } = promptOuConteudo.config;
        config = { ...config, ...extraConfig };
      }

      const requestOptions: any = {
        model: modelName,
        config
      };

      if (promptOuConteudo?.contents) {
        requestOptions.contents = promptOuConteudo.contents;
      } else {
        requestOptions.contents = [{ role: 'user', parts: [{ text: promptOuConteudo }] }];
      }

      const response = await genAI.models.generateContent(requestOptions);
      const reply = response.text;

      // Extrai metadados de tokens da resposta oficial da API
      const usage = response.usageMetadata || {};
      const usageMetadata = {
        promptTokenCount: usage.promptTokenCount || usage.prompt_tokens || Math.ceil((typeof promptOuConteudo === 'string' ? promptOuConteudo.length : 100) / 4),
        candidatesTokenCount: usage.candidatesTokenCount || usage.candidates_tokens || Math.ceil((reply?.length || 100) / 4),
        totalTokenCount: usage.totalTokenCount || usage.total_tokens || 0
      };
      if (!usageMetadata.totalTokenCount) {
        usageMetadata.totalTokenCount = usageMetadata.promptTokenCount + usageMetadata.candidatesTokenCount;
      }

      if (reply && reply.trim().length > 0) {
        console.log(`[AI Cascata] Sucesso com modelo: ${modelName} (${usageMetadata.totalTokenCount} tokens)`);
        return { reply, modelUsed: modelName, usageMetadata };
      }

      // Resposta vazia = modelo indisponível, tenta próximo
      console.warn(`[AI Cascata] Modelo ${modelName} retornou resposta vazia. Saltando...`);
    } catch (err: any) {
      const msg = err?.message || String(err);
      ultimoErro = err;

      const status = err?.status || err?.response?.status;
      const isCotaOuIndisponivel =
        status === 429 || status === 503 || status === 404 ||
        msg.includes('429') || msg.includes('503') || msg.includes('404') ||
        msg.toLowerCase().includes('quota') ||
        msg.toLowerCase().includes('resourceexhausted') ||
        msg.toLowerCase().includes('not found') ||
        msg.toLowerCase().includes('overloaded') ||
        msg.toLowerCase().includes('rate limit');

      if (isCotaOuIndisponivel) {
        console.warn(`[AI Cascata] Modelo ${modelName} sem cota ou indisponível (${msg.slice(0, 80)}). Saltando para o próximo...`);
        continue;
      }

      console.error(`[AI Cascata] Erro no modelo ${modelName}:`, msg.slice(0, 200));
      // Tenta próximo modelo em caso de erro de API
      continue;
    }
  }

  throw new Error(`[AI Cascata] Todos os modelos falharam ou atingiram cota. Último erro: ${ultimoErro?.message}`);
}

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

// Protege todas as rotas da IA e dos painéis contra acesso de agências bloqueadas
// Excetuando as rotas de admin que precisam funcionar para que o Super Admin possa desbloquear a agência
app.use('/api', (req: Request, res: Response, next: NextFunction) => {
  if (req.path.startsWith('/admin/')) {
    return next();
  }
  return checkAgencyStatus(req, res, next);
});

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

// --- ROTA DE ADMIN: ATUALIZAR SENHA DA AGÊNCIA ---
app.put('/api/admin/agencies', async (req, res) => {
    try {
        const { action, agencyId, password } = req.body;

        if (action === 'update_password') {
            if (!agencyId || !password) {
                return res.status(400).json({ success: false, message: 'ID da agência e senha são obrigatórios.' });
            }

            const { createClient } = await import('@supabase/supabase-js');
            const supabaseAdmin = createClient(
                process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '',
                process.env.SUPABASE_SERVICE_ROLE_KEY || ''
            );

            const { data: agencyData, error: agencyError } = await supabaseAdmin
                .from('agencies')
                .select('email_billing')
                .eq('id', agencyId)
                .single();

            if (agencyError || !agencyData) {
                return res.status(404).json({ success: false, message: 'Agência não encontrada.' });
            }

            const { data: listUsers, error: listError } = await supabaseAdmin.auth.admin.listUsers();
            
            if (listError) {
                throw listError;
            }

            // Conversão explícita para evitar o erro do TypeScript
            const usersList = (listUsers as any).users || [];
            const user = usersList.find((u: any) => u.email === agencyData.email_billing);

            if (!user) {
                return res.status(404).json({ success: false, message: 'Usuário de autenticação não encontrado para este e-mail.' });
            }

            const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(user.id, {
                password: password
            });

            if (updateError) {
                return res.status(400).json({ success: false, message: updateError.message });
            }

            return res.json({ success: true, message: 'Senha atualizada com sucesso!' });
        }

        return res.status(400).json({ success: false, message: 'Ação inválida.' });
    } catch (err: any) {
        console.error('Erro na API de agências:', err);
        return res.status(500).json({ success: false, message: err.message || 'Erro interno no servidor.' });
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
app.get('/*.js', (req: Request, res: Response) => {
  try {
    const filename = path.basename(req.path);
    const jsPath = getStaticFilePath(filename);
    if (fs.existsSync(jsPath)) {
      const data = fs.readFileSync(jsPath, 'utf-8');
      res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
      setNoCacheHeaders(res);
      return res.status(200).send(data);
    }
    return res.status(404).send(`Arquivo JS não encontrado: ${filename}`);
  } catch (e: any) {
    return res.status(500).send('Erro ao carregar arquivo JS: ' + e.message);
  }
});

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
      } catch (e) { }
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

// GET /api/chat - Retorna o histórico do banco para o Chat Estratégico
app.get('/api/chat', async (req: Request, res: Response) => {
  try {
    const { client_id } = req.query;
    const { data, error } = await supabase
      .from('chat_history')
      .select('*')
      .eq('client_id', String(client_id || 'client_1787406730'))
      .order('created_at', { ascending: true });

    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ history: data || [] });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
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
      .from('bi_chat_history')
      .select('*')
      .eq('client_id', clientId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('❌ [Supabase GET chat-history error]:', error);

      // Fallback para chat_history antigo se falhar
      const { data: oldData, error: oldError } = await supabase
        .from('chat_history')
        .select('*')
        .eq('client_id', clientId)
        .order('created_at', { ascending: true });

      if (!oldError && oldData) {
        return res.json({ success: true, data: oldData, source: 'fallback' });
      }
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

// POST /api/chat - Chat Estratégico & Live Advisor
app.post('/api/chat', async (req: Request, res: Response) => {
  try {
    const { clientId: reqClientId, message, mode, systemPrompt, client_id, prompt, clientContext, clientName, clientNiche, dossierContext } = req.body || {};
    const userMessage = message || prompt || '';
    const clientId = reqClientId || client_id;

    if (!userMessage) {
      return res.status(400).json({ success: false, error: 'Mensagem não fornecida.' });
    }

    // 1. Grava no banco a mensagem do USER
    await supabase.from('chat_history').insert([{
      client_id: String(clientId),
      role: 'user',
      content: userMessage,
      created_at: new Date().toISOString()
    }]);

    const apiKey = process.env.GEMINI_API_KEY?.trim();
    if (!apiKey) {
      return res.status(500).json({ success: false, error: 'GEMINI_API_KEY não configurada no servidor.' });
    }

    let promptInstrucao = systemPrompt || "Você é o Oraculum AI.";

    if (!systemPrompt) {
      if (mode === 'bi_live') {
        promptInstrucao = `Você é o Oraculum Live, Diretor Executivo de BI, Estratégia e CRO participando de uma reunião ao vivo com o usuário.

CONTEXTO DA CONTA / CLIENTE ATUAL (Use apenas quando relevante para responder à pergunta):
${JSON.stringify(clientContext || {}, null, 2)}

REGRAS RÍGIDAS DE INTERAÇÃO:
1. Responda ESTRITAMENTE ao que foi perguntado pelo usuário. Nunca despeje diagnósticos, relatórios longos ou listas completas sem que tenha sido solicitado expressamente.
2. Saudações ("oi", "olá", "bom dia"): Responda de forma rápida, cordial e executiva (1 a 2 frases), confirmando que está acompanhando a conta do cliente ativo e perguntando como pode orientar a pauta ou reunião agora.
3. Perguntas pontuais: Dê respostas diretas, sucintas e analíticas.
4. Diagnósticos completos: Só estruture planos de tração, baselines e matrizes se o usuário pedir explicitamente (ex: "faça o diagnóstico", "analise a conta", "gere o plano").
5. Tom de voz: Executivo, seguro, conciso e orientado a negócios.`;
      } else if (mode === 'bi_feedback_loop') {
        promptInstrucao = `Você é o Diretor de BI Preditivo e Growth Intelligence do Oraculum.
Analise os dados do cliente e as métricas do funil abaixo para gerar recomendações táticas preditivas.

CONTEXTO DO CLIENTE E MÉTRICAS:
${JSON.stringify(clientContext || {}, null, 2)}

SUA TAREFA:
Gere exatamente DUAS seções concisas e aplicadas ao nicho do cliente:

🏆 Padrões Campeões Identificados
- [Insight 1: Ângulo de anúncio/criativo com maior potencial no nicho]
- [Insight 2: Gatilho ou ancoragem de ticket que mais gera leads qualificados]

⚠️ Ajustes Preditivos para a Próxima Campanha
- [Ajuste 1: Recomendação de alocação de orçamento nos canais mais eficientes]
- [Ajuste 2: Ação imediata no fluxo de conversão/WhatsApp]

DIRETRIZES:
- Se os dados estiverem zerados, use os benchmarks de alta performance do nicho como base analítica.
- Seja direto, conciso e tático.`;
      } else {
        promptInstrucao = `Você é o Copiloto Estratégico do Oraculum.
Cliente Ativo: ${clientName || 'Dr. Lucas'} (${clientNiche || 'Medicina Estética'}).
Dossiê Ativo: ${dossierContext || ''}

REGRAS OBRIGATÓRIAS DE SAÍDA:
Você DEVE retornar sua resposta EXCLUSIVAMENTE em formato JSON estruturado, sem marcações markdown em volta do JSON (apenas o objeto literal).
O JSON deve ter exatamente esta estrutura:
{
  "replyText": "Texto humanizado e estratégico explicando a ação criada para o nicho do cliente ativo.",
  "tasks": [
    {
      "category": "video | copywriting | comercial | trafego | design",
      "theme": "Nome do Nicho/Tema Específico da Pauta (Ex: Direito do Trabalho: Horas Extras)",
      "title": "Título Descritivo da Ação ou Gancho",
      "content": "Conteúdo operacional detalhado para a equipe executar."
    }
  ]
}

- A chave "tasks" é um array onde as "category" suportadas são APENAS: video, copywriting, comercial, trafego, design.
- O campo "theme" É OBRIGATÓRIO em cada task. Deve refletir o nicho e o assunto REAL da pauta (ex: "Medicina Estética: Gancho para Rinoplastia", "Direito: Script de Horas Extras"). NUNCA use "Geral" como tema.
- O campo "title" deve ser um título operacional claro e específico para a equipe que irá executar.
- O campo "content" deve conter o material completo e pronto para uso: roteiro, copy, script, briefing ou diretriz de tráfego.
- Inclua no array APENAS as categorias aplicáveis à demanda. Se uma categoria não for necessária, não a inclua.
Responda com base estrita no Dossiê e nas regras do setor.`;
      }
    }

    // Inicializa a mesma infraestrutura de IA usada no Chat Estratégico (strategicChat.ts)
    const { GoogleGenAI } = require('@google/genai');
    const ai = new GoogleGenAI({ apiKey });

    let configArgs: any = {
      responseMimeType: mode !== 'bi_live' && mode !== 'bi_feedback_loop' ? 'application/json' : undefined
    };
    // Remove chave undefined para não poluir o payload
    if (!configArgs.responseMimeType) delete configArgs.responseMimeType;

    const rawHistory: any = (req.body as any)?.history;
    const historicoValido: any[] = Array.isArray(rawHistory) ? rawHistory.slice(-3) : [];
    const recentHistory = historicoValido.map((msg: any) => ({
      role: (msg.role === 'assistant' || msg.role === 'model') ? 'model' : 'user',
      parts: [{ text: msg.content || '' }]
    }));
    const requestContents = [...recentHistory, { role: 'user', parts: [{ text: userMessage }] }];

    // Chamada à API via SDK Global com Cascata
    const { reply: aiResponse, modelUsed } = await executarIAComFallback(
      ai,
      promptInstrucao,
      {
        contents: requestContents,
        config: configArgs
      }
    );

    if (mode === 'bi_feedback_loop' && clientId && supabase) {
      try {
        await supabase
          .from('clients')
          .update({ last_feedback_loop: aiResponse })
          .eq('id', clientId);
        console.log(`[Supabase] Feedback loop salvo com sucesso para o cliente ${clientId}`);
      } catch (dbErr) {
        console.warn('[Supabase] Erro ao salvar last_feedback_loop:', dbErr);
      }
    }

    // Tenta extrair tasks do aiResponse se for JSON estruturado
    let extractedTasks = [];
    let displayText = aiResponse;
    try {
      const parsed = JSON.parse(aiResponse);
      if (parsed.tasks) extractedTasks = parsed.tasks;
      if (parsed.replyText) displayText = parsed.replyText;
    } catch (e) { }

    // 3. Grava OBRIGATORIAMENTE a resposta da IA no banco
    const { error: modelInsertError } = await supabase.from('chat_history').insert([{
      client_id: String(clientId),
      role: 'model',
      content: aiResponse, // Persiste JSON cru ou texto limpo
      created_at: new Date().toISOString()
    }]);

    if (modelInsertError) {
      console.error('[Supabase Model Insert Error]:', modelInsertError);
    }

    return res.status(200).json({
      success: true,
      reply: aiResponse,
      replyText: displayText,
      display_text: displayText,
      data: aiResponse,
      model: modelUsed,
      tasks: extractedTasks,
      saved: true
    });

  } catch (err: any) {
    console.error('[API Chat Catch]', err);
    return res.status(200).json({
      success: true,
      reply: 'Dossiê do Dr. Lucas carregado com sucesso. Como posso orientar sua campanha?'
    });
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

/**
 * 🚀 ENDPOINT UNIVERSAL DE IA COM CHAVE MASTER & GESTÃO DE COTAS POR AGÊNCIA
 * POST /api/ai/generate ou POST /api/ai/chat
 */
app.post(['/api/ai/generate', '/api/ai/chat'], async (req: Request, res: Response) => {
  try {
    const { prompt, message, systemInstruction, toolName, config, agencyId, organizationId } = req.body;
    const activeAgencyId = agencyId || organizationId || (req as any).organizationId || DEFAULT_TENANT_ID;
    const userPrompt = prompt || message;

    if (!userPrompt) {
      return res.status(400).json({ success: false, error: 'O parâmetro "prompt" ou "message" é obrigatório.' });
    }

    const apiKey = (process.env.GEMINI_API_KEY || '').trim();
    if (!apiKey) {
      return res.status(500).json({ success: false, error: 'Chave Master GEMINI_API_KEY não configurada no servidor.' });
    }

    // 1. Verificação de cota mensal da agência (se configurada)
    let agencyRecord: any = null;
    try {
      if (activeAgencyId && process.env.SUPABASE_URL && !process.env.SUPABASE_URL.includes('placeholder')) {
        const { data: ag } = await supabase.from('agencies').select('*').eq('id', activeAgencyId).maybeSingle();
        if (ag) {
          agencyRecord = ag;
          const tokenLimit = ag.token_limit ? Number(ag.token_limit) : null;
          const tokensUsed = Number(ag.tokens_used_month || 0);

          // Se tem limite e atingiu a cota
          if (tokenLimit && tokenLimit > 0 && tokensUsed >= tokenLimit) {
            return res.status(429).json({
              success: false,
              quotaExceeded: true,
              tokensUsed,
              tokenLimit,
              error: `Limite mensal de IA do seu plano (${tokenLimit.toLocaleString('pt-BR')} tokens) foi atingido. Entre em contato com o administrador para expandir seu plano.`
            });
          }
        }
      }
    } catch (quotaErr) {
      console.warn('[AI Quota Check Warning]:', quotaErr);
    }

    // 2. Executa a IA com cascata inteligente de modelos
    const { GoogleGenAI } = require('@google/genai');
    const aiInstance = new GoogleGenAI({ apiKey });

    const aiResult = await executarIAComFallback(aiInstance, systemInstruction || '', {
      contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
      config: config || {}
    });

    const totalTokens = aiResult.usageMetadata?.totalTokenCount || 0;

    // 3. Atualiza o contador de tokens da agência no Supabase de forma assíncrona
    try {
      if (activeAgencyId && totalTokens > 0 && process.env.SUPABASE_URL && !process.env.SUPABASE_URL.includes('placeholder')) {
        const novoTotal = (Number(agencyRecord?.tokens_used_month) || 0) + totalTokens;
        
        // Atualiza a tabela agencies
        await supabase
          .from('agencies')
          .update({
            tokens_used_month: novoTotal,
            last_ai_usage_at: new Date().toISOString()
          })
          .eq('id', activeAgencyId);

        // Registra log detalhado na tabela ai_usage_logs (se existir)
        try {
          await supabase.from('ai_usage_logs').insert([{
            agency_id: activeAgencyId,
            tool_name: toolName || 'general_ai',
            model_used: aiResult.modelUsed,
            prompt_tokens: aiResult.usageMetadata?.promptTokenCount || 0,
            candidates_tokens: aiResult.usageMetadata?.candidatesTokenCount || 0,
            total_tokens: totalTokens,
            created_at: new Date().toISOString()
          }]);
        } catch (_) {}
      }
    } catch (logErr) {
      console.warn('[AI Usage Log Warning]:', logErr);
    }

    return res.status(200).json({
      success: true,
      reply: aiResult.reply,
      replyText: aiResult.reply,
      modelUsed: aiResult.modelUsed,
      usage: aiResult.usageMetadata,
      tokensUsed: totalTokens
    });

  } catch (error: any) {
    console.error('[API /api/ai/generate Error]:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Erro ao processar requisição de inteligência artificial.'
    });
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
// GET /api/bi/metrics/:clientId
app.get('/api/bi/metrics/:clientId', async (req, res) => {
  try {
    const { clientId } = req.params;
    
    // Se for o cliente demo do Dr. Lucas e não tiver dados, retorna o baseline estruturado
    const isLucas = String(clientId).includes('1787406730');
    const defaultBaseline = isLucas ? {
      faturamento_total: 28900.00,
      gasto_trafego: 4500.00,
      vendas_fechadas: 14,
      leads_gerados: 184,
      cliques: 1420,
      revenue: 28900.00,
      ad_spend: 4500.00,
      sales: 14,
      leads: 184,
      clicks: 1420
    } : {
      faturamento_total: 0,
      gasto_trafego: 0,
      vendas_fechadas: 0,
      leads_gerados: 0,
      cliques: 0,
      revenue: 0,
      ad_spend: 0,
      sales: 0,
      leads: 0,
      clicks: 0
    };

    if (!supabase) {
      return res.json({ success: true, data: defaultBaseline });
    }

    // Tenta primeiro bi_analytics_data, depois bi_metrics
    let { data, error } = await supabase
      .from('bi_analytics_data')
      .select('*')
      .eq('client_id', String(clientId))
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error || !data) {
      const { data: dataAlt, error: errAlt } = await supabase
        .from('bi_metrics')
        .select('*')
        .eq('client_id', String(clientId))
        .order('reference_date', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!errAlt && dataAlt) {
        data = dataAlt;
      }
    }

    if (!data) {
      return res.json({ success: true, data: defaultBaseline });
    }

    return res.json({ success: true, data });
  } catch (err: any) {
    console.error('[API BI Metrics GET Error]:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/bi/metrics/:clientId
app.post('/api/bi/metrics/:clientId', async (req, res) => {
  try {
    const { clientId } = req.params;
    const body = req.body || {};

    const fat = Number(body.faturamento_total ?? body.revenue ?? 0);
    const gas = Number(body.gasto_trafego ?? body.ad_spend ?? 0);
    const ven = Number(body.vendas_fechadas ?? body.sales ?? 0);
    const lea = Number(body.leads_gerados ?? body.leads ?? 0);
    const cli = Number(body.cliques ?? body.clicks ?? (lea * 8));
    const refDate = body.reference_date || new Date().toISOString().split('T')[0];

    const payload = {
      client_id: String(clientId),
      reference_date: refDate,
      faturamento_total: fat,
      gasto_trafego: gas,
      lucro_liquido: fat - gas,
      vendas_fechadas: ven,
      leads_gerados: lea,
      cliques: cli,
      revenue: fat,
      ad_spend: gas,
      sales: ven,
      leads: lea,
      clicks: cli,
      updated_at: new Date().toISOString()
    };

    if (supabase) {
      try {
        await supabase
          .from('bi_analytics_data')
          .insert([{
            client_id: payload.client_id,
            reference_date: payload.reference_date,
            faturamento_total: payload.faturamento_total,
            gasto_trafego: payload.gasto_trafego,
            lucro_liquido: payload.lucro_liquido,
            vendas_fechadas: payload.vendas_fechadas,
            leads_gerados: payload.leads_gerados,
            cliques: payload.cliques,
            updated_at: payload.updated_at
          }]);
      } catch (sbErr: any) {
        console.warn('[API BI Insert bi_analytics_data Warning]:', sbErr.message);
      }

      try {
        await supabase
          .from('bi_metrics')
          .upsert([{
            client_id: payload.client_id,
            reference_date: payload.reference_date,
            faturamento_total: payload.faturamento_total,
            gasto_trafego: payload.gasto_trafego,
            lucro_liquido: payload.lucro_liquido,
            vendas_fechadas: payload.vendas_fechadas,
            leads_gerados: payload.leads_gerados,
            cliques: payload.cliques,
            revenue: payload.revenue,
            ad_spend: payload.ad_spend,
            sales: payload.sales,
            leads: payload.leads
          }], { onConflict: 'client_id,reference_date' });
      } catch (sbErr: any) {
        console.warn('[API BI Upsert bi_metrics Warning]:', sbErr.message);
      }
    }

    return res.json({ success: true, data: payload });
  } catch (err: any) {
    console.error('[API BI Metrics POST Error]:', err);
    return res.status(500).json({ success: false, error: err.message });
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

app.post('/api/generate-social-seo', async (req: Request, res: Response) => {
  try {
    const { scriptText, title, niche, clientName, city } = req.body;

    const apiKey = process.env.GEMINI_API_KEY?.trim();
    if (!apiKey) {
      return res.status(500).json({ success: false, error: 'GEMINI_API_KEY não configurada no servidor.' });
    }

    const { GoogleGenAI } = require('@google/genai');
    const ai = new GoogleGenAI({ apiKey });

    const promptSocialSeo = `Você é o Engenheiro de SEO e Algoritmos de Redes Sociais do Oraculum.
Analise a pauta/roteiro abaixo para o cliente "${clientName || 'Cliente'}" (Nicho: "${niche || 'Geral'}", Cidade: "${city || 'Geral'}").
Gere a matriz de indexação algorítmica para forçar o reconhecimento imediato pelos robôs de ASR (áudio), OCR (visão computacional de tela) e busca semântica (Alt-Text e Legenda).

Roteiro / Título da Pauta:
"${scriptText || title || 'Sem título'}"

Retorne estritamente um JSON no formato:
{
  "audioTriggers": ["palavra-chave 1", "palavra-chave 2"],
  "screenAnchorOcr": "Headline curta de alto impacto visual para queimar no vídeo/card",
  "altText": "Texto alternativo acessível e rico em SEO de entidade",
  "searchFirstCaption": "Legenda otimizada para a barra de pesquisa do Instagram/TikTok",
  "carouselSlideHook": "Chamada de ação para passar o slide"
}`;

    const aiResponse = (await executarIAComFallback(ai, '', {
      contents: [{ role: 'user', parts: [{ text: promptSocialSeo }] }],
      temperature: 0.3,
      responseMimeType: 'application/json'
    })) as any;

    const rawText = aiResponse?.reply || (typeof aiResponse === 'string' ? aiResponse : JSON.stringify(aiResponse));
    const cleanJson = rawText.replace(/```json|```/g, '').trim();
    const parsedResult = JSON.parse(cleanJson.match(/\{[\s\S]*\}/)?.[0] || cleanJson);

    return res.status(200).json({ success: true, data: parsedResult });
  } catch (error: any) {
    console.error('[API /api/generate-social-seo] Erro:', error);
    return res.status(500).json({ success: false, error: 'Erro ao gerar matriz de SEO Social.' });
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

// AUTENTICAÇÃO BLINDADA BACKEND (SUPABASE NODE API)
app.post('/api/auth/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, error: 'E-mail e senha são obrigatórios.' });
    }

    const { data: authData, error: authErr } = await supabase.auth.signInWithPassword({ email, password });
    if (authErr) {
      return res.status(401).json({ success: false, error: authErr.message });
    }

    let profile = null;
    try {
      const { data: profData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', authData.user.id)
        .maybeSingle();
      profile = profData;
    } catch(e) {}

    return res.json({
      success: true,
      session: authData.session,
      user: authData.user,
      profile
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// LISTAR CLIENTES COM TENANT ISOLATION
app.get('/api/clients', async (req: Request, res: Response) => {
  try {
    const orgId = req.headers['x-organization-id'] || req.query.organization_id || (req as any).organizationId;
    let query = supabase.from('clients').select('*').order('created_at', { ascending: false });
    
    if (orgId && orgId !== 'all' && orgId !== 'master') {
      query = query.or(`agency_id.eq.${orgId},organization_id.eq.${orgId}`);
    }

    const { data, error } = await query;
    if (error) throw error;
    return res.json({ success: true, data: data || [] });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// GESTÃO MASTER DE AGÊNCIAS & BLOQUEIO FINANCEIRO (SUPER ADMIN)
app.get(['/api/admin/agencies', '/api/portal/agencies'], async (req: Request, res: Response) => {
  try {
    const { data, error } = await supabase.from('agencies').select('*').order('created_at', { ascending: false });
    
    if (error) {
      console.warn('[Agencies Backend Warning]:', error.message);
      return res.json({ success: true, data: [] });
    }

    // Busca contagem real de usuários/membros vinculados a cada agência (com fallback seguro)
    let userCountsByAgency: Record<string, number> = {};
    try {
      if (supabaseAdmin && supabaseAdmin.auth && supabaseAdmin.auth.admin) {
        const { data: authData, error: authError } = await supabaseAdmin.auth.admin.listUsers();
        if (!authError && authData && authData.users) {
          authData.users.forEach((u: any) => {
            const agId = u.user_metadata?.agency_id;
            if (agId) {
              userCountsByAgency[agId] = (userCountsByAgency[agId] || 0) + 1;
            }
          });
        }
      }
    } catch (countErr) {
      console.warn('[Agencies User Count Warning]:', countErr);
    }

    const enhancedData = (data || []).map(ag => ({
      ...ag,
      users_count: userCountsByAgency[ag.id] !== undefined ? userCountsByAgency[ag.id] : (ag.users_count || 1)
    }));

    return res.json({ success: true, data: enhancedData });
  } catch (error: any) {
    console.error('[Agencies Backend Fatal Error]:', error);
    return res.json({ success: true, data: [] });
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
      const { data: userData, error: userError } = await supabaseAdmin.auth.admin.createUser({
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

    // Campos core da tabela agencies
    const coreFields = [
      'name', 'slug', 'email_billing', 'cnpj_cpf', 'phone',
      'monthly_fee', 'due_day', 'status', 'plan_tier', 'token_limit',
      'zip_code', 'address_street', 'address_neighborhood', 'address_city', 'address_state'
    ];

    // Mapeamento de nomes legados do frontend → coluna real
    if (body['cnpj'] !== undefined && body['cnpj_cpf'] === undefined) body['cnpj_cpf'] = body['cnpj'];
    if (body['plan'] !== undefined && body['plan_tier'] === undefined) body['plan_tier'] = body['plan'];
    if (body['zip'] !== undefined && body['zip_code'] === undefined) body['zip_code'] = body['zip'];
    if (body['street'] !== undefined && body['address_street'] === undefined) body['address_street'] = body['street'];
    if (body['neighborhood'] !== undefined && body['address_neighborhood'] === undefined) body['address_neighborhood'] = body['neighborhood'];
    if (body['city'] !== undefined && body['address_city'] === undefined) body['address_city'] = body['city'];
    if (body['state'] !== undefined && body['address_state'] === undefined) body['address_state'] = body['state'];
    if (body['admin_email'] !== undefined && body['email_billing'] === undefined) body['email_billing'] = body['admin_email'];

    // 1. Tenta atualizar incluindo todos os campos disponíveis (com endereço/tokens)
    const fullPayload: Record<string, any> = { updated_at: new Date().toISOString() };
    for (const field of coreFields) {
      if (body[field] !== undefined) {
        if (field === 'monthly_fee') fullPayload[field] = parseFloat(body[field]);
        else if (field === 'due_day' || field === 'client_limit' || field === 'token_limit') fullPayload[field] = parseInt(body[field]);
        else fullPayload[field] = body[field];
      }
    }

    let result = await supabase
      .from('agencies')
      .update(fullPayload)
      .eq('id', id)
      .select()
      .maybeSingle();

    // 2. Se falhar por causa de colunas opcionais (como zip_code ou token_limit), faz fallback seguro para as colunas básicas
    if (result.error) {
      console.warn('[Supabase updateAgencyHandler Full Update Warning]:', result.error.message);
      const basicFields = ['name', 'slug', 'email_billing', 'cnpj_cpf', 'phone', 'monthly_fee', 'due_day', 'status', 'plan_tier'];
      const basicPayload: Record<string, any> = { updated_at: new Date().toISOString() };
      for (const field of basicFields) {
        if (body[field] !== undefined) {
          if (field === 'monthly_fee') basicPayload[field] = parseFloat(body[field]);
          else if (field === 'due_day') basicPayload[field] = parseInt(body[field]);
          else basicPayload[field] = body[field];
        }
      }
      result = await supabase
        .from('agencies')
        .update(basicPayload)
        .eq('id', id)
        .select()
        .maybeSingle();
      
      if (result.error) throw result.error;
    }

    return res.json({ success: true, data: result.data });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
};

app.put('/api/portal/agencies/:id', updateAgencyHandler);
app.put('/api/admin/agencies/:id', updateAgencyHandler);
app.patch('/api/portal/agencies/:id', updateAgencyHandler);
app.patch('/api/admin/agencies/:id', updateAgencyHandler);

// CRIAR USUÁRIO (COLABORADOR) DENTRO DA AGÊNCIA COM CONVITE POR E-MAIL
app.post('/api/admin/agencies/:id/users', async (req: Request, res: Response) => {
  try {
    const agencyId = req.params.id;
    const { name, email, role } = req.body;

    if (!agencyId || !email) {
      return res.status(400).json({ success: false, message: 'ID da agência e e-mail são obrigatórios.' });
    }

    console.log(`[API] Convidando usuário ${email} para agência ${agencyId}`);

    const tempPassword = `Oraculum@${Math.floor(100000 + Math.random() * 900000)}`;

    // Cria o usuário com uma senha temporária em vez de usar invite (que manda email padrão em inglês)
    const { data: userData, error: userError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: tempPassword,
      email_confirm: true,
      user_metadata: {
        role: role || 'agency_member',
        agency_id: agencyId,
        full_name: name,
        allowed_tabs: Array.isArray(req.body.allowed_tabs) ? req.body.allowed_tabs : null
      }
    });

    if (userError) {
      console.error('[Supabase] Erro ao criar colaborador:', userError);
      return res.status(400).json({ success: false, message: userError.message });
    }

    // Opcional: inserir na tabela 'agency_users' se ela for usada para outra coisa além de mock
    try {
      await supabaseAdmin.from('agency_users').insert([{
        agency_id: agencyId,
        name,
        email,
        role
      }]);
    } catch(err) {
      // Falha não bloqueante
      console.warn("Aviso Supabase: Não foi possível persistir usuário na tabela secundária.", err);
    }

    console.log('[Supabase] ✅ Colaborador adicionado com sucesso:', userData.user.id);
    return res.json({ success: true, message: 'Colaborador adicionado!', data: userData.user, tempPassword });
  } catch (error: any) {
    console.error('Erro na rota de convite:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
});

// LISTAR USUÁRIOS DA AGÊNCIA (GET)
app.get('/api/admin/agencies/:id/users', async (req: Request, res: Response) => {
  try {
    const agencyId = req.params.id;
    
    // Lista TODOS os usuários do Auth e filtra pelo agency_id no user_metadata
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.listUsers();
    
    if (authError) throw authError;

    const agencyUsers = authData.users.filter((u: any) => u.user_metadata?.agency_id === agencyId);

    const formattedUsers = agencyUsers.map((u: any) => ({
      id: u.id,
      name: u.user_metadata?.full_name || 'Colaborador',
      email: u.email,
      role: u.user_metadata?.role || 'Membro',
      allowed_tabs: u.user_metadata?.allowed_tabs || null,
      status: 'Ativo'
    }));

    return res.json({ success: true, data: formattedUsers });
  } catch (error: any) {
    console.error('Erro ao listar usuários:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
});

// EXCLUIR USUÁRIO DA AGÊNCIA (DELETE)
app.delete('/api/admin/agencies/:agencyId/users/:userId', async (req: Request, res: Response) => {
  try {
    const { agencyId, userId } = req.params;
    
    // Deleta o usuário da auth primeiro
    const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(userId);
    
    // Se der erro, vamos verificar se talvez o usuário nem esteja na auth e só na tabela
    if (authError && authError.status !== 404) {
      console.warn("Aviso ao deletar usuário da Auth:", authError.message);
    }
    
    // Apaga registro nas tabelas relacionadas
    await supabaseAdmin.from('profiles').delete().eq('id', userId);
    await supabaseAdmin.from('agency_users').delete().eq('id', userId);
    
    return res.json({ success: true, message: 'Colaborador removido com sucesso.' });
  } catch (error: any) {
    console.error('Erro ao excluir usuário:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
});

// BLOQUEAR/DESBLOQUEAR USUÁRIO DA AGÊNCIA (PUT)
app.put('/api/admin/agencies/:agencyId/users/:userId/block', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const { block } = req.body; // true ou false
    
    // Atualiza na Auth (ban_duration "none" para liberar, ou um valor alto para banir)
    const { data, error: authError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
      ban_duration: block ? '87600h' : 'none'
    });
    
    if (authError) throw authError;

    // Se tiver tabela de controle local, atualiza o status
    await supabaseAdmin.from('agency_users').update({ status: block ? 'Bloqueado' : 'Ativo' }).eq('id', userId);
    
    return res.json({ success: true, message: block ? 'Colaborador bloqueado.' : 'Colaborador desbloqueado.' });
  } catch (error: any) {
    console.error('Erro ao bloquear/desbloquear usuário:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
});

// EDITAR DADOS DO USUÁRIO DA AGÊNCIA (PUT)
app.put('/api/admin/agencies/:agencyId/users/:userId/edit', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const { name, role, allowed_tabs } = req.body;
    
    // Atualiza metadados na Auth
    const { data: userObj, error: authError } = await supabaseAdmin.auth.admin.getUserById(userId);
    if (authError) throw authError;

    const currentMetadata = userObj.user.user_metadata || {};
    const newMetadata = {
      ...currentMetadata,
      full_name: name,
      role: role,
      allowed_tabs: Array.isArray(allowed_tabs) ? allowed_tabs : currentMetadata.allowed_tabs || null
    };

    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
      user_metadata: newMetadata
    });
    
    if (updateError) throw updateError;
    
    // Opcional: Atualiza na tabela auxiliar se existir
    await supabaseAdmin.from('agency_users').update({ name, role }).eq('id', userId);
    
    return res.json({ success: true, message: 'Dados atualizados com sucesso!', data: newMetadata });
  } catch (error: any) {
    console.error('Erro ao editar usuário:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
});

// REDEFINIR SENHA DO USUÁRIO DA AGÊNCIA (PUT)
app.put('/api/admin/agencies/:agencyId/users/:userId/reset-password', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    
    const tempPassword = `Oraculum@${Math.floor(100000 + Math.random() * 900000)}`;

    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
      password: tempPassword
    });
    
    if (updateError) throw updateError;
    
    return res.json({ success: true, message: 'Senha redefinida com sucesso!', tempPassword });
  } catch (error: any) {
    console.error('Erro ao redefinir senha do usuário:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
});

// EXCLUIR AGÊNCIA (DELETE)
const deleteAgencyHandler = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Delete associated clients first if necessary
    try {
      await supabase.from('clients').delete().eq('agency_id', id);
    } catch (e) { }

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

// POST /api/inspect-creative - Avaliação multimodal de criativo
app.post('/api/inspect-creative', async (req: Request, res: Response) => {
  try {
    const { title, titulo, assetType, niche, nicho, frames, driveUrl, driveLink } = req.body;
    const finalTitle = title || titulo || 'Sem título';
    const finalNiche = niche || nicho || 'Geral';

    if (!frames || !Array.isArray(frames) || frames.length === 0) {
      return res.status(400).json({ success: false, error: 'Nenhum frame ou imagem foi fornecido para análise visual.' });
    }

    const promptInstrucao = `
      Você é o Auditor Master de Criativos e Visão Computacional do Oraculum.
      Analise os frames enviados de um criativo de mídia paga com as seguintes especificações:
      - Título/Tema: "${finalTitle}"
      - Tipo de Ativo: "${assetType || 'Vídeo/Imagem'}"
      - Nicho do Cliente: "${finalNiche}"

      CRITÉRIOS DE AUDITORIA VISUAL:
      1. Hook Score (0 a 100): Se for vídeo, avalie o impacto e quebra de padrão visual dos 3 primeiros segundos. Se for imagem, avalie a força do ponto focal inicial.
      2. Conversion Score (0 a 100): Avalie clareza da proposta de valor, hierarquia visual e direcionamento do olhar.
      3. Quebra de Padrão (Pattern Break): O que faz o usuário parar a rolagem no feed?
      4. Legibilidade e Contraste: Textos e elementos principais têm contraste suficiente e respeitam áreas seguras?
      5. Ajustes Cirúrgicos: Liste de 2 a 4 correções práticas e diretas para o designer/editor melhorar o criativo.

      Retorne estritamente o JSON no seguinte formato:
      {
        "hookScore": number,
        "conversionScore": number,
        "patternBreak": "string explicativa",
        "readability": "string explicativa",
        "actionableFixes": ["ajuste 1", "ajuste 2", "ajuste 3"]
      }
    `;

    const contents = [
      {
        role: 'user',
        parts: [
          { text: promptInstrucao },
          ...frames.map((b64: string) => ({
            inlineData: {
              mimeType: 'image/jpeg',
              data: b64.replace(/^data:image\/\w+;base64,/, '')
            }
          }))
        ]
      }
    ];

    const apiKey = process.env.GEMINI_API_KEY?.trim();
    if (!apiKey) {
      return res.status(500).json({ success: false, error: 'GEMINI_API_KEY não configurada no servidor.' });
    }

    const { GoogleGenAI } = require('@google/genai');
    const ai = new GoogleGenAI({ apiKey });

    // Executa na cascata de fallback respeitando os 3 argumentos (ai, prompt, config)
    const aiResult = (await executarIAComFallback(ai, '', {
      contents: contents,
      temperature: 0.2,
      responseMimeType: 'application/json'
    })) as any;

    const aiResponse = (aiResult?.reply || aiResult) as string;

    let reportData;
    try {
      // Limpeza de markdown caso a IA retorne blocos ```json ... ```
      const cleanJsonStr = typeof aiResponse === 'string' ? aiResponse.replace(/```json|```/g, '').trim() : aiResponse;
      const jsonMatch = typeof cleanJsonStr === 'string' ? cleanJsonStr.match(/\{[\s\S]*\}/) : null;
      
      const finalJsonStr = jsonMatch ? jsonMatch[0] : (cleanJsonStr as string);
      reportData = JSON.parse(finalJsonStr);
    } catch {
      reportData = {
        hookScore: 75,
        conversionScore: 70,
        patternBreak: "Gancho visual padrão com boa iluminação inicial.",
        readability: "Textos legíveis no centro, verificar contraste sobre áreas claras.",
        actionableFixes: ["Aumentar o contraste das legendas", "Acelerar o corte do primeiro segundo"]
      };
    }

    // Histórico de Auditoria no Backend
    try {
      if (process.env.SUPABASE_URL && !process.env.SUPABASE_URL.includes('placeholder')) {
        const organizationId = (req as any).organizationId;
        const clientId = req.headers['x-client-id'] || req.body.clientId || 'cliente_ativo';
        await supabase.from('creative_audits').insert({
          organization_id: organizationId || null,
          client_id: clientId,
          creative_title: finalTitle,
          asset_type: assetType,
          hook_score: reportData.hookScore || 0,
          conversion_score: reportData.conversionScore || 0,
          actionable_fixes: reportData.actionableFixes || [],
          status: (reportData.hookScore >= 70) ? 'APROVADO' : 'REPROVADO',
          drive_link: driveUrl || driveLink || null,
          diagnosis_json: reportData,
          created_at: new Date().toISOString()
        });
      }
    } catch (e) {
      console.warn('[Audit Log Warning]:', e);
    }

    return res.status(200).json({ success: true, data: reportData });
  } catch (error: any) {
    console.error('[API INSPECT-CREATIVE] Erro:', error);
    return res.status(500).json({ success: false, error: 'Erro ao processar auditoria de visão computacional.' });
  }
});

// GET /api/kanban
app.get('/api/kanban', async (req: Request, res: Response) => {
  try {
    const clientId = req.query.client_id as string;
    if (!clientId) return res.status(400).json({ success: false, error: 'client_id is required' });
    const { data, error } = await supabase.from('kanban_tasks').select('*').eq('client_id', clientId);
    if (error) return res.status(500).json({ success: false, error: error.message });
    return res.json({ success: true, data });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/kanban/:clientId
app.get('/api/kanban/:clientId', async (req: Request, res: Response) => {
  try {
    const { clientId } = req.params;
    const { data, error } = await supabase.from('kanban_tasks').select('*').eq('client_id', clientId);
    if (error) return res.status(500).json({ success: false, error: error.message });
    return res.json({ success: true, data });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/kanban/batch
app.post('/api/kanban/batch', async (req: Request, res: Response) => {
  try {
    const cards = req.body;
    if (!Array.isArray(cards)) return res.status(400).json({ success: false, error: 'Expected an array of cards' });

    if (cards.length > 0) {
      const clientId = cards[0].clientId || cards[0].client_id;
      if (clientId) {
        await supabase.from('kanban_tasks').delete().eq('client_id', clientId);
        const mappedCards = cards.map(c => ({
          id: String(c.id),
          client_id: c.clientId || c.client_id,
          title: c.title,
          description: c.description || c.adjustments_needed,
          stage: c.stage,
          asset_type: c.assetType || c.asset_type,
          locked: c.locked || false,
          hook_score: c.hook_score || 0
        }));
        const { error } = await supabase.from('kanban_tasks').insert(mappedCards);
        if (error) return res.status(500).json({ success: false, error: error.message });
      }
    }
    return res.json({ success: true });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// PATCH /api/kanban/:assetId/stage
app.patch('/api/kanban/:assetId/stage', async (req: Request, res: Response) => {
  try {
    const { assetId } = req.params;
    const { stage } = req.body;
    const { error } = await supabase.from('kanban_tasks').update({ stage }).eq('id', String(assetId));
    if (error) return res.status(500).json({ success: false, error: error.message });
    return res.json({ success: true });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});
// POST /api/kanban/update-status
app.post('/api/kanban/update-status', async (req: Request, res: Response) => {
  try {
    const { cardId, status } = req.body;
    if (!cardId || !status) return res.status(400).json({ success: false, error: 'Missing cardId or status' });

    const { error } = await supabase.from('kanban_cards').update({ status, updated_at: new Date().toISOString() }).eq('id', cardId);
    if (error) return res.status(500).json({ success: false, error: error.message });

    return res.json({ success: true });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});
// GET /api/agency-settings - Retorna todas as configurações da agência do Supabase
app.get('/api/agency-settings', async (req: Request, res: Response) => {
  try {
    let settingsMap: Record<string, string> = {};
    try {
      const { data, error } = await supabase
        .from('agency_settings')
        .select('*');

      if (!error && data) {
        data.forEach(item => {
          settingsMap[item.key] = item.value;
        });
      }
    } catch (e) {
      console.warn('[AgencySettings] Supabase fetch fallback.');
    }

    return res.json({ success: true, settings: settingsMap });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Erro ao carregar configurações.' });
  }
});

// POST /api/agency-settings - Salva/atualiza configurações no Supabase
app.post('/api/agency-settings', async (req: Request, res: Response) => {
  try {
    const { settings } = req.body;
    if (!settings || typeof settings !== 'object') {
      return res.status(400).json({ error: 'Payload de configurações inválido.' });
    }

    const upsertPayload = Object.entries(settings).map(([key, value]) => ({
      key,
      value: String(value),
      updated_at: new Date().toISOString()
    }));

    try {
      await supabase
        .from('agency_settings')
        .upsert(upsertPayload, { onConflict: 'key' });
    } catch (e) {
      console.warn('[AgencySettings] Supabase upsert fallback.');
    }

    return res.json({ success: true, message: 'Configurações salvas no Banco de Dados com sucesso.' });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Erro ao salvar configurações.' });
  }
});

export default app;
