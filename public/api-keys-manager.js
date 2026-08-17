// Gerenciador Definitivo de Chaves de API (Gemini & ElevenLabs com Supabase)

window.getGeminiKey = async function() {
  // 1. Tenta o cache imediato no LocalStorage
  let key = localStorage.getItem('GEMINI_API_KEY') || localStorage.getItem('gemini_api_key') || localStorage.getItem('custom_gemini_api_key') || localStorage.getItem('oraculum_gemini_key');
  if (key && key.trim()) return key.trim();

  // 2. Se não tiver no cache, busca no Supabase / Backend DB (agency_settings)
  try {
    const res = await fetch('/api/agency-settings');
    if (res.ok) {
      const json = await res.json();
      if (json.success && json.settings && json.settings.GEMINI_API_KEY) {
        const dbKey = json.settings.GEMINI_API_KEY.trim();
        localStorage.setItem('GEMINI_API_KEY', dbKey);
        localStorage.setItem('gemini_api_key', dbKey);
        return dbKey;
      }
    }
  } catch (err) {
    console.warn("Erro ao buscar chave no Supabase/Backend:", err);
  }

  // 3. Fallback para variáveis de ambiente
  return (window.ENV_GEMINI_API_KEY || (typeof process !== 'undefined' && process.env ? process.env.GEMINI_API_KEY : '') || '').trim();
};

window.salvarGeminiKey = async function(novaChave) {
  const inputEl = document.getElementById('setting-gemini-key') || document.getElementById('gemini-api-key');
  const chaveLimpa = (novaChave || (inputEl ? inputEl.value : '') || '').trim();

  if (!chaveLimpa) {
    alert("⚠️ Por favor, insira uma chave de API válida para o Google Gemini.");
    return;
  }

  // Salva no LocalStorage
  localStorage.setItem('GEMINI_API_KEY', chaveLimpa);
  localStorage.setItem('gemini_api_key', chaveLimpa);
  localStorage.setItem('custom_gemini_api_key', chaveLimpa);

  // Salva no Supabase / Backend DB
  try {
    await fetch('/api/agency-settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        settings: {
          GEMINI_API_KEY: chaveLimpa
        }
      })
    });
  } catch (err) {
    console.error("Erro ao persistir chave no Supabase:", err);
  }

  alert("✅ Chave do Gemini salva com sucesso no Banco de Dados!");
  await window.testarConexaoGeminiReal();
};

window.testarConexaoGeminiReal = async function() {
  const statusBadge = document.getElementById('badge-gemini-status');
  const inputKey = document.getElementById('setting-gemini-key') || document.getElementById('gemini-api-key');
  let apiKey = inputKey ? inputKey.value.trim() : '';

  if (!apiKey) {
    apiKey = await window.getGeminiKey();
  }

  if (!apiKey) {
    if (statusBadge) {
      statusBadge.innerText = "● Desconectada";
      statusBadge.style.background = "rgba(239, 68, 68, 0.15)";
      statusBadge.style.color = "#F87171";
      statusBadge.style.border = "1px solid rgba(239, 68, 68, 0.3)";
    }
    return;
  }

  if (statusBadge) {
    statusBadge.innerText = "⏳ Validando...";
    statusBadge.style.background = "rgba(234, 179, 8, 0.15)";
    statusBadge.style.color = "#FACC15";
    statusBadge.style.border = "1px solid rgba(234, 179, 8, 0.3)";
  }

  const keyLimpa = apiKey.trim();

  // 1. Tenta listar modelos diretamente da conta do usuário via GET /models
  let listaTentativas = [];

  for (const apiVer of ['v1beta', 'v1']) {
    try {
      const resList = await fetch(`https://generativelanguage.googleapis.com/${apiVer}/models?key=${keyLimpa}`);
      if (resList.ok) {
        const dataList = await resList.json();
        if (dataList.models && Array.isArray(dataList.models)) {
          const validos = dataList.models.filter(m => 
            m.supportedGenerationMethods && m.supportedGenerationMethods.includes('generateContent')
          );
          validos.forEach(m => {
            const name = m.name.replace('models/', '');
            listaTentativas.push({ apiVersion: apiVer, modelName: name });
          });
        }
      }
    } catch (e) {
      console.warn(`Aviso ao consultar modelos (${apiVer}):`, e);
    }
  }

  if (listaTentativas.length === 0) {
    listaTentativas = [
      { apiVersion: 'v1beta', modelName: 'gemini-2.0-flash' },
      { apiVersion: 'v1beta', modelName: 'gemini-1.5-flash' },
      { apiVersion: 'v1',     modelName: 'gemini-1.5-flash' },
      { apiVersion: 'v1beta', modelName: 'gemini-1.5-flash-latest' },
      { apiVersion: 'v1beta', modelName: 'gemini-2.0-flash-exp' },
      { apiVersion: 'v1beta', modelName: 'gemini-1.5-flash-8b' },
      { apiVersion: 'v1beta', modelName: 'gemini-1.5-pro' },
      { apiVersion: 'v1beta', modelName: 'gemini-pro' },
      { apiVersion: 'v1',     modelName: 'gemini-pro' }
    ];
  }

  let conectou = false;
  let ultimoErro = '';
  let modeloSucesso = '';

  for (const item of listaTentativas) {
    try {
      const res = await fetch(`https://generativelanguage.googleapis.com/${item.apiVersion}/models/${item.modelName}:generateContent?key=${keyLimpa}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: "ping" }] }]
        })
      });

      if (res.ok) {
        conectou = true;
        modeloSucesso = `${item.modelName} (${item.apiVersion})`;
        break;
      } else {
        const err = await res.json().catch(() => ({}));
        ultimoErro = err.error?.message || `HTTP ${res.status}`;
        if (res.status !== 404 && !ultimoErro.includes('not found')) {
          break;
        }
      }
    } catch (error) {
      ultimoErro = error.message;
    }
  }

  if (conectou) {
    if (statusBadge) {
      statusBadge.innerText = `● Conectada & Operacional (${modeloSucesso})`;
      statusBadge.style.background = "rgba(16, 185, 129, 0.15)";
      statusBadge.style.color = "#34D399";
      statusBadge.style.border = "1px solid rgba(16, 185, 129, 0.3)";
    }
    const audit = document.getElementById('audit-log-gemini');
    if (audit) audit.innerText = `Última verificação: Conexão com ${modeloSucesso} estabelecida com sucesso!`;
  } else {
    if (statusBadge) {
      statusBadge.innerText = `● Erro: ${ultimoErro}`;
      statusBadge.style.background = "rgba(239, 68, 68, 0.15)";
      statusBadge.style.color = "#F87171";
      statusBadge.style.border = "1px solid rgba(239, 68, 68, 0.3)";
    }
    const audit = document.getElementById('audit-log-gemini');
    if (audit) audit.innerText = `Última verificação: ${ultimoErro}`;
  }
};

window.testarConexaoGeminiLive = window.testarConexaoGeminiReal;

// Auto-inicialização ao carregar a página
async function inicializarChaveGemini() {
  const inputKey = document.getElementById('setting-gemini-key') || document.getElementById('gemini-api-key');
  const key = await window.getGeminiKey();
  if (inputKey && key) {
    inputKey.value = key;
  }
  window.testarConexaoGeminiReal();
}

if (document.readyState === 'complete' || document.readyState === 'interactive') {
  setTimeout(inicializarChaveGemini, 300);
} else {
  document.addEventListener('DOMContentLoaded', () => setTimeout(inicializarChaveGemini, 300));
}
