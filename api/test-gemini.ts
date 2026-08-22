import { Request, Response } from 'express';

export default async function handler(req: Request, res: Response) {
  try {
    const apiKey = process.env.GEMINI_API_KEY?.trim();
    if (!apiKey) {
      return res.status(500).json({
        status: 'error',
        message: 'A variável de ambiente GEMINI_API_KEY não está configurada no servidor.'
      });
    }

    const modelNames = ['gemini-1.5-flash', 'gemini-1.5-pro', 'gemini-2.0-flash', 'gemini-pro'];

    let successResponse = null;
    let lastError = null;

    for (const model of modelNames) {
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: "Responda apenas: OK" }] }]
          })
        });

        const data = await response.json();
        if (response.ok && data.candidates?.[0]?.content?.parts?.[0]?.text) {
          successResponse = {
            modelUsed: model,
            reply: data.candidates[0].content.parts[0].text
          };
          break;
        } else {
          lastError = data;
        }
      } catch (err) {
        lastError = err;
      }
    }

    if (successResponse) {
      return res.status(200).json({
        status: "ok",
        message: "Conexão com Gemini validada com sucesso!",
        ...successResponse
      });
    } else {
      return res.status(500).json({
        status: "error",
        message: "Nenhum modelo respondeu",
        detail: lastError
      });
    }

  } catch (error: any) {
    return res.status(500).json({
      status: "error",
      message: "Erro no handler de diagnóstico",
      detail: error.message || String(error)
    });
  }
}
