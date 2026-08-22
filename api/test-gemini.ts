import { Request, Response } from 'express';

const MODEL_CANDIDATES = [
  'gemini-1.5-flash-latest',
  'gemini-1.5-pro-latest',
  'gemini-1.5-flash',
  'gemini-pro'
];

export default async function handler(req: Request, res: Response) {
  try {
    console.log('[Test-Gemini API] Iniciando teste de diagnóstico com fallback de modelos...');
    
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({
        status: 'error',
        message: 'A variável de ambiente GEMINI_API_KEY não está configurada no servidor (process.env.GEMINI_API_KEY é undefined).',
        detail: 'Configure a variável GEMINI_API_KEY no arquivo .env ou no painel da Vercel.'
      });
    }

    const keyLimpa = apiKey.trim();
    let lastError: any = null;

    for (const modelName of MODEL_CANDIDATES) {
      try {
        console.log(`[Test-Gemini API] Testando modelo: ${modelName}...`);
        const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${keyLimpa}`;

        const response = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: 'Ping de teste de diagnóstico Oraculum' }] }]
          })
        });

        if (response.ok) {
          const data = await response.json();
          const replyText = data.candidates?.[0]?.content?.parts?.[0]?.text;
          console.log(`✅ [Test-Gemini API] Sucesso com modelo: ${modelName}`);

          return res.status(200).json({
            status: 'ok',
            message: 'Conexão com Gemini validada com sucesso!',
            modelUsed: modelName,
            geminiReplySnippet: replyText ? replyText.substring(0, 100) + '...' : 'Sem texto'
          });
        }

        const errBody = await response.json().catch(() => ({}));
        console.warn(`⚠️ [Test-Gemini API] Modelo ${modelName} falhou (HTTP ${response.status}):`, errBody?.error?.message || response.statusText);
        lastError = { httpStatus: response.status, modelTried: modelName, error: errBody?.error || response.statusText };
      } catch (err: any) {
        console.warn(`⚠️ Exceção ao tentar modelo ${modelName}:`, err.message);
        lastError = { modelTried: modelName, error: err.message };
      }
    }

    return res.status(500).json({
      status: 'error',
      message: 'Todos os modelos do Gemini falharam na comunicação.',
      candidatesTried: MODEL_CANDIDATES,
      lastError
    });

  } catch (error: any) {
    console.error('❌ [Test-Gemini API] Erro não tratado durante o diagnóstico:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Exceção interna ao executar o teste do Gemini',
      detail: error.message || String(error)
    });
  }
}
