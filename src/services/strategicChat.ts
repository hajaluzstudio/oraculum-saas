import { GoogleGenAI, Type, Schema } from '@google/genai';
import dotenv from 'dotenv';
import { supabase } from './supabaseClient';
import { getNicheKnowledgeBase } from './nicheResearcher';

dotenv.config();

/**
 * Interfaces para o Chat Estratégico de Co-Criação Justificada
 */
export interface ChatMessage {
  role: 'user' | 'model';
  content: string;
  timestamp: string;
}

export interface SuggestedBriefing {
  campaignObjective: string;
  targetAudienceAngle: string;
  visualHookPrompt: string;
  copyAngle: string;
  expectedRoiMultiplier: string;
}

export interface BudgetAllocationProposal {
  coldTrafficShare: string;       // Tráfego Pago Frio (Aquisição)
  warmRemarketingShare: string;   // Remarketing / Conversão Curto Prazo
  ltvExpansionShare: string;      // Expansão de LTV / Recorrência
  justification: string;
}

export interface StrategicChatResponse {
  replyText: string;
  suggestedBriefing?: SuggestedBriefing;
  budgetAllocationProposal?: BudgetAllocationProposal;
  actionableNextSteps: string[];
}

export interface ChatSessionContext {
  organizationId: string;
  clientId: string;
  clientName: string;
  niche: string;
  dossierData: any;
}

const apiKey = process.env.GEMINI_API_KEY;
export const ai = new GoogleGenAI({
  apiKey: apiKey || '',
});

/**
 * Schema estrito para a resposta co-criativa do Chat Estratégico via Gemini API
 */
const strategicChatResponseSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    replyText: {
      type: Type.STRING,
      description: "Resposta fundamentada do Oráculo para o estrategista com justificativa técnica e financeira",
    },
    suggestedBriefing: {
      type: Type.OBJECT,
      description: "Briefing tático recomendado para a próxima campanha (opcional se não for solicitado)",
      properties: {
        campaignObjective: { type: Type.STRING },
        targetAudienceAngle: { type: Type.STRING },
        visualHookPrompt: { type: Type.STRING, description: "Prompt visual para equipe de design/vídeo (primeiros 3s)" },
        copyAngle: { type: Type.STRING },
        expectedRoiMultiplier: { type: Type.STRING, description: "Multiplicador de ROI esperado" },
      },
      required: ["campaignObjective", "targetAudienceAngle", "visualHookPrompt", "copyAngle", "expectedRoiMultiplier"],
    },
    budgetAllocationProposal: {
      type: Type.OBJECT,
      description: "Proposta preditiva de alocação orçamentária (opcional)",
      properties: {
        coldTrafficShare: { type: Type.STRING, description: "Porcentagem para aquisição de novos clientes" },
        warmRemarketingShare: { type: Type.STRING, description: "Porcentagem para fechar leads quentes" },
        ltvExpansionShare: { type: Type.STRING, description: "Porcentagem para aumento de ticket/LTV" },
        justification: { type: Type.STRING },
      },
      required: ["coldTrafficShare", "warmRemarketingShare", "ltvExpansionShare", "justification"],
    },
    actionableNextSteps: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: "Próximos passos operacionais imediatos para a equipe",
    },
  },
  required: ["replyText", "actionableNextSteps"],
};

import { loadClientsFromDisk, loadDossiersFromDisk } from './diskStorage';

/**
 * Carrega o contexto do cliente e o Dossiê Estratégico diretamente do disco físico (diskStorage.ts).
 */
export async function loadClientChatContext(
  organizationId: string,
  clientId: string
): Promise<ChatSessionContext> {
  const clients = loadClientsFromDisk();
  let client = clients.find(c => c.id === clientId || c.name === clientId || c.name.includes(clientId));
  
  if (!client && clients.length > 0) {
    client = clients[0];
  }

  const clientName = client ? client.name : 'Haja Luz';
  const niche = client ? client.niche : 'Design Gráfico e Branding VIP';
  const resolvedClientId = client ? client.id : clientId;

  const dossiers = loadDossiersFromDisk();
  let dossierData = dossiers[resolvedClientId] || dossiers[clientId] || dossiers[clientName] || null;

  if (!dossierData && Object.keys(dossiers).length > 0) {
    // Procura por ID ou Nome de cliente nas chaves dos dossiês
    const matchingKey = Object.keys(dossiers).find(k => k === resolvedClientId || k === clientId || k.includes(clientName));
    if (matchingKey) {
      dossierData = dossiers[matchingKey];
    } else {
      dossierData = dossiers[Object.keys(dossiers)[0]];
    }
  }

  return {
    organizationId,
    clientId: resolvedClientId,
    clientName,
    niche,
    dossierData,
  };
}

