import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const apiKey = (process.env.GEMINI_API_KEY || '').trim();

  if (!apiKey) {
    return res.status(500).json({
      status: 'error',
      message: 'GEMINI_API_KEY ausente ou vazia no process.env.'
    });
  }

  // 1. Consulta quais modelos estão liberados para esta chave
  let availableModels: string[] = [];
  try {
    const listRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
    const listData = await listRes.json();
    if (listData.models) {
      availableModels = listData.models.map((m: any) => m.name.replace('models/', ''));
    }
  } catch (err: any) {
    console.error('Erro ao listar modelos:', err);
  }

  // 2. Modelos para testar
  const candidates = availableModels.length > 0 
    ? availableModels.filter(m => m.includes('gemini'))
    : ['gemini-2.0-flash', 'gemini-1.5-flash-latest', 'gemini-1.5-flash', 'gemini-1.5-pro', 'gemini-pro'];

  let success = null;
  let errors: any[] = [];

  for (const model of candidates) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: 'Responda com apenas uma palavra: OK' }] }]
        })
      });

      const data = await response.json();
      if (response.ok && data.candidates?.[0]?.content?.parts?.[0]?.text) {
        success = {
          status: 'ok',
          message: 'Conexão com Gemini validada com sucesso!',
          modelUsed: model,
          reply: data.candidates[0].content.parts[0].text,
          availableModelsInAccount: availableModels
        };
        break;
      } else {
        errors.push({ model, error: data });
      }
    } catch (e: any) {
      errors.push({ model, error: e.message });
    }
  }

  if (success) {
    return res.status(200).json(success);
  }

  return res.status(500).json({
    status: 'error',
    message: 'Nenhum modelo respondeu com sucesso.',
    availableModelsFound: availableModels,
    errors
  });
}
