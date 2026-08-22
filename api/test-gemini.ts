const MODEL_CANDIDATES = [
  'gemini-3.6-flash',
  'gemini-3.7-flash',
  'gemini-3.5-flash',
  'gemini-flash-latest',
  'gemini-pro-latest'
];

export default async function handler(req: any, res: any) {
  const apiKey = (process.env.GEMINI_API_KEY || '').trim();

  if (!apiKey) {
    return res.status(500).json({
      status: 'error',
      message: 'GEMINI_API_KEY ausente ou não configurada no servidor.'
    });
  }

  try {
    // 1. Listar os modelos disponíveis para esta chave
    let availableModels: string[] = [];
    try {
      const listRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
      const listData = await listRes.json();
      if (listData.models) {
        availableModels = listData.models
          .filter((m: any) => m.supportedGenerationMethods?.includes('generateContent'))
          .map((m: any) => m.name.replace('models/', ''));
      }
    } catch (e) {
      console.warn('Aviso ao consultar modelos disponíveis:', e);
    }

    // 2. Mescla a lista prioritária pedida com os modelos disponíveis da conta
    const searchList = [
      ...MODEL_CANDIDATES,
      ...availableModels.filter(m => !MODEL_CANDIDATES.includes(m))
    ];

    let successResponse = null;
    let errors: any[] = [];

    for (const modelToUse of searchList) {
      try {
        const testRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${modelToUse}:generateContent?key=${apiKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: 'Responda com apenas uma palavra: OK' }] }]
          })
        });

        const testData = await testRes.json();

        if (testRes.ok && testData.candidates?.[0]?.content?.parts?.[0]?.text) {
          successResponse = {
            status: 'ok',
            message: 'Conexão com Gemini validada com sucesso!',
            modelUsed: modelToUse,
            availableModelsInAccount: availableModels,
            reply: testData.candidates[0].content.parts[0].text
          };
          break;
        } else {
          errors.push({ model: modelToUse, error: testData });
        }
      } catch (err: any) {
        errors.push({ model: modelToUse, error: err.message });
      }
    }

    if (successResponse) {
      return res.status(200).json(successResponse);
    } else {
      return res.status(500).json({
        status: 'error',
        message: 'Nenhum modelo respondeu com sucesso.',
        candidatesTried: searchList,
        availableModelsInAccount: availableModels,
        errors
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
