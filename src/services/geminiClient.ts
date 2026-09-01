import { GoogleGenAI, Type, Schema } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Interfaces do Dossiê Estratégico Preditivo Multicanal (Digital + Tradicional + Presencial + Influenciadores/Podcasts)
 */
export interface NicheMarketOverview {
  targetAudience: string;
  marketMaturityLevel: string;
  mainCompetitorsGlobalBenchmark: string[];
  idealCustomerProfileDetails: string;
}

export interface ConsumptionPsychology {
  subconsciousFears: string[];
  unspokenDesires: string[];
  cognitiveBiasesToExploit: string[];
  priceAnchoringMechanism: string;
  decisionTriggerTriggers: string[];
}

export interface BudgetPricingStrategy {
  suggestedAverageTicket: string;
  maxAcceptableCAC: string;
  projectedLTV: string;
  ltvCacTargetRatio: string; // Meta mínima: 3:1 (ou superior)
  recommendedMonthlyTrafficBudget: string;
  budgetAllocationSplit: string;
}

export interface DetailedNeuromarketingGuidelines {
  visualHooksFirst3s: string[];
  verbalHooksFirst3s: string[];
  patternInterruptTechniques: string[];
  colorContrastAndLightingRules: string[];
  typographyAndSubtitlesRules: string[];
}

export interface TraditionalAndOfflineMedia {
  radioTV: string;                  // Spots de rádio, TV e OOH
  experientialAndEvents: string;     // Eventos VIP, feiras e ações corpo a corpo
  offlineRoiAttribution: string;     // Como rastrear via cupons, QR codes ou CRM
}

export interface BudgetAllocation {
  digitalTrafficPercent: number;    // Ex: 50
  traditionalMediaPercent: number;  // Ex: 25
  offlineEventsPercent: number;     // Ex: 25
  financialJustification: string;   // Justificativa financeira do ROI
}

export interface InfluencerAndPodcastPartnerships {
  targetPodcastCategoriesOrShows: string[]; // Exemplos de podcasts ou estilos ideais para patrocínio
  influencerTierAndProfile: string;        // Micro-influenciadores, macro ou autoridade de nicho
  strategicJustification: string;          // Por que este perfil gera conversão e LTV alto
  expectedRoiOrImpact: string;             // Retorno financeiro ou impacto esperado
}

export interface GlobalBenchmarks {
  topPerformingFunnelTypes: string[];
  offerStructures: string[];
  highConvertingContentPillars: string[];
}

export interface RegulatoryAndMarketRestrictions {
  complianceRules: string[];
  forbiddenClaims: string[];
  mandatoryDisclaimers: string[];
}

export interface ExhaustiveActionPlan {
  phase1_30DaysAcquisition: string[];
  phase2_60DaysRetentionAndConversion: string[];
  phase3_90DaysLtvExpansionAndScaling: string[];
  keyPerformanceIndicators: string[];
}

export interface NicheDossier {
  niche: string;
  clientName?: string;
  generatedAt: string;
  marketOverview: NicheMarketOverview;
  consumptionPsychology: ConsumptionPsychology;
  budgetPricingStrategy: BudgetPricingStrategy;
  neuromarketingGuidelines: DetailedNeuromarketingGuidelines;
  neuromarketingAngles?: DetailedNeuromarketingGuidelines;
  traditionalAndOfflineMedia: TraditionalAndOfflineMedia;
  budgetAllocation: BudgetAllocation;
  influencerAndPodcastPartnerships: InfluencerAndPodcastPartnerships;
  globalBenchmarks: GlobalBenchmarks;
  regulatoryAndMarketRestrictions: RegulatoryAndMarketRestrictions;
  predictiveActionPlan: ExhaustiveActionPlan;
}

// Inicialização do cliente Gemini utilizando a SDK oficial @google/genai
const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
  console.warn('⚠️ AVISO: A variável GEMINI_API_KEY não foi encontrada nas variáveis de ambiente.');
}

export const ai = new GoogleGenAI({
  apiKey: apiKey || '',
});

/**
 * Schema JSON estrito, exaustivo e multicanal incluindo Mídias Tradicionais, Offline e Influenciadores/Podcasts
 */
const nicheDossierExhaustiveSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    niche: { type: Type.STRING },
    clientName: { type: Type.STRING },
    generatedAt: { type: Type.STRING },
    marketOverview: {
      type: Type.OBJECT,
      description: "Mapeamento detalhado e profundo do mercado e perfil de cliente ideal",
      properties: {
        targetAudience: { type: Type.STRING },
        marketMaturityLevel: { type: Type.STRING },
        mainCompetitorsGlobalBenchmark: { type: Type.ARRAY, items: { type: Type.STRING } },
        idealCustomerProfileDetails: { type: Type.STRING },
      },
      required: ["targetAudience", "marketMaturityLevel", "mainCompetitorsGlobalBenchmark", "idealCustomerProfileDetails"],
    },
    consumptionPsychology: {
      type: Type.OBJECT,
      description: "Análise neuroeconômica exaustiva dos medos subconscientes e viés cognitivo",
      properties: {
        subconsciousFears: { type: Type.ARRAY, items: { type: Type.STRING } },
        unspokenDesires: { type: Type.ARRAY, items: { type: Type.STRING } },
        cognitiveBiasesToExploit: { type: Type.ARRAY, items: { type: Type.STRING } },
        priceAnchoringMechanism: { type: Type.STRING },
        decisionTriggerTriggers: { type: Type.ARRAY, items: { type: Type.STRING } },
      },
      required: ["subconsciousFears", "unspokenDesires", "cognitiveBiasesToExploit", "priceAnchoringMechanism", "decisionTriggerTriggers"],
    },
    budgetPricingStrategy: {
      type: Type.OBJECT,
      description: "Modelagem orçamentária preditiva e precificação ideal orientada ao lucro",
      properties: {
        suggestedAverageTicket: { type: Type.STRING },
        maxAcceptableCAC: { type: Type.STRING },
        projectedLTV: { type: Type.STRING },
        ltvCacTargetRatio: { type: Type.STRING, description: "Garantia de proporção mínima de 3:1" },
        recommendedMonthlyTrafficBudget: { type: Type.STRING },
        budgetAllocationSplit: { type: Type.STRING },
      },
      required: ["suggestedAverageTicket", "maxAcceptableCAC", "projectedLTV", "ltvCacTargetRatio", "recommendedMonthlyTrafficBudget", "budgetAllocationSplit"],
    },
    neuromarketingGuidelines: {
      type: Type.OBJECT,
      description: "Diretrizes cirúrgicas de neuromarketing e visual hooks para os primeiros 3 segundos",
      properties: {
        visualHooksFirst3s: { type: Type.ARRAY, items: { type: Type.STRING } },
        verbalHooksFirst3s: { type: Type.ARRAY, items: { type: Type.STRING } },
        patternInterruptTechniques: { type: Type.ARRAY, items: { type: Type.STRING } },
        colorContrastAndLightingRules: { type: Type.ARRAY, items: { type: Type.STRING } },
        typographyAndSubtitlesRules: { type: Type.ARRAY, items: { type: Type.STRING } },
      },
      required: ["visualHooksFirst3s", "verbalHooksFirst3s", "patternInterruptTechniques", "colorContrastAndLightingRules", "typographyAndSubtitlesRules"],
    },
    traditionalAndOfflineMedia: {
      type: Type.OBJECT,
      description: "Planejamento de mídias tradicionais (Rádio, TV, OOH) e marketing presencial/eventos",
      properties: {
        radioTV: { type: Type.STRING, description: "Spots de rádio, inserções em TV e outdoors/OOH" },
        experientialAndEvents: { type: Type.STRING, description: "Eventos VIP, presença em feiras e ações corpo a corpo" },
        offlineRoiAttribution: { type: Type.STRING, description: "Método de rastreamento de ROI offline via cupons, QR codes ou CRM" },
      },
      required: ["radioTV", "experientialAndEvents", "offlineRoiAttribution"],
    },
    budgetAllocation: {
      type: Type.OBJECT,
      description: "Distribuição percentual do orçamento entre canais digitais, tradicionais e presenciais com justificativa",
      properties: {
        digitalTrafficPercent: { type: Type.NUMBER, description: "Porcentagem da verba para Tráfego Pago Digital (0-100)" },
        traditionalMediaPercent: { type: Type.NUMBER, description: "Porcentagem da verba para Mídias Tradicionais Rádio/TV/OOH (0-100)" },
        offlineEventsPercent: { type: Type.NUMBER, description: "Porcentagem da verba para Eventos Presenciais e Ações Corpo a Corpo (0-100)" },
        financialJustification: { type: Type.STRING, description: "Justificativa financeira detalhada do ROI esperado em cada canal" },
      },
      required: ["digitalTrafficPercent", "traditionalMediaPercent", "offlineEventsPercent", "financialJustification"],
    },
    influencerAndPodcastPartnerships: {
      type: Type.OBJECT,
      description: "Estratégia de parcerias com influenciadores de nicho, autoridades e patrocínios em podcasts",
      properties: {
        targetPodcastCategoriesOrShows: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
          description: "Exemplos de podcasts ou estilos ideais para patrocínio",
        },
        influencerTierAndProfile: {
          type: Type.STRING,
          description: "Micro-influenciadores, macro ou autoridade de nicho",
        },
        strategicJustification: {
          type: Type.STRING,
          description: "Por que este perfil gera conversão e LTV alto",
        },
        expectedRoiOrImpact: {
          type: Type.STRING,
          description: "Retorno financeiro ou impacto esperado nas parcerias",
        },
      },
      required: [
        "targetPodcastCategoriesOrShows",
        "influencerTierAndProfile",
        "strategicJustification",
        "expectedRoiOrImpact",
      ],
    },
    globalBenchmarks: {
      type: Type.OBJECT,
      description: "Modelos de ofertas e funis com maior conversão internacional",
      properties: {
        topPerformingFunnelTypes: { type: Type.ARRAY, items: { type: Type.STRING } },
        offerStructures: { type: Type.ARRAY, items: { type: Type.STRING } },
        highConvertingContentPillars: { type: Type.ARRAY, items: { type: Type.STRING } },
      },
      required: ["topPerformingFunnelTypes", "offerStructures", "highConvertingContentPillars"],
    },
    regulatoryAndMarketRestrictions: {
      type: Type.OBJECT,
      description: "Normas regulatórias e restrições legais e éticas do setor",
      properties: {
        complianceRules: { type: Type.ARRAY, items: { type: Type.STRING } },
        forbiddenClaims: { type: Type.ARRAY, items: { type: Type.STRING } },
        mandatoryDisclaimers: { type: Type.ARRAY, items: { type: Type.STRING } },
      },
      required: ["complianceRules", "forbiddenClaims", "mandatoryDisclaimers"],
    },
    predictiveActionPlan: {
      type: Type.OBJECT,
      description: "Plano tático detalhado de 30, 60 e 90 dias com KPIs financeiros",
      properties: {
        phase1_30DaysAcquisition: { type: Type.ARRAY, items: { type: Type.STRING } },
        phase2_60DaysRetentionAndConversion: { type: Type.ARRAY, items: { type: Type.STRING } },
        phase3_90DaysLtvExpansionAndScaling: { type: Type.ARRAY, items: { type: Type.STRING } },
        keyPerformanceIndicators: { type: Type.ARRAY, items: { type: Type.STRING } },
      },
      required: ["phase1_30DaysAcquisition", "phase2_60DaysRetentionAndConversion", "phase3_90DaysLtvExpansionAndScaling", "keyPerformanceIndicators"],
    },
  },
  required: [
    "niche",
    "marketOverview",
    "consumptionPsychology",
    "budgetPricingStrategy",
    "neuromarketingGuidelines",
    "traditionalAndOfflineMedia",
    "budgetAllocation",
    "influencerAndPodcastPartnerships",
    "globalBenchmarks",
    "regulatoryAndMarketRestrictions",
    "predictiveActionPlan",
  ],
};

