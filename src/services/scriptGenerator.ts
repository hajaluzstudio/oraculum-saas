import { GoogleGenAI, Type, Schema } from '@google/genai';
import dotenv from 'dotenv';
import { loadDossiersFromDisk, loadClientsFromDisk } from './diskStorage';

dotenv.config();

export interface ScriptScene {
  timestamp: string; // Ex: "00:00 - 00:03"
  sceneDescription: string; // Instrução visual e de iluminação para o videomaker
  spokenWords: string; // Falas exatas para o teleprompter
  bRollVisual: string; // Imagem de cobertura ou corte B-Roll
  neuromarketingTrigger: string; // Ex: "Quebra de Padrão", "Ancoragem de Alto Valor"
}

export interface GeneratedVideoScript {
  scriptTitle: string;
  scriptType: 'reels_30s' | 'vsl_60s' | 'authority_video' | 'objection_killer';
  clientName: string;
  niche: string;
  hook0to3s: {
    visualScene: string;
    spokenWords: string;
    onScreenText: string;
  };
  timelineScenes: ScriptScene[];
  callToAction: {
    spokenWords: string;
    visualText: string;
  };
  teleprompterFullText: string; // Texto contínuo para o teleprompter com pausas marcadas
  recordingTips: string[];
  generatedAt: string;
}

const apiKey = process.env.GEMINI_API_KEY;
export const ai = new GoogleGenAI({
  apiKey: apiKey || '',
});

const scriptSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    scriptTitle: {
      type: Type.STRING,
      description: "Título atrativo e profissional do roteiro",
    },
    scriptType: {
      type: Type.STRING,
      enum: ["reels_30s", "vsl_60s", "authority_video", "objection_killer"],
      description: "Tipo de formato de vídeo",
    },
    hook0to3s: {
      type: Type.OBJECT,
      properties: {
        visualScene: { type: Type.STRING, description: "Cena de impacto visual nos primeiros 3s" },
        spokenWords: { type: Type.STRING, description: "Primeira frase de quebra de padrão" },
        onScreenText: { type: Type.STRING, description: "Texto/legenda em alto contraste na tela" },
      },
      required: ["visualScene", "spokenWords", "onScreenText"],
    },
    timelineScenes: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          timestamp: { type: Type.STRING },
          sceneDescription: { type: Type.STRING },
          spokenWords: { type: Type.STRING },
          bRollVisual: { type: Type.STRING },
          neuromarketingTrigger: { type: Type.STRING },
        },
        required: ["timestamp", "sceneDescription", "spokenWords", "bRollVisual", "neuromarketingTrigger"],
      },
    },
    callToAction: {
      type: Type.OBJECT,
      properties: {
        spokenWords: { type: Type.STRING },
        visualText: { type: Type.STRING },
      },
      required: ["spokenWords", "visualText"],
    },
    teleprompterFullText: {
      type: Type.STRING,
      description: "Texto completo pronto para rolagem no teleprompter com quebras de linha limpas",
    },
    recordingTips: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: "Dicas de postura, enquadramento e tom de voz",
    },
  },
  required: [
    "scriptTitle",
    "scriptType",
    "hook0to3s",
    "timelineScenes",
    "callToAction",
    "teleprompterFullText",
    "recordingTips",
  ],
};

