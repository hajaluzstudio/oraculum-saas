import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
import { supabase } from './supabaseClient';
import { localDossiersStore, saveDossiersToDisk } from './diskStorage';

dotenv.config();

/**
 * Interface dos Maiores Players (Benchmarks Globais / Nacionais)
 */
export interface TopPlayerBenchmark {
  name: string;
  marketPosition: string; // ex: "Líder de Mercado Nacional", "Referência Global High-Ticket"
  copyPattern: string;    // Padrão de comunicação, ganchos e promessas utilizadas
  highTicketOfferStructure: string; // Como estruturam a oferta principal e entregáveis
  positioningLanguage: string;     // Tom de voz, vocabulário e gatilhos mentais predominantes
}

/**
 * Interface dos Dados Minerados pelo Agente Autônomo de Pesquisa
 */
export interface AutonomousNicheScraperOutput {
  niche: string;
  searchedAt: string;
  topPlayers: TopPlayerBenchmark[];
  marketTrends: string[];
  regulatoryCompliance: {
    governingBodies: string[]; // ex: CFM, OAB, ANVISA, CVM, PROCON
    strictRules: string[];    // Regras rígidas de publicidade
    forbiddenClaims: string[]; // Alegações estritamente proibidas
    mandatoryDisclaimers: string[]; // Avisos e termos obrigatórios
  };
  competitiveCopyInsights: {
    dominantAngles: string[];
    irresistibleOffers: string[];
    neuromarketingTriggers: string[];
  };
  strategicAdaptationDirectives: {
    clientPositioningRecommendation: string;
    oraclePromptContext: string; // Texto formatado para alimentar diretamente o Oráculo Gemini
    creativeBriefingGuidelines: string[]; // Diretrizes práticas para o gerador de criativos
  };
}

/**
 * Log interno da rotina de raspagem e background jobs
 */
export interface ScraperJobLog {
  timestamp: string;
  niche: string;
  status: 'SUCCESS' | 'ERROR' | 'RUNNING';
  message: string;
  playersCount?: number;
}

// Histórico de logs da rotina em memória
const jobLogs: ScraperJobLog[] = [];
let cronTimer: NodeJS.Timeout | null = null;
let isCronRunning = false;

// Inicialização segura do cliente Gemini
const apiKey = process.env.GEMINI_API_KEY;
let aiClient: GoogleGenAI | null = null;
if (apiKey) {
  aiClient = new GoogleGenAI({ apiKey });
}

/**
 * 1. ROTINA DE PESQUISA AUTÔNOMA E MINERAÇÃO DE MAIORES PLAYERS E TENDÊNCIAS
 * Utiliza o Gemini (@google/genai) para agir como Engenheiro de IA e Arquiteto de Pesquisa.
 */
