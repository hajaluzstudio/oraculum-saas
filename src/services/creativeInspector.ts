import { GoogleGenAI, Type, Schema } from '@google/genai';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { supabase } from './supabaseClient';

dotenv.config();

/**
 * Interfaces para o relatório técnico de Visão Computacional / AI Creative Scoring
 */
export interface HookAnalysis {
  retentionFactor: string;
  patternInterruptQuality: string;
  textLegibilityFirst3s: string;
  emotionalImpact: string;
}

export interface NeuromarketingChecklist {
  hasClearCallToAction: boolean;
  hasSubconsciousTrigger: boolean;
  hasBrandAuthoritySignal: boolean;
  hasZeroMetadaInconsistency: boolean;
}

export interface CreativeInspectionReport {
  assetTitle: string;
  assetType: 'image' | 'video' | 'carousel';
  niche: string;
  aiOverallScore: number; // 0 - 100
  aiHookScore: number;    // 0 - 100 (Score de retenção dos primeiros 3s)
  isApproved: boolean;
  verdict: 'APPROVED' | 'REJECTED' | 'NEEDS_REVISION';
  hookAnalysis: HookAnalysis;
  conversionFlaws: string[];
  surgicalFixes: string[];
  neuromarketingChecklist: NeuromarketingChecklist;
  analyzedAt: string;
}

export interface InspectCreativeInput {
  filePath?: string;
  base64Data?: string;
  mimeType?: string;
  assetTitle: string;
  assetType: 'image' | 'video' | 'carousel';
  niche: string;
  organizationId?: string;
  clientId?: string;
  assetId?: string; // Se fornecido, atualiza o registro na tabela creative_assets do Supabase
}

// Inicialização da SDK oficial @google/genai
const apiKey = process.env.GEMINI_API_KEY;
export const ai = new GoogleGenAI({
  apiKey: apiKey || '',
});

/**
 * Schema JSON estrito para o retorno do relatório de Visão Computacional do Gemini
 */
const creativeReportSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    assetTitle: { type: Type.STRING },
    assetType: { type: Type.STRING },
    niche: { type: Type.STRING },
    aiOverallScore: { type: Type.NUMBER, description: "Nota global de 0 a 100 de conversão visual" },
    aiHookScore: { type: Type.NUMBER, description: "Nota de 0 a 100 de retenção visual nos primeiros 3 segundos" },
    isApproved: { type: Type.BOOLEAN, description: "true se aiOverallScore >= 75 e aiHookScore >= 70" },
    verdict: { type: Type.STRING, description: "APPROVED, REJECTED ou NEEDS_REVISION" },
    hookAnalysis: {
      type: Type.OBJECT,
      properties: {
        retentionFactor: { type: Type.STRING, description: "Fator de atração e engajamento inicial" },
        patternInterruptQuality: { type: Type.STRING, description: "Avaliação da quebra de padrão visual" },
        textLegibilityFirst3s: { type: Type.STRING, description: "Clareza e legibilidade da primeira frase/legenda" },
        emotionalImpact: { type: Type.STRING, description: "Impacto emocional visual imediato" },
      },
      required: ["retentionFactor", "patternInterruptQuality", "textLegibilityFirst3s", "emotionalImpact"],
    },
    conversionFlaws: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: "Erros visuais, pontos cegos ou falhas de retenção identificadas",
    },
    surgicalFixes: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: "Ajustes cirúrgicos recomendados para elevar o ROI e a retenção do criativo",
    },
    neuromarketingChecklist: {
      type: Type.OBJECT,
      properties: {
        hasClearCallToAction: { type: Type.BOOLEAN },
        hasSubconsciousTrigger: { type: Type.BOOLEAN },
        hasBrandAuthoritySignal: { type: Type.BOOLEAN },
        hasZeroMetadaInconsistency: { type: Type.BOOLEAN },
      },
      required: [
        "hasClearCallToAction",
        "hasSubconsciousTrigger",
        "hasBrandAuthoritySignal",
        "hasZeroMetadaInconsistency",
      ],
    },
  },
  required: [
    "assetTitle",
    "assetType",
    "niche",
    "aiOverallScore",
    "aiHookScore",
    "isApproved",
    "verdict",
    "hookAnalysis",
    "conversionFlaws",
    "surgicalFixes",
    "neuromarketingChecklist",
  ],
};

/**
 * Determina o MimeType do arquivo caso não seja informado
 */
function inferMimeType(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  switch (ext) {
    case '.jpg':
    case '.jpeg':
      return 'image/jpeg';
    case '.png':
      return 'image/png';
    case '.webp':
      return 'image/webp';
    case '.mp4':
      return 'video/mp4';
    case '.mov':
      return 'video/quicktime';
    case '.webm':
      return 'video/webm';
    default:
      return 'image/jpeg';
  }
}

