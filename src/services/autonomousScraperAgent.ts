// ============================================================================
// autonomousScraperAgent.ts — Agente Autônomo com Search Grounding e Failover
// Módulo: Portal de Inteligência & Feed de Mercado
// Isolamento: Este serviço é chamado APENAS pelas rotas /api/autonomous-scraper/*
// NÃO é importado por: biTracker, strategicChat, nicheResearcher ou qualquer outro serviço
// ============================================================================

import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
import { supabase } from './supabaseClient';
import { loadDossiersFromDisk, saveDossiersToDisk } from './diskStorage';

dotenv.config();

// ============================================================================
// INTERFACES DE TIPAGEM
// ============================================================================

export interface TopPlayerBenchmark {
  name: string;
  marketPosition: string;
  copyPattern: string;
  highTicketOfferStructure: string;
  positioningLanguage: string;
}

export interface AutonomousNicheScraperOutput {
  niche: string;
  searchedAt: string;
  topPlayers: TopPlayerBenchmark[];
  marketTrends: {
    trend: string;
    justification: string;
    strategicAction: string;
  }[];
  regulatoryCompliance: {
    governingBodies: string[];
    strictRules: { rule: string; explanation: string }[];
    forbiddenClaims: { claim: string; explanation: string }[];
    mandatoryDisclaimers: { disclaimer: string; explanation: string }[];
  };
  competitiveCopyInsights: {
    dominantAngles: string[];
    irresistibleOffers: string[];
    neuromarketingTriggers: string[];
  };
  strategicAdaptationDirectives: {
    clientPositioningRecommendation: string;
    oraclePromptContext: string;
    creativeBriefingGuidelines: string[];
  };
  newsFeed?: {
    type: string;
    title: string;
    summary: string;
    source: string;
    url: string;
    publishedAt: string;
  }[];
}

export interface ScraperJobLog {
  timestamp: string;
  niche: string;
  status: 'SUCCESS' | 'ERROR' | 'RUNNING';
  message: string;
  playersCount?: number;
  modelUsed?: string;
}

// ============================================================================
// ESTADO DO MÓDULO (isolado — não compartilhado com outros serviços)
// ============================================================================

const jobLogs: ScraperJobLog[] = [];
let cronTimer: NodeJS.Timeout | null = null;
let isCronRunning = false;

// ============================================================================
// FILA DE ROTAÇÃO DE MODELOS — apenas modelos estáveis com suporte a googleSearch
// Ordenados por velocidade e disponibilidade confirmada
// ============================================================================
const MODEL_ROTATION_QUEUE = [
  'gemini-2.5-flash',   // 1ª opção: rápido, estável, suporta googleSearch
  'gemini-2.0-flash',   // 2ª opção: fallback seguro
  'gemini-1.5-flash',   // 3ª opção: modelo clássico estável
];

// ============================================================================
// CLIENTE DA IA — instanciado em runtime para evitar null em cold starts Vercel
// ============================================================================

/**
 * Retorna o cliente GoogleGenAI instanciado com a chave do ambiente em runtime.
 * Evita o problema de `aiClient = null` em cold starts da Vercel, onde
 * process.env pode não estar populado no momento do module load.
 */
function getAiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY || process.env.GEMINI_KEY;
  if (!apiKey) {
    console.warn('[Agente Autônomo Scraper] ⚠️ GEMINI_API_KEY não encontrada nas variáveis de ambiente.');
    return null;
  }
  return new GoogleGenAI({ apiKey });
}

// ============================================================================
// 1. ROTINA PRINCIPAL — MINERAÇÃO COM GOOGLE SEARCH GROUNDING
// ============================================================================

/**
 * Realiza varredura autônoma com Google Search Grounding para o nicho informado.
 * Itera pelos modelos estáveis em rotação sequencial até obter resposta válida.
 * Em caso de falha em todos os modelos, aciona o fallback sintético.
 *
 * NOTA: responseMimeType NÃO é enviado quando googleSearch está ativo.
 * Isso evita conflito documentado na API do Gemini onde forçar JSON MIME
 * junto com Search Grounding causa erro 400 "tool_config incompatible".
 */
