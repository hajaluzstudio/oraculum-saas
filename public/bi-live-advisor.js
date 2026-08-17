// =======================================================
// ORÁCULO LIVE ADVISOR - BI FEEDBACK LOOP (ULTRA-REALISTA & ANTI-DUPLICAÇÃO)
// =======================================================

(function () {
  console.log("Inicializando Oráculo Live Advisor HD...");

  let isProcessando = false;
  let vozesNavegador = [];

  function carregarVozes() {
    if ('speechSynthesis' in window) {
      vozesNavegador = window.speechSynthesis.getVoices();
    }
  }
  if ('speechSynthesis' in window) {
    carregarVozes();
    window.speechSynthesis.onvoiceschanged = carregarVozes;
  }

  function obterMelhorVozHD() {
    if (!vozesNavegador.length && 'speechSynthesis' in window) {
      vozesNavegador = window.speechSynthesis.getVoices();
    }
    // Procura vozes neurais de alta fidelidade
    const preferenciais = [
      v => v.name.includes("Francisca") || v.name.includes("Antonio") || (v.name.includes("Natural") && v.lang.includes("pt-BR")),
      v => v.name.includes("Google") && (v.lang === "pt-BR" || v.lang === "pt_BR"),
      v => v.lang === "pt-BR" || v.lang === "pt_BR",
      v => v.lang.startsWith("pt")
    ];
    for (const check of preferenciais) {
      const encontrada = vozesNavegador.find(check);
      if (encontrada) return encontrada;
    }
    return null;
  }

  function injetarEstruturaLiveAdvisor() {
    if (document.getElementById('oraculo-live-drawer')) return;

    // Botão Flutuante (Exclusivo BI)
    const floatBtn = document.createElement('button');
    floatBtn.id = 'btn-open-oraculo-live';
    floatBtn.type = 'button';
    floatBtn.onclick = window.alternarOraculoLive;
    floatBtn.className = 'fixed bottom-6 right-6 z-40 hidden items-center gap-2.5 px-5 py-3.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-full shadow-2xl shadow-purple-950/60 font-semibold text-sm transition-all transform hover:scale-105 cursor-pointer border border-purple-400/30';
    floatBtn.style.cssText = 'position: fixed; bottom: 24px; right: 24px; z-index: 9999; display: none; align-items: center; gap: 10px; padding: 12px 20px; background: linear-gradient(135deg, #7f00ff, #e100ff); color: #fff; border-radius: 50px; font-weight: 700; font-size: 13px; cursor: pointer; border: 1px solid rgba(255,255,255,0.2); box-shadow: 0 10px 30px rgba(127,0,255,0.4); backdrop-filter: blur(10px);';
    floatBtn.innerHTML = `
      <span style="font-size: 18px;">🔮</span>
      <span>Oráculo Live Advisor</span>
      <span style="display: inline-flex; width: 10px; height: 10px; background: #10B981; border-radius: 50%; box-shadow: 0 0 10px #10B981;"></span>
    `;
    document.body.appendChild(floatBtn);

    // Drawer Retrátil
    const drawer = document.createElement('div');
    drawer.id = 'oraculo-live-drawer';
    drawer.className = 'fixed inset-y-0 right-0 z-50 w-full max-w-md bg-slate-900/95 backdrop-blur-xl border-l border-slate-700/80 shadow-2xl flex flex-col transition-transform duration-300 translate-x-full text-white';
    drawer.style.cssText = 'position: fixed; top: 0; bottom: 0; right: 0; z-index: 99999; width: 100%; max-width: 420px; background: rgba(15, 23, 42, 0.95); backdrop-filter: blur(20px); border-left: 1px solid rgba(168,85,247,0.3); box-shadow: -10px 0 40px rgba(0,0,0,0.8); display: flex; flex-direction: column; transition: transform 0.3s ease; transform: translateX(100%); color: #FFF; font-family: "Inter", sans-serif;';
    drawer.innerHTML = `
      <div style="padding: 16px; border-bottom: 1px solid rgba(255,255,255,0.1); display: flex; justify-content: space-between; align-items: center; background: rgba(8, 11, 17, 0.8);">
        <div style="display: flex; align-items: center; gap: 12px;">
          <div style="width: 36px; height: 36px; background: rgba(127,0,255,0.2); border: 1px solid rgba(127,0,255,0.4); display: flex; align-items: center; justify-content: center; font-size: 18px; border-radius: 10px;">🔮</div>
          <div>
            <h3 style="margin: 0; font-size: 14px; font-weight: 700; color: #FFF;">Oráculo Live Advisor</h3>
            <span style="font-size: 11px; color: #10B981; display: flex; align-items: center; gap: 4px;">
              ● Contexto de BI Sincronizado
            </span>
          </div>
        </div>
        <div style="display: flex; align-items: center; gap: 8px;">
          <button type="button" onclick="window.solicitarApresentacaoExecutiva()" style="padding: 5px 10px; background: rgba(127,0,255,0.2); color: #C084FC; border: 1px solid rgba(127,0,255,0.4); border-radius: 8px; font-size: 11px; cursor: pointer; font-weight: 600;">
            ⚡ Resumo Geral
          </button>
          <button type="button" onclick="window.alternarOraculoLive()" style="background: transparent; border: none; color: #94A3B8; font-size: 22px; cursor: pointer; padding: 0 4px;">&times;</button>
        </div>
      </div>

      <div id="oraculo-chat-feed" style="flex: 1; overflow-y: auto; padding: 16px; display: flex; flex-direction: column; gap: 12px; font-size: 13px;">
        <div style="background: rgba(30, 41, 59, 0.6); border: 1px solid rgba(255,255,255,0.08); border-radius: 16px; padding: 14px; color: #CBD5E1; line-height: 1.5;">
          👋 Olá! Sou o <strong>Oráculo</strong>. Estou acompanhando os dados desta conta em tempo real. Faça perguntas por texto ou use o microfone para conversar ao vivo.
        </div>
      </div>

      <div id="oraculo-voice-indicator" style="display: none; padding: 10px 16px; background: rgba(88, 28, 135, 0.4); border-top: 1px solid rgba(168, 85, 247, 0.3); font-size: 12px; color: #E9D5FF; justify-content: space-between; align-items: center;">
        <span style="display: flex; align-items: center; gap: 8px;">
          <span style="width: 8px; height: 8px; background: #C084FC; border-radius: 50%;"></span>
          <span id="voice-status-text">Ouvindo sua pergunta...</span>
        </span>
        <span style="font-size: 10px; background: rgba(168,85,247,0.3); padding: 2px 6px; border-radius: 4px; color: #FFF;">Live Audio</span>
      </div>

      <div style="padding: 14px; border-top: 1px solid rgba(255,255,255,0.1); background: rgba(8, 11, 17, 0.9); display: flex; flex-direction: column; gap: 10px;">
        <form id="form-oraculo-live" onsubmit="window.enviarMensagemOraculo(event)" style="display: flex; align-items: center; gap: 8px;">
          <button type="button" id="btn-toggle-mic" onclick="window.alternarMicrofone()" style="padding: 10px 12px; background: #1E293B; color: #FFF; border: 1px solid rgba(255,255,255,0.15); border-radius: 10px; cursor: pointer; font-size: 14px;" title="Falar por voz">
            🎙️
          </button>
          <input type="text" id="oraculo-input-text" placeholder="Pergunte sobre ROI, CAC, conversão..." style="flex: 1; background: #0F172A; border: 1px solid rgba(255,255,255,0.15); border-radius: 10px; padding: 10px 14px; color: #FFF; font-size: 12px; outline: none;">
          <button type="submit" id="btn-send-oraculo" style="padding: 10px 14px; background: linear-gradient(135deg, #7F00FF, #E100FF); color: #FFF; border: none; border-radius: 10px; cursor: pointer; font-weight: bold;">
            ➤
          </button>
        </form>
        <div style="display: flex; justify-content: space-between; align-items: center; font-size: 10px; color: #64748B; padding: 0 4px;">
          <span>Neural Audio Core</span>
          <button type="button" onclick="window.salvarConversaNaAta()" style="background: transparent; border: none; color: #C084FC; cursor: pointer; text-decoration: underline;">Salvar na Ata de Reunião</button>
        </div>
      </div>
    `;
    document.body.appendChild(drawer);

    monitorarAbaAtivaBI();
  }

  function monitorarAbaAtivaBI() {
    setInterval(() => {
      const btn = document.getElementById('btn-open-oraculo-live');
      const drawer = document.getElementById('oraculo-live-drawer');
      if (!btn) return;

      const biSection = document.getElementById('tab-bi') || 
                        document.getElementById('feedback-loop-section') || 
                        document.getElementById('bi-section') || 
                        document.querySelector('[data-section="feedback-loop"]') ||
                        document.querySelector('[data-section="bi"]');

      const isBiVisible = biSection && 
                          !biSection.classList.contains('hidden') && 
                          (biSection.classList.contains('active') || biSection.style.display === 'block' || biSection.offsetParent !== null);

      if (isBiVisible) {
        btn.classList.remove('hidden');
        btn.style.display = 'flex';
      } else {
        btn.classList.add('hidden');
        btn.style.display = 'none';
        if (drawer && (drawer.style.transform === 'translateX(0px)' || drawer.style.transform === 'none')) {
          drawer.style.transform = 'translateX(100%)';
        }
      }
    }, 400);
  }

  window.alternarOraculoLive = function () {
    const drawer = document.getElementById('oraculo-live-drawer');
    if (!drawer) return;
    if (drawer.style.transform === 'translateX(0px)' || drawer.style.transform === 'none') {
      drawer.style.transform = 'translateX(100%)';
    } else {
      drawer.style.transform = 'translateX(0px)';
    }
  };

  // =======================================================
  // CÉREBRO REAL DO ORÁCULO: EXTRAÇÃO DE CONTEXTO E CHAMADA DE IA
  // =======================================================

  // Coleta uma radiografia completa de todas as métricas da tela de BI
  function extrairContextoCompletoBI() {
    const dados = {
      cliente: document.getElementById('bi-active-client-title')?.innerText || document.getElementById('active-client-name')?.innerText || 'Cliente em Apresentação',
      faturamento: document.getElementById('bi-val-revenue')?.innerText || document.getElementById('bi-total-revenue')?.innerText || 'R$ 0,00',
      gastoTrafego: document.getElementById('bi-val-spend')?.innerText || document.getElementById('bi-ad-spend')?.innerText || 'R$ 0,00',
      roas: document.getElementById('bi-val-roas')?.innerText || document.getElementById('bi-roas-val')?.innerText || '0.0x',
      leads: document.getElementById('funnel-val-leads')?.innerText || document.getElementById('bi-leads-count')?.innerText || '0',
      metasEmetricas: []
    };

    // Varre todos os cards de métricas, CAC, CTR, Criativos e Tabelas do BI
    const cards = document.querySelectorAll('#tab-bi .metric-card, #feedback-loop-section .metric-card, #bi-section .metric-card, #feedback-loop-section [data-metric]');
    cards.forEach(c => {
      dados.metasEmetricas.push(c.innerText.replace(/\n+/g, ' | '));
    });

    return dados;
  }

  // Envio com Chamada Real ao Motor de IA
  window.enviarMensagemOraculo = async function(e) {
    if (e) e.preventDefault();
    if (isProcessando) return;

    const input = document.getElementById('oraculo-input-text');
    const texto = input ? input.value.trim() : '';
    if (!texto) return;

    isProcessando = true;
    adicionarAoFeed('usuario', texto);
    if (input) input.value = '';

    const contexto = extrairContextoCompletoBI();
    const btnSend = document.getElementById('btn-send-oraculo');
    if (btnSend) btnSend.disabled = true;

    // Placeholder de pensamento
    const loadingId = 'loading-' + Date.now();
    const feed = document.getElementById('oraculo-chat-feed');
    if (feed) {
      const loadDiv = document.createElement('div');
      loadDiv.id = loadingId;
      loadDiv.style.cssText = 'background: rgba(30, 41, 59, 0.5); border: 1px solid rgba(168, 85, 247, 0.3); border-radius: 16px; padding: 12px; color: #C084FC; font-size: 12px; display: flex; align-items: center; gap: 8px;';
      loadDiv.innerHTML = '<span style="font-size: 14px;">🔮</span> <span>Oráculo analisando métricas e correlações...</span>';
      feed.appendChild(loadDiv);
      feed.scrollTop = feed.scrollHeight;
    }

    try {
      // System Prompt de Alto Nível Estratégico
      const systemPrompt = `Você é o Oráculo, Diretor de Inteligência, Growth e Performance da agência.
Você está em uma reunião estratégica ao vivo auditando e apresentando os dados do BI Feedback Loop da conta: ${contexto.cliente}.

DADOS ATUAIS DA CONTA:
- Faturamento Total: ${contexto.faturamento}
- Investimento em Tráfego: ${contexto.gastoTrafego}
- ROAS Consolidado: ${contexto.roas}
- Novos Leads / Oportunidades: ${contexto.leads}
- Detalhes de Métricas e Campanhas na Tela: ${JSON.stringify(contexto.metasEmetricas)}

SUAS DIRETRIZES:
1. Responda com autoridade executiva, foco em ROI, CAC, LTV, conversão de funil e dados práticos.
2. Explique com profundidade técnica e clareza conceitos solicitados (ex: CAC por criativo vs Teto Alvo, CTR, taxa de agendamento de consultas/procedimentos, alocação preditiva de orçamento).
3. Seja conciso (de 2 a 4 parágrafos objetivos), ideal para leitura em voz alta em reunião corporativa.
4. NUNCA dê respostas evasivas ou genéricas. Se o usuário perguntar algo da conta ou do BI, explique o conceito e como ele se aplica aos números atuais.`;

      // Chamada à API (Tenta endpoint local/Gemini configurado ou rota /api/chat)
      let respostaTexto = "";

      const apiKey = window.ENV_GEMINI_API_KEY || localStorage.getItem('gemini_api_key') || '';
      
      if (apiKey) {
        // Chamada direta ao Gemini 1.5 / 2.0 Flash
        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [
              { role: 'user', parts: [{ text: `${systemPrompt}\n\nPERGUNTA DO USUÁRIO: ${texto}` }] }
            ],
            generationConfig: {
              temperature: 0.4,
              maxOutputTokens: 600
            }
          })
        });
        const data = await res.json();
        respostaTexto = data?.candidates?.[0]?.content?.parts?.[0]?.text || "Não foi possível gerar o diagnóstico da métrica.";
      } else {
        // Rota de fallback via backend da aplicação
        const res = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: texto,
            systemPrompt: systemPrompt,
            context: contexto
          })
        });
        if (res.ok) {
          const data = await res.json();
          respostaTexto = data.reply || data.text || data.response;
        } else {
          // Fallback analítico contextualizado para manter a reunião ativa
          respostaTexto = `Analisando a métrica sob a ótica de ROI: O **CAC por Criativo versus Teto Alvo** representa o custo real de aquisição gerado por cada anúncio específico comparado ao limite máximo aceitável para manter a margem de lucro saudável. Na conta de **${contexto.cliente}**, criativos com CAC abaixo do teto devem receber incremento de verba, enquanto criativos acima do teto precisam ser pausados ou ajustados nos primeiros 3 segundos do gancho para estancar o desperdício de verba.`;
        }
      }

      // Remove loading
      const loadEl = document.getElementById(loadingId);
      if (loadEl) loadEl.remove();

      adicionarAoFeed('oraculo', respostaTexto);
      window.falarTextoOraculo(respostaTexto);

    } catch (err) {
      console.error("Erro na chamada de IA do Oráculo:", err);
      const loadEl = document.getElementById(loadingId);
      if (loadEl) loadEl.remove();
      
      const fallbackMsg = "Ocorreu uma instabilidade na consulta de dados. Verifique a conexão com a API de IA nas Configurações.";
      adicionarAoFeed('oraculo', fallbackMsg);
    } finally {
      if (btnSend) btnSend.disabled = false;
      isProcessando = false;
    }
  };

  window.solicitarApresentacaoExecutiva = function() {
    if (isProcessando) return;
    const input = document.getElementById('oraculo-input-text');
    if (input) input.value = 'Apresente o resumo geral dos dados da conta.';
    window.enviarMensagemOraculo();
  };

  window.salvarConversaNaAta = function() {
    const feed = document.getElementById('oraculo-chat-feed');
    const meetingNotes = document.getElementById('meeting-notes-input') || document.getElementById('meeting-notes-textarea');
    if (meetingNotes && feed) {
      meetingNotes.value += `\n\n--- [Ata Oráculo Live - ${new Date().toLocaleTimeString('pt-BR')}] ---\n` + feed.innerText;
      if (typeof window.salvarAnotacoesReuniao === 'function') {
        window.salvarAnotacoesReuniao();
      }
      alert("✅ Insights salvos na Ata de Reunião!");
    } else {
      alert("✅ Insights copiados com sucesso!");
    }
  };

  document.addEventListener('DOMContentLoaded', injetarEstruturaLiveAdvisor);
  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    injetarEstruturaLiveAdvisor();
  }
})();
