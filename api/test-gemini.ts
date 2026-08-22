import { Request, Response } from 'express';

export default async function handler(req: Request, res: Response) {
  try {
    console.log('[Test-Gemini API] Iniciando teste de diagnóstico de ambiente e conexão com o Gemini...');
    
    const apiKey = process.env.GEMINI_API_KEY;
    console.log('[Test-Gemini API] Presença de process.env.GEMINI_API_KEY:', apiKey ? 'Siga OK (presente)' : '❌ Ausente');

    if (!apiKey) {
      return res.status(500).json({
        status: 'error',
        message: 'A variável de ambiente GEMINI_API_KEY não está configurada no servidor (process.env.GEMINI_API_KEY é undefined).',
        detail: 'Configure a variável GEMINI_API_KEY no arquivo .env ou no painel da Vercel.'
      });
    }

    const keyLimpa = apiKey.trim();
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${keyLimpa}`;

    console.log('[Test-Gemini API] Enviando requisição de ping para o Google Gemini API...');
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: 'Ping de teste de diagnóstico Oraculum' }] }]
      })
    });

    console.log('[Test-Gemini API] Status HTTP da resposta do Gemini:', response.status);

    if (!response.ok) {
      const errBody = await response.json().catch(() => ({}));
      console.error('[Test-Gemini API] Erro retornado pela API do Gemini:', errBody);
      return res.status(response.status).json({
        status: 'error',
        httpStatus: response.status,
        message: `Falha na comunicação com a API do Gemini: ${errBody?.error?.message || response.statusText}`,
        detail: errBody
      });
    }

    const data = await response.json();
    const replyText = data.candidates?.[0]?.content?.parts?.[0]?.text;

    console.log('[Test-Gemini API] Resposta recebida do Gemini com sucesso!');

    return res.status(200).json({
      status: 'ok',
      message: 'Conexão com Gemini validada com sucesso!',
      model: 'gemini-1.5-flash',
      geminiReplySnippet: replyText ? replyText.substring(0, 100) + '...' : 'Sem texto'
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
