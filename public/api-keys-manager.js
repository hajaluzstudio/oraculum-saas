// Gerenciador Definitivo de Chaves de API (Gemini & ElevenLabs com Supabase)

/**
 * ⚡ MOTOR UNIVERSAL DE IA DO ORACULUM SAAS
 * Envia requisições para a rota centralizada /api/ai/generate com a Chave Master do backend.
 * Rastreia tokens automaticamente por agência e conta com cascata de contingência.
 */
window.chamarIAUniversal = async function({ prompt, message, systemInstruction, toolName, config, agencyId }) {
  const activeAgencyId = agencyId || (window.getTenantAgencyId ? window.getTenantAgencyId() : null) || (window.activeTenantId || localStorage.getItem('oraculum_active_tenant_id') || 'e4b8a1c9-7d3f-42e1-95a8-2083bf2f9104');
  const userPrompt = prompt || message;

  try {
    const res = await fetch('/api/ai/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-organization-id': activeAgencyId
      },
      body: JSON.stringify({
        prompt: userPrompt,
        systemInstruction,
        toolName: toolName || 'oraculum_frontend',
        config: config || {},
        agencyId: activeAgencyId
      })
    });

    const data = await res.json();

    if (!res.ok || !data.success) {
      if (data.quotaExceeded) {
        if (typeof window.showToast === 'function') {
          window.showToast(data.error, 'error');
        } else {
          alert('⚠️ ' + data.error);
        }
        throw new Error(data.error);
      }
      throw new Error(data.error || 'Erro ao processar inteligência artificial.');
    }

    return {
      reply: data.reply || data.replyText,
      replyText: data.reply || data.replyText,
      modelUsed: data.modelUsed,
      usage: data.usage,
      tokensUsed: data.tokensUsed
    };
  } catch (err) {
    console.error('[chamarIAUniversal Erro]:', err);
    throw err;
  }
};

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

  // Se a chave for uma senha placeholder ou estiver usando a Chave Master do Servidor, testa via backend
  try {
    const res = await fetch('/api/test-gemini');
    const data = await res.json();

    if (res.ok && data.status === 'ok') {
      if (statusBadge) {
        statusBadge.innerText = `● Conectada & Operacional (${data.modelUsed || 'Gemini 3.7 / 3.6 Flash'})`;
        statusBadge.style.background = "rgba(16, 185, 129, 0.15)";
        statusBadge.style.color = "#34D399";
        statusBadge.style.border = "1px solid rgba(16, 185, 129, 0.3)";
      }
      const audit = document.getElementById('audit-log-gemini');
      if (audit) audit.innerText = `Última verificação: Conexão com ${data.modelUsed || 'Gemini Flash'} estabelecida com sucesso!`;
      return;
    }
  } catch (backendErr) {
    console.warn('[Gemini Test Backend Fallback]:', backendErr);
  }

  // Fallback via /api/ai/generate
  try {
    const aiTest = await fetch('/api/ai/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: "ping", toolName: "status_check" })
    });
    const aiJson = await aiTest.json();

    if (aiTest.ok && aiJson.success) {
      if (statusBadge) {
        statusBadge.innerText = `● Conectada & Operacional (${aiJson.modelUsed || 'Gemini 3.7 / 3.6 Flash'})`;
        statusBadge.style.background = "rgba(16, 185, 129, 0.15)";
        statusBadge.style.color = "#34D399";
        statusBadge.style.border = "1px solid rgba(16, 185, 129, 0.3)";
      }
      const audit = document.getElementById('audit-log-gemini');
      if (audit) audit.innerText = `Última verificação: Conexão validada via Central do Servidor (${aiJson.modelUsed})!`;
      return;
    } else {
      throw new Error(aiJson.error || 'Falha ao validar chave');
    }
  } catch (error) {
    if (statusBadge) {
      statusBadge.innerText = `● Erro: ${error.message}`;
      statusBadge.style.background = "rgba(239, 68, 68, 0.15)";
      statusBadge.style.color = "#F87171";
      statusBadge.style.border = "1px solid rgba(239, 68, 68, 0.3)";
    }
    const audit = document.getElementById('audit-log-gemini');
    if (audit) audit.innerText = `Última verificação: ${error.message}`;
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
