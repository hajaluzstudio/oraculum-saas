import { GoogleGenAI, Type, Schema } from '@google/genai';
import dotenv from 'dotenv';
import { loadClientsFromDisk, loadDossiersFromDisk } from './diskStorage';

dotenv.config();

export interface CompetitorAnalysisResult {
  competitorName: string;
  analyzedNiche: string;
  detectedOfferAngle: string;
  detectedVisualStrategy: string;
  positioningVulnerabilities: string[];
  counterAttackHooks: Array<{
    hookTitle: string;
    targetFlaw: string;
    recommendedScriptHook: string;
    neuromarketingAdvantage: string;
  }>;
  strategicAdvantageVerdict: string;
  analyzedAt: string;
}

const apiKey = process.env.GEMINI_API_KEY;
export const ai = new GoogleGenAI({
  apiKey: apiKey || '',
});

const spySchema: Schema = {
  type: Type.OBJECT,
  properties: {
    competitorName: { type: Type.STRING },
    analyzedNiche: { type: Type.STRING },
    detectedOfferAngle: { type: Type.STRING, description: "Ângulo de venda principal identificado no concorrente" },
    detectedVisualStrategy: { type: Type.STRING, description: "Padrão de criativos que o concorrente está rodando" },
    positioningVulnerabilities: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: "Falhas de promessa, inseguranças não respondidas ou clichês usados pelo concorrente"
    },
    counterAttackHooks: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          hookTitle: { type: Type.STRING },
          targetFlaw: { type: Type.STRING },
          recommendedScriptHook: { type: Type.STRING, description: "Hook de 3s para contra-atacar e converter o público dele" },
          neuromarketingAdvantage: { type: Type.STRING },
        },
        required: ["hookTitle", "targetFlaw", "recommendedScriptHook", "neuromarketingAdvantage"],
      },
    },
    strategicAdvantageVerdict: {
      type: Type.STRING,
      description: "Veredito da agência sobre como dominar a fatia de mercado do concorrente",
    },
  },
  required: [
    "competitorName",
    "analyzedNiche",
    "detectedOfferAngle",
    "detectedVisualStrategy",
    "positioningVulnerabilities",
    "counterAttackHooks",
    "strategicAdvantageVerdict",
  ],
};

export async function analyzeCompetitorOffer(input: {
  competitorName: string;
  niche: string;
  competitorAdUrlOrText?: string;
}): Promise<CompetitorAnalysisResult> {
  console.log(`[Competitor Spy] 🕵️ Analisando anúncio/oferta do concorrente "${input.competitorName}" no nicho "${input.niche}"...`);

  const systemInstruction = `Você é o Estrategista Chefe de Inteligência Competitiva e Espionagem de Mídia da agência.
Sua missão é dissecar anúncios de concorrentes (Meta Ad Library / Google Ads), expor suas fraquezas de posicionamento e criar contra-ataques cirúrgicos de Neuromarketing para o nosso cliente conquistar o tráfego dele.`;

  const prompt = `Analise o concorrente a seguir:
- Concorrente / Perfil: "${input.competitorName}"
- Nicho: "${input.niche}"
- Informações / Anúncios Observados: "${input.competitorAdUrlOrText || 'Anúncios genéricos focados apenas em preço ou demonstração básica de serviço sem conexão emocional.'}"

Retorne o diagnóstico completo em JSON seguindo o schema fornecido.`;

  try {
    const modelCandidates = [
      'gemini-3.7-flash',
      'gemini-3.6-flash',
      'gemini-3.5-flash',
      'gemini-flash-latest',
      'gemini-pro-latest',
      'gemini-2.5-flash'
    ];
    let lastError: any = null;

    for (const modelName of modelCandidates) {
      try {
        console.log(`[Competitor Spy] Tentando gerar análise com o modelo: ${modelName}`);
        const response = await ai.models.generateContent({
          model: modelName,
          contents: prompt,
          config: {
            systemInstruction,
            responseMimeType: 'application/json',
            responseSchema: spySchema,
            temperature: 0.3,
          },
        });

        if (!response.text) throw new Error(`Modelo ${modelName} retornou resposta em branco.`);

        const parsed = JSON.parse(response.text);
        
        const result: CompetitorAnalysisResult = {
          ...parsed,
          analyzedAt: new Date().toISOString(),
        };

        return result;
      } catch (err: any) {
        console.warn(`[Competitor Spy] Modelo ${modelName} falhou:`, err.message);
        lastError = err;
      }
    }

    throw new Error(`Todos os modelos de IA falharam. Último erro: ${lastError?.message}`);
  } catch (error: any) {
    console.error("[Competitor Spy] ❌ Erro na geração de inteligência competitiva:", error);
    throw new Error(error.message || 'Falha ao analisar a concorrência.');
  }
}