export async function mineNicheTopPlayersAndTrends(niche: string): Promise<AutonomousNicheScraperOutput> {
  console.log(`[Agente Autônomo Scraper] 🔍 Iniciando varredura cirúrgica para o nicho: "${niche}"...`);

  if (!aiClient) {
    console.warn('[Agente Autônomo Scraper] ⚠️ GEMINI_API_KEY não encontrada. Gerando mineração com dados sintéticos estruturados.');
    return generateFallbackScraperOutput(niche);
  }

  const prompt = `
Você é o Agente Autônomo de Pesquisa e Inteligência Competitiva de Elite da nossa Plataforma SaaS de Marketing Híbrido.
Sua missão é realizar uma mineração cirúrgica e profunda do nicho: "${niche}".

OBJETIVOS DA PESQUISA:
1. Mapear dinamicamente os 3 a 5 Maiores Players (Líderes Mundiais ou Nacionais de Referência) neste nicho. Extrair o padrão de copy deles, a estrutura da oferta High-Ticket e a linguagem de posicionamento.
2. Identificar Tendências Globais de Mercado de alta performance e conversão atuais para este setor.
3. Mapear Regulamentações e Compliance do setor (órgãos reguladores como CFM, OAB, ANVISA, PROCON, etc., regras rígidas de publicidade, promessas proibidas e disclaimers obrigatórios).
4. Gerar Diretrizes Práticas de Adaptação para o Dossiê Estratégico do nosso cliente, garantindo que o Oráculo Gemini utilize essa inteligência refinada nas respostas e briefings de criativos.

RETORNE APENAS UM JSON VÁLIDO no seguinte formato estrito, sem markdown extra e sem texto fora do JSON:

{
  "niche": "${niche}",
  "searchedAt": "${new Date().toISOString()}",
  "topPlayers": [
    {
      "name": "Nome do Player ou Empresa Líder 1",
      "marketPosition": "Posicionamento e tamanho no mercado",
      "copyPattern": "Padrão de copy, ganchos visuais e verbais utilizados por este líder",
      "highTicketOfferStructure": "Como é montada a oferta High-Ticket (ancoragem, entregáveis, bônus)",
      "positioningLanguage": "Tom de voz, vocabulário, arquétipo de marca e gatilhos mentais"
    },
    {
      "name": "Nome do Player ou Empresa Líder 2",
      "marketPosition": "...",
      "copyPattern": "...",
      "highTicketOfferStructure": "...",
      "positioningLanguage": "..."
    },
    {
      "name": "Nome do Player ou Empresa Líder 3",
      "marketPosition": "...",
      "copyPattern": "...",
      "highTicketOfferStructure": "...",
      "positioningLanguage": "..."
    }
  ],
  "marketTrends": [
    "Tendência Global 1",
    "Tendência Global 2",
    "Tendência Global 3",
    "Tendência Global 4"
  ],
  "regulatoryCompliance": {
    "governingBodies": ["Órgão 1", "Órgão 2"],
    "strictRules": ["Regra Rígida 1", "Regra Rígida 2"],
    "forbiddenClaims": ["Alegação Proibida 1", "Alegação Proibida 2"],
    "mandatoryDisclaimers": ["Disclaimer Obrigatório 1", "Disclaimer Obrigatório 2"]
  },
  "competitiveCopyInsights": {
    "dominantAngles": ["Ângulo Dominante 1", "Ângulo Dominante 2"],
    "irresistibleOffers": ["Estrutura Irresistível 1", "Estrutura Irresistível 2"],
    "neuromarketingTriggers": ["Gatilho 1", "Gatilho 2", "Gatilho 3"]
  },
  "strategicAdaptationDirectives": {
    "clientPositioningRecommendation": "Como o nosso cliente deve se posicionar para superar esses líderes mantendo 100% de compliance",
    "oraclePromptContext": "Resumo analítico concentrado dos líderes para ser injetado no prompt de contexto do Oráculo Estratégico",
    "creativeBriefingGuidelines": [
      "Diretriz para Criativo 1 baseada no líder X",
      "Diretriz para Criativo 2 baseada na tendência Y",
      "Diretriz para Criativo 3 focada em diferenciação"
    ]
  }
}
`;

  try {
    const response = await aiClient.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        temperature: 0.3,
      },
    });

    const textResponse = response.text || '';
    const cleanJsonText = textResponse.replace(/```json/g, '').replace(/```/g, '').trim();
    const parsedData: AutonomousNicheScraperOutput = JSON.parse(cleanJsonText);

    console.log(`[Agente Autônomo Scraper] ✅ Mapeamento de players concluído com sucesso para "${niche}". Total de players identificados: ${parsedData.topPlayers.length}`);
    return parsedData;

  } catch (error: any) {
    console.error(`[Agente Autônomo Scraper] ❌ Erro ao invocar Gemini para minerar nicho "${niche}":`, error.message);
    return generateFallbackScraperOutput(niche);
  }
}

/**
 * 2. FUNÇÃO DE SALVAMENTO AUTOMÁTICO NA TABELA 'niche_knowledge_base' DO SUPABASE
 */