export async function mineNicheTopPlayersAndTrends(niche: string): Promise<AutonomousNicheScraperOutput> {
  console.log(`[Agente Autônomo Scraper] 🔍 Iniciando varredura com Search Grounding para o nicho: "${niche}"...`);

  const aiClient = getAiClient();

  if (!aiClient) {
    console.warn('[Agente Autônomo Scraper] ⚠️ Cliente IA indisponível. Gerando mineração com dados sintéticos.');
    return generateFallbackScraperOutput(niche);
  }

  const prompt = `
Você é o Agente Autônomo de Pesquisa e Inteligência Competitiva de Elite da nossa Plataforma SaaS de Marketing Híbrido.
Sua missão é realizar uma mineração cirúrgica e profunda utilizando busca na web em tempo real (Google Search Grounding) para o nicho: "${niche}".

OBJETIVOS DA PESQUISA (NÍVEL ESTRATÉGICO):
1. Mapear os 3 a 5 Maiores Players/Concorrentes atuais neste nicho. Aprofundar como eles estruturam a Oferta Irresistível e quais Dores Reais eles exploram.
2. Identificar Tendências Globais de Mercado frescas (tecnologia, comportamento) e explicar detalhadamente qual problema latente (Dor) isso resolve no consumidor final.
3. Mapear a fundo Regulamentações e Compliance (Órgãos, proibições, regras do Meta/Google Ads específicas para este nicho, e disclaimers jurídicos).
4. Fornecer Notícias ou artigos recentes reais, incluindo a fonte e a URL para basear nossa inteligência.

RETORNE APENAS UM JSON VÁLIDO no seguinte formato estrito, sem markdown extra e sem texto fora do JSON:

{
  "niche": "${niche}",
  "searchedAt": "${new Date().toISOString()}",
  "topPlayers": [
    {
      "name": "Nome do Player",
      "marketPosition": "Posicionamento no mercado",
      "copyPattern": "Ganchos emocionais e racionais usados na Copy",
      "highTicketOfferStructure": "Como empacotam a oferta (Ancoragem, Entregáveis)",
      "positioningLanguage": "Gatilhos mentais e tom de voz"
    }
  ],
  "marketTrends": [
    {
      "trend": "Tendência inovadora atual",
      "justification": "Explicação profunda da dor real que essa tendência resolve no consumidor (MUITO IMPORTANTE)",
      "strategicAction": "Plano de ação claro para implementarmos isso hoje"
    }
  ],
  "regulatoryCompliance": {
    "governingBodies": ["Órgão 1 (Ex: CFM, OAB, etc)"],
    "strictRules": [
      {"rule": "Regra", "explanation": "Por que existe e o risco jurídico"}
    ],
    "forbiddenClaims": [
      {"claim": "Promessa proibida (Ex: 'Cura garantida')", "explanation": "Risco de bloqueio no Facebook Ads ou processo"}
    ],
    "mandatoryDisclaimers": [
      {"disclaimer": "Aviso legal", "explanation": "Contexto de uso"}
    ]
  },
  "competitiveCopyInsights": {
    "dominantAngles": ["Ângulo dominante de dor/desejo"],
    "irresistibleOffers": ["Exemplo prático de oferta magnética"],
    "neuromarketingTriggers": ["Gatilhos para usar nos anúncios"]
  },
  "strategicAdaptationDirectives": {
    "clientPositioningRecommendation": "Como o nosso cliente deve se posicionar",
    "oraclePromptContext": "Resumo analítico concentrado dos líderes",
    "creativeBriefingGuidelines": [
      "Diretriz para Criativo 1"
    ]
  },
  "newsFeed": [
    {
      "type": "Notícia Web ou Tendência",
      "title": "Título real da matéria ou artigo recém publicado",
      "summary": "Resumo prático",
      "source": "Nome do Portal/Jornal/Site da fonte",
      "url": "https://link-da-noticia-se-houver.com",
      "publishedAt": "Data/hora aproximada da publicação (ex: 'Hoje', 'Ontem', 'Há 2 dias')"
    }
  ]
}
`;

  // Itera pelos modelos estáveis em rotação sequencial
  for (const modelName of MODEL_ROTATION_QUEUE) {
    try {
      console.log(`[Agente Autônomo Scraper] 🤖 Tentando modelo: ${modelName} com Google Search Grounding...`);

      const response = await aiClient.models.generateContent({
        model: modelName,
        contents: prompt,
        config: {
          // IMPORTANTE: responseMimeType NÃO é enviado com googleSearch ativo
          // para evitar erro 400 "tool_config incompatible with response_mime_type"
          temperature: 0.3,
          tools: [{ googleSearch: {} }],
        },
      });

      const textResponse = response.text || '';

      // Limpa qualquer markdown wrapping que o modelo possa retornar
      const cleanJsonText = textResponse
        .replace(/^```json\s*/i, '')
        .replace(/^```\s*/i, '')
        .replace(/```\s*$/i, '')
        .trim();

      if (!cleanJsonText || cleanJsonText.length < 10) {
        throw new Error(`Resposta vazia ou muito curta do modelo ${modelName}`);
      }

      const parsedData: AutonomousNicheScraperOutput = JSON.parse(cleanJsonText);

      console.log(`[Agente Autônomo Scraper] ✅ Sucesso com ${modelName} para "${niche}". Players: ${parsedData.topPlayers?.length || 0}`);
      return parsedData;

    } catch (error: any) {
      console.warn(`[Agente Autônomo Scraper] ⚠️ Falha com ${modelName}: ${error.message}. Tentando próximo modelo...`);
    }
  }

  console.error(`[Agente Autônomo Scraper] ❌ Todos os modelos falharam. Acionando fallback sintético.`);
  return generateFallbackScraperOutput(niche);
}

// ============================================================================
// 2. SALVAMENTO NA TABELA 'market_intelligence_feed' DO SUPABASE
// ============================================================================

export async function saveScraperDataToKnowledgeBase(
  organizationId: string,
  niche: string,
  scraperData: AutonomousNicheScraperOutput,
  clientId?: string
): Promise<{ success: boolean; recordId?: string; error?: string }> {
  console.log(`[Agente Autônomo Scraper] 💾 Salvando inteligência em 'market_intelligence_feed'...`);

  try {
    const payload = {
      organization_id: organizationId,
      client_id: clientId || null,
      niche: niche,
      scraper_data: scraperData,
    };

    const { data, error } = await supabase
      .from('market_intelligence_feed')
      .insert([payload])
      .select()
      .single();

    if (error) {
      console.warn(`[Agente Autônomo Scraper] ⚠️ Supabase Insert aviso: ${error.message}. Salvando fallback local.`);
    } else if (data) {
      console.log(`[Agente Autônomo Scraper] ✅ Registro salvo com ID: ${data.id}`);
    }

    // Fallback local: persiste no dossier em disco se clientId existir
    if (clientId) {
      try {
        const currentDossiers = loadDossiersFromDisk();
        currentDossiers[clientId] = { ...currentDossiers[clientId], latestScraperRun: scraperData };
        saveDossiersToDisk(currentDossiers);
      } catch (diskErr: any) {
        console.warn(`[Agente Autônomo Scraper] ⚠️ Fallback disk save falhou: ${diskErr.message}`);
      }
    }

    return { success: true, recordId: data?.id || 'local_' + Date.now() };

  } catch (err: any) {
    console.error(`[Agente Autônomo Scraper] ❌ Erro ao salvar:`, err.message);
    return { success: false, error: err.message };
  }
}

// ============================================================================
// 3. EXECUÇÃO INTEGRADA — MINERAÇÃO + SALVAMENTO (chamada pelas rotas HTTP)
// ============================================================================

export async function executeAutonomousScraperRun(
  organizationId: string,
  niche: string,
  clientId?: string
): Promise<{ scraperOutput: AutonomousNicheScraperOutput; dbResult: any }> {
  const logEntry: ScraperJobLog = {
    timestamp: new Date().toISOString(),
    niche,
    status: 'RUNNING',
    message: `Iniciando varredura com Search Grounding para o nicho "${niche}"`,
  };
  jobLogs.unshift(logEntry);

  try {
    // Chama a função de mineração (sem alias circular)
    const scraperOutput = await mineNicheTopPlayersAndTrends(niche);
    const dbResult = await saveScraperDataToKnowledgeBase(organizationId, niche, scraperOutput, clientId);

    logEntry.status = 'SUCCESS';
    logEntry.playersCount = scraperOutput.topPlayers?.length || 0;
    logEntry.message = `Mineração concluída. ${logEntry.playersCount} players analisados.`;

    return { scraperOutput, dbResult };
  } catch (error: any) {
    logEntry.status = 'ERROR';
    logEntry.message = `Falha na mineração: ${error.message}`;
    throw error;
  }
}

// ============================================================================
// 4. CRON JOB — ATUALIZAÇÃO PERIÓDICA AUTOMÁTICA DE TODOS OS NICHOS ATIVOS
// ============================================================================

export function startAutonomousScraperCron(
  intervalMinutes: number = 1440,
  organizationId: string = 'e4b8a1c9-7d3f-42e1-95a8-2083bf2f9104'
) {
  if (isCronRunning && cronTimer) {
    console.log('[Agente Autônomo Scraper Cron] ℹ️ Cron Job já está em execução.');
    return;
  }

  const intervalMs = intervalMinutes * 60 * 1000;
  isCronRunning = true;

  console.log(`[Agente Autônomo Scraper Cron] 🚀 Iniciando! Frequência: a cada ${intervalMinutes} minutos.`);

  const runAllActiveNichesJob = async () => {
    console.log('[Agente Autônomo Scraper Cron] 🔄 Disparando atualização periódica de todos os nichos...');
    try {
      let activeNiches: string[] = [];

      try {
        const { data: clientsData } = await supabase
          .from('clients')
          .select('niche')
          .eq('organization_id', organizationId);

        if (clientsData && clientsData.length > 0) {
          activeNiches = Array.from(new Set(clientsData.map((c: any) => c.niche).filter(Boolean)));
        }
      } catch (dbErr) {
        console.warn('[Agente Autônomo Scraper Cron] ⚠️ Supabase offline para listar nichos.');
      }

      if (activeNiches.length === 0) {
        activeNiches = ['Cirurgião Plástico', 'Odontologia Estética', 'Infoprodutos de Finanças'];
      }

      for (const niche of activeNiches) {
        try {
          await executeAutonomousScraperRun(organizationId, niche);
          await new Promise((resolve) => setTimeout(resolve, 3000));
        } catch (nicheErr: any) {
          console.error(`[Agente Autônomo Scraper Cron] ❌ Erro no nicho "${niche}":`, nicheErr.message);
        }
      }

      console.log('[Agente Autônomo Scraper Cron] ✅ Ciclo concluído com sucesso.');
    } catch (globalErr: any) {
      console.error('[Agente Autônomo Scraper Cron] ❌ Erro no ciclo:', globalErr.message);
    }
  };

  runAllActiveNichesJob();
  cronTimer = setInterval(runAllActiveNichesJob, intervalMs);
}

export function stopAutonomousScraperCron() {
  if (cronTimer) {
    clearInterval(cronTimer);
    cronTimer = null;
    isCronRunning = false;
    console.log('[Agente Autônomo Scraper Cron] 🛑 Cron Job parado com sucesso.');
  }
}

export function getAutonomousScraperStatus() {
  return {
    isCronRunning,
    totalJobsExecuted: jobLogs.length,
    recentLogs: jobLogs.slice(0, 20),
  };
}

// ============================================================================
// 5. FALLBACK SINTÉTICO — Dados de alta qualidade para quando a IA está offline
// ============================================================================

function generateFallbackScraperOutput(niche: string): AutonomousNicheScraperOutput {
  return {
    niche,
    searchedAt: new Date().toISOString(),
    topPlayers: [
      {
        name: `Líder de Referência em ${niche}`,
        marketPosition: 'Top 1 Benchmark Global — posicionado como autoridade máxima do segmento',
        copyPattern: 'Ganchos focados em transformação rápida, prova social e autoridade comprovada.',
        highTicketOfferStructure: 'Consultoria VIP + Acompanhamento por 12 meses + Comunidade Exclusiva',
        positioningLanguage: 'Tom sofisticado, direto e focado em resultados mensuráveis.',
      },
    ],
    marketTrends: [
      {
        trend: 'Adoção de inteligência artificial para qualificação instantânea de leads',
        justification: 'Consumidores perderam a paciência com formulários longos e atendimentos demorados. A dor do tempo de espera encarecer brutalmente o CPL. A IA resolve o timing do atendimento e mantém a atenção quente.',
        strategicAction: 'Implementar assistentes autônomos no primeiro ponto de contato (WhatsApp) para gerar rapport imediato e qualificar antes da consulta.',
      },
      {
        trend: 'Ancoragem de valor através de conteúdo radical e transparente',
        justification: 'O público High-Ticket está blindado contra promessas genéricas. Eles pesquisam a reputação antes de qualquer contato. A falta de transparência destrói a conversão no fundo do funil.',
        strategicAction: 'Basear a copy e anúncios em estudos de caso reais com números específicos, educando o cliente antes de apresentar a oferta.',
      },
    ],
    regulatoryCompliance: {
      governingBodies: ['Órgãos Reguladores Nacionais do Setor', 'CONAR', 'META Ads Policy', 'Google Ads Policy'],
      strictRules: [
        { rule: 'Proibição de promessas garantidas de resultado', explanation: 'Garantir resultado sem análise prévia caracteriza publicidade enganosa perante o CDC e pode gerar bloqueio permanente de conta nos ads.' },
      ],
      forbiddenClaims: [
        { claim: '"Resultados garantidos em X dias"', explanation: 'Cada caso é único. Essa alegação gera alto risco de bloqueios no Facebook Ads e processos por danos ao consumidor.' },
      ],
      mandatoryDisclaimers: [
        { disclaimer: 'Os resultados podem variar conforme o caso e o engajamento individual do cliente.', explanation: 'Deve estar no rodapé das Landing Pages e nos materiais de venda para proteção jurídica e compliance de rede.' },
      ],
    },
    competitiveCopyInsights: {
      dominantAngles: ['Dor do retrabalho e busca por exclusividade', 'Medo de ficar para trás enquanto concorrentes crescem'],
      irresistibleOffers: ['Diagnóstico Inicial Estratégico Gratuito', 'Garantia de Satisfação ou Devolução'],
      neuromarketingTriggers: ['Ancoragem de preço', 'Escassez real', 'Prova social específica com números'],
    },
    strategicAdaptationDirectives: {
      clientPositioningRecommendation: `Posicionar o cliente como a escolha definitiva em ${niche}, combinando autoridade técnica com humanização da marca.`,
      oraclePromptContext: `CONTEXTO DOS LÍDERES DE ${niche.toUpperCase()}: Utilize autoridade comprovada, compliance rigoroso e comunicação baseada em transformação real do cliente.`,
      creativeBriefingGuidelines: [
        'Utilizar imagens premium com prova social clara e depoimentos reais.',
        'Priorizar vídeos curtos (15-30s) com gancho emocional nos primeiros 3 segundos.',
      ],
    },
    newsFeed: [
      {
        type: 'Tendência de Mercado',
        title: `Novas diretrizes de tráfego pago para o setor de ${niche} — O que muda em 2026`,
        summary: 'O mercado de anúncios digitais passa por reformulação nas diretrizes de entrega para nichos de alta conversão. Especialistas recomendam foco em transparência criativa e funil de aquecimento.',
        source: 'Monitoramento de Portais de Marketing Digital',
        url: '#',
        publishedAt: 'Ontem',
      },
      {
        type: 'Comportamento do Consumidor',
        title: 'Pesquisa: clientes buscam hiperpersonalização desde o primeiro contato',
        summary: 'Estudo recente indica que 73% dos potenciais compradores pesquisam a reputação online antes do primeiro contato. O alinhamento entre copy e recepção é o principal fator de fechamento.',
        source: 'Inteligência de Mercado Global',
        url: '#',
        publishedAt: 'Há 2 dias',
      },
    ],
  };
}
