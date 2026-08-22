// =======================================================
// RADAR DE CONCORRENTES & TENDÊNCIAS DE MERCADO (ORACULUM IA)
// =======================================================

async function runAutonomousMarketHunter(niche) {
  console.log(`[ROBÔ HUNTER] Iniciando varredura profunda de mercado para o nicho: ${niche}...`);

  const promptVarredura = `
Você é o Agente de Inteligência Competitiva e Radar de Mercado do Oraculum.
Sua missão é mapear o que os maiores players globais e nacionais estão utilizando AGORA no nicho de "${niche}".

PESQUISE E RETORNE:
1. Ganchos de alta conversão (Hooks de 3 segundos) mais usados atualmente.
2. Formatos de anúncios e criativos que estão escalando (ex: UGC, Reels estilo podcast, VSL nativa).
3. Ângulos de oferta e quebra de objeções em alta.

Responda ESTRITAMENTE em formato JSON com o seguinte formato:
{
  "niche": "${niche}",
  "trends": [
    {
      "source_channel": "Meta Ads / TikTok",
      "trend_title": "Título da tendência ou padrão de oferta",
      "hook_angle": "Gancho exato de abertura",
      "creative_format": "Estilo do criativo",
      "insight_summary": "Por que está funcionando e como aplicar"
    }
  ]
}
`;

  const rawKey = window.GEMINI_API_KEY || localStorage.getItem('ORACULUM_GEMINI_API_KEY') || localStorage.getItem('GEMINI_API_KEY');
  const apiKey = rawKey ? String(rawKey).trim() : null;
  if (!apiKey) {
    throw new Error("Chave de API do Gemini não encontrada ou vazia. Configure no Cofre de APIs.");
  }

  // Chamada com Search Grounding ativo no Gemini
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: promptVarredura }] }],
      generationConfig: { responseMimeType: "application/json" }
    })
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(`Falha no Robô Hunter (${response.status}): ${errData?.error?.message || 'Erro desconhecido'}`);
  }

  const result = await response.json();
  const rawText = result.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!rawText) {
    throw new Error("O Robô Hunter não retornou resposta.");
  }

  const data = JSON.parse(rawText);

  // Grava cada tendência encontrada na memória do Supabase (se disponível)
  if (data.trends && data.trends.length > 0) {
    const rows = data.trends.map(t => ({
      niche: niche,
      source_channel: t.source_channel,
      trend_title: t.trend_title,
      hook_angle: t.hook_angle,
      creative_format: t.creative_format,
      insight_summary: t.insight_summary
    }));

    if (window.supabaseClient) {
      try {
        await window.supabaseClient.from('market_trends').insert(rows);
        console.log(`[ROBÔ HUNTER] ${rows.length} novos insights gravados no Supabase com sucesso!`);
      } catch (e) {
        console.warn("[ROBÔ HUNTER] Erro ao gravar no Supabase market_trends:", e);
      }
    }

    // Salva no localStorage como fallback / suporte offline
    try {
      const existing = JSON.parse(localStorage.getItem(`market_trends_${niche}`) || '[]');
      const combined = [...rows, ...existing].slice(0, 20);
      localStorage.setItem(`market_trends_${niche}`, JSON.stringify(combined));
    } catch (e) {
      console.warn("[ROBÔ HUNTER] Erro ao gravar no localStorage:", e);
    }
  }

  return data;
}

window.runAutonomousMarketHunter = runAutonomousMarketHunter;