export interface UnitEconomicsInput {
  avgTicket?: number;
  targetRevenue?: number;
  mainService?: string;
  billingModel?: string;
  salesCycle?: string;
}

/**
 * Gera autônomamente o Dossiê Estratégico Preditivo Exaustivo Multicanal utilizando alta profundidade de tokens (maxOutputTokens: 8192).
 * 
 * @param niche Nome ou descrição do nicho (ex: "Médico Cirurgião Plástico")
 * @param clientName Nome opcional do cliente
 * @param website Website da marca
 * @param briefingTexto Briefing sanitizado e histórico
 * @param unitEconomics Dados vitais de precificação, ticket médio e metas
 * @returns Promessa com o Dossiê Estratégico Completo
 */
export async function generateNicheStrategicDossier(
  niche: string,
  clientName?: string,
  website?: string,
  briefingTexto?: string,
  unitEconomics?: UnitEconomicsInput
): Promise<NicheDossier> {
  const nomeCliente = clientName || 'Cliente Padrão';
  const nichoMercado = niche || 'Geral';
  const avgTicket = Number(unitEconomics?.avgTicket) || 0;
  const targetRevenue = Number(unitEconomics?.targetRevenue) || 0;
  const mainService = unitEconomics?.mainService || 'Geral';
  const billingModel = unitEconomics?.billingModel || 'unico';
  const salesCycle = unitEconomics?.salesCycle || 'imediato';

  const systemInstruction = `Você é o Diretor de Estratégia e Neuromarketing do ecossistema Oraculum SaaS.
Sua missão é criar o DOSSIÊ ESTRATÉGICO PREDITIVO COMPLETO e exclusivo para a marca informada.

DADOS DA MARCA:
- Nome/Marca: ${nomeCliente}
- Nicho: ${nichoMercado}
- Website: ${website || 'Não informado'}
- Briefing, Branding e Diferenciais: ${briefingTexto || 'Análise setorial de alto padrão'}

DADOS FINANCEIROS & UNIT ECONOMICS DA MARCA:
- Ticket Médio Real Cadastrado: R$ ${avgTicket > 0 ? avgTicket.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) : 'Não informado (estimar pelo nicho)'}
- Meta de Faturamento Mensal: R$ ${targetRevenue > 0 ? targetRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) : 'Não informada'}
- Serviço/Produto Carro-Chefe: ${mainService}
- Modelo de Cobrança: ${billingModel} (${salesCycle})

DIRETRIZES DE CÁLCULO OBRIGATÓRIAS:
1. Se o Ticket Médio Real foi informado (R$ ${avgTicket > 0 ? avgTicket : 'N/A'}), utilize-o OBRIGATORIAMENTE no bloco de Modelagem de Precificação como suggestedAverageTicket (NÃO invente outro valor sugerido).
2. Trave o CAC Máximo Aceitável (maxAcceptableCAC) rigorosamente entre 15% e 20% do Ticket Médio Real.
3. Se a Meta de Faturamento foi fornecida (R$ ${targetRevenue > 0 ? targetRevenue : 'N/A'}), calcule a meta mensal de clientes fechados (Meta Faturamento ÷ Ticket Médio) e o orçamento sugerido de mídia (Meta de Clientes × CAC Máximo).
4. NÃO GERE TEXTOS GENÉRICOS. Incorpore os diferenciais exatos, objeções e posicionamento informados no Briefing.
5. Aplique regras regulatórias e éticas reais do conselho de classe do nicho (ex: CFM/CRM para medicina, OAB para advocacia, etc.).
6. Formate a saída rigorosamente nos blocos estruturados do schema JSON.`;

  const prompt = `Gere o Dossiê Estratégico Preditivo MULTICANAL COMPLETO para o Nicho: "${niche}"${
    clientName ? ` (Cliente: "${clientName}")` : ''
  }. Responda estritamente em formato JSON seguindo o schema exato fornecido.`;

  const modelCandidates = [
    'gemini-3.6-flash',
    'gemini-3.7-flash',
    'gemini-3.5-flash',
    'gemini-flash-latest',
    'gemini-pro-latest'
  ];
  let lastError: any = null;

  for (const modelName of modelCandidates) {
    try {
      const response = await ai.models.generateContent({
        model: modelName,
        contents: prompt,
        config: {
          systemInstruction,
          responseMimeType: 'application/json',
          responseSchema: nicheDossierExhaustiveSchema,
          temperature: 0.2,
          maxOutputTokens: 8192,
        },
      });

      if (!response.text) {
        throw new Error(`Modelo ${modelName} retornou resposta em branco.`);
      }

      const parsedData = JSON.parse(response.text);

      const dossier: NicheDossier = {
        ...parsedData,
        niche,
        clientName: clientName || parsedData.clientName || 'Cliente Padrão',
        generatedAt: new Date().toISOString(),
      };

      return dossier;
    } catch (error: any) {
      console.warn(`⚠️ Tentativa com modelo ${modelName} no geminiClient falhou:`, error.message || error);
      lastError = error;
    }
  }

  console.error('❌ Todos os modelos no geminiClient falharam:', lastError);
  throw lastError || new Error('Falha na geração do dossiê com todos os modelos do Gemini.');
}