export async function saveScraperDataToKnowledgeBase(
  organizationId: string,
  niche: string,
  scraperData: AutonomousNicheScraperOutput,
  clientId?: string
): Promise<{ success: boolean; recordId?: string; error?: string }> {
  console.log(`[Agente Autônomo Scraper] 💾 Salvando inteligência de mercado na 'niche_knowledge_base' no Supabase...`);

  try {
    // Tenta atualizar registro existente do nicho ou insere um novo
    const { data: existingData } = await supabase
      .from('niche_knowledge_base')
      .select('id, version, dossier_data')
      .eq('organization_id', organizationId)
      .eq('niche_name', niche)
      .order('version', { ascending: false })
      .limit(1)
      .maybeSingle();

    const newVersion = (existingData?.version || 0) + 1;
    const mergedDossier = existingData?.dossier_data || {};
    
    // Alimenta o Dossiê com os dados minerados dos líderes
    mergedDossier.topPlayersAnalysis = scraperData.topPlayers;
    mergedDossier.marketTrends = scraperData.marketTrends;
    mergedDossier.regulatoryCompliance = scraperData.regulatoryCompliance;
    mergedDossier.strategicAdaptationDirectives = scraperData.strategicAdaptationDirectives;
    mergedDossier.lastAutoScrapedAt = scraperData.searchedAt;

    const payload = {
      organization_id: organizationId,
      client_id: clientId || existingData?.client_id || null,
      niche_name: niche,
      dossier_data: mergedDossier,
      market_overview: {
        topPlayers: scraperData.topPlayers,
        trends: scraperData.marketTrends,
      },
      global_benchmarks: {
        topPlayers: scraperData.topPlayers,
        competitiveCopyInsights: scraperData.competitiveCopyInsights,
      },
      compliance_rules: scraperData.regulatoryCompliance,
      predictive_plan: {
        strategicAdaptationDirectives: scraperData.strategicAdaptationDirectives,
      },
      version: newVersion,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from('niche_knowledge_base')
      .upsert([payload], { onConflict: 'organization_id,niche_name' })
      .select()
      .single();

    if (error) {
      console.warn(`[Agente Autônomo Scraper] ⚠️ Supabase Upsert aviso: ${error.message}. Salvando em contingência local.`);
    } else if (data) {
      console.log(`[Agente Autônomo Scraper] ✅ Registro salvo no Supabase com ID: ${data.id} (Versão ${newVersion})`);
    }

    // Persistência em disco/local de contingência
    if (clientId) {
      localDossiersStore[clientId] = mergedDossier;
      saveDossiersToDisk(localDossiersStore);
    }

    return { success: true, recordId: data?.id || 'kb_local_' + Date.now() };

  } catch (err: any) {
    console.error(`[Agente Autônomo Scraper] ❌ Erro ao salvar inteligência no Supabase:`, err.message);
    return { success: false, error: err.message };
  }
}

/**
 * 3. EXECUÇÃO INTEGRADA DE UMA RODADA COMPLETA DE MINERAÇÃO E INJEÇÃO
 */
export async function executeAutonomousScraperRun(
  organizationId: string,
  niche: string,
  clientId?: string
): Promise<{ scraperOutput: AutonomousNicheScraperOutput; dbResult: any }> {
  const logEntry: ScraperJobLog = {
    timestamp: new Date().toISOString(),
    niche,
    status: 'RUNNING',
    message: `Iniciando varredura para o nicho ${niche}`,
  };
  jobLogs.unshift(logEntry);

  try {
    const scraperOutput = await mineNicheTopPlayersAndPlayers(niche);
    const dbResult = await saveScraperDataToKnowledgeBase(organizationId, niche, scraperOutput, clientId);

    logEntry.status = 'SUCCESS';
    logEntry.playersCount = scraperOutput.topPlayers.length;
    logEntry.message = `Mineração concluída. ${scraperOutput.topPlayers.length} líderes analisados. DB: ${dbResult.success ? 'OK' : 'Fallback Local'}`;

    return { scraperOutput, dbResult };
  } catch (error: any) {
    logEntry.status = 'ERROR';
    logEntry.message = `Falha na mineração: ${error.message}`;
    throw error;
  }
}

/**
 * Alias auxiliar para chamada da rotina
 */
export async function mineNicheTopPlayersAndPlayers(niche: string): Promise<AutonomousNicheScraperOutput> {
  return await mineNicheTopPlayersAndTrends(niche);
}

/**
 * 4. MECANISMO DE ATUALIZAÇÃO CONTÍNUA (BACKGROUND CRON WORKER)
 * Roda periodicamente para varrer todos os nichos cadastrados na plataforma.
 */
export function startAutonomousScraperCron(intervalMinutes: number = 1440, organizationId: string = 'e4b8a1c9-7d3f-42e1-95a8-2083bf2f9104') {
  if (isCronRunning && cronTimer) {
    console.log('[Agente Autônomo Scraper Cron] ℹ️ Cron Job já está em execução.');
    return;
  }

  const intervalMs = intervalMinutes * 60 * 1000;
  isCronRunning = true;

  console.log(`[Agente Autônomo Scraper Cron] 🚀 Inicializando Robôs Autônomos! Frequência: a cada ${intervalMinutes} minutos.`);

  const runAllActiveNichesJob = async () => {
    console.log('[Agente Autônomo Scraper Cron] 🔄 Disparando atualização periódica automática de todos os nichos...');
    try {
      // 1. Busca todos os nichos cadastrados na tabela 'clients' ou 'niche_knowledge_base'
      let activeNiches: string[] = [];

      try {
        const { data: clientsData } = await supabase
          .from('clients')
          .select('niche')
          .eq('organization_id', organizationId);
        
        if (clientsData && clientsData.length > 0) {
          activeNiches = Array.from(new Set(clientsData.map(c => c.niche).filter(Boolean)));
        }
      } catch (dbErr) {
        console.warn('[Agente Autônomo Scraper Cron] ⚠️ Supabase offline para listar nichos. Usando nichos padrão.');
      }

      if (activeNiches.length === 0) {
        activeNiches = ['Cirurgião Plástico', 'Moda de Calçados', 'Advocacia Trabalhista', 'Odontologia Estética', 'Infoprodutos de Finanças'];
      }

      console.log(`[Agente Autônomo Scraper Cron] 📋 Nichos mapeados para atualização: ${activeNiches.join(', ')}`);

      for (const niche of activeNiches) {
        try {
          await executeAutonomousScraperRun(organizationId, niche);
          // Pequeno delay entre requisições para evitar rate limit
          await new Promise((resolve) => setTimeout(resolve, 3000));
        } catch (nicheErr: any) {
          console.error(`[Agente Autônomo Scraper Cron] ❌ Erro ao atualizar nicho "${niche}":`, nicheErr.message);
        }
      }

      console.log('[Agente Autônomo Scraper Cron] ✅ Ciclo de atualização de todos os nichos finalizado com sucesso.');

    } catch (globalErr: any) {
      console.error('[Agente Autônomo Scraper Cron] ❌ Erro no ciclo de cron:', globalErr.message);
    }
  };

  // Dispara primeira rodada imediatamente e programa o timer
  runAllActiveNichesJob();
  cronTimer = setInterval(runAllActiveNichesJob, intervalMs);
}

/**
 * Para a execução do cron job
 */
export function stopAutonomousScraperCron() {
  if (cronTimer) {
    clearInterval(cronTimer);
    cronTimer = null;
    isCronRunning = false;
    console.log('[Agente Autônomo Scraper Cron] 🛑 Cron Job parado com sucesso.');
  }
}

/**
 * Obter status e logs do robô autônomo
 */
export function getAutonomousScraperStatus() {
  return {
    isCronRunning,
    totalJobsExecuted: jobLogs.length,
    recentLogs: jobLogs.slice(0, 20),
  };
}

/**
 * 5. GERADOR SINTÉTICO DE FALLBACK (CONTIINGÊNCIA LOCAL / MOCK RÍGIDO)
 */
function generateFallbackScraperOutput(niche: string): AutonomousNicheScraperOutput {
  return {
    niche,
    searchedAt: new Date().toISOString(),
    topPlayers: [
      {
        name: `Líder Mundial 1 em ${niche}`,
        marketPosition: 'Top 1 Benchmark Global de Faturamento',
        copyPattern: 'Ganchos focados em transformação rápida, validação de autoridade e prova social em massa.',
        highTicketOfferStructure: 'Consultoria Individual VIP + Acompanhamento por 12 meses + Comunidade Exclusiva',
        positioningLanguage: 'Tom sóbrio, elegante, focado em alta renda e sofisticação visual.',
      },
      {
        name: `Benchmark Nacional de Referência em ${niche}`,
        marketPosition: 'Referência de Alta Performance em Escala Digital',
        copyPattern: 'Narrativa visceral focada no contraste antes x depois e quebra de mitos do setor.',
        highTicketOfferStructure: 'Programa de Aceleração com Garantia de Resultado Condicionada',
        positioningLanguage: 'Linguagem direta, confiante, com gatilhos de urgência e escassez estruturada.',
      },
      {
        name: `Inovador Disruptivo de ${niche}`,
        marketPosition: 'Player de Crescimento Exponencial em Redes Sociais',
        copyPattern: 'Micro-conteúdos visuais dinâmicos, quebra de padrão nos 3 primeiros segundos e storytelling emocional.',
        highTicketOfferStructure: 'Imersão Presencial VIP + Suporte Direto via Canal de Executivos',
        positioningLanguage: 'Jovem, dinâmico, uso intensivo de vídeos em formato cinematográfico.',
      },
    ],
    marketTrends: [
      'Migração maciça para vendas assistidas por IA com qualificação em tempo real',
      'Ancoragem de valor através de conteúdo de bastidores e transparência radical',
      'Adoção de micro-vídeos em formato vertical com legendas animadas em alto contraste',
      'Uso de VSLs dinâmicos de até 3 minutos com ofertas diretas High-Ticket',
    ],
    regulatoryCompliance: {
      governingBodies: ['Órgãos Reguladores do Setor (CFM, OAB, ANVISA, PROCON)'],
      strictRules: [
        'Proibição de promessa de resultados garantidos sem ressalva médica/jurídica',
        'Vedações a comparações pejorativas diretas a concorrentes',
      ],
      forbiddenClaims: [
        'Resultados 100% garantidos ou cura/solução imediata',
        'Preço com apelo sensacionalista de desconto agressivo não fundamentado',
      ],
      mandatoryDisclaimers: [
        'Resultados podem variar de acordo com cada caso individual',
        'Informa-se que o conteúdo possui caráter meramente educativo e de orientação',
      ],
    },
    competitiveCopyInsights: {
      dominantAngles: [
        'Dor do retrabalho e frustração com soluções baratas de baixa qualidade',
        'Desejo de status VIP e atendimento totalmente exclusivo e personalizado',
      ],
      irresistibleOffers: [
        'Diagnóstico Inicial Gratuito + Plano Estratégico Sob Medida',
      ],
      neuromarketingTriggers: [
        'Ancoragem de Preço por Contraste de Prejuízo',
        'Gatilho de Prova Social de Clientes de Alto Nível',
        'Sensação de Acesso Exclusivo a Vagas Limitadas',
      ],
    },
    strategicAdaptationDirectives: {
      clientPositioningRecommendation: `Posicionar o cliente como a escolha definitiva de Alta Autoridade e Segurança em ${niche}, mesclando o rigor técnico dos líderes globais com atendimento ágil.`,
      oraclePromptContext: `CONTEXTO DOS LÍDERES DE ${niche.toUpperCase()}: Os maiores players atuam com ofertas High-Ticket ancoradas em transformação exclusiva. Utilize linguagem sofisticada, autoridade inquestionável e 100% de compliance.`,
      creativeBriefingGuidelines: [
        `Criativo 1 (Ângulo Autoridade): Focar no rigor e excelência do atendimento em ${niche}.`,
        'Criativo 2 (Ângulo Quebra de Mitos): Contrastar promessas genéricas de mercado contra o padrão VIP.',
        'Criativo 3 (Ângulo Prova Social): Apresentar bastidores e depoimentos de transformação de clientes.',
      ],
    },
  };
}
