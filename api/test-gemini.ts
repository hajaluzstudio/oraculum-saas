import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const apiKey = (process.env.GEMINI_API_KEY || '').trim();

  if (!apiKey) {
    return res.status(500).json({
      status: 'error',
      message: 'GEMINI_API_KEY ausente ou não configurada no servidor.'
    });
  }

  try {
    // 1. Listar os modelos disponíveis para esta chave
    const listRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
    const listData = await listRes.json();

    if (!listRes.ok || !listData.models) {
      return res.status(listRes.status).json({
        status: 'error',
        message: 'Falha ao consultar modelos disponíveis na API do Google.',
        detail: listData
      });
    }

    // Filtra apenas modelos que suportam geração de conteúdo
    const supportedModels = listData.models
      .filter((m: any) => m.supportedGenerationMethods?.includes('generateContent'))
      .map((m: any) => m.name.replace('models/', ''));

    // 2. Tenta o primeiro modelo suportado retornado pela própria conta do Google
    const modelToUse = supportedModels[0] || 'gemini-1.5-flash';

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
        availableModelsInAccount: supportedModels,
        reply: testData.candidates?.[0]?.content?.parts?.[0]?.text || 'OK'
      });
    } else {
      return res.status(testRes.status).json({
        status: 'error',
        message: `Erro ao gerar conteúdo com o modelo ${modelToUse}`,
        detail: testData,
        availableModelsInAccount: supportedModels
      });
    }
  } catch (err: any) {
    return res.status(500).json({
      status: 'error',
      message: 'Exceção interna ao testar API do Gemini',
      detail: err.message
    });
  }
}