export async function generateAutonomousScript(input: {
  clientId: string;
  scriptType: 'reels_30s' | 'vsl_60s' | 'authority_video' | 'objection_killer';
  customGoal?: string;
}): Promise<GeneratedVideoScript> {
  const clients = loadClientsFromDisk();
  const client = clients.find(c => c.id === input.clientId) || { name: 'Cliente Ativo', niche: 'Médico Cirurgião Plástico' };
  
  const dossiers = loadDossiersFromDisk();
  const dossier = dossiers[input.clientId] || null;

  const hookGuidelines = dossier?.neuromarketingGuidelines?.visualHooksFirst3s?.join(', ') || 'Corte dinâmico no 0.5s e quebra de padrão';
  const verbalHooks = dossier?.neuromarketingGuidelines?.verbalHooksFirst3s?.join(', ') || 'A verdade que ninguém te conta';
  const icp = dossier?.marketOverview?.targetAudience || 'Alta Renda';
  const averageTicket = dossier?.budgetPricingStrategy?.suggestedAverageTicket || 'R$ 15.000,00';

  const systemInstruction = `Você é o Diretor Criativo e Roteirista Chefe de Vídeos de Alta Conversão da agência de Marketing Híbrido ROI-First.
Sua missão é gerar um ROTEIRO CIRÚRGICO DE GRAVAÇÃO com Teleprompter para o cliente gravar no estúdio ou com smartphone.

REGRAS INEGOCIÁVEIS:
1. HOOK DOS 3 SEGUNDOS: O vídeo deve começar imediatamente com um gancho visual visceral e frase de impacto sem enrolação ou vinhetas.
2. NEUROMARKETING APLICADO: Alinhe o roteiro com a psicologia de consumo de alto padrão (ICP: ${icp}).
3. FORMATO TELEPROMPTER: O campo 'teleprompterFullText' deve conter o texto perfeito e natural para ser lido na velocidade de conversa executiva.`;

  const prompt = `Gere um Roteiro de Gravação de Alta Conversão para o seguinte cliente:
- Cliente: "${client.name}"
- Nicho: "${client.niche}"
- Formato Desejado: "${input.scriptType}"
- Objetivo da Campanha: "${input.customGoal || 'Conversão de leads de alto valor e ancoragem de autoridade'}"
- Ticket Médio do Serviço: "${averageTicket}"
- Ganchos Visuais Recomendados no Dossiê: ${hookGuidelines}
- Ganchos Verbais Recomendados no Dossiê: ${verbalHooks}

Gere o roteiro completo em formato JSON seguindo o schema fornecido.`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        systemInstruction,
        responseMimeType: 'application/json',
        responseSchema: scriptSchema,
        temperature: 0.3,
      },
    });

    if (!response.text) {
      throw new Error('A API do Gemini retornou uma resposta em branco.');
    }

    const scriptData = JSON.parse(response.text);
    return {
      ...scriptData,
      clientName: client.name,
      niche: client.niche,
      generatedAt: new Date().toISOString(),
    };
  } catch (error) {
    console.error('❌ Erro na geração do roteiro por IA:', error);
    // Fallback estruturado de alta qualidade caso ocorra timeout
    return {
      scriptTitle: `Roteiro de Alta Retenção - ${client.name}`,
      scriptType: input.scriptType,
      clientName: client.name,
      niche: client.niche,
      hook0to3s: {
        visualScene: 'Médico ajustando o foco da lente ou instrumento cirúrgico, olhando fixamente para a lente com iluminação cinematográfica lateral.',
        spokenWords: 'Se você ainda acredita que o resultado depende apenas de sorte, precisa ver isso.',
        onScreenText: 'O FIM DAS INCERTEZAS'
      },
      timelineScenes: [
        {
          timestamp: '00:00 - 00:03',
          sceneDescription: 'Close-up no olhar com texto em amarelo neon no topo.',
          spokenWords: 'Se você ainda acredita que o resultado depende apenas de sorte, precisa ver isso.',
          bRollVisual: 'Corte rápido para equipamento de tecnologia avançada.',
          neuromarketingTrigger: 'Quebra de Padrão Visual'
        },
        {
          timestamp: '00:03 - 00:15',
          sceneDescription: 'Plano médio, postura de autoridade incontestável.',
          spokenWords: 'A maioria das pessoas busca procedimentos genéricos e se frustra. Na nossa metodologia, cada milímetro é planejado com precisão robótica antes mesmo de você entrar na sala.',
          bRollVisual: 'Demonstração de planejamento 3D na tela do consultório.',
          neuromarketingTrigger: 'Ancoragem de Exclusividade e Segurança'
        },
        {
          timestamp: '00:15 - 00:25',
          sceneDescription: 'Gesto de aproximação com a mão, tom confidencial e seguro.',
          spokenWords: 'Não é sobre mudar quem você é, mas sobre realçar sua melhor versão com o padrão que você merece.',
          bRollVisual: 'Sorriso de satisfação de paciente em ambiente elegante.',
          neuromarketingTrigger: 'Desejo de Status e Reconhecimento'
        },
        {
          timestamp: '00:25 - 00:30',
          sceneDescription: 'Olhar direto com chamada de ação clara e objetiva.',
          spokenWords: 'Clique no botão abaixo para agendar sua avaliação exclusiva com nossa equipe.',
          bRollVisual: 'Tela com logotipo discreto e botão de agendamento.',
          neuromarketingTrigger: 'Call to Action de Alta Conversão'
        }
      ],
      callToAction: {
        spokenWords: 'Clique no botão abaixo para agendar sua avaliação exclusiva.',
        visualText: 'AGENDAR CONSULTA VIP'
      },
      teleprompterFullText: `Se você ainda acredita que o resultado depende apenas de sorte, precisa ver isso.\n\nA maioria das pessoas busca procedimentos genéricos e se frustra. Na nossa metodologia, cada milímetro é planejado com precisão robótica antes mesmo de você entrar na sala.\n\nNão é sobre mudar quem você é, mas sobre realçar sua melhor versão com o padrão que você merece.\n\nClique no botão abaixo para agendar sua avaliação exclusiva.`,
      recordingTips: [
        'Mantenha a câmera na altura exata dos olhos para transmitir confiança e autoridade.',
        'Use uma velocidade de fala firme e pausada, fazendo uma micro-pausa de 0.5s após a primeira frase.',
        'Grave com luz natural ou softbox a 45 graus para realçar o contraste visual.'
      ],
      generatedAt: new Date().toISOString()
    };
  }
}