/**
 * Inspeciona e avalia um criativo (imagem ou vídeo) via Visão Computacional Gemini API (@google/genai).
 * Avalia a peça frame a frame focando na retenção dos 3 primeiros segundos (Hook),
 * fornecendo feedback cirúrgico para otimização de conversão e ROI.
 */
export async function inspectCreativeAsset(
  input: InspectCreativeInput
): Promise<CreativeInspectionReport> {
  const { filePath, base64Data, assetTitle, assetType, niche, organizationId, clientId, assetId } = input;

  let mimeType = input.mimeType;
  let fileBuffer: Buffer;

  if (filePath) {
    if (!fs.existsSync(filePath)) {
      throw new Error(`Arquivo não encontrado no caminho especificado: ${filePath}`);
    }
    fileBuffer = fs.readFileSync(filePath);
    if (!mimeType) {
      mimeType = inferMimeType(filePath);
    }
  } else if (base64Data) {
    fileBuffer = Buffer.from(base64Data, 'base64');
    if (!mimeType) {
      mimeType = 'image/jpeg';
    }
  } else {
    throw new Error('É necessário fornecer um filePath ou base64Data para análise multimídia.');
  }

  console.log(`[Creative Inspector] 👁️ Analisando peça multimídia "${assetTitle}" (${assetType}) para o nicho "${niche}"...`);

  const mediaPart = {
    inlineData: {
      data: fileBuffer.toString('base64'),
      mimeType: mimeType,
    },
  };

  const systemInstruction = `Você é o Diretor de Arte Sênior, Especialista em Visão Computacional e Arquiteto de Neuromarketing da plataforma de Marketing Híbrido.
Sua missão é inspecionar minuciosamente a imagem ou o vídeo fornecido.

REGRAS DE ANÁLISE RIGOROSAS:
1. SE FOR VÍDEO: Analise o GANCHO (HOOK) dos primeiros 3 segundos quadro a quadro. Identifique se existe quebra de padrão visual (pattern interrupt), contraste, texto visível nos primeiros 1.5s e clareza de proposta.
2. SE FOR IMAGEM/CARD: Avalie a hierarquia visual, legibilidade do título, gatilho emocional e sinalização de autoridade de marca.
3. CRITÉRIOS DE APROVAÇÃO:
   - Aprovado (isApproved = true, verdict = 'APPROVED'): aiOverallScore >= 75 E aiHookScore >= 70.
   - Ajustes necessários (verdict = 'NEEDS_REVISION'): aiOverallScore entre 60 e 74.
   - Reprovado (verdict = 'REJECTED'): aiOverallScore < 60 ou aiHookScore < 50.
4. FORNEÇA AJUSTES CIRÚRGICOS: Liste sugestões objetivas, práticas e diretas para a equipe de design e edição sobre como corrigir a cor, enquadramento, iluminação, fontes, contraste ou gatilho visual.`;

  const prompt = `Analise o criativo intitulado "${assetTitle}" do tipo "${assetType}" destinado ao nicho de mercado "${niche}".
Estruture o diagnóstico completo de retenção, hook score (0-100) e lista de ajustes cirúrgicos em formato JSON de acordo com o schema solicitado.`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [mediaPart, prompt],
      config: {
        systemInstruction,
        responseMimeType: 'application/json',
        responseSchema: creativeReportSchema,
        temperature: 0.2,
      },
    });

    if (!response.text) {
      throw new Error('A API do Gemini retornou uma resposta em branco durante a análise multimídia.');
    }

    const parsedReport = JSON.parse(response.text);

    const report: CreativeInspectionReport = {
      ...parsedReport,
      assetTitle,
      assetType,
      niche,
      analyzedAt: new Date().toISOString(),
    };

    console.log(`[Creative Inspector] ✅ Análise concluída. Verdict: ${report.verdict} | Overall Score: ${report.aiOverallScore} | Hook Score: ${report.aiHookScore}`);

    // Se um assetId foi fornecido, atualiza automaticamente o registro no Supabase
    if (assetId && organizationId) {
      const statusMap = {
        APPROVED: 'ai_approved',
        REJECTED: 'ai_rejected',
        NEEDS_REVISION: 'processing',
      };

      const { error: dbError } = await supabase
        .from('creative_assets')
        .update({
          ai_overall_score: report.aiOverallScore,
          ai_hook_score: report.aiHookScore,
          status: statusMap[report.verdict] || 'processing',
          ai_feedback: report,
        })
        .eq('id', assetId)
        .eq('organization_id', organizationId);

      if (dbError) {
        console.warn('[Creative Inspector] ⚠️ Erro ao atualizar os dados do criativo no Supabase:', dbError.message);
      } else {
        console.log(`[Creative Inspector] 💾 Registro do criativo ID ${assetId} atualizado no Supabase.`);
      }
    }

    return report;
  } catch (error) {
    console.error('❌ Erro durante a inspeção multimídia do criativo:', error);
    throw error;
  }
}