/**
 * Envia uma mensagem no Chat Estratégico de Co-Criação com a IA Gemini.
 * O Oráculo utiliza o Dossiê do Nicho armazenado em disco como contexto primordial.
 */
export async function sendStrategicChatMessage(
  organizationId: string,
  clientId: string,
  userMessage: string,
  conversationHistory: ChatMessage[] = []
): Promise<StrategicChatResponse> {
  console.log(`[Chat Estratégico] 💬 Recebida mensagem do estrategista para o Cliente ${clientId}: "${userMessage.substring(0, 60)}..."`);

  // 1. Carrega o contexto e dossiê armazenado no disco físico
  const context = await loadClientChatContext(organizationId, clientId);

  const dossierContext = context.dossierData
    ? ` dossiê estratégico e ICP do cliente: ${JSON.stringify(context.dossierData)}`
    : " Nenhum dossiê encontrado para este cliente.";

  // 2. Monta a instrução de sistema com regras absolutas de comportamento, autonomia e formato
  const systemInstruction = `Você é o Oráculo de Marketing Híbrido ROI-First especialista no nicho deste cliente.
FONTE DE CONTEXTO ÚNICA E EXCLUSIVA (DOSSIÊ DO CLIENTE ATIVO: ${context.clientName} - ${context.niche}):
${dossierContext}

REGRAS ABSOLUTAS INEGOCIÁVEIS:
1. FONTE ÚNICA: Responda única e exclusivamente com base no ICP, dores, psicologia de consumo, ancoragem e metas do dossiê deste cliente ativo. NUNCA dê respostas genéricas ou universais.
2. ESTRUTURAÇÃO OBRIGATÓRIA DE PEÇAS (CARDS / VÍDEOS / PEÇAS): Ao receber comandos para criação ou sugestão de peças, você DEVE OBRIGATORIAMENTE estruturar a resposta (replyText) em tópicos separados e numerados explicitamente como "Card 1", "Card 2", "Card 3" e "Card 4". Para cada item, especifique obrigatoriamente:
   - 📌 Título e Objetivo Tático
   - 🎨 Elementos Visuais Exatos (Cores, composição, iluminação, contraste e Hook visual dos 3s)
   - ✍️ Copy Completa (Headline visceral de alto impacto + Corpo completo do anúncio)
   - 🏷️ Metadados Técnicos para Certidão de Nascimento (Autor, Geolocalização GPS, Copyright e Tags de Compra)
3. JUSTIFICATIVA DE ROI: Toda sugestão deve demonstrar racional de redução de CAC e elevação da relação LTV/CAC (≥ 3:1).`;

  // 3. Formata o histórico de conversas para a API do Gemini com memória contínua
  const contentsHistory: any[] = conversationHistory.slice(-8).map(msg => ({
    role: msg.role === 'user' ? 'user' : 'model',
    parts: [{ text: typeof msg.content === 'string' ? msg.content : ((msg.content as any)?.replyText || JSON.stringify(msg.content)) }]
  }));

  const contents = [
    ...contentsHistory,
    {
      role: 'user',
      parts: [{ text: `Estrategista: ${userMessage}\n\nForneça sua orientação estratégica fundamentada em formato JSON.` }]
    }
  ];

  const modelCandidates = ['gemini-1.5-flash-latest', 'gemini-1.5-pro-latest', 'gemini-1.5-flash', 'gemini-pro'];
  let lastError: any = null;

  for (const modelName of modelCandidates) {
    try {
      const response = await ai.models.generateContent({
        model: modelName,
        contents: contents,
        config: {
          systemInstruction,
          responseMimeType: 'application/json',
          responseSchema: strategicChatResponseSchema,
          temperature: 0.3,
        },
      });

      if (!response.text) {
        throw new Error(`Modelo ${modelName} retornou resposta em branco.`);
      }

      const chatResponse: StrategicChatResponse = JSON.parse(response.text);

      // Salva a interação no histórico do Supabase
      await saveChatMessageToHistory(
        organizationId,
        clientId,
        userMessage,
        chatResponse
      );

      return chatResponse;
    } catch (error: any) {
      console.warn(`⚠️ Tentativa com modelo ${modelName} no strategicChat falhou:`, error.message || error);
      lastError = error;
    }
  }

  console.error('❌ Erro no Chat Estratégico em todos os modelos:', lastError);
  throw lastError || new Error('Falha no Chat Estratégico com todos os modelos do Gemini.');
}
