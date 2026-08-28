import { GoogleGenAI } from '@google/genai';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  try {
    const { nicho } = req.body;
    if (!nicho) {
      return res.status(400).json({ error: 'Nicho não informado.' });
    }

    // Puxa a chave direto das Variáveis de Ambiente da Vercel de forma segura
    const apiKey = process.env.GEMINI_API_KEY || process.env.GEMINI_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: 'Chave do Gemini não configurada no servidor.' });
    }

    const ai = new GoogleGenAI({ apiKey });

    const promptText = `Atue como um Agente de Inteligência de Mercado e analise o nicho: "${nicho}". 
    Gere um relatório estrito em JSON contendo:
    1. "marketTrends": array com 3 tendências globais atuais.
    2. "regulatoryCompliance": objeto com "forbiddenClaims" (array) e "mandatoryDisclaimers" (array).
    3. "topPlayersAnalysis": array com 3 objetos contendo "name", "marketPosition" e "copyPattern".
    Retorne APENAS o JSON limpo sem formatação markdown.`;

    // Utiliza o modelo flash padrão e seguro com pesquisa web integrada
    const response = await ai.models.generateContent({
      model: 'gemini-1.5-flash',
      contents: promptText,
      config: {
        tools: [{ googleSearch: {} }],
      },
    });

    const rawText = response.text || "{}";
    const cleanJsonStr = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
    const dossierData = JSON.parse(cleanJsonStr);
    dossierData.lastAutoScrapedAt = new Date().toISOString();

    return res.status(200).json({ success: true, dossierData });
  } catch (err) {
    console.error("Erro no scraper do servidor:", err);
    return res.status(500).json({ error: err.message });
  }
}
